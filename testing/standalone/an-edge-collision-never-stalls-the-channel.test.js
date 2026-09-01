/**
 * A duplicate edge triplet must never 500 an ingest — a non-ok push stalls that channel permanently.
 *
 * ## The mechanism, end to end
 *
 * A new edge gets a random `uuidv4()` id (`brain/edges.ts`), and every space carries a UNIQUE index on
 * `{ from, to, label }` (`spaces/lifecycle.ts`). So two peers creating the same relationship independently
 * produce one triplet under two ids. On ingest the incoming `_id` is unknown, the upsert inserts, and the
 * unique index rejects it.
 *
 * The PULL side already absorbs that: `sync/engine.ts` writes with `ordered: false` and swallows 11000 only.
 * **The push side did not**, and it is the worse half:
 *
 *   1. `POST /api/sync/edges` (or the `batch-upsert` edges loop) lets E11000 reach the route's catch → `500`.
 *   2. On the sender, `pushCollection` does `if (!resp.ok) { truncated = true; break; }` — **before**
 *      `seqCursor` is advanced.
 *   3. `resolveWatermark` caps a truncated transfer at `deliveredThrough`, i.e. the last batch that landed.
 *   4. Next cycle re-selects the identical batch and fails identically.
 *
 * The edges channel to that peer never advances again — the exact wedge the pull fix was written to remove,
 * still live on the other side of the same protocol. And in the batch case one duplicate anywhere in a
 * 500-record page discards the other 499 with it.
 *
 * ## Why the assertions are shaped this way
 *
 * The predicate is exercised as a FUNCTION against both real error shapes, because the two differ and a
 * predicate that knew only one would re-throw the very thing it exists to absorb: a single `replaceOne`
 * rejects with `code: 11000` at the top level, while a `bulkWrite` collects them into `writeErrors` and the
 * outer error carries no code at all.
 *
 * Run: node --test testing/standalone/an-edge-collision-never-stalls-the-channel.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { blockAfter, enclosingBlockMatching } from './_structural-window.mjs';

const { isDuplicateKeyOnly } = await import('../../server/dist/api/sync/_shared.js');

const DOCS = 'server/src/api/sync/docs.ts';
const docs = stripComments(readFileSync(DOCS, 'utf8'));

describe('the duplicate-key predicate knows both error shapes', () => {
  it('absorbs a single-write rejection', () => {
    // What `replaceOne` throws: the code is on the error itself.
    assert.equal(isDuplicateKeyOnly({ code: 11000, message: 'E11000 duplicate key' }), true);
  });

  it('absorbs a bulk rejection, where the OUTER error carries no code at all', () => {
    // The shape that catches a predicate written against only `err.code` — it is `undefined` here.
    assert.equal(isDuplicateKeyOnly({ writeErrors: [{ code: 11000 }, { err: { code: 11000 } }] }), true);
  });

  it('re-throws anything else, including a MIXED batch', () => {
    assert.equal(isDuplicateKeyOnly({ code: 121 }), false, 'a validation failure is not a duplicate');
    assert.equal(isDuplicateKeyOnly(new Error('connection reset')), false);
    assert.equal(isDuplicateKeyOnly(undefined), false, 'a thrown non-object must not read as a duplicate');
    assert.equal(
      isDuplicateKeyOnly({ writeErrors: [{ code: 11000 }, { code: 121 }] }), false,
      'ONE non-duplicate in the batch means the whole thing is re-thrown. Swallowing a mixed error would hide '
      + 'genuine corruption, which is the opposite defect and the harder one to find later.',
    );
  });

  it('an empty writeErrors array is not a duplicate', () => {
    // Reached when a driver reports the field but nothing in it. Reading that as "all duplicates" is how a
    // vacuous `.every()` on an empty array silently absorbs an unrelated failure.
    assert.equal(isDuplicateKeyOnly({ writeErrors: [] }), false);
  });
});

describe('every edge ingest absorbs a duplicate triplet', () => {
  /**
   * Each place an edge document is written on an ingest path — derived, not named.
   *
   * The single-record route and the batch loop are two implementations of one rule, and the previous round of
   * work on this fixed the pull and left both of these. A list of two names would go stale the same way.
   *
   * The shape it matches changed in 3.7: the write is now `ingestBrainDoc(...)`, one helper that writes the
   * document and queues its embedding together, so no ingest site calls `replaceOne` itself. The duplicate-key
   * throw still comes from that write and still has to be absorbed by the CALLER — a `try` inside the helper
   * would swallow it there and lose the per-item reporting the batch loop depends on, so the guarantee this
   * gate holds is unchanged and only the pattern it looks for moved.
   */
  function edgeWrites() {
    return [...docs.matchAll(/ingestBrainDoc<EdgeDoc>\(/g)].map(m => m.index);
  }

  /**
   * The try/catch guarding one write — BOTH halves.
   *
   * `enclosingBlockMatching` returns the `try { … }` braces, and `catch (err) { … }` is a SIBLING block, not
   * a child. So a window bounded by the try excludes the catch entirely, which is where every assertion below
   * is actually looking: the first version of this gate failed on a correct fix because it was checking the
   * absorption inside the block that cannot contain it.
   */
  function guardAround(at) {
    const tryBlock = enclosingBlockMatching(docs, at, /\btry\s*\{/, `edge upsert @${at}`);
    if (!tryBlock) return null;
    const start = docs.lastIndexOf(tryBlock, at);
    assert.notEqual(start, -1, `could not re-locate the try block for the write at ${at}`);
    const afterTry = start + tryBlock.length;
    // The catch's own block, taken from just past the try. `blockAfter` finds the next `{`, which is the
    // catch's — bounded by its matching brace rather than by a character count.
    return tryBlock + blockAfter(docs, afterTry, `the catch after ${at}`);
  }

  it('finds the ingest writes, so an empty sweep cannot pass', () => {
    assert.ok(
      edgeWrites().length >= 2,
      `expected the single-record route and the batch loop, found ${edgeWrites().length} edge upsert(s)`,
    );
  });

  it('each one is inside a try that absorbs a duplicate key', () => {
    const unguarded = [];
    for (const at of edgeWrites()) {
      const guard = guardAround(at);
      // The ROUTE-level try does not count: it answers 500, which is the defect. The guard has to be close
      // enough to let the rest of the request — and the rest of the batch — carry on.
      if (!guard || !/isDuplicateKeyOnly/.test(guard)) unguarded.push(at);
    }
    assert.deepEqual(
      unguarded, [],
      'An edge upsert can reject with E11000 when two peers created the same triplet independently. '
      + 'Unabsorbed it becomes a 500, the pushing peer holds its watermark, and it re-sends the identical '
      + 'batch every cycle — that channel never advances again.',
    );
  });

  it('the guard re-throws anything that is not a duplicate', () => {
    // `catch { /* ignore */ }` would pass the assertion above and swallow real corruption.
    for (const at of edgeWrites()) {
      assert.match(
        guardAround(at), /if \(!isDuplicateKeyOnly\(err\)\) throw err;/,
        'the catch must re-throw a non-duplicate rather than absorbing every write fault',
      );
    }
  });

  it('a duplicate is REPORTED, not silently dropped', () => {
    // The owner's P-21 ruling: accept what you can, and hand back what you could not. A duplicate that the
    // sender cannot see is the do-nothing option with extra steps.
    assert.match(docs, /duplicateTriplets/, 'the batch stats must carry a duplicate counter');
    assert.match(
      docs, /status: duplicateTriplet \? 'duplicate' : 'ok'/,
      "the single-record route must answer 'duplicate' rather than 'ok' — a sender that cannot tell them "
      + 'apart advances its watermark believing it delivered a record that was refused',
    );
    for (const at of edgeWrites()) {
      assert.match(guardAround(at), /log\.warn\(/, 'and the operator must get a line naming the triplet');
    }
  });

  it('the response still says 200, so the sender does not stall', () => {
    /*
     * The assertion that actually pins the bug, rather than the mechanism around it.
     *
     * `pushCollection` breaks on `!resp.ok` BEFORE advancing `seqCursor`, and `resolveWatermark` then caps
     * the watermark at the last batch that landed — so any non-2xx here is a permanent stall for that
     * channel, not a retry.
     */
    const at = docs.indexOf("status: duplicateTriplet ? 'duplicate' : 'ok'");
    assert.notEqual(at, -1, 'the duplicate status is gone — re-point this gate');
    /*
     * Read BACKWARDS to the `res.status(` that opens this response, rather than windowing around the anchor.
     *
     * The status is written before the anchor and the call spans several lines
     * (`res.status(200).json(withSchemaViolations(\n  { status: … }, violations,\n));`), so a forward window
     * misses it and a statement window has to survive being entered from inside a nested argument list. The
     * nearest preceding `res.status(` IS the one that carries this body — that is what the assertion means,
     * and saying it directly is stronger than approximating it with a span.
     */
    const statusAt = docs.lastIndexOf('res.status(', at);
    assert.notEqual(statusAt, -1, 'no res.status before the duplicate body — re-point this gate');
    assert.match(
      docs.slice(statusAt, at), /^res\.status\(200\)/,
      'a duplicate must answer 200. A 500 makes the pushing peer hold its watermark and re-send the identical '
      + 'batch every cycle, so the channel never advances again — which is the bug, not the symptom.',
    );
  });
});

describe('the sender still treats a non-ok push as a stall', () => {
  // Pinned because it is the OTHER half of the mechanism and this fix relies on it staying true: if the push
  // loop ever advanced its cursor past a failed batch, a 500 would become silent data loss instead of a
  // visible stall — a different bug, and the reason the fix belongs on the receiving side.
  const engine = stripComments(readFileSync('server/src/sync/engine.ts', 'utf8'));

  it('breaks without advancing the cursor', () => {
    /*
     * Anchored on the push loop's OWN warning, not on `if (!resp.ok)`.
     *
     * There are five `if (!resp.ok)` guards in this file and `indexOf` finds the first — a pull guard several
     * hundred lines above the loop this test is about. It failed with "must mark the transfer truncated"
     * against code that does exactly that, which is the tell for an anchor that landed somewhere else.
     */
    const at = engine.indexOf('truncationWarn(`Batch push');
    assert.notEqual(at, -1, 'the batch-push truncation warning is gone — re-point this gate');
    const block = enclosingBlockMatching(engine, at, /if \(!resp\.ok\) \{/, 'the non-ok push branch');
    assert.ok(block, 'the batch-push warning is no longer inside a non-ok guard — re-point this gate');
    assert.match(block, /truncated = true/, 'a failed push must mark the transfer truncated');
    assert.doesNotMatch(
      block, /seqCursor\s*=/,
      'the cursor must NOT advance past a batch the peer refused — that would turn a visible stall into '
      + 'silent loss',
    );
  });
});
