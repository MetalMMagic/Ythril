/**
 * At-rest encryption for Ythril's state files (PR-S2) — config.json / secrets.json /
 * schema-library.json / schema-catalogs.json.
 *
 * A pure leaf (only `node:crypto`). The loader wraps its serialize/parse choke points with
 * {@link encryptEnvelope} / {@link decryptEnvelope}; detection is via {@link isEnvelope}. The master
 * secret lives ONLY in the environment (never written to disk) so a stolen file — or a co-tenant on
 * shared hardware reading the volume — is useless without it:
 *   - `YTHRIL_MASTER_KEY`        — 32 raw bytes as base64 or hex (used directly, kdf `raw`).
 *   - `YTHRIL_MASTER_PASSPHRASE` — any passphrase; a per-file scrypt salt is stored in the envelope.
 *
 * AES-256-GCM (authenticated): a wrong key or a tampered file fails the auth tag and throws — the loader
 * turns that into a hard boot failure rather than ever treating ciphertext as plaintext.
 *
 * WARNING: losing the master secret makes these files unrecoverable, by design. Back it up.
 */
import crypto from 'node:crypto';

export type MasterSecret =
  | { kind: 'key'; key: Buffer }
  | { kind: 'passphrase'; passphrase: string };

interface Envelope {
  ythrilEnc: 1;
  alg: 'AES-256-GCM';
  kdf: 'raw' | 'scrypt';
  salt?: string; // base64, present iff kdf === 'scrypt'
  iv: string;    // base64 (12 bytes)
  tag: string;   // base64 (16 bytes)
  ct: string;    // base64 ciphertext
}

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

/** Parse a 32-byte key from base64 or hex; throws on any other length/encoding. */
function parseRawKey(raw: string): Buffer {
  const s = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex');
  let buf: Buffer;
  try { buf = Buffer.from(s, 'base64'); } catch { throw new Error('YTHRIL_MASTER_KEY must be base64 or hex'); }
  if (buf.length !== 32) {
    throw new Error(`YTHRIL_MASTER_KEY must decode to exactly 32 bytes (got ${buf.length}); use 64 hex chars or base64 of 32 bytes`);
  }
  return buf;
}

/** Resolve the master secret from the environment, or null when none is configured. */
export function resolveMasterSecret(): MasterSecret | null {
  const rawKey = process.env['YTHRIL_MASTER_KEY'];
  if (rawKey && rawKey.trim()) return { kind: 'key', key: parseRawKey(rawKey) };
  const pass = process.env['YTHRIL_MASTER_PASSPHRASE'];
  if (pass && pass.length > 0) return { kind: 'passphrase', passphrase: pass };
  return null;
}

function scryptKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32, SCRYPT_PARAMS);
}

/** True if `raw` is one of our encryption envelopes (unambiguous `ythrilEnc` marker). */
export function isEnvelope(raw: string): boolean {
  const t = raw.trimStart();
  if (!t.startsWith('{')) return false;
  try {
    const o = JSON.parse(t) as { ythrilEnc?: unknown };
    return o !== null && typeof o === 'object' && o.ythrilEnc === 1;
  } catch {
    return false;
  }
}

/**
 * The AES-GCM step both decrypt paths share. `.final()` throws when the auth tag does not verify — a wrong
 * key or a tampered file — which is what makes it impossible to treat ciphertext as plaintext by accident.
 */
function decipherEnvelope(env: Envelope, key: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(env.tag, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(env.ct, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * A master secret with its key derivation ALREADY DONE.
 *
 * This exists because {@link encryptEnvelope} derives inside every call, and with a passphrase that means one
 * scrypt (N=16384, tens of milliseconds, deliberately) per invocation. Correct and cheap for the four state
 * files it was written for — four calls at boot. Catastrophic for a caller that encrypts *per record*: a
 * hundred thousand records would be hours, and the operation would look like a hang.
 *
 * So a batch caller derives once with {@link deriveKey} and passes this to {@link encryptWithKey} for every
 * item. The envelope format has exactly ONE implementation either way — `encryptEnvelope` delegates here —
 * because two implementations of an at-rest format drift, and this one is a security boundary.
 */
export interface DerivedKey {
  key: Buffer;
  kdf: 'raw' | 'scrypt';
  /** Present iff `kdf === 'scrypt'`; the same salt is then recorded in every envelope made with this key. */
  salt?: Buffer;
}

/**
 * Derive the encryption key once. **This is the expensive call** for a passphrase secret — hoist it out of
 * any loop.
 */
export function deriveKey(secret: MasterSecret): DerivedKey {
  if (secret.kind === 'key') return { key: secret.key, kdf: 'raw' };
  const salt = crypto.randomBytes(16);
  return { key: scryptKey(secret.passphrase, salt), kdf: 'scrypt', salt };
}

/**
 * Derive for a salt that already exists — the DECRYPT side of {@link deriveKey}.
 *
 * {@link deriveKey} invents a random salt, which is right for writing and useless for reading. A batch reader
 * has the salt in front of it (every envelope records the one its file was written with) and needs the key that
 * matches it, derived **once**, not once per line.
 *
 * Without this the reader has no choice but {@link decryptEnvelope}, which derives from each envelope's own
 * salt on every call — correct, and one scrypt per record. That is the same trap {@link DerivedKey} exists to
 * avoid, and it is easy to reintroduce on the read side after fixing it on the write side.
 */
export function deriveKeyForSalt(secret: MasterSecret, salt: Buffer | null): DerivedKey {
  if (secret.kind === 'key') {
    if (salt) throw new Error('envelope has a scrypt salt but YTHRIL_MASTER_KEY is set, not a passphrase');
    return { key: secret.key, kdf: 'raw' };
  }
  if (!salt) throw new Error('envelope has no salt but YTHRIL_MASTER_PASSPHRASE is set, not a raw key');
  return { key: scryptKey(secret.passphrase, salt), kdf: 'scrypt', salt };
}

/**
 * Encrypt with an already-derived key. Cheap and safe to call in a loop: only the 12-byte IV is fresh per
 * call, which is what AES-GCM requires (a reused key with a reused IV is catastrophic; a reused key with a
 * fresh IV is the normal, correct construction).
 */
export function encryptWithKey(plaintext: string, dk: DerivedKey): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dk.key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const env: Envelope = {
    ythrilEnc: 1,
    alg: 'AES-256-GCM',
    kdf: dk.kdf,
    ...(dk.salt ? { salt: dk.salt.toString('base64') } : {}),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  };
  return JSON.stringify(env);
}

/**
 * Decrypt with an already-derived key, for the same batch case.
 *
 * Refuses an envelope whose salt does not match the derived key's rather than silently failing the auth tag:
 * "this envelope was made with a different salt" is an actionable message, and `.final()` throwing
 * `Unsupported state or unable to authenticate data` is not.
 */
export function decryptWithKey(raw: string, dk: DerivedKey): string {
  const env = JSON.parse(raw) as Envelope;
  if (env.ythrilEnc !== 1 || env.alg !== 'AES-256-GCM') throw new Error('unrecognised encryption envelope');
  if (env.kdf !== dk.kdf) {
    throw new Error(`envelope kdf is ${String(env.kdf)} but the derived key is ${dk.kdf}`);
  }
  if (dk.kdf === 'scrypt' && env.salt !== dk.salt?.toString('base64')) {
    throw new Error('envelope salt does not match the derived key — derive per salt, or decrypt with decryptEnvelope');
  }
  return decipherEnvelope(env, dk.key);
}

export function encryptEnvelope(plaintext: string, secret: MasterSecret): string {
  // Delegates, so there is one implementation of the envelope format. Derives per call, which is correct for
  // the four state-file callers and wrong in a loop — see DerivedKey.
  return encryptWithKey(plaintext, deriveKey(secret));
}

/** Decrypt an envelope string back to UTF-8. Throws on a wrong secret, missing secret kind, or tamper. */
export function decryptEnvelope(raw: string, secret: MasterSecret): string {
  const env = JSON.parse(raw) as Envelope;
  if (env.ythrilEnc !== 1 || env.alg !== 'AES-256-GCM') throw new Error('unrecognised encryption envelope');
  let key: Buffer;
  if (env.kdf === 'scrypt') {
    if (secret.kind !== 'passphrase') throw new Error('file is passphrase-encrypted but YTHRIL_MASTER_PASSPHRASE is not set');
    if (!env.salt) throw new Error('envelope missing salt');
    key = scryptKey(secret.passphrase, Buffer.from(env.salt, 'base64'));
  } else if (env.kdf === 'raw') {
    if (secret.kind !== 'key') throw new Error('file is key-encrypted but YTHRIL_MASTER_KEY is not set');
    key = secret.key;
  } else {
    throw new Error(`unsupported kdf: ${String((env as Envelope).kdf)}`);
  }
  return decipherEnvelope(env, key);
}

/** Generate a fresh 32-byte master key as base64 (for setup/CLI helpers). */
export function generateMasterKeyBase64(): string {
  return crypto.randomBytes(32).toString('base64');
}
