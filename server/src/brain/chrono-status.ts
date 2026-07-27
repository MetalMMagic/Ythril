/**
 * C5 — `overdue` is DERIVED on read, never stored.
 *
 * Its own module purely to keep the import graph acyclic. `recall.ts` needs this to present a chrono hit's
 * status, and `chrono.ts` now needs `recall.ts` for the insert-time duplicate/contradiction check — so with
 * this function living in `chrono.ts` the two would import each other. ES modules tolerate that cycle today
 * (both sides only call across it at runtime, and function declarations hoist), but it is the kind of thing
 * that turns into an undefined-at-import-time bug the moment someone adds a top-level constant. One leaf
 * module with no imports of its own cannot participate in a cycle at all.
 *
 * `chrono.ts` re-exports it, so existing importers are unaffected.
 */
import type { ChronoEntry, ChronoStatus } from '../config/types.js';

/**
 * An entry is overdue when its due moment (its `endsAt`, or `startsAt` when it has no end) has passed
 * and it is not yet `completed`/`cancelled`. Nothing writes the `overdue` status — it is computed at
 * read time so there is no write churn, no scheduled sweep, and no sync traffic, and it is always
 * accurate to the second. Because the STORED status stays `upcoming`/`active`, this must be applied at
 * every chrono read path (see `getChronoById` and `listChrono`), and the `listChrono` status filter is
 * translated to match.
 *
 * Known limitation: the entry's embedding is built from the stored status, so a derived-`overdue` entry
 * still embeds as `upcoming` — semantic search for "overdue" won't rank it. That is the trade-off for
 * not re-embedding on a clock tick.
 */
export function deriveChronoStatus(
  entry: Pick<ChronoEntry, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): ChronoStatus {
  if (entry.status !== 'upcoming' && entry.status !== 'active') return entry.status;
  const due = entry.endsAt ?? entry.startsAt;
  return due && new Date(due).getTime() < now.getTime() ? 'overdue' : entry.status;
}
