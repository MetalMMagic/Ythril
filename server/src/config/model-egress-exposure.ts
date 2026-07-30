/**
 * Effective model/media egress exposure — what the instance can actually reach, not what a flag says.
 *
 * `allowPrivateModelEndpoints is on` reports intent. It does not tell an operator whether anything is
 * *using* that permission, or which endpoint went where. Since the whole reason the flag is surfaced is
 * that it widens egress, the check has to name the exposure or it is decorative:
 *
 *     egress.privateModelEndpoints  vision → 10.43.12.7 (private); documentAssist → api.example.com (public)
 *
 * Classification is deliberately synchronous — the posture check is pure, and resolving DNS at boot would
 * make it fail on a slow resolver. An IP literal is classified exactly; a hostname is reported as such,
 * because only the resolution-time guard inside `ssrfSafeFetch` can know where it actually points.
 */
import { getConfig, getMediaEmbeddingConfig, getEmbeddingConfig } from './loader.js';
import { isSsrfSafeUrl } from '../util/ssrf.js';

export type EndpointClass = 'public' | 'private' | 'hostname' | 'invalid';

export interface EndpointExposure {
  /** Which provider this endpoint serves: vision, stt, embedding, documentAssist. */
  provider: string;
  /** Host as configured (never the full URL — a query string could carry a key). */
  host: string;
  klass: EndpointClass;
}

/**
 * Classify a configured endpoint without resolving it.
 *
 * Provider-agnostic despite the module name — the OIDC issuer posture check
 * (`security-posture.ts`, `oidc.issuer`) uses it too, for the same reason: reporting *which class of
 * address* a configured URL is, without a DNS round-trip at boot.
 *  - `private`  — an IP literal that only the opt-in permits (10/8, 172.16/12, 192.168/16, CGNAT, ULA…)
 *  - `public`   — passes the guard with the opt-in off
 *  - `hostname` — not an IP literal; where it points is decided at call time
 *  - `invalid`  — unparseable, or blocked even with the opt-in on (a crown jewel)
 */
export function classifyEndpoint(raw: string): { host: string; klass: EndpointClass } {
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    return { host: raw.slice(0, 60), klass: 'invalid' };
  }
  if (isSsrfSafeUrl(raw, false)) {
    // Passes with the opt-in OFF. A bare hostname also lands here, so separate the two: only an IP
    // literal can be called "public" on a static check.
    const isLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
    return { host, klass: isLiteral ? 'public' : 'hostname' };
  }
  if (isSsrfSafeUrl(raw, true)) return { host, klass: 'private' }; // only the opt-in permits it
  return { host, klass: 'invalid' };                               // blocked either way — crown jewel
}

/** Every EXTERNAL provider endpoint currently configured, with its classification. */
export function modelEndpointExposure(): EndpointExposure[] {
  const out: EndpointExposure[] = [];
  const add = (provider: string, url: string | undefined | null) => {
    if (!url) return;
    out.push({ provider, ...classifyEndpoint(url) });
  };

  try {
    const media = getMediaEmbeddingConfig();
    if (media.visionProvider === 'external') add('vision', media.vision?.baseUrl);
    if (media.sttProvider === 'external') add('stt', media.stt?.baseUrl);
  } catch { /* pre-setup */ }

  try {
    const emb = getEmbeddingConfig();
    if (emb.provider === 'external') add('embedding', emb.baseUrl);
  } catch { /* pre-setup */ }

  try {
    // The assist model is external by definition (F11-b) — no provider switch to check.
    add('documentAssist', getConfig().mediaEmbedding?.documentProcessing?.assistModel?.baseUrl);
  } catch { /* pre-setup */ }

  return out;
}

/**
 * How each class reads in a posture line.
 *
 * `hostname` is spelled out rather than left as a bare word. On its own it looks like a fourth peer of
 * public/private/invalid — a verdict — when it is the opposite of a verdict: the check did not resolve
 * the name, so it does not know. An operator whose cluster endpoints are all DNS names would otherwise
 * read a list of `(hostname)` tags as "none of these are private", which is exactly backwards from the
 * caution the line is trying to convey.
 */
const KLASS_LABEL: Record<EndpointClass, string> = {
  public: 'public',
  private: 'private',
  hostname: 'hostname, not resolved here',
  invalid: 'invalid',
};

/** One-line summary for the posture check: `vision → 10.43.12.7 (private); stt → api.x.com (public)`. */
export function formatExposure(exposure: EndpointExposure[]): string {
  return exposure.map(e => `${e.provider} → ${e.host} (${KLASS_LABEL[e.klass]})`).join('; ');
}
