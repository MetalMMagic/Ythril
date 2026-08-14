/**
 * The matrix-derived write guard answers exactly what the removed `readOnly` flag answered.
 *
 * ## Why this equivalence had to be proved, not assumed
 *
 * `denyReadOnly` sits on **seventeen** mutating routes — all of conflicts, contradictions and duplicates —
 * and **none of them is space-scoped**. `requireSpaceAuth` never runs for them, so `enforceAreaRung` never
 * sees them, which made the `readOnly` boolean their ONLY write guard. Removing the flag could not simply
 * delete the check: that would have handed every read-only token the ability to resolve conflicts, dismiss
 * duplicates and reopen contradictions across the instance.
 *
 * So the guard was rewritten against the matrix. That is the moment a coarse guard usually becomes a
 * DIFFERENT coarse guard and one rule becomes two — the defect this repo produces most. This file pins the
 * equivalence instead of trusting it: for every legacy token shape, `canWriteAnywhere` on the migrated matrix
 * must agree with what `readOnly` would have said — and where it deliberately does not, the case below says
 * which direction it moved and why.
 *
 * Run: node --test testing/standalone/write-anywhere-matches-readonly.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let canWriteAnywhere, migrateToken;

before(async () => {
  ({ canWriteAnywhere } = await import('../../server/dist/auth/write-anywhere.js'));
  ({ migrateToken } = await import('../../server/dist/auth/rights-migration.js'));
});

/** What the old middleware would have done: refuse iff `readOnly` was truthy. */
const legacyAllowed = (t) => !t.readOnly;

describe('every legacy token shape gets the same answer it used to', () => {
  const SHAPES = [
    { label: 'unscoped read-write', t: { admin: false, readOnly: false } },
    { label: 'unscoped read-only', t: { admin: false, readOnly: true } },
    { label: 'admin', t: { admin: true, readOnly: false } },
    { label: 'admin flagged read-only', t: { admin: true, readOnly: true } },
    { label: 'scoped read-write', t: { admin: false, readOnly: false, spaces: ['alpha'] } },
    { label: 'scoped read-only', t: { admin: false, readOnly: true, spaces: ['alpha'] } },
    { label: 'scoped to nothing', t: { admin: false, readOnly: false, spaces: [] } },
  ];

  for (const { label, t } of SHAPES) {
    it(label, () => {
      const rights = migrateToken(t);
      const now = canWriteAnywhere(rights);
      // Two shapes differ from the old flag on purpose, and both are the matrix winning an argument the old
      // code was already losing:
      //
      //  - `spaces: []` — a NARROWING. The flag let it through (it was not read-only) while the matrix gives
      //    it no rung anywhere. That token could reach no space to act on, so the old answer was a 403 one
      //    layer down at best; refusing here is the same outcome, sooner.
      //  - `admin: true, readOnly: true` — a WIDENING, and the inconsistency is pre-existing rather than new.
      //    `migrateToken` has always resolved that pair as `admin` (`t.admin ? 'admin' : t.readOnly ? …`), so
      //    such a token was already allowed to write on every space-scoped route while THIS guard refused it.
      //    One token, two answers, depending on the route. With the flags gone the matrix is the only model,
      //    and it says admin wins — so the contradiction is removed rather than a new one introduced.
      const expected = t.spaces && t.spaces.length === 0
        ? false
        : (t.admin ? true : legacyAllowed(t));
      assert.equal(now, expected,
        `${label}: matrix says ${now}, the readOnly flag said ${legacyAllowed(t)}`);
    });
  }

  it('a schema-library token cannot write through these routes', () => {
    // `migrateToken` maps it to `floor: null, perSpace: {}` on purpose — mapping it to a read floor would
    // have handed it every space on the instance. So it holds no rung anywhere and is refused, which is
    // right: it is not a space token at all.
    assert.equal(canWriteAnywhere(migrateToken({ admin: false, readOnly: false, schemaLibrary: true })), false);
  });
});

describe('the guard refuses in the safe direction', () => {
  it('no matrix at all is a refusal, not a pass', () => {
    // The old code's equivalent was `readOnly` being ABSENT, which read as writable — and that default is
    // how an unscoped token stored as `null` ended up reaching everything. A mutation guard must fail closed.
    assert.equal(canWriteAnywhere(undefined), false);
  });

  it('read in an area does not buy write in it', () => {
    const rights = { instanceAdmin: false, createSpaces: false, floor: null,
      perSpace: { alpha: { knowledge: 'read', files: 'read', schema: 'read', dataQuality: 'read' } } };
    assert.equal(canWriteAnywhere(rights), false);
  });

  it('write in ANY area is enough — the flag it replaces had no area', () => {
    // This is the case CI caught. The first version of the helper took an `area` and the middleware passed
    // `dataQuality`, because the routes I had traced were conflicts / contradictions / duplicates. But
    // `denyReadOnly` is also on EIGHT brain route files, so a `knowledge: write` token was refused for
    // lacking a dataQuality rung it never needed — `403 This token has read-only access` on a queue retry it
    // was entitled to.
    //
    // The per-area question belongs to `enforceAreaRung`, which runs on every space-scoped route. This guard
    // answers the coarse one, on the same axis the boolean did: none at all.
    const knowledgeOnly = { instanceAdmin: false, createSpaces: false, floor: null,
      perSpace: { alpha: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } } };
    assert.equal(canWriteAnywhere(knowledgeOnly), true, 'a knowledge:write token must be able to mutate');

    const filesOnly = { instanceAdmin: false, createSpaces: false, floor: null,
      perSpace: { alpha: { knowledge: 'none', files: 'write', schema: 'none', dataQuality: 'none' } } };
    assert.equal(canWriteAnywhere(filesOnly), true, 'and so must a files:write one');
  });

  it('and the same is true of a FLOOR that grants one area only', () => {
    // Added after a mutation SURVIVED. Every floor case above granted all four areas equally, so narrowing
    // the floor branch back to a single area changed nothing and the suite stayed green — the floor half was
    // untested on the axis that had just been the bug. An unscoped token with one area is the shape that
    // proves it.
    const floorKnowledge = { instanceAdmin: false, createSpaces: false,
      floor: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' }, perSpace: {} };
    assert.equal(canWriteAnywhere(floorKnowledge), true);

    const floorFiles = { instanceAdmin: false, createSpaces: false,
      floor: { knowledge: 'none', files: 'write', schema: 'none', dataQuality: 'none' }, perSpace: {} };
    assert.equal(canWriteAnywhere(floorFiles), true);
  });

  it('write in one space is enough, because these routes are instance-wide', () => {
    const rights = { instanceAdmin: false, createSpaces: false, floor: null,
      perSpace: { alpha: { knowledge: 'read', files: 'read', schema: 'read', dataQuality: 'write' } } };
    assert.equal(canWriteAnywhere(rights), true);
  });

  it('read everywhere in every area is still a refusal', () => {
    // The whole point: nothing short of a write rung somewhere gets through. This is the shape a migrated
    // `readOnly: true` token has, and it is the case the 403 exists for.
    const readOnly = { instanceAdmin: false, createSpaces: false,
      floor: { knowledge: 'read', files: 'read', schema: 'read', dataQuality: 'read' }, perSpace: {} };
    assert.equal(canWriteAnywhere(readOnly), false);
  });

  it('instanceAdmin passes without needing a per-space row', () => {
    assert.equal(canWriteAnywhere({ instanceAdmin: true, createSpaces: true, floor: null, perSpace: {} }), true);
  });
});

describe('no space-scoped route uses the coarse guard', () => {
  it('the routes that name a space go through enforceAreaRung instead', () => {
    // The whole reason `canWriteAnywhere` is allowed to be coarse is that its callers are instance-wide. Put
    // it on a route with a `:spaceId` and a token scoped to space A could mutate through a route touching
    // space B — a widening that would look like a passing test suite.
    const strip = s => s.replace(/(^|[^:])\/\/.*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
    const offenders = [];
    for (const f of ['conflicts', 'contradictions', 'duplicates']) {
      const src = strip(readFileSync(`server/src/api/${f}.ts`, 'utf8'));
      for (const line of src.split(/\r?\n/)) {
        if (line.includes('denyReadOnly') && line.includes(':spaceId')) offenders.push(`${f}: ${line.trim()}`);
      }
    }
    assert.deepEqual(offenders, [],
      'a space-scoped route must enforce the rung for THAT space, not "writes somewhere"');
  });
});
