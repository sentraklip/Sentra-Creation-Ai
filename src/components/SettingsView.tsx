import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AffiliatePlatform,
  ExperienceMode,
  PromptLanguage,
  StudioSettings,
} from '../types/studio';
import type { GmailFlowStatus } from '../utils/googleAuth';
import { GoogleFlowAccountCard } from './GoogleFlowAccountCard';

interface SettingsViewProps {
  settings: StudioSettings;
  user: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isSigningIn: boolean;
  isLoadingGmail: boolean;
  authError: string | null;
  gmailStatus: GmailFlowStatus | null;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onRefreshGmail: () => void;
  onUpdateSettings: (next: StudioSettings) => void;
  onResetLocalData: () => void;
}

export function SettingsView({
  settings,
  user,
  accessToken,
  needsAuth,
  isSigningIn,
  isLoadingGmail,
  authError,
  gmailStatus,
  onSignInGoogle,
  onSignOutGoogle,
  onRefreshGmail,
  onUpdateSettings,
  onResetLocalData,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const update = <K extends keyof StudioSettings>(key: K, val: StudioSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <GoogleFlowAccountCard
        user={user}
        accessToken={accessToken}
        needsAuth={needsAuth}
        isSigningIn={isSigningIn}
        isLoadingGmail={isLoadingGmail}
        authError={authError}
        gmailStatus={gmailStatus}
        onSignIn={onSignInGoogle}
        onSignOut={onSignOutGoogle}
        onRefreshGmail={onRefreshGmail}
      />

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div>
          <h1 className="font-display text-xl font-bold text-[#202124]">
            Pengaturan Studio &amp; Router Model Google Flow (Veo / Omni)
          </h1>
          <p className="text-sm text-[#5F6368]">
            Sesuaikan mode pengalaman, bahasa prompt bawaan, model generator terintegrasi Google Flow, serta kebijakan privasi penyimpanan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="set-exp-mode" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Mode Pengalaman Bawaan
            </label>
            <select
              id="set-exp-mode"
              value={settings.experienceMode}
              onChange={(e) => update('experienceMode', e.target.value as ExperienceMode)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              <option value="Easy Mode">Easy Mode (Panduan 10 Langkah)</option>
              <option value="Custom Mode">Custom Mode (Kontrol Penuh)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-prompt-lang" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Bahasa Prompt Bawaan
            </label>
            <select
              id="set-prompt-lang"
              value={settings.defaultPromptLanguage}
              onChange={(e) => update('defaultPromptLanguage', e.target.value as PromptLanguage)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              <option value="English">English (Disarankan untuk Veo / Omni)</option>
              <option value="Indonesian">Indonesian</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-platform" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Platform Affiliate Utama
            </label>
            <select
              id="set-platform"
              value={settings.defaultPlatform}
              onChange={(e) => update('defaultPlatform', e.target.value as AffiliatePlatform)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              <option value="TikTok Affiliate">TikTok Affiliate</option>
              <option value="Shopee Affiliate">Shopee Affiliate</option>
              <option value="General Advertising">General Advertising</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-img-model" className="block text-xs font-semibold text-[#3C4043] mb-1">
              Model Generasi Gambar (Google Flow Omni)
            </label>
            <select
              id="set-img-model"
              value={settings.preferredImageModel}
              onChange={(e) =>
                update(
                  'preferredImageModel',
                  e.target.value as StudioSettings['preferredImageModel']
                )
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              <option value="gemini-3.1-flash-lite-image">
                gemini-3.1-flash-lite-image (Cepat &amp; Ringan)
              </option>
              <option value="gemini-nano-banana-2.1">
                gemini-nano-banana-2.1 (Resolusi Tinggi HD)
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] text-xs">
          <div>
            <div className="font-semibold text-[#202124]">Generator Video Aktif</div>
            <div className="font-mono-tabular text-[#5F6368] mt-0.5">
              {settings.preferredVideoModel} · Veo / Omni
            </div>
          </div>
          <div>
            <div className="font-semibold text-[#202124]">Generator Voice-Over Aktif</div>
            <div className="font-mono-tabular text-[#5F6368] mt-0.5">
              {settings.preferredVoiceModel} · Omni TTS Bahasa Indonesia
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] space-y-3 text-sm">

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={settings.cloudBackupConsent}
              onChange={(e) => update('cloudBackupConsent', e.target.checked)}
              className="mt-1"
            />
            <span>
              <strong className="text-[#202124]">Persetujuan Cadangan Cloud (Opsional)</strong>
              <span className="block text-xs text-[#5F6368]">
                Saat ini seluruh data proyek disimpan aman secara lokal di IndexedDB browser Anda tanpa mengirim kunci rahasia ke frontend.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-[#202124]">
          Manajemen Penyimpanan Lokal (IndexedDB)
        </h2>
        <p className="text-xs text-[#5F6368]">
          Menghapus data lokal akan mengembalikan studio ke proyek contoh awal. Tindakan ini tidak memengaruhi file yang sudah Anda unduh.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-800"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Data Lokal IndexedDB</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmReset(false);
                onResetLocalData();
              }}
              className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
            >
              Ya, Hapus &amp; Kembalikan Contoh
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#3C4043]"
            >
              Batal
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
