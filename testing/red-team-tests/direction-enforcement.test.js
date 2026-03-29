/**
 * Red-team tests: Directional network inbound write enforcement
 *
 * In pubsub and braintree networks, subscribers/children have direction='push'
 * on the publisher/parent (meaning "we push TO them"). If a subscriber
 * somehow calls the publisher's sync write endpoints directly, the server
 * must reject the write with 403.
 *
 * This test performs a full RSA invite handshake to obtain a properly-linked
 * peer token (with peerInstanceId) and then verifies every inbound write
 * endpoint rejects the push-only peer.
 *
 * Run: node --test testing/red-team-tests/direction-enforcement.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, del } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

let adminToken;
let networkId;
let subscriberToken;  // PAT that A created for the subscriber (has peerInstanceId)

/**
 * Perform the full RSA-4096 invite handshake against instance A and return
 * the plaintext peer token that A created for the joiner.
 */
async function doHandshake(token, netId, joinerLabel) {
  // 1. Generate invite on A
  const gen = await post(INSTANCES.a, token, '/api/invite/generate', {
    networkId: netId,
    targetInstanceLabel: joinerLabel,
    targetUrl: 'https://sub.ythril-test.example.com',
  });
  assert.equal(gen.status, 201, `generate: ${JSON.stringify(gen.body)}`);

  // 2. Generate a 4096-bit RSA keypair for the subscriber
  const { publicKey: subPubPem, privateKey: subPrivPem } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const subInstanceId = crypto.randomUUID();

  // 3. Apply — A creates a PAT with peerInstanceId = subInstanceId
  const applyResp = await fetch(`${INSTANCES.a}/api/invite/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handshakeId: gen.body.handshakeId,
      networkId: netId,
      instanceId: subInstanceId,
      instanceLabel: joinerLabel,
      instanceUrl: 'https://sub.ythril-test.example.com',
      rsaPublicKeyPem: subPubPem,
    }),
  });
  assert.equal(applyResp.status, 200, `apply: ${await applyResp.clone().text()}`);
  const applyBody = await applyResp.json();

  // 4. Decrypt the token A created for us
  const peerTokenPlaintext = crypto.privateDecrypt(
    { key: subPrivPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(applyBody.encryptedTokenForB, 'base64'),
  ).toString('utf8');
  assert.ok(peerTokenPlaintext.startsWith('ythril_'), 'Decrypted token should start with ythril_');

  // 5. Create a fake PAT "for A" and encrypt it with A's public key for finalize
  //    (The subscriber doesn't actually run a server — we just need to complete
  //     the handshake so A registers the member.)
  const fakeTokenForA = `ythril_${crypto.randomBytes(32).toString('hex')}`;
  const encryptedTokenForA = crypto.publicEncrypt(
    { key: applyBody.rsaPublicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(fakeTokenForA, 'utf8'),
  ).toString('base64');

  const finalizeResp = await fetch(`${INSTANCES.a}/api/invite/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handshakeId: gen.body.handshakeId,
      encryptedTokenForA,
    }),
  });
  assert.equal(finalizeResp.status, 200, `finalize: ${await finalizeResp.clone().text()}`);
  const finalizeBody = await finalizeResp.json();
  assert.equal(finalizeBody.status, 'joined');

  return { token: peerTokenPlaintext, instanceId: subInstanceId };
}

describe('Directional network: push-only peer cannot write to sync endpoints', () => {
  before(async () => {
    adminToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

    // Create a pubsub network on A
    const r = await post(INSTANCES.a, adminToken, '/api/networks', {
      label: 'Direction Enforcement Test',
      type: 'pubsub',
      spaces: ['general'],
    });
    assert.equal(r.status, 201, `Create pubsub network: ${JSON.stringify(r.body)}`);
    networkId = r.body.id;

    // Add a subscriber via full RSA handshake — creates a PAT with peerInstanceId
    const sub = await doHandshake(adminToken, networkId, 'Red-Team Subscriber');
    subscriberToken = sub.token;

    // Verify member exists with direction=push
    const netR = await get(INSTANCES.a, adminToken, `/api/networks/${networkId}`);
    assert.equal(netR.status, 200);
    const member = netR.body.members?.find(m => m.instanceId === sub.instanceId);
    assert.ok(member, 'Subscriber should exist in member list');
    assert.equal(member.direction, 'push', 'Subscriber direction should be push (publisher pushes to them)');
  });

  after(async () => {
    if (networkId) {
      await del(INSTANCES.a, adminToken, `/api/networks/${networkId}`).catch(() => {});
    }
  });

  // ── Write endpoints that must be blocked ─────────────────────────────────

  it('Subscriber cannot POST /api/sync/memories → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/memories?spaceId=general&networkId=${networkId}`,
      { _id: crypto.randomUUID(), fact: 'injected by subscriber', seq: 1 },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body.error?.includes('write not permitted'), `Error message should mention write not permitted: ${r.body.error}`);
  });

  it('Subscriber cannot POST /api/sync/entities → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/entities?spaceId=general&networkId=${networkId}`,
      { _id: crypto.randomUUID(), name: 'injected entity', type: 'person', seq: 1 },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber cannot POST /api/sync/edges → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/edges?spaceId=general&networkId=${networkId}`,
      { _id: crypto.randomUUID(), from: 'a', to: 'b', label: 'injected', seq: 1 },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber cannot POST /api/sync/chrono → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/chrono?spaceId=general&networkId=${networkId}`,
      { _id: crypto.randomUUID(), type: 'memory', targetId: 'x', seq: 1 },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber cannot POST /api/sync/batch-upsert → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/batch-upsert?spaceId=general&networkId=${networkId}`,
      { memories: [{ _id: crypto.randomUUID(), fact: 'batch-injected', seq: 1 }] },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber cannot POST /api/sync/tombstones → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/tombstones?spaceId=general&networkId=${networkId}`,
      [{ _id: crypto.randomUUID(), type: 'memory', instanceId: 'attacker', deletedAt: new Date().toISOString() }],
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber cannot POST /api/sync/file-tombstones → 403', async () => {
    const r = await post(INSTANCES.a, subscriberToken,
      `/api/sync/file-tombstones?networkId=${networkId}`,
      { spaceId: 'general', tombstones: [{ _id: crypto.randomUUID(), path: 'attack.txt', deletedAt: new Date().toISOString() }] },
    );
    assert.equal(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── Read endpoints should still work (subscriber can pull) ───────────────

  it('Subscriber CAN GET /api/sync/memories → 200', async () => {
    const r = await get(INSTANCES.a, subscriberToken,
      `/api/sync/memories?spaceId=general&networkId=${networkId}`,
    );
    assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber CAN GET /api/sync/entities → 200', async () => {
    const r = await get(INSTANCES.a, subscriberToken,
      `/api/sync/entities?spaceId=general&networkId=${networkId}`,
    );
    assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  it('Subscriber CAN GET /api/sync/tombstones → 200', async () => {
    const r = await get(INSTANCES.a, subscriberToken,
      `/api/sync/tombstones?spaceId=general&networkId=${networkId}`,
    );
    assert.equal(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
  });
});
