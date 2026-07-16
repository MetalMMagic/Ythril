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

/** Structured read-only query (operator whitelist enforced) */
export async function queryBrain(
  spaceId: string,
  collectionName: 'memories' | 'entities' | 'edges' | 'chrono' | 'files',
  filter: Record<string, unknown>,
  projection?: Record<string, unknown>,
  limit = 20,
  maxTimeMS = 5000,
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
