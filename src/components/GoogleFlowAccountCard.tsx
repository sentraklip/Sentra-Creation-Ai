import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { GmailFlowStatus } from '../utils/googleAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleFlowAccountCardProps {
  user: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isSigningIn: boolean;
  isLoadingGmail: boolean;
  authError: string | null;
  gmailStatus: GmailFlowStatus | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshGmail: () => void;
}

export function GoogleFlowAccountCard({
  user,
  accessToken,
  needsAuth,
  isSigningIn,
  isLoadingGmail,
  authError,
  gmailStatus,
  onSignIn,
  onSignOut,
  onRefreshGmail,
}: GoogleFlowAccountCardProps) {
  const isConnected = Boolean(user && accessToken && !needsAuth);
  const displayEmail = gmailStatus?.emailAddress || user?.email || '';

  return (
    <section
      className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4"
      aria-label="Integrasi Akun Gmail dan Google Flow"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0E7490]">
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span>Integrasi Akun Gmail &amp; Google Flow (Veo / Omni)</span>
          </div>
          <h2 className="font-display text-lg font-bold text-[#202124]">
            {isConnected ? `Akun Gmail Terhubung: ${displayEmail}` : 'Hubungkan Akun Gmail untuk Google Flow'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6368] max-w-3xl">
            Hubungkan akun Gmail Anda (mis. akun Google AI / Flow) untuk sinkronisasi profil Gmail, membaca notifikasi Google Flow/Veo di kotak masuk secara read-only, serta mempermudah pengiriman prompt ke tool Google Flow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={onRefreshGmail}
                disabled={isLoadingGmail}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGmail ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Segarkan Gmail</span>
              </button>
              <a
                href="https://labs.google/fx/tools/flow"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#202124] hover:bg-black text-white text-xs font-semibold whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#25C9D7]" aria-hidden="true" />
                <span>Buka Google Flow</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-800 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Putuskan</span>
              </button>
            </>
          ) : (
            <GoogleSignInButton onClick={onSignIn} loading={isSigningIn} />
          )}
        </div>
      </div>

      {authError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-[#E5E7EB]">
          <div className="lg:col-span-5 p-4 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || displayEmail}
                  className="w-9 h-9 rounded-full border border-[#E5E7EB] object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#D95300] text-white font-bold flex items-center justify-center text-xs">
                  {(displayEmail[0] || 'G').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-[#202124] truncate">
                  {user?.displayName || 'Akun Google'}
                </div>
                <div className="text-[#5F6368] truncate font-mono-tabular">{displayEmail}</div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                <span>Aktif</span>
              </span>
            </div>

            {gmailStatus && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB] font-mono-tabular text-[11px] text-[#5F6368]">
                <div>
                  Total Pesan Gmail:{' '}
                  <strong className="text-[#202124]">{gmailStatus.messagesTotal.toLocaleString('id-ID')}</strong>
                </div>
                <div>
                  Thread:{' '}
                  <strong className="text-[#202124]">{gmailStatus.threadsTotal.toLocaleString('id-ID')}</strong>
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#5F6368] leading-relaxed pt-1">
              Akun Gmail terhubung siap dipakai untuk membaca notifikasi Google Flow dan menyalin prompt langsung ke{' '}
              <a
                href="https://labs.google/fx/tools/flow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D95300] font-semibold hover:underline"
              >
                Google Flow
              </a>
              .
            </p>
          </div>

          <div className="lg:col-span-7 p-4 rounded-lg bg-white border border-[#E5E7EB] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#202124]">
                Notifikasi Terkait Google Flow / Veo / Google AI di Gmail ({gmailStatus?.flowMessages.length ?? 0})
              </div>
              {gmailStatus && (
                <span className="text-[11px] font-mono-tabular text-[#5F6368]">
                  Diperbarui {new Date(gmailStatus.checkedAt).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>

            {!gmailStatus || gmailStatus.flowMessages.length === 0 ? (
              <p className="text-xs text-[#5F6368] py-2">
                {isLoadingGmail
                  ? 'Memeriksa email terkait Google Flow / Veo di Gmail...'
                  : 'Belum ditemukan email notifikasi Google Flow, Veo, atau kredit Google AI terbaru pada kotak masuk akun Gmail ini.'}
              </p>
            ) : (
              <ul className="divide-y divide-[#E5E7EB] max-h-44 overflow-y-auto">
                {gmailStatus.flowMessages.map((msg) => (
                  <li key={msg.id} className="py-2 space-y-0.5 text-xs">
                    <div className="font-semibold text-[#202124] truncate">{msg.subject}</div>
                    <div className="text-[11px] text-[#5F6368] truncate">
                      {msg.from}
                    </div>
                    {msg.snippet && (
                      <p className="text-[11px] text-[#3C4043] line-clamp-2">{msg.snippet}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
