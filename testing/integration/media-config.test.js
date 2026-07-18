/**
 * Integration test: media/embedding provider config hot-reload (A6).
 *
 * The media worker used to read its provider config ONCE at worker start, so a
 * change made through PATCH /api/admin/media-config was invisible until the pod
 * restarted. The worker now re-reads the config on every tick and rebuilds its
 * provider bundle when the provider-relevant config actually changes.
 *
 * This asserts the change lands WITHOUT a restart: patch a provider field, then
 * wait for the worker to report that it reloaded its providers.
 *
 * Run: node --test testing/integration/media-config.test.js
 * Pre-requisite: test stack up + testing/sync/setup.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, get, patch } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');

let tokenA;
let originalModel;

/**
 * Poll until the worker reports it is running the saved provider config.
 *
 * We deliberately do NOT scrape the server log ring buffer for this: the media
 * worker retries failing jobs and floods that buffer, so on a slow runner the
 * "providers reloaded" line gets pushed out of the window between polls — which
 * made this test flaky in CI. `providerReloadPending` is a direct read of the
 * worker's live state, so it cannot be raced or evicted.
 */
async function waitForWorkerToApplyConfig(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    if (r.status === 200 && r.body?.providerReloadPending === false) return true;
    await new Promise(res => setTimeout(res, 1000));
  }
  return false;
}

describe('Media config hot-reload (A6)', () => {
  before(async () => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
    const cur = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(cur.status, 200, `read media-config: ${JSON.stringify(cur.body)}`);
    originalModel = cur.body?.vision?.model;
  });

  after(async () => {
    // Restore whatever the model was so we don't leak state into other suites.
    if (originalModel) {
      await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
        { vision: { model: originalModel } }).catch(() => {});
    }
  });

  it('a provider change is picked up by the worker without a restart', async () => {
    const probeModel = `hot-reload-probe-${Date.now()}`;
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { vision: { model: probeModel } });
    assert.equal(r.status, 200, `PATCH media-config failed: ${JSON.stringify(r.body)}`);
    assert.equal(r.body?.config?.vision?.model, probeModel, 'PATCH should echo the new model');

    // A dedicated refresh timer (not the job loop) applies provider config, so the
    // change is picked up within a couple of seconds even when the worker is busy
    // processing a slow job. Allow generous headroom for a loaded CI runner anyway.
    const applied = await waitForWorkerToApplyConfig(60_000);
    assert.ok(
      applied,
      'The media worker never picked up the media-config change (providerReloadPending stayed true). ' +
      'Provider config is being cached at worker start again — it would now need a restart to take effect (A6 regression).',
    );

    // Re-read the persisted value: the PATCH echo alone is satisfied by a
    // handler that persists nothing (the worker flag only proves a reload ran).
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(reread.status, 200);
    assert.equal(reread.body?.vision?.model, probeModel, 'patched vision.model must round-trip through GET');
  });
});

// ── F11 — documentProcessing extraction config ───────────────────────────────

describe('Media config — documentProcessing (F11)', () => {
  let originalDp;
  before(async () => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
    const cur = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    originalDp = cur.body?.documentProcessing;
  });
  after(async () => {
    // Restore to OCR so the (inert in this PR) mode doesn't leak into other suites.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: originalDp ?? { mode: 'ocr' } }).catch(() => {});
  });

  it('accepts and round-trips a documentProcessing.mode change', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: { mode: 'vlm', maxPages: 10, renderDpi: 200 } });
    assert.equal(r.status, 200, `PATCH failed: ${JSON.stringify(r.body)}`);
    assert.equal(r.body?.config?.documentProcessing?.mode, 'vlm');
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(reread.body?.documentProcessing?.mode, 'vlm');
    assert.equal(reread.body?.documentProcessing?.maxPages, 10);
  });

  it('rejects an invalid mode', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: { mode: 'magic' } });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });

  it('rejects out-of-range knobs', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: { renderDpi: 5000 } });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });
});
