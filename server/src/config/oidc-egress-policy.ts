/**
 * OIDC issuer egress policy — where the IdP is allowed to live.
 *
 * The server makes two outbound calls on the authentication path: the discovery document at
 * `<issuer>/.well-known/openid-configuration`, and the JWKS at whatever `jwks_uri` that document
 * names. Both are SSRF-relevant, and the second one is a URL the server was *told* to fetch.
 *
 * Default is public-only. But an internal IdP on a private address is a normal, supported
 * deployment — Keycloak on `http://keycloak.internal:8080`, Authentik on a cluster service, Dex on
 * `10.x` — so the default cannot tighten without an opt-in shipping in the same release, or every
 * such instance loses login on upgrade.
 *
 * `oidc.allowPrivateIssuer` is that opt-in, and it is deliberately NOT "turn the guard off":
 * `ssrfSafeFetch` still DNS-resolves, pins the resolved IP for the connection and re-validates every
 * redirect — only the private-address rejection relaxes. Crown-jewel addresses (loopback,
 * link-local / cloud IMDS, unspecified) stay blocked either way, including when a hostname
 * *resolves* to one. Exactly the contract `allowPrivateModelEndpoints` already ships.
 *
 * Env override → config key → safe default. Read here rather than passed through any API: OIDC
 * config is not settable over HTTP at all today, and a setting that widens egress must never become
 * the first thing that is.
 */
import { getConfig } from './loader.js';

/**
 * True when the OIDC issuer (and the endpoints its discovery document names) may resolve to
 * private/reserved addresses — env `YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER` → config
 * `oidc.allowPrivateIssuer` → false.
 */
export function allowPrivateOidcIssuer(): boolean {
  if (process.env['YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER'] === 'true') return true;
  try {
    return getConfig().oidc?.allowPrivateIssuer === true;
  } catch {
    return false; // config not loaded yet (first run) — stay closed
  }
}
