import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { evaluateComplianceLocally } from './src/utils/studioLogic.ts';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ANALYSIS_MODEL = 'gemini-4-hydrogen';

function safeParseJson<T = Record<string, unknown>>(rawText: string | undefined): T {
  const cleaned = (rawText ?? '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) {
    throw new Error('Model AI tidak mengembalikan respons JSON. Silakan coba lagi.');
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[1]) as T;
    }
    throw new Error('Format respons AI tidak valid untuk dibaca. Silakan ulangi analisis.');
  }
}

function normalizeSourcedString(field: unknown, fallbackValue = 'Tidak tercantum'): { value: string; status: 'TERKONFIRMASI' | 'INFERENSI' | 'TIDAK_DIKETAHUI' } {
  const obj = (field && typeof field === 'object' ? field : {}) as { value?: unknown; status?: string };
  const validStatus =
    obj.status === 'TERKONFIRMASI' || obj.status === 'INFERENSI' || obj.status === 'TIDAK_DIKETAHUI'
      ? obj.status
      : 'TIDAK_DIKETAHUI';
  const val = typeof obj.value === 'string' && obj.value.trim() ? obj.value.trim() : fallbackValue;
  return { value: val, status: validStatus };
}

function normalizeSourcedArray(field: unknown): { value: string[]; status: 'TERKONFIRMASI' | 'INFERENSI' | 'TIDAK_DIKETAHUI' } {
  const obj = (field && typeof field === 'object' ? field : {}) as { value?: unknown; status?: string };
  const validStatus =
    obj.status === 'TERKONFIRMASI' || obj.status === 'INFERENSI' || obj.status === 'TIDAK_DIKETAHUI'
      ? obj.status
      : 'TIDAK_DIKETAHUI';
  const arr = Array.isArray(obj.value)
    ? obj.value.map((x) => String(x).trim()).filter(Boolean)
    : [];
  return { value: arr, status: validStatus };
}

function getAiClient(apiVersion?: 'v1' | 'v1beta'): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY belum tersedia di lingkungan server. Silakan periksa Settings > Secrets.'
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const FREE_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function isTransientAiError(error: unknown): boolean {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const statusCode =
    (error as { statusCode?: number; status?: number })?.statusCode ??
    (error as { status?: number })?.status;
  return (
    statusCode === 503 ||
    statusCode === 504 ||
    statusCode === 500 ||
    statusCode === 408 ||
    rawMsg.includes('"code":503') ||
    rawMsg.includes('"code":504') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('DEADLINE_EXCEEDED') ||
    rawMsg.includes('high demand') ||
    rawMsg.includes('ECONNRESET') ||
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('Timeout') ||
    rawMsg.includes('aborted') ||
    rawMsg.includes('fetch failed')
  );
}

async function generateFreeAnalysisContent(
  ai: GoogleGenAI,
  contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'],
  config: Omit<NonNullable<Parameters<GoogleGenAI['models']['generateContent']>[0]['config']>, 'thinkingConfig'>
): Promise<{ text: string | undefined; modelUsed: string }> {
  try {
    const res = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents,
      config: {
        ...config,
        httpOptions: { timeout: 12000 },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return { text: res.text, modelUsed: ANALYSIS_MODEL };
  } catch (err) {
    // Only fall back to free-tier flash-lite on transient 503/504/500/timeout, NEVER on 429 quota or paid models
    if (!isTransientAiError(err)) {
      throw err;
    }
    const fallbackRes = await ai.models.generateContent({
      model: FREE_FALLBACK_MODEL,
      contents,
      config: {
        ...config,
        httpOptions: { timeout: 30000 },
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });
    return { text: fallbackRes.text, modelUsed: FREE_FALLBACK_MODEL };
  }
}

function mapGeminiError(error: unknown): { status: number; message: string; code: string } {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { statusCode?: number; status?: number })?.statusCode ??
    (error as { status?: number })?.status;

  if (statusCode === 503 && rawMsg.includes('GEMINI_API_KEY')) {
    return { status: 503, message: rawMsg, code: 'API_KEY_MISSING' };
  }
  if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('403') || rawMsg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Akses model belum aktif untuk API key saat ini. Silakan periksa atau pilih API key yang sesuai di AI Studio Settings > Secrets.',
      code: 'PERMISSION_DENIED',
    };
  }
  if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return {
      status: 429,
      message:
        'Batas kuota API tercapai atau model Gambar/Video memerlukan API key berbayar di panel Settings > Secrets AI Studio.',
      code: 'QUOTA_EXHAUSTED',
    };
  }
  if (
    statusCode === 503 ||
    statusCode === 504 ||
    rawMsg.includes('"code":503') ||
    rawMsg.includes('"code":504') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('DEADLINE_EXCEEDED') ||
    rawMsg.includes('high demand')
  ) {
    return {
      status: 503,
      message:
        'Server model AI sedang mengalami lonjakan permintaan sementara. Silakan tunggu beberapa detik dan coba ulangi analisis.',
      code: 'MODEL_UNAVAILABLE',
    };
  }
  if (rawMsg.includes('NOT_FOUND') || rawMsg.includes('404')) {
    return {
      status: 404,
      message: `Model AI tidak ditemukan atau belum tersedia pada akun ini: ${rawMsg}`,
      code: 'MODEL_NOT_FOUND',
    };
  }
  return {
    status: 500,
    message: rawMsg || 'Terjadi kesalahan saat memproses permintaan AI.',
    code: 'AI_ERROR',
  };
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function resolveAssetToBuffer(urlOrDataUrl: string): Promise<{ buffer: Buffer; ext: string }> {
  const parsed = parseDataUrl(urlOrDataUrl);
  if (parsed) {
    const ext = parsed.mimeType.includes('png')
      ? 'png'
      : parsed.mimeType.includes('webp')
        ? 'webp'
        : parsed.mimeType.includes('wav')
          ? 'wav'
          : parsed.mimeType.includes('mp4')
            ? 'mp4'
            : 'jpg';
    return { buffer: Buffer.from(parsed.base64, 'base64'), ext };
  }

  if (urlOrDataUrl.startsWith('/src/assets/')) {
    const safeRel = path.normalize(urlOrDataUrl).replace(/^\/+/, '');
    const fullPath = path.resolve(__dirname, safeRel);
    const assetsRoot = path.resolve(__dirname, 'src/assets');
    if (!fullPath.startsWith(assetsRoot)) {
      throw new Error('Path aset tidak diizinkan.');
    }
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).replace('.', '') || 'jpg';
    return { buffer, ext };
  }

  throw new Error('Format sumber media tidak didukung untuk rendering lokal.');
}

interface VideoJobState {
  idempotencyKey: string;
  status: 'running' | 'completed' | 'failed';
  interactionId?: string;
  videoUrl?: string;
  error?: string;
  updatedAt: string;
}

const videoJobs = new Map<string, VideoJobState>();

function isBlockedLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.') ||
    lower.endsWith('.local')
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', async (_req, res) => {
    let ffmpegAvailable = false;
    try {
      await execFileAsync('ffmpeg', ['-version']);
      ffmpegAvailable = true;
    } catch {
      ffmpegAvailable = false;
    }
    res.json({
      ok: true,
      ffmpegAvailable,
      apiKeyConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      models: {
        analysis: ANALYSIS_MODEL,
        image: ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'],
        video: 'gemini-omni-1.2-flash',
        voice: 'gemini-3.8-flash-lite-tts',
      },
      flowEngine: 'Google Flow Veo / Omni (Interactions API)',
    });
  });

  app.post('/api/products/fetch-url', async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ ok: false, message: 'URL produk wajib diisi.' });
    }

    const trimmedUrl = url.trim();
    const normalizedInput = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedInput);
    } catch {
      return res.status(400).json({ ok: false, message: 'Format URL tidak valid. Contoh: https://toko.com/produk' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol) || isBlockedLocalHost(parsedUrl.hostname)) {
      return res.status(400).json({ ok: false, message: 'URL tidak diizinkan.' });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SentraCreationAI/1.0; +https://sentracreation.ai)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      clearTimeout(timeout);

      if ([401, 403, 429].includes(response.status)) {
        return res.json({
          ok: false,
          accessBlocked: true,
          statusCode: response.status,
          message:
            'Situs marketplace membatasi akses otomatis (login/proteksi bot). Sesuai kebijakan kepatuhan, kami tidak melewati proteksi tersebut. Silakan unggah foto/screenshot halaman produk atau isi detail secara manual.',
        });
      }

      if (response.status === 404) {
        return res.json({
          ok: false,
          accessBlocked: false,
          statusCode: 404,
          message:
            'Halaman produk tidak ditemukan (HTTP 404). Periksa kembali tautan URL Anda, atau unggah gambar/isi detail secara manual.',
        });
      }

      if (response.status >= 500) {
        return res.json({
          ok: false,
          accessBlocked: true,
          statusCode: response.status,
          message: `Situs tujuan sedang mengalami gangguan sementara (HTTP ${response.status}). Silakan unggah screenshot atau isi manual.`,
        });
      }

      const html = await response.text();
      const lowerHtml = html.toLowerCase();
      if (
        lowerHtml.includes('captcha') ||
        lowerHtml.includes('cf-challenge') ||
        lowerHtml.includes('verify you are human') ||
        lowerHtml.includes('please login to continue') ||
        lowerHtml.includes('just a moment...')
      ) {
        return res.json({
          ok: false,
          accessBlocked: true,
          message:
            'Halaman meminta verifikasi CAPTCHA atau login. Kami tidak melewati proteksi akses situs. Silakan unggah screenshot halaman produk atau isi manual.',
        });
      }

      const jsonLdBlocks: string[] = [];
      const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        if (m[1]?.trim()) jsonLdBlocks.push(m[1].trim().slice(0, 3000));
      }

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const getMeta = (attrValue: string) => {
        const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${attrValue}["'][^>]+content=["']([^"']+)["']`, 'i');
        const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${attrValue}["']`, 'i');
        return html.match(re1)?.[1] || html.match(re2)?.[1] || '';
      };

      const metaTitle = getMeta('og:title') || getMeta('twitter:title') || titleMatch?.[1]?.trim() || '';
      const metaDescription =
        getMeta('og:description') || getMeta('description') || getMeta('twitter:description') || '';

      const strippedText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 9000);

      const marketplace = parsedUrl.hostname.includes('tiktok')
        ? 'TikTok Shop'
        : parsedUrl.hostname.includes('shopee')
          ? 'Shopee'
          : 'Other Product URLs';

      let combinedExtracted = [
        metaTitle ? `Judul: ${metaTitle}` : '',
        metaDescription ? `Deskripsi Meta: ${metaDescription}` : '',
        jsonLdBlocks.length > 0 ? `Data Terstruktur JSON-LD: ${jsonLdBlocks.join(' | ')}` : '',
        strippedText ? `Teks Halaman: ${strippedText}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Fallback to Gemini urlContext for public JS-rendered pages with minimal static HTML
      if (strippedText.length < 150 && jsonLdBlocks.length === 0) {
        try {
          const ai = getAiClient();
          const urlRes = await generateFreeAnalysisContent(
            ai,
            `Baca dan rangkum informasi produk publik yang terlihat di URL berikut secara faktual dalam Bahasa Indonesia (nama produk, merek, deskripsi, spesifikasi, bahan, fitur, cara pakai). Jika halaman tidak bisa diakses atau butuh login/CAPTCHA, tulis PERSIS kata: AKSES_DIBATASI. URL: ${parsedUrl.toString()}`,
            { tools: [{ urlContext: {} }] }
          );
          const urlText = (urlRes.text ?? '').trim();
          if (urlText.includes('AKSES_DIBATASI')) {
            return res.json({
              ok: false,
              accessBlocked: true,
              message:
                'Halaman produk memerlukan login, CAPTCHA, atau membatasi pembacaan otomatis. Silakan unggah foto/screenshot halaman produk atau isi detail secara manual.',
            });
          }
          if (urlText.length > 60) {
            combinedExtracted = `${combinedExtracted}\nRingkasan URL Konteks:\n${urlText}`.trim();
          }
        } catch {
          // Proceed to thin-content check below
        }
      }

      if (combinedExtracted.trim().length < 50) {
        return res.json({
          ok: false,
          accessBlocked: true,
          message:
            'Konten produk di URL ini tidak dapat dibaca otomatis (kemungkinan memakai proteksi atau rendering dinamis). Silakan unggah screenshot halaman produk atau isi detail manual.',
        });
      }

      return res.json({
        ok: true,
        accessBlocked: false,
        marketplace,
        title: metaTitle,
        metaDescription,
        extractedText: combinedExtracted,
      });
    } catch (err) {
      return res.json({
        ok: false,
        accessBlocked: true,
        message:
          err instanceof Error && err.name === 'AbortError'
            ? 'Waktu pengambilan halaman habis. Silakan unggah screenshot atau isi detail manual.'
            : 'Halaman tidak dapat diambil langsung. Silakan unggah gambar/screenshot produk atau masukkan info secara manual.',
      });
    }
  });

  app.post('/api/products/analyze', async (req, res) => {
    try {
      const {
        inputMethod,
        sourceUrl,
        marketplace,
        extractedText,
        manualDetails,
        imagesBase64 = [],
      } = req.body as {
        inputMethod: string;
        sourceUrl?: string;
        marketplace?: string;
        extractedText?: string;
        manualDetails?: Record<string, string>;
        imagesBase64?: string[];
      };

      const hasText = Boolean(extractedText?.trim() || Object.values(manualDetails || {}).some((v) => v?.trim()));
      const hasImages = Array.isArray(imagesBase64) && imagesBase64.length > 0;
      if (!hasText && !hasImages) {
        return res.status(400).json({
          ok: false,
          message: 'Berikan minimal nama/deskripsi produk, teks URL, atau gambar/screenshot produk.',
        });
      }

      const ai = getAiClient();

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      for (const img of imagesBase64.slice(0, 4)) {
        const parsed = parseDataUrl(img);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
        }
      }

      const promptText = `Analisis informasi produk berikut untuk studio konten affiliate Sentra Creation AI (Bahasa Indonesia).
ATURAN AKURASI KETAT:
1. Setiap field objek { "value": ..., "status": "TERKONFIRMASI" | "INFERENSI" | "TIDAK_DIKETAHUI" }:
   - "TERKONFIRMASI": tertulis/terlihat jelas di sumber input atau gambar.
   - "INFERENSI": kesimpulan wajar dari konteks produk (misal target audiens).
   - "TIDAK_DIKETAHUI": tidak ada di sumber. JANGAN mengarang spesifikasi, bahan, dimensi, atau klaim medis.
2. price selalu gunakan value "Dikecualikan dari klaim kreatif" jika tidak terverifikasi.
3. Buat jawaban ringkas dan padat (1-2 kalimat per deskripsi, maks. 3 item per daftar).
4. Kembalikan HANYA JSON valid sesuai struktur persis berikut:
{
  "productName": { "value": string, "status": "TERKONFIRMASI"|"INFERENSI"|"TIDAK_DIKETAHUI" },
  "brand": { "value": string, "status": "..." },
  "category": { "value": string, "status": "..." },
  "description": { "value": string, "status": "..." },
  "specifications": { "value": string[], "status": "..." },
  "materials": { "value": string[], "status": "..." },
  "dimensions": { "value": string, "status": "..." },
  "colors": { "value": string[], "status": "..." },
  "features": { "value": string[], "status": "..." },
  "benefits": { "value": string[], "status": "..." },
  "targetAudience": { "value": string, "status": "..." },
  "usageInstructions": { "value": string, "status": "..." },
  "price": { "value": string, "status": "..." },
  "summary": string,
  "mainSellingPoints": string[],
  "verifiedFeatures": string[],
  "customerProblems": string[],
  "potentialSolutions": string[],
  "valueProposition": string,
  "recommendedAngles": string[],
  "contentRecommendations": string[],
  "missingInformation": string[],
  "recommendedStyle": "UGC Review"|"Casual Product Review"|"Cinematic Commercial"|"Product Showcase"|"Lifestyle Advertising"|"Problem Solution"|"Unboxing"|"Tutorial"|"Storytelling"|"Before After",
  "styleReason": string,
  "storyBeats": { "HOOK": string, "SOLUSI": string, "VALUE": string, "DETAIL": string, "CTA": string },
  "flaggedClaims": [{ "claim": string, "category": "unsupported"|"medical"|"technical"|"marketplace", "severity": "warning"|"high", "recommendation": string }]
}

Metode Input: ${inputMethod}
Marketplace: ${marketplace || 'Manual'}
URL Sumber: ${sourceUrl || '-'}
Teks Ekstraksi: ${extractedText || '-'}
Input Manual: ${JSON.stringify(manualDetails || {})}`;

      parts.push({ text: promptText });

      const response = await generateFreeAnalysisContent(
        ai,
        { parts },
        {
          systemInstruction:
            'Anda adalah analis produk e-commerce dan affiliate marketing Indonesia yang jujur, teliti, ringkas, dan berbasis sumber. Selalu keluarkan JSON valid.',
          responseMimeType: 'application/json',
        }
      );

      const raw = safeParseJson<Record<string, unknown>>(response.text);
      const normalized = {
        productName: normalizeSourcedString(raw.productName, 'Produk Belum Bernama'),
        brand: normalizeSourcedString(raw.brand, 'Tidak tercantum'),
        category: normalizeSourcedString(raw.category, 'Tidak tercantum'),
        description: normalizeSourcedString(raw.description, 'Tidak tercantum'),
        specifications: normalizeSourcedArray(raw.specifications),
        materials: normalizeSourcedArray(raw.materials),
        dimensions: normalizeSourcedString(raw.dimensions, 'Tidak tercantum'),
        colors: normalizeSourcedArray(raw.colors),
        features: normalizeSourcedArray(raw.features),
        benefits: normalizeSourcedArray(raw.benefits),
        targetAudience: normalizeSourcedString(raw.targetAudience, 'Tidak tercantum'),
        usageInstructions: normalizeSourcedString(raw.usageInstructions, 'Tidak tercantum'),
        price: normalizeSourcedString(raw.price, 'Dikecualikan dari klaim kreatif'),
        summary: typeof raw.summary === 'string' ? raw.summary : '',
        mainSellingPoints: Array.isArray(raw.mainSellingPoints) ? raw.mainSellingPoints.map(String) : [],
        verifiedFeatures: Array.isArray(raw.verifiedFeatures) ? raw.verifiedFeatures.map(String) : [],
        customerProblems: Array.isArray(raw.customerProblems) ? raw.customerProblems.map(String) : [],
        potentialSolutions: Array.isArray(raw.potentialSolutions) ? raw.potentialSolutions.map(String) : [],
        valueProposition: typeof raw.valueProposition === 'string' ? raw.valueProposition : '',
        recommendedAngles: Array.isArray(raw.recommendedAngles) ? raw.recommendedAngles.map(String) : [],
        contentRecommendations: Array.isArray(raw.contentRecommendations) ? raw.contentRecommendations.map(String) : [],
        missingInformation: Array.isArray(raw.missingInformation) ? raw.missingInformation.map(String) : [],
        recommendedStyle: typeof raw.recommendedStyle === 'string' ? raw.recommendedStyle : 'UGC Review',
        styleReason: typeof raw.styleReason === 'string' ? raw.styleReason : '',
        storyBeats:
          raw.storyBeats && typeof raw.storyBeats === 'object'
            ? raw.storyBeats
            : {
                HOOK: '',
                SOLUSI: '',
                VALUE: '',
                DETAIL: '',
                CTA: 'Cek produknya di keranjang bawah.',
              },
        flaggedClaims: Array.isArray(raw.flaggedClaims) ? raw.flaggedClaims : [],
      };

      return res.json({
        ok: true,
        modelUsed: response.modelUsed,
        analysis: normalized,
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ ok: false, code: mapped.code, message: mapped.message });
    }
  });

  app.post('/api/creative/generate', async (req, res) => {
    try {
      const { product, style, platform, durationSeconds, objective, promptLanguage, characterName } =
        req.body as {
          product: Record<string, unknown>;
          style: string;
          platform: string;
          durationSeconds: number;
          objective: string;
          promptLanguage: 'English' | 'Indonesian';
          characterName?: string;
        };

      const ai = getAiClient();
      const response = await generateFreeAnalysisContent(
        ai,
        `Buat arahan kreatif konten affiliate untuk produk berikut:
Produk: ${JSON.stringify(product)}
Gaya Konten: ${style}
Platform: ${platform}
Durasi Target: ${durationSeconds} detik
Tujuan Pemasaran: ${objective}
Karakter: ${characterName || 'Tanpa karakter (fokus produk)'}
Bahasa Prompt Visual: ${promptLanguage}

Aturan Wajib:
- Naskah voice-over dan alur 5 bagian (HOOK, SOLUSI, VALUE, DETAIL, CTA) dalam Bahasa Indonesia yang natural, jujur, tidak overclaim, dan tanpa menyebut harga/diskon/flash sale.
- Default CTA: "Cek produknya di keranjang bawah."
- Buat juga 1 Image Generation Prompt terstruktur (dalam bahasa ${promptLanguage}) dan scene prompts sesuai durasi (${durationSeconds}s).`,
        {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              autoSelectedReason: { type: Type.STRING },
              storyBeats: {
                type: Type.OBJECT,
                properties: {
                  HOOK: { type: Type.STRING },
                  SOLUSI: { type: Type.STRING },
                  VALUE: { type: Type.STRING },
                  DETAIL: { type: Type.STRING },
                  CTA: { type: Type.STRING },
                },
                required: ['HOOK', 'SOLUSI', 'VALUE', 'DETAIL', 'CTA'],
              },
              voiceOverScript: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              scenePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['autoSelectedReason', 'storyBeats', 'voiceOverScript', 'imagePrompt', 'scenePrompts'],
          },
        }
      );

      const parsed = safeParseJson(response.text);
      return res.json({ ok: true, modelUsed: response.modelUsed, creative: parsed });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ ok: false, code: mapped.code, message: mapped.message });
    }
  });

  app.post('/api/compliance/check', async (req, res) => {
    try {
      const { scriptText, platform, hasUnknownSpecs, useAiDeepCheck } = req.body as {
        scriptText: string;
        platform: 'TikTok Affiliate' | 'Shopee Affiliate' | 'General Advertising';
        hasUnknownSpecs?: boolean;
        useAiDeepCheck?: boolean;
      };

      const localReport = evaluateComplianceLocally(scriptText || '', platform, Boolean(hasUnknownSpecs));

      if (!useAiDeepCheck) {
        return res.json({ ok: true, report: localReport, modelUsed: 'deterministic-rules' });
      }

      const ai = getAiClient();
      const response = await generateFreeAnalysisContent(
        ai,
        `Tinjau kepatuhan naskah konten affiliate untuk platform "${platform}" berikut:
"${scriptText}"
Periksa: klaim medis/teknis tanpa bukti, testimoni palsu, janji hasil absolut, urgensi palsu, hak cipta, dan pengungkapan affiliate.`,
        {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              additionalFindings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    checkType: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    excerpt: { type: Type.STRING },
                    message: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['checkType', 'severity', 'excerpt', 'message', 'suggestion'],
                },
              },
            },
            required: ['additionalFindings'],
          },
        }
      );

      const aiParsed = safeParseJson<{
        additionalFindings?: Array<{
          checkType?: string;
          severity?: 'low' | 'medium' | 'high';
          excerpt?: string;
          message?: string;
          suggestion?: string;
        }>;
      }>(response.text);
      const aiFindings = (aiParsed.additionalFindings || []).map((f, idx) => ({
        id: `ai-comp-${idx}`,
        checkType: f.checkType || 'Tinjauan AI',
        severity: (f.severity === 'high' || f.severity === 'medium' || f.severity === 'low'
          ? f.severity
          : 'medium') as 'low' | 'medium' | 'high',
        excerpt: f.excerpt || '',
        message: f.message || '',
        suggestion: f.suggestion || '',
      }));

      const combinedFindings = [...localReport.findings, ...aiFindings];
      let status = localReport.status;
      if (combinedFindings.some((f) => f.severity === 'high')) status = 'HIGH_RISK';
      else if (combinedFindings.length > 0 && status === 'LOW_RISK') status = 'NEEDS_REVIEW';

      return res.json({
        ok: true,
        modelUsed: response.modelUsed,
        report: {
          ...localReport,
          status,
          findings: combinedFindings,
        },
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ ok: false, code: mapped.code, message: mapped.message });
    }
  });

  app.post('/api/images/generate', async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = '9:16',
        model = 'gemini-3.1-flash-lite-image',
        referenceImageUrl,
      } = req.body as {
        prompt: string;
        aspectRatio?: string;
        model?: 'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1';
        referenceImageUrl?: string;
      };

      if (!prompt?.trim()) {
        return res.status(400).json({ ok: false, message: 'Prompt gambar wajib diisi.' });
      }

      const allowedModels = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'];
      const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.1-flash-lite-image';

      const supportedRatio = ['9:16', '1:1', '3:4', '4:3', '16:9'].includes(aspectRatio)
        ? aspectRatio
        : aspectRatio === '4:5'
          ? '3:4'
          : '9:16';

      const ai = getAiClient('v1beta');
      let refData: { data: string; mime_type: string } | null = null;

      if (referenceImageUrl) {
        try {
          const { buffer, ext } = await resolveAssetToBuffer(referenceImageUrl);
          refData = {
            data: buffer.toString('base64'),
            mime_type: ext === 'png' ? 'image/png' : 'image/jpeg',
          };
        } catch {
          refData = null;
        }
      }

      const interactionInput:
        | string
        | Array<{ type: 'image'; data: string; mime_type: string } | { type: 'text'; text: string }> =
        refData
          ? [
              { type: 'image', data: refData.data, mime_type: refData.mime_type },
              { type: 'text', text: prompt },
            ]
          : prompt;

      let imageUrl: string | null = null;
      let interactionId: string | undefined;

      try {
        const interaction = await ai.interactions.create({
          model: selectedModel,
          input: interactionInput,
          store: true,
          response_modalities: ['image', 'text'],
          generation_config: {
            image_config: {
              aspect_ratio: supportedRatio,
              ...(selectedModel === 'gemini-nano-banana-2.1' ? { image_size: '1K' } : {}),
            },
          },
        });
        interactionId = interaction.id;

        const outImg = (interaction as unknown as { output_image?: { data?: string; mime_type?: string } }).output_image;
        if (outImg?.data) {
          imageUrl = `data:${outImg.mime_type || 'image/png'};base64,${outImg.data}`;
        }

        if (!imageUrl && Array.isArray((interaction as unknown as { steps?: unknown[] }).steps)) {
          const steps = (interaction as unknown as {
            steps: Array<{ type?: string; content?: Array<{ type?: string; data?: string; mime_type?: string }> }>;
          }).steps;
          for (const step of steps) {
            if (step.type === 'model_output' && Array.isArray(step.content)) {
              const imgContent = step.content.find((c) => c.type === 'image' && c.data);
              if (imgContent?.data) {
                imageUrl = `data:${imgContent.mime_type || 'image/png'};base64,${imgContent.data}`;
                break;
              }
            }
          }
        }
      } catch (interactionErr) {
        // Fallback to generateContent only if Interactions image payload format differs on current SDK
        if (isTransientAiError(interactionErr)) {
          throw interactionErr;
        }
        const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
        if (refData) {
          parts.push({ inlineData: { data: refData.data, mimeType: refData.mime_type } });
        }
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: supportedRatio,
              ...(selectedModel === 'gemini-nano-banana-2.1' ? { imageSize: '1K' } : {}),
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType ?? 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        return res.status(502).json({
          ok: false,
          message: 'Model Google Flow / Omni Image tidak mengembalikan data gambar. Silakan sesuaikan prompt dan coba lagi.',
        });
      }

      return res.json({
        ok: true,
        imageUrl,
        interactionId,
        modelUsed: selectedModel,
        engine: 'Google Flow Omni Image',
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ ok: false, code: mapped.code, message: mapped.message });
    }
  });

  app.post('/api/video/generate', async (req, res) => {
    const {
      prompt,
      aspectRatio = '9:16',
      durationSeconds = 10,
      referenceImageUrl,
      previousInteractionId,
      idempotencyKey,
    } = req.body as {
      prompt: string;
      aspectRatio?: '9:16' | '16:9';
      durationSeconds?: number;
      referenceImageUrl?: string;
      previousInteractionId?: string;
      idempotencyKey?: string;
    };

    const key = idempotencyKey || crypto.randomUUID();
    const existing = videoJobs.get(key);
    if (existing) {
      if (existing.status === 'running') {
        return res.status(202).json({
          ok: true,
          status: 'running',
          idempotencyKey: key,
          message: 'Generasi video untuk job ini masih berjalan.',
        });
      }
      if (existing.status === 'completed' && existing.videoUrl) {
        return res.json({
          ok: true,
          status: 'completed',
          idempotencyKey: key,
          videoUrl: existing.videoUrl,
          interactionId: existing.interactionId,
          reusedFromIdempotency: true,
        });
      }
    }

    videoJobs.set(key, {
      idempotencyKey: key,
      status: 'running',
      updatedAt: new Date().toISOString(),
    });

    try {
      const ai = getAiClient('v1beta');
      const clampedDuration = `${Math.min(15, Math.max(3, Math.round(durationSeconds)))}s`;

      let inputPayload:
        | string
        | Array<{ type: 'image'; mime_type: string; data: string } | { type: 'text'; text: string }> =
        prompt;

      if (referenceImageUrl) {
        try {
          const { buffer, ext } = await resolveAssetToBuffer(referenceImageUrl);
          inputPayload = [
            {
              type: 'image',
              mime_type: ext === 'png' ? 'image/png' : 'image/jpeg',
              data: buffer.toString('base64'),
            },
            { type: 'text', text: prompt },
          ];
        } catch {
          inputPayload = prompt;
        }
      }

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: inputPayload,
          ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
          background: false,
          store: true,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16',
            duration: clampedDuration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart?.data) {
        throw new Error('Model tidak mengembalikan data video MP4.');
      }

      const mime = videoPart.mime_type || 'video/mp4';
      const videoUrl = `data:${mime};base64,${videoPart.data}`;
      videoJobs.set(key, {
        idempotencyKey: key,
        status: 'completed',
        interactionId: interaction.id,
        videoUrl,
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        ok: true,
        status: 'completed',
        idempotencyKey: key,
        interactionId: interaction.id,
        videoUrl,
        modelUsed: 'gemini-omni-1.2-flash',
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      videoJobs.set(key, {
        idempotencyKey: key,
        status: 'failed',
        error: mapped.message,
        updatedAt: new Date().toISOString(),
      });
      return res.status(mapped.status).json({
        ok: false,
        idempotencyKey: key,
        code: mapped.code,
        message: mapped.message,
      });
    }
  });

  app.post('/api/voice/generate', async (req, res) => {
    try {
      const { script, gender = 'Female', style = 'Friendly', speed = 1.0 } =
        req.body as {
          script: string;
          gender?: 'Female' | 'Male';
          style?: string;
          speed?: number;
        };

      if (!script?.trim()) {
        return res.status(400).json({ ok: false, message: 'Naskah voice-over wajib diisi.' });
      }

      const voiceName = gender === 'Male' ? 'Charon' : 'Kore';
      const speedLabel = speed >= 1.15 ? 'sedikit cepat dan energik' : speed <= 0.9 ? 'tenang dan jelas' : 'tempo normal';
      const ai = getAiClient('v1beta');

      let base64Audio: string | undefined;
      let mimeType = 'audio/wav';

      try {
        const interaction = await ai.interactions.create({
          model: 'gemini-3.8-flash-lite-tts',
          input: [
            {
              type: 'text',
              text: script.trim(),
              annotations: [
                {
                  type: 'speech_metadata',
                  style: `Bahasa Indonesia, gaya ${style}, ${speedLabel}`,
                },
              ],
            },
          ],
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: [
              {
                language: 'id-ID',
                voice: voiceName,
              },
            ],
          },
        });

        const outAudio = interaction.output_audio;
        if (outAudio?.data) {
          base64Audio = outAudio.data;
          mimeType = outAudio.mime_type || 'audio/wav';
        }
        if (!base64Audio && Array.isArray((interaction as unknown as { steps?: unknown[] }).steps)) {
          const steps = (interaction as unknown as {
            steps: Array<{ type?: string; content?: Array<{ type?: string; data?: string; mime_type?: string }> }>;
          }).steps;
          for (const step of steps) {
            if (step.type === 'model_output' && Array.isArray(step.content)) {
              const audioContent = step.content.find((c) => c.type === 'audio' && c.data);
              if (audioContent?.data) {
                base64Audio = audioContent.data;
                mimeType = audioContent.mime_type || 'audio/wav';
                break;
              }
            }
          }
        }
      } catch (ttsErr) {
        if (isTransientAiError(ttsErr)) {
          throw ttsErr;
        }
        const genResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Ucapkan dalam Bahasa Indonesia dengan gaya ${style} (${speedLabel}): ${script.trim()}`,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
        const part = genResponse.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (part?.inlineData?.data) {
          base64Audio = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/wav';
        }
      }

      if (!base64Audio) {
        return res.status(502).json({
          ok: false,
          message: 'Model TTS tidak mengembalikan data audio WAV.',
        });
      }

      return res.json({
        ok: true,
        audioDataUrl: `data:${mimeType};base64,${base64Audio}`,
        voiceName,
        modelUsed: 'gemini-3.8-flash-lite-tts',
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ ok: false, code: mapped.code, message: mapped.message });
    }
  });

  app.post('/api/render/final', async (req, res) => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sentra-render-'));
    try {
      const {
        scenes = [],
        voiceOverDataUrl,
        aspectRatio = '9:16',
        includeSubtitles = true,
      } = req.body as {
        scenes: Array<{
          mediaUrl: string;
          durationSeconds: number;
          subtitleText?: string;
        }>;
        voiceOverDataUrl?: string;
        aspectRatio?: '9:16' | '16:9';
        includeSubtitles?: boolean;
      };

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'Minimal satu adegan gambar atau video diperlukan untuk merender video final.',
        });
      }

      const width = aspectRatio === '16:9' ? 1280 : 720;
      const height = aspectRatio === '16:9' ? 720 : 1280;
      const segmentPaths: string[] = [];

      let srtContent = '';
      let currentOffsetSec = 0;
      const formatSrtTime = (sec: number) => {
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const secs = Math.floor(sec % 60);
        const ms = Math.round((sec - Math.floor(sec)) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const dur = Math.min(20, Math.max(2, Number(scene.durationSeconds || 5)));
        const { buffer, ext } = await resolveAssetToBuffer(scene.mediaUrl);
        const inputPath = path.join(tmpDir, `input_${i}.${ext}`);
        const segPath = path.join(tmpDir, `seg_${i}.mp4`);
        await fs.writeFile(inputPath, buffer);

        const isVideo = ext === 'mp4';
        const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p`;

        if (isVideo) {
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            inputPath,
            '-t',
            String(dur),
            '-vf',
            vf,
            '-r',
            '24',
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-an',
            segPath,
          ]);
        } else {
          await execFileAsync('ffmpeg', [
            '-y',
            '-loop',
            '1',
            '-i',
            inputPath,
            '-t',
            String(dur),
            '-vf',
            vf,
            '-r',
            '24',
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-pix_fmt',
            'yuv420p',
            segPath,
          ]);
        }
        segmentPaths.push(segPath);

        if (includeSubtitles && scene.subtitleText?.trim()) {
          srtContent += `${i + 1}\n${formatSrtTime(currentOffsetSec)} --> ${formatSrtTime(currentOffsetSec + dur)}\n${scene.subtitleText.trim()}\n\n`;
        }
        currentOffsetSec += dur;
      }

      const concatListPath = path.join(tmpDir, 'concat.txt');
      await fs.writeFile(
        concatListPath,
        segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
      );

      const mergedSilentPath = path.join(tmpDir, 'merged.mp4');
      await execFileAsync('ffmpeg', [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath,
        '-c',
        'copy',
        mergedSilentPath,
      ]);

      let finalVideoPath = mergedSilentPath;

      if (includeSubtitles && srtContent.trim()) {
        const srtPath = path.join(tmpDir, 'subtitles.srt');
        await fs.writeFile(srtPath, srtContent, 'utf8');
        const subtitledPath = path.join(tmpDir, 'subtitled.mp4');
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            finalVideoPath,
            '-vf',
            `subtitles=${srtPath.replace(/:/g, '\\:')}:force_style='FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,MarginV=36'`,
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            subtitledPath,
          ]);
          finalVideoPath = subtitledPath;
        } catch {
          // If libass is unavailable in container build, keep video cleanly without crashing
        }
      }

      if (voiceOverDataUrl) {
        const parsedAudio = parseDataUrl(voiceOverDataUrl);
        if (parsedAudio) {
          const audioPath = path.join(tmpDir, 'voiceover.wav');
          await fs.writeFile(audioPath, Buffer.from(parsedAudio.base64, 'base64'));
          const muxedPath = path.join(tmpDir, 'final_with_audio.mp4');
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            finalVideoPath,
            '-i',
            audioPath,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-shortest',
            muxedPath,
          ]);
          finalVideoPath = muxedPath;
        }
      }

      const finalBuffer = await fs.readFile(finalVideoPath);
      return res.json({
        ok: true,
        videoUrl: `data:video/mp4;base64,${finalBuffer.toString('base64')}`,
        totalDurationSeconds: currentOffsetSec,
        hasSubtitles: Boolean(includeSubtitles && srtContent.trim()),
        hasAudio: Boolean(voiceOverDataUrl),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: `Gagal merender video dengan FFmpeg: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sentra Creation AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
