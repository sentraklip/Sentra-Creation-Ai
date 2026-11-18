import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Mail,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import type {
  AffiliateProject,
  AspectRatio,
  GeneratedImageAsset,
  ImageGenerationMode,
  ImageOutputType,
  NavSection,
  PromptLanguage,
  StudioSettings,
} from '../types/studio';
import { safePostJson } from '../utils/apiClient';
import { formatStructuredImagePrompt } from '../utils/studioLogic';
import { SafeImage } from './StatusTag';

const MODES: ImageGenerationMode[] = [
  'Text-to-Image',
  'Image-to-Image',
  'Product Reference Image',
];

const ASPECT_RATIOS: AspectRatio[] = ['9:16', '1:1', '4:5', '16:9'];

const OUTPUT_TYPES: ImageOutputType[] = [
  'Product Hero Image',
  'Lifestyle Product Image',
  'UGC Scene',
  'Product Detail Image',
  'Advertising Poster',
  'Thumbnail',
];

interface ImageStudioViewProps {
  project: AffiliateProject;
  settings: StudioSettings;
  promptLanguage: PromptLanguage;
  connectedEmail?: string | null;
  onUpdateProject: (updated: AffiliateProject) => void;
  onNavigate: (nav: NavSection) => void;
}

export function ImageStudioView({
  project,
  settings,
  promptLanguage,
  connectedEmail,
  onUpdateProject,
  onNavigate,
}: ImageStudioViewProps) {
  const [mode, setMode] = useState<ImageGenerationMode>('Product Reference Image');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [outputType, setOutputType] = useState<ImageOutputType>('Product Hero Image');
  const [background, setBackground] = useState('Meja batu travertine putih minimalis dengan bayangan jendela pagi');
  const [productPosition, setProductPosition] = useState('Tengah fokus utama dengan ruang teks di atas');
  const [lighting, setLighting] = useState('Soft diffused natural daylight');
  const [cameraAngle, setCameraAngle] = useState('Eye-level 45 derajat');
  const [composition, setComposition] = useState('Clean commercial framing, shallow depth of field');
  const [includeCharacter, setIncludeCharacter] = useState(
    project.character.option !== 'No Character'
  );
  const [customPrompt, setCustomPrompt] = useState(() =>
    formatStructuredImagePrompt(
      {
        subject: project.product.productName.value,
        productDetails: `${project.product.category.value}, ${project.product.materials.value.join(', ')}`,
        environment: 'Minimalist sunlit travertine vanity surface',
        composition: 'Centered vertical commercial framing with clean headroom',
        lighting: 'Soft natural morning daylight',
        camera: '50mm f/2.8 commercial lens',
        visualStyle: project.creative.selectedStyle,
        aspectRatio: '9:16',
        negativeInstructions: 'No fake discount badges, no distorted labels, no text clutter',
      },
      promptLanguage
    )
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedFlow, setCopiedFlow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const materialsText = Array.isArray(project.product.materials?.value)
      ? project.product.materials.value.join(', ')
      : '';
    setIncludeCharacter(project.character.option !== 'No Character');
    setErrorMsg(null);
    setCustomPrompt(
      formatStructuredImagePrompt(
        {
          subject: project.product.productName.value,
          productDetails: `${project.product.category.value}${materialsText ? `, ${materialsText}` : ''}`,
          environment: background,
          composition: `${productPosition}, ${composition}`,
          lighting,
          camera: cameraAngle,
          visualStyle: project.creative.selectedStyle,
          aspectRatio,
          negativeInstructions: 'No fake discount badges, no distorted labels, no text clutter',
        },
        promptLanguage
      )
    );
  }, [project.id, promptLanguage]);

  const rebuildPrompt = () => {
    const charLine =
      includeCharacter && project.character.option !== 'No Character'
        ? ` bersama presenter ${project.character.name} (${project.character.clothing})`
        : '';
    setCustomPrompt(
      formatStructuredImagePrompt(
        {
          subject: `${outputType}: ${project.product.productName.value}${charLine}`,
          productDetails: `${project.product.description.value}`,
          environment: background,
          composition: `${productPosition}, ${composition}`,
          lighting,
          camera: cameraAngle,
          visualStyle: project.creative.selectedStyle,
          aspectRatio,
          negativeInstructions: 'No misleading badges, no distorted product packaging, no watermark',
        },
        promptLanguage
      )
    );
  };

  const handleGenerateImage = async (
    overridePrompt?: string,
    overrideRatio?: AspectRatio,
    overrideType?: ImageOutputType
  ) => {
    setErrorMsg(null);
    setIsGenerating(true);
    const activeModel = settings.preferredImageModel;
    const promptToUse = overridePrompt || customPrompt;
    const ratioToUse = overrideRatio || aspectRatio;
    const typeToUse = overrideType || outputType;

    const refImg =
      mode === 'Text-to-Image'
        ? undefined
        : project.product.productImages[0] ||
          (includeCharacter ? project.character.referenceImages[0] : undefined);

    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        imageUrl?: string;
        interactionId?: string;
        modelUsed?: string;
      }>('/api/images/generate', {
        prompt: promptToUse,
        aspectRatio: ratioToUse,
        model: activeModel,
        referenceImageUrl: refImg,
      });
      if (!httpOk || !data.ok || !data.imageUrl) {
        setErrorMsg(data.message || 'Generasi gambar gagal.');
        return;
      }

      const newAsset: GeneratedImageAsset = {
        id: `img-${Date.now()}`,
        outputType: typeToUse,
        mode,
        aspectRatio: ratioToUse,
        background,
        productPosition,
        lighting,
        cameraAngle,
        composition,
        includeCharacter,
        prompt: promptToUse,
        imageUrl: data.imageUrl,
        interactionId: data.interactionId,
        modelUsed: data.modelUsed || activeModel,
        createdAt: new Date().toISOString(),
      };

      onUpdateProject({
        ...project,
        currentStep: Math.max(project.currentStep, 6),
        images: [newAsset, ...project.images],
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setErrorMsg('Gagal menghubungi server generasi gambar.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(customPrompt);
    setCopiedFlow(true);
    setTimeout(() => setCopiedFlow(false), 1800);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Image Studio · Google Flow Omni Image
            </h1>
            <p className="text-sm text-[#5F6368]">
              Susun komposisi visual produk, integrasikan karakter, lalu generate gambar langsung dalam 1 klik.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('video')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap shrink-0"
          >
            <span>Lanjut ke Video Studio</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="img-mode" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Mode Generasi
            </label>
            <select
              id="img-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as ImageGenerationMode)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="img-type" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Jenis Output Gambar
            </label>
            <select
              id="img-type"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as ImageOutputType)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {OUTPUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#3C4043] mb-1">
              Rasio Aspek
            </span>
            <div className="inline-flex w-full p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-mono-tabular font-semibold ${
                    aspectRatio === r ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="img-bg" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Latar Belakang
            </label>
            <input
              id="img-bg"
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </div>
          <div>
            <label htmlFor="img-pos" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Posisi Produk
            </label>
            <input
              id="img-pos"
              type="text"
              value={productPosition}
              onChange={(e) => setProductPosition(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </div>
          <div>
            <label htmlFor="img-light" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Pencahayaan
            </label>
            <input
              id="img-light"
              type="text"
              value={lighting}
              onChange={(e) => setLighting(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </div>
          <div>
            <label htmlFor="img-cam" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Sudut Kamera
            </label>
            <input
              id="img-cam"
              type="text"
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </div>
          <div>
            <label htmlFor="img-comp" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Komposisi
            </label>
            <input
              id="img-comp"
              type="text"
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#202124]">
              <input
                type="checkbox"
                checked={includeCharacter}
                onChange={(e) => setIncludeCharacter(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#FF6A00]"
              />
              <span>Integrasikan Karakter ({project.character.name})</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="img-prompt" className="text-xs font-semibold text-[#3C4043]">
              Prompt Gambar Terstruktur ({promptLanguage})
            </label>
            <button
              type="button"
              onClick={rebuildPrompt}
              className="text-xs font-semibold text-[#0E7490] hover:underline"
            >
              Perbarui Prompt dari Pengaturan
            </button>
          </div>
          <textarea
            id="img-prompt"
            rows={5}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-xs leading-relaxed"
          />
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E5E7EB]">
          <div className="space-y-0.5">
            <div className="text-xs text-[#202124] font-semibold">
              Google Flow Omni Image · <span className="font-mono-tabular">{settings.preferredImageModel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#5F6368]">
              <Mail className="w-3 h-3 text-[#0E7490]" aria-hidden="true" />
              <span>
                {connectedEmail
                  ? `Gmail terhubung (${connectedEmail}) siap untuk Google Flow`
                  : 'Hubungkan Gmail di Dashboard/Settings untuk sinkronisasi Google Flow'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap"
            >
              {copiedFlow ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copiedFlow ? 'Prompt Tersalin' : 'Salin untuk Flow'}</span>
            </button>
            <a
              href="https://labs.google/fx/tools/flow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap"
            >
              <span>Google Flow</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerateImage()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Generate Gambar AI</span>
            </button>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-[#202124]">
          Galeri Aset Gambar ({project.images.length})
        </h2>
        {project.images.length === 0 ? (
          <p className="text-sm text-[#5F6368]">
            Belum ada gambar yang dihasilkan. Klik Generate Gambar untuk membuat aset pertama Anda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.images.map((img) => (
              <article
                key={img.id}
                className="border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col bg-white"
              >
                <div className="aspect-[4/3] bg-[#F7F8FA] border-b border-[#E5E7EB]">
                  <SafeImage
                    src={img.imageUrl}
                    alt={img.outputType}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-[#202124]">{img.outputType}</div>
                    <div className="text-xs text-[#5F6368] mt-0.5 font-mono-tabular">
                      {img.aspectRatio} · {img.modelUsed}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => handleGenerateImage(img.prompt, img.aspectRatio, img.outputType)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Regenerate</span>
                    </button>
                    <a
                      href={img.imageUrl}
                      download={`${img.outputType.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unduh</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedScenes = project.scenes.map((sc, i) =>
                          i === 0 ? { ...sc, referenceImageUrl: img.imageUrl } : sc
                        );
                        onUpdateProject({ ...project, scenes: updatedScenes });
                        onNavigate('video');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FFF3EB] text-[#C84A00] text-xs font-semibold"
                    >
                      <Film className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Pakai di Video</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
