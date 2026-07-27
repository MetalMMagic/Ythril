/**
 * Shared space helpers — the leaf module of the spaces package.
 *
 * Split out of spaces.ts (A17.7 step 2). What lives here is dictated by the call graph, not taste:
 * `repairStaleSpaceIds` (initSpace AND moveSpaceData) and `pendingOpConflictMessage` (removeSpace
 * AND renameSpace) are each needed by both halves, so they cannot live in either. This module
 * imports no sibling — keep it that way or the package gains a cycle.
 */
import type { Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { writeFile as writeSpaceFile } from '../files/files.js';
import { log } from '../util/log.js';
import type { SpaceMeta, KnowledgeType, PendingSpaceOp } from '../config/types.js';

export const SCHEMA_KTS: KnowledgeType[] = ['entity', 'edge', 'memory', 'chrono'];

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

/**
 * Per-space collections `initSpace` creates and indexes.
 *
 * **Add new per-space collections here when you add them.** Omission is silent: the collection still works
 * (Mongo creates it lazily on first insert) but is never explicitly created and never indexed.
 * `contradiction_candidates` shipped that way — no indexes at all, while the Review list filtered and
 * sorted over it — and `file_tombstones` had the same hole before it (see `repairStaleSpaceIds` below).
 */
export const SPACE_COLLECTIONS = ['memories', 'entities', 'edges', 'chrono', 'tombstones', 'conflicts', 'files', 'dupe_candidates', 'contradiction_candidates'] as const;

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

/**
 * Flag/unflag a space as having embeddings from a different model than the config specifies.
 * Set by initSpace's embedding-model check (lifecycle.ts). Exported as a setter so `_reindexNeeded`
 * stays private to this module — sharing the mutable Set across modules invites writes from anywhere.
 */
export function setReindexNeeded(spaceId: string, needed: boolean): void {
  if (needed) _reindexNeeded.add(spaceId);
  else _reindexNeeded.delete(spaceId);
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
    // Prefix match with no boundary check — safe only because a space id cannot contain an underscore
    // (validated `^[a-z0-9-]+$`), so `_` separates unambiguously. See space-id-prefix-safety.test.js.
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
export async function dropLegacyPrefixedIndexes(coll: Collection): Promise<void> {
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

/** Maximum number of previous meta versions kept for history. */
export const META_VERSION_CAP = 20;

/** Generate a URL-safe space ID from a label */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || uuidv4().slice(0, 8);
}

/** Human-readable rejection when a different space op is already mid-flight. */
export function pendingOpConflictMessage(pending: PendingSpaceOp, attempted: string): string {
  const target = pending.type === 'rename' ? `${pending.spaceId} → ${pending.newId}` : pending.spaceId;
  return `Cannot ${attempted}: a ${pending.type} of '${target}' is still pending ` +
    `(started ${pending.startedAt}). It resumes automatically on restart; retry once it clears.`;
}
