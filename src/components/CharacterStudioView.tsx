import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import type {
  AffiliateProject,
  CharacterOption,
  CharacterProfile,
  NavSection,
  StudioSettings,
  VoiceGender,
} from '../types/studio';
import { compressImageFile, safePostJson } from '../utils/apiClient';
import { SafeImage } from './StatusTag';

const CHARACTER_OPTIONS: CharacterOption[] = [
  'No Character',
  'AI Generated Character',
  'Upload Reference Character',
  'Saved Character',
];

interface CharacterStudioViewProps {
  project: AffiliateProject;
  settings: StudioSettings;
  savedCharacters: CharacterProfile[];
  onUpdateProject: (updated: AffiliateProject) => void;
  onSaveCharacterPreset: (char: CharacterProfile) => void;
  onDeleteCharacterPreset: (id: string) => void;
  onNavigate: (nav: NavSection) => void;
}

export function CharacterStudioView({
  project,
  settings,
  savedCharacters,
  onUpdateProject,
  onSaveCharacterPreset,
  onDeleteCharacterPreset,
  onNavigate,
}: CharacterStudioViewProps) {
  const ch = project.character;
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const updateChar = <K extends keyof CharacterProfile>(key: K, val: CharacterProfile[K]) => {
    onUpdateProject({
      ...project,
      currentStep: Math.max(project.currentStep, 5),
      character: { ...ch, [key]: val },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      updateChar('referenceImages', [compressed, ...ch.referenceImages.slice(0, 2)]);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Gagal membaca foto referensi.');
    }
  };

  const handleGenerateAvatar = async () => {
    setAvatarError(null);
    setIsGeneratingAvatar(true);
    const activeModel = settings.preferredImageModel;

    const portraitPrompt = [
      `Authentic Indonesian UGC affiliate presenter portrait of ${ch.name || 'Indonesian Creator'}`,
      `Gender presentation: ${ch.genderPresentation}, Age: ${ch.ageRange || '24 years old'}`,
      `Appearance: ${ch.appearance || 'Natural fresh Indonesian creator, warm friendly expression'}`,
      `Outfit: ${ch.clothing || 'Casual clean minimalist linen shirt'}`,
      `Personality vibe: ${ch.personality || 'Approachable, trustworthy, expressive'}`,
      `Environment: Softly lit bright modern minimalist Indonesian home studio`,
      `Framing: Clean chest-up vertical portrait looking warmly at camera, natural skin texture, photorealistic`,
    ].join('. ');

    try {
      const { httpOk, data } = await safePostJson<{
        ok?: boolean;
        message?: string;
        imageUrl?: string;
        modelUsed?: string;
      }>('/api/images/generate', {
        prompt: portraitPrompt,
        aspectRatio: '1:1',
        model: activeModel,
      });

      if (!httpOk || !data.ok || !data.imageUrl) {
        setAvatarError(data.message || 'Gagal menghasilkan potret karakter AI.');
        return;
      }

      updateChar('referenceImages', [data.imageUrl, ...ch.referenceImages.slice(0, 2)]);
    } catch {
      setAvatarError('Gagal menghubungi server Google Flow Omni Image.');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSaveAsPreset = () => {
    const newPreset: CharacterProfile = {
      ...ch,
      id: `char-${Date.now()}`,
      option: 'Saved Character',
      createdAt: new Date().toISOString(),
    };
    onSaveCharacterPreset(newPreset);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Character Studio &amp; Konsistensi Presenter
            </h1>
            <p className="text-sm text-[#5F6368]">
              Pilih tanpa karakter, buat potret karakter AI (Google Flow Omni Image), unggah foto referensi, atau gunakan preset tersimpan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('image')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <span>Lanjut ke Image Studio</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Option Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CHARACTER_OPTIONS.map((opt) => {
            const active = ch.option === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => updateChar('option', opt)}
                className={`px-3 py-2.5 rounded-lg border text-xs font-semibold text-left transition-colors ${
                  active
                    ? 'border-[#FF6A00] bg-[#FFF3EB] text-[#C84A00]'
                    : 'border-[#E5E7EB] bg-white text-[#3C4043] hover:bg-[#F7F8FA]'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
          <span>
            Konsistensi visual dibantu oleh AI (Consistency Lock &amp; Reference Image), namun tidak dijamin 100% identik di setiap frame.
          </span>
        </div>

        {ch.option === 'No Character' ? (
          <div className="p-5 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] text-sm text-[#5F6368]">
            Mode <strong>No Character</strong> aktif. Gambar dan video akan berfokus pada produk, meja display, atau tangan memegang kemasan secara close-up.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            <div className="lg:col-span-4 space-y-3">
              <div className="aspect-square rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F7F8FA]">
                <SafeImage
                  src={ch.referenceImages[0]}
                  alt={ch.name}
                  className="w-full h-full object-cover"
                  fallbackLabel="Belum ada foto referensi karakter"
                />
              </div>

              <button
                type="button"
                disabled={isGeneratingAvatar}
                onClick={handleGenerateAvatar}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#202124] hover:bg-black disabled:bg-slate-300 text-white text-xs font-semibold cursor-pointer"
              >
                {isGeneratingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#25C9D7]" aria-hidden="true" />
                )}
                <span>Generate Potret AI</span>
              </button>

              <label
                htmlFor="char-ref-upload"
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unggah Foto Referensi</span>
                <input
                  id="char-ref-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadReference}
                  className="sr-only"
                />
              </label>

              {avatarError && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{avatarError}</span>
                </div>
              )}

              <label className="flex items-center gap-2.5 text-xs font-medium text-[#202124] pt-1">
                <input
                  type="checkbox"
                  checked={ch.consistencyLock}
                  onChange={(e) => updateChar('consistencyLock', e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#FF6A00] focus:ring-[#FF6A00]"
                />
                <span>Aktifkan Consistency Lock pada prompt</span>
              </label>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="char-name" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Nama Karakter
                </label>
                <input
                  id="char-name"
                  type="text"
                  value={ch.name}
                  onChange={(e) => updateChar('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </div>

              <div>
                <label htmlFor="char-gender" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Presentasi Gender
                </label>
                <select
                  id="char-gender"
                  value={ch.genderPresentation}
                  onChange={(e) =>
                    updateChar('genderPresentation', e.target.value as CharacterProfile['genderPresentation'])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>

              <div>
                <label htmlFor="char-age" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Rentang Usia
                </label>
                <input
                  id="char-age"
                  type="text"
                  value={ch.ageRange}
                  onChange={(e) => updateChar('ageRange', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </div>

              <div>
                <label htmlFor="char-voice" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Preferensi Suara Voice-Over
                </label>
                <select
                  id="char-voice"
                  value={ch.voicePreference}
                  onChange={(e) => updateChar('voicePreference', e.target.value as VoiceGender)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
                >
                  <option value="Female">Female (Bahasa Indonesia)</option>
                  <option value="Male">Male (Bahasa Indonesia)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="char-appearance" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Penampilan Visual
                </label>
                <input
                  id="char-appearance"
                  type="text"
                  value={ch.appearance}
                  onChange={(e) => updateChar('appearance', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </div>

              <div>
                <label htmlFor="char-clothing" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Pakaian
                </label>
                <input
                  id="char-clothing"
                  type="text"
                  value={ch.clothing}
                  onChange={(e) => updateChar('clothing', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </div>

              <div>
                <label htmlFor="char-personality" className="block text-xs font-semibold text-[#3C4043] mb-1">
                  Kepribadian / Pembawaan
                </label>
                <input
                  id="char-personality"
                  type="text"
                  value={ch.personality}
                  onChange={(e) => updateChar('personality', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAsPreset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
                >
                  <BookmarkPlus className="w-4 h-4 text-[#FF6A00]" aria-hidden="true" />
                  <span>Simpan ke Preset Karakter</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Saved Character Presets */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-[#202124]">
          Preset Karakter Tersimpan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {savedCharacters.map((preset) => (
            <div
              key={preset.id}
              className="border border-[#E5E7EB] rounded-xl p-4 flex items-start gap-4 bg-white"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB] shrink-0">
                <SafeImage
                  src={preset.referenceImages[0]}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-semibold text-sm text-[#202124] truncate">{preset.name}</div>
                <div className="text-xs text-[#5F6368]">
                  {preset.genderPresentation} · {preset.ageRange}
                </div>
                <p className="text-xs text-[#5F6368] line-clamp-2">{preset.clothing}</p>
                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject({
                        ...project,
                        character: { ...preset, option: 'Saved Character' },
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF3EB] text-[#C84A00] text-xs font-semibold"
                  >
                    <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gunakan</span>
                  </button>
                  {savedCharacters.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onDeleteCharacterPreset(preset.id)}
                      aria-label={`Hapus karakter ${preset.name}`}
                      className="p-1 text-[#5F6368] hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
