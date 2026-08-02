import { v4 as uuidv4 } from 'uuid';
import { authorRef } from '../config/author.js';
import { col, asFilter, asDoc, asUpdate, asBulk } from '../db/mongo.js';
import { nextSeq, reserveSeqBlock } from '../util/seq.js';
import { parseLimit, parseSkip } from '../util/pagination.js';
import { toMongoSort, type SortSpec } from './list-sort.js';
import { textSearchOr, SEARCHABLE_FIELDS } from './text-search.js';
import { embed } from './embedding.js';
import { edgeEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { applyDeleteFields } from './delete-fields.js';
import { getEntityById } from './entities.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { EdgeDoc, EntityDoc, TombstoneDoc } from '../config/types.js';
import { tagContains, textContains, propertiesValueContains, PROPERTIES_SCAN_MAX_MS } from './tag-filter.js';

export interface TraverseNode {
  _id: string;
  name: string;
  type: string;
  depth: number;
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
 */
export async function findEdgeByTriplet(
  spaceId: string, from: string, to: string, label: string,
): Promise<EdgeDoc | null> {
  return await col<EdgeDoc>(`${spaceId}_edges`).findOne(asFilter<EdgeDoc>({ spaceId, from, to, label })) as EdgeDoc | null;
}

/**
 * The properties an upsert will actually store: the stored ones with the incoming ones laid over.
 *
 * Exported because schema validation has to run against the record that will EXIST, and until this was
 * shared it re-derived the rule from the outside — badly. An edge's identity is `(from, to, label)`, so
 * every repeat upsert of an existing edge merges, with no id involved and nothing in the caller's payload
 * to hint at it. Validating the payload alone refused patches whose merged result was perfectly valid.
 *
 * `undefined` properties mean "do not touch", which is why that case returns the stored value rather than
 * an empty object — the difference between "no properties supplied" and "properties cleared".
 */
export function mergedEdgeProperties(
  existing: { properties?: Record<string, string | number | boolean> } | null | undefined,
  incoming: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (incoming === undefined) return existing?.properties;
  return { ...(existing?.properties ?? {}), ...incoming };
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
): Promise<EdgeDoc> {
  const collection = col<EdgeDoc>(`${spaceId}_edges`);
  const existing = await findEdgeByTriplet(spaceId, from, to, label);

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();

  const effectiveDesc = description ?? (existing as EdgeDoc | null)?.description;
  const effectiveType = type ?? (existing as EdgeDoc | null)?.type;
  const effectiveTags = tags !== undefined
    ? Array.from(new Set([...((existing as EdgeDoc | null)?.tags ?? []), ...tags]))
    : ((existing as EdgeDoc | null)?.tags ?? []);
  const effectiveProps = mergedEdgeProperties(existing as EdgeDoc | null, properties);

  // Embed the edge text (best-effort) — resolve entity names so the vector captures semantics
  let embeddingFields: { embedding?: number[]; embeddingModel?: string; matchedText?: string } = {};
  try {
    const [fromName, toName] = await resolveEdgeEntityNames(spaceId, from, to);
    const embedText = edgeEmbedText(fromName, label, toName, effectiveTags, effectiveType, effectiveDesc, effectiveProps);
    const embResult = await embed(embedText);
    embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model, matchedText: embedText };
  } catch { /* embedding unavailable — edge stored without vector */ }

  if (existing) {
    const $set: Record<string, unknown> = { updatedAt: now, seq, ...embeddingFields };
    if (weight !== undefined) $set['weight'] = weight;
    if (type !== undefined) $set['type'] = type;
    if (description !== undefined) $set['description'] = description;
    // When tags are provided, persist the merged result; otherwise leave existing tags unchanged
    if (tags !== undefined) $set['tags'] = effectiveTags;
    if (properties !== undefined) $set['properties'] = mergedEdgeProperties(existing as EdgeDoc, properties);
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
      ...(properties !== undefined ? { properties: { ...((existing as EdgeDoc).properties ?? {}), ...properties } } : {}),
      ...embeddingFields,
    };
    if ('_expireAt' in $set) updatedEdge._expireAt = $set['_expireAt'] as Date;
    else if ('_expireAt' in $unset) delete (updatedEdge as { _expireAt?: unknown })._expireAt;
    if (actor) emitWebhookEvent({ event: 'edge.created', spaceId, entry: { ...updatedEdge, embedding: undefined }, ...actor });
    return updatedEdge;
  }

  const doc: EdgeDoc = {
    _id: uuidv4(),
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
  await collection.insertOne(asDoc<EdgeDoc>(doc));
  if (actor) emitWebhookEvent({ event: 'edge.created', spaceId, entry: { ...doc, embedding: undefined }, ...actor });
  return doc;
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
    .find(asFilter<EdgeDoc>(q))
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
  return col<EdgeDoc>(`${spaceId}_edges`).findOne(asFilter<EdgeDoc>({ _id: id, spaceId })) as Promise<EdgeDoc | null>;
}

/** Update an existing edge by ID. Partial update — only supplied fields are changed. Re-embeds when any content field changes. */
export async function updateEdgeById(
  spaceId: string,
  id: string,
  updates: { label?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; weight?: number; type?: string },
  deleteFieldsPaths?: string[],
  actor?: WebhookActor,
  ttlDays?: number | null,
): Promise<EdgeDoc | null> {
  const collection = col<EdgeDoc>(`${spaceId}_edges`);
  const existing = await collection.findOne(asFilter<EdgeDoc>({ _id: id, spaceId })) as EdgeDoc | null;
  if (!existing) return null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now, seq };
  const $unset: Record<string, unknown> = {};

  const newLabel = updates.label ?? existing.label;
  let newDesc = updates.description !== undefined ? updates.description : existing.description;
  let newTags = updates.tags !== undefined
    ? Array.from(new Set([...(existing.tags ?? []), ...updates.tags]))
    : existing.tags ?? [];
  let newProps: Record<string, string | number | boolean> | undefined = updates.properties !== undefined
    ? { ...(existing.properties ?? {}), ...updates.properties }
    : existing.properties != null ? { ...existing.properties } : {};
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
  if (updates.description !== undefined || (deleteFieldsPaths && !$unset['description'])) $set['description'] = newDesc;
  if (updates.tags !== undefined || (deleteFieldsPaths && !$unset['tags'])) $set['tags'] = newTags;
  if (updates.properties !== undefined || (deleteFieldsPaths && !$unset['properties'])) $set['properties'] = newProps;
  if (updates.type !== undefined) $set['type'] = newType;
  if (updates.weight !== undefined || (deleteFieldsPaths && !$unset['weight'])) $set['weight'] = newWeight;

  // Re-embed whenever any content field changes — resolve entity names for semantic signal
  try {
    const [fromName, toName] = await resolveEdgeEntityNames(spaceId, existing.from, existing.to);
    const embedText = edgeEmbedText(fromName, newLabel, toName, newTags, newType, newDesc, newProps);
    const embResult = await embed(embedText);
    $set['embedding'] = embResult.vector;
    $set['embeddingModel'] = embResult.model;
    $set['matchedText'] = embedText;
  } catch { /* embedding unavailable — keep existing embedding */ }

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset,
    { collection: 'edge', existing: existing as unknown as Record<string, unknown> }); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  await collection.updateOne(asFilter<EdgeDoc>({ _id: id }), asUpdate<EdgeDoc>(updateOp));

  const result = {
    ...existing,
    label: newLabel,
    tags: newTags,
    updatedAt: now,
    seq,
    ...(updates.description !== undefined ? { description: newDesc } : {}),
    ...(updates.properties !== undefined || (deleteFieldsPaths && !$unset['properties']) ? { properties: newProps } : {}),
    ...(updates.type !== undefined ? { type: newType } : {}),
    ...(updates.weight !== undefined ? { weight: newWeight } : {}),
    ...('embedding' in $set ? { embedding: $set['embedding'] as number[], embeddingModel: $set['embeddingModel'] as string } : {}),
  } as EdgeDoc;
  if ('_expireAt' in $set) result._expireAt = $set['_expireAt'] as Date;
  else if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;

  // Apply deleteFields to the returned doc for consistency
  if (deleteFieldsPaths && deleteFieldsPaths.length > 0) {
    applyDeleteFields(result as unknown as Record<string, unknown>, deleteFieldsPaths);
  }

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
 * BFS graph traversal from a starting entity.
 *
 * @param memberIds  Space IDs to search for edges and entities (supports proxy spaces).
 * @param startId    UUID of the starting entity.
 * @param direction  Follow edges from the node (outbound), to the node (inbound), or both.
 * @param edgeLabels If provided, only traverse edges with one of these labels.
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
): Promise<TraverseResult> {
  const visited = new Set<string>([startId]);
  // frontier: nodes whose outgoing edges we need to explore at the current depth
  let frontier: string[] = [startId];
  let frontierSet = new Set<string>(frontier);
  let currentDepth = 0;
  const resultNodes: TraverseNode[] = [];
  const resultEdges: TraverseEdge[] = [];

  const labelFilter = edgeLabels && edgeLabels.length > 0
    ? { label: { $in: edgeLabels } }
    : {};

  while (frontier.length > 0 && currentDepth < maxDepth) {
    // Batch-fetch all edges for the current frontier across all member spaces
    const adjacentEdges: EdgeDoc[] = [];
    for (const mid of memberIds) {
      let q: Record<string, unknown>;
      if (direction === 'outbound') {
        q = { spaceId: mid, from: { $in: frontier }, ...labelFilter };
      } else if (direction === 'inbound') {
        q = { spaceId: mid, to: { $in: frontier }, ...labelFilter };
      } else {
        q = { spaceId: mid, $or: [{ from: { $in: frontier } }, { to: { $in: frontier } }], ...labelFilter };
      }
      const edges = await col<EdgeDoc>(`${mid}_edges`).find(asFilter<EdgeDoc>(q)).toArray() as EdgeDoc[];
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

    if (newNeighborIds.length === 0) break;

    // Batch-fetch entity docs for all new neighbors
    const entityMap = new Map<string, EntityDoc>();
    for (const mid of memberIds) {
      const entities = await col<EntityDoc>(`${mid}_entities`)
        .find(asFilter<EntityDoc>({ _id: { $in: newNeighborIds }, spaceId: mid }))
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
        return { nodes: resultNodes, edges: resultEdges, truncated: true };
      }

      nextFrontier.push(neighborId);
    }

    frontier = nextFrontier;
    frontierSet = new Set<string>(frontier);
    currentDepth++;
  }

  return { nodes: resultNodes, edges: resultEdges, truncated: false };
}

// ── Recall-augmenting traversal ──────────────────────────────────────────────

/** Hard cap on the `traverse` depth accepted by graph-augmented recall. */
export const MAX_RECALL_TRAVERSE = 5;

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
export async function traverseFromSeeds(
  spaceId: string,
  seedIds: string[],
  maxDepth: number,
  limit: number,
): Promise<SeedTraverseNeighbor[]> {
  if (seedIds.length === 0 || maxDepth < 1 || limit < 1) return [];

  const visited = new Set<string>(seedIds);
  const pathTo = new Map<string, { from: string; label: string; to: string }[]>();
  for (const id of seedIds) pathTo.set(id, []);

  let frontier: string[] = [...new Set(seedIds)];
  let frontierSet = new Set<string>(frontier);
  let depth = 0;
  const results: SeedTraverseNeighbor[] = [];

  while (frontier.length > 0 && depth < maxDepth) {
    const edges = await col<EdgeDoc>(`${spaceId}_edges`)
      .find(asFilter<EdgeDoc>({ $or: [{ from: { $in: frontier } }, { to: { $in: frontier } }] }))
      .toArray() as EdgeDoc[];

    const newNeighborIds: string[] = [];
    for (const edge of edges) {
      // Same-level edge (both ends already in the frontier) — introduces no new node.
      if (frontierSet.has(edge.from) && frontierSet.has(edge.to)) continue;
      const frontierEnd = frontierSet.has(edge.from) ? edge.from : edge.to;
      const neighborId = frontierEnd === edge.from ? edge.to : edge.from;
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      pathTo.set(neighborId, [...(pathTo.get(frontierEnd) ?? []), { from: edge.from, label: edge.label, to: edge.to }]);
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
      .project({ embedding: 0 })
      .toArray() as EntityDoc[];
    const entityMap = new Map<string, EntityDoc>();
    for (const e of entities) entityMap.set(e._id, e);

    const nextFrontier: string[] = [];
    for (const neighborId of newNeighborIds) {
      const entity = entityMap.get(neighborId);
      if (!entity) continue; // not an entity in this space (e.g. cross-space edge target) — skip
      results.push({ _id: entity._id, spaceId, hops: depth + 1, path: pathTo.get(neighborId) ?? [], record: entity });
      if (results.length >= limit) return results;
      nextFrontier.push(neighborId);
    }

    frontier = nextFrontier;
    frontierSet = new Set<string>(frontier);
    depth++;
  }

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
    collected.push(...await traverseFromSeeds(sid, ids, maxDepth, limit));
  }
  collected.sort((a, b) => a.hops - b.hops); // prefer lower-hop neighbours when truncating
  return collected.slice(0, limit);
}
