/**
 * The frozen judge prompt does not specify an output format, because the parser already does.
 *
 * ## The gate `grade/judge.mjs` asks for, in its own words
 *
 * > Exported because the instruction and the parser MUST NOT be able to drift apart — one rule in two places
 * > with the weaker one winning silently is the defect this repository produces most (`CLAUDE.md`). **A gate
 * > can assert that `benchmarks/prompts/judge.md` does NOT also specify an output format:** if it does, the
 * > frozen prompt and this constant are two sources for one rule and the model gets to choose which to obey.
 *
 * That is a gate the source asked for and nobody had written. `RESPONSE_FORMAT` is appended to the user
 * message at grading time, so the prompt file stays byte-identical to what the protocol publishes and the
 * results can reproduce it without an editorial footnote.
 *
 * ## Why a format in the prompt would be worse than merely redundant
 *
 * The protocol FREEZES `judge.md` — it is reproduced verbatim in every result and a silent edit invalidates
 * the runs it covers. `RESPONSE_FORMAT` is code and changes with the parser. Put a format in both and the day
 * they disagree the model obeys one, the parser expects the other, and the failure is `JudgeUnparseable` on
 * some questions and silently mis-parsed verdicts on others.
 *
 * Run: node --test testing/standalone/the-frozen-prompts-do-not-restate-the-parser.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { RESPONSE_FORMAT } from '../../benchmarks/harness/grade/judge.mjs';

const JUDGE = 'benchmarks/prompts/judge.md';
const ANSWER = 'benchmarks/prompts/answer.md';

describe('the frozen prompts and the parser are one rule each', () => {
  it('both prompts exist and say something (the check itself works)', () => {
    // The vacuity guard. A renamed prompt would make every `doesNotMatch` below pass over an empty string,
    // which is the silent pass this family of gates exists to end.
    for (const p of [JUDGE, ANSWER]) {
      assert.ok(existsSync(p), `${p} is missing — the protocol names it as frozen and reproduced in results`);
      assert.ok(readFileSync(p, 'utf8').trim().length > 200, `${p} is suspiciously short — re-anchor this gate`);
    }
  });

  it('the judge prompt does not restate the reply format', () => {
    const src = readFileSync(JUDGE, 'utf8');
    // The parser anchors on a line beginning `<number>: CORRECT`. A prompt that also dictates a shape is the
    // second source; these are the ways it would say so.
    assert.doesNotMatch(src, /reply with exactly one line/i,
      `${JUDGE} specifies the reply format, which \`RESPONSE_FORMAT\` in grade/judge.mjs already owns`);
    assert.doesNotMatch(src, /^\s*<number>/m,
      `${JUDGE} spells out the verdict line — the parser and the frozen prompt would then be two sources`);
    assert.doesNotMatch(src, /nothing else\b/i,
      `${JUDGE} constrains the shape of the reply; that instruction belongs to the parser's constant`);
  });

  it('and the words the parser keys on are still the words the prompt teaches', () => {
    /*
     * The other direction, and the one a "does not restate" rule cannot cover on its own: the prompt has to
     * teach the SAME vocabulary the parser recognises. If `judge.md` said "RIGHT"/"WRONG" while the parser
     * anchors on CORRECT/INCORRECT, nothing above would fire and every verdict would be unparseable.
     */
    const src = readFileSync(JUDGE, 'utf8');
    for (const word of ['CORRECT', 'INCORRECT']) {
      assert.ok(src.includes(word),
        `${JUDGE} never uses the word ${word}, which is what the parser reads. The prompt must teach the `
        + 'vocabulary even though it must not dictate the layout.');
      assert.ok(RESPONSE_FORMAT.includes(word), `RESPONSE_FORMAT no longer uses ${word} — re-anchor this gate`);
    }
  });

  it('the answer prompt fixes what the lexical metric is sensitive to', () => {
    /*
     * Not style. `grade/lexical.mjs` states that F1 punishes verbosity — precision is over the prediction's
     * own tokens — so an answerer that explains itself scores below the same answerer told to answer in a
     * phrase. The instruction is byte-identical for every system, so it cannot advantage one; what it must
     * not do is be ABSENT, which would let answer length drift between runs and move the number for a reason
     * that has nothing to do with retrieval.
     */
    const src = readFileSync(ANSWER, 'utf8');
    assert.match(src, /shortest/i, `${ANSWER} does not constrain answer length, and F1 punishes verbosity`);
    assert.match(src, /I don't know/, `${ANSWER} must fix the exact refusal string, or the no-context control `
      + 'cannot tell "declined" from "answered wrongly"');
  });
});
