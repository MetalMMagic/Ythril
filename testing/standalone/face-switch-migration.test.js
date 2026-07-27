/**
 * Standalone unit tests for the face-recognition switch migration.
 *
 * Face recognition lost its own on/off checkbox: the image ladder's `recognition` rung is the gate now,
 * and `mediaEmbedding.faceRecognition.enabled` survives only as the infra/env pin.
 *
 * The dangerous case — and the entire reason this migration exists — is the reverse of the usual one.
 * `enabled` used to default to FALSE while the image ceiling defaulted to `auto`, which the ladder reads
 * as "recognition allowed". So on a typical instance faces were off ONLY because of the switch. Dropping
 * the switch without touching the ceiling would have started face detection and stored face EMBEDDINGS —
 * biometric data — on upgrade, with nobody having asked for it. The migration must lower such a ceiling
 * to `caption`: images stay described and embedded (the faithful translation of the old state), faces do
 * not run. `off` would be wrong — it would also stop captioning, which the old switch never did.
 *
 * Pure (mutates a plain object), so tested here rather than through a live boot.
 *
 * Run: node --test testing/standalone/face-switch-migration.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { migrateFaceRecognitionSwitch } from '../../server/dist/config/loader.js';

const base = (face, levels) => ({
  spaces: [], tokens: [], networks: [],
  mediaEmbedding: { ...(levels ? { levels } : {}), faceRecognition: face },
});

describe('migrateFaceRecognitionSwitch', () => {
  it('enabled:false with an auto image ceiling → lowers to caption (faces must NOT switch on)', () => {
    const cfg = base({ enabled: false }, { images: 'auto', audio: 'auto' });
    assert.equal(migrateFaceRecognitionSwitch(cfg), true);
    assert.equal(cfg.mediaEmbedding.levels.images, 'caption');
    assert.equal(cfg.mediaEmbedding.levels.audio, 'auto', 'other classes untouched');
    assert.equal('enabled' in cfg.mediaEmbedding.faceRecognition, false, 'dead field dropped');
  });

  it('enabled:false with NO levels block → still pins images to caption', () => {
    // The commonest shape in the wild: nobody ever edited the ladders, so the ceiling was the `auto`
    // DEFAULT rather than a stored value. Absent must be treated as auto, or the upgrade turns faces on.
    const cfg = base({ enabled: false });
    assert.equal(migrateFaceRecognitionSwitch(cfg), true);
    assert.equal(cfg.mediaEmbedding.levels.images, 'caption');
  });

  it('enabled:false with an explicit recognition ceiling → also lowered (faces were still off before)', () => {
    const cfg = base({ enabled: false }, { images: 'recognition' });
    assert.equal(migrateFaceRecognitionSwitch(cfg), true);
    assert.equal(cfg.mediaEmbedding.levels.images, 'caption');
  });

  it('enabled:false with a ceiling already at/below caption → left alone', () => {
    for (const level of ['off', 'caption']) {
      const cfg = base({ enabled: false }, { images: level });
      assert.equal(migrateFaceRecognitionSwitch(cfg), true);
      assert.equal(cfg.mediaEmbedding.levels.images, level, `${level} already agrees`);
    }
  });

  it('enabled:true → drops the field WITHOUT touching the ladder (faces were wanted)', () => {
    const cfg = base({ enabled: true }, { images: 'auto' });
    assert.equal(migrateFaceRecognitionSwitch(cfg), true);
    assert.equal(cfg.mediaEmbedding.levels.images, 'auto', 'an operator who had faces on keeps them');
    assert.equal('enabled' in cfg.mediaEmbedding.faceRecognition, false);
  });

  it('preserves the other face settings', () => {
    const cfg = base({ enabled: false, confidenceThreshold: 0.8, personEntityTypes: ['staff'] });
    migrateFaceRecognitionSwitch(cfg);
    assert.equal(cfg.mediaEmbedding.faceRecognition.confidenceThreshold, 0.8);
    assert.deepEqual(cfg.mediaEmbedding.faceRecognition.personEntityTypes, ['staff']);
  });

  it('is idempotent and a no-op once the field is gone', () => {
    const cfg = base({ enabled: false }, { images: 'auto' });
    assert.equal(migrateFaceRecognitionSwitch(cfg), true);
    assert.equal(migrateFaceRecognitionSwitch(cfg), false, 'second run changes nothing');
    assert.equal(cfg.mediaEmbedding.levels.images, 'caption', 'and does not lower further');
  });

  it('no mediaEmbedding / no faceRecognition block → no-op', () => {
    const bare = { spaces: [], tokens: [], networks: [] };
    assert.equal(migrateFaceRecognitionSwitch(bare), false);
    assert.equal(migrateFaceRecognitionSwitch({ ...bare, mediaEmbedding: {} }), false);
  });
});
