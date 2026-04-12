/**
 * Audit log — append-only, immutable access log stored in a dedicated MongoDB
 * collection (`audit_log`).
 *
 * Responsibilities:
 *  - Initialise the collection and TTL / query indexes.
 *  - Insert audit entries (fire-and-forget to avoid slowing requests).
 *  - Query entries with filtering and pagination.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import type { AuditLogEntry } from '../config/types.js';
import type { Collection, Filter, Sort } from 'mongodb';

const COLLECTION = 'audit_log';
const DEFAULT_RETENTION_DAYS = 90;

function col(): Collection<AuditLogEntry> {
  return getDb().collection<AuditLogEntry>(COLLECTION);
}

// ── Initialisation ─────────────────────────────────────────────────────────

/** Create the audit_log collection, TTL index, and query indexes. */
export async function initAuditCollection(): Promise<void> {
  const db = getDb();
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
    log.debug(`Created collection ${COLLECTION}`);
  }

  const c = col();

  // TTL index — entries expire at the exact _expireAt BSON Date.
  // _expireAt is computed per entry at write time (now + retentionDays) so
  // each entry carries its own absolute expiry.  expireAfterSeconds: 0 means
  // "expire at the Date stored in the field" — no additional offset.
  // This also makes retention config changes forward-only: lowering retention
  // won't retroactively shorten existing entries' lifetimes.

  // Drop legacy string-based TTL index if present (it had no effect).
  try { await c.dropIndex('ttl_timestamp'); } catch { /* not present */ }

  // Ensure TTL index with expireAfterSeconds: 0.  Use collMod to update
  // the value in-place if the index already exists with a different value,
  // avoiding the noisy drop-and-recreate pattern.
  try {
    await c.createIndex(
      { _expireAt: 1 },
      { expireAfterSeconds: 0, name: 'ttl_expireAt' },
    );
  } catch {
    // Index already exists with a different expireAfterSeconds — update in-place.
    try {
      await db.command({
        collMod: COLLECTION,
        index: { name: 'ttl_expireAt', expireAfterSeconds: 0 },
      });
    } catch (err) {
      log.warn(`Could not update audit TTL index: ${err}`);
    }
  }

  // Query indexes
  await c.createIndex({ tokenId: 1, timestamp: -1 });
  await c.createIndex({ oidcSubject: 1, timestamp: -1 });
  await c.createIndex({ spaceId: 1, timestamp: -1 });
  await c.createIndex({ operation: 1, timestamp: -1 });
  await c.createIndex({ status: 1, timestamp: -1 });
  await c.createIndex({ ip: 1, timestamp: -1 });

  // Bare timestamp descending index — covers the most common admin query
  // ("show latest N entries" without any field filter).
  await c.createIndex({ timestamp: -1 });
}

// ── Write ──────────────────────────────────────────────────────────────────

export interface AuditEntryInput {
  tokenId?: string | null;
  tokenLabel?: string | null;
  authMethod?: 'pat' | 'oidc' | null;
  oidcSubject?: string | null;
  ip: string;
  method: string;
  path: string;
  spaceId?: string | null;
  operation: string;
  status: number;
  entryId?: string | null;
  durationMs: number;
}

/** Insert an audit log entry. Fire-and-forget — never throws. */
export function logAuditEntry(input: AuditEntryInput): void {
  let retentionDays = DEFAULT_RETENTION_DAYS;
  try { retentionDays = getConfig().audit?.retentionDays ?? DEFAULT_RETENTION_DAYS; } catch { /* pre-setup */ }

  const entry: AuditLogEntry = {
    _id: uuidv4(),
    timestamp: new Date().toISOString(),
    _expireAt: new Date(Date.now() + retentionDays * 86_400_000),
    tokenId: input.tokenId ?? null,
    tokenLabel: input.tokenLabel ?? null,
    authMethod: input.authMethod ?? null,
    oidcSubject: input.oidcSubject ?? null,
    ip: input.ip,
    method: input.method,
    path: input.path,
    spaceId: input.spaceId ?? null,
    operation: input.operation,
    status: input.status,
    entryId: input.entryId ?? null,
    durationMs: input.durationMs,
  };

  col().insertOne(entry as any).catch((err: unknown) => {
    log.warn(`Audit log write failed: ${err}`);
  });
}

// ── Query ──────────────────────────────────────────────────────────────────

export interface AuditQueryParams {
  after?: string;
  before?: string;
  tokenId?: string;
  oidcSubject?: string;
  spaceId?: string;
  operation?: string;   // comma-separated list
  status?: number;
  ip?: string;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export async function queryAuditLog(params: AuditQueryParams): Promise<AuditQueryResult> {
  const filter: Filter<AuditLogEntry> = {};

  if (params.after || params.before) {
    const ts: Record<string, string> = {};
    if (params.after) ts['$gte'] = params.after;
    if (params.before) ts['$lte'] = params.before;
    filter.timestamp = ts as Filter<AuditLogEntry>['timestamp'];
  }

  if (params.tokenId) filter.tokenId = params.tokenId;
  if (params.oidcSubject) filter.oidcSubject = params.oidcSubject;
  if (params.spaceId) filter.spaceId = params.spaceId;
  if (params.ip) filter.ip = params.ip;
  if (params.status !== undefined) filter.status = params.status;

  if (params.operation) {
    const ops = params.operation.split(',').map(s => s.trim()).filter(Boolean);
    if (ops.length === 1) {
      filter.operation = ops[0];
    } else if (ops.length > 1) {
      filter.operation = { $in: ops } as Filter<AuditLogEntry>['operation'];
    }
  }

  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);

  const [entries, total] = await Promise.all([
    col()
      .find(filter)
      .sort({ timestamp: -1 } as Sort)
      .skip(offset)
      .limit(limit)
      .toArray(),
    col().countDocuments(filter),
  ]);

  return {
    entries,
    total,
    hasMore: offset + entries.length < total,
  };
}
