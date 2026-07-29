/**
 * Recall engine — semantic search across every knowledge type, plus duplicate detection.
 *
 * Split out of brain/memory.ts (A17.4). Owns recall/recallGlobal/findSimilar/checkDuplicates and
 * the doc -> RecallResult mapping. Depends on the filter DSL; deliberately does NOT depend on
 * memory CRUD, so the dependency runs one way: memory.ts -> recall.ts -> filter.ts.
 */
import { col, isVectorSearchAvailable, asFilter } from '../db/mongo.js';
import { NotFoundError } from '../util/errors.js';
import { embed } from './embedding.js';
import { getEmbeddingConfig } from '../config/loader.js';
import { needsReindex } from '../spaces/_shared.js';
import { vectorFilterFieldsFor } from '../spaces/vector-index.js';
import { FilterExpression, buildMongoFilter, toNativeVectorFilter } from './filter.js';
import { deriveChronoStatus } from './chrono-status.js';
import { rerank, rerankConfigured, candidateMultiplier, MAX_CANDIDATES } from './rerank-client.js';
import type { ChronoStatus } from '../config/types.js';

export type RecallKnowledgeType = 'memory' | 'entity' | 'edge' | 'chrono' | 'file';

/** Fields shared by every knowledge-type recall result. */
interface RecallBase {
  _id: string;
  spaceId: string;
  /** Vector similarity, on the configured `similarity` scale. `minScore` always filters on THIS. */
  score: number;
  /**
   * Cross-encoder relevance, present only when a reranker is configured and answered.
   *
   * Kept separate from `score` rather than overwriting it, because the two are different scales and
   * `minScore` is documented against the vector one. Folding them together would silently redefine
   * what a caller's threshold means. Ordering prefers this when present; filtering never uses it.
   */
  rerankScore?: number;
  createdAt?: string;
  updatedAt?: string;
  seq?: number;
  embeddingModel?: string;
  tags?: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  /** Pre-embedding source text — the exact string fed to the embedding model for this document. */
  matchedText?: string;
}

export interface RecallMemory extends RecallBase {
  type: 'memory';
  fact: string;
  entityIds?: string[];
}

export interface RecallEntity extends RecallBase {
  type: 'entity';
  name: string;
  /** Entity type (named `entityType` to avoid conflict with the `type` discriminator). */
  entityType: string;
}

export interface RecallEdge extends RecallBase {
  type: 'edge';
  from: string;
  to: string;
  label: string;
  weight?: number;
  /** Edge relationship type (named `edgeType` to avoid conflict with the `type` discriminator). */
  edgeType?: string;
}

export interface RecallChrono extends RecallBase {
  type: 'chrono';
  title: string;
  /** Chrono type (event/deadline/plan/prediction/milestone). Named `chronoType` to
   *  avoid conflict with the `type` discriminator field. */
  chronoType: string;
  startsAt: string;
  /** Chrono status (upcoming/active/completed/overdue/cancelled). */
  status?: string;
  entityIds?: string[];
}

export interface RecallFile extends RecallBase {
  type: 'file';
  path: string;
  sizeBytes?: number;
  /** Set on chunk records: the H2/H3 heading that opened this chunk (null for paragraph-chunked txt). */
  headingText?: string | null;
  /** Set on chunk records: the Markdown body of this chunk. */
  content?: string;
  /** Set on chunk and _converted/ records: _id of the parent file's filemeta record. */
  parentFileId?: string;
  /** Set on chunk records: 0-based position within the document. */
  chunkIndex?: number;
  /** Set on media chunk records: 'image' | 'audio' | 'video'. */
  mediaType?: 'image' | 'audio' | 'video';
  /** Set on media file records: current async embedding status. */
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'failed' | 'skipped' | 'disabled';
  /** Set on audio/video chunk records: start time of the chunk in milliseconds. */
  chunkOffsetMs?: number;
  /** Set on audio/video chunk records: duration of the chunk in milliseconds. */
  chunkDurationMs?: number;
  /** Inline parent file metadata — populated on chunk records when parentFileId is present. */
  parentFile?: { path: string; description?: string; tags?: string[] };
}

/** Discriminated union of all knowledge-type recall results. Narrow by `result.type`. */
export type RecallResult = RecallMemory | RecallEntity | RecallEdge | RecallChrono | RecallFile;

/** Semantic recall using $vectorSearch (Atlas Local / Atlas / MongoDB 8.2+) */
export async function recall(
  spaceId: string,
  query: string,
  topK = 10,
  tags?: string[],
  types?: RecallKnowledgeType[],
  minPerType?: Partial<Record<RecallKnowledgeType, number>>,
  minScore?: number,
  filter?: FilterExpression,
): Promise<RecallResult[]> {
  if (!isVectorSearchAvailable()) {
    throw new Error(
      'Semantic recall is unavailable: $vectorSearch is not supported by the connected MongoDB. ' +
      'Upgrade to MongoDB 8.2+, use Atlas Local, or connect to managed Atlas.',
    );
  }
  if (needsReindex(spaceId)) {
    const embCfg = getEmbeddingConfig();
    throw new Error(
      `Space '${spaceId}' has embeddings from a different model than the currently configured '${embCfg.model}'. ` +
      `Semantic recall is disabled until re-indexed. Call POST /api/brain/spaces/${spaceId}/reindex.`,
    );
  }
  const embResult = await embed(query, 'query');

  const activeTypes: RecallKnowledgeType[] = (types && types.length > 0)
    ? types
    : ['memory', 'entity', 'edge', 'chrono', 'file'];

  // Phase 1: for each type with a minPerType floor > 0, guarantee that many results
  const guaranteed: RecallResult[] = [];
  const guaranteedIds = new Set<string>();
  if (minPerType) {
    const floorSearches = Object.entries(minPerType)
      .filter(([t, floor]) => activeTypes.includes(t as RecallKnowledgeType) && (floor ?? 0) > 0)
      .map(([t, floor]) =>
        recallByType(spaceId, t as RecallKnowledgeType, embResult.vector, floor!, tags, filter),
      );
    const floorResults = (await Promise.all(floorSearches)).flat();
    for (const r of floorResults) {
      if (!guaranteedIds.has(r._id)) {
        guaranteedIds.add(r._id);
        guaranteed.push(r);
      }
    }
  }

  // Phase 2: run the global unrestricted search for all active types.
  //
  // With a reranker configured, cast a WIDER net first. A cross-encoder can only re-order what the
  // vector search already found, so reranking exactly the results you would have returned anyway buys
  // nothing — the over-fetch is the whole mechanism.
  const reranking = rerankConfigured();
  const perTypeK = Math.ceil(topK * (reranking ? candidateMultiplier() : 1.5));
  const searches = activeTypes.map(t => recallByType(spaceId, t, embResult.vector, perTypeK, tags, filter));
  const allResults = (await Promise.all(searches)).flat();
  allResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Phase 3: rerank the candidate pool, if a cross-encoder is configured. Best-effort by construction —
  // `applyRerank` leaves the vector order untouched when the reranker has no opinion.
  if (reranking) await applyRerank(query, guaranteed, allResults);

  const final = mergeRecallResults(guaranteed, allResults, topK, minScore);

  // Enrich file chunk results with inline parent metadata.
  //
  // This used to sit AFTER an early `return` in the minScore branch, so asking for a minimum score
  // silently changed the SHAPE of the response: file chunks came back without their parent's path,
  // description and tags. Scoring and enrichment are unrelated concerns, and nothing ever meant them
  // to interact — the two landed in the same refactor and the ordering was never deliberate.
  await enrichFileChunksWithParent(spaceId, final);

  return final;
}

/**
 * Combine the floor-guaranteed results with the global ones, honour `topK`, and apply `minScore`.
 *
 * Pure, and extracted so it can be tested at all: the surrounding function is two `await`s into
 * MongoDB on either side, so this logic previously had no reachable seam — which is exactly why the
 * standalone test that "covered" it was a hand-written copy that had drifted from it.
 *
 * The order matters and is easy to get subtly wrong:
 *   1. guaranteed results are already deduped by the caller and always survive `topK`;
 *   2. the global results fill whatever slots remain, skipping anything already guaranteed;
 *   3. the combined list is sorted by score — a floor result may legitimately outrank a global one;
 *   4. `minScore` filters LAST, so it can drop a guaranteed result. That is deliberate: a floor is a
 *      request for coverage, not a licence to return matches the caller called too weak to want.
 */
export function mergeRecallResults(
  guaranteed: RecallResult[],
  allResults: RecallResult[],
  topK: number,
  minScore?: number | null,
): RecallResult[] {
  const guaranteedIds = new Set(guaranteed.map(r => r._id));
  const fillSlots = Math.max(0, topK - guaranteed.length);
  const fill: RecallResult[] = [];
  for (const r of allResults) {
    if (fill.length >= fillSlots) break;
    if (!guaranteedIds.has(r._id)) fill.push(r);
  }

  const final = [...guaranteed, ...fill];
  // Order by the cross-encoder when it answered, otherwise by vector similarity. `??` rather than a
  // separate branch so a partial rerank — a provider that scored some passages and not others — still
  // orders sensibly instead of collapsing the unscored ones to the bottom.
  final.sort((a, b) => rankOf(b) - rankOf(a));
  // minScore filters on `score`, never on `rerankScore`. The two are different scales, and a caller's
  // threshold was written against vector similarity; silently reinterpreting it against a cross-encoder's
  // logit would change which results a fixed threshold returns without anyone touching the threshold.
  return (minScore != null && minScore > 0)
    ? final.filter(r => (r.score ?? 0) >= minScore)
    : final;
}

/** Sort key: cross-encoder relevance when present, vector similarity otherwise. */
function rankOf(r: RecallResult): number {
  return r.rerankScore ?? r.score ?? 0;
}

/**
 * The text a cross-encoder is asked to judge against the query.
 *
 * Deliberately NOT `summariseRecall`, which truncates a memory to 120 characters for a one-line log or
 * tool response. A reranker scoring a 117-character stub of the passage would be judging a different
 * text from the one that gets returned — worse than not reranking, because the error is invisible.
 * Capped anyway: cross-encoders have a token window, and a runaway document would be silently truncated
 * by the provider at a point we do not control.
 */
export function rerankTextOf(r: RecallResult): string {
  const raw = (() => {
    switch (r.type) {
      case 'memory': return r.fact;
      case 'entity': return [r.name, r.entityType, r.description].filter(Boolean).join(' — ');
      case 'edge':   return [`${r.from} → ${r.label} → ${r.to}`, r.description].filter(Boolean).join(' — ');
      case 'chrono': return [r.title, r.description].filter(Boolean).join(' — ');
      case 'file':   return [r.path, r.description].filter(Boolean).join(' — ');
    }
  })();
  return raw.length > RERANK_TEXT_MAX_CHARS ? raw.slice(0, RERANK_TEXT_MAX_CHARS) : raw;
}

/** Roughly a 2k-token window at ~4 chars/token, which every current reranker comfortably accepts. */
export const RERANK_TEXT_MAX_CHARS = 8_000;

/**
 * Score the candidate pool with the cross-encoder and stamp `rerankScore` on each result, in place.
 *
 * Both lists are passed because a floor-guaranteed result competes for order with the global ones — a
 * reranker that saw only half the pool would produce two incomparable orderings in one response.
 * Deduped by `_id` so a record appearing in both lists is scored once and both references updated.
 *
 * Best-effort throughout: a `null` from the reranker leaves every result untouched, and the caller falls
 * back to vector order. It never throws, because a reranker outage must not turn into a failed search.
 */
async function applyRerank(
  query: string,
  guaranteed: RecallResult[],
  allResults: RecallResult[],
): Promise<void> {
  // One entry per distinct record, holding every reference to it so a single score updates all of them.
  const byId = new Map<string, RecallResult[]>();
  for (const r of [...guaranteed, ...allResults]) {
    const refs = byId.get(r._id);
    if (refs) refs.push(r); else byId.set(r._id, [r]);
  }
  // Highest vector score first, so the absolute cap drops the least plausible candidates rather than an
  // arbitrary slice — the cap is a cost ceiling, not a sampling strategy.
  const ids = [...byId.keys()]
    .sort((a, b) => (byId.get(b)![0].score ?? 0) - (byId.get(a)![0].score ?? 0))
    .slice(0, MAX_CANDIDATES);
  if (ids.length === 0) return;

  const passages = ids.map(id => rerankTextOf(byId.get(id)![0]));
  const scores = await rerank(query, passages);
  if (!scores) return; // no opinion — vector order stands

  for (const { index, score } of scores) {
    const id = ids[index];
    if (id === undefined) continue; // parseScores bounds this, but the pairing is worth not assuming
    for (const ref of byId.get(id)!) ref.rerankScore = score;
  }
}

// ── Insert-time duplicate detection ──────────────────────────────────────────

/** A near-duplicate surfaced by an insert-time similarity check. */
export interface SimilarMatch {
  _id: string;
  type: RecallKnowledgeType;
  score: number;
  summary: string;
}

/** Default cosine-similarity threshold at/above which an insert is flagged as a likely duplicate. */
export const DEFAULT_DUPE_THRESHOLD = 0.92;
const DEFAULT_DUPE_TOPK = 3;

/** Options controlling the optional insert-time duplicate check on remember/upsertEntity. */
export interface DupeCheckOpts {
  checkDuplicates?: boolean;
  /**
   * Also report near-neighbours that structurally CONTRADICT the incoming record (same single-valued
   * property, different value). Its own flag rather than a rider on `checkDuplicates`: "is this redundant?"
   * and "does this conflict with what we already believe?" are different questions, and a caller may well
   * want the second without the first.
   *
   * Only the deterministic judge runs on the write path — no model call, so no added latency or egress per
   * insert. The nightly scanner still runs the NLI pass. The warning NEVER blocks the write: an agent
   * correcting an outdated fact should be able to contradict the record it supersedes.
   */
  checkContradictions?: boolean;
  dupeThreshold?: number;
  dupeTopK?: number;
}

/** One-line human summary of a recall result, for duplicate feedback. */
export function summariseRecall(r: RecallResult): string {
  switch (r.type) {
    case 'memory': return r.fact.length > 120 ? `${r.fact.slice(0, 117)}…` : r.fact;
    case 'entity': return `${r.name} (${r.entityType})`;
    case 'edge': return `${r.from} → ${r.label} → ${r.to}`;
    case 'chrono': return r.title;
    case 'file': return r.path;
  }
}

/**
 * Insert-time near-duplicate check: run an ANN vector search with a freshly
 * computed embedding and return existing records of the same type scoring at or
 * above `threshold`. Best-effort — returns `[]` (never throws) when vector
 * search is unavailable, the space needs reindexing, or the search fails, so it
 * can never block a write. Passes no tags/filter, keeping the search on the fast
 * ANN path. Supply `excludeId` to drop a self-match when called post-insert.
 */
export async function checkDuplicates(
  spaceId: string,
  type: RecallKnowledgeType,
  vector: number[],
  threshold = DEFAULT_DUPE_THRESHOLD,
  topK = DEFAULT_DUPE_TOPK,
  excludeId?: string,
): Promise<SimilarMatch[]> {
  if (!vector || vector.length === 0) return [];
  if (!isVectorSearchAvailable() || needsReindex(spaceId)) return [];
  try {
    const hits = await recallByType(spaceId, type, vector, topK);
    return hits
      .filter(h => h._id !== excludeId && (h.score ?? 0) >= threshold)
      .map(h => ({ _id: h._id, type: h.type, score: h.score, summary: summariseRecall(h) }));
  } catch {
    return [];
  }
}

/** Maps knowledge types to their MongoDB collection suffixes. */
const KNOWLEDGE_COLLECTION: Record<RecallKnowledgeType, string> = {
  memory: 'memories',
  entity: 'entities',
  edge: 'edges',
  chrono: 'chrono',
  file: 'files',
};

/** Run $vectorSearch against a single collection and map results to RecallResult. */
async function recallByType(
  spaceId: string,
  knowledgeType: RecallKnowledgeType,
  queryVector: number[],
  topK: number,
  tags?: string[],
  filter?: FilterExpression,
): Promise<RecallResult[]> {
  const collSuffix = KNOWLEDGE_COLLECTION[knowledgeType];
  const collName = `${spaceId}_${collSuffix}`;
  const indexName = `${spaceId}_${collSuffix}_embedding`;

  const hasFilter = filter != null && Object.keys(filter).length > 0;
  const hasTags = tags != null && tags.length > 0;

  // Shared tail: attach score/type, then project type-specific fields (always dropping the vector).
  const commonProject = { _id: 1, spaceId: 1, _knowledgeType: 1, score: 1, createdAt: 1, updatedAt: 1, seq: 1, embeddingModel: 1, matchedText: 1 };
  let typeProject: Record<string, number> = {};
  if (knowledgeType === 'memory') {
    typeProject = { fact: 1, tags: 1, entityIds: 1, description: 1, properties: 1 };
  } else if (knowledgeType === 'entity') {
    typeProject = { name: 1, type: 1, tags: 1, description: 1, properties: 1 };
  } else if (knowledgeType === 'edge') {
    typeProject = { from: 1, to: 1, label: 1, weight: 1, type: 1, tags: 1, description: 1, properties: 1 };
  } else if (knowledgeType === 'chrono') {
    typeProject = { title: 1, description: 1, type: 1, status: 1, startsAt: 1, endsAt: 1, tags: 1, entityIds: 1, properties: 1 };
  } else if (knowledgeType === 'file') {
    typeProject = { path: 1, description: 1, tags: 1, sizeBytes: 1, properties: 1, headingText: 1, content: 1, parentFileId: 1, chunkIndex: 1, mediaType: 1, embeddingStatus: 1, chunkOffsetMs: 1, chunkDurationMs: 1 };
  }
  const tail: object[] = [
    { $addFields: { _knowledgeType: knowledgeType, score: { $meta: 'vectorSearchScore' } } },
    { $project: { ...commonProject, ...typeProject } },
  ];

  /** ANN: approximate nearest-neighbour, no filtering. Used when nothing is filtered. */
  const annStage = () => ({
    $vectorSearch: { index: indexName, path: 'embedding', queryVector, numCandidates: Math.min(topK * 15, 1000), limit: topK },
  });

  /**
   * Exhaustive fallback: `exact:true` scores ALL vectors, then post-`$match` filters and re-limits.
   * Correct for any filter (including dynamic `properties.*` and `$exists`), but pays O(N) scoring.
   * The historical path — used only when a filter can't be pushed into the index natively.
   */
  const exhaustivePipeline = (): object[] => {
    const ennLimit = Math.min(10000, Math.max(topK * 100, 1000));
    const p: object[] = [{ $vectorSearch: { index: indexName, path: 'embedding', queryVector, exact: true, limit: ennLimit } }];
    if (hasTags) p.push({ $match: { tags: { $all: tags } } });
    if (hasFilter) p.push({ $match: buildMongoFilter(filter!) });
    p.push({ $limit: topK });
    return [...p, ...tail];
  };

  // Decide the primary path (P6).
  //  - no filter  → ANN (unchanged).
  //  - declarable filter → `exact:true` + native `filter`: Atlas restricts to the matching subset
  //    FIRST, then exhaustively scores only that subset. Exact results, cost ∝ matching set, not N.
  //  - non-declarable filter (dynamic properties / $exists) → exhaustive scan + post-$match.
  let primary: object[];
  let usedNativeFilter = false;
  if (!hasFilter && !hasTags) {
    primary = [annStage(), ...tail];
  } else {
    const declared = new Set(vectorFilterFieldsFor(spaceId, collSuffix));
    const nativeFilter = toNativeVectorFilter(tags, filter, declared);
    if (nativeFilter) {
      usedNativeFilter = true;
      primary = [
        { $vectorSearch: { index: indexName, path: 'embedding', queryVector, exact: true, filter: nativeFilter, limit: topK } },
        ...tail,
      ];
    } else {
      primary = exhaustivePipeline();
    }
  }

  const swallowIndexError = (err: unknown): RecallResult[] => {
    const msg = err instanceof Error ? err.message : String(err);
    // A missing OR not-yet-queryable vector index means "no results from this collection", not a
    // failure: a new space builds its indexes asynchronously (B1) and Atlas refuses queries against
    // an index still in INITIAL_SYNC. Transient empty state, not an error to surface.
    if (/index.*not.*found|no.*such.*index|search.*index|cannot query.*vector index|while in state (INITIAL_SYNC|PENDING|BUILDING|STARTING)/i.test(msg)) {
      return [];
    }
    throw err;
  };

  try {
    const docs = await col(collName).aggregate<Record<string, unknown>>(primary).toArray();
    return docs.map(d => mapToRecallResult(d, knowledgeType));
  } catch (err) {
    // If the native-filter query failed — e.g. the index has not yet been rebuilt with a
    // just-added filter field — retry on the exhaustive path, which needs no declared fields. This
    // keeps recall correct through the brief window after a schema change while the index rebuilds.
    if (usedNativeFilter) {
      try {
        const docs = await col(collName).aggregate<Record<string, unknown>>(exhaustivePipeline()).toArray();
        return docs.map(d => mapToRecallResult(d, knowledgeType));
      } catch (err2) {
        return swallowIndexError(err2);
      }
    }
    return swallowIndexError(err);
  }
}

function mapToRecallResult(doc: Record<string, unknown>, knowledgeType: RecallKnowledgeType): RecallResult {
  const base: RecallBase = {
    _id: doc['_id'] as string,
    spaceId: doc['spaceId'] as string,
    score: doc['score'] as number,
    createdAt: doc['createdAt'] as string | undefined,
    updatedAt: doc['updatedAt'] as string | undefined,
    seq: doc['seq'] as number | undefined,
    embeddingModel: doc['embeddingModel'] as string | undefined,
    tags: doc['tags'] as string[] | undefined,
    description: doc['description'] as string | undefined,
    properties: doc['properties'] as Record<string, string | number | boolean> | undefined,
    matchedText: doc['matchedText'] as string | undefined,
  };
  switch (knowledgeType) {
    case 'memory':
      return { ...base, type: 'memory', fact: doc['fact'] as string, entityIds: doc['entityIds'] as string[] | undefined };
    case 'entity':
      return { ...base, type: 'entity', name: doc['name'] as string, entityType: doc['type'] as string };
    case 'edge':
      return { ...base, type: 'edge', from: doc['from'] as string, to: doc['to'] as string, label: doc['label'] as string, weight: doc['weight'] as number | undefined, edgeType: doc['type'] as string | undefined };
    case 'chrono':
      return { ...base, type: 'chrono', title: doc['title'] as string, chronoType: doc['type'] as string, startsAt: doc['startsAt'] as string, status: deriveChronoStatus({ status: doc['status'] as ChronoStatus, startsAt: doc['startsAt'] as string, endsAt: doc['endsAt'] as string | undefined }), entityIds: doc['entityIds'] as string[] | undefined };
    case 'file':
      return { ...base, type: 'file', path: doc['path'] as string, sizeBytes: doc['sizeBytes'] as number | undefined, headingText: doc['headingText'] as string | null | undefined, content: doc['content'] as string | undefined, parentFileId: doc['parentFileId'] as string | undefined, chunkIndex: doc['chunkIndex'] as number | undefined, mediaType: doc['mediaType'] as 'image' | 'audio' | 'video' | undefined, embeddingStatus: doc['embeddingStatus'] as RecallFile['embeddingStatus'], chunkOffsetMs: doc['chunkOffsetMs'] as number | undefined, chunkDurationMs: doc['chunkDurationMs'] as number | undefined };
  }
}

/**
 * For file chunk results that have a parentFileId, batch-fetch the parent
 * file document and attach `parentFile: { path, description?, tags? }` inline.
 * Non-chunk file results and non-file results are left unchanged.
 */
async function enrichFileChunksWithParent(spaceId: string, results: RecallResult[]): Promise<void> {
  const fileChunks = results.filter(
    (r): r is RecallFile => r.type === 'file' && typeof r.parentFileId === 'string',
  );
  if (fileChunks.length === 0) return;

  const parentIds = [...new Set(fileChunks.map(r => r.parentFileId as string))];

  // Batch-fetch parent file docs — projection only (no embedding field)
  const parents = (await col(`${spaceId}_files`)
    .find(asFilter({ _id: { $in: parentIds } }), { projection: { path: 1, description: 1, tags: 1 } })
    .toArray()) as unknown as Array<{ _id: string; path?: string; description?: string; tags?: string[] }>;

  const parentMap = new Map(parents.map(p => [p._id, p]));

  for (const chunk of fileChunks) {
    const parent = parentMap.get(chunk.parentFileId as string);
    if (parent) {
      chunk.parentFile = {
        path: parent.path ?? (parent._id),
        ...(parent.description ? { description: parent.description } : {}),
        ...(parent.tags?.length ? { tags: parent.tags } : {}),
      };
    }
  }
}

/** Semantic recall across multiple spaces (parallel) */
export async function recallGlobal(
  spaceIds: string[],
  query: string,
  topK = 10,
  tags?: string[],
  types?: RecallKnowledgeType[],
  minPerType?: Partial<Record<RecallKnowledgeType, number>>,
  minScore?: number,
  filter?: FilterExpression,
): Promise<RecallResult[]> {
  const results = await Promise.all(spaceIds.map(id => recall(id, query, topK, tags, types, minPerType, minScore, filter)));
  const flat = results.flat();
  // Sort by score descending, deduplicate by _id
  const seen = new Set<string>();
  const deduped: RecallResult[] = [];
  // Same key as the per-space merge. Rerank scores from separate `recall` calls ARE comparable — same
  // model, same query — so ordering across spaces by them is sound; ordering by vector score while the
  // per-space lists were ordered by the cross-encoder would undo the reranking at the last step.
  for (const r of flat.sort((a, b) => rankOf(b) - rankOf(a))) {
    if (!seen.has(r._id)) {
      seen.add(r._id);
      deduped.push(r);
    }
  }
  return deduped.slice(0, topK);
}

/** Retrieve the stored embedding vector for an entry by its ID and knowledge type. */
async function getEntryEmbedding(
  spaceId: string,
  entryId: string,
  entryType: RecallKnowledgeType,
): Promise<{ vector: number[]; doc: Record<string, unknown> } | null> {
  const collSuffix = KNOWLEDGE_COLLECTION[entryType];
  const collName = `${spaceId}_${collSuffix}`;
  const doc = await col(collName).findOne(
    asFilter({ _id: entryId, spaceId }),
    { projection: { embedding: 1, _id: 1, spaceId: 1, name: 1, fact: 1, label: 1, title: 1, path: 1, type: 1, description: 1 } },
  ) as Record<string, unknown> | null;
  if (!doc) return null;
  const vector = doc['embedding'] as number[] | undefined;
  if (!vector || !Array.isArray(vector) || vector.length === 0) return null;
  return { vector, doc };
}

export interface FindSimilarResult {
  source: RecallResult;
  results: RecallResult[];
}

/**
 * Find entries with high vector similarity to an existing entry.
 * Uses the entry's stored embedding vector directly — no re-embedding.
 */
export async function findSimilar(
  spaceId: string,
  entryId: string,
  entryType: RecallKnowledgeType,
  topK = 10,
  targetTypes?: RecallKnowledgeType[],
  minScore?: number,
  crossSpaceIds?: string[],
): Promise<FindSimilarResult> {
  if (!isVectorSearchAvailable()) {
    throw new Error(
      'Vector search is unavailable: $vectorSearch is not supported by the connected MongoDB. ' +
      'Upgrade to MongoDB 8.2+, use Atlas Local, or connect to managed Atlas.',
    );
  }

  // Fetch the source entry's stored embedding
  const entry = await getEntryEmbedding(spaceId, entryId, entryType);
  if (!entry) {
    throw new NotFoundError(`Entry '${entryId}' not found in space '${spaceId}' (type: ${entryType}), or has no embedding.`);
  }

  const activeTypes: RecallKnowledgeType[] = (targetTypes && targetTypes.length > 0)
    ? targetTypes
    : ['memory', 'entity', 'edge', 'chrono', 'file'];

  // Fetch topK+1 to account for self-match removal
  const fetchK = topK + 1;

  // Determine which spaces to search
  const searchSpaces = crossSpaceIds && crossSpaceIds.length > 0 ? crossSpaceIds : [spaceId];

  const allResults: RecallResult[] = [];
  for (const sid of searchSpaces) {
    if (needsReindex(sid)) continue; // skip spaces needing reindex
    const searches = activeTypes.map(t => recallByType(sid, t, entry.vector, fetchK));
    const spaceResults = (await Promise.all(searches)).flat();
    allResults.push(...spaceResults);
  }

  // Sort by score descending, exclude self-match, deduplicate
  allResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const seen = new Set<string>();
  const filtered: RecallResult[] = [];
  for (const r of allResults) {
    if (r._id === entryId) continue; // exclude self
    if (seen.has(r._id)) continue;
    seen.add(r._id);
    if (minScore != null && minScore > 0 && (r.score ?? 0) < minScore) continue;
    filtered.push(r);
    if (filtered.length >= topK) break;
  }

  // Build source summary
  const source = mapToRecallResult(entry.doc, entryType);
  source.score = 1.0;

  return { source, results: filtered };
}
