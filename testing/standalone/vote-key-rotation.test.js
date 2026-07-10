/**
 * Unit tests: governance signing-key rotation (util/signing.ts)
 *
 * A key change is accepted only with a continuity proof signed by the CURRENTLY
 * pinned key. Pure in-process crypto — no config/Docker. Run:
 *   node --test testing/standalone/vote-key-rotation.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInstanceKeypair,
  keyRotationMessage,
  signMessage,
  isValidKeyRotation,
  pinMemberSigningKey,
  forceSetMemberSigningKey,
} from '../../server/dist/util/signing.js';

const OLD = generateInstanceKeypair();
const NEW = generateInstanceKeypair();
const ATTACKER = generateInstanceKeypair();

function proofBy(kp, instanceId, newPub) {
  return signMessage(kp.privateKeyPem, keyRotationMessage({ instanceId, newPublicKey: newPub }));
}

describe('isValidKeyRotation', () => {
  it('accepts a proof signed by the currently-pinned key over the new key', () => {
    const rotation = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(OLD, 'M', NEW.publicKeyPem) };
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, NEW.publicKeyPem, rotation), true);
  });

  it('rejects a proof signed by an unrelated (attacker) key', () => {
    const rotation = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(ATTACKER, 'M', NEW.publicKeyPem) };
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, NEW.publicKeyPem, rotation), false);
  });

  it('rejects when previousPublicKey does not match the pinned key', () => {
    const rotation = { previousPublicKey: ATTACKER.publicKeyPem, proof: proofBy(ATTACKER, 'M', NEW.publicKeyPem) };
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, NEW.publicKeyPem, rotation), false);
  });

  it('rejects when the new key was tampered after signing', () => {
    const rotation = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(OLD, 'M', NEW.publicKeyPem) };
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, ATTACKER.publicKeyPem, rotation), false);
  });

  it('rejects when the proof was bound to a different instanceId', () => {
    const rotation = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(OLD, 'OTHER', NEW.publicKeyPem) };
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, NEW.publicKeyPem, rotation), false);
  });

  it('rejects a missing rotation', () => {
    assert.equal(isValidKeyRotation('M', OLD.publicKeyPem, NEW.publicKeyPem, undefined), false);
  });
});

describe('pinMemberSigningKey — with rotation proof', () => {
  it('trust-on-first-use pins when no key is set', () => {
    const m = { instanceId: 'M' };
    assert.equal(pinMemberSigningKey(m, OLD.publicKeyPem), true);
    assert.equal(m.signingPublicKey, OLD.publicKeyPem);
  });

  it('re-pins to a new key given a valid continuity proof', () => {
    const m = { instanceId: 'M', signingPublicKey: OLD.publicKeyPem };
    const rotation = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(OLD, 'M', NEW.publicKeyPem) };
    assert.equal(pinMemberSigningKey(m, NEW.publicKeyPem, rotation), true);
    assert.equal(m.signingPublicKey, NEW.publicKeyPem);
  });

  it('REFUSES a key swap with no proof (impersonation attempt)', () => {
    const m = { instanceId: 'M', signingPublicKey: OLD.publicKeyPem };
    assert.equal(pinMemberSigningKey(m, ATTACKER.publicKeyPem), false);
    assert.equal(m.signingPublicKey, OLD.publicKeyPem, 'pinned key must be unchanged');
  });

  it('REFUSES a key swap with a forged proof', () => {
    const m = { instanceId: 'M', signingPublicKey: OLD.publicKeyPem };
    const forged = { previousPublicKey: OLD.publicKeyPem, proof: proofBy(ATTACKER, 'M', ATTACKER.publicKeyPem) };
    assert.equal(pinMemberSigningKey(m, ATTACKER.publicKeyPem, forged), false);
    assert.equal(m.signingPublicKey, OLD.publicKeyPem);
  });

  it('no-op when the incoming key equals the pinned key', () => {
    const m = { instanceId: 'M', signingPublicKey: OLD.publicKeyPem };
    assert.equal(pinMemberSigningKey(m, OLD.publicKeyPem), false);
  });
});

describe('forceSetMemberSigningKey — break-glass', () => {
  it('overwrites the pinned key unconditionally', () => {
    const m = { instanceId: 'M', signingPublicKey: OLD.publicKeyPem };
    forceSetMemberSigningKey(m, ATTACKER.publicKeyPem);
    assert.equal(m.signingPublicKey, ATTACKER.publicKeyPem);
  });
});
