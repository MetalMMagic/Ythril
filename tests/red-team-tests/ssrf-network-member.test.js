/**
 * Red-team tests: SSRF via network member URL
 *
 * When an authenticated user registers a peer member with a crafted URL,
 * the server should reject URLs that could cause outbound connections to
 * cloud instance metadata services, internal network hosts, or dangerous
 * URI schemes.
 *
 * z.string().url() accepts any syntactically valid URL — private/metadata
 * IP ranges and dangerous schemes must be blocked by explicit validation.
 *
 * Run: node --test tests/red-team-tests/ssrf-network-member.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

let adminToken;
let networkId;

describe('SSRF via network peer registration', () => {
  before(async () => {
    adminToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

    // Create a throw-away network to use for member-add attempts
    const r = await post(INSTANCES.a, adminToken, '/api/networks', {
      label: 'ssrf-test-network',
      type: 'closed',
      spaces: ['general'],
    });
    assert.equal(r.status, 201, `Failed to create network: ${JSON.stringify(r.body)}`);
    networkId = r.body.id;
  });

  after(async () => {
    // Delete the throw-away network
    if (networkId) {
      await fetch(`${INSTANCES.a}/api/networks/${networkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  /** Try to add a member with a dangerous URL.  Must be rejected with 400. */
  async function tryMemberUrl(url) {
    return post(INSTANCES.a, adminToken, `/api/networks/${networkId}/members`, {
      instanceId: 'ssrf-probe-instance',
      label: 'SSRF probe',
      url,
      token: 'ythril_fakefakefakefakefakefakefake',
    });
  }

  it('file:// URI is rejected → 400', async () => {
    const r = await tryMemberUrl('file:///etc/passwd');
    assert.equal(r.status, 400, `file:// should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('AWS instance metadata URL is rejected → 400', async () => {
    const r = await tryMemberUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(r.status, 400, `169.254.x.x should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Azure IMDS URL is rejected → 400', async () => {
    const r = await tryMemberUrl('http://169.254.169.254/metadata/instance?api-version=2021-02-01');
    assert.equal(r.status, 400, `Azure IMDS should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('GCP metadata URL is rejected → 400', async () => {
    const r = await tryMemberUrl('http://metadata.google.internal/computeMetadata/v1/');
    assert.equal(r.status, 400, `metadata.google.internal should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Loopback IPv4 (127.0.0.1) is rejected → 400', async () => {
    const r = await tryMemberUrl('http://127.0.0.1:27017/');
    assert.equal(r.status, 400, `127.0.0.1 should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Localhost hostname is rejected → 400', async () => {
    const r = await tryMemberUrl('http://localhost:6379/');
    assert.equal(r.status, 400, `localhost should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('IPv6 loopback [::1] is rejected → 400', async () => {
    const r = await tryMemberUrl('http://[::1]:3200/');
    assert.equal(r.status, 400, `[::1] should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('RFC-1918 10.x.x.x is rejected → 400', async () => {
    const r = await tryMemberUrl('http://10.0.0.1:3200/');
    assert.equal(r.status, 400, `10.x.x.x should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('RFC-1918 192.168.x.x is rejected → 400', async () => {
    const r = await tryMemberUrl('http://192.168.1.100:3200/');
    assert.equal(r.status, 400, `192.168.x.x should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('RFC-1918 172.16.x.x is rejected → 400', async () => {
    const r = await tryMemberUrl('http://172.16.0.1:3200/');
    assert.equal(r.status, 400, `172.16.x.x should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('URL with embedded credentials is rejected → 400', async () => {
    const r = await tryMemberUrl('https://admin:secret@real-ythril-peer.example.com/');
    assert.equal(r.status, 400, `URL with credentials should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('javascript: URI is rejected → 400', async () => {
    const r = await tryMemberUrl('javascript:alert(1)');
    assert.equal(r.status, 400, `javascript: should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('0.0.0.0 is rejected → 400', async () => {
    const r = await tryMemberUrl('http://0.0.0.0:3200/');
    assert.equal(r.status, 400, `0.0.0.0 should be blocked, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Valid public HTTPS URL is accepted → 201 or 202', async () => {
    // Confirm the validator passes legitimate peer URLs (public Internet host).
    // closed networks return 202 (vote_pending) rather than 201.
    const r = await tryMemberUrl('https://peer.example.com/');
    assert.ok(
      r.status === 201 || r.status === 202,
      `Legitimate HTTPS peer URL should be allowed, got ${r.status}: ${JSON.stringify(r.body)}`,
    );
    // Clean up the valid member we just created
    const instanceId = r.body?.instanceId ?? r.body?.member?.instanceId ?? 'ssrf-probe-instance';
    await fetch(`${INSTANCES.a}/api/networks/${networkId}/members/${instanceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });
});
