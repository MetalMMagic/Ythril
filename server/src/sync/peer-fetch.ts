/**
 * SSRF-safe outbound fetch + URL validation for the sync engine.
 *
 * Sync connects to peer-supplied URLs. Peer URLs are validated at admission, but
 * a peer can rewrite its own stored URL post-admission (gossip / self-update), so
 * every outbound sync connection must be validated **at connection time** — DNS
 * resolved, the socket pinned to the validated IP, and each redirect re-checked.
 * `peerSafeFetch` is a drop-in for `fetch` that does exactly that (via
 * `ssrfSafeFetch`), and `isPeerUrlAllowed` is the synchronous check used before
 * persisting a peer-supplied URL.
 *
 * Policy: crown-jewel addresses (loopback, link-local/IMDS, unspecified) are
 * always blocked. Other private ranges are blocked unless `allowPrivatePeers` is
 * enabled (config key or the SYNC_ALLOW_PRIVATE_PEERS env var), for same-host /
 * LAN deployments — including the test harness, whose peers are on the Docker
 * bridge network.
 */

import { ssrfSafeFetch, isPeerUrlSafe } from '../util/ssrf.js';
import { getConfig } from '../config/loader.js';

/** Whether sync peers may use private/reserved (non-crown-jewel) addresses. */
export function allowPrivatePeers(): boolean {
  if (process.env['SYNC_ALLOW_PRIVATE_PEERS'] === 'true') return true;
  try { return getConfig().allowPrivatePeers === true; } catch { return false; }
}

/** True if a peer-supplied URL may be stored/connected to under the current policy. */
export function isPeerUrlAllowed(url: string): boolean {
  return isPeerUrlSafe(url, allowPrivatePeers());
}

/**
 * SSRF-safe drop-in for `fetch()` used by the sync engine. Resolves + pins + and
 * re-validates redirects against the peer policy. Throws `SsrfBlockedError` when
 * the target (or a redirect hop) resolves to a blocked address.
 */
export function peerSafeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  return ssrfSafeFetch(rawUrl, init, { allowPrivate: allowPrivatePeers() });
}
