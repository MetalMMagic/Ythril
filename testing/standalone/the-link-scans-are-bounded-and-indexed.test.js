/**
 * A link scan is bounded by the walk's own cap, and the field it scans is indexed.
 *
 * ## Two defects that compound, which is why one file covers both
 *
 * **Unbounded.** `link-frontier.ts` issued `.find().toArray()` with no `.limit()` — in
 * `linkedRecordsAtFrontier` and again in `entitiesLinkedFromRecords` — once per link class, per member space,
 * per hop. The node cap does not help: it counts HYDRATED records, after the read has already returned
 * everything.
 *
 * **Unindexed.** `spaces/lifecycle.ts` created `entityIds: 1` on **memories only**. Chrono and files, whose
 * `entityIds` the same scans read, had none. So the unbounded reads were also collection scans.
 *
 * ## Why it went from latent to urgent
 *
 * Before 3.6 those scans ran on the standalone `traverse` tool. Recall's expansion learned to follow links,
 * so they now run on the RECALL path — up to 3N more unbounded reads for a depth-N call with all three flags
 * on, against exactly the two collections with no index. And M-2 turns every mention into a record, which
 * multiplies the row count by orders of magnitude against a read bounded by nothing.
 *
 * ## The cap is the walk's own, by the owner's decision
 *
 * 2026-08-30, option A: bound each scan by the number already derived from `topK` and the byte budget, and
 * report hitting it through the existing `graphTruncated` / `graphComplete` spill rather than inventing a
 * second signal. A separate cap would be one rule with two numbers, which is the defect this repo produces
 * most.
 *
 * The accepted cost, stated so it is not re-opened as a surprise: link scans and edge scans share one budget,
 * so a hub with thousands of mentions can crowd out its edge neighbours. If that bites, the fix is a split
 * budget rather than a second cap.
 *
 * Run: node --test testing/standalone/the-link-scans-are-bounded-and-indexed.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

const src = (p) => stripComments(readFileSync(p, 'utf8'));

describe('every link scan is bounded', () => {
  for (const fn of ['linkedRecordsAtFrontier', 'entitiesLinkedFromRecords']) {
    it(`${fn} passes a limit to Mongo`, () => {
      /*
       * `.limit()` on the CURSOR, not a slice afterwards. Reading everything and discarding the tail costs the
       * same scan and the same network transfer — the point is that the database stops early.
       */
      const body = bodyOf(src('server/src/brain/link-frontier.ts'), fn);
      assert.match(body, /\.limit\(/,
        `${fn} reads without a bound, so one hub entity returns its whole mention set per class per space per hop`);
      // Structural, not a guessed gap: the bound must appear BEFORE the cursor is drained, which is what
      // makes it reach Mongo. A `.slice()` after `.toArray()` costs the same scan and the same transfer.
      assert.ok(body.indexOf('.limit(') < body.indexOf('.toArray()'),
        'the bound is applied after the cursor is drained, so the database still returns everything');
    });
  }

  it('the bound is the caller\'s, not a constant chosen here', () => {
    /*
     * The owner's decision. A literal in this module would be a second cap with no relationship to the answer
     * size, and nobody would ever tune it — which is how a short graph comes to read as "few relationships".
     */
    const s = src('server/src/brain/link-frontier.ts');
    assert.match(s, /limit\??\s*:\s*number/,
      'the scan must take its bound from the caller, which is the walk that owns the budget');
    const bodies = ['linkedRecordsAtFrontier', 'entitiesLinkedFromRecords'].map(f => bodyOf(s, f)).join('\n');
    assert.doesNotMatch(bodies, /\.limit\(\s*\d+\s*\)/,
      'a numeric literal here is a second cap, unrelated to topK and the byte budget');
  });

  it('and both traversals pass theirs', () => {
    // A bound the callers do not supply is a default nobody chose. Both walks already know their cap.
    const edges = src('server/src/brain/edges.ts');
    for (const fn of ['traverseGraph', 'traverseFromSeeds']) {
      const body = bodyOf(edges, fn);
      const at = body.indexOf('linkedRecordsAtFrontier(');
      assert.ok(at > 0, `${fn} no longer calls the shared scan — re-point this gate`);
      assert.match(body.slice(at, body.indexOf(')', at) + 1), /limit/,
        `${fn} calls the scan without passing its own cap`);
    }
  });
});

describe('the field every link scan reads is indexed', () => {
  it('all three link collections get an entityIds index at creation', () => {
    /*
     * It was on memories alone. Chrono got startsAt/status/seq/type and files got
     * tags/updatedAt/parentFileId — neither had the field the link scans actually query, so those reads were
     * collection scans on top of being unbounded.
     */
    const life = src('server/src/spaces/lifecycle.ts');
    for (const coll of ['memoriesColl', 'chronoColl', 'filesColl']) {
      assert.match(life, new RegExp(`${coll}\\.createIndex\\(\\{ entityIds: 1 \\}\\)`),
        `${coll} has no entityIds index, so every link scan against it is a collection scan`);
    }
  });

  it('and EXISTING spaces get it too, not just new ones', () => {
    /*
     * The half that bites twice. `initSpace` runs for a space new to the config, so an index added there
     * reaches nobody who already runs the product. `ensureQueryIndexes` is the backfill, and it must widen in
     * the same commit or every existing operator keeps the scan.
     */
    const ensure = src('server/src/spaces/ensure-query-indexes.ts');
    assert.match(ensure, /entityIds/,
      'the backfill still creates only the type index, so no existing space gets the link index');
    assert.match(ensure, /chrono/, 'chrono must be in the backfill');
    assert.match(ensure, /files/, 'files must be in the backfill');
  });

  it('the backfill still reports how many calls it issued', () => {
    // A boot step that returns nothing cannot be asserted to have run, and a silent no-op looks identical to
    // a successful pass. This is why the function returns a count at all.
    const body = bodyOf(src('server/src/spaces/ensure-query-indexes.ts'), 'ensureQueryIndexes');
    assert.match(body, /issued\+\+/, 'the count must include the new indexes, or it under-reports');
    assert.match(body, /return issued/, 'the caller cannot tell the loop ran');
  });
});
