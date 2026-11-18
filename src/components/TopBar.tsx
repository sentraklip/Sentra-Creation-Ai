import React from 'react';
import { CheckCircle2, Menu, Plus } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { NavSection } from '../types/studio';
import { NAV_ITEMS } from './Sidebar';
import { GoogleSignInButton } from './GoogleSignInButton';

interface TopBarProps {
  activeNav: NavSection;
  activeProjectTitle: string;
  user: User | null;
  needsAuth: boolean;
  isSigningIn: boolean;
  onSignInGoogle: () => void;
  onNavigateSettings: () => void;
  onOpenMobileMenu: () => void;
  onCreateNewProject: () => void;
}

export function TopBar({
  activeNav,
  activeProjectTitle,
  user,
  needsAuth,
  isSigningIn,
  onSignInGoogle,
  onNavigateSettings,
  onOpenMobileMenu,
  onCreateNewProject,
}: TopBarProps) {
  const currentLabel = NAV_ITEMS.find((n) => n.id === activeNav)?.label ?? 'Dashboard';
  const isConnected = Boolean(user && !needsAuth);

  return (
    <header className="h-14 bg-white border-b border-[#E5E7EB] px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 -ml-2 rounded-lg text-[#3C4043] hover:bg-[#F7F8FA] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-display font-semibold text-[#202124] whitespace-nowrap shrink-0">
            {currentLabel}
          </span>
          <span className="text-[#9AA0A6] hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="text-[#5F6368] truncate max-w-[180px] md:max-w-[260px] hidden sm:inline">
            {activeProjectTitle}
          </span>
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-4 text-xs text-[#5F6368] whitespace-nowrap shrink-0">
        <span>Google Flow Veo &amp; Omni · Suara, Gambar &amp; Video</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isConnected ? (
          <button
            type="button"
            onClick={onNavigateSettings}
            title={`Gmail terhubung: ${user?.email || 'Akun Google'}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-900 max-w-[200px]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="truncate">{user?.email || 'Gmail Terhubung'}</span>
          </button>
        ) : (
          <div className="hidden sm:block">
            <GoogleSignInButton onClick={onSignInGoogle} loading={isSigningIn} compact />
          </div>
        )}

        <button
          type="button"
          onClick={onCreateNewProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6A00]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Proyek Baru</span>
        </button>
      </div>
    </header>
  );
}
