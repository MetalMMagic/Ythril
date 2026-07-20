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
import { INSTANCES, get, patch, post } from '../sync/helpers.js';

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

// ── F11-PR5b — test connection ────────────────────────────────────────────────

describe('Media config — test connection (F11-PR5b)', () => {
  before(async () => { tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });

  it('probes the vision endpoint and returns a structured result (up or down)', async () => {
    const r = await post(INSTANCES.a, tokenA, '/api/admin/media-config/test-connection', { target: 'vision' });
    // The probe target may be up or down in CI; either way the endpoint answers 200 with the result envelope.
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body?.target, 'vision');
    assert.equal(typeof r.body?.reachable, 'boolean');
    assert.equal(typeof r.body?.latencyMs, 'number');
  });

  it('rejects an unknown target', async () => {
    const r = await post(INSTANCES.a, tokenA, '/api/admin/media-config/test-connection', { target: 'bogus' });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });
});

// ── Text embedding config on the Models surface (SSRF follow-up part 2) ────────

describe('Media config — text embedding', () => {
  before(async () => { tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });
  after(async () => {
    // Restore to the bundled local model so no external/broken endpoint leaks into other suites.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { embedding: { provider: 'local', baseUrl: null } }).catch(() => {});
  });

  it('GET surfaces the embedding block', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(r.status, 200);
    assert.ok(r.body?.embedding, 'embedding block should be present');
    assert.ok(typeof r.body.embedding.model === 'string');
  });

  it('rejects an external embedding endpoint that is not a public URL (SSRF)', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { embedding: { provider: 'external', baseUrl: 'http://127.0.0.1:9999' } });
    assert.equal(r.status, 400, `expected SSRF rejection, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('a provider-only change (no model/dims change) round-trips without reindex', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { embedding: { provider: 'local' } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body?.config?.embedding?.provider, 'local');
  });

  it('the embedding API key is masked in GET, never returned plaintext', async () => {
    const set = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { embedding: { provider: 'local', apiKey: 'sk-emb-secret' } });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    const key = reread.body?.embedding?.apiKey;
    assert.ok(!key || !key.includes('sk-emb-secret'), `key must be masked, got: ${key}`);
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { embedding: { provider: 'local', apiKey: null } }).catch(() => {});
  });
});

// ── F11-b — external assist model (hosted egress) ─────────────────────────────

describe('Media config — external assist model (F11-b)', () => {
  before(async () => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  });
  after(async () => {
    // Disable egress (uses: []) so no external routing leaks into other suites.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: { assistModel: { uses: [] } } }).catch(() => {});
  });

  it('assigning a use to an endpoint WITHOUT acknowledgment is rejected (egress gate)', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', {
      documentProcessing: { assistModel: { baseUrl: 'https://assist.example.com', model: 'big', uses: ['repair'] } },
    });
    // Rejected either as unacknowledged egress or (if DNS unavailable) as SSRF-unsafe — both are 400.
    assert.equal(r.status, 400, `expected rejection, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('configuring the endpoint with NO uses is allowed (no egress yet) and round-trips', async () => {
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', {
      documentProcessing: { assistModel: { baseUrl: 'https://assist.example.com', model: 'big', uses: [] } },
    });
    assert.equal(r.status, 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(reread.body?.documentProcessing?.assistModel?.baseUrl, 'https://assist.example.com');
    assert.deepEqual(reread.body?.documentProcessing?.assistModel?.uses, []);
  });

  it('a mode-only documentProcessing PATCH does not wipe the assist config (deep-merge)', async () => {
    // (endpoint set by the previous test) — change only the mode.
    const r = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { documentProcessing: { mode: 'ocr' } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    assert.equal(reread.body?.documentProcessing?.assistModel?.baseUrl, 'https://assist.example.com',
      'assist config must survive a mode-only patch');
  });

  it('the assist API key is never returned in plaintext (masked in GET)', async () => {
    const set = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', {
      documentProcessing: { assistModel: { baseUrl: 'https://assist.example.com', model: 'big', uses: [], apiKey: 'sk-secret-xyz' } },
    });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    const reread = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    const key = reread.body?.documentProcessing?.assistModel?.apiKey;
    assert.ok(key && !key.includes('sk-secret-xyz'), `key must be masked, got: ${key}`);
    // Clear the stored key.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: { assistModel: { uses: [], apiKey: null } } }).catch(() => {});
  });
});
