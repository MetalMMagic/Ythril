/**
 * Read/analytics routes: stats, traverse, query, recall, find-similar, and reindex.
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { NotFoundError } from '../../util/errors.js';
import { countMemories } from '../../brain/memory.js';
import { queryBrain } from '../../brain/query.js';
import { findSimilar, recall, type RecallKnowledgeType } from '../../brain/recall.js';
import { validateFilterExpression, type FilterExpression } from '../../brain/filter.js';
import { traverseGraph, traverseRecallSeeds, MAX_RECALL_TRAVERSE, resolveEdgeEntityNames } from '../../brain/edges.js';
import { memoryEmbedText, entityEmbedText, edgeEmbedText, chronoEmbedText, fileEmbedText } from '../../brain/embed-text.js';
import { embed } from '../../brain/embedding.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { needsReindex, clearReindexFlag } from '../../spaces/_shared.js';
import { log } from '../../util/log.js';
import { resolveMemberSpaces, collectAcrossMembers } from '../../spaces/proxy.js';
import type { MemoryDoc, EntityDoc, EdgeDoc, ChronoEntry, FileMetaDoc } from '../../config/types.js';
import { reindexInProgress } from '../../metrics/registry.js';
import { UUID_V4_RE } from './_shared.js';

export const searchRouter = Router();

/** Guard so only one reindex job runs at a time per process. */
let reindexJobRunning = false;


// GET /api/brain/spaces/:spaceId/stats
searchRouter.get('/spaces/:spaceId/stats', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const memberIds = resolveMemberSpaces(spaceId);
  const counts = await Promise.all(memberIds.map(async mid => ({
    memories: await countMemories(mid),
    entities: await col(`${mid}_entities`).countDocuments(),
    edges: await col(`${mid}_edges`).countDocuments(),
    chrono: await col(`${mid}_chrono`).countDocuments(),
    // Exclude chunk records (parentFileId set) — count only top-level file records
    files: await col(`${mid}_files`).countDocuments({ parentFileId: { $exists: false } }),
  })));
  const memories = counts.reduce((s, c) => s + c.memories, 0);
  const entities = counts.reduce((s, c) => s + c.entities, 0);
  const edges = counts.reduce((s, c) => s + c.edges, 0);
  const chrono = counts.reduce((s, c) => s + c.chrono, 0);
  const files = counts.reduce((s, c) => s + c.files, 0);
  res.json({ spaceId, memories, entities, edges, chrono, files });
});


// POST /api/brain/spaces/:spaceId/traverse — graph traversal (BFS)
searchRouter.post('/spaces/:spaceId/traverse', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const { startId, direction, edgeLabels, maxDepth, limit } = req.body ?? {};
  if (!startId || typeof startId !== 'string') {
    res.status(400).json({ error: '`startId` string required' });
    return;
  }
  const validDirections = new Set(['outbound', 'inbound', 'both']);
  const effectiveDirection: 'outbound' | 'inbound' | 'both' =
    typeof direction === 'string' && validDirections.has(direction)
      ? (direction as 'outbound' | 'inbound' | 'both')
      : 'outbound';
  const effectiveEdgeLabels: string[] | undefined =
    Array.isArray(edgeLabels) && edgeLabels.every((l: unknown) => typeof l === 'string')
      ? edgeLabels
      : undefined;
  if (edgeLabels !== undefined && !Array.isArray(edgeLabels)) {
    res.status(400).json({ error: '`edgeLabels` must be an array of strings' });
    return;
  }
  const rawDepth = typeof maxDepth === 'number' ? maxDepth : 3;
  const effectiveDepth = Math.min(Math.max(1, rawDepth), 10);
  const rawLimit = typeof limit === 'number' ? limit : 100;
  const effectiveLimit = Math.min(Math.max(1, rawLimit), 1000);

  const memberIds = resolveMemberSpaces(spaceId);
  const result = await traverseGraph(memberIds, startId.trim(), effectiveDirection, effectiveEdgeLabels, effectiveDepth, effectiveLimit);
  res.json(result);
});


// POST /api/brain/spaces/:spaceId/query — structured query with filter/projection
searchRouter.post('/spaces/:spaceId/query', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const { collection, filter, projection, limit, maxTimeMS } = req.body ?? {};
  const validCollections = ['memories', 'entities', 'edges', 'chrono', 'files'] as const;
  if (!validCollections.includes(collection)) {
    res.status(400).json({ error: `collection must be one of: ${validCollections.join(', ')}` });
    return;
  }
  const safeFilter: Record<string, unknown> =
    filter != null && typeof filter === 'object' && !Array.isArray(filter)
      ? (filter as Record<string, unknown>)
      : {};
  const safeProjection: Record<string, unknown> | undefined =
    projection != null && typeof projection === 'object' && !Array.isArray(projection)
      ? (projection as Record<string, unknown>)
      : undefined;
  const safeLimit = typeof limit === 'number' ? limit : 20;
  const safeMaxTimeMS = typeof maxTimeMS === 'number' ? maxTimeMS : 5000;

  try {
    const docs = await collectAcrossMembers(spaceId, mid =>
      queryBrain(
        mid,
        collection as typeof validCollections[number],
        safeFilter,
        safeProjection,
        safeLimit,
        safeMaxTimeMS,
      ),
    );
    res.json({ results: docs, collection, count: docs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});


/** One entry in a graph-augmented recall response (traverse > 0). */
interface RecallTraverseItem {
  /** Vector similarity score for seeds; null for traversal-reached records. */
  score: number | null;
  source: 'recall' | 'traverse';
  /** 0 = seed, 1 = one edge away, etc. */
  hops: number;
  /** Edge chain connecting this record to its seed (empty for seeds). */
  path: { from: string; label: string; to: string }[];
  spaceId: string;
  type: string;
  record: unknown;
}

// POST /api/brain/spaces/:spaceId/recall — semantic vector search by natural language query
searchRouter.post('/spaces/:spaceId/recall', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const { query, topK, types, minScore, filter, traverse, tags, minPerType } = req.body ?? {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'query must be a non-empty string' });
    return;
  }
  const safeTopK = typeof topK === 'number' ? Math.min(Math.max(topK, 1), 100) : 10;
  const safeTypes = Array.isArray(types) ? types.filter((t: unknown): t is RecallKnowledgeType => typeof t === 'string') : undefined;
  const safeMinScore = typeof minScore === 'number' ? minScore : undefined;

  // `tags` and `minPerType` are supported by recall() but were previously hardcoded to
  // undefined here, so they were reachable only via MCP / the internal function.
  let safeTags: string[] | undefined;
  if (tags != null) {
    if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string')) {
      res.status(400).json({ error: 'tags must be an array of strings' });
      return;
    }
    safeTags = (tags as string[]).filter(t => t.trim().length > 0);
    if (safeTags.length === 0) safeTags = undefined;
  }

  // Per-type minimums: guarantee at least N hits of a given knowledge type. Each value
  // is clamped to [0, topK] — asking for more of a type than the total result size is
  // meaningless, and an unbounded value would widen the underlying per-type searches.
  let safeMinPerType: Partial<Record<RecallKnowledgeType, number>> | undefined;
  if (minPerType != null) {
    if (typeof minPerType !== 'object' || Array.isArray(minPerType)) {
      res.status(400).json({ error: 'minPerType must be an object mapping knowledge type -> minimum count' });
      return;
    }
    const acc: Partial<Record<RecallKnowledgeType, number>> = {};
    for (const [key, raw] of Object.entries(minPerType as Record<string, unknown>)) {
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
        res.status(400).json({ error: `minPerType.${key} must be a non-negative integer` });
        return;
      }
      acc[key as RecallKnowledgeType] = Math.min(raw, safeTopK);
    }
    if (Object.keys(acc).length > 0) safeMinPerType = acc;
  }

  // Graph-traversal expansion depth. 0 (default) = classic recall, unchanged.
  // Rejected rather than clamped past the cap so an obviously-wrong depth surfaces.
  let safeTraverse = 0;
  if (traverse != null) {
    if (typeof traverse !== 'number' || !Number.isInteger(traverse) || traverse < 0 || traverse > MAX_RECALL_TRAVERSE) {
      res.status(400).json({ error: `traverse must be an integer between 0 and ${MAX_RECALL_TRAVERSE}` });
      return;
    }
    safeTraverse = traverse;
  }

  let safeFilter: FilterExpression | undefined;
  if (filter != null) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      res.status(400).json({ error: 'filter must be an object' });
      return;
    }
    const filterErr = validateFilterExpression(filter as FilterExpression);
    if (filterErr) {
      res.status(400).json({ error: filterErr });
      return;
    }
    safeFilter = filter as FilterExpression;
  }

  try {
    const memberIds = resolveMemberSpaces(spaceId);
    const all = (await Promise.all(
      memberIds.map(mid => recall(mid, query.trim(), safeTopK, safeTags, safeTypes, safeMinPerType, safeMinScore, safeFilter)),
    )).flat();
    all.sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
    const seeds = all.slice(0, safeTopK);

    if (safeTraverse === 0) {
      res.json({ results: seeds, count: seeds.length });
      return;
    }

    // Graph-augmented recall: expand seeds along edges, cap the combined output.
    const totalCap = safeTopK * (safeTraverse + 1) * 4;
    const neighbours = await traverseRecallSeeds(
      memberIds,
      seeds.map(s => ({ _id: s._id, spaceId: s.spaceId })),
      safeTraverse,
      Math.max(0, totalCap - seeds.length),
    );
    const results: RecallTraverseItem[] = [
      ...seeds.map(s => ({ score: s.score, source: 'recall' as const, hops: 0, path: [], spaceId: s.spaceId, type: s.type, record: s })),
      ...neighbours.map(n => ({ score: null, source: 'traverse' as const, hops: n.hops, path: n.path, spaceId: n.spaceId, type: 'entity' as const, record: n.record })),
    ];
    res.json({ results, count: results.length, traverseDepth: safeTraverse });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});


// POST /api/brain/spaces/:spaceId/find-similar — vector similarity search by existing entry ID
const VALID_ENTRY_TYPES = new Set(['memory', 'entity', 'edge', 'chrono', 'file']);

searchRouter.post('/spaces/:spaceId/find-similar', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const entryId = typeof body['entryId'] === 'string' ? body['entryId'].trim() : '';
  const entryType = typeof body['entryType'] === 'string' ? body['entryType'].trim() : '';
  const topK = typeof body['topK'] === 'number' ? Math.min(Math.max(body['topK'], 1), 100) : 10;
  const minScore = typeof body['minScore'] === 'number' ? body['minScore'] : undefined;
  const crossSpace = body['crossSpace'] === true;
  const targetTypes = Array.isArray(body['targetTypes'])
    ? (body['targetTypes'] as unknown[]).filter((t): t is RecallKnowledgeType => typeof t === 'string' && VALID_ENTRY_TYPES.has(t))
    : undefined;

  if (!entryId || !UUID_V4_RE.test(entryId)) {
    res.status(400).json({ error: 'entryId must be a valid UUID v4' });
    return;
  }
  if (!VALID_ENTRY_TYPES.has(entryType)) {
    res.status(400).json({ error: `entryType must be one of: ${[...VALID_ENTRY_TYPES].join(', ')}` });
    return;
  }

  // Determine cross-space search scope
  let crossSpaceIds: string[] | undefined;
  if (crossSpace) {
    const tokenSpaces = req.authToken?.spaces;
    crossSpaceIds = cfg.spaces
      .filter(s => !tokenSpaces || tokenSpaces.includes(s.id))
      .map(s => s.id);
  }

  try {
    const result = await findSimilar(
      spaceId,
      entryId,
      entryType as RecallKnowledgeType,
      topK,
      targetTypes,
      minScore,
      crossSpaceIds,
    );
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  }
});


searchRouter.get('/spaces/:spaceId/reindex-status', globalRateLimit, requireSpaceAuth, (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const memberIds = resolveMemberSpaces(spaceId);
  const needs = memberIds.some(mid => needsReindex(mid));
  res.json({ spaceId, needsReindex: needs });
});


// POST /api/brain/spaces/:spaceId/reindex
// Re-embeds all memories in a space using the currently configured model.
// Long-running: may take minutes for large spaces. Progress is logged server-side.
searchRouter.post('/spaces/:spaceId/reindex', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  if (reindexJobRunning) {
    res.status(409).json({ error: 'Reindex already in progress' });
    return;
  }

  const memberIds = resolveMemberSpaces(spaceId);
  reindexJobRunning = true;
  reindexInProgress.set(1);
  res.json({ spaceId, reindexed: 0, errors: 0, status: 'started' });

  // Start heavy work on the next turn so HTTP headers flush immediately.
  setImmediate(() => {
    void (async () => {
      let reindexed = 0;
      let errors = 0;
      try {
        for (const mid of memberIds) {
        const BATCH = 50;

        // Re-embed memories
        {
          let cursor: string | null = null;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const q: Record<string, unknown> = cursor ? { _id: { $gt: cursor } } : {};
            const batch: MemoryDoc[] = await col<MemoryDoc>(`${mid}_memories`)
              .find(asFilter<MemoryDoc>(q), { projection: { _id: 1, fact: 1, tags: 1, entityIds: 1, description: 1, properties: 1 } })
              .sort({ _id: 1 })
              .limit(BATCH)
              .toArray() as MemoryDoc[];
            if (batch.length === 0) break;
            for (const doc of batch) {
              try {
                const entityIds: string[] = Array.isArray(doc.entityIds) ? doc.entityIds : [];
                const entityDocs = entityIds.length > 0
                  ? await col<EntityDoc>(`${mid}_entities`)
                      .find(asFilter<EntityDoc>({ _id: { $in: entityIds } }), { projection: { name: 1 } })
                      .toArray() as Array<{ name: string }>
                  : [];
                const entityNames = entityDocs.map(e => e.name);
                const result = await embed(memoryEmbedText(doc.fact, doc.tags ?? [], entityNames, doc.description, doc.properties));
                await col<MemoryDoc>(`${mid}_memories`).updateOne(
                  { _id: doc._id },
                  { $set: { embedding: result.vector, embeddingModel: result.model } },
                );
                reindexed++;
              } catch { errors++; }
            }
            cursor = batch[batch.length - 1]?._id ?? null;
          }
        }

        // Re-embed entities (name + type + tags + description + properties)
        {
          let cursor: string | null = null;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const q: Record<string, unknown> = cursor ? { _id: { $gt: cursor } } : {};
            const batch: EntityDoc[] = await col<EntityDoc>(`${mid}_entities`)
              .find(asFilter<EntityDoc>(q), { projection: { _id: 1, name: 1, type: 1, tags: 1, description: 1, properties: 1 } })
              .sort({ _id: 1 })
              .limit(BATCH)
              .toArray() as EntityDoc[];
            if (batch.length === 0) break;
            for (const doc of batch) {
              try {
                const result = await embed(entityEmbedText(doc.name, doc.type, doc.tags ?? [], doc.description, doc.properties ?? {}));
                await col<EntityDoc>(`${mid}_entities`).updateOne(
                  { _id: doc._id },
                  { $set: { embedding: result.vector, embeddingModel: result.model } },
                );
                reindexed++;
              } catch { errors++; }
            }
            cursor = batch[batch.length - 1]?._id ?? null;
          }
        }

        // Re-embed edges (tags + from-name + label + to-name + type + description + properties)
        {
          let cursor: string | null = null;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const q: Record<string, unknown> = cursor ? { _id: { $gt: cursor } } : {};
            const batch: EdgeDoc[] = await col<EdgeDoc>(`${mid}_edges`)
              .find(asFilter<EdgeDoc>(q), { projection: { _id: 1, from: 1, label: 1, to: 1, type: 1, tags: 1, description: 1, properties: 1 } })
              .sort({ _id: 1 })
              .limit(BATCH)
              .toArray() as EdgeDoc[];
            if (batch.length === 0) break;
            for (const doc of batch) {
              try {
                // Resolve from/to to entity NAMES (not IDs) and include properties — matching
                // edgeEmbedText so a reindex reproduces exactly what upsertEdge embedded.
                const [fromName, toName] = await resolveEdgeEntityNames(mid, doc.from, doc.to);
                const result = await embed(edgeEmbedText(fromName, doc.label, toName, doc.tags ?? [], doc.type, doc.description, doc.properties));
                await col<EdgeDoc>(`${mid}_edges`).updateOne(
                  { _id: doc._id },
                  { $set: { embedding: result.vector, embeddingModel: result.model } },
                );
                reindexed++;
              } catch { errors++; }
            }
            cursor = batch[batch.length - 1]?._id ?? null;
          }
        }

        // Re-embed chrono (type + status + title + tags + description + properties)
        {
          let cursor: string | null = null;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const q: Record<string, unknown> = cursor ? { _id: { $gt: cursor } } : {};
            const batch: ChronoEntry[] = await col<ChronoEntry>(`${mid}_chrono`)
              .find(asFilter<ChronoEntry>(q), { projection: { _id: 1, title: 1, type: 1, status: 1, description: 1, tags: 1, properties: 1 } })
              .sort({ _id: 1 })
              .limit(BATCH)
              .toArray() as ChronoEntry[];
            if (batch.length === 0) break;
            for (const doc of batch) {
              try {
                const result = await embed(chronoEmbedText(doc.title, doc.type, doc.status, doc.description, doc.tags ?? [], doc.properties));
                await col<ChronoEntry>(`${mid}_chrono`).updateOne(
                  { _id: doc._id },
                  { $set: { embedding: result.vector, embeddingModel: result.model } },
                );
                reindexed++;
              } catch { errors++; }
            }
            cursor = batch[batch.length - 1]?._id ?? null;
          }
        }

        // Re-embed files (path + entity names + tags + description + property values)
        {
          let cursor: string | null = null;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            // Exclude chunk records (parentFileId set) — they have their own embedding logic
            const q: Record<string, unknown> = cursor
              ? { _id: { $gt: cursor }, parentFileId: { $exists: false } }
              : { parentFileId: { $exists: false } };
            const batch: FileMetaDoc[] = await col<FileMetaDoc>(`${mid}_files`)
              .find(asFilter<FileMetaDoc>(q), { projection: { _id: 1, path: 1, tags: 1, description: 1, properties: 1, entityIds: 1 } })
              .sort({ _id: 1 })
              .limit(BATCH)
              .toArray() as FileMetaDoc[];
            if (batch.length === 0) break;
            for (const doc of batch) {
              try {
                const entityIds: string[] = Array.isArray(doc.entityIds) ? doc.entityIds : [];
                const entityDocs = entityIds.length > 0
                  ? await col<EntityDoc>(`${mid}_entities`)
                      .find(asFilter<EntityDoc>({ _id: { $in: entityIds } }), { projection: { name: 1 } })
                      .toArray() as Array<{ name: string }>
                  : [];
                const entityNames = entityDocs.map(e => e.name);
                const result = await embed(fileEmbedText(doc.path, doc.tags ?? [], doc.description, doc.properties, entityNames));
                await col<FileMetaDoc>(`${mid}_files`).updateOne(
                  { _id: doc._id },
                  { $set: { embedding: result.vector, embeddingModel: result.model } },
                );
                reindexed++;
              } catch { errors++; }
            }
            cursor = batch[batch.length - 1]?._id ?? null;
          }
        }

          clearReindexFlag(mid);
        }
        log.info(`Reindex completed for space '${spaceId}': reindexed=${reindexed}, errors=${errors}`);
      } catch (err) {
        log.error(`Reindex job failed for space '${spaceId}': ${String(err)}`);
      } finally {
        reindexJobRunning = false;
        reindexInProgress.set(0);
      }
    })();
  });
});
