/**
 * Atlas $vectorSearch index management for a space's collections.
 *
 * Lifted out of spaces/spaces.ts (A17.7): building/diffing each collection's vector index, polling
 * it to READY, and deriving the filter fields that let a recall use native ANN pre-filtering instead
 * of an exhaustive ENN scan. Cohesive and self-contained — it does not reach back into space
 * lifecycle; spaces.ts calls in, not the other way round.
 */
import { getDb, asDoc } from '../db/mongo.js';
import { getConfig, saveConfig, getEmbeddingConfig, getFaceRecognitionConfig } from '../config/loader.js';
import { resolveMetaRefs } from './schema-validation.js';
import { log } from '../util/log.js';
import type { KnowledgeType } from '../config/types.js';

// Collections that have vector search indexes for semantic recall
export const VECTOR_INDEXED_COLLECTIONS = ['memories', 'entities', 'edges', 'chrono', 'files'] as const;
export type VectorIndexedCollection = typeof VECTOR_INDEXED_COLLECTIONS[number];

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
export function deriveVectorFilterFields(spaceId: string, collectionSuffix: VectorIndexedCollection): string[] {
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
 * Wait — ONCE per process — for the database's search component to answer.
 *
 * `mongot` (the search process inside mongodb-atlas-local) starts AFTER mongod accepts connections, and
 * compose's `depends_on: service_healthy` waits on mongod only. On a cold start, index calls can fail
 * purely because search is not listening yet. The old code treated any such failure as "not Atlas Local",
 * skipped index creation and never retried — permanent, silent loss of semantic recall for the life of
 * that deployment.
 *
 * This gate is deliberately shared and memoized. An earlier version of the fix retried inside
 * `ensureVectorSearchIndex`, which runs once per collection per space — so a cold boot paid the full
 * backoff five times per space and delayed startup enough to break crash-recovery. Waiting once bounds
 * the cost to a single window no matter how many spaces exist.
 */
let searchReadyProbe: Promise<boolean> | null = null;

export function resetSearchReadyProbe(): void { searchReadyProbe = null; }

async function searchAvailable(): Promise<boolean> {
  if (searchReadyProbe) return searchReadyProbe;
  searchReadyProbe = (async () => {
    const ATTEMPTS = 6;
    const BACKOFF_MS = 2_000;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        // Any collection will do — this asks "is search answering at all?", not "does this index exist".
        await getDb().collection('_vectorsearch_probe').listSearchIndexes().toArray();
        return true;
      } catch (err) {
        lastErr = err;
        if (attempt < ATTEMPTS) await new Promise(r => setTimeout(r, BACKOFF_MS));
      }
    }
    log.warn(
      `Database search (\`mongot\`) did not answer after ${ATTEMPTS} attempts ` +
        `(${Math.round((ATTEMPTS * BACKOFF_MS) / 1000)}s): ${lastErr instanceof Error ? lastErr.message : String(lastErr)}. ` +
        `SEMANTIC RECALL WILL RETURN EMPTY until vector indexes are built — rebuild them from ` +
        `Settings → Space → Danger Zone, or POST /api/spaces/<space>/rebuild-indexes. ` +
        `Use mongodb/mongodb-atlas-local for $vectorSearch support.`,
    );
    return false;
  })();
  return searchReadyProbe;
}

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
export async function ensureVectorSearchIndex(
  spaceId: string,
  collectionSuffix: VectorIndexedCollection,
  numDimensions: number,
  similarity: string,
  vectorPath: string = 'embedding',
  indexSuffix: string = 'embedding',
  waitForReady: boolean = true,
  filterFields: string[] = [],
  opts: { force?: boolean } = {},
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
  // One shared wait for search to come up (see searchAvailable) rather than a backoff per collection.
  if (!(await searchAvailable())) return;
  try {
    indexes = await coll.listSearchIndexes().toArray() as typeof indexes;
  } catch (err) {
    // Search answered the probe but not for this collection — report it against the collection that
    // actually failed. The old message hardcoded `_memories` for all five, which sent the diagnosis
    // in the wrong direction for a long time.
    log.warn(
      `Could not list search indexes for ${spaceId}_${collectionSuffix}: ${err instanceof Error ? err.message : String(err)}. ` +
        `Semantic recall will return empty for it until the index is built — rebuild from ` +
        `Settings → Space → Danger Zone, or POST /api/spaces/${spaceId}/rebuild-indexes.`,
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
    // `force`: a caller that has just dropped and recreated the collection (restore) cannot trust this
    // diff. mongot's bookkeeping lags the drop, so the OLD index can still be listed here — the diff
    // then says "already correct", we skip creating, and mongot garbage-collects the stale entry
    // moments later. Result: no index, no error, nothing logged, and recall silently returns empty
    // forever. Measured: that is exactly what happened on the first attempt at the restore fix.
    if (dimsMatch && filtersMatch && !opts.force) {
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
export async function pollVectorIndexReady(
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
export async function buildSpaceVectorIndexes(
  spaceId: string,
  waitForReady: boolean,
  opts: { force?: boolean } = {},
): Promise<void> {
  const embCfg = getEmbeddingConfig();
  // CREATE the collection when it is missing, rather than skipping it. A vector index cannot be built
  // on a collection that does not exist, and these collections are created lazily on first write — so
  // anything skipped here never gets an index at all, and recall for that record type silently returns
  // empty forever. Measured: a space with 22 entities, 10 edges, 2 chrono and 4 files had an index on
  // `memories` alone, because only that collection existed when indexes were last built.
  //
  // An empty collection costs nothing, and creating it up front means every record type is recallable
  // from its first write instead of from the next restart.
  const db = getDb();
  const present = new Set((await db.listCollections().toArray()).map(c => c.name));
  for (const suffix of VECTOR_INDEXED_COLLECTIONS) {
    const collName = `${spaceId}_${suffix}`;
    if (!present.has(collName)) {
      try {
        await db.createCollection(collName);
      } catch (err) {
        // Racing another writer that just created it is fine; anything else means we cannot index it.
        if (!present.has(collName) && !/already exists/i.test(err instanceof Error ? err.message : String(err))) {
          log.warn(`Could not create ${collName} to build its vector index: ${err}`);
          continue;
        }
      }
    }
    const filterFields = deriveVectorFilterFields(spaceId, suffix);
    await ensureVectorSearchIndex(spaceId, suffix, embCfg.dimensions, embCfg.similarity, 'embedding', 'embedding', waitForReady, filterFields, opts);
  }
  const faceCfg = getFaceRecognitionConfig();
  if (faceCfg.enabled) {
    await ensureVectorSearchIndex(spaceId, 'files', 128, 'cosine', 'faceEmbedding', 'faceEmbedding', waitForReady, undefined, opts);
  }
}

/** Poll all of a space's vector-search indexes until READY. Returns true only if every
 *  expected index reached READY within the window. */
export async function waitForSpaceIndexesReady(spaceId: string): Promise<boolean> {
  // Poll CONCURRENTLY. These builds run independently inside the database, so waiting on them one after
  // another only adds up their timeouts: five collections at a 60s ceiling each meant a space could sit
  // at indexStatus='building' for five minutes when every index was in fact ready in seconds. That was
  // masked for as long as only `memories` was ever indexed — fixing that made the serial wait visible.
  const polls = VECTOR_INDEXED_COLLECTIONS.map(suffix =>
    pollVectorIndexReady(spaceId, suffix, `${spaceId}_${suffix}_embedding`),
  );
  if (getFaceRecognitionConfig().enabled) {
    polls.push(pollVectorIndexReady(spaceId, 'files', `${spaceId}_files_faceEmbedding`));
  }
  const results = await Promise.all(polls);
  return results.every(Boolean);
}

/** Background step kicked off by createSpace: wait for the deferred vector-index
 *  builds to reach READY, then flip the space's indexStatus to 'ready' (or 'failed').
 *  A crash before this completes is recovered on the next boot by initAllSpaces. */
export async function finalizeSpaceIndexReady(spaceId: string): Promise<void> {
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
