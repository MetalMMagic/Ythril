/**
 * A gate that asks "what source files does this repo have" uses the ONE helper, and never rolls its own.
 *
 * ## What this closes
 *
 * `Q-6` spent six rounds replacing hand-written lists of files with derived ones, and every conversion wrote
 * the same four lines: shell out to `git ls-files`, split on newlines, keep what ends in `.ts`, assert a
 * floor. By the end that block existed about thirty times — produced by a sweep whose entire subject is that
 * a rule written twice is a rule that can be wrong once.
 *
 * Owner, 2026-09-07: *"when you find copies i always think 'why is that not a reusable module then?'"* —
 * which became the standing rule *"reuse a module, or build one worth reusing"*.
 *
 * `_sources.mjs` is that module. This is the gate that stops the thirty-first copy.
 *
 * ## The floor is the reason it matters, not tidiness
 *
 * A listing that returns nothing passes every loop written over it: no offenders found, green tick, nothing
 * checked. That guard is one line, it looks like boilerplate, and it is exactly the line a copy omits. Inside
 * the helper it cannot be omitted — asking for the sources gives you the floor whether you remembered it or
 * not, and it THROWS rather than returning empty, so a broken scan cannot be mistaken for a clean codebase.
 *
 * ## What is NOT an offence, which is most of the `git ls-files` in this directory
 *
 * The rule is about SOURCE listings, so the detector requires both halves: a `git ls-files` call, and an
 * extension filter for `.ts`/`.tsx` on its result. Everything else keeps its own call and should:
 *
 *  - `source-text-hygiene` sweeps EVERY tracked file. A control byte or a mojibake sequence in a `.json`, a
 *    `.scss` or a `.md` is the same defect, and narrowing it to sources would quietly stop checking most of
 *    the repository.
 *  - The docs gates list `.md`. `no-customer-names-in-public` lists everything a public repo publishes.
 *  - `a-dist-import-has-a-source` compares compiled `.js` output against its sources.
 *
 * A shared module that absorbs a caller asking a different question is the failure mode of consolidating,
 * and it is silent: the gate keeps passing while checking less. So the detector is deliberately narrow, and
 * the two gates that need UNCOMMITTED files pass `untracked: true` rather than being exempted.
 *
 * Run: node --test testing/standalone/a-source-listing-goes-through-the-one-helper.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripComments } from './_strip-comments.mjs';
import { trackedSources, REPO_ROOT } from './_sources.mjs';

/** The module that IS the answer, so it is the one file allowed to make the call. */
const THE_HELPER = 'testing/standalone/_sources.mjs';

/**
 * ...and this file, which holds the offending spellings as FIXTURES.
 *
 * The detector below is exercised against the real strings it must catch, so a gate that scanned itself
 * would report its own test data as violations. It found them the moment this file was first committed and
 * not before, because an uncommitted file is not in a tracked listing — which is a small live demonstration
 * of why the two gates that need `untracked: true` need it.
 */
const THIS_FILE = 'testing/standalone/a-source-listing-goes-through-the-one-helper.test.js';

/** Every gate and helper under `testing/`, derived rather than listed — the rule this file is about. */
function gateFiles() {
  return trackedSources('testing', { ext: ['.js', '.mjs'], floor: 60, exclude: [THIS_FILE] });
}

/**
 * A hand-rolled SOURCE listing: a `git ls-files` whose result is filtered down to TypeScript.
 *
 * The window is the statement the call sits in, ended at the first `;` — a structural boundary rather than a
 * character count, because a fixed window spans a different number of lines on CRLF than on CI's LF and
 * would pass by looking at less.
 */
function handRolledSourceSweep(text) {
  const src = stripComments(text);
  const found = [];
  for (const m of src.matchAll(/['"]ls-files['"]/g)) {
    /*
     * The window reaches BACKWARDS as well, and this is not symmetry for its own sake.
     *
     * `one-merge-rule` hoisted its pathspecs into a variable — `const specs = ['server/src/**\/*.ts'];` and
     * then `run(['ls-files', ...specs])` — so the statement holding the call names no extension at all. The
     * first version of this detector read forward only, reported that file clean, and the gate was believed.
     * Two lines back is where a hoisted pathspec lives.
     */
    const from = src.lastIndexOf('\n', src.lastIndexOf('\n', m.index - 1) - 1) + 1;
    const stmt = src.slice(from, src.indexOf(';', m.index) + 1 || undefined);
    // Two spellings, and the second is why this is not just an `endsWith` check: the filter can live in the
    // ARGUMENTS as a `*.ts` glob rather than in a `.filter()` on the result. That version was missed by the
    // first draft of this detector, which is the reminder that a predicate matching one way of writing a
    // thing reports clean about the other.
    if (/\.tsx?\b['"]|\.tsx\?\$|endsWith\(['"]\.ts/.test(stmt)) found.push(stmt.trim().slice(0, 120));
  }
  return found;
}

describe('one implementation of "what source files does this repo have"', () => {
  it('sweeps a real set of gates, so an empty sweep cannot pass', () => {
    const files = gateFiles();
    assert.ok(files.includes(THE_HELPER), `${THE_HELPER} is not in the scan, so this gate checks nothing`);
    // A rename would leave `THIS_FILE` excluding nothing, and the exclusion would go quiet rather than wrong —
    // so the scan is asserted to have actually dropped it, which a stale path cannot fake.
    assert.ok(!files.includes(THIS_FILE), 'this file must be excluded — it holds the offending spellings');
    assert.ok(trackedSources('testing/standalone', { floor: 60 - 1, ext: ['.js'] }).includes(THIS_FILE),
      `${THIS_FILE} is not tracked under that path — the exclusion above now names a file that does not exist`);
  });

  it('no gate rolls its own source listing', () => {
    const offenders = [];
    for (const f of gateFiles()) {
      if (f === THE_HELPER) continue;
      for (const hit of handRolledSourceSweep(readFileSync(join(REPO_ROOT, f), 'utf8'))) {
        offenders.push(`${f}: ${hit}`);
      }
    }
    assert.deepEqual(offenders, [],
      'these list source files by hand instead of through the shared helper:\n  ' + offenders.join('\n  ')
      + "\n\nUse `trackedSources(dirs, { floor })` from ./_sources.mjs. The floor is the point: a listing that "
      + 'returns nothing passes every loop written over it, and that is the line a copy leaves out. Pass '
      + '`untracked: true` if the gate needs files that are not committed yet.');
  });

  it('and the detector fires on the shape it claims to, rather than on nothing', () => {
    /*
     * A predicate that stopped matching would report zero offenders for ever and read exactly like a clean
     * repository. So it is exercised in both directions here, with the real spellings this sweep replaced.
     */
    const caught = [
      "const files = execFileSync('git', ['ls-files', 'server/src']).toString('utf8').split('\\n')"
        + ".filter(f => f.endsWith('.ts'));",
      "execFileSync('git', ['ls-files', 'server/src/mcp/tools/*.ts'], { encoding: 'utf8' }).split('\\n');",
      "const l = execFileSync('git', ['ls-files', 'client/src']).split('\\n').filter(f => /\\.tsx?$/.test(f));",
    ];
    for (const s of caught) {
      assert.equal(handRolledSourceSweep(s).length, 1, `must be flagged: ${s}`);
    }

    const allowed = [
      // Every tracked file, whatever its type — `source-text-hygiene`.
      "execFileSync('git', ['ls-files', '-z']).split('\\0').filter(Boolean);",
      // Documentation.
      "execFileSync('git', ['ls-files', 'docs']).split('\\n').filter(f => f.endsWith('.md'));",
      // The helper itself, called properly.
      "const files = trackedSources('server/src/api', { floor: 10 });",
    ];
    for (const s of allowed) {
      assert.deepEqual(handRolledSourceSweep(s), [], `must NOT be flagged: ${s}`);
    }
  });

  it('the helper is actually used, so passing does not mean the sweeps were deleted', () => {
    // The other direction, and the one a "make the gate green" change would take: satisfying everything above
    // by removing the listings altogether leaves gates that assert a rule over no files at all.
    const users = gateFiles()
      .filter(f => f !== THE_HELPER)
      .filter(f => /trackedSources|readTrackedSources/.test(readFileSync(join(REPO_ROOT, f), 'utf8')));
    assert.ok(users.length >= 30,
      `only ${users.length} gates go through the helper — the sweeps were removed rather than converted`);
  });
});
