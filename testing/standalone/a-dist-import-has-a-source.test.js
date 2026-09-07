/**
 * Every `server/dist` path a test imports has a `server/src` file behind it.
 *
 * ## The failure this catches, measured
 *
 * `link-inputs.ts` was renamed to `write-connections.ts`. The rename left `server/dist/brain/link-inputs.js`
 * on disk — `tsc` writes outputs, it does not remove the ones whose sources are gone — so a test still
 * importing the old path kept passing locally, for ever, against a compiled file with no source.
 *
 * CI has no such artifact: it builds into a clean tree, and the import failed there with
 * `ERR_MODULE_NOT_FOUND` at module load, which reads as "this test is broken" rather than as "this path
 * moved". One round trip to CI to learn something the working copy already knew.
 *
 * **It is worse than a wasted round trip when the rename is a SPLIT.** Import the old path and you get the
 * old module — the code as it was before it was divided — and every assertion passes against a file nothing
 * ships. The test reports green about a version of the module that no longer exists.
 *
 * ## Why the source, and not just "the dist file is present"
 *
 * Checking that the dist file exists passes on exactly the stale artifact this is about. The question is
 * whether a SOURCE still produces it, which is what makes the import a claim about the product rather than
 * about the build directory's history.
 *
 * Run: node --test testing/standalone/a-dist-import-has-a-source.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trackedSources, REPO_ROOT } from './_sources.mjs';

/** `../../server/dist/brain/write-connections.js` → `server/src/brain/write-connections.ts` */
const sourceFor = (distPath) =>
  `server/src/${distPath.replace(/^.*server\/dist\//, '').replace(/\.js$/, '.ts')}`;

/*
 * An IMPORT, not any string that happens to contain the path. The first version matched a quoted path
 * anywhere, and reported `verify-line.test.js` — where the string is a FIXTURE, deliberately naming an
 * untracked file to prove a verify clause refuses one. A gate that cannot tell an import from an example
 * fails on correct code, which is how gates get switched off.
 */
const IMPORTS = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]*server\/dist\/[^'"]+\.js)['"]/g;

describe('a test that imports the build imports something that is still built', () => {
  it('every dist import resolves to a source file', () => {
    const tests = trackedSources(['testing'], { ext: ['.test.js', '.mjs'], floor: 100 });

    const orphans = [];
    for (const file of tests) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8');
      for (const m of text.matchAll(IMPORTS)) {
        const distPath = m[1];
        const src = sourceFor(distPath);
        // `.d.ts`-only and index re-exports are still sources; anything with no `.ts` at all is the case.
        if (!existsSync(join(REPO_ROOT, src))) orphans.push(`${file} → ${distPath} (no ${src})`);
      }
    }

    assert.deepEqual(orphans, [],
      'these import a compiled file whose SOURCE is gone:\n  ' + orphans.join('\n  ')
      + '\n\n      `tsc` writes outputs and never removes the ones whose sources were renamed away, so an '
      + 'import like this keeps passing locally against a module nothing ships — and fails in CI, which '
      + 'builds clean. Worse on a SPLIT: the old file is the code as it was before it was divided, and the '
      + 'assertions pass against a version that no longer exists.');
  });

  it('and the scan can actually see a dist import', () => {
    // A FLOOR on the pattern itself. If `IMPORTS` ever stopped matching, the case above would report clean
    // having examined nothing — the same defect it exists to catch, one level up.
    const tests = trackedSources(['testing'], { ext: ['.test.js', '.mjs'], floor: 100 });
    // Built FRESH per file: a shared /g regex carries `lastIndex` between calls, so every other file would
    // be skipped and the count would come back about half — and half of a floor still passes.
    const withImports = tests.filter(f => new RegExp(IMPORTS.source).test(readFileSync(join(REPO_ROOT, f), 'utf8')));
    assert.ok(withImports.length > 10,
      `only ${withImports.length} test(s) appear to import from server/dist; the pattern is broken`);
  });
});
