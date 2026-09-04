/**
 * Convert a space's array entries into link records — the operator's entry point for `M-2`.
 *
 * Usage, from the repo root, with the server built:
 *
 *     node scripts/convert-links.mjs            # every space this instance holds
 *     node scripts/convert-links.mjs <spaceId>  # one space, and no marker is set
 *
 * Safe to run twice. A link's id is derived from the connection, so a second run recomputes the same ids,
 * finds them already stored, and writes nothing — which also means an interrupted run is fixed by running it
 * again rather than by working out where it stopped.
 *
 * It never removes an array. See `server/src/brain/links-conversion.ts` for why that is a rule and not a
 * conservative default.
 *
 * Reads the same `CONFIG_PATH` and `MONGO_URI` the server does, so point it at the instance you mean.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dist = (p) => pathToFileURL(path.join(process.cwd(), 'server', 'dist', p)).href;

const { loadConfig } = await import(dist('config/loader.js'));
const { connectMongo, closeMongo } = await import(dist('db/mongo.js'));
const { convertSpaceLinks, convertAllLinks } = await import(dist('brain/links-conversion.js'));

loadConfig();
await connectMongo();

const only = process.argv[2];
let reports;
try {
  if (only) {
    // One named space converts but is NOT marked complete: `completeLinkage` says every link in the space is
    // a record, and a single-space run is the shape an operator uses to try one first. Marking it from here
    // would let a partial pass answer for the whole instance.
    reports = [await convertSpaceLinks(only)];
  } else {
    reports = await convertAllLinks();
  }
} finally {
  await closeMongo();
}

let failed = 0;
for (const r of reports) {
  const scanned = Object.entries(r.scanned).map(([c, n]) => `${c}=${n}`).join(' ');
  console.log(`${r.spaceId}: ${scanned} | links added ${r.added} | failed ${r.failed}`);
  failed += r.failed;
}
if (only) console.log('single space: completeLinkage was NOT set — run without an argument to mark the instance.');

// A non-zero exit on failures, so a run inside a deploy step does not report success over a partial walk.
process.exit(failed > 0 ? 1 : 0);
