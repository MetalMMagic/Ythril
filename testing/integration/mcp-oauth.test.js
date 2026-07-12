/**
 * Integration tests: MCP OAuth authorization flow (browser connectors)
 *
 * Exercises the full OAuth 2.1 + PKCE + Dynamic Client Registration handshake
 * that browser-only MCP clients (e.g. the claude.ai custom connector) use to
 * connect to Ythril's /mcp endpoint:
 *
 *   1. Unauthenticated /mcp → 401 with RFC 9728 WWW-Authenticate resource_metadata
 *   2. Protected-resource metadata (RFC 9728) advertises the authorization server
 *   3. Authorization-server metadata (RFC 8414) advertises the grant endpoints
 *   4. Dynamic Client Registration (RFC 7591) issues a client_id
 *   5. GET /authorize renders the consent page
 *   6. POST /mcp-oauth/consent with a valid PAT issues an auth code (302)
 *   7. POST /token exchanges the code (+ PKCE verifier) for a Ythril PAT
 *   8. The issued token authenticates a real /mcp tools/list call
 *
 * Plus the security-critical negative paths: PKCE mismatch, single-use codes,
 * unregistered redirect_uri, invalid consent token.
 *
 * Requires the rebuilt Docker stack:
 *   npm run test:up:rebuild   (or `build ythril-a` if only this changed)
 * Run: node --test testing/integration/mcp-oauth.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { INSTANCES, get } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const BASE = INSTANCES.a;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const pkce = () => {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

// Register a fresh DCR client and return its client_id.
async function registerClient(redirectUri) {
  const r = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Test MCP Connector',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  const body = await r.json();
  return { status: r.status, clientId: body.client_id, body };
}

// Drive the consent form → returns the Location redirect (or the response).
async function submitConsent({ clientId, redirectUri, challenge, state, token }) {
  const form = new URLSearchParams();
  form.set('client_id', clientId);
  form.set('redirect_uri', redirectUri);
  form.set('code_challenge', challenge);
  if (state) form.set('state', state);
  form.set('token', token);
  const r = await fetch(`${BASE}/mcp-oauth/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual',
  });
  return r;
}

// Exchange an auth code for tokens.
async function exchangeCode({ clientId, code, verifier, redirectUri }) {
  const form = new URLSearchParams();
  form.set('grant_type', 'authorization_code');
  form.set('client_id', clientId);
  form.set('code', code);
  form.set('code_verifier', verifier);
  form.set('redirect_uri', redirectUri);
  const r = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

let adminToken;

describe('MCP OAuth: discovery metadata', () => {
  before(() => {
    adminToken = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  });

  it('unauthenticated /mcp returns 401 with WWW-Authenticate resource_metadata', async () => {
    const r = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(r.status, 401);
    const wa = r.headers.get('www-authenticate');
    assert.ok(wa, 'WWW-Authenticate header must be present');
    assert.match(wa, /Bearer/);
    assert.match(wa, /resource_metadata="[^"]*\/\.well-known\/oauth-protected-resource\/mcp"/,
      `WWW-Authenticate must point at protected-resource metadata; got: ${wa}`);
  });

  it('protected-resource metadata advertises the authorization server', async () => {
    const r = await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.ok(body.resource, 'resource must be set');
    assert.ok(Array.isArray(body.authorization_servers) && body.authorization_servers.length >= 1,
      'authorization_servers must be advertised');
  });

  it('authorization-server metadata advertises grant endpoints + PKCE S256', async () => {
    const r = await fetch(`${BASE}/.well-known/oauth-authorization-server`);
    assert.equal(r.status, 200);
    const md = await r.json();
    assert.ok(md.authorization_endpoint, 'authorization_endpoint');
    assert.ok(md.token_endpoint, 'token_endpoint');
    assert.ok(md.registration_endpoint, 'registration_endpoint (DCR)');
    assert.deepEqual(md.code_challenge_methods_supported, ['S256']);
    assert.ok(md.response_types_supported.includes('code'));
  });
});

describe('MCP OAuth: dynamic client registration', () => {
  it('registers a client and returns a client_id', async () => {
    const { status, clientId } = await registerClient(REDIRECT);
    assert.equal(status, 201);
    assert.ok(clientId, 'client_id must be issued');
  });
});

describe('MCP OAuth: authorization + consent', () => {
  it('GET /authorize renders the consent page', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { challenge } = pkce();
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: REDIRECT,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
    });
    const r = await fetch(`${BASE}/authorize?${q}`, { redirect: 'manual' });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/html/);
    const html = await r.text();
    assert.match(html, /Authorize connection/);
    assert.match(html, /name="token"/, 'consent form must ask for a token');
  });

  it('consent with an INVALID token does not issue a code', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { challenge } = pkce();
    const r = await submitConsent({ clientId, redirectUri: REDIRECT, challenge, token: 'ythril_notarealtoken' });
    assert.equal(r.status, 401, 'invalid token must be rejected, not redirected');
    assert.equal(r.headers.get('location'), null, 'no redirect (no code) on invalid token');
  });

  it('consent to an UNREGISTERED redirect_uri is refused', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { challenge } = pkce();
    const r = await submitConsent({
      clientId, redirectUri: 'https://evil.example/callback', challenge, token: adminToken,
    });
    assert.equal(r.status, 400, 'must refuse an unregistered redirect target');
    assert.equal(r.headers.get('location'), null);
  });

  it('consent with a valid PAT issues an auth code (302)', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { challenge } = pkce();
    const r = await submitConsent({ clientId, redirectUri: REDIRECT, challenge, state: 'st8', token: adminToken });
    assert.equal(r.status, 302);
    const loc = new URL(r.headers.get('location'));
    assert.equal(loc.origin + loc.pathname, REDIRECT);
    assert.ok(loc.searchParams.get('code'), 'code must be present in redirect');
    assert.equal(loc.searchParams.get('state'), 'st8', 'state must be echoed back');
  });
});

describe('MCP OAuth: token exchange', () => {
  it('rejects an exchange with the wrong PKCE verifier (invalid_grant)', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { challenge } = pkce();
    const wrong = pkce(); // different verifier
    const consent = await submitConsent({ clientId, redirectUri: REDIRECT, challenge, token: adminToken });
    const code = new URL(consent.headers.get('location')).searchParams.get('code');
    const { status, body } = await exchangeCode({ clientId, code, verifier: wrong.verifier, redirectUri: REDIRECT });
    assert.equal(status, 400);
    assert.equal(body.error, 'invalid_grant');
  });

  it('exchanges a valid code for a working Ythril access token', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { verifier, challenge } = pkce();
    const consent = await submitConsent({ clientId, redirectUri: REDIRECT, challenge, token: adminToken });
    const code = new URL(consent.headers.get('location')).searchParams.get('code');

    const { status, body } = await exchangeCode({ clientId, code, verifier, redirectUri: REDIRECT });
    assert.equal(status, 200, `token exchange failed: ${JSON.stringify(body)}`);
    assert.equal(body.token_type, 'Bearer');
    assert.ok(typeof body.access_token === 'string' && body.access_token.startsWith('ythril_'),
      'access_token must be a Ythril PAT');

    // The issued token must authenticate a real MCP call.
    const mcp = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${body.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    });
    assert.equal(mcp.status, 200, 'issued OAuth token must authenticate on /mcp');
    const text = await mcp.text();
    assert.match(text, /"tools"/, 'tools/list must return a tools array');

    // The connector token must appear in the admin token list, named + revocable.
    const list = await get(BASE, adminToken, '/api/tokens');
    const connector = list.body.tokens.find(t => t.name.startsWith('MCP connector:'));
    assert.ok(connector, 'issued connector token must be listed for revocation');

    // Reusing the same authorization code must fail (single-use).
    const replay = await exchangeCode({ clientId, code, verifier, redirectUri: REDIRECT });
    assert.equal(replay.status, 400, 'authorization code must be single-use');
    assert.equal(replay.body.error, 'invalid_grant');
  });
});

describe('MCP OAuth: connector-token lifecycle (S5)', () => {
  before(() => {
    adminToken = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  });

  // Full authorize → consent → exchange for a given client.
  async function fullExchange(clientId) {
    const { verifier, challenge } = pkce();
    const consent = await submitConsent({ clientId, redirectUri: REDIRECT, challenge, token: adminToken });
    const code = new URL(consent.headers.get('location')).searchParams.get('code');
    return exchangeCode({ clientId, code, verifier, redirectUri: REDIRECT });
  }

  it('minted token carries an expiry (expires_in advertised, expiresAt persisted)', async () => {
    const { clientId } = await registerClient(REDIRECT);
    const { status, body } = await fullExchange(clientId);
    assert.equal(status, 200, `exchange failed: ${JSON.stringify(body)}`);
    assert.equal(typeof body.expires_in, 'number', 'a time-limited token must advertise expires_in');
    assert.ok(body.expires_in > 0, 'expires_in must be positive');

    const list = await get(BASE, adminToken, '/api/tokens');
    const tok = list.body.tokens.find(t => t.oauthClientId === clientId);
    assert.ok(tok, 'connector token must be listed with its oauthClientId');
    assert.ok(tok.expiresAt, 'connector token must carry expiresAt (no permanent PATs)');
    assert.ok(new Date(tok.expiresAt).getTime() > Date.now(), 'expiresAt must be in the future');
  });

  it('repeat consent for the same client rotates rather than accumulates tokens', async () => {
    const { clientId } = await registerClient(REDIRECT);
    await fullExchange(clientId);
    await fullExchange(clientId);
    await fullExchange(clientId);
    const list = await get(BASE, adminToken, '/api/tokens');
    const forClient = list.body.tokens.filter(t => t.oauthClientId === clientId);
    assert.equal(forClient.length, 1,
      `VULNERABILITY: re-consent must keep exactly one token per client (rotation); found ${forClient.length}. ` +
      `config.tokens grows without bound otherwise.`);
  });
});
