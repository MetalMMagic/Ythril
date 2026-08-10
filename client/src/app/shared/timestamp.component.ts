/**
 * Timestamp — one absolute-time treatment for every data table.
 *
 * Date on the first line, local time with SECONDS on the second. Owner request, 2026-08-10: *"in data tables
 * timestamps should also show the time rendered in local time below the date with precision: seconds"*.
 *
 * ## What it replaces
 *
 * Measured before writing it: **23 `| date:` usages in five different formats** — `dd.MM.yyyy HH:mm` ×11,
 * `yyyy-MM-dd HH:mm:ss` ×5, `dd.MM.yyyy` ×4, `dd.MM.yy` ×2, `mediumDate` ×1. Five formats exist because each table
 * formatted its own, so this is a drift fix as much as a feature, and a sixth spelling of the same idea is how it
 * recurs.
 *
 * The two-line stack is the treatment the owner already approved for the tokens table — *"last used and expires
 * should be date and below time"* — generalised. The complaint behind it was `expires tomorrow`, which "makes me
 * wonder when tomorrow": a relative label needs the absolute one AVAILABLE, not replaced. So this does not compete
 * with `RelativeTime`; use that where "3 minutes ago" is the useful answer and this where the exact moment is.
 *
 * ## RENDERING ONLY
 *
 * Owner, 2026-08-10: *"dont change the 'we save utc' stance. just for rendering local"*. Storage, the wire format,
 * the API, sync and the audit log all stay UTC ISO strings. The local time exists in the DOM and nowhere else.
 *
 * That boundary is the one most likely to be crossed by accident, so this component is built to make crossing it
 * hard rather than to trust nobody will:
 *
 *  - it takes the **UTC value** and converts at render time, never the other way round;
 *  - `datetime` on the `<time>` element carries the **original UTC ISO string**, so anything reading the DOM
 *    programmatically — a test, a scraper, a copy-paste — gets UTC, not a localised string;
 *  - it exposes `sortKey()` returning epoch-ms, because a table that sorts on the RENDERED TEXT is the specific way
 *    this goes wrong. `01.02.2026` sorts before `02.01.2025` as a string. A timezone bug in stored data is invisible
 *    until someone in another offset reads it, and a sort bug is invisible until the rows happen to disagree.
 *
 * ## Seconds are the point
 *
 * `HH:mm` is the current majority format and drops them. An audit log where two entries share a minute is unreadable
 * without seconds, which is exactly where an operator looks hardest.
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TimestampValue = string | number | Date | null | undefined;

/** Epoch-ms from an ISO string / epoch-ms / Date, or null when unparseable. Exported for testing and sorting. */
export function toEpochMs(value: TimestampValue): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * The two lines, in the VIEWER's timezone.
 *
 * `Intl` rather than manual padding: it honours the locale's date order, which is the whole reason five hand-rolled
 * formats existed. `hourCycle: 'h23'` is pinned because a table with `11:59:03 PM` in one row and `23:59:03` in
 * another — which is what happens when the locale decides — cannot be scanned down a column.
 *
 * Pure, and `locale`/`timeZone` are parameters so a test is not at the mercy of the machine it runs on. That is not
 * hypothetical care: a test asserting a local rendering without pinning the zone passes in one office and fails in
 * the next.
 */
export function formatTimestampParts(
  value: TimestampValue,
  locale?: string,
  timeZone?: string,
): { date: string; time: string; iso: string } | null {
  const t = toEpochMs(value);
  if (t === null) return null;
  const d = new Date(t);
  // `de-DE` by default, and that is deliberate rather than an oversight.
  //
  // The instruction was to render the local TIME — the zone. Taking the viewer's locale for the date as well would
  // make the field ORDER vary by browser: `15.01.2026` here, `01/15/2026` there, for the same row on the same
  // instance. This app has an explicit `dd.MM.yyyy` convention in eleven places, and a spec asserting it caught the
  // switch immediately. Varying the format by browser would also undo the point of the component, which is that a
  // column can be scanned.
  //
  // So the ZONE is the viewer's and the FORMAT is fixed. `locale` stays an input for tests and for a future explicit
  // per-user preference — a deliberate setting rather than whatever the browser happens to be.
  const opts: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : {};
  const fmt = locale ?? 'de-DE';
  return {
    date: new Intl.DateTimeFormat(fmt, { ...opts, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
    time: new Intl.DateTimeFormat(fmt, { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d),
    // The ORIGINAL instant, in UTC. Never the localised string — see the class comment on why the DOM must stay UTC.
    iso: d.toISOString(),
  };
}

@Component({
  selector: 'app-timestamp',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: inline-block; font-variant-numeric: tabular-nums; line-height: 1.25; }
    .d { display: block; }
    /* The time is secondary: an operator scans dates first and reads the time on the row they stopped at. Dimmed
       rather than smaller alone, because two lines of identical weight read as two separate values. */
    .t { display: block; font-size: .85em; color: var(--text-muted); }
    .empty { color: var(--text-muted); }
  `],
  template: `
    @if (parts(); as p) {
      <time [attr.datetime]="p.iso" [attr.title]="p.iso">
        <span class="d">{{ p.date }}</span><span class="t">{{ p.time }}</span>
      </time>
    } @else {
      <span class="empty">{{ empty() }}</span>
    }
  `,
})
export class TimestampComponent {
  value = input.required<TimestampValue>();
  /** What to show when there is no timestamp. A dash, not an empty cell — an empty cell reads as a layout bug. */
  empty = input<string>('—');
  /**
   * Overridable for tests and for a future per-user preference. Undefined means the app's fixed `dd.MM.yyyy`, NOT the
   * browser's locale — see `formatTimestampParts` on why the field order must not vary by viewer.
   */
  locale = input<string | undefined>(undefined);
  timeZone = input<string | undefined>(undefined);

  readonly parts = computed(() => formatTimestampParts(this.value(), this.locale(), this.timeZone()));

  /**
   * Epoch-ms, for a caller that sorts a column of these.
   *
   * Exposed so nobody sorts the rendered text. `01.02.2026` before `02.01.2025` is a real ordering a string
   * comparison produces, and it looks plausible enough to survive review.
   */
  readonly sortKey = computed(() => toEpochMs(this.value()));
}
