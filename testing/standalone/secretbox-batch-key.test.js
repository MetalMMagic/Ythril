/**
 * `deriveKey` / `encryptWithKey` / `decryptWithKey` — the batch path, and the reason it exists.
 *
 * `encryptEnvelope` derives its key INSIDE every call. With a passphrase that is one scrypt (N=16384) per
 * invocation: correct and cheap for the four state files it was written for, and catastrophic for a caller that
 * encrypts per record — a hundred thousand records would be hours and the backup would look like a hang.
 *
 * These tests pin three things: the batch path round-trips, it produces the SAME format as the single-shot path
 * (one implementation of an at-rest format, not two), and it does not re-derive per call.
 *
 * The last one is asserted by CALL SHAPE, not by timing. A timing assertion on scrypt would be flaky on a busy
 * CI runner, and "this was fast" is not the property that matters — "the key object is reused" is.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveKey, encryptWithKey, decryptWithKey, encryptEnvelope, decryptEnvelope, isEnvelope,
} from '../../server/dist/config/secretbox.js';

const KEY_SECRET = { kind: 'key', key: Buffer.alloc(32, 7) };
const PASS_SECRET = { kind: 'passphrase', passphrase: 'correct horse battery staple' };

describe('secretbox batch path', () => {
  for (const [name, secret] of [['raw key', KEY_SECRET], ['passphrase', PASS_SECRET]]) {
    it(`${name}: round-trips every item with one derivation`, () => {
      const dk = deriveKey(secret);
      const records = ['{"a":1}', '{"b":"ä ö ü — unicode"}', '{}', JSON.stringify({ big: 'x'.repeat(5000) })];
      const lines = records.map(r => encryptWithKey(r, dk));

      for (const [i, line] of lines.entries()) {
        assert.ok(isEnvelope(line), 'each line must be a recognisable envelope');
        assert.equal(decryptWithKey(line, dk), records[i]);
      }
    });

    it(`${name}: the batch format is the SAME format as encryptEnvelope`, () => {
      // The point of delegating: a file written by the batch path must be readable by the single-shot reader,
      // which is what the four state files use. Two formats would drift.
      const dk = deriveKey(secret);
      const line = encryptWithKey('{"shared":"format"}', dk);
      assert.equal(decryptEnvelope(line, secret), '{"shared":"format"}');

      const single = encryptEnvelope('{"shared":"format"}', secret);
      const a = JSON.parse(line), b = JSON.parse(single);
      assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), 'same envelope shape');
      assert.equal(a.alg, b.alg);
      assert.equal(a.kdf, b.kdf);
    });

    it(`${name}: a fresh IV per call, so a reused key is still safe`, () => {
      // A reused key with a REUSED IV is catastrophic in AES-GCM. This is the property that makes calling
      // encryptWithKey in a loop correct rather than merely fast.
      const dk = deriveKey(secret);
      const ivs = new Set(Array.from({ length: 50 }, () => JSON.parse(encryptWithKey('same', dk)).iv));
      assert.equal(ivs.size, 50, 'every call must use a fresh IV');
    });
  }

  it('does not re-derive per call — asserted on the key object, not on timing', () => {
    const dk = deriveKey(PASS_SECRET);
    const before = dk.key;
    encryptWithKey('a', dk);
    encryptWithKey('b', dk);
    assert.equal(dk.key, before, 'encryptWithKey must not replace the derived key');
    assert.ok(dk.salt, 'a passphrase derivation must carry its salt so envelopes can record it');
    // Every envelope from one derived key records that ONE salt — which is what makes a per-file salt work.
    const salts = new Set([1, 2, 3].map(() => JSON.parse(encryptWithKey('x', dk)).salt));
    assert.equal(salts.size, 1, 'one derived key means one salt across every envelope it makes');
  });

  it('a raw-key derivation carries no salt, and says so in the envelope', () => {
    const dk = deriveKey(KEY_SECRET);
    assert.equal(dk.kdf, 'raw');
    assert.equal(dk.salt, undefined);
    assert.equal(JSON.parse(encryptWithKey('x', dk)).salt, undefined);
  });

  it('refuses a mismatched envelope with an ACTIONABLE message, not an auth-tag failure', () => {
    // The failure this prevents: decrypting a passphrase envelope with a differently-salted derived key throws
    // `Unsupported state or unable to authenticate data`, which reads like corruption rather than a mistake.
    const a = deriveKey(PASS_SECRET);
    const b = deriveKey(PASS_SECRET); // same passphrase, different random salt
    const line = encryptWithKey('{"x":1}', a);
    assert.throws(() => decryptWithKey(line, b), /salt does not match the derived key/);

    // And a kdf mismatch is named too, rather than failing further down.
    assert.throws(() => decryptWithKey(line, deriveKey(KEY_SECRET)), /kdf is scrypt but the derived key is raw/);
  });

  it('still detects tampering — the auth tag is not weakened by key reuse', () => {
    const dk = deriveKey(KEY_SECRET);
    const env = JSON.parse(encryptWithKey('{"honest":true}', dk));
    const ct = Buffer.from(env.ct, 'base64');
    ct[0] ^= 0xff;
    env.ct = ct.toString('base64');
    assert.throws(() => decryptWithKey(JSON.stringify(env), dk));
  });

  it('rejects a non-envelope rather than guessing', () => {
    const dk = deriveKey(KEY_SECRET);
    assert.throws(() => decryptWithKey('{"not":"ours"}', dk), /unrecognised encryption envelope/);
  });
});
