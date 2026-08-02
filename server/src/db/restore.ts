/**
 * Database restore utility.
 *
 * Reads NDJSON files produced by dumpDatabase() and restores them into the
 * target MongoDB instance. Each collection is dropped before being restored so
 * the operation is idempotent.
 *
 * Reusable by both the DB migration flow (restore into new instance) and the
 * manual restore feature. Accepts any valid MongoDB URI.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';
import type { DumpManifest } from './dump.js';
import { log } from '../util/log.js';
import { dbNameFromUri } from './db-name.js';

const INSERT_BATCH_SIZE = 500;

/**
 * Restore all collections from srcDir into the given MongoDB URI.
 * Reads manifest.json to determine the collection list and order.
 * Each collection is dropped before inserting the restored documents.
 */
export async function restoreDatabase(uri: string, srcDir: string): Promise<void> {
  const manifestPath = path.join(srcDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as DumpManifest;
  const { collections } = manifest;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });

  try {
    await client.connect();
    const db = client.db(dbNameFromUri(uri));

    for (const { name, count: expectedCount } of collections) {
      const srcFile = path.join(srcDir, `${name}.ndjson`);
      if (!fs.existsSync(srcFile)) {
        log.warn(`restore: ${name}.ndjson not found — skipping`);
        continue;
      }

      // A collection the dump recorded as EMPTY still has to come back.
      //
      // Skipping it left the restored instance without the collection at all: a dump→drop→restore round trip
      // returned three of four collections and reported success. `initSpace` recreates the per-space ones on the
      // next boot, which is why this was survivable and therefore invisible — but a restore that silently
      // returns less than it took is not something to leave resting on a later repair.
      if (expectedCount === 0) {
        await db.createCollection(name).catch(() => {
          // Already there (a restore over a live database) — nothing to do.
        });
        log.debug(`restore: ${name} ← 0 docs (collection created)`);
        continue;
      }

      // Drop existing data before restoring
      await db.collection(name).drop().catch(() => {
        // Ignore "ns not found" — collection may not exist yet on a fresh DB
      });

      const col = db.collection(name);

      let batch: Record<string, unknown>[] = [];
      let insertedCount = 0;

      const rl = readline.createInterface({
        input: fs.createReadStream(srcFile, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Extended JSON, matching the dump. On a pre-existing plain-JSON dump this behaves exactly as
        // `JSON.parse` did — EJSON only reinterprets the `$date`/`$oid` wrappers it wrote itself — so older
        // backups still restore, with their old (string-dated) semantics rather than a hard failure.
        batch.push(EJSON.parse(trimmed) as Record<string, unknown>);

        if (batch.length >= INSERT_BATCH_SIZE) {
          await col.insertMany(batch, { ordered: false });
          insertedCount += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await col.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
      }

      log.debug(`restore: ${name} → ${insertedCount} docs (expected ${expectedCount})`);
    }

    log.info(`restore: complete — ${collections.length} collections restored from ${srcDir}`);
  } finally {
    await client.close().catch(() => {});
  }
}
