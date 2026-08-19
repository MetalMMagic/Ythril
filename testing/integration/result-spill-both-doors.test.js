/**
 * A result set past the BYTE BUDGET comes back as a whole-record prefix plus a link to the rest — on both doors.
 *
 * ## Why this exists as well as the standalone gate
 *
 * `result-spill-suppresses-vectors.test.js` pins the rules by reading source: the node count comes from the
 * payload, the vector strip wraps the write, all eight result paths go through the shared budget. None of that
 * proves the budget is ever REACHED, and a truncation that never triggers is indistinguishable from no budget
 * at all.
 *
 * So this seeds 28 entities and asks for them under a budget small enough to bite, then asserts the shape a
 * caller actually receives and downloads the remainder to count what is in it.
 *
 * ## What it caught, twice
 *
 * The first version of this test found the record cap living in the `traverse > 0` branch only, so `topK: 28`
 * with no traversal returned everything. The standalone gate had passed, because every rule it checked was true
 * in the branch it looked at.
 *
 * The byte-budget rewrite found the second one, and it is the same shape a layer down: `spillResultSet` still
 * carried the old `records <= 25` guard, so a response truncated with a small remainder said `truncated: true`
 * and carried NO `remainder` — the caller was told there was more and given no way to reach it. **That is why
 * the budget here is set to bite with only a handful of records left over rather than with dozens.** A test
 * that truncated at three and spilled twenty-five would have passed over it.
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
const COUNT = 28;
const QUERY = 'vault credential rotation service';

/**
 * The budget is MEASURED, not guessed — 80% of what the full 28 records actually serialise to.
 *
 * A hardcoded byte figure would be a flake with a delay on it: the record size here depends on the seed text,
 * on which fields recall returns by default, and on whether diagnostics are included, and all three have
 * changed within one release. A budget derived from the response cannot fall on the wrong side of the total.
 *
 * 80% for a reason: the point is a SMALL remainder. The defect this file now guards was invisible at a large
 * one, because the dead threshold it exposes only dropped remainders of 25 records or fewer.
 */
let tightBytes = 0;

let tokenA;
let ids = [];
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
    ids.push(r.body._id ?? r.body.id);
  }
  // NO wait for the vector index. `includeFreshWrites: true` makes recall also scan the newest records
  // directly — the flag exists for exactly this case — so the test does not depend on how warm the embedder is.
  //
  // It matters: waiting for 28 embeddings on a freshly rebuilt stack hit the shared 300-second index-lag timeout
  // and failed every assertion for a reason that had nothing to do with the spill.

  // Measure the full answer once, and take 80% of it as the budget every assertion below uses.
  if (ids.length === COUNT) {
    const full = await recall({ query: QUERY, types: ['entity'], topK: COUNT });
    if (full.status === 200 && full.body.truncated === false) {
      tightBytes = Math.max(1_000, Math.floor(full.body.bytesReturned * 0.8));
    }
  }
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

/**
 * Skip when the environment could not seed; FAIL when it seeded and the calibration still did not happen.
 *
 * The two are not the same and must not share an exit. "Writes unavailable" is an honest environment skip;
 * a calibration that silently produced no budget would make every assertion below run against `maxBytes: 0`
 * and report green for having measured nothing.
 */
const ready = (t) => {
  if (ids.length !== COUNT) { t.skip(`seeded ${ids.length}/${COUNT} — writes unavailable`); return false; }
  assert.ok(tightBytes > 0, 'the calibration recall in before() did not produce a budget — see its guard');
  return true;
};

describe('REST: a tight budget returns a prefix and a link to the rest', () => {
  it('says what it sent, what exists, and where the remainder is', async (t) => {
    if (!ready(t)) return;
    const r = await recall({ query: QUERY, types: ['entity'], topK: COUNT, maxBytes: tightBytes });
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));

    // The five accounting fields are on EVERY response, which is the property that makes an absence
    // uninterpretable rather than ambiguous. Asserted by presence, not by value, where the value is data.
    for (const f of ['returned', 'count', 'truncated', 'budgetBytes', 'bytesReturned']) {
      assert.notEqual(r.body[f], undefined, `${f} must be on every response: ${JSON.stringify(r.body).slice(0, 200)}`);
    }
    assert.equal(r.body.budgetBytes, tightBytes, 'the budget applied must be the one asked for');
    assert.equal(r.body.truncated, true,
      `${COUNT} records must not fit in ${tightBytes} bytes: ${JSON.stringify(r.body).slice(0, 300)}`);

    // A PREFIX of whole records — not a fixed sample. The old shape returned three whatever the budget was.
    assert.equal(r.body.returned, r.body.results.length, 'returned must count what was actually sent');
    assert.ok(r.body.returned > 3,
      `a budget must return what fits, not a constant — got ${r.body.returned} of ${r.body.count}`);
    assert.ok(r.body.returned < r.body.count, 'and it must not be the whole set, or nothing was truncated');
    assert.equal(r.body.count, COUNT, 'count is the full match total, so a caller can size what they are missing');
    assert.ok(r.body.bytesReturned <= tightBytes, `bytesReturned ${r.body.bytesReturned} exceeds the budget`);

    // Every returned record is WHOLE. A description cut in half would be the one failure the byte accounting
    // could otherwise hide.
    for (const rec of r.body.results) {
      assert.match(rec.description, /^Vault credential rotation service number \d+, scoping authentication tokens$/,
        `a returned record must be whole: ${JSON.stringify(rec).slice(0, 200)}`);
    }

    // THE REGRESSION THIS FILE EXISTS FOR: truncated and no way to reach the rest.
    assert.notEqual(r.body.remainder, undefined,
      'truncated with no remainder link — the caller is told there is more and cannot reach it');
    assert.equal(r.body.remainder.matches, r.body.count - r.body.returned,
      'the file holds exactly what did not fit, never the records already sent');
    assert.match(r.body.remainder.path, /^_tmp\/results-[0-9a-f-]+\.json$/);
    assert.equal(r.body.remainder.inline, undefined,
      'inline described the old three-record sample and must not reappear');

    const ttlHours = (new Date(r.body.remainder.expiresAt) - Date.now()) / 3_600_000;
    assert.ok(ttlHours > 20 && ttlHours <= 24, `one day, got ${ttlHours.toFixed(1)}h`);
  });

  it('the file holds the remainder, carries no vectors, and needs the token', async (t) => {
    if (!ready(t)) return;
    const r = await recall({ query: QUERY, types: ['entity'], topK: COUNT, maxBytes: tightBytes });
    assert.notEqual(r.body.remainder, undefined, JSON.stringify(r.body).slice(0, 300));
    const url = `${INSTANCES.a}${r.body.remainder.download}`;

    const anon = await fetch(url);
    assert.ok(anon.status === 401 || anon.status === 403, `unauthenticated must be refused, got ${anon.status}`);

    const authed = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    assert.equal(authed.status, 200);
    const text = await authed.text();
    const body = JSON.parse(text);

    assert.equal(body.kind, 'recall-results');
    assert.equal(body.results.length, r.body.count - r.body.returned,
      'the file must hold the remainder, not the whole set — re-sending what the caller has is the old defect');
    assert.equal(body.matches, body.results.length, 'and its own header must agree with its contents');
    assert.equal(body.graphNodes, 0, 'no traversal was asked for, so the file claims no nodes');
    assert.equal(body.records, body.results.length, 'records is matches plus nodes, counted from the payload');
    assert.equal(body.request.query, QUERY, 'and say what produced it');
    // The owner asked for this by name.
    assert.equal(/"embedding"|"vector"|"embeddings"/.test(text), false, 'no vector may reach the file');
  });

  it('an answer that fits is untouched — no truncation, no file', async (t) => {
    if (!ready(t)) return;
    const r = await recall({ query: QUERY, types: ['entity'], topK: 5 });
    assert.equal(r.status, 200);
    assert.equal(r.body.truncated, false, 'five records fit the default budget');
    assert.equal(r.body.remainder, undefined, 'and nothing is written out');
    assert.equal(r.body.results.length, 5);
    assert.equal(r.body.returned, 5);
    // Still stated rather than implied: the fields are present on the calls where the budget did NOT bite,
    // which is the whole reason a caller never has to interpret an absence.
    assert.equal(r.body.budgetBytes, 100_000, 'the operator default, reported even when it did not bite');
  });

  it('a budget that cannot hold one record still returns that record, whole', async (t) => {
    if (!ready(t)) return;
    // A budget must not become a wall. The floor is 1000 bytes, below which the request is refused rather
    // than silently rounded — so this asks for the floor and a record larger than it.
    const r = await recall({ query: QUERY, types: ['entity'], topK: COUNT, maxBytes: 1000 });
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
    assert.ok(r.body.returned >= 1, 'a caller must always be able to read at least one record');
    assert.match(r.body.results[0].description, /scoping authentication tokens$/, 'and it must be whole');
    assert.equal(r.body.truncated, true);
    assert.notEqual(r.body.remainder, undefined, 'with the other 27 reachable');
  });

  it('refuses a budget it cannot honour, rather than choosing one', async (t) => {
    if (!ready(t)) return;
    const bad = await recall({ query: QUERY, maxBytes: 'plenty' });
    assert.equal(bad.status, 400, JSON.stringify(bad.body).slice(0, 200));
    assert.match(bad.body.error, /maxBytes/, 'and name the parameter it refused');
  });
});

describe('MCP: the same answer through the other door', () => {
  it('truncates identically and points at the same kind of remainder', async (t) => {
    if (!ready(t)) return;
    let session;
    try {
      session = await openMcpSession(token());
    } catch (e) {
      return t.skip(`MCP session unavailable: ${e.message}`);
    }
    try {
      const res = await session.callTool('recall', {
        space: SPACE, query: QUERY, types: ['entity'], topK: COUNT,
        includeFreshWrites: true, maxBytes: tightBytes,
      });
      const text = res?.content?.[0]?.text ?? '';
      const out = JSON.parse(text);

      for (const f of ['returned', 'count', 'truncated', 'budgetBytes', 'bytesReturned']) {
        assert.notEqual(out[f], undefined, `${f} must be on every response too: ${text.slice(0, 200)}`);
      }
      assert.equal(out.truncated, true, `MCP must truncate too: ${text.slice(0, 250)}`);
      assert.equal(out.budgetBytes, tightBytes, 'the same parameter, honoured the same way');
      assert.equal(out.returned, out.results.length);
      assert.ok(out.returned > 3, `a prefix, not a sample — got ${out.returned}`);
      assert.equal(out.count, COUNT, 'count is the full set');
      assert.notEqual(out.remainder, undefined, 'and the link is there');
      assert.equal(out.remainder.matches, out.count - out.returned, 'holding only what did not fit');

      // A tool result is a model's context window: the budget is the promise, so hold it to the budget.
      assert.ok(text.length <= tightBytes * 1.5,
        `the payload must respect the budget it reported, got ${text.length} chars for ${tightBytes}`);
    } finally {
      session?.close();
    }
  });

  it('the same maxTokens convenience, and the smaller of the two wins', async (t) => {
    if (!ready(t)) return;
    let session;
    try {
      session = await openMcpSession(token());
    } catch (e) {
      return t.skip(`MCP session unavailable: ${e.message}`);
    }
    try {
      // 2000 tokens at the default 3.5 chars/token is 7000 bytes; the 3000-byte ceiling is smaller and must win.
      const res = await session.callTool('recall', {
        space: SPACE, query: QUERY, types: ['entity'], topK: COUNT,
        includeFreshWrites: true, maxTokens: 2000, maxBytes: 3000,
      });
      const out = JSON.parse(res?.content?.[0]?.text ?? '{}');
      assert.equal(out.budgetBytes, 3000,
        'a caller who states two ceilings meant both, so the smaller applies');
    } finally {
      session?.close();
    }
  });
});
