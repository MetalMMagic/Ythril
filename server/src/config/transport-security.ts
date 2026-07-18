/**
 * Transport-security policy (PR-S1) — cross-cutting flags read by the app (request TLS gate),
 * the API (peer-URL admission), and the sync engine (outbound peer fetch).
 *
 * Two independent knobs, both secure-by-default:
 *  - `allowInsecurePeers` — permit `http://` sync peers. Default OFF: peer URLs must be `https://`,
 *    regardless of address. "Same host" is NOT a trust boundary (on shared hardware a co-tenant on
 *    loopback is still untrusted), so this is deliberately separate from `allowPrivatePeers` (which
 *    governs address ranges, not encryption).
 *  - `requireEncryptedTransport` — instance-wide "encrypted only": every inbound request must be TLS
 *    and every peer must be `https://`, overriding `allowInsecurePeers`.
 *
 * Each flag: env override → config key → safe default (mirrors the `allowPrivatePeers`/`trustProxy`
 * precedence). The pure `peerSchemeAllowed` takes explicit flags so it is unit-testable without config.
 */
import { getConfig } from './loader.js';

/** Instance-wide "encrypted transport only" mode (env `REQUIRE_ENCRYPTED_TRANSPORT` → config → false). */
export function requireEncryptedTransport(): boolean {
  if (process.env['REQUIRE_ENCRYPTED_TRANSPORT'] === 'true') return true;
  try { return getConfig().requireEncryptedTransport === true; } catch { return false; }
}

/** Raw opt-out: whether `http://` peers are permitted (env `SYNC_ALLOW_INSECURE_PEERS` → config → false).
 *  Does NOT account for `requireEncryptedTransport` — use {@link insecurePeersAllowed} for the effective policy. */
export function allowInsecurePeersRaw(): boolean {
  if (process.env['SYNC_ALLOW_INSECURE_PEERS'] === 'true') return true;
  try { return getConfig().allowInsecurePeers === true; } catch { return false; }
}

/** Effective policy: `http://` peers allowed only when opted in AND encrypted-transport mode is off. */
export function insecurePeersAllowed(): boolean {
  return !requireEncryptedTransport() && allowInsecurePeersRaw();
}

/**
 * Pure peer-URL scheme gate (no config reads — unit-testable). `https://` is always allowed;
 * `http://` only when `allowInsecure` is set and `requireEncrypted` is not; any other scheme is rejected.
 */
export function peerSchemeAllowed(rawUrl: string, opts: { allowInsecure: boolean; requireEncrypted: boolean }): boolean {
  let scheme: string;
  try { scheme = new URL(rawUrl).protocol; } catch { return false; }
  if (scheme === 'https:') return true;
  if (scheme !== 'http:') return false;
  return opts.allowInsecure && !opts.requireEncrypted;
}

/** Config-aware scheme gate used at peer-URL admission. */
export function isPeerSchemeAllowed(rawUrl: string): boolean {
  return peerSchemeAllowed(rawUrl, { allowInsecure: allowInsecurePeersRaw(), requireEncrypted: requireEncryptedTransport() });
}

/** Human-readable reason a peer URL scheme was rejected (for zod messages / API errors). */
export const PEER_SCHEME_MESSAGE =
  'Peer URLs must use HTTPS. Set `allowInsecurePeers` (or SYNC_ALLOW_INSECURE_PEERS) to permit `http://` peers on a network where every peer AND co-tenant is trusted — note that "same host" alone is not such a boundary.';
