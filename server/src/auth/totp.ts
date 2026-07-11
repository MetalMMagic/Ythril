/**
 * TOTP helpers — wraps otplib for MFA on admin routes.
 *
 * The TOTP secret is stored as a base32 string in secrets.json under
 * `totpSecret`.  When that field is absent MFA is considered disabled and
 * all `requireAdminMfa`-gated routes behave like `requireAdmin`.
 *
 * Standard TOTP parameters (RFC 6238):
 *   - algorithm  : SHA-1 (broadest authenticator compatibility)
 *   - step        : 30 s
 *   - digits      : 6
 *   - window      : ±1 step (clock skew tolerance)
 */

import crypto from 'node:crypto';
import { generateSecret, generateURI } from 'otplib';
import { getSecrets, saveSecrets } from '../config/loader.js';

// ── RFC 4648 base32 decode ────────────────────────────────────────────────

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (const c of cleaned) {
    const val = BASE32.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return Buffer.from(bytes);
}

// ── RFC 6238 TOTP computation ─────────────────────────────────────────────

function computeTotp(secret: string, epoch: number, step = 30, digits = 6): string {
  const counter = BigInt(Math.floor(epoch / step));
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (
    ((hmac[offset]! & 0x7f) << 24) |
    (hmac[offset + 1]! << 16) |
    (hmac[offset + 2]! << 8) |
    hmac[offset + 3]!
  ) % (10 ** digits);
  return code.toString().padStart(digits, '0');
}

/** True when a TOTP secret is stored in secrets.json */
export function isMfaEnabled(): boolean {
  return !!getSecrets().totpSecret;
}

/**
 * Generate a new TOTP secret, persist it, and return:
 *   - `secret`  — base32 string (show to user for manual entry)
 *   - `otpauth` — otpauth:// URI for QR-code generation
 */
export function enableMfa(issuer: string, label: string): { secret: string; otpauth: string } {
  const secret = generateSecret(); // 160-bit (20-byte) base32 secret
  const otpauth = generateURI({ issuer, label, secret });
  const secrets = getSecrets();
  secrets.totpSecret = secret;
  // A fresh secret has no consumed steps — clear any counter from a prior enrolment.
  delete secrets.totpLastStep;
  saveSecrets(secrets);
  return { secret, otpauth };
}

/** Remove the TOTP secret, disabling MFA */
export function disableMfa(): void {
  const secrets = getSecrets();
  delete secrets.totpSecret;
  delete secrets.totpLastStep;
  saveSecrets(secrets);
}

const TOTP_STEP_SECONDS = 30;

/**
 * Verify a 6-digit TOTP code against the stored secret.
 * Returns false if MFA is not enabled or the code is wrong.
 *
 * Checks the current step ±1 (30 s window) using crypto.timingSafeEqual to
 * prevent timing side-channel attacks, then enforces **single use**: the
 * matched step must be strictly greater than the highest step already consumed
 * (`secrets.totpLastStep`). Without this, a code captured in transit — from a
 * proxy log, a shoulder-surf, or a phished operator — stays replayable for the
 * remainder of its up-to-90 s validity window, which is exactly the window an
 * attacker with a stolen admin PAT needs to disable MFA.
 */
export function verifyMfaCode(code: string): boolean {
  const secrets = getSecrets();
  const { totpSecret } = secrets;
  if (!totpSecret) return false;

  const normalizedCode = Buffer.from(code.padStart(6, '0').slice(0, 6));
  const now = Math.floor(Date.now() / 1000);

  // Always iterate all windows to prevent timing leakage of which window matched.
  // `matchedStep` records WHICH step matched so it can be burned below.
  let matched = 0;
  let matchedStep = -1;
  for (const offset of [-TOTP_STEP_SECONDS, 0, TOTP_STEP_SECONDS]) {
    const epoch = now + offset;
    const expected = Buffer.from(computeTotp(totpSecret, epoch));
    const isMatch = crypto.timingSafeEqual(normalizedCode, expected);
    matched |= isMatch ? 1 : 0;
    if (isMatch) matchedStep = Math.floor(epoch / TOTP_STEP_SECONDS);
  }
  if (matched !== 1 || matchedStep < 0) return false;

  // Replay guard: refuse a step at or below the last consumed one.
  const lastStep = secrets.totpLastStep ?? -1;
  if (matchedStep <= lastStep) return false;

  secrets.totpLastStep = matchedStep;
  saveSecrets(secrets);
  return true;
}
