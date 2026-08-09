/**
 * A token cannot raise its own floor.
 *
 * ## Why the floor specifically, and not "cannot edit itself"
 *
 * Editing your own token is ordinary — renaming it, narrowing it, setting an expiry. What must not happen is
 * a token WIDENING itself, and the floor is the only part of the matrix that does so invisibly: it applies
 * to every space including ones that do not exist yet, so raising it grants access to spaces nobody has
 * created and nobody will review.
 *
 * The mint cap stops a token handing more than it holds to a NEW token. Without this rule the same
 * escalation is available by a shorter route: edit yourself, then use yourself. Nothing about the result
 * looks unusual afterwards — the token's rights simply say what they say.
 *
 * ## The two ways to get this subtly wrong
 *
 *  1. **Comparing the floor as one unit.** It is four independent levels. A raise on `schema` would pass
 *     because `knowledge` went down in the same edit — a widening with a decoy attached.
 *  2. **Treating "had no floor" as exempt.** Gaining a floor from nothing is the WIDEST version of this
 *     move, not an exception to it.
 *
 * Run: node --test testing/standalone/floor-cannot-be-self-raised.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let floorRaises, refuseSelfFloorRaise;
before(async () => {
  ({ floorRaises, refuseSelfFloorRaise } = await import('../../server/dist/auth/floor-guard.js'));
});

const F = (over = {}) => ({ knowledge: 'none', files: 'none', schema: 'none', dataQuality: 'none', ...over });
const rights = (floor) => ({ instanceAdmin: false, createSpaces: false, floor, perSpace: {} });

describe('floorRaises', () => {
  it('reports nothing when the floor is unchanged or lowered', () => {
    assert.deepEqual(floorRaises(F({ knowledge: 'write' }), F({ knowledge: 'write' })), []);
    assert.deepEqual(floorRaises(F({ knowledge: 'admin' }), F({ knowledge: 'read' })), []);
    assert.deepEqual(floorRaises(F({ knowledge: 'read' }), null), [], 'removing the floor cannot widen');
  });

  it('reports the area that went up', () => {
    assert.deepEqual(floorRaises(F({ knowledge: 'read' }), F({ knowledge: 'write' })), ['knowledge']);
  });

  it('is per area — a decoy lowering elsewhere does not excuse a raise', () => {
    // The failure this exists for: comparing the floor as one unit lets `schema` climb because `knowledge`
    // dropped in the same edit.
    const from = F({ knowledge: 'admin', schema: 'none' });
    const to = F({ knowledge: 'none', schema: 'admin' });
    assert.deepEqual(floorRaises(from, to), ['schema']);
  });

  it('treats gaining a floor from NONE as a raise, not an exemption', () => {
    // The widest version of the move. A token with no floor reaches only the spaces it names; one with a
    // floor reaches every space that will ever exist.
    assert.deepEqual(floorRaises(null, F({ knowledge: 'read' })), ['knowledge']);
  });
});

describe('the self-edit rule', () => {
  it('refuses a token raising its OWN floor', () => {
    const r = refuseSelfFloorRaise('t1', rights(F({ knowledge: 'read' })), 't1', rights(F({ knowledge: 'admin' })));
    assert.deepEqual(r, ['knowledge']);
  });

  it('allows a token LOWERING its own floor', () => {
    // Refusing this would mean a token cannot reduce its own blast radius — the one self-modification worth
    // encouraging.
    assert.deepEqual(refuseSelfFloorRaise('t1', rights(F({ knowledge: 'admin' })), 't1', rights(F({ knowledge: 'read' }))), []);
  });

  it('does not apply when editing a DIFFERENT token', () => {
    // Granting to someone else is the mint cap's job, not this rule's. Conflating them would refuse an
    // administrator legitimately widening a colleague's token.
    assert.deepEqual(refuseSelfFloorRaise('t1', rights(null), 't2', rights(F({ knowledge: 'admin' }))), []);
  });

  it('identifies self by ID, not by equal rights', () => {
    // Two tokens can hold identical rights and still be different tokens. The rule is about acting on
    // yourself, not about equivalence.
    const same = rights(F({ knowledge: 'read' }));
    assert.deepEqual(refuseSelfFloorRaise('t1', same, 't2', rights(F({ knowledge: 'admin' }))), []);
    assert.deepEqual(refuseSelfFloorRaise('t1', same, 't1', rights(F({ knowledge: 'admin' }))), ['knowledge']);
  });

  it('does not crash when the editor is anonymous', () => {
    // An unauthenticated caller never reaches this route, but a rule that throws on a missing id would turn
    // a 401 into a 500 and hide which one it was.
    assert.deepEqual(refuseSelfFloorRaise(undefined, undefined, 't1', rights(F({ knowledge: 'admin' }))), []);
  });
});
