/**
 * Model/media egress policy — where the **external** provider endpoints are allowed to live.
 *
 * The provider shapes encode a PROTOCOL, not a trust level: `local` speaks Ollama's wire protocol,
 * `external` speaks OpenAI's. That left one real deployment with no usable shape at all — a self-hosted
 * OpenAI-compatible server (llama.cpp `llama-server`, vLLM, LocalAI) on a private cluster address:
 * `local` speaks a protocol it does not implement, and `external` rejected the address on save.
 *
 * `allowPrivateModelEndpoints` closes that. It is deliberately NOT "turn the guard off":
 * `ssrfSafeFetch` still DNS-resolves, pins the resolved IP for the connection and re-validates every
 * redirect — only the private-address rejection relaxes. A declared-private external endpoint therefore
 * ends up better protected than a `local` provider, which uses a plain `fetch` with no guard at all.
 *
 * Env override → config key → safe default, matching `allowPrivatePeers` / `trustProxy` precedence.
 * It is read here rather than passed through the media-config API on purpose: a field that turns into an
 * egress target must never be widenable from the admin surface.
 */
import { getConfig } from './loader.js';

/**
 * True when external provider endpoints may resolve to private/reserved addresses
 * (env `YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS` → config `allowPrivateModelEndpoints` → false).
 */
export function allowPrivateModelEndpoints(): boolean {
  if (process.env['YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS'] === 'true') return true;
  try {
    return getConfig().allowPrivateModelEndpoints === true;
  } catch {
    return false; // config not loaded yet (first run) — stay closed
  }
}

/**
 * True for a bundled/sidecar endpoint — loopback or a bare hostname with no dot, i.e. a compose or
 * cluster service name. Those get a plain `fetch`; anything else is egress and goes through
 * `ssrfSafeFetch`.
 *
 * Lives here rather than in one client because more than one provider needs the same rule, and two
 * copies of a security predicate is how they drift. Deliberately conservative: an unparseable URL is
 * NOT local, so a malformed endpoint gets the guard rather than the bare fetch.
 */
export function isLocalModelEndpoint(rawUrl: string): boolean {
  try {
    const h = new URL(rawUrl).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || !h.includes('.');
  } catch {
    return false;
  }
}
