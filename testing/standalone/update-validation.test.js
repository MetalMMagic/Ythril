/**
 * Updates validate the record AS IT WILL BE, and say whose fault a violation is.
 *
 * ## The hole
 *
 * Creates were validated. Updates were validated **only when the patch used `deleteFields`** — the branch
 * that exists because removing a required property is an obvious way to break a record. Every other patch
 * skipped validation, so `PATCH { properties: { status: "nonsense" } }` wrote a value the same space
 * rejects at create time, in a space explicitly set to `strict`. The stricter the schema, the wider the
 * gap: the one write path an operator relies on to keep records conformant was the one that did not check.
 *
 * ## Why the merged record, and not the patch
 *
 * A patch is a fragment. "Does this fragment satisfy the schema" has no useful answer, because a required
 * property the patch does not mention is present in the record and absent from the patch — so validating
 * the fragment would fail every partial update that happens not to restate every required field.
 *
 * ## Why the split
 *
 * Validating the merged record surfaces a second problem immediately: a record that was **already**
 * non-compliant — written before the schema tightened, imported, or synced from a peer with different
 * meta — now fails on any edit, including one that has nothing to do with the offending field. Reporting
 * that as "your change is invalid" is false in the way that costs an afternoon: the operator stares at a
 * field they did not touch. So violations are classified against the record's prior state, and the message
 * names which situation applies.
 *
 * Run: node --test testing/standalone/update-validation.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let classifyUpdateViolations;
let describeUpdateViolations;
let assertUpdateAllowed;

const STRICT = { validationMode: 'strict' };
const WARN = { validationMode: 'warn' };
const OFF = { validationMode: 'off' };

const v = (field, reason) => ({ field, value: 'whatever', reason });

describe('update validation', () => {
  before(async () => {
    ({ classifyUpdateViolations, describeUpdateViolations, assertUpdateAllowed } =
      await import('../../server/dist/brain/write-validation.js'));
  });

  describe('classification', () => {
    it('calls a violation the patch caused "introduced"', () => {
      const out = classifyUpdateViolations(STRICT, [], [v('status', 'not in enum')]);
      assert.deepEqual(out.introduced.map(x => x.field), ['status']);
      assert.deepEqual(out.preExisting, []);
      assert.equal(out.blocked, true);
    });

    it('calls a violation the record already had "pre-existing"', () => {
      const already = [v('owner', 'required property missing')];
      const out = classifyUpdateViolations(STRICT, already, already);
      assert.deepEqual(out.preExisting.map(x => x.field), ['owner']);
      assert.deepEqual(out.introduced, []);
    });

    it('separates the two when both are present', () => {
      const out = classifyUpdateViolations(
        STRICT,
        [v('owner', 'required property missing')],
        [v('owner', 'required property missing'), v('status', 'not in enum')],
      );
      assert.deepEqual(out.introduced.map(x => x.field), ['status']);
      assert.deepEqual(out.preExisting.map(x => x.field), ['owner']);
    });

    it('does not credit a patch for fixing one violation while adding another on the same field', () => {
      // Keyed on field AND reason. One field can fail two ways at once, and keying on the field alone
      // would let a NEW failure on an already-failing field be waved through as pre-existing.
      const out = classifyUpdateViolations(
        STRICT,
        [v('count', 'not a number')],
        [v('count', 'below minimum')],
      );
      assert.deepEqual(out.introduced.map(x => x.reason), ['below minimum']);
      assert.deepEqual(out.preExisting, []);
    });

    it('still calls it pre-existing when the patch changed the value but not the failure', () => {
      // The value is deliberately excluded from the identity: "a" -> "b", both outside the enum, is the
      // same defect the record already had. Blaming the patch for a constraint it did not break sends the
      // operator after the wrong field.
      const before = [{ field: 'status', value: 'a', reason: 'not in enum' }];
      const after = [{ field: 'status', value: 'b', reason: 'not in enum' }];
      const out = classifyUpdateViolations(STRICT, before, after);
      assert.deepEqual(out.preExisting.map(x => x.field), ['status']);
      assert.deepEqual(out.introduced, []);
    });

    it('reports nothing when the merged record is clean', () => {
      const out = classifyUpdateViolations(STRICT, [v('owner', 'required property missing')], []);
      assert.equal(out.blocked, false);
      assert.deepEqual(out.all, []);
      assert.deepEqual(out.introduced, []);
      assert.deepEqual(out.preExisting, []);
    });

    it('a patch that REPAIRS a pre-existing violation passes', () => {
      // The record is not trapped: validation is of the merged result, so including the broken field in
      // the same request fixes it. That is what makes blocking on a pre-existing violation defensible
      // rather than a dead end.
      const out = classifyUpdateViolations(STRICT, [v('owner', 'required property missing')], []);
      assert.equal(out.blocked, false);
    });
  });

  describe('validation mode', () => {
    it('blocks only in strict', () => {
      const after = [v('status', 'not in enum')];
      assert.equal(classifyUpdateViolations(STRICT, [], after).blocked, true);
      assert.equal(classifyUpdateViolations(WARN, [], after).blocked, false);
      assert.equal(classifyUpdateViolations(OFF, [], after).blocked, false);
      assert.equal(classifyUpdateViolations(undefined, [], after).blocked, false);
    });

    it('still classifies in warn mode, so the report says whose fault it is', () => {
      // Warn mode writes the record and reports; a report that cannot tell the operator which field is
      // theirs is the same failure as a blocking error that cannot.
      const out = classifyUpdateViolations(WARN, [v('owner', 'missing')], [v('owner', 'missing'), v('status', 'bad')]);
      assert.equal(out.blocked, false);
      assert.deepEqual(out.introduced.map(x => x.field), ['status']);
      assert.deepEqual(out.preExisting.map(x => x.field), ['owner']);
    });
  });

  describe('the message', () => {
    it('blames the change when only the change is at fault', () => {
      const m = describeUpdateViolations([v('status', 'x')], []);
      assert.match(m, /change violates/i);
      assert.match(m, /status/);
      assert.ok(!/already non-compliant/i.test(m), 'must not imply a pre-existing problem there is none of');
    });

    it('exonerates the change when the record was already broken', () => {
      const m = describeUpdateViolations([], [v('owner', 'x')]);
      assert.match(m, /already non-compliant/i);
      assert.match(m, /did not cause it/i);
      assert.match(m, /same request/i, 'must say how to get unstuck');
    });

    it('says both, and which is which', () => {
      const m = describeUpdateViolations([v('status', 'x')], [v('owner', 'y')]);
      assert.match(m, /change violates[^.]*status/i);
      assert.match(m, /already non-compliant[^.]*owner/i);
    });

    it('lists each field once even when it fails several ways', () => {
      const m = describeUpdateViolations([v('status', 'not in enum'), v('status', 'wrong type')], []);
      assert.equal(m.match(/status/g).length, 1);
    });
  });

  describe('the MCP gate', () => {
    it('throws on a blocked verdict and is silent otherwise', () => {
      assert.throws(
        () => assertUpdateAllowed(classifyUpdateViolations(STRICT, [], [v('status', 'x')])),
        /schema_violation.*status/s,
      );
      assert.doesNotThrow(() => assertUpdateAllowed(classifyUpdateViolations(WARN, [], [v('status', 'x')])));
    });
  });
});

// ── The wiring, so no write surface can quietly skip the gate again ──────────

const strip = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('every update path runs the gate', () => {
  // Eight surfaces for four record types. The asymmetry this prevents is not hypothetical: `update_chrono`
  // shipped without the type allowlist `create_chrono` enforced, and REST/MCP disagreeing about the same
  // record is the same bug one layer up. A constraint looks enforced right up until someone uses the
  // other door.
  const PATHS = [
    'server/src/api/brain/memories.ts',
    'server/src/api/brain/entities.ts',
    'server/src/api/brain/edges.ts',
    'server/src/api/brain/chrono.ts',
    'server/src/mcp/tools/memory.ts',
    'server/src/mcp/tools/entity.ts',
    'server/src/mcp/tools/edge.ts',
    'server/src/mcp/tools/chrono.ts',
  ];

  for (const p of PATHS) {
    it(`${p} calls classifyUpdateViolations`, () => {
      assert.match(strip(readFileSync(p, 'utf8')), /classifyUpdateViolations\(/,
        'this update surface must validate the merged record');
    });
  }

  it('no update path still gates validation behind deleteFields alone', () => {
    // The exact shape of the original hole: `if (dfPaths) { ...validate... }`. Validation must run
    // unconditionally and merely *apply* the deletions when they are present.
    const offenders = PATHS.filter(p => /if \(dfPaths\) \{[\s\S]{0,600}?validate(Memory|Entity|Edge|Chrono)\(/
      .test(strip(readFileSync(p, 'utf8'))));
    assert.deepEqual(offenders, [],
      'validation must not be conditional on deleteFields — that was the original gap');
  });

  it('the MCP tools import the shared gate rather than reimplementing it', () => {
    for (const p of PATHS.filter(x => x.includes('/mcp/'))) {
      assert.match(readFileSync(p, 'utf8'), /from '\.\.\/\.\.\/brain\/write-validation\.js'/,
        'two copies of a validation rule is how the surfaces drift apart');
    }
  });
});
