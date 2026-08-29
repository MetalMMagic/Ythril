/**
 * Dataset pinning and fetch — the only way the harness is allowed to obtain a benchmark corpus.
 *
 * ## Why this exists at all
 *
 * The datasets are PINNED, not vendored. `benchmarks/pins.json` records a URL and a sha256; this module
 * fetches by that URL and refuses to hand back a file whose sha256 is not the pinned one. The cost of the
 * alternative is what makes it non-negotiable: a benchmark that quietly re-fetches a dataset that changed
 * upstream reports numbers for data nobody pinned, and the results table looks exactly the same either way.
 * There is no observable symptom, so the check has to be structural.
 *
 * ## The three rules, and the failure each one prevents
 *
 * 1. **A sha256 mismatch is fatal and names BOTH hashes.** "Checksum failed" tells an operator nothing they
 *    can act on. The pinned hash and the on-disk hash, side by side with the file path, tells them whether
 *    to re-pin (upstream moved) or to delete a corrupt file (local damage). Those are opposite actions.
 * 2. **A mismatch NEVER triggers a re-download.** The tempting recovery — "the file is wrong, fetch it
 *    again" — is precisely the bug: it converts "your data does not match the pin" into "your data now
 *    matches nothing, silently". Re-fetching is a human's decision, expressed by editing `pins.json`.
 * 3. **Verification runs on every load, not only after a fetch.** A fetch-time-only check cannot see a file
 *    that rotted between runs — a truncated write, a half-restored backup, a disk error, an editor that
 *    "helpfully" reformatted 2.8 MB of JSON. Those are exactly the corruptions that survive to the next run
 *    and get scored.
 *
 * ## Cache layout, and why the sha is in the filename
 *
 * `benchmarks/.cache/datasets/<name>-<first 12 of sha256><ext>`.
 *
 * The rejected option was a plain `<name><ext>`. It is friendlier to read, but a deliberate re-pin (a
 * reviewed change to `pins.json`) would then collide with the old file and fail fatally until somebody
 * deleted it by hand — training operators to `rm -rf` the cache, which is the one habit that makes rule 2
 * toothless. With the sha in the name, a re-pin is a clean miss and a fresh download, the old file is never
 * read again because no pin names it, and a mismatch on a hash-named file can only mean corruption or
 * tampering — which is the case that deserves the loud failure.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));

/** `benchmarks/pins.json` — the pin file this harness is built against. */
export const PINS_PATH = resolve(HARNESS_DIR, '..', 'pins.json');

/** Downloads live here. Gitignored via the self-ignoring `.gitignore` written by `ensureCacheDir`. */
export const DATASET_CACHE_DIR = resolve(HARNESS_DIR, '..', '.cache', 'datasets');

/**
 * Bounds the whole transfer in TIME. It is deliberately not a size guard — size is bounded separately by
 * the pinned `bytes`, because a timeout constrains duration and would happily admit a gigabyte delivered
 * quickly. Two different axes, two different guards.
 */
const DOWNLOAD_TIMEOUT_MS = 120_000;

/** A pinned sha256, as written in `pins.json`. Lowercase hex, 64 characters, nothing else accepted. */
const SHA256_RE = /^[0-9a-f]{64}$/;

/** A file extension worth carrying over from the URL, so the cached copy opens in the obvious tool. */
const SAFE_EXT_RE = /^\.[A-Za-z0-9]{1,8}$/;

/**
 * Thrown for rule 1. Carries the parts separately as well as in the message, so a caller that reports
 * machine-readably does not have to parse English back out of an error string.
 */
export class DatasetHashMismatch extends Error {
  constructor({ dataset, expected, actual, path, pinnedBytes, actualBytes }) {
    const sizeLine = pinnedBytes === null || pinnedBytes === undefined
      ? `  size:     ${actualBytes} bytes (no size pinned)`
      : `  size:     ${actualBytes} bytes on disk, ${pinnedBytes} pinned`;
    super(
      `${dataset}: sha256 MISMATCH — this file is not the pinned data, and the harness will not score it.\n` +
      `  pinned:   ${expected}\n` +
      `  on disk:  ${actual}\n` +
      `  file:     ${path}\n` +
      sizeLine + '\n' +
      'Refusing to re-download: a benchmark that re-fetches changed data reports numbers for data nobody pinned.\n' +
      'If upstream genuinely moved, re-pin it deliberately in benchmarks/pins.json (URL, sha256, bytes and the\n' +
      'observed counts, all re-measured). If you believe this is local corruption, delete the file above and\n' +
      're-run — the fetch is then a clean miss against an unchanged pin.'
    );
    this.name = 'DatasetHashMismatch';
    this.dataset = dataset;
    this.expected = expected;
    this.actual = actual;
    this.path = path;
  }
}

/**
 * Parse and structurally check `pins.json`. Throws naming the key that is missing — "invalid pins file" sends
 * an operator to read 60 lines of JSON to find a typo the parser already located.
 *
 * What it does NOT check is whether a given dataset is actually pinned yet: `longmemeval` ships with
 * `sha256: null` because Tier 2 is not pinned, and a Tier 0 run must not be blocked by a Tier 2 placeholder.
 * That check belongs to the point of USE (`fetchDataset`/`verifyDataset`), where refusing is actionable.
 */
export function loadPins(pinsPath = PINS_PATH) {
  let raw;
  try {
    raw = readFileSync(pinsPath, 'utf8');
  } catch (err) {
    throw new Error(`pins.json could not be read at ${pinsPath}: ${err.message}. The harness has no fallback — a run without pins is a run whose data nobody agreed on.`);
  }

  let pins;
  try {
    pins = JSON.parse(raw);
  } catch (err) {
    throw new Error(`pins.json is not valid JSON (${pinsPath}): ${err.message}`);
  }

  if (pins === null || typeof pins !== 'object' || Array.isArray(pins)) {
    throw new Error(`pins.json must be a JSON object, got ${Array.isArray(pins) ? 'an array' : typeof pins} (${pinsPath})`);
  }

  for (const key of ['pinnedAt', 'datasets', 'models']) {
    if (!Object.hasOwn(pins, key)) throw new Error(`pins.json: missing key "${key}" (${pinsPath})`);
  }
  if (typeof pins.pinnedAt !== 'string' || pins.pinnedAt.length === 0) {
    throw new Error(`pins.json: key "pinnedAt" must be a non-empty string, got ${JSON.stringify(pins.pinnedAt)} (${pinsPath})`);
  }
  for (const key of ['datasets', 'models']) {
    const value = pins[key];
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`pins.json: key "${key}" must be an object of entries, got ${JSON.stringify(value)} (${pinsPath})`);
    }
  }

  // Every dataset entry must CARRY these keys, even when their value is null. `null` says "deliberately not
  // pinned yet" and an absent key says "somebody forgot"; collapsing the two would let a half-written pin
  // reach a run and fail later, somewhere less obvious.
  for (const [name, entry] of Object.entries(pins.datasets)) {
    if (name.startsWith('$')) continue; // `$comment` is an established convention in this file, not a dataset.
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`pins.json: datasets.${name} must be an object, got ${JSON.stringify(entry)} (${pinsPath})`);
    }
    for (const key of ['url', 'sha256', 'licence']) {
      if (!Object.hasOwn(entry, key)) throw new Error(`pins.json: missing key "datasets.${name}.${key}" (${pinsPath})`);
    }
  }

  return pins;
}

/** The dataset's entry, or a refusal that lists what IS pinned — a typo'd name is the common case. */
function pinFor(pins, name) {
  if (pins === null || typeof pins !== 'object' || !Object.hasOwn(pins, 'datasets')) {
    throw new Error(`pins object has no "datasets" key — pass the result of loadPins(), not a fragment of it`);
  }
  const entry = pins.datasets[name];
  if (entry === undefined || name.startsWith('$')) {
    const known = Object.keys(pins.datasets).filter(k => !k.startsWith('$')).join(', ');
    throw new Error(`No dataset pinned under the name "${name}". Pinned datasets: ${known || '(none)'}`);
  }
  return entry;
}

/**
 * The pin, checked to the point where it can be acted on: a real URL and a real sha256.
 *
 * Refusing rather than coercing matters most here. `pins.json` carries human placeholders ("TO PIN — Tier 2.
 * Not fetched yet.") and a permissive reading would turn one of those into an HTTP request for a file named
 * `TO%20PIN`, then a 404, then an error about the network — three steps away from the actual cause.
 */
function usablePin(pins, name) {
  const entry = pinFor(pins, name);

  if (entry.sha256 === null) {
    throw new Error(`Dataset "${name}" is not pinned yet: datasets.${name}.sha256 is null. Pin it in benchmarks/pins.json (URL, sha256 measured from the fetched file, bytes, licence and the observed counts) before any run can use it.`);
  }
  if (typeof entry.sha256 !== 'string' || !SHA256_RE.test(entry.sha256)) {
    throw new Error(`Dataset "${name}": datasets.${name}.sha256 must be 64 lowercase hex characters, got ${JSON.stringify(entry.sha256)}`);
  }

  let url;
  try {
    url = new URL(entry.url);
  } catch {
    throw new Error(`Dataset "${name}": datasets.${name}.url is not a URL — got ${JSON.stringify(entry.url)}. A placeholder here means the dataset is not pinned yet.`);
  }
  // http is allowed alongside https because the sha256 is the integrity gate: a tampered plaintext response
  // fails the hash and stops the run. Refusing http would only block an internal mirror, and would buy no
  // integrity that the pin does not already provide. `file:`/`data:` are refused — a pin that reads from the
  // local disk is not a pin, it is whatever happens to be on that machine.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Dataset "${name}": datasets.${name}.url must be http(s), got ${url.protocol}//… — a pin has to name a source outside this machine.`);
  }

  const bytes = entry.bytes ?? null;
  if (bytes !== null && (!Number.isInteger(bytes) || bytes <= 0)) {
    throw new Error(`Dataset "${name}": datasets.${name}.bytes must be a positive integer when present, got ${JSON.stringify(entry.bytes)}`);
  }

  return { name, url, sha256: entry.sha256, bytes };
}

/**
 * Where this dataset's pinned copy lives. Exported because report.mjs and run.mjs both want to state the
 * path, and a second implementation of this join is the defect this repo produces most: one rule, two
 * implementations, the weaker one wins silently.
 */
export function datasetPath(name, { pins = loadPins(), cacheDir = DATASET_CACHE_DIR } = {}) {
  const pin = usablePin(pins, name);
  const ext = extname(pin.url.pathname);
  return join(cacheDir, `${name}-${pin.sha256.slice(0, 12)}${SAFE_EXT_RE.test(ext) ? ext : ''}`);
}

/** sha256 of a file, streamed — LongMemEval is far larger than LoCoMo and readFileSync does not scale to it. */
async function sha256OfFile(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

/**
 * Create the cache directory, and make the whole `.cache` tree invisible to git from the inside.
 *
 * The repository's own `.gitignore` has no `benchmarks/.cache` rule, and this module is not allowed to add
 * one. A self-ignoring `.gitignore` containing `*` is the standard way a tool ignores its own cache without
 * editing the project's rules; without it, the first run leaves a 2.8 MB dataset staged into somebody's
 * "git add -A", which is exactly the redistribution the pinning design exists to avoid.
 */
function ensureCacheDir(cacheDir) {
  mkdirSync(cacheDir, { recursive: true });
  const marker = join(dirname(cacheDir), '.gitignore');
  if (!existsSync(marker)) writeFileSync(marker, '*\n');
}

/** Stream guard on SIZE. Only armed when `bytes` is pinned — inventing a cap for an unpinned dataset would be the coercion this file refuses. */
async function* boundedBy(source, maxBytes, name) {
  let seen = 0;
  for await (const chunk of source) {
    seen += chunk.length;
    if (maxBytes !== null && seen > maxBytes) {
      throw new Error(`Dataset "${name}": the response exceeded the pinned size of ${maxBytes} bytes. Aborting the download rather than filling the disk with something that cannot match the pin anyway.`);
    }
    yield chunk;
  }
}

/**
 * Download to a sibling temp file, then rename into place. The rename is what makes the cache safe to read:
 * a partial download under the real name would be a truncated file that a later run hashes, rejects and
 * reports as corruption, sending the operator hunting for a disk fault that never happened.
 */
async function download(pin, target) {
  const tmp = `${target}.part-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    const res = await fetch(pin.url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`Dataset "${pin.name}": ${pin.url.href} returned HTTP ${res.status} ${res.statusText}. Nothing was cached.`);
    }
    if (!res.body) {
      throw new Error(`Dataset "${pin.name}": ${pin.url.href} returned HTTP ${res.status} with no body.`);
    }
    await pipeline(Readable.fromWeb(res.body), src => boundedBy(src, pin.bytes, pin.name), createWriteStream(tmp));
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }

  const actual = await sha256OfFile(tmp);
  if (actual !== pin.sha256) {
    // The bad download is kept, under a name no pin can ever resolve to, because "the server is serving
    // something else now" and "the transfer broke" look identical from the message alone and only the bytes
    // can tell them apart. A fixed suffix, so repeated attempts leave one artefact rather than a pile.
    const rejected = `${target}.rejected`;
    renameSync(tmp, rejected);
    throw new DatasetHashMismatch({
      dataset: pin.name,
      expected: pin.sha256,
      actual,
      path: rejected,
      pinnedBytes: pin.bytes,
      actualBytes: statSync(rejected).size,
    });
  }

  renameSync(tmp, target);
  return target;
}

/**
 * The pinned local copy of `name`, downloading it only if it is absent.
 *
 * Verifies on EVERY call, cache hit included — that is rule 3, and it is the whole reason this returns a
 * path rather than the caller doing its own `existsSync`. A mismatch throws `DatasetHashMismatch`; it never
 * re-downloads.
 */
export async function fetchDataset(name, { pins = loadPins(), cacheDir = DATASET_CACHE_DIR } = {}) {
  const pin = usablePin(pins, name);
  const target = datasetPath(name, { pins, cacheDir });

  ensureCacheDir(cacheDir);

  if (!existsSync(target)) return download(pin, target);

  const actual = await sha256OfFile(target);
  if (actual !== pin.sha256) {
    throw new DatasetHashMismatch({
      dataset: name,
      expected: pin.sha256,
      actual,
      path: target,
      pinnedBytes: pin.bytes,
      actualBytes: statSync(target).size,
    });
  }
  return target;
}

/**
 * Hash the cached copy and report. Unlike `fetchDataset` this REPORTS a mismatch instead of throwing — it is
 * the function a results file calls to record what it scored, and a report that cannot describe a bad state
 * is not a report.
 *
 * An ABSENT file throws rather than returning `{ok: false, actual: null}`. Never fetched and corrupted on
 * disk call for opposite responses, and a caller that reads only `ok` would treat one as the other.
 */
export async function verifyDataset(name, { pins = loadPins(), cacheDir = DATASET_CACHE_DIR } = {}) {
  const pin = usablePin(pins, name);
  const path = datasetPath(name, { pins, cacheDir });

  if (!existsSync(path)) {
    throw new Error(`Dataset "${name}" has not been fetched — nothing at ${path}. Call fetchDataset(${JSON.stringify(name)}) first; verifyDataset reports on a copy that exists, and cannot report on one that does not.`);
  }

  const actual = await sha256OfFile(path);
  return { ok: actual === pin.sha256, expected: pin.sha256, actual, path, bytes: statSync(path).size };
}
