/**
 * Structured read-only query (`queryBrain`) — the operator-whitelisted Mongo query surface.
 *
 * Split out of brain/memory.ts (A17.4). This is the raw-Mongo query path behind REST /query and the
 * MCP `query` tool; distinct from the recall filter DSL in filter.ts. Includes the operator
 * whitelist, the ReDoS-safe sanitiser, and the projection guard that never lets `embedding` out.
 */
import { col } from '../db/mongo.js';
import { hasReDoSRisk, MAX_PATTERN_LENGTH } from '../util/redos.js';

// Allowed top-level query operators for the structured query tool
const ALLOWED_OPERATORS = new Set([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$and', '$or', '$nor', '$not', '$exists', '$type', '$regex', '$options',
  '$all', '$elemMatch', '$size', '$mod',
]);

// Valid MongoDB regex flags (i=case-insensitive, m=multiline, s=dotAll, x=extended)
const VALID_OPTIONS_RE = /^[imsx]+$/;

function sanitizeFilter(filter: unknown, depth = 0): unknown {
  if (depth > 8) throw new Error('Filter too deeply nested');
  if (Array.isArray(filter)) return filter.map(v => sanitizeFilter(v, depth + 1));
  if (filter !== null && typeof filter === 'object') {
    const entries = Object.entries(filter as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key)) {
        throw new Error(`Operator '${key}' is not allowed in queries`);
      }
      // $regex must be a plain string and pass the shared ReDoS heuristic —
      // a catastrophic pattern would otherwise pin Mongo CPU for the full
      // maxTimeMS budget per call (multiplied per member space on proxies).
      if (key === '$regex') {
        if (typeof val !== 'string') {
          throw new Error("'$regex' must be a string pattern");
        }
        if (val.length > MAX_PATTERN_LENGTH) {
          throw new Error(`'$regex' pattern exceeds ${MAX_PATTERN_LENGTH} characters`);
        }
        if (hasReDoSRisk(val)) {
          throw new Error("'$regex' pattern rejected: potential catastrophic backtracking (nested or alternating quantifiers)");
        }
      }
      out[key] = sanitizeFilter(val, depth + 1);
    }
    // $options must only appear alongside $regex and contain valid flags
    if ('$options' in out) {
      if (!('$regex' in out)) {
        throw new Error("'$options' is only allowed alongside '$regex'");
      }
      if (typeof out['$options'] !== 'string' || !VALID_OPTIONS_RE.test(out['$options'] as string)) {
        throw new Error("'$options' must be a string of valid regex flags (i, m, s, x)");
      }
    }
    return out;
  }
  return filter;
}

const ALLOWED_COLLECTIONS = new Set(['memories', 'entities', 'edges', 'chrono', 'files']);

/**
 * The body keys `POST /api/brain/spaces/:id/query` accepts, as a VALUE so the route can refuse everything else.
 *
 * aigents sent `skip`, got a 200, and got page one back — *"it cost us a fabricated number"*. A permissive body is the
 * defect; `skip` was only how they found it. This set lives beside `queryBrain` rather than in the router so that adding
 * a parameter to the query and forgetting to allow it in the body is one edit rather than two.
 */
export const QUERY_BODY_FIELDS: ReadonlySet<string> = new Set([
  'collection', 'filter', 'projection', 'limit', 'skip', 'maxTimeMS',
]);

/**
 * The other three brain READ routes that take a body, and had the same permissive-body defect `/query` was reported
 * for. aigents found it on `/query` because that is the one they were paging; `traverse`, `recall` and `find-similar`
 * dropped unknown keys just as silently, and a mistyped `topK` or `minScore` there produces a wrong answer with a 200
 * exactly the same way.
 *
 * Listed as data so `brain-read-bodies-are-strict.test.js` can assert BY SHAPE that every read route on the search
 * router refuses unknown keys, rather than checking the one key that was reported.
 */
export const TRAVERSE_BODY_FIELDS: ReadonlySet<string> = new Set([
  'startId', 'direction', 'edgeLabels', 'maxDepth', 'limit',
  'includeChrono', 'includeMemories', 'includeFiles', 'includeEdges',
]);

export const RECALL_BODY_FIELDS: ReadonlySet<string> = new Set([
  'query', 'topK', 'types', 'minScore', 'filter', 'traverse', 'tags',
  'minPerType', 'maxPerType', 'maxTimeMS',
  // NOT on the destructuring line — these two are read 120 lines further down the handler as
  // `(req.body as {...}).includeFreshWrites` / `.includeContent`. The first version of this set was built from the
  // destructuring alone and refused both, which `recall-fresh-writes.test.js` caught immediately.
  //
  // That is the standing hazard of making a body strict: the allowed set has to be the keys the handler READS, and a
  // handler that reads its body in two places will be described by whichever place you looked at. Grep for `req.body`
  // across the whole handler, not for the destructure.
  'includeFreshWrites', 'includeContent',

]);

export const FIND_SIMILAR_BODY_FIELDS: ReadonlySet<string> = new Set([
  'entryId', 'entryType', 'topK', 'minScore', 'targetTypes', 'crossSpace',
]);

/**
 * The refusal itself, in one place so all four routes phrase it identically.
 *
 * Returns the offending keys, or `null` when the body is clean. The keys are NAMED: `{"error":"unknown field"}` sends a
 * caller reading their own request looking for which one, and the entire value of refusing is to shorten that search to
 * zero. `unrecognized_keys` matches the shape the spaces routes already return, so a client that already handles that
 * one needs no new branch.
 */
export function unknownBodyFields(
  body: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): { error: string; unrecognized_keys: string[] } | null {
  const unknown = Object.keys(body).filter(k => !allowed.has(k));
  if (unknown.length === 0) return null;
  return {
    error: `Unknown field(s): ${unknown.join(', ')}. Allowed: ${[...allowed].join(', ')}`,
    unrecognized_keys: unknown,
  };
}

/**
 * The documented result order — `seq` desc, then `updatedAt`, `createdAt`, `_id` — as a comparator, for merging pages
 * across the members of a proxy space.
 *
 * A second expression of the sort is exactly the drift risk this repo keeps paying for, so it is defined next to the
 * `.sort()` it mirrors and `query-order-matches-the-sort.test.js` asserts the two agree on the same documents rather
 * than on my reading of them.
 */
export function compareQueryOrder(a: unknown, b: unknown): number {
  const A = a as Record<string, unknown>;
  const B = b as Record<string, unknown>;
  for (const key of ['seq', 'updatedAt', 'createdAt', '_id'] as const) {
    const av = A[key];
    const bv = B[key];
    // A record missing the key sorts LAST rather than first: `undefined` in a descending sort must not win, or a
    // partially projected document would lead a page it has no claim to.
    if (av === bv) continue;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? -1 : 1;
  }
  return 0;
}

/** Structured read-only query (operator whitelist enforced) */
export async function queryBrain(
  spaceId: string,
  collectionName: 'memories' | 'entities' | 'edges' | 'chrono' | 'files',
  filter: Record<string, unknown>,
  projection?: Record<string, unknown>,
  limit = 20,
  maxTimeMS = 5000,
  /**
   * Rows to discard before the page. aigents reported `skip` being accepted at 200 and silently ignored on
   * `POST /query`, which cost them a fabricated number: a paged sweep re-read page one every time and was counted as
   * if it had advanced. A wrong number that looks right is worse than an error, so this parameter is honoured here
   * rather than validated at the door and dropped.
   *
   * Paging is only meaningful because the sort below is TOTAL — `_id` breaks every tie — so no row can drift between
   * pages and be seen twice or missed.
   */
  skip = 0,
) {
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    throw new Error(`Unknown collection '${collectionName}'`);
  }
  const safeFilter = sanitizeFilter(filter) as Record<string, never>;
  const safeMaxTime = Math.min(maxTimeMS, 10_000);
  const collName = `${spaceId}_${collectionName}`;
  const cursor = col(collName)
    .find(safeFilter)
    .maxTimeMS(safeMaxTime)
    // Deterministic newest-first ordering keeps recent writes visible under
    // the default limit even when historical datasets grow large.
    .sort({ seq: -1, updatedAt: -1, createdAt: -1, _id: -1 })
    // Skip BEFORE limit, which is the order the driver applies regardless of call order — spelled out here because
    // the reverse reading (limit the page, then drop rows from it) would silently return short pages.
    .skip(Math.max(Math.floor(skip) || 0, 0))
    .limit(Math.min(limit, 100))
    // The embedding vector is never returned. This is MERGED with the caller's
    // projection rather than applied as a second `.project()` — a second call
    // replaces the first in the MongoDB driver, which previously discarded the
    // caller's projection entirely.
    .project(mergeEmbeddingExclusion(projection) as Record<string, never>);
  return cursor.toArray();
}

/**
 * Merge the mandatory `embedding` exclusion with a caller-supplied projection.
 *
 * MongoDB forbids mixing inclusion and exclusion (except for `_id`), so we
 * cannot blindly add `embedding: 0` to an inclusion projection:
 *  - No projection → `{ embedding: 0 }`.
 *  - Inclusion projection (`{ field: 1 }`) → embedding is already excluded by
 *    omission; we just strip any explicit `embedding: 1` so the vector can never
 *    be opted back in.
 *  - Exclusion projection (`{ field: 0 }`) → add `embedding: 0`.
 */
export function mergeEmbeddingExclusion(
  projection?: Record<string, unknown>,
): Record<string, 0 | 1> {
  if (!projection || Object.keys(projection).length === 0) {
    return { embedding: 0 };
  }
  // Inclusion vs exclusion is decided by the non-_id fields.
  const isInclusion = Object.entries(projection)
    .some(([k, v]) => k !== '_id' && (v === 1 || v === true));

  const out: Record<string, 0 | 1> = {};
  if (isInclusion) {
    for (const [k, v] of Object.entries(projection)) {
      if (k === 'embedding') continue; // never allow the vector to be included
      out[k] = (v === 1 || v === true) ? 1 : 0;
    }
  } else {
    for (const k of Object.keys(projection)) out[k] = 0;
    out['embedding'] = 0;
  }
  return out;
}
