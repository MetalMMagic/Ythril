/**
 * Integration tests: resolving a contradiction by picking a winner (`superseded`).
 *
 * ## What this is for
 *
 * A reviewer's most common actual decision about two disagreeing records is *"this one is right, that one is
 * stale"*, and neither existing resolution said it: `edited` claims a record was corrected, `linked` claims
 * the reviewer went and drew an edge somewhere by hand. `superseded` records the judgement **and acts on it**
 * — naming the loser on the finding, and drawing the `supersedes` edge for an entity pair.
 *
 * **It is not a merge.** A duplicate merge is lossless because the two records are the same thing; a
 * contradiction is not. The loser is a real record that was true, or was believed, and its history is the
 * point — so nothing is deleted or absorbed.
 *
 * ## Why these tests exist rather than unit tests
 *
 * Two of the three things worth pinning are only observable end to end:
 *
 *  - the edge is actually **drawn and findable** (an edge that is stored but not returned by the edges API is
 *    the accepted-dead-edge an integrator reported, and it looks identical to success from the resolve call);
 *  - a **non-entity pair draws no edge and SAYS so** — edges in Ythril connect entities, so a `supersedes`
 *    between two memories would be exactly that dead edge. Recording the resolution while silently not
 *    drawing anything is the failure mode this endpoint exists to avoid.
 *
 * The candidates come from the **structured** contradiction pass, which needs no NLI model at all: two
 * entities that set the same single-valued property to different values are a deterministic conflict.
 *
 * Run: node --test testing/integration/contradiction-resolve.test.js
 * Pre-requisite: docker compose -f testing/docker-compose.test.yml up && node testing/sync/setup.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, waitForIndexed } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();
const SPACE = `contra-resolve-${RUN}`;

let tokenA;
let ready = false;
const ids = {};

const token = () => tokenA;

async function raw(method, urlPath, body) {
  const r = await fetch(`${INSTANCES.a}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let parsed = null;
  try { parsed = await r.json(); } catch { /* no body */ }
  return { status: r.status, body: parsed };
}

async function ensureReindexed() {
  const { body } = await get(INSTANCES.a, token(), '/api/spaces');
  for (const space of body?.spaces ?? []) {
    const { body: st } = await get(INSTANCES.a, token(), `/api/brain/spaces/${space.id}/reindex-status`);
    if (st?.needsReindex) await post(INSTANCES.a, token(), `/api/brain/spaces/${space.id}/reindex`, {});
  }
}

const createEntity = async (name, description, properties) => {
  const r = await post(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/entities`,
    { name, type: 'service', description, properties, tags: [], waitForEmbedding: true });
  return r.status === 201 ? r.body._id : null;
};

const listOpen = async () => (await raw('GET', `/api/contradictions?space=${SPACE}&status=open`)).body?.contradictions ?? [];
const findPair = (list, x, y) => list.find(c => [c.aId, c.bId].sort().join() === [x, y].sort().join());

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  const sp = await post(INSTANCES.a, token(), '/api/spaces', { id: SPACE, label: `Contradiction Resolve ${RUN}` });
  assert.equal(sp.status, 201, `create space: ${JSON.stringify(sp.body)}`);
  await ensureReindexed();

  // A deterministic conflict: same subject (so they are near neighbours), same single-valued property, two
  // different values. No model needed — this is what the structured pass is for.
  ids.a = await createEntity(`Vault Secret Service ${RUN}`,
    'Vault secret storage service handling authentication token scoping and rotation on a schedule',
    { port: 8080 });
  ids.b = await createEntity(`Vault Secrets Service ${RUN}`,
    'Vault secret storage service handling authentication token scoping and rotation on a fixed schedule',
    { port: 9090 });
  ready = !!(ids.a && ids.b);

  if (ready) {
    await waitForIndexed(INSTANCES.a, token(), SPACE, [ids.a, ids.b], ['entity']);
    const scan = await raw('POST', `/api/contradictions/scan?space=${SPACE}`);
    assert.equal(scan.status, 200, `scan: ${JSON.stringify(scan.body)}`);
  }
});

after(async () => {
  await fetch(`${INSTANCES.a}/api/spaces/${SPACE}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  }).catch(() => {});
});

describe('Contradiction resolve — picking a winner', () => {
  it('the structured pass found the property conflict', async (t) => {
    if (!ready) return t.skip('embedding unavailable');
    const open = await listOpen();
    const c = findPair(open, ids.a, ids.b);
    assert.ok(c, `expected a candidate for the pair: ${JSON.stringify(open)}`);
    assert.equal(c.basis, 'structured-field');
    // The evidence must describe the side it is stored against — `aValue` belongs to `aId`.
    const f = c.fields?.find(x => x.key === 'port');
    assert.ok(f, `the finding must name the disagreeing key: ${JSON.stringify(c.fields)}`);
    const expected = c.aId === ids.a ? [8080, 9090] : [9090, 8080];
    assert.deepEqual([f.aValue, f.bValue], expected,
      'aValue/bValue must be attributed to aId/bId, not to whichever order the sweep met the pair in');
  });

  it('rejects a winner that was not asked for, and a superseded without one', async (t) => {
    if (!ready) return t.skip('embedding unavailable');
    const c = findPair(await listOpen(), ids.a, ids.b);
    // Refused rather than defaulted: guessing which record a reviewer meant to keep is the one mistake
    // this endpoint must never make.
    const noWinner = await raw('POST', `/api/contradictions/${c.id}/resolve`, { resolution: 'superseded' });
    assert.equal(noWinner.status, 400, JSON.stringify(noWinner.body));
    assert.match(noWinner.body.error, /winner/);

    const badWinner = await raw('POST', `/api/contradictions/${c.id}/resolve`, { resolution: 'superseded', winner: 'c' });
    assert.equal(badWinner.status, 400, JSON.stringify(badWinner.body));

    const strayWinner = await raw('POST', `/api/contradictions/${c.id}/resolve`, { resolution: 'edited', winner: 'a' });
    assert.equal(strayWinner.status, 400, `a winner without 'superseded' means nothing: ${JSON.stringify(strayWinner.body)}`);
  });

  it('records the loser and who decided, and DRAWS the supersedes edge', async (t) => {
    if (!ready) return t.skip('embedding unavailable');
    const c = findPair(await listOpen(), ids.a, ids.b);
    const winnerId = c.aId;
    const loserId = c.bId;

    const r = await raw('POST', `/api/contradictions/${c.id}/resolve`, { resolution: 'superseded', winner: 'a' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.resolution, 'superseded');
    assert.equal(r.body.supersededId, loserId, 'the response must name the record judged stale');
    assert.ok(r.body.resolvedBy, `who decided must be recorded: ${JSON.stringify(r.body)}`);
    assert.ok(r.body.edge, `an entity pair must draw the edge: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.edge.from, winnerId, 'the edge reads winner supersedes loser');
    assert.equal(r.body.edge.to, loserId);

    // The edge must be FINDABLE, not merely reported. A stored edge that the edges API does not return is
    // the accepted-dead-edge shape, and it looks identical to success from the resolve response alone.
    const edges = await get(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/edges?label=supersedes`);
    assert.equal(edges.status, 200);
    const drawn = (edges.body.edges ?? []).find(e => e.from === winnerId && e.to === loserId);
    assert.ok(drawn, `the supersedes edge must be listed: ${JSON.stringify(edges.body.edges)}`);

    // NOTHING is deleted. That is the line between this and a duplicate merge.
    for (const id of [winnerId, loserId]) {
      const still = await get(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/entities/${id}`);
      assert.equal(still.status, 200, `${id} must survive — a contradiction is not a merge`);
    }
  });

  it('the resolved finding carries the loser and the decider', async (t) => {
    if (!ready) return t.skip('embedding unavailable');
    const resolved = (await raw('GET', `/api/contradictions?space=${SPACE}&status=resolved`)).body?.contradictions ?? [];
    const c = findPair(resolved, ids.a, ids.b);
    assert.ok(c, `the pair must appear under resolved: ${JSON.stringify(resolved)}`);
    assert.equal(c.resolution, 'superseded');
    assert.ok(c.supersededId, 'supersededId must survive onto the stored finding');
    assert.ok(c.resolvedBy, 'resolvedBy must survive onto the stored finding');
  });

  it('resolving twice lands on the SAME edge rather than accumulating duplicates', async (t) => {
    if (!ready) return t.skip('embedding unavailable');
    const resolved = (await raw('GET', `/api/contradictions?space=${SPACE}&status=resolved`)).body?.contradictions ?? [];
    const c = findPair(resolved, ids.a, ids.b);
    const again = await raw('POST', `/api/contradictions/${c.id}/resolve`, { resolution: 'superseded', winner: 'a' });
    assert.equal(again.status, 200, JSON.stringify(again.body));

    const edges = await get(INSTANCES.a, token(), `/api/brain/spaces/${SPACE}/edges?label=supersedes`);
    const matching = (edges.body.edges ?? []).filter(e => e.from === c.aId && e.to === c.bId);
    assert.equal(matching.length, 1,
      `(from, to, label) is an edge's identity, so a second resolve must upsert: ${JSON.stringify(matching)}`);
  });
});
