/**
 * The data-quality routes filter their ITERATION SET, and an empty allowlist means none rather than all.
 *
 * ## Why the loop and not the call
 *
 * These routes name no space. They walk every space the token can reach and resolve the space from the
 * record. Refusing the call would block a token that legitimately reaches some of the spaces behind it;
 * letting the loop run unfiltered leaves the Data quality column decorative. So the list the loop walks IS
 * the enforcement point.
 *
 * ## The conflation this removes
 *
 * The old filter read `!tokenSpaces || tokenSpaces.length === 0` as "unrestricted". An **absent** allowlist
 * does mean every space; an **empty** one means none, and they are opposite. Anything holding `spaces: []`
 * was handed the whole instance — the widest possible reading of the narrowest possible token, in the one
 * place where nobody would look for it because the routes take no space at all.
 *
 * That is the same trap `migrateToken` avoids by checking `undefined` rather than length. This removes the
 * second copy rather than fixing it twice.
 *
 * Run: node --test testing/standalone/iterating-routes-filter-the-loop.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const ITERATING = ['duplicates', 'contradictions', 'conflicts'];
const dupes = read('server/src/api/duplicates.ts');
const helper = read('server/src/auth/reachable-spaces.ts');

describe('the shared filter', () => {
  it('distinguishes an ABSENT allowlist from an EMPTY one', () => {
    // The whole bug, in one assertion. `undefined` is every space; `[]` is none.
    assert.match(helper, /legacySpaces === undefined/,
      'the filter tests truthiness or length again, so an empty allowlist means every space');
    assert.doesNotMatch(helper, /legacySpaces\.length === 0/,
      'length-as-truthiness is back');
  });

  it('reads the rights matrix when the record has one', () => {
    assert.match(helper, /satisfies\(effectiveRung\(/,
      'the filter ignores the matrix, so the Data quality column governs nothing');
  });

  it('falls back to the legacy allowlist only when there is no matrix', () => {
    // OIDC records never pass the config backfill. Without this they would reach nothing at all.
    assert.match(helper, /if \(rights\)/);
    assert.match(helper, /if \(legacySpaces === undefined\) return all;/);
  });
});

describe('every iterating router', () => {
  it('carries no copy of the empty-means-all conflation', () => {
    // Three copies of one rule existed. Fixing the reported one and stopping is how it survived in the other
    // two, so this asserts across the set rather than the file that was reported.
    for (const name of ITERATING) {
      const src = read(`server/src/api/${name}.ts`);
      assert.doesNotMatch(src, /tokenSpaces\.length === 0/,
        `${name}.ts still reads an empty allowlist as unrestricted`);
      assert.match(src, /spacesWhereTokenMay\(/, `${name}.ts does not use the shared filter`);
    }
  });

  it('none of them declares its own space filter any more', () => {
    // A local copy is what drifts. The helper takes the request, not a raw allowlist, so a caller cannot
    // hand it the wrong thing.
    for (const name of ITERATING) {
      const src = read(`server/src/api/${name}.ts`);
      assert.doesNotMatch(src, /function accessibleSpaces\(tokenSpaces/,
        `${name}.ts still has the old signature, which takes a raw allowlist`);
    }
  });
});

describe('the duplicates routes', () => {
  it('no longer carry their own copy of the rule', () => {
    assert.doesNotMatch(dupes, /tokenSpaces\.length === 0/,
      'a second copy of the empty-means-all conflation survives in this file');
    assert.match(dupes, /spacesWhereTokenMay\(/, 'the routes do not use the shared filter');
  });

  it('ask for WRITE on the mutating routes, not read', () => {
    // Dismiss, reopen and scan change records. Filtering them at `read` would let a read-only token act on
    // every space it can see — the column would exist and permit everything anyway.
    const writes = [...dupes.matchAll(/accessibleSpaces\(req, 'write'\)/g)];
    assert.ok(writes.length >= 3, `expected the mutating routes to require write, found ${writes.length}`);
  });

  it('the listing route asks only for READ', () => {
    assert.match(dupes, /accessibleSpaces\(req\)(?!\s*,)/,
      'the list route demands write, which would hide findings from a read-only token');
  });

  it('scan intersects before acting, not after', () => {
    // `/scan` triggers automerge and notification. Filtering after the destructive step would be a log entry
    // rather than a guard.
    const i = dupes.indexOf("accessibleSpaces(req, 'write')", dupes.indexOf('/scan'));
    const j = dupes.indexOf('targets', i);
    assert.ok(i > 0 && j > i, 'the scan route no longer intersects its targets with what the token may touch');
  });
});
