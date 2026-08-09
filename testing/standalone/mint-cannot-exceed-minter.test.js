/**
 * A minted token can never exceed the token that minted it.
 *
 * ## What breaks without this
 *
 * Minting is delegated: a space admin may issue tokens for their own spaces. Uncapped, that is an escalation
 * ladder — mint a token holding more than you do, then authenticate as it. Nothing about the result looks
 * wrong afterwards; the token is valid, and its rights read as though somebody granted them.
 *
 * ## The two properties that are easy to get subtly wrong
 *
 *  1. **The minter's reach is floor OR row, whichever is higher.** Reading only the row under-reports a
 *     minter with a broad floor and refuses grants it was entitled to make; reading only the floor
 *     under-reports one with a specific row. Either way the bug is a refusal, which gets reported — but the
 *     inverse of that mistake in the floor comparison is a GRANT, which does not.
 *  2. **A floor may only come from a floor.** A minter with no floor and `write` on one space may pass that
 *     row on. It may not grant a FLOOR, because a floor reaches every space including ones created later —
 *     which the minter itself cannot reach. That is the case where "highest rung anywhere" would be exactly
 *     the wrong comparison.
 *
 * Run: node --test testing/standalone/mint-cannot-exceed-minter.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let capRights, effectiveRung, describeExcess;
before(async () => {
  ({ capRights, effectiveRung, describeExcess } = await import('../../server/dist/auth/mint-cap.js'));
});

const R = (r) => ({ knowledge: r, files: r, schema: r, dataQuality: r });
const rights = (over = {}) => ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

describe('the cap', () => {
  it('allows a grant equal to the minter', () => {
    const m = rights({ perSpace: { qa: R('write') } });
    assert.deepEqual(capRights(m, rights({ perSpace: { qa: R('write') } })), []);
  });

  it('refuses a rung above the minter, and names it', () => {
    const m = rights({ perSpace: { qa: R('write') } });
    const e = capRights(m, rights({ perSpace: { qa: R('admin') } }));
    assert.equal(e.length, 4, 'every area over the line should be reported, not just the first');
    assert.match(describeExcess(e), /qa\.knowledge: asked admin, you hold write/);
  });

  it('refuses a space the minter cannot reach at all', () => {
    const m = rights({ perSpace: { qa: R('admin') } });
    const e = capRights(m, rights({ perSpace: { other: R('read') } }));
    assert.equal(e.length, 4);
    assert.match(describeExcess(e), /other\.knowledge: asked read, you hold none/);
  });

  it('counts the minter as floor OR row, whichever is higher', () => {
    // A `read` floor plus a `write` row on qa means the minter holds write there, and may pass it on.
    const m = rights({ floor: R('read'), perSpace: { qa: R('write') } });
    assert.equal(effectiveRung(m, 'qa', 'knowledge'), 'write');
    assert.equal(effectiveRung(m, 'elsewhere', 'knowledge'), 'read', 'the floor must apply to unlisted spaces');
    assert.deepEqual(capRights(m, rights({ perSpace: { qa: R('write'), elsewhere: R('read') } })), []);
  });

  it('a FLOOR may only come from a floor, never from a row', () => {
    // The case where "highest rung anywhere" is the wrong comparison. A floor reaches every space including
    // ones created later; a minter with only a row on qa cannot reach those, so it cannot grant one.
    const m = rights({ perSpace: { qa: R('admin') } });
    const e = capRights(m, rights({ floor: R('read') }));
    assert.equal(e.length, 4, 'granting a floor from a row must be refused for every area');
    assert.match(describeExcess(e), /floor\.knowledge: asked read, you hold none/);
  });

  it('a minter WITH a floor may grant up to it', () => {
    const m = rights({ floor: R('write') });
    assert.deepEqual(capRights(m, rights({ floor: R('read') })), []);
    assert.deepEqual(capRights(m, rights({ floor: R('write') })), []);
    assert.equal(capRights(m, rights({ floor: R('admin') })).length, 4);
  });

  it('instance admin and createSpaces are held or not — they do not cap', () => {
    const plain = rights({ floor: R('admin') });
    assert.equal(capRights(plain, rights({ instanceAdmin: true })).length, 1,
      'area admin everywhere must NOT imply the instance switch');
    assert.equal(capRights(plain, rights({ createSpaces: true })).length, 1);
    const boss = rights({ instanceAdmin: true, createSpaces: true, floor: R('admin') });
    assert.deepEqual(capRights(boss, rights({ instanceAdmin: true, createSpaces: true })), []);
  });

  it('reports EVERY excess, so one refusal can be fixed in one edit', () => {
    const m = rights({ perSpace: { qa: R('read') } });
    const e = capRights(m, rights({ instanceAdmin: true, perSpace: { qa: R('admin'), nope: R('read') } }));
    assert.equal(e.length, 1 + 4 + 4, 'stopping at the first excess turns one fix into several round trips');
  });

  it('an empty request is always allowed', () => {
    assert.deepEqual(capRights(rights(), rights()), []);
  });
});
