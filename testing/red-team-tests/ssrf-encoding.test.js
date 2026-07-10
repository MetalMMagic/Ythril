/**
 * Red-team tests: SSRF via alternate host encodings on network member URLs.
 *
 * The original isSsrfSafeUrl() only matched dotted-decimal IPv4 and a handful of
 * IPv6 prefixes as literal strings. That let an attacker reach loopback / cloud
 * IMDS by encoding the same address differently:
 *   - decimal integer      http://2130706433/           (= 127.0.0.1)
 *   - hex integer          http://0x7f000001/           (= 127.0.0.1)
 *   - octal first octet    http://0177.0.0.1/           (= 127.0.0.1)
 *   - short form           http://127.1/                (= 127.0.0.1)
 *   - IPv4-mapped IPv6      http://[::ffff:127.0.0.1]/   (= 127.0.0.1)
 *   - decimal IMDS         http://2852039166/           (= 169.254.169.254)
 *
 * All of these must now be rejected with 400. If any is accepted, the SSRF
 * validator has regressed to string-only matching.
 *
 * Run: node --test testing/red-team-tests/ssrf-encoding.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

let adminToken;
let networkId;

describe('SSRF — alternate host encodings must be blocked', () => {
  before(async () => {
    adminToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    const r = await post(INSTANCES.a, adminToken, '/api/networks', {
      label: 'ssrf-encoding-test-network',
      type: 'closed',
      spaces: ['general'],
    });
    assert.equal(r.status, 201, `Setup failed to create network: ${JSON.stringify(r.body)}`);
    networkId = r.body.id;
  });

  after(async () => {
    if (networkId) {
      await fetch(`${INSTANCES.a}/api/networks/${networkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  async function tryMemberUrl(url) {
    return post(INSTANCES.a, adminToken, `/api/networks/${networkId}/members`, {
      instanceId: 'ssrf-encoding-probe',
      label: 'SSRF encoding probe',
      url,
      token: 'ythril_fakefakefakefakefakefakefake',
    });
  }

  const loopbackEncodings = {
    'decimal integer (2130706433)': 'http://2130706433/',
    'hex integer (0x7f000001)': 'http://0x7f000001/',
    'octal first octet (0177.0.0.1)': 'http://0177.0.0.1/',
    'short form (127.1)': 'http://127.1/',
    'three-part short form (127.0.1)': 'http://127.0.1/',
    'trailing dot (127.0.0.1.)': 'http://127.0.0.1./',
    'IPv4-mapped IPv6 ([::ffff:127.0.0.1])': 'http://[::ffff:127.0.0.1]/',
    'IPv4-mapped IPv6 hex ([::ffff:7f00:1])': 'http://[::ffff:7f00:1]/',
    'unspecified (0)': 'http://0/',
  };

  for (const [label, url] of Object.entries(loopbackEncodings)) {
    it(`${label} → loopback must be rejected with 400`, async () => {
      const r = await tryMemberUrl(url);
      assert.equal(r.status, 400,
        `VULNERABILITY: ${url} (loopback) was not blocked (got ${r.status}: ${JSON.stringify(r.body)}).`);
    });
  }

  const imdsEncodings = {
    'decimal IMDS (2852039166)': 'http://2852039166/latest/meta-data/',
    'hex IMDS (0xA9FEA9FE)': 'http://0xA9FEA9FE/latest/meta-data/',
  };

  for (const [label, url] of Object.entries(imdsEncodings)) {
    it(`${label} → 169.254.169.254 must be rejected with 400`, async () => {
      const r = await tryMemberUrl(url);
      assert.equal(r.status, 400,
        `VULNERABILITY: ${url} (cloud IMDS) was not blocked (got ${r.status}: ${JSON.stringify(r.body)}).`);
    });
  }

  it('CGNAT 100.64.0.1 must be rejected with 400', async () => {
    const r = await tryMemberUrl('http://100.64.0.1/');
    assert.equal(r.status, 400,
      `VULNERABILITY: CGNAT 100.64.0.1 was not blocked (got ${r.status}).`);
  });

  // Regression guard: a genuine public IP in decimal-dotted form must still pass
  // the SSRF check (a 50x/timeout from the unreachable host is fine — only a 400
  // would indicate a false-positive block).
  it('public 8.8.8.8 is NOT falsely blocked as an SSRF target', async () => {
    const r = await tryMemberUrl('http://8.8.8.8:3200/');
    assert.notEqual(r.status, 400,
      `False positive: public 8.8.8.8 was blocked when it should not be (got ${r.status}).`);
  });
});
