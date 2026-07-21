/**
 * Standalone tests: rate-limit buckets are keyed per CLIENT, not per source IP.
 *
 * Why this is a real bug and not a tuning preference: with no reverse proxy in front
 * (`trustProxy=false`, the default Docker deployment) every request arrives from the Docker gateway
 * address, so an IP-keyed limiter puts EVERY client of the instance into one 300/min bucket. One busy
 * client — or one buggy one, which is exactly what the brain request storm was — then 429s everybody,
 * including the app's own UI.
 *
 * `clientRateLimitKey` derives the bucket from the presented credential instead. It runs BEFORE the auth
 * middleware (that is where the limiters sit in the chain), so it works off the raw bearer rather than
 * `req.authToken`, and it must never leak that credential into a store key or a log line.
 *
 * Run: node --test testing/standalone/rate-limit-client-key.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let clientRateLimitKey;

/** Minimal Express-request stand-in: only the fields the key generator reads. */
function req({ bearer, token, ip = '::ffff:172.21.0.5' } = {}) {
  const headers = bearer ? { authorization: `Bearer ${bearer}` } : {};
  return {
    ip,
    query: token ? { token } : {},
    get(name) { return headers[name.toLowerCase()]; },
  };
}

describe('clientRateLimitKey', () => {
  before(async () => {
    ({ clientRateLimitKey } = await import('../../server/dist/rate-limit/middleware.js'));
  });

  it('gives two different tokens two different buckets, from the same IP', () => {
    const a = clientRateLimitKey(req({ bearer: 'ythril_aaaaaaaaaaaaaaaa' }));
    const b = clientRateLimitKey(req({ bearer: 'ythril_bbbbbbbbbbbbbbbb' }));
    assert.notEqual(a, b, 'one noisy client must not consume another client’s budget');
  });

  it('gives the same token the same bucket across requests', () => {
    const a = clientRateLimitKey(req({ bearer: 'ythril_stable' }));
    const b = clientRateLimitKey(req({ bearer: 'ythril_stable', ip: '10.9.9.9' }));
    assert.equal(a, b, 'the bucket follows the client, not the source address');
  });

  it('recognises the MCP query-parameter credential', () => {
    // The MCP transport passes ?token= by design; without this every MCP client shares the IP bucket.
    const viaQuery = clientRateLimitKey(req({ token: 'ythril_mcp' }));
    const viaHeader = clientRateLimitKey(req({ bearer: 'ythril_mcp' }));
    assert.equal(viaQuery, viaHeader);
    assert.notEqual(viaQuery, clientRateLimitKey(req({ token: 'ythril_other' })));
  });

  it('falls back to the IP when no credential is presented', () => {
    const anon = clientRateLimitKey(req());
    assert.match(anon, /^ip:/, 'an anonymous request has no identity but its address');
    assert.notEqual(anon, clientRateLimitKey(req({ ip: '10.1.2.3' })));
  });

  it('never puts the raw credential in the key', () => {
    const secret = 'ythril_super_secret_value_1234567890';
    const key = clientRateLimitKey(req({ bearer: secret }));
    assert.ok(!key.includes(secret), 'the key ends up in store keys and debug output');
    assert.ok(!key.includes('super_secret'), 'not even a fragment of it');
    assert.match(key, /^c:[A-Za-z0-9_-]{22}$/, 'expected a truncated hash, got ' + key);
  });

  it('normalises IPv6 so a client cannot rotate through its own /64', () => {
    const a = clientRateLimitKey(req({ ip: '2001:db8:1:2::1' }));
    const b = clientRateLimitKey(req({ ip: '2001:db8:1:2::beef' }));
    assert.equal(a, b, 'addresses in one /64 belong to one client');
  });
});
