/**
 * OIDC JWT validation support for Ythril.
 *
 * When `oidc.enabled` is set in config.json this module:
 *  1. Fetches the IdP's OpenID Connect discovery document once (cached).
 *  2. Validates incoming JWTs using the JWKS endpoint (signature, iss, aud, exp).
 *  3. Maps IdP claims to a synthetic TokenRecord-like permission object so the
 *     rest of the middleware layer needs no changes.
 *
 * PAT tokens (prefix `ythril_`) are handled by the existing tokens.ts path and
 * are never routed through this module.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import type { OidcConfig, OidcClaimRule, OidcClaimMapping } from '../config/types.js';

/**
 * JWS algorithms accepted for OIDC ID tokens unless `oidc.allowedAlgorithms`
 * narrows them. Asymmetric only: an IdP signs with its private key and publishes
 * the public half via JWKS.
 *
 * Note on the threat model: jose's JWKS resolver already refuses symmetric keys
 * ("Unsupported alg value for a JSON Web Key Set"), so the classic HS/RS
 * confusion attack was NOT reachable here even without this option. What pinning
 * buys is (a) the accepted set becomes explicit policy rather than a side effect
 * of the resolver's behaviour — it cannot silently widen if that behaviour
 * changes — and (b) operators can narrow it to exactly what their IdP signs with
 * (`allowedAlgorithms: ["RS256"]`), so an alg the IdP never uses is rejected
 * outright.
 */
export const DEFAULT_OIDC_ALGORITHMS = [
  'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512',
  'ES256', 'ES384', 'ES512',
  'EdDSA',
];

// ── OIDC URL validation ───────────────────────────────────────────────────
// Unlike the full isSsrfSafeUrl check (designed for user-supplied peer URLs),
// this allows private IPs and loopback because internal IdPs (e.g. Keycloak on
// a corporate network) are a legitimate and common deployment pattern.  It
// blocks cloud instance metadata endpoints — the primary SSRF exfiltration
// target — and basic URL shape issues.

function validateOidcUrl(raw: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`OIDC ${label} is not a valid URL: ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`OIDC ${label} must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`OIDC ${label} must not contain embedded credentials`);
  }
  const host = parsed.hostname.toLowerCase();
  if (/^169\.254\./.test(host) || host === 'metadata.google.internal') {
    throw new Error(`OIDC ${label} must not target cloud metadata endpoints`);
  }
  if (host === '0.0.0.0') {
    throw new Error(`OIDC ${label} must not target 0.0.0.0`);
  }
}

// ── Lightweight synthetic token record ────────────────────────────────────
// This mirrors the fields of TokenRecord (minus hash/prefix/bcrypt fields)
// that the auth middleware reads from req.authToken.

export interface OidcTokenRecord {
  id: string;          // derived from JWT sub
  name: string;        // derived from JWT preferred_username or email or sub
  createdAt: string;   // JWT iat (or 'oidc')
  lastUsed: null;
  expiresAt: string | null;  // JWT exp
  admin: boolean;
  readOnly?: boolean;
  spaces?: string[];
  // Distinguish from PAT records for logging / introspection
  source: 'oidc';
}

// ── JWKS cache ─────────────────────────────────────────────────────────────
// createRemoteJWKSet() returns a live, self-refreshing handle.  One instance
// per issuer URL is sufficient; recreate if the issuer URL changes.

type JwksHandle = ReturnType<typeof createRemoteJWKSet>;

let _jwksHandle: JwksHandle | null = null;
let _cachedIssuerUrl = '';

/**
 * Ceiling for every outbound call this module makes to the IdP (discovery + JWKS).
 *
 * This sits on the AUTHENTICATION path: an IdP that accepts the TCP connection and then never
 * answers would otherwise hold the request until the OS socket timeout — minutes — and because the
 * discovery document is cached with a TTL, the stall recurs rather than happening once. Ten seconds
 * is well beyond any healthy IdP's response time and well below anything a user would wait out.
 */
export const OIDC_HTTP_TIMEOUT_MS = 10_000;

function getJwksHandle(jwksUri: string, issuerUrl: string): JwksHandle {
  if (_jwksHandle && _cachedIssuerUrl === issuerUrl) return _jwksHandle;
  // jose defaults to 5s; pin it so the budget is explicit policy rather than a library default that
  // could change under us — the same reasoning as DEFAULT_OIDC_ALGORITHMS above.
  _jwksHandle = createRemoteJWKSet(new URL(jwksUri), { timeoutDuration: OIDC_HTTP_TIMEOUT_MS });
  _cachedIssuerUrl = issuerUrl;
  return _jwksHandle;
}

// ── Discovery document cache ───────────────────────────────────────────────

interface DiscoveryDoc {
  issuer: string;
  jwks_uri: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

let _discoveryDoc: DiscoveryDoc | null = null;
let _discoveryIssuerUrl = '';
let _discoveryFetchedAt = 0;
const DISCOVERY_TTL_MS = 5 * 60 * 1000; // re-fetch every 5 minutes

export async function getDiscoveryDoc(issuerUrl: string): Promise<DiscoveryDoc> {
  const now = Date.now();
  if (
    _discoveryDoc &&
    _discoveryIssuerUrl === issuerUrl &&
    now - _discoveryFetchedAt < DISCOVERY_TTL_MS
  ) {
    return _discoveryDoc;
  }

  validateOidcUrl(issuerUrl, 'issuerUrl');
  const url = issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(OIDC_HTTP_TIMEOUT_MS) });
  } catch (err) {
    // An unreachable IdP and one that hangs are the same failure to the caller, and both must be
    // reported as such rather than surfacing an opaque AbortError from deep in the auth path.
    const reason = err instanceof Error && err.name === 'TimeoutError'
      ? `no response within ${OIDC_HTTP_TIMEOUT_MS}ms`
      : err instanceof Error ? err.message : String(err);
    throw new Error(`OIDC discovery failed: ${reason} for ${url}`);
  }
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText} for ${url}`);
  }
  const doc = await res.json() as DiscoveryDoc;

  // OIDC Discovery §4.3: issuer in the document MUST match the configured URL.
  const normCfg = issuerUrl.replace(/\/$/, '');
  const normDoc = doc.issuer.replace(/\/$/, '');
  if (normDoc !== normCfg) {
    throw new Error(
      `OIDC discovery issuer (${doc.issuer}) does not match configured issuerUrl (${issuerUrl})`,
    );
  }

  // Validate derived URLs before the server fetches them (defence-in-depth).
  validateOidcUrl(doc.jwks_uri, 'jwks_uri');

  _discoveryDoc = doc;
  _discoveryIssuerUrl = issuerUrl;
  _discoveryFetchedAt = now;
  return doc;
}

/** Invalidate all in-memory OIDC caches (call on config reload). */
export function clearOidcCache(): void {
  _jwksHandle = null;
  _cachedIssuerUrl = '';
  _discoveryDoc = null;
  _discoveryIssuerUrl = '';
  _discoveryFetchedAt = 0;
}

// ── Claim resolution ───────────────────────────────────────────────────────

/**
 * Resolve a dot-notated path (e.g. "realm_access.roles") in a JWT payload.
 * Returns the value at that path, or undefined if the path does not exist.
 */
function resolveClaim(payload: JWTPayload, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = payload;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Evaluate a single OidcClaimRule against a JWT payload.
 * Returns true when the rule matches.
 */
function evaluateClaimRule(payload: JWTPayload, rule: OidcClaimRule): boolean {
  const val = resolveClaim(payload, rule.claim);
  if (val === undefined || val === null) return false;

  if (rule.value !== undefined) {
    // The claim must equal `value` OR be an array containing `value`
    if (Array.isArray(val)) return val.includes(rule.value);
    return val === rule.value;
  }

  // No `value` constraint: the claim simply needs to be truthy
  if (Array.isArray(val)) return val.length > 0;
  return Boolean(val);
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Returns the active OidcConfig, or null if OIDC is disabled / unconfigured. */
export function getOidcConfig(): OidcConfig | null {
  const cfg = getConfig();
  if (!cfg.oidc || !cfg.oidc.enabled) return null;
  return cfg.oidc;
}

export interface OidcPermissions {
  admin: boolean;
  readOnly: boolean | undefined;
  spaces: string[] | undefined;
  /** True when the token matched the admin or readOnly claim rule. */
  matched: boolean;
}

/**
 * Map OIDC JWT claims to Ythril permissions — **fail closed**.
 *
 * A token that matches NEITHER the admin nor the readOnly rule receives
 * read-only access to NO spaces. Previously such a token was granted
 * `readOnly: undefined` (i.e. read-write) and `spaces: undefined` (i.e. ALL
 * spaces), so any principal able to obtain an audience-matching JWT from a
 * shared realm got full read-write access to every space. Access must now be
 * granted explicitly via claim rules.
 *
 * When a `spaces` mapping is configured but the claim is missing or not an
 * array, the allow-list is empty (deny) rather than undefined (all spaces).
 */
export function mapOidcClaims(payload: JWTPayload, mapping: OidcClaimMapping): OidcPermissions {
  const admin = mapping.admin ? evaluateClaimRule(payload, mapping.admin) : false;
  const readOnlyMatched = mapping.readOnly ? evaluateClaimRule(payload, mapping.readOnly) : false;
  const matched = admin || readOnlyMatched;

  let spaces: string[] | undefined;
  if (mapping.spaces) {
    const raw = resolveClaim(payload, mapping.spaces.claim);
    spaces = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  }

  if (!matched) {
    return { admin: false, readOnly: true, spaces: [], matched: false };
  }

  return {
    admin,
    readOnly: readOnlyMatched ? true : undefined,
    spaces,
    matched: true,
  };
}

/**
 * Validate a JWT bearer token against the configured OIDC provider.
 *
 * Returns a synthetic OidcTokenRecord on success, or null on failure.
 * Never throws — all errors are caught and logged.
 */
export async function validateOidcJwt(bearer: string): Promise<OidcTokenRecord | null> {
  const oidcCfg = getOidcConfig();
  if (!oidcCfg) return null;

  try {
    const discovery = await getDiscoveryDoc(oidcCfg.issuerUrl);
    const jwks = getJwksHandle(discovery.jwks_uri, oidcCfg.issuerUrl);

    const audience = oidcCfg.audience ?? oidcCfg.clientId;

    // Pin the accepted signature algorithms (see DEFAULT_OIDC_ALGORITHMS).
    const { payload } = await jwtVerify(bearer, jwks, {
      issuer: discovery.issuer,
      audience,
      algorithms: oidcCfg.allowedAlgorithms ?? DEFAULT_OIDC_ALGORITHMS,
    });

    // ── Map claims → permissions (fail-closed) ────────────────────────────
    const mapping = oidcCfg.claimMapping ?? {};
    const perms = mapOidcClaims(payload, mapping);

    // ── requireMatch guard ────────────────────────────────────────────────
    // When requireMatch is true, reject any token that matches neither the
    // admin nor the readOnly rule.  This prevents KC-authenticated users
    // who hold a valid audience-matched token (e.g. via SSO from a shared
    // realm) from accessing the instance without an explicit role assignment.
    if (mapping.requireMatch && !perms.matched) {
      log.warn('OIDC JWT rejected: requireMatch is enabled and no claim rule matched');
      return null;
    }

    // ── Derive display name ────────────────────────────────────────────────
    const sub = payload.sub ?? 'unknown';
    const preferredUsername =
      (payload as Record<string, unknown>)['preferred_username'] as string | undefined;
    const email = (payload as Record<string, unknown>)['email'] as string | undefined;
    const name = preferredUsername ?? email ?? sub;

    const expiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
    const createdAt = payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString();

    return {
      id: `oidc:${sub}`,
      name,
      createdAt,
      lastUsed: null,
      expiresAt,
      admin: perms.admin,
      readOnly: perms.readOnly,
      spaces: perms.spaces,
      source: 'oidc',
    };
  } catch (err) {
    log.warn(`OIDC JWT validation failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
