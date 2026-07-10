/**
 * Unit tests: SSRF guard hardening (util/ssrf.ts)
 *
 * Regression guards for the string-only-guard bypass class:
 *  - alternate IPv4 encodings (decimal / hex / octal / short forms)
 *  - IPv4-mapped / IPv4-compatible IPv6
 *  - trailing-dot and unspecified addresses
 * plus the authoritative DNS-resolving check (assertUrlSafeResolved) and the
 * redirect-revalidating ssrfSafeFetch.
 *
 * Pure in-process logic — no MongoDB, no Docker, no external network (DNS is
 * injected). Run with:
 *   node --test testing/standalone/ssrf-hardening.test.js
 *
 * Imports the compiled module, so build the server first:
 *   npm run build:server
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSsrfSafeUrl,
  isSsrfSafeMongoUri,
  isBlockedIp,
  assertUrlSafeResolved,
  ssrfSafeFetch,
  SsrfBlockedError,
} from '../../server/dist/util/ssrf.js';

describe('isSsrfSafeUrl — must REJECT blocked literals in every encoding', () => {
  const blocked = [
    // Standard forms (regression guards)
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/', // AWS/Azure IMDS
    'http://0.0.0.0/',
    // Alternate IPv4 encodings that the old regex missed
    'http://2130706433/',          // decimal 127.0.0.1
    'http://0x7f000001/',          // hex 127.0.0.1
    'http://0177.0.0.1/',          // octal-first-octet 127.0.0.1
    'http://127.1/',               // short form 127.0.0.1
    'http://127.0.1/',             // short form 127.0.0.1
    'http://0/',                   // 0.0.0.0
    'http://127.0.0.1./',          // trailing dot
    'http://2852039166/',          // decimal 169.254.169.254
    'http://0xA9FEA9FE/',          // hex 169.254.169.254
    // IPv6 loopback / ULA / link-local / unspecified
    'http://[::1]/',
    'http://[::]/',
    'http://[fc00::1]/',
    'http://[fd12:3456::1]/',
    'http://[fe80::1]/',
    // IPv4-mapped / compatible IPv6 pointing at loopback
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:7f00:1]/',     // hex form of ::ffff:127.0.0.1
    'http://[::127.0.0.1]/',       // IPv4-compatible (deprecated)
    // Scheme / credential rejections
    'ftp://example.com/',
    'file:///etc/passwd',
    'http://user:pass@example.com/',
    // Named
    'http://localhost/',
    'http://metadata.google.internal/computeMetadata/v1/',
  ];
  for (const url of blocked) {
    it(`rejects ${url}`, () => {
      assert.equal(isSsrfSafeUrl(url), false, `Expected ${url} to be blocked`);
    });
  }
});

describe('isSsrfSafeUrl — must ALLOW legitimate public targets', () => {
  const allowed = [
    'https://example.com/webhook',
    'http://example.com:8080/hook',
    'http://1.2.3.4/',
    'http://8.8.8.8/',
    'https://[2606:4700::6810:1]/',   // public IPv6 (Cloudflare)
    'http://93.184.216.34/',          // public IPv4
  ];
  for (const url of allowed) {
    it(`allows ${url}`, () => {
      assert.equal(isSsrfSafeUrl(url), true, `Expected ${url} to be allowed`);
    });
  }
});

describe('isBlockedIp — literal address classification', () => {
  const blocked = ['127.0.0.1', '10.1.2.3', '169.254.169.254', '::1', '::', 'fc00::1', 'fe80::1',
    '2130706433', '0x7f000001', '127.1', '::ffff:127.0.0.1', '100.64.0.1', '255.255.255.255'];
  const allowed = ['1.2.3.4', '8.8.8.8', '2606:4700::6810:1', 'example.com', 'not-an-ip'];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => assert.equal(isBlockedIp(ip), true));
  }
  for (const ip of allowed) {
    it(`does not block ${ip}`, () => assert.equal(isBlockedIp(ip), false));
  }
});

describe('assertUrlSafeResolved — resolves DNS and validates every record', () => {
  it('blocks a public hostname that resolves to a private IP (DNS-based SSRF)', async () => {
    const lookup = async () => [{ address: '169.254.169.254', family: 4 }];
    await assert.rejects(
      () => assertUrlSafeResolved('http://evil.example.com/', { lookup }),
      SsrfBlockedError,
    );
  });

  it('blocks when ANY resolved record is internal (mixed A records)', async () => {
    const lookup = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ];
    await assert.rejects(
      () => assertUrlSafeResolved('http://rebind.example.com/', { lookup }),
      SsrfBlockedError,
    );
  });

  it('allows a hostname that resolves only to public IPs', async () => {
    const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
    const { addresses } = await assertUrlSafeResolved('http://good.example.com/', { lookup });
    assert.deepEqual(addresses, ['93.184.216.34']);
  });

  it('blocks when DNS returns no records', async () => {
    const lookup = async () => [];
    await assert.rejects(
      () => assertUrlSafeResolved('http://nxdomain.example.com/', { lookup }),
      SsrfBlockedError,
    );
  });

  it('rejects an unsafe URL before any DNS lookup', async () => {
    let called = false;
    const lookup = async () => { called = true; return [{ address: '1.2.3.4' }]; };
    await assert.rejects(() => assertUrlSafeResolved('http://127.0.0.1/', { lookup }), SsrfBlockedError);
    assert.equal(called, false, 'DNS lookup must not run for a literal blocked address');
  });

  it('does not resolve DNS for a public IP literal', async () => {
    let called = false;
    const lookup = async () => { called = true; return []; };
    const { addresses } = await assertUrlSafeResolved('http://8.8.8.8/', { lookup });
    assert.equal(called, false);
    assert.deepEqual(addresses, ['8.8.8.8']);
  });
});

describe('ssrfSafeFetch — re-validates every redirect hop', () => {
  const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

  it('returns the response on a 2xx with no redirect', async () => {
    let hits = 0;
    const fetchImpl = async () => { hits++; return new Response('ok', { status: 200 }); };
    const resp = await ssrfSafeFetch('http://good.example.com/', {}, { lookup: publicLookup, fetchImpl });
    assert.equal(resp.status, 200);
    assert.equal(hits, 1);
  });

  it('blocks a redirect that points at an internal host', async () => {
    const fetchImpl = async () =>
      new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/' } });
    await assert.rejects(
      () => ssrfSafeFetch('http://good.example.com/', {}, { lookup: publicLookup, fetchImpl }),
      SsrfBlockedError,
    );
  });

  it('follows a safe redirect to another public host', async () => {
    let hop = 0;
    const fetchImpl = async () => {
      hop++;
      if (hop === 1) {
        return new Response(null, { status: 302, headers: { location: 'http://second.example.com/final' } });
      }
      return new Response('done', { status: 200 });
    };
    const resp = await ssrfSafeFetch('http://first.example.com/', {}, { lookup: publicLookup, fetchImpl });
    assert.equal(resp.status, 200);
    assert.equal(hop, 2);
  });

  it('caps redirect chains', async () => {
    const fetchImpl = async () =>
      new Response(null, { status: 302, headers: { location: 'http://loop.example.com/next' } });
    await assert.rejects(
      () => ssrfSafeFetch('http://loop.example.com/', {}, { lookup: publicLookup, fetchImpl, maxRedirects: 2 }),
      SsrfBlockedError,
    );
  });
});

describe('isSsrfSafeMongoUri — hardened host check', () => {
  it('rejects loopback and alternate encodings', () => {
    assert.equal(isSsrfSafeMongoUri('mongodb://127.0.0.1:27017/db'), false);
    assert.equal(isSsrfSafeMongoUri('mongodb://2130706433:27017/db'), false);
    assert.equal(isSsrfSafeMongoUri('mongodb://[::1]:27017/db'), false);
    assert.equal(isSsrfSafeMongoUri('mongodb://localhost/db'), false);
  });
  it('rejects non-mongodb schemes', () => {
    assert.equal(isSsrfSafeMongoUri('http://db.example.com/'), false);
  });
  it('allows a public mongo host', () => {
    assert.equal(isSsrfSafeMongoUri('mongodb://db.example.com:27017/db'), true);
    assert.equal(isSsrfSafeMongoUri('mongodb+srv://cluster.example.net/db'), true);
  });
});
