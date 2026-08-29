/**
 * `findEntityBacklinks` must scan every collection that can reference an entity — derived, not listed.
 *
 * ## The gap this was written for
 *
 * Under `strictLinkage`, deleting an entity is supposed to 409 while inbound references exist. The check is
 * `findEntityBacklinks`, and it scanned four things: `_edges`, `memories.entityIds`, `chrono.entityIds`, and
 * `files.faceEntityId`. **`files.entityIds` was not among them** — so an entity referenced only by a file's
 * `entityIds` deleted cleanly, and the file was left pointing at a record that no longer exists.
 *
 * The comment above the face scan is the tell: *"which is why the other three scans missed them"*. The same
 * collection had already been patched once, for `faceEntityId`, and its sibling field was not added alongside.
 *
 * ## Why derived rather than a list of four
 *
 * A hard-coded list is how the field was missed in the first place, and the same derivation already guards the
 * merge path (`merge-relinks-every-entity-reference.test.js`). So this reads `config/types.ts` for every record
 * type declaring `entityIds` and requires a scan of each one's collection. **A new record type that carries an
 * entity reference fails this gate on the day it is declared**, which is the only version of this check that
 * stays true.
 *
 * ## Why it asserts on source
 *
 * `findEntityBacklinks` is four Mongo round trips and nothing else; exercising it needs a live database, and the
 * neighbouring `strict-link-enforcement.test.js` shows what happens when that is avoided by other means — it
 * asserts against a **local reimplementation** of the backlink logic, so it passed happily for as long as the
 * real function was missing a collection. A test of a copy of the rule cannot see the rule being wrong.
 *
 * Run: node --test testing/standalone/backlinks-cover-every-entity-reference.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf, statementAround } from './_structural-window.mjs';

const TYPES = 'server/src/config/types.ts';
const ENTITIES = 'server/src/brain/entities.ts';

/** Every record interface in `config/types.ts` that declares an `entityIds` field. */
function typesWithEntityIds() {
  const lines = stripComments(readFileSync(TYPES, 'utf8')).split(/\r?\n/);
  const found = [];
  let current = null;
  for (const line of lines) {
    const m = /^export interface (\w+)/.exec(line);
    if (m) current = m[1];
    if (/^\s*entityIds\??\s*:/.test(line) && current) found.push(current);
  }
  return [...new Set(found)];
}

/** The collection suffix each record type lives in. */
const COLLECTION_FOR = {
  MemoryDoc: 'memories',
  ChronoEntry: 'chrono',
  FileMetaDoc: 'files',
};

const backlinkFn = () => bodyOf(stripComments(readFileSync(ENTITIES, 'utf8')), 'findEntityBacklinks');

describe('backlinks cover every entity reference', () => {
  it('the derivation finds the record types before it is trusted', () => {
    // A gate that derives nothing passes vacuously and would keep passing if the interfaces moved.
    const types = typesWithEntityIds();
    assert.ok(types.length >= 3, `only found ${types.length} types with entityIds in ${TYPES}`);
    for (const t of ['MemoryDoc', 'ChronoEntry', 'FileMetaDoc']) {
      assert.ok(types.includes(t), `expected ${t} to declare entityIds; got: ${types.join(', ')}`);
    }
  });

  it('every collection that can hold an entityIds reference is scanned', () => {
    const body = backlinkFn();
    for (const type of typesWithEntityIds()) {
      const coll = COLLECTION_FOR[type];
      assert.ok(coll, `${type} declares entityIds but this gate does not know its collection — add it`);
      assert.ok(
        body.includes(`_${coll}\``) || body.includes(`_${coll}'`),
        `findEntityBacklinks never reads '${coll}', so an entity referenced only by a ${type} deletes cleanly `
        + `under strictLinkage and the referring record is left pointing at a tombstone.`,
      );
      /*
       * Statement-bounded, never a character window.
       *
       * The first version of this matched the collection name and then `entityIds` within a few hundred
       * characters, and it SURVIVED its own mutant: deleting `entityIds` from the memories query still passed,
       * because the chrono scan below supplied the word from inside the window. A fixed character budget spans
       * whatever happens to sit nearby, and on a function of four near-identical queries that is always the
       * next query. `gates-bound-their-subject-structurally.test.js` refuses the shape outright.
       */
      const tick = body.indexOf(`_${coll}\``);
      const at = tick === -1 ? body.indexOf(`_${coll}'`) : tick;
      const stmt = statementAround(body, at, `the ${coll} scan`);
      assert.match(
        stmt, /entityIds/,
        `findEntityBacklinks reads '${coll}' but that query does not mention entityIds — scanning a collection `
        + 'for some other reference is not the same as scanning it for this one, which is exactly how files '
        + `was missed.\n\nstatement:\n${stmt}`,
      );
    }
  });

  it('edges are scanned on both endpoints', () => {
    const body = backlinkFn();
    assert.match(body, /from:\s*entityId/, 'an edge referencing the entity as `from` is a backlink');
    assert.match(body, /to:\s*entityId/, 'an edge referencing the entity as `to` is a backlink');
  });

  it('the face reference is still scanned, and still reported as its own type', () => {
    // Both doors filter `b.type !== 'face'` to make face labels non-blocking. That distinction only works
    // while faces are reported under a type of their own, so the exemption cannot silently widen.
    const body = backlinkFn();
    assert.match(body, /faceEntityId/, 'face labels must still be found');
    assert.match(body, /type:\s*'face'/, "faces must keep their own backlink type — both doors filter on it");
  });
});
