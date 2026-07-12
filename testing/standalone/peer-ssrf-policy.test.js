/**
 * Standalone unit tests: peer SSRF policy (S2.5).
 *
 * `isPeerUrlSafe(url, allowPrivate)` — the synchronous, literal (no-DNS) check
 * used before a peer-supplied URL is stored or connected to.
 *   - allowPrivate=false → public peers only (same block list as ssrfSafeFetch).
 *   - allowPrivate=true  → private ranges (RFC-1918/CGNAT/ULA) allowed, but the
 *     crown jewels (loopback, link-local/IMDS, unspecified) stay blocked.
 *
 * Pure in-process — no MongoDB. Run: node --test testing/standalone/peer-ssrf-policy.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPeerUrlSafe } from '../../server/dist/util/ssrf.js';

describe('Peer SSRF policy — strict (allowPrivate = false)', () => {
  const cases = {
    'http://8.8.8.8:3200': true,
    'https://peer.example.com': true,
    'http://10.0.0.5:3200': false,
    'http://192.168.1.10:3200': false,
    'http://172.16.0.1:3200': false,
    'http://100.64.0.1:3200': false,          // CGNAT
    'http://127.0.0.1:3200': false,
    'http://169.254.169.254/latest/meta-data/': false,
    'http://localhost:3200': false,
    'http://metadata.google.internal/': false,
    'http://[::1]:3200': false,
    'http://[fe80::1]:3200': false,
    'http://[fc00::1]:3200': false,           // ULA
    'ftp://8.8.8.8': false,                    // scheme
    'http://user:pass@8.8.8.8': false,         // embedded creds
    'http://2852039166/': false,               // 169.254.169.254 as decimal
  };
  for (const [url, expected] of Object.entries(cases)) {
    it(`${url} → ${expected}`, () => assert.equal(isPeerUrlSafe(url, false), expected));
  }
});

describe('Peer SSRF policy — allowPrivate = true (crown jewels still blocked)', () => {
  const cases = {
    // Private ranges are now permitted (same-host / LAN sync).
    'http://10.0.0.5:3200': true,
    'http://192.168.1.10:3200': true,
    'http://172.16.0.1:3200': true,            // Docker bridge
    'http://100.64.0.1:3200': true,            // CGNAT
    'http://[fc00::1]:3200': true,             // IPv6 ULA
    'http://ythril-b:3200': true,              // hostname — literal check passes; DNS checked at connect
    'http://8.8.8.8:3200': true,
    // Crown jewels remain blocked regardless of allowPrivate.
    'http://127.0.0.1:3200': false,
    'http://169.254.169.254/': false,          // cloud IMDS
    'http://2852039166/': false,               // IMDS as decimal
    'http://0x7f000001/': false,               // 127.0.0.1 as hex
    'http://localhost:3200': false,
    'http://metadata.google.internal/': false,
    'http://[::1]:3200': false,
    'http://[fe80::1]:3200': false,            // link-local
    'http://[::]:3200': false,                 // unspecified
  };
  for (const [url, expected] of Object.entries(cases)) {
    it(`${url} → ${expected}`, () => assert.equal(isPeerUrlSafe(url, true), expected));
  }
});
