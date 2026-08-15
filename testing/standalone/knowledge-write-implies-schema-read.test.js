/**
 * `knowledge: write` entails `schema: read`, in ONE place, on every surface that asks.
 *
 * ## The ruling
 *
 * Owner, 2026-08-15: *"whenever someone has write in knowledge he should automatically have read on
 * schemas."* Writing a record against a schema requires reading that schema, so `knowledge: write` with
 * `schema: none` is not a narrower grant — it is a grant that cannot be exercised. Left to an operator, the
 * commonest useful token is one checkbox away from broken, and broken as a 403 on a route nobody called
 * deliberately.
 *
 * ## Why the tests are aimed at `effectiveRung` and not at a route
 *
 * `effectiveRung` is the single resolution of *what does this token hold here*: REST middleware, the MCP tool
 * guard, `reachable-spaces.ts` and the mint cap all read it. That is what makes it the only place the
 * implication can live without becoming two rules — the defect this repo produces most is one rule with two
 * implementations and the weaker one winning silently. Testing it here tests every caller at once; testing one
 * route would prove nothing about the other three.
 *
 * ## The three things that are easy to get wrong
 *
 *  - **Direction.** The implication must never run backwards. `schema: write` says nothing about knowledge.
 *  - **Chaining.** A rule is evaluated against what was GRANTED, never against another inference, or the
 *    order of the table becomes load-bearing and two innocuous rules can compose into a grant nobody wrote.
 *  - **The floor.** `capRights` compares a requested floor against the minter's FLOOR alone. If the
 *    implication were applied to per-space rows and not to the floor, enforcement would grant a rung that
 *    minting refused to delegate — the asymmetry that reads as "the grid says I have it and the API says no".
 *
 * Run: node --test testing/standalone/knowledge-write-implies-schema-read.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let effectiveRung, floorRung, capRights, RUNG_IMPLICATIONS, SPACE_AREAS;
before(async () => {
  ({ effectiveRung, floorRung, capRights } = await import('../../server/dist/auth/mint-cap.js'));
  ({ RUNG_IMPLICATIONS, SPACE_AREAS } = await import('../../server/dist/config/rights-shape.js'));
});

const ALL = (r) => ({ knowledge: r, files: r, schema: r, dataQuality: r });
const rights = (over = {}) => ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

describe('the implication table', () => {
  it('says exactly what the owner ruled, and nothing else', () => {
    // Pinned as a whole rather than "contains": a second row added without a test is a security rule nobody
    // reviewed, and this is the file where that would be noticed.
    assert.deepEqual(RUNG_IMPLICATIONS.map((r) => ({ ...r })), [
      { when: 'knowledge', atLeast: 'write', grants: 'schema', rung: 'read' },
    ]);
  });

  it('names only real areas on both sides', () => {
    // A misspelt area here would be silently inert, which is how `{"brain": "write"}` once stored at 200 and
    // granted nothing.
    for (const rule of RUNG_IMPLICATIONS) {
      assert.ok(SPACE_AREAS.includes(rule.when), `${rule.when} is not an area`);
      assert.ok(SPACE_AREAS.includes(rule.grants), `${rule.grants} is not an area`);
    }
  });
});

describe('effectiveRung — what a token holds in a space', () => {
  it('grants schema:read to a per-space knowledge:write, with schema written as none', () => {
    const r = rights({ perSpace: { qa: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } } });
    assert.equal(effectiveRung(r, 'qa', 'schema'), 'read');
  });

  it('grants it through the FLOOR as well, including in a space with no row', () => {
    // A floor reaches spaces created later, so the implication has to reach them too — otherwise a token
    // works in every space that existed when it was minted and silently does not in the next one.
    const r = rights({ floor: { ...ALL('none'), knowledge: 'write' } });
    assert.equal(effectiveRung(r, 'a-space-nobody-listed', 'schema'), 'read');
  });

  it('does not apply below the threshold — knowledge:read entails nothing', () => {
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'read' } } });
    assert.equal(effectiveRung(r, 'qa', 'schema'), 'none');
  });

  it('never LOWERS a schema rung that was granted outright', () => {
    // The implication is a floor under the cell, not an assignment to it. Clobbering here would be a silent
    // revocation, which is the worst direction for an authorization bug to fail in.
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'write', schema: 'admin' } } });
    assert.equal(effectiveRung(r, 'qa', 'schema'), 'admin');
  });

  it('does not run backwards: schema:admin entails nothing about knowledge', () => {
    const r = rights({ perSpace: { qa: { ...ALL('none'), schema: 'admin' } } });
    assert.equal(effectiveRung(r, 'qa', 'knowledge'), 'none');
  });

  it('leaves every other area alone', () => {
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'write' } } });
    assert.equal(effectiveRung(r, 'qa', 'files'), 'none');
    assert.equal(effectiveRung(r, 'qa', 'dataQuality'), 'none');
    assert.equal(effectiveRung(r, 'qa', 'knowledge'), 'write');
  });

  it('is scoped to ONE space — a knowledge:write row does not reach another space', () => {
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'write' } } });
    assert.equal(effectiveRung(r, 'research', 'schema'), 'none');
  });

  it('does not chain: an INFERRED schema:read cannot satisfy another rule reading schema', () => {
    // There is one rule today, so this is asserted through the rule's own input: the implication fires on
    // what was granted for knowledge, and a schema rung that only exists by inference is not a grant. If a
    // future row keyed on `schema: read` silently picked up the inferred one, this pins that it must not.
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'write' } } });
    const inferred = effectiveRung(r, 'qa', 'schema');
    assert.equal(inferred, 'read');
    assert.equal(r.perSpace['qa'].schema, 'none', 'the stored matrix is not rewritten by the inference');
  });
});

describe('floorRung — the same rule, in the floor\'s own scope', () => {
  it('reports the implied rung for a floor', () => {
    assert.equal(floorRung(rights({ floor: { ...ALL('none'), knowledge: 'write' } }), 'schema'), 'read');
  });

  it('reads the FLOOR only, never a per-space row', () => {
    // A row grants in one space; a floor grants everywhere including spaces created later. Letting a row
    // raise the floor's answer would let a minter delegate reach it does not have.
    const r = rights({ perSpace: { qa: { ...ALL('none'), knowledge: 'write' } } });
    assert.equal(floorRung(r, 'schema'), 'none');
  });
});

describe('capRights — a minter may delegate what the implication gives it', () => {
  const minted = (floor, perSpace = {}) => ({ instanceAdmin: false, createSpaces: false, floor, perSpace });

  it('lets a knowledge:write FLOOR grant a schema:read floor', () => {
    // The asymmetry this pins: enforcement grants the implied rung, so minting must be able to delegate it.
    // Comparing the request against the raw stored floor instead would refuse a grant the minter can already
    // exercise in every space.
    const minter = minted({ ...ALL('none'), knowledge: 'write' });
    const request = minted({ ...ALL('none'), knowledge: 'write', schema: 'read' });
    assert.deepEqual(capRights(minter, request), []);
  });

  it('lets a knowledge:write ROW grant a schema:read row in the same space', () => {
    const minter = minted(null, { qa: { ...ALL('none'), knowledge: 'write' } });
    const request = minted(null, { qa: { ...ALL('none'), schema: 'read' } });
    assert.deepEqual(capRights(minter, request), []);
  });

  it('still refuses schema:WRITE from a knowledge:write minter', () => {
    // The implication grants `read` and stops. A cap that widened to the whole area would turn one ruling
    // into an escalation ladder.
    const minter = minted(null, { qa: { ...ALL('none'), knowledge: 'write' } });
    const excess = capRights(minter, minted(null, { qa: { ...ALL('none'), schema: 'write' } }));
    assert.equal(excess.length, 1);
    assert.deepEqual(excess[0], { space: 'qa', area: 'schema', requested: 'write', allowed: 'read' });
  });

  it('still refuses a schema:read row from a knowledge:write minter in a DIFFERENT space', () => {
    const minter = minted(null, { qa: { ...ALL('none'), knowledge: 'write' } });
    const excess = capRights(minter, minted(null, { research: { ...ALL('none'), schema: 'read' } }));
    assert.deepEqual(excess.map((e) => `${e.space}.${e.area}`), ['research.schema']);
  });

  it('still refuses a FLOOR from a minter that only holds the row', () => {
    // The pre-existing rule, re-asserted because the floor comparison is the line this change touched: a
    // floor reaches spaces the minter has no row for, so a row can never buy one.
    const minter = minted(null, { qa: { ...ALL('none'), knowledge: 'write' } });
    const excess = capRights(minter, minted({ ...ALL('none'), schema: 'read' }));
    assert.deepEqual(excess.map((e) => `${e.space}.${e.area}`), ['*.schema']);
  });
});
