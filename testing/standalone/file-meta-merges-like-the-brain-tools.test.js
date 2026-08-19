/**
 * `update_file_meta` merges `properties` and offers `deleteFields` — the same contract as the four brain
 * record types. It was the odd one out.
 *
 * ## What this file used to assert, and why it was inverted rather than deleted
 *
 * It was `file-meta-replaces-unlike-the-brain-tools.test.js`, and it pinned the OPPOSITE: that files replace
 * `properties`, that the description says so in capitals, and that files have no `deleteFields`. All true at
 * the time, and writing it down is what became X-6.
 *
 * `files/file-meta.ts` did `$set['properties'] = opts.properties`, a wholesale overwrite, while
 * `brain/memory.ts` carried the note explaining why the others had been changed: *"An agent patching one key
 * silently destroyed every other property on the record, with no error anywhere."* The sweep that reached
 * memory, chrono, entity and edge never reached the file path — five tools taking the same-looking arguments,
 * one behaving differently.
 *
 * The rule this file protects is unchanged: **whatever a tool does with a list or a map, its description has
 * to say so, and the claim has to be pinned to the code.** Only the answer moved.
 *
 * ## Why `deleteFields` had to land in the same commit
 *
 * Merging alone would have removed the only way a file property could be cleared — sending the whole object
 * back was it. Shipping the merge first would have traded one silent data loss for a stale key nobody can
 * delete, which is exactly the state X-4 had just been filed and fixed for on chrono.
 *
 * Run: node --test testing/standalone/file-meta-merges-like-the-brain-tools.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { blockAfter } from './_structural-window.mjs';

const src = (p) => stripComments(readFileSync(p, 'utf8'));

const DESC = (() => {
  const s = src('server/src/mcp/tools/file.ts');
  const at = s.indexOf("name: 'update_file_meta'");
  assert.ok(at > 0, 'update_file_meta not found — the scanner is wrong, not the code');
  const d = s.indexOf('description:', at);
  const end = s.slice(d).search(/\n {2,}(mutating|spaceRequired|inputSchema|async handle):/);
  assert.ok(end > 0, 'could not find the end of update_file_meta\'s description');
  return s.slice(d, d + end);
})();

describe('all five record types now agree about properties', () => {
  it('file meta merges', () => {
    assert.match(src('server/src/files/file-meta.ts'), /mergePropertiesOrKeep\(existing\.properties, opts\.properties\)/,
      'the fifth copy of a defect fixed four times');
  });

  it('and so do the four brain paths — the point is that they AGREE now', () => {
    for (const f of ['server/src/brain/entities.ts', 'server/src/brain/edges.ts',
      'server/src/brain/memory.ts', 'server/src/brain/chrono.ts']) {
      assert.match(src(f), /mergePropertiesOrKeep\(/, `${f} must still merge`);
    }
  });

  it('the description says it merges, and says it CHANGED', () => {
    // A caller written against the old behaviour is unaffected, but only because they were forced to send
    // the whole object. Saying the behaviour moved is what lets them stop doing that deliberately.
    assert.match(DESC, /`properties` MERGES/, 'state the behaviour');
    assert.match(DESC, /REPLACED\s*'?\s*\+?\s*'?until 3\.1|REPLACED until 3\.1/, 'and that it is new');
  });

  it('and is honest that the LISTS still replace', () => {
    // The half that did not change. Leaving it implied would let "properties merge" be read as "everything
    // merges", which loses tags instead of properties — the same defect one field over.
    assert.match(DESC, /THE LISTS STILL REPLACE/, 'tags and the id lists are still overwritten');
  });
});

describe('deleteFields shipped with the merge, not after it', () => {
  it('the writer takes paths and applies them after the merge', () => {
    const s = src('server/src/files/file-meta.ts');
    const merge = s.indexOf('mergePropertiesOrKeep(existing.properties');
    const del = s.indexOf('applyDeleteFields(merged, deleteFieldsPaths)');
    assert.ok(merge > 0, 'the merge must exist');
    assert.ok(del > merge, 'and deletion must run AFTER it, or a merge would undo a deletion');
  });

  it('every optional field is in the reflect list, so no path is a silent no-op', () => {
    // The failure this whole mechanism exists to remove: a path accepted at the edge that then does nothing.
    const s = src('server/src/files/file-meta.ts');
    const at = s.indexOf('if (deleteFieldsPaths && deleteFieldsPaths.length > 0)');
    assert.ok(at > 0, 'the deleteFields block was not found — the scanner is wrong, not the code');
    const block = blockAfter(s, at, 'the deleteFields block');
    for (const f of ['description', 'excerpt', 'tags', 'entityIds', 'chronoIds', 'memoryIds', 'properties']) {
      assert.match(block, new RegExp(`'${f}'`), `${f} is settable but cannot be deleted`);
    }
  });

  it('both doors accept it, validated with the same helper', () => {
    // MCP/REST parity, the rule this codebase pays most for. Same parameter, same refusals, same commit.
    const s = src('server/src/mcp/tools/file.ts');
    const at = s.indexOf("name: 'update_file_meta'");
    const end = s.indexOf('\nexport const ', at);
    const tool = s.slice(at, end === -1 ? undefined : end);
    assert.match(tool, /deleteFields: \{/, 'declared in the MCP input schema');
    assert.match(tool, /validateDeleteFields\(a\['deleteFields'\]\)/, 'and validated there');
    assert.match(src('server/src/api/brain/file-meta.ts'), /validateDeleteFields\(deleteFields\)/,
      'and on the REST route with the same helper');
  });

  it('the description names it as the only way to unset', () => {
    assert.match(DESC, /REMOVING SOMETHING IS `deleteFields`, NEVER AN OMISSION/,
      'an omitted field means leave-alone, so the removal path must be named');
    assert.doesNotMatch(DESC, /EVERY FIELD REPLACES/, 'the old warning must go with the old behaviour');
  });
});

describe('the rest of what it does not do', () => {
  it('says the file content is not re-read', () => {
    assert.match(DESC, /CONTENT IS NOT RE-READ/,
      'editing the record about a file is not reprocessing the file');
  });

  it('but says the record IS re-embedded, so the edit is searchable', () => {
    assert.match(DESC, /re-embedded/, 'otherwise a new description would not be findable');
  });

  it('says strict linkage refuses rather than storing a dangling link', () => {
    assert.match(DESC, /STRICT LINKAGE EVERY ID MUST RESOLVE/, 'and that it is a refusal');
  });
});
