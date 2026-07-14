import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';

/**
 * ThemeService — handles external theming for Ythril.
 *
 * Two mechanisms are supported (both opt-in):
 *
 * 1. **Static cssUrl** — fetched from `/api/theme` on startup.
 *    When set, a `<link>` element is injected after Ythril's own styles,
 *    so the external stylesheet can override any CSS custom property.
 *
 * 2. **Runtime postMessage** — the host page (portal / iframe parent) can
 *    send `{ type: 'ythril:theme', tokens: { '--color-primary': '#f00', … } }`
 *    and Ythril applies the tokens immediately via `setProperty()`.
 *
 *    Same-origin senders are always trusted. A CROSS-origin embedder (the actual
 *    portal-embedding use case) is trusted only when the operator has explicitly
 *    listed its origin in `embedding.allowedOrigins` server-side — the same list
 *    that lets it iframe Ythril at all (CSP `frame-ancestors`). Absent that opt-in,
 *    cross-origin theme messages are ignored, because restyling the UI of a page you
 *    do not control is a spoofing primitive.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);

  /** Origins the operator opted into (from /api/theme). Empty = same-origin only. */
  private allowedOrigins: string[] = [];

  /** Call once at app startup (via APP_INITIALIZER). */
  init(): Promise<void> {
    return new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => { if (!resolved) { resolved = true; resolve(); } };

      // Timeout: don't block app bootstrap for more than 3 s if /api/theme is slow.
      const timer = setTimeout(done, 3_000);

      // 1. Load static CSS override + the embed-origin allowlist from server config
      this.http.get<{ cssUrl: string | null; allowedOrigins?: string[] }>('/api/theme').subscribe({
        next: ({ cssUrl, allowedOrigins }) => {
          clearTimeout(timer);
          this.allowedOrigins = Array.isArray(allowedOrigins) ? allowedOrigins : [];
          if (cssUrl) {
            this.injectExternalStylesheet(cssUrl);
          }
          done();
        },
        error: () => { clearTimeout(timer); done(); }, // non-fatal — theme is optional
      });

      // 2. Listen for runtime postMessage theme tokens
      this.doc.defaultView?.addEventListener('message', (event: MessageEvent) => {
        this.handleThemeMessage(event);
      });
    });
  }

  private injectExternalStylesheet(cssUrl: string): void {
    // Validate URL: only https: (or http: on localhost for dev) to prevent
    // a compromised config from loading javascript: or data: URIs.
    try {
      const parsed = new URL(cssUrl);
      const isLocalDev = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalDev)) {
        return; // silently ignore non-HTTPS URLs
      }
    } catch {
      return; // malformed URL — ignore
    }

    const existing = this.doc.getElementById('ythril-theme-override');
    if (existing) {
      (existing as HTMLLinkElement).href = cssUrl;
      return;
    }
    const link = this.doc.createElement('link');
    link.id = 'ythril-theme-override';
    link.rel = 'stylesheet';
    link.href = cssUrl;
    this.doc.head.appendChild(link);
  }

  private handleThemeMessage(event: MessageEvent): void {
    // Accept theme messages from our own origin, or from an origin the operator
    // explicitly allowlisted for embedding. Anything else is dropped: letting an
    // arbitrary cross-origin page restyle the UI is a phishing/spoofing primitive.
    // Note the allowlist arrives from /api/theme; until it does, only same-origin is
    // trusted (fail-closed), and an embedder can simply re-post after the SPA loads.
    const win = this.doc.defaultView;
    const selfOrigin = win?.location?.origin;
    const trusted = event.origin === selfOrigin || this.allowedOrigins.includes(event.origin);
    if (!trusted) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data['type'] !== 'ythril:theme') return;
    const tokens = data['tokens'];
    if (!tokens || typeof tokens !== 'object') return;

    // Security note: only CSS custom properties (prefixed `--`) are accepted.
    // Standard CSS properties are intentionally ignored to prevent attackers
    // from hiding UI elements via `display:none` etc.
    // CSS custom property values set via setProperty() are inert strings;
    // the browser will not execute scripts through them.
    const root = this.doc.documentElement;
    for (const [prop, value] of Object.entries(tokens)) {
      // Accept only CSS custom properties (must start with `--`)
      if (typeof prop === 'string' && prop.startsWith('--') && typeof value === 'string') {
        root.style.setProperty(prop, value);
      }
    }
  }
}
