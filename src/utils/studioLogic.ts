import type {
  AffiliatePlatform,
  ComplianceFinding,
  ComplianceReport,
  ComplianceStatus,
  ContinuityConfig,
  PromptLanguage,
  VideoDurationSeconds,
  VideoScene,
} from '../types/studio';

export function buildScenePresets(
  duration: VideoDurationSeconds,
  existingScenes: VideoScene[] = []
): { scenes: VideoScene[]; continuity: ContinuityConfig } {
  const presetMap: Record<
    VideoDurationSeconds,
    Array<{ purpose: string; durationSeconds: number }>
  > = {
    15: [{ purpose: 'Hook, Solusi, Value, Detail & CTA', durationSeconds: 15 }],
    30: [
      { purpose: 'Hook dan pengenalan masalah pelanggan', durationSeconds: 15 },
      { purpose: 'Solusi, value, detail produk dan CTA', durationSeconds: 15 },
    ],
    45: [
      { purpose: 'Hook dan masalah utama audiens', durationSeconds: 15 },
      { purpose: 'Demonstrasi solusi & detail keunggulan produk', durationSeconds: 15 },
      { purpose: 'Bukti penggunaan nyata & CTA keranjang bawah', durationSeconds: 15 },
    ],
    60: [
      { purpose: 'Hook kuat & skenario masalah sehari-hari', durationSeconds: 15 },
      { purpose: 'Unboxing / pengenalan produk & bahan utama', durationSeconds: 15 },
      { purpose: 'Demo pemakaian & manfaat terverifikasi', durationSeconds: 15 },
      { purpose: 'Ringkasan nilai produk & ajakan CTA jelas', durationSeconds: 15 },
    ],
  };

  const specs = presetMap[duration];
  const scenes: VideoScene[] = specs.map((spec, idx) => {
    const prev = existingScenes[idx];
    return {
      id: prev?.id ?? `scene-${idx + 1}`,
      sceneNumber: idx + 1,
      purpose: spec.purpose,
      durationSeconds: spec.durationSeconds,
      mode: prev?.mode ?? 'Image-to-Video',
      cameraMovement: prev?.cameraMovement ?? (idx === 0 ? 'Slow push-in' : 'Gentle handheld pan'),
      cameraAngle: prev?.cameraAngle ?? (idx === 0 ? 'Eye-level close-up' : '45-degree product angle'),
      characterAction:
        prev?.characterAction ??
        (idx === 0 ? 'Menunjukkan produk langsung ke kamera dengan ekspresi antusias' : 'Mengaplikasikan atau mendemonstrasikan detail produk'),
      productInteraction:
        prev?.productInteraction ?? 'Memegang kemasan produk dengan label menghadap kamera secara jelas',
      background: prev?.background ?? 'Ruang interior rumah minimalis dengan cahaya alami jendela',
      lighting: prev?.lighting ?? 'Soft natural daylight',
      visualStyle: prev?.visualStyle ?? 'Authentic UGC creator video',
      dialogue: prev?.dialogue ?? '',
      voiceOver: prev?.voiceOver ?? '',
      transition: prev?.transition ?? (idx === 0 ? 'Cut langsung' : 'Smooth cross-dissolve 0.3s'),
      soundEffects: prev?.soundEffects ?? (idx === 0 ? 'Subtle whoosh pop' : 'Soft ambient room tone'),
      prompt: prev?.prompt ?? '',
      referenceImageUrl: prev?.referenceImageUrl,
      videoUrl: prev?.videoUrl,
      jobId: prev?.jobId,
      status: prev?.status ?? 'draft',
      errorMessage: prev?.errorMessage,
    };
  });

  return {
    scenes,
    continuity: {
      enabled: specs.length > 1,
      usePreviousSceneFinalFrame: specs.length > 1,
      preserveCharacter: true,
      preserveProduct: true,
      preserveEnvironmentWhenNeeded: true,
    },
  };
}

const EXCLUDED_MARKETPLACE_TERMS: Array<{ term: string; pattern: RegExp }> = [
  { term: 'Harga / Nominal Rupiah', pattern: /\b(rp\.?\s?\d+|harga|ribu|jutaan)\b/i },
  { term: 'Diskon / Promo', pattern: /\b(diskon|potongan|promo|banting harga|termurah)\b/i },
  { term: 'Voucher', pattern: /\b(voucher|kupon|kode promo)\b/i },
  { term: 'Flash Sale', pattern: /\b(flash\s*sale|cuci gudang|serbu sekarang)\b/i },
  { term: 'Cashback', pattern: /\b(cashback|koin kembali)\b/i },
  { term: 'Gratis Ongkir', pattern: /\b(gratis ongkir|free ongkir|bebas ongkir)\b/i },
  { term: 'Komisi Affiliate', pattern: /\b(komisi|cuan affiliate|persentase komisi)\b/i },
];

const MEDICAL_OR_OVERCLAIM_PATTERNS: Array<{ pattern: RegExp; message: string; suggestion: string }> = [
  {
    pattern: /\b(100%|pasti|dijamin|permanen|instan dalam 1 hari|menyembuhkan|mengobati penyakit|anti kanker|bpom palsu)\b/i,
    message: 'Klaim absolut atau medis berisiko tinggi ditolak oleh platform affiliate.',
    suggestion: 'Ganti dengan kalimat pengalaman realistis yang terverifikasi dari deskripsi resmi produk.',
  },
  {
    pattern: /\b(hari ini saja|terakhir hari ini|stok tinggal \d+|besok harga naik|wajib beli sekarang)\b/i,
    message: 'Terdeteksi urgensi palsu (false urgency) yang dapat memicu penalti kepatuhan.',
    suggestion: 'Gunakan ajakan netral seperti "Cek produknya di keranjang bawah."',
  },
  {
    pattern: /\b(testimoni dokter|kata artis|viral sejuta orang)\b/i,
    message: 'Referensi pihak ketiga/testimoni tanpa bukti resmi berisiko dianggap menyesatkan.',
    suggestion: 'Fokus pada fitur fisik dan spesifikasi produk yang terkonfirmasi.',
  },
];

export function evaluateComplianceLocally(
  scriptText: string,
  platform: AffiliatePlatform,
  hasUnknownSpecs = false
): ComplianceReport {
  const findings: ComplianceFinding[] = [];
  const excludedMarketplaceTermsFound: string[] = [];

  for (const item of EXCLUDED_MARKETPLACE_TERMS) {
    const match = scriptText.match(item.pattern);
    if (match) {
      excludedMarketplaceTermsFound.push(item.term);
      findings.push({
        id: `mkt-${item.term}`,
        checkType: 'Informasi Marketplace Dinamis',
        severity: 'medium',
        excerpt: match[0],
        message: `Menyebut "${match[0]}" (${item.term}) di dalam naskah berisiko kedaluwarsa karena harga & promo berubah setiap saat.`,
        suggestion: 'Hapus nominal harga/promo dari naskah kreatif dan arahkan penonton memeriksa keranjang produk.',
      });
    }
  }

  for (let i = 0; i < MEDICAL_OR_OVERCLAIM_PATTERNS.length; i++) {
    const rule = MEDICAL_OR_OVERCLAIM_PATTERNS[i];
    const match = scriptText.match(rule.pattern);
    if (match) {
      findings.push({
        id: `claim-${i}`,
        checkType: 'Klaim & Urgensi Berisiko',
        severity: 'high',
        excerpt: match[0],
        message: rule.message,
        suggestion: rule.suggestion,
      });
    }
  }

  if (platform === 'TikTok Affiliate' && !/\b(keranjang|affiliate|promosi|ads|iklan)\b/i.test(scriptText)) {
    findings.push({
      id: 'disclosure-tiktok',
      checkType: 'Pengungkapan Konten (Disclosure)',
      severity: 'low',
      excerpt: 'Tidak ada penyebutan keranjang/tautan affiliate',
      message: 'Pastikan label konten komersial / keranjang kuning diaktifkan saat mengunggah ke TikTok Affiliate.',
      suggestion: 'Tambahkan CTA jelas seperti "Cek produknya di keranjang bawah." dan aktifkan toggle iklan/komisi platform.',
    });
  }

  if (hasUnknownSpecs) {
    findings.push({
      id: 'unknown-specs',
      checkType: 'Spesifikasi Belum Terkonfirmasi',
      severity: 'medium',
      excerpt: 'Ada data produk berstatus TIDAK_DIKETAHUI',
      message: 'Beberapa spesifikasi atau klaim produk belum terverifikasi dari sumber resmi.',
      suggestion: 'Hindari menyebut detail yang berstatus TIDAK_DIKETAHUI di naskah suara maupun teks layar.',
    });
  }

  let status: ComplianceStatus = 'LOW_RISK';
  if (findings.some((f) => f.severity === 'high')) {
    status = 'HIGH_RISK';
  } else if (findings.length > 0) {
    status = 'NEEDS_REVIEW';
  }

  return {
    platform,
    status,
    checkedAt: new Date().toISOString(),
    excludedMarketplaceTermsFound,
    findings,
    disclaimer:
      'Pemeriksaan kepatuhan mengurangi risiko penolakan konten namun tidak menjamin persetujuan otomatis dari platform.',
  };
}

export interface ImagePromptStruct {
  subject: string;
  productDetails: string;
  environment: string;
  composition: string;
  lighting: string;
  camera: string;
  visualStyle: string;
  aspectRatio: string;
  negativeInstructions: string;
}

export function formatStructuredImagePrompt(
  fields: ImagePromptStruct,
  language: PromptLanguage
): string {
  if (language === 'Indonesian') {
    return [
      `Subjek: ${fields.subject}`,
      `Detail Produk: ${fields.productDetails}`,
      `Lingkungan: ${fields.environment}`,
      `Komposisi: ${fields.composition}`,
      `Pencahayaan: ${fields.lighting}`,
      `Kamera: ${fields.camera}`,
      `Gaya Visual: ${fields.visualStyle}`,
      `Rasio Aspek: ${fields.aspectRatio}`,
      `Instruksi Negatif: ${fields.negativeInstructions}`,
    ].join('\n');
  }

  return [
    `Subject: ${fields.subject}`,
    `Product Details: ${fields.productDetails}`,
    `Environment: ${fields.environment}`,
    `Composition: ${fields.composition}`,
    `Lighting: ${fields.lighting}`,
    `Camera: ${fields.camera}`,
    `Visual Style: ${fields.visualStyle}`,
    `Aspect Ratio: ${fields.aspectRatio}`,
    `Negative Instructions: ${fields.negativeInstructions}`,
  ].join('\n');
}

export interface VideoPromptStruct {
  sceneDescription: string;
  subject: string;
  characterAction: string;
  productInteraction: string;
  cameraMovement: string;
  environment: string;
  lighting: string;
  dialogue: string;
  audio: string;
  duration: string;
  aspectRatio: string;
  continuityInstructions: string;
}

export function formatStructuredVideoPrompt(
  fields: VideoPromptStruct,
  language: PromptLanguage
): string {
  if (language === 'Indonesian') {
    return [
      `Deskripsi Adegan: ${fields.sceneDescription}`,
      `Subjek: ${fields.subject}`,
      `Aksi Karakter: ${fields.characterAction}`,
      `Interaksi Produk: ${fields.productInteraction}`,
      `Gerakan Kamera: ${fields.cameraMovement}`,
      `Lingkungan: ${fields.environment}`,
      `Pencahayaan: ${fields.lighting}`,
      `Dialog: ${fields.dialogue || 'Tanpa dialog langsung'}`,
      `Audio: ${fields.audio}`,
      `Durasi: ${fields.duration}`,
      `Rasio Aspek: ${fields.aspectRatio}`,
      `Instruksi Kontinuitas: ${fields.continuityInstructions}`,
    ].join('\n');
  }

  return [
    `Scene Description: ${fields.sceneDescription}`,
    `Subject: ${fields.subject}`,
    `Character Action: ${fields.characterAction}`,
    `Product Interaction: ${fields.productInteraction}`,
    `Camera Movement: ${fields.cameraMovement}`,
    `Environment: ${fields.environment}`,
    `Lighting: ${fields.lighting}`,
    `Dialogue: ${fields.dialogue || 'None (voice-over driven)'}`,
    `Audio: ${fields.audio}`,
    `Duration: ${fields.duration}`,
    `Aspect Ratio: ${fields.aspectRatio}`,
    `Continuity Instructions: ${fields.continuityInstructions}`,
  ].join('\n');
}
