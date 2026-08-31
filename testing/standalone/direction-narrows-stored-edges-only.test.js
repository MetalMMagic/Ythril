/**
 * `direction` narrows stored edges and never links — and every surface that offers it says so.
 *
 * ## The behaviour, and why it is right
 *
 * A link is an `entityIds` ARRAY today: the field a memory, chrono entry or file carries, holding ONE
 * orientation — the record names the entity. So there is nothing for a direction to select between. Neither
 * link scan even ACCEPTS a direction — `linkedRecordsAtFrontier` and `entitiesLinkedFromRecords` take an
 * inclusion and edge labels — so the standalone `traverse` tool and recall's expansion agree, and always have.
 *
 * Honouring direction on links today would be worse: `inbound` would then hide a memory's own links, which is
 * not what anyone asks for by narrowing.
 *
 * ## M-2 IS EXPECTED TO BREAK THIS GATE, and that is the design
 *
 * The link-records migration turns each link into a record with a `from` and a `to`. A link then HAS two ends
 * and `direction` genuinely selects between them — from an entity, an inbound link record reaches the memory
 * that named it and an outbound one reaches nothing. The rule below is therefore true of the ARRAY
 * representation, not of links in principle.
 *
 * So the two halves are asserted separately on purpose. The first fires when a surface drops the statement,
 * which is drift. The second fires when a link scan gains a `direction` parameter — which is M-2 arriving, and
 * is the signal to REWRITE these six sentences rather than to make the gate agree with the code.
 *
 * ## So the defect was never the behaviour
 *
 * A-6, found by review 2026-08-30: **nothing said it.** A caller sending
 * `{depth: 1, direction: 'inbound', includeMemories: true}` gets the entities their matched memory NAMES —
 * an outbound step from the record — and neither door's description nor the guide mentioned that
 * `direction` governs stored edges alone. An undocumented rule that surprises is the same defect as a wrong
 * one, because the caller designs around what they were told.
 *
 * ## Why a gate rather than four edits
 *
 * `CLAUDE.md`: a capability lives in five places and each is somebody's authoritative source. This statement
 * has to hold on the MCP schema a caller reads while constructing arguments, on the two guide pages, and in
 * the operator's own words — and the failure mode is one of them being corrected while the others are not.
 *
 * Run: node --test testing/standalone/direction-narrows-stored-edges-only.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8').replace(/\s+/g, ' ');

describe('the behaviour: neither link scan takes a direction', () => {
  it('the two link scans accept an inclusion and labels, and no direction', () => {
    /*
     * Asserted on the SIGNATURES rather than on prose, because this is what makes the documentation true. If a
     * scan ever gains a direction parameter, every statement below becomes a lie and this fires first.
     */
    const src = read('server/src/brain/link-frontier.ts');
    for (const fn of ['linkedRecordsAtFrontier', 'entitiesLinkedFromRecords']) {
      const at = src.indexOf(`export async function ${fn}(`);
      assert.ok(at > 0, `${fn} is gone — re-anchor this gate`);
      const params = src.slice(at, src.indexOf('): Promise<', at));
      assert.doesNotMatch(params, /\bdirection\b/,
        `${fn} now takes a direction, so the documented rule that links ignore it is no longer true`);
    }
  });
});

describe('and every surface that offers `direction` says so', () => {
  /** The claim, in whatever words each surface uses. All four must carry it. */
  const SURFACES = [
    // The schema a caller reads while CONSTRUCTING arguments — shared by both doors, which is the point.
    ['server/src/brain/traverse-option.ts', /narrow[s]? links|STORED EDGES/i],
    // recall + find_similar, whose descriptions are the reference for an agent.
    ['server/src/mcp/tools/search.ts', /narrows STORED EDGES ONLY/],
    // The standalone traverse tool.
    ['server/src/mcp/tools/edge.ts', /narrows STORED EDGES ONLY/],
    // The integrator's two pages.
    ['docs/integration-guide/04a-recall-api.md', /narrows stored edges only/i],
    ['docs/integration-guide/04b-graph-api.md', /narrows stored edges and never links/i],
    // The operator's own words — no jargon, and the one surface a UI user ever sees.
    ['docs/userguide/02-brain.md', /not to the memories, timeline entries and files that merely MENTION/],
  ];

  for (const [file, pattern] of SURFACES) {
    it(`${file} states it`, () => {
      assert.match(read(file), pattern,
        `${file} offers \`direction\` and does not say it narrows stored edges only — a caller who reads only `
        + 'this surface will design around a rule that does not hold');
    });
  }

  it('the consequence is spelled out, not just the rule', () => {
    /*
     * "Stored edges only" is the rule; "so an inbound walk on a matched memory still returns what it names" is
     * what a caller needs to predict the response. The rule alone reads as a technicality.
     */
    for (const f of ['server/src/mcp/tools/search.ts', 'docs/integration-guide/04a-recall-api.md']) {
      assert.match(read(f), /still return[s]? the entities that memory (NAMES|\*\*names\*\*)/i,
        `${f} states the rule without its consequence, which is the half a caller can act on`);
    }
  });
});
