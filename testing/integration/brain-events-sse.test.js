/**
 * Integration: live brain-change SSE stream (F12) — GET /api/brain/spaces/:spaceId/events
 *
 *  - a REST write on the space pushes a `data:` event to a subscribed EventSource-style client
 *  - the event names the collection (`memory.created`) so the client can refresh the right tab
 *  - the query-token fallback authenticates the stream (EventSource can't set headers)
 *  - no token → 401
 *
 * Run: node --test testing/integration/brain-events-sse.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'url';
import { INSTANCES, post, del } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
let tokenA;

/** Open a raw SSE request; resolves with { res, req } once response headers arrive. */
function openSse(urlPath, token) {
  const u = new URL(INSTANCES.a);
  const query = token === undefined ? '' : `?token=${encodeURIComponent(token)}`;
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: u.hostname, port: Number(u.port || 80), path: `${urlPath}${query}`, method: 'GET', headers: { Accept: 'text/event-stream' } },
      (res) => resolve({ res, req }),
    );
    req.on('error', reject);
    req.end();
  });
}

/** Resolve with the first parsed `data:` JSON object that has an `event` field. */
function nextEvent(res) {
  return new Promise((resolve) => {
    let buf = '';
    res.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try { const d = JSON.parse(line.slice(5).trim()); if (d && d.event) resolve(d); } catch { /* partial */ }
        }
      }
    });
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('brain events SSE (F12)', () => {
  before(() => { tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });

  it('a REST write pushes a matching event to a subscribed client', async () => {
    const { res, req } = await openSse('/api/brain/spaces/general/events', tokenA);
    try {
      assert.equal(res.statusCode, 200, 'SSE should authenticate via query token');
      assert.match(res.headers['content-type'] ?? '', /text\/event-stream/);

      const eventP = nextEvent(res);
      await delay(300); // ensure the server-side subscription is active before we write

      const w = await post(INSTANCES.a, tokenA, '/api/brain/spaces/general/memories', { fact: `sse-probe-${Date.now()}` });
      assert.equal(w.status, 201, JSON.stringify(w.body));

      const ev = await Promise.race([eventP, delay(10_000).then(() => { throw new Error('no SSE event within 10s'); })]);
      assert.equal(ev.event, 'memory.created', `unexpected event: ${JSON.stringify(ev)}`);
      assert.equal(ev.id, w.body._id, 'event should carry the new record id');

      await del(INSTANCES.a, tokenA, `/api/brain/spaces/general/memories/${w.body._id}`).catch(() => {});
    } finally {
      req.destroy();
    }
  });

  it('rejects an unauthenticated stream (no token) with 401', async () => {
    const { res, req } = await openSse('/api/brain/spaces/general/events', undefined);
    try {
      assert.equal(res.statusCode, 401);
    } finally {
      req.destroy();
    }
  });
});
