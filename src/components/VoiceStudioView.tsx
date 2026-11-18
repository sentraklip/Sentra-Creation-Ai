import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Download, Loader2, Volume2 } from 'lucide-react';
import type {
  AffiliateProject,
  NavSection,
  StudioSettings,
  VoiceGender,
  VoiceOverAsset,
  VoiceStyle,
} from '../types/studio';
import { safePostJson } from '../utils/apiClient';

const VOICE_STYLES: VoiceStyle[] = [
  'Natural',
  'Friendly',
  'Energetic',
  'Professional',
  'Casual',
  'Storytelling',
  'Persuasive',
];

interface VoiceStudioViewProps {
  project: AffiliateProject;
  settings: StudioSettings;
  onUpdateProject: (updated: AffiliateProject) => void;
  onNavigate: (nav: NavSection) => void;
}

export function VoiceStudioView({
  project,
  settings,
  onUpdateProject,
  onNavigate,
}: VoiceStudioViewProps) {
  const [script, setScript] = useState(project.creative.voiceOverScript);
  const [gender, setGender] = useState<VoiceGender>(project.character.voicePreference || 'Female');
  const [style, setStyle] = useState<VoiceStyle>('Friendly');
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setScript(project.creative.voiceOverScript);
    setGender(project.character.voicePreference || 'Female');
  }, [project.id]);

  const handleGenerateVoice = async () => {
    if (!script.trim()) {
      setErrorMsg('Isi naskah voice-over terlebih dahulu.');
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    const model = settings.preferredVoiceModel;

    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        voiceName?: string;
        audioDataUrl?: string;
        modelUsed?: string;
      }>('/api/voice/generate', {
        script,
        gender,
        style,
        speed,
      });
      if (!httpOk || !data.ok || !data.audioDataUrl) {
        setErrorMsg(data.message || 'Gagal menghasilkan voice-over.');
        return;
      }

      const newVoice: VoiceOverAsset = {
        id: `vo-${Date.now()}`,
        script,
        language: 'Indonesian',
        gender,
        style,
        speed,
        voiceName: data.voiceName || (gender === 'Male' ? 'Charon' : 'Kore'),
        audioDataUrl: data.audioDataUrl,
        modelUsed: data.modelUsed || model,
        createdAt: new Date().toISOString(),
      };

      onUpdateProject({
        ...project,
        currentStep: Math.max(project.currentStep, 8),
        creative: { ...project.creative, voiceOverScript: script },
        voiceOvers: [newVoice, ...project.voiceOvers],
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghubungi server TTS.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Voice Studio (Voice-Over Bahasa Indonesia)
            </h1>
            <p className="text-sm text-[#5F6368]">
              Ubah naskah promosi menjadi narasi suara natural dengan pemilihan karakter suara, gaya bicara, dan kontrol kecepatan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('video')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap shrink-0"
          >
            <span>Gabungkan di Video Studio</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="block text-xs font-semibold text-[#3C4043] mb-1">Pilihan Suara</span>
            <div className="inline-flex w-full p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg">
              {(['Female', 'Male'] as VoiceGender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${
                    gender === g ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368]'
                  }`}
                >
                  {g === 'Female' ? 'Wanita (Kore)' : 'Pria (Charon)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="voice-style" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Gaya Pembawaan
            </label>
            <select
              id="voice-style"
              value={style}
              onChange={(e) => setStyle(e.target.value as VoiceStyle)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {VOICE_STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="voice-speed" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Kecepatan Bicara (<span className="font-mono-tabular">{speed.toFixed(1)}x</span>)
            </label>
            <input
              id="voice-speed"
              type="range"
              min="0.8"
              max="1.3"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-[#FF6A00] mt-2"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="voice-script" className="text-xs font-semibold text-[#3C4043]">
              Naskah Voice-Over (Bahasa Indonesia)
            </label>
            <button
              type="button"
              onClick={() => setScript(project.creative.voiceOverScript)}
              className="text-xs font-semibold text-[#0E7490] hover:underline"
            >
              Sinkronkan dari Creative Studio
            </button>
          </div>
          <textarea
            id="voice-script"
            rows={4}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E5E7EB]">
          <span className="text-xs text-[#5F6368] font-mono-tabular">
            Model Omni TTS: {settings.preferredVoiceModel} · Bahasa Indonesia WAV
          </span>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateVoice}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Generate Voice-Over</span>
          </button>
        </div>
      </section>

      {/* Audio History */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-[#202124]">
          Rekaman Voice-Over Tersimpan ({project.voiceOvers.length})
        </h2>
        {project.voiceOvers.length === 0 ? (
          <p className="text-sm text-[#5F6368]">
            Belum ada file audio voice-over. Setelah dibuat, audio otomatis siap digabungkan ke render video akhir.
          </p>
        ) : (
          <div className="space-y-3">
            {project.voiceOvers.map((vo) => (
              <div
                key={vo.id}
                className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#5F6368]">
                    {vo.gender} ({vo.voiceName}) · {vo.style} · <span className="font-mono-tabular">{vo.speed}x</span>
                  </div>
                  <p className="text-sm text-[#202124] truncate">{vo.script}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {vo.audioDataUrl && (
                    <audio controls src={vo.audioDataUrl} className="h-9 max-w-[240px]" />
                  )}
                  {vo.audioDataUrl && (
                    <a
                      href={vo.audioDataUrl}
                      download={`voiceover-${vo.id}.wav`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>WAV</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
