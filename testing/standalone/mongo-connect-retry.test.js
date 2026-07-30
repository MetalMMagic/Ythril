/**
 * The first MongoDB connection retries a database that is not up YET, and only that.
 *
 * ## The failure this fixes, finally diagnosed
 *
 * `ythril-* exited (1)` failed CI three times across this release and was carried in the notes as "still
 * undiagnosed", twice because the log dump skipped the dead container. With that fixed, the container's
 * own log said it in one line:
 *
 *     Fatal startup error: MongoNetworkError: read ECONNRESET
 *
 * Compose waits on the Mongo container's healthcheck, and that healthcheck passes while mongod/mongot is
 * still finishing startup — so the very first driver connection has its socket reset mid-handshake. One
 * attempt, one rejection, `main().catch` exits 1, and a completely healthy stack fails to come up.
 * Whichever instance lost the race died, which is why it moved between `ythril-b` and `ythril-d` and read
 * as a flake rather than a bug.
 *
 * `serverSelectionTimeoutMS` does not cover this. That governs *selecting* a server; an ECONNRESET during
 * the handshake rejects immediately regardless.
 *
 * ## The part that needs a test rather than a comment
 *
 * Retrying everything would be worse than not retrying. A wrong password will never succeed, and thirty
 * seconds of quiet retries turns an immediate, obvious "bad credentials" into a boot that appears to
 * hang. The classifier is the whole design, so it is what is pinned here.
 *
 * Run: node --test testing/standalone/mongo-connect-retry.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('server/src/db/mongo.ts', 'utf8');

/**
 * The classifier, lifted out of the source and evaluated.
 *
 * Reimplementing the rules in the test would only prove the test agrees with itself — the storage-quota
 * bug in this same release survived precisely because a spec and a type were consistently wrong
 * together. This runs the real function body.
 */
function loadClassifier() {
  const setAt = SRC.indexOf('const TRANSIENT_CONNECT_ERRORS');
  assert.ok(setAt > 0, 'TRANSIENT_CONNECT_ERRORS should exist');
  const setSrc = SRC.slice(setAt, SRC.indexOf(']);', setAt) + 3);

  const fnAt = SRC.indexOf('function isTransientConnectError');
  assert.ok(fnAt > 0, 'isTransientConnectError should exist');
  const fnSrc = SRC.slice(fnAt, SRC.indexOf('\n}', fnAt) + 2)
    // Strip just enough TypeScript to run it: the parameter type, the return type, and the cast.
    // Anything more elaborate would risk the test evaluating something other than the real rules.
    .replace(/^function (\w+)\(err: unknown\): boolean \{/, 'function $1(err) {')
    .replace(/\(err as \{ name\?: string \} \| null\)/g, 'err');

  // eslint-disable-next-line no-new-func
  return new Function(`${setSrc}\n${fnSrc}\nreturn isTransientConnectError;`)();
}

const isTransient = loadClassifier();
const err = (name) => Object.assign(new Error('x'), { name });

describe('which connect failures are retried', () => {
  describe('retried — the database is there but not ready', () => {
    for (const name of ['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongoTopologyClosedError']) {
      it(name, () => assert.equal(isTransient(err(name)), true));
    }
  });

  describe('NOT retried — waiting cannot help', () => {
    // Retrying these for the full budget replaces a clear immediate error with a slow mysterious one.
    it('MongoServerError (bad credentials)', () => assert.equal(isTransient(err('MongoServerError')), false));
    it('MongoParseError (malformed URI)', () => assert.equal(isTransient(err('MongoParseError')), false));
    it('a plain Error', () => assert.equal(isTransient(err('Error')), false));
    it('null', () => assert.equal(isTransient(null), false));
    it('undefined', () => assert.equal(isTransient(undefined), false));
  });
});

describe('the retry loop itself', () => {
  it('is bounded by a budget, not by an attempt count alone', () => {
    // An attempt count with growing backoff has no predictable ceiling; a deadline does, which is what
    // an orchestrator's startup budget has to be sized against.
    assert.match(SRC, /CONNECT_RETRY_BUDGET_MS = Number\(process\.env\['MONGO_CONNECT_RETRY_MS'\] \?\? 30_000\)/);
    assert.match(SRC, /Date\.now\(\) >= deadline/);
  });

  it('closes the failed client before making another', () => {
    // Each MongoClient carries a topology and timers. Looping without closing leaks one per attempt, so
    // a database that is down for the whole budget leaves a pile of live monitors behind.
    const at = SRC.indexOf('export async function connectMongo');
    const body = SRC.slice(at, at + 2000);
    assert.match(body, /await _client\.close\(\)\.catch\(/);
  });

  it('backs off with jitter and a ceiling', () => {
    // Jitter because four instances start together and would otherwise retry in lockstep against the
    // database they are all waiting for — the exact herd `util/backoff.ts` exists to break up.
    assert.match(SRC, /withJitter\(delay\)/);
    assert.match(SRC, /Math\.min\(delay \* 2, 4_000\)/);
  });

  it('says it recovered, so a slow start is not silently indistinguishable from a fast one', () => {
    assert.match(SRC, /MongoDB connected after \$\{attempt\} attempts/);
    assert.match(SRC, /MongoDB not ready yet/);
  });
});
