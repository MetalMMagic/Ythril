/**
 * A tracker item's `Verify:` line, parsed and evaluated — without a shell, and without pretending to more than
 * it proves.
 *
 * ## What this actually establishes, and what it does not
 *
 * **It checks that an item's STATED EVIDENCE still holds. That is not the same as "the item is still open."**
 * The two come apart exactly when a fix lands somewhere other than the file the row complains about — and in
 * this codebase that is the *usual* case, not the exception, because the convention here is to extract:
 *
 *   > When you find yourself writing the same rule a second time, extract it instead.
 *
 * Worked example, measured. `L-4` said *"`api/contradictions.ts` writes edges without validating them"* and
 * named that one file. It shipped as **#1046**, which put the check inside `upsertEdge` in `brain/edges.ts` so
 * no caller could reach the collection around the schema. `api/contradictions.ts` is **byte-identical from
 * #1041 through HEAD** — so every clause faithful to the row's own words still evaluates "satisfied" four days
 * after the row shipped. To have flipped, the author would have had to name a file the row never mentions and a
 * symbol that did not exist, while the row was parked precisely because the fix shape was undecided.
 *
 * So this closes the fix-in-place half and leaves the extraction half open. Six of the eight stale rows of
 * 2026-08-30 were fix-in-place; two were extractions. The gate says *"its stated evidence still holds"* rather
 * than *"it is still open"*, because a tick that overclaims is how the previous four rounds of this check went
 * wrong.
 *
 * ## Why nothing is handed to a shell
 *
 * `todo/` is gitignored, edited constantly, and reviewed by nobody. Executing a string out of it would make a
 * working-notes file an arbitrary-code-execution surface in the one gate that runs before every push. There are
 * two more reasons that are just as decisive:
 *
 *   - **there is no `grep` to run.** Preflight reaches this through npm → node, not through Git Bash, and
 *     Windows has no `grep` on PATH.
 *   - **the same line means different things in different shells.** `grep -c "kind === 'chrono'" f.ts`
 *     tokenizes one way in bash, another in cmd, another in PowerShell.
 *
 * So the clause is tokenized and interpreted here. Identical bytes in, identical answer out, on every OS.
 *
 * ## Why a regex metacharacter is REFUSED rather than interpreted
 *
 * This is the trap that made the first design unsound, and it is worth stating plainly because it looks like a
 * detail. If a literal matcher silently treats `^export` as a two-character sequence, then measured on this
 * tree:
 *
 *     grep -c "^export" server/src/brain/edges.ts   → 24   (what the author sees in their shell)
 *     literal substring count                       →  0   (what a naive matcher would answer)
 *
 * The divergence runs toward **0**, and `returns 0` is the assertion every line in the corpus uses. So the gate
 * would report the evidence intact while the author, hand-checking the very same line in the shell it is
 * written for, sees 24 and believes the row carries real evidence. Both parties are then wrong in the same
 * direction, quietly.
 *
 * Interpreting the pattern as a regex instead is worse: `new RegExp` hands an unreviewed string from a
 * gitignored file to V8's backtracking engine, which has **no timeout in JavaScript** — not an option, not an
 * `AbortSignal`. Measured on this machine, `new RegExp('(a+)+b').test('a'.repeat(40))` runs for **119
 * seconds**. A person writes nested quantifiers by accident.
 *
 * The third option is the sound one: **refuse the pattern and say so.** A metacharacter means the author was
 * thinking in grep, where the answer would differ — so the line is reported UNPARSEABLE with the character
 * named, and gets rewritten as a literal. Nothing is guessed and nothing silently disagrees.
 *
 * ## Why a directory is refused too
 *
 * `grep -c foo server/src/` prints `Is a directory` and exits 2; `grep -rc` prints `path:count` per file and
 * never a sum. If this module answered a summed count for those bytes, it would be the sole oracle for its own
 * number — an author could only obtain it by running the gate and adjusting the integer until it went green,
 * which is evidence-fitting with extra steps. One file per clause, and `grep -c` means exactly what `grep -c`
 * means.
 *
 * ## The injected context is what makes this testable
 *
 * `todo/` is absent in CI, so a rule that reached the filesystem itself could never be shown to FAIL where it
 * runs automatically. Everything I/O-shaped arrives through `ctx`, and the test drives it with fixtures.
 */

/**
 * Characters that mean one thing to `grep` and another to a literal matcher.
 *
 * **This is the BASIC regular expression set, and getting it right in both directions matters.** Plain `grep`
 * — no `-E` — treats only `^ $ . * [ ] \` as special. `( ) { } | + ?` are ORDINARY characters in a BRE; they
 * become operators only when backslash-escaped, and the backslash is already refused. So a pattern like
 * `loadNodeDetails(entityId: string)` or `endpoints?:` means precisely the same thing to grep and to
 * `String.includes`, and refusing it would reject a faithful line for no reason.
 *
 * Too wide is not the safe direction here. It pushes authors toward vaguer patterns, and a vaguer pattern is
 * more likely to match a neighbour of its subject — which is the failure this whole check exists to catch.
 */
const REGEX_META = /[\^$.*[\]\\]/;

/**
 * `grep -c "<pattern>" <path>` — the only command form. `-c` counts LINES, which is what we reproduce.
 *
 * The `still open while` lead-in is optional but expected: it is what every line in the corpus already says,
 * and it is the half that states the DIRECTION of the assertion. Prose after the integer is allowed — S-1's
 * tail is the argument that its pattern is meaningful at all, and refusing exactly that would be backwards.
 */
const CLAUSE = /^(?:still open while\s+)?`grep\s+-c\s+(.+?)\s+([^\s`]+)`\s+returns\s+(\d+)\b/i;

/**
 * The `Verify:` label, in the three spellings the trackers use.
 *
 * The colon sits INSIDE the bold — `**Verify:**`, not `**Verify**:` — which is what markdown produces when you
 * bold the whole label. Anchoring on the other order silently matched nothing and reported all eleven items
 * unparseable.
 */
const LABEL = /\*{0,2}(?:Verify|Still open because|Evidence)\s*:\s*\*{0,2}\s*/i;

/**
 * The text of an item's verify line, unwrapped.
 *
 * Trackers hard-wrap at 118 columns, so a real line is routinely split mid-clause — `L-12`'s runs across two
 * lines with the closing backtick on the first and `returns 1` on the second. Reading only the labelled line
 * would report those UNPARSEABLE for a formatting choice, so the paragraph is joined before parsing and stops
 * at the first blank line.
 */
export function verifyLineOf(body) {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex(l => LABEL.test(l));
  if (at === -1) return null;
  const out = [];
  for (let i = at; i < lines.length; i++) {
    if (i > at && !lines[i].trim()) break;
    out.push(lines[i]);
  }
  return out.join(' ').replace(LABEL, '').replace(/\s+/g, ' ').trim();
}

/** Strip one layer of matching quotes, and report whether the pattern was quoted at all. */
function unquote(raw) {
  const m = /^"([^"]*)"$/.exec(raw) ?? /^'([^']*)'$/.exec(raw);
  return m ? { pattern: m[1], quoted: true } : { pattern: raw, quoted: false };
}

/**
 * Parse one verify line into something evaluable.
 *
 * @returns {{ok: true, kind: 'clause', pattern: string, path: string, expected: number}
 *          |{ok: true, kind: 'manual'}
 *          |{ok: false, reason: string, hint: string}}
 */
export function parseVerifyLine(text) {
  if (text == null) return { ok: false, reason: 'there is no verify line', hint: LEGAL_FORM };
  if (/^MANUAL\b/i.test(text)) return { ok: true, kind: 'manual' };

  const m = CLAUSE.exec(text);
  if (!m) {
    return {
      ok: false,
      reason: `not a checkable clause: "${text.slice(0, 90)}"`,
      hint: LEGAL_FORM,
    };
  }
  const [, rawPattern, path, expected] = m;
  const { pattern, quoted } = unquote(rawPattern);

  if (!quoted && /\s/.test(pattern)) {
    return { ok: false, reason: `the pattern must be quoted: ${rawPattern}`, hint: LEGAL_FORM };
  }
  if (!pattern) return { ok: false, reason: 'the pattern is empty', hint: LEGAL_FORM };

  const meta = REGEX_META.exec(pattern);
  if (meta) {
    return {
      ok: false,
      reason: `the pattern contains \`${meta[0]}\`, which grep reads as a regular expression and this check `
        + `reads literally — measured on this tree, \`grep -c "^export" server/src/brain/edges.ts\` answers 24 `
        + 'in a shell and 0 as a literal, and the divergence runs toward 0, which is what every clause asserts',
      hint: 'rewrite the pattern as a plain literal — pick a distinctive substring instead of anchoring it',
    };
  }
  if (path.endsWith('/')) {
    return {
      ok: false,
      reason: `\`${path}\` is a directory, and no grep produces a summed count for one — real grep prints `
        + '"Is a directory", and `-rc` prints a count per file',
      hint: 'name one file, so that `grep -c` means exactly what `grep -c` means',
    };
  }
  return { ok: true, kind: 'clause', pattern, path, expected: Number(expected) };
}

const LEGAL_FORM =
  'the form is: **Verify:** still open while `grep -c "<literal>" <one file>` returns <N>. '
  + 'Prose may follow the integer. `MANUAL — <why>` is the escape hatch, and it is capped and dated.';

/**
 * Evaluate a parsed clause against the tree.
 *
 * @param {{pattern: string, path: string, expected: number}} clause
 * @param {{isTracked: (p: string) => boolean, readLines: (p: string) => string[]}} ctx
 * @returns {{state: 'holds'|'disagrees'|'broken', actual?: number, why?: string}}
 */
export function evaluateClause(clause, ctx) {
  /*
   * A path that is gone is a HARD failure, never "0 matches". Folding it into zero would mean
   * `grep -c foo deleted.ts returns 0` passes for ever the moment the file is deleted — which is the very hole
   * this check exists to close, one layer further down.
   */
  if (!ctx.isTracked(clause.path)) {
    return { state: 'broken', why: `\`${clause.path}\` is not a tracked file — it was moved, renamed or deleted` };
  }
  const actual = ctx.readLines(clause.path).filter(l => l.includes(clause.pattern)).length;
  return actual === clause.expected ? { state: 'holds', actual } : { state: 'disagrees', actual };
}
