/**
 * The host's own non-loopback IPv4 — a PRIVATE address the SSRF guards permit under an opt-in.
 *
 * Why tests need this: since the OIDC issuer guard (SSRF part 2b), loopback is a crown-jewel address
 * that stays blocked even with `oidc.allowPrivateIssuer` on. Any test that stands up a mock IdP and
 * expects the server to actually fetch it therefore cannot bind to `127.0.0.1` — the request is
 * refused before a socket opens, and the test proves nothing about the behaviour it names.
 *
 * Binding to the machine's LAN address instead keeps the mock reachable and, as a side effect, makes
 * those tests a live proof that the private-issuer opt-in works — which is the half of that change
 * that turns into an upgrade outage if it ever breaks.
 *
 * Returns null on a host with no non-loopback IPv4 (rare; callers should skip with a clear reason).
 */
import os from 'node:os';

export function privateHostAddress() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return null;
}

/** Skip reason for a suite that needs a reachable non-loopback address, or false when one exists. */
export function privateAddressSkipReason() {
  return privateHostAddress() ? false : 'no non-loopback IPv4 on this host';
}
