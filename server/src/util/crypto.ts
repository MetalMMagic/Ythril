/**
 * AES-256-GCM encryption/decryption for secrets at rest.
 *
 * Used to encrypt webhook shared secrets before storing them in MongoDB.
 * The encryption key is auto-generated on first use and persisted in
 * secrets.json alongside other server-level secrets (TOTP key, peer tokens).
 */

import crypto from 'node:crypto';
import { getSecrets, saveSecrets } from '../config/loader.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag

/** Separator between IV, tag, and ciphertext in the stored string. */
const SEP = ':';

/**
 * Get or create the 256-bit encryption key from secrets.json.
 * Generated once on first use and persisted — survives restarts.
 */
function getEncryptionKey(): Buffer {
  const secrets = getSecrets();
  if (secrets.webhookEncryptionKey) {
    return Buffer.from(secrets.webhookEncryptionKey, 'hex');
  }

  // First-time: generate and persist
  const key = crypto.randomBytes(32);
  secrets.webhookEncryptionKey = key.toString('hex');
  saveSecrets(secrets);
  return key;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a string in the format: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}${SEP}${tag.toString('hex')}${SEP}${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string previously encrypted with `encryptSecret`.
 * Throws if the auth tag doesn't match (tampered or wrong key).
 */
export function decryptSecret(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(SEP);
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');

  const iv = Buffer.from(parts[0]!, 'hex');
  const tag = Buffer.from(parts[1]!, 'hex');
  const ciphertext = Buffer.from(parts[2]!, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Check whether a string looks like an encrypted secret (hex:hex:hex format).
 * Used during migration to detect already-encrypted vs plaintext secrets.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(SEP);
  if (parts.length !== 3) return false;
  return /^[0-9a-f]{24}$/.test(parts[0]!) && /^[0-9a-f]{32}$/.test(parts[1]!);
}
