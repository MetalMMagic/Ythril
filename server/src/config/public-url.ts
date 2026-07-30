/**
 * The instance's canonical externally-reachable base URL.
 *
 * Lifted out of `mcp/oauth.ts`, where it lived as a private helper, because the security posture needs
 * to answer a question about it and must not answer that question from a second, hand-copied
 * reimplementation of the precedence rule. Two functions that agree today and drift tomorrow are worse
 * than one shared function: the posture line would keep claiming a configuration that no longer holds,
 * and a posture check that can be wrong is worse than no check.
 */
import { getConfig } from './loader.js';

/** Default when nothing is configured. Deliberately loopback: guessing a public hostname would be worse. */
function fallbackUrl(): string {
  return `http://localhost:${process.env['PORT'] ?? 3200}`;
}

/**
 * Whether the base URL is the loopback fallback rather than something the operator set.
 *
 * This is the fact the posture check needs, and it cannot be recovered from the returned string: a
 * deliberately-configured `http://localhost:3200` and an unconfigured instance produce the same URL and
 * mean completely different things.
 */
export function publicBaseUrlIsFallback(): boolean {
  if (process.env['PUBLIC_BASE_URL']?.trim()) return false;
  try {
    return !getConfig().publicUrl?.trim();
  } catch {
    return true; // pre-setup: nothing is configured yet, so the fallback is what would be used
  }
}

/** Canonical externally-reachable base URL of this Ythril instance, without a
 *  trailing slash. Used as the OAuth issuer and to build absolute metadata URLs.
 *  Order of precedence: PUBLIC_BASE_URL env → config.publicUrl → localhost. */
export function getPublicBaseUrl(): string {
  const env = process.env['PUBLIC_BASE_URL'];
  // getConfig() throws before first-run setup completes; tolerate that so the
  // app can still boot (OAuth simply stays unconfigured until config exists).
  let cfg: string | undefined;
  try {
    cfg = getConfig().publicUrl;
  } catch {
    cfg = undefined;
  }
  const raw = (env && env.trim()) || (cfg && cfg.trim()) || fallbackUrl();
  return raw.replace(/\/+$/, '');
}
