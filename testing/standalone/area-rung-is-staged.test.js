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

import { blockAfter } from './_structural-window.mjs';

const ROOT = process.cwd();
const SRC = 'server/src/auth/middleware.ts';
const code = readFileSync(join(ROOT, SRC), 'utf8')
  .replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

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
    assert.match(b, /verdict\.kind === 'unclassified'/, 'a miss is not handled at all');
    assert.match(b, /log\.warn/, 'a miss is silent, so nothing would ever reveal the gap');
    assert.match(b, /return true;/, 'a miss must fall through to reach, not refuse');
  });

  it('a DELIBERATELY exempt route is silent — it is decided, not missed', () => {
    /*
     * The defect the canary operator read off a live pod on 2026-08-20. `NOT_AREA_SCOPED` records, with a
     * written reason each, that four routes are not views of a space's DATA. The runtime knew only
     * `ROUTE_RIGHTS`, so every request to one of them logged
     *
     *     no inventory entry for 'GET /api/brain/spaces/:spaceId/activity' — reach enforced, area not.
     *     Add it to ROUTE_RIGHTS; misses become refusals once the log is clean.
     *
     * Two things wrong with that, and the second is the serious one. The advice would have UNDONE the
     * recorded decision. And "once the log is clean" was a state four routes guaranteed could never be
     * reached, so the refusal flip the message promises could never happen — a deferred safety improvement
     * that its own log message makes unreachable is indistinguishable from one nobody got round to.
     */
    const b = body('enforceAreaRung');
    const exempt = b.indexOf("verdict.kind === 'not-area-scoped'");
    const unclassified = b.indexOf("verdict.kind === 'unclassified'");
    assert.ok(exempt > -1, 'the exempt case is not handled, so an exemption reads as an oversight again');
    assert.ok(unclassified > exempt,
      'the exempt check must come FIRST; after the warning it cannot prevent it');

    // AN ORDERING CLAIM, not a window: the exempt branch has to return before ANY log call in this function,
    // which is what makes it silent. Comparing indices says exactly that and nothing about how much text
    // sits between them.
    assert.ok(b.indexOf('log.warn') > exempt, 'the warning is reachable from the exempt path');

    // And the warning belongs to the unclassified branch specifically, bounded by that branch's own brace —
    // not to the function at large. `blockAfter` because a cap here could not tell "inside the branch" from
    // "a few lines after it", and those are the two opposite behaviours.
    assert.match(blockAfter(b, unclassified, 'the unclassified branch'), /log\.warn/,
      'the warning must live inside the unclassified branch, or it fires for decided routes too');

    // The advice in the message names BOTH lists now. Naming only ROUTE_RIGHTS is what sent an operator at
    // the wrong fix for two of the four.
    assert.match(b, /NOT_AREA_SCOPED/,
      'the warning must offer the exemption list as well, or the only advice on offer is the wrong one');
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
    // The record is now part of that resolution, and deliberately: `spaceTargets` NARROWS a proxy to the
    // members the token may see, so both checks read the same narrowed list. Passing only the id asks the
    // un-narrowed question, which is what made a scoped token's proxy read refuse on the first member it
    // lacked — the container governed by a member the caller was never granted.
    assert.match(code, /enforceAreaRung\(res, record, req, spaceTargets\(spaceId, record\)\)/,
      'the area check must use the shared, NARROWED target resolution');
  });

  it('refuses with the area and the level, not a bare 403', () => {
    // "Forbidden" on a matrix of four areas and four levels is unactionable.
    assert.match(body('enforceAreaRung'), /needs '\$\{need\.needs\}' on \$\{need\.area\}/);
  });
});
