/**
 * The area check is layered on reach, and a route it cannot resolve stays enforced rather than open.
 *
 * ## Why this ships staged, and why that is not a compromise
 *
 * Reach ("may this token touch this space at all") is already enforced from the rights matrix. The area
 * check adds "and at what level, for what kind of operation". It needs the inventory key, which at runtime
 * can only be reconstructed as `req.baseUrl + req.route.path` — and nested routers can make that disagree
 * with the registered path.
 *
 * So a miss **warns and falls through to reach**, which is yesterday's enforcement. This layer can therefore
 * only ever be stricter than before, never looser: there is no input for which it grants something reach
 * denied. Turning misses into refusals is the follow-up, once the warning has proved the log is clean —
 * flipping now would `403` real traffic on any route whose key was reconstructed wrongly, with no runtime
 * evidence either way.
 *
 * ## What must not drift
 *
 * The two checks have to agree about WHICH spaces they are checking. A proxy resolves to its members, and if
 * reach checked the members while the area check checked the proxy id, a proxy would be governed at one
 * level and its contents at another. They share `spaceTargets` for exactly that reason.
 *
 * Run: node --test testing/standalone/area-rung-is-staged.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/auth/middleware.ts';
const code = readFileSync(join(ROOT, SRC), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const body = (fn) => {
  const i = code.indexOf(`function ${fn}`);
  return i < 0 ? null : code.slice(i, code.indexOf('\n}', i));
};

describe('the area check', () => {
  it('exists and runs after reach, not instead of it', () => {
    assert.ok(body('enforceAreaRung'), 'enforceAreaRung is gone — re-point this test');
    const reachAt = code.indexOf('enforceSpaceScope(res, record, spaceId)');
    const areaAt = code.indexOf('enforceAreaRung(res, record, req');
    assert.ok(reachAt > 0 && areaAt > 0, 'both checks must be called');
    assert.ok(reachAt < areaAt, 'the area check runs before reach, so an unreachable space is judged on level');
  });

  it('an unresolved route falls through to reach, and says so', () => {
    const b = body('enforceAreaRung');
    assert.match(b, /if \(!need\)/, 'a miss is not handled at all');
    assert.match(b, /log\.warn/, 'a miss is silent, so nothing would ever reveal the gap');
    assert.match(b, /return true;/, 'a miss must fall through to reach, not refuse');
  });

  it('iterating routes are NOT gated on the call', () => {
    // Data quality takes no space and walks the token's reachable ones. Gating the call would refuse the
    // whole endpoint for a token that legitimately reaches some of the spaces behind it.
    assert.match(body('enforceAreaRung'), /need\.scope !== 'path'/,
      'an iterating route would be judged as though it named one space');
  });

  it('records with no rights are left to reach alone', () => {
    // OIDC tokens never pass the config backfill. Refusing them here would be a lockout.
    assert.match(body('enforceAreaRung'), /if \(!rights\) return true;/);
  });

  it('both checks resolve the target spaces the SAME way', () => {
    // If reach checked a proxy's members while the area check checked the proxy id, the container and its
    // contents would be governed at different levels — and the weaker one would win silently.
    assert.ok(body('spaceTargets'), 'the shared resolver is gone; the two checks can now drift');
    assert.match(body('spaceTargets'), /resolveMemberSpaces\(/);
    assert.match(code, /enforceAreaRung\(res, record, req, spaceTargets\(spaceId\)\)/,
      'the area check no longer uses the shared target resolution');
  });

  it('refuses with the area and the level, not a bare 403', () => {
    // "Forbidden" on a matrix of four areas and four levels is unactionable.
    assert.match(body('enforceAreaRung'), /needs '\$\{need\.needs\}' on \$\{need\.area\}/);
  });
});
