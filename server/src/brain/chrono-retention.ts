/**
 * Record retention — the rule, kept pure.
 *
 * ## The precedence, decided by the owner on 2026-08-02
 *
 *     record  >  schema  >  space
 *
 * - **record** — `ttlDays` on the write. Someone said what they wanted for that record; `0`/`null` means
 *   never expire and wins over any policy.
 * - **schema** — `typeSchemas[collection][type].retention`. Per TYPE, and it lives where the type is already
 *   defined rather than in a second parallel map an operator has to know exists.
 * - **space** — `recordTtlDays`. The floor, and the only tier that can reach records with no type at all.
 *
 * ## Why per-type exists
 *
 * A space-wide TTL cannot express a space that holds two kinds of thing. The case that drove it, from a canary
 * operator: one space with deploy `event` chronos — **content-free by design**, so they cluster tightly and
 * displace real answers (a recall for *"how is the platform deployed"* returned four near-identical
 * `platform-apps deployed` records at 0.874, above the guideline it should have surfaced at 0.823) — next to
 * `health-snapshot` records that exist to be trended and must outlive any prune window. Their volumes were 516
 * and 139 records, so this was never about storage.
 *
 * ## Two tiers, borrowed rather than invented
 *
 * The audit log already splits "the entry" from "the payload inside it" (`audit.recordChangeRetentionDays`),
 * and the operator asked for that shape by name:
 *
 *     contentDays  →  drop the bulky, recallable part; keep the fact. `contentRedacted: true` so a reader can
 *                     tell "there was no detail" from "there was, and it expired".
 *     days         →  delete the record, through the normal delete path so it tombstones and propagates.
 *
 * **Dropping the vector is the point of the first tier**, not a side effect: a record with no embedding is
 * still listed and still queryable by field, but it cannot win a semantic search.
 *
 * `contentDays` is **chrono only** — the field names it removes are chrono's, and the write path rejects it on
 * other collections rather than accepting a setting that would do nothing.
 */
import type { KnowledgeType, SpaceMeta } from '../config/types.js';

const DAY_MS = 86_400_000;

/** Collections whose types may set a content window. The tier's field list is chrono's. */
export const CONTENT_TIER_COLLECTIONS: readonly KnowledgeType[] = ['chrono'];

/** The subset of a space this decision needs — so every branch is testable without a config. */
export interface RetentionSpace {
  recordTtlDays?: number;
  meta?: SpaceMeta;
}

/** A positive, finite day count, or undefined. Rejects 0 and negatives: those mean "no policy", not "instant". */
function days(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** The type's own retention block, if the schema declares one. */
export function schemaRetention(
  space: RetentionSpace,
  collection: KnowledgeType,
  type: string | undefined,
): { days?: number; contentDays?: number } | undefined {
  if (!type) return undefined;
  return space.meta?.typeSchemas?.[collection]?.[type]?.retention;
}

/**
 * Retention in days for a record of this collection+type: the schema's value, else the space default.
 *
 * A type whose schema sets only `contentDays` deliberately falls through to the space default rather than
 * meaning "keep forever" — the intent behind a content window is "redact sooner", and reading it as an
 * exemption would silently retain records the operator expected to go.
 */
export function retentionDays(
  space: RetentionSpace,
  collection: KnowledgeType,
  type: string | undefined,
): number | undefined {
  return days(schemaRetention(space, collection, type)?.days) ?? days(space.recordTtlDays);
}

/**
 * Days after which a record loses its content but keeps its fact, or undefined for never.
 *
 * Two guards, both of which prevent a policy that cannot fire:
 *  - the collection must support the tier (`chrono`);
 *  - the content window must be strictly inside the delete window, or the record is gone first.
 *
 * Clamping rather than erroring keeps a two-step config edit (lower `days`, then lower `contentDays`) from
 * failing halfway; the write path rejects the *unsupported collection* case loudly, where it can.
 */
export function contentDays(
  space: RetentionSpace,
  collection: KnowledgeType,
  type: string | undefined,
): number | undefined {
  if (!CONTENT_TIER_COLLECTIONS.includes(collection)) return undefined;
  const content = days(schemaRetention(space, collection, type)?.contentDays);
  if (content === undefined) return undefined;
  const total = retentionDays(space, collection, type);
  if (total !== undefined && content >= total) return undefined;
  return content;
}

/** `from + days` as a BSON Date, or undefined. `from` is the record's creation time, not the sweep's clock. */
function plusDays(from: number, d: number | undefined): Date | undefined {
  return d === undefined ? undefined : new Date(from + d * DAY_MS);
}

/**
 * The `_expireAt` a record should carry, applying record > schema > space.
 *
 * `ttlDays` follows the same contract as `expiryForCreate`: `0`/`null` is an explicit "never expire" and wins
 * over any policy, a positive number wins, and omitted defers to the schema then the space default.
 */
export function recordExpiry(
  space: RetentionSpace,
  collection: KnowledgeType,
  type: string | undefined,
  createdAtMs: number,
  ttlDays?: number | null,
): Date | undefined {
  if (ttlDays === 0 || ttlDays === null) return undefined;
  const explicit = days(ttlDays);
  if (explicit !== undefined) return plusDays(createdAtMs, explicit);
  return plusDays(createdAtMs, retentionDays(space, collection, type));
}

/** When this record's content should be dropped, or undefined if it never should. */
export function recordContentExpiry(
  space: RetentionSpace,
  collection: KnowledgeType,
  type: string | undefined,
  createdAtMs: number,
): Date | undefined {
  return plusDays(createdAtMs, contentDays(space, collection, type));
}

/**
 * Fields removed when a chrono's content window lapses.
 *
 * `embedding` and `embeddingModel` go with the text: leaving the vector behind would keep the record winning
 * semantic searches for content that is no longer there, which is the failure this exists to fix. `title`,
 * `type`, `startsAt`, `tags` and the id links stay — that is the "it happened" half.
 *
 * ## `properties` STAYS — asked and answered (canary, 2026-08-02)
 *
 * It was in this list, and taking it out is the right call. The operator asked whether the embedding can expire
 * separately from `properties`, so a chrono type can go *semantically silent while staying queryable by field*,
 * and they were holding a whole space's configuration until the answer:
 *
 * > for alert episodes `properties` (`alertname`, `fingerprint`, `notifyCount`, `reopens`, `outcome`) is the
 * > entire value and nothing else records it.
 *
 * That is the case for splitting them. What displaces knowledge in recall is the **vector** — plus the free
 * text that produced it — and `properties` is structured, small, and reachable only by explicit field query.
 * Dropping it removed everything the record was for and bought nothing this feature exists to buy.
 *
 * So the tier now means exactly what its name says: the record stops competing semantically and stays
 * *queryable*. An operator who genuinely wants the structured data gone has `days` — the record itself.
 */
export const REDACTED_CHRONO_FIELDS = [
  'description', 'matchedText', 'embedding', 'embeddingModel',
] as const;

/** True when this record still has anything worth redacting — so the sweep does not rewrite it forever. */
export function needsContentRedaction(doc: Record<string, unknown>): boolean {
  if (doc['contentRedacted'] === true) return false;
  return REDACTED_CHRONO_FIELDS.some(f => doc[f] !== undefined);
}

/**
 * Every `collection.type` in this space that declares a retention window, for display and for the sweep.
 *
 * Returned sorted so a UI and a log line list them in the same order regardless of key insertion order.
 */
export function declaredRetention(
  space: RetentionSpace,
): Array<{ collection: KnowledgeType; type: string; days?: number; contentDays?: number }> {
  const out: Array<{ collection: KnowledgeType; type: string; days?: number; contentDays?: number }> = [];
  const schemas = space.meta?.typeSchemas ?? {};
  for (const collection of Object.keys(schemas) as KnowledgeType[]) {
    for (const [type, schema] of Object.entries(schemas[collection] ?? {})) {
      const r = schema?.retention;
      if (!r) continue;
      const d = days(r.days);
      const c = days(r.contentDays);
      if (d === undefined && c === undefined) continue;
      out.push({ collection, type, ...(d !== undefined ? { days: d } : {}), ...(c !== undefined ? { contentDays: c } : {}) });
    }
  }
  return out.sort((a, b) => a.collection.localeCompare(b.collection) || a.type.localeCompare(b.type));
}
