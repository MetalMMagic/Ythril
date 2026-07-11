/**
 * MCP OAuth 2.1 Authorization Server
 * ==================================
 *
 * Lets browser-based MCP clients (e.g. the claude.ai custom-connector) connect
 * to Ythril's `/mcp` endpoint using the standard MCP authorization flow
 * (OAuth 2.1 + PKCE + Dynamic Client Registration, per RFC 9728 / 8414 / 7591).
 *
 * Ythril acts as BOTH the resource server (`/mcp`) and its own authorization
 * server. There is no external IdP requirement — the user proves their identity
 * during the consent step by supplying a valid Ythril personal access token
 * (PAT). On approval we mint a fresh PAT scoped to exactly the same privileges
 * as the approving token and hand it back as the OAuth access token. Because the
 * issued access token IS a Ythril PAT, the existing `/mcp` auth path validates
 * it with no special-casing.
 *
 * Clients that can send a static `Authorization: Bearer ythril_…` header
 * (Claude Desktop, Cursor, VS Code, …) do NOT need any of this — they keep
 * working exactly as before. This module only adds the discovery + interactive
 * grant that OAuth-only browser connectors require.
 *
 * The interactive consent lives in `POST /mcp-oauth/consent` (below) rather than
 * inside `provider.authorize()` because the SDK's authorize handler does not
 * pass the Express request to the provider, so the provider cannot read the
 * submitted token. `provider.authorize()` therefore only renders the consent
 * page; the page posts back to our own endpoint which issues the auth code.
 */
import express, { type Request, type Response, type Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import {
  InvalidGrantError,
  InvalidRequestError,
  InvalidClientError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { getConfig, saveConfig } from '../config/loader.js';
import { createToken, findMatchingToken } from '../auth/tokens.js';
import { authRateLimit } from '../rate-limit/middleware.js';
import { log } from '../util/log.js';

// ── Public base URL / resource identifiers ──────────────────────────────────

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
  const raw = (env && env.trim()) || (cfg && cfg.trim()) || `http://localhost:${process.env['PORT'] ?? 3200}`;
  return raw.replace(/\/+$/, '');
}

/** RFC 8707 resource identifier for the MCP endpoint. */
export function mcpResourceUrl(): string {
  return `${getPublicBaseUrl()}/mcp`;
}

/** URL of the RFC 9728 protected-resource metadata document for `/mcp`.
 *  This is advertised in the `WWW-Authenticate` header on 401s so OAuth
 *  clients can discover the authorization server. */
export function mcpResourceMetadataUrl(): string {
  return `${getPublicBaseUrl()}/.well-known/oauth-protected-resource/mcp`;
}

// ── Dynamically-registered client store (persisted in config.json) ──────────

// Cap the number of stored DCR clients so a client that re-registers on every
// connect cannot grow config.json without bound. Oldest entries are evicted.
const MAX_OAUTH_CLIENTS = 50;

const clientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const rec = (getConfig().oauthClients ?? []).find(c => c.client_id === clientId);
    return rec as OAuthClientInformationFull | undefined;
  },
  registerClient(client): OAuthClientInformationFull {
    const cfg = getConfig();
    const full = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    } as OAuthClientInformationFull;
    const existing = cfg.oauthClients ?? [];
    const next = [...existing, full as unknown as (typeof existing)[number]];
    // Evict oldest beyond the cap.
    cfg.oauthClients = next.slice(-MAX_OAUTH_CLIENTS);
    saveConfig(cfg);
    log.info(`Registered MCP OAuth client ${full.client_id} (${client.client_name ?? 'unnamed'})`);
    return full;
  },
};

// ── Authorization-code store (in-memory, short-lived, single-use) ───────────

interface MintIdentity {
  admin: boolean;
  readOnly: boolean;
  spaces: string[] | undefined;
}
interface AuthCodeEntry {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  identity: MintIdentity;
  expiresAt: number;
}
const authCodes = new Map<string, AuthCodeEntry>();
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

function pruneExpiredCodes(now: number): void {
  for (const [code, entry] of authCodes) {
    if (now > entry.expiresAt) authCodes.delete(code);
  }
}

// ── OAuth server provider ───────────────────────────────────────────────────

const provider: OAuthServerProvider = {
  get clientsStore() {
    return clientsStore;
  },

  /** Render the consent page. The SDK's authorize handler has already validated
   *  the client_id, redirect_uri and PKCE params by the time we get here. */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    // Prevent the consent page from being framed (clickjacking defence).
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.send(renderConsentPage(client, params));
  },

  /** Return the stored PKCE challenge — the SDK's token handler verifies the
   *  code_verifier against it before calling exchangeAuthorizationCode. */
  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const entry = authCodes.get(authorizationCode);
    if (!entry || entry.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid or expired authorization code');
    }
    return entry.codeChallenge;
  },

  /** Exchange a validated authorization code for a Ythril PAT (the access token). */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const entry = authCodes.get(authorizationCode);
    // Single-use: consume immediately regardless of outcome.
    authCodes.delete(authorizationCode);
    if (!entry) throw new InvalidGrantError('Invalid or expired authorization code');
    if (entry.clientId !== client.client_id) throw new InvalidGrantError('Authorization code was issued to a different client');
    if (Date.now() > entry.expiresAt) throw new InvalidGrantError('Authorization code expired');
    if (redirectUri !== undefined && redirectUri !== entry.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match the authorization request');
    }

    const { plaintext } = await createToken({
      name: `MCP connector: ${sanitizeName(client.client_name) ?? client.client_id}`,
      admin: entry.identity.admin,
      spaces: entry.identity.spaces,
      readOnly: entry.identity.readOnly,
    });
    log.info(`Issued MCP OAuth access token for client ${client.client_id} (admin=${entry.identity.admin}, readOnly=${entry.identity.readOnly})`);

    // No expires_in and no refresh_token: the PAT does not expire, so the
    // client treats the access token as long-lived and never attempts refresh.
    return {
      access_token: plaintext,
      token_type: 'Bearer',
      ...(entry.scopes.length ? { scope: entry.scopes.join(' ') } : {}),
    };
  },

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    // We never issue refresh tokens (access tokens are non-expiring PATs).
    throw new InvalidGrantError('Refresh tokens are not supported');
  },

  /** Validate a bearer access token. `/mcp` uses Ythril's own requireMcpAuth,
   *  so this is only exercised if the SDK's bearer middleware is used. */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const rec = await findMatchingToken(token);
    if (!rec) throw new InvalidGrantError('Invalid access token');
    return { token, clientId: 'ythril-pat', scopes: [] };
  },
};

// ── Consent page rendering ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip control characters and clamp length for use in a token name. */
function sanitizeName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const clean = name.replace(/[\x00-\x1f]/g, '').trim().slice(0, 120);
  return clean || undefined;
}

function hiddenInput(name: string, value: string | undefined): string {
  if (value === undefined) return '';
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}

function renderConsentPage(client: OAuthClientInformationFull, params: AuthorizationParams): string {
  const clientName = sanitizeName(client.client_name) ?? client.client_id;
  const scopeText = params.scopes && params.scopes.length ? params.scopes.join(', ') : '(default access)';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize connection — Ythril</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
         display: flex; min-height: 100vh; align-items: center; justify-content: center;
         background: #0f1115; color: #e6e6e6; }
  .card { width: min(440px, 92vw); background: #171a21; border: 1px solid #2a2f3a;
          border-radius: 12px; padding: 28px 30px; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
  h1 { font-size: 1.25rem; margin: 0 0 6px; }
  p { line-height: 1.5; color: #b7bdc9; font-size: .95rem; }
  .client { color: #fff; font-weight: 600; }
  .scope { font-family: ui-monospace, monospace; font-size: .85rem; color: #9fb4ff; }
  label { display: block; margin: 18px 0 6px; font-size: .9rem; color: #cdd3dd; }
  input[type=password] { width: 100%; box-sizing: border-box; padding: 10px 12px;
          border-radius: 8px; border: 1px solid #333a47; background: #0f1115; color: #fff;
          font-family: ui-monospace, monospace; }
  button { margin-top: 20px; width: 100%; padding: 11px; border: 0; border-radius: 8px;
           background: #4f6bff; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #3f59e0; }
  .hint { margin-top: 16px; font-size: .8rem; color: #7d8595; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/mcp-oauth/consent" autocomplete="off">
    <h1>Authorize connection</h1>
    <p><span class="client">${escapeHtml(clientName)}</span> wants to connect to this Ythril brain over MCP.</p>
    <p>Requested access: <span class="scope">${escapeHtml(scopeText)}</span></p>
    <label for="token">Paste a Ythril access token to approve</label>
    <input id="token" name="token" type="password" placeholder="ythril_…" required autofocus>
    ${hiddenInput('client_id', client.client_id)}
    ${hiddenInput('redirect_uri', params.redirectUri)}
    ${hiddenInput('state', params.state)}
    ${hiddenInput('code_challenge', params.codeChallenge)}
    ${hiddenInput('scope', params.scopes?.join(' '))}
    ${hiddenInput('resource', params.resource?.href)}
    <button type="submit">Approve access</button>
    <p class="hint">The connector will receive a new token with the same permissions as
      the one you paste. Create a dedicated token under Settings → Tokens if you want to
      revoke this connection independently later.</p>
  </form>
</body>
</html>`;
}

// ── Consent submission handler ──────────────────────────────────────────────

function renderConsentError(res: Response, status: number, message: string): void {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'DENY');
  res.send(`<!doctype html><meta charset="utf-8"><title>Authorization error</title>
<body style="font-family:system-ui;background:#0f1115;color:#e6e6e6;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;padding:24px;border:1px solid #2a2f3a;border-radius:12px;background:#171a21">
<h1 style="font-size:1.1rem">Authorization error</h1>
<p style="color:#b7bdc9">${escapeHtml(message)}</p>
<p style="color:#7d8595;font-size:.85rem"><a href="javascript:history.back()" style="color:#9fb4ff">Go back</a> and try again.</p>
</div></body>`);
}

async function handleConsent(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const clientId = typeof body['client_id'] === 'string' ? body['client_id'] : '';
  const redirectUri = typeof body['redirect_uri'] === 'string' ? body['redirect_uri'] : '';
  const state = typeof body['state'] === 'string' ? body['state'] : undefined;
  const codeChallenge = typeof body['code_challenge'] === 'string' ? body['code_challenge'] : '';
  const scope = typeof body['scope'] === 'string' ? body['scope'] : '';
  const token = typeof body['token'] === 'string' ? body['token'].trim() : '';

  // Validate client + redirect_uri BEFORE trusting any redirect target — the
  // SDK's own validation only ran on GET /authorize, not on this endpoint.
  const client = await clientsStore.getClient(clientId);
  if (!client) {
    renderConsentError(res, 400, 'Unknown or unregistered client.');
    return;
  }
  if (!codeChallenge) {
    renderConsentError(res, 400, 'Missing PKCE code challenge.');
    return;
  }
  if (!redirectUri || !client.redirect_uris.includes(redirectUri)) {
    // Never redirect to an unregistered URI — show an error instead.
    renderConsentError(res, 400, 'Unregistered redirect URI.');
    return;
  }

  // Authenticate the approver by their Ythril PAT.
  const record = token.startsWith('ythril_') ? await findMatchingToken(token) : null;
  if (!record) {
    renderConsentError(res, 401, 'That token is invalid or expired. Paste a valid Ythril access token.');
    return;
  }

  const now = Date.now();
  pruneExpiredCodes(now);
  const code = randomBytes(32).toString('base64url');
  authCodes.set(code, {
    clientId,
    redirectUri,
    codeChallenge,
    scopes: scope.split(' ').filter(Boolean),
    identity: { admin: !!record.admin, readOnly: !!record.readOnly, spaces: record.spaces },
    expiresAt: now + AUTH_CODE_TTL_MS,
  });

  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);
  res.redirect(302, url.href);
}

// ── Router assembly ─────────────────────────────────────────────────────────

/**
 * Build the root-level OAuth router (metadata + authorize + token + register +
 * consent). Returns null when the issuer URL is not usable for OAuth (e.g. a
 * plaintext non-loopback publicUrl), in which case only the static-bearer MCP
 * flow is available and the server still starts normally.
 */
export function buildMcpOAuthRouter(): Router | null {
  const base = getPublicBaseUrl();
  let issuerUrl: URL;
  try {
    issuerUrl = new URL(base);
  } catch {
    log.warn(`MCP OAuth disabled: publicUrl "${base}" is not a valid URL.`);
    return null;
  }
  const isLoopback = issuerUrl.hostname === 'localhost' || issuerUrl.hostname === '127.0.0.1';
  if (issuerUrl.protocol !== 'https:' && !isLoopback) {
    log.warn(
      `MCP OAuth disabled: the OAuth flow requires an HTTPS publicUrl (got "${base}"). ` +
      'Browser connectors will not be able to authorize. Set config.publicUrl (or PUBLIC_BASE_URL) ' +
      'to your external https:// URL. Static bearer-token MCP access is unaffected.',
    );
    return null;
  }

  const router = express.Router();
  try {
    router.use(
      mcpAuthRouter({
        provider,
        issuerUrl,
        resourceServerUrl: new URL(mcpResourceUrl()),
        resourceName: 'Ythril MCP',
        scopesSupported: ['mcp'],
      }),
    );
  } catch (err) {
    log.warn(`MCP OAuth disabled: failed to initialise authorization server (${err instanceof Error ? err.message : String(err)}).`);
    return null;
  }

  // Interactive consent submission (see file header for why this is separate).
  router.post('/mcp-oauth/consent', authRateLimit, express.urlencoded({ extended: false }), (req, res) => {
    void handleConsent(req, res).catch(e => {
      log.error('MCP OAuth consent error', e);
      if (!res.headersSent) renderConsentError(res, 500, 'Internal error.');
    });
  });

  log.info(`MCP OAuth authorization server enabled (issuer ${base}).`);
  return router;
}

// Exposed for tests.
export const __test = { authCodes, provider, clientsStore, renderConsentPage };
