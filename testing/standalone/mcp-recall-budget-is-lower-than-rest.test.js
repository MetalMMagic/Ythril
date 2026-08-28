/**
 * The MCP door's default byte budget is LOWER than REST's, and the divergence is stated on both doors.
 *
 * ## Why a divergence needs its own gate
 *
 * `CLAUDE.md`'s first rule is that MCP and REST are one API with two doors, taking the same parameters — and
 * that the half which hides is the parameters, not the capabilities. This change deliberately breaks symmetry
 * on one value, so it is exactly the shape that rule exists to catch. The defence is that the divergence is
 * *the narrowing itself*: both doors accept `maxBytes` with the same floor, ceiling and refusal, and only the
 * number applied when the caller says nothing differs.
 *
 * That defence is only true while three things hold, and none of them holds by itself:
 *
 *  1. the MCP default is genuinely lower, not merely different;
 *  2. every MCP call site uses it — one site left on the REST default would make the behaviour depend on which
 *     tool the caller picked, which is worse than either number;
 *  3. both doors SAY so, in the surface a caller reads while constructing arguments.
 *
 * ## The measurement behind it
 *
 * The canary operator, 2026-08-20T0925Z: a recall answered `bytesReturned: 98356` against `budgetBytes: 100000`,
 * correct and fully specified, and their MCP client refused it outright and spilled it to a local file. Their
 * own diagnosis is why the answer is a lower default rather than better docs: *"the old 25-record cap had been
 * acting as the de facto size guard on the MCP door, and removing it removed that guard along with the cliff
 * we were complaining about."*
 *
 * ## What this gate does NOT assert
 *
 * The exact number. 25 000 is chosen from the safe side of ONE refusal — we have no measurement of where any
 * client's ceiling actually is — so pinning it would be pinning a guess. What is pinned is the ORDERING and the
 * disclosure, which are the parts a future edit can break silently.
 *
 * Run: node --test testing/standalone/mcp-recall-budget-is-lower-than-rest.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statementFrom } from './_structural-window.mjs';

const MCP = readFileSync('server/src/mcp/tools/search.ts', 'utf8');
const REST = readFileSync('server/src/api/brain/search.ts', 'utf8');

let DEFAULT_MAX_BYTES, MCP_DEFAULT_MAX_BYTES, MIN_MAX_BYTES, MAX_MAX_BYTES, resolveBudget;
before(async () => {
  ({ DEFAULT_MAX_BYTES, MCP_DEFAULT_MAX_BYTES, MIN_MAX_BYTES, MAX_MAX_BYTES, resolveBudget } =
    await import('../../server/dist/brain/result-budget.js'));
});

describe('the two defaults', () => {
  it('are both defined, and MCP is the lower one', () => {
    assert.equal(typeof DEFAULT_MAX_BYTES, 'number');
    assert.equal(typeof MCP_DEFAULT_MAX_BYTES, 'number');
    assert.ok(MCP_DEFAULT_MAX_BYTES < DEFAULT_MAX_BYTES,
      `the MCP default (${MCP_DEFAULT_MAX_BYTES}) must be below the REST default (${DEFAULT_MAX_BYTES}) — `
      + 'the whole point is that an agent\'s tool result has a ceiling a REST caller does not');
  });

  it('the MCP default is still inside the range a caller may ask for', () => {
    // A default below the floor would be clamped up and the constant would be a lie; above the ceiling, clamped
    // down. Either way the number a caller reads in the schema would not be the number applied.
    assert.ok(MCP_DEFAULT_MAX_BYTES >= MIN_MAX_BYTES && MCP_DEFAULT_MAX_BYTES <= MAX_MAX_BYTES);
    const resolved = resolveBudget({}, MCP_DEFAULT_MAX_BYTES);
    assert.deepEqual(resolved, { ok: true, bytes: MCP_DEFAULT_MAX_BYTES },
      'the default must survive the clamp unchanged, or the documented number is not the applied one');
  });

  it('a caller who ASKS gets the same answer on either door', () => {
    // The parameter is not narrowed — only the default is. `maxBytes: 400000` must resolve identically no
    // matter which default was in play, or the divergence has leaked from the default into the parameter.
    for (const asked of [MIN_MAX_BYTES, 40_000, 400_000, MAX_MAX_BYTES]) {
      assert.deepEqual(
        resolveBudget({ maxBytes: asked }, MCP_DEFAULT_MAX_BYTES),
        resolveBudget({ maxBytes: asked }, DEFAULT_MAX_BYTES),
        `maxBytes: ${asked} must resolve the same on both doors`);
    }
  });

  it('and the refusal is identical on both doors', () => {
    const a = resolveBudget({ maxBytes: 'plenty' }, MCP_DEFAULT_MAX_BYTES);
    const b = resolveBudget({ maxBytes: 'plenty' }, DEFAULT_MAX_BYTES);
    assert.equal(a.ok, false);
    assert.deepEqual(a, b, 'a bad value must be refused with the same text whichever door it arrived at');
  });
});

describe('every call site uses its own door\'s default', () => {
  it('both MCP recall paths pass the MCP default', () => {
    // Counted, because one site left on the REST default is the defect: the same instance would answer a
    // different size depending on which tool was called, which is worse than either number alone.
    const calls = [...MCP.matchAll(/resolveBudget\(/g)];
    assert.ok(calls.length >= 2, `expected the MCP door to resolve a budget in several tools, found ${calls.length}`);
    const missing = calls
      .filter(m => !/MCP_DEFAULT_MAX_BYTES/.test(statementFrom(MCP, m.index, 'a resolveBudget call')))
      .map(m => `line ${MCP.slice(0, m.index).split('\n').length}`);
    assert.deepEqual(missing, [],
      'these MCP call sites take the REST default, so the size a caller gets depends on which tool they '
      + `picked:\n  ${missing.join('\n  ')}`);
  });

  it('REST keeps the operator default, and does not reach for the MCP one', () => {
    assert.ok([...REST.matchAll(/resolveBudget\(/g)].length >= 2, 'the REST door must still resolve a budget');
    assert.doesNotMatch(REST, /MCP_DEFAULT_MAX_BYTES/,
      'the REST door must not take the MCP default — 100 KB is unremarkable in a REST body');
  });
});

describe('both doors say so, in the surface a caller reads', () => {
  it('the MCP schema names its own default AND the other door\'s', () => {
    /*
     * `help()` tells callers the tool schema IS the authoritative reference, and CLAUDE.md records what a
     * stale sentence there cost: The fleet integrator read "filter applied after vector search", believed it, and built a
     * skill that avoided filtered recall. A default that differs per door and is stated on neither is the same
     * failure waiting — a caller measures 25000, concludes it is the product's limit, and designs around it.
     */
    const hits = [...MCP.matchAll(/DEFAULT 25000 ON THIS DOOR/g)];
    assert.ok(hits.length >= 2,
      `both maxBytes descriptions must state this door's default; found ${hits.length}`);
    assert.match(MCP, /100000 on REST/, 'and name the other door\'s, so the difference is discoverable');
    assert.match(MCP, /RAISE IT IF YOUR CLIENT CAN TAKE MORE/,
      'and say what to do about it — a limit with no lever reads as a product ceiling');
  });

  it('the integration guide states both numbers', () => {
    const guide = readFileSync('docs/integration-guide/04a-recall-api.md', 'utf8');
    assert.match(guide, /`100000` REST \/ `25000` MCP/, 'the parameter table must carry both');
    assert.match(guide, /100 000 over REST, 25 000 over MCP/, 'and so must the prose that explains the budget');
  });

  it('the userguide says the browser gets the LARGER one, and why', () => {
    // The operator-facing half, and the one that would otherwise read as a bug report: a search that answers
    // whole in the UI can come back shortened for an agent asking the same question.
    const ug = readFileSync('docs/userguide/02-brain.md', 'utf8');
    assert.match(ug, /The default\s+here is the\s+larger one/,
      'the Search page must say which side of the divergence it is on');
    assert.match(ug, /deliberate rather/,
      'and say it is deliberate, or the next person to notice files it as an inconsistency');
  });

  it('no surface still claims the answer spills at a RECORD count', () => {
    // The byte budget replaced a 25-record cap in 3.2.0 and `topK`'s description still said "past roughly 25
    // results the answer spills". A schema description is the authoritative reference — a stale sentence there
    // is invisible, because nobody reports a limit they were told they had.
    assert.doesNotMatch(MCP, /past roughly 25 results the answer spills/,
      'this sentence predates the byte budget and describes a cap that no longer exists');
  });
});
