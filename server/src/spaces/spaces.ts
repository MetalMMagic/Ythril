import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { getDb, col, asDoc, asFilter, asUpdate } from '../db/mongo.js';
import { getConfig, saveConfig, getEmbeddingConfig, getDataRoot, getFaceRecognitionConfig } from '../config/loader.js';
import { ensureSpaceFilesDir, writeFile as writeSpaceFile } from '../files/files.js';
import { invalidateUsageCache } from '../quota/quota.js';
import { log } from '../util/log.js';
import type { Config, SpaceConfig, SpaceMeta, MemoryDoc, KnowledgeType, DupeActionRule, PendingSpaceOp } from '../config/types.js';

const SCHEMA_KTS: KnowledgeType[] = ['entity', 'edge', 'memory', 'chrono'];

/**
 * Write per-type schema JSON files into the space's `schemas/` folder as a
 * convenience snapshot after a meta update.
 * File name: `schemas/<spaceId>_<kt>_<typeName>.json`
 *
 * These files are **read-only snapshots** — the source of truth is
 * `config.json` under `spaces[*].meta.typeSchemas`.  Do not edit the files to
 * change the live schema; use the API (PATCH /api/spaces/:id or
 * PUT /api/spaces/:id/meta/typeSchemas/:kt/:name) instead.
 */
export async function syncSchemaFiles(spaceId: string, meta: SpaceMeta | undefined): Promise<void> {
  if (!meta?.typeSchemas) return;
  try {
    for (const kt of SCHEMA_KTS) {
      const ktMap = meta.typeSchemas[kt];
      if (!ktMap) continue;
      for (const [typeName, typeSchema] of Object.entries(ktMap)) {
        const safeName = typeName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
        const filePath = `schemas/${spaceId}_${kt}_${safeName}.json`;
        const content = JSON.stringify(typeSchema, null, 2);
        await writeSpaceFile(spaceId, filePath, content);
      }
    }
  } catch (err) {
    log.warn(`syncSchemaFiles(${spaceId}): ${err}`);
  }
}

const SPACE_COLLECTIONS = ['memories', 'entities', 'edges', 'chrono', 'tombstones', 'conflicts', 'files', 'dupe_candidates'] as const;

// Collections that have vector search indexes for semantic recall
const VECTOR_INDEXED_COLLECTIONS = ['memories', 'entities', 'edges', 'chrono', 'files'] as const;
type VectorIndexedCollection = typeof VECTOR_INDEXED_COLLECTIONS[number];

// ── Embedding model mismatch tracking ──────────────────────────────────────
const _reindexNeeded = new Set<string>();

/** Returns true if the space has stored embeddings from a different model */
export function needsReindex(spaceId: string): boolean {
  return _reindexNeeded.has(spaceId);
}

/** Clear the reindex flag after a successful reindex */
export function clearReindexFlag(spaceId: string): void {
  _reindexNeeded.delete(spaceId);
}

/** Create all required MongoDB collections and indexes for a space.
 *  With `waitForVectorReady: false` the (slow) $vectorSearch indexes are created but
 *  the READY poll is skipped, so the call returns in ~seconds — used by createSpace so
 *  the API can respond immediately (B1). Defaults to waiting (boot / reload paths). */
/**
 * Repair documents whose `spaceId` field disagrees with the collection they live in.
 *
 * Collections are already per-space (`{spaceId}_entities`), so the `spaceId` field inside
 * each document is redundant — but the read paths filter on it (`listEntities`,
 * `findEntityByName`, the edge-dedup lookup, the cascade deletes). If the field goes stale,
 * the data is still counted (counts read the collection) but becomes INVISIBLE to every
 * list and lookup — and worse, `findEntityByName` stops matching, so `remember` starts
 * creating duplicate entities instead of linking to the existing one.
 *
 * Two paths used to leave it stale:
 *   1. renaming a space — `moveSpaceData` renamed the collections but never rewrote the
 *      field, so every document kept the OLD space id;
 *   2. syncing with `spaceMap` aliasing — pulled documents were written into the local
 *      collection while keeping the REMOTE space id.
 *
 * Both are fixed at the source, but existing databases are already affected, so this runs
 * on every `initSpace` (boot). A document living in `{spaceId}_*` belongs to `spaceId` by
 * definition, which makes this safe and idempotent: it only touches documents that
 * disagree, and there is nothing it could wrongly "fix".
 */
export async function repairStaleSpaceIds(spaceId: string): Promise<number> {
  let repaired = 0;
  for (const suffix of SPACE_COLLECTIONS) {
    try {
      const res = await col<{ spaceId?: string }>(`${spaceId}_${suffix}`).updateMany(
        asFilter<{ spaceId?: string }>({ spaceId: { $ne: spaceId } }),
        asUpdate<{ spaceId?: string }>({ $set: { spaceId } }),
      );
      repaired += res.modifiedCount ?? 0;
    } catch (err) {
      // Never let a repair failure block startup — the space is still usable.
      log.warn(`Stale-spaceId repair failed for ${spaceId}_${suffix}: ${err}`);
    }
  }
  if (repaired > 0) {
    log.warn(
      `Space '${spaceId}': repaired ${repaired} document(s) carrying a stale spaceId ` +
      `(left behind by a space rename or an aliased sync). They were present but invisible ` +
      `to list/lookup queries; they are now visible again.`,
    );
  }
  return repaired;
}

export async function initSpace(
  spaceId: string,
  opts: { waitForVectorReady?: boolean } = {},
): Promise<void> {
  const waitForVectorReady = opts.waitForVectorReady ?? true;
  const db = getDb();
  const embCfg = getEmbeddingConfig();

  // Ensure collections exist (MongoDB creates them lazily on first insert,
  // but we create them explicitly to enable index creation)
  const existingColls = await db.listCollections().toArray();
  const existing = new Set(existingColls.map(c => c.name));

  for (const suffix of SPACE_COLLECTIONS) {
    const name = `${spaceId}_${suffix}`;
    if (!existing.has(name)) {
      await db.createCollection(name);
      log.debug(`Created collection ${name}`);
    }
  }

  // Self-heal data left invisible by an older rename / aliased sync (see above).
  await repairStaleSpaceIds(spaceId);

  // Regular indexes
  const memoriesColl = db.collection(`${spaceId}_memories`);
  const entitiesColl = db.collection(`${spaceId}_entities`);
  const edgesColl = db.collection(`${spaceId}_edges`);
  const chronoColl = db.collection(`${spaceId}_chrono`);
  const tombstonesColl = db.collection(`${spaceId}_tombstones`);

  await memoriesColl.createIndex({ spaceId: 1, seq: 1 });
  await memoriesColl.createIndex({ spaceId: 1, tags: 1 });
  await memoriesColl.createIndex({ spaceId: 1, entityIds: 1 });
  // Migration: drop the old unique entity index if it exists (name+type is not unique).
  // Uses listIndexes() once to check — after migration the non-unique index passes
  // createIndex() as a no-op, so zero overhead on subsequent boots.
  try {
    const indexes = await entitiesColl.listIndexes().toArray();
    if (indexes.some(i => i.name === 'spaceId_1_name_1_type_1' && i.unique)) {
      await entitiesColl.dropIndex('spaceId_1_name_1_type_1');
    }
  } catch { /* collection may not exist yet — createIndex below will handle it */ }
  await entitiesColl.createIndex({ spaceId: 1, name: 1, type: 1 });
  await entitiesColl.createIndex({ spaceId: 1, seq: 1 });
  await edgesColl.createIndex({ spaceId: 1, from: 1, to: 1, label: 1 }, { unique: true });
  await edgesColl.createIndex({ spaceId: 1, seq: 1 });
  await chronoColl.createIndex({ spaceId: 1, startsAt: 1 });
  await chronoColl.createIndex({ spaceId: 1, status: 1 });
  await chronoColl.createIndex({ spaceId: 1, seq: 1 });
  await tombstonesColl.createIndex({ spaceId: 1, seq: 1 });
  await db.collection(`${spaceId}_conflicts`).createIndex({ spaceId: 1, detectedAt: -1 });
  const dupeColl = db.collection(`${spaceId}_dupe_candidates`);
  // Serves the list query: equality on (spaceId, status) + sort by (score desc, detectedAt desc).
  await dupeColl.createIndex({ spaceId: 1, status: 1, score: -1, detectedAt: -1 });
  const filesColl = db.collection(`${spaceId}_files`);
  await filesColl.createIndex({ spaceId: 1, tags: 1 });
  await filesColl.createIndex({ spaceId: 1, updatedAt: -1 });

  // Vector search indexes (Atlas Local / Atlas). Created here; READY is polled unless
  // the caller defers it (createSpace, so the API responds without waiting — B1).
  await buildSpaceVectorIndexes(spaceId, waitForVectorReady);

  // Ensure files directory exists
  await ensureSpaceFilesDir(spaceId);

  // Check for embedding model mismatch — if stored memories use a different
  // model than configured, recall results would be semantically invalid.
  const embCfg2 = getEmbeddingConfig();
  const sample = await col<MemoryDoc>(`${spaceId}_memories`).findOne(
    {},
    { projection: { embeddingModel: 1 } },
  );
  if (sample?.embeddingModel && sample.embeddingModel !== embCfg2.model) {
    log.warn(
      `Space '${spaceId}': stored embeddings use model '${sample.embeddingModel}' ` +
      `but config specifies '${embCfg2.model}'. ` +
      `Semantic recall is disabled until re-indexed (POST /api/brain/spaces/${spaceId}/reindex).`,
    );
    _reindexNeeded.add(spaceId);
  } else {
    _reindexNeeded.delete(spaceId);
  }
}

/**
 * Create or validate the $vectorSearch index for a space collection.
 * When `waitForReady` (default), polls for READY status up to 60 seconds; pass false
 * to create the index and return immediately, letting Atlas finish the build in the
 * background (B1 — the caller confirms READY asynchronously via pollVectorIndexReady).
 */
async function ensureVectorSearchIndex(
  spaceId: string,
  collectionSuffix: VectorIndexedCollection,
  numDimensions: number,
  similarity: string,
  vectorPath: string = 'embedding',
  indexSuffix: string = 'embedding',
  waitForReady: boolean = true,
): Promise<void> {
  const db = getDb();
  const coll = db.collection(`${spaceId}_${collectionSuffix}`);
  const indexName = `${spaceId}_${collectionSuffix}_${indexSuffix}`;

  // List existing search indexes
  let indexes: Array<{ name: string; status?: string; latestDefinition?: { fields?: Array<{ numDimensions?: number }> } }> = [];
  try {
    indexes = await coll.listSearchIndexes().toArray() as typeof indexes;
  } catch {
    // If listSearchIndexes fails (e.g. not Atlas Local), skip vector search index creation
    log.warn(
      `Could not list search indexes for ${spaceId}_memories. ` +
        `Vector search may be unavailable. Use mongodb/mongodb-atlas-local for $vectorSearch support.`,
    );
    return;
  }

  const existing = indexes.find(i => i.name === indexName);

  if (existing) {
    const existingDims = existing.latestDefinition?.fields?.[0]?.numDimensions;
    if (existingDims === numDimensions) {
      log.debug(`Vector search index ${indexName} already exists`);
      return;
    }
    // Dimensions changed — drop and recreate
    log.warn(`Recreating vector search index ${indexName} (dimensions changed: ${existingDims} → ${numDimensions})`);
    try {
      await coll.dropSearchIndex(indexName);
      // Wait for drop to propagate
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      log.warn(`Failed to drop vector search index ${indexName}: ${err}`);
    }
  }

  log.debug(`Creating vector search index ${indexName} (${numDimensions}d, ${similarity}, path: ${vectorPath})`);
  try {
    await coll.createSearchIndex(asDoc({
      name: indexName,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: vectorPath,
            numDimensions,
            similarity,
          },
        ],
      },
    }));
  } catch (err) {
    log.warn(`Failed to create vector search index ${indexName}: ${err}. Semantic recall will be unavailable.`);
    return;
  }

  // Poll for READY status (unless the caller will confirm asynchronously — B1).
  if (waitForReady) {
    const ready = await pollVectorIndexReady(spaceId, collectionSuffix, indexName);
    if (!ready) log.warn(`Vector search index ${indexName} did not reach READY state within 60 seconds`);
  }
}

/** Poll a single vector-search index for READY status, up to ~60 seconds.
 *  Returns true once READY, false if it never became READY in the window. */
async function pollVectorIndexReady(
  spaceId: string,
  collectionSuffix: VectorIndexedCollection,
  indexName: string,
): Promise<boolean> {
  const coll = getDb().collection(`${spaceId}_${collectionSuffix}`);
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const current = await coll.listSearchIndexes(indexName).toArray() as Array<{ status?: string }>;
      if (current[0]?.status === 'READY') {
        log.debug(`Vector search index ${indexName} is READY`);
        return true;
      }
    } catch { /* ignore intermittent errors during polling */ }
  }
  return false;
}

/** Create every $vectorSearch index a space needs (per-type embedding indexes plus
 *  the optional face index). `waitForReady` is threaded to each — false creates them
 *  and returns without polling (B1). */
async function buildSpaceVectorIndexes(spaceId: string, waitForReady: boolean): Promise<void> {
  const embCfg = getEmbeddingConfig();
  for (const suffix of VECTOR_INDEXED_COLLECTIONS) {
    await ensureVectorSearchIndex(spaceId, suffix, embCfg.dimensions, embCfg.similarity, 'embedding', 'embedding', waitForReady);
  }
  const faceCfg = getFaceRecognitionConfig();
  if (faceCfg.enabled) {
    await ensureVectorSearchIndex(spaceId, 'files', 128, 'cosine', 'faceEmbedding', 'faceEmbedding', waitForReady);
  }
}

/** Poll all of a space's vector-search indexes until READY. Returns true only if every
 *  expected index reached READY within the window. */
async function waitForSpaceIndexesReady(spaceId: string): Promise<boolean> {
  let allReady = true;
  for (const suffix of VECTOR_INDEXED_COLLECTIONS) {
    if (!(await pollVectorIndexReady(spaceId, suffix, `${spaceId}_${suffix}_embedding`))) allReady = false;
  }
  if (getFaceRecognitionConfig().enabled) {
    if (!(await pollVectorIndexReady(spaceId, 'files', `${spaceId}_files_faceEmbedding`))) allReady = false;
  }
  return allReady;
}

/** Background step kicked off by createSpace: wait for the deferred vector-index
 *  builds to reach READY, then flip the space's indexStatus to 'ready' (or 'failed').
 *  A crash before this completes is recovered on the next boot by initAllSpaces. */
async function finalizeSpaceIndexReady(spaceId: string): Promise<void> {
  let ok = false;
  try {
    ok = await waitForSpaceIndexesReady(spaceId);
  } catch (err) {
    log.warn(`Space '${spaceId}': error awaiting vector index readiness: ${err instanceof Error ? err.message : String(err)}`);
  }
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space) return; // space was deleted while its indexes built
  space.indexStatus = ok ? 'ready' : 'failed';
  saveConfig(cfg);
  log.info(`Space '${spaceId}': vector indexes ${ok ? 'ready' : 'did not reach READY (marked failed)'}`);
}

/** Initialise all spaces defined in config */
export async function initAllSpaces(): Promise<void> {
  const cfg = getConfig();
  let dirty = false;
  for (const space of cfg.spaces) {
    log.debug(`Initialising space: ${space.id}`);
    await initSpace(space.id);
    // initSpace waited for READY here, so a space left mid-build by a crash during
    // createSpace's async finalize (B1) is now ready — clear the stale marker.
    if (space.indexStatus === 'building' || space.indexStatus === 'failed') {
      space.indexStatus = 'ready';
      dirty = true;
    }
  }
  if (dirty) saveConfig(cfg);
}

/** Ensure the built-in 'general' space exists in config and MongoDB */
export async function ensureGeneralSpace(): Promise<void> {
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === 'general')) {
    cfg.spaces.push({
      id: 'general',
      label: 'General',
      builtIn: true,
      folders: [],
    });
    saveConfig(cfg);
  }
  await initSpace('general');
}

/** Create a new space and persist to config */
export async function createSpace(opts: {
  id: string;
  label: string;
  description?: string;
  folders?: string[];
  maxGiB?: number;
  proxyFor?: string[];
  meta?: SpaceMeta;
}): Promise<SpaceConfig> {
  const cfg = getConfig();
  if (cfg.spaces.some(s => s.id === opts.id)) {
    throw new Error(`Space '${opts.id}' already exists`);
  }
  const space: SpaceConfig = {
    id: opts.id,
    label: opts.label,
    builtIn: false,
    folders: opts.folders ?? [],
    maxGiB: opts.maxGiB,
    description: opts.description,
    ...(opts.proxyFor ? { proxyFor: opts.proxyFor } : {}),
    ...(opts.meta ? { meta: opts.meta } : {}),
  };
  // Initialize MongoDB collections/indexes before committing to config so the space
  // always has a backing DB (prevents the old "in config but no collections" race).
  // The (slow) $vectorSearch READY poll is DEFERRED so the API responds in seconds
  // instead of blocking up to minutes past the client timeout (B1): the indexes are
  // created here, the space is returned as indexStatus 'building', and a background
  // task flips it to 'ready'/'failed' once the builds finish.
  if (!opts.proxyFor) {
    await initSpace(opts.id, { waitForVectorReady: false });
    space.indexStatus = 'building';
  }
  cfg.spaces.push(space);
  saveConfig(cfg);
  if (!opts.proxyFor) {
    void finalizeSpaceIndexReady(opts.id);
  }
  return space;
}

/** Physically drop a real space's MongoDB collections, vector indexes, and file
 *  directories. Idempotent — re-running after a partial run is safe (dropping a
 *  missing collection / removing an absent directory are both no-ops). Returns the
 *  list of hard errors encountered (empty on full success). */
async function dropSpaceData(spaceId: string): Promise<string[]> {
  const db = getDb();
  const errors: string[] = [];

  // 1. Drop vector search indexes on all indexed collections (best-effort)
  for (const suffix of VECTOR_INDEXED_COLLECTIONS) {
    const indexName = `${spaceId}_${suffix}_embedding`;
    try {
      const coll = db.collection(`${spaceId}_${suffix}`);
      const indexes = await coll.listSearchIndexes().toArray() as Array<{ name?: string }>;
      if (indexes.some(i => i.name === indexName)) {
        await coll.dropSearchIndex(indexName);
        log.debug(`Dropped vector search index ${indexName}`);
      }
    } catch (err) {
      log.warn(`Could not drop vector search index ${indexName}: ${err}`);
      // Vector index failure is non-fatal — the collection drop below will clean it up
    }
  }

  // 2. Drop all MongoDB collections associated with this space
  const prefix = `${spaceId}_`;
  const existingColls = await db.listCollections().toArray();
  for (const coll of existingColls.filter(c => c.name.startsWith(prefix))) {
    try {
      await db.collection(coll.name).drop();
      log.debug(`Dropped collection ${coll.name}`);
    } catch (err) {
      const msg = `Could not drop collection ${coll.name}: ${err}`;
      log.warn(msg);
      errors.push(msg);
    }
  }

  // 3. Delete the space files directory
  const filesDir = path.resolve(getDataRoot(), 'files', spaceId);
  try {
    await fs.rm(filesDir, { recursive: true, force: true });
    log.debug(`Deleted files directory ${filesDir}`);
  } catch (err) {
    const msg = `Could not delete files directory ${filesDir}: ${err}`;
    log.warn(msg);
    errors.push(msg);
  }

  // 4. Delete any stale chunked-upload directories for this space
  const chunksDir = path.resolve(getDataRoot(), '.chunks', spaceId);
  try {
    await fs.rm(chunksDir, { recursive: true, force: true });
    log.debug(`Deleted chunk uploads directory ${chunksDir}`);
  } catch (err) {
    const msg = `Could not delete chunk uploads directory ${chunksDir}: ${err}`;
    log.warn(msg);
    errors.push(msg);
  }

  invalidateUsageCache(); // a dropped space frees disk — honour it in the next quota check
  return errors;
}

/** Delete a space: drops all MongoDB collections and files, then removes it from
 *  config. Crash-safe: a `pendingSpaceOp` marker is persisted BEFORE the drops and
 *  cleared only once the space leaves config, so a crash mid-delete is completed on
 *  the next boot by reconcilePendingSpaceOp() (deletion is forward-only — the data
 *  is already going away). If any drop fails, the marker is kept so the operator can
 *  retry (or the next boot resumes) rather than leaving a half-deleted space silently. */
export async function removeSpace(spaceId: string): Promise<boolean> {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space) return false;
  if (space.builtIn) throw new Error(`Cannot delete built-in space '${spaceId}'`);

  // Proxy spaces have no DB collections or files — a pure config removal, atomic
  // via the single saveConfig, so no write-ahead marker is needed.
  if (space.proxyFor) {
    cfg.spaces = cfg.spaces.filter(s => s.id !== spaceId);
    saveConfig(cfg);
    return true;
  }

  const resuming = cfg.pendingSpaceOp?.type === 'delete' && cfg.pendingSpaceOp.spaceId === spaceId;
  if (cfg.pendingSpaceOp && !resuming) {
    throw new Error(pendingOpConflictMessage(cfg.pendingSpaceOp, `delete space '${spaceId}'`));
  }

  // Write-ahead: record the intent (atomically) before touching MongoDB/fs.
  if (!resuming) {
    cfg.pendingSpaceOp = { type: 'delete', spaceId, startedAt: new Date().toISOString() };
    saveConfig(cfg);
  }

  const errors = await dropSpaceData(spaceId);
  if (errors.length > 0) {
    // Keep the marker — the delete is incomplete and forward-only, so a retry or the
    // next boot resumes it. Do NOT remove the space from config yet.
    throw new Error(
      `Space '${spaceId}' cleanup incomplete (${errors.length} error(s)). ` +
      `Deletion will be resumed on retry or next restart. ` +
      `Errors: ${errors.join('; ')}`,
    );
  }

  // Commit: drop done — remove from config and clear the marker in one atomic write.
  cfg.spaces = cfg.spaces.filter(s => s.id !== spaceId);
  delete cfg.pendingSpaceOp;
  saveConfig(cfg);
  return true;
}

export type WipeCollectionType = 'memories' | 'entities' | 'edges' | 'chrono' | 'files';
export const WIPE_COLLECTION_TYPES: readonly WipeCollectionType[] = ['memories', 'entities', 'edges', 'chrono', 'files'];

export interface WipeResult {
  memories: number;
  entities: number;
  edges: number;
  chrono: number;
  files: number;
}

/** Wipe data from a space — by default wipes memories, entities, edges, chrono,
 *  file metadata, and the physical files directory — while preserving the space
 *  itself (label, description, config, OIDC mappings, quota settings).
 *
 *  @param types  Optional list of collection types to wipe.  When omitted (or
 *                when all five types are supplied) all collections are wiped and
 *                tombstones are cleared.  When a subset is supplied only those
 *                collections are cleared and only the matching tombstone records
 *                are removed, leaving the rest of the space intact.
 *
 *  Idempotent: wiping an already-empty space returns all-zero counts without error.
 *  Scoped strictly to the target space — no cross-space side effects.
 *
 *  The returned counts reflect the number of documents actually deleted.
 */
export async function wipeSpace(spaceId: string, types?: WipeCollectionType[]): Promise<WipeResult> {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space) throw new Error(`Space '${spaceId}' not found`);

  // Guard: spaceId must match the safe pattern used during creation so it is
  // safe to embed in a filesystem path (same constraint as removeSpace).
  if (!/^[a-z0-9-]+$/.test(spaceId)) {
    throw new Error(`Invalid spaceId '${spaceId}'`);
  }

  // Resolve which types to wipe — default to all when not specified.
  const targets: Set<WipeCollectionType> = new Set(
    types && types.length > 0 ? types : WIPE_COLLECTION_TYPES,
  );
  const isFullWipe = WIPE_COLLECTION_TYPES.every(t => targets.has(t));

  // Run all applicable deletes in parallel.
  const zero = Promise.resolve({ deletedCount: 0 });
  const [memRes, entRes, edgeRes, chronoRes, fileRes] = await Promise.all([
    targets.has('memories') ? col(`${spaceId}_memories`).deleteMany({}) : zero,
    targets.has('entities') ? col(`${spaceId}_entities`).deleteMany({}) : zero,
    targets.has('edges') ? col(`${spaceId}_edges`).deleteMany({}) : zero,
    targets.has('chrono') ? col(`${spaceId}_chrono`).deleteMany({}) : zero,
    targets.has('files') ? col(`${spaceId}_files`).deleteMany({}) : zero,
  ]);

  // Clear tombstones for the wiped types.
  // Full wipe: drop everything (single deleteMany with no filter).
  // Partial wipe: filter by the `type` field present on brain tombstones.
  const TOMBSTONE_TYPE_MAP: Partial<Record<WipeCollectionType, string>> = {
    memories: 'memory',
    entities: 'entity',
    edges: 'edge',
    chrono: 'chrono',
  };
  if (isFullWipe) {
    await col(`${spaceId}_tombstones`).deleteMany({});
  } else {
    const tombstoneTypes = Array.from(targets)
      .map(t => TOMBSTONE_TYPE_MAP[t])
      .filter((t): t is string => t !== undefined);
    if (tombstoneTypes.length > 0) {
      await col(`${spaceId}_tombstones`).deleteMany({ type: { $in: tombstoneTypes } });
    }
  }
  // Clear duplicate-scanner candidates that reference the wiped types.
  if (isFullWipe) {
    await col(`${spaceId}_dupe_candidates`).deleteMany({});
  } else {
    const DUPE_TYPE_MAP: Partial<Record<WipeCollectionType, string>> = {
      memories: 'memory', entities: 'entity', edges: 'edge', chrono: 'chrono', files: 'file',
    };
    const dupeTypes = Array.from(targets).map(t => DUPE_TYPE_MAP[t]).filter((t): t is string => t !== undefined);
    if (dupeTypes.length > 0) {
      await col(`${spaceId}_dupe_candidates`).deleteMany({ type: { $in: dupeTypes } });
    }
  }

  // File tombstones live in a separate collection — clear them when files is wiped.
  if (targets.has('files')) {
    await col(`${spaceId}_file_tombstones`).deleteMany({});

    // Delete the physical files directory, then recreate it empty.
    // Validate the resolved path stays within the expected data root to guard
    // against any unexpected traversal (defence-in-depth alongside the regex above).
    const dataRoot = getDataRoot();
    const filesDir = path.resolve(dataRoot, 'files', spaceId);
    const boundary = path.resolve(dataRoot, 'files') + path.sep;
    if (!filesDir.startsWith(boundary)) {
      throw new Error(`wipeSpace: resolved path '${filesDir}' escapes expected data root`);
    }
    try {
      await fs.rm(filesDir, { recursive: true, force: true });
      await fs.mkdir(filesDir, { recursive: true });
    } catch (err) {
      log.warn(`wipeSpace: could not clear files directory for '${spaceId}': ${err}`);
    }
  }
  invalidateUsageCache(); // a wipe frees disk + shrinks brain — honour it in the next quota check

  const result: WipeResult = {
    memories: memRes.deletedCount ?? 0,
    entities: entRes.deletedCount ?? 0,
    edges: edgeRes.deletedCount ?? 0,
    chrono: chronoRes.deletedCount ?? 0,
    files: fileRes.deletedCount ?? 0,
  };
  const typesLabel = isFullWipe ? 'all' : Array.from(targets).join(', ');
  log.info(`Wiped space '${spaceId}' [${typesLabel}]: ${result.memories} memories, ${result.entities} entities, ${result.edges} edges, ${result.chrono} chrono, ${result.files} files`);
  return result;
}

/** Maximum number of previous meta versions kept for history. */
const META_VERSION_CAP = 20;

/** Update mutable fields (label, description, meta) of an existing space in config.
 *  When `meta` is provided the version counter is auto-incremented and the
 *  previous version is pushed to `previousVersions` (capped at META_VERSION_CAP).
 *  Returns the updated SpaceConfig, or null if the space was not found. */
export function updateSpace(
  spaceId: string,
  updates: { label?: string; description?: string; maxGiB?: number | null; meta?: SpaceMeta; dupeRules?: DupeActionRule[]; dupeMergeSurvivor?: 'older' | 'newer'; dupeRulesOnInsert?: boolean },
): SpaceConfig | null {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space) return null;
  if (typeof updates.label === 'string') space.label = updates.label;
  if (typeof updates.description === 'string') space.description = updates.description;
  if (updates.maxGiB !== undefined) {
    // null or non-positive clears the cap (unlimited); positive number sets the cap
    space.maxGiB = updates.maxGiB !== null && updates.maxGiB > 0 ? updates.maxGiB : undefined;
  }
  // Duplicate-action rules are local (not governed) — apply immediately.
  if (updates.dupeRules !== undefined) {
    space.dupeRules = updates.dupeRules.length > 0 ? updates.dupeRules : undefined;
  }
  if (updates.dupeMergeSurvivor !== undefined) {
    space.dupeMergeSurvivor = updates.dupeMergeSurvivor;
  }
  if (updates.dupeRulesOnInsert !== undefined) {
    space.dupeRulesOnInsert = updates.dupeRulesOnInsert || undefined;
  }

  if (updates.meta !== undefined) {
    const now = new Date().toISOString();
    const prev = space.meta;
    const prevVersion = prev?.version ?? 0;
    const newVersion = prevVersion + 1;

    // Preserve previous version history (capped)
    const history = prev?.previousVersions ?? [];
    if (prev) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { previousVersions: _drop, ...snapshot } = prev;
      history.unshift({ version: prevVersion, meta: snapshot, updatedAt: prev.updatedAt ?? now });
      if (history.length > META_VERSION_CAP) history.length = META_VERSION_CAP;
    }

    space.meta = {
      ...updates.meta,
      version: newVersion,
      updatedAt: now,
      previousVersions: history.length > 0 ? history : undefined,
    };
  }

  saveConfig(cfg);
  // Fire-and-forget schema file sync
  syncSchemaFiles(spaceId, space.meta).catch(err => log.warn(`syncSchemaFiles: ${err}`));
  return space;
}

/** Reorder spaces in config to match the provided ordered list of IDs.
 *  IDs not present in the list are appended at the end (preserving relative order).
 *  Returns the reordered list of SpaceConfigs, or null if any provided ID is unknown. */
export function reorderSpaces(orderedIds: string[]): SpaceConfig[] | null {
  const cfg = getConfig();
  const idSet = new Set(orderedIds);
  // Validate all provided IDs exist
  for (const id of orderedIds) {
    if (!cfg.spaces.some(s => s.id === id)) return null;
  }
  // Build new order: provided IDs first (in given order), then any remaining spaces
  const reordered: SpaceConfig[] = [];
  for (const id of orderedIds) {
    reordered.push(cfg.spaces.find(s => s.id === id)!);
  }
  for (const space of cfg.spaces) {
    if (!idSet.has(space.id)) reordered.push(space);
  }
  cfg.spaces = reordered;
  saveConfig(cfg);
  return reordered;
}

/** Generate a URL-safe space ID from a label */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || uuidv4().slice(0, 8);
}

/** Physically move a space's MongoDB collections and file directories from
 *  {oldId}_* / files/oldId to {newId}_* / files/newId. Idempotent — after a partial
 *  run, only the collections/dirs still under `oldId` remain to move, so re-running
 *  completes it. Returns hard errors (empty on full success). */
async function moveSpaceData(oldId: string, newId: string): Promise<string[]> {
  const db = getDb();
  const errors: string[] = [];

  // 1. Rename MongoDB collections ({oldId}_* → {newId}_*). Only collections still
  //    under the old prefix remain after a partial run, so this is idempotent.
  const existingColls = await db.listCollections().toArray();
  const prefix = `${oldId}_`;
  for (const coll of existingColls.filter(c => c.name.startsWith(prefix))) {
    const suffix = coll.name.slice(prefix.length);
    const newName = `${newId}_${suffix}`;
    try {
      await db.collection(coll.name).rename(newName);
      log.debug(`Renamed collection ${coll.name} → ${newName}`);
    } catch (err) {
      const msg = `Could not rename collection ${coll.name} → ${newName}: ${err}`;
      log.warn(msg);
      errors.push(msg);
    }
  }

  // 1b. Rewrite the `spaceId` field inside the moved documents.
  //
  // Renaming the collection is NOT enough: every document still carries the OLD space id,
  // and the read paths filter on that field (listEntities, findEntityByName, the edge-dedup
  // lookup, the cascade deletes). Without this the renamed space looks CATASTROPHIC but is
  // actually intact — counts still show the documents (counts read the collection) while
  // every list comes back empty, and `findEntityByName` stops matching, so `remember` starts
  // creating duplicates instead of linking to the existing entity.
  //
  // Idempotent, and safe on a partial re-run: a document living in `{newId}_*` belongs to
  // `newId` by definition, so we only touch the ones that disagree.
  try {
    const repaired = await repairStaleSpaceIds(newId);
    if (repaired > 0) log.debug(`Rewrote spaceId on ${repaired} document(s) for renamed space ${newId}`);
  } catch (err) {
    const msg = `Could not rewrite spaceId field for renamed space ${newId}: ${err}`;
    log.warn(msg);
    errors.push(msg);
  }

  // 2. Move the files directory (skip if already moved — old dir gone)
  const dataRoot = getDataRoot();
  const oldDir = path.resolve(dataRoot, 'files', oldId);
  const newDir = path.resolve(dataRoot, 'files', newId);
  try {
    await fs.access(oldDir);
    await fs.rename(oldDir, newDir);
    log.debug(`Moved files directory ${oldDir} → ${newDir}`);
  } catch (err) {
    // If old dir doesn't exist, that's fine — space had no files, or it was already moved.
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      const msg = `Could not move files directory: ${err}`;
      log.warn(msg);
      errors.push(msg);
    }
  }

  // 3. Move chunked-upload directory if it exists
  const oldChunks = path.resolve(dataRoot, '.chunks', oldId);
  const newChunks = path.resolve(dataRoot, '.chunks', newId);
  try {
    await fs.access(oldChunks);
    await fs.rename(oldChunks, newChunks);
  } catch { /* ignore — chunks dir may not exist / already moved */ }

  return errors;
}

/** Apply the logical config changes of a rename: point the space entry at `newId`
 *  and rewrite every reference (networks, spaceMap, member watermarks, token scopes,
 *  proxy targets). Pure/synchronous — the caller persists with a single saveConfig. */
function applySpaceRenameToConfig(cfg: Config, space: SpaceConfig, oldId: string, newId: string): void {
  // Update the space config entry
  space.id = newId;

  // Embedded spaceId fields in docs stay as-is — that's the space the doc was
  // originally written in (provenance). Local lookups use collection names.

  // Update network references
  for (const net of cfg.networks) {
    const idx = net.spaces.indexOf(oldId);
    if (idx !== -1) {
      net.spaces[idx] = newId;
      // Record in spaceMap so peers using the old ID can still sync.
      if (!net.spaceMap) net.spaceMap = {};
      // Update any existing mapping whose target was oldId (rare: chained renames)
      for (const [remote, local] of Object.entries(net.spaceMap)) {
        if (local === oldId) {
          net.spaceMap[remote] = newId;
        }
      }
      // Add direct mapping oldId → newId (a peer spoke may still reference the old ID)
      if (!net.spaceMap[oldId] || net.spaceMap[oldId] === oldId) {
        net.spaceMap[oldId] = newId;
      }
    }

    // Update member watermark keys (lastSeqReceived / lastSeqPushed)
    for (const member of net.members) {
      if (member.lastSeqReceived?.[oldId] !== undefined) {
        member.lastSeqReceived[newId] = member.lastSeqReceived[oldId]!;
        delete member.lastSeqReceived[oldId];
      }
      if (member.lastSeqPushed?.[oldId] !== undefined) {
        member.lastSeqPushed[newId] = member.lastSeqPushed[oldId]!;
        delete member.lastSeqPushed[oldId];
      }
    }
  }

  // Update token scopes
  for (const tok of cfg.tokens) {
    if (tok.spaces) {
      const idx = tok.spaces.indexOf(oldId);
      if (idx !== -1) tok.spaces[idx] = newId;
    }
  }

  // Update proxy space references
  for (const s of cfg.spaces) {
    if (s.proxyFor) {
      const idx = s.proxyFor.indexOf(oldId);
      if (idx !== -1) s.proxyFor[idx] = newId;
    }
  }
}

/** Rename a space: renames all MongoDB collections, moves the file directory, and
 *  updates config references (networks, tokens, proxy spaces).
 *
 *  Crash-safe: a `pendingSpaceOp` marker is persisted BEFORE any MongoDB/fs change
 *  and cleared only once the logical config change commits. The physical move is
 *  idempotent, so a crash mid-rename is completed on the next boot by
 *  reconcilePendingSpaceOp(); a caught error keeps the marker so the operator can
 *  retry (the retry resumes the same op rather than starting over).
 *  Returns the updated SpaceConfig on success. */
export async function renameSpace(oldId: string, newId: string): Promise<SpaceConfig> {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === oldId);
  if (!space) throw new Error(`Space '${oldId}' not found`);
  if (space.builtIn) throw new Error(`Cannot rename built-in space '${oldId}'`);
  if (cfg.spaces.some(s => s.id === newId)) throw new Error(`Space '${newId}' already exists`);

  const resuming = cfg.pendingSpaceOp?.type === 'rename'
    && cfg.pendingSpaceOp.spaceId === oldId
    && cfg.pendingSpaceOp.newId === newId;
  if (cfg.pendingSpaceOp && !resuming) {
    throw new Error(pendingOpConflictMessage(cfg.pendingSpaceOp, `rename space '${oldId}'`));
  }

  // Write-ahead: record the intent (atomically) before touching MongoDB/fs.
  if (!resuming) {
    cfg.pendingSpaceOp = { type: 'rename', spaceId: oldId, newId, startedAt: new Date().toISOString() };
    saveConfig(cfg);
  }

  const errors = await moveSpaceData(oldId, newId);
  if (errors.length > 0) {
    // Keep the marker — the rename is incomplete but idempotent, so a retry or the
    // next boot resumes it. Config still points at the old id until it commits.
    throw new Error(
      `Space '${oldId}' rename incomplete (${errors.length} error(s)). ` +
      `Rename will be resumed on retry or next restart. ` +
      `Errors: ${errors.join('; ')}`,
    );
  }

  // Commit: physical move done — apply the logical config change and clear the
  // marker in one atomic write.
  applySpaceRenameToConfig(cfg, space, oldId, newId);
  delete cfg.pendingSpaceOp;
  saveConfig(cfg);
  log.info(`Renamed space '${oldId}' → '${newId}'`);
  return space;
}

/** Human-readable rejection when a different space op is already mid-flight. */
function pendingOpConflictMessage(pending: PendingSpaceOp, attempted: string): string {
  const target = pending.type === 'rename' ? `${pending.spaceId} → ${pending.newId}` : pending.spaceId;
  return `Cannot ${attempted}: a ${pending.type} of '${target}' is still pending ` +
    `(started ${pending.startedAt}). It resumes automatically on restart; retry once it clears.`;
}

/** Complete a space rename/delete that was interrupted (e.g. by a crash or restart)
 *  after its `pendingSpaceOp` marker was written but before it committed. Called once
 *  at startup, before the workers start. Rolls the operation FORWARD — the operator
 *  asked for it and the physical steps are idempotent — then clears the marker. If a
 *  step still fails, the marker is kept and a loud error is logged for the operator;
 *  the next boot tries again. */
export async function reconcilePendingSpaceOp(): Promise<void> {
  const cfg = getConfig();
  const op = cfg.pendingSpaceOp;
  if (!op) return;

  const target = op.type === 'rename' ? `'${op.spaceId}' → '${op.newId}'` : `'${op.spaceId}'`;
  log.warn(`Resuming interrupted space ${op.type} ${target} (started ${op.startedAt})`);

  try {
    if (op.type === 'rename' && op.newId) {
      const space = cfg.spaces.find(s => s.id === op.spaceId);
      if (!space) {
        // The space is no longer under its old id — the commit already happened and
        // only the marker survived. Just clear it.
        log.warn(`Pending rename target '${op.spaceId}' not found in config — clearing stale marker`);
        delete cfg.pendingSpaceOp;
        saveConfig(cfg);
        return;
      }
      const errors = await moveSpaceData(op.spaceId, op.newId);
      if (errors.length > 0) {
        log.error(`Could not complete pending rename ${target}; marker kept for next restart. Errors: ${errors.join('; ')}`);
        return;
      }
      applySpaceRenameToConfig(cfg, space, op.spaceId, op.newId);
      delete cfg.pendingSpaceOp;
      saveConfig(cfg);
      log.info(`Completed interrupted rename ${target}`);
    } else if (op.type === 'delete') {
      const errors = await dropSpaceData(op.spaceId);
      if (errors.length > 0) {
        log.error(`Could not complete pending delete ${target}; marker kept for next restart. Errors: ${errors.join('; ')}`);
        return;
      }
      cfg.spaces = cfg.spaces.filter(s => s.id !== op.spaceId);
      delete cfg.pendingSpaceOp;
      saveConfig(cfg);
      log.info(`Completed interrupted deletion ${target}`);
    } else {
      log.error(`Unknown pendingSpaceOp type '${op.type}' — clearing marker`);
      delete cfg.pendingSpaceOp;
      saveConfig(cfg);
    }
  } catch (err) {
    log.error(`reconcilePendingSpaceOp for ${target} failed; marker kept for next restart: ${err}`);
  }
}
