/**
 * PR-S2 — at-rest encryption primitive (`config/secretbox.ts`).
 *
 * AES-256-GCM envelope: round-trips under a raw key and a passphrase (scrypt); a wrong key, wrong
 * secret kind, or any tampering fails the auth tag; `isEnvelope` cleanly separates ciphertext from a
 * plaintext config object. These are the guarantees the loader relies on to fail loud rather than ever
 * treat ciphertext as plaintext.
 *
 * Run: node --test testing/standalone/secretbox.test.js
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  encryptEnvelope, decryptEnvelope, isEnvelope, resolveMasterSecret, generateMasterKeyBase64,
} from '../../server/dist/config/secretbox.js';

const KEY = { kind: 'key', key: crypto.randomBytes(32) };
const PASS = { kind: 'passphrase', passphrase: 'correct horse battery staple' };

describe('secretbox envelope', () => {
  it('round-trips with a raw key', () => {
    const pt = JSON.stringify({ a: 1, secret: 'tok_abc' });
    const env = encryptEnvelope(pt, KEY);
    assert.ok(isEnvelope(env));
    assert.equal(decryptEnvelope(env, KEY), pt);
  });

  it('round-trips with a passphrase (scrypt, per-file salt)', () => {
    const env1 = encryptEnvelope('hello', PASS);
    const env2 = encryptEnvelope('hello', PASS);
    assert.notEqual(env1, env2, 'random salt/iv → distinct ciphertexts');
    assert.equal(decryptEnvelope(env1, PASS), 'hello');
    assert.equal(decryptEnvelope(env2, PASS), 'hello');
  });

  it('ciphertext does not leak the plaintext', () => {
    const env = encryptEnvelope('SUPER_SECRET_TOKEN', KEY);
    assert.ok(!env.includes('SUPER_SECRET_TOKEN'));
  });

  it('a wrong key fails the auth tag', () => {
    const env = encryptEnvelope('x', KEY);
    assert.throws(() => decryptEnvelope(env, { kind: 'key', key: crypto.randomBytes(32) }));
  });

  it('wrong secret KIND is rejected with a clear message', () => {
    // raw-key envelope, decrypted with a passphrase secret → complains about the missing key
    assert.throws(() => decryptEnvelope(encryptEnvelope('x', KEY), PASS), /MASTER_KEY|key-encrypted/);
    // passphrase envelope, decrypted with a key secret → complains about the missing passphrase
    assert.throws(() => decryptEnvelope(encryptEnvelope('x', PASS), KEY), /MASTER_PASSPHRASE|passphrase-encrypted/);
  });

  it('tampered ciphertext is rejected', () => {
    const env = JSON.parse(encryptEnvelope('hello world', KEY));
    const ct = Buffer.from(env.ct, 'base64'); ct[0] ^= 0xff;
    env.ct = ct.toString('base64');
    assert.throws(() => decryptEnvelope(JSON.stringify(env), KEY));
  });

  it('isEnvelope separates ciphertext from a plaintext config', () => {
    assert.equal(isEnvelope('{"instanceId":"x","spaces":[]}'), false);
    assert.equal(isEnvelope('not json at all'), false);
    assert.equal(isEnvelope(''), false);
    assert.equal(isEnvelope(encryptEnvelope('x', KEY)), true);
  });
});

describe('resolveMasterSecret (env)', () => {
  afterEach(() => { delete process.env.YTHRIL_MASTER_KEY; delete process.env.YTHRIL_MASTER_PASSPHRASE; });

  it('null when nothing configured', () => {
    assert.equal(resolveMasterSecret(), null);
  });

  it('reads YTHRIL_MASTER_KEY (base64) as a raw key', () => {
    process.env.YTHRIL_MASTER_KEY = generateMasterKeyBase64();
    assert.equal(resolveMasterSecret().kind, 'key');
  });

  it('reads a 64-hex YTHRIL_MASTER_KEY', () => {
    process.env.YTHRIL_MASTER_KEY = crypto.randomBytes(32).toString('hex');
    assert.equal(resolveMasterSecret().kind, 'key');
  });

  it('falls back to YTHRIL_MASTER_PASSPHRASE', () => {
    process.env.YTHRIL_MASTER_PASSPHRASE = 'pw';
    assert.equal(resolveMasterSecret().kind, 'passphrase');
  });

  it('rejects a wrong-length raw key', () => {
    process.env.YTHRIL_MASTER_KEY = 'tooshort';
    assert.throws(() => resolveMasterSecret());
  });
});
