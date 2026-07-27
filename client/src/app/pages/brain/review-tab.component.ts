import { Component, inject, signal, computed, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DuplicateRecord, ContradictionRecord } from '../../core/api.types';
import { DuplicatesApi } from '../../core/duplicates-api.service';
import { ContradictionsApi } from '../../core/contradictions-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SummaryStripComponent, type SummaryItem } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { RelativeTimeComponent } from '../../shared/relative-time.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-review-tab',
  standalone: true,
  imports: [FormsModule, PhIconComponent, TranslocoPipe, SummaryStripComponent, StatusPillComponent, RelativeTimeComponent],
  styles: [`
    .page-title { margin: 0 0 4px; font-size: 18px; }
    .intro { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }
    .strip-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .strip-ctl select { font-size: 13px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); }
    .dup-search { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-primary); color: var(--text-muted); }
    .dup-search input { border: 0; background: transparent; color: var(--text-primary); font-size: 13px; outline: none; width: 150px; }

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

    .con-fields { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .con-fields li { display: flex; align-items: baseline; gap: 7px; font-size: 12px; flex-wrap: wrap; }
    .con-key { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-muted); }
    .con-a, .con-b { font-weight: 600; color: var(--text-primary); }
    .con-sep { color: var(--text-muted); font-style: italic; font-size: 11px; }

    .dup-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    .dup-resolved { font-size: 12px; color: var(--success); text-align: right; }
  `],
  template: `
    <h2 class="page-title">{{ 'review.title' | transloco }}</h2>

    <!-- Sub-tabs, not a compact toggle: this is the space's record-QA queue and it will grow past two
         views (contradictions now, orphans / schema violations later). A full tab strip keeps them all
         discoverable and reuses the same affordance as every other tab in the app, rather than hiding
         the second view behind a control people have to notice. -->
    <nav class="tabs" role="tablist" [attr.aria-label]="'review.title' | transloco">
      @for (t of SUBTABS; track t) {
        <button class="tab" type="button" role="tab" [class.active]="sub() === t"
          [attr.aria-selected]="sub() === t" [attr.id]="'review-tab-' + t"
          [attr.aria-controls]="'review-panel-' + t" (click)="sub.set(t)">
          {{ 'review.sub.' + t | transloco }}
        </button>
      }
    </nav>

    @if (sub() === 'contradictions') {
      <section role="tabpanel" id="review-panel-contradictions" aria-labelledby="review-tab-contradictions">
        <p class="intro">{{ 'review.contradictions.intro' | transloco }}</p>
        @if (conLoading()) {
          <div class="loading-overlay"><span class="spinner"></span></div>
        } @else if (conRows().length === 0) {
          <div class="empty-state">
            <div class="empty-state-icon"><ph-icon name="warning" [size]="48"/></div>
            <h3>{{ 'review.contradictions.pendingTitle' | transloco }}</h3>
            <p>{{ 'review.contradictions.pendingBody' | transloco }}</p>
          </div>
        } @else {
          <div class="dup-grid">
            @for (c of conRows(); track c.id) {
              <div class="dup-card">
                <div class="dup-card-h">
                  <span class="dup-type">{{ c.type }}</span>
                  <!-- The basis, never a bare number: a deterministic field conflict and a model's opinion
                       are different kinds of claim, and a reviewer needs to tell them apart at a glance. -->
                  @if (c.basis === 'structured-field') {
                    <app-status-pill variant="warn">{{ 'review.contradictions.basis.structured' | transloco }}</app-status-pill>
                  } @else {
                    <app-status-pill variant="off">{{ 'review.contradictions.basis.nli' | transloco }}</app-status-pill>
                    <span class="conf" [attr.title]="'review.contradictions.confidence' | transloco">
                      <span class="conf-track"><span class="conf-fill" [class]="scoreVariant(c.confidence)" [style.width.%]="scorePct(c.confidence)"></span></span>
                      <span class="conf-pct">{{ scorePct(c.confidence) }}%</span>
                    </span>
                  }
                  @if (c.status !== 'open') {
                    <app-status-pill [variant]="c.status === 'resolved' ? 'ok' : 'off'">{{ ('duplicates.status.' + c.status) | transloco }}</app-status-pill>
                  }
                  <span class="dup-when"><app-relative-time [value]="c.detectedAt"/></span>
                </div>

                <!-- A structured verdict can NAME the disagreement; say what it is rather than asserting one. -->
                @if (c.fields?.length) {
                  <ul class="con-fields">
                    @for (f of c.fields; track f.key) {
                      <li><span class="con-key">{{ f.key }}</span>
                        <span class="con-a">{{ f.aValue }}</span>
                        <span class="con-sep">{{ 'review.contradictions.versus' | transloco }}</span>
                        <span class="con-b">{{ f.bValue }}</span></li>
                    }
                  </ul>
                }

                <div class="dup-ab">
                  <div class="dup-rec">
                    <div class="dup-rec-l">{{ 'duplicates.table.recordA' | transloco }}</div>
                    <div class="dup-rec-txt">{{ c.aSummary }}</div>
                  </div>
                  <div class="dup-vs">{{ 'review.contradictions.versus' | transloco }}</div>
                  <div class="dup-rec b">
                    <div class="dup-rec-l">{{ 'duplicates.table.recordB' | transloco }}</div>
                    <div class="dup-rec-txt">{{ c.bSummary }}</div>
                  </div>
                </div>

                <div class="dup-actions">
                  @if (c.status === 'dismissed') {
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="reopenContradiction(c)">
                      {{ 'duplicates.reRate' | transloco }}
                    </button>
                  } @else if (c.status === 'open') {
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="dismissContradiction(c)">
                      {{ 'duplicates.dismiss' | transloco }}
                    </button>
                    <!-- Contradictions are never merged: both records are real and which is wrong is a
                         judgement call, so the reviewer records HOW they settled it. -->
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="resolveContradiction(c, 'edited')">
                      {{ 'review.contradictions.action.edited' | transloco }}
                    </button>
                    <button class="btn btn-sm btn-secondary" type="button" [disabled]="conBusy() === c.id" (click)="resolveContradiction(c, 'linked')">
                      {{ 'review.contradictions.action.linked' | transloco }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>
    } @else {
    <section role="tabpanel" id="review-panel-duplicates" aria-labelledby="review-tab-duplicates">
    <p class="intro">{{ 'duplicates.intro' | transloco }}</p>

    <app-summary-strip [items]="summaryItems()">
      <div class="strip-ctl">
        <label class="dup-search">
          <ph-icon name="magnifying-glass" [size]="14"/>
          <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)"
            [placeholder]="'duplicates.searchPlaceholder' | transloco"
            [attr.aria-label]="'duplicates.searchPlaceholder' | transloco" />
        </label>
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
    } @else if (filteredRows().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
        @if (query().trim() && rows().length) {
          <h3>{{ 'duplicates.noMatches.title' | transloco }}</h3>
          <p>{{ 'duplicates.noMatches.body' | transloco }}</p>
        } @else {
          <h3>{{ 'duplicates.empty.title' | transloco }}</h3>
          <p>{{ 'duplicates.empty.body' | transloco }}</p>
        }
      </div>
    } @else {
      <div class="dup-grid">
        @for (d of filteredRows(); track d.id) {
          <div class="dup-card">
            <div class="dup-card-h">
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
            } @else if (d.status === 'dismissed') {
              <!-- A dismissed pair resurfaces on its own only if its content materially changes; this is
                   the manual way to bring it back for review sooner. -->
              <div class="dup-actions">
                <button class="btn btn-sm btn-secondary" (click)="reopen(d)" [disabled]="busy() === d.id">
                  <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:4px;vertical-align:-2px;"/>{{ 'duplicates.reRate' | transloco }}
                </button>
              </div>
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
    </section>
    }
  `,
})
export class ReviewTabComponent implements OnInit, OnChanges {
  private contradictionsApi = inject(ContradictionsApi);
  readonly conRows = signal<ContradictionRecord[]>([]);
  readonly conLoading = signal(false);
  readonly conBusy = signal<string | null>(null);

  /** Load this space's contradictions. Called on init, on space switch, and after every action. */
  loadContradictions(): void {
    this.conLoading.set(true);
    this.contradictionsApi.listContradictions('open', this.spaceId).subscribe({
      next: r => { this.conRows.set(r.contradictions); this.conLoading.set(false); },
      // A load failure must not read as "no contradictions" — the empty state would be a lie. Surface it
      // and leave whatever was already on screen.
      error: () => { this.conLoading.set(false); this.toast.error(this.transloco.translate('review.contradictions.loadError')); },
    });
  }

  dismissContradiction(c: ContradictionRecord): void {
    this.conBusy.set(c.id);
    this.contradictionsApi.dismissContradiction(c.id).subscribe({
      next: () => { this.conBusy.set(null); this.loadContradictions(); },
      error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
    });
  }

  reopenContradiction(c: ContradictionRecord): void {
    this.conBusy.set(c.id);
    this.contradictionsApi.reopenContradiction(c.id).subscribe({
      next: () => { this.conBusy.set(null); this.loadContradictions(); },
      error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
    });
  }

  resolveContradiction(c: ContradictionRecord, resolution: 'edited' | 'linked'): void {
    this.conBusy.set(c.id);
    this.contradictionsApi.resolveContradiction(c.id, resolution).subscribe({
      next: () => { this.conBusy.set(null); this.loadContradictions(); },
      error: () => { this.conBusy.set(null); this.toast.error(this.transloco.translate('duplicates.dismissError')); },
    });
  }

  /** Sub-views of the space's record-QA queue. Ordered as a reviewer meets them. */
  readonly SUBTABS = ['duplicates', 'contradictions'] as const;
  readonly sub = signal<'duplicates' | 'contradictions'>('duplicates');

  /** The space being reviewed. Required: this view is per-space now, never instance-wide. */
  @Input({ required: true }) spaceId = '';

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
  /** Free-text filter over the loaded list — a dismissed pile can grow large, so it is searchable. */
  query = signal('');

  /** The list actually shown: the loaded rows narrowed by the search box (summaries, type, space). */
  filteredRows = computed<DuplicateRecord[]>(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(r =>
      `${r.aSummary} ${r.bSummary} ${r.type} ${r.spaceId}`.toLowerCase().includes(q));
  });

  /** Operator-first rollup atop the list: how many still need attention + how strong the matches are. */
  summaryItems = computed<SummaryItem[]>(() => {
    const list = this.rows();
    const open = list.filter(r => r.status === 'open').length;
    const scores = list.map(r => r.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return [
      { label: this.transloco.translate('duplicates.summary.open'), value: String(open), variant: open ? 'warn' : 'ok' },
      { label: this.transloco.translate('duplicates.summary.avgScore'), value: scores.length ? `${Math.round(avg * 100)}%` : '—' },
      { label: this.transloco.translate('duplicates.summary.shown'), value: String(this.filteredRows().length) },
    ];
  });

  scorePct(s: number): number { return Math.round(Math.min(Math.max(s, 0), 1) * 100); }
  scoreVariant(s: number): 'high' | 'mid' | 'low' { return s >= 0.95 ? 'high' : s >= 0.85 ? 'mid' : 'low'; }

  ngOnInit(): void { this.load(); this.loadContradictions(); }
  /** Switching space in the Brain re-points this tab rather than leaving another space's pairs on screen. */
  ngOnChanges(ch: SimpleChanges): void { if (ch['spaceId'] && !ch['spaceId'].firstChange) { this.load(); this.loadContradictions(); } }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.duplicatesApi.listDuplicates(this.statusFilter, this.spaceId).subscribe({
      next: ({ duplicates }) => { this.rows.set(duplicates); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  scan(): void {
    this.scanning.set(true);
    this.duplicatesApi.scanDuplicates(this.spaceId).subscribe({
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

  async reopen(d: DuplicateRecord): Promise<void> {
    // Re-rating is the deliberate counterpart to a sticky dismissal — no confirm needed, it only
    // moves the pair back onto the review list (nothing is destroyed).
    this.busy.set(d.id);
    this.duplicatesApi.reopenDuplicate(d.id).subscribe({
      next: () => {
        // In the dismissed view the pair no longer belongs; in the "all" view it flips back to open.
        this.rows.update(list => this.statusFilter === 'dismissed'
          ? list.filter(x => x.id !== d.id)
          : list.map(x => x.id === d.id ? { ...x, status: 'open' } : x));
        this.busy.set(null);
        this.toast.success(this.transloco.translate('duplicates.reRateDone'));
      },
      error: (e) => { this.busy.set(null); this.toast.error(e?.error?.error || this.transloco.translate('duplicates.reRateError')); },
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
