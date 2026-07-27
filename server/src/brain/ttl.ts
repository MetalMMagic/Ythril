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
export function expiryForCreate(spaceId: string, ttlDays?: number | null): Date | undefined {
  if (ttlDays === 0 || ttlDays === null) return undefined;
  if (typeof ttlDays === 'number' && ttlDays > 0) return new Date(Date.now() + ttlDays * DAY_MS);
  return spaceTtlExpiry(spaceId);
}

/** Set `_expireAt` on a create doc in place when an expiry applies. */
export function stampExpiryOnCreate(spaceId: string, doc: { _expireAt?: Date }, ttlDays?: number | null): void {
  const expireAt = expiryForCreate(spaceId, ttlDays);
  if (expireAt) doc._expireAt = expireAt;
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
}
