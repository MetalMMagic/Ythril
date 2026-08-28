/**
 * A tool's `inputSchema` description must not contradict `help()` about the same behaviour.
 *
 * ## What this is for
 *
 * The fleet integrator, 2026-08-13T1035Z §1: `recall`'s filter description said *"applied after vector search"*. It is not a
 * post-filter. They read that sentence, believed it, and **built a skill that deliberately avoided filtered recall** — on
 * the sound reasoning that a record which does not rank inside `topK` would never reach a post-filter, so an inbox built
 * on recall could silently miss a message.
 *
 * `help()` described the behaviour correctly at the same time. Two of our surfaces stated opposite semantics, and the one
 * that was wrong is the one a caller reads **while constructing arguments** — which `help()` itself calls the
 * authoritative machine-readable reference.
 *
 * Their sentence for why this outranked their feature asks: *"a stale sentence in a schema is invisible: nobody reports a
 * capability they were told they did not have."*
 *
 * ## What it can and cannot check
 *
 * It cannot judge prose. What it CAN do is refuse the specific contradictions we have been bitten by, as literal claims —
 * a small list, each entry naming the report that put it there. That is narrow on purpose: a gate that tried to diff two
 * pieces of documentation would produce noise, and noise is how a check gets deleted.
 *
 * Run: node --test testing/standalone/schema-descriptions-agree-with-help.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let ALL_TOOLS, helpSections;

const schemas = {
  requiredSpace: { type: 'string', description: 'Space ID to operate on.' },
  optionalSpace: { type: 'string', description: 'Optional space ID.' },
};

/** Every description string in a tool's schema, flattened. */
function descriptionsOf(tool) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.description === 'string') out.push(node.description);
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
  };
  walk(tool.inputSchema(schemas));
  return out;
}

before(async () => {
  ALL_TOOLS = (await import('../../server/dist/mcp/tools/index.js')).ALL_TOOLS;
  helpSections = (await import('../../server/dist/mcp/tools/help-sections.js')).helpSections;
});

describe('no tool schema repeats a claim we have already been corrected on', () => {
  /**
   * Each entry is a sentence a schema MUST NOT contain, with who reported it and why it was wrong. A banned phrase is
   * cheap to check and impossible to argue with, which is what makes it survivable.
   */
  const BANNED = [
    {
      phrase: 'applied after vector search',
      tool: 'recall',
      why: 'the fleet integrator 2026-08-13T1035Z: the filter is NOT a post-filter. `topK` is filled from records that satisfy the '
        + 'filter — either via a native index pre-filter or by scoring the whole space and filtering after — so nothing '
        + 'is dropped by `topK`. They avoided filtered recall entirely on the strength of this sentence.',
    },
  ];

  it('finds the tools (the check itself works)', () => {
    assert.ok(Array.isArray(ALL_TOOLS) && ALL_TOOLS.length > 20, `expected the tool registry, got ${ALL_TOOLS?.length}`);
    const recall = ALL_TOOLS.find(t => t.name === 'recall');
    assert.ok(recall, 'recall must exist for the entry below to mean anything');
    assert.ok(descriptionsOf(recall).length >= 5, 'expected several described parameters on recall');
  });

  it('no banned phrase appears in any tool schema', () => {
    const found = [];
    for (const entry of BANNED) {
      for (const tool of ALL_TOOLS) {
        for (const d of descriptionsOf(tool)) {
          if (d.toLowerCase().includes(entry.phrase.toLowerCase())) {
            found.push(`${tool.name}: "${entry.phrase}" — ${entry.why}`);
          }
        }
      }
    }
    assert.deepEqual(found, [],
      'A schema description repeats a claim that was reported wrong from the outside. A caller reads these while '
      + 'constructing arguments, so a stale sentence here is invisible — nobody reports a capability they were told they '
      + 'did not have.');
  });

  it('every banned phrase names its tool, and that tool still exists', () => {
    // A stale entry pointing at a renamed tool would silently stop covering anything.
    for (const { phrase, tool, why } of BANNED) {
      assert.ok(ALL_TOOLS.some(t => t.name === tool), `${phrase} is pinned to '${tool}', which no longer exists`);
      assert.ok(why && why.length > 60, `${phrase}: the reason must survive without the conversation that produced it`);
    }
  });
});

describe('recall states the guarantee a caller needs, not just the mechanism', () => {
  const recallFilter = () => {
    const recall = ALL_TOOLS.find(t => t.name === 'recall');
    return recall.inputSchema(schemas).properties.filter.description;
  };

  it('says topK is filled from records that satisfy the filter', () => {
    // The load-bearing sentence. Whether the path is indexed or exhaustive is a performance detail; that nothing is
    // dropped by `topK` is the property their design decision hinged on.
    assert.match(recallFilter(), /topK/,
      'the description must say what happens to `topK`, which is the question a caller is actually asking');
    assert.match(recallFilter(), /satisf/i);
  });

  it('names BOTH paths, because they differ in mechanism and not in outcome', () => {
    // My first correction of this sentence said only "selects the candidate set before ranking" — true for the indexed
    // path and wrong for the exhaustive one, which scores the whole space and filters after. Replacing one inaccuracy
    // with another on the sentence whose inaccuracy is the defect would have been the worst available outcome.
    const d = recallFilter();
    assert.match(d, /pre-filter/i, 'the indexed path');
    assert.match(d, /exhaustiv/i, 'and the fallback');
  });

  it('agrees with what help() tells the same caller', () => {
    // The two surfaces that disagreed. help() has always been right here; this asserts they now say the same thing about
    // which paths are indexed, so a future edit to either one cannot re-open the gap silently.
    const ctx = { args: {}, readOnly: false, isAdmin: true, accessibleSpaces: [{ id: 'general', label: 'General' }] };
    const retrieval = helpSections(ctx, [], 0).find(s => s.id === 'retrieval');
    assert.ok(retrieval, 'the retrieval guide section must exist');
    for (const claim of ['pre-filtered', 'exhaust']) {
      assert.ok(retrieval.body.toLowerCase().includes(claim),
        `help()'s retrieval guide should still describe the ${claim} path`);
    }
    assert.match(recallFilter(), /declare/i,
      'and the schema should give the same advice help() does: declare a heavily-filtered property');
  });
});
