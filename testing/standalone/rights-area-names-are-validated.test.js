/**
 * An unknown rights AREA must be a 400 that names the valid ones — not a 200 that grants nothing.
 *
 * ## What happened
 *
 * `POST` and `PATCH /api/tokens` validated the rung VALUES against `none|read|write|admin` and left the area
 * NAME unvalidated. So `{"brain": "write"}` stored happily at **200** and granted nothing, because the real
 * area is `knowledge`.
 *
 * An operator wrote exactly that onto a live token while probing and **took an agent offline for four
 * minutes**. The only thing in the whole system that named the true area was a later 403's own wording. Their
 * note: *"A 400 naming the valid areas would have cost us one request instead of six, and would not have taken
 * an agent offline."*
 *
 * It is the same conflation fixed for token mints in 2.6.0 — unknown keys accepted and silently dropped — one
 * level deeper. Fixing the outer shape and leaving the inner one is how a bug class survives its own fix.
 *
 * ## Why the list is now values, not just a type
 *
 * A TypeScript union cannot validate a request. There were **four** hand-written copies of these names — the
 * type, and three `AREAS` arrays — and nothing compared any copy to any other, which is what let the validator
 * be written without them. `SPACE_AREAS` is the one list; the type is derived from it, and the validator and
 * the guards import it.
 *
 * Run: node --test testing/standalone/rights-area-names-are-validated.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let SPACE_AREAS, RUNGS;

const strip = s => s.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = () => strip(readFileSync('server/src/api/tokens.ts', 'utf8'));

describe('rights area names are validated, not merely typed', () => {
  before(async () => {
    ({ SPACE_AREAS, RUNGS } = await import('../../server/dist/config/rights-shape.js'));
  });

  it('the areas are VALUES, so a validator can use them', () => {
    assert.deepEqual([...SPACE_AREAS], ['knowledge', 'files', 'schema', 'dataQuality']);
    assert.deepEqual([...RUNGS], ['none', 'read', 'write', 'admin']);
  });

  it('every rights schema validates the area KEY, not only the rung value', () => {
    const src = tokens();
    // Only `floor` maps areas directly. `perSpace`'s OUTER key is a space id and must stay `z.string()` — a
    // space id is caller-chosen text, not an enum. It is the INNER map that names areas, which is why the
    // strict count below is what proves the fix rather than the absence of `z.string()`.
    const looseFloor = [...src.matchAll(/floor:\s*z\.record\(z\.string\(\)/g)].length;
    assert.equal(looseFloor, 0,
      'floor accepts any area name — the values were checked and the keys were not, which is how '
      + '{"brain":"write"} stored at 200 and granted nothing');
    assert.match(src, /perSpace:\s*z\.record\(z\.string\(\),\s*z\.record\(z\.enum\(SPACE_AREAS\)/,
      'perSpace keys on a space id and its INNER map keys on an area — that inner map is the one that was open');
    const strict = [...src.matchAll(/z\.record\(z\.enum\(SPACE_AREAS\)/g)].length;
    assert.ok(strict >= 4, `expected the four area maps to use z.enum(SPACE_AREAS), found ${strict}`);
  });

  it('the schemas import the shared list rather than spelling the names again', () => {
    assert.match(tokens(), /import \{[^}]*SPACE_AREAS[^}]*\} from '\.\.\/config\/rights-shape\.js'/,
      'a fifth copy of the area names is a fifth thing to keep in step');
  });

  it('no module keeps its own copy of the area names', () => {
    // Four copies existed. Nothing compared them, which is exactly why the validator could be written without
    // any of them.
    for (const f of ['server/src/auth/floor-guard.ts', 'server/src/auth/mint-cap.ts', 'server/src/api/tokens.ts']) {
      const src = strip(readFileSync(f, 'utf8'));
      assert.ok(!/\['knowledge',\s*'files',\s*'schema',\s*'dataQuality'\]/.test(src),
        `${f} spells the area names itself — import SPACE_AREAS instead`);
    }
  });

  it('the type is DERIVED from the list, so the two cannot drift', () => {
    const shape = strip(readFileSync('server/src/config/rights-shape.ts', 'utf8'));
    assert.match(shape, /export type SpaceArea = typeof SPACE_AREAS\[number\]/,
      'a hand-written union beside the array is two sources of truth for one fact');
  });
});
