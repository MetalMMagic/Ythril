import { MongoClient, type Db, type Collection, type Document, type Filter, type UpdateFilter, type OptionalUnlessRequiredId, type AnyBulkWriteOperation } from 'mongodb';
import { getMongoUri } from '../config/loader.js';
import { log } from '../util/log.js';
import { dbNameFromUri } from './db-name.js';

let _client: MongoClient | null = null;
let _dbName = 'ythril';

/** Tri-state: null = not yet checked, true = available, false = unavailable */
let _vectorSearchAvailable: boolean | null = null;
let _vectorSearchDetails = '';

export async function connectMongo(): Promise<MongoClient> {
  const uri = getMongoUri();
  _dbName = dbNameFromUri(uri);
  log.debug(`Connecting to MongoDB at ${uri.replace(/\/\/[^@]*@/, '//[credentials]@')} (database: ${_dbName})`);
  _client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  await _client.connect();
  log.debug('MongoDB connected');
  return _client;
}

/**
 * Probe whether `$vectorSearch` is available on the connected MongoDB.
 *
 * Strategy: run a minimal `$vectorSearch` aggregation against a temporary
 * probe collection.  The stage is recognised immediately — before any index
 * or collection look-up — so we can distinguish three outcomes:
 *
 *  - Stage unknown / unrecognised → not available (vanilla MongoDB < 8.0)
 *  - Any other error (index not found, collection missing, etc.) → available
 *  - Success (empty result set) → available
 *
 * The result is cached; subsequent calls return the cached value instantly.
 */
export async function checkVectorSearchAvailability(): Promise<{
  available: boolean;
  details: string;
}> {
  if (_vectorSearchAvailable !== null) {
    return { available: _vectorSearchAvailable, details: _vectorSearchDetails };
  }

  const db = getDb();

  // Collect server version for the log message
  let serverVersion = 'unknown';
  try {
    const info = await db.admin().command({ buildInfo: 1 }) as { version?: string };
    if (typeof info.version === 'string') serverVersion = info.version;
  } catch { /* best-effort */ }

  // Probe: a $vectorSearch on a dummy collection with a zero-dimensional query.
  // The stage is validated before collection/index resolution, so an "unknown
  // stage" error fires immediately on servers that don't support it.
  try {
    await db.collection('_vectorsearch_probe').aggregate([
      {
        $vectorSearch: {
          index: '_probe_idx',
          path: 'embedding',
          queryVector: [0, 0, 0],
          numCandidates: 1,
          limit: 1,
        },
      },
    ]).toArray();
    // Aggregation succeeded (0 results expected) — stage is supported.
    _vectorSearchAvailable = true;
    _vectorSearchDetails = `MongoDB ${serverVersion}`;
    return { available: true, details: _vectorSearchDetails };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // "Unrecognized pipeline stage name: '$vectorSearch'" (or similar wording)
    // means the stage does not exist on this server.
    if (/unrecognized|unknown.*stage|no.*such.*stage|\$vectorSearch.*not.*support/i.test(msg)) {
      _vectorSearchAvailable = false;
      _vectorSearchDetails = `MongoDB ${serverVersion}`;
      return { available: false, details: _vectorSearchDetails };
    }
    // Any other error (index not found, collection not found, wrong dimensions…)
    // means the stage IS recognised — $vectorSearch is available.
    _vectorSearchAvailable = true;
    _vectorSearchDetails = `MongoDB ${serverVersion}`;
    return { available: true, details: _vectorSearchDetails };
  }
}

/** Returns true if `$vectorSearch` is available on the connected MongoDB. */
export function isVectorSearchAvailable(): boolean {
  return _vectorSearchAvailable === true;
}

/** Reset the cached availability state (for testing). */
export function _resetVectorSearchCache(): void {
  _vectorSearchAvailable = null;
  _vectorSearchDetails = '';
}

/** Reset the active database name (for testing). */
export function _resetDbName(): void {
  _dbName = '';
}

export function getMongo(): MongoClient {
  if (!_client) throw new Error('MongoDB not connected — call connectMongo() first');
  return _client;
}

export function getDb(): Db {
  return getMongo().db(_dbName);
}

export function col<T extends object>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ── Typing bridges (NOT validators) ─────────────────────────────────────────
//
// The helpers below are pure `as unknown as` casts that bridge our plain document
// interfaces to MongoDB's strict generics (which expect an index signature). They
// perform NO sanitisation and NO validation: an object that is hostile going in is
// still hostile coming out.
//
// This matters because a lot of peer-supplied sync data passes through them. Real
// validation of ingested documents happens at the call sites, via the Zod
// `Incoming*Doc` schemas in `api/sync.ts` — not here.
//
// They are named `as*` precisely so they read as casts. The previous `m`-prefixed
// names read like "sanitise for Mongo", which is exactly the wrong assumption to
// invite for code on the sync-ingest path.

/**
 * Cast a plain object to MongoDB's `Filter<T>`. A typing bridge, not a sanitiser.
 * The cast is semantically correct: the object IS intended as a filter for T.
 */
export function asFilter<T extends object>(f: Record<string, unknown>): Filter<T> {
  return f as unknown as Filter<T>;
}

/**
 * Cast a document value to `OptionalUnlessRequiredId<T>` for insertOne / replaceOne.
 * A typing bridge, not a sanitiser: d is the document being inserted.
 */
export function asDoc<T extends object>(d: T | Record<string, unknown>): OptionalUnlessRequiredId<T> {
  return d as unknown as OptionalUnlessRequiredId<T>;
}

/**
 * Cast a plain update-operator object to MongoDB's `UpdateFilter<T>`.
 * A typing bridge, not a sanitiser: u is an update descriptor (`{ $set: {...} }`) for T.
 */
export function asUpdate<T extends object>(u: Record<string, unknown>): UpdateFilter<T> {
  return u as unknown as UpdateFilter<T>;
}

/**
 * Cast a bulk-write operations array to `AnyBulkWriteOperation<T>[]`.
 * A typing bridge, not a sanitiser.
 */
export function asBulk<T extends object>(ops: unknown[]): AnyBulkWriteOperation<T>[] {
  return ops as unknown as AnyBulkWriteOperation<T>[];
}

// Graceful shutdown
export async function closeMongo(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _dbName = '';
  }
}
