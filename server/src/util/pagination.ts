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
 * rows; this bounds the response to the requested page size. Only re-sorts (by
 * `createdAt` desc) when it actually overflows, so single-space results — already
 * sorted and limited by the query — are returned untouched.
 */
export function capPage<T>(rows: T[], limit: number): T[] {
  if (rows.length <= limit) return rows;
  const ts = (r: T) => String((r as { createdAt?: string }).createdAt ?? '');
  return [...rows].sort((a, b) => ts(b).localeCompare(ts(a))).slice(0, limit);
}
