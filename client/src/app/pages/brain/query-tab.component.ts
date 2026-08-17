import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { groupRecallResults, chunkLabel, passageText, flattenRecallItems } from './recall-grouping';
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
                    <!-- The rest of the recall surface. Owner asked for every fillable MCP/REST field to be
                         reachable from the UI; before this, maxPerType, includeFreshWrites and includeContent could
                         only be set by hand-writing a request.
                         NOTE: no backticks anywhere in this template, including comments. One ends the template
                         string and the error points at @Component, never here. -->
                    <div class="row" style="gap:14px; flex-wrap:wrap; margin-bottom:10px;">
                      <div class="field" style="margin:0;">
                        <label>{{ 'brain.query.maxPerType' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.maxPerType.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.maxPerType" name="recallMaxPerType" min="0" max="100"
                          [placeholder]="'brain.query.maxPerType.none' | transloco" style="width:90px;" />
                      </div>
                      <div class="field" style="min-width:90px;">
                        <label>{{ 'brain.query.traverse' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.traverse.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.traverse" name="recallTraverse" min="0" max="5"
                          [placeholder]="'brain.query.traverse.none' | transloco" style="width:80px;" />
                      </div>
                      <div class="field" style="min-width:100px;">
                        <label>{{ 'brain.query.maxTimeMs' | transloco }}
                          <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.recallMaxTimeMs.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                        </label>
                        <input type="number" [(ngModel)]="recallForm.maxTimeMS" name="recallMaxTimeMS" min="0" max="30000"
                          [placeholder]="'brain.query.recallMaxTimeMs.none' | transloco" style="width:100px;" />
                      </div>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeFreshWrites" name="recallFresh" />
                        <span>{{ 'brain.query.includeFreshWrites' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeFreshWrites.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeContent" name="recallIncludeContent" />
                        <span>{{ 'brain.query.includeContent' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeContent.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                      <label style="display:flex; align-items:center; gap:6px; align-self:flex-end; cursor:pointer;">
                        <input type="checkbox" [(ngModel)]="recallForm.includeDiagnostics" name="recallIncludeDiagnostics" />
                        <span>{{ 'brain.query.includeDiagnostics' | transloco }}</span>
                        <span style="color:var(--text-muted);font-size:11px;" [attr.title]="'brain.query.includeDiagnostics.tooltip' | transloco"><ph-icon name="info" [size]="11" style="display:inline-flex;vertical-align:middle;"/></span>
                      </label>
                    </div>

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
                  <strong>{{ recallGroups().length }}</strong> {{ 'brain.query.resultsCount' | transloco: { count: recallGroups().length } }}
                  <!-- Grouping makes a topK of 10 look like 6, so the passage count is stated rather than
                       left for the reader to wonder about. Only shown when grouping actually happened. -->
                  @if (recallResults().length !== recallGroups().length) {
                    <span style="font-size:11px; color:var(--text-muted); margin-left:6px;">{{ 'brain.query.groupedPassages' | transloco: { count: recallResults().length } }}</span>
                  }
                </div>
                @for (g of recallGroups(); track $index) {
                  <div class="query-result-card" style="margin-top:6px;">
                    @if (g.file; as f) {
                      <!-- A grouped document: name the FILE once, then say where inside it matched. -->
                      <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center; flex-wrap:wrap;">
                        <span class="badge badge-purple">file</span>
                        <strong style="font-size:12px; word-break:break-all;">{{ f.path }}</strong>
                        @if (g.score != null) {
                          <span style="font-size:11px; color:var(--text-muted);">{{ 'common.score' | transloco }}: {{ g.score.toFixed(3) }}</span>
                        }
                        @if (g.hitCount > 1) {
                          <span class="badge">{{ 'brain.query.passages' | transloco: { count: g.hitCount } }}</span>
                        }
                      </div>
                      @if (f.description) {
                        <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">{{ f.description }}</div>
                      }
                      <ul style="margin:0; padding-left:16px;">
                        @for (h of g.hits; track $index) {
                          <li style="margin:2px 0;">
                            @if (chunkHeading(h); as heading) {
                              <span style="font-size:11px; color:var(--text-secondary); font-weight:550;">{{ heading }}</span>
                            }
                            <!-- The passage's own text, not the raw record: a JSON dump per passage is
                                 unreadable stacked six deep, and the text is what actually matched.
                                 Falls back to the record only when a hit carries no text at all. -->
                            @if (passageOf(h); as text) {
                              <div style="white-space:pre-wrap; word-break:break-word; font-size:12px;">{{ text }}</div>
                            } @else {
                              <div style="white-space:pre-wrap; word-break:break-all;">{{ formatQueryDoc(h) }}</div>
                            }
                          </li>
                        }
                      </ul>
                    } @else {
                      <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center;">
                        <span class="badge badge-purple">{{ g.hits[0].type }}</span>
                        @if (g.score != null) {
                          <span style="font-size:11px; color:var(--text-muted);">{{ 'common.score' | transloco }}: {{ g.score.toFixed(3) }}</span>
                        }
                        <!-- A hit that HAS a node in the graph gets the same jump the entities and edges tabs
                             offer. Traverse results are entities too, so an expanded neighbour is reachable
                             from here without going back to a list. -->
                        @if (graphTargetOf(g.hits[0]); as target) {
                          <button class="icon-btn" style="margin-left:auto;" [attr.title]="'common.viewInGraph' | transloco"
                            [attr.aria-label]="'common.viewInGraph' | transloco" (click)="viewInGraph.emit(target)"><ph-icon name="graph" [size]="16"/></button>
                        }
                      </div>
                      <div style="white-space:pre-wrap; word-break:break-all;">{{ formatQueryDoc(g.hits[0]) }}</div>
                    }
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
  // `maxPerType: 0` and `includeContent: true` are the SERVER's defaults expressed as form state, not new policy:
  // 0 means "no cap" and is omitted from the request, and `includeContent` starts true because sending false makes
  // recall look as though it has stopped returning passages. `includeFreshWrites` starts false because it is an
  // opt-in scan.
  /** Focus an entity in the graph tab — the shell switches tab and sets the focus id, exactly as it does
   *  for the entities and edges tabs. */
  viewInGraph = output<string>();

  recallForm = {
    query: '', topK: 10, minScore: 0, filter: '', tags: '', type: '',
    maxPerType: 0, includeFreshWrites: false, includeContent: true, includeDiagnostics: false,
    // Both 0 = "don't send it". `traverse: 0` is also the server default (no expansion), and `maxTimeMS: 0`
    // is not a legal deadline, so neither zero can be mistaken for a value the operator chose.
    traverse: 0, maxTimeMS: 0,
  };

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

  /**
   * Recall hits with each document's chunk matches collapsed under it (4c-ii).
   *
   * A long paper relevant in five places used to return five near-identical rows, pushing everything else
   * out of view. The server has always sent `parentFileId` + an inlined `parentFile` on chunk hits; nothing
   * read them until now, so this is presentation only — no API change, and MCP callers still get the flat
   * list they are built around.
   */
  recallGroups = computed(() => groupRecallResults(this.recallResults()));

  /** The heading a passage sits under, when the chunker recorded one. */
  chunkHeading(r: RecallResult): string | undefined {
    return chunkLabel(r);
  }

  /** The passage's own text for display, or undefined when the hit carries none. */
  passageOf(r: RecallResult): string | undefined {
    return passageText(r);
  }

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
      // Each omitted unless it says something. `maxPerType: 0` is "no cap" and must not be sent as a literal zero,
      // which would cap every type at nothing. `includeFreshWrites` is only sent when true — the route rejects a
      // non-boolean, and there is no reason to spell out the default. `includeContent` is only sent when the operator
      // has actually turned it off.
      ...(this.recallForm.maxPerType > 0 ? { maxPerType: this.recallForm.maxPerType } : {}),
      ...(this.recallForm.includeFreshWrites ? { includeFreshWrites: true } : {}),
      ...(this.recallForm.includeContent ? {} : { includeContent: false }),
      // Same rule as above and the same reason: the server default is false, so only an operator who
      // switched it ON sends it. Sending `false` explicitly would put a parameter in every request that
      // means exactly what its absence means.
      ...(this.recallForm.includeDiagnostics ? { includeDiagnostics: true } : {}),
      ...(this.recallForm.traverse > 0 ? { traverse: this.recallForm.traverse } : {}),
      ...(this.recallForm.maxTimeMS > 0 ? { maxTimeMS: this.recallForm.maxTimeMS } : {}),
    }).subscribe({
      // Flattened on arrival: `traverse > 0` returns each item wrapped in an envelope, and the grouping and
      // rendering below both read the record's own fields directly.
      next: (res) => { this.recallRunning.set(false); this.recallResults.set(flattenRecallItems(res.results)); },
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

  /**
   * The graph node a recall hit corresponds to, or null when it has none.
   *
   * An entity IS a node. An edge is shown by focusing the entity it starts from — the same choice the edges
   * tab makes, so the button means the same thing in both places. Memories, chrono entries and file chunks
   * have no node, and get no button rather than one that lands on an empty graph.
   */
  graphTargetOf(hit: RecallResult): string | null {
    const id = hit.type === 'entity' ? hit['_id'] : hit.type === 'edge' ? hit['from'] : undefined;
    return typeof id === 'string' && id.length > 0 ? id : null;
  }
}
