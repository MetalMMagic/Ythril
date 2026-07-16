/**
 * Path normalisation — single source of truth. Two clearly-named variants because the
 * two use cases have different safety requirements, and hand-rolled copies had drifted
 * (the media worker stripped `..` for traversal defense while every other copy did not).
 */

/**
 * Normalise a path for use as a Mongo document `_id` / `path` field: forward slashes,
 * no leading slash(es). Does NOT strip `..` — the result is a key, never a filesystem path.
 */
export function toDocId(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Normalise a peer/user-supplied path that will be joined to a filesystem root: forward
 * slashes, `..` segments stripped, no leading slash. Use this (not `toDocId`) whenever the
 * result feeds `path.join(root, …)` — it is defense-in-depth alongside the caller's boundary
 * check, not a replacement for it.
 */
export function toSafeRelPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\.\.\//g, '').replace(/^\/+/, '');
}
