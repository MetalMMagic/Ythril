/**
 * Unit tests: OIDC claim → permission mapping (auth/oidc.ts mapOidcClaims)
 *
 * Regression guard for the fail-open finding: a token that matched no claim rule
 * used to be granted read-write access to ALL spaces. It must now fail closed —
 * read-only, no spaces.
 *
 * Pure in-process logic — no IdP, no network, no config. Run with:
 *   node --test testing/standalone/oidc-claim-mapping.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapOidcClaims } from '../../server/dist/auth/oidc.js';

const ADMIN_RULE = { claim: 'role', value: 'admin' };
const RO_RULE = { claim: 'role', value: 'viewer' };
const SPACES_RULE = { claim: 'ythril_spaces' };

describe('mapOidcClaims — fail closed for unmatched tokens', () => {
  it('empty mapping → read-only, no spaces (fail closed)', () => {
    const p = mapOidcClaims({ sub: 'u' }, {});
    assert.equal(p.admin, false);
    assert.equal(p.readOnly, true);
    assert.deepEqual(p.spaces, []);
    assert.equal(p.matched, false);
  });

  it('rules configured but none match → read-only, no spaces', () => {
    const p = mapOidcClaims({ role: 'something-else' }, { admin: ADMIN_RULE, readOnly: RO_RULE });
    assert.equal(p.admin, false);
    assert.equal(p.readOnly, true);
    assert.deepEqual(p.spaces, []);
    assert.equal(p.matched, false);
  });

  it('unmatched token with a spaces claim still gets NO spaces (fail closed overrides)', () => {
    const p = mapOidcClaims({ role: 'nope', ythril_spaces: ['secret'] }, { admin: ADMIN_RULE, spaces: SPACES_RULE });
    assert.equal(p.matched, false);
    assert.equal(p.readOnly, true);
    assert.deepEqual(p.spaces, [], 'an unmatched token must not receive spaces from its claim');
  });
});

describe('mapOidcClaims — matched tokens', () => {
  it('admin rule match → admin, writable (readOnly undefined)', () => {
    const p = mapOidcClaims({ role: 'admin' }, { admin: ADMIN_RULE });
    assert.equal(p.admin, true);
    assert.equal(p.readOnly, undefined);
    assert.equal(p.matched, true);
    assert.equal(p.spaces, undefined, 'no spaces mapping → unrestricted (all spaces)');
  });

  it('readOnly rule match → read-only', () => {
    const p = mapOidcClaims({ role: 'viewer' }, { admin: ADMIN_RULE, readOnly: RO_RULE });
    assert.equal(p.admin, false);
    assert.equal(p.readOnly, true);
    assert.equal(p.matched, true);
  });

  it('matched admin + spaces claim (array) → that allow-list', () => {
    const p = mapOidcClaims({ role: 'admin', ythril_spaces: ['a', 'b', 3, 'c'] }, { admin: ADMIN_RULE, spaces: SPACES_RULE });
    assert.equal(p.admin, true);
    assert.deepEqual(p.spaces, ['a', 'b', 'c'], 'non-string entries are dropped');
  });

  it('matched admin + spaces mapping configured but claim missing → [] (deny), not all spaces', () => {
    const p = mapOidcClaims({ role: 'admin' }, { admin: ADMIN_RULE, spaces: SPACES_RULE });
    assert.equal(p.admin, true);
    assert.deepEqual(p.spaces, [], 'configured-but-missing spaces claim must deny, not grant all');
  });

  it('matched admin, NO spaces mapping → undefined (unrestricted)', () => {
    const p = mapOidcClaims({ role: 'admin' }, { admin: ADMIN_RULE });
    assert.equal(p.spaces, undefined);
  });
});
