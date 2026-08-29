/**
 * A label the SERVER writes is permitted by an allowlist that does not name it — and is validated otherwise.
 *
 * ## Why this exists
 *
 * Since `upsertEdge` began validating, no caller can reach the edges collection around the schema — including
 * `api/contradictions.ts`, which writes `supersedes` when a reviewer resolves a contradiction. That is correct,
 * and it created a trap: a space that declared an edge-label allowlist and did not happen to name `supersedes`
 * would have its contradiction machinery start refusing, **punishing exactly the operators who took the schema
 * seriously**.
 *
 * Owner's ruling, 2026-08-29: subject to the allowlist, but the allowlist should be correct **by
 * construction** rather than by an operator remembering.
 *
 * ## The form matters, and this pins it
 *
 * Seeding the label into each new space's schema is the other reading, and it leaves every EXISTING space
 * wrong until a backfill runs — the same gap `ensure-query-indexes.ts` has, where an addition reaches only
 * spaces created afterwards. Permitting by construction has no migration and leaves no space behind.
 *
 * **It is not an exemption.** Only the LABEL is taken as given, because the label is the server's rather than
 * the caller's; the record is still checked against its type schema's `propertySchemas` like any other. A
 * future change that turned this into "skip validation for server edges" would be the defect this whole line
 * of work has been removing, so the third case below refuses it.
 *
 * Run: node --test testing/standalone/server-written-edge-labels-need-no-allowlist-entry.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { validateEdge, SERVER_WRITTEN_EDGE_LABELS } = await import('../../server/dist/spaces/schema-validation.js');

/** A space with a real allowlist that does NOT name the server's label. */
const META = {
  validationMode: 'strict',
  typeSchemas: {
    edge: {
      works_at: { propertySchemas: { since: { type: 'string' } } },
      knows: {},
    },
  },
};

describe('server-written edge labels need no allowlist entry', () => {
  it('the set is not empty, and names the label the server actually writes', () => {
    // A vacuous set would make every assertion below pass while protecting nothing.
    assert.ok(SERVER_WRITTEN_EDGE_LABELS.size > 0, 'SERVER_WRITTEN_EDGE_LABELS is empty');
    assert.ok(
      SERVER_WRITTEN_EDGE_LABELS.has('supersedes'),
      "'supersedes' is written by api/contradictions.ts and must be permitted",
    );
  });

  it('a caller label absent from the allowlist is still refused', () => {
    // The control: without this the whole allowlist could be disabled and the other cases would not notice.
    const v = validateEdge(META, { label: 'invented_by_a_caller', properties: {} });
    assert.ok(
      v.some(x => x.field === 'label'),
      'the allowlist must still refuse labels it does not name — otherwise this change disabled it entirely',
    );
  });

  it('the server label passes an allowlist that does not name it', () => {
    const v = validateEdge(META, { label: 'supersedes', properties: {} });
    assert.deepEqual(
      v.filter(x => x.field === 'label'), [],
      'a space that declared an allowlist without naming `supersedes` would have its contradiction '
      + 'machinery refuse — punishing the operators who took the schema seriously',
    );
  });

  it('a server label is NOT exempt from the rest of the schema', () => {
    // Only the label is taken as given. If somebody later declares a type schema for `supersedes`, its
    // property rules must still apply — otherwise this is an exemption wearing a narrower name.
    const metaWithRules = {
      validationMode: 'strict',
      typeSchemas: {
        edge: {
          works_at: {},
          supersedes: { propertySchemas: { reason: { type: 'string', required: true } } },
        },
      },
    };
    const v = validateEdge(metaWithRules, { label: 'supersedes', properties: {} });
    assert.ok(
      v.length > 0,
      'a declared schema for a server-written label must still be enforced — the label is given, the record is not',
    );
  });
});
