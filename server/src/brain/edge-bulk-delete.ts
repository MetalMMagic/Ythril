/**
 * Wiping every edge in a space, tombstone per document.
 *
 * ## Why it is not in `edges.ts`
 *
 * `edges.ts` is frozen at its current size by `no-new-god-files.test.js`, and the message that gate prints is
 * the reason rather than the rule: *"every change lands in the same place because that is where the code
 * already is."* A wipe shares nothing with the read, write and traversal paths beside it — no schema
 * validation, no embedding, no seq-per-write — so it comes out whole.
 *
 * ## The one thing to know before editing it
 *
 * The tombstone seq range is reserved in a SINGLE round trip. It used to call `nextSeq()` per document, so a
 * 100k-document wipe paid 100k awaited round trips before the delete began. Gaps in the range are harmless —
 * sync compares seqs with `>` — but REUSE would not be, which is why the block is reserved up front and never
 * rolled back on failure.
 *
 * ## The same rule exists three more times
 *
 * `bulkDeleteEntities`, `bulkDeleteMemories` and `bulkDeleteChrono` are this function with a different
 * collection and a different tombstone `type`. That is four copies of one rule, which is the defect class this
 * repo produces most, and it is filed rather than fixed here: extracting the shared wipe touches four large
 * files and four sets of webhook semantics, and does not belong in a change about edge endpoints.
 */
import { col, asBulk } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { reserveSeqBlock } from '../util/seq.js';
import type { EdgeDoc, TombstoneDoc } from '../config/types.js';

/** Bulk-delete all edges in a space, writing a tombstone per deleted doc. */
export async function bulkDeleteEdges(spaceId: string): Promise<number> {
  const coll = col<EdgeDoc>(`${spaceId}_edges`);
  const ids = await coll.find({}, { projection: { _id: 1 } }).toArray();
  if (ids.length === 0) return 0;

  const now = new Date().toISOString();
  const instanceId = getConfig().instanceId;
  const tombstones: TombstoneDoc[] = [];

  // See the module docblock: one reservation for the whole range, never per document.
  const firstSeq = await reserveSeqBlock(spaceId, ids.length);
  let seqCursor = firstSeq;

  for (const doc of ids) {
    const seq = seqCursor++;
    tombstones.push({
      _id: doc._id,
      type: 'edge',
      spaceId,
      deletedAt: now,
      instanceId,
      seq,
    });
  }

  const ops = tombstones.map(t => ({
    replaceOne: { filter: { _id: t._id }, replacement: t, upsert: true },
  }));
  await col<TombstoneDoc>(`${spaceId}_tombstones`).bulkWrite(asBulk<TombstoneDoc>(ops));
  await coll.deleteMany({});
  return ids.length;
}
