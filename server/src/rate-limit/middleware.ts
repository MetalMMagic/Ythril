import rateLimit from 'express-rate-limit';

/** 10 requests/minute per IP — used for auth-sensitive endpoints (setup, login) */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Allow test infrastructure to disable this limit on A/B instances so
  // parallel test suites don't exhaust the window. Instance C omits this env
  // so rate-limit tests on C still exercise the real 429 behaviour.
  skip: () => process.env['SKIP_AUTH_RATE_LIMIT'] === 'true',
});

/** 60 requests/minute per IP — used for notification and setup endpoints */
export const notifyRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** 300 requests/minute per IP — general API and MCP endpoints */
export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded, please slow down.' },
  // Allow test infrastructure to disable this limit on A/B instances so
  // parallel test suites don't exhaust the window on the same IP. Instance C
  // omits this env so rate-limit tests can exercise the real 429 behaviour.
  skip: () => process.env['SKIP_GLOBAL_RATE_LIMIT'] === 'true',
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
});
