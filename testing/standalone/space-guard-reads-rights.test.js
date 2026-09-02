/**
 * The space guard asks the rights matrix, and still refuses everything it refused before.
 *
 * ## What changed, and what must not have
 *
 * `enforceSpaceScope` decided access from `record.spaces`. It now asks `reachesSpace()` on the token's
 * rights, which are derived from the same legacy fields at config load. Behaviour is unchanged BY
 * CONSTRUCTION — but "by construction" is exactly the claim that needs a test, because the failure mode of
 * getting it wrong is a token reaching a space it never could, with nothing to notice.
 *
 * `rights-reach-matches-legacy.test.js` proves the two predicates agree. This proves the GUARD uses the new
 * one, keeps the proxy rule, and keeps the fallback that OIDC callers depend on.
 *
 * ## The fallback is not decoration
 *
 * OIDC-derived tokens are built per request, not read from config, so the backfill never sees them and they
 * carry no `rights`. Without the legacy branch the guard would refuse every OIDC caller — a lockout, not a
 * widening, but a lockout that would reach production because no unit test stands up an OIDC session.
 *
 * Run: node --test testing/standalone/space-guard-reads-rights.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/auth/middleware.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const code = withoutComments(src);

/** The body of `enforceSpaceScope`, sliced to its own closing brace rather than by a character count. */
function guardBody() {
  const i = code.indexOf('function enforceSpaceScope');
  if (i < 0) return null;
  const j = code.indexOf('\n}', i);
  return j < 0 ? null : code.slice(i, j);
}

describe('the space guard', () => {
  it('is still there to be checked', () => {
    // A gate that cannot find its subject passes vacuously and would keep passing after a rename.
    assert.ok(guardBody(), `enforceSpaceScope is gone from ${SRC} — re-point this test`);
  });

  it('asks the rights matrix', () => {
    assert.match(guardBody(), /reachesSpace\(/,
      'the guard no longer consults the rights matrix, so the grid governs nothing');
  });

  it('has NO legacy branch — a record with no rights reaches nothing', () => {
    /*
     * This asserted the legacy branch was KEPT, on the grounds that "OIDC tokens are built per request and
     * never reach the config backfill — removing this refuses them all".
     *
     * That reason expired. The OIDC path derives a matrix per request through the same `migrateToken` the
     * migration uses (`oidc.ts`), which was the fix for OIDC connections being governed by the old booleans
     * while PATs were enforced per space and per area. So the branch served nobody — and while it sat there
     * it failed OPEN, because an absent legacy allowlist meant unrestricted.
     *
     * `a-token-without-a-matrix-reaches-nothing.test.js` carries the proof that no record without a matrix
     * reaches a handler; what is asserted here is that this surface no longer has the arm.
     */
    assert.doesNotMatch(guardBody(), /legacySpacesOf|\.spaces\b/,
      'the guard must read the matrix and nothing else');
    assert.match(guardBody(), /rights \? targets\.filter\(sid => reachesSpace\(rights, sid\)\) : \[\]/,
      'and say so explicitly, so the fail-closed answer is not arrived at by accident');
  });

  it('applies the proxy rule — AT LEAST ONE member, since Q-6', () => {
    const body = guardBody();
    assert.match(body, /resolveMemberSpaces\(/, 'proxy members are no longer resolved');

    // This assertion used to demand the opposite: `missing.length > 0`, i.e. EVERY member must be reachable. That
    // rule meant a proxy could not be granted to a scoped token at all, which is what the fleet integrator reported. It is now
    // deliberately "at least one", and the read paths serve only the members the caller reaches.
    //
    // The old comment here argued that ANY-member access "would unlock a proxy over spaces the token cannot see".
    // That was true when the fan-outs were wide, and it is exactly why the flip came LAST: all 29 read fan-outs were
    // narrowed first, and `proxy-fanout-inventory.test.js` asserts none is left.
    assert.match(body, /reachable\.length === 0/, 'the at-least-one rule is gone');
    assert.doesNotMatch(body, /missing\.length > 0/, 'the old all-members rule is back');
  });

  it('is UNCHANGED for a non-proxy space, which is the safety property', () => {
    // A real space resolves to `[spaceId]`, so "reaches at least one of one" is the same predicate as "reaches all
    // of one". Pinned because it is the claim that makes the flip safe, and it rests on the fallback below rather
    // than on the predicate: without `memberIds.length > 0 ? … : [spaceId]` an unknown space would resolve to `[]`
    // and an empty target list would pass a `.some()`-shaped check vacuously.
    const body = guardBody();
    assert.match(body, /memberIds\.length > 0 \? memberIds : \[spaceId\]/,
      'the single-space fallback is gone; an unknown space would produce an empty target list');
  });

  it('refuses rather than falling through when a space is unreachable', () => {
    const body = guardBody();
    assert.match(body, /status\(403\)/, 'an unreachable space must be refused, not allowed');
    assert.match(body, /return false/);
  });

  it('still answers true when there is no space to check', () => {
    // Routes with no :spaceId must not be refused by a space guard.
    assert.match(guardBody(), /if \(!spaceId\) return true;/);
  });
});
