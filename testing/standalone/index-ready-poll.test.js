/**
 * The index-readiness poll must list search indexes UNFILTERED and match by name.
 *
 * ## The evidence
 *
 * A deployment reported **~67 seconds per index on an instance with almost no data** — the same cost as
 * one with thirteen full spaces. Five spaces in, 24 indexes, ~27 minutes. A build that is genuinely
 * instant cannot take a fixed 67s. That is the 60s timeout expiring every single time, which means the
 * poll never observed READY at all, on indexes that were fine.
 *
 * The cause is one overload. `ensureVectorIndex` lists **without** a filter and finds by name, and that
 * call demonstrably works — it is how an existing index is detected for the update path. The two callers
 * that used `listSearchIndexes(indexName)` are exactly the two that misbehaved:
 *
 *   - `pollVectorIndexReady` — never saw READY, so every wait ran to timeout.
 *   - `pipeline-status` — `found[0]?.status` was always null, and `deriveLiveIndexState` turns a null
 *     status into **missing**, so the Indexing panel declared every index absent on a healthy instance.
 *
 * Listing all and matching by name is a strict superset of the filtered behaviour, so it cannot be worse
 * on a deployment where the filter did work.
 *
 * ## Why a source-level gate
 *
 * Reproducing it needs a live mongot that behaves this way, which CI's Atlas Local may or may not. The
 * regression is a one-token change back to the filtered overload, and its symptom is a *slow* run rather
 * than a failing one — the signature that let it survive two rounds of investigation.
 *
 * Run: node --test testing/standalone/index-ready-poll.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = 'server/src';

function sources(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`;
    if (statSync(p).isDirectory()) { sources(p, out); continue; }
    if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

/** Source with comment lines stripped — the fix is explained in comments that name the banned call. */
function codeOf(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
    .join('\n');
}

describe('search-index listing is never name-filtered', () => {
  it('no caller passes a name to listSearchIndexes', () => {
    const offenders = [];
    for (const f of sources()) {
      const code = codeOf(f);
      code.split('\n').forEach((line, i) => {
        // Anything other than an empty argument list.
        const m = /listSearchIndexes\(\s*[^)\s]/.exec(line);
        if (m) offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
      });
    }
    assert.deepEqual(offenders, [],
      'the name-filtered overload returned nothing on a real deployment, so readiness polls ran to ' +
      'timeout every time and the index panel reported every index missing. List unfiltered and match ' +
      'by name:\n' + offenders.join('\n'));
  });

  it('the poll matches by name and accepts queryable as ready', () => {
    const src = readFileSync(`${ROOT}/spaces/vector-index.ts`, 'utf8');
    const at = src.indexOf('export async function pollVectorIndexReady');
    assert.ok(at > 0);
    const body = src.slice(at, at + 3000);
    assert.match(body, /all\.find\(i => i\.name === indexName\)/);
    // `queryable` is the property recall actually depends on; a mongot reporting it without a READY
    // status would otherwise poll forever.
    assert.match(body, /current\.status === 'READY' \|\| current\.queryable === true/);
  });

  it('the poll reports WHAT it saw, not just that it gave up', () => {
    // Two rounds of this bug produced no evidence about the cause, because the poll swallowed every
    // observation and logged only "did not reach READY within 60s". The operator could see the cost and
    // never the reason.
    const src = readFileSync(`${ROOT}/spaces/vector-index.ts`, 'utf8');
    assert.match(src, /lastSeen/);
    assert.match(src, /still waiting after/);
    assert.match(src, /gave up after/);
    assert.match(src, /index not present/,
      '"index missing" and "index not ready" are different failures and must not read the same');
  });

  it('pipeline-status lists each collection once, not once per expected index', () => {
    // `files` carries two indexes (embedding + faceEmbedding); listing it per-entry doubled the mongot
    // round-trips for no benefit.
    const src = readFileSync(`${ROOT}/api/pipeline-status.ts`, 'utf8');
    assert.match(src, /byCollection/);
    assert.match(src, /all\.find\(i => i\.name === e\.indexName\)/);
  });

  it('a backend that reports NO lifecycle fields is probed, not failed', () => {
    // The 2.2.1 report. On a self-hosted replica set the index document is found by name and carries
    // neither `status` nor `queryable` — their log said `status=undefined queryable=undefined`, which
    // is only reachable AFTER the name match. The exit condition was `status === 'READY' || queryable
    // === true`, so that backend could never satisfy it: 600 s per index, then every space on a
    // five-instance fleet marked failed while recall returned genuine scores and /ready passed.
    //
    // Absence of a status field is not evidence of an unready index. It is the same mistake the
    // model-enumeration check used to make one layer up, where "not listed" was read as "not present".
    const src = readFileSync(`${ROOT}/spaces/vector-index.ts`, 'utf8');
    assert.match(src, /current\.status === undefined && current\.queryable === undefined/,
      'the poll must recognise a backend that reports neither field');
    assert.match(src, /await indexServes\(/,
      'and answer the question directly instead of waiting for a field that will never arrive');
  });

  it('the probe asks the question recall asks', () => {
    // Not a metadata read dressed up as a probe: it runs `$vectorSearch` against the index by name. That
    // is what recall depends on, and it is Verify's philosophy applied one layer down — send one real
    // request rather than infer from a status field.
    const src = readFileSync(`${ROOT}/spaces/vector-index.ts`, 'utf8');
    const fn = src.slice(src.indexOf('async function indexServes'), src.indexOf('async function indexServes') + 900);
    assert.match(fn, /\$vectorSearch/, 'the probe must be a real vector query');
    assert.match(fn, /index: indexName/, 'against the index being polled, by name');
    assert.match(fn, /limit: 1/, 'and cheap — this is a liveness question, not a search');
  });

  it('the probe runs ONLY when both fields are absent', () => {
    // A backend that does report them must pay nothing. The reporter's platform instance has 65 indexes;
    // a probe each at boot is not free, and the cheap path is still correct where it works.
    const src = readFileSync(`${ROOT}/spaces/vector-index.ts`, 'utf8');
    const readyExit = src.indexOf("current.status === 'READY' || current.queryable === true");
    const probeGuard = src.indexOf('current.status === undefined && current.queryable === undefined');
    assert.ok(readyExit > 0 && probeGuard > readyExit,
      'the fast path must be tried first, and the probe reached only when neither field is present');
  });

  it('the boot summary cannot claim success while a space failed', () => {
    // `Vector index readiness confirmed for all spaces.` printed unconditionally — on their deployment,
    // immediately after two lines saying the opposite. A log that contradicts itself two lines apart
    // does not merely fail to inform; it teaches the operator that this log is not worth reading.
    // Comments stripped first: the prose ABOVE the fix quotes the old wording, so a naive search
    // finds the explanation rather than the code and reports the fix as missing.
    const src = readFileSync(`${ROOT}/spaces/lifecycle.ts`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const at = src.indexOf('readiness confirmed for all');
    assert.ok(at > 0, 'the summary line should still exist for the all-good case');
    const before = src.slice(Math.max(0, at - 400), at);
    assert.match(before, /failed\.length === 0/,
      'the success wording must be conditional on nothing having failed');
    assert.match(src, /did not reach ready for \$\{failed\.length\}/,
      'and the failure case must name how many, and which');
  });
});
