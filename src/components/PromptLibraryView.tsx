import React, { useEffect, useState } from 'react';
import { Check, Copy, History, Plus, RotateCcw, Save } from 'lucide-react';
import type {
  AffiliateProject,
  PromptCategory,
  PromptEntry,
  PromptLanguage,
} from '../types/studio';
import { formatStructuredImagePrompt, formatStructuredVideoPrompt } from '../utils/studioLogic';

const CATEGORIES: PromptCategory[] = [
  'Image Generation Prompt',
  'Text-to-Video Prompt',
  'Image-to-Video Prompt',
  'Character Prompt',
  'Voice-over Script',
  'Scene-by-Scene Prompt',
];

interface PromptLibraryViewProps {
  project: AffiliateProject;
  defaultLanguage: PromptLanguage;
  onUpdateProject: (updated: AffiliateProject) => void;
}

export function PromptLibraryView({
  project,
  defaultLanguage,
  onUpdateProject,
}: PromptLibraryViewProps) {
  const [selectedId, setSelectedId] = useState<string>(project.prompts[0]?.id ?? '');
  const [languageFilter, setLanguageFilter] = useState<PromptLanguage>(defaultLanguage);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const activePrompt = project.prompts.find((p) => p.id === selectedId) ?? project.prompts[0];
  const [editContent, setEditContent] = useState(activePrompt?.content ?? '');

  useEffect(() => {
    const first = project.prompts[0];
    setSelectedId(first?.id ?? '');
    setEditContent(first?.content ?? '');
  }, [project.id]);

  const selectPrompt = (p: PromptEntry) => {
    setSelectedId(p.id);
    setEditContent(p.content);
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveNewVersion = () => {
    if (!activePrompt || !editContent.trim()) return;
    const nextVerNumber = (activePrompt.versions[0]?.version ?? 0) + 1;
    const updatedPrompts = project.prompts.map((p) =>
      p.id === activePrompt.id
        ? {
            ...p,
            content: editContent,
            language: languageFilter,
            updatedAt: new Date().toISOString(),
            versions: [
              {
                version: nextVerNumber,
                content: editContent,
                language: languageFilter,
                savedAt: new Date().toISOString(),
                note: draftNote.trim() || `Revisi v${nextVerNumber}`,
              },
              ...p.versions,
            ],
          }
        : p
    );
    setDraftNote('');
    onUpdateProject({
      ...project,
      prompts: updatedPrompts,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRestoreVersion = (versionContent: string, versionLang: PromptLanguage) => {
    if (!activePrompt) return;
    setEditContent(versionContent);
    setLanguageFilter(versionLang);
    const updatedPrompts = project.prompts.map((p) =>
      p.id === activePrompt.id
        ? { ...p, content: versionContent, language: versionLang, updatedAt: new Date().toISOString() }
        : p
    );
    onUpdateProject({ ...project, prompts: updatedPrompts, updatedAt: new Date().toISOString() });
  };

  const handleCreatePromptTemplate = (category: PromptCategory) => {
    let generatedText = '';
    if (category === 'Image Generation Prompt') {
      generatedText = formatStructuredImagePrompt(
        {
          subject: project.product.productName.value,
          productDetails: project.product.description.value,
          environment: 'Clean Indonesian lifestyle tabletop',
          composition: 'Rule of thirds, negative space top',
          lighting: 'Soft natural morning light',
          camera: '50mm f/2.8',
          visualStyle: project.creative.selectedStyle,
          aspectRatio: '9:16',
          negativeInstructions: 'No fake discount badges, no text artifacts',
        },
        languageFilter
      );
    } else if (category === 'Voice-over Script') {
      generatedText = project.creative.voiceOverScript;
    } else {
      generatedText = formatStructuredVideoPrompt(
        {
          sceneDescription: `${project.creative.selectedStyle} untuk ${project.product.productName.value}`,
          subject: project.character.option === 'No Character' ? project.product.productName.value : project.character.name,
          characterAction: project.scenes[0]?.characterAction || 'Showing product naturally',
          productInteraction: project.scenes[0]?.productInteraction || 'Holding product clearly',
          cameraMovement: project.scenes[0]?.cameraMovement || 'Slow push-in',
          environment: project.scenes[0]?.background || 'Bright minimalist interior',
          lighting: project.scenes[0]?.lighting || 'Natural daylight',
          dialogue: project.scenes[0]?.dialogue || '',
          audio: 'Indonesian voice-over',
          duration: `${project.videoDuration}s`,
          aspectRatio: project.videoAspectRatio,
          continuityInstructions: 'Maintain visual consistency across cuts',
        },
        languageFilter
      );
    }

    const newEntry: PromptEntry = {
      id: `prm-${Date.now()}`,
      title: `${category} (${languageFilter})`,
      category,
      language: languageFilter,
      content: generatedText,
      structuredBreakdown: { Category: category, Language: languageFilter },
      versions: [
        {
          version: 1,
          content: generatedText,
          language: languageFilter,
          savedAt: new Date().toISOString(),
          note: 'Dibuat dari data proyek saat ini',
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    onUpdateProject({
      ...project,
      prompts: [newEntry, ...project.prompts],
      updatedAt: new Date().toISOString(),
    });
    setSelectedId(newEntry.id);
    setEditContent(newEntry.content);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#202124]">
            Prompt Library & Riwayat Versi
          </h1>
          <p className="text-sm text-[#5F6368]">
            Kelola prompt gambar, video, karakter, dan naskah dalam bahasa Inggris atau Indonesia beserta riwayat revisinya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg">
            {(['English', 'Indonesian'] as PromptLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguageFilter(lang)}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  languageFilter === lang ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleCreatePromptTemplate('Image Generation Prompt')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D95300] hover:bg-[#BF4900] text-white text-xs font-semibold whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Buat Prompt Baru</span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[#5F6368] px-1">
            Daftar Prompt ({project.prompts.length})
          </div>
          <ul className="space-y-1.5">
            {project.prompts.map((p) => {
              const isSelected = activePrompt?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPrompt(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-[#FF6A00] bg-[#FFF3EB]'
                        : 'border-[#E5E7EB] bg-white hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#202124]">{p.title}</div>
                    <div className="text-[11px] text-[#5F6368] mt-0.5">
                      {p.category} · {p.language} · v{p.versions[0]?.version ?? 1}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 border-t border-[#E5E7EB] space-y-1.5">
            <div className="text-xs font-semibold text-[#5F6368]">Tambah Cepat per Kategori</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCreatePromptTemplate(cat)}
                  className="px-2.5 py-1 rounded border border-[#E5E7EB] hover:border-[#FF6A00] text-[11px] font-medium text-[#3C4043]"
                >
                  + {cat.replace(' Prompt', '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Editor & Version History */}
        <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
          {activePrompt ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#202124]">
                    {activePrompt.title}
                  </h2>
                  <div className="text-xs text-[#5F6368]">
                    {activePrompt.category} · {activePrompt.versions.length} versi tersimpan
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activePrompt.id, editContent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#202124]"
                >
                  {copiedId === activePrompt.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Salin Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                aria-label="Isi prompt"
                rows={9}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] font-mono text-xs leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="Catatan revisi (opsional, mis. perhalus pencahayaan)..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveNewVersion}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#202124] hover:bg-black text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Simpan Versi Baru</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5F6368]">
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Riwayat Versi Prompt</span>
                </div>
                <ul className="space-y-2 max-h-52 overflow-y-auto">
                  {activePrompt.versions.map((ver) => (
                    <li
                      key={ver.version}
                      className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-[#202124]">
                          v{ver.version} · {ver.note}
                        </div>
                        <div className="text-[#5F6368] font-mono-tabular">
                          {new Date(ver.savedAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(ver.content, ver.language)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] bg-white hover:bg-[#FFF3EB] text-xs font-semibold text-[#202124] shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Pulihkan</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#5F6368]">Belum ada prompt tersimpan.</p>
          )}
        </div>
      </section>
    </div>
  );
}
