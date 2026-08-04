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
import { applyDeleteFields } from './delete-fields.js';
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
/**
 * The tags and properties an upsert will actually store, given the record it lands on.
 *
 * Both are MERGES, not replacements: an upsert that mentions one property keeps the rest. That rule
 * belongs to this function so that schema validation can ask what the stored record will look like
 * instead of guessing. It used to guess, and it guessed the payload — so a partial upsert against a
 * complete record was refused for missing required properties the record already had and kept.
 *
 * `existing` is null for an insert, where the merge is the identity function.
 */
export function mergedEntityWrite(
  existing: { tags?: string[]; properties?: Record<string, string | number | boolean> } | null | undefined,
  incoming: { tags?: string[]; properties?: Record<string, string | number | boolean> },
): { tags: string[]; properties: Record<string, string | number | boolean> } {
  return {
    tags: Array.from(new Set([...(existing?.tags ?? []), ...(incoming.tags ?? [])])),
    properties: { ...(existing?.properties ?? {}), ...(incoming.properties ?? {}) },
  };
}

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
  let embeddingFields: { embedding?: number[]; embeddingModel?: string; matchedText?: string } = {};
  try {
    const { tags: mergedTags, properties: mergedProps } = mergedEntityWrite(existing, { tags, properties });
    const effectiveDesc = description ?? existing?.description;
    const embedText = entityEmbedText(name, type, mergedTags, effectiveDesc, mergedProps);
    const embResult = await embed(embedText);
    embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model, matchedText: embedText };
  } catch { /* embedding unavailable — entity stored without vector */ }

  if (existing) {
    const { tags: updatedTags, properties: mergedProps } = mergedEntityWrite(existing, { tags, properties });
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
    _id: id ?? uuidv4(),
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
  await collection.insertOne(asDoc<EntityDoc>(doc));
  // Real-time duplicate-rule evaluation (opt-in per space). Fire-and-forget; the
  // dynamic import avoids a static cycle with dupe-scanner.js.
  if (getConfig().spaces.find(s => s.id === spaceId)?.dupeRulesOnInsert) {
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

/** Update an existing entity by ID. Partial update — only supplied fields are changed. Re-embeds when any content field changes. */
export async function updateEntityById(
  spaceId: string,
  id: string,
  updates: { name?: string; type?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean> },
  deleteFieldsPaths?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
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
  let newTags = updates.tags !== undefined
    ? Array.from(new Set([...(existing.tags ?? []), ...updates.tags]))
    : existing.tags ?? [];
  let newProps = updates.properties !== undefined
    ? { ...(existing.properties ?? {}), ...updates.properties }
    : { ...(existing.properties ?? {}) };

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

  if (updates.name !== undefined) $set['name'] = newName;
  if (updates.type !== undefined) $set['type'] = newType;
  if (updates.description !== undefined || (deleteFieldsPaths && !$unset['description'])) $set['description'] = newDesc;
  if (updates.tags !== undefined || (deleteFieldsPaths && !$unset['tags'])) $set['tags'] = newTags;
  if (updates.properties !== undefined || (deleteFieldsPaths && !$unset['properties'])) $set['properties'] = newProps;

  // Re-embed whenever any content field changes
  try {
    const embedText = entityEmbedText(newName, newType, newTags, newDesc, newProps);
    const embResult = await embed(embedText);
    $set['embedding'] = embResult.vector;
    $set['embeddingModel'] = embResult.model;
    $set['matchedText'] = embedText;
  } catch { /* embedding unavailable — keep existing embedding */ }

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
    { collection: 'entity', existing: existing as unknown as Record<string, unknown> }); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  // Lost-update detection, identical to `updateMemory` and for the same reason: `returnDocument: "before"`
  // hands back the record as it was at WRITE time, so comparing its seq with the one read at the top of this
  // function is exactly the test for another writer landing in the window. Observation only — no write that
  // previously succeeded is now rejected.
  const beforeWrite = await collection.findOneAndUpdate(
    asFilter<EntityDoc>({ _id: id }),
    asUpdate<EntityDoc>(updateOp),
    { returnDocument: 'before' },
  ) as EntityDoc | null;
  brainWriteSeqTotal.labels({
    collection: 'entities',
    outcome: beforeWrite && beforeWrite.seq !== existing.seq ? 'collision' : 'clean',
  }).inc();

  const result = {
    ...existing,
    name: newName,
    type: newType,
    tags: newTags,
    properties: newProps,
    updatedAt: now,
    seq,
    ...(updates.description !== undefined ? { description: newDesc } : {}),
    ...('embedding' in $set ? { embedding: $set['embedding'] as number[], embeddingModel: $set['embeddingModel'] as string } : {}),
  } as EntityDoc;
  if ('_expireAt' in $set) result._expireAt = $set['_expireAt'] as Date;
  else if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;

  // Apply deleteFields to the returned doc for consistency
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    applyDeleteFields(result as unknown as Record<string, unknown>, deleteFieldsPaths);
  }

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
