import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DuplicateRecord } from '../../core/api.types';
import { DuplicatesApi } from '../../core/duplicates-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SummaryStripComponent, type SummaryItem } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-duplicates',
  standalone: true,
  imports: [FormsModule, PhIconComponent, TranslocoPipe, SummaryStripComponent, StatusPillComponent, RelativeTimeComponent],
  styles: [`
    .page-title { margin: 0 0 4px; font-size: 18px; }
    .intro { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }
    .strip-ctl { display: flex; align-items: center; gap: 8px; }
    .strip-ctl select { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); }

    .dup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; margin-top: 16px; }
    .dup-card { border: 1px solid var(--border); border-radius: 10px; background: var(--bg-surface); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
    .dup-card-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
    .dup-type { color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; }
    .dup-when { color: var(--text-muted); font-size: 11px; margin-left: auto; }

    .conf { display: inline-flex; align-items: center; gap: 6px; }
    .conf-track { width: 54px; height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; }
    .conf-fill { height: 100%; border-radius: 3px; transition: width .3s ease; }
    .conf-fill.high { background: var(--accent); }
    .conf-fill.mid  { background: var(--info); }
    .conf-fill.low  { background: var(--text-muted); }
    .conf-pct { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }

    .dup-ab { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: stretch; }
    .dup-rec { border: 1px solid var(--border-muted); border-radius: 8px; padding: 8px 9px; background: var(--bg-primary); min-width: 0; }
    .dup-rec-l { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
    .dup-rec-txt { font-size: 12px; white-space: pre-wrap; word-break: break-word; color: var(--text-primary); }
    .dup-rec.b .dup-rec-txt { color: var(--text-secondary); }
    .dup-vs { display: flex; align-items: center; color: var(--text-muted); font-size: 11px; font-style: italic; }

    .dup-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    .dup-resolved { font-size: 12px; color: var(--success); text-align: right; }
  `],
  template: `
    <h2 class="page-title">{{ 'duplicates.title' | transloco }}</h2>
    <p class="intro">{{ 'duplicates.intro' | transloco }}</p>

    <app-summary-strip [items]="summaryItems()">
      <div class="strip-ctl">
        <select [(ngModel)]="statusFilter" (change)="load()" [attr.aria-label]="'duplicates.statusFilterAria' | transloco">
          <option value="open">{{ 'duplicates.status.open' | transloco }}</option>
          <option value="dismissed">{{ 'duplicates.status.dismissed' | transloco }}</option>
          <option value="all">{{ 'duplicates.status.all' | transloco }}</option>
        </select>
        <button class="btn btn-sm btn-secondary" (click)="scan()" [disabled]="scanning()">
          @if (scanning()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
          {{ 'duplicates.scanNow' | transloco }}
        </button>
      </div>
    </app-summary-strip>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (error()) {
      <div class="alert alert-warning" style="margin-top:16px;">{{ 'duplicates.loadError' | transloco }}</div>
    } @else if (rows().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
        <h3>{{ 'duplicates.empty.title' | transloco }}</h3>
        <p>{{ 'duplicates.empty.body' | transloco }}</p>
      </div>
    } @else {
      <div class="dup-grid">
        @for (d of rows(); track d.id) {
          <div class="dup-card">
            <div class="dup-card-h">
              <span class="badge badge-blue mono">{{ d.spaceId }}</span>
              <span class="dup-type">{{ d.type }}</span>
              <span class="conf" [attr.title]="'duplicates.confidence' | transloco">
                <span class="conf-track"><span class="conf-fill" [class]="scoreVariant(d.score)" [style.width.%]="scorePct(d.score)"></span></span>
                <span class="conf-pct">{{ scorePct(d.score) }}%</span>
              </span>
              @if (d.status !== 'open') {
                <app-status-pill [variant]="d.status === 'resolved' ? 'ok' : 'off'">{{ ('duplicates.status.' + d.status) | transloco }}</app-status-pill>
              }
              <span class="dup-when"><app-relative-time [value]="d.detectedAt"/></span>
            </div>

            <div class="dup-ab">
              <div class="dup-rec">
                <div class="dup-rec-l">{{ 'duplicates.table.recordA' | transloco }}</div>
                <div class="dup-rec-txt">{{ d.aSummary }}</div>
              </div>
              <div class="dup-vs">{{ 'duplicates.vs' | transloco }}</div>
              <div class="dup-rec b">
                <div class="dup-rec-l">{{ 'duplicates.table.recordB' | transloco }}</div>
                <div class="dup-rec-txt">{{ d.bSummary }}</div>
              </div>
            </div>

            @if (d.status === 'resolved') {
              @if (d.resolution) {
                <div class="dup-resolved">{{ ('duplicates.resolution.' + d.resolution) | transloco }}</div>
              }
            } @else {
              <div class="dup-actions">
                @if (d.type === 'entity') {
                  <button class="btn btn-sm btn-primary" (click)="merge(d)" [disabled]="busy() === d.id">{{ 'duplicates.merge' | transloco }}</button>
                }
                <button class="btn btn-sm btn-secondary" (click)="dismiss(d)" [disabled]="busy() === d.id">
                  <ph-icon name="x" [size]="14" style="margin-right:4px;vertical-align:-2px;"/>{{ 'duplicates.dismiss' | transloco }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class DuplicatesComponent implements OnInit {
  private duplicatesApi = inject(DuplicatesApi);
  private transloco = inject(TranslocoService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  loading = signal(true);
  error = signal(false);
  scanning = signal(false);
  busy = signal<string | null>(null);
  rows = signal<DuplicateRecord[]>([]);
  statusFilter: 'open' | 'dismissed' | 'all' = 'open';

  /** Operator-first rollup atop the list: how many still need attention + how strong the matches are. */
  summaryItems = computed<SummaryItem[]>(() => {
    const list = this.rows();
    const open = list.filter(r => r.status === 'open').length;
    const scores = list.map(r => r.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return [
      { label: this.transloco.translate('duplicates.summary.open'), value: String(open), variant: open ? 'warn' : 'ok' },
      { label: this.transloco.translate('duplicates.summary.avgScore'), value: scores.length ? `${Math.round(avg * 100)}%` : '—' },
      { label: this.transloco.translate('duplicates.summary.shown'), value: String(list.length) },
    ];
  });

  scorePct(s: number): number { return Math.round(Math.min(Math.max(s, 0), 1) * 100); }
  scoreVariant(s: number): 'high' | 'mid' | 'low' { return s >= 0.95 ? 'high' : s >= 0.85 ? 'mid' : 'low'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.duplicatesApi.listDuplicates(this.statusFilter).subscribe({
      next: ({ duplicates }) => { this.rows.set(duplicates); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  scan(): void {
    this.scanning.set(true);
    this.duplicatesApi.scanDuplicates().subscribe({
      next: () => { this.scanning.set(false); this.load(); },
      error: (e) => {
        this.scanning.set(false);
        this.toast.error(this.transloco.translate(e?.status === 403 ? 'duplicates.scanForbidden' : 'duplicates.scanError'));
      },
    });
  }

  async dismiss(d: DuplicateRecord): Promise<void> {
    // Guarded: dismissing hides the pair from the open list, so confirm before discarding it (U8).
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('duplicates.confirmDismissTitle'),
      message: this.transloco.translate('duplicates.confirmDismiss'),
      confirmLabel: this.transloco.translate('duplicates.dismiss'),
    });
    if (!ok) return;
    this.busy.set(d.id);
    this.duplicatesApi.dismissDuplicate(d.id).subscribe({
      next: () => { this.rows.update(list => this.statusFilter === 'open' ? list.filter(x => x.id !== d.id) : list.map(x => x.id === d.id ? { ...x, status: 'dismissed' } : x)); this.busy.set(null); },
      error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.dismissError')); },
    });
  }

  async merge(d: DuplicateRecord): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('duplicates.confirmMergeTitle'),
      message: this.transloco.translate('duplicates.confirmMerge'),
      confirmLabel: this.transloco.translate('duplicates.mergeButton'),
    });
    if (!ok) return;
    this.busy.set(d.id);
    this.duplicatesApi.mergeDuplicate(d.id).subscribe({
      next: () => { this.rows.update(list => list.filter(x => x.id !== d.id)); this.busy.set(null); },
      error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.mergeError')); },
    });
  }
}
