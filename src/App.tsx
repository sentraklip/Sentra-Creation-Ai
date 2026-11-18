import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AffiliateProject,
  CharacterProfile,
  ExperienceMode,
  NavSection,
  StudioSettings,
} from './types/studio';
import { createSeedProject, DEFAULT_SETTINGS } from './data/seedProject';
import {
  clearLocalStudioData,
  deleteCharacterFromDb,
  deleteProjectFromDb,
  initializeStudioDatabase,
  saveCharacterToDb,
  saveProjectToDb,
  saveSettingsToDb,
} from './utils/indexedDb';
import {
  fetchGmailFlowStatus,
  googleSignIn,
  initAuth,
  logout,
  type GmailFlowStatus,
} from './utils/googleAuth';
import { buildScenePresets } from './utils/studioLogic';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { EasyModeStepper } from './components/EasyModeStepper';
import { DashboardView } from './components/DashboardView';
import { ProductAnalyzerView } from './components/ProductAnalyzerView';
import { CreativeStudioView } from './components/CreativeStudioView';
import { CharacterStudioView } from './components/CharacterStudioView';
import { ImageStudioView } from './components/ImageStudioView';
import { VideoStudioView } from './components/VideoStudioView';
import { VoiceStudioView } from './components/VoiceStudioView';
import { PromptLibraryView } from './components/PromptLibraryView';
import { ProjectHistoryView } from './components/ProjectHistoryView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [loadingDb, setLoadingDb] = useState(true);
  const [projects, setProjects] = useState<AffiliateProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);

  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase + Gmail OAuth state (token stays strictly in memory)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailFlowStatus | null>(null);

  const loadGmailData = async (token: string) => {
    setIsLoadingGmail(true);
    setAuthError(null);
    try {
      const status = await fetchGmailFlowStatus(token);
      setGmailStatus(status);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal membaca status Gmail untuk Google Flow.'
      );
      setNeedsAuth(true);
      setAccessToken(null);
    } finally {
      setIsLoadingGmail(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    initializeStudioDatabase()
      .then((data) => {
        if (!mounted) return;
        setProjects(data.projects);
        setActiveProjectId(data.projects[0]?.id ?? '');
        setSavedCharacters(data.characters);
        setSettings(data.settings);
      })
      .finally(() => {
        if (mounted) setLoadingDb(false);
      });

    const unsubAuth = initAuth(
      (user, token) => {
        if (!mounted) return;
        setGoogleUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        void loadGmailData(token);
      },
      (user) => {
        if (!mounted) return;
        setGoogleUser(user);
        setAccessToken(null);
        setNeedsAuth(true);
        if (!user) {
          setGmailStatus(null);
        }
      }
    );

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  const handleSignInGoogle = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
      setNeedsAuth(false);
      await loadGmailData(result.accessToken);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal masuk dengan Google. Silakan coba kembali.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
    setGmailStatus(null);
    setNeedsAuth(true);
    setAuthError(null);
  };

  const handleRefreshGmail = async () => {
    if (!accessToken) {
      await handleSignInGoogle();
      return;
    }
    await loadGmailData(accessToken);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const handleUpdateProject = async (updated: AffiliateProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveProjectToDb(updated);
  };

  const handleCreateNewProject = async () => {
    const base = createSeedProject();
    const { scenes, continuity } = buildScenePresets(30);
    const now = new Date().toISOString();
    const fresh: AffiliateProject = {
      ...base,
      id: `proj-${Date.now()}`,
      title: `Proyek Affiliate Baru (${projects.length + 1})`,
      isExampleSeed: false,
      createdAt: now,
      updatedAt: now,
      currentStep: 1,
      product: {
        inputMethod: 'product_url',
        sourceUrl: '',
        marketplace: 'Manual',
        extractedAt: now,
        productName: { value: 'Produk Baru (Belum Dianalisis)', status: 'TIDAK_DIKETAHUI' },
        brand: { value: 'Belum diketahui', status: 'TIDAK_DIKETAHUI' },
        category: { value: 'Belum diketahui', status: 'TIDAK_DIKETAHUI' },
        description: { value: 'Masukkan URL, gambar, atau deskripsi produk.', status: 'TIDAK_DIKETAHUI' },
        specifications: { value: [], status: 'TIDAK_DIKETAHUI' },
        materials: { value: [], status: 'TIDAK_DIKETAHUI' },
        dimensions: { value: 'Belum diketahui', status: 'TIDAK_DIKETAHUI' },
        colors: { value: [], status: 'TIDAK_DIKETAHUI' },
        features: { value: [], status: 'TIDAK_DIKETAHUI' },
        benefits: { value: [], status: 'TIDAK_DIKETAHUI' },
        targetAudience: { value: 'Belum diketahui', status: 'TIDAK_DIKETAHUI' },
        usageInstructions: { value: 'Belum diketahui', status: 'TIDAK_DIKETAHUI' },
        price: {
          value: 'Dikecualikan dari klaim kreatif',
          status: 'TIDAK_DIKETAHUI',
          excludeFromClaims: true,
          requiresFreshVerification: true,
        },
        productImages: [],
        summary: 'Silakan mulai dengan memasukkan data produk di Product Analyzer.',
        mainSellingPoints: [],
        verifiedFeatures: [],
        customerProblems: [],
        potentialSolutions: [],
        valueProposition: 'Menunggu hasil analisis produk.',
        recommendedAngles: [],
        contentRecommendations: [],
        missingInformation: ['Semua data produk belum diisi'],
        flaggedClaims: [],
      },
      creative: {
        ...base.creative,
        autoSelectedReason: 'Menunggu analisis produk untuk rekomendasi gaya konten otomatis.',
        storyBeats: {
          HOOK: '',
          SOLUSI: '',
          VALUE: '',
          DETAIL: '',
          CTA: 'Cek produknya di keranjang bawah.',
        },
        voiceOverScript: '',
      },
      compliance: undefined,
      images: [],
      voiceOvers: [],
      renderedVideoUrl: undefined,
      scenes,
      continuity,
      versions: [],
    };
    setProjects((prev) => [fresh, ...prev]);
    setActiveProjectId(fresh.id);
    setActiveNav('analyzer');
    await saveProjectToDb(fresh);
  };

  const handleDuplicateProject = async (id: string) => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const dup: AffiliateProject = {
      ...source,
      id: `proj-${Date.now()}`,
      title: `${source.title} (Salinan)`,
      isExampleSeed: false,
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [dup, ...prev]);
    setActiveProjectId(dup.id);
    await saveProjectToDb(dup);
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id) {
      setActiveProjectId(remaining[0].id);
    }
    await deleteProjectFromDb(id);
  };

  const handleSaveCharacterPreset = async (char: CharacterProfile) => {
    setSavedCharacters((prev) => [char, ...prev]);
    await saveCharacterToDb(char);
  };

  const handleDeleteCharacterPreset = async (id: string) => {
    setSavedCharacters((prev) => prev.filter((c) => c.id !== id));
    await deleteCharacterFromDb(id);
  };

  const handleUpdateSettings = async (next: StudioSettings) => {
    setSettings(next);
    await saveSettingsToDb(next);
  };

  const handleResetLocalData = async () => {
    await clearLocalStudioData();
    const fresh = await initializeStudioDatabase();
    setProjects(fresh.projects);
    setActiveProjectId(fresh.projects[0]?.id ?? '');
    setSavedCharacters(fresh.characters);
    setSettings(fresh.settings);
    setActiveNav('dashboard');
  };

  const connectedEmail =
    !needsAuth && accessToken ? gmailStatus?.emailAddress || googleUser?.email || null : null;

  if (loadingDb || !activeProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] text-[#202124]">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#FF6A00]" aria-hidden="true" />
          <span>Memuat Sentra Creation AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] text-[#202124]">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeNav={activeNav}
          activeProjectTitle={activeProject.title}
          user={googleUser}
          needsAuth={needsAuth}
          isSigningIn={isSigningIn}
          onSignInGoogle={handleSignInGoogle}
          onNavigateSettings={() => setActiveNav('settings')}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onCreateNewProject={handleCreateNewProject}
        />

        {settings.experienceMode === 'Easy Mode' && (
          <EasyModeStepper
            currentStep={activeProject.currentStep}
            onNavigateStep={(nav, step) => {
              setActiveNav(nav);
              if (step > activeProject.currentStep) {
                handleUpdateProject({ ...activeProject, currentStep: step });
              }
            }}
          />
        )}

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 lg:px-8 py-6">
          {activeNav === 'dashboard' && (
            <DashboardView
              projects={projects}
              activeProject={activeProject}
              settings={settings}
              user={googleUser}
              accessToken={accessToken}
              needsAuth={needsAuth}
              isSigningIn={isSigningIn}
              isLoadingGmail={isLoadingGmail}
              authError={authError}
              gmailStatus={gmailStatus}
              onSignInGoogle={handleSignInGoogle}
              onSignOutGoogle={handleSignOutGoogle}
              onRefreshGmail={handleRefreshGmail}
              onChangeMode={(mode: ExperienceMode) =>
                handleUpdateSettings({ ...settings, experienceMode: mode })
              }
              onSelectProject={(id) => setActiveProjectId(id)}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onCreateNewProject={handleCreateNewProject}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'analyzer' && (
            <ProductAnalyzerView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'creative' && (
            <CreativeStudioView
              project={activeProject}
              promptLanguage={settings.defaultPromptLanguage}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'character' && (
            <CharacterStudioView
              project={activeProject}
              settings={settings}
              savedCharacters={savedCharacters}
              onUpdateProject={handleUpdateProject}
              onSaveCharacterPreset={handleSaveCharacterPreset}
              onDeleteCharacterPreset={handleDeleteCharacterPreset}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'image' && (
            <ImageStudioView
              project={activeProject}
              settings={settings}
              promptLanguage={settings.defaultPromptLanguage}
              connectedEmail={connectedEmail}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'video' && (
            <VideoStudioView
              project={activeProject}
              settings={settings}
              connectedEmail={connectedEmail}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeNav === 'voice' && (
            <VoiceStudioView
              project={activeProject}
              settings={settings}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'prompts' && (
            <PromptLibraryView
              project={activeProject}
              defaultLanguage={settings.defaultPromptLanguage}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeNav === 'history' && (
            <ProjectHistoryView
              projects={projects}
              activeProject={activeProject}
              cloudBackupConsent={settings.cloudBackupConsent}
              onSelectProject={setActiveProjectId}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView
              settings={settings}
              user={googleUser}
              accessToken={accessToken}
              needsAuth={needsAuth}
              isSigningIn={isSigningIn}
              isLoadingGmail={isLoadingGmail}
              authError={authError}
              gmailStatus={gmailStatus}
              onSignInGoogle={handleSignInGoogle}
              onSignOutGoogle={handleSignOutGoogle}
              onRefreshGmail={handleRefreshGmail}
              onUpdateSettings={handleUpdateSettings}
              onResetLocalData={handleResetLocalData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
