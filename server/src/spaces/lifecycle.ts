/**
 * Space lifecycle — init, create, remove, wipe, and pending-op crash recovery.
 *
 * Split out of spaces.ts (A17.7 step 2). Mutates live `Config` and coordinates with
 * `PendingSpaceOp` so a crash mid-create/remove/rename is reconciled on next boot — which is why
 * `reconcilePendingSpaceOp` lives here yet reaches into rename.ts: it recovers rename ops too.
 */
import fs from 'fs/promises';
import path from 'path';
import { getDb, col } from '../db/mongo.js';
import { getConfig, saveConfig, getEmbeddingConfig, getDataRoot } from '../config/loader.js';
import { ensureSpaceFilesDir } from '../files/files.js';
import { invalidateUsageCache } from '../quota/quota.js';
import { log } from '../util/log.js';
import type { SpaceConfig, SpaceMeta, MemoryDoc } from '../config/types.js';
import { VECTOR_INDEXED_COLLECTIONS, buildSpaceVectorIndexes, finalizeSpaceIndexReady } from './vector-index.js';
import { SPACE_COLLECTIONS, repairStaleSpaceIds, dropLegacyPrefixedIndexes, pendingOpConflictMessage , setReindexNeeded } from './_shared.js';
import { moveSpaceData, applySpaceRenameToConfig } from './rename.js';

export async function initSpace(
  spaceId: string,
  opts: { waitForVectorReady?: boolean } = {},
): Promise<void> {
  const waitForVectorReady = opts.waitForVectorReady ?? true;
  const db = getDb();

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

  // Regular indexes.
  //
  // P10 migration: these collections are ALREADY per-space (`{spaceId}_memories`, …), so every
  // document in them carries the same `spaceId` value. Leading that field in a compound index adds
  // write cost and index bytes with zero selectivity. The indexes below are de-prefixed
  // (`{seq:1}` not `{spaceId:1, seq:1}`); `dropLegacyPrefixedIndexes` removes any old
  // `spaceId`-leading index left over from before the migration. It is idempotent: after the first
  // boot rebuilds them, no `spaceId`-leading index remains, so the drop loop finds nothing and the
  // `createIndex` calls are no-ops. (The former standalone entity-unique-index migration is folded
  // in here — a stale `spaceId_1_name_1_type_1` unique index simply gets dropped like any other.)
  const memoriesColl = db.collection(`${spaceId}_memories`);
  const entitiesColl = db.collection(`${spaceId}_entities`);
  const edgesColl = db.collection(`${spaceId}_edges`);
  const chronoColl = db.collection(`${spaceId}_chrono`);
  const tombstonesColl = db.collection(`${spaceId}_tombstones`);
  const conflictsColl = db.collection(`${spaceId}_conflicts`);
  const dupeColl = db.collection(`${spaceId}_dupe_candidates`);
  const filesColl = db.collection(`${spaceId}_files`);

  await Promise.all([
    dropLegacyPrefixedIndexes(memoriesColl), dropLegacyPrefixedIndexes(entitiesColl),
    dropLegacyPrefixedIndexes(edgesColl), dropLegacyPrefixedIndexes(chronoColl),
    dropLegacyPrefixedIndexes(tombstonesColl), dropLegacyPrefixedIndexes(conflictsColl),
    dropLegacyPrefixedIndexes(dupeColl), dropLegacyPrefixedIndexes(filesColl),
  ]);

  await memoriesColl.createIndex({ seq: 1 });
  await memoriesColl.createIndex({ tags: 1 });
  await memoriesColl.createIndex({ entityIds: 1 });
  await entitiesColl.createIndex({ name: 1, type: 1 });
  await entitiesColl.createIndex({ seq: 1 });
  // Unique within the (already per-space) collection: (from, to, label) — the leading constant
  // `spaceId` distinguished no documents, so dropping it preserves the identical guarantee.
  await edgesColl.createIndex({ from: 1, to: 1, label: 1 }, { unique: true });
  await edgesColl.createIndex({ seq: 1 });
  await chronoColl.createIndex({ startsAt: 1 });
  await chronoColl.createIndex({ status: 1 });
  await chronoColl.createIndex({ seq: 1 });
  await tombstonesColl.createIndex({ seq: 1 });
  await conflictsColl.createIndex({ detectedAt: -1 });
  // Serves the list query: equality on `status` (now the leading field) + sort by (score desc,
  // detectedAt desc).
  await dupeColl.createIndex({ status: 1, score: -1, detectedAt: -1 });
  await filesColl.createIndex({ tags: 1 });
  await filesColl.createIndex({ updatedAt: -1 });

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
    setReindexNeeded(spaceId, true);
  } else {
    setReindexNeeded(spaceId, false);
  }
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
export async function dropSpaceData(spaceId: string): Promise<string[]> {
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
