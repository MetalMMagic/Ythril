/**
 * Every async metric collector must be timed — because an untimed one is the one that will own the ten seconds.
 *
 * ## The failure this exists for
 *
 * A canary operator measured `/metrics` hitting its 10-second Prometheus timeout during an embedding run, with
 * `up=0` for two windows. They also took the measurement that **eliminates** the obvious explanation, from the
 * same scrape: event-loop lag mean 0.01006 s, p99 0.01025 s, stddev 0.00012 s. Flat 10 ms. So the handler was
 * awaiting, not hogging — and the candidates are the gauges that gather at scrape time, each walking every
 * space, several of them querying the collection the embedding worker writes to continuously.
 *
 * We cannot reproduce their load, so the instance has to report it. `ythril_metrics_collect_duration_seconds`
 * does that — but only for collectors that actually call the timer, and the next collector somebody adds is the
 * one that will silently not.
 *
 * ## Why this gate is not just "grep for collectTimer"
 *
 * It enumerates the `async collect()` blocks from the source and requires each to have one, so the check scales
 * with the file instead of with a list somebody maintains. The floor matters as much: if the pattern stops
 * matching, an empty offender list would pass while checking nothing.
 *
 * Run: node --test testing/standalone/collectors-are-timed.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/metrics/registry.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');
const lines = src.split(/\r?\n/);

/** `{ line, metric, timed }` for every async collector in the registry. */
function collectors() {
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== 'async collect() {') continue;
    let metric = null;
    for (let j = i; j >= 0 && j > i - 12; j--) {
      const m = lines[j].match(/name: '(ythril_[a-z_]+)'/);
      if (m) { metric = m[1]; break; }
    }
    // The timer must be the FIRST statement: a collector that starts timing after its first await measures the
    // wrong thing, and measuring the wrong thing is worse here than not measuring.
    found.push({ line: i + 1, metric, timed: lines[i + 1]?.includes('collectTimer(') === true });
  }
  return found;
}

describe('every async metric collector is timed', () => {
  it('found the collectors — the pattern still matches', () => {
    const all = collectors();
    assert.ok(all.length >= 8, `only found ${all.length} async collectors in ${SRC}`);
    assert.ok(all.every(c => c.metric !== null), 'a collector has no metric name above it');
  });

  it('each one starts a timer as its first statement', () => {
    const untimed = collectors().filter(c => !c.timed).map(c => `${SRC}:${c.line} (${c.metric})`);
    assert.deepEqual(untimed, [], 'these gather at scrape time without recording how long they took, so a slow '
      + `scrape cannot name them:\n  ${untimed.join('\n  ')}\n\n`
      + "Add `const done = collectTimer('<name>');` as the first line and `done();` before the closing brace.");
  });

  it('each one records the elapsed time before returning', () => {
    // A started timer that is never stopped observes nothing — the histogram would stay empty and look like a
    // collector that is instantly fast.
    const starts = (src.match(/collectTimer\(/g) ?? []).length;
    const stops = (src.match(/^\s*done\(\);$/gm) ?? []).length;
    assert.equal(stops, starts - 1, `${starts - 1} timer start(s) in collectors but ${stops} done() call(s) `
      + '(one collectTimer occurrence is the helper definition itself)');
  });

  it('the histogram can describe a scrape that timed out', () => {
    // Prometheus times out at 10 s by default. A top bucket at or below that cannot express the failure, so the
    // graph would show everything in `+Inf` and say nothing about how bad it got.
    const m = src.match(/name: 'ythril_metrics_collect_duration_seconds'[\s\S]{0,400}?buckets: \[([^\]]+)\]/);
    assert.ok(m, 'the collector-duration histogram or its buckets are missing');
    const buckets = m[1].split(',').map(s => Number(s.trim()));
    assert.ok(Math.max(...buckets) > 10, `top bucket is ${Math.max(...buckets)}s — it must exceed the 10s timeout`);
    assert.ok(Math.min(...buckets) <= 0.05, 'needs a fast bucket too: a healthy collector is ~25 ms');
  });

  it('is documented, like every other metric family', () => {
    const docs = readFileSync(join(ROOT, 'docs/integration-guide/11-setup-api.md'), 'utf8');
    assert.match(docs, /ythril_metrics_collect_duration_seconds/);
  });
});
