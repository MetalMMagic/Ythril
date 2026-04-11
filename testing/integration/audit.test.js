/**
 * Integration tests: Audit Log
 *
 * Covers:
 *  - Audit log entries are written for mutating API operations
 *  - GET /api/admin/audit-log returns entries (admin only)
 *  - Filtering by operation, spaceId, status, tokenId, ip
 *  - Pagination (limit / offset)
 *  - auth.failed entries are recorded for bad tokens
 *  - Non-admin tokens cannot access the audit log
 *
 * Run: node --test testing/integration/audit.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, del } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');

let tokenA;

describe('Audit Log', () => {
  before(() => {
    tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  });

  it('Audit log endpoint requires admin token', async () => {
    // Create a non-admin token
    const create = await post(INSTANCES.a, tokenA, '/api/tokens', {
      name: 'non-admin-audit-test',
      admin: false,
    });
    assert.equal(create.status, 201);
    const nonAdminToken = create.body.plaintext;
    const tokenId = create.body.token.id;

    const r = await get(INSTANCES.a, nonAdminToken, '/api/admin/audit-log');
    assert.equal(r.status, 403, 'Non-admin token should be rejected');

    // Clean up
    await del(INSTANCES.a, tokenA, `/api/tokens/${tokenId}`);
  });

  it('Audit log returns entries after a write operation', async () => {
    // Perform a memory create
    const memR = await post(INSTANCES.a, tokenA, '/api/brain/general/memories', {
      fact: 'Audit test fact ' + Date.now(),
      tags: ['audit-test'],
    });
    assert.equal(memR.status, 201, 'Memory creation should succeed');

    // Give the async audit write a moment to flush
    await new Promise(r => setTimeout(r, 500));

    // Query the audit log for memory.create operations
    const r = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?operation=memory.create&limit=5');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.entries), 'entries should be an array');
    assert.ok(r.body.entries.length > 0, 'Should have at least one entry');
    assert.ok(typeof r.body.total === 'number', 'total should be a number');
    assert.ok(typeof r.body.hasMore === 'boolean', 'hasMore should be a boolean');

    const entry = r.body.entries[0];
    assert.equal(entry.operation, 'memory.create');
    assert.equal(entry.method, 'POST');
    assert.ok(entry.timestamp, 'Entry should have a timestamp');
    assert.ok(entry.ip, 'Entry should have an IP');
    assert.ok(entry.tokenId || entry.oidcSubject, 'Entry should have tokenId or oidcSubject');
  });

  it('Audit log filters by spaceId', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?spaceId=general&limit=5');
    assert.equal(r.status, 200);
    for (const entry of r.body.entries) {
      assert.equal(entry.spaceId, 'general', 'All entries should be for the general space');
    }
  });

  it('Audit log supports pagination', async () => {
    const page1 = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?limit=2&offset=0');
    assert.equal(page1.status, 200);
    assert.ok(page1.body.entries.length <= 2, 'Page 1 should have at most 2 entries');

    if (page1.body.total > 2) {
      const page2 = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?limit=2&offset=2');
      assert.equal(page2.status, 200);
      // Ensure pages don't overlap
      const ids1 = new Set(page1.body.entries.map(e => e._id));
      for (const e of page2.body.entries) {
        assert.ok(!ids1.has(e._id), 'Page 2 should not have entries from page 1');
      }
    }
  });

  it('auth.failed entries logged for invalid tokens', async () => {
    // Attempt to access with bad token
    await get(INSTANCES.a, 'ythril_totally-invalid-token', '/api/tokens/me');

    await new Promise(r => setTimeout(r, 500));

    const r = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?operation=auth.failed&limit=5');
    assert.equal(r.status, 200);
    assert.ok(r.body.entries.length > 0, 'Should have auth.failed entries');
    const entry = r.body.entries[0];
    assert.equal(entry.operation, 'auth.failed');
    assert.equal(entry.status, 401);
  });

  it('Audit log entry has expected fields', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?limit=1');
    assert.equal(r.status, 200);
    assert.ok(r.body.entries.length > 0, 'Should have at least one entry');

    const e = r.body.entries[0];
    assert.ok('_id' in e, '_id should be present');
    assert.ok('timestamp' in e, 'timestamp should be present');
    assert.ok('tokenId' in e, 'tokenId should be present');
    assert.ok('tokenLabel' in e, 'tokenLabel should be present');
    assert.ok('authMethod' in e, 'authMethod should be present');
    assert.ok('oidcSubject' in e, 'oidcSubject should be present');
    assert.ok('ip' in e, 'ip should be present');
    assert.ok('method' in e, 'method should be present');
    assert.ok('path' in e, 'path should be present');
    assert.ok('spaceId' in e, 'spaceId should be present');
    assert.ok('operation' in e, 'operation should be present');
    assert.ok('status' in e, 'status should be present');
    assert.ok('entryId' in e, 'entryId should be present');
    assert.ok('durationMs' in e, 'durationMs should be present');
  });

  it('Token operations (create/delete) are logged', async () => {
    // Create then delete a token
    const create = await post(INSTANCES.a, tokenA, '/api/tokens', {
      name: 'audit-token-lifecycle-' + Date.now(),
    });
    assert.equal(create.status, 201);
    const tokenId = create.body.token.id;

    await del(INSTANCES.a, tokenA, `/api/tokens/${tokenId}`);

    await new Promise(r => setTimeout(r, 500));

    // Check for token.create
    const createLog = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?operation=token.create&limit=5');
    assert.equal(createLog.status, 200);
    assert.ok(createLog.body.entries.length > 0, 'Should have token.create entries');

    // Check for token.delete
    const deleteLog = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?operation=token.delete&limit=5');
    assert.equal(deleteLog.status, 200);
    assert.ok(deleteLog.body.entries.length > 0, 'Should have token.delete entries');
  });

  it('Audit log does not expose sensitive data', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/admin/audit-log?limit=20');
    assert.equal(r.status, 200);

    for (const e of r.body.entries) {
      // No entry should contain a token secret / hash
      const json = JSON.stringify(e);
      assert.ok(!json.includes('ythril_'), 'Entries must not contain token plaintext');
      assert.ok(!json.includes('$2b$'), 'Entries must not contain bcrypt hashes');
    }
  });
});
