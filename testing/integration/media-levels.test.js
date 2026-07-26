/**
 * Per-space media levels, end to end.
 *
 * The assertion that matters is not "the level round-trips" — it is that a class set to `off` reaches
 * a TERMINAL state. A file that is never analysed must not sit at `embeddingStatus: pending`, because
 * that is indistinguishable from a stuck queue: a spinner that never resolves, recall that returns
 * nothing, and nothing anywhere saying why. That failure shape is what the vector-index work was
 * about, and re-introducing it through a feature switch would be worse, not better.
 *
 * Run: node --test testing/integration/media-levels.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, get, patch } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

// A 1x1 PNG — enough to be resolved as an image without shipping a fixture.
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let token;

async function upload(filePath, contentB64) {
  const url = `${INSTANCES.a}/api/files/general?path=${encodeURIComponent(filePath)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: contentB64, encoding: 'base64' }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const setLevel = (body) => patch(INSTANCES.a, token, '/api/spaces/general', body);

describe('per-space media levels', () => {
  before(() => { token = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); });

  // Always hand the space back, so the ordering of later tests never depends on this file.
  after(async () => {
    await setLevel({ imageAnalysis: null, audioAnalysis: null, videoAnalysis: null }).catch(() => {});
  });

  it('an image uploaded with image analysis off is skipped, not left pending', async () => {
    const set = await setLevel({ imageAnalysis: 'off' });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body?.space?.imageAnalysis, 'off');

    const r = await upload(`levels-off-${Date.now()}.png`, PNG_1x1);
    assert.ok(r.status === 201 || r.status === 202, `unexpected status ${r.status}: ${JSON.stringify(r.body)}`);
    assert.equal(
      r.body?.embeddingStatus, 'skipped',
      'an unanalysed image must reach a terminal state, not sit at pending forever',
    );
  });

  it('the same upload is queued again once the level is restored', async () => {
    // Guards the obvious way to get the first test passing for the wrong reason: switching the class
    // off permanently, or the short-circuit swallowing every upload regardless of level.
    const set = await setLevel({ imageAnalysis: 'caption' });
    assert.equal(set.status, 200, JSON.stringify(set.body));

    const r = await upload(`levels-on-${Date.now()}.png`, PNG_1x1);
    assert.ok(r.status === 201 || r.status === 202, `unexpected status ${r.status}`);
    assert.notEqual(r.body?.embeddingStatus, 'skipped', 'a captioned space must still enqueue the job');
  });

  it('the override round-trips, appears on the spaces list, and clears with null', async () => {
    const set = await setLevel({ audioAnalysis: 'off', videoAnalysis: 'audio' });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body?.space?.audioAnalysis, 'off');
    assert.equal(set.body?.space?.videoAnalysis, 'audio');

    const list = await get(INSTANCES.a, token, '/api/spaces');
    const general = (list.body?.spaces ?? []).find(s => s.id === 'general');
    assert.equal(general?.audioAnalysis, 'off', 'the level must be visible to the UI');

    const clear = await setLevel({ audioAnalysis: null, videoAnalysis: null });
    assert.equal(clear.status, 200, JSON.stringify(clear.body));
    assert.equal(clear.body?.space?.audioAnalysis, undefined, 'null clears the override');
    assert.equal(clear.body?.space?.videoAnalysis, undefined);
  });

  it("video 'full' is now accepted (keyframe captioning is implemented)", async () => {
    // The rung was reserved while keyframe captioning was unbuilt; it is now a real level — video 'full'
    // runs the audio pipeline plus vision captions of sampled keyframes. So it must be accepted and stored.
    const r = await setLevel({ videoAnalysis: 'full' });
    assert.equal(r.status, 200, `expected acceptance, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body?.space?.videoAnalysis, 'full');
    // reset so later tests see a clean space
    await setLevel({ videoAnalysis: null });
  });

  it('an unknown level is refused by the schema', async () => {
    const r = await setLevel({ imageAnalysis: 'transcribe-everything' });
    assert.equal(r.status, 400, `expected a validation error, got ${r.status}`);
  });
});
