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
import { parseLimit, parseSkip } from '../util/pagination.js';
import { toMongoSort, type SortSpec } from './list-sort.js';
import { embed } from './embedding.js';
import { memoryEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { applyDeleteFields } from './delete-fields.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { MemoryDoc, EntityDoc, TombstoneDoc } from '../config/types.js';
import { SimilarMatch, DupeCheckOpts, checkDuplicates } from './recall.js';

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
): Promise<MemoryDoc & { similar?: SimilarMatch[]; contradicts?: ContradictionWarning[] }> {
  const names = entityNames ?? await resolveEntityNames(spaceId, entityIds);
  const embedText = memoryEmbedText(fact, tags, names, description, properties);
  const embResult = await embed(embedText);

  // Opt-in insert-time duplicate / contradiction checks, using the freshly computed vector BEFORE insert
  // so it can never self-match. ONE neighbour search serves both flags — the second question is free once
  // the first has paid for the vector search.
  let similar: SimilarMatch[] | undefined;
  let contradicts: ContradictionWarning[] | undefined;
  if (opts?.checkDuplicates || opts?.checkContradictions) {
    const hits = await checkDuplicates(spaceId, 'memory', embResult.vector, opts.dupeThreshold, opts.dupeTopK);
    if (opts.checkDuplicates && hits.length > 0) similar = hits;
    if (opts.checkContradictions && hits.length > 0) {
      const found = await findInsertContradictions(spaceId, 'memory', { properties }, hits);
      if (found.length > 0) contradicts = found;
    }
  }

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const doc: MemoryDoc = {
    _id: uuidv4(),
    spaceId,
    fact,
    embedding: embResult.vector,
    tags,
    entityIds,
    matchedText: embedText,
    author: authorRef(),
    createdAt: now,
    updatedAt: now,
    seq,
    embeddingModel: embResult.model,
  };
  if (type !== undefined) doc.type = type;
  if (description !== undefined) doc.description = description;
  if (properties !== undefined) doc.properties = properties;
  stampExpiryOnCreate(spaceId, doc, ttlDays);
  await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(doc));
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

  if (updates.fact !== undefined) $set['fact'] = updates.fact;
  if (updates.tags !== undefined) $set['tags'] = updates.tags;
  if (updates.entityIds !== undefined) $set['entityIds'] = updates.entityIds;
  if (updates.description !== undefined) $set['description'] = updates.description;
  if (updates.properties !== undefined) $set['properties'] = updates.properties;
  if (updates.type !== undefined) $set['type'] = updates.type;

  // Apply deleteFields after merge
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    // Build a merged view for deleteFields application
    const merged: Record<string, unknown> = {
      fact: updates.fact ?? existing.fact,
      tags: updates.tags ?? existing.tags,
      entityIds: updates.entityIds ?? existing.entityIds,
      description: updates.description !== undefined ? updates.description : existing.description,
      properties: updates.properties ?? (existing.properties != null ? { ...existing.properties } : {}),
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

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  await col<MemoryDoc>(`${spaceId}_memories`).updateOne(
    asFilter<MemoryDoc>({ _id: memoryId }),
    asUpdate<MemoryDoc>(updateOp),
  );

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
