/**
 * The bundle budgets guard chunks that actually exist, and cover the app's own lazy routes.
 *
 * A `bundle`-type budget names a chunk. Angular does **not** complain when that name matches nothing —
 * the budget is simply never evaluated, the build is green, and the chunk it was supposed to guard grows
 * without limit. That is the same silent no-op the budgets were added to prevent, one level up.
 *
 * It is not hypothetical: the first draft of this budget set named `graph-component`, which is not a
 * chunk at all (Graph is `@defer`-loaded inside the Brain, so it lands in an unnamed chunk). It would
 * have sat there looking like protection.
 *
 * The other half is coverage: every lazily-routed page component should have a budget, so a new heavy
 * dependency shows up as a failed build rather than as a slow page nobody measured.
 *
 * Run: node --test testing/standalone/bundle-budget-coverage.test.js
 * (reads client/dist — run `npm run build:prod --workspace=client` first; preflight does)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const ANGULAR_JSON = 'client/angular.json';
const STATS_DIR = 'client/dist/browser';

let budgets, chunkNames;

before(() => {
  const cfg = JSON.parse(readFileSync(ANGULAR_JSON, 'utf8'));
  // Read the single project rather than hard-coding its name — a renamed project would otherwise make
  // this whole gate throw in `before` and cancel its tests, which reads as an error but not as a
  // budget failure.
  const project = cfg.projects[Object.keys(cfg.projects)[0]];
  budgets = project.architect.build.configurations.production.budgets;

  // Chunk NAMES are not in the filenames — they come from the build's own map. `.map` files are not
  // emitted in production, so the names are recovered from the lazy-route imports instead: Angular names
  // a lazy chunk after the component file it loads.
  chunkNames = new Set();
  if (existsSync(STATS_DIR)) {
    for (const f of readdirSync(STATS_DIR)) {
      if (f.endsWith('.js')) chunkNames.add(f);
    }
  }
});

/**
 * Every component reached by a dynamic `import()` anywhere in the client — each becomes its own lazy
 * chunk, named after the file with dots replaced by hyphens (`brain.component.ts` → `brain-component`).
 *
 * The whole source tree, not just `app.routes.ts`: the Files manager is not a route at all, it is
 * `@defer`-loaded inside the Brain, and reading only the route table would have called its budget bogus.
 */
function lazyComponents() {
  const found = new Set();
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.ts') || e.name.endsWith('.spec.ts')) continue;
      const src = readFileSync(p, 'utf8');
      // Dynamic import — a lazy route.
      for (const m of src.matchAll(/import\('[^']*\/([a-z0-9-]+)\.component'\)/g)) {
        found.add(`${m[1]}-component`);
      }
      // `@defer` splits a STATICALLY imported component out too, which is how the Files manager gets
      // its own chunk without ever appearing in the route table. Any static component import in a file
      // that uses @defer is a candidate.
      if (src.includes('@defer')) {
        for (const m of src.matchAll(/from '[^']*\/([a-z0-9-]+)\.component'/g)) {
          found.add(`${m[1]}-component`);
        }
      }
    }
  };
  walk('client/src/app');
  return [...found];
}

describe('bundle budgets', () => {
  it('every bundle budget names a component that is lazily loaded somewhere', () => {
    // A cheap first filter only. Whether Angular actually emits a separately NAMED chunk for it is
    // decided by the build, not by the source — so preflight re-checks each name against the real chunk
    // table after `build:prod`. This catches the obvious case: a budget naming a component that is not
    // lazily loaded at all can never match anything.
    const named = budgets.filter(b => b.type === 'bundle').map(b => b.name);
    assert.ok(named.length > 0, 'no bundle budgets configured');
    const known = new Set(lazyComponents());
    for (const name of named) {
      assert.ok(known.has(name),
        `bundle budget "${name}" names no lazily-loaded component. Known: ${[...known].join(', ')}`);
    }
  });

  it('there is an `any` budget, so an UNNAMED chunk cannot grow without limit either', () => {
    // The named budgets only cover our own pages. The biggest chunks in this app are third-party
    // (exceljs, katex, mermaid diagram splits) and land unnamed; `any` is what bounds those.
    const any = budgets.find(b => b.type === 'any');
    assert.ok(any, 'no `any` budget — an unnamed vendor chunk has no ceiling at all');
    assert.ok(any.maximumError, '`any` needs an error threshold, not just a warning');
  });

  it('the initial-bundle budget survived — per-chunk limits are an addition, not a replacement', () => {
    const initial = budgets.find(b => b.type === 'initial');
    assert.ok(initial, 'no initial budget — the whole point of lazy loading is that this stays small');
    assert.ok(initial.maximumWarning && initial.maximumError, 'initial needs both thresholds');
  });

  it('the app pages that carry real weight are named individually', () => {
    // Not "every page needs a budget" — most are a few kB and an `any` ceiling covers them fine. These
    // four are the ones that have actually grown: the Brain (once 2x the initial bundle), the space
    // settings DIALOG, the Files manager (exceljs, mermaid) and Media Processing.
    //
    // `spaces-component` used to be on this list and is deliberately not any more: the space settings
    // dialog is now deferred and shared by two hosts, which moved 217 kB of schema editor, duplicate rules
    // and danger zone out of the spaces route and into its own chunk. The route dropped to ~41 kB and
    // stopped being emitted under that name at all — so the budget guarding it named nothing, which is the
    // exact failure the sibling gate in preflight catches. The weight did not vanish; it moved, and the
    // ceiling moved with it.
    const named = new Set(budgets.filter(b => b.type === 'bundle').map(b => b.name));
    for (const heavy of ['brain-component', 'space-settings-popup-component', 'file-manager-component', 'media-processing-page-component']) {
      assert.ok(named.has(heavy), `${heavy} has grown before and needs its own ceiling`);
    }
  });
});
