/**
 * A component does not declare members that nothing reads.
 *
 * ## Why this is worth a gate rather than a lint rule
 *
 * TypeScript will not tell you: a public class member is part of an API by definition, and a template is a
 * string as far as the compiler is concerned. So an extraction leaves the original behind — the markup moves
 * to a child component, the members it used stay, and nothing anywhere says so.
 *
 * `graph.component.ts` was carrying six when this was written, and they are the two shapes it takes:
 *
 *   - **Never wired in at all.** `panelTitle` was a computed that returned exactly what the panel headers
 *     render inline. It was written for the extraction that would use it, and the extraction did not happen,
 *     so for weeks the page had one right answer computed and a second one hand-written twice.
 *   - **Left behind by a move.** `toggleSort` and `sortArrow` sorted a detail table that now lives in a child
 *     component with no sorting. Both were still covered by the characterization suite, so the tests went on
 *     passing against code no user could reach — which is the worst outcome, because green tests are read as
 *     evidence the behaviour is still there.
 *
 * `nodeColor` (a near-copy of `panelColor`), `onSearchInput` and `objectKeys` (the card kept its own) were the
 * rest.
 *
 * ## Scoped, deliberately
 *
 * Only the graph page, and only members declared at one indent inside the class. A repo-wide version would
 * need to model every way a member can be reached — a parent's template binding, a spec, `@Input`,
 * `@ViewChild` — and each of those is a place to be wrong. This asks a narrower question with an exact answer:
 * does anything in the client mention this name at all?
 *
 * Run: node --test testing/standalone/a-component-declares-nothing-it-never-reads.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'client/src/app/pages/graph/graph.component.ts';

/** Decorator keys and lifecycle hooks — declared to be CALLED by Angular, never by us. */
const NOT_OURS = new Set([
  'selector', 'standalone', 'changeDetection', 'imports', 'providers', 'host', 'styles', 'template',
  'constructor', 'ngOnInit', 'ngAfterViewInit', 'ngOnDestroy', 'ngOnChanges', 'ngAfterViewChecked',
]);

/** Members declared at one indent inside the class body. */
function declaredMembers(src) {
  const found = new Set();
  const re = /^ {2}(?:readonly |private |protected |public |async |static )*([a-zA-Z_]\w*)\s*[(=:]/gm;
  let m;
  while ((m = re.exec(src)) !== null) if (!NOT_OURS.has(m[1])) found.add(m[1]);
  return [...found];
}

describe('the graph page declares nothing it never reads', () => {
  it('every member is referenced somewhere', () => {
    const src = readFileSync(FILE, 'utf8');
    const orphans = [];
    const specOnly = [];

    for (const name of declaredMembers(src)) {
      // More than one occurrence in its own file means the declaration is not the only mention — the inline
      // template lives in this same file, so a bound member is found here.
      const inFile = (src.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (inFile > 1) continue;

      /*
       * One occurrence in this file is not proof on its own: a member can be read by another component's
       * template, or exercised by a spec. `git grep -w` over the whole client answers that — and it is `git`
       * rather than a directory walk because a gitignored file is not part of the repo.
       */
      let elsewhere = '';
      try {
        elsewhere = execFileSync('git', ['grep', '-lw', name, '--', 'client/src'], { encoding: 'utf8' });
      } catch { /* no matches at all — git grep exits 1, which is the answer */ }
      const others = elsewhere.split('\n').filter(f => f && !f.endsWith('graph.component.ts'));
      if (others.length === 0) { orphans.push(name); continue; }

      /*
       * Read ONLY by a spec is the worse case, not a lesser one: the member is unreachable in the product and
       * a green suite is being read as evidence that the behaviour is still there. `toggleSort` and
       * `sortArrow` sat like this after the detail table moved to a child that does not sort.
       */
      if (others.every(f => f.endsWith('.spec.ts'))) specOnly.push(name);
    }

    assert.deepEqual(orphans, [],
      `declared and read by nothing — an extraction left them behind, or they were never wired in:\n`
      + orphans.map(n => `        ${n}`).join('\n'));

    assert.deepEqual(specOnly, [],
      `declared and read only by a spec, so the product cannot reach them and the suite says otherwise:\n`
      + specOnly.map(n => `        ${n}`).join('\n'));
  });
});
