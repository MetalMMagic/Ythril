/**
 * Every token gets a rights object at load, and an existing one is never overwritten.
 *
 * ## What this covers that the mapping tests do not
 *
 * `rights-migration.test.js` proves the MAPPING is correct for every token shape. This proves the
 * BACKFILL applies it — that the loop runs, that it reaches every token, and that it does not clobber a
 * rights object somebody already set. A correct mapping nobody calls, or one that overwrites a deliberate
 * edit, both look identical to working.
 *
 * ## Why the count is returned and asserted
 *
 * A `for` loop that silently iterates nothing is the failure this file exists to catch, and it is invisible
 * from the outside: every token would simply have no rights, exactly as before the feature. So the function
 * reports how many it filled and the tests assert that number rather than only inspecting the result.
 *
 * Run: node --test testing/standalone/token-rights-backfill.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let backfillTokenRights;
before(async () => {
  ({ backfillTokenRights } = await import('../../server/dist/auth/backfill-token-rights.js'));
});

const tok = (over) => ({ id: 'i', name: 'n', hash: 'h', prefix: 'p', createdAt: '', lastUsed: null, expiresAt: null, admin: false, ...over });

describe('the rights backfill', () => {
  it('fills every token that has none, and says how many', () => {
    const cfg = { tokens: [tok({ id: 'a' }), tok({ id: 'b', readOnly: true }), tok({ id: 'c', spaces: ['qa'] })] };
    assert.equal(backfillTokenRights(cfg), 3, 'the loop did not reach every token');
    for (const t of cfg.tokens) assert.ok(t.rights, `${t.id} has no rights`);
  });

  it('derives from the legacy fields rather than defaulting', () => {
    // If it wrote a constant, every token would look the same and the count would still be right.
    const cfg = { tokens: [tok({ id: 'a', admin: true }), tok({ id: 'b', readOnly: true }), tok({ id: 'c', spaces: ['qa'] })] };
    backfillTokenRights(cfg);
    assert.equal(cfg.tokens[0].rights.instanceAdmin, true);
    assert.equal(cfg.tokens[1].rights.instanceAdmin, false);
    assert.equal(cfg.tokens[1].rights.floor.knowledge, 'read');
    assert.equal(cfg.tokens[2].rights.floor, null, 'a scoped token must not get a floor');
    assert.deepEqual(Object.keys(cfg.tokens[2].rights.perSpace), ['qa']);
  });

  it('NEVER overwrites a rights object that is already there', () => {
    // Once these become editable, a re-run at every boot would silently revert an operator's change back to
    // whatever the legacy fields imply — and the legacy fields will still be sitting there.
    const mine = { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { only: { knowledge: 'read' } } };
    const cfg = { tokens: [tok({ id: 'a', admin: true, rights: mine })] };
    assert.equal(backfillTokenRights(cfg), 0, 'it reported filling a token that already had rights');
    assert.equal(cfg.tokens[0].rights, mine, 'an existing rights object was replaced');
  });

  it('is a no-op on an empty or absent token list, without throwing', () => {
    assert.equal(backfillTokenRights({ tokens: [] }), 0);
    assert.equal(backfillTokenRights({}), 0, 'a config with no tokens key must not throw during boot');
  });

  it('is idempotent — a second run fills nothing', () => {
    // It runs on every config load, not once. A second pass reporting work would mean it is rewriting.
    const cfg = { tokens: [tok({ id: 'a' }), tok({ id: 'b' })] };
    assert.equal(backfillTokenRights(cfg), 2);
    assert.equal(backfillTokenRights(cfg), 0);
  });
});
