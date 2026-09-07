/**
 * X-4: a chrono entry's fields can be removed. Until now none of them could.
 *
 * ## The gap
 *
 * `properties` on a chrono entry MERGE — deliberately, because an agent patching one key must not destroy the
 * others. An absent field means "leave alone", also deliberately. Chrono was then the one record type with no
 * `deleteFields`, and those three facts together meant **there was no expression that removed anything**: a
 * key written once to a chrono entry was permanent, on both doors.
 *
 * ## What is asserted here
 *
 * The write path is pure enough to exercise directly, so these are real calls with real verdicts rather than
 * a source grep — the guard this repo shipped behind `if (false && ...)` is why that distinction is kept.
 *
 * The half that is easy to get wrong is not the deletion, it is the REFUSAL. A path the writer does not
 * handle is accepted at the edge and then silently does nothing, which is precisely the failure this feature
 * removes — so every optional field must be in the writer's unset list, and every required one must be
 * refused by name.
 *
 * Run: node --test testing/standalone/chrono-delete-fields.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let validateDeleteFields, applyDeleteFields;
before(async () => {
  ({ validateDeleteFields, applyDeleteFields } = await import('../../server/dist/brain/delete-fields.js'));
});

describe('the required chrono fields are refused, not ignored', () => {
  for (const f of ['title', 'startsAt', 'status']) {
    it(`${f} is refused by name`, () => {
      // Refused rather than dropped from the writer's list: "nothing happened and nobody said so" is the
      // failure mode this whole file exists to remove, and silently ignoring a path recreates it.
      const r = validateDeleteFields([f]);
      assert.equal(r.ok, false, `${f} must not be deletable — it is required`);
      assert.match(r.error, new RegExp(f), 'and the refusal must name the field');
    });
  }

  it('the server-owned fields are still refused', () => {
    for (const f of ['id', '_id', 'spaceId', 'createdAt', 'updatedAt', 'type']) {
      assert.equal(validateDeleteFields([f]).ok, false, `${f} must stay undeletable`);
    }
  });

  it('but a PROPERTY of the same name is fine — the check is on the top segment only', () => {
    // The assertion that stops the new entries from over-reaching. `properties.title` is an ordinary
    // user-defined key and must stay removable on every record type.
    for (const p of ['properties.title', 'properties.startsAt', 'properties.status', 'properties.type']) {
      assert.equal(validateDeleteFields([p]).ok, true, `${p} is a user key and must be deletable`);
    }
  });
});

describe('deletion really removes, and only what was named', () => {
  it('drops a single property key and keeps the rest', () => {
    const doc = { properties: { a: 1, b: 2 }, tags: ['x'] };
    applyDeleteFields(doc, ['properties.a']);
    assert.deepEqual(doc.properties, { b: 2 }, 'only the named key goes');
    assert.deepEqual(doc.tags, ['x'], 'and nothing else is touched');
  });

  it('drops a whole optional field', () => {
    const doc = { description: 'x', tags: ['a'] };
    applyDeleteFields(doc, ['description']);
    assert.ok(!('description' in doc), 'the field is gone, not set to undefined');
  });
});

describe('the writer handles EVERY optional field', () => {
  // The silent-no-op guard. A field accepted at the edge but missing from the writer's unset list would be
  // accepted and do nothing — which is the exact behaviour X-4 exists to remove, reintroduced one field at a
  // time. The LINK arrays are derived from LINK_CLASSES; the record's own optional fields are named, because
  // there is no list to derive them from. This comment claimed the whole set was derived and it was not.
  const SRC = stripComments(readFileSync('server/src/brain/chrono.ts', 'utf8'));

  it('the unset loop covers each of them, and the LINK fields are derived into the list', async () => {
    // set-claim: the record's OWN optional fields. Its link arrays are derived from LINK_CLASSES in the
    // source and checked as such above; these four have no list anywhere to derive them from.
    /*
     * The comment above this block used to say the fields were "derived from the update signature rather
     * than hand-listed". They were hand-listed, here and in the source — a docblock claiming a property the
     * code did not have, which is worse than no claim because it stops the next reader looking.
     *
     * Two of the nine are not a fixed set: a chrono entry links to whatever `LINK_CLASSES` says it does, and
     * `memoryIds` arrived after this mechanism shipped. That half is derived in the source now, and checked
     * here against the same list rather than re-typed.
     */
    const { LINK_CLASSES } = await import('../../server/dist/brain/link-adjacency.js');
    const at = SRC.indexOf('if (deleteFieldsPaths && deleteFieldsPaths.length > 0)');
    assert.ok(at > 0, 'the deleteFields block was not found — the scanner is wrong, not the code');
    const block = SRC.slice(at, SRC.indexOf('\n  //', at + 10));
    assert.match(block, /for \(const field of DELETABLE_CHRONO_FIELDS\)/,
      'the unset loop names its fields again instead of walking the declared list');

    const declared = SRC.slice(SRC.indexOf('DELETABLE_CHRONO_FIELDS'), SRC.indexOf('];', SRC.indexOf('DELETABLE_CHRONO_FIELDS')));
    const chronoLinkFields = [...new Set(LINK_CLASSES.filter(c => c.kind === 'chrono').map(c => c.field))];
    assert.ok(chronoLinkFields.length >= 2,
      `only ${chronoLinkFields.length} chrono link field(s) — the import is stale and this checks nothing`);
    assert.match(declared, /LINK_CLASSES\.filter\(c => c\.kind === 'chrono'\)/,
      'the link arrays must be derived: a third chrono link class would otherwise be settable and not '
      + 'deletable, which is a path accepted at the door that silently does nothing');
    for (const f of ['description', 'tags', 'properties', 'recurrence', 'endsAt', 'confidence',
      'suppressEmbeddings']) {
      assert.match(declared, new RegExp(`'${f}'`), `${f} is optional and settable but cannot be deleted`);
    }
  });

  it('and applies them AFTER the merge, or a deletion would be undone by it', () => {
    const at = SRC.indexOf('mergePropertiesOrKeep(existing.properties');
    const del = SRC.indexOf('applyDeleteFields(merged, deleteFieldsPaths)');
    assert.ok(at > 0 && del > at, 'deleteFields must run after the property merge, not before');
  });
});

describe('both doors take it', () => {
  it('the MCP tool accepts and validates it', () => {
    const src = stripComments(readFileSync('server/src/mcp/tools/chrono.ts', 'utf8'));
    const at = src.indexOf("name: 'update_chrono'");
    const end = src.indexOf('\nexport const ', at);
    const tool = src.slice(at, end === -1 ? undefined : end);
    assert.match(tool, /deleteFields: \{/, 'declared in the input schema');
    assert.match(tool, /validateDeleteFields\(a\['deleteFields'\]\)/, 'and validated with the shared helper');
  });

  it('the REST route accepts and validates it, with the same helper', () => {
    // MCP/REST parity is the owner rule this repo pays most for. Same parameter, same helper, same commit.
    const src = stripComments(readFileSync('server/src/api/brain/chrono.ts', 'utf8'));
    assert.match(src, /'deleteFields'/, 'listed as patchable, so it alone satisfies "at least one field"');
    assert.match(src, /validateDeleteFields\(body\['deleteFields'\]\)/, 'and validated identically');
  });

  it('and the description no longer says it cannot be done', () => {
    const src = readFileSync('server/src/mcp/tools/chrono.ts', 'utf8');
    assert.doesNotMatch(src, /CANNOT be removed/,
      'the limitation paragraph must go with the limitation');
    assert.doesNotMatch(src, /NO `deleteFields` ON THIS TOOL/, 'likewise');
  });
});
