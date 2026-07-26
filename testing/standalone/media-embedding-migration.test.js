/**
 * Standalone unit tests for the media-embedding master-switch migration.
 *
 * Item 17 removed the `mediaEmbedding.enabled` master switch (media embedding is now always-on,
 * controlled per class by `mediaEmbedding.levels`). `migrateMediaEmbeddingMasterSwitch` maps a legacy
 * config forward. The dangerous case is `enabled:false` silently becoming "everything on" — so the
 * migration must force the three media classes to `off`. Pure (mutates a plain object), so tested here
 * rather than through a live boot.
 *
 * Run: node --test testing/standalone/media-embedding-migration.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { migrateMediaEmbeddingMasterSwitch } from '../../server/dist/config/loader.js';

const base = () => ({ spaces: [], tokens: [], networks: [] });

describe('migrateMediaEmbeddingMasterSwitch', () => {
  it('enabled:false → forces images/audio/video to off and drops enabled (preserves "was disabled")', () => {
    const cfg = { ...base(), mediaEmbedding: { enabled: false, levels: { images: 'auto', audio: 'auto', video: 'auto', text: 'chunk' } } };
    const changed = migrateMediaEmbeddingMasterSwitch(cfg);
    assert.equal(changed, true);
    assert.equal('enabled' in cfg.mediaEmbedding, false, 'enabled field removed');
    assert.deepEqual(cfg.mediaEmbedding.levels, { images: 'off', audio: 'off', video: 'off', text: 'chunk' });
  });

  it('enabled:false with no levels → creates a levels block with the three media classes off', () => {
    const cfg = { ...base(), mediaEmbedding: { enabled: false } };
    assert.equal(migrateMediaEmbeddingMasterSwitch(cfg), true);
    assert.equal('enabled' in cfg.mediaEmbedding, false);
    assert.equal(cfg.mediaEmbedding.levels.images, 'off');
    assert.equal(cfg.mediaEmbedding.levels.audio, 'off');
    assert.equal(cfg.mediaEmbedding.levels.video, 'off');
  });

  it('enabled:false overrides an explicit non-off level (the master switch used to override levels)', () => {
    const cfg = { ...base(), mediaEmbedding: { enabled: false, levels: { images: 'recognition' } } };
    migrateMediaEmbeddingMasterSwitch(cfg);
    assert.equal(cfg.mediaEmbedding.levels.images, 'off', 'a disabled instance stays fully off, not "recognition"');
  });

  it('enabled:true → just drops the field, leaves levels untouched', () => {
    const cfg = { ...base(), mediaEmbedding: { enabled: true, levels: { images: 'caption', audio: 'on', video: 'auto', text: 'auto' } } };
    assert.equal(migrateMediaEmbeddingMasterSwitch(cfg), true);
    assert.equal('enabled' in cfg.mediaEmbedding, false);
    assert.deepEqual(cfg.mediaEmbedding.levels, { images: 'caption', audio: 'on', video: 'auto', text: 'auto' });
  });

  it('no enabled field (already migrated / fresh) → no-op, returns false (idempotent)', () => {
    const cfg = { ...base(), mediaEmbedding: { levels: { images: 'off', audio: 'auto', video: 'auto', text: 'auto' } } };
    assert.equal(migrateMediaEmbeddingMasterSwitch(cfg), false);
    assert.deepEqual(cfg.mediaEmbedding.levels, { images: 'off', audio: 'auto', video: 'auto', text: 'auto' });
  });

  it('no mediaEmbedding block at all → no-op, returns false', () => {
    const cfg = base();
    assert.equal(migrateMediaEmbeddingMasterSwitch(cfg), false);
  });
});
