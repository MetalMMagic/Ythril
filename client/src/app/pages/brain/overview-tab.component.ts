/**
 * Brain → Overview tab (F9, slice 1).
 *
 * The space's landing view: a governance/health dashboard assembled over data the Brain shell already
 * holds, so it adds no fetch of its own. Presentational by design — `space` and `stats` come in as
 * inputs (the shell preloads them for every space), and the one action, Reindex, is emitted back to the
 * shell's existing reindex flow behind a confirm.
 *
 * Slice 1 ships two panels — Statistics and Indexing. Embedding-queue, networks, governance, token
 * access and health panels are deliberately later slices (they carry admin-gating and per-instance
 * questions that this per-space, non-admin-sensitive slice does not).
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { StatusPillComponent, StatusVariant } from '../../shared/status-pill.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { Space, SpaceStats } from '../../core/api.types';

interface StatCard { key: string; icon: string; label: string; value: number }

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, StatusPillComponent],
  styles: [`
    :host { display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start; }
    .panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .panel-h { display: flex; align-items: center; gap: 9px; padding: 13px 16px; border-bottom: 1px solid var(--border-muted); }
    .panel-h .ic { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none;
      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .panel-h h3 { margin: 0; font-size: 14px; font-weight: 620; }
    .panel-h p { margin: 1px 0 0; font-size: 12px; color: var(--text-secondary); }
    .panel-b { padding: 14px 16px; }

    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 10px; }
    .stat { background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: 8px; padding: 11px 12px; }
    .stat .v { font-size: 22px; font-weight: 700; font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; line-height: 1.1; }
    .stat .l { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); }
    .stat.total { border-color: color-mix(in srgb, var(--accent) 45%, transparent);
      background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }
    .stat.total .v { color: var(--accent-ink, var(--accent)); }

    .store { margin-top: 14px; }
    .store-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 12.5px; }
    .store-row .cap { color: var(--text-secondary); }
    .store-row .num { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; color: var(--text-primary); }
    .bar { height: 7px; border-radius: 4px; background: var(--bg-elevated); margin-top: 7px; overflow: hidden; border: 1px solid var(--border-muted); }
    .bar > span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
    .bar > span.warn { background: var(--warning); } .bar > span.err { background: var(--error); }

    .idx-row { display: flex; align-items: center; gap: 10px; }
    .idx-row .lab { font-size: 13px; color: var(--text-secondary); flex: 1; }
    .reindex-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 13px; padding: 10px 12px;
      border-radius: 8px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }
    .reindex-note ph-icon { flex: none; margin-top: 1px; color: var(--warning); }
    .actions { margin-top: 13px; }
    .muted { color: var(--text-muted); font-size: 12.5px; }
  `],
  template: `
    <div class="grid">
      <!-- ── Statistics ─────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="chart-bar" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.statsTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.statsHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          @if (stats(); as s) {
            <div class="stat-grid">
              @for (c of statCards(); track c.key) {
                <div class="stat">
                  <div class="v">{{ c.value }}</div>
                  <div class="l"><ph-icon [name]="c.icon" [size]="13"/>{{ c.label | transloco }}</div>
                </div>
              }
              <div class="stat total">
                <div class="v">{{ total() }}</div>
                <div class="l">{{ 'brain.overview.total' | transloco }}</div>
              </div>
            </div>

            <div class="store">
              <div class="store-row">
                <span class="cap">{{ 'brain.overview.storage' | transloco }}</span>
                @if (space().maxGiB) {
                  <span class="num">{{ used() }} / {{ space().maxGiB }} GiB</span>
                } @else {
                  <span class="num">{{ used() }} GiB · {{ 'brain.overview.storageUnlimited' | transloco }}</span>
                }
              </div>
              @if (usagePct(); as pct) {
                <div class="bar"><span [class.warn]="pct >= 80 && pct < 95" [class.err]="pct >= 95" [style.width.%]="pct"></span></div>
              }
            </div>
          } @else {
            <span class="muted">{{ 'brain.overview.statsLoading' | transloco }}</span>
          }
        </div>
      </section>

      <!-- ── Indexing ───────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="database" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.indexingTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.indexingHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          <div class="idx-row">
            <span class="lab">{{ 'brain.overview.vectorIndex' | transloco }}</span>
            <app-status-pill [variant]="indexVariant()" [dot]="true">{{ 'brain.overview.idx.' + indexState() | transloco }}</app-status-pill>
          </div>

          @if (needsReindex()) {
            <div class="reindex-note">
              <ph-icon name="warning" [size]="15"/>
              <span>{{ 'brain.overview.reindexNeeded' | transloco }}</span>
            </div>
          }

          <div class="actions">
            <button class="btn btn-sm btn-secondary" type="button" [disabled]="reindexing()" (click)="requestReindex()">
              @if (reindexing()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
              <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:5px;vertical-align:-2px;"/>{{ 'brain.overview.reindexButton' | transloco }}
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class OverviewTabComponent {
  space = input.required<Space>();
  stats = input<SpaceStats | undefined>(undefined);
  reindexing = input(false);
  needsReindex = input(false);
  /** Emitted (after a confirm) so the shell's existing reindex flow runs — no duplicate API path. */
  reindex = output<void>();

  private confirmDialog = inject(ConfirmDialogService);
  private transloco = inject(TranslocoService);

  total = computed(() => {
    const s = this.stats();
    return s ? s.memories + s.entities + s.edges + s.chrono + s.files : 0;
  });

  statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { key: 'memories', icon: 'brain', label: 'brain.overview.rec.memories', value: s.memories },
      { key: 'entities', icon: 'stack', label: 'brain.overview.rec.entities', value: s.entities },
      { key: 'edges', icon: 'graph', label: 'brain.overview.rec.edges', value: s.edges },
      { key: 'chrono', icon: 'timer', label: 'brain.overview.rec.chrono', value: s.chrono },
      { key: 'files', icon: 'folder', label: 'brain.overview.rec.files', value: s.files },
    ];
  });

  /** Two decimals of GiB, without trailing noise. */
  used(): string { return (this.space().usageGiB ?? 0).toFixed(2); }

  usagePct(): number | null {
    const sp = this.space();
    if (!sp.maxGiB) return null;
    return Math.min(100, ((sp.usageGiB ?? 0) / sp.maxGiB) * 100);
  }

  /** Space.indexStatus is optional (proxy/legacy spaces have none) → 'none'. */
  indexState(): 'ready' | 'building' | 'failed' | 'none' {
    return this.space().indexStatus ?? 'none';
  }

  indexVariant(): StatusVariant {
    switch (this.indexState()) {
      case 'ready': return 'ok';
      case 'building': return 'warn';
      case 'failed': return 'error';
      default: return 'off';
    }
  }

  async requestReindex(): Promise<void> {
    if (this.reindexing()) return;
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('brain.overview.confirmReindexTitle'),
      message: this.transloco.translate('brain.overview.confirmReindex', { label: this.space().label }),
      confirmLabel: this.transloco.translate('brain.overview.reindexButton'),
      danger: true,
    });
    if (!ok) return;
    this.reindex.emit();
  }
}
