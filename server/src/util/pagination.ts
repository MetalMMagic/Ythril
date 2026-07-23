/**
 * Safe pagination-parameter parsing for list endpoints.
 *
 * `Number('abc')` is `NaN` and `Math.min(NaN, max)` is `NaN`, which flows
 * unbounded into MongoDB `.limit()`. These helpers coerce to a bounded integer
 * so a garbage or out-of-range `?limit=`/`?skip=` can never produce an
 * unbounded or degenerate query.
 */

/** Parse a `limit` query value into an integer in `[1, max]`, falling back to `def` on garbage. */
export function parseLimit(raw: unknown, def: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}

/** Parse a `skip` query value into a non-negative integer (0 on garbage/negative). */
export function parseSkip(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

/**
 * Cap a merged, cross-space (proxy) list result to `limit`. Each member space is
 * already limited to `limit`, so a proxy of N members can return up to N × limit
 * rows; this bounds the response to the requested page size. Only re-sorts when it
 * actually overflows, so single-space results — already sorted and limited by the
 * query — are returned untouched.
 *
 * The re-sort must agree with what the query asked for: when the route requested a
 * `sort`, a proxy overflow re-sorts by that same field/direction, otherwise it would
 * silently reorder the merged page against the caller's sort. With no requested sort
 * it falls back to `createdAt` desc — the collections' natural default.
 */
export function capPage<T>(rows: T[], limit: number, sort?: { field: string; dir: 1 | -1 }): T[] {
  if (rows.length <= limit) return rows;
  const field = sort?.field ?? 'createdAt';
  const dir = sort?.dir ?? -1;
  const val = (r: T) => String((r as Record<string, unknown>)[field] ?? '');
  return [...rows].sort((a, b) => dir * val(a).localeCompare(val(b))).slice(0, limit);
}
