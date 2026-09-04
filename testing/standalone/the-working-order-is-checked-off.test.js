/**
 * The working order is a checklist, and it is checked before a push.
 *
 * ## The complaint this exists for
 *
 * Owner, 2026-08-30: *"how can i make sure you follow such rules? ... same with the rule on 'plan, write tests,
 * implement, execute tests, <optional:iterate>, full test suite, documentation work, push pr'"*, and then
 * 2026-08-31: *"can we make the flow i described a checklist and gate if the checklist is checked and reset it
 * for the next job on pushing the pr?"*
 *
 * The order is written down in two places already and neither is a gate, so it holds exactly as well as
 * remembering it does. `todo/_WORKING-ORDER.md` is the checklist; this pins the rule that reads it.
 *
 * ## The reset is derived, not performed
 *
 * The obvious build is a `pre-push` hook that blanks the boxes. This repo has no hooks, a hook is not
 * committed, and a reset that has to FIRE is a second thing that can fail to fire — leaving a ticked
 * checklist in front of the next job, which is the worst of the three possible states.
 *
 * So the checklist names the branch it belongs to, and a checklist naming another branch counts as fully
 * unchecked. Pushing a PR and branching for the next item resets it because the name no longer matches;
 * nothing has to remember anything. Two commits on ONE branch keep their ticks, which is right — that is one
 * job, and a CI fix is not a new plan.
 *
 * ## Two of the rows are evidence, not attestation
 *
 * A checklist I tick myself is advice with checkboxes on it, which is what was already there. Two rows can be
 * checked against something outside the file, so they are:
 *
 *   - **plan** names an item id, and the id must exist in `_TODO-ORDERED.md`. You cannot plan a job the queue
 *     has never heard of.
 *   - **documentation** requires `CHANGELOG.md` to differ from `main` — the one documentation surface that is
 *     owed on every change, and the one most often noticed missing at push time.
 *
 * The tests row asks for the failure the test gave BEFORE the implementation existed, or an explicit
 * `NO NEW BEHAVIOUR:` naming the spec that already covers it. That second form is deliberate: a pure
 * extraction genuinely has no new test to write, and a gate that cannot say so teaches its own bypass.
 *
 * Run: node --test testing/standalone/the-working-order-is-checked-off.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { between } from './_structural-window.mjs';

const raw = readFileSync('scripts/todo-consistency.mjs', 'utf8');
const src = stripComments(raw);

/**
 * The rule's own section, bounded by the banner comments the script uses to separate its rules.
 *
 * Read from the RAW source: the banners are comments, so a stripped copy has no boundaries left.
 */
const rule = () => between(raw, 'the working order must be checked off for THIS branch',
  'the exemption REASON is checked', 'the working-order rule');

describe('the working order is gated, not merely written down', () => {
  it('the rule reads the checklist and the branch it claims', () => {
    assert.match(src, /_WORKING-ORDER\.md/, 'nothing reads the working-order checklist');
    assert.match(rule(), /rev-parse/, 'nothing asks git which branch this is');
  });

  it('a checklist naming another branch is the reset, and counts as unchecked', () => {
    /*
     * The whole design rests on this. If a stale checklist were merely warned about, the ticks from the
     * previous job would satisfy the next one — a gate that passes hardest exactly when it should fire.
     */
    const r = rule();
    assert.match(r, /BRANCH/, 'the checklist does not declare which branch it belongs to');
    assert.match(r, /fail\(/, 'a stale or unchecked list must fail the check, not print a note beside it');
  });

  it('and an unticked row is tested for NULL, which is what the reader returns', () => {
    /*
     * This crashed instead of failing. `workingOrderRow` returns `null` for a row that is absent or
     * unticked — never `undefined` — and the tests-row guard read `tests !== undefined`, so `.match` ran on
     * `null` and killed the process.
     *
     * It only reached that line when a row was UNTICKED, which is exactly when the checker has something to
     * say: the missing-row failure had already been recorded, and the crash then discarded it. So an honest
     * mid-job run printed a stack trace and no findings, while a fully-ticked one looked fine — a gate that
     * works only when it has nothing to report.
     *
     * Asserted on the source because the crash is in a branch the fixtures cannot reach without a `todo/`
     * folder, and `todo/` is gitignored and absent in CI.
     */
    const code = src;
    assert.doesNotMatch(code, /workingOrderRow\([^)]*\);\s*if \(\w+ !== undefined\)/,
      'a row reader returning null is being compared against undefined, which crashes on the unticked case');
    assert.match(rule(), /tests !== null/,
      'the tests row must be tested for null — the reader has no undefined case');
  });

  it('an unticked box fails', () => {
    // Matched on the variable rather than on the bracket literal: the source spells it inside a regex, so a
    // grep for `[ ]` finds `[ \]` and misses — a gate looking for the wrong spelling of its own subject.
    assert.match(rule(), /unticked/, 'nothing counts the boxes that are not ticked');
  });

  it('the plan row names an item the queue actually holds', () => {
    const r = rule();
    assert.match(r, /orderedHomeRows|ORDERED/,
      'the plan row is not checked against the ordered queue, so it attests to nothing');
    assert.match(r, /owner-directed/,
      'owner-directed work has no queue id and must be sayable, or the gate teaches its own bypass');
    /*
     * The third form, and it is the convention rather than a loophole: a fix in the working tree already
     * fails the verify-line rule, so an item is closed in the same change that ships it and has left the
     * queue by the time this runs. Without it every bug fix would have to lie in one of the two rules.
     */
    assert.match(r, /closed by this change/,
      'an item closed by the very change that ships it cannot be named, so the two rules contradict');
  });

  it('the documentation row is checked against CHANGELOG.md, not taken on trust', () => {
    assert.match(rule(), /CHANGELOG\.md/,
      'the documentation row attests to itself; it must require the one file every change owes');
  });

  it('the guides are their own checkpoint, not folded into "documentation"', () => {
    /*
     * Owner-directed, 2026-08-31. `docs/integration-guide/` and `docs/userguide/` are two of the five places
     * CLAUDE.md says a capability lives, and they are the two that fail silently — each is somebody's
     * authoritative source, and the one that is wrong is invisible to whoever reads it. A CHANGELOG entry
     * reaches neither reader, so a row that satisfies itself with one cannot stand for both.
     */
    const r = rule();
    assert.match(r, /docs\\\/\.\*guide|docs\/\*guide|integration-guide/,
      'nothing requires a guide page to have moved');
    assert.match(r, /NO GUIDE READER AFFECTED/,
      'a change that reaches neither guide reader has no way to say so, so the row becomes a formality');
  });

  it('and the guides exemption must carry a reason, not just the phrase', () => {
    // Silence and forgetting look identical, and the docs gates cannot tell them apart either — they check
    // that a thing is MENTIONED, never that the mention is still true.
    assert.match(rule(), /exempt\.length\s*<\s*\d+/,
      'the exemption is accepted bare, which makes it a keystroke rather than a claim');
  });

  it('the tests row accepts an explicit no-new-behaviour exemption', () => {
    /*
     * A pure extraction has no new test to write and the characterization suite already covers it. Without a
     * way to SAY that, the honest move and the bypass are the same keystroke, and the bypass wins.
     */
    assert.match(rule(), /NO NEW BEHAVIOUR/, 'a refactor cannot declare why it wrote no new test');
  });

  it('and it does not fire on main, where no job is in progress', () => {
    // The checklist is per-job. Reading it on `main` — a release cut, a docs fix, a fresh clone — would fail
    // a check about work that is not happening.
    assert.match(rule(), /main/, 'the rule does not stand down on main');
  });
});
