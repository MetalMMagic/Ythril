/**
 * Changing a record's `type` must validate against the type it will HAVE, not the one it had.
 *
 * ## The defect
 *
 * A memory's `type` selects which schema applies — `typeSchemas.memory[type]` — so re-typing a record changes
 * which rules it must satisfy. Both doors validated the after-state against `record.type`, the stored one, so
 * the destination schema's allowlist, required properties and enums were **never consulted** and the write
 * succeeded regardless.
 *
 * The entity route had it right the whole time, twenty files away:
 * `const resultType = updates.type ?? existing.type` (`api/brain/entities.ts:305`). One rule, two
 * implementations, and the weaker one silent — this repo's most-produced defect, on a field whose entire job is
 * to select the rules.
 *
 * ## The parity half
 *
 * `update_memory` did not declare `type` at all, under `additionalProperties: false` — so the MCP door
 * **hard-refused** a parameter the REST door accepted and applied. Fixing only the validation would have left
 * one door unable to reach the bug.
 *
 * ## Why the BEFORE side keeps the stored type
 *
 * Deliberate, and asserted below so it is not "corrected" later: the before-state describes the record as
 * stored, which is what lets `classifyUpdateViolations` tell a violation this patch INTRODUCED from one it
 * merely inherited. Validating both sides against the destination would report pre-existing violations as new.
 *
 * Run: node --test testing/standalone/retyping-validates-the-destination-type.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { argumentsOf } from './_structural-window.mjs';

const DOORS = [
  { name: 'REST', file: 'server/src/api/brain/memories.ts' },
  { name: 'MCP', file: 'server/src/mcp/tools/memory.ts' },
];

/** The two `validateMemory` calls that form one `classifyUpdateViolations` comparison. */
function comparisonArgs(src) {
  const at = src.indexOf('classifyUpdateViolations(');
  assert.notEqual(at, -1, 'no classifyUpdateViolations call — re-point this gate');
  const args = argumentsOf(src, at + 'classifyUpdateViolations'.length, 'the comparison');
  assert.equal(args.length, 3, `expected (meta, before, after), got ${args.length} arguments`);
  return { before: args[1], after: args[2] };
}

describe('re-typing validates the destination type', () => {
  for (const door of DOORS) {
    const src = stripComments(readFileSync(door.file, 'utf8'));

    it(`${door.name}: the AFTER side uses the type the record will have`, () => {
      const { after, before } = comparisonArgs(src);
      /*
       * Asserted as "not the stored type", rather than as one spelling of the fix. REST names an intermediate
       * (`const resultType = updates.type ?? mem.type`) and MCP inlines the same expression; a first version
       * requiring `updates.type ??` inside the argument passed on one door and failed on the other while both
       * were correct.
       */
      const storedTypeExpr = /type:\s*(mem|found\.record|existing)\.type\b/;
      assert.match(before, storedTypeExpr, `the before side should read the stored type — got:\n${before}`);
      assert.doesNotMatch(
        after, storedTypeExpr,
        `${door.name} validates the after-state against the STORED type, so changing a memory's type never `
        + 'consults the destination schema — its allowlist, required properties and enums are not applied and '
        + `the write succeeds anyway.\n\nafter-side argument:\n${after}`,
      );
      assert.match(
        src, /updates\.type\s*\?\?/,
        `${door.name} never considers updates.type when deciding which schema applies`,
      );
    });

    it(`${door.name}: the BEFORE side still uses the stored type`, () => {
      const { before } = comparisonArgs(src);
      assert.doesNotMatch(
        before, /updates\.type/,
        'the before-state must describe the record AS STORED. Validating it against the destination type would '
        + 'report pre-existing violations as ones this patch introduced, which is the distinction '
        + `classifyUpdateViolations exists to draw.\n\nbefore-side argument:\n${before}`,
      );
    });
  }

  it('both doors accept `type` on update — the capability exists on each', () => {
    // The MCP tool declared no `type` under additionalProperties:false, so it refused what REST applied.
    const mcp = stripComments(readFileSync('server/src/mcp/tools/memory.ts', 'utf8'));
    const at = mcp.indexOf("name: 'update_memory'");
    assert.notEqual(at, -1, 'update_memory is gone — re-point this gate');
    const tool = mcp.slice(at, mcp.indexOf("name: '", at + 10) === -1 ? undefined : mcp.indexOf("name: '", at + 10));
    assert.match(
      tool, /\btype:\s*\{/,
      'update_memory must declare `type`. Under additionalProperties:false an undeclared parameter is a hard '
      + 'refusal at the dispatcher, so the MCP door offered strictly less than REST for the same capability.',
    );
  });
});
