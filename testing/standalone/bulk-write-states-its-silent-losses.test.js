/**
 * `bulk_write` says where it loses data quietly, and each claim is pinned to the code.
 *
 * ## Two silent losses and one asymmetry
 *
 * **1. Items past 500 per collection vanish.** `slice(v, 0, BULK_MAX_PER_TYPE)` runs before validation, so
 * entry 501 is not rejected — it is never seen. It appears in neither `inserted` nor `errors`, and nothing in
 * the reply hints that the payload was truncated. The old description mentioned the cap inside one
 * parameter's own text ("excess entries are dropped") where a caller reading the tool summary would not meet
 * it, and never said the loss was unreported.
 *
 * **2. A successful call may have written nothing.** Partial success is the contract, so there is no failure
 * status: every rejection lands in `errors` and the call still returns normally. A caller who treats the
 * result as proof of success is wrong, and this tool invites exactly that.
 *
 * **3. References are checked for SHAPE, never existence** — unlike `remember` and `update_memory`, which
 * call `assertRefsResolve` under strict linkage and refuse a link that points at nothing. Bulk deliberately
 * does not, because a payload may reference an entity created later in the same call and an existence check
 * would reject valid forward references. The cost is real and worth stating: bulk can store a dangling link
 * the single-record path would have refused.
 *
 * Run: node --test testing/standalone/bulk-write-states-its-silent-losses.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const TOOL = stripComments(readFileSync('server/src/mcp/tools/bulk.ts', 'utf8'));
const CORE = stripComments(readFileSync('server/src/brain/bulk.ts', 'utf8'));
const MEMORY_TOOL = stripComments(readFileSync('server/src/mcp/tools/memory.ts', 'utf8'));

const DESC = (() => {
  const at = TOOL.indexOf("name: 'bulk_write'");
  assert.ok(at > 0, 'bulk_write not found — the scanner is wrong, not the code');
  const d = TOOL.indexOf('description:', at);
  const end = TOOL.slice(d).search(/\n {2,}(mutating|spaceRequired|skipSchemaValidation|inputSchema|async handle):/);
  assert.ok(end > 0, 'could not find the end of bulk_write\'s description');
  return TOOL.slice(d, d + end);
})();

describe('the 500 cap is described as the silent loss it is', () => {
  it('says it is SILENT, not merely that a cap exists', () => {
    assert.match(DESC, /SILENTLY DROPPED/,
      'a cap a caller can see in `errors` is survivable; one they cannot is not');
  });

  it('says the drop appears in neither counter', () => {
    assert.match(DESC, /not counted in\s*'?\s*\+?\s*'?`errors`|not counted in `errors`/,
      'the reply gives no way to detect the truncation, which is the actionable half');
  });

  it('says the cap is PER COLLECTION, so a caller does not split unnecessarily', () => {
    assert.match(DESC, /per collection/i, '500 memories and 500 entities in one call is fine');
  });

  it('and the truncation really happens before validation', () => {
    // Pinned to the implementation: if the slice ever moved after validation, or started reporting, this
    // description would be overstating the danger.
    assert.match(CORE, /export const BULK_MAX_PER_TYPE = 500/, 'the cap');
    assert.match(CORE, /v\.slice\(0, BULK_MAX_PER_TYPE\)/, 'applied by a plain slice');
    assert.doesNotMatch(CORE, /truncated|droppedCount/,
      'a truncation report appeared — say so in the description instead of calling it silent');
  });
});

describe('partial success is stated as the trap it is', () => {
  it('leads with "may have written nothing"', () => {
    assert.match(DESC, /MAY HAVE WRITTEN NOTHING/,
      'there is no failure status, so the caller has to be told to look');
  });

  it('names both response fields the caller must read', () => {
    assert.match(DESC, /`inserted`/, 'what landed');
    assert.match(DESC, /`errors`/, 'and what did not');
  });

  it('and says errors are indexed, so a caller can map them back', () => {
    assert.match(DESC, /INDEX/, 'an error without a position is not actionable on a 500-item batch');
    assert.match(CORE, /errors\.push\(\{ type: 'memory', index: i/, 'and they really are');
  });
});

describe('the reference-checking asymmetry is stated', () => {
  it('says shape is checked and existence is not', () => {
    assert.match(DESC, /SHAPE, NEVER FOR EXISTENCE/, 'the difference from the single-record tools');
  });

  it('says WHY, so nobody "fixes" it into rejecting forward references', () => {
    assert.match(DESC, /forward reference/i,
      'the reason is the design constraint — an existence check would break valid batches');
  });

  it('and the asymmetry is real: bulk checks format, the single-record path checks resolution', () => {
    assert.match(CORE, /UUID_V4_RE\.test\(id\)/, 'bulk checks the shape');
    assert.doesNotMatch(CORE, /assertRefsResolve/,
      'bulk gained an existence check — the description now misdescribes it');
    assert.match(MEMORY_TOOL, /assertRefsResolve\(/,
      'and the single-record path still resolves, which is what makes this a contrast');
  });
});

describe('the processing order is stated with its consequence', () => {
  it('names the order', () => {
    assert.match(DESC, /memories → entities → edges → chrono/, 'the order itself');
  });

  it('and says what it buys — an edge naming an entity from the same batch', () => {
    assert.match(DESC, /edge may name an entity created in the\s*'?\s*\+?\s*'?same batch|same batch/,
      'the order is only interesting because of what it makes possible');
  });

  it('and the code really runs in that order', () => {
    const iMem = CORE.indexOf('const memories = slice(input.memories)');
    const iEnt = CORE.indexOf('const entities = slice(input.entities)');
    const iEdge = CORE.indexOf('const edges = slice(input.edges)');
    const iChrono = CORE.indexOf('const chrono = slice(input.chrono)');
    assert.ok(iMem > 0 && iEnt > iMem && iEdge > iEnt && iChrono > iEdge,
      `order changed: memories=${iMem} entities=${iEnt} edges=${iEdge} chrono=${iChrono}`);
  });
});
