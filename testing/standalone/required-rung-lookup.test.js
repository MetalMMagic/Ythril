/**
 * The route inventory answers "what rung does this request need", and a miss means REFUSE.
 *
 * ## The property that carries the whole feature
 *
 * `requiredRung()` returns `null` for a route the inventory does not classify. That `null` must be treated
 * as a refusal, never as "no requirement". An unclassified route is one nobody decided about, and defaulting
 * it to permissive reproduces exactly the situation this feature exists to end: access that works because
 * nothing said otherwise.
 *
 * The build-time gate makes a miss unreachable in practice. This file assumes it happens anyway, because
 * "unreachable in practice" is how the last three silent failures in this codebase described themselves.
 *
 * Run: node --test testing/standalone/required-rung-lookup.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let requiredRung, satisfies, ROUTE_RIGHTS;
before(async () => {
  ({ requiredRung, satisfies } = await import('../../server/dist/auth/required-rung.js'));
  ({ ROUTE_RIGHTS } = await import('../../server/dist/auth/space-rights.js'));
});

describe('the lookup', () => {
  it('answers for a classified route', () => {
    const r = requiredRung('POST', '/api/brain/spaces/:spaceId/recall');
    assert.deepEqual(r, { area: 'knowledge', needs: 'read', scope: 'path' });
  });

  it('distinguishes methods on the same path', () => {
    // GET and DELETE on a collection are not the same permission, and a path-only lookup would say they are.
    assert.equal(requiredRung('GET', '/api/brain/spaces/:spaceId/memories').needs, 'read');
    assert.equal(requiredRung('POST', '/api/brain/spaces/:spaceId/memories').needs, 'write');
    assert.equal(requiredRung('DELETE', '/api/brain/spaces/:spaceId/memories').needs, 'admin');
  });

  it('returns null for an unclassified route, NOT a permissive default', () => {
    assert.equal(requiredRung('GET', '/api/brain/spaces/:spaceId/invented'), null);
    assert.equal(requiredRung('PUT', '/api/brain/spaces/:spaceId/recall'), null,
      'a method the inventory does not list must miss, not inherit the path');
  });

  it('carries the scope shape through, because Data quality needs it', () => {
    // Those routes take no space and iterate the token's reachable ones. A caller that ignores `scope` would
    // gate the call instead of the loop, leaving that column decorative.
    assert.equal(requiredRung('GET', '/api/duplicates').scope, 'iterates');
    assert.equal(requiredRung('POST', '/api/brain/spaces/:spaceId/recall').scope, 'path');
  });

  it('every inventory entry is findable — the map has no dropped rows', () => {
    // A Map built from a list can silently lose duplicates. Asserting the count catches a key collision,
    // which would leave one route unclassified while the inventory looks complete.
    let found = 0;
    for (const r of ROUTE_RIGHTS) {
      const got = requiredRung(r.method, r.route);
      assert.ok(got, `${r.method} ${r.route} is in the inventory but not findable`);
      assert.equal(got.needs, r.needs);
      found++;
    }
    assert.equal(found, ROUTE_RIGHTS.length);
  });

  it('a trailing slash does not change the answer', () => {
    assert.deepEqual(requiredRung('POST', '/api/brain/spaces/:spaceId/recall/'),
      requiredRung('POST', '/api/brain/spaces/:spaceId/recall'));
  });
});

describe('rung containment', () => {
  it('a higher rung satisfies a lower requirement', () => {
    assert.equal(satisfies('admin', 'read'), true);
    assert.equal(satisfies('write', 'write'), true);
    assert.equal(satisfies('read', 'write'), false);
    assert.equal(satisfies('none', 'read'), false);
  });

  it('none satisfies nothing, including none', () => {
    // `needs` is never 'none' in the inventory, but if it ever were, "you may call it holding nothing" would
    // be a route with no requirement at all — which is what an exemption is for, not a rung.
    assert.equal(satisfies('none', 'read'), false);
    assert.equal(satisfies('read', 'none'), true);
  });
});
