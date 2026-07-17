import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { Memory } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordFilterBarComponent, type RecordFilter } from '../../shared/record-filter-bar.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';

/**
 * The Memories record tab, extracted from BrainComponent (A17.9b-6d) — the first of the five record
 * tabs to become its own component. Owns the memory create form, the (drawer-superseded) inline edit,
 * delete, and the tab's own search / filter / pagination + loader. Reads records and derived views
 * from BrainStore; shares the singleton load/edit/delete interaction with the shell via
 * RecordListState; uses EntityRefPicker for entity chips and RecordDrawerState to open the detail
 * drawer.
 *
 * Self-loading: the shell renders this behind `@if (activeTab() === 'memories')`, so it is created on
 * activation and destroyed on switch. An effect on the `spaceId` input loads on creation and reloads
 * on a space switch while mounted. Create/delete emit `mutated` so the shell can refresh the tab-count
 * stats (the one legitimate output — tab counts are parent view-state).
 *
 * OnPush: every async path writes a signal; the plain ngModel form models render because a sibling
 * signal write (`showMemoryForm`/`recordList.editingId`) happens in the same turn.
 */
@Component({
  selector: 'app-memories-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, RecordFilterBarComponent],
  styles: [BRAIN_CHIP_STYLES, BRAIN_RECORD_TABLE_STYLES],
  template: `

          <div class="content-header">
            <input type="search"
              [placeholder]="'brain.memories.searchPlaceholder' | transloco"
              [value]="store.memorySearch()"
              (input)="onMemorySearch($any($event.target).value)"
              [attr.aria-label]="'brain.memories.searchPlaceholder' | transloco" />
            <div class="pill-group" [attr.title]="'common.searchMode.tooltip' | transloco">
              <button [class.active]="store.memorySearchMode() === 'text'" (click)="setMemorySearchMode('text')">{{ 'common.sortAZ' | transloco }}</button>
              <button [class.active]="store.memorySearchMode() === 'semantic'" (click)="setMemorySearchMode('semantic')"><ph-icon name="star-four" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:3px;"/> {{ 'common.semantic' | transloco }}</button>
            </div>
            <button class="btn-primary btn btn-sm" (click)="openMemoryForm()" [disabled]="showMemoryForm()">{{ 'brain.memories.addButton' | transloco }}</button>
          </div>

          <!-- Add memory form -->
          @if (showMemoryForm()) {
            <form class="create-form" (ngSubmit)="createMemory()">
              <div class="field" style="flex:2; min-width:200px;">
                <label>{{ 'common.form.fact' | transloco }}</label>
                <textarea [(ngModel)]="memoryForm.fact" name="fact" rows="2" required style="width:100%;"></textarea>
              </div>
              <div class="field" style="flex:1; min-width:180px;">
                <label>{{ 'common.form.tags' | transloco }}</label>
                <app-tag-input [(value)]="memoryForm.tags" [suggestions]="store.memoryTagSuggestions()" inputName="memFormTags" />
              </div>
              <div class="field" style="flex:1; min-width:140px;">
                <label>{{ 'common.form.entities' | transloco }}</label>
                <div class="flyout-wrap">
                  <div class="entity-multi">
                    @for (chip of picker.entityChips(memoryForm.entityIds); track chip.id) {
                      <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(memoryForm, chip.id)"><ph-icon name="x" [size]="12"/></button></span>
                    }
                    <button type="button" class="chip-add" (click)="picker.openFlyout('create-memory-entityIds', memoryForm)">{{ 'common.addMore' | transloco }}</button>
                  </div>
                  @if (picker.flyoutField() === 'create-memory-entityIds') {
                    <div class="flyout-panel">
                      <app-entity-search
                        mode="picker"
                        [spaceId]="spaceId()"
                        placeholder="common.searchEntitiesPlaceholder"

                        (selected)="picker.pickEntity($event, memoryForm)"
                      />
                      <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                        <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
              <div class="field" style="flex:2; min-width:200px;">
                <label>{{ 'common.form.description' | transloco }}</label>
                <textarea [(ngModel)]="memoryForm.description" name="description" rows="3" style="resize:vertical;"></textarea>
              </div>
              <div class="field" style="flex:1; min-width:220px;">
                <label>{{ 'common.form.properties' | transloco }}</label>
                <app-properties-editor [schema]="store.memorySchema()" [required]="store.requiredProps(store.memorySchema())" [(value)]="memoryForm.properties" />
              </div>
              <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingMemory() || !memoryForm.fact.trim()">
                @if (creatingMemory()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'common.save' | transloco }}
              </button>
              <button class="btn-secondary btn btn-sm" type="button" (click)="showMemoryForm.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          @if (createMemoryError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createMemoryError() }}</div>
          }

          <!-- Shared type/tag filter (F6). Tag-clicks in the table feed this bar too. -->
          <div class="list-filter-row">
            <app-record-filter-bar
              [typeOptions]="store.memoryTypeOptions()"
              [tagSuggestions]="store.memoryTagSuggestions()"
              [value]="recordFilter()"
              (filterChange)="onFilterChange($event)"
            />
            @if (filterEntity(); as ent) {
              <span class="filter-chip">{{ 'brain.filter.entityPrefix' | transloco }} {{ ent }} <button [attr.aria-label]="'brain.filter.clearEntityAriaLabel' | transloco" (click)="clearFilter('entity')"><ph-icon name="x" [size]="12"/></button></span>
            }
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ 'brain.memories.table.fact' | transloco }}</th><th>{{ 'brain.memories.table.description' | transloco }}</th><th>{{ 'brain.memories.table.tags' | transloco }}</th><th>{{ 'brain.memories.table.entities' | transloco }}</th><th>{{ 'brain.memories.table.properties' | transloco }}</th><th>{{ 'brain.memories.table.created' | transloco }}</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (mem of store.filteredMemories(); track mem._id) {
                  @if (recordList.editingId() === mem._id) {
                    <tr>
                      <td colspan="7">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:2; min-width:200px; margin-bottom:0;">
                            <label>{{ 'common.form.fact' | transloco }}</label>
                            <textarea [(ngModel)]="editMemory.fact" name="editFact" rows="2" style="width:100%;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'common.form.description' | transloco }}</label>
                            <textarea [(ngModel)]="editMemory.description" name="editDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'common.form.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editMemory.tags" [suggestions]="store.memoryTagSuggestions()" inputName="memEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                            <label>{{ 'common.form.entities' | transloco }}</label>
                            <div class="flyout-wrap">
                              <div class="entity-multi">
                                @for (chip of picker.entityChips(editMemory.entityIds); track chip.id) {
                                  <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(editMemory, chip.id)"><ph-icon name="x" [size]="12"/></button></span>
                                }
                                <button type="button" class="chip-add" (click)="picker.openFlyout('edit-memory-entityIds', editMemory)">{{ 'common.addMore' | transloco }}</button>
                              </div>
                              @if (picker.flyoutField() === 'edit-memory-entityIds') {
                                <div class="flyout-panel">
                                  <app-entity-search
                                    mode="picker"
                                    [spaceId]="spaceId()"
                                    placeholder="common.searchEntitiesPlaceholder"

                                    (selected)="picker.pickEntity($event, editMemory)"
                                  />
                                  <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                    <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'common.form.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.memorySchema()"
                              [required]="store.requiredProps(store.memorySchema())"
                              [(value)]="editMemory.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditMemory(mem._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td style="max-width:300px; white-space:pre-wrap; word-break:break-word;">{{ mem.fact }}</td>
                      <td class="desc-cell" style="max-width:180px;" [title]="mem.description ?? ''">
                        {{ mem.description || '—' }}
                      </td>
                      <td style="font-size:11px;">
                        @for (tag of (mem.tags ?? []); track tag) { <span class="tag tag-clickable" (click)="applyFilter('tag', tag)">{{ tag }}</span> }
                        @if (!(mem.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td style="font-size:11px;">
                        @if (mem.entityIds?.length) {
                          <div class="chip-list">
                            @for (id of mem.entityIds!; track id) {
                              <span class="chip" [title]="id">{{ picker.entityNameCache()[id] || id.slice(0,8) + '…' }}</span>
                            }
                          </div>
                        } @else { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-properties-view [properties]="mem.properties" [schema]="store.memorySchema()" /></td>
                      <td style="color:var(--text-muted)">{{ mem.createdAt | date:'dd.MM.yyyy' }}</td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('memory', mem)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === mem._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteMemory(mem._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.title]="'brain.memories.deleteTitle' | transloco" [attr.aria-label]="'brain.memories.deleteAriaLabel' | transloco" (click)="requestDelete(mem._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="7">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadMemories' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="brain" [size]="48"/></div>
                      @if (store.memorySearch() && store.memories().length) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.memories.empty.noMatchQuery' | transloco: { query: store.memorySearch() } }}</p>
                      } @else {
                        <h3>{{ 'brain.memories.empty.title' | transloco }}</h3>
                        <p>{{ 'brain.memories.empty.body' | transloco }}</p>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (store.memorySearchMode() !== 'semantic') {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.filteredMemories().length ? (skip() + 1) + '–' + (skip() + store.filteredMemories().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.memories().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `,
})
export class MemoriesTabComponent extends RecordTabBase {
  readonly drawerState = inject(RecordDrawerState);
  private brainApi = inject(BrainApi);

  /** Emitted after a create/delete so the shell can refresh the space's tab-count stats. */
  readonly mutated = output<void>();

  recordFilter = signal<RecordFilter>({ type: '', tag: '' });
  filterEntity = signal('');

  showMemoryForm = signal(false);
  creatingMemory = signal(false);
  createMemoryError = signal('');
  memoryForm = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
  editMemory = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };

  private _memSemTimer: ReturnType<typeof setTimeout> | null = null;

  protected override resetOnSpaceChange(): void {
    this.recordFilter.set({ type: '', tag: '' });
    this.filterEntity.set('');
  }

  protected override load(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.recordList.loading.set(true);
    this.recordList.loadError.set(null);
    const filters: { tag?: string; entity?: string; type?: string } = {};
    if (this.recordFilter().tag) filters.tag = this.recordFilter().tag;
    if (this.filterEntity()) filters.entity = this.filterEntity();
    if (this.recordFilter().type) filters.type = this.recordFilter().type;
    this.brainApi.listMemories(spaceId, this.pageSize, this.skip(), filters).subscribe({
      next: ({ memories }) => {
        this.store.memories.set(memories);
        const ids = [...new Set(memories.flatMap(m => m.entityIds ?? []))];
        if (ids.length) this.picker.resolveEntityNames(ids);
        this.recordList.loading.set(false);
      },
      error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
    });
  }

  onMemorySearch(q: string): void {
    this.store.memorySearch.set(q);
    if (this.store.memorySearchMode() === 'semantic') {
      if (this._memSemTimer) clearTimeout(this._memSemTimer);
      if (!q.trim()) { this.store.memories.set([]); return; }
      this._memSemTimer = setTimeout(() => this.runSemanticMemorySearch(), 300);
    }
  }

  setMemorySearchMode(m: 'text' | 'semantic'): void {
    this.store.memorySearchMode.set(m);
    const q = this.store.memorySearch().trim();
    if (!q) return;
    if (m === 'semantic') this.runSemanticMemorySearch();
    else { this.skip.set(0); this.load(); }
  }

  runSemanticMemorySearch(): void {
    const q = this.store.memorySearch().trim();
    const spaceId = this.spaceId();
    if (!q || !spaceId) { this.store.memories.set([]); return; }
    this.brainApi.recallBrain(spaceId, { query: q, types: ['memory'], topK: 20 }).pipe(
      catchError(() => of({ results: [], count: 0 })),
    ).subscribe(res => {
      this.store.memories.set(res.results.filter(r => r.type === 'memory').map(r => ({
        _id: r['_id'] as string,
        fact: (r['fact'] as string) ?? '',
        tags: (r['tags'] as string[]) ?? [],
        entityIds: (r['entityIds'] as string[]) ?? [],
        description: r['description'] as string | undefined,
        properties: (r['properties'] as Record<string, string | number | boolean>) ?? {},
        createdAt: (r['createdAt'] as string) ?? '',
        seq: (r['seq'] as number) ?? 0,
        author: r['author'] as { instanceId: string } | undefined,
      } as Memory)));
    });
  }

  onFilterChange(f: RecordFilter): void {
    this.recordFilter.set(f);
    this.skip.set(0);
    this.load();
  }

  applyFilter(type: 'tag' | 'entity', value: string): void {
    if (type === 'tag') this.recordFilter.set({ ...this.recordFilter(), tag: value });
    else this.filterEntity.set(value);
    this.skip.set(0);
    this.load();
  }

  clearFilter(which: 'tag' | 'entity' | 'all'): void {
    if (which === 'tag' || which === 'all') this.recordFilter.set({ ...this.recordFilter(), tag: '' });
    if (which === 'entity' || which === 'all') this.filterEntity.set('');
    this.skip.set(0);
    this.load();
  }

  openMemoryForm(): void {
    this.memoryForm = { fact: '', tags: [], entityIds: '', description: '', properties: this.store.buildPropertiesObject('memory') };
    this.showMemoryForm.set(true);
  }

  createMemory(): void {
    if (!this.memoryForm.fact.trim()) return;
    this.creatingMemory.set(true);
    this.createMemoryError.set('');
    const entityIds = this.memoryForm.entityIds.split(',').map(s => s.trim()).filter(Boolean);
    const body: Parameters<BrainApi['createMemory']>[1] = { fact: this.memoryForm.fact.trim() };
    if (this.memoryForm.tags.length) body.tags = this.memoryForm.tags;
    if (entityIds.length) body.entityIds = entityIds;
    if (this.memoryForm.description.trim()) body.description = this.memoryForm.description.trim();
    if (Object.keys(this.memoryForm.properties).length) body.properties = this.memoryForm.properties;
    this.brainApi.createMemory(this.spaceId(), body).subscribe({
      next: () => {
        this.creatingMemory.set(false);
        this.showMemoryForm.set(false);
        this.memoryForm = { fact: '', tags: [], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
        this.mutated.emit();
        this.load();
      },
      error: (err) => { this.creatingMemory.set(false); this.createMemoryError.set(fmtApiError(err, 'Failed to create memory')); },
    });
  }

  startEditMemory(mem: Memory): void {
    this.recordList.editingId.set(mem._id);
    this.recordList.editError.set('');
    this.editMemory = {
      fact: mem.fact,
      tags: mem.tags ?? [],
      entityIds: (mem.entityIds ?? []).join(', '),
      description: mem.description ?? '',
      properties: this.store.buildPropertiesObject('memory', mem.properties ?? {}),
    };
  }

  saveEditMemory(id: string): void {
    this.recordList.editSaving.set(true);
    this.recordList.editError.set('');
    const memProps = this.editMemory.properties;
    this.brainApi.updateMemory(this.spaceId(), id, {
      fact: this.editMemory.fact.trim(),
      tags: this.editMemory.tags,
      entityIds: this.editMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
      description: this.editMemory.description.trim(),
      ...(Object.keys(memProps).length ? { properties: memProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.recordList.editSaving.set(false);
        this.recordList.editingId.set('');
        this.store.memories.update(list => list.map(m => m._id === id ? updated : m));
      },
      error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteMemory(id: string): void {
    this.recordList.confirmDeleteId.set('');
    this.brainApi.deleteMemory(this.spaceId(), id).subscribe({
      next: () => { this.store.memories.update(list => list.filter(m => m._id !== id)); this.mutated.emit(); },
      error: () => {},
    });
  }
}
