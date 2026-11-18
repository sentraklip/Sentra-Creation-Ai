import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AffiliatePlatform,
  AffiliateProject,
  ContentStyle,
  NavSection,
  PromptLanguage,
  StoryBeats,
  VideoDurationSeconds,
} from '../types/studio';
import { safePostJson } from '../utils/apiClient';
import { buildScenePresets } from '../utils/studioLogic';
import { ComplianceStatusLabel } from './StatusTag';

const CONTENT_STYLES: ContentStyle[] = [
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

const PLATFORMS: AffiliatePlatform[] = [
  'TikTok Affiliate',
  'Shopee Affiliate',
  'General Advertising',
];

const DURATIONS: VideoDurationSeconds[] = [15, 30, 45, 60];

interface CreativeStudioViewProps {
  project: AffiliateProject;
  promptLanguage: PromptLanguage;
  onUpdateProject: (updated: AffiliateProject) => void;
  onNavigate: (nav: NavSection) => void;
}

export function CreativeStudioView({
  project,
  promptLanguage,
  onUpdateProject,
  onNavigate,
}: CreativeStudioViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const c = project.creative;

  const updateCreativeField = <K extends keyof typeof c>(key: K, value: (typeof c)[K]) => {
    const nextCreative = { ...c, [key]: value };
    let nextProject: AffiliateProject = {
      ...project,
      creative: nextCreative,
      updatedAt: new Date().toISOString(),
    };

    if (key === 'durationSeconds') {
      const dur = value as VideoDurationSeconds;
      const preset = buildScenePresets(dur, project.scenes);
      nextProject = {
        ...nextProject,
        videoDuration: dur,
        scenes: preset.scenes,
        continuity: preset.continuity,
      };
    }
    onUpdateProject(nextProject);
  };

  const updateBeat = (beat: keyof StoryBeats, val: string) => {
    const nextBeats = { ...c.storyBeats, [beat]: val };
    const nextScript = `${nextBeats.HOOK} ${nextBeats.SOLUSI} ${nextBeats.VALUE} ${nextBeats.DETAIL} ${nextBeats.CTA}`.trim();
    onUpdateProject({
      ...project,
      creative: {
        ...c,
        storyBeats: nextBeats,
        voiceOverScript: nextScript,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGenerateCreative = async () => {
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        modelUsed?: string;
        creative?: {
          autoSelectedReason?: string;
          storyBeats?: StoryBeats;
          voiceOverScript?: string;
          scenePrompts?: string[];
        };
      }>('/api/creative/generate', {
        product: {
          name: project.product.productName.value,
          category: project.product.category.value,
          features: project.product.verifiedFeatures,
          audience: project.product.targetAudience.value,
          valueProposition: project.product.valueProposition,
        },
        style: c.selectedStyle,
        platform: c.platform,
        durationSeconds: c.durationSeconds,
        objective: c.marketingObjective,
        promptLanguage,
        characterName:
          project.character.option === 'No Character' ? undefined : project.character.name,
      });
      if (!httpOk || !data.ok || !data.creative) {
        setErrorMsg(data.message || 'Gagal menghasilkan arahan kreatif.');
        return;
      }

      const gen = data.creative;
      const preset = buildScenePresets(c.durationSeconds, project.scenes);
      const updatedScenes = preset.scenes.map((sc, idx) => ({
        ...sc,
        prompt: gen.scenePrompts?.[idx] || sc.prompt,
      }));

      onUpdateProject({
        ...project,
        currentStep: Math.max(project.currentStep, 4),
        updatedAt: new Date().toISOString(),
        creative: {
          ...c,
          autoSelectedReason: gen.autoSelectedReason || c.autoSelectedReason,
          storyBeats: gen.storyBeats || c.storyBeats,
          voiceOverScript: gen.voiceOverScript || c.voiceOverScript,
        },
        scenes: updatedScenes,
        continuity: preset.continuity,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi server untuk generasi arahan kreatif.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunCompliance = async (useAiDeepCheck: boolean) => {
    setErrorMsg(null);
    setIsCheckingCompliance(true);
    try {
      const hasUnknown =
        project.product.dimensions.status === 'TIDAK_DIKETAHUI' ||
        project.product.materials.status === 'TIDAK_DIKETAHUI';

      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        modelUsed?: string;
        report?: AffiliateProject['compliance'];
      }>('/api/compliance/check', {
        scriptText: c.voiceOverScript,
        platform: c.platform,
        hasUnknownSpecs: hasUnknown,
        useAiDeepCheck,
      });
      if (!httpOk || !data.ok || !data.report) {
        setErrorMsg(data.message || 'Gagal menjalankan pemeriksaan kepatuhan.');
        return;
      }

      onUpdateProject({
        ...project,
        currentStep: Math.max(project.currentStep, 8),
        compliance: data.report,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menjalankan pemeriksaan kepatuhan.'
      );
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Creative Director Controls */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Creative Studio & Kepatuhan Affiliate
            </h1>
            <p className="text-sm text-[#5F6368]">
              Pilih gaya promosi, durasi video, susun alur 5 bagian (HOOK hingga CTA), lalu periksa risiko kebijakan platform.
            </p>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateCreative}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Susun Naskah AI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="creative-style" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Gaya Konten (10 Pilihan)
            </label>
            <select
              id="creative-style"
              value={c.selectedStyle}
              onChange={(e) => updateCreativeField('selectedStyle', e.target.value as ContentStyle)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {CONTENT_STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="creative-platform" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Profil Platform Affiliate
            </label>
            <select
              id="creative-platform"
              value={c.platform}
              onChange={(e) => updateCreativeField('platform', e.target.value as AffiliatePlatform)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {PLATFORMS.map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#3C4043] mb-1">
              Durasi Video Target
            </span>
            <div className="inline-flex w-full p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => updateCreativeField('durationSeconds', d)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-mono-tabular font-semibold transition-colors ${
                    c.durationSeconds === d
                      ? 'bg-white text-[#202124] shadow-sm'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#5F6368] bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg px-4 py-2.5">
          <strong className="text-[#202124]">Catatan Creative Director:</strong> {c.autoSelectedReason} ({project.scenes.length} adegan otomatis disiapkan untuk durasi {c.durationSeconds} detik).
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* 5-Beat Story + Compliance Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#202124]">
            Struktur Cerita 5 Bagian & Naskah Voice-Over
          </h2>

          <div className="space-y-3">
            {(['HOOK', 'SOLUSI', 'VALUE', 'DETAIL', 'CTA'] as Array<keyof StoryBeats>).map((beat) => (
              <div key={beat}>
                <label
                  htmlFor={`beat-${beat}`}
                  className="block text-xs font-semibold text-[#5F6368] mb-1"
                >
                  {beat}
                </label>
                <input
                  id={`beat-${beat}`}
                  type="text"
                  value={c.storyBeats?.[beat] ?? ''}
                  onChange={(e) => updateBeat(beat, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E5E7EB]">
            <label htmlFor="vo-full-script" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Naskah Voice-Over Gabungan (Bahasa Indonesia)
            </label>
            <textarea
              id="vo-full-script"
              rows={4}
              value={c.voiceOverScript}
              onChange={(e) => updateCreativeField('voiceOverScript', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#FF6A00]"
            />
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D95300] hover:underline"
            >
              <span>Lanjut ke Character Studio</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('voice')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7490] hover:underline"
            >
              <span>Kirim Naskah ke Voice Studio</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Compliance Checker */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#202124]">
                Pemeriksaan Kepatuhan Affiliate
              </h2>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Deteksi klaim berisiko, urgensi palsu, dan info harga/diskon dinamis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isCheckingCompliance}
              onClick={() => handleRunCompliance(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Cek Aturan Cepat</span>
            </button>
            <button
              type="button"
              disabled={isCheckingCompliance}
              onClick={() => handleRunCompliance(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#202124] hover:bg-black text-white text-xs font-semibold"
            >
              {isCheckingCompliance ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Audit AI Mendalam</span>
            </button>
          </div>

          {project.compliance && (
            <div className="space-y-3 pt-3 border-t border-[#E5E7EB]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#5F6368]">Status ({project.compliance.platform})</span>
                <ComplianceStatusLabel status={project.compliance.status} />
              </div>

              {project.compliance.findings.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  Tidak ditemukan pelanggaran aturan dasar pada naskah Anda saat ini.
                </div>
              ) : (
                <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {project.compliance.findings.map((f) => (
                    <li
                      key={f.id}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        f.severity === 'high'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-semibold">
                        {f.checkType} · &ldquo;{f.excerpt}&rdquo;
                      </div>
                      <div>{f.message}</div>
                      <div className="font-medium opacity-90">Saran: {f.suggestion}</div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                {project.compliance.disclaimer}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
