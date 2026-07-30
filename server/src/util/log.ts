// Centralised logger — redacts Authorization header from all output.
// Maintains an in-memory ring buffer for the /api/about/logs endpoint.
// Supports SSE subscribers for real-time log streaming.

const REDACTED = 'Bearer [redacted]';
const REDACTED_TOKEN = '[redacted]';
const MAX_RING = 1000;
const _ring: string[] = [];

type LogSubscriber = (line: string) => void;
const _subscribers = new Set<LogSubscriber>();

/**
 * Credential-bearing query parameters.
 *
 * `token` was here for SSE/MCP EventSource auth. The rest are the names a provider endpoint, a webhook
 * target or a signed URL actually uses — any of which can reach a log line by way of an error message
 * that quotes the URL it failed on.
 *
 * Each alternative is anchored to `?` or `&`, so `sort_key=` and `monkey=` are untouched while `?key=`
 * is not. Over-redacting a log line costs a debugging session; under-redacting one puts a live
 * credential in a store that is shipped to an aggregator and retained.
 */
const SECRET_QUERY_PARAMS = /([?&](?:token|api[-_]?key|access[-_]?token|auth|secret|password|passwd|pwd|sig|signature|key)=)[^&\s"']+/gi;

/**
 * URL userinfo — `scheme://user:password@host`.
 *
 * The gap this closes, and it was already documented elsewhere in this repo: `audit-changes.ts` keeps
 * webhook routes out of the audit log entirely because "a webhook URL can embed a credential in
 * userinfo or a query string". That reasoning was applied to the audit store and not to this one, while
 * `webhooks/store.ts` logged the target URL verbatim on creation. Same secret, different retained
 * store, and application logs usually have *broader* access than the admin-only audit API.
 *
 * Matches only between the scheme and the first `/`, so a path or query containing `@` is left alone.
 */
const URL_USERINFO = /([a-z][a-z0-9+.\-]*:\/\/)[^\s/@]+@/gi;

function redact(msg: string): string {
  return msg
    .replace(/Bearer\s+[A-Za-z0-9_.\-]+/gi, REDACTED)
    .replace(URL_USERINFO, `$1${REDACTED_TOKEN}@`)
    .replace(SECRET_QUERY_PARAMS, `$1${REDACTED_TOKEN}`);
}

function fmt(level: string, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${redact(msg)}`;
  if (meta === undefined) return base;
  if (meta instanceof Error) return `${base} ${redact(meta.stack ?? meta.message)}`;
  return `${base} ${redact(JSON.stringify(meta))}`;
}

function emit(line: string): void {
  _ring.push(line);
  if (_ring.length > MAX_RING) _ring.shift();
  for (const sub of _subscribers) {
    try { sub(line); } catch { /* ignore */ }
  }
}

export const log = {
  info: (msg: string, meta?: unknown) => { const l = fmt('INFO ', msg, meta); emit(l); console.log(l); },
  warn: (msg: string, meta?: unknown) => { const l = fmt('WARN ', msg, meta); emit(l); console.warn(l); },
  error: (msg: string, meta?: unknown) => { const l = fmt('ERROR', msg, meta); emit(l); console.error(l); },
  debug: (msg: string, meta?: unknown) => {
    if (process.env['DEBUG']) { const l = fmt('DEBUG', msg, meta); emit(l); console.log(l); }
  },
};

/** Return the last `n` log lines from the in-memory ring buffer. */
export function getLogLines(n: number): string[] {
  const clamped = Math.max(1, Math.min(n, MAX_RING));
  return _ring.slice(-clamped);
}

/** Subscribe to new log lines. Returns an unsubscribe function. */
export function subscribeLogLines(cb: LogSubscriber): () => void {
  _subscribers.add(cb);
  return () => { _subscribers.delete(cb); };
}
