/**
 * Extract a short, human-readable reason from an HttpErrorResponse (or any
 * thrown error) for display in an error state or toast. Prefers the server's
 * own `{ error: string }` body, then the HTTP status text, then the JS message.
 * Returns '' when nothing useful is available (the UI then shows a generic line).
 */
export function httpErrorReason(err: unknown): string {
  const e = err as { error?: { error?: unknown }; statusText?: string; status?: number; message?: string } | null;
  if (!e) return '';
  const serverMsg = e.error?.error;
  if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
  if (typeof e.statusText === 'string' && e.statusText && e.statusText !== 'OK') {
    return e.status ? `${e.status} ${e.statusText}` : e.statusText;
  }
  if (typeof e.status === 'number' && e.status > 0) return `HTTP ${e.status}`;
  if (typeof e.message === 'string' && e.message.trim()) return e.message;
  return '';
}
