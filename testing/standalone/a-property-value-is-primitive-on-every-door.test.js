/**
 * A property value must be a string, a number or a boolean — on EVERY door that writes one.
 *
 * Named for the RULE and not for the record type it was reported against: it began as
 * `an-entity-property-is-primitive-on-every-door` and covered file meta within the hour, because that is
 * where reading the source took it. A gate named after one instance of a class goes stale the first time
 * the class widens, and the name is the one place nothing checks.
 *
 * ## The report, and it is not a feature request
 *
 * The fleet integrator, 2026-09-02T1047Z, measured both writes minutes apart against one space in `strict`
 * mode, on the same record type and the same field name:
 *
 *   - `POST /api/brain/spaces/:id/entities` with a nested value → `400 "properties values must be string,
 *     number, or boolean"`. Reproduced on a declared type and an undeclared one, so the type is not what
 *     decides it.
 *   - `PATCH /api/brain/spaces/:id/entities/:id` with a nested value → **`200`**, and the object read back
 *     through `/query` intact, three levels deep.
 *
 * **They are explicitly NOT asking for nested properties.** Their words: *"a nested value in a property is
 * usually a graph in the wrong place"* — they moved the structure to records and edges and say the store was
 * right. What they asked for is that the two doors agree.
 *
 * ## Why the hole is worse than the refusal would have been
 *
 * *"The hole did not fail, it taught us the wrong contract."* They wrote through the permissive door, read it
 * back whole, concluded nested properties were supported, and built on that — so the failure was scheduled to
 * arrive later, on a different route, as a puzzle. A rule that one write path enforces and another does not is
 * how a caller learns a contract nobody meant to offer.
 *
 * ## And it was three doors, not two
 *
 * Reading the source for the reported pair found a third: `/api/brain/spaces/:id/bulk` casts the property bag
 * with no value check at all (`optProps` in `brain/bulk.ts`). A reporter names where they SAW it; the sweep
 * has to go wider than the report.
 *
 * **MCP was already correct on both of its doors** — `create_entity` and `update_entity` declare
 * `additionalProperties: { oneOf: [string, number, boolean] }`, and the dispatcher enforces the schema. So
 * this was MCP refusing what REST accepted, which is the parity rule broken in the direction that is hardest
 * to notice: the stricter door is the one nobody reports.
 *
 * ## The rule is ENTITY-only, deliberately, and that is not this gate's business to widen
 *
 * `04-brain-api.md` states it: *"unlike the entity endpoint, the memory/edge/chrono write paths don't reject
 * non-primitive values at the API layer"*. Widening it would refuse writes that work today, which is a
 * product decision and not a defect fix. What this gate holds is that the rule the product HAS is the same on
 * every door that has it.
 *
 * Run: node --test testing/standalone/a-property-value-is-primitive-on-every-door.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { trackedSources } from './_sources.mjs';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const code = (f) => stripComments(readFileSync(f, 'utf8'));

/** The one function every door must reach, rather than each carrying its own loop. */
const SHARED = 'primitivePropertyError';

describe('the primitive-property rule has ONE implementation', () => {
  it('the check is a shared function, not a loop copied per door', () => {
    // The inline loop was in the create route only. A second copy in the PATCH route would have closed the
    // reported gap and left the shape that produced it — and `bulk` would still have been the third door.
    const src = code('server/src/brain/property-values.ts');
    assert.match(src, new RegExp(`export function ${SHARED}\\b`),
      'the rule needs one home that every door can import');
    // It must actually test all three types, or it is a function that refuses nothing.
    for (const t of ['string', 'number', 'boolean']) {
      assert.match(src, new RegExp(`'${t}'`), `the check must permit ${t}`);
    }
  });

  it('every REST door that writes an entity property calls it', () => {
    // Named individually rather than swept, because what makes a door a door is that it accepts a body from
    // outside — a list derived from "files mentioning properties" would include the writers and the readers.
    const doors = {
      'server/src/api/brain/entities.ts': 'the create AND patch routes',
      'server/src/brain/bulk.ts': 'the bulk writer, which cast the bag with no value check at all',
      'server/src/api/brain/file-meta.ts': 'the file-meta patch route — the same defect, one type over',
      'server/src/api/files-upload.ts': 'the upload, which is the CREATE door for a file\'s properties',
    };
    for (const [f, why] of Object.entries(doors)) {
      assert.match(code(f), new RegExp(`\\b${SHARED}\\(`), `${f} — ${why}`);
    }
  });

  it('the create route no longer carries its own copy of the loop', () => {
    // The original. Left in place it would be a second implementation of a rule that now has a home, which
    // is the state this whole finding came out of.
    const src = code('server/src/api/brain/entities.ts');
    assert.doesNotMatch(src, /typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean'/,
      'the inline loop is still in the route beside the shared function');
  });

  it('BOTH entity routes call it — the pair the report is about', () => {
    /*
     * Counted rather than matched once, because one call in a file with two write routes is exactly the
     * state that was reported: the create route had it and the patch route did not.
     *
     * Two, not three: the merge route takes no property bag from the caller (it merges two stored records),
     * and the two DELETE routes take no body.
     */
    const calls = [...code('server/src/api/brain/entities.ts').matchAll(new RegExp(`\\b${SHARED}\\(`, 'g'))];
    assert.equal(calls.length, 2,
      `expected the create route and the patch route to call it, found ${calls.length} call(s)`);
  });

  // The count came out of this title: it said THREE doors while the docblock below names four and the body
  // checks four. A number in a title is a second copy of a fact the body already holds, and it is the copy
  // everybody afterwards believes (`Q-6`, 2026-09-07).
  it('FILE-META is covered too, on every door that writes it', () => {
    /*
     * The report named entities. Reading the source found the identical shape on file meta, and it would
     * have survived a fix scoped to what was reported — which is the whole reason a reporter's location is
     * a starting point rather than the boundary.
     *
     *   - `write_file` (MCP) DECLARED it and always refused: `additionalProperties` with the three types.
     *   - `update_file_meta` (MCP) declared `type: 'object'` and nothing else.
     *   - `PATCH .../file-meta/:path` (REST) checked the bag's shape and never looked inside it.
     *   - the UPLOAD, which is the create door for these fields, silently DROPPED a malformed bag and
     *     answered 2xx — the worst of the four, because an upload is not a cheap request to repeat.
     *
     * MCP is asserted on the SCHEMA rather than on a call: the dispatcher compiles each tool's published
     * schema and refuses what it does not match, so the declaration IS the enforcement there.
     */
    /*
     * **The COUNT is gone and the REST half is derived** (`Q-6`, 2026-09-07). `declarations.length === 2` is
     * a number the code already holds: a third MCP door declaring the types would be invisible to it, and one
     * that legitimately stops declaring fails on arithmetic rather than on the rule. A FLOOR plus the rule is
     * what the number was standing in for.
     *
     * The two REST files were the two somebody had open. The set is now every file route that writes a
     * properties bag, which is what the title claims.
     */
    const mcp = code('server/src/mcp/tools/file.ts');
    const declarations = [...mcp.matchAll(/additionalProperties:\s*\{\s*oneOf/g)];
    assert.ok(declarations.length >= 2,
      `expected write_file AND update_file_meta to declare the value types, found ${declarations.length}`);

    // One directory, so the floor is 10 rather than the default 100. A floor above what the scan can ever
    // return fails on correct code, which is how a guard gets deleted instead of corrected.
    const routes = trackedSources('server/src/api', { floor: 10 });

    const writesMeta = routes.filter(f => /file/i.test(f) && /properties/.test(code(f)));
    assert.ok(writesMeta.length >= 2,
      `only ${writesMeta.length} file route(s) touch a properties bag; the PATCH and the upload are the minimum`);
    for (const f of writesMeta) {
      assert.match(code(f), new RegExp(`\\b${SHARED}\\(`),
        `${f} writes a file-meta properties bag and must check the VALUES, not only the shape — a malformed `
        + 'bag dropped silently on an upload is the worst of the four, because an upload is not a cheap '
        + 'request to repeat');
    }
  });

  it('and update_file_meta no longer says REPLACES, which it has not done since 3.1', () => {
    // Found in the same reading. The tool's PROSE says `properties` merges, the implementation merges, and
    // the published schema's own description said the whole object is REPLACED and unnamed keys DELETED.
    // A schema description is what a caller reads while constructing arguments — the one surface where
    // being wrong is invisible, because nobody reports a behaviour they were told they did not have.
    const mcp = code('server/src/mcp/tools/file.ts');
    assert.doesNotMatch(mcp, /REPLACES the whole properties object/,
      'the published schema still tells a caller the opposite of what update_file_meta does');
  });

  it('the refusal message is unchanged, because a caller is parsing it', () => {
    // The integrator quoted it back verbatim and called it good: *"it says exactly what is allowed"*. A
    // reworded refusal is a silent break for anyone matching on it, and there is no reason to reword this one.
    assert.match(code('server/src/brain/property-values.ts'),
      /`properties` values must be string, number, or boolean/,
      'the message a caller already quotes must survive the extraction');
  });
});

describe('the rule itself, exercised rather than read', () => {
  /*
   * Source-reading proves a decision is MADE, not that it is CORRECT — every door calling one function is
   * worth nothing if that function refuses the wrong things. So the truth table runs.
   *
   * The nested cases are the ones the report is about, and the ARRAY case matters as much: an array is
   * `typeof 'object'`, so a check written as "not an object" would let `{tags: ['a']}` through while
   * refusing `{plan: {...}}` — two shapes of the same mistake with one of them passing.
   */
  let primitivePropertyError;
  before(async () => {
    ({ primitivePropertyError } = await import('../../server/dist/brain/property-values.js'));
  });

  it('permits the three primitives, and an empty bag', () => {
    for (const ok of [{}, { a: 'x' }, { a: 1 }, { a: true }, { a: 'x', b: 0, c: false }, { a: -1.5 }]) {
      assert.equal(primitivePropertyError(ok), null, `${JSON.stringify(ok)} must be accepted`);
    }
  });

  it('permits an ABSENT bag — a caller sending no properties has broken no rule', () => {
    // The distinction a PATCH needs: absent means "leave what is stored", not "store nothing".
    assert.equal(primitivePropertyError(undefined), null);
    assert.equal(primitivePropertyError(null), null);
  });

  it('refuses every non-primitive value, naming what is allowed', () => {
    for (const bad of [
      { plan: { phases: [] } },            // the reported shape, verbatim
      { phases: [1, 2, 3] },               // an array — `typeof 'object'`, and the near-miss case
      { a: null },                         // null is not a primitive here: it says nothing
      { a: undefined },                    // and neither is undefined
      { a: () => 1 },                      // a function survives JSON.parse from nothing, but not from code
    ]) {
      assert.equal(primitivePropertyError(bad), '`properties` values must be string, number, or boolean',
        `${JSON.stringify(bad)} must be refused with the message a caller already parses`);
    }
  });

  it('refuses a bag that is not a plain object, with the OTHER message', () => {
    // Two different refusals, because they are two different mistakes: the bag's shape, and a value's type.
    // Collapsing them would tell a caller who sent an array that their VALUES were wrong.
    for (const bad of [[], ['a'], 'x', 7, true]) {
      assert.equal(primitivePropertyError(bad), '`properties` must be a plain object',
        `${JSON.stringify(bad)} is not a property bag`);
    }
  });
});
