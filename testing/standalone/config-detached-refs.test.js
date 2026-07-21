/**
 * A nested config reference held across an await is orphaned by a reload — and the write that
 * commits it then lands nowhere.
 *
 * The config watcher reloads `config.json` whenever it changes on disk. `reloadConfig` refreshes the
 * config object IN PLACE, so a top-level reference (`const cfg = getConfig()`) survives. A reference
 * INTO it does not: `cfg.spaces` and `cfg.tokens` are replaced wholesale, so a `space` or `token`
 * object looked up before the await is a detached orphan afterwards.
 *
 * That is not theoretical. It has now produced two real defects:
 *
 *   - a token's lookup-prefix backfill written to an orphaned record, leaving the token on the slow
 *     full-scan path forever (fixed in #348);
 *   - a space rename committed to an orphaned space object, so the collections moved, the API
 *     returned 200, and config kept the OLD id — a rename that silently did not happen.
 *
 * The rename case is the nastier of the two because every signal says success. These tests pin the
 * mechanism itself, without a database, so the next read-modify-write across an await has something
 * to fail against.
 *
 * Run: node --test testing/standalone/config-detached-refs.test.js
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-detach-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');
process.env['CONFIG_PATH'] = CONFIG_PATH; // read at module load — set before importing

let loader;

const readDisk = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

function seed() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    instanceId: 'test-instance', instanceLabel: 'test', tokens: [], networks: [],
    spaces: [{ id: 'alpha', label: 'Alpha', builtIn: false, folders: [] }],
  }, null, 2), { mode: 0o600 });
  loader.loadConfig();
}

describe('a reload detaches nested references', () => {
  before(async () => { loader = await import('../../server/dist/config/loader.js'); });
  beforeEach(() => seed());

  it('the config object itself survives a reload — that is why top-level writes are safe', () => {
    const cfg = loader.getConfig();
    loader.reloadConfig();
    assert.equal(cfg, loader.getConfig(), 'refreshed in place, so the same object stays current');
  });

  it('but a reference INTO it does not', () => {
    const cfg = loader.getConfig();
    const space = cfg.spaces.find(s => s.id === 'alpha');
    loader.reloadConfig();
    assert.notEqual(
      space, loader.getConfig().spaces.find(s => s.id === 'alpha'),
      'cfg.spaces is replaced wholesale, so the held object is now an orphan',
    );
  });

  it('committing through the orphan loses the change — and reports success', () => {
    // This is the shape that produced the silent rename: look up, await something slow, mutate the
    // object you looked up, save. Nothing throws. Nothing warns.
    const cfg = loader.getConfig();
    const space = cfg.spaces.find(s => s.id === 'alpha');

    loader.reloadConfig();          // stands in for the watcher firing mid-await

    space.id = 'renamed';           // mutating the orphan
    loader.saveConfig(cfg);

    assert.equal(
      readDisk().spaces[0].id, 'alpha',
      'the rename was lost: the write "succeeded" and the id never changed',
    );
  });

  it('re-resolving by id inside mutateConfig commits it', () => {
    const cfg = loader.getConfig();
    const space = cfg.spaces.find(s => s.id === 'alpha');
    const heldId = space.id;

    loader.reloadConfig();          // orphan the reference again

    loader.mutateConfig(fresh => {
      const live = fresh.spaces.find(s => s.id === heldId);
      live.id = 'renamed';
    });

    assert.equal(readDisk().spaces[0].id, 'renamed', 'the rename lands');
  });

  it('mutateConfig also preserves a change another writer made meanwhile', () => {
    // Re-reading is what makes this safe, so it must not trample the file it re-read.
    const cfg = loader.getConfig();
    cfg.spaces.push({ id: 'beta', label: 'Beta', builtIn: false, folders: [] });
    loader.saveConfig(cfg);

    loader.mutateConfig(fresh => {
      fresh.spaces.find(s => s.id === 'alpha').label = 'Alpha Renamed';
    });

    const disk = readDisk();
    assert.equal(disk.spaces.find(s => s.id === 'alpha').label, 'Alpha Renamed');
    assert.ok(disk.spaces.some(s => s.id === 'beta'), 'the other writer\'s space must survive');
  });
});
