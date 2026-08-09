import type { Request, Response, NextFunction } from 'express';
import { log } from '../util/log.js';
import { findMatchingToken, touchToken } from './tokens.js';
import { consumeSseTicket } from './sse-ticket.js';
import { isMfaEnabled, verifyMfaCode } from './totp.js';
import { validateOidcJwt, getOidcConfig } from './oidc.js';
import type { TokenRecord } from '../config/types.js';
import type { OidcTokenRecord } from './oidc.js';
import { resolveMemberSpaces } from '../spaces/proxy.js';
import { reachesSpace } from './space-reach.js';
import { requiredRung, satisfies } from './required-rung.js';
import { effectiveRung } from './mint-cap.js';
import { authAttemptsTotal } from '../metrics/registry.js';
import { logAuthFailure } from '../audit/middleware.js';
import { mcpResourceMetadataUrl } from '../mcp/oauth.js';

// Augment Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authToken?: Omit<TokenRecord, 'hash'> | OidcTokenRecord;
      resolvedSpaceId?: string;
      requestId?: string;
      /** Bearer exchanged from a single-use SSE ticket, cached so multiple auth middlewares in the same
       *  request (e.g. a router-level requireAuth + a route-level requireAdmin) don't each try to consume
       *  it. `null` means the ticket was invalid; `undefined` means not yet exchanged. */
      sseTicketBearer?: string | null;
      /**
       * Before/after snapshots a route offers the audit log, so the entry can say WHAT changed rather
       * than only that something did. The audit middleware runs on `res.finish` and cannot see resource
       * state, so the handler must hand it over.
       *
       * Handing them over does NOT publish them: `audit-changes.ts` reads only the fields allowlisted for
       * that operation and ignores everything else, so a handler may pass a whole record without auditing
       * its secrets.
       */
      auditSnapshots?: { before?: unknown; after?: unknown };
      /**
       * Whether a recall actually came back with something, and how good the best hit was.
       *
       * Set by the recall handler, read by the audit middleware on `res.finish` for the per-space usefulness
       * counters. It has to travel this way: only the handler knows what the answer contained, and only the
       * middleware knows how long the whole request took and which space it was attributed to.
       *
       * This is the field that separates a useful space from one that is merely asked a lot — a space queried
       * five hundred times that answers nothing looks identical to a popular one in a call count.
       */
      recallOutcome?: { answered: boolean; topScore?: number };
    }
  }
}

/** Returns true when the bearer value looks like a PAT (Ythril-issued token). */
function isPat(bearer: string): boolean {
  return bearer.startsWith('ythril_');
}

/**
 * Resolve a bearer token to an auth record, trying PAT first and OIDC JWT
 * as a fallback when OIDC is enabled and the value is not a PAT.
 *
 * Returns null when validation fails.
 */
async function resolveBearer(
  bearer: string,
): Promise<Omit<TokenRecord, 'hash'> | OidcTokenRecord | null> {
  if (isPat(bearer)) {
    // PAT path — existing bcrypt verification
    const record = await findMatchingToken(bearer);
    if (!record) return null;
    const { hash: _h, ...safeRecord } = record;
    return safeRecord;
  }

  // Non-PAT bearer — attempt OIDC JWT validation when OIDC is enabled
  if (getOidcConfig()) {
    return validateOidcJwt(bearer);
  }

  return null;
}

/**
 * Middleware: rejects requests from read-only tokens.
 * Must be placed after requireAuth / requireSpaceAuth on mutating routes.
 */
export function denyReadOnly(req: Request, res: Response, next: NextFunction): void {
  if (req.authToken?.readOnly) {
    res.status(403).json({ error: 'This token has read-only access' });
    return;
  }
  next();
}

/**
 * Query-string auth for streams the browser `EventSource` API opens (it cannot set an `Authorization`
 * header). A token in a URL leaks into access logs, proxy logs, browser history and `Referer`, so the
 * two BROWSER streams no longer take the raw token — they take a single-use `?ticket=` (minted by an
 * authenticated `POST …/ticket`, exchanged back to the bearer here; see auth/sse-ticket.ts). Only the
 * `/mcp` transport still accepts a raw `?token=`: it's an external-agent protocol with a different threat
 * model (the agent already holds the token and may not be able to set headers). All lists stay anchored
 * and GET-only so the fallbacks can't widen to other routes.
 */
const QUERY_TOKEN_PATHS = new Set([
  '/mcp', // MCP SSE transport (external agents) — raw ?token= retained by design
]);

// Browser SSE streams authenticated via a single-use ?ticket= (never the raw token).
const TICKET_PATHS = new Set([
  '/api/about/logs/stream', // admin audit-log live tail (EventSource)
]);
const TICKET_PATH_PATTERNS: RegExp[] = [
  /^\/api\/brain\/spaces\/[^/]+\/events$/, // live brain-change stream (F12, EventSource)
];

/** Request path without query string or trailing slash (`/` when empty). */
function pathOf(req: Request): string {
  const pathOnly = (req.originalUrl.split('?')[0] ?? '').replace(/\/+$/, '');
  return pathOnly || '/';
}

function allowsQueryToken(req: Request): boolean {
  return req.method === 'GET' && QUERY_TOKEN_PATHS.has(pathOf(req));
}

function allowsTicket(req: Request): boolean {
  if (req.method !== 'GET') return false;
  const p = pathOf(req);
  return TICKET_PATHS.has(p) || TICKET_PATH_PATTERNS.some(re => re.test(p));
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  // Browser SSE: exchange the single-use ticket back to its bearer (keeps the token out of the URL).
  // Bound to this exact path, so a ticket can't cross to another space's stream or the log stream. A
  // request can pass through more than one auth middleware (a router-level requireAuth + a route-level
  // requireAdmin), so exchange the ticket ONCE and cache it on the request — single-use is enforced
  // across requests (each gets a fresh req), but stays consistent within one.
  if (allowsTicket(req)) {
    if (req.sseTicketBearer !== undefined) return req.sseTicketBearer;
    const ticket = req.query['ticket'];
    const bearer = (typeof ticket === 'string' && ticket.trim())
      ? consumeSseTicket(ticket.trim(), pathOf(req))
      : null;
    req.sseTicketBearer = bearer;
    return bearer;
  }
  // MCP SSE transport only: legacy raw-token fallback (see note above).
  if (allowsQueryToken(req)) {
    const queryToken = req.query['token'];
    if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim();
  }
  return null;
}

// ── Shared auth core ─────────────────────────────────────────────────────────
// The require* middlewares below share the same extract → resolve → attach
// preamble, plus a couple of common predicates (admin, MFA, space scope). These
// helpers hold each in one place so a change — a new metric, an audit hook, an
// OIDC tweak — is made once instead of mirrored by hand across ~6 functions.

/** Attach the resolved record to the request and refresh a PAT's lastUsed. */
function attachToken(
  req: Request,
  record: Omit<TokenRecord, 'hash'> | OidcTokenRecord,
  bearer: string,
): void {
  req.authToken = record;
  // Update lastUsed asynchronously for PAT tokens — do not block the request.
  if (isPat(bearer) && 'id' in record) touchToken(record.id);
}

/**
 * Extract and resolve the bearer, writing the shared 401 responses. Returns the
 * resolved record (and the raw bearer) on success, or null once a response has
 * been sent — callers must `return` immediately on null.
 *
 * `onChallenge` runs just before a 401 (to attach a `WWW-Authenticate` header).
 * `recordInvalidMetric` preserves the historical behaviour where only the
 * non-admin paths increment `authAttemptsTotal{result="invalid"}`.
 */
async function resolveAuthOrFail(
  req: Request,
  res: Response,
  opts: { onChallenge?: (res: Response) => void; recordInvalidMetric?: boolean } = {},
): Promise<{ record: Omit<TokenRecord, 'hash'> | OidcTokenRecord; bearer: string } | null> {
  const bearer = extractBearer(req);
  if (!bearer) {
    if (opts.onChallenge) opts.onChallenge(res);
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }
  const record = await resolveBearer(bearer);
  if (!record) {
    if (opts.recordInvalidMetric) authAttemptsTotal.inc({ result: 'invalid' });
    logAuthFailure(req);
    if (opts.onChallenge) opts.onChallenge(res);
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
  return { record, bearer };
}

/** Enforce `admin: true`; writes 403 and returns false when the token is not admin. */
function enforceAdmin(res: Response, record: Omit<TokenRecord, 'hash'> | OidcTokenRecord): boolean {
  if (!record.admin) {
    res.status(403).json({ error: 'Admin token required' });
    return false;
  }
  return true;
}

/**
 * Does this token need a second factor on an MFA-gated route?
 *
 * Pure, exported, and separate from the middleware so the policy can be enumerated without an HTTP request —
 * it is three lines and each one is a security decision.
 *
 * The token's own setting wins over the instance switch in BOTH directions, because the instance switch is
 * all-or-nothing and that is the reported defect: turning MFA on made it mutually exclusive with automation.
 * An absent setting is `inherit`, so every token that exists today keeps exactly its current behaviour.
 */
export function mfaRequiredFor(
  record: Pick<TokenRecord, 'mfa'> | { mfa?: undefined },
  instanceEnabled: boolean,
): boolean {
  if (record.mfa === 'exempt') return false;
  if (record.mfa === 'required') return true;
  return instanceEnabled;
}

/**
 * Enforce a current TOTP code for PAT sessions when this token needs one. Writes the
 * MFA_REQUIRED / MFA_INVALID 403 and returns false on failure. OIDC sessions are
 * exempt (the IdP handles its own step-up auth).
 */
function enforceMfa(
  req: Request,
  res: Response,
  bearer: string,
  // An OIDC record carries no `mfa` field and never reaches the check anyway — `isPat` is false for it, and
  // the IdP owns its own step-up auth. Typed as the union so the call sites do not have to narrow.
  record?: Omit<TokenRecord, 'hash'> | OidcTokenRecord,
): boolean {
  const mfa = record && 'mfa' in record ? { mfa: record.mfa } : {};
  if (isPat(bearer) && mfaRequiredFor(mfa, isMfaEnabled())) {
    const code = (req.headers['x-totp-code'] as string | undefined ?? '').trim();
    if (!code) {
      res.status(403).json({ error: 'MFA_REQUIRED' });
      return false;
    }
    if (!verifyMfaCode(code)) {
      res.status(403).json({ error: 'MFA_INVALID' });
      return false;
    }
  }
  return true;
}

/**
 * Enforce the token's `spaces` allowlist against a space id (proxy-aware).
 * Writes 403 and returns false when the token lacks access. Unrestricted tokens
 * (no `spaces` allowlist) always pass.
 */
/**
 * The AREA check, layered on top of reach — and deliberately staged.
 *
 * A route the inventory does not resolve at RUNTIME falls through to the reach check alone, with a warning.
 * That is not the permissive default this feature exists to remove: reach is still enforced, so this can
 * only ever be stricter than yesterday, never looser. What it cannot yet be is COMPLETE, because
 * `req.baseUrl + req.route.path` is the only way to reconstruct the inventory key at runtime and nested
 * routers can make that disagree with the registered path.
 *
 * The warning is the point. It names the key that missed, so the log says exactly which routes still need
 * the mapping before misses can be turned into refusals — which is the follow-up. Flipping to refuse now
 * would 403 real traffic on any route whose key I reconstructed wrongly, and I have no runtime evidence yet
 * that I did not.
 */
/** The spaces a request actually touches: a proxy's members, or the space itself. Shared so the reach check
 *  and the area check can never disagree about WHAT they are checking. */
function spaceTargets(spaceId: string | undefined): string[] {
  if (!spaceId) return [];
  const memberIds = resolveMemberSpaces(spaceId);
  return memberIds.length > 0 ? memberIds : [spaceId];
}

function enforceAreaRung(
  res: Response,
  record: Omit<TokenRecord, 'hash'> | OidcTokenRecord,
  req: Request,
  targets: string[],
): boolean {
  const rights = (record as { rights?: Parameters<typeof effectiveRung>[0] }).rights;
  if (!rights) return true;                    // OIDC records: reach already answered for them

  const routePath = `${req.baseUrl ?? ''}${(req.route as { path?: string } | undefined)?.path ?? ''}`;
  const need = requiredRung(req.method, routePath);
  if (!need) {
    log.warn(`Space rights: no inventory entry for '${req.method} ${routePath}' — reach enforced, area not. `
      + 'Add it to ROUTE_RIGHTS; misses become refusals once the log is clean.');
    return true;
  }
  if (need.scope !== 'path') return true;      // iterating routes gate their LOOP, not the call

  for (const sid of targets) {
    if (!satisfies(effectiveRung(rights, sid, need.area), need.needs)) {
      res.status(403).json({
        error: `Token needs '${need.needs}' on ${need.area} in space '${sid}'`,
      });
      return false;
    }
  }
  return true;
}

function enforceSpaceScope(
  res: Response,
  record: Omit<TokenRecord, 'hash'> | OidcTokenRecord,
  spaceId: string | undefined,
): boolean {
  if (!spaceId) return true;

  // For proxy spaces, the token must have access to ALL member spaces.
  // If the space doesn't exist in config, resolveMemberSpaces returns [].
  // Fall back to [spaceId] so the scope check still rejects tokens that
  // don't reach this space — returning 403 instead of leaking a 404.
  const memberIds = resolveMemberSpaces(spaceId);
  const targets = memberIds.length > 0 ? memberIds : [spaceId];

  // The rights matrix answers this now. It is derived from `spaces`/`admin`/`readOnly` at config load, and
  // `rights-reach-matches-legacy.test.js` proves the two agree for every token shape on listed, unlisted and
  // not-yet-created spaces — which is why this swap changes no behaviour.
  //
  // The legacy branch survives for records that carry no rights: OIDC-derived tokens are built per request
  // rather than read from config, so the backfill never sees them. Falling through to `spaces` there is the
  // same answer, not a weaker one; removing it would refuse every OIDC caller instead.
  const rights = (record as { rights?: Parameters<typeof reachesSpace>[0] }).rights;
  const missing = rights
    ? targets.filter(sid => !reachesSpace(rights, sid))
    : record.spaces ? targets.filter(sid => !record.spaces!.includes(sid)) : [];

  if (missing.length > 0) {
    res.status(403).json({ error: `Token does not have access to space '${spaceId}'` });
    return false;
  }
  return true;
}

/**
 * Middleware that requires a valid Bearer PAT token.
 * Sets req.authToken on success.
 * SchemaLibrary-scoped tokens are rejected here — they are only valid on
 * GET /api/schema-library/public* via acceptSchemaLibraryToken.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return performAuth(req, res, next);
}

/**
 * Like {@link requireAuth}, but on a 401 it also emits an RFC 9728
 * `WWW-Authenticate: Bearer resource_metadata="…"` header pointing at the MCP
 * protected-resource metadata. This is what lets OAuth-only browser MCP clients
 * (e.g. the claude.ai custom connector) discover Ythril's authorization server
 * and begin the OAuth flow. Static bearer-token clients are unaffected.
 */
export async function requireMcpAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return performAuth(req, res, next, (r) => {
    // Imported lazily to avoid a load-order dependency on the MCP OAuth module.
    r.setHeader('WWW-Authenticate', `Bearer resource_metadata="${mcpResourceMetadataUrl()}"`);
  });
}

/** Shared auth core for requireAuth / requireMcpAuth. `onChallenge` (if given)
 *  runs immediately before a 401 is written, to attach a challenge header. */
async function performAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  onChallenge?: (res: Response) => void,
): Promise<void> {
  const auth = await resolveAuthOrFail(req, res, { onChallenge, recordInvalidMetric: true });
  if (!auth) return;
  const { record, bearer } = auth;

  // schemaLibrary tokens have no space/admin access — reject them on all other routes
  if ('schemaLibrary' in record && record.schemaLibrary) {
    res.status(403).json({ error: 'Library access tokens may only be used on the schema library public endpoint' });
    return;
  }

  authAttemptsTotal.inc({ result: 'success' });
  attachToken(req, record, bearer);
  next();
}

/**
 * Middleware for GET /api/schema-library/public* routes.
 * The route is unauthenticated by default, but ALSO accepts a valid
 * schemaLibrary Bearer token so that instances behind a reverse proxy
 * that requires Bearer credentials can still browse the catalog.
 * Any other token type present in the header is rejected with 403
 * (don't silently ignore an invalid/wrong-scope credential).
 */
export async function acceptSchemaLibraryToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const bearer = extractBearer(req);
  if (!bearer) { next(); return; } // no auth header — public access

  const record = await resolveBearer(bearer);
  if (!record) {
    authAttemptsTotal.inc({ result: 'invalid' });
    logAuthFailure(req);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  if (!('schemaLibrary' in record) || !record.schemaLibrary) {
    res.status(403).json({ error: 'Only library access tokens may be used on this endpoint' });
    return;
  }

  authAttemptsTotal.inc({ result: 'success' });
  attachToken(req, record, bearer);
  next();
}

/**
 * Middleware that requires a valid Bearer PAT token AND that the token
 * has access to the space ID in req.params.spaceId.
 */
export async function requireSpaceAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = await resolveAuthOrFail(req, res, { recordInvalidMetric: true });
  if (!auth) return;
  const { record, bearer } = auth;

  const spaceId = req.params['spaceId'] as string | undefined;
  if (!enforceSpaceScope(res, record, spaceId)) return;
  if (!enforceAreaRung(res, record, req, spaceTargets(spaceId))) return;

  authAttemptsTotal.inc({ result: 'success' });
  attachToken(req, record, bearer);
  req.resolvedSpaceId = spaceId;
  next();
}

/**
 * Like requireAdminMfa, but also enforces the token's `spaces` allowlist
 * against the space ID found in `req.params[paramName]`.
 *
 * Use this on admin endpoints that target a specific space (e.g. schema
 * mutation, wipe, export, import) so that space-restricted admin tokens
 * cannot operate on spaces outside their allowlist.
 */
export function requireAdminMfaScoped(paramName: string) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const auth = await resolveAuthOrFail(req, res, {});
    if (!auth) return;
    const { record, bearer } = auth;

    if (!enforceAdmin(res, record)) return;
    if (!enforceMfa(req, res, bearer, record)) return;

    // Space-scope enforcement for space-restricted admin tokens.
    // Tokens without a spaces allowlist (unrestricted admin) are always allowed.
    const spaceId = req.params[paramName] as string | undefined;
    if (!enforceSpaceScope(res, record, spaceId)) return;
  if (!enforceAreaRung(res, record, req, spaceTargets(spaceId))) return;

    attachToken(req, record, bearer);
    next();
  };
}

/** Middleware: requires a valid PAT **with admin: true**.
 *  Must be used after (or instead of) requireAuth on admin-only routes.
 *  Non-admin tokens receive 403 even if they are otherwise valid.
 *
 *  Note: OIDC JWT tokens are also accepted when OIDC is enabled — the
 *  admin flag is derived from the configured claimMapping.admin rule.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await resolveAuthOrFail(req, res, {});
  if (!auth) return;
  const { record, bearer } = auth;

  if (!enforceAdmin(res, record)) return;

  attachToken(req, record, bearer);
  next();
}

/**
 * Middleware: requires a valid admin PAT **and**, when MFA is enabled,
 * a valid TOTP code in the `X-TOTP-Code` header.
 *
 * When MFA is disabled (no `totpSecret` in secrets.json) this behaves
 * identically to `requireAdmin` so enabling MFA is purely additive.
 *
 * Note: OIDC JWT tokens are also accepted when OIDC is enabled.  MFA is
 * NOT enforced for OIDC sessions (the IdP handles its own step-up auth).
 *
 * Error codes returned (distinguish from generic 403 on the client):
 *   403 { error: 'MFA_REQUIRED' } — MFA enabled, header missing
 *   403 { error: 'MFA_INVALID'  } — MFA enabled, code wrong / expired
 */
export async function requireAdminMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await resolveAuthOrFail(req, res, {});
  if (!auth) return;
  const { record, bearer } = auth;

  if (!enforceAdmin(res, record)) return;
  if (!enforceMfa(req, res, bearer, record)) return;

  attachToken(req, record, bearer);
  next();
}
