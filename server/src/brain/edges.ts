import { edgeIdFor } from './edge-id.js';
import { brainWriteSeqTotal } from '../metrics/registry.js';
import { authorRef } from '../config/author.js';
import { col, asFilter, asDoc, asUpdate, asBulk } from '../db/mongo.js';
import { nextSeq, reserveSeqBlock } from '../util/seq.js';
import { parseLimit, parseSkip } from '../util/pagination.js';
import { toMongoSort, type SortSpec } from './list-sort.js';
import { NEVER_RETURNED_PROJECTION, withoutVector } from './read-projection.js';
import { findEdgeByTriplet } from './edge-lookup.js';
import { classifyEdgeUpsertAgainst, SchemaViolationError, type UpdateValidation } from './write-validation.js';
import { applyPropertyDefaults } from '../spaces/schema-validation.js';
import { textSearchOr, SEARCHABLE_FIELDS } from './text-search.js';
import { embed } from './embedding.js';
import { edgeEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { stampSkewOnCreate } from './stamp-skew.js';
import { getSpaceMeta } from '../spaces/schema-validation.js';
import { applyDeleteFields, setUnlessDeleted } from './delete-fields.js';
import { mergePropertiesOrKeep, mergeTagsOrKeep } from './merge-fields.js';
import { enqueueEmbedJob, retireEmbedJob } from './embed-queue.js';
import { embeddingSuppressedFor } from './suppress-embeddings.js';
import { linksToAny, linkClassFor } from './link-adjacency.js';
import { getEntityById } from './entities.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { EdgeDoc, EntityDoc, TombstoneDoc, ChronoEntry, MemoryDoc, FileMetaDoc } from '../config/types.js';
import { tagContains, textContains, propertiesValueContains, PROPERTIES_SCAN_MAX_MS } from './tag-filter.js';
import { writeFilterFor, writeOutcome } from './write-precondition.js';
import { mirrorLegacySuppression } from './suppress-embeddings.js';

export interface TraverseNode {
  _id: string;
  name: string;
  type: string;
  depth: number;
  /**
   * WHICH collection this node lives in.
   *
   * Absent on an entity — every node was one until chrono entries became reachable, so absence keeps every
   * existing response byte-identical. Present and `'chrono'` on a chrono entry, or `'memory'` on a memory,
   * because each is looked up in a different collection and a caller that follows `_id` needs to know where
   * to look. Guessing from `type` does not work: a chrono's `type` is `event`/`deadline`/…, a memory's is
   * optional entirely, and an entity's is whatever the space calls it.
   */
  kind?: 'chrono' | 'memory' | 'file';
  /**
   * File META only, and only on a `kind: 'file'` node. A file's searchable body is its CHUNKS, which are
   * large and are what recall returns; a traverse answer that carried passage text would blow up in size for
   * a walk that asked about structure. So a file node reports what the file IS — its path as `name`, plus
   * these two — and a caller who wants the content reads it with the file API.
   */
  description?: string;
  tags?: string[];
}

export interface TraverseEdge {
  _id: string;
  from: string;
  to: string;
  label: string;
}

export interface TraverseResult {
  nodes: TraverseNode[];
  edges: TraverseEdge[];
  truncated: boolean;
}

// The three link classes, resolved once at module load rather than looked up per frontier. `!` because
// `LINK_CLASSES` declares all three — a missing one is a programming error, not a runtime condition.
const CHRONO_LINKS = linkClassFor('chrono')!;
const MEMORY_LINKS = linkClassFor('memory')!;
const FILE_LINKS = linkClassFor('file')!;

/**
 * The id of a SYNTHETIC traverse edge — the link from an entity to a chrono entry, memory or file.
 *
 * ## What it replaces, and why that was wrong in both directions
 *
 * These edges used to carry the TARGET DOCUMENT'S OWN `_id`, on this rationale: *"nothing has to invent an
 * edge id that does not exist — a caller looking it up finds the chrono, not a 404."*
 *
 * **The consumer half of that was the exact opposite of true.** `getEdgeById` queries `${spaceId}_edges` and
 * nothing else, and a chrono lives in `_chrono`, a memory in `_memories`, a file in `_files`. So the
 * "helpful" id 404s on every edge-lookup path the product actually has — `GET /edges/:id`, the PATCH, and
 * `update_edge`. The one lookup that does resolve is `GET /chrono/:id`, which needs an id the caller already
 * has from the NODE. The affordance was never delivered; only the collision was.
 *
 * **And it made the links disappear.** A graph library has ONE id namespace for nodes and edges — cytoscape
 * skips a repeated id with a bare `continue` inside its `Collection` constructor, before the code path that
 * would have thrown. Nodes are added before edges, so the node always won and the edge was always dropped,
 * silently. What an operator saw was a detached band of chrono bubbles floating above the graph, connected
 * to nothing, with no console output and an edge count that overreported by exactly that many.
 *
 * ## The shape
 *
 * Label-prefixed and carrying both endpoints, so it can collide with neither a stored edge `_id` (a UUID) nor
 * any node id (also a UUID). Two seeds linking to the SAME chrono entry produce two different edges, which is
 * correct — they are two different relationships — and under the old scheme they were one id twice.
 *
 * It is deliberately NOT a UUID: a synthetic edge has no stored record, and an id shaped like a real one
 * invites exactly the lookup that cannot work. This one says what it is.
 */
export function syntheticEdgeId(label: string, from: string, to: string): string {
  return `${label}:${from}:${to}`;
}


/** Resolve entity IDs to names for embedding. Falls back to the raw ID if the entity is not found. */
export async function resolveEdgeEntityNames(spaceId: string, fromId: string, toId: string): Promise<[string, string]> {
  const [fromDoc, toDoc] = await Promise.all([
    getEntityById(spaceId, fromId),
    getEntityById(spaceId, toId),
  ]);
  return [fromDoc?.name ?? fromId, toDoc?.name ?? toId];
}

/**
 * Upsert a directed edge (from → to with label).
 * One edge per (from, to, label) triplet.
 */
/**
 * The edge an upsert would land on, by its identity triplet.
 *
 * An edge has no user-supplied id: `(from, to, label)` IS the identity, and three separate places
 * re-derived that filter — the upsert itself, the bulk importer's inserted-vs-updated counter, and now
 * validation. One of them getting it wrong would silently validate against the wrong record.
 *
 * ## It is also projected, which fixes a leak on a path nobody would look at for one
 *
 * `upsertEdge` spreads this document into the edge it RETURNS, and the route sends that as its 201. So an
 * ordinary edge update — no `waitForEmbedding`, no flag of any kind — answered with the stored float array,
 * measured against the live stack 2026-08-19. It was the only vector leak reachable without asking for an
 * inline embed.
 *
 * Nothing needs the old vector: the upsert either recomputes it or leaves the stored field untouched, and the
 * other two callers (the bulk importer's counter and `write-validation`) read `properties`.
 */
// Moved to `edge-lookup.ts` so `write-validation.ts` can have it without importing this file back — see the
// note there. Re-exported because it is part of this module's published surface and callers should not care.
export { findEdgeByTriplet } from './edge-lookup.js';

/**
 * A refused edge write, carrying the whole classification rather than a message.
 *
 * Both doors already answer with `{ error: 'schema_violation', message, violations, introduced, preExisting }`,
 * and neither should have to rebuild that from prose. Carrying `UpdateValidation` means the response shape is
 * unchanged by moving the check, which is the whole point: this is a relocation of one rule, not a new refusal.
 */
export class EdgeSchemaViolation extends Error {
  constructor(readonly check: UpdateValidation) {
    super(check.message ?? 'schema_violation');
    this.name = 'EdgeSchemaViolation';
  }
}

export async function upsertEdge(
  spaceId: string,
  from: string,
  to: string,
  label: string,
  weight?: number,
  type?: string,
  description?: string,
  properties?: Record<string, string | number | boolean>,
  tags?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
  /**
   * Write options. An object rather than a twelfth positional — `remember` already carries a note saying
   * its twelfth was one too many, and this is the same signature growing the same way.
   */
  /**
   * `onValidation` hands the classification back to the caller — the warnings a `warn` space wants in its 201,
   * and the `preExisting`/`introduced` split. It exists so a door never has to run `classifyEdgeUpsert` a
   * second time for presentation: that would be two `findEdgeByTriplet` lookups per write, and it is how the
   * rule ended up written twice in the first place.
   */
  opts?: { waitForEmbedding?: boolean; onValidation?: (check: UpdateValidation) => void },
): Promise<EdgeDoc> {
  const collection = col<EdgeDoc>(`${spaceId}_edges`);
  const existing = await findEdgeByTriplet(spaceId, from, to, label);

  /*
   * THE SCHEMA IS ENFORCED HERE, so that no caller can reach the collection around it.
   *
   * It used to be enforced by the two API routes, each calling `classifyEdgeUpsert` before calling this
   * function — one rule, written twice, and both copies reachable only if you remembered them. Two callers did
   * not: `api/contradictions.ts` writes a `supersedes` edge straight through this function, so in a space whose
   * `typeSchemas.edge` allowlist did not name `supersedes` the server wrote an edge that space forbids; and
   * `brain/bulk.ts` carried its own third copy of the check.
   *
   * Owner's ruling, 2026-08-29: *"upsertEdge should validate of course."* So the door is the function, not the
   * route. The routes keep their response shapes by catching `EdgeSchemaViolation` — which carries the whole
   * classification, not just a message, precisely so neither door has to re-derive it.
   */
  /*
   * Declared defaults fill in what the caller omitted, before validation and only on an INSERT.
   *
   * Before validation because a property that is `required` and has a `default` must not be a violation — the
   * default is what satisfies the requirement. Only on insert because on an update an absent property may be
   * one the caller has just removed, and resurrecting a deliberate deletion is worse than a default that does
   * not apply. See `applyPropertyDefaults`.
   */
  const meta = getSpaceMeta(spaceId);
  const withDefaults = existing
    ? properties
    : applyPropertyDefaults(meta?.typeSchemas?.edge?.[label], properties);

  const check = classifyEdgeUpsertAgainst(meta, existing, { label, properties: withDefaults });
  if (check.blocked) throw new EdgeSchemaViolation(check);
  opts?.onValidation?.(check);

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();

  const effectiveDesc = description ?? (existing as EdgeDoc | null)?.description;
  const effectiveType = type ?? (existing as EdgeDoc | null)?.type;
  const effectiveTags = mergeTagsOrKeep((existing as EdgeDoc | null)?.tags, tags);
  // `withDefaults`, not `properties` — the defaults were validated above and must be the values STORED.
  // Validating one document and writing another is the shape that produced the memory-upsert defect.
  const effectiveProps = mergePropertiesOrKeep((existing as EdgeDoc | null)?.properties, withDefaults);

  // Embed the edge text (best-effort) — resolve entity names so the vector captures semantics
  // Queued by default — see the note in `upsertEntity`. Resolving the endpoint NAMES is a database read,
  // so it happens only on the inline path; the queued job resolves them itself from the stored edge.
  let embeddingFields: { embedding?: number[]; embeddingModel?: string; matchedText?: string } = {};
  // Suppression wins over `waitForEmbedding` — see `embeddingSuppressedFor`. An edge keys its schema on
  // `label`, not `type`, which `schemaKeyFor` already encodes; passing `type` here would look up a schema
  // that is never there and silently never suppress.
  if (opts?.waitForEmbedding === true && !embeddingSuppressedFor(spaceId, 'edge', { label })) {
    const [fromName, toName] = await resolveEdgeEntityNames(spaceId, from, to);
    const embedText = edgeEmbedText(fromName, label, toName, effectiveTags, effectiveType, effectiveDesc, effectiveProps);
    const embResult = await embed(embedText);
    embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model, matchedText: embedText };
  }

  if (existing) {
    const $set: Record<string, unknown> = { updatedAt: now, seq, ...embeddingFields };
    if (weight !== undefined) $set['weight'] = weight;
    if (type !== undefined) $set['type'] = type;
    if (description !== undefined) $set['description'] = description;
    // When tags are provided, persist the merged result; otherwise leave existing tags unchanged
    if (tags !== undefined) $set['tags'] = effectiveTags;
    if (properties !== undefined) $set['properties'] = effectiveProps;
    const $unset: Record<string, unknown> = {};
    applyExpiryToUpdate(spaceId, ttlDays, (existing as EdgeDoc)._expireAt != null, $set, $unset,
      { collection: 'edge', existing: existing as unknown as Record<string, unknown> }); // F10
    const updateOp: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
    await collection.updateOne(
      asFilter<EdgeDoc>({ _id: (existing as EdgeDoc)._id }),
      asUpdate<EdgeDoc>(updateOp),
    );
    const updatedEdge: EdgeDoc = {
      ...(existing as EdgeDoc),
      seq,
      updatedAt: now,
      ...(weight !== undefined ? { weight } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(tags !== undefined ? { tags: effectiveTags } : {}),
      ...(properties !== undefined ? { properties: effectiveProps } : {}),
      ...embeddingFields,
    };
    if ('_expireAt' in $set) updatedEdge._expireAt = $set['_expireAt'] as Date;
    else if ('_expireAt' in $unset) delete (updatedEdge as { _expireAt?: unknown })._expireAt;
    if (!embeddingFields.embedding) await enqueueEmbedJob(spaceId, 'edge', updatedEdge._id);
    if (actor) emitWebhookEvent({ event: 'edge.created', spaceId, entry: { ...updatedEdge, embedding: undefined }, ...actor });
    return withoutVector(updatedEdge);
  }

  const doc: EdgeDoc = {
    _id: edgeIdFor(from, to, label),
    spaceId,
    from,
    to,
    label,
    tags: tags ?? [],
    ...(type !== undefined ? { type } : {}),
    ...(weight !== undefined ? { weight } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(properties !== undefined ? { properties } : {}),
    author: authorRef(),
    createdAt: now,
    updatedAt: now,
    seq,
    ...embeddingFields,
  };
  // `doc.label`, NOT `doc.type` — an edge has both, and the schema is keyed by label (see validateEdgeWrite).
  // Passing `type` here would look right and read a schema that is never there.
  stampExpiryOnCreate(spaceId, doc, ttlDays, { collection: 'edge', type: doc.label });
  // Warn-not-refuse: a caller's own stamp checked against ours. Stored only when it disagrees beyond the space's
  // threshold, so presence is the signal. The write proceeds either way -- a backdated import is legitimate.
  stampSkewOnCreate(doc, getSpaceMeta(spaceId));
  await collection.insertOne(asDoc<EdgeDoc>(doc));
  if (!embeddingFields.embedding) await enqueueEmbedJob(spaceId, 'edge', doc._id);
  if (actor) emitWebhookEvent({ event: 'edge.created', spaceId, entry: { ...doc, embedding: undefined }, ...actor });
  return withoutVector(doc);
}

/** List edges for a space, optionally filtering by from/to entity */
export async function listEdges(
  spaceId: string,
  filter: { from?: string; to?: string; label?: string; type?: string; tag?: string; search?: string; description?: string; properties?: string; fromIds?: string[]; toIds?: string[] } = {},
  limit = 50,
  skip = 0,
  sort?: SortSpec,
): Promise<EdgeDoc[]> {
  const q: Record<string, unknown> = { spaceId };
  if (filter.from) q['from'] = filter.from;
  if (filter.to) q['to'] = filter.to;
  if (filter.label) q['label'] = filter.label;
  if (filter.type) q['type'] = filter.type;
  // `tags` is an array field; a scalar match is Mongo array-contains (edge HAS this tag).
  if (filter.tag) q['tags'] = tagContains(filter.tag);
  // Per-column description filter. `search` below also spans `label`, so a column control needs its own.
  if (filter.description) q['description'] = textContains(filter.description);
  if (filter.properties) Object.assign(q, propertiesValueContains(filter.properties));
  // Name filters arrive already resolved to ids (per member). An EMPTY list means "no entity by that
  // name", so it must filter to nothing — not be skipped, which would silently show everything.
  if (filter.fromIds) q['from'] = { $in: filter.fromIds };
  if (filter.toIds) q['to'] = { $in: filter.toIds };
  // Freetext substring over the edge's text fields (2b-iii-a).
  const search = textSearchOr(filter.search, SEARCHABLE_FIELDS.edges);
  if (search) Object.assign(q, search);
  return col<EdgeDoc>(`${spaceId}_edges`)
    .find(asFilter<EdgeDoc>(q), { projection: NEVER_RETURNED_PROJECTION })
    .maxTimeMS(q['$expr'] ? PROPERTIES_SCAN_MAX_MS : 60_000)
    .sort(sort ? toMongoSort(sort) : { seq: -1, createdAt: -1, _id: -1 })
    .skip(parseSkip(skip))
    .limit(parseLimit(limit, 20, 1000))
    .toArray() as Promise<EdgeDoc[]>;
}

/** Delete an edge by ID and write tombstone */
export async function deleteEdge(spaceId: string, edgeId: string, actor?: WebhookActor): Promise<boolean> {
  const existing = await col<EdgeDoc>(`${spaceId}_edges`)
    .findOne(asFilter<EdgeDoc>({ _id: edgeId, spaceId }), { projection: { seq: 1 } }) as { seq?: number } | null;
  const seq = await nextSeq(spaceId);
  const result = await col<EdgeDoc>(`${spaceId}_edges`).deleteOne({
    _id: edgeId,
    spaceId,
  });
  if (result.deletedCount === 0) return false;
  // The record is gone, so its embed job has nothing left to embed. Eager rather than left to the worker: the
  // worker only claims `pending` jobs, so a job that had already gone terminal `failed` would never be claimed
  // again and would outlive the record for ever — visible since #861 as a permanent failure naming a recordId
  // that 404s.
  await retireEmbedJob(spaceId, 'edge', edgeId);

  const tombstone: TombstoneDoc = {
    _id: edgeId,
    type: 'edge',
    spaceId,
    deletedAt: new Date().toISOString(),
    instanceId: getConfig().instanceId,
    seq,
    ...(existing?.seq !== undefined ? { originalSeq: existing.seq } : {}),
  };
  await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
    asFilter<TombstoneDoc>({ _id: edgeId }),
    asDoc<TombstoneDoc>(tombstone),
    { upsert: true },
  );
  if (actor) emitWebhookEvent({ event: 'edge.deleted', spaceId, entry: { _id: edgeId }, ...actor });
  return true;
}

/** Find an edge by exact ID */
export async function getEdgeById(spaceId: string, id: string): Promise<EdgeDoc | null> {
  return col<EdgeDoc>(`${spaceId}_edges`)
    .findOne(asFilter<EdgeDoc>({ _id: id, spaceId }),
      { projection: NEVER_RETURNED_PROJECTION }) as Promise<EdgeDoc | null>;
}

/** Update an existing edge by ID. Partial update — only supplied fields are changed. Re-embeds when any content field changes. */
export async function updateEdgeById(
  spaceId: string,
  id: string,
  updates: { label?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; weight?: number; type?: string; suppressEmbeddings?: boolean },
  deleteFieldsPaths?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
  ifMatchSeq?: number,
  /** See `upsertEdge`'s: the classification, so a door never re-derives it for presentation. */
  onValidation?: (check: UpdateValidation) => void,
): Promise<EdgeDoc | null> {
  const collection = col<EdgeDoc>(`${spaceId}_edges`);
  const existing = await collection.findOne(asFilter<EdgeDoc>({ _id: id, spaceId }),
    { projection: NEVER_RETURNED_PROJECTION }) as EdgeDoc | null;
  if (!existing) return null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now, seq };
  const $unset: Record<string, unknown> = {};

  if (updates.suppressEmbeddings !== undefined) $set['suppressEmbeddings'] = updates.suppressEmbeddings;
  const newLabel = updates.label ?? existing.label;
  let newDesc = updates.description !== undefined ? updates.description : existing.description;
  let newTags = mergeTagsOrKeep(existing.tags, updates.tags);
  let newProps: Record<string, string | number | boolean> | undefined =
    mergePropertiesOrKeep(existing.properties, updates.properties) ?? {};
  let newType = updates.type !== undefined ? updates.type : existing.type;
  let newWeight: number | undefined = updates.weight !== undefined ? updates.weight : existing.weight;

  // Apply deleteFields after merge
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    const merged: Record<string, unknown> = {
      description: newDesc,
      tags: newTags,
      properties: newProps,
      weight: newWeight,
    };
    applyDeleteFields(merged, deleteFieldsPaths);

    if (!('description' in merged)) {
      newDesc = undefined;
      $unset['description'] = '';
    } else {
      newDesc = merged['description'] as string | undefined;
    }
    if (!('tags' in merged)) {
      newTags = [];
      $unset['tags'] = '';
    } else {
      newTags = merged['tags'] as string[];
    }
    if (!('properties' in merged)) {
      newProps = undefined;
      $unset['properties'] = '';
    } else {
      newProps = merged['properties'] as Record<string, string | number | boolean>;
    }
    if (!('weight' in merged)) {
      newWeight = undefined;
      $unset['weight'] = '';
    } else {
      newWeight = merged['weight'] as number;
    }
  }

  if (updates.label !== undefined) $set['label'] = newLabel;
  // `setUnlessDeleted` rather than a guard on `$unset['x']`: that value is the empty string, so the old test was
  // always true and every whole-field `deleteFields` produced a rejected write. See its doc comment.
  setUnlessDeleted($set, $unset, 'description', newDesc, updates.description !== undefined || !!deleteFieldsPaths);
  setUnlessDeleted($set, $unset, 'tags', newTags, updates.tags !== undefined || !!deleteFieldsPaths);
  setUnlessDeleted($set, $unset, 'properties', newProps, updates.properties !== undefined || !!deleteFieldsPaths);
  if (updates.type !== undefined) $set['type'] = newType;
  setUnlessDeleted($set, $unset, 'weight', newWeight, updates.weight !== undefined || !!deleteFieldsPaths);

  // The re-embed is ENQUEUED after the write — see `embedStoredRecord`. Computing it here would build the
  // text from this function's stale read, which is how a record's vector ends up describing a record that
  // no longer exists anywhere.

  /*
   * Validated after `deleteFields`, so the document checked is the document written.
   *
   * `upsertEdge` has enforced the schema internally since #1046 and this function did not — the half of the
   * owner's 2026-08-29 ruling that was missed even on the record kind that got the fix, because the row that
   * prompted it named the upsert. A patch may CHANGE THE LABEL, which selects a different type schema
   * entirely, so an edge could be moved onto a label whose rules its stored properties break.
   */
  {
    const finalLabel = ('label' in $set ? $set['label'] : existing.label) as string;
    const finalProps = ('properties' in $unset ? {}
      : ('properties' in $set ? $set['properties'] : existing.properties)) as Record<string, string | number | boolean> | undefined;
    const check = classifyEdgeUpsertAgainst(getSpaceMeta(spaceId), existing,
      { label: finalLabel, properties: finalProps });
    if (check.blocked) throw new SchemaViolationError(check);
    onValidation?.(check);
  }

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
    { collection: 'edge', existing: existing as unknown as Record<string, unknown> }); // F10
  mirrorLegacySuppression($set, $unset); // X-1b: keep the pre-3.1.0 key in step for older peers
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  // Lost-update detection, identical to `updateMemory` and for the same reason: `returnDocument: "before"`
  // hands back the record as it was at WRITE time, so comparing its seq with the one read at the top of this
  // function is exactly the test for another writer landing in the window. Observation only — no write that
  // previously succeeded is now rejected.
  const beforeWrite = await collection.findOneAndUpdate(
    asFilter<EdgeDoc>(writeFilterFor(id, ifMatchSeq)),
    asUpdate<EdgeDoc>(updateOp),
    { returnDocument: 'before' },
  ) as EdgeDoc | null;
  brainWriteSeqTotal.labels({
    collection: 'edges',
    outcome: writeOutcome(!!beforeWrite, ifMatchSeq !== undefined, !!beforeWrite && beforeWrite.seq !== existing.seq),
  }).inc();
  // Nothing matched, so nothing was written; the response below is built from `existing`.
  if (!beforeWrite) return null;

  const result = {
    ...existing,
    label: newLabel,
    tags: newTags,
    updatedAt: now,
    seq,
    ...(updates.description !== undefined ? { description: newDesc } : {}),
    // Same `in` test as the write above. `applyDeleteFields` runs over this object a few lines down and would have
    // removed the key anyway, so this was right by accident rather than by decision — and an accident that agrees
    // with the write only while both stay wrong the same way.
    ...(!('properties' in $unset) && (updates.properties !== undefined || deleteFieldsPaths) ? { properties: newProps } : {}),
    ...(updates.type !== undefined ? { type: newType } : {}),
    ...(updates.weight !== undefined ? { weight: newWeight } : {}),
  } as EdgeDoc;
  if ('_expireAt' in $set) result._expireAt = $set['_expireAt'] as Date;
  else if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;

  // Apply deleteFields to the returned doc for consistency
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    applyDeleteFields(result as unknown as Record<string, unknown>, deleteFieldsPaths);
  }

  // Toggling exclusion always ends in an embed job, and the job handles BOTH directions — it unsets
  // the vector when the flag is on and computes one when it is off. So this path never has to know
  // which way the toggle went, which is what keeps the rule in one place.
  // ONE enqueue, unconditionally, for every successful update: recompute the text from the record as
  // STORED, and honour excludeFromVectorSearch in whichever direction it moved. See the entity update and
  // `embedStoredRecord` for why this replaced an inline embed built from a stale read.
  await enqueueEmbedJob(spaceId, 'edge', result._id);
  if (actor) emitWebhookEvent({ event: 'edge.updated', spaceId, entry: { ...result, embedding: undefined }, ...actor });
  return result;
}

/** Bulk-delete all edges in a space, writing a tombstone per deleted doc. */
export async function bulkDeleteEdges(spaceId: string): Promise<number> {
  const coll = col<EdgeDoc>(`${spaceId}_edges`);
  const ids = await coll.find({}, { projection: { _id: 1 } }).toArray();
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

/**
 * The label the synthetic chrono link carries.
 *
 * A real value rather than an empty string so `edgeLabels` can include or exclude it like any other, and so a
 * reader of a traverse result can tell a modelled relationship from a derived one.
 */
export const CHRONO_LINK_LABEL = 'chrono.entityIds';

/**
 * The same device for memories: `memory.entityIds` is an inbound link in everything but name, so a memory
 * about an entity is reachable from it. Named on the same pattern as the chrono label so `edgeLabels` can
 * include or exclude it like any other relationship.
 */
export const MEMORY_LINK_LABEL = 'memory.entityIds';

/** And for files, whose `entityIds` links a document to what it is about. */
export const FILE_LINK_LABEL = 'file.entityIds';

/**
 * BFS graph traversal from a starting entity.
 *
 * ── Chrono entries are nodes ──────────────────────────────────────────────────────────────────────────────
 *
 * `chrono.entityIds` is the only thing linking a chrono to the graph, and until now it was legible to
 * `query()` and invisible to `traverse` — which is the retrieval path an agent reaches for first. An
 * integrator measured the cost: reconstructing a 33-day hardware-RMA timeline took four `query()` calls plus
 * two repo greps, and the first pass still missed the actual carrier ticket, which had to be found by a name
 * regex instead of by traversal from the incident.
 *
 * So a chrono whose `entityIds` contains a frontier node is reached as though it were joined by an INBOUND
 * edge — which is what that field is. No schema change and no migration: the link already exists, it simply
 * had no reader here.
 *
 * **On by default, because the defect was discoverability.** A flag defaulting to off leaves the graph
 * looking the same to everyone who does not already know the answer. What that costs is a response that can
 * now contain a node from another collection, so every chrono node carries `kind: 'chrono'` and entity nodes
 * are unchanged down to the byte. `includeChrono: false` restores the old shape for a client that assumed
 * one collection.
 *
 * The synthetic edge is labelled `chrono.entityIds` and carries its OWN id — see `syntheticEdgeId`. It used
 * to reuse the chrono's `_id`, on a rationale that was the opposite of true.
 *
 * @param memberIds  Space IDs to search for edges and entities (supports proxy spaces).
 * @param startId    UUID of the starting entity.
 * @param direction  Follow edges from the node (outbound), to the node (inbound), or both.
 * @param edgeLabels If provided, only traverse edges with one of these labels. Also filters the synthetic
 *                   chrono link, which is labelled `chrono.entityIds`.
 * @param maxDepth   Maximum hop count from startId (hard cap enforced by caller).
 * @param limit      Maximum total nodes to return.
 */
export async function traverseGraph(
  memberIds: string[],
  startId: string,
  direction: 'outbound' | 'inbound' | 'both' = 'outbound',
  edgeLabels?: string[],
  maxDepth = 3,
  limit = 100,
  /**
   * Follow `chrono.entityIds` as inbound links, so a chrono entry is reachable from the entities it is
   * about. Default ON — see the note above the function.
   */
  includeChrono = true,
  /**
   * Follow `memory.entityIds` the same way, so a memory about an entity is reachable from it.
   *
   * **Default OFF, unlike chrono, and the asymmetry is deliberate.** Chrono defaults on because chrono
   * entries are both invisible otherwise and sparse — an incident has ten, not ten thousand. Memories are
   * usually the most numerous record type in a space, and every node emitted counts against `limit`: on by
   * default, a memory-heavy space would fill the answer with memories and truncate away the entities the
   * caller traversed for. A flag that silently starves the primary result is worse than one you have to know
   * about, so this one is opt-in.
   */
  includeMemories = false,
  /**
   * Follow `file.entityIds`, so a document about an entity is reachable from it. Opt-in for the same reason as
   * memories, and the node carries **file meta only** — path, description, tags. Never chunk text: a file's
   * body is its chunks, they are the largest thing the product stores, and a structural walk must not pay for
   * them.
   */
  includeFiles = false,
  /**
   * Whether the returned answer carries the edge list.
   *
   * This does NOT change the walk. Edges are how the graph is traversed, so declining to follow them would
   * return a different set of nodes rather than a smaller payload — the flag is about what comes back, not
   * about what is visited.
   */
  includeEdges = true,
): Promise<TraverseResult> {
  const visited = new Set<string>([startId]);
  // frontier: nodes whose outgoing edges we need to explore at the current depth
  let frontier: string[] = [startId];
  let frontierSet = new Set<string>(frontier);
  let currentDepth = 0;
  const resultNodes: TraverseNode[] = [];
  const resultEdges: TraverseEdge[] = [];

  // The label filter itself moved into `frontierEdgeQuery`, which both traversals now share. What stays here is
  // the CONSEQUENCE of an explicit filter for the link labels below, which is a different question.
  //
  // An explicit label filter excludes the chrono link unless it names it — otherwise asking for `depends_on`
  // would quietly return chrono entries too, and a filter that cannot exclude something is not a filter.
  const wantsChronoLabel = !edgeLabels || edgeLabels.length === 0 || edgeLabels.includes(CHRONO_LINK_LABEL);
  const wantsMemoryLabel = !edgeLabels || edgeLabels.length === 0 || edgeLabels.includes(MEMORY_LINK_LABEL);
  const wantsFileLabel = !edgeLabels || edgeLabels.length === 0 || edgeLabels.includes(FILE_LINK_LABEL);

  // Three return sites below, and every one of them owed the same decision about the edge list. A rule copied
  // three times is a rule that will eventually disagree with itself, so it is written once here.
  const answer = (truncated: boolean): TraverseResult =>
    ({ nodes: resultNodes, edges: includeEdges ? resultEdges : [], truncated });

  while (frontier.length > 0 && currentDepth < maxDepth) {
    // Batch-fetch all edges for the current frontier across all member spaces
    const adjacentEdges: EdgeDoc[] = [];
    for (const mid of memberIds) {
      // Through the shared builder, so this path and recall's cannot drift apart again.
      const q = frontierEdgeQuery(mid, frontier, { edgeLabels, direction });
      const edges = await col<EdgeDoc>(`${mid}_edges`)
        .find(asFilter<EdgeDoc>(q), { projection: NEVER_RETURNED_PROJECTION }).toArray() as EdgeDoc[];
      adjacentEdges.push(...edges);
    }

    // Collect new neighbor IDs (not yet visited) and their traversed edges
    const newNeighborIds: string[] = [];
    const edgesForNewNeighbors: EdgeDoc[] = [];
    for (const edge of adjacentEdges) {
      let neighborId: string;
      if (direction === 'outbound') {
        neighborId = edge.to;
      } else if (direction === 'inbound') {
        neighborId = edge.from;
      } else {
        // For 'both', skip if both ends are in the current frontier (same-level connection)
        if (frontierSet.has(edge.from) && frontierSet.has(edge.to)) continue;
        neighborId = frontierSet.has(edge.from) ? edge.to : edge.from;
      }
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      newNeighborIds.push(neighborId);
      edgesForNewNeighbors.push(edge);
    }

    // Chrono entries that point AT the current frontier. `entityIds` is an inbound link in everything but
    // name, so this reads it as one — see the note above the function.
    //
    // Collected BEFORE the early break, and counted by it. Keying the break on entity neighbours alone meant
    // an entity whose only link is a timeline returned nothing at all — which is the reported scenario, not
    // an edge case: an incident with ten chrono entries and no edges is exactly what someone traverses from.
    // Verified against a running server; the source-level gate passed happily either way.
    const chronoHere: { doc: ChronoEntry; via: string }[] = [];
    if (includeChrono && wantsChronoLabel) {
      for (const mid of memberIds) {
        const linked = await col<ChronoEntry>(`${mid}_chrono`)
          .find(asFilter<ChronoEntry>(linksToAny(mid, CHRONO_LINKS, frontier)),
                { projection: CHRONO_LINKS.projection })
          .toArray() as ChronoEntry[];
        for (const c of linked) {
          if (visited.has(c._id)) continue;
          visited.add(c._id);
          // The frontier entity it hangs off — the `from` of the synthetic edge.
          const via = c.entityIds.find(id => frontierSet.has(id)) ?? frontier[0];
          chronoHere.push({ doc: c, via });
        }
      }
    }

    // Memories that point AT the current frontier — same device as chrono above, same reason for collecting
    // it before the break: an entity whose only links are memories must not look like a dead end.
    const memoriesHere: { doc: MemoryDoc; via: string }[] = [];
    if (includeMemories && wantsMemoryLabel) {
      for (const mid of memberIds) {
        const linked = await col<MemoryDoc>(`${mid}_memories`)
          .find(asFilter<MemoryDoc>(linksToAny(mid, MEMORY_LINKS, frontier)),
                { projection: MEMORY_LINKS.projection })
          .toArray() as MemoryDoc[];
        for (const m of linked) {
          if (visited.has(m._id)) continue;
          visited.add(m._id);
          const via = m.entityIds.find(id => frontierSet.has(id)) ?? frontier[0];
          memoriesHere.push({ doc: m, via });
        }
      }
    }

    // Files that point AT the current frontier.
    //
    // `parentFileId: { $exists: false }` is load-bearing, not tidiness. Chunks live in the SAME collection as
    // the files they belong to and are told apart only by that field (see the space-stats count, which uses the
    // identical predicate). Without it a document that recall split into forty passages would arrive as forty
    // nodes carrying passage text — the opposite of returning file meta, and it would exhaust `limit` on one
    // file. The projection then keeps it to what the file IS.
    const filesHere: { doc: FileMetaDoc; via: string }[] = [];
    if (includeFiles && wantsFileLabel) {
      for (const mid of memberIds) {
        const linked = await col<FileMetaDoc>(`${mid}_files`)
          .find(asFilter<FileMetaDoc>(linksToAny(mid, FILE_LINKS, frontier)),
                { projection: FILE_LINKS.projection })
          .toArray() as FileMetaDoc[];
        for (const f of linked) {
          if (visited.has(f._id)) continue;
          visited.add(f._id);
          const via = (f.entityIds ?? []).find(id => frontierSet.has(id)) ?? frontier[0];
          filesHere.push({ doc: f, via });
        }
      }
    }

    if (newNeighborIds.length === 0 && chronoHere.length === 0 && memoriesHere.length === 0 && filesHere.length === 0) break;

    // Batch-fetch entity docs for all new neighbors
    const entityMap = new Map<string, EntityDoc>();
    for (const mid of memberIds) {
      const entities = await col<EntityDoc>(`${mid}_entities`)
        .find(asFilter<EntityDoc>({ _id: { $in: newNeighborIds }, spaceId: mid }),
          { projection: NEVER_RETURNED_PROJECTION })
        .toArray() as EntityDoc[];
      for (const e of entities) entityMap.set(e._id, e);
    }


    // Build results for this depth level
    const nextFrontier: string[] = [];
    for (let i = 0; i < newNeighborIds.length; i++) {
      const neighborId = newNeighborIds[i];
      const entity = entityMap.get(neighborId);
      if (!entity) continue;

      const edge = edgesForNewNeighbors[i];
      resultEdges.push({ _id: edge._id, from: edge.from, to: edge.to, label: edge.label });
      resultNodes.push({ _id: entity._id, name: entity.name, type: entity.type, depth: currentDepth + 1 });

      if (resultNodes.length >= limit) {
        return answer(true);
      }

      nextFrontier.push(neighborId);
    }

    // Chrono nodes are emitted at this depth but do NOT join the next frontier: a chrono links to entities,
    // not to other chrono entries, so expanding from one would only walk back to entities already visited.
    for (const { doc, via } of chronoHere) {
      resultEdges.push({ _id: syntheticEdgeId(CHRONO_LINK_LABEL, via, doc._id), from: via, to: doc._id, label: CHRONO_LINK_LABEL });
      resultNodes.push({ _id: doc._id, name: doc.title, type: doc.type, depth: currentDepth + 1, kind: 'chrono' });
      if (resultNodes.length >= limit) {
        return answer(true);
      }
    }

    // Memories, for the same reason chrono nodes do not: a memory links to entities, never to another memory.
    // `type` is optional on a memory, so an undeclared one reports an empty type rather than borrowing `kind`.
    for (const { doc, via } of memoriesHere) {
      resultEdges.push({ _id: syntheticEdgeId(MEMORY_LINK_LABEL, via, doc._id), from: via, to: doc._id, label: MEMORY_LINK_LABEL });
      resultNodes.push({ _id: doc._id, name: doc.fact, type: doc.type ?? '', depth: currentDepth + 1, kind: 'memory' });
      if (resultNodes.length >= limit) {
        return answer(true);
      }
    }

    // Files, also leaves. `type` is empty because a file has none — borrowing `kind` for it would invent data.
    for (const { doc, via } of filesHere) {
      resultEdges.push({ _id: syntheticEdgeId(FILE_LINK_LABEL, via, doc._id), from: via, to: doc._id, label: FILE_LINK_LABEL });
      resultNodes.push({
        _id: doc._id, name: doc.path, type: '', depth: currentDepth + 1, kind: 'file',
        ...(doc.description ? { description: doc.description } : {}),
        ...(doc.tags && doc.tags.length > 0 ? { tags: doc.tags } : {}),
      });
      if (resultNodes.length >= limit) {
        return answer(true);
      }
    }

    frontier = nextFrontier;
    frontierSet = new Set<string>(frontier);
    currentDepth++;
  }

  return answer(false);
}

// ── Recall-augmenting traversal ──────────────────────────────────────────────

/** Hard cap on the `traverse` depth accepted by graph-augmented recall. */
export const MAX_RECALL_TRAVERSE = 5;

/**
 * How many ALTERNATE routes to one node are recorded before the rest are dropped.
 *
 * A dense graph can reach one node dozens of ways, and every one of them is a small array copied per hop. The
 * cap is reported (`altPathsTruncated`) rather than silent: a caller that cannot tell "these are all the
 * routes" from "these are the first eight" can conclude something false from the shape, which is the defect
 * B-19 was filed for one function over.
 */
export const MAX_ALT_PATHS_PER_NODE = 8;

/** A neighbour reached by following the edge graph out from a recall seed set. */
export interface SeedTraverseNeighbor {
  _id: string;
  spaceId: string;
  /** Hop distance from the nearest seed (1 = directly connected to a seed). */
  hops: number;
  /** Edge chain connecting the nearest seed to this neighbour (shortest path). */
  path: { from: string; label: string; to: string }[];
  /** Hydrated entity document (embedding stripped). */
  record: EntityDoc;
  /** The record this one was reached FROM — its parent in the nesting. A seed id at hop 1. */
  parentId: string;
  /**
   * The WHOLE edge document for the reaching hop, not `{from, label, to}`.
   *
   * Its `description` is where the reason for a link lives, and its `tags` are how a caller filters one kind of
   * relationship from another. Reducing the edge to three fields threw both away on every traversal.
   */
  edge: EdgeDoc;
  /** Ordered record ids, seed first and this node last. `idPath.length - 1` is the hop count. */
  idPath: string[];
  /** Every OTHER route from a seed to this node, ids in the same seed-first order. */
  altPaths: string[][];
  /** True when more routes exist than `MAX_ALT_PATHS_PER_NODE` recorded. */
  altPathsTruncated: boolean;
}

/**
 * Multi-source, depth-limited BFS over the edge graph of a SINGLE space, seeded
 * from a set of recall-match IDs. Follows edges in BOTH directions, records the
 * shortest path to each neighbour (BFS visit order guarantees shortest-first),
 * and detects cycles via a visited set so a circular graph never loops or
 * duplicates. Neighbours are hydrated as entities within THIS space only — an
 * edge pointing at an id absent from the space (e.g. a cross-space edge to a
 * space the caller can't see) yields no neighbour and is silently skipped.
 * Batched `$in` lookups keep this to ~2 queries per hop regardless of fan-out.
 */
/**
 * How a traversal narrows: which edge labels it follows and which way.
 *
 * One shape, shared by the standalone `traverse` and by recall's expansion, because they were two
 * implementations of one rule and recall had the weaker — it followed EVERY edge in BOTH directions, with no
 * way for a caller to say otherwise. On a corpus where a few nodes hold most of the edges, that is the
 * difference between a deliberate neighbourhood and whichever neighbours the node cap happened to keep.
 */
export interface TraverseNarrowing {
  /** Follow only these labels. Absent or empty means every label, which is what it meant before. */
  edgeLabels?: string[] | undefined;
  /** Which way to walk. Defaults to `both`, which is what recall's expansion always did. */
  direction?: 'outbound' | 'inbound' | 'both' | undefined;
}

/**
 * The Mongo predicate for "edges touching this frontier, narrowed".
 *
 * Extracted because it was written twice and the copies disagreed: the standalone path applied a label filter
 * and honoured direction, recall's did neither. Writing the rule once is the only fix that cannot drift again —
 * `CLAUDE.md` names this exact shape as the defect this repo produces most.
 */
export function frontierEdgeQuery(
  spaceId: string,
  frontier: string[],
  narrowing?: TraverseNarrowing,
): Record<string, unknown> {
  const labels = narrowing?.edgeLabels;
  const labelFilter = labels && labels.length > 0 ? { label: { $in: labels } } : {};
  const direction = narrowing?.direction ?? 'both';
  if (direction === 'outbound') return { spaceId, from: { $in: frontier }, ...labelFilter };
  if (direction === 'inbound') return { spaceId, to: { $in: frontier }, ...labelFilter };
  return { spaceId, $or: [{ from: { $in: frontier } }, { to: { $in: frontier } }], ...labelFilter };
}

export async function traverseFromSeeds(
  spaceId: string,
  seedIds: string[],
  maxDepth: number,
  limit: number,
  narrowing?: TraverseNarrowing,
): Promise<SeedTraverseNeighbor[]> {
  if (seedIds.length === 0 || maxDepth < 1 || limit < 1) return [];

  const visited = new Set<string>(seedIds);
  const pathTo = new Map<string, { from: string; label: string; to: string }[]>();
  for (const id of seedIds) pathTo.set(id, []);
  // Ordered ids per node, seed first. This is what makes the chain's DIRECTION readable: the old `path` stored
  // each edge's own from/label/to, so orienting it meant intersecting the first entry against the seed set.
  const idPathTo = new Map<string, string[]>();
  for (const id of seedIds) idPathTo.set(id, [id]);
  // Routes to a node OTHER than the one it is nested under. The old loop skipped a visited neighbour outright,
  // so a node reachable two ways was attributed to whichever edge won the race and the other link was invisible.
  const altPathTo = new Map<string, string[][]>();
  const altTruncated = new Set<string>();
  const reachedBy = new Map<string, { parentId: string; edge: EdgeDoc }>();

  let frontier: string[] = [...new Set(seedIds)];
  let frontierSet = new Set<string>(frontier);
  let depth = 0;
  const results: SeedTraverseNeighbor[] = [];

  while (frontier.length > 0 && depth < maxDepth) {
    const edges = await col<EdgeDoc>(`${spaceId}_edges`)
      // An EDGE is a searchable record with a vector of its own, and this query fetched it whole: the edge
      // document is returned verbatim as `_graph[].edge`, so a `recall(traverse: n)` shipped a full float
      // array per hop, on both doors. Nothing consumes it — `nestNeighbours` only nests the document — so
      // dropping it is pure subtraction.
      //
      // **This comment used to claim it was "matching the entity query below and every other read path in
      // the codebase". That was false, and the claim is why nobody checked.** Five readers had no projection
      // at all — the three list functions and the two entity lookups — and a caller measured 11.19 MB from
      // `GET /entities?limit=500` where `/query` answered 0.145 MB. All of them now share
      // `NEVER_RETURNED_PROJECTION`, so the sentence is true; do not restate universality here again, because
      // the constant is what makes it true and a comment cannot.
      //
      // NARROWED, since 3.5: `edgeLabels` and `direction` reach here now. They did not before, so recall's
      // expansion followed every edge both ways while the standalone `traverse` tool — building the same
      // query twenty lines away — applied both. One rule, two implementations, and this was the weaker one.
      //
      // The `spaceId` field is in the predicate because `frontierEdgeQuery` is shared with the standalone
      // path, which queries across member spaces by name and needs it. Here the collection name already scopes
      // it, so the extra clause is redundant rather than wrong — see the note below on why filtering the
      // ENTITY read on a redundant spaceId was actively harmful.
      .find(asFilter<EdgeDoc>(frontierEdgeQuery(spaceId, frontier, narrowing)))
      .project(NEVER_RETURNED_PROJECTION)
      .toArray() as EdgeDoc[];

    const newNeighborIds: string[] = [];
    for (const edge of edges) {
      // Same-level edge (both ends already in the frontier) — introduces no new node.
      if (frontierSet.has(edge.from) && frontierSet.has(edge.to)) continue;
      const frontierEnd = frontierSet.has(edge.from) ? edge.from : edge.to;
      const neighborId = frontierEnd === edge.from ? edge.to : edge.from;
      const routeHere = [...(idPathTo.get(frontierEnd) ?? [frontierEnd]), neighborId];
      if (visited.has(neighborId)) {
        // Already nested somewhere: this is a SECOND route to it, so record the route without re-nesting or
        // re-expanding the node. `paths` carrying every route is what lets one node object stay one row —
        // duplicating it under each parent would make a caller counting rows double-count the same record.
        const alts = altPathTo.get(neighborId);
        if (alts) {
          const known = [idPathTo.get(neighborId)?.join('>'), ...alts.map(p => p.join('>'))];
          if (!known.includes(routeHere.join('>'))) {
            if (alts.length >= MAX_ALT_PATHS_PER_NODE) altTruncated.add(neighborId);
            else alts.push(routeHere); // the live array — see where it is created
          }
        }
        continue;
      }
      visited.add(neighborId);
      pathTo.set(neighborId, [...(pathTo.get(frontierEnd) ?? []), { from: edge.from, label: edge.label, to: edge.to }]);
      idPathTo.set(neighborId, routeHere);
      // Created HERE, so the array the result object gets is the one later hops push alternates into. Building
      // it with `?? []` at push time would hand out a copy that no later discovery could reach — and an
      // alternate route is usually found at a deeper hop than the one that nested the node.
      altPathTo.set(neighborId, []);
      reachedBy.set(neighborId, { parentId: frontierEnd, edge });
      newNeighborIds.push(neighborId);
    }

    if (newNeighborIds.length === 0) break;

    // NOTE: no `spaceId` filter here — deliberately, and it must stay that way.
    //
    // The edge query above (same loop) does not filter on the spaceId field either, and the
    // collection name `{spaceId}_entities` is already the only real scope. When the two
    // disagreed, a document with a stale spaceId produced the worst possible outcome: the
    // EDGE was found but its neighbour ENTITY was silently dropped, so a traversal returned
    // half a graph with no error. Filtering on a redundant, denormalised field is what made
    // a space rename hide data in the first place.
    const entities = await col<EntityDoc>(`${spaceId}_entities`)
      .find(asFilter<EntityDoc>({ _id: { $in: newNeighborIds } }))
      .project(NEVER_RETURNED_PROJECTION)
      .toArray() as EntityDoc[];
    const entityMap = new Map<string, EntityDoc>();
    for (const e of entities) entityMap.set(e._id, e);

    const nextFrontier: string[] = [];
    for (const neighborId of newNeighborIds) {
      const entity = entityMap.get(neighborId);
      if (!entity) continue; // not an entity in this space (e.g. cross-space edge target) — skip
      const reached = reachedBy.get(neighborId);
      if (!reached) continue; // unreachable in practice: every new neighbour is recorded above with its edge
      results.push({
        _id: entity._id, spaceId, hops: depth + 1, path: pathTo.get(neighborId) ?? [], record: entity,
        parentId: reached.parentId, edge: reached.edge, idPath: idPathTo.get(neighborId) ?? [neighborId],
        altPaths: altPathTo.get(neighborId) ?? [], altPathsTruncated: false,
      });
      if (results.length >= limit) return stampTruncation(results, altTruncated);
      nextFrontier.push(neighborId);
    }

    frontier = nextFrontier;
    frontierSet = new Set<string>(frontier);
    depth++;
  }

  return stampTruncation(results, altTruncated);
}

/**
 * Stamp `altPathsTruncated` once the walk is over.
 *
 * A node is pushed into the results the hop it is reached, but its alternate routes keep being discovered for
 * every hop after that — so the flag cannot be computed at push time. `altPaths` itself is a live array and
 * needs no fixing up; a boolean cannot be.
 */
function stampTruncation(results: SeedTraverseNeighbor[], truncated: Set<string>): SeedTraverseNeighbor[] {
  if (truncated.size > 0) for (const r of results) r.altPathsTruncated = truncated.has(r._id);
  return results;
}

/**
 * Expand a set of recall seeds into their graph neighbours across the caller's
 * authorized spaces. Seeds are grouped by space (only spaces in `memberIds` are
 * traversed — the cross-space access guard), each space is BFS-expanded via
 * `traverseFromSeeds`, and the merged neighbours are truncated to `limit` with
 * lower-hop results preferred. Never touches a space outside `memberIds`.
 */
export async function traverseRecallSeeds(
  memberIds: string[],
  seeds: { _id: string; spaceId: string }[],
  maxDepth: number,
  limit: number,
  narrowing?: TraverseNarrowing,
): Promise<SeedTraverseNeighbor[]> {
  if (seeds.length === 0 || maxDepth < 1 || limit < 1) return [];
  const allowed = new Set(memberIds);
  const bySpace = new Map<string, string[]>();
  for (const s of seeds) {
    if (!allowed.has(s.spaceId)) continue;
    const arr = bySpace.get(s.spaceId) ?? [];
    arr.push(s._id);
    bySpace.set(s.spaceId, arr);
  }

  const collected: SeedTraverseNeighbor[] = [];
  for (const [sid, ids] of bySpace) {
    collected.push(...await traverseFromSeeds(sid, ids, maxDepth, limit, narrowing));
  }
  collected.sort((a, b) => a.hops - b.hops); // prefer lower-hop neighbours when truncating
  return collected.slice(0, limit);
}
