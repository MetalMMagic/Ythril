import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { UsageBarComponent, usageLevel } from '../../shared/usage-bar.component';
import { StatusPillComponent, type StatusVariant } from '../../shared/status-pill.component';

interface StorageData {
  usageGiB: { files: number; brain: number; total: number };
  limits?: { totalLimitGiB?: number; warnAtPercent?: number };
}

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, UsageBarComponent, StatusPillComponent],
  styles: [`

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .row .label { color: var(--text-secondary); }
    .row .value { font-weight: 500; color: var(--text-primary); }
  `],
  template: `
    <div class="page-header" style="margin-bottom:16px;">
      <div class="card-title">{{ 'metrics.title' | transloco }}</div>
    </div>

    <button class="btn-secondary btn btn-sm" style="margin-bottom:20px;" [disabled]="loading()" (click)="load()">
      @if (loading()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
      {{ 'metrics.refreshButton' | transloco }}
    </button>

    @if (error()) {
      <div class="alert alert-error">{{ 'metrics.error.load' | transloco }}</div>
    } @else if (!data()) {
      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {
        <div class="alert alert-info">{{ 'metrics.empty' | transloco }}</div>
      }
    } @else {
      @let pct = usagePct();
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.totalUsed' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.total) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.brain' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.brain) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ 'metrics.stat.files' | transloco }}</div>
          <div class="stat-value">{{ fmt(data()!.usageGiB.files) }}</div>
          <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
        </div>
        @if (data()!.limits?.totalLimitGiB) {
          <div class="stat-card">
            <div class="stat-label">{{ 'metrics.stat.limit' | transloco }}</div>
            <div class="stat-value">{{ data()!.limits!.totalLimitGiB }}</div>
            <div class="stat-sub">{{ 'metrics.stat.unit' | transloco }}</div>
          </div>
        }
      </div>

      @if (data()!.limits?.totalLimitGiB) {
        <div class="card" style="margin-bottom:20px;">
          <div class="row">
            <span class="label" style="display:inline-flex; align-items:center; gap:8px;">
              {{ 'metrics.bar.usage' | transloco }}
              @if (healthPill(); as h) { <app-status-pill [variant]="h.variant">{{ h.key | transloco }}</app-status-pill> }
            </span>
            <span class="value">{{ pct.toFixed(1) }}%</span>
          </div>
          <app-usage-bar
            [used]="data()!.usageGiB.total"
            [total]="data()!.limits!.totalLimitGiB!"
            [warnAtPercent]="data()!.limits?.warnAtPercent ?? 80"
            style="display:block; margin:8px 0 6px;"
          />
          <div style="font-size:11px; color:var(--text-muted);">
            {{ fmt(data()!.usageGiB.total) }} of {{ data()!.limits!.totalLimitGiB }} GiB
          </div>
        </div>
      }

      @if (data()!.limits?.totalLimitGiB) {
        @if (pct >= 95) {
          <div class="alert alert-error">
            {{ 'metrics.alert.full' | transloco }}
          </div>
        } @else if (pct >= (data()!.limits?.warnAtPercent ?? 80)) {
          <div class="alert alert-warning">
            {{ 'metrics.alert.warning' | transloco }}
          </div>
        }
      }
    }
  `,
})
export class StorageComponent implements OnInit {
  private spacesApi = inject(SpacesApi);
  protected Math = Math;

  data = signal<StorageData | null>(null);
  loading = signal(true);
  /** Distinct from `!data()`: a load *failure*, so a successful-but-empty response isn't shown as an error. */
  error = signal(false);

  /** Derived from `data()` so it can never render a stale percentage against a prior/absent load. */
  usagePct = computed(() => {
    const d = this.data();
    const limit = d?.limits?.totalLimitGiB;
    return limit ? (d!.usageGiB.total / limit) * 100 : 0;
  });

  /** Storage health as a status pill — only meaningful when a limit is configured. */
  healthPill = computed<{ variant: StatusVariant; key: string } | null>(() => {
    const d = this.data();
    if (!d?.limits?.totalLimitGiB) return null;
    const level = usageLevel(this.usagePct(), d.limits.warnAtPercent ?? 80);
    return {
      ok:     { variant: 'ok' as StatusVariant,    key: 'metrics.health.ok' },
      warn:   { variant: 'warn' as StatusVariant,  key: 'metrics.health.warn' },
      danger: { variant: 'error' as StatusVariant, key: 'metrics.health.full' },
    }[level];
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.spacesApi.listSpaces().subscribe({
      next: ({ storage }) => {
        this.data.set(storage ? (storage as StorageData) : null);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  fmt(v: number): string { return v.toFixed(2); }
}
