/**
 * Memory records — create (`remember`), update, delete, list, count, bulk-delete.
 *
 * The recall engine lives in recall.ts, the filter DSL in filter.ts, and the structured query
 * surface in query.ts (A17.4). `remember` reaches into recall.ts for the optional insert-time
 * duplicate check; nothing here is imported back by those modules.
 */
import { v4 as uuidv4 } from 'uuid';
import { authorRef } from '../config/author.js';
import { findInsertContradictions, type ContradictionWarning } from './insert-contradictions.js';
import { col, asFilter, asDoc, asUpdate, asBulk } from '../db/mongo.js';
import { nextSeq, reserveSeqBlock } from '../util/seq.js';
import { brainWriteSeqTotal } from '../metrics/registry.js';
import { parseLimit, parseSkip } from '../util/pagination.js';
import { toMongoSort, type SortSpec } from './list-sort.js';
import { embed } from './embedding.js';
import { memoryEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { applyDeleteFields } from './delete-fields.js';
import { mergeTags, mergeProperties, mergePropertiesOrKeep } from './merge-fields.js';
import { enqueueEmbedJob } from './embed-queue.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { MemoryDoc, EntityDoc, TombstoneDoc } from '../config/types.js';
import { SimilarMatch, DupeCheckOpts, checkDuplicates } from './recall.js';
import { PROPERTIES_SCAN_MAX_MS } from './tag-filter.js';

/** Resolve entity IDs to their names from the database. */
async function resolveEntityNames(spaceId: string, entityIds: string[]): Promise<string[]> {
  if (entityIds.length === 0) return [];
  const docs = await col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ _id: { $in: entityIds } }), { projection: { name: 1 } })
    .toArray() as Array<{ name: string }>;
  return docs.map(d => d.name);
}

/** Store a new memory with semantic embedding */
export async function remember(
  spaceId: string,
  fact: string,
  entityIds: string[] = [],
  tags: string[] = [],
  description?: string,
  properties?: Record<string, string | number | boolean>,
  entityNames?: string[],
  type?: string,
  opts?: DupeCheckOpts,
  actor?: WebhookActor,
  ttlDays?: number | null,
  /**
   * A caller-supplied UUID v4, which makes this write **idempotent**.
   *
   * ## Why it exists
   *
   * An MCP agent or an integrator whose request times out will retry — and before this, a retried memory create
   * produced a **second memory**, silently. Entities already had this: a supplied `id` makes `upsertEntity` find
   * by `_id` and update. Edges get it free from their `(from, to, label)` natural key. Memories and chrono had
   * neither, and they are the two highest-volume write types.
   *
   * The owner chose this mechanism over an `Idempotency-Key` header specifically because it reuses a path already
   * shipped and tested on entities: no new storage, no TTL to expire, and an agent that generates one UUID before
   * its first attempt gets idempotency for free.
   *
   * ## What a retry actually does, stated precisely
   *
   * It is **not** a no-op. The record converges on the same content, but `updatedAt` and `seq` move, and tags and
   * properties **merge** rather than replace — matching `upsertEntity` exactly, because one mental model across
   * four record types is worth more than a marginally different rule per type. Converging on the same content is
   * what retry safety means here; claiming "no effect" would be false, and it would also be visible as a `clean`
   * write in `ythril_brain_write_seq_total`.
   *
   * The route validates the shape. An arbitrary string must never reach `_id`: it becomes the sync identity of a
   * record that replicates across networks.
   *
   * NOTE: this is the twelfth positional parameter, which is one too many. The next addition should convert the
   * tail to an options object rather than continue the pattern.
   */
  id?: string,
): Promise<MemoryDoc & { similar?: SimilarMatch[]; contradicts?: ContradictionWarning[] }> {
  // When an id is supplied, look for the record it names first — the same shape as `upsertEntity`.
  const existing: MemoryDoc | null = id
    ? (await col<MemoryDoc>(`${spaceId}_memories`).findOne(asFilter<MemoryDoc>({ _id: id })) as MemoryDoc | null)
    : null;

  const names = entityNames ?? await resolveEntityNames(spaceId, entityIds);
  const embedText = memoryEmbedText(fact, tags, names, description, properties);

  // ── Embed now, or hand it to the queue?
  //
  // An insert-time duplicate/contradiction check needs the vector BEFORE the insert — that is the whole
  // reason it is computed here rather than after, so the new record cannot self-match. So those flags
  // IMPLY waiting. Implied rather than rejected as an invalid combination: a caller asking "is this a
  // duplicate?" is asking a question that cannot be answered later, so refusing it would be a puzzle
  // where an answer was available.
  const needsVectorNow = opts?.waitForEmbedding === true || opts?.checkDuplicates === true || opts?.checkContradictions === true;

  let embResult: { vector: number[]; model: string } | null = null;
  if (needsVectorNow) {
    // Unguarded on purpose: the caller asked for a record that is searchable when this returns. A
    // silent fallback to "stored, not searchable" would answer a different question than the one asked.
    embResult = await embed(embedText);
  }

  // Opt-in insert-time duplicate / contradiction checks, using the freshly computed vector BEFORE insert
  // so it can never self-match. ONE neighbour search serves both flags — the second question is free once
  // the first has paid for the vector search.
  let similar: SimilarMatch[] | undefined;
  let contradicts: ContradictionWarning[] | undefined;
  if (embResult && (opts?.checkDuplicates || opts?.checkContradictions)) {
    const hits = await checkDuplicates(spaceId, 'memory', embResult.vector, opts.dupeThreshold, opts.dupeTopK);
    if (opts.checkDuplicates && hits.length > 0) similar = hits;
    if (opts.checkContradictions && hits.length > 0) {
      const found = await findInsertContradictions(spaceId, 'memory', { properties }, hits);
      if (found.length > 0) contradicts = found;
    }
  }

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();

  // ── The idempotent branch: a supplied id that already names a record CONVERGES rather than duplicating.
  //
  // Merge semantics match `upsertEntity` deliberately — tags union, properties shallow-merge — so a caller has one
  // rule to learn across all four record types. A retry sends the identical payload, so merge and replace are
  // indistinguishable for the case this exists for; the difference only shows when the id is reused with different
  // content, which is a deliberate update and behaves like the entity path does.
  if (existing) {
    const mergedTags = mergeTags(existing.tags, tags);
    const mergedProps = mergeProperties(existing.properties, properties);
    const $set: Record<string, unknown> = {
      fact,
      tags: mergedTags,
      entityIds,
      matchedText: embedText,
      updatedAt: now,
      seq,
    };
    // Only when a vector was actually computed. When it was not, the PREVIOUS vector stays: it
    // describes the record as it was a moment ago, which is a better answer than none while the
    // queued job catches up. `matchedText` above is always current, so the two can be compared.
    if (embResult) {
      $set['embedding'] = embResult.vector;
      $set['embeddingModel'] = embResult.model;
    }
    if (type !== undefined) $set['type'] = type;
    if (description !== undefined) $set['description'] = description;
    if (properties !== undefined) $set['properties'] = mergedProps;
    const $unset: Record<string, unknown> = {};
    applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
      { collection: 'memory', existing: existing as unknown as Record<string, unknown> });
    const updateOp: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
    await col<MemoryDoc>(`${spaceId}_memories`).updateOne(
      asFilter<MemoryDoc>({ _id: existing._id }), asUpdate<MemoryDoc>(updateOp),
    );
    const converged = { ...existing, ...($set as Partial<MemoryDoc>) } as MemoryDoc;
    if ('_expireAt' in $unset) delete (converged as { _expireAt?: unknown })._expireAt;
    // After the write, never before: a job for a record that failed to store would be a job for
    // nothing. Enqueued even when the vector is already current — the content just changed, so the
    // stored vector is now stale, and the queue is what makes it catch up.
    if (!embResult) await enqueueEmbedJob(spaceId, 'memory', converged._id);
    // `memory.updated`, not `created` — a subscriber must be able to tell a converged retry from a new record.
    if (actor) emitWebhookEvent({ event: 'memory.updated', spaceId, entry: { ...converged, embedding: undefined }, ...actor });
    return (similar || contradicts)
      ? { ...converged, ...(similar ? { similar } : {}), ...(contradicts ? { contradicts } : {}) }
      : converged;
  }

  const doc: MemoryDoc = {
    // A supplied id that named nothing becomes the record's identity, so the caller's retry finds it next time.
    _id: id ?? uuidv4(),
    spaceId,
    fact,
    tags,
    entityIds,
    matchedText: embedText,
    author: authorRef(),
    createdAt: now,
    updatedAt: now,
    seq,
    ...(embResult ? { embedding: embResult.vector, embeddingModel: embResult.model } : {}),
  };
  if (type !== undefined) doc.type = type;
  if (description !== undefined) doc.description = description;
  if (properties !== undefined) doc.properties = properties;
  // See entities.ts: without `typed` the schema tier is unreachable and the space default applies instead.
  stampExpiryOnCreate(spaceId, doc, ttlDays, { collection: 'memory', type: doc.type });
  await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(doc));
  if (!embResult) await enqueueEmbedJob(spaceId, 'memory', doc._id);
  // Real-time duplicate-rule evaluation (opt-in per space). Fire-and-forget; the
  // dynamic import avoids a static cycle with dupe-scanner.js.
  if (getConfig().spaces.find(s => s.id === spaceId)?.dupeRulesOnInsert) {
    import('./dupe-scanner.js').then(m => m.evaluateRecordForDuplicates(spaceId, 'memory', doc._id)).catch(() => { /* best-effort */ });
  }
  if (actor) emitWebhookEvent({ event: 'memory.created', spaceId, entry: { ...doc, embedding: undefined }, ...actor });
  // Advisory only — the record is stored either way.
  return (similar || contradicts) ? { ...doc, ...(similar ? { similar } : {}), ...(contradicts ? { contradicts } : {}) } : doc;
}

/** Update an existing memory's fact, tags, entityIds, description, or properties. Re-embeds when content fields change. */
export async function updateMemory(
  spaceId: string,
  memoryId: string,
  updates: { fact?: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean>; type?: string },
  deleteFieldsPaths?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
): Promise<MemoryDoc | null> {
  const existing = await col<MemoryDoc>(`${spaceId}_memories`).findOne(asFilter<MemoryDoc>({ _id: memoryId, spaceId })) as MemoryDoc | null;
  if (!existing) return null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now, seq };
  const $unset: Record<string, unknown> = {};

  // `properties` MERGES into the stored map. It used to replace it, which contradicted this tool's own
  // schema ("Key-value properties to merge"), the `deleteFields` contract ("applied AFTER the normal
  // merge"), the entity and edge update paths, and `remember`'s own converge branch above. An agent
  // patching one key silently destroyed every other property on the record, with no error anywhere.
  // Removing a key is `deleteFields`' job — an absence never means "delete".
  //
  // `tags` deliberately still REPLACE here, and that is not an oversight: `update_memory` documents them
  // as "New tags (replaces existing)" while `update_entity`/`update_edge` document a union. Both halves
  // are stated, so both are kept and pinned by a test rather than silently unified.
  const mergedUpdateProps = mergePropertiesOrKeep(existing.properties, updates.properties);
  if (updates.fact !== undefined) $set['fact'] = updates.fact;
  if (updates.tags !== undefined) $set['tags'] = updates.tags;
  if (updates.entityIds !== undefined) $set['entityIds'] = updates.entityIds;
  if (updates.description !== undefined) $set['description'] = updates.description;
  if (updates.properties !== undefined) $set['properties'] = mergedUpdateProps;
  if (updates.type !== undefined) $set['type'] = updates.type;

  // Apply deleteFields after merge
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    // Build a merged view for deleteFields application
    const merged: Record<string, unknown> = {
      fact: updates.fact ?? existing.fact,
      tags: updates.tags ?? existing.tags,
      entityIds: updates.entityIds ?? existing.entityIds,
      description: updates.description !== undefined ? updates.description : existing.description,
      properties: mergedUpdateProps ?? {},
    };
    applyDeleteFields(merged, deleteFieldsPaths);

    // Reflect deletions into $set/$unset
    for (const field of ['description', 'tags', 'entityIds', 'properties']) {
      if (!(field in merged)) {
        $unset[field] = '';
        delete $set[field];
      } else if (deleteFieldsPaths.some(p => p === field || p.startsWith(field + '.'))) {
        $set[field] = merged[field];
      }
    }
  }

  // Re-embed whenever any content field changes
  const contentChanged =
    updates.fact !== undefined ||
    updates.tags !== undefined ||
    updates.entityIds !== undefined ||
    updates.description !== undefined ||
    updates.properties !== undefined ||
    (deleteFieldsPaths && deleteFieldsPaths.length > 0);
  if (contentChanged) {
    const newFact = ($set['fact'] as string) ?? existing.fact;
    const newTags = ($set['tags'] as string[]) ?? existing.tags;
    const newEntityIds = ($set['entityIds'] as string[]) ?? existing.entityIds;
    const newDesc = 'description' in $set ? ($set['description'] as string | undefined) : existing.description;
    const newProps = ($set['properties'] as Record<string, string | number | boolean>) ?? existing.properties;
    const entityNames = await resolveEntityNames(spaceId, newEntityIds);
    try {
      const embedText = memoryEmbedText(newFact, newTags, entityNames, newDesc, newProps);
      const embResult = await embed(embedText);
      $set['embedding'] = embResult.vector;
      $set['embeddingModel'] = embResult.model;
      $set['matchedText'] = embedText;
    } catch { /* embedding unavailable — keep existing embedding */ }
  }

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
    { collection: 'memory', existing: existing as unknown as Record<string, unknown> }); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  // findOneAndUpdate, not updateOne, so the PRE-image comes back in the same round trip.
  //
  // The update itself is unchanged — same filter, same operators, same result — but the returned document is
  // the record as it was at WRITE time. Comparing its seq with the one read at the top of this function is
  // exactly the lost-update test: if it moved, another writer landed in the window between our read and our
  // write, and whatever they changed in a field we also set has just been overwritten with no trace.
  //
  // Observation only, deliberately. There is no `If-Match` on brain records yet, so this must not reject a
  // write that would previously have succeeded; it counts, and the counter decides whether the 412 path is
  // worth building.
  const before = await col<MemoryDoc>(`${spaceId}_memories`).findOneAndUpdate(
    asFilter<MemoryDoc>({ _id: memoryId }),
    asUpdate<MemoryDoc>(updateOp),
    { returnDocument: 'before' },
  ) as MemoryDoc | null;
  brainWriteSeqTotal
    .labels({ collection: 'memories', outcome: before && before.seq !== existing.seq ? 'collision' : 'clean' })
    .inc();

  const result = { ...existing, ...($set as Partial<MemoryDoc>) } as MemoryDoc;
  if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;

  // Apply deleteFields to the returned doc for consistency
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    applyDeleteFields(result as unknown as Record<string, unknown>, deleteFieldsPaths);
  }

  if (actor) emitWebhookEvent({ event: 'memory.updated', spaceId, entry: { ...result, embedding: undefined }, ...actor });
  return result;
}

/** Delete a memory and record a tombstone */
export async function deleteMemory(
  spaceId: string,
  memoryId: string,
  actor?: WebhookActor,
): Promise<boolean> {
  const existing = await col<MemoryDoc>(`${spaceId}_memories`)
    .findOne(asFilter<MemoryDoc>({ _id: memoryId, spaceId }), { projection: { seq: 1 } }) as { seq?: number } | null;
  const seq = await nextSeq(spaceId);
  const result = await col<MemoryDoc>(`${spaceId}_memories`).deleteOne({
    _id: memoryId,
    spaceId,
  });
  if (result.deletedCount === 0) return false;

  const tombstone: TombstoneDoc = {
    _id: memoryId,
    type: 'memory',
    spaceId,
    deletedAt: new Date().toISOString(),
    instanceId: getConfig().instanceId,
    seq,
    ...(existing?.seq !== undefined ? { originalSeq: existing.seq } : {}),
  };
  await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
    asFilter<TombstoneDoc>({ _id: memoryId }),
    asDoc<TombstoneDoc>(tombstone),
    { upsert: true },
  );
  if (actor) emitWebhookEvent({ event: 'memory.deleted', spaceId, entry: { _id: memoryId }, ...actor });
  return true;
}

/** List memories (no embedding, paginated) */
export async function listMemories(
  spaceId: string,
  filter: Record<string, unknown> = {},
  limit = 20,
  skip = 0,
  sort?: SortSpec,
) {
  return col<MemoryDoc>(`${spaceId}_memories`)
    .find(asFilter<MemoryDoc>(filter))
    .maxTimeMS(filter['$expr'] ? PROPERTIES_SCAN_MAX_MS : 60_000)
    .project({ embedding: 0 })
    .sort(sort ? toMongoSort(sort) : { createdAt: -1 })
    .skip(parseSkip(skip))
    .limit(parseLimit(limit, 20, 1000))
    .toArray();
}

/** Count memories in a space */
export async function countMemories(spaceId: string): Promise<number> {
  return col<MemoryDoc>(`${spaceId}_memories`).countDocuments();
}

/** Bulk-delete all memories in a space, writing a tombstone per deleted doc. */
export async function bulkDeleteMemories(spaceId: string): Promise<number> {
  const coll = col<MemoryDoc>(`${spaceId}_memories`);
  // Deterministic newest-first ordering keeps recently written docs near the
  // front of the generated tombstone seq range even under very large datasets.
  const ids = await coll
    .find({}, { projection: { _id: 1, createdAt: 1, seq: 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .toArray() as { _id: string; createdAt: string; seq?: number }[];
  if (ids.length === 0) return 0;

  const now = new Date().toISOString();
  const instanceId = getConfig().instanceId;
  const tombstones: TombstoneDoc[] = [];

  // Reserve the whole tombstone seq range in ONE round trip. This used to call nextSeq()
  // per document — a sequential round trip each — so a 100k-document wipe paid 100k awaited
  // round trips before the delete even began. Gaps are harmless (sync compares seqs with `>`);
  // reuse would not be, which is why the block is reserved up-front and never rolled back.
  const firstSeq = await reserveSeqBlock(spaceId, ids.length);
  let seqCursor = firstSeq;

  for (const doc of ids) {
    const seq = seqCursor++;
    tombstones.push({
      _id: doc._id,
      type: 'memory',
      spaceId,
      deletedAt: now,
      instanceId,
      seq,
      ...(doc.seq !== undefined ? { originalSeq: doc.seq } : {}),
    });
  }

  const ops = tombstones.map(t => ({
    replaceOne: { filter: { _id: t._id }, replacement: t, upsert: true },
  }));
  await col<TombstoneDoc>(`${spaceId}_tombstones`).bulkWrite(asBulk<TombstoneDoc>(ops));
  await coll.deleteMany({});
  return ids.length;
}
