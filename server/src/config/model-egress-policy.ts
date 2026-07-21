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
