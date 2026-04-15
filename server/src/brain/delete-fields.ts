/**
 * deleteFields utility — validates and applies dot-notation path deletions
 * to documents during update operations.
 *
 * Used by entity, edge, and memory update endpoints to support the
 * `deleteFields` array parameter.
 */

// ── System fields that cannot be deleted ────────────────────────────────────

const SYSTEM_FIELDS = new Set([
  'id', '_id', 'name', 'type', 'spaceId', 'createdAt', 'updatedAt',
]);

/** Dangerous prototype keys that must never be traversed or deleted. */
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate a `deleteFields` array from a request body.
 *
 * Returns `{ ok: true }` if valid, or `{ ok: false, error }` with a
 * user-facing error message if invalid.
 */
export function validateDeleteFields(
  deleteFields: unknown,
): { ok: true } | { ok: false; error: string } {
  if (deleteFields === undefined || deleteFields === null) return { ok: true };

  if (!Array.isArray(deleteFields)) {
    return { ok: false, error: '`deleteFields` must be an array of strings' };
  }

  for (const p of deleteFields) {
    if (typeof p !== 'string' || !p.trim()) {
      return { ok: false, error: '`deleteFields` entries must be non-empty strings' };
    }
    const segments = p.split('.');
    // Reject empty segments from consecutive dots (e.g. "properties..key")
    if (segments.some(s => s === '')) {
      return { ok: false, error: `Invalid deleteFields path '${p}': contains empty segments` };
    }
    // Reject any segment that could cause prototype pollution
    for (const seg of segments) {
      if (PROTO_KEYS.has(seg)) {
        return { ok: false, error: `Invalid deleteFields path segment '${seg}'` };
      }
    }
    // The top-level segment is what matters for system field protection
    const topLevel = segments[0] ?? '';
    if (SYSTEM_FIELDS.has(topLevel)) {
      return {
        ok: false,
        error: `Cannot delete system field '${topLevel}' via deleteFields`,
      };
    }
  }

  return { ok: true };
}

/**
 * Apply `deleteFields` paths to a plain object, mutating it in place.
 *
 * Each path is a dot-notation string (e.g. `"properties.oldKey"`).
 * - `"properties.oldKey"` deletes `obj.properties.oldKey`.
 * - `"description"` deletes `obj.description`.
 * - `"properties.items.*.stale"` deletes `stale` from every object inside
 *   the `items` array (wildcard `*` iterates over array elements).
 * - Paths targeting non-existent keys are silently ignored (no-op).
 *
 * Returns the set of top-level keys that were affected (useful for
 * determining whether re-embedding is needed).
 */
export function applyDeleteFields(
  obj: Record<string, unknown>,
  deleteFields: string[],
): Set<string> {
  const affected = new Set<string>();

  for (const path of deleteFields) {
    const segments = path.split('.');
    if (segments.length === 0) continue;

    const firstSeg = segments[0] ?? '';
    affected.add(firstSeg);

    applyDeletePath(obj, segments, 0);
  }

  return affected;
}

/**
 * Recursively apply a single deleteFields path starting at `depth`.
 * Handles `*` wildcard segments by iterating over array elements.
 */
function applyDeletePath(
  current: unknown,
  segments: string[],
  depth: number,
): void {
  if (current == null || typeof current !== 'object') return;

  const seg = segments[depth] ?? '';
  if (PROTO_KEYS.has(seg)) return;

  const isLeaf = depth === segments.length - 1;

  if (seg === '*') {
    // Wildcard: current must be an array — apply remaining path to each element
    if (!Array.isArray(current)) return;
    if (isLeaf) return; // `*` as the final segment is a no-op (can't delete array elements by wildcard)
    for (const item of current) {
      applyDeletePath(item, segments, depth + 1);
    }
    return;
  }

  if (Array.isArray(current)) {
    // Non-wildcard segment on an array — stop traversal
    return;
  }

  const obj = current as Record<string, unknown>;

  if (isLeaf) {
    if (Object.prototype.hasOwnProperty.call(obj, seg)) {
      delete obj[seg];
    }
    return;
  }

  // Continue traversal
  applyDeletePath(obj[seg], segments, depth + 1);
}
