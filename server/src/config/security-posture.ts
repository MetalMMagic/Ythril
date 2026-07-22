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
import { allowPrivateOidcIssuer } from './oidc-egress-policy.js';
import { modelEndpointExposure, formatExposure, classifyEndpoint } from './model-egress-exposure.js';

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
  //
  // Report the EXPOSURE, not the flag. "allowPrivateModelEndpoints is on" tells an operator what they
  // set; "vision → 10.43.12.7 (private)" tells them what it actually reaches, which is the thing that
  // makes this check load-bearing. A hostname is named as a hostname — only the resolution-time guard
  // knows where it points, and claiming otherwise here would be a guess.
  if (allowPrivateModelEndpoints()) {
    const exposure = modelEndpointExposure();
    const privateOnes = exposure.filter(e => e.klass === 'private');
    checks.push(exposure.length === 0
      ? {
          id: 'egress.privateModelEndpoints',
          level: 'warn',
          message: 'allowPrivateModelEndpoints is on but no external model/media endpoint is configured — nothing is using the permission.',
        }
      : {
          id: 'egress.privateModelEndpoints',
          level: 'warn',
          message: `allowPrivateModelEndpoints is on — ${privateOnes.length} of ${exposure.length} external endpoint(s) resolve to private addresses. ${formatExposure(exposure)}. SSRF guarding, IP-pinning and redirect re-validation still apply; loopback, link-local/IMDS and cloud-metadata addresses stay blocked.`,
        });
  } else {
    // Flag off, but an endpoint may still be pointed at a private literal — that config cannot work, and
    // silently failing at inference is exactly what the reporter hit. Say so.
    const stuck = modelEndpointExposure().filter(e => e.klass === 'private' || e.klass === 'invalid');
    if (stuck.length > 0) {
      checks.push({
        id: 'egress.privateModelEndpoints',
        level: 'warn',
        message: `External model endpoint(s) point at addresses this instance will refuse to call: ${formatExposure(stuck)}. Set allowPrivateModelEndpoints (or YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS=true) for a self-hosted endpoint on a private address; cloud-metadata addresses stay blocked regardless.`,
      });
    }
  }

  // ── OIDC issuer egress ───────────────────────────────────────────────────────
  // The one check here that can be a FAIL rather than a WARN, and deliberately so: an enabled OIDC
  // config whose issuer sits on a private address with the opt-in absent means NOBODY CAN SIGN IN.
  // Discovering that from a login page that says "authentication failed" is the bad version of this
  // change; discovering it from a named line at boot (and, under security.strict, from a refusal to
  // start at all) is the good one.
  if (cfg?.oidc?.enabled && cfg.oidc.issuerUrl) {
    const { host, klass } = classifyEndpoint(cfg.oidc.issuerUrl);
    const allowPrivate = allowPrivateOidcIssuer();
    if (klass === 'invalid') {
      checks.push({ id: 'oidc.issuer', level: 'fail', message: `oidc.enabled is on but issuerUrl (${host}) is unusable — unparseable, or a loopback / link-local / cloud-metadata address that is blocked regardless of oidc.allowPrivateIssuer. No one can sign in.` });
    } else if (klass === 'private' && !allowPrivate) {
      checks.push({ id: 'oidc.issuer', level: 'fail', message: `oidc.enabled is on and issuerUrl (${host}) is a private address, but oidc.allowPrivateIssuer is not set — discovery will be refused and no one can sign in. Set oidc.allowPrivateIssuer: true (or YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER=true) for an internal IdP.` });
    } else if (allowPrivate) {
      // Report the exposure, not the flag — same rule as the model endpoints above. A hostname is
      // named as a hostname: only the resolution-time guard knows where it points.
      checks.push(klass === 'private'
        ? { id: 'oidc.issuer', level: 'warn', message: `oidc.allowPrivateIssuer is on — issuer ${host} is a private address. SSRF guarding, IP-pinning and redirect re-validation still apply; loopback, link-local/IMDS and cloud-metadata addresses stay blocked, and a public issuer could not name a private jwks_uri.` }
        : { id: 'oidc.issuer', level: 'warn', message: `oidc.allowPrivateIssuer is on but issuer ${host} is not a private address (${klass}) — nothing is using the permission; unset it.` });
    }
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
