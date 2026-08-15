/**
 * The running server's version, read once, from one place.
 *
 * ## Why this file exists
 *
 * Two modules already read `server/package.json` themselves — `api/about.ts` for the About payload and
 * `app.ts` for the banner — with different relative paths to the same file. A third reader was about to be
 * added for the embed-job revive, and "one rule, two implementations, and the weaker one wins silently" is
 * the defect this repo produces most. A version string is exactly the kind of thing that goes quietly wrong:
 * a reader resolving the wrong `package.json` gets the ROOT manifest, which usually carries the same number,
 * so it is right until a release where it is not.
 *
 * ## Why it never throws
 *
 * `about.ts` lets a read failure propagate, which is survivable there — the module is imported during route
 * setup. This is also read at boot by a background worker, and taking an instance down because a version
 * string could not be read would be housekeeping killing the service. `unknown` is a legitimate answer: the
 * one caller that compares versions treats it as a value like any other, so a broken read means "revive once
 * and then stop", not a crash and not a loop.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// dist/util → dist → server. The manifest is `server/package.json`, never the repo root's.
const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

function read(): string {
  try {
    const v: unknown = (JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: unknown }).version;
    return typeof v === 'string' && v.length > 0 ? v : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Read once at load — the file cannot change under a running process in any supported deployment. */
export const SERVER_VERSION: string = read();
