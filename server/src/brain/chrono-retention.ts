/**
 * Per-chrono-type retention — the rule, kept pure.
 *
 * ## Why a space-wide TTL was the wrong axis
 *
 * From a canary operator, 2026-08-02. Their `operation-logs` space holds deploy `event`s next to
 * `health-snapshot` and `metrics-snapshot` records, and the two want opposite treatment:
 *
 *   - **Deploy events are content-free by design**, so they are semantically almost identical to each other
 *     and to anything mentioning deployment. A cross-space recall for *"how is the platform deployed and what
 *     runs on the server"* returned **four near-identical `platform-apps deployed` chronos at 0.874**,
 *     outranking the guideline it should have surfaced at 0.823. They displace knowledge.
 *   - **Snapshots exist to be trended** (`diskServerDaysToFull`, `mongoDataSizeGiB`, `trivyCriticalCVEs`) and
 *     are one per run, so retaining them is nearly free — while 90 days is a single quarter with no
 *     year-over-year comparison.
 *
 * So this is a **recall-quality** feature that happens to look like a storage one. Their volumes were 516 and
 * 139 records; nobody was worried about disk.
 *
 * ## Two tiers, borrowed rather than invented
 *
 * The audit log already splits "the entry" from "the payload inside it" (`audit.recordChangeRetentionDays`),
 * and the operator asked for that shape by name. It maps exactly:
 *
 *   contentDays  →  drop the bulky, recallable part; keep the fact. `contentRedacted: true` so a reader can
 *                   tell "there was no detail" from "there was, and it expired".
 *   days         →  delete the record, through the normal delete path so it tombstones and propagates.
 *
 * **Dropping the vector is the point of the first tier**, not a side effect: a record with no embedding is
 * still listed and still queryable by field, but it can no longer win a semantic search — which is precisely
 * the problem that was reported.
 *
 * ## Precedence
 *
 * A per-record `ttlDays` on the write beats everything (someone said what they wanted for that record); then
 * the per-type policy; then the space's `recordTtlDays`. Absent everywhere means no expiry, as before.
 */

const DAY_MS = 86_400_000;

/** Per-type policy as stored on the space. Both fields optional so a type can set one tier only. */
export interface ChronoTypeRetention {
  days?: number;
  contentDays?: number;
}

export type ChronoRetentionPolicy = Record<string, ChronoTypeRetention>;

/** The subset of a space this decision needs — so every branch is testable without a config. */
export interface RetentionSpace {
  recordTtlDays?: number;
  chronoRetention?: ChronoRetentionPolicy;
}

/** A positive, finite day count, or undefined. Rejects 0 and negatives: those mean "no policy", not "instant". */
function days(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

/**
 * Retention in days for a chrono of this type: the per-type value, else the space default.
 *
 * A type named in the policy with no `days` deliberately falls through to the space default rather than
 * meaning "keep forever" — the operator's intent when they set only `contentDays` is "redact sooner, delete on
 * the usual schedule", and reading it as an exemption would silently retain records they expected to go.
 */
export function chronoRetentionDays(space: RetentionSpace, type: string): number | undefined {
  return days(space.chronoRetention?.[type]?.days) ?? days(space.recordTtlDays);
}

/**
 * Days after which a chrono of this type loses its content but keeps its fact, or undefined for never.
 *
 * Clamped below the delete window: a content window at or past the delete window can never fire, and a policy
 * that silently does nothing is worse than a rejected one. Clamping rather than erroring keeps a two-step
 * config edit (lower `days`, then lower `contentDays`) from failing halfway.
 */
export function chronoContentDays(space: RetentionSpace, type: string): number | undefined {
  const content = days(space.chronoRetention?.[type]?.contentDays);
  if (content === undefined) return undefined;
  const total = chronoRetentionDays(space, type);
  if (total !== undefined && content >= total) return undefined;
  return content;
}

/** `now + days` as a BSON Date, or undefined. `from` is the record's creation time, not the sweep's clock. */
function plusDays(from: number, d: number | undefined): Date | undefined {
  return d === undefined ? undefined : new Date(from + d * DAY_MS);
}

/**
 * The `_expireAt` a chrono of this type should carry.
 *
 * `ttlDays` follows the same contract as `expiryForCreate`: `0`/`null` is an explicit "never expire" and wins
 * over any policy, a positive number wins, and omitted defers to the type policy then the space default.
 */
export function chronoExpiry(
  space: RetentionSpace,
  type: string,
  createdAtMs: number,
  ttlDays?: number | null,
): Date | undefined {
  if (ttlDays === 0 || ttlDays === null) return undefined;
  const explicit = days(ttlDays);
  if (explicit !== undefined) return plusDays(createdAtMs, explicit);
  return plusDays(createdAtMs, chronoRetentionDays(space, type));
}

/** When this chrono's content should be dropped, or undefined if it never should. */
export function chronoContentExpiry(
  space: RetentionSpace,
  type: string,
  createdAtMs: number,
): Date | undefined {
  return plusDays(createdAtMs, chronoContentDays(space, type));
}

/**
 * Fields removed when a chrono's content window lapses.
 *
 * `embedding` and `embeddingModel` go with the text: leaving the vector behind would keep the record winning
 * semantic searches for content that is no longer there, which is the failure this feature exists to fix.
 * `title`, `type`, `startsAt`, `tags` and the id links stay — that is the "it happened" half.
 */
export const REDACTED_CHRONO_FIELDS = [
  'description', 'matchedText', 'properties', 'embedding', 'embeddingModel',
] as const;

/** True when this record still has anything worth redacting — so the sweep does not rewrite it forever. */
export function needsContentRedaction(doc: Record<string, unknown>): boolean {
  if (doc['contentRedacted'] === true) return false;
  return REDACTED_CHRONO_FIELDS.some(f => doc[f] !== undefined);
}
