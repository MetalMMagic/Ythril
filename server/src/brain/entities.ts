import { v4 as uuidv4 } from 'uuid';
import { brainWriteSeqTotal } from '../metrics/registry.js';
import { authorRef } from '../config/author.js';
import { findInsertContradictions, type ContradictionWarning } from './insert-contradictions.js';
import { col, asFilter, asDoc, asUpdate, asBulk } from '../db/mongo.js';
import { nextSeq, reserveSeqBlock } from '../util/seq.js';
import { parseLimit, parseSkip } from '../util/pagination.js';
import { toMongoSort, type SortSpec } from './list-sort.js';
import { embed } from './embedding.js';
import { entityEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { stampSkewOnCreate } from './stamp-skew.js';
import { getSpaceMeta } from '../spaces/schema-validation.js';
import { writeFilterFor, writeOutcome } from './write-precondition.js';
import { applyDeleteFields, setUnlessDeleted } from './delete-fields.js';
import { mergeTagsAndProperties, mergePropertiesOrKeep, mergeTagsOrKeep } from './merge-fields.js';
import { enqueueEmbedJob } from './embed-queue.js';
import { checkDuplicates, type SimilarMatch, type DupeCheckOpts } from './recall.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import { log } from '../util/log.js';
import type { EntityDoc, EdgeDoc, MemoryDoc, ChronoEntry, TombstoneDoc, FileMetaDoc } from '../config/types.js';
import { PROPERTIES_SCAN_MAX_MS, textContains } from './tag-filter.js';

/** A backlink entry describing an item that references a given entity. */
export interface BacklinkEntry {
  type: 'edge' | 'memory' | 'chrono' | 'face';
  _id: string;
}

/**
 * Strip a deleted person's label from every face record that pointed at them.
 *
 * Face descriptors are not stored in a face collection — they are filemeta records
 * (`{fileId}#face-chunk{N}`) carrying `faceEmbedding` and, once labelled, `faceEntityId`. So deleting
 * the entity used to leave the biometric descriptor on disk still tagged with the identifier that was
 * just erased, and `gallerySearch` kept matching new uploads against it — the dangling label
 * propagated forward instead of decaying.
 *
 * **Unlabel, never delete.** The face record belongs to the *file*, which the operator did not
 * delete; removing it would destroy someone's image metadata as a side effect of deleting a contact.
 * "Delete this person" means we stop claiming to know whose face it is, not that the photo loses its
 * face. An operator who wants the descriptors gone deletes the file — that path already cascades
 * correctly, because `deleteConversionArtifacts` matches on `parentFileId`.
 *
 * Shared by every delete path (single, bulk, TTL sweep) on purpose: this being fixed in one caller
 * only is the exact shape of the original bug.
 *
 * @returns how many face records were unlabelled.
 */
export async function unlabelFacesForEntities(spaceId: string, entityIds: string[]): Promise<number> {
  if (entityIds.length === 0) return 0;
  return unlabelFacesWhere(spaceId, { faceEntityId: { $in: entityIds } });
}

/** Clear every face label in a space — for the bulk wipe, where all entities are gone by definition. */
export async function unlabelAllFaces(spaceId: string): Promise<number> {
  return unlabelFacesWhere(spaceId, { faceEntityId: { $exists: true } });
}

async function unlabelFacesWhere(spaceId: string, match: Record<string, unknown>): Promise<number> {
  const res = await col<FileMetaDoc>(`${spaceId}_files`).updateMany(
    asFilter<FileMetaDoc>(match),
    asUpdate<FileMetaDoc>({ $unset: { faceEntityId: '', faceScore: '' } }),
  );
  const n = res.modifiedCount ?? 0;
  if (n > 0) log.info(`Unlabelled ${n} face record(s) in '${spaceId}' after entity deletion`);
  return n;
}

export interface UpsertResult {
  entity: EntityDoc;
  warning?: string;
  /** Near-duplicate entities surfaced by an opt-in insert-time similarity check. */
  similar?: SimilarMatch[];
  /** Near-neighbours that structurally CONTRADICT this entity (same single-valued property, different
   *  value). Advisory — the entity is stored regardless. */
  contradicts?: ContradictionWarning[];
}


/** Derive the text to embed for an entity (name + type + tags + description + properties). */

/**
 * Create or update an entity.
 *
 * Identity semantics (Defect 2 fix):
 *  - If `id` is supplied → look up by `_id`; update the document if found, or insert
 *    a new document with that exact `_id` if not found (upsert by ID).
 *  - If `id` is not supplied → always insert a new document with a freshly generated
 *    UUID v4 as `_id`.  Name is a non-unique searchable label, not a primary key.
 *
 * Callers that need name-based lookup should use `findEntitiesByName`.
 */
export async function upsertEntity(
  spaceId: string,
  name: string,
  type: string,
  tags: string[] = [],
  properties: Record<string, string | number | boolean> = {},
  description?: string,
  id?: string,
  opts?: DupeCheckOpts,
  actor?: WebhookActor,
  ttlDays?: number | null,
): Promise<UpsertResult> {
  const collection = col<EntityDoc>(`${spaceId}_entities`);

  // When an id is provided, attempt to find the existing record by primary key.
  const existing: EntityDoc | null = id
    ? (await collection.findOne(asFilter<EntityDoc>({ _id: id, spaceId })) as EntityDoc | null)
    : null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();

  // Embed the entity text (best-effort — if embedding fails we still store the entity)
  //
  // Queued by default, so the write does not pay the model's latency. `matchedText` is stored either
  // way: it is a pure string, it is exactly what the queued job will embed, and recording it now is what
  // lets the stored vector be checked against the text it came from.
  const forEmbed = mergeTagsAndProperties(existing, { tags, properties });
  const embedText = entityEmbedText(name, type, forEmbed.tags, description ?? existing?.description, forEmbed.properties);
  //
  // The duplicate/contradiction checks below compare THIS record's vector against its neighbours, so they
  // cannot run without one — and unlike the embedding itself, that question cannot be deferred and
  // answered later in a response that has already been sent. So they imply the wait, exactly as they do
  // in `remember`. Implied rather than rejected as an invalid combination: a caller asking "is this a
  // duplicate?" would otherwise get a silent "no".
  const needsVectorNow = opts?.waitForEmbedding === true
    || opts?.checkDuplicates === true || opts?.checkContradictions === true;
  let embeddingFields: { embedding?: number[]; embeddingModel?: string; matchedText?: string } = { matchedText: embedText };
  if (needsVectorNow) {
    // Unguarded on purpose: the caller asked for a record searchable when this returns, so falling back
    // to "stored, not searchable" would answer a different question than the one asked.
    const embResult = await embed(embedText);
    embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model, matchedText: embedText };
  }

  if (existing) {
    const { tags: updatedTags, properties: mergedProps } = mergeTagsAndProperties(existing, { tags, properties });
    const $set: Record<string, unknown> = { name, type, tags: updatedTags, properties: mergedProps, updatedAt: now, seq, ...embeddingFields };
    if (description !== undefined) $set['description'] = description;
    const $unset: Record<string, unknown> = {};
    applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
      { collection: 'entity', existing: existing as unknown as Record<string, unknown> }); // F10
    const updateOp: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
    await collection.updateOne(
      asFilter<EntityDoc>({ _id: existing._id }),
      asUpdate<EntityDoc>(updateOp),
    );
    const entity: EntityDoc = { ...existing, name, type, tags: updatedTags, properties: mergedProps, updatedAt: now, seq, ...embeddingFields, ...(description !== undefined ? { description } : {}) };
    if ('_expireAt' in $set) entity._expireAt = $set['_expireAt'] as Date;
    else if ('_expireAt' in $unset) delete (entity as { _expireAt?: unknown })._expireAt;
    // After the write, never before: a job for a record that failed to store would be a job for nothing.
    if (!embeddingFields.embedding) await enqueueEmbedJob(spaceId, 'entity', entity._id);
    if (actor) emitWebhookEvent({ event: 'entity.updated', spaceId, entry: { ...entity, embedding: undefined }, ...actor });
    return { entity };
  }

  // Warn when inserting without an explicit id and duplicates already exist
  let warning: string | undefined;
  if (!id) {
    const existingCount = await collection.countDocuments(asFilter<EntityDoc>({ spaceId, name, type }));
    if (existingCount > 0) {
      warning = `${existingCount} existing entit${existingCount === 1 ? 'y' : 'ies'} with name '${name}' and type '${type}' already exist in this space. A new entity was created because no id was supplied. To update an existing entity, provide its id.`;
    }
  }

  // Opt-in insert-time duplicate / contradiction checks, using the freshly computed vector BEFORE insert
  // so it can never self-match. ONE neighbour search serves both flags.
  let similar: SimilarMatch[] | undefined;
  let contradicts: ContradictionWarning[] | undefined;
  if ((opts?.checkDuplicates || opts?.checkContradictions) && embeddingFields.embedding) {
    const hits = await checkDuplicates(spaceId, 'entity', embeddingFields.embedding, opts.dupeThreshold, opts.dupeTopK);
    if (opts.checkDuplicates && hits.length > 0) similar = hits;
    if (opts.checkContradictions && hits.length > 0) {
      const found = await findInsertContradictions(spaceId, 'entity', { properties }, hits);
      if (found.length > 0) contradicts = found;
    }
  }

  const doc: EntityDoc = {
    // ID IS ID (owner ruling, 2026-08-12): the identity is ours to mint, always. A supplied id may
    // ADDRESS an existing record — the update path above — but it never becomes a new record's identity.
    // It used to: a supplied id that named nothing was adopted, which made the caller a co-author of our
    // primary key and, across a sync, let two instances deriving ids from the same key collide by design.
    // A caller wanting to carry their own reference puts it in `name` or `description`, which are for that.
    _id: uuidv4(),
    spaceId,
    name,
    type,
    tags,
    properties,
    author: authorRef(),
    createdAt: now,
    updatedAt: now,
    seq,
    ...embeddingFields,
  };
  if (description !== undefined) doc.description = description;
  // `typed` is what makes the SCHEMA tier reachable. Omit it and the resolver silently falls through to the
  // space default, so a window set on `typeSchemas.entity.<type>.retention` does nothing at all.
  stampExpiryOnCreate(spaceId, doc, ttlDays, { collection: 'entity', type: doc.type });
  // Warn-not-refuse: a caller's own stamp checked against ours. Stored only when it disagrees beyond the space's
  // threshold, so presence is the signal. The write proceeds either way -- a backdated import is legitimate.
  stampSkewOnCreate(doc, getSpaceMeta(spaceId));
  await collection.insertOne(asDoc<EntityDoc>(doc));
  if (!embeddingFields.embedding) await enqueueEmbedJob(spaceId, 'entity', doc._id);
  // Real-time duplicate-rule evaluation (opt-in per space). Fire-and-forget; the
  // dynamic import avoids a static cycle with dupe-scanner.js.
  //
  // Behind the embedding, not beside it. This evaluates the STORED record against its neighbours, and a
  // stored record has no vector until the queue gets to it — firing here would compare nothing and find
  // nothing, silently. Nothing is lost by the wait: this path is fire-and-forget and writes candidates to
  // the Review surface rather than returning them, so no caller is holding a response open for it.
  // Only when we embedded INLINE — otherwise the embed worker runs it once the vector exists, so this
  // guard is what stops it running twice rather than what stops it running at all.
  if (embeddingFields.embedding && getConfig().spaces.find(s => s.id === spaceId)?.dupeRulesOnInsert) {
    import('./dupe-scanner.js').then(m => m.evaluateRecordForDuplicates(spaceId, 'entity', doc._id)).catch(() => { /* best-effort */ });
  }
  if (actor) emitWebhookEvent({ event: 'entity.created', spaceId, entry: { ...doc, embedding: undefined }, ...actor });
  // Advisory only — the entity is stored either way.
  return { entity: doc, warning, similar, contradicts };
}

/**
 * Find all entities in a space that match the given name (case-sensitive).
 * Returns an empty array when no match is found.
 * Name is a non-unique label, so multiple results are possible.
 */
export async function findEntitiesByName(spaceId: string, name: string): Promise<EntityDoc[]> {
  return col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ spaceId, name }))
    .toArray() as Promise<EntityDoc[]>;
}

/**
 * Fetch several entities by id in one query.
 *
 * Callers linking records hold ids, but the embedded text wants names — an entity's name is what a
 * semantic search actually matches on, so dropping it from the embed text would quietly degrade
 * recall for every linked record. One `$in` beats a lookup per id.
 */
export async function findEntitiesByIds(spaceId: string, ids: readonly string[]): Promise<EntityDoc[]> {
  if (ids.length === 0) return [];
  return col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ _id: { $in: [...new Set(ids)] }, spaceId }))
    .toArray() as Promise<EntityDoc[]>;
}

/** Find an entity by exact ID */
export async function getEntityById(spaceId: string, id: string): Promise<EntityDoc | null> {
  return col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: id, spaceId })) as Promise<EntityDoc | null>;
}

/**
 * Update an existing entity by ID. Partial update — only supplied fields are changed. Re-embeds when any
 * content field changes.
 *
 * `ifMatchSeq` is the optimistic-concurrency precondition: the write only lands if the record's `seq` is
 * still that value. `undefined` means no precondition and the write proceeds exactly as it always has.
 * See `writeFilterFor` for why it is enforced in the filter rather than by comparing the read.
 */
export async function updateEntityById(
  spaceId: string,
  id: string,
  updates: { name?: string; type?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; excludeFromVectorSearch?: boolean },
  deleteFieldsPaths?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
  ifMatchSeq?: number,
): Promise<EntityDoc | null> {
  const collection = col<EntityDoc>(`${spaceId}_entities`);
  const existing = await collection.findOne(asFilter<EntityDoc>({ _id: id, spaceId })) as EntityDoc | null;
  if (!existing) return null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now, seq };
  const $unset: Record<string, unknown> = {};

  const newName = updates.name ?? existing.name;
  const newType = updates.type ?? existing.type;
  const newDesc = updates.description !== undefined ? updates.description : existing.description;
  let newTags = mergeTagsOrKeep(existing.tags, updates.tags);
  let newProps = mergePropertiesOrKeep(existing.properties, updates.properties) ?? {};

  // Apply deleteFields after merge
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    const merged: Record<string, unknown> = {
      description: newDesc,
      tags: newTags,
      properties: newProps,
    };
    applyDeleteFields(merged, deleteFieldsPaths);

    // Reflect deletions back
    if (!('description' in merged)) {
      $unset['description'] = '';
    }
    if (!('tags' in merged)) {
      newTags = [];
      $unset['tags'] = '';
    } else {
      newTags = merged['tags'] as string[];
    }
    if (!('properties' in merged)) {
      newProps = {} as Record<string, string | number | boolean>;
      $unset['properties'] = '';
    } else {
      newProps = merged['properties'] as Record<string, string | number | boolean>;
    }
  }

  if (updates.excludeFromVectorSearch !== undefined) $set['excludeFromVectorSearch'] = updates.excludeFromVectorSearch;
  if (updates.name !== undefined) $set['name'] = newName;
  if (updates.type !== undefined) $set['type'] = newType;
  // `setUnlessDeleted` rather than a guard on `$unset['x']`: that value is the empty string, so the old test was
  // always true and every whole-field `deleteFields` produced a rejected write. See its doc comment.
  setUnlessDeleted($set, $unset, 'description', newDesc, updates.description !== undefined || !!deleteFieldsPaths);
  setUnlessDeleted($set, $unset, 'tags', newTags, updates.tags !== undefined || !!deleteFieldsPaths);
  setUnlessDeleted($set, $unset, 'properties', newProps, updates.properties !== undefined || !!deleteFieldsPaths);

  // The re-embed is ENQUEUED after the write, not computed here. See `embedStoredRecord` for why computing
  // it inline was wrong rather than merely slow: the text would come from this function's stale read.

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
    { collection: 'entity', existing: existing as unknown as Record<string, unknown> }); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  // Lost-update detection, identical to `updateMemory` and for the same reason: `returnDocument: "before"`
  // hands back the record as it was at WRITE time, so comparing its seq with the one read at the top of this
  // function is exactly the test for another writer landing in the window. Observation only — no write that
  // previously succeeded is now rejected.
  const beforeWrite = await collection.findOneAndUpdate(
    asFilter<EntityDoc>(writeFilterFor(id, ifMatchSeq)),
    asUpdate<EntityDoc>(updateOp),
    { returnDocument: 'before' },
  ) as EntityDoc | null;
  brainWriteSeqTotal.labels({
    collection: 'entities',
    outcome: writeOutcome(!!beforeWrite, ifMatchSeq !== undefined, !!beforeWrite && beforeWrite.seq !== existing.seq),
  }).inc();
  // Nothing matched, so nothing was written. Everything below builds the response out of `existing`, which
  // would describe a write that did not happen — a fabricated 200 that predates the precondition and was
  // reachable whenever a record was deleted inside the read-then-write window.
  if (!beforeWrite) return null;

  const result = {
    ...existing,
    name: newName,
    type: newType,
    tags: newTags,
    properties: newProps,
    updatedAt: now,
    seq,
    ...(updates.description !== undefined ? { description: newDesc } : {}),
  } as EntityDoc;
  if ('_expireAt' in $set) result._expireAt = $set['_expireAt'] as Date;
  else if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;

  // Apply deleteFields to the returned doc for consistency
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    applyDeleteFields(result as unknown as Record<string, unknown>, deleteFieldsPaths);
  }

  // ONE enqueue, unconditionally, for every successful update.
  //
  // It used to be conditional on `excludeFromVectorSearch` being present, because every other path embedded
  // inline. Now that the vector always comes from the queue, the same call covers both jobs: recompute the
  // text from the record as STORED, and honour the exclusion flag in whichever direction it was moved —
  // `embedStoredRecord` unsets the vector when the flag is on and computes one when it is off, so this path
  // still never has to know which way the toggle went.
  await enqueueEmbedJob(spaceId, 'entity', result._id);
  if (actor) emitWebhookEvent({ event: 'entity.updated', spaceId, entry: { ...result, embedding: undefined }, ...actor });
  return result;
}

/** List entities with optional filter */
export async function listEntities(
  spaceId: string,
  filter: Record<string, unknown> = {},
  limit = 50,
  skip = 0,
  sort?: SortSpec,
): Promise<EntityDoc[]> {
  const cursor = col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ ...filter, spaceId }));
  // A properties-value filter is a collection scan by nature ($expr cannot use an index), so it
  // carries its own deadline instead of running unbounded on a large space.
  cursor.maxTimeMS(filter['$expr'] ? PROPERTIES_SCAN_MAX_MS : 60_000);
  // Default is natural (insertion) order — unchanged for every existing caller. A sort is only
  // applied when one is explicitly requested.
  if (sort) cursor.sort(toMongoSort(sort));
  return cursor
    .skip(parseSkip(skip))
    .limit(parseLimit(limit, 20, 1000))
    .toArray() as Promise<EntityDoc[]>;
}

/** Delete an entity and write tombstone */
export async function deleteEntity(
  spaceId: string,
  entityId: string,
  actor?: WebhookActor,
): Promise<boolean> {
  const existing = await col<EntityDoc>(`${spaceId}_entities`)
    .findOne(asFilter<EntityDoc>({ _id: entityId, spaceId }), { projection: { seq: 1 } }) as { seq?: number } | null;
  const seq = await nextSeq(spaceId);
  const result = await col<EntityDoc>(`${spaceId}_entities`).deleteOne({
    _id: entityId,
    spaceId,
  });
  if (result.deletedCount === 0) return false;

  const tombstone: TombstoneDoc = {
    _id: entityId,
    type: 'entity',
    spaceId,
    deletedAt: new Date().toISOString(),
    instanceId: getConfig().instanceId,
    seq,
    ...(existing?.seq !== undefined ? { originalSeq: existing.seq } : {}),
  };
  await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
    asFilter<TombstoneDoc>({ _id: entityId }),
    asDoc<TombstoneDoc>(tombstone),
    { upsert: true },
  );
  // Erasure has to reach the biometric copy too — see unlabelFacesForEntities.
  await unlabelFacesForEntities(spaceId, [entityId]);
  if (actor) emitWebhookEvent({ event: 'entity.deleted', spaceId, entry: { _id: entityId }, ...actor });
  return true;
}

/** Bulk-delete all entities in a space, writing a tombstone per deleted doc. */
export async function bulkDeleteEntities(spaceId: string): Promise<number> {
  const coll = col<EntityDoc>(`${spaceId}_entities`);
  const ids = await coll.find({}, { projection: { _id: 1, seq: 1 } }).toArray() as { _id: string; seq?: number }[];
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
      type: 'entity',
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
  // Same cascade as the single delete — a bulk wipe must not be the path that leaves labels behind.
  // Every entity in the space is gone, so every face label is dangling by definition: clear them
  // wholesale rather than passing `ids` to a `$in`, which on a 100k-entity wipe would build a 100k
  // element query for a filter that means "all of them" — the same round-trip trap the seq-block
  // reservation above exists to avoid.
  await unlabelAllFaces(spaceId);
  return ids.length;
}

/**
 * Find all items in a space that hold inbound references to the given entity ID.
 * Checks edges (from/to), memories (entityIds), chrono entries (entityIds), and labelled face
 * records (`faceEntityId`).
 * Returns a (possibly empty) list of backlink entries.
 *
 * Faces were the gap: this scanned `_edges` / `_memories` / `_chrono` and not `_files`, so under
 * `strictLinkage` — the strongest setting available — a person referenced *only* by their face
 * labels deleted cleanly, and the 409 that exists to say "something still points at this" stayed
 * silent about the one reference class holding biometric data.
 */
export async function findEntityBacklinks(spaceId: string, entityId: string): Promise<BacklinkEntry[]> {
  const backlinks: BacklinkEntry[] = [];

  // Edges referencing this entity as from or to
  const edges = await col<EdgeDoc>(`${spaceId}_edges`)
    .find(asFilter<EdgeDoc>({ spaceId, $or: [{ from: entityId }, { to: entityId }] }), { projection: { _id: 1 } })
    .toArray() as Array<{ _id: string }>;
  for (const e of edges) backlinks.push({ type: 'edge', _id: e._id });

  // Memories referencing this entity in entityIds
  const memories = await col<MemoryDoc>(`${spaceId}_memories`)
    .find(asFilter<MemoryDoc>({ spaceId, entityIds: entityId }), { projection: { _id: 1 } })
    .toArray() as Array<{ _id: string }>;
  for (const m of memories) backlinks.push({ type: 'memory', _id: m._id });

  // Chrono entries referencing this entity in entityIds
  const chronos = await col<ChronoEntry>(`${spaceId}_chrono`)
    .find(asFilter<ChronoEntry>({ spaceId, entityIds: entityId }), { projection: { _id: 1 } })
    .toArray() as Array<{ _id: string }>;
  for (const c of chronos) backlinks.push({ type: 'chrono', _id: c._id });

  // Face records labelled with this entity. These live in `${spaceId}_files` as face-chunk filemeta
  // docs, which is why the other three scans missed them.
  const faces = await col<FileMetaDoc>(`${spaceId}_files`)
    .find(asFilter<FileMetaDoc>({ faceEntityId: entityId }), { projection: { _id: 1 } })
    .toArray() as Array<{ _id: string }>;
  for (const f of faces) backlinks.push({ type: 'face', _id: f._id });

  return backlinks;
}

/** Cap on how many entity ids a name filter may expand to, bounding the `$in` it produces. */
export const NAME_FILTER_ID_CAP = 500;

/**
 * Entity ids whose NAME contains `needle` (case-insensitive substring), within one member space.
 *
 * The From/To and Entities columns display entity NAMES while the records store ids, so a column filter
 * has to translate before it can query. Doing it here — rather than post-filtering the page in the
 * client — means the filter applies to the whole collection, not just the rows that happened to load.
 *
 * Called per MEMBER (inside `collectAcrossMembers`): ids belong to the member that owns them, and
 * resolving against another member's entities would match nothing while looking like it worked.
 *
 * Returns at most `NAME_FILTER_ID_CAP` ids. An empty result is meaningful — it means "no entity by that
 * name", so the caller filters to nothing rather than falling back to unfiltered.
 */
export async function resolveEntityIdsByName(spaceId: string, needle: string): Promise<string[]> {
  const trimmed = needle.trim();
  if (!trimmed) return [];
  const docs = await col<EntityDoc>(`${spaceId}_entities`)
    .find(asFilter<EntityDoc>({ name: textContains(trimmed) }), { projection: { _id: 1 } })
    .limit(NAME_FILTER_ID_CAP)
    .toArray();
  return docs.map(d => String(d._id));
}
