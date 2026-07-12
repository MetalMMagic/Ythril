/**
 * Integration tests: Graph-traversal augmented recall (`traverse` parameter)
 *
 * Covers the 011 acceptance criteria:
 *  - traverse: 0 is behaviourally identical to classic recall (backward compat)
 *  - traverse: 1 returns seeds AND their directly-connected neighbours (any direction)
 *  - each traversal result carries source: "traverse", hops, and a connecting path
 *  - traverse: 2 reaches two-hop neighbours with hops: 2 and a 2-edge path
 *  - a circular graph (A→B→C→A) does not loop or duplicate records
 *  - an edge to a record absent from the space is silently skipped (the same
 *    hydration guard that makes cross-space edges to inaccessible spaces safe)
 *  - traverse: 6 is rejected with 400 (exceeds the server cap); non-int / negative too
 *  - total result count is bounded by the configured cap on a dense graph
 *  - the MCP recall tool accepts traverse and returns annotated results
 *
 * Seeding model: the recall SEED entity is written via the brain API so it is
 * embedded and $vectorSearch-visible; graph NEIGHBOURS are written via the sync
 * endpoint (no embedding) because they are reached structurally, not by vector
 * search — which also guarantees the seed set is deterministic (only the seed is
 * indexed).
 *
 * Run: node --test testing/integration/recall-traverse.test.js
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
const SPACE = `traverse-test-${RUN}`;        // chain + cycle + skip graph
const SPACE_DENSE = `traverse-dense-${RUN}`; // hub-and-spoke graph for the cap test

let tokenA;
let embeddingAvailable = false;
let seedAId = null;   // brain-API-assigned _id of the chain seed entity
let seedHId = null;   // brain-API-assigned _id of the dense hub entity

// Fixed neighbour IDs (written via sync, so we control them)
const entB = `trav-B-${RUN}`;
const entC = `trav-C-${RUN}`;
const entD = `trav-D-${RUN}`;
const ghost = `trav-ghost-${RUN}`; // referenced by an edge but never created as an entity
const DENSE_LEAVES = Array.from({ length: 30 }, (_, i) => `dense-leaf-${i}-${RUN}`);

function token() { return tokenA; }

/** True if `edge` connects x and y in either orientation (edge iteration order is not deterministic). */
function edgeConnects(edge, x, y) {
  return (edge.from === x && edge.to === y) || (edge.from === y && edge.to === x);
}

async function ensureReindexed(baseUrl, tok) {
  const { body: spacesBody } = await get(baseUrl, tok, '/api/spaces');
  for (const space of spacesBody?.spaces ?? []) {
    const { body: statusBody } = await get(baseUrl, tok, `/api/brain/spaces/${space.id}/reindex-status`);
    if (statusBody?.needsReindex) {
      await post(baseUrl, tok, `/api/brain/spaces/${space.id}/reindex`, {});
    }
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
        if (res.statusCode !== 200) {
          res.resume();
          reject(Object.assign(new Error(`MCP SSE open failed: ${res.statusCode}`), { statusCode: res.statusCode }));
          return;
        }
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
            if (eventType === 'endpoint') {
              const m = data.match(/sessionId=([^&\s]+)/);
              if (m) sessionId = m[1];
            } else if (eventType === 'message' && data) {
              try {
                const parsed2 = JSON.parse(data);
                const waiter = waiters.shift();
                if (waiter) waiter(parsed2);
                else pendingMessages.push(parsed2);
              } catch { /* non-JSON */ }
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
            const waiterTimeout = setTimeout(() => rej2(new Error('MCP tool call timed out')), timeoutMs);
            if (pendingMessages.length > 0) { clearTimeout(waiterTimeout); res2(pendingMessages.shift()); return; }
            waiters.push(msg => { clearTimeout(waiterTimeout); res2(msg); });
            const postData = JSON.stringify(body);
            const pr = http.request(
              { host, port, path: `/mcp/messages?sessionId=${sessionId}`, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), Authorization: `Bearer ${authToken}` } },
              pres => {
                let txt = '';
                pres.setEncoding('utf8');
                pres.on('data', c => { txt += c; });
                pres.on('end', () => {
                  if (pres.statusCode !== 202 && pres.statusCode !== 200) { clearTimeout(waiterTimeout); rej2(new Error(`MCP POST failed: ${pres.statusCode} ${txt}`)); }
                });
              },
            );
            pr.on('error', rej2);
            pr.write(postData);
            pr.end();
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

/** Poll $vectorSearch on `space` until every id in `ids` appears in unfiltered recall. */
async function waitForIndexed(space, ids, timeoutMs = 30_000) {
  const pending = new Set(ids);
  const deadline = Date.now() + timeoutMs;
  while (pending.size > 0 && Date.now() < deadline) {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${space}/recall`, { query: 'indexing probe query', types: ['entity'], topK: 100 });
    if (r.status === 200 && Array.isArray(r.body.results)) {
      for (const result of r.body.results) pending.delete(result._id);
    }
    if (pending.size > 0) await new Promise(res => setTimeout(res, 500));
  }
  if (pending.size > 0) throw new Error(`Timed out waiting for indexing of: ${[...pending].join(', ')}`);
}

async function syncEntity(space, id, name, seq) {
  const { post: syncPost } = await import('../sync/helpers.js');
  const now = new Date().toISOString();
  await syncPost(INSTANCES.a, token(), `/api/sync/entities?spaceId=${space}`, {
    _id: id, spaceId: space, name, type: 'service', tags: [],
    seq, author: { instanceId: 'test', instanceLabel: 'Test' }, createdAt: now, updatedAt: now,
  });
}

async function syncEdge(space, from, to, label, seq) {
  const { post: syncPost } = await import('../sync/helpers.js');
  const now = new Date().toISOString();
  await syncPost(INSTANCES.a, token(), `/api/sync/edges?spaceId=${space}`, {
    _id: `edge-${from}-${to}-${RUN}`, spaceId: space, from, to, label,
    seq, author: { instanceId: 'test', instanceLabel: 'Test' }, createdAt: now, updatedAt: now,
  });
}

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();

  for (const [id, label] of [[SPACE, `Traverse Test ${RUN}`], [SPACE_DENSE, `Traverse Dense ${RUN}`]]) {
    const r = await post(INSTANCES.a, token(), '/api/spaces', { id, label });
    assert.equal(r.status, 201, `Failed to create space ${id}: ${JSON.stringify(r.body)}`);
  }
  await ensureReindexed(INSTANCES.a, token());

  // Chain seed A — written via the brain API so it is embedded + searchable.
  const seedA = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/entities`, {
    name: `Vault Secret Service ${RUN}`, type: 'service',
    description: 'Vault secret storage service handling authentication token scoping and rotation',
    tags: [], properties: {},
  });
  embeddingAvailable = seedA.status === 201;
  seedAId = seedA.body?._id ?? null;

  // Dense hub H — also embedded/searchable, distinct topic so it never co-matches A.
  const seedH = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE_DENSE}/entities`, {
    name: `Telemetry Aggregator ${RUN}`, type: 'service',
    description: 'Telemetry aggregation pipeline collecting metrics from many downstream collectors',
    tags: [], properties: {},
  });
  seedHId = seedH.body?._id ?? null;

  let seq = Date.now();
  // Chain neighbours B, C, D (sync — not embedded, reached structurally only).
  for (const [id, name] of [[entB, 'B'], [entC, 'C'], [entD, 'D']]) {
    await syncEntity(SPACE, id, `TravEnt-${name}-${RUN}`, seq++);
  }
  // Edges (traversal is bidirectional):
  //   A→B (depends_on), B→C (depends_on)  → chain: B at hop 1, C at hop 2
  //   A→D (references)                    → branch: D at hop 1
  //   B→A (cycles_back)                   → the A→B→A cycle from the acceptance criteria
  //   A→ghost (references)                → dangling: ghost is never created, must be skipped
  // The cycle uses B→A (not C→A) so it does not shortcut C to a 1-hop neighbour.
  if (seedAId) {
    await syncEdge(SPACE, seedAId, entB, 'depends_on', seq++);
    await syncEdge(SPACE, entB, entC, 'depends_on', seq++);
    await syncEdge(SPACE, seedAId, entD, 'references', seq++);
    await syncEdge(SPACE, entB, seedAId, 'cycles_back', seq++);
    await syncEdge(SPACE, seedAId, ghost, 'references', seq++);
  }

  // Dense graph: hub H → 30 leaves (all one hop away).
  for (const leaf of DENSE_LEAVES) await syncEntity(SPACE_DENSE, leaf, `Leaf-${leaf}`, seq++);
  if (seedHId) for (const leaf of DENSE_LEAVES) await syncEdge(SPACE_DENSE, seedHId, leaf, 'feeds', seq++);

  if (embeddingAvailable && seedAId) await waitForIndexed(SPACE, [seedAId]);
  if (embeddingAvailable && seedHId) await waitForIndexed(SPACE_DENSE, [seedHId]);
});

after(async () => {
  for (const space of [SPACE, SPACE_DENSE]) {
    await fetch(`${INSTANCES.a}/api/spaces/${space}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    }).catch(() => {});
  }
});

// ── Validation (no embedding required) ───────────────────────────────────────

describe('Recall traverse — input validation', () => {
  it('traverse: 6 (over cap) returns 400', async () => {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: 'anything', traverse: 6 });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.match(r.body.error, /traverse/);
  });
  it('traverse: -1 (negative) returns 400', async () => {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: 'anything', traverse: -1 });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });
  it('traverse: 2.5 (non-integer) returns 400', async () => {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: 'anything', traverse: 2.5 });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });
});

// ── Behaviour (embedding required) ───────────────────────────────────────────

describe('Recall traverse — graph expansion', () => {
  const q = 'authentication token scoping vault';

  it('traverse: 0 is identical to classic recall (backward compat)', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: q, types: ['entity'], traverse: 0 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.traverseDepth, undefined, 'classic response must not carry traverseDepth');
    assert.ok(Array.isArray(r.body.results));
    const seed = r.body.results.find(x => x._id === seedAId);
    assert.ok(seed, 'seed entity must be recalled');
    assert.equal(seed.source, undefined, 'classic results must not carry a source annotation');
    assert.equal(typeof seed.score, 'number');
  });

  it('traverse: 1 returns the seed plus its direct neighbours, annotated', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: q, types: ['entity'], topK: 10, traverse: 1 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.traverseDepth, 1);

    const byId = new Map(r.body.results.map(x => [x._id ?? x.record?._id, x]));
    const seed = r.body.results.find(x => x.source === 'recall' && x.record?._id === seedAId);
    assert.ok(seed, 'seed present as source recall');
    assert.equal(seed.hops, 0);
    assert.deepEqual(seed.path, []);

    const b = r.body.results.find(x => x.record?._id === entB);
    const d = r.body.results.find(x => x.record?._id === entD);
    assert.ok(b && d, 'both direct neighbours B and D returned');
    for (const [n, id] of [[b, entB], [d, entD]]) {
      assert.equal(n.source, 'traverse');
      assert.equal(n.hops, 1);
      assert.equal(n.score, null, 'traversal-only results have null score');
      assert.equal(n.type, 'entity');
      assert.equal(n.path.length, 1, 'one-hop neighbour has a one-edge path');
      assert.ok(edgeConnects(n.path[0], seedAId, id), `path edge connects seed and ${id}`);
    }
    assert.ok(!byId.has(entC), 'two-hop neighbour C must NOT appear at depth 1');
    assert.ok(!r.body.results.some(x => (x.record?._id ?? x._id) === ghost), 'dangling edge target must be skipped');
  });

  it('traverse: 2 reaches the two-hop neighbour with a two-edge path', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: q, types: ['entity'], topK: 10, traverse: 2 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const c = r.body.results.find(x => x.record?._id === entC);
    assert.ok(c, 'two-hop neighbour C returned at depth 2');
    assert.equal(c.hops, 2);
    assert.equal(c.path.length, 2, 'two-hop neighbour has a two-edge path');
    assert.ok(edgeConnects(c.path[0], seedAId, entB), 'path hop 1 connects seed and B');
    assert.ok(edgeConnects(c.path[1], entB, entC), 'path hop 2 connects B and C');
  });

  it('a cycle does not loop or duplicate records', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    // C→A closes a cycle. Depth 3 would revisit A without cycle detection.
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`, { query: q, types: ['entity'], topK: 10, traverse: 3 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const ids = r.body.results.map(x => x.record?._id ?? x._id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, `no duplicate records (got ${JSON.stringify(ids)})`);
    const seedOccurrences = ids.filter(id => id === seedAId).length;
    assert.equal(seedOccurrences, 1, 'the seed appears exactly once despite the cycle');
  });
});

// ── Result cap (embedding required) ──────────────────────────────────────────

describe('Recall traverse — result cap', () => {
  it('caps the combined output on a dense graph', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    // topK 1, traverse 1 → cap = 1 * (1+1) * 4 = 8. Hub has 30 leaves at hop 1,
    // so truncation MUST engage: exactly 1 seed + 7 neighbours = 8.
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE_DENSE}/recall`, {
      query: 'telemetry metrics aggregation collectors', types: ['entity'], topK: 1, traverse: 1,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.count <= 8, `count ${r.body.count} must be within the cap of 8`);
    assert.equal(r.body.count, 8, 'dense graph should fill exactly to the cap');
    const seedCount = r.body.results.filter(x => x.source === 'recall').length;
    assert.equal(seedCount, 1, 'exactly one seed');
  });
});

// ── MCP surface (embedding required) ─────────────────────────────────────────

describe('Recall traverse — MCP tool', () => {
  it('MCP recall accepts traverse and returns annotated results', async (t) => {
    if (!embeddingAvailable) return t.skip('embedding unavailable');
    let session;
    try {
      session = await openMcpSession(token());
    } catch (e) {
      return t.skip(`MCP session unavailable: ${e.message}`);
    }
    try {
      const result = await session.callTool('recall', { space: SPACE, query: 'authentication token scoping vault', types: ['entity'], traverse: 1 });
      const text = result?.content?.[0]?.text;
      assert.ok(text, 'MCP recall returned text content');
      const output = JSON.parse(text);
      assert.equal(output.traverseDepth, 1);
      const seed = output.results.find(x => x.source === 'recall');
      assert.ok(seed, 'seed annotated as source recall');
      const neighbour = output.results.find(x => x.source === 'traverse' && x.record?._id === entB);
      assert.ok(neighbour, 'neighbour B reached via traverse');
      assert.equal(neighbour.hops, 1);
      assert.ok(edgeConnects(neighbour.path[0], seedAId, entB), 'MCP neighbour path connects seed and B');
    } finally {
      session.close();
    }
  });
});
