/**
 * Boot must not block on vector-index READY polling.
 *
 * ## The failure this prevents
 *
 * 2.0.0 added filter fields to the $vectorSearch indexes, so upgrading reshapes every existing one.
 * `initAllSpaces` awaited readiness while doing it, and that wait is **serial per index, per space**,
 * with a 60-second ceiling each:
 *
 *     13 spaces x ~5 indexes x 60s  ≈  65 minutes of blocking startup
 *
 * Reported from a real Kubernetes deployment where it exceeded a 60-minute `startupProbe` budget: the
 * container was killed mid-migration, and a completely healthy upgrade presented as a crash loop. The
 * cost was also being paid for nothing — every poll in that report timed out, warned, and continued, so
 * the guarantee was absent while the delay was certain.
 *
 * ## Why a source-level gate
 *
 * The regression is a single default reverting: `initSpace(spaceId)` instead of
 * `initSpace(spaceId, { waitForVectorReady: false })`. It needs a live MongoDB with Atlas Search to
 * observe behaviourally, so CI would catch it only in the Docker suite, and only as a slow run rather
 * than a failure — the exact signature that let it ship. Pinning the call shape catches it offline, in
 * the second it takes to run.
 *
 * Run: node --test testing/standalone/startup-index-wait.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const LIFECYCLE = readFileSync('server/src/spaces/lifecycle.ts', 'utf8');
const VECTOR = readFileSync('server/src/spaces/vector-index.ts', 'utf8');

/**
 * The body of `initAllSpaces` ONLY — up to its own closing brace at column 0.
 *
 * Not "up to the next export": the background helper below it is not exported, so a looser slice
 * swallowed it, and its `await finalizeSpaceIndexReady(...)` — which is correct, being inside the
 * background worker — failed the very assertion that exists to keep that await OFF the boot path.
 */
function initAllSpacesBody() {
  const lines = LIFECYCLE.split('\n');
  const start = lines.findIndex(l => l.startsWith('export async function initAllSpaces'));
  assert.ok(start >= 0, 'initAllSpaces should exist');
  const end = lines.findIndex((l, i) => i > start && l.replace(/\r$/, '') === '}');
  assert.ok(end > start, 'initAllSpaces should be closed at column 0');
  return lines.slice(start, end + 1).join('\n');
}

describe('startup does not block on index readiness', () => {
  const body = initAllSpacesBody();

  it('initAllSpaces defers the READY poll', () => {
    assert.match(body, /initSpace\(spaceId,\s*\{\s*waitForVectorReady:\s*false\s*\}\)/,
      'initAllSpaces must call initSpace with waitForVectorReady:false — the default is true, and the ' +
      'default is a ~65 minute startup on a 13-space upgrade');
  });

  it('and never awaits readiness inline', () => {
    // The two functions that block. Either one on this path re-creates the stall.
    assert.doesNotMatch(body, /await\s+waitForSpaceIndexesReady/);
    assert.doesNotMatch(body, /await\s+finalizeSpaceIndexReady/);
    assert.doesNotMatch(body, /await\s+pollVectorIndexReady/);
  });

  it('hands readiness to a background pass', () => {
    assert.match(body, /void confirmSpaceIndexesInBackground\(/,
      'readiness must still be confirmed — deferred, not dropped');
    assert.match(LIFECYCLE, /finalizeSpaceIndexReady\(spaceId, \{ timeoutMs: STARTUP_INDEX_READY_TIMEOUT_MS \}\)/);
  });

  it('marks spaces building so the deferred state is visible, not invented', () => {
    // Without this a space whose indexes are still building reports 'ready' and its empty recall results
    // look like data loss rather than a build in progress.
    assert.match(body, /indexStatus = 'building'/);
  });

  it('bounds how many spaces are confirmed at once', () => {
    // One finalize per space, each polling every collection once a second, is ~65 pollers hammering
    // listSearchIndexes — swapping a startup stall for a load spike on the database doing the building.
    assert.match(LIFECYCLE, /FINALIZE_CONCURRENCY\s*=\s*\d+/);
    const conc = Number(/FINALIZE_CONCURRENCY\s*=\s*(\d+)/.exec(LIFECYCLE)?.[1]);
    assert.ok(conc >= 1 && conc <= 8, `concurrency should be a small bound, got ${conc}`);
    assert.match(LIFECYCLE, /Math\.min\(FINALIZE_CONCURRENCY, queue\.length\)/,
      'never spawn more workers than there are spaces');
  });

  it('the background pass cannot take the process down', () => {
    // It is fire-and-forget; an unhandled rejection in a status-label task must not kill a healthy server.
    const at = LIFECYCLE.indexOf('async function confirmSpaceIndexesInBackground');
    assert.ok(at > 0);
    const fn = LIFECYCLE.slice(at, at + 1200);
    assert.match(fn, /try \{[\s\S]*?\} catch \(err\) \{/, 'each space must be individually guarded');
  });
});

describe('the readiness timeout is a parameter, and generous off the boot path', () => {
  it('pollVectorIndexReady accepts a timeout instead of hard-coding 60 attempts', () => {
    assert.match(VECTOR, /opts:\s*\{\s*timeoutMs\?:\s*number\s*\}\s*=\s*\{\s*\}/);
    assert.match(VECTOR, /const attempts = Math\.max\(1, Math\.round\(\(opts\.timeoutMs \?\? 60_000\) \/ 1000\)\)/,
      'the default must stay 60s so existing callers are unchanged');
    assert.doesNotMatch(VECTOR, /attempt < 60;/, 'the hard-coded ceiling should be gone');
  });

  it('waitForSpaceIndexesReady and finalizeSpaceIndexReady thread it through', () => {
    // A timeout accepted at the top and dropped halfway down is the worst kind of knob: it looks
    // configurable and is not.
    assert.match(VECTOR, /pollVectorIndexReady\(spaceId, suffix, `\$\{spaceId\}_\$\{suffix\}_embedding`, opts\)/);
    assert.match(VECTOR, /pollVectorIndexReady\(spaceId, 'files', `\$\{spaceId\}_files_faceEmbedding`, opts\)/);
    assert.match(VECTOR, /waitForSpaceIndexesReady\(spaceId, opts\)/);
  });

  it('startup waits far longer than 60s, because nothing is blocked on it', () => {
    // The old ceiling was short BECAUSE boot was blocked on it — and being short is exactly why it
    // always expired on a real migration and reported `failed` for indexes that were building fine.
    // Matches either idiom on purpose. The reading moved from a raw `Number(process.env[…])` to the validated
    // `envInt(…)` helper, so that a typo stops the boot instead of becoming NaN — and this assertion, which is
    // about the CEILING rather than how it is read, caught the refactor. Keeping both shapes means the next
    // refactor of the same kind does not have to touch a test whose subject has not changed.
    const m = /STARTUP_INDEX_READY_TIMEOUT_MS = (?:Number\(process\.env\['INDEX_READY_TIMEOUT_MS'\] \?\? ([^)]+)\)|envInt\('INDEX_READY_TIMEOUT_MS',\s*([^)]+)\))/
      .exec(LIFECYCLE);
    assert.ok(m, 'startup timeout should be defined and env-overridable');
    m[1] = m[1] ?? m[2];
    // eslint-disable-next-line no-eval
    const ms = eval(m[1].replaceAll('_', ''));
    assert.ok(ms >= 5 * 60_000, `expected a multi-minute ceiling, got ${ms}ms`);
  });
});
