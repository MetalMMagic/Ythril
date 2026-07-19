import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { type AboutInfo } from '../../core/api.types';
import { AdminApi } from '../../core/admin-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import { StatusPillComponent, type StatusVariant } from '../../shared/status-pill.component';
import { UsageBarComponent, usageLevel } from '../../shared/usage-bar.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslocoPipe, SettingsCardComponent, StatusPillComponent, UsageBarComponent, ErrorStateComponent],
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      align-items: start;
    }
    .kv { display: grid; grid-template-columns: minmax(84px, 132px) 1fr; gap: 7px 14px; font-size: 13px; }
    .kv .k { color: var(--text-secondary); }
    .kv .v { color: var(--text-primary); word-break: break-word; }
    .mono { font-family: var(--font-mono, monospace); font-size: 0.9em; }

    .disk { margin-top: 14px; }
    .disk-fig {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;
    }
    .disk-fig .pct { font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
  `,
  template: `
    @if (loading()) {
      <p>{{ 'common.loading' | transloco }}</p>
    } @else if (error()) {
      <app-error-state
        [message]="'about.error.load' | transloco"
        [reason]="error()"
        (retry)="reload()" />
    } @else if (info(); as i) {
      <div class="grid">
        <app-settings-card icon="info"
                           [heading]="'about.card.instance' | transloco"
                           [purpose]="'about.card.instanceDesc' | transloco">
          <app-status-pill pill variant="active" [dot]="true">{{ 'about.status.online' | transloco }}</app-status-pill>
          <div class="kv">
            <span class="k">{{ 'about.instanceLabel' | transloco }}</span>
            <span class="v">{{ i.instanceLabel }}</span>

            <span class="k">{{ 'about.instanceId' | transloco }}</span>
            <span class="v mono">{{ i.instanceId }}</span>

            <span class="k">{{ 'about.version' | transloco }}</span>
            <span class="v mono">{{ i.version }}</span>

            @if (i.publicUrl) {
              <span class="k">{{ 'about.publicUrl' | transloco }}</span>
              <span class="v mono">{{ i.publicUrl }}</span>
            }
          </div>
        </app-settings-card>

        <app-settings-card icon="database"
                           [heading]="'about.card.system' | transloco"
                           [purpose]="'about.card.systemDesc' | transloco">
          <app-status-pill pill [variant]="diskHealth().variant" [dot]="true">{{ diskHealth().label | transloco }}</app-status-pill>
          <div class="kv">
            <span class="k">{{ 'about.mongoVersion' | transloco }}</span>
            <span class="v mono">{{ i.mongoVersion }}</span>

            <span class="k">{{ 'about.uptime' | transloco }}</span>
            <span class="v">{{ i.uptime }}</span>
          </div>

          <div class="disk">
            <div class="disk-fig">
              <span>{{ 'about.diskUsage' | transloco }}</span>
              <span><span class="pct">{{ diskPercent().toFixed(1) }}%</span> · {{ formatBytes(i.diskInfo.used) }} / {{ formatBytes(i.diskInfo.total) }}</span>
            </div>
            <app-usage-bar [used]="i.diskInfo.used" [total]="i.diskInfo.total" [warnAtPercent]="80" />
          </div>
        </app-settings-card>
      </div>
    }
  `,
})
export class AboutComponent implements OnInit {
  private adminApi = inject(AdminApi);

  loading = signal(true);
  error = signal('');
  info = signal<AboutInfo | null>(null);
  diskPercent = signal(0);

  /**
   * Disk health for the System-card pill. Derived from the SAME `usageLevel` classifier the shared
   * UsageBar uses (warn ≥ 80%, danger ≥ 95%), so the pill and the bar can never disagree and the
   * signal reads identically to the Storage page.
   */
  diskHealth = computed<{ variant: StatusVariant; label: string }>(() => {
    switch (usageLevel(this.diskPercent(), 80)) {
      case 'danger': return { variant: 'error', label: 'about.disk.critical' };
      case 'warn':   return { variant: 'warn',  label: 'about.disk.high' };
      default:       return { variant: 'ok',    label: 'about.disk.healthy' };
    }
  });

  ngOnInit(): void { this.load(); }

  reload(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminApi.getAbout().subscribe({
      next: (data) => {
        this.info.set(data);
        const d = data.diskInfo;
        this.diskPercent.set(d.total > 0 ? (d.used / d.total) * 100 : 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Failed to load about info');
        this.loading.set(false);
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
