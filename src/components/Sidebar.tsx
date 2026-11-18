import React from 'react';
import {
  LayoutDashboard,
  ScanSearch,
  Clapperboard,
  UserSquare2,
  Image as ImageIcon,
  Film,
  Mic,
  BookOpenText,
  FolderClock,
  Settings,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/studio';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Utama' | 'Studio Produksi' | 'Manajemen';
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama' },
  { id: 'analyzer', label: 'Product Analyzer', icon: ScanSearch, group: 'Utama' },
  { id: 'creative', label: 'Creative Studio', icon: Clapperboard, group: 'Studio Produksi' },
  { id: 'character', label: 'Character Studio', icon: UserSquare2, group: 'Studio Produksi' },
  { id: 'image', label: 'Image Studio', icon: ImageIcon, group: 'Studio Produksi' },
  { id: 'video', label: 'Video Studio', icon: Film, group: 'Studio Produksi' },
  { id: 'voice', label: 'Voice Studio', icon: Mic, group: 'Studio Produksi' },
  { id: 'prompts', label: 'Prompt Library', icon: BookOpenText, group: 'Manajemen' },
  { id: 'history', label: 'Project History', icon: FolderClock, group: 'Manajemen' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Manajemen' },
];

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeNav,
  onSelectNav,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const groups: Array<NavItem['group']> = ['Utama', 'Studio Produksi', 'Manajemen'];

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      <div className="h-14 px-5 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-sm bg-[#FF6A00] shrink-0"
            aria-hidden="true"
          />
          <span className="font-display font-bold text-base tracking-tight text-[#202124] whitespace-nowrap">
            Sentra Creation AI
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu navigasi"
          className="lg:hidden p-2 rounded-lg text-[#5F6368] hover:bg-[#F7F8FA]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigasi Studio">
        {groups.map((group) => (
          <div key={group}>
            <div className="px-3 mb-1.5 text-xs font-semibold text-[#5F6368]">
              {group}
            </div>
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectNav(item.id);
                        onCloseMobile();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#FFF3EB] text-[#C84A00]'
                          : 'text-[#3C4043] hover:bg-[#F7F8FA] hover:text-[#202124]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#FF6A00]' : 'text-[#5F6368]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[248px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
