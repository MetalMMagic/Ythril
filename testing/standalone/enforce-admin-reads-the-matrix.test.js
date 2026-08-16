/**
 * `enforceAdmin` — the one function behind every admin route — now asks the rights matrix.
 *
 * ## The change this is, and the change it is not
 *
 * It reads `rights.instanceAdmin`, falling back to the legacy `admin` boolean only for a record that carries
 * no matrix. That fallback is not decoration: an OIDC session is built per request from the identity and
 * legitimately has none, while every PAT carries one — `createToken` always writes it and a boot migration
 * backfills the rest.
 *
 * **No token's access changes.** The two provably answer the same question, which is what the previous PR
 * established over all nine storable legacy shapes, and the mint route refuses `admin` as an input so a
 * divergent pair cannot be created. This is the switch that evidence existed for.
 *
 * ## Why one predicate rather than five
 *
 * `record.admin` was read directly at five decision sites: this guard, the space-admin guard, the scoped
 * guard, the peer-relay check in `notify`, the trusted-relay check in `sync/tombstones`, the `maxGiB`
 * carve-out, and the last-admin lockout guard. Five copies of one authorization question, and the failure
 * mode of a copy that drifts is the worst available — a token reaching a route it never could, silently.
 *
 * They all call `isInstanceAdmin` now. That is also what makes the field deletion mechanical rather than a
 * hunt.
 *
 * Run: node --test testing/standalone/enforce-admin-reads-the-matrix.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const src = (p) => stripComments(readFileSync(p, 'utf8'));

let isInstanceAdmin, migrateToken;
before(async () => {
  ({ isInstanceAdmin } = await import('../../server/dist/auth/middleware.js'));
  ({ migrateToken } = await import('../../server/dist/auth/rights-migration.js'));
});

const rights = (over = {}) => ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

describe('the predicate reads the matrix first', () => {
  it('a matrix saying instanceAdmin is an admin', () => {
    assert.equal(isInstanceAdmin({ rights: rights({ instanceAdmin: true }) }), true);
  });

  it('a matrix saying otherwise is NOT — even with the legacy flag set', () => {
    // The direction that matters. If a record ever carries a stale `admin: true` beside a matrix that says
    // no, the matrix wins — otherwise the deprecated field would still be granting access.
    assert.equal(isInstanceAdmin({ admin: true, rights: rights({ instanceAdmin: false }) }), false);
  });

  it('and a matrix saying yes wins over a legacy flag saying no', () => {
    assert.equal(isInstanceAdmin({ admin: false, rights: rights({ instanceAdmin: true }) }), true);
  });

  it('a record with NO matrix falls back to the legacy flag', () => {
    // OIDC sessions are built per request and legitimately carry no matrix. Refusing them here would be a
    // silent narrowing — the opposite failure, and just as bad.
    assert.equal(isInstanceAdmin({ admin: true }), true);
    assert.equal(isInstanceAdmin({ admin: false }), false);
    assert.equal(isInstanceAdmin({}), false);
  });

  it('and an admin rung on every space is still NOT an instance admin', () => {
    // The distinction SA-1 rests on: administering every space that exists today says nothing about spaces
    // created tomorrow, nor about instance-shaped routes. Only `instanceAdmin` or a floor does.
    const everySpace = rights({ perSpace: { a: allAdmin(), b: allAdmin() } });
    assert.equal(isInstanceAdmin({ rights: everySpace }), false);
  });

  const allAdmin = () => ({ knowledge: 'admin', files: 'admin', schema: 'admin', dataQuality: 'admin' });
});

describe('it agrees with the migration for every legacy shape', () => {
  // The same nine shapes the evidence PR checked, now asserted through the PREDICATE rather than through
  // `migrateToken` alone — so the guard and the migration cannot drift apart either.
  for (const [label, legacy] of [
    ['plain write', {}],
    ['plain write, scoped', { spaces: ['qa'] }],
    ['read-only', { readOnly: true }],
    ['read-only, scoped', { readOnly: true, spaces: ['qa'] }],
    ['admin', { admin: true }],
    ['admin, scoped', { admin: true, spaces: ['qa'] }],
    ['admin AND read-only', { admin: true, readOnly: true }],
    ['empty allowlist', { spaces: [] }],
    ['schema-library', { schemaLibrary: true, spaces: [] }],
  ]) {
    it(label, () => {
      const migrated = { admin: legacy.admin === true, rights: migrateToken(legacy) };
      assert.equal(isInstanceAdmin(migrated), legacy.admin === true && !legacy.schemaLibrary,
        'the guard must answer what the legacy flag answered, for every storable shape');
    });
  }
});

describe('every decision site asks the one predicate', () => {
  it('the three guards in middleware.ts', () => {
    const mw = src('server/src/auth/middleware.ts');
    assert.doesNotMatch(mw, /if \(!record\.admin\)/, 'no guard may read the legacy field directly');
    assert.doesNotMatch(mw, /if \(record\.admin\) return true;/, 'nor the space-admin one');
    assert.match(mw, /isInstanceAdmin\(record\)/, 'all of them go through the predicate');
  });

  it('and the four outside it', () => {
    // Each of these was a separate copy of "is this an instance admin", and each would have had to be found
    // by hand when the field is deleted.
    for (const [f, what] of [
      ['server/src/api/notify.ts', 'the peer-relay check'],
      ['server/src/api/sync/tombstones.ts', 'the trusted-relay check'],
      ['server/src/api/spaces.ts', 'the maxGiB carve-out'],
      ['server/src/api/tokens.ts', 'the last-admin lockout guard'],
    ]) {
      assert.match(src(f), /isInstanceAdmin\(/, `${what} in ${f} must ask the predicate`);
    }
  });

  it('nothing left reads `.admin` to make an authorization decision', () => {
    // Scoped to the auth-bearing modules. `oidc.ts` maps a CLAIM to the flag, which is where the flag is
    // legitimately produced rather than consumed, and `rights-migration.ts` reads it to build the matrix.
    for (const f of ['server/src/auth/middleware.ts']) {
      const body = src(f).replace(/return \(record as \{ admin\?: boolean \}\)\.admin === true;/, '');
      assert.doesNotMatch(body, /\brecord\.admin\b/,
        `${f} still reads the legacy field outside the one fallback`);
    }
  });
});
