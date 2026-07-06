import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'ythril_token';
const OIDC_ISSUER_KEY = 'oidc_issuer_url';
const OIDC_CLIENT_ID_KEY = 'oidc_client_id';
const OIDC_SCOPES_KEY = 'oidc_scopes';
const OIDC_ID_TOKEN_KEY = 'oidc_id_token';

/** Prefix that identifies a Ythril-issued Personal Access Token. */
const PAT_TOKEN_PREFIX = 'ythril_';

/** Shape of the response from GET /api/auth/oidc-info */
export interface OidcInfo {
  enabled: boolean;
  issuerUrl?: string;
  clientId?: string;
  scopes?: string[];
  /**
   * When true, cached PAT browser sessions are rejected and the browser is
   * forced to authenticate through the IdP.  PATs still work for API / MCP
   * calls that supply an Authorization header.
   */
  enforceForBrowser?: boolean;
  /**
   * URI the IdP should redirect to after end-session.  Passed as
   * post_logout_redirect_uri to the IdP's end_session_endpoint.
   */
  postLogoutRedirectUri?: string;
}

export interface AuthState {
  token: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly _token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  // Timer handle for the next scheduled OIDC silent refresh
  private _silentRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Cached promise for the OIDC enforcement check — ensures we only call the
  // server once per page load even if the auth guard fires multiple times.
  private _oidcEnforcementPromise: Promise<boolean> | null = null;

  constructor() {
    // On page load, resume the silent-refresh schedule if an OIDC session was
    // active (identified by the presence of the OIDC issuer key in localStorage).
    if (this._token() && localStorage.getItem(OIDC_ISSUER_KEY)) {
      this.scheduleOidcSilentRefresh();
    }
  }

  /** Store token in localStorage and memory */
  login(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  /**
   * Store an OIDC access token together with the session parameters needed for
   * silent refresh, then schedule the first background refresh.
   *
   * Call this after a successful OIDC code exchange instead of plain login().
   * `idToken` is the raw id_token returned by the IdP; it is stored so that
   * end-session requests can supply an id_token_hint.
   */
  loginOidc(token: string, issuerUrl: string, clientId: string, scopes: string[], idToken?: string): void {
    localStorage.setItem(OIDC_ISSUER_KEY, issuerUrl);
    localStorage.setItem(OIDC_CLIENT_ID_KEY, clientId);
    localStorage.setItem(OIDC_SCOPES_KEY, scopes.join(' '));
    // Always set or clear the id_token key to avoid stale hints from a previous session.
    if (idToken) {
      localStorage.setItem(OIDC_ID_TOKEN_KEY, idToken);
    } else {
      localStorage.removeItem(OIDC_ID_TOKEN_KEY);
    }
    this.login(token);
    this.scheduleOidcSilentRefresh();
  }

  /** Clear all auth state from storage and memory (unconditional). */
  logout(): void {
    // Cancel any pending silent refresh
    if (this._silentRefreshTimer !== null) {
      clearTimeout(this._silentRefreshTimer);
      this._silentRefreshTimer = null;
    }
    // Wipe all localStorage auth keys unconditionally — covers both PAT and
    // OIDC sessions so no cached credential can outlive a sign-out.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OIDC_ISSUER_KEY);
    localStorage.removeItem(OIDC_CLIENT_ID_KEY);
    localStorage.removeItem(OIDC_SCOPES_KEY);
    localStorage.removeItem(OIDC_ID_TOKEN_KEY);
    this._token.set(null);
    // Reset the enforcement cache so that a re-login is evaluated fresh.
    this._oidcEnforcementPromise = null;
  }

  /**
   * Perform a full OIDC sign-out by calling the IdP's end_session_endpoint
   * with an id_token_hint (so the Keycloak / IdP session is actually destroyed)
   * and then clearing all local auth state.
   *
   * Returns `true` when the browser has been redirected to the IdP for
   * sign-out (caller should not also redirect to /login).
   * Returns `false` when no OIDC session was active or the IdP does not
   * advertise an end_session_endpoint — the caller should then do a plain
   * redirect to /login.
   */
  async logoutOidc(): Promise<boolean> {
    const issuerUrl = localStorage.getItem(OIDC_ISSUER_KEY);
    const idToken = localStorage.getItem(OIDC_ID_TOKEN_KEY);

    // Clear local auth state immediately — regardless of what the IdP does.
    this.logout();

    if (!issuerUrl) return false;

    try {
      const discoveryUrl = issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
      const res = await fetch(discoveryUrl);
      if (!res.ok) return false;
      const doc = await res.json() as { end_session_endpoint?: string };

      if (!doc.end_session_endpoint) return false;

      const endSessionUrl = new URL(doc.end_session_endpoint);
      if (idToken) {
        endSessionUrl.searchParams.set('id_token_hint', idToken);
      }

      // postLogoutRedirectUri is fetched fresh from the server because the
      // in-memory OidcInfo may not be available at logout time.
      let postLogoutUri: string | undefined;
      try {
        const info = await this.getOidcInfo();
        postLogoutUri = info.postLogoutRedirectUri;
      } catch {
        // Non-fatal — fall back to default
      }
      endSessionUrl.searchParams.set(
        'post_logout_redirect_uri',
        postLogoutUri ?? location.origin + '/login',
      );

      location.href = endSessionUrl.toString();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check whether the current session is a PAT-based browser session that
   * must be rejected because `oidc.enforceForBrowser` is enabled.
   *
   * When it returns `true` the PAT has already been cleared from storage and
   * the caller should redirect to /login so that the OIDC flow starts.
   *
   * The result is cached for the lifetime of the page so that repeated
   * navigation events (route changes) do not trigger multiple server calls.
   */
  enforceOidcBrowserSession(): Promise<boolean> {
    const token = this._token();
    // Only PAT tokens (ythril_ prefix) can bypass the OIDC gate.
    if (!token || !token.startsWith(PAT_TOKEN_PREFIX)) {
      return Promise.resolve(false);
    }

    if (this._oidcEnforcementPromise === null) {
      this._oidcEnforcementPromise = this.getOidcInfo().then(info => {
        if (info.enabled && info.enforceForBrowser) {
          this.logout();
          return true;
        }
        return false;
      });
    }

    return this._oidcEnforcementPromise;
  }

  /**
   * Schedule a silent OIDC token refresh 60 seconds before the current access
   * token expires, based on its `exp` JWT claim.
   *
   * If the token has already expired (or will expire in < 60 s), an immediate
   * refresh attempt is made.
   */
  private scheduleOidcSilentRefresh(): void {
    if (this._silentRefreshTimer !== null) {
      clearTimeout(this._silentRefreshTimer);
      this._silentRefreshTimer = null;
    }

    const token = this._token();
    if (!token) return;

    // Decode the JWT payload (client-side only — no signature verification needed here)
    const parts = token.split('.');
    if (parts.length !== 3) return;

    let payload: { exp?: number };
    try {
      // Pad the base64url segment to a multiple of 4 before decoding
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      payload = JSON.parse(atob(padded));
    } catch {
      return;
    }

    if (!payload.exp) return;

    const refreshInMs = payload.exp * 1000 - Date.now() - 60_000;
    if (refreshInMs <= 0) {
      void this.silentRefresh();
      return;
    }

    this._silentRefreshTimer = setTimeout(() => void this.silentRefresh(), refreshInMs);
  }

  /**
   * Perform a silent OIDC token refresh using a hidden iframe and `prompt=none`.
   *
   * The hidden iframe navigates to the IdP with `prompt=none`.  If the IdP
   * session is still valid the IdP redirects to /oidc-callback where the
   * OidcCallbackComponent detects the iframe context and posts the
   * authorization code back to this window via postMessage.  We then exchange
   * the code for a fresh access token without any visible UI interruption.
   *
   * On failure (e.g. session truly expired, IdP doesn't support prompt=none)
   * we silently do nothing — the next API call will receive a 401 and the
   * auth interceptor will redirect the user to the login page.
   */
  private async silentRefresh(): Promise<void> {
    const issuerUrl = localStorage.getItem(OIDC_ISSUER_KEY);
    const clientId = localStorage.getItem(OIDC_CLIENT_ID_KEY);
    const scopesStr = localStorage.getItem(OIDC_SCOPES_KEY);

    if (!issuerUrl || !clientId || !scopesStr) return;

    // Generate PKCE — keep the verifier in the closure, not in sessionStorage,
    // because the iframe has its own isolated sessionStorage context.
    const verifierBytes = crypto.getRandomValues(new Uint8Array(96));
    const codeVerifier = btoa(Array.from(verifierBytes, b => String.fromCharCode(b)).join(''))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    const codeChallenge = btoa(Array.from(new Uint8Array(digest), b => String.fromCharCode(b)).join(''))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    const state = btoa(String.fromCharCode(...stateBytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Fetch the discovery document to obtain the current endpoints
    let authorizationEndpoint: string;
    let tokenEndpoint: string;
    try {
      const discoveryUrl = issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
      const res = await fetch(discoveryUrl);
      const doc = await res.json() as { authorization_endpoint: string; token_endpoint: string };
      if (typeof doc.authorization_endpoint !== 'string' || typeof doc.token_endpoint !== 'string') {
        return;
      }
      authorizationEndpoint = doc.authorization_endpoint;
      tokenEndpoint = doc.token_endpoint;
    } catch {
      return; // Discovery failed; next 401 will prompt re-login
    }

    const redirectUri = `${location.origin}/oidc-callback`;

    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopesStr);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'none'); // silent — no UI

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handler);
        iframe.remove();
        resolve();
      };

      const handler = async (event: MessageEvent) => {
        if (event.origin !== location.origin) return;
        if ((event.data as { type?: string })?.type !== 'oidc_silent_callback') return;
        if ((event.data as { state?: string }).state !== state) return;

        cleanup();

        const data = event.data as { type: string; state: string; code?: string; error?: string };
        if (data.error || !data.code) return; // Silently do nothing on failure

        // Exchange the code for a fresh token using the in-memory PKCE verifier
        try {
          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            code: data.code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          });

          const tokenRes = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (!tokenRes.ok) return;

          const tokenData = await tokenRes.json() as { access_token?: string };
          if (!tokenData.access_token) return;

          // Update the stored token and reschedule the next refresh
          this.loginOidc(tokenData.access_token, issuerUrl, clientId, scopesStr.split(' '));
        } catch {
          // Exchange failed — don't throw; let the 401 interceptor handle expiry
        }
      };

      window.addEventListener('message', handler);
      // Abort the silent refresh after 30 s if the iframe never responds
      const timeoutId = setTimeout(cleanup, 30_000);

      iframe.src = authUrl.toString();
    });
  }

  // ── OIDC ──────────────────────────────────────────────────────────────────

  /** Fetch the OIDC configuration from the server. */
  async getOidcInfo(): Promise<OidcInfo> {
    try {
      return await firstValueFrom(this.http.get<OidcInfo>('/api/auth/oidc-info'));
    } catch {
      return { enabled: false };
    }
  }

  /**
   * Initiate the OIDC Authorization Code + PKCE login flow.
   *
   * 1. Fetches the IdP discovery document to get the authorization_endpoint.
   * 2. Generates a PKCE code_verifier and code_challenge.
   * 3. Stores state + code_verifier in sessionStorage.
   * 4. Redirects the browser to the IdP.
   */
  async startOidcLogin(info: OidcInfo): Promise<void> {
    if (!info.enabled || !info.issuerUrl || !info.clientId) return;

    // Fetch OIDC discovery document
    const discoveryUrl =
      info.issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
    const discovery = await firstValueFrom(
      this.http.get<{ authorization_endpoint: string }>(discoveryUrl),
    );

    // Generate PKCE code_verifier (96 random bytes → base64url, produces a 128-char verifier)
    const verifierBytes = crypto.getRandomValues(new Uint8Array(96));
    const codeVerifier = btoa(String.fromCharCode(...verifierBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Compute code_challenge = BASE64URL(SHA-256(code_verifier))
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Generate random state
    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    const state = btoa(String.fromCharCode(...stateBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Persist PKCE state for the callback
    sessionStorage.setItem('oidc_state', state);
    sessionStorage.setItem('oidc_code_verifier', codeVerifier);
    sessionStorage.setItem('oidc_token_endpoint_hint', info.issuerUrl);
    sessionStorage.setItem('oidc_client_id', info.clientId);
    sessionStorage.setItem('oidc_scopes', (info.scopes ?? ['openid', 'profile', 'email']).join(' '));

    const redirectUri = `${location.origin}/oidc-callback`;
    const scopes = (info.scopes ?? ['openid', 'profile', 'email']).join(' ');

    const authUrl = new URL(discovery.authorization_endpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', info.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    location.href = authUrl.toString();
  }

  /**
   * Complete the OIDC callback: exchange the authorization code for tokens.
   *
   * Called from the OidcCallbackComponent when the IdP redirects back with
   * `?code=…&state=…`.
   *
   * Returns the access_token and OIDC session params on success, throws on
   * failure.  The caller should pass these params to loginOidc() so that silent
   * refresh is wired up automatically.
   */
  async exchangeOidcCode(
    code: string,
    returnedState: string,
  ): Promise<{ accessToken: string; issuerUrl: string; clientId: string; scopes: string[]; idToken?: string }> {
    const storedState = sessionStorage.getItem('oidc_state');
    const codeVerifier = sessionStorage.getItem('oidc_code_verifier');
    const issuerUrl = sessionStorage.getItem('oidc_token_endpoint_hint');
    const clientId = sessionStorage.getItem('oidc_client_id');
    const scopesStr = sessionStorage.getItem('oidc_scopes');

    // Clear PKCE state immediately regardless of outcome
    sessionStorage.removeItem('oidc_state');
    sessionStorage.removeItem('oidc_code_verifier');
    sessionStorage.removeItem('oidc_token_endpoint_hint');
    sessionStorage.removeItem('oidc_client_id');
    sessionStorage.removeItem('oidc_scopes');

    if (returnedState !== storedState) {
      throw new Error('OIDC state mismatch — possible CSRF attack');
    }
    if (!codeVerifier || !issuerUrl || !clientId) {
      throw new Error('Missing OIDC session data');
    }

    // Fetch token endpoint from discovery
    const discoveryUrl =
      issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
    const discovery = await firstValueFrom(
      this.http.get<{ token_endpoint: string }>(discoveryUrl),
    );

    // Exchange code for tokens at the IdP token endpoint
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: `${location.origin}/oidc-callback`,
      code_verifier: codeVerifier,
    });

    const tokenRes = await firstValueFrom(
      this.http.post<{ access_token: string; id_token?: string }>(
        discovery.token_endpoint,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );

    const scopes = scopesStr ? scopesStr.split(' ') : ['openid', 'profile', 'email'];
    return {
      accessToken: tokenRes.access_token,
      issuerUrl,
      clientId,
      scopes,
      idToken: tokenRes.id_token,
    };
  }
}
