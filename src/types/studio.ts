export type NavSection =
  | 'dashboard'
  | 'analyzer'
  | 'creative'
  | 'character'
  | 'image'
  | 'video'
  | 'voice'
  | 'prompts'
  | 'history'
  | 'settings';

export type ExperienceMode = 'Easy Mode' | 'Custom Mode';

export type DataStatus = 'TERKONFIRMASI' | 'INFERENSI' | 'TIDAK_DIKETAHUI';

export type ProductInputMethod =
  | 'product_url'
  | 'image_upload'
  | 'screenshot_upload'
  | 'manual_input';

export type AffiliatePlatform =
  | 'TikTok Affiliate'
  | 'Shopee Affiliate'
  | 'General Advertising';

export type ComplianceStatus = 'LOW_RISK' | 'NEEDS_REVIEW' | 'HIGH_RISK';

export type ContentStyle =
  | 'UGC Review'
  | 'Casual Product Review'
  | 'Cinematic Commercial'
  | 'Product Showcase'
  | 'Lifestyle Advertising'
  | 'Problem Solution'
  | 'Unboxing'
  | 'Tutorial'
  | 'Storytelling'
  | 'Before After';

export type CharacterOption =
  | 'No Character'
  | 'AI Generated Character'
  | 'Upload Reference Character'
  | 'Saved Character';

export type ImageGenerationMode =
  | 'Text-to-Image'
  | 'Image-to-Image'
  | 'Product Reference Image';

export type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9';

export type ImageOutputType =
  | 'Product Hero Image'
  | 'Lifestyle Product Image'
  | 'UGC Scene'
  | 'Product Detail Image'
  | 'Advertising Poster'
  | 'Thumbnail';

export type VideoGenerationMode = 'Text-to-Video' | 'Image-to-Video';

export type VideoDurationSeconds = 15 | 30 | 45 | 60;

export type VoiceGender = 'Female' | 'Male';

export type VoiceStyle =
  | 'Natural'
  | 'Friendly'
  | 'Energetic'
  | 'Professional'
  | 'Casual'
  | 'Storytelling'
  | 'Persuasive';

export type PromptLanguage = 'English' | 'Indonesian';

export type PromptCategory =
  | 'Image Generation Prompt'
  | 'Text-to-Video Prompt'
  | 'Image-to-Video Prompt'
  | 'Character Prompt'
  | 'Voice-over Script'
  | 'Scene-by-Scene Prompt';

export interface SourcedField<T = string> {
  value: T;
  status: DataStatus;
  sourceNote?: string;
}

export interface ClaimFlag {
  id: string;
  claim: string;
  category: 'unsupported' | 'medical' | 'technical' | 'marketplace';
  severity: 'warning' | 'high';
  recommendation: string;
}

export interface ProductAnalysis {
  inputMethod: ProductInputMethod;
  sourceUrl?: string;
  marketplace?: 'TikTok Shop' | 'Shopee' | 'Other Product URLs' | 'Manual';
  extractedAt: string;
  productName: SourcedField<string>;
  brand: SourcedField<string>;
  category: SourcedField<string>;
  description: SourcedField<string>;
  specifications: SourcedField<string[]>;
  materials: SourcedField<string[]>;
  dimensions: SourcedField<string>;
  colors: SourcedField<string[]>;
  features: SourcedField<string[]>;
  benefits: SourcedField<string[]>;
  targetAudience: SourcedField<string>;
  usageInstructions: SourcedField<string>;
  price: SourcedField<string> & {
    excludeFromClaims: boolean;
    requiresFreshVerification: boolean;
  };
  productImages: string[];
  summary: string;
  mainSellingPoints: string[];
  verifiedFeatures: string[];
  customerProblems: string[];
  potentialSolutions: string[];
  valueProposition: string;
  recommendedAngles: string[];
  contentRecommendations: string[];
  missingInformation: string[];
  flaggedClaims: ClaimFlag[];
}

export interface StoryBeats {
  HOOK: string;
  SOLUSI: string;
  VALUE: string;
  DETAIL: string;
  CTA: string;
}

export interface CreativeDirection {
  selectedStyle: ContentStyle;
  autoSelectedReason: string;
  platform: AffiliatePlatform;
  durationSeconds: VideoDurationSeconds;
  marketingObjective: string;
  storyBeats: StoryBeats;
  voiceOverScript: string;
}

export interface CharacterProfile {
  id: string;
  option: CharacterOption;
  name: string;
  genderPresentation: 'Female' | 'Male' | 'Neutral';
  ageRange: string;
  appearance: string;
  clothing: string;
  personality: string;
  voicePreference: VoiceGender;
  referenceImages: string[];
  consistencyLock: boolean;
  createdAt: string;
}

export interface GeneratedImageAsset {
  id: string;
  outputType: ImageOutputType;
  mode: ImageGenerationMode;
  aspectRatio: AspectRatio;
  background: string;
  productPosition: string;
  lighting: string;
  cameraAngle: string;
  composition: string;
  includeCharacter: boolean;
  prompt: string;
  imageUrl: string;
  interactionId?: string;
  modelUsed: string;
  createdAt: string;
}

export interface VideoScene {
  id: string;
  sceneNumber: number;
  purpose: string;
  durationSeconds: number;
  mode: VideoGenerationMode;
  cameraMovement: string;
  cameraAngle: string;
  characterAction: string;
  productInteraction: string;
  background: string;
  lighting: string;
  visualStyle: string;
  dialogue: string;
  voiceOver: string;
  transition: string;
  soundEffects: string;
  prompt: string;
  referenceImageUrl?: string;
  videoUrl?: string;
  jobId?: string;
  interactionId?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface ContinuityConfig {
  enabled: boolean;
  usePreviousSceneFinalFrame: boolean;
  preserveCharacter: boolean;
  preserveProduct: boolean;
  preserveEnvironmentWhenNeeded: boolean;
}

export interface VoiceOverAsset {
  id: string;
  script: string;
  language: 'Indonesian';
  gender: VoiceGender;
  style: VoiceStyle;
  speed: number;
  voiceName: string;
  audioDataUrl?: string;
  modelUsed: string;
  createdAt: string;
}

export interface ComplianceFinding {
  id: string;
  checkType: string;
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  message: string;
  suggestion: string;
}

export interface ComplianceReport {
  platform: AffiliatePlatform;
  status: ComplianceStatus;
  checkedAt: string;
  excludedMarketplaceTermsFound: string[];
  findings: ComplianceFinding[];
  disclaimer: string;
}

export interface PromptVersion {
  version: number;
  content: string;
  language: PromptLanguage;
  savedAt: string;
  note: string;
}

export interface PromptEntry {
  id: string;
  title: string;
  category: PromptCategory;
  language: PromptLanguage;
  content: string;
  structuredBreakdown: Record<string, string>;
  versions: PromptVersion[];
  updatedAt: string;
}

export interface ProjectVersionSnapshot {
  versionId: string;
  label: string;
  savedAt: string;
  snapshotJson: string;
}

export interface AffiliateProject {
  id: string;
  title: string;
  isExampleSeed?: boolean;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  product: ProductAnalysis;
  creative: CreativeDirection;
  character: CharacterProfile;
  images: GeneratedImageAsset[];
  videoDuration: VideoDurationSeconds;
  videoAspectRatio: '9:16' | '16:9';
  continuity: ContinuityConfig;
  scenes: VideoScene[];
  voiceOvers: VoiceOverAsset[];
  renderedVideoUrl?: string;
  compliance?: ComplianceReport;
  prompts: PromptEntry[];
  versions: ProjectVersionSnapshot[];
}

export interface StudioSettings {
  experienceMode: ExperienceMode;
  defaultPromptLanguage: PromptLanguage;
  defaultPlatform: AffiliatePlatform;
  preferredImageModel: 'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1';
  preferredVideoModel: 'gemini-omni-1.2-flash';
  preferredVoiceModel: 'gemini-3.8-flash-lite-tts';
  cloudBackupConsent: boolean;
}
