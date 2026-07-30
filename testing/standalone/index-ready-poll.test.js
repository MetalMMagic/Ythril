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
});
