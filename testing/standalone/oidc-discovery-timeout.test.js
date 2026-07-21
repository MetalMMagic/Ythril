/**
 * Standalone tests: the OIDC discovery fetch is bounded by a timeout.
 *
 * Why this matters more than a normal missing-timeout: `getDiscoveryDoc()` runs on the
 * AUTHENTICATION path, and its result is cached with a TTL — so an IdP that accepts the TCP
 * connection and then never answers does not stall one request, it stalls a request every time the
 * cache expires, each one held until the OS socket timeout (minutes). Every other outbound call in
 * the server already carries an `AbortSignal.timeout`; this one did not.
 *
 * The test drives a real HTTP server that deliberately never responds, so it proves the behaviour
 * end to end rather than asserting that a constant exists.
 *
 * Run: node --test testing/standalone/oidc-discovery-timeout.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let getDiscoveryDoc;
let clearOidcCache;
let OIDC_HTTP_TIMEOUT_MS;

/** A server that accepts the connection and then holds it open, answering nothing. */
let blackHole;
let blackHolePort;
const heldSockets = [];

describe('OIDC discovery — timeout', () => {
  before(async () => {
    ({ getDiscoveryDoc, clearOidcCache, OIDC_HTTP_TIMEOUT_MS } = await import(
      '../../server/dist/auth/oidc.js'
    ));

    blackHole = http.createServer((req) => {
      // Never write a response, never end it: the classic "hung IdP".
      heldSockets.push(req.socket);
    });
    await new Promise((resolve) => blackHole.listen(0, '127.0.0.1', resolve));
    blackHolePort = blackHole.address().port;
  });

  after(async () => {
    for (const s of heldSockets) s.destroy();
    if (blackHole) await new Promise((resolve) => blackHole.close(resolve));
    clearOidcCache?.();
  });

  it('exposes an explicit, sane HTTP budget', () => {
    assert.equal(typeof OIDC_HTTP_TIMEOUT_MS, 'number');
    assert.ok(
      OIDC_HTTP_TIMEOUT_MS > 0 && OIDC_HTTP_TIMEOUT_MS <= 30_000,
      `expected a bounded budget, got ${OIDC_HTTP_TIMEOUT_MS}ms`,
    );
  });

  it('rejects instead of hanging when the IdP never responds', async () => {
    clearOidcCache();
    const started = Date.now();
    await assert.rejects(
      () => getDiscoveryDoc(`http://127.0.0.1:${blackHolePort}`),
      (err) => {
        assert.match(err.message, /OIDC discovery failed/);
        // The operator has to be able to tell "it hung" from "it refused" or "it 500'd".
        assert.match(err.message, /no response within \d+ms/);
        return true;
      },
      'a hung IdP must surface as a discovery failure, not an unbounded await',
    );
    const elapsed = Date.now() - started;
    assert.ok(
      elapsed < OIDC_HTTP_TIMEOUT_MS * 3,
      `expected the call to give up near ${OIDC_HTTP_TIMEOUT_MS}ms, took ${elapsed}ms`,
    );
  });

  it('reports an unreachable IdP as a discovery failure too', async () => {
    clearOidcCache();
    // Port 1 on loopback: connection refused immediately — the other half of the same failure mode.
    await assert.rejects(
      () => getDiscoveryDoc('http://127.0.0.1:1'),
      /OIDC discovery failed/,
    );
  });
});
