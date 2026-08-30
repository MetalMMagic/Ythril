/**
 * Every upsert validates the record it will PRODUCE, not the payload it was handed.
 *
 * ## The defect
 *
 * `create_chrono` with a supplied `_id` that already names an entry does not duplicate — it CONVERGES, and the
 * converge branch stores `mergeProperties(existing.properties, incoming.properties)`. Both doors validated the
 * incoming properties alone, so the document checked was not the document written, and it failed in **both
 * directions at once**:
 *
 *  - a required key present on the STORED record and absent from the request read as a violation, and 400d a
 *    converge the merge would have satisfied;
 *  - a violating key already stored was never re-examined, so it survived a write that had every chance to
 *    notice it.
 *
 * Entities and edges have validated the merged form since their upserts were written, and both chrono UPDATE
 * paths already did too. So the rule existed three times and was missing from the fourth — this repo's most
 * frequent defect, in its quietest form: not a wrong implementation, an absent one.
 *
 * ## What is asserted
 *
 * The CLASSIFIERS, exercised as functions, because the merge order is the whole rule and a source read cannot
 * check it. Plus that every upsert door reaches one: a classifier nothing calls is a rule that exists on paper.
 *
 * Run: node --test testing/standalone/an-upsert-validates-what-it-will-store.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { statementAround } from './_structural-window.mjs';

const { classifyChronoUpsertAgainst, classifyEntityUpsertAgainst, classifyEdgeUpsertAgainst } =
  await import('../../server/dist/brain/write-validation.js');

/** A space that requires `severity`, and constrains it — enough to see both failure directions. */
const META = {
  validationMode: 'strict',
  typeSchemas: {
    chrono: { release: { propertySchemas: { severity: { type: 'string', required: true, enum: ['low', 'high'] } } } },
    entity: { person: { propertySchemas: { severity: { type: 'string', required: true, enum: ['low', 'high'] } } } },
  },
};

describe('a converge is judged on the merged record', () => {
  it('a required key already STORED is not a violation just because the request omits it', () => {
    /*
     * The first failure direction, and the one an operator meets: they PATCH-by-converge to change a title,
     * send no `properties`, and are refused for a required field that is sitting in the record already. The
     * merge would have supplied it; only the payload was ever missing it.
     */
    const v = classifyChronoUpsertAgainst(
      META,
      { type: 'release', properties: { severity: 'low' } },
      { type: 'release' },
    );
    assert.equal(v.blocked, false, 'the merged record has `severity` — the write must not be refused');
    assert.deepEqual(v.introduced, [], 'and nothing was introduced by a request that changed no property');
  });

  it('a violating key already STORED is reported rather than passing unseen', () => {
    // The second direction. It does not BLOCK — that is the P-6 ruling, and `preExisting` is where it goes —
    // but a write that had every opportunity to notice it must not answer as though the record were clean.
    const v = classifyChronoUpsertAgainst(
      META,
      { type: 'release', properties: { severity: 'catastrophic' } },
      { type: 'release', properties: {} },
    );
    assert.ok(v.preExisting.length > 0, 'the stored violation must be surfaced');
    assert.deepEqual(v.introduced, [], 'and must not be blamed on a request that did not cause it');
    assert.equal(v.blocked, false, 'a pre-existing violation does not freeze the record — see P-6');
  });

  it('a violation the REQUEST introduces still blocks', () => {
    // The half that must not be weakened by any of the above.
    const v = classifyChronoUpsertAgainst(
      META,
      { type: 'release', properties: { severity: 'low' } },
      { type: 'release', properties: { severity: 'catastrophic' } },
    );
    assert.equal(v.blocked, true, 'the request replaced a valid value with an invalid one');
    assert.ok(v.introduced.length > 0);
  });

  it('with no existing record it is a plain insert, judged on the payload', () => {
    const ok = classifyChronoUpsertAgainst(META, null, { type: 'release', properties: { severity: 'low' } });
    assert.equal(ok.blocked, false);
    const bad = classifyChronoUpsertAgainst(META, null, { type: 'release', properties: {} });
    assert.equal(bad.blocked, true, 'a fresh insert missing a required property is still refused');
  });

  it('chrono now behaves like the entity and edge classifiers it was missing', () => {
    /*
     * The parity claim, stated as an assertion rather than as prose.
     *
     * All three are given the same situation — a required key present on the stored record, absent from the
     * request — and all three must agree it is not a violation. This is what "the rule existed three times
     * and was missing from the fourth" means, and it is the thing that would silently diverge again.
     */
    const stored = { properties: { severity: 'low' } };
    const sent = {};
    const chrono = classifyChronoUpsertAgainst(META, { type: 'release', ...stored }, { type: 'release', ...sent });
    const entity = classifyEntityUpsertAgainst(
      META, { name: 'x', type: 'person', ...stored }, { name: 'x', type: 'person', ...sent });
    const edge = classifyEdgeUpsertAgainst(META, { label: 'l', ...stored }, { label: 'l', ...sent });
    for (const [what, v] of [['chrono', chrono], ['entity', entity], ['edge', edge]]) {
      assert.equal(v.blocked, false, `${what} refused a converge the merge satisfies`);
    }
  });
});

describe('both doors reach a classifier', () => {
  const DOORS = [
    { what: 'REST', file: 'server/src/api/brain/chrono.ts' },
    { what: 'MCP', file: 'server/src/mcp/tools/chrono.ts' },
  ];

  it('each create path calls classifyChronoUpsert', () => {
    // A classifier nothing calls is a rule that exists on paper. Both doors, because one door adopting it is
    // how the four validators drifted in the first place.
    for (const d of DOORS) {
      assert.match(
        stripComments(readFileSync(d.file, 'utf8')), /classifyChronoUpsert\(/,
        `${d.what} still validates the chrono payload rather than the record it will store`,
      );
    }
  });

  it('and passes the supplied id, or the merge can never be seen', () => {
    /*
     * The argument that makes it work. `classifyChronoUpsert(space, incoming, undefined)` loads no existing
     * record and degrades silently to exactly the old behaviour — a call that looks correct in review and
     * fixes nothing. On both doors the id also had to move ABOVE the check to be available at all.
     */
    for (const d of DOORS) {
      const src = stripComments(readFileSync(d.file, 'utf8'));
      const at = src.indexOf('classifyChronoUpsert(');
      const stmt = statementAround(src, at, `${d.what} chrono upsert check`);
      assert.doesNotMatch(
        stmt, /,\s*undefined\s*\)/,
        `${d.what} passes no id, so no existing record is ever loaded and the merged form is never checked`,
      );
      assert.match(stmt, /Id\b|id\b/, `${d.what} must pass the caller-supplied id`);
    }
  });
});
