import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  FileText,
  Globe,
  ImagePlus,
  Loader2,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type {
  AffiliateProject,
  ContentStyle,
  NavSection,
  ProductAnalysis,
  ProductInputMethod,
} from '../types/studio';
import { compressImageFile, safePostJson } from '../utils/apiClient';
import { DataStatusLabel, SafeImage } from './StatusTag';

const VALID_STYLES: ContentStyle[] = [
  'UGC Review',
  'Casual Product Review',
  'Cinematic Commercial',
  'Product Showcase',
  'Lifestyle Advertising',
  'Problem Solution',
  'Unboxing',
  'Tutorial',
  'Storytelling',
  'Before After',
];

const PLACEHOLDER_VALUES = new Set([
  'Produk Baru (Belum Dianalisis)',
  'Belum diketahui',
  'Masukkan URL, gambar, atau deskripsi produk.',
  'Tidak tercantum',
]);

function cleanEditableValue(val?: string, status?: string): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed || status === 'TIDAK_DIKETAHUI' || PLACEHOLDER_VALUES.has(trimmed)) {
    return '';
  }
  return trimmed;
}

interface ProductAnalyzerViewProps {
  project: AffiliateProject;
  onUpdateProject: (updated: AffiliateProject) => void;
  onNavigate: (nav: NavSection) => void;
}

export function ProductAnalyzerView({
  project,
  onUpdateProject,
  onNavigate,
}: ProductAnalyzerViewProps) {
  const [inputMethod, setInputMethod] = useState<ProductInputMethod>(
    project.product.inputMethod || 'product_url'
  );
  const [productUrl, setProductUrl] = useState(project.product.sourceUrl || '');
  const [manualName, setManualName] = useState(() =>
    project.isExampleSeed
      ? ''
      : cleanEditableValue(project.product.productName?.value, project.product.productName?.status)
  );
  const [manualBrand, setManualBrand] = useState(() =>
    project.isExampleSeed
      ? ''
      : cleanEditableValue(project.product.brand?.value, project.product.brand?.status)
  );
  const [manualDescription, setManualDescription] = useState(() =>
    project.isExampleSeed
      ? ''
      : cleanEditableValue(project.product.description?.value, project.product.description?.status)
  );
  const [manualFeatures, setManualFeatures] = useState('');
  const [manualUsage, setManualUsage] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [fetchedText, setFetchedText] = useState('');
  const [accessWarning, setAccessWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusStage, setStatusStage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setInputMethod(project.product.inputMethod || 'product_url');
    setProductUrl(project.product.sourceUrl || '');
    setManualName(
      project.isExampleSeed
        ? ''
        : cleanEditableValue(project.product.productName?.value, project.product.productName?.status)
    );
    setManualBrand(
      project.isExampleSeed
        ? ''
        : cleanEditableValue(project.product.brand?.value, project.product.brand?.status)
    );
    setManualDescription(
      project.isExampleSeed
        ? ''
        : cleanEditableValue(project.product.description?.value, project.product.description?.status)
    );
    setManualFeatures('');
    setManualUsage('');
    setUploadedImages([]);
    setFetchedText('');
    setAccessWarning(null);
    setErrorMsg(null);
    setStatusStage(null);
  }, [project.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    e.target.value = '';
    if (files.length === 0) return;

    try {
      const compressed = await Promise.all(files.map((file) => compressImageFile(file)));
      setUploadedImages((prev) => [...prev, ...compressed].slice(0, 4));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar unggahan.');
    }
  };

  const handleFetchUrl = async () => {
    setErrorMsg(null);
    setAccessWarning(null);
    const trimmed = productUrl.trim();
    if (!trimmed) {
      setErrorMsg('Masukkan URL produk terlebih dahulu (TikTok Shop, Shopee, atau situs resmi).');
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setProductUrl(normalizedUrl);
    setIsAnalyzing(true);
    setStatusStage('Mengambil konten halaman produk...');

    try {
      const { data } = await safePostJson<{
        ok?: boolean;
        accessBlocked?: boolean;
        message?: string;
        marketplace?: string;
        title?: string;
        metaDescription?: string;
        extractedText?: string;
      }>('/api/products/fetch-url', { url: normalizedUrl });

      if (!data.ok || data.accessBlocked) {
        if (data.accessBlocked) {
          setAccessWarning(
            data.message ||
              'URL tidak dapat diakses otomatis. Silakan unggah foto/screenshot produk atau masukkan detail secara manual.'
          );
        } else {
          setErrorMsg(
            data.message ||
              'URL tidak dapat diambil. Periksa kembali tautan atau gunakan metode Upload Screenshot / Input Manual.'
          );
        }
        return;
      }

      const combined = [
        data.title ? `Judul: ${data.title}` : '',
        data.metaDescription ? `Deskripsi Meta: ${data.metaDescription}` : '',
        data.extractedText ? `Konten:\n${data.extractedText}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      setFetchedText(combined);
      await runAnalysis(combined, data.marketplace);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke server pembaca URL. Silakan coba Upload Screenshot atau Input Manual.'
      );
    } finally {
      setIsAnalyzing(false);
      setStatusStage(null);
    }
  };

  const runAnalysis = async (overrideExtractedText?: string, marketplaceOverride?: string) => {
    setErrorMsg(null);
    const effectiveText = overrideExtractedText ?? fetchedText;
    const hasManualInput = Boolean(
      manualName.trim() ||
        manualBrand.trim() ||
        manualDescription.trim() ||
        manualFeatures.trim() ||
        manualUsage.trim()
    );
    const hasImages = uploadedImages.length > 0;
    const hasText = Boolean(effectiveText.trim());

    if (!hasText && !hasManualInput && !hasImages) {
      setErrorMsg(
        'Lengkapi minimal nama/deskripsi produk, teks hasil URL, atau unggah gambar/screenshot produk.'
      );
      return;
    }

    setIsAnalyzing(true);
    setStatusStage('Menganalisis & memverifikasi fakta produk dengan Gemini...');

    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        modelUsed?: string;
        analysis?: Record<string, unknown>;
      }>('/api/products/analyze', {
        inputMethod,
        sourceUrl: productUrl.trim() || undefined,
        marketplace: marketplaceOverride || 'Manual',
        extractedText: effectiveText,
        manualDetails: hasManualInput
          ? {
              productName: manualName.trim(),
              brand: manualBrand.trim(),
              description: manualDescription.trim(),
              features: manualFeatures.trim(),
              usageInstructions: manualUsage.trim(),
            }
          : {},
        imagesBase64: uploadedImages,
      });

      if (!httpOk || !data.ok || !data.analysis) {
        setErrorMsg(data.message || 'Analisis produk gagal. Silakan periksa input dan coba lagi.');
        return;
      }

      const a = data.analysis as unknown as {
        productName: ProductAnalysis['productName'];
        brand: ProductAnalysis['brand'];
        category: ProductAnalysis['category'];
        description: ProductAnalysis['description'];
        specifications: ProductAnalysis['specifications'];
        materials: ProductAnalysis['materials'];
        dimensions: ProductAnalysis['dimensions'];
        colors: ProductAnalysis['colors'];
        features: ProductAnalysis['features'];
        benefits: ProductAnalysis['benefits'];
        targetAudience: ProductAnalysis['targetAudience'];
        usageInstructions: ProductAnalysis['usageInstructions'];
        price?: ProductAnalysis['price'];
        summary?: string;
        mainSellingPoints?: string[];
        verifiedFeatures?: string[];
        customerProblems?: string[];
        potentialSolutions?: string[];
        valueProposition?: string;
        recommendedAngles?: string[];
        contentRecommendations?: string[];
        missingInformation?: string[];
        recommendedStyle?: string;
        styleReason?: string;
        storyBeats?: {
          HOOK?: string;
          SOLUSI?: string;
          VALUE?: string;
          DETAIL?: string;
          CTA?: string;
        };
        flaggedClaims?: Array<Record<string, string>>;
      };

      const updatedProduct: ProductAnalysis = {
        inputMethod,
        sourceUrl: productUrl.trim() || undefined,
        marketplace: (marketplaceOverride as ProductAnalysis['marketplace']) || 'Manual',
        extractedAt: new Date().toISOString(),
        productName: a.productName,
        brand: a.brand,
        category: a.category,
        description: a.description,
        specifications: a.specifications,
        materials: a.materials,
        dimensions: a.dimensions,
        colors: a.colors,
        features: a.features,
        benefits: a.benefits,
        targetAudience: a.targetAudience,
        usageInstructions: a.usageInstructions,
        price: {
          value: a.price?.value || 'Dikecualikan dari klaim kreatif',
          status: a.price?.status || 'TIDAK_DIKETAHUI',
          excludeFromClaims: true,
          requiresFreshVerification: true,
        },
        productImages:
          uploadedImages.length > 0 ? uploadedImages : project.product.productImages,
        summary: a.summary || '',
        mainSellingPoints: Array.isArray(a.mainSellingPoints) ? a.mainSellingPoints : [],
        verifiedFeatures: Array.isArray(a.verifiedFeatures) ? a.verifiedFeatures : [],
        customerProblems: Array.isArray(a.customerProblems) ? a.customerProblems : [],
        potentialSolutions: Array.isArray(a.potentialSolutions) ? a.potentialSolutions : [],
        valueProposition: a.valueProposition || '',
        recommendedAngles: Array.isArray(a.recommendedAngles) ? a.recommendedAngles : [],
        contentRecommendations: Array.isArray(a.contentRecommendations) ? a.contentRecommendations : [],
        missingInformation: Array.isArray(a.missingInformation) ? a.missingInformation : [],
        flaggedClaims: Array.isArray(a.flaggedClaims)
          ? a.flaggedClaims.map((c, idx) => ({
              id: `flag-${idx}`,
              claim: String(c.claim || ''),
              category: (c.category as ProductAnalysis['flaggedClaims'][number]['category']) || 'unsupported',
              severity: (c.severity as ProductAnalysis['flaggedClaims'][number]['severity']) || 'warning',
              recommendation: String(c.recommendation || ''),
            }))
          : [],
      };

      const nextTitle =
        updatedProduct.productName?.value &&
        updatedProduct.productName.status !== 'TIDAK_DIKETAHUI'
          ? updatedProduct.productName.value
          : manualName.trim() || project.title;

      const nextBeats = {
        HOOK: a.storyBeats?.HOOK || project.creative.storyBeats.HOOK || '',
        SOLUSI: a.storyBeats?.SOLUSI || project.creative.storyBeats.SOLUSI || '',
        VALUE: a.storyBeats?.VALUE || project.creative.storyBeats.VALUE || '',
        DETAIL: a.storyBeats?.DETAIL || project.creative.storyBeats.DETAIL || '',
        CTA: a.storyBeats?.CTA || project.creative.storyBeats.CTA || 'Cek produknya di keranjang bawah.',
      };

      const matchedStyle = VALID_STYLES.find((st) => st === a.recommendedStyle);

      onUpdateProject({
        ...project,
        title: nextTitle,
        isExampleSeed: false,
        currentStep: Math.max(project.currentStep, 3),
        updatedAt: new Date().toISOString(),
        product: updatedProduct,
        creative: {
          ...project.creative,
          selectedStyle: matchedStyle || project.creative.selectedStyle,
          autoSelectedReason: a.styleReason || project.creative.autoSelectedReason,
          storyBeats: nextBeats,
          voiceOverScript: [nextBeats.HOOK, nextBeats.SOLUSI, nextBeats.VALUE, nextBeats.DETAIL, nextBeats.CTA]
            .filter(Boolean)
            .join(' '),
        },
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menghubungi server analisis AI.'
      );
    } finally {
      setIsAnalyzing(false);
      setStatusStage(null);
    }
  };

  const p = project.product;
  const joinArray = (val: unknown, sep = ' · ') =>
    Array.isArray(val) ? val.join(sep) : typeof val === 'string' ? val : '';

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Input &amp; Analisis Produk
            </h1>
            <p className="text-sm text-[#5F6368] mt-0.5">
              Masukkan URL, unggah gambar/screenshot, atau isi manual. AI menandai data sebagai Terkonfirmasi, Inferensi, atau Tidak Diketahui.
            </p>
          </div>
          <span className="text-xs font-medium text-[#0E7490] whitespace-nowrap">
            Model: gemini-4-hydrogen
          </span>
        </div>

        {/* 4 Input Tabs */}
        <div
          className="inline-flex flex-wrap gap-1 p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg"
          role="tablist"
          aria-label="Metode input produk"
        >
          {[
            { id: 'product_url', label: 'URL Produk', icon: Globe },
            { id: 'image_upload', label: 'Upload Gambar', icon: ImagePlus },
            { id: 'screenshot_upload', label: 'Upload Screenshot', icon: Camera },
            { id: 'manual_input', label: 'Input Manual', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = inputMethod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setInputMethod(tab.id as ProductInputMethod);
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#202124] shadow-sm'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {inputMethod === 'product_url' && (
          <div className="space-y-3">
            <label htmlFor="product-url-input" className="block text-sm font-medium text-[#202124]">
              URL Halaman Produk (TikTok Shop, Shopee, atau Web Toko)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="product-url-input"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://shopee.co.id/... atau https://tokoanda.com/produk"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleFetchUrl}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                <span>Ambil & Analisis URL</span>
              </button>
            </div>
            <p className="text-xs text-[#5F6368]">
              Kami menghormati kontrol akses situs. Jika marketplace memblokir pembacaan otomatis atau meminta CAPTCHA/login, gunakan Upload Screenshot atau Input Manual.
            </p>

            {fetchedText && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="fetched-text-preview" className="text-xs font-semibold text-[#3C4043]">
                    Teks Terbaca dari URL (Dapat Disunting)
                  </label>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => runAnalysis()}
                    className="text-xs font-semibold text-[#D95300] hover:underline disabled:opacity-50"
                  >
                    Analisis Ulang Teks Ini
                  </button>
                </div>
                <textarea
                  id="fetched-text-preview"
                  rows={4}
                  value={fetchedText}
                  onChange={(e) => setFetchedText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] text-xs leading-relaxed focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
            )}
          </div>
        )}

        {(inputMethod === 'image_upload' || inputMethod === 'screenshot_upload') && (
          <div className="space-y-4">
            <label
              htmlFor="product-file-upload"
              className="flex flex-col items-center justify-center border border-dashed border-[#CBD5E1] rounded-xl p-6 bg-[#F7F8FA] hover:border-[#FF6A00] cursor-pointer transition-colors"
            >
              <Upload className="w-6 h-6 text-[#5F6368] mb-2" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#202124]">
                {inputMethod === 'screenshot_upload'
                  ? 'Pilih Screenshot Halaman Produk (maks. 4 gambar)'
                  : 'Pilih Foto Produk Resmi / Kemasan (maks. 4 gambar)'}
              </span>
              <span className="text-xs text-[#5F6368] mt-1">
                PNG, JPG, atau WEBP (otomatis dikompresi agar cepat dianalisis)
              </span>
              <input
                id="product-file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#E5E7EB]">
                    <img src={img} alt={`Unggahan produk ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Hapus gambar ${i + 1}`}
                      onClick={() =>
                        setUploadedImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#202124]/80 text-white flex items-center justify-center hover:bg-rose-600"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => runAnalysis()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
              <span>Analisis Gambar Produk</span>
            </button>
          </div>
        )}

        {inputMethod === 'manual_input' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="manual-name" className="block text-xs font-semibold text-[#3C4043] mb-1">
                Nama Produk *
              </label>
              <input
                id="manual-name"
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Contoh: Botol Minum Vacuum Stainless 500ml"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
            <div>
              <label htmlFor="manual-brand" className="block text-xs font-semibold text-[#3C4043] mb-1">
                Merek / Brand
              </label>
              <input
                id="manual-brand"
                type="text"
                value={manualBrand}
                onChange={(e) => setManualBrand(e.target.value)}
                placeholder="Contoh: HydroMate (atau kosongkan jika belum diketahui)"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="manual-desc" className="block text-xs font-semibold text-[#3C4043] mb-1">
                Deskripsi Resmi Produk *
              </label>
              <textarea
                id="manual-desc"
                rows={3}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Salin deskripsi resmi produk, bahan, ukuran, dan cara pakai dari halaman toko..."
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
            <div>
              <label htmlFor="manual-features" className="block text-xs font-semibold text-[#3C4043] mb-1">
                Fitur Utama (opsional)
              </label>
              <input
                id="manual-features"
                type="text"
                value={manualFeatures}
                onChange={(e) => setManualFeatures(e.target.value)}
                placeholder="Contoh: Tahan panas 12 jam, tutup anti bocor"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
            <div>
              <label htmlFor="manual-usage" className="block text-xs font-semibold text-[#3C4043] mb-1">
                Cara Penggunaan (opsional)
              </label>
              <input
                id="manual-usage"
                type="text"
                value={manualUsage}
                onChange={(e) => setManualUsage(e.target.value)}
                placeholder="Contoh: Cuci sebelum pemakaian pertama"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => runAnalysis()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                <span>Analisis Produk</span>
              </button>
            </div>
          </div>
        )}

        {statusStage && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#ECFEFF] border border-[#A5F3FC] text-xs font-medium text-[#0E7490]">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{statusStage}</span>
          </div>
        )}

        {accessWarning && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
            <div className="space-y-2">
              <p>{accessWarning}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInputMethod('screenshot_upload')}
                  className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Upload Screenshot
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('manual_input')}
                  className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Isi Detail Manual
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Extracted Product Truth Table & Strategic Analysis */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#202124]">
                Data Ekstraksi Produk (14 Bidang Terstruktur)
              </h2>
              <p className="text-xs text-[#5F6368]">
                Harga & promo otomatis dikecualikan dari klaim kreatif untuk menghindari informasi kedaluwarsa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('creative')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] hover:border-[#FF6A00] text-xs font-semibold text-[#202124] whitespace-nowrap"
            >
              <span>Lanjut ke Creative Studio</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <dl className="divide-y divide-[#E5E7EB] text-sm">
            {[
              { label: 'Nama Produk', field: p.productName },
              { label: 'Brand / Merek', field: p.brand },
              { label: 'Kategori', field: p.category },
              { label: 'Deskripsi', field: p.description },
              {
                label: 'Spesifikasi',
                field: {
                  value: joinArray(p.specifications?.value) || '-',
                  status: p.specifications?.status || 'TIDAK_DIKETAHUI',
                },
              },
              {
                label: 'Material / Bahan',
                field: {
                  value: joinArray(p.materials?.value, ', ') || '-',
                  status: p.materials?.status || 'TIDAK_DIKETAHUI',
                },
              },
              { label: 'Dimensi / Ukuran', field: p.dimensions },
              {
                label: 'Pilihan Warna',
                field: {
                  value: joinArray(p.colors?.value, ', ') || '-',
                  status: p.colors?.status || 'TIDAK_DIKETAHUI',
                },
              },
              {
                label: 'Fitur Terverifikasi',
                field: {
                  value: joinArray(p.features?.value) || '-',
                  status: p.features?.status || 'TIDAK_DIKETAHUI',
                },
              },
              {
                label: 'Manfaat',
                field: {
                  value: joinArray(p.benefits?.value) || '-',
                  status: p.benefits?.status || 'TIDAK_DIKETAHUI',
                },
              },
              { label: 'Target Audiens', field: p.targetAudience },
              { label: 'Cara Penggunaan', field: p.usageInstructions },
              {
                label: 'Harga (Dikecualikan)',
                field: {
                  value: `${p.price?.value || 'Dikecualikan dari klaim kreatif'} (Wajib cek ulang langsung di keranjang)`,
                  status: p.price?.status || 'TIDAK_DIKETAHUI',
                },
              },
            ].map((row) => (
              <div key={row.label} className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <dt className="sm:col-span-4 font-medium text-[#5F6368]">{row.label}</dt>
                <dd className="sm:col-span-5 text-[#202124]">{row.field?.value || '-'}</dd>
                <dd className="sm:col-span-3 sm:text-right">
                  <DataStatusLabel status={row.field?.status || 'TIDAK_DIKETAHUI'} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right Strategic Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-[#202124]">
              Ringkasan & Sudut Pandang Pemasaran
            </h3>
            <div className="aspect-square rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F7F8FA]">
              <SafeImage
                src={p.productImages?.[0]}
                alt={p.productName?.value || 'Foto Produk'}
                className="w-full h-full object-cover"
                fallbackLabel="Foto produk belum diunggah"
              />
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-[#5F6368]">Value Proposition</div>
                <p className="text-[#202124] mt-0.5">{p.valueProposition || '-'}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#5F6368]">Poin Jual Utama</div>
                {Array.isArray(p.mainSellingPoints) && p.mainSellingPoints.length > 0 ? (
                  <ul className="mt-1 space-y-1 list-disc list-inside text-[#3C4043]">
                    {p.mainSellingPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#5F6368] mt-1">Belum ada poin jual.</p>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#5F6368]">Rekomendasi Angle Konten</div>
                {Array.isArray(p.recommendedAngles) && p.recommendedAngles.length > 0 ? (
                  <ul className="mt-1 space-y-1 list-disc list-inside text-[#3C4043]">
                    {p.recommendedAngles.map((ang, i) => (
                      <li key={i}>{ang}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#5F6368] mt-1">Belum ada rekomendasi angle.</p>
                )}
              </div>
              {Array.isArray(p.missingInformation) && p.missingInformation.length > 0 && (
                <div className="pt-2 border-t border-[#E5E7EB]">
                  <div className="text-xs font-semibold text-amber-700">Informasi yang Belum Lengkap</div>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-xs text-[#5F6368]">
                    {p.missingInformation.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {Array.isArray(p.flaggedClaims) && p.flaggedClaims.length > 0 && (
            <div className="bg-white border border-rose-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                <span>Tinjauan Klaim Berisiko</span>
              </div>
              <ul className="space-y-2.5 text-xs">
                {p.flaggedClaims.map((flag) => (
                  <li key={flag.id} className="p-2.5 rounded-lg bg-rose-50 text-rose-900">
                    <div className="font-semibold">{flag.claim}</div>
                    <div className="mt-1 text-rose-700">{flag.recommendation}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
