/**
 * `recall`'s tool schema documents its RESPONSE, not only its parameters.
 *
 * ## The standard this is the first instance of
 *
 * Owner, 2026-08-15, supplying a fully-written `recall` schema as the template: *"each endpoint should have a
 * descriptions like: … else its really hard to discover the right options."* X-2 is rolling that across ~40
 * tools; this file gates the properties that make it a standard rather than more prose, on the one tool that
 * has been done.
 *
 * ## Why the response half is the half that was missing
 *
 * Every parameter had a description already. Nothing described what came back — so `truncated` and `complete`
 * were undocumented on the surface an agent reads while writing the call, and the failure mode is silent:
 * the inline answer is capped by SIZE and it is a cliff, not a slope. Around 25 results answer in full and 30
 * can come back as three. A caller asking for topK 80 and reading only `results` is working from a handful
 * of records with no error anywhere. Three flows in the fleet were doing exactly that.
 *
 * `help()` tells callers the tool schema IS the authoritative reference, and CLAUDE.md records what a stale
 * sentence there already cost: aigents read *"filter applied after vector search"*, believed it, and built a
 * skill that avoided filtered recall.
 *
 * ## What is asserted
 *
 * Not prose quality — the specific facts a caller cannot recover by experiment without being misled. Each of
 * these was either absent or, in the `types` case, absent in a way that made a real result look like a bug.
 *
 * Run: node --test testing/standalone/recall-schema-documents-its-response.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('server/src/mcp/tools/search.ts', 'utf8');
/** The `recall` tool object: from its name to the next tool's, so a later tool cannot satisfy these. */
const RECALL = (() => {
  const at = SRC.indexOf("name: 'recall'");
  assert.ok(at > 0, "the recall tool was not found — the scanner is wrong, not the code");
  const next = SRC.indexOf("name: '", at + 20);
  return next === -1 ? SRC.slice(at) : SRC.slice(at, next);
})();

describe('the response is documented, not just the request', () => {
  it('warns that the inline answer is capped and names the flag to read', () => {
    // The silent failure: asking for 80 and getting a handful, with no error. A caller has to know to look.
    assert.match(RECALL, /truncated/, '`truncated` must be named');
    assert.match(RECALL, /complete/, '`complete` must be named');
    assert.match(RECALL, /cliff|capped by SIZE|not by count/i,
      'say it is a size cliff rather than a gentle limit — 25 answers in full, 30 can return three');
  });

  it('says `count` excludes traversed nodes', () => {
    assert.match(RECALL, /count[^.]{0,80}MATCHES/,
      '`count` counts matches; a caller comparing it to `graphNodes` needs to know that');
  });

  it('says `graphNodes` is a number and `_graph` is the content', () => {
    assert.match(RECALL, /graphNodes/, '`graphNodes` must be named');
    assert.match(RECALL, /no `_graph`|has no `_graph`/,
      'a result with no edges has NO `_graph` — reading results[0] and concluding the feature is missing is the trap');
  });
});

describe('the parameters carry their traps', () => {
  it('types: edges are searchable records and compete for topK', () => {
    assert.match(RECALL, /EDGES ARE SEARCHABLE RECORDS/,
      'a topK 20 returning 2 edges looks like a bug until you know this');
  });

  it('query: it is tokenised for BM25 as well as embedded', () => {
    assert.match(RECALL, /TOKENISED/,
      'this is why an exact identifier survives a query written as a sentence');
  });

  it('topK: it is filled from records that SATISFY the filter', () => {
    assert.match(RECALL, /SATISFY/,
      'a filtered recall cannot silently miss a match — the opposite belief is what made aigents avoid filters');
  });

  it('minScore: it gates on the vector score only, before the reranker', () => {
    assert.match(RECALL, /vector-side gate/,
      'it is not a relevance gate, and a result the reranker would promote can be cut before it is seen');
  });
});
