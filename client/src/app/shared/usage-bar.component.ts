/**
 * UsageBar — one "X of Y used" bar with health thresholds (settings design system, PR-U1).
 *
 * Consolidates two separate implementations (storage's `usage-bar-*` and about's `disk-bar-*`) that
 * rendered the same concept differently. Colour tracks the fill level: ok → warn (≥ warnAtPercent) →
 * danger (≥ 95%).
 *
 * Usage:  <app-usage-bar [used]="usedGiB" [total]="limitGiB" [warnAtPercent]="80"/>
 */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UsageLevel = 'ok' | 'warn' | 'danger';

/** Pure level classifier — exported for testing. */
export function usageLevel(pct: number, warnAtPercent: number): UsageLevel {
  if (pct >= 95) return 'danger';
  if (pct >= warnAtPercent) return 'warn';
  return 'ok';
}

@Component({
  selector: 'app-usage-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .track { height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }
    .fill  { height: 100%; border-radius: 4px; transition: width .4s ease, background .2s ease; }
    .fill.ok     { background: var(--accent); }
    .fill.warn   { background: var(--warning); }
    .fill.danger { background: var(--error); }
  `],
  template: `
    <div class="track" role="progressbar" [attr.aria-valuenow]="pct().toFixed(0)" aria-valuemin="0" aria-valuemax="100">
      <div class="fill" [class]="level()" [style.width.%]="width()"></div>
    </div>
  `,
})
export class UsageBarComponent {
  used = input.required<number>();
  total = input<number | null>(null);
  warnAtPercent = input<number>(80);

  protected pct = computed(() => { const t = this.total(); return t && t > 0 ? (this.used() / t) * 100 : 0; });
  protected width = computed(() => Math.min(Math.max(this.pct(), 0), 100));
  protected level = computed(() => usageLevel(this.pct(), this.warnAtPercent()));
}
