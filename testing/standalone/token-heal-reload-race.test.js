/**
 * A token's prefix backfill must survive a config reload landing mid-verify.
 *
 * `findMatchingToken` reads `config.tokens`, awaits a bcrypt compare, then heals the matched record's
 * lookup prefix. bcrypt is deliberately slow (~250ms at 12 rounds), so that await is a wide window —
 * and since the config watcher landed, a reload can happen inside it at any time on a live instance.
 *
 * A reload replaces the tokens array wholesale, which leaves the caller holding a DETACHED record.
 * Writing the prefix onto that object and saving the config persisted a config with no backfill in it:
 * the token kept working, but via the slow full-scan fallback, forever, and nothing said so. It
 * surfaced as an unrelated-looking integration failure ("prefix must be backfilled on first use")
 * that only reproduced in the full suite, because only there did a reload land in the window.
 *
 * The reload here is not simulated — `reloadConfig()` is synchronous, so calling it immediately after
 * `findMatchingToken()` starts places it deterministically inside the bcrypt await.
 *
 * Run: node --test testing/standalone/token-heal-reload-race.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-tokheal-'));
const CONFIG_PATH = path.join(tmpDir, 'config.json');

// CONFIG_PATH is read at module-load time — set it BEFORE importing the loader.
process.env['CONFIG_PATH'] = CONFIG_PATH;

let loader;
let tokens;

const readDisk = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

describe('token prefix backfill vs. a config reload mid-verify', () => {
  before(async () => {
    loader = await import('../../server/dist/config/loader.js');
    tokens = await import('../../server/dist/auth/tokens.js');
  });

  it('the backfill still persists when a reload lands during the bcrypt compare', async () => {
    // A token as it looked before the `prefix` field existed: hash only, no prefix.
    const plaintext = tokens.generateToken();
    const hash = await tokens.hashToken(plaintext);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'test-instance', instanceLabel: 'test', spaces: [], networks: [],
      tokens: [{ id: 'legacy-1', name: 'legacy', hash, admin: true }],
    }, null, 2), { mode: 0o600 });
    loader.loadConfig();

    assert.equal(readDisk().tokens[0].prefix, undefined, 'precondition: no prefix on disk');

    const pending = tokens.findMatchingToken(plaintext); // starts the bcrypt compare
    loader.reloadConfig();                               // synchronous — lands inside that await
    const record = await pending;

    assert.ok(record, 'the legacy token must still authenticate');
    assert.equal(record.id, 'legacy-1');

    const healed = readDisk().tokens.find(t => t.id === 'legacy-1');
    assert.ok(
      healed.prefix,
      'the prefix backfill was lost: it was written to a record detached by the reload, so the token ' +
      'keeps taking the slow full-scan path on every request with nothing reporting it',
    );
    assert.equal(healed.prefix.length, 8);
  });

  it('the healed value is visible to the caller in the same request', async () => {
    const plaintext = tokens.generateToken();
    const hash = await tokens.hashToken(plaintext);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'test-instance', instanceLabel: 'test', spaces: [], networks: [],
      tokens: [{ id: 'legacy-2', name: 'legacy2', hash, admin: true }],
    }, null, 2), { mode: 0o600 });
    loader.loadConfig();

    const record = await tokens.findMatchingToken(plaintext);
    assert.ok(record.prefix, 'the record handed back must carry the healed prefix');
  });

  it('a second lookup takes the fast prefix-filtered path', async () => {
    const plaintext = tokens.generateToken();
    const hash = await tokens.hashToken(plaintext);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      instanceId: 'test-instance', instanceLabel: 'test', spaces: [], networks: [],
      tokens: [{ id: 'legacy-3', name: 'legacy3', hash, admin: true }],
    }, null, 2), { mode: 0o600 });
    loader.loadConfig();

    await tokens.findMatchingToken(plaintext);
    tokens.clearTokenCache(); // force a real lookup rather than the cache hit
    const again = await tokens.findMatchingToken(plaintext);
    assert.ok(again, 'the token must still resolve once its prefix is backfilled');
    assert.equal(again.id, 'legacy-3');
  });
});
