import type { Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { getDb, col, asDoc, asFilter, asUpdate } from '../db/mongo.js';
import { getConfig, saveConfig, getEmbeddingConfig, getDataRoot, getFaceRecognitionConfig } from '../config/loader.js';
import { ensureSpaceFilesDir, writeFile as writeSpaceFile } from '../files/files.js';
import { resolveMetaRefs } from './schema-validation.js';
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
  const db = getDb();
  const prefix = `${spaceId}_`;

  // Discover the space's collections rather than iterating a hardcoded list.
  //
  // The original repair walked SPACE_COLLECTIONS, which covers only the 8 collections
  // initSpace creates — and so it MISSED `{spaceId}_file_tombstones`, whose readers DO
  // filter on the spaceId field (api/sync.ts, sync/engine.ts). After a rename, every
  // pre-rename file deletion became invisible to sync, and peers that still held the file
  // pushed it straight back: deleted files resurrected. Scanning by prefix fixes that and
  // means any per-space collection added in future is covered automatically — the hardcoded
  // list was itself the bug.
  let collections: string[];
  try {
    collections = (await db.listCollections().toArray())
      .map(c => c.name)
      .filter(n => n.startsWith(prefix));
  } catch (err) {
    log.warn(`Stale-spaceId repair: could not list collections for '${spaceId}': ${err}`);
    return 0;
  }

  let repaired = 0;
  for (const name of collections) {
    try {
      // `$exists: true` is load-bearing: only rewrite a spaceId that is present but WRONG.
      // Some per-space collections legitimately carry no spaceId field at all — notably
      // `{spaceId}_file_hashes` (the manifest hash cache, keyed by path, one document per
      // file). A bare `$ne` also matches missing fields, so without this guard the repair
      // would ADD a spaceId to every cached file hash on every boot: pointless writes,
      // potentially hundreds of thousands of them on a file-heavy space.
      const res = await db.collection(name).updateMany(
        { spaceId: { $exists: true, $ne: spaceId } },
        { $set: { spaceId } },
      );
      repaired += res.modifiedCount ?? 0;
    } catch (err) {
      // Never let a repair failure block startup — the space is still usable.
      log.warn(`Stale-spaceId repair failed for ${name}: ${err}`);
    }
  }

  if (repaired > 0) {
    log.warn(
      `Space '${spaceId}': repaired ${repaired} document(s) carrying a stale spaceId ` +
      `(left behind by a space rename, a cross-space import, or an aliased sync). They were ` +
      `present but invisible to list/lookup queries; they are now visible again.`,
    );
  }
  return repaired;
}

/**
 * P10 migration helper: drop any regular index on a per-space collection whose leading key is
 * `spaceId`. These collections are already per-space, so a leading `spaceId` key has zero
 * selectivity; the de-prefixed indexes created in `initSpace` replace them. Idempotent — once the
 * legacy indexes are gone this finds nothing and returns immediately. Never drops `_id_`, and never
 * touches an index that does not lead with `spaceId` (so the new de-prefixed indexes are safe).
 */
async function dropLegacyPrefixedIndexes(coll: Collection): Promise<void> {
  let indexes: Array<{ name?: string; key?: Record<string, unknown> }>;
  try {
    indexes = await coll.listIndexes().toArray();
  } catch {
    return; // collection may not exist yet — createIndex will build the new shape
  }
  for (const idx of indexes) {
    if (!idx.name || idx.name === '_id_') continue;
    if (Object.keys(idx.key ?? {})[0] === 'spaceId') {
      try {
        await coll.dropIndex(idx.name);
      } catch (err) {
        log.warn(`P10: could not drop legacy index ${idx.name} on ${coll.collectionName}: ${err}`);
      }
    }
  }
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
    _reindexNeeded.add(spaceId);
  } else {
    _reindexNeeded.delete(spaceId);
  }
}

/**
 * The fixed (non-`properties`) fields declared as `$vectorSearch` filter fields per collection, so
 * that a recall filtering on them uses native ANN pre-filtering instead of the exhaustive ENN scan
 * (P6). Only fields that (a) exist on the document type and (b) are reachable through the recall
 * filter API (`ALLOWED_FILTER_KEY_PREFIXES` in brain/memory.ts: tags/type/name/status/label) are
 * listed. `properties.<key>` paths are added dynamically from the space's schema — see
 * `deriveVectorFilterFields`.
 */
const FIXED_VECTOR_FILTER_FIELDS: Record<VectorIndexedCollection, string[]> = {
  memories: ['tags', 'type'],
  entities: ['tags', 'type', 'name'],
  edges: ['tags', 'type', 'label'],
  chrono: ['tags', 'type', 'status'],
  files: ['tags'],
};

/** Map a per-space collection suffix to the KnowledgeType whose schema governs its `properties`. */
const COLLECTION_KNOWLEDGE_TYPE: Partial<Record<VectorIndexedCollection, KnowledgeType>> = {
  memories: 'memory',
  entities: 'entity',
  edges: 'edge',
  chrono: 'chrono',
  // files carry no per-type schema (file is not a KnowledgeType), so no `properties.*` filter paths
};

/**
 * The full set of `$vectorSearch` filter-field paths for a collection: the fixed fields above, plus
 * one `properties.<key>` path for every property key declared in the space's schema for the
 * matching knowledge type (union across sub-types). Declaring the schema property paths is what lets
 * a `properties.*` filter take the fast ANN path on a schema-defined space — dynamic property keys
 * that no schema declares still fall back to ENN, which is correct, just slower.
 */
function deriveVectorFilterFields(spaceId: string, collectionSuffix: VectorIndexedCollection): string[] {
  const fields = [...(FIXED_VECTOR_FILTER_FIELDS[collectionSuffix] ?? [])];
  const kt = COLLECTION_KNOWLEDGE_TYPE[collectionSuffix];
  if (!kt) return fields;

  const rawMeta = getConfig().spaces.find(s => s.id === spaceId)?.meta;
  if (!rawMeta?.typeSchemas) return fields;
  const meta = resolveMetaRefs(rawMeta);
  const ktMap = meta.typeSchemas?.[kt];
  if (!ktMap) return fields;

  const propKeys = new Set<string>();
  for (const typeSchema of Object.values(ktMap)) {
    for (const key of Object.keys(typeSchema.propertySchemas ?? {})) {
      // Guard against a schema key that would break the dot-path or duplicate a fixed field.
      if (key && !key.includes('.') && !key.includes('$')) propKeys.add(`properties.${key}`);
    }
  }
  return [...fields, ...propKeys];
}

/** The exported list of filter fields a recall query may safely push into `$vectorSearch.filter`
 *  for a given collection. Mirrors what `ensureVectorSearchIndex` declares, so recall routing and
 *  index definition never drift. */
export function vectorFilterFieldsFor(spaceId: string, collectionSuffix: string): string[] {
  if (!(VECTOR_INDEXED_COLLECTIONS as readonly string[]).includes(collectionSuffix)) return [];
  return deriveVectorFilterFields(spaceId, collectionSuffix as VectorIndexedCollection);
}

interface SearchIndexField { type?: string; path?: string; numDimensions?: number }

/**
 * Create or validate the $vectorSearch index for a space collection.
 *
 * The index declares the vector field plus a set of `type:"filter"` fields (P6) so recall can
 * pre-filter natively on the ANN path. When an index already exists, its live definition is compared
 * against the desired one (dimensions AND the filter-field set); a difference triggers an in-place
 * `updateSearchIndex` (falling back to drop+recreate), so a schema change that adds/removes a
 * filterable property re-shapes the index without manual intervention.
 *
 * When `waitForReady` (default), polls for READY status up to 60 seconds; pass false to return
 * immediately and let Atlas finish the build in the background (B1 — the caller confirms READY
 * asynchronously via pollVectorIndexReady).
 */
async function ensureVectorSearchIndex(
  spaceId: string,
  collectionSuffix: VectorIndexedCollection,
  numDimensions: number,
  similarity: string,
  vectorPath: string = 'embedding',
  indexSuffix: string = 'embedding',
  waitForReady: boolean = true,
  filterFields: string[] = [],
): Promise<void> {
  const db = getDb();
  const coll = db.collection(`${spaceId}_${collectionSuffix}`);
  const indexName = `${spaceId}_${collectionSuffix}_${indexSuffix}`;

  const definition = {
    fields: [
      { type: 'vector', path: vectorPath, numDimensions, similarity },
      ...filterFields.map(path => ({ type: 'filter', path })),
    ],
  };

  // List existing search indexes
  let indexes: Array<{ name: string; status?: string; latestDefinition?: { fields?: SearchIndexField[] } }> = [];
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
    const existingFields = existing.latestDefinition?.fields ?? [];
    const existingDims = existingFields.find(f => f.type === 'vector')?.numDimensions
      ?? existingFields[0]?.numDimensions; // tolerate older single-field definitions
    const existingFilters = new Set(existingFields.filter(f => f.type === 'filter').map(f => f.path));
    const desiredFilters = new Set(filterFields);
    const dimsMatch = existingDims === numDimensions;
    const filtersMatch = existingFilters.size === desiredFilters.size
      && [...desiredFilters].every(p => existingFilters.has(p));
    if (dimsMatch && filtersMatch) {
      log.debug(`Vector search index ${indexName} already up to date`);
      return;
    }

    // Definition changed (dimensions or filter fields). Prefer an in-place update — Atlas keeps
    // serving the old definition until the rebuilt one is READY, so recall never goes dark.
    log.warn(
      `Updating vector search index ${indexName} (dims ${existingDims}→${numDimensions}, ` +
      `filter fields ${existingFilters.size}→${desiredFilters.size})`,
    );
    try {
      await coll.updateSearchIndex(indexName, definition);
      if (waitForReady) {
        const ready = await pollVectorIndexReady(spaceId, collectionSuffix, indexName);
        if (!ready) log.warn(`Vector search index ${indexName} did not reach READY within 60s after update`);
      }
      return;
    } catch (err) {
      // updateSearchIndex may be unsupported (older Atlas Local) or reject a dims change — fall
      // back to drop + recreate. This one path DOES leave a brief INITIAL_SYNC gap during which
      // recall on this collection returns empty (handled by the recall error-swallow), which is
      // acceptable for the rare dims change.
      log.warn(`updateSearchIndex failed for ${indexName} (${err}); dropping and recreating`);
      try {
        await coll.dropSearchIndex(indexName);
        await new Promise(r => setTimeout(r, 2000));
      } catch (dropErr) {
        log.warn(`Failed to drop vector search index ${indexName}: ${dropErr}`);
      }
    }
  }

  log.debug(`Creating vector search index ${indexName} (${numDimensions}d, ${similarity}, path: ${vectorPath}, ${filterFields.length} filter field(s))`);
  try {
    await coll.createSearchIndex(asDoc({
      name: indexName,
      type: 'vectorSearch',
      definition,
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
    const filterFields = deriveVectorFilterFields(spaceId, suffix);
    await ensureVectorSearchIndex(spaceId, suffix, embCfg.dimensions, embCfg.similarity, 'embedding', 'embedding', waitForReady, filterFields);
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

    // P6: a change to the type schemas may add or remove filterable `properties.*` paths, so the
    // $vectorSearch indexes must be re-shaped to match. Rebuild off the request path
    // (`waitForReady:false`); `ensureVectorSearchIndex` diffs each index's definition and only
    // touches the ones whose filter-field set actually changed. Gated on the schema genuinely
    // changing so an unrelated meta edit (purpose, tag suggestions) does no index work.
    const schemaChanged = JSON.stringify(prev?.typeSchemas ?? null) !== JSON.stringify(updates.meta.typeSchemas ?? null);
    if (schemaChanged) {
      buildSpaceVectorIndexes(spaceId, false).catch(err =>
        log.warn(`P6: vector filter-field rebuild after schema change on '${spaceId}': ${err}`));
    }
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

  // 1c. Migrate the GLOBAL collections that are keyed by space id.
  //
  // These are not under the `{oldId}_` prefix, so the collection rename above misses them
  // entirely — and for the seq counter that is dangerous, not cosmetic:
  //
  //   `ythril_counters` stores the space's monotonic seq as `_id: <spaceId>`. Losing it
  //   means nextSeq() restarts at 1 — while applySpaceRenameToConfig deliberately carries
  //   the OLD, high `lastSeqPushed` / `lastSeqReceived` watermarks over to the new id. Every
  //   subsequent local write would then get a seq BELOW the watermark, and sync would skip
  //   it forever: the space keeps working locally while silently never pushing to peers.
  //
  // `_id` is immutable in MongoDB, so these are copy-then-delete. Take the MAX of old and
  // any pre-existing counter so a re-run can never move the sequence backwards.
  try {
    const counters = col<{ _id: string; seq: number }>('ythril_counters');
    const oldCounter = await counters.findOne(asFilter<{ _id: string; seq: number }>({ _id: oldId }));
    if (oldCounter) {
      const newCounter = await counters.findOne(asFilter<{ _id: string; seq: number }>({ _id: newId }));
      const seq = Math.max(oldCounter.seq ?? 0, newCounter?.seq ?? 0);
      await counters.replaceOne(
        asFilter<{ _id: string; seq: number }>({ _id: newId }),
        asDoc({ _id: newId, seq }),
        { upsert: true },
      );
      await counters.deleteOne(asFilter<{ _id: string; seq: number }>({ _id: oldId }));
      log.debug(`Migrated seq counter ${oldId} → ${newId} (seq=${seq})`);
    }
  } catch (err) {
    const msg = `Could not migrate the seq counter ${oldId} → ${newId}: ${err}`;
    log.warn(msg);
    errors.push(msg);
  }

  // The duplicate-scanner cursor is keyed `${spaceId}:${type}`. Losing it is harmless
  // (the space simply re-scans from the start) but it leaves orphaned rows behind, so
  // move it across rather than stranding it.
  try {
    const scanState = col<{ _id: string }>('ythril_dupe_scan_state');
    const stale = await scanState
      .find(asFilter<{ _id: string }>({ _id: { $regex: `^${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:` } }))
      .toArray() as Array<Record<string, unknown> & { _id: string }>;
    for (const doc of stale) {
      const moved = { ...doc, _id: `${newId}:${doc._id.slice(oldId.length + 1)}` };
      await scanState.replaceOne(asFilter<{ _id: string }>({ _id: moved._id }), asDoc(moved), { upsert: true });
      await scanState.deleteOne(asFilter<{ _id: string }>({ _id: doc._id }));
    }
  } catch (err) {
    // Non-fatal: worst case the renamed space re-scans for duplicates from scratch.
    log.warn(`Could not migrate the dupe-scan cursor ${oldId} → ${newId}: ${err}`);
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
