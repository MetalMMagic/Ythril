/**
 * Both doors report a space's storage, from the same measurement, with the same field names.
 *
 * ## The defect this pins
 *
 * `GET /api/spaces` returned `maxGiB` and `usageGiB` per space. MCP's `list_spaces` returned counts and nothing
 * else — while `help()` told callers *"Call list_spaces for storage/quota details"*. So a caller who read the
 * authoritative reference and believed it found no storage anywhere on that door, and would not report it,
 * because **nobody reports a capability they were told they did not have**. That is the same shape as the
 * `recall` filter sentence aigents designed around: the schema description is code, and this one had drifted.
 *
 * It is also the repo's most frequent defect arriving as an omission — one rule, two implementations, the weaker
 * one silent. `mcp-rest-parity.test.js` gates the CAPABILITY half; this gates the FIELD half for one capability
 * whose parameters are no parameters at all, so the only thing to compare is what comes back.
 *
 * ## What is asserted
 *
 * Source-read, not exercised: exercising both doors needs an instance with a data root and a database, and this
 * has to run in preflight. So it asserts that both handlers read the SHARED measurement and emit the SAME field
 * names — which is the property that broke, and it cannot be satisfied by one door re-deriving the figure.
 *
 * Run: node --test testing/standalone/space-storage-parity.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { balancedFrom, blockAfter } from './_structural-window.mjs';

const REST = stripComments(readFileSync('server/src/api/spaces.ts', 'utf8'));
const MCP = stripComments(readFileSync('server/src/mcp/tools/spaces.ts', 'utf8'));
const HELP = readFileSync('server/src/mcp/tools/help-sections.ts', 'utf8');
const SHARED = 'server/src/spaces/space-usage.ts';

/** The three storage fields a caller branches on. `maxGiB` is the quota, the other two qualify the usage. */
const STORAGE_FIELDS = ['maxGiB', 'usageGiB', 'usageIncomplete'];

describe('one measurement, not two', () => {
  it('the shared module exists and is what both doors import', () => {
    // The extract-instead-of-duplicating rule. A second `dirSizeBytes` walk in either door would be the defect
    // reappearing, and it would drift the moment one of them learned something the other did not.
    assert.ok(readFileSync(SHARED, 'utf8').includes('export async function measureSpaceUsage'),
      `${SHARED} must own the measurement both doors read`);
    for (const [name, src] of [['REST', REST], ['MCP', MCP]]) {
      assert.match(src, /measureSpaceUsage\(/, `${name} must read the shared measurement`);
    }
  });

  it('neither door walks the files tree itself any more', () => {
    // `dirSizeBytes` is still exported for the two callers that report a footprint with no limit to compare it
    // against. Using it HERE is what produced a bare number that could not say it was short.
    for (const [name, src] of [['REST', REST], ['MCP', MCP]]) {
      assert.doesNotMatch(src, /dirSizeBytes\(/,
        `${name} measures the tree itself, so its figure cannot report what it failed to read`);
    }
  });
});

describe('the same field names on both doors', () => {
  it('REST emits all three per space', () => {
    // Bounded to the object the route builds per space, so a field mentioned elsewhere in a 900-line route
    // cannot answer for one that is missing here.
    const at = REST.indexOf('const spaces = visibleSpaces.map(');
    assert.ok(at > -1, 'the per-space response builder is gone — re-anchor this gate');
    const builder = blockAfter(REST, at, 'the per-space response builder');
    for (const f of STORAGE_FIELDS) {
      assert.match(builder, new RegExp(`\\b${f}\\b`), `REST does not emit ${f} per space`);
    }
  });

  it('MCP emits all three per space', () => {
    const at = MCP.indexOf('const result = accessibleSpaces.map(');
    assert.ok(at > -1, 'list_spaces\' response builder is gone — re-anchor this gate');
    const builder = balancedFrom(MCP, MCP.indexOf('(', at), 'list_spaces\' response builder');
    for (const f of STORAGE_FIELDS) {
      assert.match(builder, new RegExp(`\\b${f}\\b`), `MCP list_spaces does not emit ${f}`);
    }
  });

  it('the instance-wide figure carries its completeness too', () => {
    // The other half of the same claim: a per-space floor is useless if the instance total silently is one.
    assert.match(REST, /usageIncomplete: usage\.incomplete/,
      'the instance-wide storage summary must report what its measurement could not read');
  });
});

describe('what help() says about storage is true', () => {
  it('help does not promise storage details without naming the fields that carry them', () => {
    /*
     * The sentence that was wrong. Asserting the FIELDS are named, rather than asserting the old wording is
     * gone, because the failure was not a phrase — it was a pointer to data that was not there. A reworded
     * pointer to nothing would pass a check on the phrase and fail a caller.
     */
    const spaces = HELP.slice(HELP.indexOf("title: 'Spaces accessible to this token'"));
    const preamble = spaces.slice(0, spaces.indexOf('\n    },'));
    assert.match(preamble, /list_spaces/, 'the spaces section must still point at the tool');
    for (const f of ['maxGiB', 'usageGiB', 'usageIncomplete']) {
      assert.ok(preamble.includes(f),
        `help() points at list_spaces for storage but never names ${f}, so a caller cannot know to read it`);
    }
  });

  it('the tool\'s own description says the figure can be a floor', () => {
    // A caller constructs arguments and reads results against the inputSchema description. A `usageGiB` that
    // can be short, described as though it cannot, is the same defect one layer along.
    const at = MCP.indexOf("name: 'list_spaces'");
    const desc = MCP.slice(at, MCP.indexOf('inputSchema', at));
    assert.match(desc, /usageGiB/, 'the description must name the field');
    assert.match(desc, /FLOOR|floor|lower bound/,
      'and say it can be a lower bound, or a caller will read it as a total');
  });
});
