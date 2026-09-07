/**
 * Standalone tests: embed-origin allowlist (C2)
 *
 * Cross-origin embedding is OFF by default. An operator opts in by listing exact
 * origins under `embed.allowedOrigins`, which grants those origins BOTH the right
 * to iframe Ythril (CSP `frame-ancestors`) and to push `ythril:theme` postMessages.
 *
 * These tests pin the security-critical half of that feature — the validator that
 * decides which strings are trustworthy enough to end up in a CSP header:
 *  - wildcards are NEVER accepted (there is no "allow everything" mode)
 *  - only https (or http on localhost, for dev)
 *  - exact origins only: no path/query/fragment/credentials
 *  - the running server's CSP advertises frame-ancestors 'self' by default
 *
 * Run: node --test testing/standalone/embed-origins.test.js
 *
 * @needs-instance — drives a live server on :3200; runs in CI, skipped by preflight.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { INSTANCES } from '../sync/helpers.js';

let isValidEmbedOrigin;

describe('Embed-origin allowlist — validator', () => {
  before(async () => {
    ({ isValidEmbedOrigin } = await import('../../server/dist/config/embed.js'));
  });

  it('rejects wildcards outright — there is no allow-all mode', () => {
    // set-claim: malformed INPUTS -- the wildcard shapes an operator might try. Each is a shape of wrong
    // that must be refused; nothing enumerates them anywhere.
    for (const bad of ['*', 'https://*', 'https://*.example.com', 'https://a.*.com']) {
      assert.equal(isValidEmbedOrigin(bad), false, `${bad} must be rejected`);
    }
  });

  it('accepts an exact https origin', () => {
    assert.equal(isValidEmbedOrigin('https://portal.example.com'), true);
    assert.equal(isValidEmbedOrigin('https://portal.example.com:8443'), true);
  });

  it('rejects plain http on a non-local host', () => {
    assert.equal(isValidEmbedOrigin('http://portal.example.com'), false);
  });

  it('allows http only on localhost / 127.0.0.1 (development)', () => {
    assert.equal(isValidEmbedOrigin('http://localhost:4200'), true);
    assert.equal(isValidEmbedOrigin('http://127.0.0.1:4200'), true);
  });

  it('rejects an origin carrying a path, query or fragment', () => {
    assert.equal(isValidEmbedOrigin('https://portal.example.com/embed'), false);
    assert.equal(isValidEmbedOrigin('https://portal.example.com?a=1'), false);
    assert.equal(isValidEmbedOrigin('https://portal.example.com#x'), false);
  });

  it('rejects embedded credentials', () => {
    assert.equal(isValidEmbedOrigin('https://user:pw@portal.example.com'), false);
  });

  it('rejects non-http(s) schemes and junk', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'file:///etc/passwd',
      'ftp://portal.example.com',
      'portal.example.com',
      '',
      '   ',
      null,
      undefined,
      42,
      {},
    ]) {
      assert.equal(isValidEmbedOrigin(bad), false, `${String(bad)} must be rejected`);
    }
  });

  it('tolerates a single trailing slash on an otherwise-exact origin', () => {
    assert.equal(isValidEmbedOrigin('https://portal.example.com/'), true);
  });
});

describe('Embed-origin allowlist — CSP header', () => {
  it('serves frame-ancestors with \'self\' by default (no cross-origin embedding)', async () => {
    const res = await fetch(`${INSTANCES.a}/health`);
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'CSP header must be present');
    assert.match(csp, /frame-ancestors [^;]*'self'/, `expected frame-ancestors 'self', got: ${csp}`);
    // The test stack does not opt in, so no cross-origin host may frame it.
    assert.doesNotMatch(csp, /frame-ancestors[^;]*\*/, 'CSP must never contain a wildcard frame-ancestor');
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'self'/);
  });
});
