/**
 * Local-agent URL validation — isolated here (dependency-free) so the security-critical loopback
 * check is unit-testable without pulling in the whole router/auth/rate-limit graph.
 *
 * The local agent (Cloudflare-tunnel connector) is reached over a bearer-authenticated HTTP call.
 * Unless `YTHRIL_LOCAL_AGENT_ALLOW_REMOTE=true` is set, the target host MUST be a numeric loopback
 * address so the token can never be sent off-box by a misconfigured or tampered URL.
 */

/** The default target when `YTHRIL_LOCAL_AGENT_URL` is unset/empty. Numeric loopback on purpose. */
export const LOCAL_AGENT_DEFAULT_URL = 'http://127.0.0.1:38123';

/**
 * True only for numeric loopback addresses. `localhost` is intentionally EXCLUDED because it is
 * resolved via DNS/hosts and could be remapped to a non-loopback address on a compromised system —
 * do not "fix" a config mismatch by adding it here; align the config to `127.0.0.1` instead.
 */
export function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === '127.0.0.1' || h === '::1';
}
