/**
 * A spilled read result is OUTPUT, not content — and every traverse site spills.
 *
 * The spill exists because a truncated traversal was indistinguishable from a complete one: `graphNodes: 7`
 * might be the whole neighbourhood or the first 7 of 40. The owner ruled that a flag is not the answer — write
 * the whole thing to the space's `_tmp/` and hand back an authenticated download link with a one-day TTL.
 *
 * Three things about that fix could go wrong quietly, and each has an assertion here:
 *
 * 1. **A new traverse site forgets to spill.** There are four (`/recall`, `/find-similar`, and the two MCP
 *    tools), they must agree, and the way they agree is by going through one builder.
 * 2. **The spill gets embedded.** `upsertFileMeta` enqueues an embedding unconditionally, which is correct for
 *    every other file in the store. Embedding this one would turn recall results into recall-searchable
 *    content, so the next recall could match the JSON dump of an earlier one.
 * 3. **The spill shows up in the file manager**, as `_converted/`/`_extracted/` did before a customer
 *    reported it.
 *
 * Run: node --test testing/standalone/graph-spill-is-not-content.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { isSpillPath, SPILL_DIR } = await import('../../server/dist/brain/spill-path.js');
const { SPILL_TTL_DAYS, SPILL_CEILING_MULTIPLE } = await import('../../server/dist/brain/graph-spill.js');

const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*/gm, '$1');
const read = p => strip(readFileSync(p, 'utf8'));

describe('the spill directory is recognised at the root and nowhere else', () => {
  it('recognises the tree and its contents', () => {
    assert.equal(isSpillPath(`${SPILL_DIR}/graph-abc.json`), true);
    assert.equal(isSpillPath(SPILL_DIR), true);
    assert.equal(isSpillPath(`/${SPILL_DIR}/graph-abc.json`), true, 'a leading slash is the same path');
  });

  it("leaves a user's own directory of the same name alone", () => {
    // `hideDerivedTrees` only hides these at the ROOT for the same reason: a folder called `_tmp` deeper in
    // someone's tree is theirs, and their files in it are content like any other.
    assert.equal(isSpillPath(`notes/${SPILL_DIR}/mine.json`), false);
    assert.equal(isSpillPath(`${SPILL_DIR}-mine/x.json`), false, 'a prefix is not a directory');
    assert.equal(isSpillPath('graph-abc.json'), false);
  });
});

describe('the queue declines to embed a spill', () => {
  const queue = read('server/src/brain/embed-queue.ts');

  it('the guard is in enqueueEmbedJob, before any write', () => {
    // At the enqueue rather than the call site: `upsertFileMeta` enqueues unconditionally and that is right,
    // because every other file in the store is content.
    const fn = queue.slice(queue.indexOf('export async function enqueueEmbedJob'));
    assert.match(fn.slice(0, 600), /if \(recordType === 'file' && isSpillPath\(recordId\)\) return;/,
      'a spill must never reach the embedding queue');
  });

  it('and the guard is reachable — the enqueue is what file writes call', () => {
    // Without this the assertion above could pass against a function nothing calls.
    const meta = read('server/src/files/file-meta.ts');
    assert.match(meta, /await enqueueEmbedJob\(spaceId, 'file', normalised\)/);
  });
});

describe('the spill tree is hidden from browsing', () => {
  it('is a member of DERIVED_TREES, by the shared constant', () => {
    // The set moved out of `api/files.ts` when adding `_tmp` pushed that file past its god-file freeze — the
    // ratchet's own instruction being to put new behaviour beside a large file rather than inside it.
    const trees = read('server/src/files/derived-trees.ts');
    assert.match(trees, /export const DERIVED_TREES = new Set\(\['_converted', '_extracted', SPILL_DIR\]\)/,
      'a second literal would drift from the one the writer uses');
    assert.match(trees, /import \{ SPILL_DIR \} from '\.\.\/brain\/spill-path\.js'/);
    // And the route still applies it, or the set would be a fact nothing acts on.
    assert.match(read('server/src/api/files.ts'), /hideDerivedTrees\(/);
  });
});

describe('every traverse site spills — there are four and they must agree', () => {
  const rest = read('server/src/api/brain/search.ts');
  const mcp = read('server/src/mcp/tools/search.ts');

  it('REST recall and find-similar both build through the spill builder', () => {
    assert.equal((rest.match(/buildGraphWithSpill\(/g) ?? []).length, 2, rest.match(/buildGraphWithSpill\(/g));
  });

  it('MCP recall and find_similar do too', () => {
    assert.equal((mcp.match(/buildGraphWithSpill\(/g) ?? []).length, 2, mcp.match(/buildGraphWithSpill\(/g));
  });

  it('nothing calls the un-spilled builder any more', () => {
    // `buildRecallGraph` was the pre-spill entry point. Leaving it exported would let a new site silently opt
    // out of the whole mechanism — so it is gone, not deprecated.
    const graph = read('server/src/brain/recall-graph.js'.replace('.js', '.ts'));
    assert.ok(!/export async function buildRecallGraph/.test(graph),
      'a second way to build a graph is a second way to truncate one silently');
    for (const [name, src] of [['REST', rest], ['MCP', mcp]]) {
      assert.ok(!/buildRecallGraph\(/.test(src), `${name} still calls the un-spilled builder`);
    }
  });

  it('all four report the spill in the response, not just compute it', () => {
    // Computing a spill and dropping it would leave the caller exactly where they started.
    assert.equal((rest.match(/graphTruncated: true, graphComplete: spill/g) ?? []).length, 2);
    assert.equal((mcp.match(/graphTruncated: true, graphComplete: spill/g) ?? []).length, 2);
  });
});

describe('the constants say what the ruling said', () => {
  it('one day, per the ruling', () => {
    assert.equal(SPILL_TTL_DAYS, 1);
  });

  it('the spill walk is bounded, so the fix cannot make a read unbounded', () => {
    // "Write the whole thing" without a ceiling turns one dense hub into an unbounded read. The bound is
    // reported (`ceilingHit`) rather than silent, which is the defect this module exists to remove.
    assert.ok(SPILL_CEILING_MULTIPLE > 1, 'a ceiling at the cap would spill nothing');
    assert.ok(SPILL_CEILING_MULTIPLE <= 50, 'an effectively unbounded ceiling is not a ceiling');
    const spill = read('server/src/brain/graph-spill.ts');
    assert.match(spill, /ceilingHit/, 'hitting the ceiling must be reported');
  });

  it('the spill boundary is the inline cap itself, not a second number', () => {
    // The E2E pins the boundary from both sides — a 30-leaf hub must produce a link, a 3-neighbour chain must
    // not — so "always spills" and "never spills" are both already excluded by those two passing together.
    // What they cannot pin is an off-by-one, hence this: the comparison is against the cap the caller's own
    // `topK` and `traverse` produced, so the old truncation point IS the new spill point.
    const spill = read('server/src/brain/graph-spill.ts');
    assert.match(spill, /if \(flat\.length <= inlineCap\) \{/,
      'a threshold of its own would drift from the cap the route computes');
    assert.match(spill, /const ceiling = inlineCap \* SPILL_CEILING_MULTIPLE;/);
    assert.match(spill, /nestNeighbours\(flat\.slice\(0, inlineCap\), seedIds\)/,
      'the inline tree must still be capped exactly as before');
  });

  it('the TTL is stamped through the record machinery, not a new sweeper', () => {
    const spill = read('server/src/brain/graph-spill.ts');
    assert.match(spill, /ttlDays: SPILL_TTL_DAYS/,
      'the TTL sweep cascades a file record to its blob; a private sweeper would be a second copy of that');
  });

  it('the file goes to a MEMBER space, never to the space the call was addressed to', () => {
    // A proxy space is a lens, not a store: `resolveWriteTarget` refuses a write to one without an explicit
    // `targetSpace` because it owns no files. Addressing the spill at the request's space would have created a
    // tree and a `{proxy}_files` record for a space meant to have neither. A seed's `spaceId` is always a
    // concrete member.
    const spill = read('server/src/brain/graph-spill.ts');
    assert.match(spill, /writeSpill\(seeds\[0\]!\.spaceId,/,
      'the write space must come from a seed, not from a parameter a route can fill with a proxy id');
    assert.ok(!/writeSpaceId/.test(spill),
      'no caller-supplied write space — the routes had `spaceId` and `callSpace` to hand, and both can be a proxy');
    for (const src of ['server/src/api/brain/search.ts', 'server/src/mcp/tools/search.ts']) {
      const code = read(src);
      const calls = [...code.matchAll(/buildGraphWithSpill\(([\s\S]{0,320}?)\);/g)].map(m => m[1]);
      assert.equal(calls.length, 2, `${src}: expected two spill builds, found ${calls.length}`);
      for (const args of calls) {
        assert.ok(!/spaceId,\s*\)?\s*$/.test(args.trim()),
          `${src} passes a space id to the builder again: ${args.trim().slice(-60)}`);
      }
    }
  });

  it('the download link is the authenticated file route', () => {
    const spill = read('server/src/brain/graph-spill.ts');
    assert.match(spill, /\/api\/files\/\$\{encodeURIComponent\(spaceId\)\}\?path=/,
      'a link that worked without the caller token would read a space with no auth');
  });
});
