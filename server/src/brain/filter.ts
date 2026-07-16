/**
 * Recall filter DSL — the `FilterExpression` grammar and its translations.
 *
 * Split out of brain/memory.ts (A17.4). Self-contained: validates a caller-supplied filter, and
 * lowers it either to a Mongo filter (post-vector-search) or to a native $vectorSearch prefilter.
 */

// ── Prefiltered recall ────────────────────────────────────────────────────

/**
 * A single filter operator applied to one field.
 * Multiple operators on the same field are AND-ed together (e.g. gt+lt for a range).
 */
export interface FilterOperator {
  eq?: string | number | boolean;
  ne?: string | number | boolean;
  in?: Array<string | number | boolean>;
  exists?: boolean;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

/**
 * Map of dot-notation field paths to their filter operator(s).
 * Keys must start with `properties.`, `tags`, `type`, `name`, `status`, or `label`.
 */
export type FilterExpression = Record<string, FilterOperator>;

const ALLOWED_FILTER_KEY_PREFIXES = ['properties.', 'tags', 'type', 'name', 'status', 'label'] as const;

/**
 * Validate that all filter keys use allowed prefixes (injection prevention).
 * Returns an error message string, or null if valid.
 */
export function validateFilterExpression(filter: FilterExpression): string | null {
  for (const key of Object.keys(filter)) {
    const allowed = ALLOWED_FILTER_KEY_PREFIXES.some(
      prefix => key === prefix || key.startsWith(prefix + '.') || (prefix.endsWith('.') && key.startsWith(prefix)),
    );
    if (!allowed) {
      return `Filter key '${key}' is not allowed. Keys must start with: properties., tags, type, name, status, or label.`;
    }
  }
  return null;
}

/** Convert a FilterExpression to a MongoDB match document. */
export function buildMongoFilter(filter: FilterExpression): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, op] of Object.entries(filter)) {
    const mongoOp: Record<string, unknown> = {};
    if (op.eq !== undefined) mongoOp['$eq'] = op.eq;
    if (op.ne !== undefined) mongoOp['$ne'] = op.ne;
    if (op.in !== undefined) mongoOp['$in'] = op.in;
    if (op.exists !== undefined) mongoOp['$exists'] = op.exists;
    if (op.gt !== undefined) mongoOp['$gt'] = op.gt;
    if (op.gte !== undefined) mongoOp['$gte'] = op.gte;
    if (op.lt !== undefined) mongoOp['$lt'] = op.lt;
    if (op.lte !== undefined) mongoOp['$lte'] = op.lte;
    if (Object.keys(mongoOp).length > 0) {
      result[key] = mongoOp;
    }
  }
  return result;
}

/**
 * Operators we are confident `$vectorSearch` accepts inside its native `filter`. `$ne`/`$nin` and
 * `$exists` are deliberately excluded — a filter using them routes to the exhaustive-scan path
 * instead (correct, just slower), which avoids a wasted native attempt that Atlas would reject.
 */
const NATIVE_VECTOR_FILTER_OPS = ['eq', 'in', 'gt', 'gte', 'lt', 'lte'] as const;

/**
 * Build a `$vectorSearch` native `filter` document from the recall `tags` + `filter` inputs — but
 * ONLY if every referenced field is a declared filter field on the index and every operator is
 * natively supported (P6). Returns `null` when the request can't be fully expressed natively, in
 * which case the caller falls back to the exhaustive `exact:true` scan + post-`$match`.
 *
 * `tags` uses "must contain all" semantics; on an array filter field an equality match means
 * "array contains this value", so N tags become an `$and` of N equalities.
 */
export function toNativeVectorFilter(
  tags: string[] | undefined,
  filter: FilterExpression | undefined,
  declaredFields: Set<string>,
): Record<string, unknown> | null {
  const clauses: Record<string, unknown>[] = [];

  if (tags && tags.length > 0) {
    if (!declaredFields.has('tags')) return null;
    for (const t of tags) clauses.push({ tags: { $eq: t } });
  }

  if (filter) {
    for (const [key, op] of Object.entries(filter)) {
      if (!declaredFields.has(key)) return null;
      const mongoOp: Record<string, unknown> = {};
      for (const name of NATIVE_VECTOR_FILTER_OPS) {
        const v = (op as Record<string, unknown>)[name];
        if (v !== undefined) mongoOp['$' + name] = v;
      }
      // An operator we can't push natively (e.g. `ne`, `exists`) → whole request is non-native.
      const requestedOps = Object.keys(op).filter(k => (op as Record<string, unknown>)[k] !== undefined);
      if (requestedOps.some(k => !NATIVE_VECTOR_FILTER_OPS.includes(k as typeof NATIVE_VECTOR_FILTER_OPS[number]))) {
        return null;
      }
      if (Object.keys(mongoOp).length > 0) clauses.push({ [key]: mongoOp });
    }
  }

  if (clauses.length === 0) return null;
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}


/** Derive the text to embed for a memory (tags + entity names + fact + description + properties). */
