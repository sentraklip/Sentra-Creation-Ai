import type { AffiliateProject, CharacterProfile, StudioSettings } from '../types/studio';
import { buildScenePresets, evaluateComplianceLocally, formatStructuredImagePrompt, formatStructuredVideoPrompt } from '../utils/studioLogic';

export const DEFAULT_SETTINGS: StudioSettings = {
  experienceMode: 'Easy Mode',
  defaultPromptLanguage: 'English',
  defaultPlatform: 'TikTok Affiliate',
  preferredImageModel: 'gemini-3.1-flash-lite-image',
  preferredVideoModel: 'gemini-omni-1.2-flash',
  preferredVoiceModel: 'gemini-3.8-flash-lite-tts',
  cloudBackupConsent: false,
};

export const SEED_CHARACTERS: CharacterProfile[] = [
  {
    id: 'char-nadia',
    option: 'Saved Character',
    name: 'Nadia Putri',
    genderPresentation: 'Female',
    ageRange: '22–26 tahun',
    appearance: 'Perempuan Indonesia dengan rambut sebahu natural, riasan tipis segar, senyum ramah',
    clothing: 'Kemeja katun linen off-white kasual rapi',
    personality: 'Ramah, jujur, ekspresif, meyakinkan seperti teman dekat',
    voicePreference: 'Female',
    referenceImages: ['/src/assets/images/character_preset_nadia_1794989723781.jpg'],
    consistencyLock: true,
    createdAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'char-rizky',
    option: 'Saved Character',
    name: 'Rizky Pratama',
    genderPresentation: 'Male',
    ageRange: '25–30 tahun',
    appearance: 'Pria Indonesia berpenampilan rapi, rambut pendek modern, ekspresi enerjik',
    clothing: 'Kaos crewneck abu-abu minimalis bersih',
    personality: 'To-the-point, informatif, energik dan terpercaya',
    voicePreference: 'Male',
    referenceImages: ['/src/assets/images/character_preset_rizky_1794989725862.jpg'],
    consistencyLock: true,
    createdAt: '2026-11-18T00:00:00.000Z',
  },
];

export function createSeedProject(): AffiliateProject {
  const { scenes, continuity } = buildScenePresets(30);
  const voiceOverScript =
    'Kulit terasa kusam setelah seharian di luar ruangan? Coba perhatikan tekstur serum vitamin C botol kaca buram ini. Teksturnya ringan, cepat meresap, dan nyaman dipakai sebelum sunscreen setiap pagi. Cek produknya di keranjang bawah.';

  scenes[0].voiceOver =
    'Kulit terasa kusam setelah seharian beraktivitas di luar? Ini rutinitas simpel yang sering terlewat.';
  scenes[0].dialogue = 'Jujur, awalnya aku ragu sama serum yang teksturnya kental...';
  scenes[0].referenceImageUrl = '/src/assets/images/product_serum_lifestyle_1794989758839.jpg';
  scenes[0].prompt = formatStructuredVideoPrompt(
    {
      sceneDescription: 'Casual Indonesian female creator in sunlit vanity room holding frosted amber serum dropper bottle near cheek',
      subject: 'Nadia (24yo Indonesian creator) and frosted glass serum dropper bottle',
      characterAction: 'Looks directly into smartphone lens with relatable expression, holding dropper gently',
      productInteraction: 'Displays frosted amber bottle clearly at chest-to-cheek level without covering label',
      cameraMovement: 'Slow natural handheld push-in',
      environment: 'Minimalist bright bedroom vanity with morning window light and indoor plants',
      lighting: 'Soft diffused morning window daylight',
      dialogue: scenes[0].dialogue,
      audio: 'Clear Indonesian female voice-over with natural room ambiance',
      duration: '15s',
      aspectRatio: '9:16',
      continuityInstructions: 'Maintain Nadia wardrobe (off-white linen) and warm sunlit room lighting for Scene 2.',
    },
    'English'
  );

  scenes[1].voiceOver =
    'Teksturnya ringan, cepat meresap, dan nyaman dipakai di bawah sunscreen. Cek produknya di keranjang bawah.';
  scenes[1].dialogue = 'Lihat sendiri, langsung meresap tanpa rasa lengket.';
  scenes[1].referenceImageUrl = '/src/assets/images/product_serum_hero_1794989722648.jpg';
  scenes[1].prompt = formatStructuredVideoPrompt(
    {
      sceneDescription: 'Close-up transition to frosted glass serum bottle on travertine stone followed by creator pointing down toward cart CTA',
      subject: 'Frosted glass brightening serum bottle and Nadia',
      characterAction: 'Applies one drop gently on back of hand then smiles toward camera',
      productInteraction: 'Shows amber serum droplet consistency and places bottle steadily on travertine surface',
      cameraMovement: 'Smooth macro glide then eye-level medium shot',
      environment: 'Same sunlit minimalist vanity tabletop',
      lighting: 'Consistent warm morning daylight',
      dialogue: scenes[1].dialogue,
      audio: 'Warm Indonesian voice-over ending with CTA',
      duration: '15s',
      aspectRatio: '9:16',
      continuityInstructions: 'Continue directly from Scene 1 final frame lighting, outfit, and bottle design.',
    },
    'English'
  );

  const imgPrompt = formatStructuredImagePrompt(
    {
      subject: 'Frosted glass skincare brightening serum dropper bottle with warm amber liquid',
      productDetails: 'Unbranded clean minimalist white dropper cap, frosted glass body, golden-amber serum visible inside',
      environment: 'White travertine stone pedestal with soft morning window shadow lines',
      composition: 'Centered vertical commercial framing with generous top negative space for affiliate hooks',
      lighting: 'Soft diffused natural side daylight creating gentle specular highlights',
      camera: '85mm macro product lens, f/4 crisp focus on bottle texture',
      visualStyle: 'Clean modern Indonesian skincare commercial photography',
      aspectRatio: '9:16',
      negativeInstructions: 'No fake discount stickers, no distorted dropper shape, no cluttered background',
    },
    'English'
  );

  const compliance = evaluateComplianceLocally(voiceOverScript, 'TikTok Affiliate', false);

  return {
    id: 'proj-seed-serum-01',
    title: 'Contoh Proyek: Serum Wajah Brightening',
    isExampleSeed: true,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
    currentStep: 3,
    product: {
      inputMethod: 'manual_input',
      marketplace: 'Manual',
      extractedAt: '2026-11-18T00:00:00.000Z',
      productName: { value: 'GlowLab Brightening Serum 20ml', status: 'TERKONFIRMASI' },
      brand: { value: 'GlowLab (Contoh)', status: 'TERKONFIRMASI' },
      category: { value: 'Perawatan Wajah / Serum', status: 'TERKONFIRMASI' },
      description: {
        value: 'Serum wajah harian dalam botol kaca buram dengan pipet tetes, bertekstur ringan dan mudah meresap untuk rutinitas pagi maupun malam.',
        status: 'TERKONFIRMASI',
      },
      specifications: {
        value: ['Kemasan botol kaca buram dengan pipet', 'Volume 20ml'],
        status: 'TERKONFIRMASI',
      },
      materials: { value: ['Botol kaca buram (frosted glass)', 'Tutup pipet plastik putih'], status: 'TERKONFIRMASI' },
      dimensions: { value: 'Tidak tercantum di kemasan', status: 'TIDAK_DIKETAHUI' },
      colors: { value: ['Amber keemasan (cairan)', 'Putih buram (botol)'], status: 'TERKONFIRMASI' },
      features: {
        value: ['Tekstur cair ringan tidak lengket', 'Aplikator pipet higienis untuk takaran tetes'],
        status: 'TERKONFIRMASI',
      },
      benefits: {
        value: ['Membantu menjaga kelembapan kulit sebelum penggunaan tabir surya', 'Nyaman dipakai untuk rutinitas harian'],
        status: 'INFERENSI',
      },
      targetAudience: { value: 'Dewasa muda usia 20–35 tahun yang mencari serum harian praktis', status: 'INFERENSI' },
      usageInstructions: {
        value: 'Teteskan 2–3 tetes ke telapak tangan atau wajah bersih, ratakan perlahan sebelum pelembap.',
        status: 'TERKONFIRMASI',
      },
      price: {
        value: 'Dikecualikan dari klaim kreatif (perlu cek keranjang langsung)',
        status: 'TIDAK_DIKETAHUI',
        excludeFromClaims: true,
        requiresFreshVerification: true,
      },
      productImages: [
        '/src/assets/images/product_serum_hero_1794989722648.jpg',
        '/src/assets/images/product_serum_lifestyle_1794989758839.jpg',
      ],
      summary: 'Produk contoh bawaan untuk mencoba alur kerja Sentra Creation AI dari analisis hingga ekspor video.',
      mainSellingPoints: [
        'Tekstur ringan dan nyaman digunakan setiap hari',
        'Kemasan pipet kaca praktis dan higienis',
      ],
      verifiedFeatures: ['Volume 20ml', 'Botol kaca pipet', 'Tekstur ringan cepat meresap'],
      customerProblems: ['Kulit terasa kering/kusam saat beraktivitas', 'Serum terasa lengket di cuaca tropis'],
      potentialSolutions: ['Layering serum bertekstur ringan sebelum sunscreen pagi'],
      valueProposition: 'Serum harian bertekstur ringan dengan aplikator pipet presisi untuk rutinitas skincare tanpa rasa lengket.',
      recommendedAngles: [
        'Uji tekstur ringan di punggung tangan (tanpa overclaim)',
        'Rutinitas pagi 30 detik sebelum beraktivitas',
      ],
      contentRecommendations: [
        'Gunakan gaya UGC Review dengan pencahayaan jendela alami',
        'Tunjukkan tetesan pipet secara close-up untuk membuktikan tekstur ringan',
      ],
      missingInformation: ['Dimensi fisik kotak kemasan', 'Nomor registrasi edar resmi jika ingin menyebut klaim spesifik'],
      flaggedClaims: [],
    },
    creative: {
      selectedStyle: 'UGC Review',
      autoSelectedReason: 'Kategori perawatan wajah sangat efektif menggunakan gaya UGC Review yang natural dan jujur di TikTok Affiliate.',
      platform: 'TikTok Affiliate',
      durationSeconds: 30,
      marketingObjective: 'Edukasi tekstur ringan & dorong klik keranjang kuning',
      storyBeats: {
        HOOK: 'Kulit terasa kusam setelah seharian beraktivitas di luar ruangan?',
        SOLUSI: 'Kenalan sama rutinitas pagi pakai serum bertekstur ringan yang cepat meresap.',
        VALUE: 'Gak bikin lengket dan nyaman dipakai sebelum sunscreen setiap hari.',
        DETAIL: 'Dikemas dalam botol kaca pipet 20ml yang rapi dan takaran tetesnya pas.',
        CTA: 'Cek produknya di keranjang bawah.',
      },
      voiceOverScript,
    },
    character: { ...SEED_CHARACTERS[0] },
    images: [
      {
        id: 'img-seed-1',
        outputType: 'Product Hero Image',
        mode: 'Product Reference Image',
        aspectRatio: '1:1',
        background: 'White travertine stone',
        productPosition: 'Center pedestal',
        lighting: 'Soft natural daylight',
        cameraAngle: 'Eye-level studio',
        composition: 'Minimalist clean framing',
        includeCharacter: false,
        prompt: imgPrompt,
        imageUrl: '/src/assets/images/product_serum_hero_1794989722648.jpg',
        modelUsed: 'seed-asset',
        createdAt: '2026-11-18T00:00:00.000Z',
      },
      {
        id: 'img-seed-2',
        outputType: 'UGC Scene',
        mode: 'Product Reference Image',
        aspectRatio: '9:16',
        background: 'Sunlit vanity room',
        productPosition: 'Held near cheek',
        lighting: 'Natural window light',
        cameraAngle: 'Selfie UGC angle',
        composition: 'Creator + product focal',
        includeCharacter: true,
        prompt: 'UGC lifestyle creator holding serum bottle near cheek in sunlit room',
        imageUrl: '/src/assets/images/product_serum_lifestyle_1794989758839.jpg',
        modelUsed: 'seed-asset',
        createdAt: '2026-11-18T00:00:00.000Z',
      },
    ],
    videoDuration: 30,
    videoAspectRatio: '9:16',
    continuity,
    scenes,
    voiceOvers: [],
    compliance,
    prompts: [
      {
        id: 'prm-seed-img-1',
        title: 'Prompt Gambar Hero Produk (9:16)',
        category: 'Image Generation Prompt',
        language: 'English',
        content: imgPrompt,
        structuredBreakdown: {
          Subject: 'Frosted glass brightening serum dropper bottle',
          Lighting: 'Soft diffused natural side daylight',
          AspectRatio: '9:16',
        },
        versions: [
          {
            version: 1,
            content: imgPrompt,
            language: 'English',
            savedAt: '2026-11-18T00:00:00.000Z',
            note: 'Versi awal otomatis dari Creative Director',
          },
        ],
        updatedAt: '2026-11-18T00:00:00.000Z',
      },
      {
        id: 'prm-seed-vid-1',
        title: 'Prompt Adegan 1 — Hook & Masalah',
        category: 'Scene-by-Scene Prompt',
        language: 'English',
        content: scenes[0].prompt,
        structuredBreakdown: {
          Scene: '1',
          Movement: scenes[0].cameraMovement,
          Duration: '15s',
        },
        versions: [
          {
            version: 1,
            content: scenes[0].prompt,
            language: 'English',
            savedAt: '2026-11-18T00:00:00.000Z',
            note: 'Versi awal adegan 1',
          },
        ],
        updatedAt: '2026-11-18T00:00:00.000Z',
      },
    ],
    versions: [
      {
        versionId: 'ver-seed-1',
        label: 'Snapshot Awal Proyek Contoh',
        savedAt: '2026-11-18T00:00:00.000Z',
        snapshotJson: '',
      },
    ],
  };
}
