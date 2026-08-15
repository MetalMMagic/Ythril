/**
 * config.json is written by more than one party: request handlers, background tasks,
 * and — for crash recovery and operator repair — whatever wrote the file directly.
 *
 * `saveConfig` serialises the whole in-memory config, so a writer that captured its
 * snapshot and then waited will erase everything that landed on disk meanwhile. The
 * case that bit us: vector-index readiness polling holds a snapshot for as long as the
 * builds take, then writes one field back. In CI that write landed *after* the crash
 * recovery test had injected a `pendingSpaceOp` marker, wiping it — so the reload found
 * no marker, reconciled nothing, and the renamed space simply never appeared (404).
 * The rename itself was never at fault, which is why it reproduced nowhere else.
 *
 * These tests assert the invariant directly rather than the symptom: a change written
 * to config.json survives a subsequent server-side config write.
 *
 * NOTE: patches config.json on instance A — do not run in parallel with
 * reload-config.test.js / quota.test.js / space-op-recovery.test.js.
 *
 * Run: node --test testing/standalone/config-write-safety.test.js
 *
 * @needs-instance — drives a live server on :3200; runs in CI, skipped by preflight.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, patch, delWithBody } from '../sync/helpers.js';

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

describe('config.json write safety', () => {
  before(() => {
    if (!CONFIG_FILE) throw new Error('No config.json found for test or dev stack');
    token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  });

  after(async () => {
    for (const id of createdSpaceIds) {
      await delWithBody(INSTANCES.a, token, `/api/spaces/${id}`, { confirm: true }).catch(() => {});
    }
  });

  // Was TODO until the config watcher landed: handlers save from the in-memory config, which
  // went stale the moment anyone edited config.json directly, so an operator's hand edit was
  // reverted by the next config-writing request. The watcher reloads within its poll interval,
  // and the reload refreshes the config object in place, so a handler holding a reference
  // across an await now merges onto fresh data instead of writing pre-reload content.
  it('an on-disk change survives a later server-side config write', async () => {
    const victim = `cfgsafe-victim-${RUN_ID}`;
    const renamed = `${victim}-renamed`;
    const createR = await post(INSTANCES.a, token, '/api/spaces', { id: victim, label: 'Config Safety' });
    assert.equal(createR.status, 201, JSON.stringify(createR.body));
    createdSpaceIds.push(renamed);

    // A third party edits config.json — an operator relabelling a space by hand, which is
    // exactly the workflow `POST /api/admin/reload-config` exists to support. Deliberately
    // NOT a pendingSpaceOp marker: markers are consumed by the crash-recovery path, so one
    // would be cleared by the very reload under test and would also block the rename below.
    const edited = `cfgsafe-edited-${RUN_ID}`;
    const editedR = await post(INSTANCES.a, token, '/api/spaces', { id: edited, label: 'Before' });
    assert.equal(editedR.status, 201, JSON.stringify(editedR.body));
    createdSpaceIds.push(edited);

    const cfg = readConfig();
    cfg.spaces.find(s => s.id === edited).label = 'Edited By Hand';
    writeConfig(cfg);
    // Let the bind-mount propagate AND the config watcher's stat poll (2s) notice.
    // Without this the request below would race the watcher and the test would be
    // asserting the old behaviour half the time.
    await new Promise(r => setTimeout(r, 4000));

    // Now make the server persist config from its own copy, via an unrelated change.
    // No `confirm` — the rename route never accepted one, and since `RenameSpaceBody` became `.strict()` a
    // field the API ignores is a 400 rather than a silent drop. This call carried one (copied from the DELETE
    // body, which does require it) and was passing on the strength of the leniency that change removed.
    const renameR = await patch(INSTANCES.a, token, `/api/spaces/${victim}/rename`, { newId: renamed });
    assert.equal(renameR.status, 200, JSON.stringify(renameR.body));
    await new Promise(r => setTimeout(r, 600));

    const after = readConfig();
    assert.equal(
      after.spaces.find(s => s.id === edited)?.label,
      'Edited By Hand',
      'a config change written to disk was erased by a later server-side write — ' +
      'any operator edit is lost the same way',
    );
    // ...and the server's own change is there too: this is a merge, not a stalemate.
    assert.ok(after.spaces.some(s => s.id === renamed), 'the rename should still have been applied');
  });

  it('index-readiness finalisation does not erase an edit written while it polled', async () => {
    // The exact CI failure, in miniature: create a space (readiness polling starts in the
    // background), edit config.json while it runs, and assert the edit is still there once
    // the space reports ready. Before the fix, that background write — which holds its
    // snapshot for as long as the index builds take — silently reverted the edit.
    const id = `cfgsafe-ready-${RUN_ID}`;
    const createR = await post(INSTANCES.a, token, '/api/spaces', { id, label: 'Readiness Race' });
    assert.equal(createR.status, 201, JSON.stringify(createR.body));
    createdSpaceIds.push(id);

    const cfg = readConfig();
    cfg.spaces.find(s => s.id === id).label = 'Relabelled Mid-Build';
    writeConfig(cfg);

    // Wait for readiness to actually land (that write is the one under test).
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      await new Promise(r => setTimeout(r, 1000));
      ready = readConfig().spaces.find(s => s.id === id)?.indexStatus === 'ready';
    }
    assert.ok(ready, `space '${id}' never reached indexStatus=ready`);

    assert.equal(
      readConfig().spaces.find(s => s.id === id)?.label,
      'Relabelled Mid-Build',
      'the background index-readiness write erased an edit made while it was polling',
    );
  });
});
