/**
 * Standalone tests for `groupFolderSizes` — the folder-size roll-up in the file listing.
 *
 * A folder's size in the file list is the sum of the raw sizes of the files beneath it, computed from
 * the file-level FileMeta records (chunk/derived records are excluded by the DB query, not here). This
 * pins the pure grouping: nested files roll up into the top-level sub-folder, loose files in the listed
 * directory belong to no folder, and the path prefix (root vs a sub-directory) is handled correctly.
 *
 * Run: node --test testing/standalone/folder-sizes.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupFolderSizes } from '../../server/dist/api/files.js';

const f = (path, sizeBytes) => ({ path, sizeBytes });

describe('groupFolderSizes', () => {
  it('at root: groups by the top-level folder, nested files roll up', () => {
    const docs = [
      f('docs/a.txt', 100),
      f('docs/sub/b.txt', 250),      // nested → still rolls into `docs`
      f('docs/sub/deep/c.txt', 50),
      f('images/x.png', 400),
      f('readme.md', 999),           // loose file at root → no folder
    ];
    const m = groupFolderSizes(docs, '');
    assert.equal(m.get('docs'), 400);
    assert.equal(m.get('images'), 400);
    assert.equal(m.has('readme.md'), false); // loose file is not a folder
  });

  it('under a sub-directory: prefix stripped, groups by the IMMEDIATE child only', () => {
    const docs = [
      f('docs/sub/b.txt', 250),
      f('docs/sub/deep/c.txt', 50),  // immediate child of docs/ is `sub`, not `deep`
      f('docs/loose.txt', 10),       // loose in the listed dir → no folder
    ];
    const m = groupFolderSizes(docs, 'docs/');
    assert.equal(m.get('sub'), 300);   // 250 + 50 both roll into `sub`
    assert.equal(m.has('deep'), false); // deep is nested under sub, not directly under docs/
    assert.equal(m.size, 1);            // only `sub` (loose.txt skipped)
  });

  it('sizes accumulate across calls (merging member spaces) and tolerate missing sizeBytes', () => {
    const acc = new Map();
    groupFolderSizes([f('a/one.txt', 100)], '', acc);
    groupFolderSizes([f('a/two.txt', 50), f('a/no-size.txt')], '', acc); // missing size → 0
    assert.equal(acc.get('a'), 150);
  });

  it('an empty input yields an empty map (folders render as 0 B)', () => {
    assert.equal(groupFolderSizes([], '').size, 0);
  });
});
