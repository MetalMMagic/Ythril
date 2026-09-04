/**
 * The queue cannot be pushed stale.
 *
 * ## The complaint this exists for
 *
 * Owner, 2026-08-30: *"i have to ask for uptodate todo-files all the time and ALWAYS they are out of date."*
 *
 * Correct, and the reason is structural rather than forgetful. Every other rule in `todo-consistency.mjs`
 * checks a claim a ROW makes about the code — so a row that says nothing false stays green while the queue as
 * a whole drifts: a shipped bug with no row at all, a STATE header naming a PR from twelve hours ago, a
 * remark quoting a line count three PRs old. Nothing was lying. Nothing was current either.
 *
 * **A rule that has to be remembered is worth less than a gate that fails.** `todo/` is gitignored, so git
 * cannot answer "was this updated with the change" — but mtime can. If HEAD has moved since the ordered queue
 * was last written, the queue predates the work, and `todo:check` fails inside preflight, which is the gate
 * in front of every push.
 *
 * ## Why blunt is right here
 *
 * It cannot tell a good update from `touch`. It does not try to: the cost of satisfying it honestly is one
 * line in the STATE header, and that header is precisely what went stale. What it removes is the possibility
 * of pushing without having LOOKED.
 *
 * Run: node --test testing/standalone/the-queue-cannot-be-pushed-stale.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { between } from './_structural-window.mjs';

const raw = readFileSync('scripts/todo-consistency.mjs', 'utf8');
const src = stripComments(raw);

/**
 * The rule's own section, bounded by the banner comments the script already uses to separate its rules.
 *
 * A section marker is a structure the file maintains for its own readers, so it is a real boundary —
 * unlike a character count, which is a guess at how much of the subject fits and can only see less.
 *
 * Read from the RAW source: the banners are comments, so a stripped copy has no boundaries left.
 */
const rule = () => between(raw, 'the queue must be touched between commits',
  'the exemption REASON is checked', 'the staleness rule');

describe('the ordered queue must be newer than the newest commit', () => {
  it('the rule exists and compares mtime against the commit time', () => {
    assert.match(src, /statSync\(/, 'nothing reads the queue file mtime');
    assert.match(src, /git['"],\s*\[['"]log['"]/, 'nothing reads the newest commit time');
    assert.match(src, /mtimeMs/, 'the comparison is not against the file write time');
  });

  it('it FAILS rather than warning', () => {
    /*
     * The distinction this whole file turns on. `todo:check` runs inside preflight and preflight blocks the
     * push; a `console.log` would make it advice, and advice is what was already there in the shape of a
     * standing instruction that did not hold.
     */
    assert.match(rule(), /fail\(/, 'a stale queue must fail the check, not print a note beside it');
  });

  it('and it is tolerant of having no git history to compare against', () => {
    // A fresh clone, a shallow checkout or a repo with no commits must not fail this — the rule is about
    // drift between a commit and the queue, and with no commit there is no drift to measure.
    assert.match(rule(), /catch/,
      'a missing git history must be tolerated rather than reported as a stale queue');
  });
});
