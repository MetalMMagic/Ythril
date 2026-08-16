/**
 * `update_file_meta` REPLACES `properties`. All four brain record types MERGE it. The description says so.
 *
 * ## The fifth copy of a defect that was fixed four times
 *
 * `brain/memory.ts` still carries the note explaining the fix:
 *
 *   > `properties` MERGES into the stored map. It used to replace it… An agent patching one key silently
 *   > destroyed every other property on the record, with no error anywhere.
 *
 * That sweep reached entities, edges, memories and chrono. It did not reach `files/file-meta.ts`, where
 * `$set['properties'] = opts.properties` still overwrites the object wholesale — and files have no
 * `deleteFields` either, so sending the whole object back is the only way to change one key.
 *
 * ## Why this is a documentation fix and not a bug fix
 *
 * The parameter description already said *"Replaces the properties object."* It is honest, so a caller who
 * reads that exact line is not misled. The danger is the caller who learned merge semantics from the four
 * brain tools and assumes the fifth matches — they lose every key they did not resend, silently.
 *
 * Making it merge is filed as **X-6**: it is a behaviour change to a write path and wants its own PR.
 *
 * Run: node --test testing/standalone/file-meta-replaces-unlike-the-brain-tools.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

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

describe('the description leads with the difference', () => {
  it('says every field REPLACES, properties included', () => {
    assert.match(DESC, /EVERY FIELD REPLACES, INCLUDING `properties`/,
      'this is the one that costs data, so it cannot be a footnote');
  });

  it('names the brain tools it differs from', () => {
    assert.match(DESC, /NOT WHAT THE BRAIN TOOLS DO/,
      'a caller who learned merge semantics elsewhere is the one who loses keys');
  });

  it('gives the concrete outcome, not just the word "replaces"', () => {
    // "Replaces the properties object" was already there and was read past. A worked example is not padding.
    assert.match(DESC, /leaves\s*'?\s*\+?\s*'?it with ONE|leaves it with ONE/,
      'spell out what happens to the other three properties');
  });

  it('says what to do instead', () => {
    assert.match(DESC, /READ THE RECORD FIRST/, 'read-modify-write is the only safe pattern here');
    assert.match(DESC, /no `deleteFields` on this\s*'?\s*\+?\s*'?tool|no `deleteFields`/,
      'and say why there is no shortcut');
  });
});

describe('the claim matches the code, in both directions', () => {
  it('file meta really replaces', () => {
    assert.match(src('server/src/files/file-meta.ts'), /\$set\['properties'\] = opts\.properties/,
      'if this starts merging, the whole warning above must come out');
  });

  it('and the brain paths really merge, which is what makes it a contrast', () => {
    for (const f of ['server/src/brain/entities.ts', 'server/src/brain/edges.ts',
      'server/src/brain/memory.ts', 'server/src/brain/chrono.ts']) {
      assert.match(src(f), /mergePropertiesOrKeep\(/,
        `${f} stopped merging — the file tool is no longer the odd one out`);
    }
  });

  it('and files really have no deleteFields', () => {
    const s = src('server/src/mcp/tools/file.ts');
    const at = s.indexOf("name: 'update_file_meta'");
    const schemaAt = s.indexOf('inputSchema:', at);
    const end = s.indexOf('\nexport const ', at);
    assert.doesNotMatch(s.slice(schemaAt, end === -1 ? undefined : end), /deleteFields/,
      'update_file_meta gained deleteFields — say so instead of saying there is no shortcut');
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
