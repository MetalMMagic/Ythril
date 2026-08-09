/**
 * The rights-based reach check answers the SAME question as the legacy `spaces` allowlist.
 *
 * ## Why this test has to exist before the guard changes
 *
 * `enforceSpaceScope` decides "may this token touch this space" from `record.spaces`. The rights matrix
 * decides it from `floor` and `perSpace`. Swapping one for the other is the single change in this feature
 * where a mistake is **silent widening**: a token reaching a space it never could, with no error, nothing in
 * the response, and nothing in the logs. The token works. It looks configured.
 *
 * So the two are proved equivalent here, across every token shape, before anything is switched. If this file
 * cannot be made green, the switch is not ready — that is the whole point of writing it first.
 *
 * ## The legacy rule, stated exactly
 *
 * `record.spaces` absent → reaches every space, including ones created later.
 * `record.spaces` present → reaches exactly the listed ids, and an empty list reaches nothing.
 *
 * Run: node --test testing/standalone/rights-reach-matches-legacy.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let reachesSpace, migrateToken;
before(async () => {
  ({ reachesSpace } = await import('../../server/dist/auth/space-reach.js'));
  ({ migrateToken } = await import('../../server/dist/auth/rights-migration.js'));
});

/** The legacy rule, written out so the comparison is against a statement of it rather than against itself. */
const legacyReaches = (t, spaceId) => (t.schemaLibrary ? false : t.spaces === undefined || t.spaces.includes(spaceId));

describe('rights-based reach agrees with the legacy allowlist', () => {
  it('agrees for every token shape, on listed, unlisted and future spaces', () => {
    const shapes = [
      {}, { admin: true }, { readOnly: true },
      { spaces: [] }, { spaces: ['qa'] }, { spaces: ['qa', 'tasks'] },
      { admin: true, spaces: ['qa'] }, { readOnly: true, spaces: ['qa'] },
      { schemaLibrary: true, readOnly: true, spaces: [] },
      { peerInstanceId: 'i-1', spaces: ['fleet'] },
    ];
    // 'created-later' is in nobody's list: it stands for a space that did not exist when the token was
    // minted, which is the case the floor exists to express and the one an allowlist answers by omission.
    const spaces = ['qa', 'tasks', 'fleet', 'other', 'created-later'];
    let compared = 0;
    for (const t of shapes) {
      const rights = migrateToken(t);
      for (const s of spaces) {
        assert.equal(
          reachesSpace(rights, s), legacyReaches(t, s),
          `disagreement on ${JSON.stringify(t)} / '${s}' — rights say ${reachesSpace(rights, s)}, legacy says ${legacyReaches(t, s)}`,
        );
        compared++;
      }
    }
    // Asserted so a loop that silently stops iterating cannot pass as agreement.
    assert.equal(compared, shapes.length * spaces.length, `expected 50 comparisons, made ${compared}`);
  });

  it('an unscoped token reaches a space created after it was minted', () => {
    // The property an allowlist expresses by ABSENCE and the matrix expresses by a floor. Getting this wrong
    // is the one direction that widens rather than refuses, so it is asserted on its own as well.
    assert.equal(reachesSpace(migrateToken({}), 'invented-tomorrow'), true);
    assert.equal(reachesSpace(migrateToken({ spaces: ['qa'] }), 'invented-tomorrow'), false);
  });

  it('a schemaLibrary token reaches nothing, despite carrying readOnly', () => {
    assert.equal(reachesSpace(migrateToken({ schemaLibrary: true, readOnly: true, spaces: [] }), 'qa'), false);
  });

  it('the comparison would NOTICE a widening', () => {
    // Mutation-check on the test itself: if `reachesSpace` returned true unconditionally, the assertions
    // above must fail. A green run here would otherwise prove only that both functions were called.
    const alwaysTrue = { floor: { knowledge: 'read', files: 'read', schema: 'read', dataQuality: 'read' }, perSpace: {} };
    assert.equal(reachesSpace(alwaysTrue, 'anything'), true);
    const neverReaches = { floor: null, perSpace: {} };
    assert.equal(reachesSpace(neverReaches, 'anything'), false,
      'a token with no floor and no rows must reach nothing — otherwise the check cannot refuse at all');
  });
});
