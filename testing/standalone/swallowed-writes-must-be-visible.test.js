/**
 * A write whose failure is swallowed must at least be VISIBLE.
 *
 * ## The shape, which this cycle produced four times
 *
 * An operation fails and reports success. `publish.yml` pushed images and created no GitHub Release for six
 * versions. `query` returned an envelope and dropped every row. The media worker made a paid model call and
 * silently discarded its result. Each one is the same thing: the work happened, the result did not land, and
 * the absence is indistinguishable from "there was nothing to write".
 *
 * ## Why this gate is narrow on purpose
 *
 * A sweep for `catch` with no handler finds **118 sites** in `server/src`, and the great majority are
 * correct — cleanup, optional reads, probes, best-effort niceties. A gate over all of them would be noise
 * that gets suppressed, which is worse than no gate.
 *
 * So it asks a narrower question, of one file: in the MEDIA WORKER, where a swallowed write means a paid
 * model call is lost or a record is stranded mid-status, does every swallow either LOG or say in a comment
 * why it does not need to? Both of the sites this was written for had neither.
 *
 * `files/media/worker.ts` is chosen because that is where the cost of silence is highest — every write there
 * follows a model call, so a lost write is money already spent and not recoverable by a retry.
 *
 * Run: node --test testing/standalone/swallowed-writes-must-be-visible.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statementUpTo } from './_structural-window.mjs';

const FILE = 'server/src/files/media/worker.ts';
const src = readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);

/** A catch that discards its argument — `.catch(() => …)` with no parameter. */
const SWALLOW = /\.catch\(\s*\(\s*\)\s*=>/;
/** The call it hangs off names a persistence operation. */
const WRITE = /(updateOne|insertOne|replaceOne|bulkWrite|deleteOne|deleteMany|writeFile|upsert)/i;

describe('the media worker never loses a write in silence', () => {
  it('the detector finds swallows at all — otherwise this gate proves nothing', () => {
    // Mutation check: a matcher that matches nothing is indistinguishable from a clean file.
    assert.ok(SWALLOW.test('await thing().catch(() => {});'));
    assert.equal(SWALLOW.test('await thing().catch((err) => log.warn(err));'), false,
      'a catch that BINDS its error is not a swallow — that is the shape we want people to write');
  });

  it('every swallowed WRITE either logs, or says why it need not', () => {
    const offenders = [];
    lines.forEach((line, i) => {
      if (!SWALLOW.test(line)) return;
      // The statement this catch belongs to — look back for the call being awaited.
      const stmt = lines.slice(Math.max(0, i - 5), i + 1).join(' ');
      if (!WRITE.test(stmt)) return;
      // Either the catch body logs, or a comment on/near the line states the reason.
      const nearby = lines.slice(Math.max(0, i - 3), i + 4).join(' ');
      const logs = /log\.(warn|error|info)/.test(nearby);
      const excused = /non-fatal|best-effort|source of truth|logged at|deliberately/i.test(nearby);
      if (!logs && !excused) offenders.push(`${FILE}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });

    assert.deepEqual(offenders, [],
      'a write in the media worker follows a model call, so losing it silently means money already spent and '
      + 'a result that cannot be recovered by a retry. Log it at warn naming the space, the file and what was '
      + 'lost — or write down why the loss does not matter.');
  });

  it('the two sites this was written for name what is lost, not just that something failed', () => {
    // "Write failed" is a log nobody can act on. The describe write loses a description and an excerpt; the
    // permanent-failure write strands a record in `processing` while the counter says it failed. An operator
    // reading either line should know which of those they are looking at.
    assert.match(src, /described but the metadata write failed/,
      'the describe write must say the description and excerpt from that run are gone');
    assert.match(src, /the record will read 'processing' while the failure counter has already moved/,
      'the status write must name the disagreement it leaves between the metric and the record');
  });

  it('and neither was turned into a throw', () => {
    // Failing the job would retry a document whose analysis already succeeded and re-pay for the model. The
    // fix was visibility, not severity, and a later "tidy-up" that promotes these to throws would be a
    // regression dressed as rigour.
    const describeAt = src.indexOf('described but the metadata write failed');
    assert.ok(describeAt > -1, 'the log line is gone — re-anchor this gate');
    /*
     * The statement the log line is IN, bounded by where that statement begins. This is the shape where a backwards
     * count is at its most dangerous: the assertion is that a rethrow is ABSENT, so a window starting too late reads
     * less text and passes. Here it would pass on exactly the regression it exists to catch.
     */
    const window = statementUpTo(src, describeAt, 'the describe-write handler');
    assert.doesNotMatch(window, /\.catch\(\s*\(\s*err[^)]*\)\s*=>\s*\{\s*throw/,
      'the describe write must not rethrow — that re-pays for a model call that already succeeded');
  });
});
