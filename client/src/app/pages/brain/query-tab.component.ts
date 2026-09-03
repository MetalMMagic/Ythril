import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { groupRecallResults, chunkLabel, passageText, flattenRecallItems } from './recall-grouping';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { QueryCollection, QueryResult, RecallKnowledgeType, RecallResult, RECORD_TYPES, BRAIN_COLLECTIONS } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { RecallFormComponent, type RecallFormState, type RecallTypeOpt } from './recall-form.component';
import { recallRequestFrom } from './recall-request';
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
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, RecallFormComponent],
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

            <!-- Semantic Search mode. The FORM is its own component, app-recall-form: U-1 adds eleven
                 more parameters to it, so it is a split rather than an insertion, and the layout that makes
                 room for them comes first. The request built from that form stays here — 19 characterization
                 cases pin it, and not one of their assertions changed. -->
            @if (queryMode() === 'search') {
              <app-recall-form
                [form]="recallForm"
                [typeOpts]="recallTypeOpts"
                [typeNames]="recallTypeSchemaOptions()"
                [running]="recallRunning()"
                [error]="recallError()"
                [hasResults]="recallResults().length > 0"
                (run)="runRecall()"
                (clear)="clearRecall()" />

              <!-- THE ANSWER WAS SHORTENED, and until now the page did not say so.
                   Placed above the results rather than below them: a reader who scrolls to the end has already
                   concluded that is all there was, which is the whole failure. Says both guarantees, because
                   "shortened" on its own reads as "unreliable" — the records that came back are complete and
                   they are the top of the ranking, with nothing missing from the middle. -->
              @if (recallTruncated(); as t) {
                <div class="alert alert-warning" style="margin-top:12px;">
                  <div><strong>{{ 'brain.query.truncated.title' | transloco: { returned: t.returned, count: t.count } }}</strong></div>
                  <div style="font-size:12px; margin-top:4px;">{{ 'brain.query.truncated.body' | transloco }}</div>
                  <div style="font-size:12px; margin-top:4px;">{{ 'brain.query.truncated.what' | transloco }}</div>
                </div>
              }

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
  readonly queryCollections: readonly QueryCollection[] = BRAIN_COLLECTIONS;
  queryForm = { collection: 'memories' as QueryCollection, filter: '', projection: '', limit: 20, maxTimeMS: 5000 };
  queryRunning = signal(false);
  queryResult = signal<QueryResult | null>(null);
  queryError = signal('');
  queryFilterError = signal('');
  queryProjectionError = signal('');

  // Semantic search
  //
  // `recallKnowledgeTypes` was here and was DEAD: declared, never read, not by the template either. The
  // rendered list is `recallTypeOpts` below. Deleted rather than converted — a copy of an enumeration that
  // nothing reads is the cheapest kind to keep and the easiest to start believing in.
  // `maxPerType: 0` and `includeContent: true` are the SERVER's defaults expressed as form state, not new policy:
  // 0 means "no cap" and is omitted from the request, and `includeContent` starts true because sending false makes
  // recall look as though it has stopped returning passages. `includeFreshWrites` starts false because it is an
  // opt-in scan.
  /** Focus an entity in the graph tab — the shell switches tab and sets the focus id, exactly as it does
   *  for the entities and edges tabs. */
  viewInGraph = output<string>();

  /*
   * Every default here is either the SERVER's default or a value that means "say nothing", and that is the
   * whole design of this object: a form whose defaults differ from the route's would put a decision nobody
   * made into every request.
   *
   * So the zeros are not laziness. `depth: 0` is no expansion, `maxTimeMS: 0` is not a legal deadline,
   * `maxBytes`/`maxChars`/`maxTokens: 0` mean "use the instance default" against server floors of 1000 and 1,
   * and `skip: 0` is the first page. None of them can be mistaken for a number an operator chose, and none is
   * sent. `direction: ''` is the same idea for a string: the server picks unless somebody says.
   */
  recallForm: RecallFormState = {
    query: '', topK: 10, minScore: 0, filter: '', projection: '', tags: '', type: '',
    maxPerType: 0, includeFreshWrites: false, includeContent: true, includeDiagnostics: false,
    depth: 0, edgeLabels: '', direction: '',
    includeChrono: false, includeMemories: false, includeFiles: false,
    maxTimeMS: 0, maxBytes: 0, maxChars: 0, maxTokens: 0, charsPerToken: 0,
    skip: 0, remainderDump: false,
  };

  /**
   * Set when the answer was SHORTENED by the byte budget, so the page can say so.
   *
   * The server has reported this since the spill shipped and the client never read it — so a hundred-match
   * search could show a handful of records with nothing anywhere on the page explaining why. Under the old
   * record cap that was three records out of a hundred.
   *
   * Only the two numbers an operator can act on are kept. The four size figures are deliberately
   * left out: they are for a caller tuning a request programmatically, and a byte count in the interface is a
   * number nobody can do anything with.
   */
  recallTruncated = signal<{ returned: number; count: number } | null>(null);

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
  recallTypeOpts: RecallTypeOpt[] =
    RECORD_TYPES.map(type => ({ type, on: false, min: null }));
  /*
   * `showRecallAdvanced` was here and is GONE with the button it drove.
   *
   * Six parameters lived behind it, which is the arrangement the owner's instruction rules out: a field
   * an operator cannot see is a capability they do not know they have. Groups replace it, and the row
   * this came from says so in as many words — the answer is not a second disclosure.
   */
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
    /*
     * The request is built by `recallRequestFrom`, which is also what the JSON preview beside the form
     * shows. Not two readers of the same rules: the preview is worth nothing unless it is the SAME
     * request, and a second implementation of "the same" is this codebase's most expensive defect shape —
     * with a worse failure mode here, because a preview is BELIEVED. A caller pastes the JSON, gets a
     * different answer from the one on screen, and nothing anywhere is wrong.
     *
     * What stays here is what a REQUEST is, rather than what it contains: the empty-query no-op, the
     * error message, and the three signals cleared on the click so a stale one cannot describe an answer
     * nobody has received yet.
     */
    const { body, errorKey } = recallRequestFrom(this.recallForm, this.recallTypeOpts);
    if (errorKey) { this.recallError.set(this.transloco.translate(errorKey)); return; }
    if (!body) return;   // a blank question is a no-op, not an error to report

    this.recallRunning.set(true);
    this.recallError.set('');
    this.recallResults.set([]);
    this.recallTruncated.set(null);
    this.brainApi.recallBrain(this.spaceId(), body).subscribe({
      // Flattened on arrival: any traversal depth returns each item wrapped in an envelope, and the grouping and
      // rendering below both read the record's own fields directly.
      next: (res) => {
        this.recallRunning.set(false);
        this.recallResults.set(flattenRecallItems(res.results));
        // `=== true` rather than truthy: the field is optional on the type (an older server sends none), and an
        // absent one must read as "not truncated" rather than as "unknown".
        this.recallTruncated.set(res.truncated === true
          ? { returned: res.returned ?? res.results.length, count: res.count }
          : null);
      },
      error: (err) => { this.recallRunning.set(false); this.recallError.set(err.error?.error ?? 'Search failed'); },
    });
  }

  clearRecall(): void {
    this.recallResults.set([]);
    this.recallError.set('');
    this.recallTruncated.set(null);
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
