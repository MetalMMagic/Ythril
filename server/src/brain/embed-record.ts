/**
 * Embed one stored brain record, given only its type and id.
 *
 * ## Why this is a module rather than a branch inside the worker
 *
 * "Rebuild this record's embedding text and store the vector" already existed once, inline in the
 * `POST /reindex` route — four near-identical blocks, one per type, each re-deriving what the creator
 * fed the model. The embedding queue needs exactly the same operation, and a second copy would put the
 * codebase back where `merge-fields.ts` found it: one rule, several implementations, and a promise that
 * they agree.
 *
 * The text MUST match what the creator embedded. If a reindex or a queued job builds it differently, a
 * record's vector silently stops corresponding to its own content, and the only symptom is worse recall
 * — no error, nothing to grep for. So the `*EmbedText` builders in `embed-text.ts` are the single
 * source, and this module's job is only to gather their inputs from the stored document.
 */

import { col, asFilter } from '../db/mongo.js';
import { embed } from './embedding.js';
import { memoryEmbedText, entityEmbedText, edgeEmbedText, chronoEmbedText } from './embed-text.js';
import { resolveEdgeEntityNames } from './edges.js';
import type {
  BrainEmbedRecordType, MemoryDoc, EntityDoc, EdgeDoc, ChronoEntry,
} from '../config/types.js';

/** Collection suffix per record type — the same mapping recall uses. */
const COLLECTION: Record<BrainEmbedRecordType, string> = {
  memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono',
};

/** Resolve entity ids to names, for the two types whose embedding text names their links. */
async function entityNames(spaceId: string, ids: unknown): Promise<string[]> {
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  if (list.length === 0) return [];
  const docs = await col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ _id: { $in: list } }), { projection: { name: 1 } })
    .toArray() as Array<{ name: string }>;
  return docs.map(d => d.name);
}

/**
 * The exact string this record's vector is built from.
 *
 * Exported so a test can assert that a queued job and the creator produce the SAME text for the same
 * record — the property that makes async embedding invisible to the searcher.
 */
export async function buildEmbedText(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  doc: Record<string, unknown>,
): Promise<string> {
  switch (recordType) {
    case 'memory': {
      const m = doc as unknown as MemoryDoc;
      return memoryEmbedText(m.fact, m.tags ?? [], await entityNames(spaceId, m.entityIds), m.description, m.properties);
    }
    case 'entity': {
      const e = doc as unknown as EntityDoc;
      return entityEmbedText(e.name, e.type, e.tags ?? [], e.description, e.properties ?? {});
    }
    case 'edge': {
      const e = doc as unknown as EdgeDoc;
      const [fromName, toName] = await resolveEdgeEntityNames(spaceId, e.from, e.to);
      return edgeEmbedText(fromName, e.label, toName, e.tags ?? [], e.type, e.description, e.properties);
    }
    case 'chrono': {
      const c = doc as unknown as ChronoEntry;
      return chronoEmbedText(c.title, c.type, c.status, c.description, c.tags ?? [], c.properties);
    }
  }
}

/**
 * What became of an embedding attempt.
 *
 * `gone` and `excluded` are both successes — the record was deleted, or its owner asked for it not to be
 * findable. Neither is owed a vector, so neither may be retried: a retry would keep a job alive forever for
 * work that must never happen.
 */
export type EmbedOutcome = 'embedded' | 'gone' | 'excluded';

/**
 * ## Why an UPDATE enqueues this instead of embedding inline
 *
 * Until 2026-08-07 all four update functions computed the vector themselves, from the record as they had
 * READ it plus the caller's patch, and wrote it in the same `$set`. Every content field in that `$set` was
 * guarded by `updates.X !== undefined`, but the embedding never was — it went in unconditionally.
 *
 * So two concurrent patches touching DIFFERENT fields both landed and lost no field, exactly as documented,
 * while each wrote a whole embedding describing only its own view of the record. The later write won, and
 * the stored vector then described a record that no longer existed anywhere: not a lost field, a permanent
 * disagreement between a record and its own index. Nothing could detect it, because every field was
 * correct — no counter fires, and no `If-Match` precondition would have been violated.
 *
 * `embedStoredRecord` cannot have that bug. It re-reads the document AFTER the write, so the text it embeds
 * is by construction the text of the record as it actually stands, whoever else wrote to it in between.
 *
 * Two things fall out of the change that are worth knowing before "simplifying" it back:
 *
 *  - **It is the contract creates already have.** `upsertEntity` and `remember` have queued by default since
 *    the embed queue shipped, and `waitForEmbedding` is the documented opt-out. Updates were the odd one out.
 *  - **It deletes four copies of the embed-text builder.** Each update function had its own inline call to
 *    `entityEmbedText` / `memoryEmbedText` / …; `buildEmbedText` above is the one the queue uses, and one
 *    copy cannot drift from itself.
 *
 * ## Load the record, build its text, embed it, store the vector.
 *
 * Throws if the model is unavailable — the caller decides whether that is a retry (the worker) or a
 * failed request (`waitForEmbedding: true`). Returns `gone` when the record no longer exists, which is
 * the ordinary outcome for a record deleted between the enqueue and the claim, and must NOT be a retry:
 * retrying would keep a job alive for a document that will never come back.
 */
export async function embedStoredRecord(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
): Promise<EmbedOutcome> {
  const collName = `${spaceId}_${COLLECTION[recordType]}`;
  const doc = await col(collName).findOne(asFilter({ _id: recordId })) as Record<string, unknown> | null;
  if (!doc) return 'gone';

  // `excludeFromVectorSearch` is implemented AS the absence of a vector — there is no query-time filter to
  // honour, so this is the single place the flag has any effect. Every writer of a vector reaches this
  // function, which is why one check covers the four creators and sync ingest alike.
  //
  // The stale vector is UNSET rather than left behind. Leaving it would keep the record findable by the
  // exact mechanism the flag exists to switch off, which is the whole bug.
  if (doc['excludeFromVectorSearch'] === true) {
    await col(collName).updateOne(
      asFilter({ _id: recordId }),
      { $unset: { embedding: '', embeddingModel: '' } },
    );
    return 'excluded';
  }

  const text = await buildEmbedText(spaceId, recordType, doc);
  const result = await embed(text);

  // `seq` is deliberately NOT advanced. An embedding is a DERIVED field — `merkle.ts` excludes it from
  // replication precisely because each peer computes its own — so bumping `seq` here would broadcast a
  // no-op change to every peer in every network the space belongs to, on every embedding, forever.
  await col(collName).updateOne(
    asFilter({ _id: recordId }),
    { $set: { embedding: result.vector, embeddingModel: result.model, matchedText: text } },
  );
  return 'embedded';
}
