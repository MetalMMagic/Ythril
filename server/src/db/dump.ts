/**
 * Database dump utility.
 *
 * Streams all collections from the MongoDB database specified in the URI to a
 * directory as NDJSON files (one JSON document per line). Writes a manifest.json
 * describing the dump.
 *
 * Designed to be reusable by both the DB migration flow and the manual backup
 * feature (issue #82). Accepts any valid MongoDB URI — does not reuse the
 * server's live connection singleton so it can dump from any instance.
 *
 * Output layout:
 *   <destDir>/manifest.json          — metadata
 *   <destDir>/<collection>.ndjson    — one per collection
 *
 * Note: Only MongoDB data is dumped. Files stored in /data/files are NOT
 * included. A complete backup requires a separate copy of the /data/files
 * directory.
 */
import fs from 'node:fs';
import { FILE_MODE, mkdirPrivateSync } from '../util/fs-modes.js';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';
import { log } from '../util/log.js';
import { dbNameFromUri } from './db-name.js';

const MANIFEST_VERSION = 1 as const;
const CURSOR_BATCH_SIZE = 500;

export interface DumpManifest {
  version: typeof MANIFEST_VERSION;
  ythrilVersion: string;
  createdAt: string;
  sourceUriRedacted: string;
  collections: Array<{ name: string; count: number }>;
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@]+@/, '//[credentials]@');
}

/**
 * Dump all collections from the given MongoDB URI into destDir.
 * Creates destDir if it does not exist.
 * Returns the manifest describing the dump.
 */
export async function dumpDatabase(uri: string, destDir: string): Promise<DumpManifest> {
  // 0700, and 0600 on every file below.
  //
  // A dump is a COMPLETE PLAINTEXT COPY of the database — every memory, entity, edge, chrono entry, file-meta
  // record and audit entry, as NDJSON. It is written by reading THROUGH mongod, so an encrypted `mongod` (the
  // mitigation `02-hosting.md` recommends for brain data) protects nothing here: the dump comes out decrypted.
  //
  // These directories were created with default permissions — typically 0755, with 0644 files — while the app's
  // own state files have always been written 0600. So the least sensitive thing on the volume was the best
  // protected. Found by the Privacy audit lens.
  //
  // This is a tightening only: the owning process is the sole reader, and `restoreDatabase` runs as the same user.
  mkdirPrivateSync(destDir);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });

  try {
    await client.connect();
    const db = client.db(dbNameFromUri(uri));

    const collectionInfos = await db.listCollections().toArray();
    const collectionNames = collectionInfos
      .map(c => c.name)
      .filter(n => !n.startsWith('system.'))
      .sort();

    const manifestCollections: DumpManifest['collections'] = [];

    for (const name of collectionNames) {
      const col = db.collection(name);
      const destFile = path.join(destDir, `${name}.ndjson`);
      const stream = fs.createWriteStream(destFile, { encoding: 'utf8', mode: FILE_MODE });

      let count = 0;
      const cursor = col.find({}).batchSize(CURSOR_BATCH_SIZE);

      try {
        for await (const doc of cursor) {
          // Extended JSON, not `JSON.stringify`.
          //
          // NDJSON has no date type, so a plain stringify wrote `_expireAt` as a string — and on restore it came
          // back a string. The TTL index only matches BSON dates, so every record the operator asked to expire
          // silently became permanent, for as long as that instance ran. Nothing errors; the retention policy
          // just stops applying, and only after a restore.
          //
          // `EJSON.stringify` in relaxed mode keeps numbers and strings looking like ordinary JSON (so a dump
          // stays readable and greppable) while wrapping the types JSON cannot express — `{"$date": …}` for a
          // Date, `{"$oid": …}` for an ObjectId. `EJSON.parse` reverses it, and on a pre-existing plain-JSON dump
          // it behaves exactly as `JSON.parse` did, so old backups still restore with their old semantics.
          stream.write(EJSON.stringify(doc, { relaxed: true }) + '\n');
          count++;
        }
      } finally {
        await cursor.close().catch(() => {});
      }

      // Flush the write stream
      await new Promise<void>((resolve, reject) => {
        stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
      });

      manifestCollections.push({ name, count });
      log.debug(`dump: ${name} → ${count} docs`);
    }

    const ythrilVersion = process.env['npm_package_version'] ?? 'unknown';

    const manifest: DumpManifest = {
      version: MANIFEST_VERSION,
      ythrilVersion,
      createdAt: new Date().toISOString(),
      sourceUriRedacted: redactUri(uri),
      collections: manifestCollections,
    };

    fs.writeFileSync(
      path.join(destDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );

    log.info(`dump: complete — ${manifestCollections.length} collections in ${destDir}`);
    return manifest;
  } finally {
    await client.close().catch(() => {});
  }
}
