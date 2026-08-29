/**
 * Content-addressed on-disk cache for the benchmark's paid calls.
 *
 * ## The failure this is built against
 *
 * A cache hit that returns an answer produced by a *different* model, a different prompt or a different
 * `maxTokens` is worse than having no cache at all, because the run still completes, the results table still
 * prints, and nothing anywhere says which rows were answered by which model. A slow benchmark is annoying; a
 * benchmark that silently mixes two models into one column is a retraction.
 *
 * So the key is the **whole call**, canonicalised and hashed, and this module refuses every input shape whose
 * JSON form would quietly lose a part of it. `JSON.stringify` drops `undefined` values, turns `NaN` and
 * `Infinity` into `null`, skips symbol-keyed and non-enumerable properties, and runs a class's `toJSON` — five
 * different ways for two distinct calls to arrive at one key. Each of them is refused here by name.
 *
 * ## What it deliberately does not do
 *
 * - **No negative caching.** A throwing `fn` stores nothing. A rate limit or a socket reset cached as a result
 *   would be permanent, and the run that resumes tomorrow would "reproduce" it forever.
 * - **No repair.** A damaged entry throws and names its own path. The rejected alternative — treat a corrupt
 *   file as a miss and re-call — costs real money silently and leaves the corruption in place for the next run
 *   to hit again; `rm <path>` is a smaller inconvenience than an unexplained budget overrun.
 * - **No record of the parts inside the entry.** Storing what produced an entry would make a stale cache far
 *   easier to diagnose, but `withCache` is handed a key and not the parts, and the only way to recover them —
 *   stashing them in a module-level map when `cacheKey` runs — is present or absent depending on whether the
 *   same process happened to build that key. A field that is sometimes there and sometimes not is worse to read
 *   than no field. The caller that wants provenance puts it in the cached VALUE, where it is always true.
 *
 * ## Layout
 *
 *     <dir>/<first two hex of key>/<key>.json
 *
 * 256 shards, so a 100 000-call run leaves ~400 files per directory rather than 100 000 in one — which is the
 * difference between `ls` returning and a directory listing that stalls the machine on every filesystem this
 * repo is developed and tested on.
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

/**
 * Baked into the hashed payload, not just the stored envelope.
 *
 * If the canonicalisation below ever changes meaning, bumping this changes EVERY key, so old entries become
 * unreachable rather than reachable under new rules. Orphaned files are a `rm -rf` the operator can see; an
 * entry read back under a different canonicalisation is a wrong answer nobody can see.
 */
const KEY_FORMAT = 1;

/** Envelope version on disk. Because `KEY_FORMAT` orphans old entries, a mismatch here means corruption. */
const ENTRY_FORMAT = 1;

/** sha256 hex. The pattern is the whole validation: 64 lowercase hex characters cannot contain a path separator
 *  or a `..`, so a caller-supplied key can never address a file outside `dir`. */
const KEY_PATTERN = /^[0-9a-f]{64}$/;

/** Fixed by the key being fixed-length hex — the length check above runs first, so the slice cannot fall short. */
const SHARD_PREFIX_LENGTH = 2;

/**
 * Where the call cache lives, resolved against THIS FILE rather than the working directory.
 *
 * `npm run bench` and `node benchmarks/harness/run.mjs` are invoked from different places, and a cwd-relative
 * default would put the cache somewhere new each time — which does not fail, it just re-spends the budget while
 * reporting a 0% hit rate. Every caller should import this rather than rebuild the path, for the reason
 * `CLAUDE.md` gives: one rule with two implementations, and the weaker one wins silently.
 */
export const DEFAULT_CALL_CACHE_DIR = path.resolve(fileURLToPath(new URL('../.cache/calls', import.meta.url)));

/** hits + misses + coalesced is the number of `withCache` calls; `stores` is how many entries were written. */
const stats = { hits: 0, misses: 0, coalesced: 0, stores: 0 };

/**
 * In-flight calls, keyed by resolved file path.
 *
 * The harness runs several workers at once, and two of them asking for the same key at the same time would both
 * miss and both pay. The map is populated SYNCHRONOUSLY in `withCache` before any `await`, because a check with
 * an await between it and the registration is not a check.
 */
const inFlight = new Map();

// ── Errors ───────────────────────────────────────────────────────────────────

/** A value short enough to belong in an error. Prompts and model outputs are long, and an error that pastes a
 *  whole cache entry is unreadable at exactly the moment someone needs to read it. */
function brief(value) {
  const text = typeof value === 'string' ? JSON.stringify(value) : String(value);
  return text.length <= 80 ? text : `${text.slice(0, 77)}...`;
}

/** A damaged entry names its own path, because the fix is to delete that one file and pay for that one call. */
function corrupt(file, what) {
  return new Error(
    `cache: entry at ${file} is damaged — ${what}. Entries are written atomically, so this is not an ` +
    'interrupted run: the file has been edited, truncated or partially restored. Delete it to re-fetch; ' +
    'the run then pays for that one call again.',
  );
}

// ── cacheKey ─────────────────────────────────────────────────────────────────

/**
 * One canonical JSON text for a value, or a refusal naming the path that has no faithful JSON form.
 *
 * Object keys are sorted; array order is preserved, because an array's order IS its meaning (a message list
 * reordered is a different prompt) while an object's insertion order is not. The sort is the default
 * code-unit order and never `localeCompare`, which would order the same two keys differently on two machines
 * and hand the same call two different keys.
 */
function canonicalise(value, at, seen) {
  if (value === null) return 'null';

  const kind = typeof value;
  if (kind === 'string') return JSON.stringify(value);
  if (kind === 'boolean') return value ? 'true' : 'false';

  if (kind === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `cacheKey: ${at} is ${String(value)}. JSON writes NaN, Infinity and -Infinity all as null, so three ` +
        'distinct parameters — and a real null — would share one key. Pass a string if the value is meaningful.',
      );
    }
    // -0 and 0 are one value in JSON; normalising here says so out loud instead of relying on it.
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (kind === 'undefined') {
    throw new TypeError(
      `cacheKey: ${at} is undefined. JSON.stringify DROPS it, so a call that sets this parameter and a call ` +
      'that omits it would share a key — the invisible wrong hit this cache exists to prevent. Omit the ' +
      'property, or pass null if "unset" is itself a parameter value.',
    );
  }

  if (kind !== 'object') {
    throw new TypeError(
      `cacheKey: ${at} is a ${kind} (${brief(value)}), which has no JSON form. Convert it to a string, a ` +
      'number or a boolean at the call site, so the key records what you meant rather than what survived.',
    );
  }

  if (seen.has(value)) {
    throw new TypeError(`cacheKey: ${at} refers back to a value already inside this key — a cycle has no key.`);
  }
  seen.add(value);

  let text;
  if (Array.isArray(value)) {
    const parts = [];
    for (let i = 0; i < value.length; i++) {
      // A hole in a sparse array serialises as null, which is a real value elsewhere in the same array.
      if (!(i in value)) {
        throw new TypeError(`cacheKey: ${at}[${i}] is a hole in a sparse array; JSON writes it as null.`);
      }
      parts.push(canonicalise(value[i], `${at}[${i}]`, seen));
    }
    text = `[${parts.join(',')}]`;
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      // A Date, a Map, a URL or any class instance. Date and URL have a toJSON, so they would serialise
      // happily — and identically to the plain string a different call site would pass, which is a collision
      // between two different types. Map and Set serialise to `{}`, so every Map shares one key. Refusing all
      // of them costs the caller one conversion line; accepting them costs a wrong answer that looks right.
      throw new TypeError(
        `cacheKey: ${at} is a ${proto?.constructor?.name ?? 'non-plain object'}, not a plain object. Convert ` +
        'it yourself (an ISO string, an array of entries) so the key states the conversion.',
      );
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`cacheKey: ${at} has symbol-keyed properties, which JSON silently omits.`);
    }
    const keys = Object.keys(value).sort();
    if (Object.getOwnPropertyNames(value).length !== keys.length) {
      // Non-enumerable own properties are dropped by JSON exactly like symbol keys are.
      throw new TypeError(`cacheKey: ${at} has non-enumerable own properties, which JSON silently omits.`);
    }
    text = `{${keys.map(k => `${JSON.stringify(k)}:${canonicalise(value[k], `${at}.${k}`, seen)}`).join(',')}}`;
  }

  seen.delete(value);
  return text;
}

/**
 * The hex key for a call. `parts` is every input that could change the answer — provider, model id, the full
 * prompt, and every sampling parameter.
 *
 * A plain object is required and an empty one is refused: a key built from no parts is one entry shared by
 * every call site that forgot to fill it in, and it would report a spectacular hit rate.
 *
 * @param {Record<string, unknown>} parts
 * @returns {string} 64 lowercase hex characters
 */
export function cacheKey(parts) {
  if (parts === null || typeof parts !== 'object' || Array.isArray(parts)) {
    throw new TypeError(
      `cacheKey: parts must be a plain object of named inputs, got ${brief(parts)}. Names, not positions — a ` +
      'positional key changes meaning when a call site inserts an argument, and nothing notices.',
    );
  }
  if (Object.keys(parts).length === 0) {
    throw new TypeError('cacheKey: parts is empty. A key built from no inputs is one entry shared by every call.');
  }
  const payload = `ythril-bench-cache/${KEY_FORMAT}\n${canonicalise(parts, '$', new Set())}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

// ── Paths ────────────────────────────────────────────────────────────────────

/**
 * The file one key maps to. Exported so nothing else re-derives the sharding — a second copy of this rule is
 * how a cache ends up writing to one layout and reading from another.
 *
 * @param {string} dir  cache root; relative paths resolve against the working directory, which is why
 *                      `DEFAULT_CALL_CACHE_DIR` exists
 * @param {string} key  from `cacheKey`
 */
export function cachePathFor(dir, key) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new TypeError(`cache: dir must be a non-empty path, got ${brief(dir)}.`);
  }
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    throw new TypeError(
      `cache: key must be the 64 lowercase hex characters cacheKey() returns, got ${brief(key)}. The cache ` +
      'refuses to sanitise one instead: a key it had to repair is a key two different calls can share.',
    );
  }
  return path.join(path.resolve(dir), key.slice(0, SHARD_PREFIX_LENGTH), `${key}.json`);
}

// ── Read / write ─────────────────────────────────────────────────────────────

/** The stored envelope, or `null` for a miss. Anything other than "absent" is corruption and throws. */
async function readEntry(file, key) {
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return null;
    // EACCES, EISDIR, EIO: the entry may well exist and be readable by someone. Reporting a miss here would
    // re-spend the budget on every run and never mention why.
    throw new Error(`cache: cannot read ${file}: ${err?.message ?? String(err)}`, { cause: err });
  }

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (err) {
    throw corrupt(file, `it is not valid JSON (${err?.message ?? String(err)})`);
  }
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw corrupt(file, 'its top level is not a JSON object');
  }
  if (entry.format !== ENTRY_FORMAT) {
    throw corrupt(file, `it declares format ${brief(entry.format)}, and this build writes ${ENTRY_FORMAT}`);
  }
  // The key is stored as well as encoded in the path, so a file copied, renamed or restored into the wrong
  // shard is caught instead of being served as an answer to a question it never answered.
  if (entry.key !== key) {
    throw corrupt(file, `it holds key ${brief(entry.key)} but was looked up as ${key}`);
  }
  if (!Object.hasOwn(entry, 'value')) {
    throw corrupt(file, 'it has no `value`');
  }
  return entry;
}

/**
 * Best-effort "is there already a committed entry here" probe, used only when a rename has already failed; see
 * `writeEntry`. `isFile` and not merely "exists": a DIRECTORY at the entry's path also fails the rename, and
 * treating that as another worker's win would report a store that no read can ever satisfy.
 */
async function committedFileExists(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    // Deliberately catch-all: if the probe itself fails, the caller rethrows the ORIGINAL rename error, which
    // is the more informative of the two.
    return false;
  }
}

async function writeEntry(file, key, value) {
  const envelope = { format: ENTRY_FORMAT, key, storedAt: new Date().toISOString(), value };

  let text;
  try {
    // Indented: a cache entry is the raw model output, and the run that has to explain a score reads these
    // files by hand. The bytes cost nothing next to the output they wrap.
    text = JSON.stringify(envelope, null, 2);
  } catch (err) {
    throw new Error(
      `cache: the value for ${key} cannot be serialised (${err?.message ?? String(err)}). It was paid for and ` +
      'is not stored — return plain JSON data from the cached function.',
      { cause: err },
    );
  }

  // The value that comes back on a HIT must equal the value the first run returned. A Date, a class instance,
  // an `undefined` property or a NaN survives the first run intact and comes back changed on the second, so two
  // runs of the "same" benchmark score differently and the cache is the only difference between them. This
  // comparison runs on the miss path only — the path that just paid for a network call, next to which it is
  // free — which is why it is a check rather than a documented caveat.
  const roundTripped = JSON.parse(text);
  if (!isDeepStrictEqual(roundTripped.value, value)) {
    throw new Error(
      `cache: the value for ${key} does not survive a JSON round trip, so a cached run would not match a live ` +
      'one. Return plain JSON data (no Date, Map, class instance, undefined property or NaN) from the cached ' +
      'function; the answer was paid for and has NOT been stored.',
    );
  }

  await fs.mkdir(path.dirname(file), { recursive: true });

  // Temp file in the SAME directory, so the rename is a rename and not a cross-device copy — a copy is not
  // atomic, and half of one read back as a hit is the thing this whole dance prevents. pid + uuid because two
  // workers racing on one temp path would produce exactly the interleaved file the atomic write rules out.
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, text, 'utf8');
  try {
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => { /* the rename may have half-succeeded; nothing to clean up then */ });
    // Windows refuses to replace a file another process holds open (EPERM/EACCES/EBUSY). The only writers that
    // collide are two workers holding the same key, and the same key means the same inputs — for a sampled
    // model the two answers differ, but either is an equally valid cached answer to that exact call. Losing
    // ours is correct; failing the run over it is not.
    if (await committedFileExists(file)) return;
    throw new Error(`cache: could not commit ${file}: ${err?.message ?? String(err)}`, { cause: err });
  }
}

// ── withCache ────────────────────────────────────────────────────────────────

async function readOrCall(file, key, fn) {
  const entry = await readEntry(file, key);
  if (entry !== null) {
    stats.hits++;
    return entry.value;
  }
  stats.misses++;

  const value = await fn(); // A throw propagates and stores nothing: see "no negative caching" above.
  if (value === undefined) {
    throw new Error(
      `cache: the function for ${key} returned undefined. A stored undefined is indistinguishable from a miss ` +
      'on read, so the call would be paid for on every run while appearing to be cached. Return null instead ' +
      'if "no result" is the result.',
    );
  }

  await writeEntry(file, key, value);
  stats.stores++;
  return value;
}

/**
 * The cached value for `key`, or `await fn()` stored under it.
 *
 * The store completes before the value is returned, so a run killed the instant after a caller receives an
 * answer has that answer on disk. The rejected alternative — return first, write in the background — makes the
 * resumability this cache exists for depend on how the process happened to die.
 *
 * @param {string} dir       cache root, e.g. `DEFAULT_CALL_CACHE_DIR`
 * @param {string} key       from `cacheKey`
 * @param {() => Promise<unknown>|unknown} fn  invoked only on a miss
 */
export async function withCache(dir, key, fn) {
  const file = cachePathFor(dir, key); // validates both, and touches no disk
  if (typeof fn !== 'function') {
    throw new TypeError(`cache: fn must be a function to call on a miss, got ${brief(fn)}.`);
  }

  // Everything from here to `inFlight.set` is synchronous. An await in between would let a second worker past
  // the check before the first registered, and both would pay.
  const running = inFlight.get(file);
  if (running) {
    stats.coalesced++;
    return running;
  }

  const started = readOrCall(file, key, fn);
  inFlight.set(file, started);
  try {
    return await started;
  } finally {
    // Also on rejection: a failed call must be retryable, not remembered as in flight forever.
    inFlight.delete(file);
  }
}

// ── Stats ────────────────────────────────────────────────────────────────────

/**
 * `{hits, misses, coalesced, stores}` — a snapshot, not the live counters, so a report cannot edit the numbers
 * it is reporting. `coalesced` counts callers that joined a call already in flight; it is neither a hit nor a
 * miss, and folding it into either would misstate what the disk cache did.
 */
export function cacheStats() {
  return { ...stats };
}

/** Additive to the contract: process-wide counters make a test order-dependent without a way to zero them. */
export function resetCacheStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.coalesced = 0;
  stats.stores = 0;
}
