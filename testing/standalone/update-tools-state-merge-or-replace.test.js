/**
 * Each `update_*` tool says whether its list fields MERGE or REPLACE — and says the same thing the store does.
 *
 * ## The trap
 *
 * Four tools take the same-looking arguments and do not agree:
 *
 * | Tool | `tags` | `properties` | can unset? |
 * | --- | --- | --- | --- |
 * | `update_entity` | merge | merge | `deleteFields` |
 * | `update_edge` | merge | merge | `deleteFields` |
 * | `update_memory` | **replace** | merge | `deleteFields` |
 * | `update_chrono` | **replace** | merge | **no way at all** |
 *
 * The memory/chrono split is deliberate and `brain/memory.ts` says so in as many words — both halves were
 * documented, so both were kept and pinned rather than silently unified. That makes it permanent, which makes
 * it something a caller has to be TOLD: sending `tags: ["b"]` adds a tag on an entity and destroys the other
 * tags on a memory, with no error either way.
 *
 * `update_chrono` having no `deleteFields` is the sharper one. Its `properties` merge, so a key written once
 * cannot be removed through the tool at all — there is no absence that means "delete" and no path that unsets.
 *
 * ## Why the assertions read the STORE
 *
 * A test that only checked the descriptions would pass on four confident sentences that had drifted from the
 * code together. `mergeTagsOrKeep` in the store is the fact; the description is the claim. This pins the claim
 * to the fact, in the direction that matters — if someone unifies the behaviour, the prose fails until it is
 * rewritten.
 *
 * Run: node --test testing/standalone/update-tools-state-merge-or-replace.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const src = (p) => readFileSync(p, 'utf8');

/** One tool object's description, `name:` to the next sibling key. Comments stripped. */
const description = (file, name) => {
  const s = stripComments(src(file));
  const at = s.indexOf(`name: '${name}'`);
  assert.ok(at > 0, `${name} not found in ${file} — the scanner is wrong, not the code`);
  const d = s.indexOf('description:', at);
  const end = s.slice(d).search(/\n {2}(mutating|spaceRequired|admin|spaceAdmin|inputSchema|async handle):/);
  assert.ok(end > 0, `could not find the end of ${name}'s description`);
  return s.slice(d, d + end);
};

const TOOLS = {
  update_entity: description('server/src/mcp/tools/entity.ts', 'update_entity'),
  update_edge: description('server/src/mcp/tools/edge.ts', 'update_edge'),
  update_memory: description('server/src/mcp/tools/memory.ts', 'update_memory'),
  update_chrono: description('server/src/mcp/tools/chrono.ts', 'update_chrono'),
};

describe('the store still behaves the way the descriptions claim', () => {
  it('entity and edge updates MERGE tags', () => {
    // If this stops being true, the two descriptions below become wrong and their assertions must change with
    // it — which is the whole point of asserting on the store rather than only on the prose.
    for (const f of ['server/src/brain/entities.ts', 'server/src/brain/edges.ts']) {
      assert.match(stripComments(src(f)), /mergeTagsOrKeep\(existing\.tags, updates\.tags\)/,
        `${f} no longer merges tags — the update tool description is now a lie`);
    }
  });

  it('memory and chrono updates REPLACE tags', () => {
    assert.match(stripComments(src('server/src/brain/memory.ts')),
      /\$set\['tags'\] = updates\.tags/, 'memory tags are a straight overwrite');
    // Chrono writes every supplied field through a generic loop, and only `properties` is pulled out of it.
    const chrono = stripComments(src('server/src/brain/chrono.ts'));
    assert.match(chrono, /for \(const \[k, v\] of Object\.entries\(updates\)\)/, 'the generic overwrite loop');
    assert.match(chrono, /\$set\['properties'\] = mergedUpdateProps/, 'with properties lifted out to merge');
  });

  it('all four MERGE properties', () => {
    for (const f of ['server/src/brain/entities.ts', 'server/src/brain/edges.ts',
      'server/src/brain/memory.ts', 'server/src/brain/chrono.ts']) {
      assert.match(stripComments(src(f)), /mergePropertiesOrKeep\(/,
        `${f} must merge properties — replacing them destroys keys the caller never named`);
    }
  });
});

describe('every update tool states which it does', () => {
  for (const [name, d] of Object.entries(TOOLS)) {
    it(`${name} names the behaviour of BOTH tags and properties`, () => {
      assert.match(d, /MERGE|REPLACE|MERGED|REPLACES/,
        'a caller constructing arguments cannot infer this from the type');
      assert.match(d, /properties/i, 'properties must be described, not just listed');
      assert.match(d, /tags/i, 'tags must be described, not just listed');
    });
  }

  it('the two that REPLACE tags say so in capitals, because it destroys data', () => {
    assert.match(TOOLS.update_memory, /TAGS REPLACE HERE/, 'the difference has to be unmissable');
    assert.match(TOOLS.update_chrono, /REPLACE/, 'chrono replaces tags, entityIds and memoryIds');
  });

  it('the two that MERGE tags say how to remove one', () => {
    // A merge with no stated removal path reads as "there is no way to remove a tag", which is wrong and
    // would send a caller to delete-and-recreate.
    for (const name of ['update_entity', 'update_edge']) {
      assert.match(TOOLS[name], /deleteFields/, `${name} must point at the only way to unset`);
    }
  });

  it('update_chrono admits it cannot unset anything at all', () => {
    // The finding this file exists for. Merging properties plus no `deleteFields` means a key written once is
    // permanent, and nothing anywhere said so.
    assert.match(TOOLS.update_chrono, /NO `deleteFields` ON THIS TOOL/,
      'the limitation must be stated where a caller looks for the parameter');
    assert.match(TOOLS.update_chrono, /CANNOT be removed/, 'and its consequence spelled out');
  });

  it('and that claim is still true — chrono really has no deleteFields', () => {
    // Pinned against the schema, so the day it gains one this description fails instead of misinforming.
    // From `inputSchema:` onward, NOT the whole tool — the description above deliberately contains the word
    // `deleteFields` in the paragraph explaining its absence, and reading the tool whole made this assertion
    // fire on the very sentence it is there to protect.
    const chronoTool = stripComments(src('server/src/mcp/tools/chrono.ts'));
    const at = chronoTool.indexOf("name: 'update_chrono'");
    const schemaAt = chronoTool.indexOf('inputSchema:', at);
    assert.ok(schemaAt > at, 'update_chrono has no inputSchema — the scanner is wrong, not the code');
    const end = chronoTool.indexOf('\nexport const ', at);
    assert.doesNotMatch(chronoTool.slice(schemaAt, end === -1 ? undefined : end), /deleteFields/,
      'update_chrono gained deleteFields — delete the paragraph saying it has none');
  });
});

describe('the excludeFromVectorSearch answer is stated on every tool that offers it', () => {
  // Owner, 2026-08-15: *"excludefromvector does also exclude from recalls traversal? ambigous and i want
  // entries to be findable via traversal even if they are not embedded themselves."* The behaviour was
  // already right; the sentence saying so existed nowhere, which is why the question had to be asked at all.
  for (const [name, d] of Object.entries(TOOLS)) {
    it(`${name} says traversal still reaches an excluded record`, () => {
      assert.match(d, /traverse|_graph|graph/i,
        'the owner asked this exact question — the answer belongs where the parameter is described');
      assert.match(d, /RANK/,
        'excluded means "cannot be ranked by meaning", not "removed from search"');
    });
  }
});
