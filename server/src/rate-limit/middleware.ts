import rateLimit from 'express-rate-limit';
import { log } from '../util/log.js';

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

/** 60 requests/minute per IP — used for notification and setup endpoints */
export const notifyRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, _next, options) => {
    log.warn(`notifyRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
});

/** 300 requests/minute per IP — general API and MCP endpoints */
export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
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

/** 2000 requests/minute per IP — machine-to-machine sync endpoints.
 *  Sync pushes one request per item; with large data sets and multiple
 *  networks the per-minute volume can easily exceed the global limit. */
export const syncRateLimit = rateLimit({
  windowMs: 60_000,
  max: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Sync rate limit exceeded, please slow down.' },
  handler: (req, res, _next, options) => {
    log.warn(`syncRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: () => skipRateLimit('SKIP_SYNC_RATE_LIMIT'),
});

/** 5 requests/minute per IP — destructive bulk operations (memory wipe) */
export const bulkWipeRateLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Bulk delete rate limit exceeded, please try again later.' },
  handler: (req, res, _next, options) => {
    log.warn(`bulkWipeRateLimit hit: ${req.ip} on ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: () => skipRateLimit('SKIP_GLOBAL_RATE_LIMIT'),
});
