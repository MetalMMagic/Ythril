/**
 * Integration tests: Insert-time semantic duplicate detection
 *
 * Covers the F4 feature — the `remember` and `upsert_entity` MCP tools run an
 * opt-in (default-on) near-duplicate check using the freshly computed embedding
 * and flag highly similar existing records in the response:
 *  - remember a near-identical memory → response flags the existing one
 *  - remember a clearly distinct memory → no duplicate flag
 *  - remember with checkDuplicates:false → no flag even for a duplicate
 *  - upsert_entity a semantically duplicate entity → response flags the existing one
 *  - the write always succeeds regardless (the check is advisory)
 *
 * Duplicates are only visible once the original is $vectorSearch-indexed, so the
 * original is written and waited-for before the duplicate is inserted.
 *
 * Run: node --test testing/integration/dupe-detection.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `dupe-test-${RUN}`;

let tokenA;
let embeddingAvailable = false;

function token() { return tokenA; }
function idFrom(text) { const m = /ID ([0-9a-f-]{36})/.exec(text ?? ''); return m ? m[1] : null; }

async function ensureReindexed(baseUrl, tok) {
  const { body } = await get(baseUrl, tok, '/api/spaces');
  for (const space of body?.spaces ?? []) {
    const { body: st } = await get(baseUrl, tok, `/api/brain/spaces/${space.id}/reindex-status`);
    if (st?.needsReindex) await post(baseUrl, tok, `/api/brain/spaces/${space.id}/reindex`, {});
  }
}

async function openMcpSession(authToken, instance = INSTANCES.a, timeoutMs = 15_000) {
  const parsed = new URL(instance);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '80', 10);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host, port, path: '/mcp', method: 'GET', headers: { Authorization: `Bearer ${authToken}`, Accept: 'text/event-stream' } },
      (res) => {
        if (res.statusCode !== 200) { res.resume(); reject(Object.assign(new Error(`MCP SSE open failed: ${res.statusCode}`), { statusCode: res.statusCode })); return; }
        let buffer = '';
        let sessionId = null;
        const pendingMessages = [];
        const waiters = [];
        res.setEncoding('utf8');
        res.on('data', chunk => {
          buffer += chunk;
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part.trim()) continue;
            let eventType = 'message';
            let data = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim();
              else if (line.startsWith('data:')) data = line.slice(5).trim();
            }
            if (eventType === 'endpoint') { const m = data.match(/sessionId=([^&\s]+)/); if (m) sessionId = m[1]; }
            else if (eventType === 'message' && data) {
              try { const p = JSON.parse(data); const w = waiters.shift(); if (w) w(p); else pendingMessages.push(p); } catch { /* non-JSON */ }
            }
          }
        });
        const deadline = Date.now() + timeoutMs;
        const poll = setInterval(() => {
          if (sessionId) { clearInterval(poll); resolve({ callTool, close }); }
          else if (Date.now() > deadline) { clearInterval(poll); reject(new Error('MCP session did not receive endpoint event')); }
        }, 50);
        async function postJsonRpc(body) {
          return new Promise((res2, rej2) => {
            const wt = setTimeout(() => rej2(new Error('MCP tool call timed out')), timeoutMs);
            if (pendingMessages.length > 0) { clearTimeout(wt); res2(pendingMessages.shift()); return; }
            waiters.push(msg => { clearTimeout(wt); res2(msg); });
            const postData = JSON.stringify(body);
            const pr = http.request(
              { host, port, path: `/mcp/messages?sessionId=${sessionId}`, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), Authorization: `Bearer ${authToken}` } },
              pres => { let t = ''; pres.setEncoding('utf8'); pres.on('data', c => { t += c; }); pres.on('end', () => { if (pres.statusCode !== 202 && pres.statusCode !== 200) { clearTimeout(wt); rej2(new Error(`MCP POST failed: ${pres.statusCode} ${t}`)); } }); },
            );
            pr.on('error', rej2); pr.write(postData); pr.end();
          });
        }
        async function callTool(name, args = {}) {
          const rpc = await postJsonRpc({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
          return rpc?.result ?? rpc;
        }
        function close() { req.destroy(); }
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Poll $vectorSearch until every id appears in unfiltered recall for `types`. */
async function waitForIndexed(ids, types, timeoutMs = 30_000) {
  const pending = new Set(ids);
  const deadline = Date.now() + timeoutMs;
  while (pending.size > 0 && Date.now() < deadline) {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: 'indexing probe query', types, topK: 100 });
    if (r.status === 200 && Array.isArray(r.body.results)) for (const x of r.body.results) pending.delete(x._id);
    if (pending.size > 0) await new Promise(res => setTimeout(res, 500));
  }
  if (pending.size > 0) throw new Error(`Timed out waiting for indexing of: ${[...pending].join(', ')}`);
}

let session;

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  const r = await post(INSTANCES.a, token(), '/api/spaces', { id: SPACE, label: `Dupe Test ${RUN}` });
  assert.equal(r.status, 201, `Failed to create space: ${JSON.stringify(r.body)}`);
  await ensureReindexed(INSTANCES.a, token());
  // Probe embedding availability
  const probe = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/entities`, { name: `__dupe-probe-${RUN}__`, type: 'probe', description: 'probe', tags: [] });
  embeddingAvailable = probe.status === 201;
  session = await openMcpSession(token());
});

after(async () => {
  try { session?.close(); } catch { /* ignore */ }
  await fetch(`${INSTANCES.a}/api/spaces/${SPACE}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) }).catch(() => {});
});

describe('Duplicate detection — remember', () => {
  it('flags a near-identical memory as a possible duplicate', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const first = 'The Vault service stores secrets and rotates authentication tokens on a schedule.';
    const dup = 'The Vault service stores secrets and rotates authentication tokens on a fixed schedule.';

    const r1 = await session.callTool('remember', { space: SPACE, fact: first });
    const id1 = idFrom(r1?.content?.[0]?.text);
    assert.ok(id1, `first remember returned an id: ${r1?.content?.[0]?.text}`);
    await waitForIndexed([id1], ['memory']);

    const r2 = await session.callTool('remember', { space: SPACE, fact: dup });
    const text2 = r2?.content?.[0]?.text ?? '';
    assert.match(text2, /Possible duplicate/, `expected a duplicate flag, got: ${text2}`);
    assert.ok(text2.includes(id1), `duplicate flag should name the existing memory ${id1}: ${text2}`);
    // The write still succeeds.
    assert.ok(idFrom(text2) && idFrom(text2) !== id1, 'the near-duplicate is still stored as a new memory');
  });

  it('does not flag a clearly distinct memory', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const r = await session.callTool('remember', { space: SPACE, fact: 'Ripe bananas are a yellow tropical fruit rich in potassium.' });
    const text = r?.content?.[0]?.text ?? '';
    assert.ok(idFrom(text), 'distinct memory stored');
    assert.doesNotMatch(text, /Possible duplicate/, `distinct memory should not be flagged: ${text}`);
  });

  it('skips the check when checkDuplicates:false', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const dup = 'The Vault service stores secrets and rotates authentication tokens on a schedule.';
    const r = await session.callTool('remember', { space: SPACE, fact: dup, checkDuplicates: false });
    const text = r?.content?.[0]?.text ?? '';
    assert.ok(idFrom(text), 'memory stored');
    assert.doesNotMatch(text, /Possible duplicate/, `checkDuplicates:false must skip the flag: ${text}`);
  });
});

describe('Duplicate detection — upsert_entity', () => {
  it('flags a semantically duplicate entity insert', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const desc = 'Central telemetry aggregation pipeline collecting metrics from downstream collectors.';
    const r1 = await session.callTool('upsert_entity', { space: SPACE, name: `Telemetry Aggregator ${RUN}`, type: 'service', description: desc });
    const id1 = idFrom(r1?.content?.[0]?.text);
    assert.ok(id1, `first upsert returned an id: ${r1?.content?.[0]?.text}`);
    await waitForIndexed([id1], ['entity']);

    // Different name (avoids the exact-name warning), same semantics → semantic dup.
    const r2 = await session.callTool('upsert_entity', { space: SPACE, name: `Telemetry Collector Aggregation ${RUN}`, type: 'service', description: desc });
    const text2 = r2?.content?.[0]?.text ?? '';
    assert.match(text2, /Possible duplicate/, `expected a duplicate flag, got: ${text2}`);
    assert.ok(text2.includes(id1), `duplicate flag should name the existing entity ${id1}: ${text2}`);
  });

  it('skips the check when checkDuplicates:false', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const desc = 'Central telemetry aggregation pipeline collecting metrics from downstream collectors.';
    const r = await session.callTool('upsert_entity', { space: SPACE, name: `Telemetry Something Else ${RUN}`, type: 'service', description: desc, checkDuplicates: false });
    const text = r?.content?.[0]?.text ?? '';
    assert.doesNotMatch(text, /Possible duplicate/, `checkDuplicates:false must skip the flag: ${text}`);
  });
});
