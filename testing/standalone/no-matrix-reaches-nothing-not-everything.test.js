/**
 * A token with no rights matrix reaches NOTHING. It used to reach everything.
 *
 * ## The branch
 *
 * `tokenReachesSpace` asked the matrix first and fell back to the pre-3.0 `spaces` allowlist:
 *
 * ```
 * const legacy = authToken?.['spaces'];
 * return !legacy || legacy.includes(spaceId);
 * ```
 *
 * `!legacy` — **an absent allowlist meant unrestricted.** So a token carrying neither a matrix nor an
 * allowlist reached every space on the instance.
 *
 * ## Why that was defensible once, and is not now
 *
 * The fallback existed for records that predate the matrix, and its own comment said so: *"Dropping that
 * branch here would REFUSE those tokens rather than widen them, which is the safe direction but still an
 * outage. It goes with the field itself in D-8d."*
 *
 * **D-8d happened in 3.1.** `spaces`, `admin` and `readOnly` left `TokenRecord`; every scoping decision
 * reads `rights`. And nothing can now reach this branch:
 *
 *  - a **PAT** gets a matrix from `createToken`, which stores `opts.rights ?? migrateToken(…)`;
 *  - a PAT that predates the matrix gets one from `migrateTokenRightsOnBoot`, in memory, on every start;
 *  - an **OIDC session** carries `rights` as a REQUIRED field, derived by `migrateToken` from its claim
 *    mapping — so the surface that genuinely has no stored matrix builds one per request.
 *
 * So the branch was unreachable **and failed open**, which is the worse of the two ways to be unreachable:
 * nothing exercises it, and if anything ever did it would hand over the whole instance.
 *
 * ## What it does now
 *
 * No matrix, no reach. That is the direction the original comment already called safe, and it is now free
 * of the outage that made it unattractive — there is no token shape left that would be refused by it.
 *
 * Run: node --test testing/standalone/no-matrix-reaches-nothing-not-everything.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const SHARED = 'server/src/api/sync/_shared.ts';
const code = (f) => stripComments(readFileSync(f, 'utf8'));

describe('every token shape that exists carries a matrix', () => {
  it('a PAT gets one at mint, or derived from the legacy inputs', () => {
    // `createToken` stores `opts.rights ?? migrateToken(…)`. The `??` is what makes this true for a caller
    // that named no matrix — omitting the field left a newly minted token with none until the next boot.
    const src = code('server/src/auth/tokens.ts');
    assert.match(src, /rights: opts\.rights \?\?/,
      'createToken no longer guarantees a matrix, so a freshly minted token can have none');
  });

  it('a pre-matrix PAT gets one at boot, in memory', () => {
    assert.match(code('server/src/config/loader.ts'), /migrateTokenRightsOnBoot\(_config\)/,
      'the boot derivation is gone, so a token predating the matrix reaches this branch with none');
  });

  it('and an OIDC session carries one as a REQUIRED field', () => {
    /*
     * The surface that genuinely has no STORED matrix. It builds one per request from its claim mapping,
     * with `migrateToken` — the same function, so an OIDC session and a legacy PAT with identical settings
     * resolve identically. Required rather than optional is the half that matters here: an optional field
     * would put OIDC straight back on the fallback.
     */
    const src = code('server/src/auth/oidc.ts');
    assert.match(src, /rights: TokenRights;/,
      'OidcTokenRecord no longer requires a matrix, so an OIDC session can reach the no-matrix branch');
    assert.match(src, /rights: migrateToken\(/,
      'OIDC no longer derives its matrix, so its claim mapping is not enforced through `rights`');
  });
});

describe('so no matrix means no reach', () => {
  it('the legacy allowlist fallback is gone', () => {
    const src = code(SHARED);
    const at = src.indexOf('export function tokenReachesSpace');
    assert.ok(at > 0, 'tokenReachesSpace is gone — re-point this gate');
    const body = src.slice(at, src.indexOf('\n}', at));
    assert.doesNotMatch(body, /\['spaces'\]/,
      'tokenReachesSpace still reads the pre-3.0 allowlist — the field left TokenRecord in 3.1, so the '
      + 'branch is unreachable, and it grants EVERY space when the allowlist is absent');
  });

  it('and the absent case refuses rather than admitting', () => {
    /*
     * THE CASE THIS FILE EXISTS FOR. `!legacy || legacy.includes(spaceId)` read a missing scope as
     * unrestricted — the same absent-means-permission shape this codebase has shipped as an empty
     * allowlist read as "unrestricted", three times over.
     */
    const src = code(SHARED);
    const at = src.indexOf('export function tokenReachesSpace');
    const body = src.slice(at, src.indexOf('\n}', at));
    assert.doesNotMatch(body, /return !\w+ \|\|/,
      'an absent scope is still read as unrestricted');
    assert.match(body, /return false|if \(!rights\) return false/,
      'a token with no matrix must reach nothing; refusing is the direction the original comment already '
      + 'called safe, and there is no longer a token shape it would wrongly refuse');
  });
});
