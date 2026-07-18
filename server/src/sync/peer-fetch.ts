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
import { log } from '../util/log.js';
import { requireEncryptedTransport, allowInsecurePeersRaw, isPeerSchemeAllowed } from '../config/transport-security.js';

/** Whether sync peers may use private/reserved (non-crown-jewel) addresses. */
export function allowPrivatePeers(): boolean {
  if (process.env['SYNC_ALLOW_PRIVATE_PEERS'] === 'true') return true;
  try { return getConfig().allowPrivatePeers === true; } catch { return false; }
}

/** True if a peer-supplied URL may be stored/connected to under the current policy (address + scheme). */
export function isPeerUrlAllowed(url: string): boolean {
  return isPeerSchemeAllowed(url) && isPeerUrlSafe(url, allowPrivatePeers());
}

// Warn at most once per plaintext peer host, so a pre-existing `http://` peer (added before the
// https-default, without opting in) nags rather than spams every sync cycle.
const _warnedPlaintextHosts = new Set<string>();

/**
 * SSRF-safe drop-in for `fetch()` used by the sync engine. Resolves + pins + re-validates redirects
 * against the peer policy. Also enforces the transport policy: in `requireEncryptedTransport` mode a
 * plaintext `http://` peer is refused outright; otherwise a plaintext peer that wasn't explicitly
 * opted into is allowed (back-compat for peers added before the https default) but warned once.
 * Throws `SsrfBlockedError` when the target (or a redirect hop) resolves to a blocked address.
 */
export function peerSafeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let scheme = '';
  let host = rawUrl;
  try { const u = new URL(rawUrl); scheme = u.protocol; host = u.host; } catch { /* ssrfSafeFetch will reject */ }
  if (scheme === 'http:') {
    if (requireEncryptedTransport()) {
      return Promise.reject(new Error(`Refusing plaintext sync to ${host}: requireEncryptedTransport is enabled`));
    }
    if (!allowInsecurePeersRaw() && !_warnedPlaintextHosts.has(host)) {
      _warnedPlaintextHosts.add(host);
      log.warn(`Syncing to plaintext peer ${host} over http:// — data and tokens are unencrypted in transit. Use https:// or set allowInsecurePeers to acknowledge.`);
    }
  }
  return ssrfSafeFetch(rawUrl, init, { allowPrivate: allowPrivatePeers() });
}
