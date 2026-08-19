/**
 * The DECISIONS page check can actually FAIL, and it does not fire on a live decision's wording.
 *
 * ## What happened
 *
 * Owner, 2026-08-19, opening `todo/_PARKED-DECISIONS.md`: *"why are there so many items? remove everything thats
 * already done. i only want to see what i have todo — hence 'todo'"*. It was 312 lines, and **seven** entries
 * filed as open questions were already decided; five of those had shipped.
 *
 * It rotted because the file was on `todo-consistency.mjs`'s `NOT_A_QUEUE` exemption list, whose stated reason —
 * *"indexed by outcome rather than queued"* — described a version of the file that held outcomes. The outcomes
 * moved to `_REFERENCE.md` and the exemption stayed, so an unchecked page accumulated resolved history for weeks
 * while every checked page stayed clean.
 *
 * **The damage is not the length.** One settled row makes every other row less believable, so the owner has to
 * re-read all of them to find out which still count.
 *
 * ## Why fixtures, and not the real folder
 *
 * `todo/` is gitignored and absent in CI, so a test that read it would skip in the only place it runs
 * automatically — which is not a test. The same reasoning that put `matchIndexReference` in its own module put
 * these two rules in `parked-decisions-rules.mjs`: they are pure, so the fixtures below are the whole subject.
 *
 * ## The half that is easy to get wrong
 *
 * Both false-positive cases matter as much as the failures. A live decision legitimately contains outcome words —
 * `## P-10 — six tags SHIPPED with no GitHub Release` is a real, open entry — and a check that fired on it would
 * teach the next person to word entries around the gate instead of writing what they mean. The first version of
 * this rule failed on exactly that heading.
 *
 * Run: node --test testing/standalone/parked-decisions-rules.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvedHeadings, decidedButStillFiled, rulingsLeftOnThePage } from '../../scripts/parked-decisions-rules.mjs';

const lines = (...xs) => xs.join('\n');

describe('a section announcing a resolution is caught', () => {
  it('catches the four shapes the page had actually reached', () => {
    // Every one of these was on the page when the owner found it.
    for (const heading of [
      '## Answered — resolved reasoning lives in `_REFERENCE.md`, not here',
      '## ANSWERED 2026-08-08 — moved to the queue',
      '### Closed 2026-08-04 by the owner',
      '## Decided: the export notice',
    ]) {
      const found = resolvedHeadings(lines('# Your decisions', '', heading, '', 'body'));
      assert.equal(found.length, 1, `not caught: ${heading}`);
      assert.equal(found[0].heading, heading);
    }
  });

  it('reports the LINE, so the fix does not need a search', () => {
    const src = lines('# Your decisions', '', 'intro', '', '## Answered — outcomes', '', 'body');
    assert.deepEqual(resolvedHeadings(src).map(f => f.line), [5]);
  });

  it('does NOT fire on a live entry whose TITLE contains an outcome word', () => {
    /*
     * `## P-10 — six tags shipped with no GitHub Release` is real and open: "shipped" describes what happened to
     * the tags, not to the decision. The first version of this rule failed on it, which is the
     * rule-versus-one-spelling mistake — an outcome word in a title says nothing about whether the question is
     * answered. A decided `P-N` is caught on evidence instead, by `decidedButStillFiled`.
     */
    for (const heading of [
      '## P-10 — six tags shipped with no GitHub Release, and the page said the project stopped at 2.5.1',
      '## P-12 — four images shipped with the wrong label: keep them or re-tag?',
      '## P-13 — should a closed vote still be listed?',
    ]) {
      assert.deepEqual(resolvedHeadings(lines(heading, '', 'body')), [], `false positive on: ${heading}`);
    }
  });

  it('does NOT fire on body prose, only on headings', () => {
    // Both of these are real sentences from live entries.
    const src = lines(
      '## P-10 — a question',
      '',
      '**The current release is fixed; the backlog is the question.**',
      '',
      'I converted all twenty pins to presence checks before the test failed; the change is reverted.',
      'This was answered upstream and then closed, which is why the question is what WE do.',
    );
    assert.deepEqual(resolvedHeadings(src), []);
  });

  it('ignores a level-1 title and deeper sub-headings of an entry', () => {
    // `# Your decisions` is the page title. `#### …` is inside an entry's own argument, where "the options, with
    // their real cost" style sub-heads live; neither announces a section of history.
    assert.deepEqual(resolvedHeadings(lines('# Decisions answered elsewhere', '', 'x')), []);
    assert.deepEqual(resolvedHeadings(lines('#### What was decided upstream', '', 'x')), []);
  });

  it('matches case-insensitively and only on whole words', () => {
    assert.equal(resolvedHeadings('## ANSWERED').length, 1);
    assert.equal(resolvedHeadings('## answered').length, 1);
    // "undone" and "disclosed" contain "done" and "closed" as substrings and must not match.
    assert.deepEqual(resolvedHeadings(lines('## Work undone by the migration', '## Not yet disclosed')), []);
  });
});

describe('a decision recorded as decided must not still be filed as open', () => {
  const REFERENCE = lines(
    '## Decisions already made',
    '',
    '| # | decision | outcome | verified |',
    '|---|---|---|---|',
    '| P-4 | space bodies | **A — strict** | gated |',
    '| P-6 | pre-existing violation | **classify** | shipped |',
  );

  it('catches the exact state the owner found', () => {
    const parked = lines('## P-4 — space request bodies: refuse an unknown key?', '', 'Still wondering.');
    assert.deepEqual(decidedButStillFiled(parked, REFERENCE), ['P-4']);
  });

  it('catches several at once, sorted, so one run names them all', () => {
    const parked = lines('## P-6 — a question', '', 'x', '', '## P-4 — another', '', 'y');
    assert.deepEqual(decidedButStillFiled(parked, REFERENCE), ['P-4', 'P-6']);
  });

  it('is silent when the page holds only undecided items', () => {
    const parked = lines('## P-7 — how does an operator pin a field at NOTHING?', '', 'x', '', '## P-11 — taste', '', 'y');
    assert.deepEqual(decidedButStillFiled(parked, REFERENCE), []);
  });

  it('reads the reference TABLE, not any mention of the number', () => {
    /*
     * The point of comparing two copies rather than checking a mention: `_REFERENCE.md` discusses decisions in
     * prose all over the file, and a substring search would call every one of them decided. Only a table row keyed
     * by the number is the record.
     */
    const prose = lines('## Some history', '', 'P-4 was argued at length and the reasoning is worth keeping.');
    const parked = lines('## P-4 — still open', '', 'x');
    assert.deepEqual(decidedButStillFiled(parked, prose), [],
      'prose mentioning P-4 must not count as a decided record');
  });

  it('and the parked side must be a HEADING, not a cross-reference', () => {
    // An entry may legitimately point at a decided one — "unlike P-4, this is not a breaking change" — without
    // being that decision.
    const parked = lines('## P-7 — a question', '', 'Unlike P-4, this one is not breaking.');
    assert.deepEqual(decidedButStillFiled(parked, REFERENCE), []);
  });

  it('survives CRLF, which is what this repo checks out on Windows', () => {
    const parked = ['## P-4 — a question', '', 'x'].join('\r\n');
    const ref = REFERENCE.split('\n').join('\r\n');
    assert.deepEqual(decidedButStillFiled(parked, ref), ['P-4']);

    const found = resolvedHeadings(['# Title', '', 'intro', '', '## Answered', '', 'x'].join('\r\n'));
    assert.equal(found.length, 1);
    // The heading must come back TRIMMED of the carriage return, or the reported text ends mid-line in a terminal.
    assert.equal(found[0].heading, '## Answered');
    assert.equal(found[0].line, 5, 'the line number must be the same on CRLF as on LF');
  });
});

describe('an entry that records its own ruling is not an open decision', () => {
  const entry = (...body) => ['## P-10 — six tags shipped with no GitHub Release', '', ...body].join('\n');

  it('catches the exact entry that survived the manual cleanup', () => {
    /*
     * P-10 had been ruled by the owner and said CLOSED in its own text, and it still sat on the page. Neither
     * other rule could see it: the heading scan skips `P-N` titles and never reads bodies, and the cross-check
     * needs a reference row nobody had written. The ruling was in the body — the one place nothing looked.
     *
     * And the manual pass missed it for a worse reason: each entry was verified by asking whether the code had
     * shipped, and this ruling was "do nothing", so the six missing Releases were the IMPLEMENTED OUTCOME and read
     * as evidence the question was open. An absence cannot tell "not done" from "deliberately not done".
     */
    const found = rulingsLeftOnThePage(entry(
      '**RULED B ON 2026-08-17: no backfill.** Owner: *"P-10 no backfill, only newset is interesting."*',
    ));
    assert.deepEqual(found.map(f => ({ id: f.id, marker: f.marker })), [{ id: 'P-10', marker: 'RULED' }]);
    assert.equal(found[0].line, 3);
  });

  it('catches every marker shape, and reports each entry once', () => {
    for (const [body, marker] of [
      ['**CLOSED**; the mechanism is fixed in #965.', 'CLOSED'],
      ['Owner ruled A on 2026-08-01.', 'Owner ruled'],
      ['My recommendation was OVERRIDDEN.', 'OVERRIDDEN'],
    ]) {
      assert.deepEqual(rulingsLeftOnThePage(entry(body)).map(f => f.marker), [marker], `missed: ${body}`);
    }
    // Two markers in one entry is still one finding — a repeated complaint about one row is noise.
    assert.equal(rulingsLeftOnThePage(entry('**RULED B.**', 'x', '**CLOSED**.')).length, 1);
  });

  it('does NOT fire on the prose of a genuinely open entry', () => {
    /*
     * The false positives that decide the shape of this rule. P-11 offers an option described as one that
     * "genuinely closes it"; P-7 records an approach that was reverted. Neither is a ruling, and a rule that fired
     * on them would teach people to write around it.
     */
    for (const body of [
      'They have committed not to raise it again, so this genuinely closes it.',
      'I converted all twenty pins to presence checks; the change is reverted.',
      'Told them it is parked with this recommendation, so this is not a silent park.',
      'The current release is fixed; the backlog is the question.',
      'It changes how the product LOOKS to every customer, and the flat path stays byte-identical.',
    ]) {
      assert.deepEqual(rulingsLeftOnThePage(entry(body)), [], `false positive on: ${body}`);
    }
  });

  it('ignores markers in the page preamble, before any entry', () => {
    // The header legitimately explains that decided items are recorded elsewhere.
    const src = ['# Your decisions — two open', '', 'Decisions already CLOSED live in `_REFERENCE.md`.', '',
      '## P-7 — a real question', '', 'body'].join('\n');
    assert.deepEqual(rulingsLeftOnThePage(src), []);
  });

  it('attributes a marker to the entry it is under, not the first one', () => {
    const src = ['## P-7 — open', '', 'body', '', '## P-11 — also open', '', '**RULED A.**'].join('\n');
    assert.deepEqual(rulingsLeftOnThePage(src).map(f => f.id), ['P-11']);
  });

  it('and survives CRLF', () => {
    const src = ['## P-10 — x', '', '**RULED B.**'].join('\r\n');
    assert.deepEqual(rulingsLeftOnThePage(src).map(f => f.id), ['P-10']);
  });
});
