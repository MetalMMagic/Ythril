/**
 * Integration: GET /api/about/security — the security-posture report (PR-S3), admin-gated.
 *
 * Run: node --test testing/integration/security-posture.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
let tokenA;

describe('security posture endpoint (F/S3)', () => {
  before(() => { tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim(); });

  it('returns a structured posture report to an admin', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/about/security');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(Array.isArray(r.body.checks), 'checks must be an array');
    assert.ok(r.body.checks.length > 0, 'expected at least one check');
    for (const c of r.body.checks) {
      assert.ok(typeof c.id === 'string' && c.id, 'check id');
      assert.ok(['pass', 'warn', 'fail'].includes(c.level), `check level: ${c.level}`);
      assert.ok(typeof c.message === 'string' && c.message, 'check message');
    }
    assert.ok(['pass', 'warn', 'fail'].includes(r.body.worst), `worst: ${r.body.worst}`);
    assert.equal(typeof r.body.strict, 'boolean');
    // The test stack opts into insecure peers, so that check should be present and WARN.
    const peers = r.body.checks.find(c => c.id === 'transport.peers');
    assert.ok(peers, 'transport.peers check present');
    assert.equal(peers.level, 'warn');
  });

  it('rejects an unauthenticated request', async () => {
    const r = await get(INSTANCES.a, '', '/api/about/security');
    assert.equal(r.status, 401);
  });
});
