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

/** Encrypt a UTF-8 string into a JSON envelope string. */
export function encryptEnvelope(plaintext: string, secret: MasterSecret): string {
  let key: Buffer;
  let kdf: 'raw' | 'scrypt';
  let salt: Buffer | undefined;
  if (secret.kind === 'key') {
    key = secret.key; kdf = 'raw';
  } else {
    salt = crypto.randomBytes(16); key = scryptKey(secret.passphrase, salt); kdf = 'scrypt';
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const env: Envelope = {
    ythrilEnc: 1,
    alg: 'AES-256-GCM',
    kdf,
    ...(salt ? { salt: salt.toString('base64') } : {}),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  };
  return JSON.stringify(env);
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
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(env.tag, 'base64'));
  // .final() throws if the auth tag doesn't verify (wrong key or tampered ciphertext).
  const pt = Buffer.concat([decipher.update(Buffer.from(env.ct, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

/** Generate a fresh 32-byte master key as base64 (for setup/CLI helpers). */
export function generateMasterKeyBase64(): string {
  return crypto.randomBytes(32).toString('base64');
}
