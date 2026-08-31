/**
 * A link scan that stopped reading says so, and the caller reports it.
 *
 * ## The claim that was not true
 *
 * The commit that bounded the two link scans said hitting the bound *"is reported through the existing
 * `graphTruncated` / `graphComplete` spill"*, and the docblock repeated it. Neither traversal could report it,
 * so a short graph was presented as a whole one — which is worse than the unbounded scan it replaced, because
 * an incomplete answer that says nothing is indistinguishable from a complete one.
 *
 * ## Why the existing signal cannot see it
 *
 * The cursor limit is spent on documents that are then DISCARDED: `.limit(remaining)` runs before
 * `if (visited.has(doc._id)) continue`. A record already emitted at an earlier hop — an ordinary chrono entry
 * naming both an entity and its neighbour — is re-matched by the next hop, consumes a slot, and contributes
 * nothing. The walk then ends BELOW `limit`, and `traverseGraph`'s only truncation signal is
 * `resultNodes.length >= limit`, so it answers `false`. On the recall path the same shortfall keeps the flat
 * list under the inline cap, so no spill is written either.
 *
 * `entitiesLinkedFromRecords` has a second version of it: `remaining` is `limit - out.length` where `out`
 * counts LINKS EMITTED while `.limit()` bounds RECORDS READ, so a few link-dense seeds drive `remaining` to 0
 * and return before a whole later class is read at all.
 *
 * ## The signal this pins
 *
 * "The scan stopped reading" is not "the result filled up", and only the first one is knowable at the cursor.
 * If a cursor returned exactly as many documents as it was allowed, there may be more; if `remaining` reached
 * zero, a whole class went unread. Either way the answer is short and the caller has to be told.
 *
 * Run: node --test testing/standalone/a-capped-link-scan-says-so.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

const read = (p) => stripComments(readFileSync(p, 'utf8'));
const FRONTIER = 'server/src/brain/link-frontier.ts';
const EDGES = 'server/src/brain/edges.ts';
const SPILL = 'server/src/brain/graph-spill.ts';

const SCANS = ['linkedRecordsAtFrontier', 'entitiesLinkedFromRecords'];

describe('a bounded scan reports that it stopped early', () => {
  for (const fn of SCANS) {
    it(`${fn} tells its caller the scan was capped`, () => {
      const body = bodyOf(read(FRONTIER), fn);
      assert.match(body, /scanCapped/,
        `${fn} returns a bare array, so a caller cannot tell a complete answer from a truncated one`);
    });

    it(`${fn} reports an exhausted budget, where a whole class goes unread`, () => {
      /*
       * Returning early because `remaining` reached zero means later link classes were never queried at all.
       * Nothing was discarded, so it does not feel like a truncation — and it is the larger one.
       */
      const body = bodyOf(read(FRONTIER), fn);
      assert.match(body, /remaining === 0[^\n]*scanCapped: true/,
        `${fn} returns on an exhausted budget without saying the answer is short`);
    });

    it(`${fn} counts a FULL cursor as capped, not only an exhausted budget`, () => {
      /*
       * The half that hides. Returning exactly `remaining` documents means the database stopped handing them
       * over — there may be more behind it — and that is true whether or not any of them survived the
       * visited filter. A rule that only fires when `remaining` reaches zero misses every case where the
       * limit was spent on records that were then discarded, which is the reported failure.
       */
      const body = bodyOf(read(FRONTIER), fn);
      assert.match(body, /length\s*===\s*remaining|remaining\s*===\s*\w+\.length/,
        `${fn} does not notice a cursor that came back full, which is the case the bound actually hits`);
    });
  }

  it('both scans are covered — neither is left as the weaker copy', () => {
    // One rule, two implementations, the weaker winning silently is this repo's signature defect, and these
    // two helpers are the same rule twice by construction.
    const src = read(FRONTIER);
    for (const fn of SCANS) {
      assert.match(bodyOf(src, fn), /scanCapped/, `${fn} was left behind`);
    }
  });
});

describe('and the caller turns that into a truncation the API states', () => {
  it('traverseGraph answers truncated when a scan was capped', () => {
    /*
     * Its own signal is `resultNodes.length >= limit` — the result FILLED UP. A capped scan ends below the
     * limit, so without this the walk falls through to `answer(false)` and calls a short neighbourhood
     * complete.
     */
    const body = bodyOf(read(EDGES), 'traverseGraph');
    /*
     * Asserted on the MECHANISM rather than on the identifier appearing somewhere in the body. The first
     * version of this file checked only that `scanCapped` was mentioned, and six of eight mutants survived
     * it — deleting any one propagation left the others, and the word was still there. A gate whose subject
     * is a string it also writes cannot fail.
     */
    assert.doesNotMatch(body, /return answer\(false\)/,
      'the walk still ends by declaring the neighbourhood complete, whatever the scans reported');
    assert.match(body, /return answer\([A-Za-z]*[Cc]apped\)/,
      'the final answer is not derived from whether a scan stopped reading');
    assert.match(body, /hopScanCapped\)\s*scanCapped = true/,
      'a hop that capped does not raise the walk-level flag, so only the last hop could ever be reported');
  });

  it('the recall path carries it too, so both surfaces agree', () => {
    // REST and MCP read the same `spill`, so the fix has to land where they share it rather than on either
    // door — otherwise `graphTruncated` would mean different things depending on which client was used.
    assert.match(bodyOf(read(EDGES), 'traverseRecallSeeds'), /walk\.scanCapped\)\s*scanCapped = true/,
      'the recall traversal drops the signal, so a recall reports a short graph as a whole one');

    /*
     * BOTH of the recall walk's scans, and they are separate code paths: a seed pre-pass that follows a
     * matched record's `entityIds` out to entities, and the per-hop scan. Counting the propagations is what
     * makes deleting either one visible — checking that "capped is set somewhere" passes with one of the two
     * gone, which is the same defect this whole file is about.
     */
    const seeds = bodyOf(read(EDGES), 'traverseFromSeeds');
    assert.equal((seeds.match(/[Cc]apped\)\s*capped = true/g) ?? []).length, 2,
      'one of the recall walk\'s two scans does not raise the flag — the pre-pass and the per-hop scan both must');

    assert.match(bodyOf(read(SPILL), 'buildGraphWithSpill'), /truncated:\s*scanCapped/,
      'a graph short because a scan stopped reading is still reported complete: there is no spill file to '
      + 'derive the flag from, because the missing records are the ones never read');
  });
});
