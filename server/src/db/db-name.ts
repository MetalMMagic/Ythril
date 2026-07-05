/**
 * Extract the MongoDB database name from a connection URI.
 *
 * MongoDB URI formats:
 *   mongodb://[user:pass@]host[:port][/[database][?options]]
 *   mongodb+srv://[user:pass@]host[/[database][?options]]
 *
 * The database name is the path segment after the first `/` that follows the
 * host/port authority.  If the URI omits the database (e.g. the default
 * `mongodb://ythril-mongo:27017/?directConnection=true`), the function falls
 * back to `'ythril'` for backward compatibility with existing deployments.
 *
 * Examples:
 *   mongodb://host:27017/my-instance          → 'my-instance'
 *   ******cluster/prod      → 'prod'
 *   ******h1:27017,h2:27017/db  → 'db'  (multi-host)
 *   mongodb://host:27017/                     → 'ythril'  (empty path)
 *   mongodb://host:27017                      → 'ythril'  (no path)
 */
export function dbNameFromUri(uri: string): string {
  // Capture the first path segment between the authority separator '/' and any
  // query-string '?'.  The authority portion ([^/]*) handles optional
  // user:pass@, single hosts, comma-separated multi-host lists, and SRV hosts.
  const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/([^/?]+)/.exec(uri);
  return match?.[1] ?? 'ythril';
}
