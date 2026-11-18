import React from 'react';
import { Check } from 'lucide-react';
import type { NavSection } from '../types/studio';

export const WORKFLOW_STEPS: Array<{
  step: number;
  title: string;
  nav: NavSection;
}> = [
  { step: 1, title: 'Input Produk', nav: 'analyzer' },
  { step: 2, title: 'Analisis Produk', nav: 'analyzer' },
  { step: 3, title: 'Arah Kreatif', nav: 'creative' },
  { step: 4, title: 'Karakter', nav: 'character' },
  { step: 5, title: 'Gambar', nav: 'image' },
  { step: 6, title: 'Video', nav: 'video' },
  { step: 7, title: 'Voice-over', nav: 'voice' },
  { step: 8, title: 'Kepatuhan', nav: 'creative' },
  { step: 9, title: 'Render Akhir', nav: 'video' },
  { step: 10, title: 'Ekspor', nav: 'history' },
];

interface EasyModeStepperProps {
  currentStep: number;
  onNavigateStep: (nav: NavSection, step: number) => void;
}

export function EasyModeStepper({ currentStep, onNavigateStep }: EasyModeStepperProps) {
  return (
    <div className="bg-white border-b border-[#E5E7EB] px-4 lg:px-6 py-2.5 overflow-x-auto">
      <ol className="flex items-center gap-2 min-w-max">
        {WORKFLOW_STEPS.map((item) => {
          const isCompleted = item.step < currentStep;
          const isCurrent = item.step === currentStep;
          return (
            <li key={item.step} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateStep(item.nav, item.step)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#FFF3EB] text-[#C84A00] border border-[#FF6A00]/40'
                    : isCompleted
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-[#5F6368] hover:bg-[#F7F8FA]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm flex items-center justify-center text-[11px] font-mono-tabular ${
                    isCurrent
                      ? 'bg-[#FF6A00] text-white'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#E5E7EB] text-[#3C4043]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" aria-hidden="true" /> : item.step}
                </span>
                <span>{item.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
