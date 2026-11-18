import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ImageOff,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { ComplianceStatus, DataStatus } from '../types/studio';

export function DataStatusLabel({ status }: { status: DataStatus }) {
  if (status === 'TERKONFIRMASI') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Terkonfirmasi</span>
      </span>
    );
  }
  if (status === 'INFERENSI') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Inferensi AI</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Tidak Diketahui</span>
    </span>
  );
}

export function ComplianceStatusLabel({ status }: { status: ComplianceStatus }) {
  if (status === 'LOW_RISK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 whitespace-nowrap">
        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        <span>LOW_RISK · Siap Tinjau</span>
      </span>
    );
  }
  if (status === 'NEEDS_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        <span>NEEDS_REVIEW · Perlu Revisi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 whitespace-nowrap">
      <ShieldAlert className="w-4 h-4" aria-hidden="true" />
      <span>HIGH_RISK · Berisiko Ditolak</span>
    </span>
  );
}

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F1F3F5] text-[#5F6368] border border-[#E5E7EB] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-6 h-6 mb-2 text-[#9AA0A6]" aria-hidden="true" />
        <span className="text-xs font-medium leading-snug">{fallbackLabel || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
