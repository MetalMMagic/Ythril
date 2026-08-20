import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { log } from '../util/log.js';
import { resolveLimitFor, WINDOW_MS } from './per-token.js';

/**
 * Bucket requests by CLIENT, not by source IP.
 *
 * Why: behind no reverse proxy (`trustProxy=false`) — which is the default Docker deployment — every
 * request arrives from the Docker gateway address (`::ffff:172.21.0.x`). Keying on the IP therefore puts
 * *every* client of the instance into ONE bucket, so a single busy client (or a client bug — the brain
 * request storm was exactly this) locks out everyone else, and the app can 429 itself.
 *
 * The key is derived from the presented credential rather than from `req.authToken`, because the limiters
 * run BEFORE the auth middleware that would populate it. It is a SHA-256 of the bearer, truncated — the
 * credential itself never lands in a store key, a log line, or a header.
 *
 * Requests with no credential (login, setup, an anonymous probe) still key on the IP, which is the only
 * identity they have. `ipKeyGenerator` is used for that half so IPv6 addresses are normalised to their /64
 * — an IPv6 client can otherwise trivially rotate through addresses it already owns.
 */
export function clientRateLimitKey(req: Request): string {
  const header = req.get?.('authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  // The MCP transport passes the token as a query parameter by design (an external agent may be unable
  // to set headers), so it has to be recognised here too or every MCP client shares the IP bucket.
  const query = typeof req.query?.['token'] === 'string' ? req.query['token'].trim() : '';
  const credential = bearer || query;
  if (credential) {
    return `c:${createHash('sha256').update(credential).digest('base64url').slice(0, 22)}`;
  }
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/**
 * The `SKIP_*_RATE_LIMIT` kill-switches exist only for the test harness. They are
 * honoured **outside production only**, so a leaked env var (copy-pasted compose,
 * shared `.env`) can never silently disable rate limiting on a live deployment —
 * the limiters are the only throttle in front of admin TOTP verification.
 */
function skipRateLimit(envKey: string): boolean {
  return process.env['NODE_ENV'] !== 'production' && process.env[envKey] === 'true';
}

/** Log a loud warning at startup when a rate-limit kill-switch is set. */
export function warnRateLimitBypass(): void {
  const set = ['SKIP_AUTH_RATE_LIMIT', 'SKIP_GLOBAL_RATE_LIMIT', 'SKIP_SYNC_RATE_LIMIT']
    .filter(f => process.env[f] === 'true');
  if (set.length === 0) return;
  if (process.env['NODE_ENV'] === 'production') {
    log.warn(`SECURITY: rate-limit kill-switch(es) set but IGNORED in production: ${set.join(', ')}. Remove them from the environment.`);
  } else {
    log.warn(`Rate limiting DISABLED via ${set.join(', ')} (non-production only).`);
  }
}

/** 10 requests/minute per IP — used for auth-sensitive endpoints (setup, login) */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, _next, options) => {
    log.warn(`authRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  // Allow test infrastructure to disable this limit on A/B instances so
  // parallel test suites don't exhaust the window. Instance C omits this env
  // so rate-limit tests on C still exercise the real 429 behaviour.
  skip: () => skipRateLimit('SKIP_AUTH_RATE_LIMIT'),
});

/** 60 requests/minute per CLIENT — notification and setup endpoints */
export const notifyRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, _next, options) => {
    log.warn(`notifyRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  // This limiter guards POST /api/notify/trigger, which is how the test harness
  // drives sync — and every request from the harness shares one source IP, so the
  // suites collectively blew through 60/min and got 429s. Those 429s were swallowed
  // by the tests' trigger `.catch()`, so no sync cycle ran and load-sensitive sync
  // assertions timed out looking like flakes. It was the ONLY limiter missing a
  // kill-switch; it now honours the same one as the rest of the sync plane.
  // Instance C omits the env so rate-limit tests still exercise the real 429.
  skip: () => skipRateLimit('SKIP_SYNC_RATE_LIMIT'),
});

/**
 * 3000 requests/minute per SOURCE IP — the flood backstop, mounted once in front of every route.
 *
 * Per-client keying (below) is what stops one client starving the others, but on its own it hands an
 * attacker an escape hatch: every distinct bearer string mints a fresh bucket, so a flood of random
 * credentials would never hit a limit. This limiter closes that — it is keyed purely on the IP and set
 * far above any legitimate single client, so it is invisible in normal operation and only bites a flood.
 *
 * It deliberately does NOT replace the per-route limiters; it sits behind them as the outer bound.
 */
export const ipFloodBackstop = rateLimit({
  windowMs: 60_000,
  max: 3000,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded, please slow down.' },
  handler: (req, res, _next, options) => {
    log.warn(`ipFloodBackstop hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: () => skipRateLimit('SKIP_GLOBAL_RATE_LIMIT'),
});

/** 300 requests/minute per CLIENT — general API and MCP endpoints */
export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  message: { error: 'Rate limit exceeded, please slow down.' },
  handler: (req, res, _next, options) => {
    log.warn(`globalRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  // Allow test infrastructure to disable this limit on A/B instances so
  // parallel test suites don't exhaust the window on the same IP. Instance C
  // omits this env so rate-limit tests can exercise the real 429 behaviour.
  skip: () => skipRateLimit('SKIP_GLOBAL_RATE_LIMIT'),
});

/** 2000 requests/minute per CLIENT (peer) — machine-to-machine sync endpoints.
 *  Sync pushes one request per item; with large data sets and multiple
 *  networks the per-minute volume can easily exceed the global limit. */
export const syncRateLimit = rateLimit({
  windowMs: 60_000,
  max: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  message: { error: 'Sync rate limit exceeded, please slow down.' },
  handler: (req, res, _next, options) => {
    log.warn(`syncRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: () => skipRateLimit('SKIP_SYNC_RATE_LIMIT'),
});

/** 5 requests/minute per CLIENT — destructive bulk operations (memory wipe) */
export const bulkWipeRateLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  message: { error: 'Bulk delete rate limit exceeded, please try again later.' },
  handler: (req, res, _next, options) => {
    log.warn(`bulkWipeRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: () => skipRateLimit('SKIP_GLOBAL_RATE_LIMIT'),
});

/**
 * The PER-TOKEN quota, enforced after authentication.
 *
 * ## Why it is separate from `globalRateLimit`
 *
 * That one runs before auth, deliberately — it is the only throttle in front of admin TOTP verification, so it
 * must throttle requests carrying no valid credential at all. It therefore cannot know WHICH token a request
 * holds: answering that means a bcrypt compare against every stored token, per request. So it keys on a hash of
 * the credential, which buckets correctly and identifies nothing.
 *
 * This one runs where the record is already resolved and free. `globalRateLimit` is unchanged and remains the
 * outer bound for the anonymous surface.
 *
 * ## Keyed on the token ID, not on the credential hash
 *
 * A rotated token is a new credential and the same grant. Keying on the hash would hand a fresh bucket to every
 * rotation, which turns a quota into an inconvenience.
 *
 * ## Why `max` is a function
 *
 * Because the answer is per request: `express-rate-limit` calls it with the request, and
 * `resolveLimitFor` reads the resolved record. A constant here is what this change exists to remove.
 */
export const tokenRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: (req: Request) => resolveLimitFor(req.authToken as { rateLimitPerMinute?: number } | undefined),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const token = req.authToken as { id?: string } | undefined;
    // An OIDC-derived identity has no stored token id; fall back to the shared client key so it is still
    // bucketed rather than exempt. Exempting anything from a quota is how a quota stops being one.
    return token?.id ? `t:${token.id}` : clientRateLimitKey(req);
  },
  message: { error: 'Rate limit exceeded for this token, please slow down.' },
  handler: (req, res, _next, options) => {
    const token = req.authToken as { id?: string; name?: string } | undefined;
    // The token is named because the operator's next question is always WHICH one, and a quota they set
    // themselves is the one thing they can act on.
    log.warn(`tokenRateLimit hit: token '${token?.name ?? 'unknown'}' (${token?.id ?? 'no id'}) `
      + `on ${req.method} ${req.path} — limit ${resolveLimitFor(token as { rateLimitPerMinute?: number })}/min`);
    res.status(options.statusCode).json(options.message);
  },
  // The same kill-switch the global limiter honours, and for the same reason: parallel test suites on one host
  // would otherwise exhaust a shared window. Non-production only, enforced in `skipRateLimit`.
  skip: () => skipRateLimit('SKIP_GLOBAL_RATE_LIMIT'),
});
