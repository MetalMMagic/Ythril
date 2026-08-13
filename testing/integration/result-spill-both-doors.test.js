/**
 * A result set past the threshold comes back as three matches and a downloadable file — on both doors.
 *
 * ## Why this exists as well as the standalone gate
 *
 * `result-spill-suppresses-vectors.test.js` pins the rules by reading source: the threshold counts records, the
 * strip wraps the payload, all four sites call it. None of that proves the threshold is ever REACHED, and a spill
 * that never triggers is indistinguishable from no spill at all.
 *
 * So this seeds **28 entities** — above the 25-record threshold with `traverse: 0`, so the graph plays no part —
 * and asserts the shape a caller actually receives, then downloads the file and counts what is in it.
 *
 * It found a real defect on its first run: the spill lived in the `traverse > 0` branch, so `topK: 28` with no
 * traversal returned all 28. The standalone gate had passed, because every rule it checked was true in the branch
 * it looked at.
 *
 * Run: node --test testing/integration/result-spill-both-doors.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';
import { openMcpSession } from '../sync/mcp-session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `result-spill-${RUN}`;
const COUNT = 28;                        // > the 25-record threshold, with no traversal involved
const QUERY = 'vault credential rotation service';

let tokenA;
let ids = [];
let embeddingAvailable = false;
const token = () => tokenA;

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  const created = await post(INSTANCES.a, token(), '/api/spaces', { id: SPACE, label: `Result spill ${RUN}` });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  // Written WITHOUT `waitForEmbedding`: 28 sequential model calls is the difference between a test that runs and
  // one nobody runs.
  for (let i = 0; i < COUNT; i++) {
    const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/entities`, {
      name: `vault-credential-service-${i}-${RUN}`,
      type: 'service',
      description: `Vault credential rotation service number ${i}, scoping authentication tokens`,
      tags: [], properties: {},
    });
    if (r.status !== 201) break;
    embeddingAvailable = true;
    ids.push(r.body._id ?? r.body.id);
  }
  // NO wait for the vector index. `includeFreshWrites: true` makes recall also scan the newest records
  // directly — the flag exists for exactly this case — so the test does not depend on how warm the embedder is.
  //
  // It matters: waiting for 28 embeddings on a freshly rebuilt stack hit the shared 300-second index-lag timeout
  // and failed every assertion for a reason that had nothing to do with the spill.
});

after(async () => {
  await fetch(`${INSTANCES.a}/api/spaces/${SPACE}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  }).catch(() => {});
});

/** Always with `includeFreshWrites`, so the answer does not wait on the embedding queue. */
const recall = (body) => post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/recall`,
  { includeFreshWrites: true, ...body });

describe('REST: a large result set becomes a sample and a link', () => {
  it('returns three matches, the real count, and where the rest is', async (t) => {
    if (ids.length !== COUNT) return t.skip(`seeded ${ids.length}/${COUNT} — writes unavailable`);
    const r = await recall({ query: QUERY, types: ['entity'], topK: COUNT });
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));

    assert.equal(r.body.truncated, true, `${COUNT} matches must spill: ${JSON.stringify(r.body).slice(0, 300)}`);
    assert.equal(r.body.results.length, 3, 'three matches inline, per the ruling');
    // The number a caller reasons with must be the real one — three would say the space holds three.
    assert.ok(r.body.count > 3, `count must be the full set, got ${r.body.count}`);
    assert.equal(r.body.complete.inline, 3);
    assert.equal(r.body.complete.matches, r.body.count, 'the file holds every match');
    assert.match(r.body.complete.path, /^_tmp\/results-[0-9a-f-]+\.json$/);

    const ttlHours = (new Date(r.body.complete.expiresAt) - Date.now()) / 3_600_000;
    assert.ok(ttlHours > 20 && ttlHours <= 24, `one day, got ${ttlHours.toFixed(1)}h`);
  });

  it('the file holds the whole set, carries no vectors, and needs the token', async (t) => {
    if (ids.length !== COUNT) return t.skip('embedding unavailable');
    const r = await recall({ query: QUERY, types: ['entity'], topK: COUNT });
    const url = `${INSTANCES.a}${r.body.complete.download}`;

    const anon = await fetch(url);
    assert.ok(anon.status === 401 || anon.status === 403, `unauthenticated must be refused, got ${anon.status}`);

    const authed = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    assert.equal(authed.status, 200);
    const text = await authed.text();
    const body = JSON.parse(text);

    assert.equal(body.kind, 'recall-results');
    assert.equal(body.results.length, r.body.count, 'the file must hold every match, not the sample');
    assert.equal(body.request.query, QUERY, 'and say what produced it');
    // The owner asked for this by name.
    assert.equal(/"embedding"|"vector"|"embeddings"/.test(text), false, 'no vector may reach the file');
  });

  it('a small result set is unaffected — no flag, no file', async (t) => {
    if (ids.length !== COUNT) return t.skip('embedding unavailable');
    const r = await recall({ query: QUERY, types: ['entity'], topK: 5 });
    assert.equal(r.status, 200);
    assert.equal(r.body.truncated, undefined, 'five matches must come back inline');
    assert.equal(r.body.complete, undefined);
    assert.equal(r.body.results.length, 5);
  });
});

describe('MCP: the same answer through the other door', () => {
  it('recall spills identically', async (t) => {
    if (ids.length !== COUNT) return t.skip('embedding unavailable');
    let session;
    try {
      session = await openMcpSession(token());
    } catch (e) {
      return t.skip(`MCP session unavailable: ${e.message}`);
    }
    try {
      const res = await session.callTool('recall', {
        space: SPACE, query: QUERY, types: ['entity'], topK: COUNT, includeFreshWrites: true,
      });
      const text = res?.content?.[0]?.text ?? '';
      const out = JSON.parse(text);
      assert.equal(out.truncated, true, `MCP must spill too: ${text.slice(0, 250)}`);
      assert.equal(out.results.length, 3, 'three matches inline');
      assert.ok(out.count > 3, 'count is the full set');
      assert.ok(out.complete?.download, 'and the link is there');

      // A tool result is a model's context window: the sample must be small even though the answer is not.
      assert.ok(text.length < 20_000, `the inline payload should be a sample, got ${text.length} chars`);
    } finally {
      session?.close();
    }
  });
});
