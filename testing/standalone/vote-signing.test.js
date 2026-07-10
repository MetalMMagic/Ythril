/**
 * Unit tests: governance vote-cast signing & relay acceptance (util/signing.ts)
 *
 * Pure in-process crypto — no MongoDB, no Docker, no config loaded. Run with:
 *   node --test testing/standalone/vote-signing.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInstanceKeypair,
  voteCastMessage,
  signMessage,
  verifyMessage,
  isVoteCastSignatureValid,
  acceptVoteCast,
} from '../../server/dist/util/signing.js';

const NET_ID = 'net-1';
const ROUND = { roundId: 'round-1', subjectInstanceId: 'subject-X' };

const A = generateInstanceKeypair();
const B = generateInstanceKeypair();

function signedCast(kp, instanceId, vote, over = {}) {
  const msg = voteCastMessage({
    networkId: over.networkId ?? NET_ID,
    roundId: over.roundId ?? ROUND.roundId,
    subjectInstanceId: over.subjectInstanceId ?? ROUND.subjectInstanceId,
    instanceId,
    vote: over.voteInSig ?? vote,
  });
  return { instanceId, vote, castAt: '2026-07-10T00:00:00.000Z', sig: signMessage(kp.privateKeyPem, msg) };
}

function net(extra = {}) {
  return {
    id: NET_ID,
    members: [
      { instanceId: 'A', signingPublicKey: A.publicKeyPem },
      { instanceId: 'B', signingPublicKey: B.publicKeyPem },
      { instanceId: 'C' }, // no key pinned yet
    ],
    ...extra,
  };
}

describe('sign / verify primitives', () => {
  it('round-trips a signature', () => {
    const msg = voteCastMessage({ networkId: NET_ID, roundId: 'r', subjectInstanceId: 's', instanceId: 'A', vote: 'yes' });
    const sig = signMessage(A.privateKeyPem, msg);
    assert.ok(sig.length > 0);
    assert.equal(verifyMessage(A.publicKeyPem, msg, sig), true);
  });

  it('fails on a tampered message', () => {
    const sig = signMessage(A.privateKeyPem, 'hello');
    assert.equal(verifyMessage(A.publicKeyPem, 'hello!', sig), false);
  });

  it('fails against the wrong key', () => {
    const msg = 'x';
    const sig = signMessage(A.privateKeyPem, msg);
    assert.equal(verifyMessage(B.publicKeyPem, msg, sig), false);
  });

  it('fails on garbage signature / empty inputs', () => {
    assert.equal(verifyMessage(A.publicKeyPem, 'x', 'not-base64-sig'), false);
    assert.equal(verifyMessage('', 'x', 'AAAA'), false);
    assert.equal(verifyMessage(A.publicKeyPem, 'x', ''), false);
  });

  it('binds every field — changing any changes the message', () => {
    const base = { networkId: 'n', roundId: 'r', subjectInstanceId: 's', instanceId: 'i', vote: 'yes' };
    const m = voteCastMessage(base);
    for (const k of Object.keys(base)) {
      assert.notEqual(voteCastMessage({ ...base, [k]: base[k] + 'X' }), m, `field ${k} must be bound`);
    }
  });
});

describe('isVoteCastSignatureValid', () => {
  it('accepts a correctly signed cast against the pinned key', () => {
    assert.equal(isVoteCastSignatureValid(net(), ROUND, signedCast(A, 'A', 'yes')), true);
  });
  it('rejects when the vote value was tampered after signing', () => {
    const c = signedCast(A, 'A', 'yes');
    c.vote = 'veto'; // signature was over "yes"
    assert.equal(isVoteCastSignatureValid(net(), ROUND, c), false);
  });
  it('rejects a signature bound to a different round', () => {
    const c = signedCast(A, 'A', 'yes', { roundId: 'other-round' });
    assert.equal(isVoteCastSignatureValid(net(), ROUND, c), false);
  });
  it('rejects a signature bound to a different network', () => {
    const c = signedCast(A, 'A', 'yes', { networkId: 'other-net' });
    assert.equal(isVoteCastSignatureValid(net(), ROUND, c), false);
  });
  it('rejects when signer key does not match claimed voter (A signs, claims to be B)', () => {
    const c = signedCast(A, 'B', 'yes'); // signed with A's key, instanceId=B → verified against B's key
    assert.equal(isVoteCastSignatureValid(net(), ROUND, c), false);
  });
  it('rejects when no key is pinned for the voter', () => {
    const c = signedCast(A, 'C', 'yes'); // C has no pinned key
    assert.equal(isVoteCastSignatureValid(net(), ROUND, c), false);
  });
  it('rejects an unsigned cast', () => {
    assert.equal(isVoteCastSignatureValid(net(), ROUND, { instanceId: 'A', vote: 'yes', castAt: 'x' }), false);
  });
});

describe('acceptVoteCast — compatibility mode (default)', () => {
  const n = net();
  it('accepts a valid signed cast relayed by ANY peer (relay-safe)', () => {
    const c = signedCast(A, 'A', 'yes');
    assert.equal(acceptVoteCast(n, ROUND, c, 'B').accept, true, 'relayed by B');
    assert.equal(acceptVoteCast(n, ROUND, c, 'someone-else').accept, true);
  });
  it('accepts an unsigned cast reported directly by its voter', () => {
    const c = { instanceId: 'A', vote: 'yes', castAt: 'x' };
    assert.equal(acceptVoteCast(n, ROUND, c, 'A').accept, true);
  });
  it('rejects an unsigned cast relayed on behalf of another instance (forgery)', () => {
    const c = { instanceId: 'A', vote: 'yes', castAt: 'x' };
    const d = acceptVoteCast(n, ROUND, c, 'B');
    assert.equal(d.accept, false);
    assert.match(d.reason, /unsigned vote relayed/);
  });
  it('rejects an invalid signature relayed by another instance', () => {
    const c = signedCast(A, 'A', 'yes');
    c.vote = 'veto'; // invalidates signature
    assert.equal(acceptVoteCast(n, ROUND, c, 'B').accept, false);
  });
  it('accepts an invalid-signature cast reported by its own voter (falls back to own-cast)', () => {
    const c = signedCast(A, 'A', 'yes');
    c.sig = 'garbage';
    assert.equal(acceptVoteCast(n, ROUND, c, 'A').accept, true);
  });
});

describe('acceptVoteCast — strict mode (requireSignedVotes)', () => {
  const n = net({ requireSignedVotes: true });
  it('accepts a valid signed cast from any reporter', () => {
    assert.equal(acceptVoteCast(n, ROUND, signedCast(A, 'A', 'yes'), 'B').accept, true);
  });
  it('rejects an unsigned cast even from its own voter', () => {
    const d = acceptVoteCast(n, ROUND, { instanceId: 'A', vote: 'yes', castAt: 'x' }, 'A');
    assert.equal(d.accept, false);
    assert.match(d.reason, /requires signed votes/);
  });
  it('rejects an invalid signature even from its own voter', () => {
    const c = signedCast(A, 'A', 'yes');
    c.sig = 'garbage';
    assert.equal(acceptVoteCast(n, ROUND, c, 'A').accept, false);
  });
});
