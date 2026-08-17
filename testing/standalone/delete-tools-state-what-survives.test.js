/**
 * Every `delete_*` tool says what it does NOT delete, and which of them can refuse.
 *
 * ## The asymmetry a caller cannot guess
 *
 * `delete_entity` consults `findEntityBacklinks` and, under strict linkage, refuses while anything still
 * points at the record. The other three delete unconditionally — strict linkage does not guard them at all.
 * So a chrono entry's `memoryIds` can be left holding the id of a memory that no longer exists, silently,
 * on a space configured to forbid exactly that shape.
 *
 * That is defensible (an edge IS the link; entity references are the structural ones) but it is not
 * inferable, and the four descriptions read identically before this change: *"Delete an X by ID. Creates a
 * tombstone for sync propagation."*
 *
 * ## The other three things a delete has to say
 *
 * - **Retire vs delete.** `suppressEmbeddings` is what "stop it appearing in search" actually means;
 *   deleting is a much larger change and there is no undo. A caller who wanted the first and used the second
 *   cannot get the record back.
 * - **The tombstone is why re-creating with the same id does not undo it.** The deletion propagates, and the
 *   tombstone outranks a later write of that id — which is the surprising half.
 * - **What survives.** Deleting an edge leaves both endpoints; deleting a chrono entry leaves everything it
 *   linked. Stated because "delete the relationship" and "delete the things" are one keystroke apart.
 *
 * Run: node --test testing/standalone/delete-tools-state-what-survives.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const description = (file, name) => {
  const s = stripComments(readFileSync(file, 'utf8'));
  const at = s.indexOf(`name: '${name}'`);
  assert.ok(at > 0, `${name} not found in ${file} — the scanner is wrong, not the code`);
  const d = s.indexOf('description:', at);
  const end = s.slice(d).search(/\n {2,}(mutating|spaceRequired|admin|spaceAdmin|inputSchema|async handle):/);
  assert.ok(end > 0, `could not find the end of ${name}'s description`);
  return s.slice(d, d + end);
};

const TOOLS = {
  delete_entity: description('server/src/mcp/tools/entity.ts', 'delete_entity'),
  delete_edge: description('server/src/mcp/tools/edge.ts', 'delete_edge'),
  delete_memory: description('server/src/mcp/tools/memory.ts', 'delete_memory'),
  delete_chrono: description('server/src/mcp/tools/chrono.ts', 'delete_chrono'),
};

describe('every delete says it cannot be undone, and what to use instead', () => {
  for (const [name, d] of Object.entries(TOOLS)) {
    it(`${name} says IRREVERSIBLE`, () => {
      assert.match(d, /IRREVERSIBLE/, 'a destructive tool must lead with that');
    });

    it(`${name} points at the retire alternative`, () => {
      // The mistake this pre-empts: wanting a record out of search results and reaching for delete.
      assert.match(d, /suppressEmbeddings/,
        'a caller who wanted "stop showing this" must be told the non-destructive option exists');
    });

    it(`${name} explains the tombstone, not just that there is one`, () => {
      // "Creates a tombstone for sync propagation" was the whole of three of these descriptions and told a
      // caller nothing they could act on. The actionable half is that it outranks a later write of that id.
      assert.match(d, /tombstone/i, 'name it');
      assert.match(d, /peer/i, 'and say it propagates');
    });
  }
});

describe('the refusal asymmetry is stated on all four', () => {
  it('delete_entity says it CAN be refused, and that a refusal is usually correct', () => {
    assert.match(TOOLS.delete_entity, /REFUSAL HERE IS USUALLY CORRECT/,
      'a caller who reads a refusal as an obstacle will work around it');
    assert.match(TOOLS.delete_entity, /strictLinkage/, 'and say what turns the guard on');
  });

  for (const name of ['delete_edge', 'delete_memory', 'delete_chrono']) {
    it(`${name} says it is NEVER refused for being referenced`, () => {
      // Pinned because it is the surprising direction: on a space with strict linkage a caller reasonably
      // expects the same protection the entity delete gives, and does not get it.
      assert.match(TOOLS[name], /NEVER REFUSED FOR BEING REFERENCED/,
        'the asymmetry with delete_entity has to be stated where the caller is');
      assert.match(TOOLS[name], /ENTITY deletion only/, 'and say where the guard does apply');
    });
  }

  it('and that claim is true — only the entity delete consults backlinks', () => {
    // Read from source, so the day a backlink guard is added to another delete this fails instead of
    // misinforming. `findEntityBacklinks` is the only such check in the tools.
    const entity = stripComments(readFileSync('server/src/mcp/tools/entity.ts', 'utf8'));
    assert.match(entity, /findEntityBacklinks\(/, 'delete_entity really does check');
    for (const f of ['server/src/mcp/tools/edge.ts', 'server/src/mcp/tools/memory.ts',
      'server/src/mcp/tools/chrono.ts']) {
      assert.doesNotMatch(stripComments(readFileSync(f, 'utf8')), /findEntityBacklinks|Backlinks\(/,
        `${f} gained a backlink guard — the "never refused" paragraph is now wrong`);
    }
  });
});

describe('what survives a delete is named', () => {
  it('delete_edge says both endpoints stay', () => {
    assert.match(TOOLS.delete_edge, /ENTITIES AT EITHER END ARE NOT TOUCHED/,
      '"delete the relationship" and "delete the things" are one keystroke apart');
  });

  it('and that it is how an edge gets repointed, since update_edge cannot', () => {
    assert.match(TOOLS.delete_edge, /upsert_edge/, 'name the second half of the sequence');
  });

  it('delete_chrono says its links are references, not contents', () => {
    assert.match(TOOLS.delete_chrono, /NOT TOUCHED/, 'entityIds and memoryIds are references');
  });

  it('delete_chrono says a recurrence rule does not spread the delete', () => {
    // Pre-empts the calendar assumption: there is no series, so there is no "this and all future
    // occurrences" question to answer.
    assert.match(TOOLS.delete_chrono, /DOES NOT SPREAD THE DELETE/,
      'a caller from any calendar API will assume a series exists');
  });
});
