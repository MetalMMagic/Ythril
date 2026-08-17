/**
 * Read/analytics routes: stats, traverse, query, recall, find-similar, and reindex.
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { spacesWhereTokenMay } from '../../auth/reachable-spaces.js';
import { legacySpacesOf } from '../../auth/legacy-spaces.js';
import type { TokenRights } from '../../config/rights-shape.js';
import { summariseActivity } from '../../metrics/space-activity-store.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { parseSortParam, toMongoSort, SORTABLE_FIELDS } from '../../brain/list-sort.js';
import { pageAcrossMembers } from '../../spaces/page-across-members.js';
import { NotFoundError } from '../../util/errors.js';
import { countMemories } from '../../brain/memory.js';
import { getEmbedJobCounts } from '../../brain/embed-queue.js';
import {
  queryBrain, countBrain, QUERY_BODY_FIELDS, TRAVERSE_BODY_FIELDS, RECALL_BODY_FIELDS, FIND_SIMILAR_BODY_FIELDS,
  unknownBodyFields, compareBySort, DEFAULT_QUERY_SORT, QUERY_PAGE_MAX, PROXY_PAGE_CEILING,
} from '../../brain/query.js';
import { findSimilar, recall, type RecallKnowledgeType, type RecallResult } from '../../brain/recall.js';
import { type FilterExpression } from '../../brain/filter.js';
import { resolveRecallFilter } from '../../brain/recall-filter.js';
import { traverseGraph, MAX_RECALL_TRAVERSE, resolveEdgeEntityNames } from '../../brain/edges.js';
import { buildGraphWithSpill, spillResultSet, SPILL_INLINE_RESULTS } from '../../brain/graph-spill.js';
import { embed } from '../../brain/embedding.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { needsReindex } from '../../spaces/_shared.js';
import { planReindex, startReindex } from '../../brain/reindex.js';
import { log } from '../../util/log.js';
import { memberSpacesForRequest } from '../../spaces/proxy-scoped.js';
import type { MemoryDoc, EntityDoc, EdgeDoc, ChronoEntry, FileMetaDoc } from '../../config/types.js';
import { reindexInProgress } from '../../metrics/registry.js';
import { UUID_V4_RE } from './_shared.js';
import { buildErModel } from '../../brain/er-model.js';
import {
  rankOf, mergeRecallResults, withoutDiagnostics, RECALL_ENVELOPE_KEYS,
} from '../../brain/recall-shape.js';
import { mapGraphNodes, graphNodeRecord } from '../../brain/recall-graph.js';
import { applyProjection, normaliseProjection, type NormalisedProjection } from '../../brain/projection.js';
import { resolveBudget, budgetedEnvelope, type BudgetRequest } from '../../brain/result-budget.js';

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
/**
 * Apply a caller's projection to flat recall results, keeping the envelope.
 *
 * `RECALL_ENVELOPE_KEYS` is why this is not just `applyProjection`: a REST result flattens the record and the
 * ranking envelope into one object, so projecting `{name: 1}` without this would drop the `score` the search
 * was for. On MCP the same parameter reaches only `record`, which is the same rule expressed against a shape
 * that already separates them.
 */
function projectResults(results: RecallResult[], norm: NormalisedProjection | undefined): unknown[] {
  if (!norm) return results;
  return results.map(r => {
    const src = r as unknown as Record<string, unknown>;
    const out = applyProjection(src, norm);
    for (const k of RECALL_ENVELOPE_KEYS) if (k in src) out[k] = src[k];
    return out;
  });
}

/** Read and validate `projection` from a recall-shaped body. Shared by both routes so they cannot diverge. */
function projectionFromBody(body: unknown): { ok: true; norm: NormalisedProjection | undefined } | { ok: false; error: string } {
  const raw = (body as { projection?: unknown } | null | undefined)?.projection;
  if (raw === undefined || raw === null) return { ok: true, norm: undefined };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: '`projection` must be a plain object mapping field paths to 1 or 0' };
  }
  return { ok: true, norm: normaliseProjection(raw as Record<string, unknown>) };
}

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
  // Same refusal as /query, for the same reason: a mistyped `maxDepth` here returns a shallower graph with a 200.
  const badTraverse = unknownBodyFields((req.body ?? {}) as Record<string, unknown>, TRAVERSE_BODY_FIELDS);
  if (badTraverse) { res.status(400).json(badTraverse); return; }
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

  // What the answer CONTAINS, as three flags rather than one. Chrono entries are reachable by default; a
  // client that assumed every node is an entity opts out. Memories are opt-IN — they are usually the most
  // numerous record type and every node counts against `limit`, so on by default they would truncate away the
  // entities the caller traversed for. Edges are always FOLLOWED (they are the graph); the flag only decides
  // whether the edge list rides along in the response.
  //
  // Each is rejected rather than coerced: `includeChrono: "false"` is a truthy string, and a flag that
  // silently turns itself on is worse than one that errors.
  const inclusions = { includeChrono: true, includeMemories: false, includeFiles: false, includeEdges: true };
  for (const flag of Object.keys(inclusions) as (keyof typeof inclusions)[]) {
    const raw = (req.body as Record<string, unknown>)[flag];
    if (raw === undefined) continue;
    if (typeof raw !== 'boolean') {
      res.status(400).json({ error: `\`${flag}\` must be a boolean` });
      return;
    }
    inclusions[flag] = raw;
  }

  const memberIds = memberSpacesForRequest(req, spaceId);
  const result = await traverseGraph(memberIds, startId.trim(), effectiveDirection, effectiveEdgeLabels, effectiveDepth, effectiveLimit,
    inclusions.includeChrono, inclusions.includeMemories, inclusions.includeFiles, inclusions.includeEdges);
  res.json(result);
});


// POST /api/brain/spaces/:spaceId/query — structured query with filter/projection
//
// ## Two defects, one shape
//
// aigents, 2026-08-12T1410Z: `skip` was accepted at 200 and silently ignored, and *"it cost us a fabricated number"* —
// a paged sweep re-read page one every time and was counted as if it had advanced. Their report names `skip`; the defect
// is the PERMISSIVE BODY. Honouring one key would have left every other unknown key doing the same thing.
//
// So both halves are here: the body is strict, and `skip` is real. MCP's `query` tool already declared
// `additionalProperties: false` and so already refused unknown keys — REST was the weaker of the two surfaces for the
// same rule, which is this repo's most repeated defect class.
searchRouter.post('/spaces/:spaceId/query', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const bad = unknownBodyFields(body, QUERY_BODY_FIELDS);
  if (bad) { res.status(400).json(bad); return; }

  const { collection, filter, projection, limit, maxTimeMS, skip } = body;
  const validCollections = ['memories', 'entities', 'edges', 'chrono', 'files'] as const;
  if (!validCollections.includes(collection as typeof validCollections[number])) {
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
  // The caller-facing page cap. It used to live inside `queryBrain`, where it also bounded the proxy merge's internal
  // fetch and silently truncated deep pages to nothing.
  const safeLimit = Math.min(typeof limit === 'number' ? limit : 20, QUERY_PAGE_MAX);
  const safeMaxTimeMS = typeof maxTimeMS === 'number' ? maxTimeMS : 5000;

  // A non-integer or negative `skip` is refused rather than floored to 0. Silently reading it as "start from the
  // beginning" is the same failure they reported: a page that is not the page asked for, returned with a 200.
  if (skip !== undefined && (typeof skip !== 'number' || !Number.isInteger(skip) || skip < 0)) {
    res.status(400).json({ error: 'skip must be a non-negative integer' });
    return;
  }
  const safeSkip = typeof skip === 'number' ? skip : 0;

  // Same `sort`/`dir` the brain LIST endpoints take, with the same allowlist and the same 400 text — a caller who knows
  // one knows the other, and inventing an object form here would have been a second way to say one thing.
  // `toMongoSort` appends `_id`, which is what keeps a caller-chosen order total and therefore pageable.
  const sortParse = parseSortParam(body['sort'], body['dir'], SORTABLE_FIELDS[collection as keyof typeof SORTABLE_FIELDS]);
  if ('error' in sortParse) { res.status(400).json({ error: sortParse.error }); return; }
  const order = sortParse.sort ? toMongoSort(sortParse.sort) : DEFAULT_QUERY_SORT;

  try {
    // One paging rule, shared with the embed-job listing. It used to be inline here, and being inline is how it shipped
    // a window capped at 100 that sliced deep pages to nothing — see `spaces/page-across-members.ts`.
    const members = memberSpacesForRequest(req, spaceId);
    const page = await pageAcrossMembers({
      members,
      limit: safeLimit,
      skip: safeSkip,
      ceiling: PROXY_PAGE_CEILING,
      compare: compareBySort(order),
      readMember: (mid, lim, sk) => queryBrain(
        mid, collection as typeof validCollections[number],
        safeFilter, safeProjection, lim, safeMaxTimeMS, sk, order,
      ),
    });
    if (!page.ok) { res.status(400).json({ error: page.error }); return; }
    const merged = page.rows;

    let total = 0;
    for (const mid of members) {
      total += await countBrain(mid, collection as typeof validCollections[number], safeFilter, safeMaxTimeMS);
    }
    res.json({
      results: merged, collection,
      // `count` is this page; `total` is the whole match. Both, because renaming `count` would break every caller that
      // already reads it and dropping it would break them silently.
      count: merged.length, total, limit: safeLimit, skip: safeSkip,
      ...(sortParse.sort ? { sort: sortParse.sort.field, dir: sortParse.sort.dir === 1 ? 'asc' : 'desc' } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});


// POST /api/brain/spaces/:spaceId/recall — semantic vector search by natural language query
searchRouter.post('/spaces/:spaceId/recall', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  // A mistyped `minScore` on recall silently returns the unfiltered ranking, which reads as a working search.
  const badRecall = unknownBodyFields((req.body ?? {}) as Record<string, unknown>, RECALL_BODY_FIELDS);
  if (badRecall) { res.status(400).json(badRecall); return; }
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

  // EITHER grammar. The operator-object form is passed through untouched so it keeps the native pre-filter path; a raw
  // MongoDB filter is validated with the same parser `query` uses and goes down the exhaustive path.
  // One channel: `recall` takes either grammar in the same parameter, so there is nothing here to keep in step.
  const resolved = resolveRecallFilter(filter);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const safeFilter = resolved.kind === 'expression' ? resolved.expression
    : resolved.kind === 'mongo' ? resolved.filter
      : undefined;

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

    // `includeDiagnostics` (default FALSE) restores the six fields a recall result carries for the system
    // rather than for the caller: `matchedText`, `embeddingModel`, `seq`, and the three per-stage scores.
    //
    // This door used to return all six unconditionally while MCP returned none, and neither said so. Owner
    // ruled 2026-08-16 that the two surfaces match and that the fields are off by default on both — so this
    // is a BREAKING change to the REST response, and deliberately: `matchedText` is the pre-embedding source
    // string, which for a file chunk is the passage a SECOND time, so the old default sent a large field
    // nobody had asked for `topK` times.
    const includeDiagRaw = (req.body as { includeDiagnostics?: unknown }).includeDiagnostics;
    if (includeDiagRaw !== undefined && typeof includeDiagRaw !== 'boolean') {
      res.status(400).json({ error: '`includeDiagnostics` must be a boolean' });
      return;
    }
    const safeIncludeDiagnostics = includeDiagRaw === true;

    // `projection`, the same grammar `/query` takes and the same reading of it — see `brain/projection.ts`.
    // breituai-platform measured the cost of its absence: 100,547 characters for ~1.5 KB of wanted data.
    const projParse = projectionFromBody(req.body);
    if (!projParse.ok) { res.status(400).json({ error: projParse.error }); return; }
    const safeProjection = projParse.norm;

    // The byte budget (X-17), replacing the record cap that collapsed a large answer to three inline records
    // plus a whole-set dump — a shape that roughly DOUBLED the caller's cost rather than reducing it.
    const budget = resolveBudget(req.body as BudgetRequest);
    if (!budget.ok) { res.status(400).json({ error: budget.error }); return; }

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
      // A large answer spills even with NO traversal: `topK: 100` is 100 records, and this branch used to
      // return all of them because the spill lived in the graph branch alone. That was the bug the E2E caught —
      // the rule is about the size of the result set, not about whether a graph is attached.
      const plain = projectResults(
        withoutDiagnostics(stripContentIfAsked(seeds, safeIncludeContent), safeIncludeDiagnostics),
        safeProjection);
      const plainBudgeted = await budgetedEnvelope({
        results: plain,
        budgetBytes: budget.bytes,
        spillRemainder: remainder => spillResultSet({
          memberSpaceId: seeds[0]?.spaceId ?? spaceId,
          results: remainder,
          graphNodes: 0,
          request: { query: query.trim(), topK: safeTopK, traverse: 0, types: safeTypes ?? null },
        }),
      });
      res.json({
        results: plainBudgeted.results,
        ...plainBudgeted.fields,
        ...(degraded.length > 0 ? { degraded } : {}),
      });
      return;
    }

    // Graph-augmented recall: expand seeds along edges, cap the traversed NODES, and nest each one under the
    // seed that reached it. `count` is the number of MATCHES — it used to be matches plus neighbours, so a
    // caller asking for `topK: 1` was told `count: 6` and could not use the number they page on.
    const totalCap = safeTopK * (safeTraverse + 1) * 4;
    // The cap is now the SPILL point rather than the truncation point: past it the whole neighbourhood is
    // written to the space's `_tmp/` and the response carries an authenticated download link. A short graph
    // reads as "this record has few relationships", which is a wrong conclusion about the DATA.
    const { graph, spill } = await buildGraphWithSpill(
      memberIds,
      seeds.map(s => ({ _id: s._id, spaceId: s.spaceId })),
      safeTraverse,
      Math.max(0, totalCap - seeds.length),
    );
    // The flag applies here too. A caller who asked not to be sent passage bodies did not stop meaning it
    // because they also asked for graph expansion — and an option that silently lapses on one code path is
    // the same shape of defect as one that reaches only one surface.
    // Through `mapGraphNodes` rather than attaching `graph.bySeed` raw. It was the raw attach that let the
    // whole edge document — vector included, until the projection added beside this change — reach a REST
    // caller while MCP's copy of the same tree went through a shaping function. One nesting implementation
    // is the point of that function; this door had been going round it.
    const withGraph = withoutDiagnostics(stripContentIfAsked(seeds, safeIncludeContent), safeIncludeDiagnostics)
      .map(s => {
        const nested = mapGraphNodes(
          graph.bySeed.get(s._id), graphNodeRecord, safeIncludeDiagnostics, safeProjection);
        return nested ? { ...s, _graph: nested } : s;
      });
    const results = projectResults(withGraph as RecallResult[], safeProjection);
    // `graphNodes` reports what `count` used to conflate: how much graph came back. Two numbers, each meaning
    // one thing, rather than one number meaning whichever the reader assumes.
    // The WHOLE result set spills, not the graph alone: `topK: 100, traverse: 2` is a large answer even when
    // every graph inside it is complete, and a caller cannot page a recall. Past the threshold the response
    // carries a SAMPLE — three matches — and the link to all of it. Embeddings are stripped from the file.
    const budgeted = await budgetedEnvelope({
      results,
      budgetBytes: budget.bytes,
      spillRemainder: remainder => spillResultSet({
        memberSpaceId: seeds[0]?.spaceId ?? spaceId,
        results: remainder,
        graphNodes: graph.nodes,
        request: { query: query.trim(), topK: safeTopK, traverse: safeTraverse, types: safeTypes ?? null },
      }),
    });
    res.json({
      results: budgeted.results,
      ...budgeted.fields,
      traverseDepth: safeTraverse,
      graphNodes: graph.nodes,
      ...(spill ? { graphTruncated: true, graphComplete: spill } : {}),
      ...(degraded.length > 0 ? { degraded } : {}),
    });
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
  // `crossSpace` is deprecated here but still ALLOWED, so this refusal does not break the callers we told to stop
  // using it before we have removed it. Refusing a key we still accept elsewhere would be a worse contract than the
  // permissive body it replaces.
  const badSimilar = unknownBodyFields(body, FIND_SIMILAR_BODY_FIELDS);
  if (badSimilar) { res.status(400).json(badSimilar); return; }
  const entryId = typeof body['entryId'] === 'string' ? body['entryId'].trim() : '';
  const entryType = typeof body['entryType'] === 'string' ? body['entryType'].trim() : '';
  const topK = typeof body['topK'] === 'number' ? Math.min(Math.max(body['topK'], 1), 100) : 10;
  const minScore = typeof body['minScore'] === 'number' ? body['minScore'] : undefined;
  const crossSpace = body['crossSpace'] === true;
  const targetTypes = Array.isArray(body['targetTypes'])
    ? (body['targetTypes'] as unknown[]).filter((t): t is RecallKnowledgeType => typeof t === 'string' && VALID_ENTRY_TYPES.has(t))
    : undefined;

  // `traverse` and `includeContent`: MCP `find_similar` has implemented both since it shipped — the tool schema
  // advertises them and the handler reads them — while this route read neither. Same shape as the `includeContent`
  // asymmetry an integrator reported on `recall`, one route over.
  //
  // Strictness is what made it visible: before the body was strict, sending `traverse: 2` here returned an unexpanded
  // answer with a 200. It is a 400 now, which is better and still wrong — the parameter is supposed to work.
  //
  // Validated exactly as recall validates them, refusing rather than coercing, so the two routes cannot disagree
  // about what a bad value is.
  const traverseRaw = body['traverse'];
  if (traverseRaw !== undefined
    && (typeof traverseRaw !== 'number' || !Number.isInteger(traverseRaw) || traverseRaw < 0 || traverseRaw > MAX_RECALL_TRAVERSE)) {
    res.status(400).json({ error: `traverse must be an integer between 0 and ${MAX_RECALL_TRAVERSE}` });
    return;
  }
  const safeTraverse = typeof traverseRaw === 'number' ? traverseRaw : 0;
  const includeContentRaw = body['includeContent'];
  if (includeContentRaw !== undefined && typeof includeContentRaw !== 'boolean') {
    res.status(400).json({ error: '`includeContent` must be a boolean' });
    return;
  }
  const safeIncludeContent = includeContentRaw !== false;
  // The same flag, on the same rule: find-similar returns recall RESULTS, so it carried the same six
  // system fields REST's recall did while MCP's `find_similar` — which builds its records through
  // `toRecallRecord` — has never sent any of them. Fixing recall alone would leave the identical
  // asymmetry one route to the left.
  const similarDiagRaw = body['includeDiagnostics'];
  if (similarDiagRaw !== undefined && typeof similarDiagRaw !== 'boolean') {
    res.status(400).json({ error: '`includeDiagnostics` must be a boolean' });
    return;
  }
  const safeIncludeDiagnostics = similarDiagRaw === true;

  // Same parameter, same parser. find-similar returns recall RESULTS, so a projection that reached one route
  // and not the other would be the asymmetry this whole area has spent two releases removing.
  const simProjParse = projectionFromBody(body);
  if (!simProjParse.ok) { res.status(400).json({ error: simProjParse.error }); return; }
  const safeProjection = simProjParse.norm;

  // Same budget, same resolver. find-similar returns recall RESULTS, so a cap that applied to one route and
  // not the other would be the asymmetry this area has spent three releases removing.
  const budget = resolveBudget(body as BudgetRequest);
  if (!budget.ok) { res.status(400).json({ error: budget.error }); return; }


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
    // The MATRIX decides the cross-space set, with the legacy allowlist only as a fallback.
    //
    // This read the allowlist alone, and `spaces` is `undefined` on every token minted since the matrix —
    // the rights editor writes `rights.perSpace` and nothing writes that array. So `!tokenSpaces` was true
    // for a modern token and the filter kept EVERY space: a cross-space recall from a token scoped to one
    // space searched the whole instance. Same shape as the sync-scope hole, one route over, and the same
    // fix — `spacesWhereTokenMay` makes the absent/empty distinction explicitly instead of by truthiness.
    //
    // `knowledge: read` because that is what a recall is. A token holding files-only in a space has no
    // business having its records ranked here.
    crossSpaceIds = spacesWhereTokenMay(
      (req.authToken as { rights?: TokenRights } | undefined)?.rights,
      legacySpacesOf(req.authToken),
      'knowledge',
      'read',
    );
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
    if (safeTraverse === 0) {
      const plainItems = projectResults(withoutDiagnostics(
        stripContentIfAsked(result.results, safeIncludeContent), safeIncludeDiagnostics), safeProjection);
      const plainItemsBudgeted = await budgetedEnvelope({
        results: plainItems,
        budgetBytes: budget.bytes,
        spillRemainder: remainder => spillResultSet({
          memberSpaceId: result.results[0]?.spaceId ?? spaceId,
          results: remainder,
          graphNodes: 0,
          request: { entryId, entryType, topK, traverse: 0 },
        }),
      });
      res.json({
        ...result,
        results: plainItemsBudgeted.results,
        ...plainItemsBudgeted.fields,
      });
      return;
    }

    // Graph-augmented: expand the similar matches along edges. Deliberately the SAME builder, cap formula and
    // envelope `recall`'s traverse uses — a caller who can read one response can read the other, and a second
    // copy of the shape is how the two would drift.
    const traverseSpaces = crossSpaceIds ?? [spaceId];
    const totalCap = topK * (safeTraverse + 1) * 4;
    const { graph, spill } = await buildGraphWithSpill(
      traverseSpaces,
      result.results.map(r => ({ _id: r._id, spaceId: r.spaceId })),
      safeTraverse,
      Math.max(0, totalCap - result.results.length),
    );
    const itemsWithGraph = withoutDiagnostics(
      stripContentIfAsked(result.results, safeIncludeContent), safeIncludeDiagnostics)
      .map(r => {
        const nested = mapGraphNodes(
          graph.bySeed.get(r._id), graphNodeRecord, safeIncludeDiagnostics, safeProjection);
        return nested ? { ...r, _graph: nested } : r;
      });
    const items = projectResults(itemsWithGraph as RecallResult[], safeProjection);
    const itemsBudgeted = await budgetedEnvelope({
      results: items,
      budgetBytes: budget.bytes,
      spillRemainder: remainder => spillResultSet({
        memberSpaceId: result.results[0]?.spaceId ?? spaceId,
        results: remainder,
        graphNodes: graph.nodes,
        request: { entryId, entryType, topK, traverse: safeTraverse },
      }),
    });
    res.json({
      source: result.source,
      results: itemsBudgeted.results,
      ...itemsBudgeted.fields,
      traverseDepth: safeTraverse, graphNodes: graph.nodes,
      ...(spill ? { graphTruncated: true, graphComplete: spill } : {}),
    });
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
// POST /api/brain/spaces/:spaceId/reindex
//
// Every refusal -- 404, the proxy 400, the single-job 409 -- and the work itself live in `brain/reindex.ts`, so an
// MCP tool reaches the same rules and the same guard instead of a weaker copy of them (B-2). What stays here is
// resolving the member spaces from the REQUEST (which is where the token's scope is known) and turning a refusal into
// a status.
//
// The response is sent as soon as the job is SCHEDULED, with zeroed counters. That is deliberate and pinned:
// `reindex-contract.test.js` asserts the shape, because awaiting the work here would answer the same 200 and turn a
// multi-minute job into a request timeout.
searchRouter.post('/spaces/:spaceId/reindex', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const space = getConfig().spaces.find(s => s.id === spaceId);

  const decision = planReindex({ spaceId, space, memberIds: memberSpacesForRequest(req, spaceId) });
  if (!decision.ok) {
    res.status(decision.refusal.status).json(decision.refusal.body);
    return;
  }

  startReindex(decision.plan);
  res.json({ spaceId, reindexed: 0, errors: 0, status: 'started' });
});
