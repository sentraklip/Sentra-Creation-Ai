import React from 'react';
import {
  ArrowRight,
  Copy,
  FolderOpen,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AffiliateProject,
  ExperienceMode,
  NavSection,
  StudioSettings,
} from '../types/studio';
import type { GmailFlowStatus } from '../utils/googleAuth';
import { GoogleFlowAccountCard } from './GoogleFlowAccountCard';
import { ComplianceStatusLabel, SafeImage } from './StatusTag';
import { WORKFLOW_STEPS } from './EasyModeStepper';

interface DashboardViewProps {
  projects: AffiliateProject[];
  activeProject: AffiliateProject;
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
  onChangeMode: (mode: ExperienceMode) => void;
  onSelectProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCreateNewProject: () => void;
  onNavigate: (nav: NavSection) => void;
}

export function DashboardView({
  projects,
  activeProject,
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
  onChangeMode,
  onSelectProject,
  onDuplicateProject,
  onDeleteProject,
  onCreateNewProject,
  onNavigate,
}: DashboardViewProps) {
  const totalAssets = projects.reduce(
    (sum, p) => sum + p.images.length + p.voiceOvers.length + p.scenes.filter((s) => s.videoUrl).length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Workspace Mode Bar & Focal Hero */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#5F6368]">
              <span>Sentra Creation AI</span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span>Bahasa Indonesia (id-ID)</span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span>Google Flow Veo &amp; Omni</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight">
              Studio Konten Affiliate: Suara, Gambar &amp; Video
            </h1>
            <p className="text-sm sm:text-base text-[#5F6368]">
              Analisis informasi produk, susun naskah patuh aturan platform, lalu generate langsung Voice-Over, Gambar produk, dan Video multi-adegan Veo/Omni.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('analyzer')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span>Product Analyzer</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('image')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-[#202124] text-sm font-medium transition-colors whitespace-nowrap"
              >
                <span>Image Studio</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('video')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-[#202124] text-sm font-medium transition-colors whitespace-nowrap"
              >
                <span>Video Studio</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('voice')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-[#202124] text-sm font-medium transition-colors whitespace-nowrap"
              >
                <span>Voice Studio</span>
              </button>
              <button
                type="button"
                onClick={onCreateNewProject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-[#202124] text-sm font-medium transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 text-[#5F6368]" aria-hidden="true" />
                <span>Proyek Kosong</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <span className="text-xs font-medium text-[#5F6368]">Mode Pengalaman Studio</span>
            <div
              className="inline-flex items-center p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg"
              role="group"
              aria-label="Pilih mode pengalaman studio"
            >
              <button
                type="button"
                onClick={() => onChangeMode('Easy Mode')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.experienceMode === 'Easy Mode'
                    ? 'bg-white text-[#202124] shadow-sm'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                Mode Mudah
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('Custom Mode')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.experienceMode === 'Custom Mode'
                    ? 'bg-white text-[#202124] shadow-sm'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                Mode Kustom
              </button>
            </div>
            <p className="text-xs text-[#5F6368] max-w-xs lg:text-right">
              {settings.experienceMode === 'Easy Mode'
                ? 'Menampilkan panduan 10 langkah berurutan untuk pemula.'
                : 'Akses langsung ke semua pengaturan detail prompt dan adegan.'}
            </p>
          </div>
        </div>
      </section>

      {/* 3-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Ringkasan Studio">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="text-xs font-medium text-[#5F6368]">Proyek Tersimpan (Lokal)</div>
          <div className="mt-2 font-display text-2xl font-bold text-[#202124] font-mono-tabular">
            {projects.length}
          </div>
          <div className="mt-1 text-xs text-[#5F6368]">IndexedDB siap pakai</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="text-xs font-medium text-[#5F6368]">Total Aset Kreatif</div>
          <div className="mt-2 font-display text-2xl font-bold text-[#202124] font-mono-tabular">
            {totalAssets}
          </div>
          <div className="mt-1 text-xs text-[#5F6368]">Gambar, klip video, dan audio</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="text-xs font-medium text-[#5F6368]">Engine Generator Aktif</div>
          <div className="mt-2 font-display text-lg font-bold text-[#0E7490]">
            Google Flow Veo / Omni
          </div>
          <div className="mt-1 text-xs text-[#5F6368]">
            Suara, Gambar &amp; Video langsung 1 klik
          </div>
        </div>
      </section>

      {/* Gmail & Google Flow Account Integration */}
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

      {/* Active Project Workspace Overview */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-44 aspect-square rounded-lg overflow-hidden border border-[#E5E7EB] shrink-0 bg-[#F7F8FA]">
            <SafeImage
              src={activeProject.product.productImages[0] || activeProject.images[0]?.imageUrl}
              alt={activeProject.product.productName.value}
              className="w-full h-full object-cover"
              fallbackLabel="Belum ada foto produk"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6368]">
                  <span>Proyek Aktif</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProject.creative.platform}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProject.creative.selectedStyle}</span>
                  {activeProject.isExampleSeed && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C84A00] font-medium">Data Contoh</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-[#202124]">
                  {activeProject.title}
                </h2>
                <p className="text-sm text-[#5F6368] max-w-2xl">
                  {activeProject.product.summary || 'Lanjutkan analisis produk atau susun arahan kreatif Anda.'}
                </p>
              </div>

              {activeProject.compliance && (
                <ComplianceStatusLabel status={activeProject.compliance.status} />
              )}
            </div>

            <div className="pt-2 border-t border-[#E5E7EB]">
              <div className="text-xs font-medium text-[#5F6368] mb-2">
                Progres Alur Kerja ({activeProject.currentStep}/10 langkah)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {WORKFLOW_STEPS.slice(0, 5).map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => onNavigate(s.nav)}
                    className="text-left px-3 py-2 rounded-lg border border-[#E5E7EB] hover:border-[#FF6A00] hover:bg-[#FFF8F3] transition-colors"
                  >
                    <div className="text-[11px] font-mono-tabular text-[#5F6368]">
                      Langkah {s.step}
                    </div>
                    <div className="text-xs font-semibold text-[#202124] truncate">
                      {s.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects Table */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-bold text-[#202124]">
            Daftar Proyek Studio
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-[#D95300] hover:underline whitespace-nowrap"
          >
            Kelola Semua di Project History
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-xs font-semibold text-[#5F6368]">
                <th className="py-3 px-6">Nama Proyek</th>
                <th className="py-3 px-4">Platform & Gaya</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Aset</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {projects.map((proj) => {
                const isCurrent = proj.id === activeProject.id;
                const assetCount = proj.images.length + proj.voiceOvers.length;
                return (
                  <tr
                    key={proj.id}
                    className={isCurrent ? 'bg-[#FFF8F3]/60' : 'hover:bg-[#F7F8FA]/60'}
                  >
                    <td className="py-3 px-6">
                      <div className="font-semibold text-[#202124]">{proj.title}</div>
                      <div className="text-xs text-[#5F6368]">
                        {proj.product.productName.value}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#3C4043] whitespace-nowrap">
                      {proj.creative.platform} · {proj.creative.selectedStyle}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[#3C4043] whitespace-nowrap">
                      {proj.videoDuration}s
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[#3C4043] whitespace-nowrap">
                      {assetCount} file
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectProject(proj.id)}
                          aria-label={`Buka proyek ${proj.title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                        >
                          <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isCurrent ? 'Aktif' : 'Buka'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateProject(proj.id)}
                          aria-label={`Duplikat proyek ${proj.title}`}
                          className="p-1.5 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-[#5F6368]"
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteProject(proj.id)}
                            aria-label={`Hapus proyek ${proj.title}`}
                            className="p-1.5 rounded-md border border-[#E5E7EB] bg-white hover:bg-rose-50 text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
