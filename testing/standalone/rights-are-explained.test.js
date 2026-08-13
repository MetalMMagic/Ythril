/**
 * Every right in the grid says what it grants, and says it from the enforcing table.
 *
 * ## The gap
 *
 * Owner, 2026-08-12: *"tooltips are missing on what a right grants (non-technical and technical endpoints
 * list)"*. `grep -c "tokens.rights" en.json` was **3**, none of them an explanation — so an operator setting a
 * token's rights chose from a 4×4 grid of bare words. The area names were not even translated; they were the
 * code's own identifiers, `dataQuality` included.
 *
 * ## Why the technical half must be DERIVED
 *
 * `ROUTE_RIGHTS` in `server/src/auth/space-rights.ts` is the table the server enforces against — 76 routes,
 * each with its area and the lowest rung that reaches it. That is the only description of a right that cannot
 * be wrong. A list typed into the client would be a second copy of a security control, and when two copies
 * disagree the one people read is the wrong one. So the client is served the table and must not carry its own.
 *
 * ## Why the non-technical half is 4 + 3 strings and not 16
 *
 * A rung means the same thing in every area, because each rung CONTAINS the one below. Sixteen area×rung
 * sentences would be twelve restatements of four ideas, and restatements drift. So: one sentence per area, one
 * per rung above `none`.
 *
 * Run: node --test testing/standalone/rights-are-explained.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SHAPE = 'server/src/config/rights-shape.ts';
const ROUTES = 'server/src/auth/space-rights.ts';
const TOKENS_API = 'server/src/api/tokens.ts';
const MATRIX = 'client/src/app/pages/settings/rights-matrix.component.ts';
const CATALOG = 'client/src/app/pages/settings/rights-catalog.service.ts';
const LOCALES = ['en', 'de', 'pl'];

const read = (p) => readFileSync(p, 'utf8');
const stripComments = (src) => src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** The areas and rungs, parsed from the one module that declares them. */
function model() {
  const src = read(SHAPE);
  const grab = (name) => {
    const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const;`).exec(src);
    assert.ok(m, `${name} not found in ${SHAPE}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  };
  const areas = grab('SPACE_AREAS');
  const rungs = grab('RUNGS');
  assert.ok(areas.length >= 4, `parsed only ${areas.length} areas — the parser is stale`);
  assert.ok(rungs.includes('none'), 'the rung list should contain `none`');
  return { areas, rungs };
}

describe('the rights grid explains itself', () => {
  const { areas, rungs } = model();

  it('every area has a label and a description, in every locale', () => {
    for (const loc of LOCALES) {
      const keys = JSON.parse(read(`client/public/assets/i18n/${loc}.json`));
      for (const a of areas) {
        for (const key of [`tokens.rights.area.${a}`, `tokens.rights.area.${a}.desc`]) {
          const v = keys[key];
          assert.ok(typeof v === 'string' && v.trim().length > 0,
            `${loc}: \`${key}\` is missing — a fifth area cannot ship without saying what it grants`);
        }
      }
      // The label must not simply be the code identifier handed back. `dataQuality` is the tell.
      assert.notEqual(keys[`tokens.rights.area.dataQuality`], 'dataQuality',
        `${loc}: the dataQuality label is still the code identifier`);
    }
  });

  it('every rung above `none` has a description, in every locale', () => {
    for (const loc of LOCALES) {
      const keys = JSON.parse(read(`client/public/assets/i18n/${loc}.json`));
      for (const r of rungs.filter(r => r !== 'none')) {
        const v = keys[`tokens.rights.rung.${r}.desc`];
        assert.ok(typeof v === 'string' && v.trim().length > 0,
          `${loc}: \`tokens.rights.rung.${r}.desc\` is missing`);
      }
    }
  });

  it('the server serves the enforcing table, to any authenticated caller', () => {
    const src = stripComments(read(TOKENS_API));
    const route = /tokensRouter\.get\('\/rights-catalog'[\s\S]{0,600}?\}\);/.exec(src);
    assert.ok(route, 'GET /api/tokens/rights-catalog not found');
    assert.match(route[0], /ROUTE_RIGHTS/, 'the catalog must be built from ROUTE_RIGHTS, not from a literal');
    assert.match(route[0], /requireAuth/, 'the catalog must be readable by an authenticated caller');
    assert.ok(!/requireAdmin/.test(route[0]),
      'the catalog must NOT be admin-gated — the caller who most needs it is the non-admin reading their own rights');
  });

  it('the client carries NO copy of the route table', () => {
    // The whole point: a second list of endpoints is a second copy of a security control. Any client file
    // spelling out a governed API path alongside an area name would be exactly that.
    for (const f of [MATRIX, CATALOG]) {
      const src = stripComments(read(f));
      assert.ok(!/'\/api\/brain\/spaces/.test(src),
        `${f} spells out a governed route — the endpoint list must come from the server`);
    }
    assert.match(stripComments(read(CATALOG)), /rights-catalog/, 'the catalog service must fetch the catalog');
  });

  it('the endpoint list is CUMULATIVE, because a rung contains the one below', () => {
    // Listing only what a rung adds would understate the grant. On a permissions screen the safe direction to
    // be wrong in is to overstate, so this pins the comparison rather than an equality.
    const src = stripComments(read(CATALOG));
    const fn = /routesFor\([\s\S]{0,700}?\n  \}/.exec(src);
    assert.ok(fn, 'routesFor() not found');
    assert.match(fn[0], /indexOf\(r\.needs\)\s*<=\s*order/,
      'routesFor must include every rung at or BELOW the one asked for');
    assert.ok(!/r\.needs === rung/.test(fn[0]),
      'an equality match would list only the routes added at that rung and understate the grant');
  });

  it('the grid renders the area labels through i18n, not raw', () => {
    // Scoped to the HEADER, not to the file. Asserting the key appears anywhere in the source passed happily
    // while the header printed the raw identifier, because the same key is also used by the explanation panel
    // below — the assertion was satisfied by a different element than the one it was about.
    const src = read(MATRIX);
    const thead = /<thead>([\s\S]{0,1400}?)<\/thead>/.exec(src);
    assert.ok(thead, 'could not find the table head');
    const head = thead[1];

    assert.match(head, /'tokens\.rights\.area\.' \+ a \| transloco/,
      'the column header must resolve a translation key');
    // The original defect: `<th>{{ a }}</th>` printed the code identifier. Matched as a bare interpolation
    // anywhere in the head, since the exact tag layout is not the thing that matters.
    assert.ok(!/\{\{\s*a\s*\}\}/.test(head),
      'the header must not print the raw area identifier');
  });

  it('every area in the model actually has routes to show', () => {
    // An area with no routes would render an explanation panel with an empty table, which reads as "grants
    // nothing" rather than "nobody classified this yet".
    const src = read(ROUTES);
    for (const a of areas) {
      const count = [...src.matchAll(new RegExp(`area: '${a}'`, 'g'))].length;
      assert.ok(count > 0, `no route is classified as \`${a}\` — its explanation panel would be empty`);
    }
  });
});
