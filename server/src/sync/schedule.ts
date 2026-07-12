import { validate } from 'node-cron';

/**
 * Resolve a network's `syncSchedule` string to a cron expression that node-cron
 * can run, or `null` when it isn't recognised (the caller then leaves the
 * network on manual-sync only).
 *
 * Accepts:
 *  - A **standard cron expression**, used as-is — the documented format the
 *    integration guide shows (e.g. `"*​/5 * * * *"`). The previous bespoke parser
 *    only understood the shorthands below and silently ignored real cron
 *    expressions, leaving those networks on manual sync despite the docs.
 *  - Two **legacy shorthands**, translated to cron for backward compatibility:
 *      `"*​/N minutes"` | `"every Nm"` → `"*​/N * * * *"`  (1 ≤ N ≤ 59)
 *      `"*​/N hours"`   | `"every Nh"` → `"0 *​/N * * *"`  (1 ≤ N ≤ 23)
 *    Values outside cron's range (e.g. `"every 90m"`) return `null` — migrate
 *    those to an explicit cron expression.
 */
export function resolveSyncCron(schedule: string): string | null {
  const s = schedule.trim();
  if (!s) return null;

  // Already a valid cron expression — use it directly.
  if (validate(s)) return s;

  // Legacy shorthands (unchanged matching from the original parser).
  const m = /\*\/(\d+)\s*(min(?:utes?)?|h(?:ours?)?)/i.exec(s)
         ?? /every\s+(\d+)\s*(m(?:in)?|h(?:r?)?)/i.exec(s);
  if (!m) return null;

  const n = parseInt(m[1]!, 10);
  const isHours = m[2]!.toLowerCase().startsWith('h');
  if (isHours) return n >= 1 && n <= 23 ? `0 */${n} * * *` : null;
  return n >= 1 && n <= 59 ? `*/${n} * * * *` : null;
}
