/**
 * Unit tests: OIDC signature-algorithm pinning (M7)
 *
 * `jwtVerify` was called without an `algorithms` option, so the accepted set was
 * whatever jose's JWKS resolver happened to allow, rather than explicit policy.
 *
 * Scope note (verified below, not assumed): jose's JWKS resolver ALREADY refuses
 * symmetric keys, so the classic HS/RS confusion attack was never reachable here.
 * Pinning is defence in depth — it makes the accepted set explicit (it cannot
 * widen silently if the resolver's behaviour changes) and lets an operator narrow
 * verification to exactly what their IdP signs with (`allowedAlgorithms`).
 *
 * Pure in-process logic — no IdP, no network. Run:
 *   node --test testing/standalone/oidc-alg-pinning.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  SignJWT, jwtVerify, createLocalJWKSet, generateSecret, generateKeyPair, exportJWK,
} from 'jose';
import { DEFAULT_OIDC_ALGORITHMS } from '../../server/dist/auth/oidc.js';

const ISSUER = 'https://issuer.example.com';
const AUDIENCE = 'ythril';

describe('DEFAULT_OIDC_ALGORITHMS', () => {
  it('contains only asymmetric algorithms', () => {
    for (const alg of DEFAULT_OIDC_ALGORITHMS) {
      assert.match(alg, /^(RS|PS|ES)(256|384|512)$|^EdDSA$/, `unexpected algorithm in the default set: ${alg}`);
    }
  });

  it('excludes every HMAC algorithm', () => {
    // set-claim: HS256/384/512 is the COMPLETE HMAC family in the JWA registry, an external closed set --
    // not a copy of anything this codebase enumerates. A fourth would be a new JWA algorithm.
    for (const alg of ['HS256', 'HS384', 'HS512']) {
      assert.ok(!DEFAULT_OIDC_ALGORITHMS.includes(alg), `${alg} must not be accepted`);
    }
  });

  it('excludes the "none" algorithm', () => {
    assert.ok(!DEFAULT_OIDC_ALGORITHMS.includes('none'));
    assert.ok(!DEFAULT_OIDC_ALGORITHMS.includes('None'));
  });

  it('includes RS256 (what essentially every OIDC IdP signs with)', () => {
    assert.ok(DEFAULT_OIDC_ALGORITHMS.includes('RS256'));
  });
});

describe('symmetric keys are refused at the JWKS layer (pre-existing guard)', () => {
  it('an HS256 token against an oct JWKS key is rejected even with no algorithms option', async () => {
    const secret = await generateSecret('HS256', { extractable: true });
    const jwk = await exportJWK(secret);
    jwk.kid = 'sym-1';
    jwk.alg = 'HS256';
    const jwks = createLocalJWKSet({ keys: [jwk] });

    const token = await new SignJWT({ sub: 'attacker', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256', kid: 'sym-1' })
      .setIssuer(ISSUER).setAudience(AUDIENCE)
      .setIssuedAt().setExpirationTime('1h')
      .sign(secret);

    // Documents WHY the HS-confusion vector was not exploitable: jose stops it
    // before any algorithm policy is consulted. If this ever starts passing, the
    // `algorithms` pin below is the thing standing between it and an admin token.
    await assert.rejects(
      () => jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE }),
      /Unsupported "alg" value for a JSON Web Key Set/,
    );
  });
});

describe('pinning narrows the accepted set (what the fix buys)', () => {
  let esToken, esJwks;

  before(async () => {
    const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'ec-1';
    esJwks = createLocalJWKSet({ keys: [jwk] });

    esToken = await new SignJWT({ sub: 'user', role: 'admin' })
      .setProtectedHeader({ alg: 'ES256', kid: 'ec-1' })
      .setIssuer(ISSUER).setAudience(AUDIENCE)
      .setIssuedAt().setExpirationTime('1h')
      .sign(privateKey);
  });

  it('an ES256 token is accepted under the default set', async () => {
    const { payload } = await jwtVerify(esToken, esJwks, {
      issuer: ISSUER, audience: AUDIENCE, algorithms: DEFAULT_OIDC_ALGORITHMS,
    });
    assert.equal(payload.sub, 'user');
  });

  it('the same token is refused when the operator narrows to ["RS256"]', async () => {
    await assert.rejects(
      () => jwtVerify(esToken, esJwks, {
        issuer: ISSUER, audience: AUDIENCE, algorithms: ['RS256'],
      }),
      /alg/i,
      'allowedAlgorithms must be able to reject an algorithm the IdP never uses',
    );
  });
});
