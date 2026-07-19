/**
 * F11 — render sidecar client (`files/converters/renderer.ts`), tested against a mock HTTP sidecar so
 * no Docker/PDF is needed. Covers the availability probe (+ caching), page decode, and error paths.
 *
 * Run: node --test testing/standalone/render-client.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ── Mock render sidecar ──────────────────────────────────────────────────────
const state = { health: 200, renderStatus: 200, renderBody: null };
const server = http.createServer((req, res) => {
  const url = req.url ?? '';
  if (url.startsWith('/health')) {
    res.writeHead(state.health, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: state.health === 200 ? 'ok' : 'bad' }));
    return;
  }
  if (url.startsWith('/render') && req.method === 'POST') {
    req.on('data', () => {}); // drain the multipart body
    req.on('end', () => {
      res.writeHead(state.renderStatus, { 'content-type': 'application/json' });
      res.end(state.renderBody ?? JSON.stringify({
        pages: [Buffer.from('PNG-A').toString('base64'), Buffer.from('PNG-B').toString('base64')],
        count: 2, total: 3, truncated: true, dpi: 150,
      }));
    });
    return;
  }
  res.writeHead(404); res.end();
});
const base = await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
});
process.env.RENDER_SIDECAR_URL = base;

const R = await import('../../server/dist/files/converters/renderer.js');

describe('render sidecar client', () => {
  it('isRenderAvailable() is true when /health is OK', async () => {
    R._resetRenderHealthCache(); state.health = 200;
    assert.equal(await R.isRenderAvailable(), true);
  });

  it('isRenderAvailable() is false when /health errors', async () => {
    R._resetRenderHealthCache(); state.health = 500;
    assert.equal(await R.isRenderAvailable(), false);
    state.health = 200;
  });

  it('caches the health probe (no re-hit within TTL)', async () => {
    R._resetRenderHealthCache(); state.health = 200;
    assert.equal(await R.isRenderAvailable(), true);
    state.health = 500; // would fail if re-probed, but the cache holds
    assert.equal(await R.isRenderAvailable(), true);
    state.health = 200;
  });

  it('renderPdfPages decodes base64 pages + total + truncated', async () => {
    const r = await R.renderPdfPages(Buffer.from('%PDF-fake'), { maxPages: 2 });
    assert.equal(r.pages.length, 2);
    assert.equal(r.pages[0].toString(), 'PNG-A');
    assert.equal(r.pages[1].toString(), 'PNG-B');
    assert.equal(r.total, 3);
    assert.equal(r.truncated, true);
  });

  it('renderPdfPages throws on a sidecar error status', async () => {
    state.renderStatus = 400; state.renderBody = JSON.stringify({ detail: 'cannot open document' });
    await assert.rejects(() => R.renderPdfPages(Buffer.from('x')), /render sidecar error 400/);
    state.renderStatus = 200; state.renderBody = null;
  });

  it('renderPdfPages throws when the sidecar is unreachable', async () => {
    const saved = process.env.RENDER_SIDECAR_URL;
    // Point at a closed port via a fresh import is overkill; instead assert the error path by closing.
    await new Promise((r) => server.close(r));
    await assert.rejects(() => R.renderPdfPages(Buffer.from('x')), /unreachable/);
    process.env.RENDER_SIDECAR_URL = saved;
  });
});
