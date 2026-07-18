/**
 * PR-S2 — loader transparent at-rest encryption end-to-end (temp CONFIG_PATH, no MongoDB).
 *
 * With a master key configured, saveConfig writes an envelope (no plaintext keys on disk), loadConfig
 * reads it back, and migrateStateFilesAtRest encrypts a pre-existing plaintext file in place. Env +
 * CONFIG_PATH are set BEFORE importing the loader (which captures the path at module load).
 *
 * Run: node --test testing/standalone/loader-at-rest.test.js
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-atrest-'));
const cfgPath = path.join(dir, 'config.json');
process.env.CONFIG_PATH = cfgPath;
process.env.YTHRIL_MASTER_KEY = crypto.randomBytes(32).toString('base64');

const loader = await import('../../server/dist/config/loader.js');

function writePlain(obj) {
  fs.writeFileSync(cfgPath, JSON.stringify(obj), { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(cfgPath, 0o600); } catch { /* win32 */ }
}

describe('loader at-rest encryption', () => {
  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.YTHRIL_MASTER_KEY;
    delete process.env.CONFIG_PATH;
  });

  it('atRestEncryptionActive() true when a key is configured', () => {
    assert.equal(loader.atRestEncryptionActive(), true);
  });

  it('saveConfig writes an encrypted envelope; loadConfig reads it back', () => {
    loader.saveConfig({ instanceId: 'inst-1', instanceLabel: 'L', spaces: [], tokens: [], networks: [] });
    const raw = fs.readFileSync(cfgPath, 'utf8');
    assert.ok(raw.includes('ythrilEnc'), 'on-disk file must be an envelope');
    assert.ok(!raw.includes('inst-1'), 'plaintext values must not be visible on disk');
    assert.equal(loader.loadConfig().instanceId, 'inst-1');
  });

  it('migrateStateFilesAtRest encrypts a pre-existing plaintext file in place', () => {
    writePlain({ instanceId: 'inst-2', spaces: [], tokens: [], networks: [] });
    assert.ok(!fs.readFileSync(cfgPath, 'utf8').includes('ythrilEnc'), 'precondition: plaintext');
    loader.migrateStateFilesAtRest();
    const raw = fs.readFileSync(cfgPath, 'utf8');
    assert.ok(raw.includes('ythrilEnc'), 'file is encrypted after migration');
    assert.ok(!raw.includes('inst-2'), 'plaintext no longer on disk');
    assert.equal(loader.loadConfig().instanceId, 'inst-2');
  });

  it('an already-encrypted file is left unchanged by migration (idempotent)', () => {
    const before = fs.readFileSync(cfgPath, 'utf8');
    loader.migrateStateFilesAtRest();
    assert.equal(fs.readFileSync(cfgPath, 'utf8'), before);
  });

  it('strict mode without a master secret trips the boot guard (index.ts refuses to start)', () => {
    const savedKey = process.env.YTHRIL_MASTER_KEY;
    delete process.env.YTHRIL_MASTER_KEY;
    process.env.YTHRIL_REQUIRE_ENCRYPTED_AT_REST = 'true';
    try {
      assert.equal(loader.atRestEncryptionActive(), false);
      assert.equal(loader.requireEncryptedAtRest(), true);
      // This is exactly the condition index.ts exits on.
      assert.ok(loader.requireEncryptedAtRest() && !loader.atRestEncryptionActive());
    } finally {
      process.env.YTHRIL_MASTER_KEY = savedKey;
      delete process.env.YTHRIL_REQUIRE_ENCRYPTED_AT_REST;
    }
  });
});
