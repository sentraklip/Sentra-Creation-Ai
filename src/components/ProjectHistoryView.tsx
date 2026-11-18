import React, { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  History,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import type { AffiliateProject, ProjectVersionSnapshot } from '../types/studio';

interface ProjectHistoryViewProps {
  projects: AffiliateProject[];
  activeProject: AffiliateProject;
  cloudBackupConsent: boolean;
  onSelectProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject: (updated: AffiliateProject) => void;
}

export function ProjectHistoryView({
  projects,
  activeProject,
  cloudBackupConsent,
  onSelectProject,
  onDuplicateProject,
  onDeleteProject,
  onUpdateProject,
}: ProjectHistoryViewProps) {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [editingTitle, setEditingTitle] = useState(activeProject.title);

  useEffect(() => {
    setEditingTitle(activeProject.title);
  }, [activeProject.id, activeProject.title]);

  const handleRename = () => {
    if (!editingTitle.trim()) return;
    onUpdateProject({
      ...activeProject,
      title: editingTitle.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveSnapshot = () => {
    const cleanClone = { ...activeProject, versions: [] };
    const snap: ProjectVersionSnapshot = {
      versionId: `ver-${Date.now()}`,
      label: snapshotLabel.trim() || `Snapshot ${new Date().toLocaleTimeString('id-ID')}`,
      savedAt: new Date().toISOString(),
      snapshotJson: JSON.stringify(cleanClone),
    };
    onUpdateProject({
      ...activeProject,
      versions: [snap, ...activeProject.versions],
      updatedAt: new Date().toISOString(),
    });
    setSnapshotLabel('');
  };

  const handleRestoreSnapshot = (snap: ProjectVersionSnapshot) => {
    if (!snap.snapshotJson) return;
    try {
      const parsed = JSON.parse(snap.snapshotJson) as AffiliateProject;
      onUpdateProject({
        ...parsed,
        versions: activeProject.versions,
        updatedAt: new Date().toISOString(),
      });
      setEditingTitle(parsed.title);
    } catch {
      // Ignore malformed snapshot
    }
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPrompts = (proj: AffiliateProject) => {
    const body = [
      `PROYEK: ${proj.title}`,
      `PRODUK: ${proj.product.productName.value}`,
      `PLATFORM: ${proj.creative.platform} · GAYA: ${proj.creative.selectedStyle}`,
      `\n=== NASKAH VOICE-OVER ===\n${proj.creative.voiceOverScript}`,
      `\n=== PROMPT LIBRARY ===`,
      ...proj.prompts.map((p) => `\n[${p.title} - ${p.category}]\n${p.content}`),
    ].join('\n');
    downloadFile(`${proj.id}-prompts.txt`, body, 'text/plain;charset=utf-8');
  };

  const handleExportJson = (proj: AffiliateProject) => {
    downloadFile(`${proj.id}-export.json`, JSON.stringify(proj, null, 2), 'application/json');
  };

  return (
    <div className="space-y-6">
      {/* Active Project Versioning & Export */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#202124]">
              Project History, Versi &amp; Ekspor Data
            </h1>
            <p className="text-sm text-[#5F6368]">
              Penyimpanan lokal IndexedDB aktif otomatis. Cadangan Cloud (Firestore/GCS):{' '}
              <strong className="text-[#202124]">
                {cloudBackupConsent ? 'Izin diberikan (siap dihubungkan ke proyek cloud)' : 'Nonaktif (Lokal saja)'}
              </strong>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExportPrompts(activeProject)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unduh Prompts (.txt)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportJson(activeProject)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-xs font-semibold"
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ekspor Proyek (.json)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB]">
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Ubah nama proyek aktif"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
            <button
              type="button"
              onClick={handleRename}
              className="px-3.5 py-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124] whitespace-nowrap"
            >
              Simpan Nama
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Label versi snapshot"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="Label snapshot (mis. Sebelum ubah CTA)..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#202124] hover:bg-black text-white text-xs font-semibold whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simpan Snapshot</span>
            </button>
          </div>
        </div>

        {activeProject.versions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5F6368]">
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Snapshot Versi Proyek Aktif</span>
            </div>
            <ul className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
              {activeProject.versions.map((v) => (
                <li key={v.versionId} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-[#202124]">{v.label}</span>
                    <span className="text-[#5F6368] ml-2 font-mono-tabular">
                      {new Date(v.savedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {v.snapshotJson ? (
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] hover:bg-[#FFF3EB] font-semibold text-[#202124]"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Pulihkan</span>
                    </button>
                  ) : (
                    <span className="text-[#5F6368]">Baseline awal</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* All Projects List */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-display text-base font-bold text-[#202124]">
            Semua Proyek Tersimpan ({projects.length})
          </h2>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {projects.map((p) => (
            <div
              key={p.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-sm text-[#202124]">{p.title}</div>
                <div className="text-xs text-[#5F6368]">
                  {p.product.productName.value} · {p.images.length} gambar · {p.voiceOvers.length} audio · Diperbarui{' '}
                  <span className="font-mono-tabular">
                    {new Date(p.updatedAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectProject(p.id);
                    setEditingTitle(p.title);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
                >
                  <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{p.id === activeProject.id ? 'Sedang Aktif' : 'Buka'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateProject(p.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Duplikat</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportJson(p)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-medium text-[#202124]"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ekspor</span>
                </button>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteProject(p.id)}
                    aria-label={`Hapus ${p.title}`}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-rose-50 text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
