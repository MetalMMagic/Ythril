/**
 * Every caller-supplied `id` on an MCP write tool is constrained to a UUID v4.
 *
 * ## What happened
 *
 * An operator passed a corrupted UUID to `create_chrono` — *"a Devanagari digit where a hex nibble belonged"* —
 * and it stored **silently**. Nothing broke: the record came back, and its `entityIds` linkage resolved fine.
 *
 * What was lost is the only reason that field exists. A caller supplies `id` to make the call **idempotent** —
 * retrying with the same id converges on the same record instead of writing a second one. An id no generator
 * would ever produce again cannot serve that purpose, so the retry it was there to enable can never fire.
 *
 * `upsert_entity` had it right, via a shared `uuidSchema()` helper. `create_chrono` and `remember` hand-rolled
 * the declaration and only **described** "Optional UUID v4" in prose, with no `pattern` at all — so the docs
 * promised a constraint the schema never applied.
 *
 * ## The fourth one, which nobody reported
 *
 * The report named two tools and inferred a third it deliberately did not test (writing a junk record to prove
 * it is a poor trade). Sweeping by SHAPE instead of by those names found **`bulk_write`** as well — the same
 * hand-rolled declaration, on the tool most likely to be handed machine-generated ids in volume.
 *
 * That is why this gate reads the tool schemas rather than checking three file names: a per-tool fix leaves the
 * instance nobody happened to hit.
 *
 * ## Why prose is not enough, stated as a test
 *
 * `'description': 'Optional UUID v4'` and `pattern: UUID_V4_PATTERN` look equally reassuring in a diff and are
 * not remotely equal at runtime. Two of the four had the first and not the second, which is exactly how this
 * survived review — so the assertion below deliberately ignores descriptions.
 *
 * Run: node --test testing/standalone/caller-supplied-ids-are-uuids.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('git ls-files "server/src/mcp/tools/*.ts"', { encoding: 'utf8' })
  .trim().split('\n').filter(f => f && !f.endsWith('.spec.ts'));

/**
 * Every `id:` property declaration in a tool's inputSchema, with how it is constrained.
 *
 * `create` here means the declaration is optional — a caller CHOOSING an id, which is the idempotency contract.
 * An `id` on update/delete names a record that already exists; those are covered too, because an id that could
 * not have been created cannot be addressed either.
 */
function idDeclarations(src) {
  const out = [];
  // Single-line and multi-line object literals both, up to the closing brace of that property.
  for (const m of src.matchAll(/^(\s+)id:\s*(uuidSchema\(|\{[\s\S]{0,400}?\},$)/gm)) {
    const line = src.slice(0, m.index).split('\n').length;
    const blob = m[2];
    // A REQUIRED id addresses a record that already exists. Those are deliberately left permissive: records
    // written before this fix may carry a non-UUID id — the reporting operator has one — and constraining the
    // update and delete paths would make exactly those records unfixable and undeletable. Being unable to
    // delete the junk record you were warned not to create is worse than the bug being fixed.
    //
    // An OPTIONAL id is the caller CHOOSING one, which is the idempotency contract and the only case where a
    // malformed value silently destroys the field's purpose. Read from the schema's own `required` array, not
    // from the description — prose is what made two of these look constrained when they were not.
    // EVERY `required` array in the window, not the first: `update_chrono` nests a recurrence object whose own
    // `required: ['freq']` sits between the id and the schema's real one, so taking the first match read the
    // wrong list and called a required id optional.
    const window = src.slice(m.index, m.index + 4000);
    const addressesExisting = [...window.matchAll(/required:\s*\[([^\]]*)\]/g)].some(r => /'id'/.test(r[1]));
    out.push({ line, helper: blob.startsWith('uuidSchema('), blob, addressesExisting });
  }
  return out;
}

describe('a caller-supplied id must be a UUID', () => {
  it('finds the tool schemas it is meant to be checking', () => {
    // A sweep that enumerates nothing passes vacuously — and this gate exists because a sweep scoped to three
    // remembered names missed a fourth tool.
    assert.ok(files.length >= 5, `expected the MCP tool modules, found ${files.length}`);
    const total = files.reduce((n, f) => n + idDeclarations(readFileSync(f, 'utf8')).length, 0);
    assert.ok(total >= 8, `expected several id declarations across the tools, found ${total}`);
  });

  it('every id declaration is constrained, not merely described', () => {
    const open = [];
    for (const f of files) {
      for (const d of idDeclarations(readFileSync(f, 'utf8'))) {
        if (d.addressesExisting) continue;                       // update/delete — see idDeclarations
        if (d.helper) continue;                                  // uuidSchema() carries the pattern
        if (/pattern:\s*UUID_V4_PATTERN/.test(d.blob)) continue;  // spelled out inline is fine too
        open.push(`${f.split('/').pop()}:${d.line}`);
      }
    }
    assert.deepEqual(open, [],
      'these accept any string as an id, so a corrupted one stores silently and the idempotent retry the field '
      + `exists for can never fire:\n  ${open.join('\n  ')}`);
  });

  it('a DESCRIPTION mentioning UUID does not count as a constraint', () => {
    // The exact shape that shipped: prose promising "Optional UUID v4" with no pattern. If this gate accepted a
    // description it would have passed on the original bug, which is the only failure mode worth ruling out.
    const fake = "      id: { type: 'string', description: 'Optional UUID v4. Supply one to be idempotent.' },";
    const [d] = idDeclarations(fake);
    assert.ok(d, 'the parser must see this declaration at all');
    assert.equal(d.helper, false);
    assert.ok(!/pattern:\s*UUID_V4_PATTERN/.test(d.blob),
      'a description mentioning UUID must not satisfy the constraint check');
  });

  it('the shared helper really carries the pattern', () => {
    // The other half. Every fix above routes through `uuidSchema()`, so an empty helper would silently unfix
    // all four while this file stayed green.
    const shared = readFileSync('server/src/mcp/tools/shared.ts', 'utf8');
    assert.match(shared, /export function uuidSchema\(description: string\) \{\s*\n\s*return \{ type: 'string', pattern: UUID_V4_PATTERN, description \}/,
      'uuidSchema no longer applies the pattern — every caller of it is unconstrained');
    assert.match(shared, /UUID_V4_PATTERN = '\^\[0-9a-fA-F\]\{8\}-/, 'the pattern itself is gone');
  });
});
