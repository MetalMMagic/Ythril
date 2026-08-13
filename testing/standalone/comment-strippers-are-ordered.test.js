/**
 * No gate in this suite strips BLOCK comments before LINE comments.
 *
 * ## The defect, measured
 *
 * `api/data.ts:281` reads `// Follow the symlink — useful for /mnt/* or volume-mount points`. Stripping block
 * comments first treats that `/*` as an opener and deletes 5,907 characters through the next `*​/`, taking three
 * route registrations with it. `files/converters/pipeline.ts` loses 355 characters the same way. Every other
 * source file in the tree is unaffected — the blast radius was measured, not assumed.
 *
 * It has already cost something: `every-space-route-has-an-area` could not see `DELETE /api/files/:spaceId`,
 * `PATCH /api/files/:spaceId` or `POST /api/files/:spaceId/retry_embedding`, so all three went without a rights
 * row until an unrelated edit shifted the swallowed region and they appeared at once.
 *
 * ## Why this gate rather than a shared helper alone
 *
 * `_strip-comments.mjs` exists and is correct, but 57 files carry their own three-line copy — because it is
 * three lines long, and everyone writes it again rather than importing it. Forbidding local copies would mean
 * migrating all 57 in one commit; forbidding the *wrong order* fixes the defect now and lets the migration
 * happen when each file is next touched. `Q-1` tracks the migration.
 *
 * Run: node --test testing/standalone/comment-strippers-are-ordered.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments, stripFullLineComments } from './_strip-comments.mjs';

const files = execFileSync('git', ['ls-files', 'testing', 'scripts'], { encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(f => /\.(mjs|js)$/.test(f));

/**
 * Does a file strip block comments before line comments — in the SAME chain?
 *
 * Two earlier versions of this check were wrong, and each was caught by a test rather than by reading it:
 *
 * 1. **One regex spanning both `.replace()` calls matched nothing.** Inside a `.js` file the line-comment regex
 *    is written `/(^|[^:])\/\/.*$/gm` — escaped slashes — and the pattern was looking for a literal `//`.
 *    Reintroducing the wrong order in `every-space-route-has-an-area.test.js` left the gate green.
 * 2. **Comparing the first occurrence of each fragment file-wide** flagged eight innocent files. `one-merge-rule`
 *    strips block comments and never strips line comments at all; a `^\s*\/\/` appearing later in the file, in
 *    an unrelated regex, was read as the second half of a chain.
 *
 * So: find each block-strip, and look for a line-strip in a WINDOW around it. A line-strip after it in the same
 * chain is the wrong order; one before it is the right order; neither means the file only strips block comments,
 * which is fine.
 */
const BLOCK_FRAGMENT = String.raw`[\s\S]*?\*\/`;   // the tail of /\/\*[\s\S]*?\*\//g
const LINE_FRAGMENTS = [
  String.raw`(^|[^:])\/\/`,                        // /(^|[^:])\/\/.*$/gm
  String.raw`^\s*\/\/`,                            // /^\s*\/\/.*$/gm
  String.raw`^[ \t]*\/\/`,                         // /^[ \t]*\/\/.*$/gm
];

/** The one file that declares these fragments, and therefore matches its own rule. */
const SELF = ['testing/standalone/comment-strippers-are-ordered.test.js'];

/** How far either side of a block-strip the rest of the same chain can reasonably sit. */
const WINDOW = 160;

const hasLineStrip = text => LINE_FRAGMENTS.some(f => text.includes(f));

function stripsBlockFirst(src) {
  let from = 0;
  for (;;) {
    const at = src.indexOf(BLOCK_FRAGMENT, from);
    if (at === -1) return false;
    from = at + 1;
    const after = src.slice(at + BLOCK_FRAGMENT.length, at + BLOCK_FRAGMENT.length + WINDOW);
    const before = src.slice(Math.max(0, at - WINDOW), at);
    if (hasLineStrip(after) && !hasLineStrip(before)) return true;
  }
}

describe('the suite reads source with line comments removed first', () => {
  it('finds the files it is meant to scan', () => {
    // A glob that matched nothing would make every assertion below vacuous.
    assert.ok(files.length > 100, `expected the test and script tree, found ${files.length} files`);
    assert.ok(files.includes('scripts/surface-matrix.mjs'), 'the scripts directory is not being scanned');
  });

  it('no file strips block comments before line comments', () => {
    // This file is excluded because it DECLARES the fragments it searches for: `BLOCK_FRAGMENT` is written
    // above `LINE_FRAGMENTS`, so it matches its own rule while stripping nothing at all. One entry, asserted,
    // so the exemption cannot quietly become a list of files someone gave up on.
    assert.equal(SELF.length, 1, `the exemption list grew to ${SELF.length}: ${SELF.join(', ')}`);
    const offenders = files.filter(f => !SELF.includes(f) && stripsBlockFirst(readFileSync(f, 'utf8')));
    assert.deepEqual(offenders, [], 'these strip block comments first, so a `/*` inside a `//` comment opens a '
      + `phantom block and swallows real code:\n  ${offenders.join('\n  ')}\n`
      + 'Swap the two .replace() calls, or import stripComments from ./_strip-comments.mjs.');
  });
});

describe('the shared helper is correct on the case that caused this', () => {
  const REAL = 'server/src/api/data.ts';
  const ROUTES = /\b\w*[Rr]outer\.(get|post|patch|put|delete)\(\s*'(\/[^']*)'/g;

  it('keeps every route registration in the file that exposed the defect', () => {
    const src = readFileSync(REAL, 'utf8');
    const raw = [...src.matchAll(ROUTES)].length;
    assert.ok(raw >= 11, `${REAL} should register at least 11 routes, found ${raw} — the fixture moved`);
    assert.equal([...stripComments(src).matchAll(ROUTES)].length, raw, 'stripComments lost a registration');
    assert.equal([...stripFullLineComments(src).matchAll(ROUTES)].length, raw,
      'stripFullLineComments lost a registration');
  });

  it('and the WRONG order still loses them — proving the fixture is a real test', () => {
    // Without this, the assertions above would pass on any file and prove nothing about the order.
    const src = readFileSync(REAL, 'utf8');
    const wrong = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*/gm, '$1');
    assert.ok([...wrong.matchAll(ROUTES)].length < [...src.matchAll(ROUTES)].length,
      `${REAL} no longer contains a line comment with a /* in it — this gate needs a new fixture, because it `
      + 'can no longer tell the two orders apart');
  });

  it('a URL survives the trailing-comment variant', () => {
    // The `[^:]` guard is why: `https://x` must not be read as the start of a comment.
    assert.match(stripComments("const u = 'https://example.test/a';"), /https:\/\/example\.test\/a/);
  });
});
