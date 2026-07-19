/**
 * RelativeTime — one timestamp treatment for the whole app (settings design system, PR-U1).
 *
 * Before this, three date formats coexisted (`dd.MM.yyyy`, `date:'short'`, `toLocaleString()`), none
 * tabular, none relative — so scanning "which token expires soonest / which webhook failed most
 * recently" down a column was hard. This renders a locale-aware relative label ("2 hours ago") with the
 * absolute time on hover, tabular-nums, and a machine-readable <time datetime>.
 *
 * Usage:  <app-relative-time [value]="token.lastUsed"/>
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

type TimeValue = string | number | Date | null | undefined;

/** Parse an ISO string / epoch-ms / Date to epoch-ms, or null if unparseable. Exported for testing. */
export function toEpochMs(value: TimeValue): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Locale-aware "2 hours ago" / "in 3 days" via `Intl.RelativeTimeFormat`. Pure — pass `nowMs` (and
 * optionally a locale) so it's deterministic under test. Picks the largest sensible unit.
 */
export function formatRelativeTime(value: TimeValue, nowMs: number, locale = 'en'): string {
  const t = toEpochMs(value);
  if (t === null) return '';
  const diff = t - nowMs;            // negative = past
  const a = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H, W = 7 * D, MO = 30 * D, Y = 365 * D;
  if (a < M)  return rtf.format(Math.round(diff / S),  'second');
  if (a < H)  return rtf.format(Math.round(diff / M),  'minute');
  if (a < D)  return rtf.format(Math.round(diff / H),  'hour');
  if (a < W)  return rtf.format(Math.round(diff / D),  'day');
  if (a < MO) return rtf.format(Math.round(diff / W),  'week');
  if (a < Y)  return rtf.format(Math.round(diff / MO), 'month');
  return rtf.format(Math.round(diff / Y), 'year');
}

@Component({
  selector: 'app-relative-time',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`time { font-variant-numeric: tabular-nums; white-space: nowrap; }`],
  template: `<time [attr.datetime]="iso()" [title]="absolute()">{{ rel() }}</time>`,
})
export class RelativeTimeComponent {
  private transloco = inject(TranslocoService);
  value = input.required<TimeValue>();

  private locale = () => this.transloco.getActiveLang() || 'en';
  protected iso = computed(() => { const t = toEpochMs(this.value()); return t === null ? '' : new Date(t).toISOString(); });
  protected absolute = computed(() => { const t = toEpochMs(this.value()); return t === null ? '' : new Date(t).toLocaleString(this.locale()); });
  // Date.now() is read on each change-detection pass — fresh enough for settings screens (no live ticking).
  protected rel = computed(() => formatRelativeTime(this.value(), Date.now(), this.locale()));
}
