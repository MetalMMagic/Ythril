/**
 * Read/analytics routes: stats, traverse, query, recall, find-similar, and reindex.
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { summariseActivity } from '../../metrics/space-activity-store.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { NotFoundError } from '../../util/errors.js';
import { countMemories } from '../../brain/memory.js';
import { getEmbedJobCounts } from '../../brain/embed-queue.js';
import { queryBrain } from '../../brain/query.js';
import { findSimilar, recall, rankOf, mergeRecallResults, type RecallKnowledgeType, type RecallResult } from '../../brain/recall.js';
import { validateFilterExpression, type FilterExpression } from '../../brain/filter.js';
import { traverseGraph, traverseRecallSeeds, MAX_RECALL_TRAVERSE, resolveEdgeEntityNames } from '../../brain/edges.js';
import { memoryEmbedText, entityEmbedText, edgeEmbedText, chronoEmbedText, fileEmbedText } from '../../brain/embed-text.js';
import { embed } from '../../brain/embedding.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { needsReindex, clearReindexFlag } from '../../spaces/_shared.js';
import { log } from '../../util/log.js';
import { collectAcrossMembers } from '../../spaces/proxy.js';
import { memberSpacesForRequest } from '../../spaces/proxy-scoped.js';
import type { MemoryDoc, EntityDoc, EdgeDoc, ChronoEntry, FileMetaDoc } from '../../config/types.js';
import { reindexInProgress } from '../../metrics/registry.js';
import { UUID_V4_RE } from './_shared.js';
import { buildErModel } from '../../brain/er-model.js';

export const searchRouter = Router();

/** Guard so only one reindex job runs at a time per process. */
let reindexJobRunning = false;


/**
 * GET /api/brain/spaces/:spaceId/er-model
 *
 * The space's entity-relationship model, inferred from the schema AND from what is stored — see
 * `brain/er-model.ts` for why both, and why a type with zero records is a result rather than an omission.
 *
 * Read-only and derived: no state, nothing cached, and every number is a real count.
 *
 * **On a proxy space this reports the member spaces separately rather than merged.** Merging would add up
 * counts for two types that share a name and mean different things in different spaces, and produce
 * relationships between types that can never actually be joined, since an edge cannot cross a space. A
 * union here would look richer and be false.
 */
searchRouter.get('/spaces/:spaceId/er-model', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const memberIds = memberSpacesForRequest(req, spaceId);
  const models = await Promise.all(memberIds.map(mid => buildErModel(mid)));
  res.json(memberIds.length === 1 && memberIds[0] === spaceId
    ? models[0]
    : { spaceId, members: models });
});


// GET /api/brain/spaces/:spaceId/stats
searchRouter.get('/spaces/:spaceId/stats', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const memberIds = memberSpacesForRequest(req, spaceId);
  const counts = await Promise.all(memberIds.map(async mid => ({
    memories: await countMemories(mid),
    entities: await col(`${mid}_entities`).countDocuments(),
    edges: await col(`${mid}_edges`).countDocuments(),
    chrono: await col(`${mid}_chrono`).countDocuments(),
    // Exclude chunk records (parentFileId set) — count only top-level file records
    files: await col(`${mid}_files`).countDocuments({ parentFileId: { $exists: false } }),
    // How much of the above is not searchable YET. Writes no longer wait for the embedding model, so a
    // record can exist and be absent from recall for a moment — and a caller asking "is this space ready"
    // could not tell that from "the model is down and nothing has embedded for an hour". Same shape as the
    // defect the queue fixed: a state the system knew about and never reported.
    embedQueue: await getEmbedJobCounts(mid),
  })));
  const memories = counts.reduce((s, c) => s + c.memories, 0);
  const entities = counts.reduce((s, c) => s + c.entities, 0);
  const edges = counts.reduce((s, c) => s + c.edges, 0);
  const chrono = counts.reduce((s, c) => s + c.chrono, 0);
  const files = counts.reduce((s, c) => s + c.files, 0);
  // Summed across members like everything else here, so a proxy space reports its members' backlog rather
  // than a zero that would read as "nothing pending".
  const embedQueue = {
    pending: counts.reduce((s, c) => s + c.embedQueue.pending, 0),
    processing: counts.reduce((s, c) => s + c.embedQueue.processing, 0),
    failed: counts.reduce((s, c) => s + c.embedQueue.failed, 0),
  };
  res.json({ spaceId, memories, entities, edges, chrono, files, embedQueue });
});


/**
 * GET /api/brain/spaces/:spaceId/activity — is this space earning its keep?
 *
 * Demand and payoff together, because either alone misleads: a space asked five hundred times that answers
 * nothing is not popular, and a space with a perfect answer rate that nobody queries is not useful either.
 *
 * Scoped to the requested space in the aggregation itself — a space-scoped token must not learn how heavily
 * every other space is used. The cross-space comparison lives on the admin route, behind admin auth.
 *
 * A proxy space reports its MEMBERS' activity summed, matching `stats` above: the calls arrive addressed to the
 * proxy, but the useful answer is what its members are doing.
 */
searchRouter.get('/spaces/:spaceId/activity', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  // Clamped rather than rejected: this is a dashboard window, and an out-of-range value has an obviously
  // correct interpretation. 90 days is the bucket retention — asking for more would silently return less.
  const raw = Number(req.query['hours'] ?? 24);
  const hours = Number.isFinite(raw) ? Math.max(1, Math.min(90 * 24, Math.floor(raw))) : 24;

  const memberIds = memberSpacesForRequest(req, spaceId);
  const rows = (await Promise.all(memberIds.map(mid => summariseActivity(hours, Date.now(), mid)))).flat();
  res.json({ spaceId, hours, spaces: rows });
});


/**
 * Drop the passage body from file chunks when the caller asked not to receive it.
 *
 * A file result's `content` is the largest field a recall returns, and it is returned `topK` times. Omitting
 * it leaves everything a caller needs to decide WHICH passage to fetch — path, heading, chunk index, tags —
 * which is the two-phase flow MCP callers have had all along.
 *
 * Only `content`, and only on file results: the flag is about the passage body, not about thinning a result.
 * Copies rather than mutating, because `seeds` is also handed to the traverse builder and to the audit
 * outcome — deleting a field in place would change what those saw.
 */
function stripContentIfAsked(results: RecallResult[], includeContent: boolean): RecallResult[] {
  if (includeContent) return results;
  return results.map(r => {
    if (r.type !== 'file' || r.content === undefined) return r;
    const { content: _dropped, ...rest } = r;
    return rest as RecallResult;
  });
}

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

  // Chrono entries are reachable by default; a client that assumed every node is an entity opts out.
  // Rejected rather than coerced, so `includeChrono: "false"` cannot silently mean true.
  const includeChronoRaw = (req.body as { includeChrono?: unknown }).includeChrono;
  if (includeChronoRaw !== undefined && typeof includeChronoRaw !== 'boolean') {
    res.status(400).json({ error: '`includeChrono` must be a boolean' });
    return;
  }

  const memberIds = memberSpacesForRequest(req, spaceId);
  const result = await traverseGraph(memberIds, startId.trim(), effectiveDirection, effectiveEdgeLabels, effectiveDepth, effectiveLimit,
    includeChronoRaw !== false);
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
  const { query, topK, types, minScore, filter, traverse, tags, minPerType, maxPerType, maxTimeMS } = req.body ?? {};
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

  // Per-type MAXIMUMS: the ceiling to the floor above (their top ask, A-L6-1). One long file chunk should
  // not be able to crowd out four one-line principles that would have answered the query more cheaply.
  //
  // A ceiling of 0 is REFUSED rather than accepted as "none of this type". It would work, and it would be a
  // second confusing way to spell `types` — with the difference that `types` says so in the parameter name.
  let safeMaxPerType: Partial<Record<RecallKnowledgeType, number>> | undefined;
  if (maxPerType != null) {
    if (typeof maxPerType !== 'object' || Array.isArray(maxPerType)) {
      res.status(400).json({ error: 'maxPerType must be an object mapping knowledge type -> maximum count' });
      return;
    }
    const acc: Partial<Record<RecallKnowledgeType, number>> = {};
    for (const [key, raw] of Object.entries(maxPerType as Record<string, unknown>)) {
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
        res.status(400).json({ error: `maxPerType.${key} must be an integer of at least 1 (use \`types\` to exclude a knowledge type entirely)` });
        return;
      }
      acc[key as RecallKnowledgeType] = Math.min(raw, safeTopK);
    }
    if (Object.keys(acc).length > 0) safeMaxPerType = acc;
  }

  // Per-call deadline. It can only LOWER `RECALL_BUDGET_MS`, never raise it — letting a request body extend
  // the operator's ceiling is a denial-of-service lever. Clamped rather than refused, because a caller asking
  // for 60 s on a 25 s instance wants "as long as you allow", and an error there teaches nothing.
  let safeMaxTimeMS: number | undefined;
  if (maxTimeMS != null) {
    if (typeof maxTimeMS !== 'number' || !Number.isInteger(maxTimeMS) || maxTimeMS < 1) {
      res.status(400).json({ error: '`maxTimeMS` must be a positive integer (milliseconds)' });
      return;
    }
    safeMaxTimeMS = maxTimeMS;
  }

  // A floor above its own ceiling is REFUSED, not silently resolved.
  //
  // Floor-wins and ceiling-wins are both defensible, which is exactly why the caller has to say which they
  // meant. Picking one here would answer 200 to a request that cannot be satisfied as written — the failure
  // shape this release spent four fixes on, in config form.
  if (safeMinPerType && safeMaxPerType) {
    for (const [t, floor] of Object.entries(safeMinPerType) as [RecallKnowledgeType, number][]) {
      const ceiling = safeMaxPerType[t];
      if (ceiling !== undefined && floor > ceiling) {
        res.status(400).json({
          error: `minPerType.${t} (${floor}) is greater than maxPerType.${t} (${ceiling}) — the two contradict, so neither can be applied`,
        });
        return;
      }
    }
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
    const memberIds = memberSpacesForRequest(req, spaceId);
    // One collector across every member, deduped by `recall` itself, so a proxy space reports "the answer is
    // partial" once rather than once per member.
    // Opt-in scan of the newest records, for the case the index has not caught up yet. Rejected rather
    // than coerced: `includeFreshWrites: "false"` is truthy, and an opt-in that silently turns itself on is
    // worse than one that errors.
    const includeFreshRaw = (req.body as { includeFreshWrites?: unknown }).includeFreshWrites;
    if (includeFreshRaw !== undefined && typeof includeFreshRaw !== 'boolean') {
      res.status(400).json({ error: '`includeFreshWrites` must be a boolean' });
      return;
    }
    const safeIncludeFresh = includeFreshRaw === true;

    // `includeContent: false` drops the passage BODY from file chunks, leaving where they are and what they
    // are about. MCP `recall` has had this since it shipped; REST had no way to ask for it, and an integrator
    // pointed out the asymmetry — the same two-surfaces-one-rule shape as four defects fixed the day before.
    //
    // Why it is worth a flag: a passage body is by far the largest field a result carries, and every field is
    // paid for `topK` times. Dropping it turns one expensive call into a cheap two-phase flow — recall to
    // find WHERE something is, then read only the chunk you chose. Default true, so no existing caller
    // changes; only an explicit `false` opts out, and a non-boolean is refused rather than coerced.
    const includeContentRaw = (req.body as { includeContent?: unknown }).includeContent;
    if (includeContentRaw !== undefined && typeof includeContentRaw !== 'boolean') {
      res.status(400).json({ error: '`includeContent` must be a boolean' });
      return;
    }
    const safeIncludeContent = includeContentRaw !== false;

    const degraded: string[] = [];
    const all = (await Promise.all(
      memberIds.map(mid => recall(mid, query.trim(), safeTopK, safeTags, safeTypes, safeMinPerType, safeMinScore, safeFilter, { maxPerType: safeMaxPerType, maxTimeMS: safeMaxTimeMS, degraded, includeFreshWrites: safeIncludeFresh })),
    )).flat();
    // rankOf, NOT `.score`. `recall()` has already ordered each space's results by the best signal it
    // has — cross-encoder, then RRF fusion, then vector similarity. Re-sorting the merged list by raw
    // vector score here silently threw both away, so hybrid ranking and reranking were undone at the
    // last step on every REST recall — including a single-space one, which still passes through this
    // merge with one member.
    all.sort((x, y) => rankOf(y) - rankOf(x));
    // A proxy space fans out to N members, and each one honoured `maxPerType` for itself — so without this
    // second pass a ceiling of 2 across three members would return six. The ceiling describes the ANSWER,
    // so it is enforced where the answer is assembled, using the same function rather than a second cap
    // loop. `minScore` is not re-applied: each member already filtered on it.
    const seeds = safeMaxPerType
      ? mergeRecallResults([], all, safeTopK, undefined, safeMaxPerType)
      : all.slice(0, safeTopK);

    // Tell the per-space counters whether this recall actually answered, and how good the best hit was.
    //
    // This is the difference between "this space is asked a lot" and "this space is useful": a space queried
    // five hundred times that returns nothing is not popular, and in a call count the two are identical. Only
    // this handler knows what came back, so it hands the outcome to the audit middleware, which owns the
    // duration and the space attribution.
    //
    // `rankOf` rather than `.score` for the same reason the sort above uses it — it is the best signal
    // available for the result, after reranking and fusion.
    req.recallOutcome = {
      answered: seeds.length > 0,
      ...(seeds.length > 0 ? { topScore: rankOf(seeds[0]!) } : {}),
    };

    if (safeTraverse === 0) {
      // `degraded` is present only when something degraded. An empty array on every healthy response is
      // noise, and a field that is almost always empty is a field readers learn to skip — which is exactly
      // when it needs to be noticed. The requester asked for the flag in the BODY rather than only a status,
      // because a 200 that is quietly short is indistinguishable from a 200 that found everything.
      res.json({ results: stripContentIfAsked(seeds, safeIncludeContent), count: seeds.length, ...(degraded.length > 0 ? { degraded } : {}) });
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
      // The flag applies here too. A caller who asked not to be sent passage bodies did not stop meaning it
      // because they also asked for graph expansion — and an option that silently lapses on one code path is
      // the same shape of defect as one that reaches only one surface.
      ...stripContentIfAsked(seeds, safeIncludeContent).map(s => ({ score: s.score, source: 'recall' as const, hops: 0, path: [], spaceId: s.spaceId, type: s.type, record: s })),
      ...neighbours.map(n => ({ score: null, source: 'traverse' as const, hops: n.hops, path: n.path, spaceId: n.spaceId, type: 'entity' as const, record: n.record })),
    ];
    // The traverse shape carries the flag too — the seeds it expanded may already have been partial, and a
    // caller cannot infer that from a longer list.
    res.json({ results, count: results.length, traverseDepth: safeTraverse, ...(degraded.length > 0 ? { degraded } : {}) });
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
  const memberIds = memberSpacesForRequest(req, spaceId);
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

  /**
   * A PROXY is refused, by name, with its members listed.
   *
   * It used to answer `200 {"status":"started"}` and then re-embed the member spaces — which the caller was
   * also reindexing individually, because they are in the same space list. Everything under the proxy got
   * embedded twice. It is idempotent, so nothing broke: on the reporting operator's largest instance it was
   * simply the longest job of the run and all of it was waste.
   *
   * The caller could not avoid it either. `GET /api/spaces` returns ids with no indication of which are
   * proxies, so there was nothing to branch on — which is why this is a refusal here rather than a note in
   * the docs.
   *
   * It is also what the rest of the model already does: a WRITE to a proxy requires an explicit
   * `targetSpace`, because a proxy is not a place records live. Accepting one here without comment was the
   * inconsistency.
   *
   * The members are named in the message so the remedy is the response rather than a second lookup.
   */
  const space = cfg.spaces.find(s => s.id === spaceId)!;
  if (space.proxyFor && space.proxyFor.length > 0) {
    res.status(400).json({
      error: `'${spaceId}' is a proxy space and has no index of its own. `
        + `Reindex its members instead: ${space.proxyFor.join(', ')}.`,
      proxyFor: space.proxyFor,
    });
    return;
  }

  if (reindexJobRunning) {
    res.status(409).json({ error: 'Reindex already in progress' });
    return;
  }

  const memberIds = memberSpacesForRequest(req, spaceId);
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
                // `excerpt` included, or a reindex would silently re-embed every converted document
                // without the document's own text — dropping exactly the phrases a reader searches for.
                const result = await embed(fileEmbedText(doc.path, doc.tags ?? [], doc.description, doc.properties, entityNames, doc.excerpt));
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
