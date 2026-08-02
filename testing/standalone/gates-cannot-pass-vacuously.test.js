/**
 * A gate that enumerates something must prove the enumeration found something.
 *
 * ## The failure this catches
 *
 * Most gates in this suite share one shape: enumerate a set discovered at run time (a directory walk,
 * `git ls-files`, the docs helpers), derive a list of offenders, assert the list is empty. If the ENUMERATION
 * breaks — a renamed directory, a changed pathspec, a declaration syntax that no longer matches — the offender
 * list is empty for the wrong reason and the gate goes green **while examining nothing**.
 *
 * That is not hypothetical here. This lens pass found two live instances (`index-ready-poll` walking
 * `server/src`, and the `stale-nested-config-ref` scanner over `git ls-files`), and the day before it, four gate
 * defects surfaced by accident: a test reading server-written state from inside the offline subset, a red run
 * that was a pool-shutdown deadline rather than a test, a metric family undocumented for two releases, and
 * preflight going red **with no output at all** once its command line outgrew a Windows limit.
 *
 * The cure is one assertion — a floor on the enumeration, with a message saying what it means:
 *
 *     assert.ok(files.length > 100, `only walked ${files.length} source files`);
 *
 * ## Deliberate exemptions, by rule rather than by name
 *
 * - **Reading NAMED files is not enumeration.** If the file moves, `readFileSync` throws. A loud failure needs
 *   no floor, and requiring one flagged `describe-timeout`, whose emptiness assertion is additionally guarded by
 *   a positive `assert.match` on the same file.
 * - **A hardcoded fixture list cannot silently empty**, so a gate driven by one needs no floor either.
 *
 * Both exemptions are properties of the code, not a list of blessed filenames — a name-based allowlist is the
 * thing that goes stale and quietly grows.
 *
 * Run: node --test testing/standalone/gates-cannot-pass-vacuously.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(fileURLToPath(new URL('.', import.meta.url)));

/** Asserting a derived list is empty — the vacuity-prone shape. */
const EMPTY_ASSERT = [
  /assert\.deepEqual\(\s*\w+\s*,\s*\[\s*\]/,
  /assert\.deepStrictEqual\(\s*\w+\s*,\s*\[\s*\]/,
  /assert\.equal\(\s*\w+\.length\s*,\s*0\s*\)/,
  /assert\.strictEqual\(\s*\w+\.length\s*,\s*0\s*\)/,
];

/**
 * A set discovered at RUN TIME. `readFileSync` of a named path is excluded on purpose — see the exemptions
 * above.
 */
const ENUMERATES = /readdirSync|execFileSync\('git', \['ls-files|execSync\('git ls-files|allDocsText\(|docFiles\(/;

/** A lower bound proving the enumeration found something. `> 0` counts — it is the most natural way to write it. */
const HAS_FLOOR = [
  /assert\.ok\([^;]*\.length\s*>\s*0/,
  /assert\.ok\([^;]*\.length\s*>=?\s*[1-9]/,
  /assert\.ok\([^;]*\.size\s*>\s*0/,
  /assert\.ok\([^;]*\.size\s*>=?\s*[1-9]/,
  /assert\.ok\(\s*\w+\s*>=?\s*[1-9]/,
  /length,\s*[1-9]\d*\)/,
  /toBeGreaterThan/,
];

/** A hardcoded list cannot silently become empty. */
const HARDCODED_LIST = /const\s+[A-Z_]+\s*=\s*\[\s*\n?\s*\[?['"[]/;

/** `{ name, enumerates, assertsEmpty, floored }` for one test file's text. */
export function classifyGate(src) {
  const assertsEmpty = EMPTY_ASSERT.some(re => re.test(src));
  const enumerates = ENUMERATES.test(src);
  const floored = HAS_FLOOR.some(re => re.test(src)) || HARDCODED_LIST.test(src);
  return { assertsEmpty, enumerates, floored };
}

const gateFiles = readdirSync(DIR).filter(f => f.endsWith('.test.js')).sort();

describe('no gate can pass while examining nothing', () => {
  it('every enumerating gate floors its enumeration', () => {
    const unfloored = [];
    for (const name of gateFiles) {
      if (name === 'gates-cannot-pass-vacuously.test.js') continue;   // it floors itself below
      const c = classifyGate(readFileSync(join(DIR, name), 'utf8'));
      if (c.assertsEmpty && c.enumerates && !c.floored) unfloored.push(name);
    }
    assert.deepEqual(unfloored, [], 'these assert an empty offender list over a run-time enumeration with no '
      + `floor on it, so a broken enumeration passes green:\n  ${unfloored.join('\n  ')}\n\n`
      + 'Add one assertion naming what it means, e.g.\n'
      + '  assert.ok(files.length > 100, `only walked ${files.length} source files`);');
  });

  it('floors its OWN enumeration', () => {
    // Without this, the check above is the very thing it forbids.
    assert.ok(gateFiles.length > 100, `only found ${gateFiles.length} gate files in ${DIR}`);
  });

  it('finds a meaningful number of enumerating gates — the classifier still works', () => {
    // If `ENUMERATES` stops matching (a helper renamed, a call rewritten), every gate looks non-enumerating and
    // this file passes while checking nothing. That is the same defect, one level up.
    const enumerating = gateFiles.filter(n => {
      const c = classifyGate(readFileSync(join(DIR, n), 'utf8'));
      return c.enumerates && c.assertsEmpty;
    });
    assert.ok(enumerating.length >= 20, `only ${enumerating.length} enumerating gates recognised`);
  });

  // ── The classifier must be able to fail ──────────────────────────────────────────────────────────
  it('flags an enumerating gate with no floor', () => {
    const bad = `
      import { readdirSync, readFileSync } from 'node:fs';
      const files = readdirSync('server/src');
      it('none', () => {
        const offenders = files.filter(f => readFileSync(f, 'utf8').includes('bad'));
        assert.deepEqual(offenders, []);
      });`;
    const c = classifyGate(bad);
    assert.ok(c.enumerates && c.assertsEmpty && !c.floored, JSON.stringify(c));
  });

  it('accepts the same gate once a floor is added', () => {
    const good = `
      import { readdirSync, readFileSync } from 'node:fs';
      const files = readdirSync('server/src');
      it('none', () => {
        assert.ok(files.length > 0, 'the walk found nothing');
        const offenders = files.filter(f => readFileSync(f, 'utf8').includes('bad'));
        assert.deepEqual(offenders, []);
      });`;
    assert.equal(classifyGate(good).floored, true);
  });

  it('does not demand a floor from a gate that reads NAMED files', () => {
    // A missing named file throws. That is loud, so no floor is needed — and demanding one here is what would
    // make this gate annoying enough to delete.
    const named = `
      import { readFileSync } from 'node:fs';
      it('none', () => {
        const src = readFileSync('server/src/app.ts', 'utf8');
        const offenders = [...src.matchAll(/bad/g)];
        assert.equal(offenders.length, 0);
      });`;
    assert.equal(classifyGate(named).enumerates, false);
  });

  it('does not demand a floor from a hardcoded fixture list', () => {
    const fixture = `
      import { readdirSync } from 'node:fs';
      const SWEEPS = ['a', 'b', 'c'];
      it('none', () => {
        const offenders = SWEEPS.filter(s => !readdirSync('x').includes(s));
        assert.deepEqual(offenders, []);
      });`;
    assert.equal(classifyGate(fixture).floored, true);
  });
});
