/**
 * Integration: F11 VLM extraction wiring — proves `documentProcessing.mode: 'vlm'` is wired into the
 * conversion pipeline and degrades gracefully. In CI there is no doc-VLM model and no OCR sidecar, so a
 * PDF uploaded under `vlm` mode must still be accepted (202, async) and fall back exactly like `ocr`
 * mode — never a 5xx, never a broken upload.
 *
 * Run: node --test testing/integration/vlm-extraction.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, get, patch } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE_A = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');
let tokenA;

async function upload(token, filePath, contentB64) {
  const url = `${INSTANCES.a}/api/files/general?path=${encodeURIComponent(filePath)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: contentB64, encoding: 'base64' }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

describe('VLM extraction mode wiring (F11)', () => {
  let originalDp;
  before(async () => {
    tokenA = fs.readFileSync(TOKEN_FILE_A, 'utf8').trim();
    const cur = await get(INSTANCES.a, tokenA, '/api/admin/media-config');
    originalDp = cur.body?.documentProcessing;
  });
  after(async () => {
    // Restore OCR mode so this doesn't leak into other suites.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config',
      { documentProcessing: originalDp ?? { mode: 'ocr' } }).catch(() => {});
  });

  it('a PDF uploaded under mode:vlm is still accepted (202) and degrades to the async path', async () => {
    const set = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { documentProcessing: { mode: 'vlm' } });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body?.config?.documentProcessing?.mode, 'vlm');

    const r = await upload(tokenA, `vlm-mode-${Date.now()}.pdf`, Buffer.from('%PDF-1.4 test').toString('base64'));
    // No VLM/OCR available in CI → the extractor falls back; the upload is still accepted for async
    // processing (the failure is the worker's problem, exactly as in ocr mode).
    assert.equal(r.status, 202, `expected 202 (graceful async), got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });

  it('a PDF uploaded under mode:max (repair tier) also degrades gracefully (202)', async () => {
    // `max` adds the repair pass on top of `vlm`. With no VLM/render/OCR sidecar in CI the route still
    // collapses to OCR — the repair tier must never make an upload fail where `vlm`/`ocr` would succeed.
    const set = await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { documentProcessing: { mode: 'max' } });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body?.config?.documentProcessing?.mode, 'max');

    const r = await upload(tokenA, `max-mode-${Date.now()}.pdf`, Buffer.from('%PDF-1.4 test').toString('base64'));
    assert.equal(r.status, 202, `expected 202 (graceful async), got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });

  // ── F11-c: per-space extraction-mode override ─────────────────────────────────
  it('a per-space documentExtraction override round-trips and clears (F11-c)', async () => {
    // Instance default is OCR here; set the space to override to `max` and confirm it persists.
    const set = await patch(INSTANCES.a, tokenA, '/api/spaces/general', { documentExtraction: 'max' });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body?.space?.documentExtraction, 'max');

    // The override is surfaced on the spaces list too (so the UI can render it).
    const list = await get(INSTANCES.a, tokenA, '/api/spaces');
    const general = (list.body?.spaces ?? []).find(s => s.id === 'general');
    assert.equal(general?.documentExtraction, 'max', 'override should appear in the spaces list');

    // null clears it → the space inherits the instance default again (field absent).
    const clear = await patch(INSTANCES.a, tokenA, '/api/spaces/general', { documentExtraction: null });
    assert.equal(clear.status, 200, JSON.stringify(clear.body));
    assert.equal(clear.body?.space?.documentExtraction, undefined, 'null should clear the override');
  });

  it('an upload to a space with a per-space override still degrades gracefully (202)', async () => {
    // Instance default OCR, but the space overrides to `vlm`. With no sidecars in CI the per-space
    // route must degrade exactly like the instance-wide one — accepted for async processing, never 5xx.
    await patch(INSTANCES.a, tokenA, '/api/admin/media-config', { documentProcessing: { mode: 'ocr' } });
    const set = await patch(INSTANCES.a, tokenA, '/api/spaces/general', { documentExtraction: 'vlm' });
    assert.equal(set.status, 200, JSON.stringify(set.body));

    const r = await upload(tokenA, `space-override-${Date.now()}.pdf`, Buffer.from('%PDF-1.4 test').toString('base64'));
    assert.equal(r.status, 202, `expected 202 (graceful async), got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');

    // Restore: clear the per-space override so it doesn't leak into other suites.
    await patch(INSTANCES.a, tokenA, '/api/spaces/general', { documentExtraction: null }).catch(() => {});
  });
});
