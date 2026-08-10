/**
 * The re-embed backfill: the way back from `suppressEmbeddings`.
 *
 * ## What is worth asserting here
 *
 * The sweep itself is a Mongo query and a loop. The three things that make it correct or useless are none of
 * that, and all three are visible without a database:
 *
 *  - **It filters on `$exists: false`, not on `null`.** The suppressed path `$unset`s the vector, so a released
 *    record has no key at all. A `null` filter would find nothing and report a clean sweep over a space that is
 *    entirely unindexed — a backfill that says "all done" having done nothing.
 *  - **It reuses the write path's suppression resolver.** Re-deriving the rule would let a backfill re-index
 *    exactly what an operator asked to keep out of recall.
 *  - **It never truncates silently.** `remaining` is counted before the cap, so it describes the space and not
 *    the page.
 *
 * Run: node --test testing/standalone/reembed-backfill.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const SRC = read('../../server/src/brain/reembed.ts');
const CODE = strip(SRC);

describe('the candidate query', () => {
  it('filters on $exists: false, never on null', () => {
    // The trap. Suppression `$unset`s the field, so the key is ABSENT rather than null.
    assert.match(CODE, /embedding:\s*\{\s*\$exists:\s*false\s*\}/);
    assert.ok(!/embedding:\s*null/.test(CODE), 'a null filter would match nothing and report a clean sweep');
  });

  it('derives the record kinds from the collection map rather than listing them again', () => {
    // A second list is how a new record kind gets silently left out of every backfill.
    assert.match(CODE, /Object\.keys\(COLLECTION\)/);
  });

  it('uses the same collection map the embed path writes through', () => {
    assert.match(CODE, /from '\.\/embed-record\.js'/);
    assert.match(CODE, /COLLECTION\[kind\]/);
  });
});

describe('it does not fight the suppression setting', () => {
  it('imports the shared resolver instead of re-deriving the rule', () => {
    assert.match(CODE, /embeddingSuppressed/);
    assert.match(CODE, /from '\.\/suppress-embeddings\.js'/);
  });

  it('skips a still-suppressed record and REPORTS it', () => {
    // Reporting matters as much as skipping: running the backfill before turning suppression off must tell the
    // operator the setting is still on, not look like a no-op.
    assert.match(CODE, /skippedSuppressed\+\+/);
    assert.match(CODE, /skippedSuppressed: number/);
  });

  it('applies the file asymmetry, narrowed rather than cast', () => {
    // A cast would index `typeSchemas` with `'file'` and miss — here that means re-embedding suppressed files.
    assert.match(CODE, /kind === 'file' \? undefined : kind/);
    assert.ok(!/kind as KnowledgeType/.test(CODE), 'the kind is cast rather than narrowed');
  });

  it('passes the record flag as undefined when absent, never false', () => {
    assert.match(CODE, /record:\s*doc\['excludeFromVectorSearch'\]\s*===\s*true\s*\?\s*true\s*:\s*undefined/);
  });
});

describe('it enqueues rather than embedding inline', () => {
  it('calls the queue, not the embedder', () => {
    // A million-record space would time out mid-way, having done partial work with no record of where.
    assert.match(CODE, /enqueueEmbedJob\(spaceId, kind, id\)/);
    assert.ok(!/embedStoredRecord/.test(CODE), 'embedding inline would time out on a large space');
  });
});

describe('nothing is capped silently', () => {
  it('counts the total BEFORE applying the cap', () => {
    // Otherwise `remaining` describes the page rather than the space, and a truncated sweep reads as complete.
    const countAt = CODE.indexOf('countDocuments');
    const limitAt = CODE.indexOf('.limit(budget)');
    assert.ok(countAt > 0 && limitAt > 0, 'expected both a count and a limited find');
    assert.ok(countAt < limitAt, 'the total must be counted before the page is fetched');
  });

  it('reports the remainder and flags truncation', () => {
    assert.match(CODE, /truncated = result\.remaining > 0/);
  });

  it('clamps the limit to a ceiling rather than trusting the caller', () => {
    assert.match(CODE, /Math\.min\(Math\.max\(1, Math\.floor\(limit\)\), REEMBED_MAX_LIMIT\)/);
  });

  it('still counts a kind it had no budget left for', () => {
    // Skipping the count would under-report `remaining` for every kind after the budget ran out, which is the
    // silent-truncation failure wearing a different hat.
    assert.match(CODE, /if \(budget <= 0\) \{ result\.remaining \+= total; continue; \}/);
  });
});

describe('the route stays thin, and out of the god-file', () => {
  // It lives in its own module: inline it was +28 code lines on `api/spaces.ts`, which would have been the second
  // double-digit raise of that file in two PRs. Extracted, only the mount point stays (+2).
  const ROUTE = read('../../server/src/api/spaces-reembed.ts');
  const SPACES = read('../../server/src/api/spaces.ts');

  it('delegates to the module instead of inlining the sweep', () => {
    assert.match(ROUTE, /reembedSpace\(spaceId, \{/);
    assert.ok(!/\$exists: false/.test(ROUTE), 'the query belongs in brain/reembed.ts, not in the route');
  });

  it('is admin-gated and scoped to the space in the path', () => {
    assert.match(ROUTE, /post\('\/:id\/reembed', globalRateLimit, requireAdminMfaScoped\('id'\)/);
  });

  it('rejects an unknown body key rather than silently sweeping everything', () => {
    // A caller who meant to narrow and got a full sweep would be told they had narrowed it.
    assert.match(ROUTE, /const ReembedBody = z\.object\(\{[\s\S]*?\}\)\.strict\(\)/);
  });

  it('spaces.ts only MOUNTS it — the body did not come back', () => {
    // The whole point of the extraction. If a later edit inlines the handler again, this fails rather than the
    // ratchet quietly absorbing another raise.
    assert.match(SPACES, /registerReembedRoute\(spacesRouter\);/);
    assert.ok(!/reembedSpace\(/.test(SPACES), 'the handler is back inside the god-file');
  });

  it('is audited, because it changes what a space is findable by', () => {
    const AUDIT = read('../../server/src/audit/middleware.ts');
    assert.match(AUDIT, /reembed\$\/[\s\S]{0,80}space\.embeddings\.reembed/);
  });
});

describe('the comment that promised a sweep that never existed', () => {
  it('states the correction and names the real repair', () => {
    // The old comment justified swallowing the enqueue error with "the periodic backfill sweep will find it".
    // There was no sweep, so a swallowed error meant a record silently missing from recall forever.
    //
    // Asserted POSITIVELY, and that is the lesson rather than a detail: the first version of this test searched
    // for the absence of the old phrase and failed against correct code, because the phrase is quoted inside the
    // comment that corrects it. A gate that reads source has to survive the source explaining itself.
    const QUEUE = read('../../server/src/brain/embed-queue.ts');
    assert.match(QUEUE, /There was no such sweep/);
    assert.match(QUEUE, /reembed/);
    assert.match(QUEUE, /on demand, not periodic/);
  });
});
