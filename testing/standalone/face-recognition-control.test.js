/**
 * Face recognition becomes operator-settable — and the env pin has to survive it.
 *
 * #345 gave every `mediaEmbedding.faceRecognition` field an env var so infra can pin it, and
 * reported the pins in `lockedByInfra` as **namespaced** names (`faceRecognition.enabled`). Opening
 * the block up to `PATCH /api/admin/media-config` therefore introduces a specific way to get it
 * wrong: the route's lock check scanned TOP-LEVEL keys, so a patch naming the block would sail past
 * a pin the UI is already rendering as read-only.
 *
 * That is not a cosmetic bug. It would mean `FACE_RECOGNITION_ENABLED=false` stops being a
 * guarantee — on the setting that decides whether people's faces are detected and embedded, which
 * is the one an operator is most likely to have pinned deliberately.
 *
 * Run: node --test testing/standalone/face-recognition-control.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { blockedByInfra } = await import('../../server/dist/api/media-config.js');

describe('blockedByInfra — top-level pins', () => {
  it('blocks a top-level field that is pinned', () => {
    const locked = new Set(['visionProvider', 'maxFileSizeBytes']);
    assert.deepEqual(blockedByInfra({ visionProvider: 'external' }, locked), ['visionProvider']);
  });

  it('allows fields that are not pinned', () => {
    assert.deepEqual(blockedByInfra({ enabled: true }, new Set(['visionProvider'])), []);
  });

  it('reports every blocked field, not just the first', () => {
    const locked = new Set(['visionProvider', 'sttProvider']);
    const out = blockedByInfra({ visionProvider: 'external', sttProvider: 'external', enabled: true }, locked);
    assert.deepEqual(out.sort(), ['sttProvider', 'visionProvider']);
  });
});

describe('blockedByInfra — the namespaced face-recognition pins', () => {
  it('THE ONE THAT MATTERS: a pinned face field cannot be overwritten through the block', () => {
    // FACE_RECOGNITION_ENABLED=false must remain a guarantee. A top-level-only scan sees the key
    // `faceRecognition`, finds no lock by that name, and lets the whole block through.
    const locked = new Set(['faceRecognition.enabled']);
    assert.deepEqual(blockedByInfra({ faceRecognition: { enabled: true } }, locked), ['faceRecognition.enabled']);
  });

  it('blocks only the pinned field, leaving its siblings editable', () => {
    // Pinning the master switch should not freeze the tuning knobs — infra pins fields one at a time
    // precisely so the rest stays operable.
    const locked = new Set(['faceRecognition.enabled']);
    const out = blockedByInfra({ faceRecognition: { confidenceThreshold: 0.7, minFaceSizeFraction: 0.1 } }, locked);
    assert.deepEqual(out, []);
  });

  it('blocks each pinned field it finds', () => {
    const locked = new Set(['faceRecognition.enabled', 'faceRecognition.personEntityTypes']);
    const out = blockedByInfra({
      faceRecognition: { enabled: false, confidenceThreshold: 0.7, personEntityTypes: ['person'] },
    }, locked);
    assert.deepEqual(out.sort(), ['faceRecognition.enabled', 'faceRecognition.personEntityTypes']);
  });

  it('does not block when nothing is pinned', () => {
    assert.deepEqual(blockedByInfra({ faceRecognition: { enabled: true } }, new Set()), []);
  });

  it('handles a patch with no face block at all', () => {
    assert.deepEqual(blockedByInfra({ enabled: true }, new Set(['faceRecognition.enabled'])), []);
  });

  it('does not throw on a malformed face block', () => {
    // zod rejects these before the handler runs, but the function must not be the thing that
    // explodes if that ever stops being true.
    for (const face of [null, 'nonsense', 42, []]) {
      assert.doesNotThrow(() => blockedByInfra({ faceRecognition: face }, new Set(['faceRecognition.enabled'])));
    }
  });
});

