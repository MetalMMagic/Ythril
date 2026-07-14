import { Injectable, signal } from '@angular/core';

const TRUTHY = new Set(['1', 'true', 'yes']);

/** Read `?embedded=1` from the current URL. */
function readEmbeddedFlag(): boolean {
  try {
    const raw = new URLSearchParams(window.location.search).get('embedded');
    return raw !== null && TRUTHY.has(raw.toLowerCase());
  } catch {
    return false; // non-browser / malformed URL — default to the normal shell
  }
}

/**
 * EmbedService — "chrome-less" mode for portal-style embedding.
 *
 * When Ythril is embedded as an iframe inside a host portal, the shell topbar
 * (logo + Sign out) duplicates the host's own chrome, and the in-frame Sign out is
 * actively misleading: it ends only the Ythril session, not the portal's.
 *
 * Passing `?embedded=1` on the app URL hides the topbar. Navigation is unaffected —
 * it lives in the sidebar, not the topbar.
 *
 * The flag is read ONCE at construction and cached, because Angular's router drops
 * unknown query params on navigation; re-reading `location.search` later would flip
 * the app back out of embedded mode on the first route change.
 */
@Injectable({ providedIn: 'root' })
export class EmbedService {
  private readonly _embedded = signal(readEmbeddedFlag());

  /** True when the app was loaded with `?embedded=1` — host chrome should be hidden. */
  readonly embedded = this._embedded.asReadonly();
}
