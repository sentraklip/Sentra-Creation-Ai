import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScenePresets,
  evaluateComplianceLocally,
  formatStructuredImagePrompt,
  formatStructuredVideoPrompt,
} from './studioLogic';

test('buildScenePresets builds 1, 2, 3, or 4 scenes with continuity rules', () => {
  const s15 = buildScenePresets(15);
  assert.equal(s15.scenes.length, 1);
  assert.equal(s15.continuity.enabled, false);

  const s30 = buildScenePresets(30);
  assert.equal(s30.scenes.length, 2);
  assert.equal(s30.continuity.enabled, true);
  assert.equal(s30.continuity.usePreviousSceneFinalFrame, true);

  const s60 = buildScenePresets(60);
  assert.equal(s60.scenes.length, 4);
});

test('evaluateComplianceLocally flags marketplace prices, medical claims, and safe scripts', () => {
  const risky = evaluateComplianceLocally(
    'Serum ini 100% menyembuhkan jerawat dalam 1 hari, harga Rp50.000 diskon flash sale!',
    'TikTok Affiliate',
    false
  );
  assert.equal(risky.status, 'HIGH_RISK');
  assert.ok(risky.excludedMarketplaceTermsFound.length >= 2);

  const clean = evaluateComplianceLocally(
    'Tekstur serumnya ringan dan cepat meresap untuk rutinitas pagi. Cek produknya di keranjang bawah.',
    'TikTok Affiliate',
    false
  );
  assert.equal(clean.status, 'LOW_RISK');
  assert.equal(clean.findings.length, 0);
});

test('formatStructuredImagePrompt and VideoPrompt support English and Indonesian output', () => {
  const enImg = formatStructuredImagePrompt(
    {
      subject: 'Serum bottle',
      productDetails: '30ml frosted glass',
      environment: 'Sunlit vanity',
      composition: 'Center rule of thirds',
      lighting: 'Soft daylight',
      camera: '50mm f/2.8',
      visualStyle: 'Minimalist commercial',
      aspectRatio: '9:16',
      negativeInstructions: 'No text overlays',
    },
    'English'
  );
  assert.ok(enImg.includes('Subject: Serum bottle'));
  assert.ok(enImg.includes('Negative Instructions: No text overlays'));

  const idVid = formatStructuredVideoPrompt(
    {
      sceneDescription: 'Creator holds serum',
      subject: 'Nadia',
      characterAction: 'Smiling',
      productInteraction: 'Showing bottle',
      cameraMovement: 'Slow push-in',
      environment: 'Bright bedroom',
      lighting: 'Natural window light',
      dialogue: '',
      audio: 'Indonesian voice-over',
      duration: '15s',
      aspectRatio: '9:16',
      continuityInstructions: 'Keep lighting consistent',
    },
    'Indonesian'
  );
  assert.ok(idVid.includes('Deskripsi Adegan: Creator holds serum'));
  assert.ok(idVid.includes('Instruksi Kontinuitas: Keep lighting consistent'));
});
