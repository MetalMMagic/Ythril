/**
 * Red-team tests: Cross-space data access (space boundary enforcement)
 *
 * A token that is scoped to space X must not be able to read or write
 * data in space Y.
 *
 * Run: node --test testing/red-team-tests/space-boundary.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

let tokenA;              // full-access token
let generalOnlyToken;    // scoped to "general" only
let generalOnlyId;
const OUT_OF_SCOPE_SPACE = 'sb-out-of-scope'; // created in before(), deleted in after()

describe('Space-scoped token enforcement', () => {
  before(async () => {
    tokenA = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

    // Create an isolated target space so out-of-scope tests are deterministic:
    // a 404 from a non-existent space would mask scope-enforcement failures.
    const spaceRes = await post(INSTANCES.a, tokenA, '/api/spaces', {
      id: OUT_OF_SCOPE_SPACE,
      label: 'Space Boundary Out-Of-Scope',
    });
    assert.ok(
      spaceRes.status === 201 || spaceRes.status === 409,
      `Failed to create out-of-scope test space: ${JSON.stringify(spaceRes.body)}`,
    );

    // Create a token scoped only to the "general" space
    const r = await post(INSTANCES.a, tokenA, '/api/tokens', {
      name: 'space-boundary-test ' + Date.now(),
      spaces: ['general'],
    });
    assert.equal(r.status, 201, `Failed to create scoped token: ${JSON.stringify(r.body)}`);
    generalOnlyToken = r.body.plaintext;
    generalOnlyId = r.body.token?.id;
  });

  after(async () => {
    if (generalOnlyId) {
      await fetch(`${INSTANCES.a}/api/tokens/${generalOnlyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
    }
    // Delete the scratch space (solo; no network)
    await fetch(`${INSTANCES.a}/api/spaces/${OUT_OF_SCOPE_SPACE}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
  });

  it('Scoped token can access its own space (general) files', async () => {
    const r = await fetch(`${INSTANCES.a}/api/files/general`, {
      headers: { 'Authorization': `Bearer ${generalOnlyToken}` },
    });
    assert.equal(r.status, 200, 'Token scoped to "general" should read general files');
  });

  it('Scoped token can write to its space (general)', async () => {
    const r = await fetch(`${INSTANCES.a}/api/files/general?path=space-boundary-test.txt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${generalOnlyToken}` },
      body: JSON.stringify({ content: 'in-scope write', encoding: 'utf8' }),
    });
    assert.equal(r.status, 201, 'Token should write to its allowed space');
  });

  it('Scoped token cannot access brain in a different space → 403', async () => {
    // Uses OUT_OF_SCOPE_SPACE (created in before()) so a 404 cannot mask enforcement.
    const r = await fetch(`${INSTANCES.a}/api/brain/${OUT_OF_SCOPE_SPACE}/memories`, {
      headers: { 'Authorization': `Bearer ${generalOnlyToken}` },
    });
    assert.equal(r.status, 403,
      `Expected 403 (scope rejection) for out-of-scope brain space, got ${r.status}`);
  });

  it('Scoped token cannot upload to a different space via files API → 403', async () => {
    // Uses OUT_OF_SCOPE_SPACE (created in before()) so a 404 cannot mask enforcement.
    const r = await fetch(`${INSTANCES.a}/api/files/${OUT_OF_SCOPE_SPACE}?path=escape.txt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${generalOnlyToken}` },
      body: JSON.stringify({ content: 'escape', encoding: 'utf8' }),
    });
    assert.equal(r.status, 403,
      `Expected 403 (scope rejection) for out-of-scope files write, got ${r.status}`);
  });
});

describe('Full-access token can access all spaces', () => {
  before(() => {
    tokenA = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  });

  it('Full-access token reads general space', async () => {
    const r = await fetch(`${INSTANCES.a}/api/files/general`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert.equal(r.status, 200);
  });

  it('Full-access token reaches /api/spaces listing', async () => {
    const r = await get(INSTANCES.a, tokenA, '/api/spaces');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body?.spaces), 'Should return spaces array');
  });
});
