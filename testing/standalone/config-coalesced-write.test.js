/**
 * Standalone unit tests: coalesced async config writer (P2)
 *
 * The sync engine persists tiny bookkeeping fields (watermarks, failure
 * counters, lastSyncAt) many times per cycle. Those writes now go through
 * saveConfigSoon() — an async, coalesced, event-loop-friendly path — instead of
 * a blocking synchronous whole-file write. saveConfig() stays durable+sync for
 * every other caller.
 *
 * These tests exercise the compiled loader directly against a temp config file
 * (no server / Docker needed), verifying:
 *  - saveConfigSoon() eventually lands on disk, and flushConfig() forces it.
 *  - A burst of saveConfigSoon() calls coalesces to the LATEST state.
 *  - A durable saveConfig() is never clobbered by a stale in-flight async flush.
 *
 * Run: node --test testing/standalone/config-coalesced-write.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-cfg-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');

// CONFIG_PATH is read at module-load time — set it BEFORE importing the loader.
process.env['CONFIG_PATH'] = CONFIG_PATH;

let loader;

function baseConfig() {
  return { instanceId: 'test-instance', instanceLabel: 'test', spaces: [], tokens: [], networks: [] };
}

function readDisk() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

const nextTick = () => new Promise(r => setImmediate(r));

describe('Coalesced async config writer', () => {
  before(async () => {
    // Seed a valid config so loadConfig() succeeds, then import the compiled loader.
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(baseConfig(), null, 2), 'utf8');
    loader = await import('../../server/dist/config/loader.js');
    loader.loadConfig();
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset to a clean, durably-written baseline before each test.
    loader.saveConfig(baseConfig());
    await loader.flushConfig();
  });

  it('saveConfigSoon eventually persists to disk', async () => {
    const cfg = { ...baseConfig(), instanceLabel: 'soon-1' };
    loader.saveConfigSoon(cfg);
    // Not necessarily on disk synchronously...
    await loader.flushConfig();
    assert.equal(readDisk().instanceLabel, 'soon-1');
  });

  it('coalesces a burst of writes to the latest state', async () => {
    for (let i = 0; i < 50; i++) {
      loader.saveConfigSoon({ ...baseConfig(), instanceLabel: `burst-${i}` });
    }
    await loader.flushConfig();
    assert.equal(readDisk().instanceLabel, 'burst-49', 'last write in the burst must win');
  });

  it('flushConfig persists a write scheduled but not yet flushed', async () => {
    loader.saveConfigSoon({ ...baseConfig(), instanceLabel: 'pending' });
    await loader.flushConfig();
    assert.equal(readDisk().instanceLabel, 'pending');
  });

  it('a durable saveConfig is not clobbered by an in-flight async flush', async () => {
    // Schedule an async flush, then immediately land a newer durable write.
    loader.saveConfigSoon({ ...baseConfig(), instanceLabel: 'stale-async' });
    loader.saveConfig({ ...baseConfig(), instanceLabel: 'durable-wins' });
    // Durable write is on disk right away.
    assert.equal(readDisk().instanceLabel, 'durable-wins');
    // Let the scheduled async flush run — it must detect it was superseded and
    // NOT overwrite the fresher durable copy.
    await nextTick();
    await loader.flushConfig();
    assert.equal(readDisk().instanceLabel, 'durable-wins', 'stale async flush must not clobber the durable write');
  });

  it('a later saveConfigSoon after a durable write still persists', async () => {
    loader.saveConfig({ ...baseConfig(), instanceLabel: 'durable' });
    loader.saveConfigSoon({ ...baseConfig(), instanceLabel: 'soon-after' });
    await loader.flushConfig();
    assert.equal(readDisk().instanceLabel, 'soon-after');
  });
});
