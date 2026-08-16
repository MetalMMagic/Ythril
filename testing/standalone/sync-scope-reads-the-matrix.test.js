/**
 * The sync routes scope on the RIGHTS MATRIX, not the legacy `spaces` allowlist.
 *
 * ## The hole this closes, confirmed from source rather than suspected
 *
 * `spaceAllowed` took the legacy allowlist as its own parameter and opened with:
 *
 *     if (tokenSpaces && !tokenSpaces.includes(spaceId)) return false;
 *
 * Read that against a token minted today. The rights editor writes `rights.perSpace`; nothing writes
 * `spaces`. `createToken` stores `spaces: opts.spaces` verbatim, the mint body has it `optional()`, and the
 * mint route's own refusal map tells a caller to *"set `rights.perSpace`"* instead — the owner's ruling was
 * "only matrix from now on". So on a modern token `tokenSpaces` is `undefined`, the `&&` short-circuits, and
 * the token-level space check never runs at all.
 *
 * Nothing downstream caught it. With no `networkId` in the query `spaceAllowed` ends at *"does this space
 * exist?"* and returns true. Every `/api/sync/*` GET sits behind plain `requireAuth`, so any authenticated
 * token could read any space's records as long as its own scope lived only in the matrix.
 *
 * Writes were never exposed — `isNonPeerSyncWrite` admits only peer-bound tokens and instance admins — so
 * this was a read gap. It is the defect class this repo produces most: one rule, two implementations, and the
 * weaker one silently reachable.
 *
 * ## Why the assertions call the function
 *
 * A source-reading test cannot tell live code from dead, and this repo has shipped a guard that passed its own
 * grep while sitting behind `if (false && ...)`. `tokenReachesSpace` is pure and exported for exactly that
 * reason: these are real calls with real verdicts.
 *
 * Run: node --test testing/standalone/sync-scope-reads-the-matrix.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let tokenReachesSpace;
before(async () => {
  ({ tokenReachesSpace } = await import('../../server/dist/api/sync/_shared.js'));
});

const ALL = (r) => ({ knowledge: r, files: r, schema: r, dataQuality: r });
const NONE = ALL('none');
const rights = (over = {}) => ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

describe('a matrix-scoped token is confined to its own spaces', () => {
  it('reaches a space its matrix names', () => {
    assert.equal(tokenReachesSpace({ rights: rights({ perSpace: { qa: ALL('read') } }) }, 'qa'), true);
  });

  it('and is REFUSED a space its matrix does not name — the whole point of this file', () => {
    // Before the fix this returned true: `spaces` was undefined, so the check was skipped and the caller
    // fell through to "the space exists".
    assert.equal(tokenReachesSpace({ rights: rights({ perSpace: { qa: ALL('read') } }) }, 'finance'), false);
  });

  it('a row of all `none` reaches nothing, even though the row exists', () => {
    assert.equal(tokenReachesSpace({ rights: rights({ perSpace: { qa: NONE } }) }, 'qa'), false);
  });

  it('a floor reaches spaces with no row at all — that is how an unscoped token is expressed', () => {
    assert.equal(tokenReachesSpace({ rights: rights({ floor: ALL('read') }) }, 'anything'), true);
  });

  it('a floor of all `none` is not a grant', () => {
    assert.equal(tokenReachesSpace({ rights: rights({ floor: NONE }) }, 'anything'), false);
  });
});

describe('the legacy allowlist still works, and only when there is no matrix', () => {
  it('a pre-matrix token is scoped by its allowlist', () => {
    assert.equal(tokenReachesSpace({ spaces: ['qa'] }, 'qa'), true);
    assert.equal(tokenReachesSpace({ spaces: ['qa'] }, 'finance'), false);
  });

  it('no scope of either kind is unrestricted, exactly as before', () => {
    // Not a widening: this is the pre-existing meaning of an absent allowlist, and changing it here would
    // refuse traffic rather than fix anything.
    assert.equal(tokenReachesSpace({}, 'anything'), true);
    assert.equal(tokenReachesSpace(undefined, 'anything'), true);
  });

  it('the MATRIX WINS when both are present, and it is the narrower answer that survives', () => {
    // The ordering assertion. A token carrying a stale wide allowlist and a narrow matrix must be held to the
    // matrix — reading the allowlist first would restore the hole in a different shape.
    const both = { spaces: ['qa', 'finance'], rights: rights({ perSpace: { qa: ALL('read') } }) };
    assert.equal(tokenReachesSpace(both, 'qa'), true);
    assert.equal(tokenReachesSpace(both, 'finance'), false,
      'the legacy allowlist must not widen what the matrix confined');
  });

  it('and the matrix wins even when it is the WIDER answer', () => {
    // Stated so the rule is "matrix if present", not "whichever is narrower" — the latter would be a third
    // implementation of scope, which is how this class of defect starts.
    const both = { spaces: ['qa'], rights: rights({ floor: ALL('read') }) };
    assert.equal(tokenReachesSpace(both, 'finance'), true);
  });
});

describe('no sync route reconstructs the rule for itself', () => {
  it('every call site passes the token, not the legacy array', () => {
    // 19 copies of one line is what made this hole survive: it was never reviewed as one decision.
    for (const f of ['server/src/api/sync/docs.ts', 'server/src/api/sync/manifest.ts',
      'server/src/api/sync/tombstones.ts']) {
      const src = stripComments(readFileSync(f, 'utf8'));
      assert.doesNotMatch(src, /spaceAllowed\([^)]*authToken\?\.spaces/,
        `${f} still hands spaceAllowed the legacy allowlist`);
      assert.doesNotMatch(src, /authToken\?\.spaces/,
        `${f} still reads the legacy allowlist directly`);
    }
  });

  it('and spaceAllowed no longer accepts one', () => {
    const shared = stripComments(readFileSync('server/src/api/sync/_shared.ts', 'utf8'));
    assert.doesNotMatch(shared, /tokenSpaces: string\[\] \| undefined/,
      'the parameter is gone, so no caller can reintroduce the short-circuit');
    assert.match(shared, /tokenReachesSpace\(authToken, spaceId\)/,
      'the one guard every sync route now shares');
  });
});
