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
import type { DatePassedPolicy } from '../config/types-knowledge.js';

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
  /**
   * What a passed due moment MEANS for this entry's type — `datePassedPolicy(meta, entry.type)`.
   *
   * Passed in rather than resolved here, for the reason in the module note: this file imports nothing so it
   * cannot join an import cycle, and every caller must reach the one resolver
   * (`brain/chrono-date-policy.ts`) instead of writing its own `?? 'overdue'`.
   *
   * Optional, and it defaults to today's behaviour: a caller with no space context — a unit test, a future
   * internal reader — behaves exactly as it did before this parameter existed. That is also the ruling's own
   * requirement, that an instance which changes nothing sees nothing change.
   */
  datePassed: DatePassedPolicy = 'overdue',
): ChronoStatus {
  if (entry.status !== 'upcoming' && entry.status !== 'active') return entry.status;
  // The whole of the owner's ruling, in one branch: the date passing is still a fact, and what it MEANS is
  // now the schema's to say. `nothing` returns the STORED status, which is what the reporter needed — there
  // is no second field to read, because the field means what it says again.
  if (datePassed === 'nothing') return entry.status;
  const due = entry.endsAt ?? entry.startsAt;
  return due && new Date(due).getTime() < now.getTime() ? 'overdue' : entry.status;
}
