/**
 * An entity merge must relink EVERY record kind that can reference an entity.
 *
 * ## The defect
 *
 * `executeMerge` relinked edges, memories and chrono entries, and never touched file metadata records — which
 * carry `entityIds` exactly as memories and chrono do, and which `assertRefsResolve` validates at write time
 * so that every id in them names a real entity.
 *
 * So merging B into A left every file whose `entityIds` held B pointing at an entity that the merge's own last
 * phase then **deleted**. The merge path broke the invariant the write path enforces.
 *
 * ## Why nothing saw it
 *
 * Every direction that could have noticed was looking somewhere else:
 *
 *  - the ER model counts `linkedFrom.files` as a first-class relationship, so the number was simply wrong
 *    rather than obviously broken;
 *  - `danglingEdges` in that same model counts dangling **edges** and never looks at files;
 *  - `strictLinkage` blocks deleting an entity that still has inbound backlinks — and a merge deletes the
 *    absorbed entity directly, so it never passes that guard;
 *  - a traversal from the file came back empty, which reads as "nothing linked" rather than as a broken link.
 *
 * ## What this pins, and why it is DERIVED
 *
 * Listing four collection names here would be the same shape as the bug: a hand-kept second copy that agrees
 * until someone adds a fifth. So the record kinds are read out of `config/types.ts` — every interface that
 * declares an `entityIds` field — and the merge is required to relink each one's collection.
 *
 * Add a new record type with `entityIds` and forget the merge, and this fails naming it.
 *
 * Comments are stripped first: the merge now carries a long comment explaining why the file phase exists, and
 * it names the very collections being searched for.
 *
 * Run: node --test testing/standalone/merge-relinks-every-entity-reference.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TYPES = 'server/src/config/types.ts';
const MERGE = 'server/src/brain/merge.ts';

const withoutComments = (t) =>
  t.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

/** Every exported interface in `types.ts` that declares an `entityIds` field. */
function typesWithEntityIds() {
  const lines = withoutComments(readFileSync(TYPES, 'utf8')).split(/\r?\n/);
  const found = [];
  let current = null;
  for (const line of lines) {
    const m = /^export interface (\w+)/.exec(line);
    if (m) current = m[1];
    if (/^\s*entityIds\??\s*:/.test(line) && current) found.push(current);
  }
  return [...new Set(found)];
}

/**
 * The collection each record type lives in.
 *
 * This mapping is the one thing that cannot be derived — a TypeScript interface does not know its collection
 * suffix. So it is asserted to be TOTAL over the discovered types: a new `entityIds`-carrying type fails here
 * first, with a message saying to add it, rather than passing silently.
 */
const COLLECTION_SUFFIX = {
  MemoryDoc: 'memories',
  ChronoEntry: 'chrono',
  FileMetaDoc: 'files',
};

describe('the check itself works before it is trusted', () => {
  it('finds the record types that carry entityIds', () => {
    const types = typesWithEntityIds();
    assert.ok(types.length >= 3, `only found ${types.length} types with entityIds in ${TYPES}`);
    assert.ok(types.includes('MemoryDoc') && types.includes('ChronoEntry') && types.includes('FileMetaDoc'),
      `expected the three known ones, got: ${types.join(', ')}`);
  });

  it('knows a collection for every one of them', () => {
    const missing = typesWithEntityIds().filter(t => !COLLECTION_SUFFIX[t]);
    assert.deepEqual(missing, [],
      `these record types carry entityIds and this test does not know their collection: ${missing.join(', ')}. `
      + 'Add them to COLLECTION_SUFFIX — and check the merge relinks them, which is the point of this file.');
  });

  it('strips the comment that names the collections', () => {
    const raw = readFileSync(MERGE, 'utf8');
    assert.ok(raw.includes('_files'), 'the merge should still explain the file phase in prose');
    const stripped = withoutComments(raw);
    // The explanation mentions `${spaceId}_files` in prose; the assertions below must see the real call.
    assert.ok(stripped.includes('_files'), 'the file collection must be referenced in CODE, not only in a comment');
  });
});

describe('executeMerge relinks every collection that can reference an entity', () => {
  const merge = withoutComments(readFileSync(MERGE, 'utf8'));

  for (const [type, suffix] of Object.entries(COLLECTION_SUFFIX)) {
    it(`relinks ${suffix} (${type})`, () => {
      // The collection must be opened...
      assert.match(merge, new RegExp(`col<[^>]*>\\(\`\\$\\{spaceId\\}_${suffix}\`\\)`),
        `the merge never opens the ${suffix} collection — records there keep pointing at the absorbed entity, `
        + 'which phase 5 deletes');
      // ...and queried for the absorbed id, which is what proves it is looking for references rather than
      // touching the collection for some other reason.
      assert.ok(
        new RegExp(`${suffix}\`\\)[\\s\\S]{0,600}?entityIds: absorbed\\._id`).test(merge)
        || new RegExp(`entityIds: absorbed\\._id[\\s\\S]{0,600}?${suffix}\``).test(merge),
        `the merge opens ${suffix} but never searches it for \`entityIds: absorbed._id\``);
    });
  }

  it('bumps seq on every relinked record, so the change replicates', () => {
    // A relink that does not advance `seq` is invisible to sync: a peer would keep the old link forever, and
    // the dangling reference would come back on the next pull.
    const relinkBlocks = merge.split('nextSeq(spaceId)').length - 1;
    assert.ok(relinkBlocks >= 4,
      `only ${relinkBlocks} nextSeq calls — each relinked collection plus the survivor needs its own`);
  });

  it('dedupes after relinking, so a record linked to BOTH does not hold the survivor twice', () => {
    const dedupes = merge.split('new Set(').length - 1;
    assert.ok(dedupes >= 3,
      `only ${dedupes} dedupe(s) — a record referencing the survivor AND the absorbed entity collapses to two `
      + 'identical ids without one');
  });
});
