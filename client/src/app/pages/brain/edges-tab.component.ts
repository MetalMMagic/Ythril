import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { Edge, Entity } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordFilterBarComponent, type RecordFilter } from '../../shared/record-filter-bar.component';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { RecordSearchBarComponent } from './record-search-bar.component';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';

/**
 * The Edges record tab, extracted from BrainComponent (A17.9b-6f) following the memories pattern.
 * Owns the edge create form, the (drawer-superseded) inline edit, delete, and the tab's own text/
 * semantic search (via `store.edgeSearch`/`edgeSearchMode`, like memories) + type-tag filter +
 * pagination + loader. Self-loads via a `spaceId` effect.
 *
 * Edge deltas: create AND inline-edit strip empty optional props (like entity); `deleteEdge` does NOT
 * refresh the space stats (so it does NOT emit `mutated`) — the asymmetry pinned by the A17.9b-6b tests.
 */
@Component({
  selector: 'app-edges-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, RecordFilterBarComponent, RecordSearchBarComponent, SortableHeaderComponent],
  styles: [BRAIN_CHIP_STYLES, BRAIN_RECORD_TABLE_STYLES],
  template: `

          <div class="content-header">
            <app-record-search-bar
              [value]="store.edgeSearch()" (valueChange)="onEdgeSearch($event)"
              [mode]="store.edgeSearchMode()" (modeChange)="setEdgeSearchMode($event)"
              placeholder="brain.edges.searchPlaceholder" />
            <button class="btn-primary btn btn-sm" (click)="openEdgeForm()" [disabled]="showEdgeForm()">{{ 'brain.edges.addButton' | transloco }}</button>
          </div>
          <div class="list-filter-row">
            <app-record-filter-bar
              [typeOptions]="store.edgeTypeOptions()"
              [tagSuggestions]="store.edgeTagSuggestions()"
              [value]="recordFilter()"
              (filterChange)="onFilterChange($event)"
            />
          </div>

          @if (showEdgeForm()) {
            <form class="create-form" (ngSubmit)="createEdge()">
              <!-- Field order matches the table columns: from, relation, to, weight, tags | description, properties. -->
              <div class="form-row">
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'common.form.from' | transloco }}</label>
                  <app-entity-search
                    mode="picker"
                    [spaceId]="spaceId()"
                    placeholder="common.searchEntitiesPlaceholder"
                    [value]="edgeForm.fromDisplay"
                    (selected)="pickEdgeFrom($event)"
                  />
                </div>
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'brain.edges.form.relation' | transloco }} <span style="color:var(--error)">*</span></label>
                  @if (store.edgeLabelNames().length) {
                    <select [(ngModel)]="edgeForm.label" name="label" required>
                      @for (l of store.edgeLabelNames(); track l) {
                        <option [value]="l">{{ l }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="edgeForm.label" name="label" required />
                  }
                </div>
                <div class="field" style="flex:1; min-width:120px;">
                  <label>{{ 'common.form.to' | transloco }}</label>
                  <app-entity-search
                    mode="picker"
                    [spaceId]="spaceId()"
                    placeholder="common.searchEntitiesPlaceholder"
                    [value]="edgeForm.toDisplay"
                    (selected)="pickEdgeTo($event)"
                  />
                </div>
                <div class="field" style="width:90px;">
                  <label>{{ 'common.form.weight' | transloco }}</label>
                  <input type="number" [(ngModel)]="edgeForm.weight" name="weight" step="0.1" />
                </div>
                <div class="field" style="flex:1; min-width:180px;">
                  <label>{{ 'brain.edges.table.tags' | transloco }}</label>
                  <app-tag-input [(value)]="edgeForm.tags" [suggestions]="store.edgeTagSuggestions()" inputName="edgeFormTags" />
                </div>
              </div>
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.edges.table.description' | transloco }}</label>
                  <textarea [(ngModel)]="edgeForm.description" name="description" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>{{ 'brain.edges.table.properties' | transloco }}</label>
                  <app-properties-editor
                    [schema]="store.edgeSchema(edgeForm.label)"
                    [required]="store.requiredProps(store.edgeSchema(edgeForm.label))"
                    [(value)]="edgeForm.properties"
                  />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEdge() || !edgeForm.from.trim() || !edgeForm.to.trim() || !edgeForm.label.trim()">
                  @if (creatingEdge()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showEdgeForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createEdgeError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEdgeError() }}</div>
          }
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th app-sort-th field="from" label="brain.edges.table.from" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th app-sort-th field="label" label="brain.edges.table.relation" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th app-sort-th field="to" label="brain.edges.table.to" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th>{{ 'brain.edges.table.weight' | transloco }}</th><th>{{ 'brain.edges.table.tags' | transloco }}</th><th>{{ 'brain.edges.table.description' | transloco }}</th><th>{{ 'brain.edges.table.properties' | transloco }}</th><th app-sort-th field="createdAt" label="brain.edges.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (edge of store.filteredEdges(); track edge._id) {
                  @if (recordList.editingId() === edge._id) {
                    <tr>
                      <td colspan="9">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="min-width:200px; margin-bottom:0;">
                            <label style="font-size:11px; color:var(--text-muted);">{{ 'brain.edges.form.editingLabel' | transloco }}</label>
                            <div style="font-size:12px; padding:6px 8px; background:var(--bg-secondary); border-radius:4px; color:var(--text-muted);">
                              {{ editEdge.fromName || editEdge.from }} → {{ editEdge.toName || editEdge.to }}
                            </div>
                          </div>
                          <div class="field" style="flex:1; min-width:120px; margin-bottom:0;">
                            <label>{{ 'brain.edges.form.relation' | transloco }}</label>
                            @if (store.edgeLabelNames().length) {
                              <select [(ngModel)]="editEdge.label" name="editEdgeLabel">
                                @for (l of store.edgeLabelNames(); track l) {
                                  <option [value]="l">{{ l }}</option>
                                }
                              </select>
                            } @else {
                              <input type="text" [(ngModel)]="editEdge.label" name="editEdgeLabel" />
                            }
                          </div>
                          <div class="field" style="width:80px; margin-bottom:0;">
                            <label>{{ 'common.form.weight' | transloco }}</label>
                            <input type="number" [(ngModel)]="editEdge.weight" name="editEdgeWeight" step="0.1" />
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editEdge.description" name="editEdgeDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editEdge.tags" [suggestions]="store.edgeTagSuggestions()" inputName="edgeEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'brain.edges.table.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.edgeSchema(editEdge.label)"
                              [required]="store.requiredProps(store.edgeSchema(editEdge.label))"
                              [(value)]="editEdge.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditEdge(edge._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr style="vertical-align:top;">
                      <td style="font-size:12px; white-space:nowrap;">{{ edge.fromName || edge.from }}</td>
                      <td><span class="badge badge-blue">{{ edge.label }}</span></td>
                      <td style="font-size:12px; white-space:nowrap;">{{ edge.toName || edge.to }}</td>
                      <td style="color:var(--text-muted);">{{ edge.weight ?? '—' }}</td>
                      <td style="font-size:11px;">
                        @for (tag of (edge.tags ?? []); track tag) { <span class="tag">{{ tag }}</span> }
                        @if (!(edge.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td style="font-size:12px; color:var(--text-muted); white-space:normal; word-break:break-word; min-width:140px; min-height:4.2em;">
                        {{ edge.description || '—' }}
                      </td>
                      <td><app-properties-view [properties]="edge.properties" [schema]="store.edgeSchema(edge.label)" /></td>
                      <td style="color:var(--text-muted); white-space:nowrap;">{{ edge.createdAt | date:'dd.MM.yyyy' }}</td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('edge', edge)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === edge._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteEdge(edge._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.edges.deleteAriaLabel' | transloco" (click)="requestDelete(edge._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="9">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEdges' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="graph" [size]="48"/></div>
                      @if (store.edgeSearch() && store.edges().length) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.edges.empty.noMatchQuery' | transloco: { query: store.edgeSearch() } }}</p>
                      } @else {
                        <h3>{{ 'brain.edges.empty.title' | transloco }}</h3>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (store.edgeSearchMode() !== 'semantic') {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.filteredEdges().length ? (skip() + 1) + '–' + (skip() + store.filteredEdges().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.edges().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `,
})
export class EdgesTabComponent extends RecordTabBase {
  readonly drawerState = inject(RecordDrawerState);
  private brainApi = inject(BrainApi);

  /** Emitted after a create so the shell can refresh the space's tab-count stats. (Delete does NOT — matches the shell's original edge behaviour.) */
  readonly mutated = output<void>();

  recordFilter = signal<RecordFilter>({ type: '', tag: '' });

  showEdgeForm = signal(false);
  creatingEdge = signal(false);
  createEdgeError = signal('');
  edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null as number | null, tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  editEdge = { from: '', to: '', fromName: undefined as string | undefined, toName: undefined as string | undefined, label: '', weight: null as number | null, tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };

  private _edgeSemTimer: ReturnType<typeof setTimeout> | null = null;

  protected override resetOnSpaceChange(): void {
    this.recordFilter.set({ type: '', tag: '' });
  }

  protected override load(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.recordList.loading.set(true);
    this.recordList.loadError.set(null);
    const gf: { type?: string; tag?: string } = {};
    if (this.recordFilter().type) gf.type = this.recordFilter().type;
    if (this.recordFilter().tag) gf.tag = this.recordFilter().tag;
    this.brainApi.listEdges(spaceId, this.pageSize, this.skip(), gf, this.sortParam()).subscribe({
      next: ({ edges }) => { this.store.edges.set(edges); this.recordList.loading.set(false); },
      error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
    });
  }

  onEdgeSearch(q: string): void {
    this.store.edgeSearch.set(q);
    if (this.store.edgeSearchMode() === 'semantic') {
      if (this._edgeSemTimer) clearTimeout(this._edgeSemTimer);
      if (!q.trim()) { this.store.edges.set([]); return; }
      this._edgeSemTimer = setTimeout(() => this.runSemanticEdgeSearch(), 300);
    }
  }

  setEdgeSearchMode(m: 'text' | 'semantic'): void {
    this.store.edgeSearchMode.set(m);
    const q = this.store.edgeSearch().trim();
    if (!q) return;
    if (m === 'semantic') this.runSemanticEdgeSearch();
    else { this.skip.set(0); this.load(); }
  }

  runSemanticEdgeSearch(): void {
    const q = this.store.edgeSearch().trim();
    const spaceId = this.spaceId();
    if (!q || !spaceId) { this.store.edges.set([]); return; }
    this.brainApi.recallBrain(spaceId, { query: q, types: ['edge'], topK: 20 }).pipe(
      catchError(() => of({ results: [], count: 0 })),
    ).subscribe(res => {
      this.store.edges.set(res.results.filter(r => r.type === 'edge').map(r => ({
        _id: r['_id'] as string,
        from: (r['from'] as string) ?? '',
        fromName: r['fromName'] as string | undefined,
        to: (r['to'] as string) ?? '',
        toName: r['toName'] as string | undefined,
        label: (r['label'] as string) ?? '',
        weight: r['weight'] as number | undefined,
        tags: (r['tags'] as string[]) ?? [],
        description: r['description'] as string | undefined,
        properties: (r['properties'] as Record<string, string | number | boolean>) ?? {},
        createdAt: (r['createdAt'] as string) ?? '',
      } as Edge)));
    });
  }

  onFilterChange(f: RecordFilter): void {
    this.recordFilter.set(f);
    this.skip.set(0);
    this.load();
  }

  openEdgeForm(): void {
    const firstLabel = Object.keys(this.store.spaceMeta()?.typeSchemas?.edge ?? {})[0] ?? '';
    this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: firstLabel, weight: null, tags: [], description: '', properties: this.store.buildPropertiesObject('edge', {}, firstLabel) };
    this.showEdgeForm.set(true);
  }

  createEdge(): void {
    if (!this.edgeForm.from.trim() || !this.edgeForm.to.trim() || !this.edgeForm.label.trim()) return;
    this.creatingEdge.set(true);
    this.createEdgeError.set('');
    const body: Parameters<BrainApi['createEdge']>[1] = {
      from: this.edgeForm.from.trim(),
      to: this.edgeForm.to.trim(),
      label: this.edgeForm.label.trim(),
    };
    if (this.edgeForm.weight != null) body.weight = this.edgeForm.weight;
    if (this.edgeForm.tags.length) body.tags = this.edgeForm.tags;
    if (this.edgeForm.description.trim()) body.description = this.edgeForm.description.trim();
    const edgeProps = this.store.stripEmptyOptionalProps(this.edgeForm.properties, this.store.edgeSchema(this.edgeForm.label));
    if (Object.keys(edgeProps).length) body.properties = edgeProps;
    this.brainApi.createEdge(this.spaceId(), body).subscribe({
      next: () => {
        this.creatingEdge.set(false);
        this.showEdgeForm.set(false);
        this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null, tags: [], description: '', properties: {} as Record<string, string | number | boolean> };
        this.mutated.emit();
        this.load();
      },
      error: (err) => { this.creatingEdge.set(false); this.createEdgeError.set(fmtApiError(err, 'Failed to create edge')); },
    });
  }

  startEditEdge(edge: Edge): void {
    this.recordList.editingId.set(edge._id);
    this.recordList.editError.set('');
    this.editEdge = {
      from: edge.from,
      to: edge.to,
      fromName: edge.fromName,
      toName: edge.toName,
      label: edge.label,
      weight: edge.weight ?? null,
      tags: edge.tags ?? [],
      description: edge.description ?? '',
      properties: this.store.buildPropertiesObject('edge', edge.properties ?? {}, edge.label),
    };
  }

  saveEditEdge(id: string): void {
    this.recordList.editSaving.set(true);
    this.recordList.editError.set('');
    const edgeProps = this.store.stripEmptyOptionalProps(this.editEdge.properties, this.store.edgeSchema(this.editEdge.label));
    this.brainApi.updateEdge(this.spaceId(), id, {
      label: this.editEdge.label.trim(),
      tags: this.editEdge.tags,
      description: this.editEdge.description.trim(),
      ...(this.editEdge.weight != null ? { weight: this.editEdge.weight } : {}),
      ...(Object.keys(edgeProps).length ? { properties: edgeProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.recordList.editSaving.set(false);
        this.recordList.editingId.set('');
        this.store.edges.update(list => list.map(e => e._id === id ? updated : e));
      },
      error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteEdge(id: string): void {
    this.recordList.confirmDeleteId.set('');
    this.brainApi.deleteEdge(this.spaceId(), id).subscribe({
      next: () => this.store.edges.update(list => list.filter(e => e._id !== id)),
      error: () => {},
    });
  }

  // Edge from/to endpoints set display fields on edgeForm and do NOT touch the entity-name cache
  // (they're not chip fields) — the shell counterparts of the picker's target-based pickEntity.
  pickEdgeFrom(ent: Entity): void {
    this.edgeForm.from = ent._id;
    this.edgeForm.fromDisplay = ent.name;
  }

  pickEdgeTo(ent: Entity): void {
    this.edgeForm.to = ent._id;
    this.edgeForm.toDisplay = ent.name;
  }
}
