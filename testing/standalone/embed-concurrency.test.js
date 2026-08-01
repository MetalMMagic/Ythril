/**
 * Chunk-embed concurrency is sized per embedder, because the two are different problems.
 *
 * ## What was measured, inside the shipped image
 *
 * One in-process chunk embed (~1.8 KB) takes ~208 ms and blocks the event loop for essentially all of it.
 * Eight of them at once, which is what shipped:
 *
 *     conc 8, no yield   total 4730ms   loop lag max 2482ms   50ms-timer fired 1 time in 4.7s
 *     conc 2, yield      total 3677ms   loop lag max  547ms   fired 8 times
 *
 * So the old shape was **22% slower AND blocked the loop for 2.5 s at a stretch** — eight concurrent
 * CPU-bound inferences on a capped allocation thrash rather than parallelise. On a reporting fleet, a 358 KB
 * document turned into repeated liveness kills: `Readiness probe failed: context deadline exceeded (awaiting
 * headers)`, no error, no `failed` status, ~190 MiB of a 10 Gi limit. Nothing pointed at the document.
 *
 * ## Why not sized from the core count
 *
 * `os.availableParallelism()` reports the HOST's cores, not the cgroup limit. The reporting deployment is
 * capped at 4 CPU on a 16-core node — core detection would have "left headroom" of 15 and oversubscribed
 * exactly as before. That is why the in-process default is a conservative constant with an operator override,
 * and this file pins that reasoning as behaviour.
 *
 * Run: node --test testing/standalone/embed-concurrency.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let embedConcurrency, IN_PROCESS_EMBED_CONCURRENCY, EXTERNAL_EMBED_CONCURRENCY, MAX_EMBED_CONCURRENCY;

describe('embedConcurrency', () => {
  before(async () => {
    ({ embedConcurrency, IN_PROCESS_EMBED_CONCURRENCY, EXTERNAL_EMBED_CONCURRENCY, MAX_EMBED_CONCURRENCY } =
      await import('../../server/dist/files/converters/embed-concurrency.js'));
  });

  it('is LOW for the bundled in-process model — it is CPU-bound and shares the loop', () => {
    assert.equal(embedConcurrency({}), IN_PROCESS_EMBED_CONCURRENCY);
    assert.equal(embedConcurrency({ baseUrl: '' }), IN_PROCESS_EMBED_CONCURRENCY);
    assert.equal(embedConcurrency({ baseUrl: '   ' }), IN_PROCESS_EMBED_CONCURRENCY,
      'whitespace is not an endpoint');
    assert.equal(embedConcurrency({ baseUrl: null }), IN_PROCESS_EMBED_CONCURRENCY);
    assert.ok(IN_PROCESS_EMBED_CONCURRENCY < EXTERNAL_EMBED_CONCURRENCY, 'the whole point of the split');
  });

  it('is HIGHER for an external endpoint — the work is on another host', () => {
    assert.equal(embedConcurrency({ baseUrl: 'http://emb:8080' }), EXTERNAL_EMBED_CONCURRENCY);
    assert.equal(embedConcurrency({ baseUrl: 'https://api.example.com/v1' }), EXTERNAL_EMBED_CONCURRENCY);
  });

  it('honours an operator override for either embedder', () => {
    assert.equal(embedConcurrency({ embedConcurrency: 6 }), 6);
    assert.equal(embedConcurrency({ baseUrl: 'http://emb:8080', embedConcurrency: 1 }), 1);
  });

  it('NEVER returns zero or a negative, whatever is configured', () => {
    // A zero would stall ingestion completely — a worse failure than a slow one, and the kind that reads as
    // "uploads do nothing" with no error anywhere.
    for (const v of [0, -1, -100, 0.4]) {
      assert.ok(embedConcurrency({ embedConcurrency: v }) >= 1, `override ${v}`);
    }
  });

  it('clamps an absurd override rather than obeying it', () => {
    assert.equal(embedConcurrency({ embedConcurrency: 5000 }), MAX_EMBED_CONCURRENCY);
  });

  it('ignores a non-numeric or non-finite override and uses the default', () => {
    for (const v of [undefined, NaN, Infinity, '8']) {
      assert.equal(embedConcurrency({ embedConcurrency: v }), IN_PROCESS_EMBED_CONCURRENCY, String(v));
    }
  });

  it('floors a fractional override instead of passing it to a loop bound', () => {
    assert.equal(embedConcurrency({ embedConcurrency: 3.9 }), 3);
  });
});
