/**
 * Red-team tests: invite membership binding (M10)
 *
 * M10a — a REPARENT invite is bound to its target instanceId. finalize() rewrites
 *        that member's record (including its inbound tokenHash), so a holder of a
 *        reparent bundle who applies as an unrelated instanceId must NOT be able
 *        to seize another member's record. apply() must refuse the mismatch.
 * M10b — optional pinning: when the inviter sets expectedInstanceId, only that
 *        instance may apply the bundle.
 *
 * Uses instance A (SKIP_AUTH_RATE_LIMIT=true) for the invite endpoints.
 *
 * Run: node --test testing/red-team-tests/invite-binding.test.js
 * Pre-requisite: test stack up + testing/sync/setup.js.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES, post } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_A = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');
const RUN = Date.now();

let tokenA;

function rsa4096() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

async function apply(body) {
  const r = await fetch(`${INSTANCES.a}/api/invite/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, body: json };
}

before(() => {
  tokenA = fs.readFileSync(TOKEN_A, 'utf8').trim();
});

// ── M10a — reparent bundle cannot seize another member ───────────────────────

describe('M10 — a reparent invite is bound to its target instance', () => {
  let networkId;
  const victimId = crypto.randomUUID();
  const attackerId = crypto.randomUUID();

  before(async () => {
    // Braintree network with self as root and a victim child whose "parent" we
    // will pretend is offline so a reparent invite can be generated for it.
    const net = await post(INSTANCES.a, tokenA, '/api/networks', {
      label: `invite-bind-${RUN}`,
      type: 'braintree',
      spaces: ['general'],
      votingDeadlineHours: 1,
    });
    assert.equal(net.status, 201, JSON.stringify(net.body));
    networkId = net.body.id;

    // Add the victim as a direct member (child of self).
    const pt = await post(INSTANCES.a, tokenA, '/api/tokens', {
      name: `invite-bind-victim-${RUN}`,
      peerInstanceId: victimId,
    });
    const add = await post(INSTANCES.a, tokenA, `/api/networks/${networkId}/members`, {
      instanceId: victimId,
      label: 'Victim Child',
      url: 'http://victim.internal:3200',
      token: pt.body.plaintext,
      direction: 'both',
    });
    assert.ok(add.status === 201 || add.status === 202, `add victim: ${add.status} ${JSON.stringify(add.body)}`);
  });

  after(async () => {
    await fetch(`${INSTANCES.a}/api/networks/${networkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).catch(() => {});
  });

  it('a reparent invite applied under a DIFFERENT instanceId is refused (no member seizure)', async () => {
    const gen = await post(INSTANCES.a, tokenA, '/api/invite/generate', {
      networkId,
      reparentInstanceId: victimId,
    });
    assert.equal(gen.status, 201, `generate reparent: ${JSON.stringify(gen.body)}`);

    const { publicKey } = rsa4096();
    const r = await apply({
      handshakeId: gen.body.handshakeId,
      networkId,
      instanceId: attackerId,          // NOT the reparent target
      instanceLabel: 'Attacker',
      instanceUrl: 'https://attacker.example.com',
      rsaPublicKeyPem: publicKey,
    });
    assert.equal(r.status, 403, `VULNERABILITY: reparent applied as a different instance (${r.status}) ${JSON.stringify(r.body)}`);
  });

  it('a reparent invite applied as the correct target is accepted', async () => {
    const gen = await post(INSTANCES.a, tokenA, '/api/invite/generate', {
      networkId,
      reparentInstanceId: victimId,
    });
    assert.equal(gen.status, 201);

    const { publicKey } = rsa4096();
    const r = await apply({
      handshakeId: gen.body.handshakeId,
      networkId,
      instanceId: victimId,            // the reparent target
      instanceLabel: 'Victim Child',
      instanceUrl: 'http://victim.internal:3200',
      rsaPublicKeyPem: publicKey,
    });
    assert.equal(r.status, 200, `legitimate reparent apply should succeed: ${r.status} ${JSON.stringify(r.body)}`);
  });
});

// ── M10b — expectedInstanceId pinning ────────────────────────────────────────

describe('M10 — expectedInstanceId pins an invite to one instance', () => {
  let networkId;
  const intendedId = crypto.randomUUID();
  const otherId = crypto.randomUUID();

  before(async () => {
    const net = await post(INSTANCES.a, tokenA, '/api/networks', {
      label: `invite-pin-${RUN}`,
      type: 'club',
      spaces: ['general'],
      votingDeadlineHours: 1,
    });
    assert.equal(net.status, 201, JSON.stringify(net.body));
    networkId = net.body.id;
  });

  after(async () => {
    await fetch(`${INSTANCES.a}/api/networks/${networkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).catch(() => {});
  });

  it('a pinned invite applied by the wrong instance is refused', async () => {
    const gen = await post(INSTANCES.a, tokenA, '/api/invite/generate', {
      networkId,
      expectedInstanceId: intendedId,
    });
    assert.equal(gen.status, 201, JSON.stringify(gen.body));

    const { publicKey } = rsa4096();
    const r = await apply({
      handshakeId: gen.body.handshakeId,
      networkId,
      instanceId: otherId,             // not the pinned instance
      instanceLabel: 'Interloper',
      instanceUrl: 'https://interloper.example.com',
      rsaPublicKeyPem: publicKey,
    });
    assert.equal(r.status, 403, `VULNERABILITY: pinned invite redeemed by another instance (${r.status})`);
  });

  it('the pinned instance can apply its own invite', async () => {
    const gen = await post(INSTANCES.a, tokenA, '/api/invite/generate', {
      networkId,
      expectedInstanceId: intendedId,
    });
    assert.equal(gen.status, 201);

    const { publicKey } = rsa4096();
    const r = await apply({
      handshakeId: gen.body.handshakeId,
      networkId,
      instanceId: intendedId,
      instanceLabel: 'Intended',
      instanceUrl: 'https://intended.example.com',
      rsaPublicKeyPem: publicKey,
    });
    assert.equal(r.status, 200, `pinned instance should be able to apply: ${r.status} ${JSON.stringify(r.body)}`);
  });
});
