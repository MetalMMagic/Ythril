/**
 * Red-team: post-admission peer-URL SSRF (S2.5).
 *
 * A peer's URL is SSRF-validated at admission, but the member self-update path
 * (POST /api/sync/networks/:id/members) could previously overwrite a stored URL
 * with no re-validation. A malicious/compromised member could move itself onto a
 * crown-jewel address (cloud IMDS 169.254.169.254, loopback) and the sync engine
 * would then connect there with peer auth headers attached.
 *
 * The fix re-validates the URL before persisting it. Crown-jewel addresses are
 * rejected even though the test stack runs with SYNC_ALLOW_PRIVATE_PEERS=true
 * (its peers live on the Docker bridge / RFC-1918); a legitimate private URL is
 * still accepted.
 *
 * Run: node --test testing/red-team-tests/sync-peer-ssrf.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, del, delWithBody, getInstanceId, readContainerConfig } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();

let tokenA, instanceIdB, networkId, testSpaceId;

function memberBUrl() {
  const net = readContainerConfig('ythril-a').networks.find(n => n.id === networkId);
  return net?.members.find(m => m.instanceId === instanceIdB)?.url;
}

async function selfUpdateB(url) {
  return post(INSTANCES.a, tokenA, `/api/sync/networks/${networkId}/members`, {
    instanceId: instanceIdB, label: 'Instance B', url, direction: 'both',
  });
}

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  instanceIdB = getInstanceId('ythril-b');

  testSpaceId = `ssrf-peer-${RUN}`;
  await post(INSTANCES.a, tokenA, '/api/spaces', { id: testSpaceId, label: 'SSRF Peer Test' });

  const netR = await post(INSTANCES.a, tokenA, '/api/networks', {
    label: `SSRF Peer ${RUN}`, type: 'closed', spaces: [testSpaceId], votingDeadlineHours: 1,
  });
  assert.equal(netR.status, 201, `create network: ${JSON.stringify(netR.body)}`);
  networkId = netR.body.id;

  const pt = await post(INSTANCES.a, tokenA, '/api/tokens', { name: `ssrf-peer-b-${RUN}` });
  const addB = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/members`, {
    instanceId: instanceIdB, label: 'Instance B', url: 'http://ythril-b:3200', token: pt.body.plaintext, direction: 'both',
  });
  if (addB.status === 202) {
    await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/votes/${addB.body.roundId}`, { vote: 'yes' });
  }
  assert.ok(memberBUrl(), 'B is a member on A after setup');
});

after(async () => {
  if (networkId) {
    await del(INSTANCES.a, tokenA, `/api/networks/${networkId}`).catch(() => {});
    await delWithBody(INSTANCES.a, tokenA, `/api/spaces/${testSpaceId}`, { confirm: true }).catch(() => {});
  }
});

describe('Post-admission peer-URL SSRF is refused', () => {
  it('rejects a self-update to cloud IMDS (169.254.169.254)', async () => {
    const before = memberBUrl();
    await selfUpdateB('http://169.254.169.254:3200');
    assert.equal(memberBUrl(), before, 'B URL must not become the IMDS address');
  });

  it('rejects a self-update to loopback (127.0.0.1)', async () => {
    const before = memberBUrl();
    await selfUpdateB('http://127.0.0.1:3200');
    assert.equal(memberBUrl(), before, 'B URL must not become loopback');
  });

  it('rejects IMDS encoded as a decimal integer', async () => {
    const before = memberBUrl();
    await selfUpdateB('http://2852039166:3200'); // 169.254.169.254
    assert.equal(memberBUrl(), before, 'B URL must not become the encoded IMDS address');
  });

  it('still accepts a legitimate private URL (allowPrivatePeers is on for the test stack)', async () => {
    await selfUpdateB('http://ythril-b:3299');
    assert.equal(memberBUrl(), 'http://ythril-b:3299', 'a valid private peer URL is accepted');
  });
});
