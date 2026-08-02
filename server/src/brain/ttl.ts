/**
 * Record TTL / auto-expiry (F10) — write-side helpers (leaf module, no delete-path imports).
 *
 * An entry gets an absolute-expiry BSON `Date` (`_expireAt`) from either a per-record `ttlDays` on the
 * write, or the space's `recordTtlDays` auto-TTL. The sweep (`ttl-sweep.ts`) later deletes lapsed
 * records through the normal delete functions, so each deletion tombstones and propagates over sync —
 * correct in synced spaces (a raw MongoDB TTL index deletes below the app and the record would be
 * re-pulled from a peer). The `_expireAt` index just keeps the sweep query cheap.
 */
import { col } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { recordExpiry, recordContentExpiry, type RetentionSpace } from './chrono-retention.js';
import type { KnowledgeType } from '../config/types.js';

const DAY_MS = 86_400_000;

/** Collections that carry per-record TTL. (`files` = the file-level FileMeta records; the sweep's
 *  deleter runs the full file cascade, and only file-level records ever carry `_expireAt`.) */
export const TTL_COLLECTIONS = ['memories', 'entities', 'edges', 'chrono', 'files'] as const;

function spaceRecordTtlDays(spaceId: string): number | undefined {
  try { return getConfig().spaces.find(s => s.id === spaceId)?.recordTtlDays; } catch { return undefined; }
}

function spaceTtlExpiry(spaceId: string): Date | undefined {
  const days = spaceRecordTtlDays(spaceId);
  return days && days > 0 ? new Date(Date.now() + days * DAY_MS) : undefined;
}

/**
 * Expiry to stamp on **create**: a per-record `ttlDays > 0` wins; `ttlDays` 0/null means "never expire"
 * (no stamp even if the space has a default); omitted falls back to the space's `recordTtlDays`.
 */
export function expiryForCreate(
  spaceId: string,
  ttlDays?: number | null,
  typed?: { collection: KnowledgeType; type?: string },
): Date | undefined {
  if (ttlDays === 0 || ttlDays === null) return undefined;
  if (typeof ttlDays === 'number' && ttlDays > 0) return new Date(Date.now() + ttlDays * DAY_MS);
  // record > schema > space (owner decision, 2026-08-02). The type's own schema may carry a window, which
  // overrides the space default — a telemetry space wants deploy events pruned and health snapshots kept, and
  // one space-wide number cannot express both. See `chrono-retention.ts`.
  const space = typed ? retentionSpace(spaceId) : undefined;
  if (space && typed) return recordExpiry(space, typed.collection, typed.type, Date.now(), ttlDays);
  return spaceTtlExpiry(spaceId);
}

/** Set `_expireAt` (and, for a chrono type with a content window, `_contentExpireAt`) on a create doc. */
export function stampExpiryOnCreate(
  spaceId: string,
  doc: { _expireAt?: Date; _contentExpireAt?: Date },
  ttlDays?: number | null,
  typed?: { collection: KnowledgeType; type?: string },
): void {
  const expireAt = expiryForCreate(spaceId, ttlDays, typed);
  if (expireAt) doc._expireAt = expireAt;
  const contentAt = contentExpiryForCreate(spaceId, typed);
  if (contentAt) doc._contentExpireAt = contentAt;
}

/**
 * When this record's CONTENT should be dropped while the record itself stays — chrono only.
 *
 * Deliberately not gated on a per-record `ttlDays`: that says when the record goes, and says nothing about
 * whether its detail is worth keeping for the whole of that. An operator who set `ttlDays` for one record and
 * a content window for its type meant both.
 */
export function contentExpiryForCreate(
  spaceId: string,
  typed?: { collection: KnowledgeType; type?: string },
): Date | undefined {
  if (!typed) return undefined;
  const space = retentionSpace(spaceId);
  return space ? recordContentExpiry(space, typed.collection, typed.type, Date.now()) : undefined;
}

/** The retention-relevant fields of a space, or undefined pre-setup / for an unknown id. */
function retentionSpace(spaceId: string): RetentionSpace | undefined {
  try {
    const s = getConfig().spaces.find(x => x.id === spaceId);
    return s ? { recordTtlDays: s.recordTtlDays, meta: s.meta } : undefined;
  } catch { return undefined; }
}

/**
 * Apply the TTL to an **update**'s `$set`/`$unset` in place:
 *   - `ttlDays > 0` → set a new expiry;
 *   - `ttlDays` 0/null → clear the expiry (opt the record out of the space default);
 *   - omitted → apply the space default **only when the record has no expiry yet** (`hasExistingExpiry`
 *     false), never re-sliding an existing one.
 */
export function applyExpiryToUpdate(
  spaceId: string,
  ttlDays: number | null | undefined,
  hasExistingExpiry: boolean,
  $set: Record<string, unknown>,
  $unset: Record<string, unknown>,
): void {
  if (ttlDays === 0 || ttlDays === null) { $unset['_expireAt'] = ''; return; }
  if (typeof ttlDays === 'number' && ttlDays > 0) { $set['_expireAt'] = new Date(Date.now() + ttlDays * DAY_MS); return; }
  if (!hasExistingExpiry) {
    const expireAt = spaceTtlExpiry(spaceId);
    if (expireAt) $set['_expireAt'] = expireAt;
  }
}

/** Ensure the (plain, non-TTL) `_expireAt` index that keeps the sweep query cheap. */
export async function ensureTtlIndex(spaceId: string): Promise<void> {
  await Promise.all(TTL_COLLECTIONS.map(async (c) => {
    try {
      await col(`${spaceId}_${c}`).createIndex({ _expireAt: 1 }, { name: 'ttl_expireAt', sparse: true });
    } catch (err) {
      log.warn(`ensureTtlIndex ${spaceId}_${c}: ${err}`);
    }
  }));
  // Chrono only: the content-redaction pass has its own sweep query, and without an index it would scan the
  // whole collection every five minutes on a space that never uses the feature.
  try {
    await col(`${spaceId}_chrono`).createIndex({ _contentExpireAt: 1 }, { name: 'ttl_contentExpireAt', sparse: true });
  } catch (err) {
    log.warn(`ensureTtlIndex ${spaceId}_chrono content: ${err}`);
  }
}
