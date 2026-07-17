import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { QueryCollection, QueryResult, RecallKnowledgeType, RecallResult } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { BrainStore } from './brain-store.service';

/**
 * The brain page's Query tab — advanced (MongoDB-style) query + semantic recall.
 *
 * Extracted from BrainComponent (A17.9b-6a) as the first tab component. Read-only: it owns the
 * query/recall forms and results, and talks only to `BrainApi` (+ `BrainStore` for the recall
 * "filter by type" options). The active space id is a required input — the shell's nav state stays on
 * the shell — and the async methods read it at call time so a mid-flight space switch cannot stale it.
 *
 * OnPush: every result path writes a signal.
 */
@Component({
  selector: 'app-query-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent],
  styles: [`
    .query-panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .query-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
    }
    .query-form-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .query-form-row .field { margin: 0; }
    .query-textarea {
      width: 100%;
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-primary);
      resize: vertical;
      min-height: 64px;
    }
    .query-textarea.error { border-color: var(--error); }
    .query-results-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .query-results-header strong { color: var(--text-primary); }
    .query-result-card {
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text-secondary);
    }
    .query-empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 14px;
    }
  `],
  template: `
          <div class="query-panel">
            <!-- Mode switcher -->
            <div style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="btn btn-sm" [class.btn-primary]="queryMode() === 'search'" [class.btn-secondary]="queryMode() !== 'search'" (click)="queryMode.set('search')">{{ 'brain.query.mode.semanticSearch' | transloco }}</button>
              <button class="btn btn-sm" [class.btn-primary]="queryMode() === 'advanced'" [class.btn-secondary]="queryMode() !== 'advanced'" (click)="queryMode.set('advanced')">{{ 'brain.query.mode.advancedQuery' | transloco }}</button>
            </div>

            <!-- Semantic Search mode -->
            @if (queryMode() === 'search') {
              <div class="query-form">
                <div class="field" style="margin-bottom:0;">
                  <label>{{ 'brain.query.search.label' | transloco }}</label>
                  <input
                    type="text"
                    [(ngModel)]="recallForm.query"
                    name="recallQuery"
                    [placeholder]="'brain.query.search.placeholder' | transloco"
                    style="width:100%; font-size:14px; padding:8px 12px;"
                    (keydown.enter)="runRecall()"
                    [attr.aria-label]="'brain.query.search.label' | transloco"
                  />
                </div>
                <div class="query-form-row" style="margin-top:8px;">
                  <div class="field" style="min-width:100px; margin:0;">
                    <label>{{ 'brain.query.topK' | transloco }} <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.topK.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span></label>
                    <input type="number" [(ngModel)]="recallForm.topK" name="recallTopK" min="1" max="100" style="width:80px;" />
                  </div>
                  <div class="field" style="min-width:120px; margin:0;">
                    <label>{{ 'brain.query.minScore' | transloco }} <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.minScore.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span></label>
                    <input type="number" [(ngModel)]="recallForm.minScore" name="recallMinScore" min="0" max="1" step="0.05" style="width:80px;" />
                  </div>
                  <div class="field" style="margin:0; align-self:flex-end;">
                    <button class="btn btn-sm btn-secondary" type="button" (click)="showRecallAdvanced.set(!showRecallAdvanced())">
                      {{ (showRecallAdvanced() ? 'brain.query.hideAdvanced' : 'brain.query.showAdvanced') | transloco }}
                    </button>
                  </div>
                </div>

                @if (showRecallAdvanced()) {
                  <div style="margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                    <!-- Type restriction + per-type minimums -->
                    <label style="display:block; margin-bottom:6px;">
                      {{ 'brain.query.types' | transloco }}
                      <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.types.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                    </label>
                    <div style="display:flex; flex-wrap:wrap; gap:12px;">
                      @for (opt of recallTypeOpts; track opt.type) {
                        <span style="display:inline-flex; align-items:center; gap:5px;">
                          <input
                            type="checkbox"
                            [(ngModel)]="opt.on"
                            [name]="'recallType-' + opt.type"
                            [attr.aria-label]="opt.type"
                          />
                          <span style="font-size:13px;">{{ opt.type }}</span>
                          @if (opt.on) {
                            <input
                              type="number"
                              [(ngModel)]="opt.min"
                              [name]="'recallMin-' + opt.type"
                              min="0"
                              [max]="recallForm.topK"
                              style="width:56px;"
                              [placeholder]="'brain.query.minPerType.placeholder' | transloco"
                              [attr.title]="'brain.query.minPerType.tooltip' | transloco"
                            />
                          }
                        </span>
                      }
                    </div>

                    <div class="field" style="margin-top:10px;">
                      <label>{{ 'brain.query.tags' | transloco }}</label>
                      <input
                        type="text"
                        [(ngModel)]="recallForm.tags"
                        name="recallTags"
                        [placeholder]="'brain.query.tags.placeholder' | transloco"
                        style="width:100%;"
                      />
                    </div>

                    <!-- Schema/type filter (F5): a friendly picker for filter:{type:{eq}}. -->
                    <div class="field" style="margin-top:10px;">
                      <label>{{ 'brain.query.filterByType' | transloco }}</label>
                      <select [(ngModel)]="recallForm.type" name="recallType" style="max-width:220px;">
                        <option value="">{{ 'brain.query.anyType' | transloco }}</option>
                        @for (t of recallTypeSchemaOptions(); track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                    </div>

                    <div class="field" style="margin-top:8px; margin-bottom:0;">
                      <label>{{ 'brain.query.filter' | transloco }}</label>
                      <textarea
                        [(ngModel)]="recallForm.filter"
                        name="recallFilter"
                        rows="3"
                        [placeholder]="'brain.query.filter.placeholder' | transloco"
                        style="width:100%; font-family:var(--font-mono, monospace); font-size:12px;"
                      ></textarea>
                    </div>
                  </div>
                }

                <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                  <button class="btn btn-sm btn-primary" [disabled]="recallRunning() || !recallForm.query.trim()" (click)="runRecall()">
                    @if (recallRunning()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'brain.query.searchButton' | transloco }}
                  </button>
                  @if (recallResults().length) {
                    <button class="btn btn-sm btn-secondary" (click)="clearRecall()">{{ 'brain.query.clearResults' | transloco }}</button>
                  }
                  @if (recallError()) {
                    <span style="font-size:12px; color:var(--error);">{{ recallError() }}</span>
                  }
                </div>
              </div>

              @if (recallResults().length) {
                <div class="query-results-header" style="margin-top:12px;">
                  <strong>{{ recallResults().length }}</strong> {{ 'brain.query.resultsCount' | transloco: { count: recallResults().length } }}
                </div>
                @for (r of recallResults(); track $index) {
                  <div class="query-result-card" style="margin-top:6px;">
                    <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center;">
                      <span class="badge badge-purple" style="font-size:10px;">{{ r.type }}</span>
                      @if (r.score != null) {
                        <span style="font-size:11px; color:var(--text-muted);">{{ 'common.score' | transloco }}: {{ r.score.toFixed(3) }}</span>
                      }
                    </div>
                    <div style="white-space:pre-wrap; word-break:break-all;">{{ formatQueryDoc(r) }}</div>
                  </div>
                }
              }
            }

            <!-- Advanced Query mode -->
            @if (queryMode() === 'advanced') {
              <div class="query-form">
                <div class="query-form-row">
                  <div class="field" style="min-width:160px;">
                    <label>{{ 'brain.query.collection' | transloco }}</label>
                    <select [(ngModel)]="queryForm.collection" name="queryCollection" [attr.aria-label]="'brain.query.collection' | transloco">
                      @for (c of queryCollections; track c) { <option [value]="c">{{ c }}</option> }
                    </select>
                  </div>
                  <div class="field" style="min-width:80px;">
                    <label>{{ 'brain.query.limit' | transloco }}</label>
                    <input type="number" [(ngModel)]="queryForm.limit" name="queryLimit" min="1" max="100" style="width:80px;" />
                  </div>
                  <div class="field" style="min-width:100px;">
                    <label>{{ 'brain.query.maxTimeMs' | transloco }}</label>
                    <input type="number" [(ngModel)]="queryForm.maxTimeMS" name="queryMaxTimeMS" min="100" max="30000" style="width:100px;" />
                  </div>
                </div>
                <div class="field">
                  <label>{{ 'brain.query.filter' | transloco }} <span style="color:var(--text-muted);font-size:11px;">{{ 'brain.query.filterHint' | transloco }}</span></label>
                  <textarea
                    class="query-textarea"
                    [class.error]="queryFilterError()"
                    [(ngModel)]="queryForm.filter"
                    name="queryFilter"
                    rows="3"
                    [placeholder]="'brain.query.filterPlaceholder' | transloco"
                  ></textarea>
                  @if (queryFilterError()) {
                    <div style="font-size:11px; color:var(--error); margin-top:3px;">{{ queryFilterError() }}</div>
                  }
                </div>
                <div class="field">
                  <label>{{ 'brain.query.projection' | transloco }} <span style="color:var(--text-muted);font-size:11px;">{{ 'brain.query.projectionHint' | transloco }}</span></label>
                  <textarea
                    class="query-textarea"
                    [class.error]="queryProjectionError()"
                    [(ngModel)]="queryForm.projection"
                    name="queryProjection"
                    rows="2"
                    [placeholder]="'brain.query.projectionPlaceholder' | transloco"
                  ></textarea>
                  @if (queryProjectionError()) {
                    <div style="font-size:11px; color:var(--error); margin-top:3px;">{{ queryProjectionError() }}</div>
                  }
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button class="btn btn-sm btn-primary" [disabled]="queryRunning()" (click)="runQuery()">
                    @if (queryRunning()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
                    {{ 'brain.query.runQuery' | transloco }}
                  </button>
                  @if (queryResult()) {
                    <button class="btn btn-sm btn-secondary" (click)="clearQuery()">{{ 'brain.query.clearResults' | transloco }}</button>
                  }
                  @if (queryError()) {
                    <span style="font-size:12px; color:var(--error);">{{ queryError() }}</span>
                  }
                </div>
              </div>

              @if (queryResult(); as res) {
                <div class="query-results-header">
                  <strong>{{ res.count }}</strong> {{ 'brain.query.resultsFrom' | transloco: { count: res.count, collection: res.collection } }}
                </div>
                @if (res.results.length === 0) {
                  <div class="query-empty">{{ 'brain.query.noDocuments' | transloco }}</div>
                } @else {
                  @for (doc of res.results; track $index) {
                    <div class="query-result-card">{{ formatQueryDoc(doc) }}</div>
                  }
                }
              }
            }
          </div>
  `,
})
export class QueryTabComponent {
  private brainApi = inject(BrainApi);
  private store = inject(BrainStore);
  private transloco = inject(TranslocoService);

  readonly spaceId = input.required<string>();

  // Query panel
  queryMode = signal<'search' | 'advanced'>('search');
  queryCollections: QueryCollection[] = ['memories', 'entities', 'edges', 'chrono', 'files'];
  queryForm = { collection: 'memories' as QueryCollection, filter: '', projection: '', limit: 20, maxTimeMS: 5000 };
  queryRunning = signal(false);
  queryResult = signal<QueryResult | null>(null);
  queryError = signal('');
  queryFilterError = signal('');
  queryProjectionError = signal('');

  // Semantic search
  recallKnowledgeTypes: RecallKnowledgeType[] = ['memory', 'entity', 'edge', 'chrono', 'file'];
  recallForm = { query: '', topK: 10, minScore: 0, filter: '', tags: '', type: '' };

  /** Type names offered by the recall "filter by type" dropdown (F5): schema type
   *  names for the space UNION the distinct `type` values present in the loaded
   *  records, so it's usable whether or not a schema is defined. */
  recallTypeSchemaOptions(): string[] {
    const ts = this.store.spaceMeta()?.typeSchemas;
    return [...new Set([
      ...Object.keys(ts?.entity ?? {}),
      ...Object.keys(ts?.memory ?? {}),
      ...this.store.memories().map(m => m.type),
      ...this.store.entities().map(e => e.type),
      ...this.store.edges().map(e => e.type),
    ].filter((t): t is string => !!t))].sort();
  }
  /** Type restriction + per-type minimums. Unchecked types are simply not sent. */
  recallTypeOpts: { type: RecallKnowledgeType; on: boolean; min: number | null }[] =
    (['memory', 'entity', 'edge', 'chrono', 'file'] as RecallKnowledgeType[])
      .map(type => ({ type, on: false, min: null }));
  showRecallAdvanced = signal(false);
  recallRunning = signal(false);
  recallResults = signal<RecallResult[]>([]);
  recallError = signal('');

  runQuery(): void {
    this.queryFilterError.set('');
    this.queryProjectionError.set('');
    this.queryError.set('');

    let filter: Record<string, unknown> = {};
    let projection: Record<string, unknown> | undefined;

    if (this.queryForm.filter.trim()) {
      try { filter = JSON.parse(this.queryForm.filter.trim()); }
      catch (e) { this.queryFilterError.set(`Invalid JSON — ${e instanceof Error ? e.message : 'check your filter syntax'}`); return; }
    }
    if (this.queryForm.projection.trim()) {
      try { projection = JSON.parse(this.queryForm.projection.trim()); }
      catch (e) { this.queryProjectionError.set(`Invalid JSON — ${e instanceof Error ? e.message : 'check your projection syntax'}`); return; }
    }

    this.queryRunning.set(true);
    this.brainApi.queryBrain(this.spaceId(), {
      collection: this.queryForm.collection,
      filter,
      projection,
      limit: this.queryForm.limit,
      maxTimeMS: this.queryForm.maxTimeMS,
    }).subscribe({
      next: (res) => { this.queryRunning.set(false); this.queryResult.set(res); },
      error: (err) => {
        this.queryRunning.set(false);
        this.queryError.set(err.error?.error ?? 'Query failed');
      },
    });
  }

  clearQuery(): void {
    this.queryResult.set(null);
    this.queryError.set('');
  }

  runRecall(): void {
    if (!this.recallForm.query.trim()) return;

    // Optional structured filter — same expression grammar as the Advanced Query
    // filter. Parse it here so a typo surfaces as a form error rather than a 400.
    let filter: Record<string, unknown> | undefined;
    const rawFilter = this.recallForm.filter.trim();
    if (rawFilter) {
      try {
        const parsed = JSON.parse(rawFilter) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          this.recallError.set(this.transloco.translate('brain.query.filterMustBeObject'));
          return;
        }
        filter = parsed as Record<string, unknown>;
      } catch {
        this.recallError.set(this.transloco.translate('brain.query.filterInvalidJson'));
        return;
      }
    }

    // The "filter by type" dropdown (F5) is a friendly shortcut for
    // filter:{type:{eq}}; it merges into (and overrides the `type` key of) any
    // hand-written JSON filter above.
    if (this.recallForm.type) {
      filter = { ...(filter ?? {}), type: { eq: this.recallForm.type } };
    }

    const selected = this.recallTypeOpts.filter(o => o.on);
    const types = selected.length ? selected.map(o => o.type) : undefined;

    const minPerType: Partial<Record<RecallKnowledgeType, number>> = {};
    for (const o of selected) {
      if (o.min != null && o.min > 0) minPerType[o.type] = o.min;
    }

    const tags = this.recallForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    this.recallRunning.set(true);
    this.recallError.set('');
    this.recallResults.set([]);
    this.brainApi.recallBrain(this.spaceId(), {
      query: this.recallForm.query.trim(),
      topK: this.recallForm.topK,
      minScore: this.recallForm.minScore || undefined,
      ...(types ? { types } : {}),
      ...(Object.keys(minPerType).length ? { minPerType } : {}),
      ...(tags.length ? { tags } : {}),
      ...(filter ? { filter } : {}),
    }).subscribe({
      next: (res) => { this.recallRunning.set(false); this.recallResults.set(res.results); },
      error: (err) => { this.recallRunning.set(false); this.recallError.set(err.error?.error ?? 'Search failed'); },
    });
  }

  clearRecall(): void {
    this.recallResults.set([]);
    this.recallError.set('');
  }

  formatQueryDoc(doc: Record<string, unknown>): string {
    return JSON.stringify(doc, null, 2);
  }
}
