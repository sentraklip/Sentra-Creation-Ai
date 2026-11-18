import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Mail,
  Play,
  Sparkles,
} from 'lucide-react';
import type {
  AffiliateProject,
  StudioSettings,
  VideoDurationSeconds,
  VideoGenerationMode,
  VideoScene,
} from '../types/studio';
import { safePostJson } from '../utils/apiClient';
import { buildScenePresets } from '../utils/studioLogic';
import { SafeImage } from './StatusTag';

interface VideoStudioViewProps {
  project: AffiliateProject;
  settings: StudioSettings;
  connectedEmail?: string | null;
  onUpdateProject: (updated: AffiliateProject) => void;
}

export function VideoStudioView({
  project,
  connectedEmail,
  onUpdateProject,
}: VideoStudioViewProps) {
  const [isRenderingFinal, setIsRenderingFinal] = useState(false);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderInfo, setRenderInfo] = useState<string | null>(null);

  const handleDurationChange = (dur: VideoDurationSeconds) => {
    const preset = buildScenePresets(dur, project.scenes);
    onUpdateProject({
      ...project,
      videoDuration: dur,
      creative: { ...project.creative, durationSeconds: dur },
      scenes: preset.scenes,
      continuity: preset.continuity,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateScene = (sceneId: string, patch: Partial<VideoScene>) => {
    onUpdateProject({
      ...project,
      scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
      updatedAt: new Date().toISOString(),
    });
  };

  const getEffectivePrompt = (scene: VideoScene) =>
    scene.prompt ||
    `${scene.purpose}. ${scene.characterAction}. ${scene.productInteraction}. Camera: ${scene.cameraMovement}. Lighting: ${scene.lighting}.`;

  const handleGenerateSceneVideo = async (scene: VideoScene) => {
    setErrorMsg(null);
    const idempotencyKey = scene.jobId || `vid-${project.id}-${scene.id}-${Date.now()}`;
    updateScene(scene.id, { status: 'generating', jobId: idempotencyKey, errorMessage: undefined });

    const prevScene = project.scenes.find((s) => s.sceneNumber === scene.sceneNumber - 1);
    const matchedImageAsset = project.images.find((img) => img.imageUrl === scene.referenceImageUrl);
    const prevInteractionId =
      project.continuity.enabled
        ? prevScene?.interactionId || matchedImageAsset?.interactionId
        : undefined;

    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        videoUrl?: string;
        interactionId?: string;
      }>('/api/video/generate', {
        prompt: getEffectivePrompt(scene),
        aspectRatio: project.videoAspectRatio,
        durationSeconds: Math.min(15, scene.durationSeconds),
        referenceImageUrl:
          scene.mode === 'Image-to-Video'
            ? scene.referenceImageUrl || project.images[0]?.imageUrl || project.product.productImages[0]
            : undefined,
        previousInteractionId: prevInteractionId,
        idempotencyKey,
      });
      if (!httpOk || !data.ok) {
        updateScene(scene.id, { status: 'failed', errorMessage: data.message || 'Gagal menghasilkan video adegan.' });
        return;
      }

      updateScene(scene.id, {
        status: 'completed',
        videoUrl: data.videoUrl,
        interactionId: data.interactionId,
        errorMessage: undefined,
      });
    } catch (err) {
      updateScene(scene.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Gagal menghubungi server Veo/Omni.',
      });
    }
  };

  const handleCopyScenePrompt = async (scene: VideoScene) => {
    await navigator.clipboard.writeText(getEffectivePrompt(scene));
    setCopiedSceneId(scene.id);
    setTimeout(() => setCopiedSceneId(null), 1800);
  };

  const handleRenderFinalVideo = async () => {
    setErrorMsg(null);
    setRenderInfo(null);
    const renderScenes = project.scenes
      .map((sc, idx) => {
        const mediaUrl =
          sc.videoUrl ||
          sc.referenceImageUrl ||
          project.images[idx]?.imageUrl ||
          project.product.productImages[idx] ||
          project.product.productImages[0];
        if (!mediaUrl) return null;
        return {
          mediaUrl,
          durationSeconds: Math.min(15, Math.max(3, Math.round(sc.durationSeconds / 3))),
          subtitleText: sc.voiceOver || sc.dialogue || project.creative.storyBeats.HOOK,
        };
      })
      .filter(Boolean);

    if (renderScenes.length === 0) {
      setErrorMsg('Tambahkan minimal satu gambar atau klip video adegan sebelum merender video final.');
      return;
    }

    setIsRenderingFinal(true);
    try {
      const latestVoice = project.voiceOvers[0]?.audioDataUrl;
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        videoUrl?: string;
        totalDurationSeconds?: number;
        hasAudio?: boolean;
        hasSubtitles?: boolean;
      }>('/api/render/final', {
        scenes: renderScenes,
        voiceOverDataUrl: latestVoice,
        aspectRatio: project.videoAspectRatio,
        includeSubtitles,
      });
      if (!httpOk || !data.ok || !data.videoUrl) {
        setErrorMsg(data.message || 'Gagal merender video final dengan FFmpeg.');
        return;
      }

      onUpdateProject({
        ...project,
        currentStep: 10,
        renderedVideoUrl: data.videoUrl,
        updatedAt: new Date().toISOString(),
      });
      setRenderInfo(
        `Video MP4 selesai dirender (${data.totalDurationSeconds ?? 0} detik${data.hasAudio ? ' + Voice-Over' : ''}${data.hasSubtitles ? ' + Subtitle' : ''}).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menjalankan FFmpeg render worker.'
      );
    } finally {
      setIsRenderingFinal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Controls + Continuity Engine */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Video Studio · Google Flow Veo &amp; Omni
            </h1>
            <p className="text-sm text-[#5F6368]">
              Kelola adegan per segmen durasi, generate klip video Veo/Omni langsung, atau salin prompt untuk dijalankan di Google Flow dengan akun Gmail Anda.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#5F6368]">
              <span className="inline-flex items-center gap-1 font-medium text-[#0E7490]">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {connectedEmail
                    ? `Akun Gmail Google Flow: ${connectedEmail}`
                    : 'Akun Gmail belum terhubung (bisa dihubungkan di Dashboard/Settings)'}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <a
                href="https://labs.google/fx/tools/flow"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#D95300] hover:underline"
              >
                <span>Buka Tool Google Flow</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {([15, 30, 45, 60] as VideoDurationSeconds[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDurationChange(d)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono-tabular font-semibold ${
                  project.videoDuration === d
                    ? 'border-[#FF6A00] bg-[#FFF3EB] text-[#C84A00]'
                    : 'border-[#E5E7EB] bg-white text-[#3C4043]'
                }`}
              >
                {d}s ({buildScenePresets(d).scenes.length} adegan)
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#E5E7EB] text-xs">
          <label className="flex items-center gap-2 font-medium text-[#202124]">
            <input
              type="checkbox"
              checked={project.continuity.usePreviousSceneFinalFrame}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  continuity: { ...project.continuity, usePreviousSceneFinalFrame: e.target.checked },
                })
              }
            />
            <span>Gunakan frame akhir sebelumnya</span>
          </label>
          <label className="flex items-center gap-2 font-medium text-[#202124]">
            <input
              type="checkbox"
              checked={project.continuity.preserveCharacter}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  continuity: { ...project.continuity, preserveCharacter: e.target.checked },
                })
              }
            />
            <span>Pertahankan konsistensi karakter</span>
          </label>
          <label className="flex items-center gap-2 font-medium text-[#202124]">
            <input
              type="checkbox"
              checked={project.continuity.preserveProduct}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  continuity: { ...project.continuity, preserveProduct: e.target.checked },
                })
              }
            />
            <span>Pertahankan akurasi produk</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[#5F6368]">Rasio:</span>
            {(['9:16', '16:9'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onUpdateProject({ ...project, videoAspectRatio: r })}
                className={`px-2.5 py-1 rounded border font-mono-tabular font-semibold ${
                  project.videoAspectRatio === r
                    ? 'border-[#25C9D7] bg-[#ECFEFF] text-[#0E7490]'
                    : 'border-[#E5E7EB] text-[#5F6368]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Scene Cards */}
      <section className="space-y-4">
        {project.scenes.map((scene) => {
          return (
            <article
              key={scene.id}
              className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                <div>
                  <div className="text-xs font-mono-tabular text-[#5F6368]">
                    Adegan {scene.sceneNumber} · {scene.durationSeconds} detik
                  </div>
                  <h2 className="font-display text-base font-bold text-[#202124]">
                    {scene.purpose}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Mode generasi adegan ${scene.sceneNumber}`}
                    value={scene.mode}
                    onChange={(e) =>
                      updateScene(scene.id, { mode: e.target.value as VideoGenerationMode })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs bg-white"
                  >
                    <option value="Image-to-Video">Image-to-Video</option>
                    <option value="Text-to-Video">Text-to-Video</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleCopyScenePrompt(scene)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                  >
                    {copiedSceneId === scene.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedSceneId === scene.id ? 'Tersalin' : 'Salin ke Flow'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={scene.status === 'generating'}
                    onClick={() => handleGenerateSceneVideo(scene)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    {scene.status === 'generating' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Generate Veo / Omni</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 space-y-2">
                  <div className="aspect-[9/16] max-h-64 w-full rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F7F8FA]">
                    {scene.videoUrl ? (
                      <video
                        src={scene.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <SafeImage
                        src={scene.referenceImageUrl || project.images[0]?.imageUrl}
                        alt={`Referensi adegan ${scene.sceneNumber}`}
                        className="w-full h-full object-cover"
                        fallbackLabel="Belum ada visual adegan"
                      />
                    )}
                  </div>
                  {scene.errorMessage && (
                    <p className="text-xs text-rose-700">{scene.errorMessage}</p>
                  )}
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Gerakan Kamera</label>
                    <input
                      type="text"
                      value={scene.cameraMovement}
                      onChange={(e) => updateScene(scene.id, { cameraMovement: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Sudut Kamera</label>
                    <input
                      type="text"
                      value={scene.cameraAngle}
                      onChange={(e) => updateScene(scene.id, { cameraAngle: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Aksi Karakter</label>
                    <input
                      type="text"
                      value={scene.characterAction}
                      onChange={(e) => updateScene(scene.id, { characterAction: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Interaksi Produk</label>
                    <input
                      type="text"
                      value={scene.productInteraction}
                      onChange={(e) => updateScene(scene.id, { productInteraction: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Transisi &amp; Efek Suara</label>
                    <input
                      type="text"
                      value={`${scene.transition} · ${scene.soundEffects}`}
                      onChange={(e) => updateScene(scene.id, { transition: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5F6368] mb-1">Teks Voice-Over / Subtitle</label>
                    <input
                      type="text"
                      value={scene.voiceOver}
                      onChange={(e) => updateScene(scene.id, { voiceOver: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#5F6368] mb-1">Prompt Adegan Video (Veo / Omni)</label>
                    <textarea
                      rows={3}
                      value={scene.prompt}
                      onChange={(e) => updateScene(scene.id, { prompt: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* FFmpeg Final Render */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#202124]">
              Render Video Final (FFmpeg Lokal Server)
            </h2>
            <p className="text-xs text-[#5F6368]">
              Menggabungkan adegan visual (klip video Veo/Omni atau gambar referensi), audio Voice-Over Indonesia, dan subtitle otomatis menjadi MP4 siap unggah.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#202124]">
              <input
                type="checkbox"
                checked={includeSubtitles}
                onChange={(e) => setIncludeSubtitles(e.target.checked)}
              />
              <span>Sertakan Subtitle</span>
            </label>
            <button
              type="button"
              disabled={isRenderingFinal}
              onClick={handleRenderFinalVideo}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#202124] hover:bg-black disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {isRenderingFinal ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Film className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Render Video Final (MP4)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {renderInfo && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{renderInfo}</span>
          </div>
        )}

        {project.renderedVideoUrl && (
          <div className="pt-3 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-start gap-5">
            <video
              src={project.renderedVideoUrl}
              controls
              className="w-full sm:w-56 rounded-lg border border-[#E5E7EB] bg-black"
            />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#202124]">
                <Play className="w-4 h-4 text-[#FF6A00]" aria-hidden="true" />
                <span>Pratinjau Video Final Siap Ekspor</span>
              </div>
              <a
                href={project.renderedVideoUrl}
                download={`${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-final.mp4`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-xs font-semibold"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Unduh Video MP4</span>
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
