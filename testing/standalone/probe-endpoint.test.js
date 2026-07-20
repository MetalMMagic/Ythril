/**
 * F11-PR5b — model-endpoint probe (`media-config.probeModelEndpoint`), tested against a mock HTTP server.
 * Covers the OpenAI `/v1/models` path, the Ollama `/api/tags` fallback, model-presence matching (incl. the
 * `<model>:tag` suffix), and the unreachable path. `external:false` so it uses a plain fetch to 127.0.0.1.
 *
 * Run: node --test testing/standalone/probe-endpoint.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ── Mock model endpoint ───────────────────────────────────────────────────────
const state = { v1: 200, tags: 200, v1Body: null, tagsBody: null };
const server = http.createServer((req, res) => {
  const url = req.url ?? '';
  if (url.startsWith('/v1/models')) {
    res.writeHead(state.v1, { 'content-type': 'application/json' });
    res.end(state.v1Body ?? JSON.stringify({ data: [{ id: 'gpt-4o' }, { id: 'text-embedding-3' }] }));
    return;
  }
  if (url.startsWith('/api/tags')) {
    res.writeHead(state.tags, { 'content-type': 'application/json' });
    res.end(state.tagsBody ?? JSON.stringify({ models: [{ name: 'moondream:latest' }, { name: 'llava:13b' }] }));
    return;
  }
  res.writeHead(404); res.end();
});

let base;
let probeModelEndpoint;
before(async () => {
  base = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
  ({ probeModelEndpoint } = await import('../../server/dist/api/media-config.js'));
});
after(() => new Promise((r) => server.close(r)));

describe('probeModelEndpoint', () => {
  it('reaches an OpenAI-compatible endpoint via /v1/models and finds the model', async () => {
    state.v1 = 200; state.v1Body = null;
    const r = await probeModelEndpoint({ baseUrl: base, model: 'gpt-4o', external: false });
    assert.equal(r.ok, true);
    assert.equal(r.reachable, true);
    assert.match(r.endpoint, /\/v1\/models$/);
    assert.equal(r.modelPresent, true);
    assert.ok(r.models.includes('gpt-4o'));
  });

  it('reports modelPresent=false when the configured model is absent', async () => {
    state.v1 = 200; state.v1Body = null;
    const r = await probeModelEndpoint({ baseUrl: base, model: 'not-there', external: false });
    assert.equal(r.reachable, true);
    assert.equal(r.modelPresent, false);
  });

  it('falls back to Ollama /api/tags when /v1/models 404s, matching the <model>:tag suffix', async () => {
    state.v1 = 404; state.tags = 200; state.tagsBody = null;
    const r = await probeModelEndpoint({ baseUrl: base, model: 'moondream', external: false });
    assert.equal(r.reachable, true);
    assert.match(r.endpoint, /\/api\/tags$/);
    assert.equal(r.modelPresent, true, 'moondream should match moondream:latest');
    state.v1 = 200;
  });

  it('modelPresent is undefined when no model is given (reachability only)', async () => {
    state.v1 = 200; state.v1Body = null;
    const r = await probeModelEndpoint({ baseUrl: base, external: false });
    assert.equal(r.reachable, true);
    assert.equal(r.modelPresent, undefined);
  });

  it('reports unreachable when nothing responds', async () => {
    const r = await probeModelEndpoint({ baseUrl: 'http://127.0.0.1:1', model: 'x', external: false });
    assert.equal(r.ok, false);
    assert.equal(r.reachable, false);
    assert.ok(typeof r.latencyMs === 'number');
  });
});
