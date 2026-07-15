/**
 * Crash-safety tests: resumable space rename / delete (A5 step 2).
 *
 * A space rename/delete spans config + MongoDB + the filesystem and cannot be
 * atomic. renameSpace/removeSpace persist a `pendingSpaceOp` write-ahead marker
 * BEFORE the physical steps and clear it only once the op commits. If the process
 * dies in between, the op is completed idempotently on the next boot — and also on
 * POST /api/admin/reload-config, which is what these tests drive (no restart needed).
 *
 * Each test simulates a crash right after the marker was written but before ANY
 * physical work: it injects the marker into config.json (leaving collections/files
 * under the original id) and reloads, then asserts the op ran to completion and the
 * marker was cleared.
 *
 * NOTE: patches config.json on instance A — do not run in parallel with
 * reload-config.test.js / quota.test.js.
 *
 * Run: node --test testing/standalone/space-op-recovery.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, delWithBody } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATE_CONFIGS = [
  path.join(__dirname, '..', 'sync', 'configs', 'a', 'config.json'),
  path.join(__dirname, '..', '..', 'config', 'config.json'),
];
const CONFIG_FILE = CANDIDATE_CONFIGS.find(p => fs.existsSync(p)) ?? null;
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');
const USE_DOCKER_EXEC = process.platform !== 'win32' && CONFIG_FILE?.includes(path.join('sync', 'configs'));
const CONTAINER_A = 'ythril-a';
const RUN_ID = Date.now();

let token;
const createdSpaceIds = [];

function readConfig() {
  if (USE_DOCKER_EXEC) {
    return JSON.parse(execSync(`docker exec ${CONTAINER_A} cat /config/config.json`).toString('utf8'));
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function writeConfig(cfg) {
  if (USE_DOCKER_EXEC) {
    execSync(
      `docker exec -i ${CONTAINER_A} sh -c 'cat > /config/config.json && chmod 600 /config/config.json'`,
      { input: JSON.stringify(cfg, null, 2) },
    );
    return;
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

/** Persist a pending-op marker into config.json and reload so the server picks it up. */
async function injectMarkerAndReload(mutate) {
  const cfg = readConfig();
  mutate(cfg);
  writeConfig(cfg);
  // Let the Docker Desktop bind-mount propagate before triggering the reload,
  // otherwise the container may read the pre-write file (see reload-config.test.js).
  await new Promise(r => setTimeout(r, 600));
  const reload = await post(INSTANCES.a, token, '/api/admin/reload-config', {});
  assert.equal(reload.status, 200, `reload-config failed: ${JSON.stringify(reload.body)}`);
}

describe('Space op crash recovery (A5)', () => {
  before(() => {
    if (!CONFIG_FILE) throw new Error('No config.json found for test or dev stack');
    token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  });

  after(async () => {
    for (const id of createdSpaceIds) {
      await delWithBody(INSTANCES.a, token, `/api/spaces/${id}`, { confirm: true }).catch(() => {});
    }
  });

  it('an interrupted rename is completed on reload', async () => {
    const oldId = `recov-ren-src-${RUN_ID}`;
    const newId = `recov-ren-dst-${RUN_ID}`;

    const createR = await post(INSTANCES.a, token, '/api/spaces', { id: oldId, label: 'Recovery Rename' });
    assert.equal(createR.status, 201, JSON.stringify(createR.body));

    // Seed one of EVERY collection — a rename reconcile that only moves the
    // memories collection (and drops entities/edges/chrono) would otherwise pass
    // a memories-only check (S8.10).
    const memR = await post(INSTANCES.a, token, `/api/brain/spaces/${oldId}/memories`, {
      fact: 'survives an interrupted rename', tags: ['a5-recovery'],
    });
    assert.equal(memR.status, 201, JSON.stringify(memR.body));
    const memId = memR.body._id;

    const entFrom = await post(INSTANCES.a, token, `/api/brain/spaces/${oldId}/entities`, {
      name: `RecovFrom-${RUN_ID}`, type: 'concept', tags: ['a5-recovery'],
    });
    assert.equal(entFrom.status, 201, JSON.stringify(entFrom.body));
    const entFromId = entFrom.body._id;
    const entTo = await post(INSTANCES.a, token, `/api/brain/spaces/${oldId}/entities`, {
      name: `RecovTo-${RUN_ID}`, type: 'concept', tags: ['a5-recovery'],
    });
    assert.equal(entTo.status, 201, JSON.stringify(entTo.body));
    const entToId = entTo.body._id;

    const edgeR = await post(INSTANCES.a, token, `/api/brain/spaces/${oldId}/edges`, {
      from: entFromId, to: entToId, label: `recov-edge-${RUN_ID}`, tags: ['a5-recovery'],
    });
    assert.equal(edgeR.status, 201, JSON.stringify(edgeR.body));
    const edgeId = edgeR.body._id;

    const chronoR = await post(INSTANCES.a, token, `/api/brain/spaces/${oldId}/chrono`, {
      title: `RecovChrono-${RUN_ID}`, type: 'event', startsAt: new Date().toISOString(), tags: ['a5-recovery'],
    });
    assert.equal(chronoR.status, 201, JSON.stringify(chronoR.body));
    const chronoId = chronoR.body._id;

    // Simulate a crash right after the marker was written (no physical work yet):
    // the space + its collections are still under oldId.
    await injectMarkerAndReload(cfg => {
      cfg.pendingSpaceOp = { type: 'rename', spaceId: oldId, newId, startedAt: new Date(RUN_ID).toISOString() };
    });
    createdSpaceIds.push(newId);

    // Reconcile should have renamed EVERY collection to newId and cleared the marker.
    const newR = await get(INSTANCES.a, token, `/api/brain/spaces/${newId}/memories`);
    assert.equal(newR.status, 200, `renamed space should be live: ${newR.status}`);
    assert.ok(newR.body.memories?.some(m => m._id === memId), 'memory should survive under the new id');

    const newEnts = await get(INSTANCES.a, token, `/api/brain/spaces/${newId}/entities`);
    assert.equal(newEnts.status, 200, `entities listing should be live under new id: ${newEnts.status}`);
    assert.ok(newEnts.body.entities?.some(e => e._id === entFromId), 'entity should survive under the new id');

    const newEdges = await get(INSTANCES.a, token, `/api/brain/spaces/${newId}/edges`);
    assert.equal(newEdges.status, 200, `edges listing should be live under new id: ${newEdges.status}`);
    assert.ok(newEdges.body.edges?.some(e => e._id === edgeId), 'edge should survive under the new id');

    const newChrono = await get(INSTANCES.a, token, `/api/brain/spaces/${newId}/chrono`);
    assert.equal(newChrono.status, 200, `chrono listing should be live under new id: ${newChrono.status}`);
    assert.ok(newChrono.body.chrono?.some(c => c._id === chronoId), 'chrono should survive under the new id');

    const oldR = await get(INSTANCES.a, token, `/api/brain/spaces/${oldId}/memories`);
    assert.ok(oldR.status === 403 || oldR.status === 404, `old id should be gone, got ${oldR.status}`);

    const cfg = readConfig();
    assert.equal(cfg.pendingSpaceOp, undefined, 'marker should be cleared after reconcile');
    assert.ok(cfg.spaces.some(s => s.id === newId), 'config should list the space under the new id');
    assert.ok(!cfg.spaces.some(s => s.id === oldId), 'config should no longer list the old id');
  });

  it('an interrupted delete is completed on reload', async () => {
    const spaceId = `recov-del-${RUN_ID}`;

    const createR = await post(INSTANCES.a, token, '/api/spaces', { id: spaceId, label: 'Recovery Delete' });
    assert.equal(createR.status, 201, JSON.stringify(createR.body));
    const memR = await post(INSTANCES.a, token, `/api/brain/spaces/${spaceId}/memories`, {
      fact: 'about to be deleted', tags: ['a5-recovery'],
    });
    assert.equal(memR.status, 201, JSON.stringify(memR.body));

    // Simulate a crash right after the delete marker was written.
    await injectMarkerAndReload(cfg => {
      cfg.pendingSpaceOp = { type: 'delete', spaceId, startedAt: new Date(RUN_ID).toISOString() };
    });

    // Reconcile should have finished the deletion and cleared the marker.
    const listedR = await get(INSTANCES.a, token, `/api/brain/spaces/${spaceId}/memories`);
    assert.ok(listedR.status === 403 || listedR.status === 404, `deleted space should be gone, got ${listedR.status}`);

    const cfg = readConfig();
    assert.equal(cfg.pendingSpaceOp, undefined, 'marker should be cleared after reconcile');
    assert.ok(!cfg.spaces.some(s => s.id === spaceId), 'config should no longer list the deleted space');
  });
});
