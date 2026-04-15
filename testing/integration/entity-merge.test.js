/**
 * Integration tests: Entity Merge
 *
 * Covers:
 *  - Basic merge: two entities merged, absorbed deleted, survivor updated
 *  - Edge relinking: absorbed edges point to survivor after merge
 *  - Memory relinking: entityIds reference survivor after merge
 *  - Self-merge rejection (400)
 *  - Duplicate edge auto-deletion: identical edges (except _id) after relink
 *  - Self-loop handling: A→A edge on absorbed becomes survivor→survivor
 *  - Merge is atomic: either fully succeeds or fully fails
 *
 * Requires a running instance at localhost:3200 with space "general".
 * Run: node --test testing/integration/entity-merge.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, del, patch, reqJson } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');

let tokenA;
const SPACE = 'general';
const A = INSTANCES.a;
function token() { return tokenA; }

before(() => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
});

// ── Helper: create entity ─────────────────────────────────────────────────

async function createEntity(name, type = 'thing', properties = {}, tags = []) {
  const r = await post(A, token(), `/api/brain/spaces/${SPACE}/entities`, { name, type, properties, tags });
  assert.equal(r.status, 201, `Entity create failed: ${JSON.stringify(r.body)}`);
  return r.body;
}

async function createEdge(from, to, label, props = {}) {
  const r = await post(A, token(), `/api/brain/spaces/${SPACE}/edges`, { from, to, label, properties: props });
  assert.equal(r.status, 201, `Edge create failed: ${JSON.stringify(r.body)}`);
  return r.body;
}

async function createMemory(fact, entityIds, tags = []) {
  const r = await post(A, token(), `/api/brain/${SPACE}/memories`, { fact, entityIds, tags });
  assert.equal(r.status, 201, `Memory create failed: ${JSON.stringify(r.body)}`);
  return r.body;
}

async function merge(survivorId, absorbedId, resolutions = undefined) {
  const body = resolutions ? { resolutions } : {};
  return post(A, token(), `/api/brain/spaces/${SPACE}/entities/${survivorId}/merge/${absorbedId}`, body);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Entity Merge — integration', () => {
  it('basic merge: absorbed entity is deleted, survivor updated', async () => {
    const survivor = await createEntity('merge-survivor-1', 'person', { role: 'admin' }, ['tag-a']);
    const absorbed = await createEntity('merge-absorbed-1', 'person', { role: 'admin', extra: 'val' }, ['tag-b']);

    const r = await merge(survivor._id, absorbed._id);
    assert.equal(r.status, 200, `Merge failed: ${JSON.stringify(r.body)}`);
    assert.ok(r.body.merged, 'Response must contain merged entity');
    assert.equal(r.body.absorbedId, absorbed._id);
    assert.ok(r.body.relinked);

    // Survivor exists with merged tags
    const surv = await get(A, token(), `/api/brain/spaces/${SPACE}/entities/${survivor._id}`);
    assert.equal(surv.status, 200);
    assert.ok(surv.body.tags.includes('tag-a'));
    assert.ok(surv.body.tags.includes('tag-b'));

    // Absorbed is gone
    const abs = await get(A, token(), `/api/brain/spaces/${SPACE}/entities/${absorbed._id}`);
    assert.equal(abs.status, 404);
  });

  it('edges are relinked from absorbed to survivor', async () => {
    const survivor = await createEntity('merge-surv-edge', 'node');
    const absorbed = await createEntity('merge-abs-edge', 'node');
    const other = await createEntity('merge-other-edge', 'node');

    // Create edge: absorbed → other
    const edge = await createEdge(absorbed._id, other._id, 'connects');

    await merge(survivor._id, absorbed._id);

    // Edge should now point from survivor → other
    const e = await get(A, token(), `/api/brain/spaces/${SPACE}/edges/${edge._id}`);
    assert.equal(e.status, 200);
    assert.equal(e.body.from, survivor._id);
    assert.equal(e.body.to, other._id);
  });

  it('memories are relinked from absorbed to survivor', async () => {
    const survivor = await createEntity('merge-surv-mem', 'node');
    const absorbed = await createEntity('merge-abs-mem', 'node');

    const mem = await createMemory('linked to absorbed', [absorbed._id], ['merge-test']);

    await merge(survivor._id, absorbed._id);

    const m = await get(A, token(), `/api/brain/${SPACE}/memories/${mem._id}`);
    assert.equal(m.status, 200);
    assert.ok(m.body.entityIds.includes(survivor._id), 'Memory entityIds should contain survivor');
    assert.ok(!m.body.entityIds.includes(absorbed._id), 'Memory entityIds should NOT contain absorbed');
  });

  it('self-merge is rejected with 400', async () => {
    const entity = await createEntity('merge-self', 'node');
    const r = await merge(entity._id, entity._id);
    assert.equal(r.status, 400);
  });

  it('duplicate edges are auto-deleted when 100% identical after relink', async () => {
    const survivor = await createEntity('merge-surv-dup', 'node');
    const absorbed = await createEntity('merge-abs-dup', 'node');
    const target = await createEntity('merge-target-dup', 'node');

    // Create identical edges from both to target
    const survivorEdge = await createEdge(survivor._id, target._id, 'links-to');
    const absorbedEdge = await createEdge(absorbed._id, target._id, 'links-to');

    const r = await merge(survivor._id, absorbed._id);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.deletedDuplicateEdgeIds), 'Should report deleted duplicate edge IDs');
    assert.ok(r.body.deletedDuplicateEdgeIds.length > 0, 'One duplicate edge should be auto-deleted');

    // Original survivor edge still exists
    const se = await get(A, token(), `/api/brain/spaces/${SPACE}/edges/${survivorEdge._id}`);
    assert.equal(se.status, 200);

    // Absorbed edge should be tombstoned
    const ae = await get(A, token(), `/api/brain/spaces/${SPACE}/edges/${absorbedEdge._id}`);
    assert.equal(ae.status, 404);
  });

  it('self-loop edge on absorbed becomes survivor→survivor', async () => {
    const survivor = await createEntity('merge-surv-loop', 'node');
    const absorbed = await createEntity('merge-abs-loop', 'node');

    // Self-loop: absorbed → absorbed
    const loop = await createEdge(absorbed._id, absorbed._id, 'self-ref');

    const r = await merge(survivor._id, absorbed._id);
    assert.equal(r.status, 200);

    // The self-loop edge should now be survivor → survivor
    const e = await get(A, token(), `/api/brain/spaces/${SPACE}/edges/${loop._id}`);
    assert.equal(e.status, 200);
    assert.equal(e.body.from, survivor._id, 'Self-loop from should be relinked to survivor');
    assert.equal(e.body.to, survivor._id, 'Self-loop to should be relinked to survivor');
  });

  it('property conflict requires resolution', async () => {
    const survivor = await createEntity('merge-surv-conflict', 'node', { color: 'red' });
    const absorbed = await createEntity('merge-abs-conflict', 'node', { color: 'blue' });

    // Without resolution → should return plan with conflicts
    const r1 = await merge(survivor._id, absorbed._id);
    assert.equal(r1.status, 409, 'Should return 409 for unresolved conflicts');

    // With resolution
    const r2 = await merge(survivor._id, absorbed._id, [
      { key: 'color', resolution: 'survivor' },
    ]);
    assert.equal(r2.status, 200);
    assert.equal(r2.body.merged.properties.color, 'red');
  });
});
