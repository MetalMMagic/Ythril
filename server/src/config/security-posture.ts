/**
 * Startup security-posture check (PR-S3).
 *
 * Aggregates the transport (S1) and at-rest (S2) security settings — plus MongoDB auth — into a single
 * PASS / WARN / FAIL report, logged at boot and served to admins at `GET /api/about/security`. It does
 * not enforce on its own (the individual `require*` flags do that); but with `security.strict` (or env
 * `YTHRIL_SECURITY_STRICT`) any FAIL aborts boot, so a misconfigured instance fails fast instead of
 * running in a falsely-secure state.
 */
import { getConfig, getMongoUri, atRestEncryptionActive } from './loader.js';
import { requireEncryptedTransport, allowInsecurePeersRaw } from './transport-security.js';
import { allowPrivateModelEndpoints } from './model-egress-policy.js';

export type PostureLevel = 'pass' | 'warn' | 'fail';

export interface PostureCheck {
  id: string;
  level: PostureLevel;
  message: string;
}

export interface SecurityPosture {
  checks: PostureCheck[];
  /** The most severe level across all checks (`pass` < `warn` < `fail`). */
  worst: PostureLevel;
}

/** Whether strict posture enforcement is on (env → config → default false). */
export function securityStrict(): boolean {
  if (process.env['YTHRIL_SECURITY_STRICT'] === 'true') return true;
  try { return getConfig().security?.strict === true; } catch { return false; }
}

/** True when Express `trust proxy` is configured (needed for `req.secure` behind a TLS-terminating proxy). */
function trustProxyConfigured(): boolean {
  if (process.env['TRUST_PROXY']) return true;
  try {
    const tp = getConfig().trustProxy;
    return tp !== undefined && tp !== false && tp !== 0 && tp !== '';
  } catch { return false; }
}

/** True when the Mongo connection carries credentials (URI userinfo or MONGO_USERNAME). */
function mongoAuthenticated(): boolean {
  if (process.env['MONGO_USERNAME']) return true;
  try {
    // Match a userinfo component: scheme://user[:pass]@host
    return /^[a-z]+(?:\+[a-z]+)?:\/\/[^/@]+@/i.test(getMongoUri());
  } catch { return false; }
}

const RANK: Record<PostureLevel, number> = { pass: 0, warn: 1, fail: 2 };

/** Compute the current security posture from config + environment. Pure (no I/O beyond reads). */
export function computeSecurityPosture(): SecurityPosture {
  const checks: PostureCheck[] = [];
  let cfg: ReturnType<typeof getConfig> | undefined;
  try { cfg = getConfig(); } catch { /* pre-setup — report what we can from env */ }

  const tlsOn = requireEncryptedTransport();

  // ── Transport ──────────────────────────────────────────────────────────────
  checks.push(tlsOn
    ? { id: 'transport.tls', level: 'pass', message: 'requireEncryptedTransport is on — plaintext requests are rejected.' }
    : { id: 'transport.tls', level: 'warn', message: 'requireEncryptedTransport is off — set it (behind a TLS-terminating proxy) to reject plaintext requests instance-wide.' });

  if (tlsOn && !trustProxyConfigured()) {
    checks.push({ id: 'transport.trustProxy', level: 'fail', message: 'requireEncryptedTransport is on but trustProxy is not set — behind a proxy every request will look plaintext and be rejected (403). Set trustProxy to your proxy hop count.' });
  }

  checks.push(allowInsecurePeersRaw()
    ? { id: 'transport.peers', level: 'warn', message: 'allowInsecurePeers is on — sync may use plaintext http:// peers.' }
    : { id: 'transport.peers', level: 'pass', message: 'Sync peers must use HTTPS.' });

  if (cfg?.allowInsecurePlaintext) {
    checks.push({ id: 'transport.plaintext', level: 'warn', message: 'allowInsecurePlaintext is on — the plaintext-exposure guard is disabled.' });
  }

  // Widening where model/media egress may point is a deliberate operator decision, so it is reported
  // rather than silent — but it is NOT a `fail`: the guard itself stays on (DNS-pinning, redirect
  // re-validation, crown-jewel ranges still blocked), only private addresses become reachable.
  if (allowPrivateModelEndpoints()) {
    checks.push({
      id: 'egress.privateModelEndpoints',
      level: 'warn',
      message: 'allowPrivateModelEndpoints is on — external model/media endpoints may resolve to private addresses (self-hosted inference). SSRF guarding, IP-pinning and redirect re-validation still apply; loopback and link-local/IMDS stay blocked.',
    });
  }

  // ── At rest ──────────────────────────────────────────────────────────────────
  const atRest = atRestEncryptionActive();
  checks.push(atRest
    ? { id: 'atRest.encryption', level: 'pass', message: 'State files are encrypted at rest (master secret configured).' }
    : { id: 'atRest.encryption', level: 'warn', message: 'State files are NOT encrypted at rest — set YTHRIL_MASTER_KEY or YTHRIL_MASTER_PASSPHRASE.' });

  const wantAtRest = process.env['YTHRIL_REQUIRE_ENCRYPTED_AT_REST'] === 'true' || cfg?.requireEncryptedAtRest === true;
  if (wantAtRest && !atRest) {
    checks.push({ id: 'atRest.strict', level: 'fail', message: 'requireEncryptedAtRest is set but no master secret is configured.' });
  }

  // ── MongoDB ──────────────────────────────────────────────────────────────────
  checks.push(mongoAuthenticated()
    ? { id: 'mongo.auth', level: 'pass', message: 'MongoDB connection is authenticated.' }
    : { id: 'mongo.auth', level: 'warn', message: 'MongoDB connection has no credentials — enable auth on the database. On shared hardware, run a dedicated mongod per tenant on its own encrypted volume (do not share a mongod across tenants).' });

  const worst = checks.reduce<PostureLevel>((w, c) => (RANK[c.level] > RANK[w] ? c.level : w), 'pass');
  return { checks, worst };
}

/** Format the posture as human-readable lines for the boot log. */
export function formatPostureLines(posture: SecurityPosture): string[] {
  const glyph: Record<PostureLevel, string> = { pass: '✓', warn: '⚠', fail: '✗' };
  return posture.checks.map(c => `  ${glyph[c.level]} [${c.id}] ${c.message}`);
}
