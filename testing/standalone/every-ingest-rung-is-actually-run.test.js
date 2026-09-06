/**
 * Every ingestion rung that exists is one the runner actually runs.
 *
 * ## The gap this closes
 *
 * `benchmark-ingest-cannot-see-the-questions.test.js` reads the `ingest/` directory, counts the modules, and
 * asserts none of them can reach the question set. It is a good gate and it answers a different question:
 * **that a rung is blind, not that it is measured.**
 *
 * So a rung could be written, be perfectly blind, pass that gate — and be absent from the runner's `RUNGS`
 * array, which is a hand-written list of imports. It would appear in the folder, appear in the count, and
 * never produce a number. Nothing would say so, because the thing that reads the directory is not the thing
 * that runs the benchmark.
 *
 * Found while adding `s0l` (`Q-6`): the file has to be registered in two places, and only one of them is
 * checked.
 *
 * ## Why this is not the blindness gate with another case bolted on
 *
 * That file's title is a claim about blindness. Adding a registration check to it would make the title
 * describe less than the body — which is the defect `CLAUDE.md` has a section about, and the one this whole
 * sweep is chasing. Two rules, two gates, each titled for what it checks.
 *
 * Run: node --test testing/standalone/every-ingest-rung-is-actually-run.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'benchmarks/harness/ingest';
const RUNNER = 'benchmarks/harness/run-tier0r.mjs';

/**
 * The rung modules on disk, by filename.
 *
 * `_`-prefixed files are shared schema and helper pieces the rungs import, not rungs — the runner has no
 * reason to import them and this gate would otherwise demand it. The PREFIX is the rule rather than a list of
 * exceptions, so a second shared module needs no edit here, and a rung cannot hide behind it: a rung named
 * `_something.mjs` would not be found by anything else either.
 */
function rungFiles() {
  return readdirSync(DIR).filter(f => f.endsWith('.mjs') && !f.startsWith('_')).sort();
}

describe('every ingestion rung is registered with the runner', () => {
  it('finds rungs and a runner at all (the check itself works)', () => {
    // The vacuity guard. A renamed directory would make both sides empty, and an empty list satisfies every
    // comparison below — the silent pass this family of gates exists to end.
    const files = rungFiles();
    assert.ok(files.length >= 3, `expected several ingest rungs, found ${files.length}`);
    assert.match(readFileSync(RUNNER, 'utf8'), /const RUNGS = \[/,
      `${RUNNER} no longer declares a RUNGS array — re-anchor this gate`);
  });

  it('the runner imports every rung in the folder', () => {
    /*
     * Matched on the FILENAME rather than the exported `rung` id, deliberately. The id lives inside the
     * module and the import lives in the runner; comparing the two would need the module loaded, and a rung
     * that fails to load is exactly the case that must still be reported rather than skipped.
     */
    const runner = readFileSync(RUNNER, 'utf8');
    const missing = rungFiles().filter(f => !runner.includes(`./ingest/${f}`));
    assert.deepEqual(missing, [],
      `${missing.join(', ')} exists in ${DIR} and is never imported by ${RUNNER}. A rung nobody runs produces `
      + 'no number and looks, from the folder and from the blindness gate\'s count, exactly like one that does.');
  });

  it('and puts every imported rung into RUNGS, not just at the top of the file', () => {
    /*
     * The half that would otherwise be missed: an import is not a registration. A module imported and left
     * out of the array is a rung the runner has loaded and will not measure — which reads, in a diff, as
     * completely done.
     */
    const runner = readFileSync(RUNNER, 'utf8');
    const names = [...runner.matchAll(/import \* as (\w+) from '\.\/ingest\/[^']+'/g)].map(m => m[1]);
    assert.ok(names.length >= 3, `expected several rung imports, found ${names.length}`);

    const list = /const RUNGS = \[([^\]]*)\]/.exec(runner)?.[1] ?? '';
    const registered = list.split(',').map(s => s.trim()).filter(Boolean);
    const imported404 = names.filter(n => !registered.includes(n));
    assert.deepEqual(imported404, [],
      `${imported404.join(', ')} is imported by ${RUNNER} and left out of RUNGS — loaded, and never measured.`);
  });
});
