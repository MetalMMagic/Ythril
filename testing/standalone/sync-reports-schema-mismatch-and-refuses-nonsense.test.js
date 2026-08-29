/**
 * Sync REPORTS a schema mismatch and REFUSES a record nobody could read. Those are different things.
 *
 * ## What it was
 *
 * Five ingest paths in `api/sync/docs.ts`, and exactly **one** schema check between them: the chrono type
 * allowlist on the single-record route. Which was wrong twice over — it covered one field of one record type,
 * and it sat on the path a peer barely uses, because a sync cycle ships records through `batch-upsert`. That
 * path checked nothing at all.
 *
 * And the one check that existed **refused**, with a `400`.
 *
 * ## Why refusing is the wrong answer here specifically
 *
 * Owner's ruling, 2026-08-29 (P-21 = C). A peer validated these records against ITS schema, which may differ
 * from the receiver's — so a refusal discards data the sender believes it delivered, on the receiver's opinion
 * of rules the sender never agreed to. Validate, accept, and report.
 *
 * ## The count is not decoration
 *
 * The ruling's stated cost was that a report nobody reads is the do-nothing option with extra steps. So this
 * asserts the violations reach the CALLER, not a log line — `schemaViolations` on each per-type stat, and beside
 * the document on the single-record route.
 *
 * Run: node --test testing/standalone/sync-reports-schema-mismatch-and-refuses-nonsense.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { statementAround } from './_structural-window.mjs';

const DOCS = 'server/src/api/sync/docs.ts';
const SHARED = 'server/src/api/sync/_shared.ts';
const docs = stripComments(readFileSync(DOCS, 'utf8'));
const shared = stripComments(readFileSync(SHARED, 'utf8'));

const TYPES = ['memory', 'entity', 'edge', 'chrono'];

describe('sync reports a schema mismatch and refuses nonsense', () => {
  it('one helper answers for every record type', () => {
    // A per-type copy is how the old single check drifted into being the only one. The helper must cover all
    // four, or the next type added quietly gets nothing.
    assert.match(shared, /export function violationsAgainstLocalSchema/, 'no shared validation helper');
    for (const t of TYPES) {
      assert.match(
        shared, new RegExp(`case '${t}'`),
        `the helper does not handle '${t}', so that type ingests unchecked`,
      );
    }
  });

  it('every batch loop checks what it is about to store', () => {
    for (const t of TYPES) {
      assert.match(
        docs, new RegExp(`violationsAgainstLocalSchema\\(spaceId, '${t}'`),
        `batch-upsert stores '${t}' records without checking them. This is the path a real peer uses — a sync `
        + 'cycle ships records in batches — so a check that skips it protects almost nothing.',
      );
    }
  });

  it('every per-type stat carries the count back', () => {
    /*
     * Named per stat rather than counted. A first version asserted "at least five mentions of
     * schemaViolations" and SURVIVED its own mutant — deleting the single-record route's report left four,
     * which still cleared the bar. A total says nothing about which one went missing.
     */
    for (const stat of ['memStats', 'entStats', 'edgeStats', 'chronoStats']) {
      const at = docs.indexOf(`const ${stat} = {`);
      assert.notEqual(at, -1, `${stat} is gone — re-point this gate`);
      const decl = docs.slice(at, docs.indexOf('\n', at));
      assert.match(
        decl, /schemaViolations/,
        `${stat} does not carry a violation count, so what it skipped never reaches the caller`,
      );
    }
  });

  it('the single-record route reports what it accepted out of shape', () => {
    // The route that used to REFUSE must now say what it let through, or relaxing the 400 traded a loud
    // wrong answer for a silent one.
    const at = docs.indexOf("syncDocsRouter.post('/chrono'");
    assert.notEqual(at, -1, 'the single-record chrono route is gone — re-point this gate');
    const route = docs.slice(at, docs.indexOf("syncDocsRouter.post('/batch-upsert'", at));
    assert.match(
      route, /schemaViolations/,
      'the chrono ingest route accepts a record that violates the local schema and says nothing about it. '
      + 'Relaxing the 400 was only safe because the violation is reported instead.',
    );
  });

  it('a PROPERTY mismatch is counted, never refused', () => {
    /*
     * The distinction this file exists for, and the one I got wrong first: a property that breaks the local
     * schema is a DISAGREEMENT between two instances' rules, and the sender validated against its own. Refusing
     * discards data over an opinion the sender never agreed to — so it is counted and kept.
     */
    for (const stat of ['memStats', 'entStats', 'edgeStats', 'chronoStats']) {
      const at = docs.indexOf(`const ${stat} = {`);
      const decl = docs.slice(at, docs.indexOf('\n', at));
      assert.match(decl, /schemaViolations/, `${stat} must COUNT the mismatch`);
    }
    /*
     * Every 400 in the file is inspected, rather than a capped window after the helper call. A
     * `doesNotMatch` over a fixed character budget passes by looking at LESS, which is the failure direction
     * that makes a negative assertion worthless — and this repo has a gate refusing the shape outright.
     */
    let at = docs.indexOf('res.status(400)');
    while (at !== -1) {
      const stmt = statementAround(docs, at, 'a 400 statement');
      assert.doesNotMatch(
        stmt, /violationsAgainstLocalSchema|schemaViolations/,
        "a property mismatch must never produce a 400 — that is the receiver overruling the sender's own "
        + `schema, which the sender never agreed to.

${stmt}`,
      );
      at = docs.indexOf('res.status(400)', at + 1);
    }
  });

  it('a chrono type nobody understands IS refused, on BOTH paths', () => {
    /*
     * Not the same thing. A `type` outside the product's vocabulary AND outside anything the space declared is
     * not non-conforming, it is meaningless to every reader — and `IncomingChronoDoc` types the field as any
     * non-empty string, so nothing else would catch it. I removed this check with the property one and CI
     * caught it; that over-correction is what this assertion prevents repeating.
     *
     * On BOTH paths is the W-4 defect: the rule existed only on the single-record route, while the batch route
     * is what a real peer uses.
     */
    const single = docs.slice(docs.indexOf("syncDocsRouter.post('/chrono'"), docs.indexOf("syncDocsRouter.post('/batch-upsert'"));
    assert.match(single, /getAllowedChronoTypes/, 'the single-record route lost its vocabulary check');
    assert.match(single, /res\.status\(400\)/, 'an unreadable type must still be refused');

    const batch = docs.slice(docs.indexOf("syncDocsRouter.post('/batch-upsert'"));
    assert.match(
      batch, /allowedChronoTypes/,
      'the batch route does not check the chrono vocabulary, so the rule applies only on the path a peer '
      + 'barely uses — which is exactly the defect W-4 recorded',
    );
    assert.match(
      batch, /unknownType/,
      'the batch route must COUNT what it skipped rather than dropping it silently; a 400 there would abandon '
      + 'every other record in the batch',
    );
  });
});
