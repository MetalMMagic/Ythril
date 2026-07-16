/**
 * Unit tests for the shared path normalisers (compiled build).
 *
 * `toDocId` normalises to a Mongo _id/path key; `toSafeRelPath` additionally strips `..`
 * for values that get joined to a filesystem root. Before centralisation these were
 * hand-rolled in ~13 places, and the media worker's copy stripped `..` while the others
 * did not — this pins the two contracts so that divergence can't recur.
 *
 * Run: node --test testing/standalone/paths-util.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toDocId, toSafeRelPath } from '../../server/dist/util/paths.js';

describe('path normalisers', () => {
  it('toDocId: backslashes → slashes, strips leading slashes, keeps `..`', () => {
    assert.equal(toDocId('foo\\bar.txt'), 'foo/bar.txt');
    assert.equal(toDocId('/foo/bar'), 'foo/bar');
    assert.equal(toDocId('///a/b'), 'a/b');
    // toDocId is for keys, not filesystem paths — it must NOT alter `..` (that's the id).
    assert.equal(toDocId('a/../b'), 'a/../b');
  });

  it('toSafeRelPath: same normalisation PLUS strips `../` traversal segments', () => {
    assert.equal(toSafeRelPath('foo\\bar.txt'), 'foo/bar.txt');
    assert.equal(toSafeRelPath('/foo/bar'), 'foo/bar');
    assert.equal(toSafeRelPath('../../etc/passwd'), 'etc/passwd');
    assert.equal(toSafeRelPath('a/../../b'), 'a/b');
    // A legitimate file path (no `..`) is unchanged — the strip is a no-op for real paths.
    assert.equal(toSafeRelPath('notes/2024/jan.md'), 'notes/2024/jan.md');
  });
});
