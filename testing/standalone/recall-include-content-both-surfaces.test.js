/**
 * `includeContent` reaches BOTH doors.
 *
 * ## The asymmetry
 *
 * MCP `recall` has had `includeContent` since it shipped: a caller can ask for file-chunk locations and
 * metadata WITHOUT the passage bodies, which is the difference between one expensive call and a cheap
 * two-phase flow — recall to find where something is, then read only the chunk you chose. A passage body is
 * by far the largest field a result carries, and every field is paid for `topK` times.
 *
 * REST had no way to ask. An integrator pointed it out, and it is the same shape as the four
 * two-surfaces-one-rule defects fixed on 2026-08-05 (`upsert_edge` existence checks,
 * `excludeFromVectorSearch` over REST and then over MCP, the recall ceiling): a capability that reaches one
 * door and not the other.
 *
 * ## Why the gate is written as a comparison
 *
 * The item was filed asking for exactly this — *"if it is wanted, it belongs behind the same cross-surface
 * gate as the others so it cannot regress on one side"*. So the check is not "REST has a flag"; it is "the
 * two surfaces agree", which is the property that was violated and the only one worth holding.
 *
 * Run: node --test testing/standalone/recall-include-content-both-surfaces.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const REST = 'server/src/api/brain/search.ts';
const MCP = 'server/src/mcp/tools/search.ts';

describe('recall exposes includeContent on both surfaces', () => {
  const rest = read(REST);
  const mcp = read(MCP);

  it('MCP still has it — otherwise this gate is comparing REST to nothing', () => {
    assert.match(mcp, /includeContent/, `${MCP} no longer mentions includeContent`);
    assert.match(mcp, /includeContent: \{/, 'the MCP tool must still ADVERTISE it in its schema');
  });

  it('REST accepts it', () => {
    assert.match(rest, /includeContent/, `${REST} does not accept includeContent — the asymmetry is back`);
  });

  it('both default to TRUE, so neither surface silently thins an existing caller’s results', () => {
    // The default is the compatibility guarantee: only an explicit `false` opts out.
    assert.match(mcp, /a\['includeContent'\] !== false/, 'MCP must treat only an explicit false as opt-out');
    assert.match(rest, /includeContentRaw !== false/, 'REST must treat only an explicit false as opt-out');
  });

  it('REST refuses a non-boolean rather than coercing it', () => {
    // `"false"` is truthy. An opt-out that silently does nothing is worse than one that errors — and this is
    // the flag whose whole purpose is to make a response smaller.
    assert.match(rest, /`includeContent` must be a boolean/);
  });

  it('drops only `content`, and only on file results', () => {
    // The flag is about the passage body. Thinning anything else would make it a different feature with the
    // same name on the two surfaces — which is the defect class this gate exists for, one level in.
    assert.match(rest, /r\.type !== 'file'/, 'the strip must be scoped to file results');
    assert.match(rest, /const \{ content: _dropped, \.\.\.rest \} = r/, 'and drop `content` alone');
  });

  it('the traverse path honours it too', () => {
    // A caller who asked not to be sent passage bodies did not stop meaning it because they also asked for
    // graph expansion. An option that lapses on one code path is the same defect one level down.
    const traverseBuild = rest.slice(rest.indexOf('const results: RecallTraverseItem[]'));
    assert.match(traverseBuild.slice(0, 600), /stripContentIfAsked\(seeds, safeIncludeContent\)/,
      'the traverse response must apply the same strip as the plain one');
  });

  it('does not mutate the results it was given', () => {
    // `seeds` is also handed to the traverse builder and to the audit outcome; deleting a field in place
    // would change what those saw.
    assert.match(rest, /return results\.map\(/, 'the strip must copy rather than delete in place');
  });

  it('both surfaces document it', () => {
    // Named files, NOT `readGuide()` from `_docs.mjs`.
    //
    // That helper concatenates every part of the integration guide, and `16-mcp.md` is one of those parts —
    // so both sides of this two-surface comparison would be the same string and the check would pass on a
    // single mention in either. A helper that exists to make a check split-proof would have made this one
    // vacuous. The cost is that a further split has to update the path here; the gate names the part it
    // reads so that failure is a missing file, not a silent pass.
    const restDoc = read('docs/integration-guide/04a-recall-api.md');
    const mcpDoc = read('docs/integration-guide/16-mcp.md');
    for (const [name, doc] of [['recall-api', restDoc], ['mcp', mcpDoc]]) {
      assert.match(doc, /includeContent/, `${name} guide does not mention includeContent`);
    }
  });
});
