import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { Entity } from '../../core/api.types';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { SortableHeaderComponent } from './sortable-header.component';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordTabBase } from './record-tab-base';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';

/**
 * The Entities record tab, extracted from BrainComponent (A17.9b-6e) following the memories pattern.
 * Owns the entity create form, the (drawer-superseded) inline edit, delete, and the tab's own
 * entity-search / type-tag filter / pagination + loader. Self-loads via an effect on the `spaceId`
 * input; create/delete emit `mutated` so the shell refreshes tab-count stats.
 *
 * Entity delta from memories: both create AND inline-edit strip empty optional properties via the
 * entity schema; entity search uses the <app-entity-search> bar (semantic default) with no per-tab
 * search-mode pill.
 */
@Component({
  selector: 'app-entities-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, PropertiesViewComponent, PropertiesEditorComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, SortableHeaderComponent],
  styles: [BRAIN_CHIP_STYLES, BRAIN_RECORD_TABLE_STYLES],
  template: `

          <div class="content-header">
            <app-entity-search
              mode="bar"
              [spaceId]="spaceId()"
              placeholder="common.searchEntitiesPlaceholder"
              defaultMode="semantic"
              (queryChange)="onEntitySearchChange($event)"
              (cleared)="onEntitySearchClear()"
              (selected)="onEntitySearchPick($event)"
            />
            <button class="btn-primary btn btn-sm" (click)="openEntityForm()" [disabled]="showEntityForm()">{{ 'brain.entities.addButton' | transloco }}</button>
          </div>

          @if (showEntityForm()) {
            <form class="create-form" (ngSubmit)="createEntity()">
              <!-- Row 1: single-line fields, one uniform height (name, type, tags). -->
              <div class="form-row">
                <div class="field" style="flex:2; min-width:140px;">
                  <label>{{ 'brain.entities.table.name' | transloco }}</label>
                  <input type="text" [(ngModel)]="entityForm.name" name="name" required />
                </div>
                <div class="field" style="width:150px;">
                  <label>{{ 'brain.entities.table.type' | transloco }} @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</label>
                  @if (store.entityTypeNames().length) {
                    <select [(ngModel)]="entityForm.type" name="type" required (ngModelChange)="onEntityTypeChange($event, 'create')">
                      @for (t of store.entityTypeNames(); track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
                  } @else {
                    <input type="text" [(ngModel)]="entityForm.type" name="type" [placeholder]="'brain.entities.form.typePlaceholder' | transloco" />
                  }
                </div>
                <div class="field" style="flex:2; min-width:180px;">
                  <label>{{ 'brain.entities.table.tags' | transloco }}</label>
                  <app-tag-input [(value)]="entityForm.tags" [suggestions]="store.entityTagSuggestions()" inputName="entFormTags" />
                </div>
              </div>
              <!-- Row 2: the tall fields, tops aligned, each grows (description | properties). -->
              <div class="form-row rich">
                <div class="field">
                  <label>{{ 'brain.entities.table.description' | transloco }}</label>
                  <textarea [(ngModel)]="entityForm.description" name="description" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>{{ 'brain.entities.table.properties' | transloco }}</label>
                  <app-properties-editor
                    [schema]="store.entitySchema(entityForm.type)"
                    [required]="store.requiredProps(store.entitySchema(entityForm.type))"
                    [(value)]="entityForm.properties"
                  />
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEntity() || !entityForm.name.trim() || (store.entityTypeNames().length ? !entityForm.type : false)">
                  @if (creatingEntity()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                  {{ 'common.save' | transloco }}
                </button>
                <button class="btn-secondary btn btn-sm" type="button" (click)="showEntityForm.set(false)">{{ 'common.cancel' | transloco }}</button>
              </div>
            </form>
          }

          @if (createEntityError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEntityError() }}</div>
          }

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th app-sort-th field="name" label="brain.entities.table.name" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th app-sort-th field="type" label="brain.entities.table.type" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                    <select class="col-filter-select" [ngModel]="recordFilter().type" (ngModelChange)="setTypeFilter($event)" [attr.aria-label]="'brain.filter.label' | transloco">
                      <option value="">{{ 'brain.filter.allTypes' | transloco }}</option>
                      @for (t of store.entityTypeOptions(); track t) { <option [value]="t">{{ t }}</option> }
                    </select>
                  </th>
                  <th>{{ 'brain.entities.table.description' | transloco }}</th>
                  <th app-sort-th label="brain.entities.table.tags">
                    <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                      [attr.list]="tagListId" [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    <datalist [id]="tagListId">@for (s of store.entityTagSuggestions(); track s) { <option [value]="s"></option> }</datalist>
                  </th>
                  <th>{{ 'brain.entities.table.properties' | transloco }}</th>
                  <th app-sort-th field="createdAt" label="brain.entities.table.created" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (ent of store.entities(); track ent._id) {
                  @if (recordList.editingId() === ent._id) {
                    <tr>
                      <td colspan="7">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:1; min-width:120px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.name' | transloco }}</label>
                            <input type="text" [(ngModel)]="editEntity.name" name="editEntName" />
                          </div>
                          <div class="field" style="width:120px; margin-bottom:0;">
                            <label>Type @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</label>
                            @if (store.entityTypeNames().length) {
                              <select [(ngModel)]="editEntity.type" name="editEntType" (ngModelChange)="onEntityTypeChange($event, 'inline')">
                                @for (t of store.entityTypeNames(); track t) {
                                  <option [value]="t">{{ t }}</option>
                                }
                              </select>
                            } @else {
                              <input type="text" [(ngModel)]="editEntity.type" name="editEntType" />
                            }
                          </div>
                          <div class="field" style="flex:1; min-width:160px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editEntity.description" name="editEntDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editEntity.tags" [suggestions]="store.entityTagSuggestions()" inputName="entEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:220px; margin-bottom:0;">
                            <label>{{ 'brain.entities.table.properties' | transloco }}</label>
                            <app-properties-editor
                              [schema]="store.entitySchema(editEntity.type)"
                              [required]="store.requiredProps(store.entitySchema(editEntity.type))"
                              [(value)]="editEntity.properties"
                            />
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="recordList.editSaving()" (click)="saveEditEntity(ent._id)">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } Save
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (recordList.editError()) { <div style="font-size:12px; color:var(--error);">{{ recordList.editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td>{{ ent.name }}</td>
                      <td>
                        @if (ent.type) { <span class="badge badge-purple">{{ ent.type }}</span> }
                      </td>
                      <td class="desc-cell" style="max-width:200px;" [title]="ent.description ?? ''">
                        <div class="desc-clamp">{{ ent.description || '—' }}</div>
                      </td>
                      <td style="font-size:11px;">
                        @for (tag of (ent.tags ?? []); track tag) { <span class="tag">{{ tag }}</span> }
                        @if (!(ent.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-properties-view [properties]="ent.properties" [schema]="store.entitySchema(ent.type)" /></td>
                      <td style="color:var(--text-muted)">{{ ent.createdAt | date:'dd.MM.yyyy' }}</td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('entity', ent)"><ph-icon name="eye" [size]="16"/></button>
                        @if (recordList.confirmDeleteId() === ent._id) {
                          <span class="inline-confirm">
                            Delete?
                            <button class="btn btn-sm btn-danger" (click)="deleteEntity(ent._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.entities.deleteAriaLabel' | transloco" (click)="requestDelete(ent._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="7">
                    @if (recordList.loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEntities' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="tag" [size]="48"/></div>
                      <h3>{{ 'brain.entities.empty.title' | transloco }}</h3>
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
            <span class="pager-info">{{ store.entities().length ? (skip() + 1) + '–' + (skip() + store.entities().length) : '–' }}</span>
            <button class="btn btn-sm btn-secondary" [disabled]="store.entities().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
          </div>
  `,
})
export class EntitiesTabComponent extends RecordTabBase {
  readonly drawerState = inject(RecordDrawerState);
  private brainApi = inject(BrainApi);

  /** Emitted after a create/delete so the shell can refresh the space's tab-count stats. */
  readonly mutated = output<void>();

  entitySearch = signal('');

  showEntityForm = signal(false);
  creatingEntity = signal(false);
  createEntityError = signal('');
  entityForm = { name: '', type: '', tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  editEntity = { name: '', type: '', tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };

  protected override resetOnSpaceChange(): void {
    this.entitySearch.set('');
    this.recordFilter.set({ type: '', tag: '' });
  }

  protected override load(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.recordList.loading.set(true);
    this.recordList.loadError.set(null);
    const ef: { search?: string; type?: string; tag?: string } = {};
    if (this.entitySearch()) ef.search = this.entitySearch();
    if (this.recordFilter().type) ef.type = this.recordFilter().type;
    if (this.recordFilter().tag) ef.tag = this.recordFilter().tag;
    this.brainApi.listEntities(spaceId, this.pageSize, this.skip(), ef, this.sortParam()).subscribe({
      next: ({ entities }) => { this.store.entities.set(entities); this.recordList.loading.set(false); },
      error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
    });
  }

  /** Reload without the loading overlay — used by the search bar (keeps focus/typing smooth). */
  private loadEntitiesSilent(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    const ef: { search?: string; type?: string; tag?: string } = {};
    if (this.entitySearch()) ef.search = this.entitySearch();
    if (this.recordFilter().type) ef.type = this.recordFilter().type;
    if (this.recordFilter().tag) ef.tag = this.recordFilter().tag;
    this.brainApi.listEntities(spaceId, this.pageSize, this.skip(), ef, this.sortParam()).subscribe({
      next: ({ entities }) => this.store.entities.set(entities),
      error: () => {},
    });
  }

  onEntitySearchChange(q: string): void {
    this.entitySearch.set(q);
    this.skip.set(0);
    this.loadEntitiesSilent();
  }
  onEntitySearchClear(): void {
    this.entitySearch.set('');
    this.skip.set(0);
    this.loadEntitiesSilent();
  }
  onEntitySearchPick(ent: Entity): void {
    this.entitySearch.set(ent.name);
    this.skip.set(0);
    this.loadEntitiesSilent();
  }

  openEntityForm(): void {
    const firstType = Object.keys(this.store.spaceMeta()?.typeSchemas?.entity ?? {})[0] ?? '';
    this.entityForm = { name: '', type: firstType, tags: [], description: '', properties: this.store.buildPropertiesObject('entity', {}, firstType) };
    this.showEntityForm.set(true);
  }

  /** Called when the entity type dropdown changes. Rebuilds properties: keeps existing values, adds defaults for any new schema-required fields. */
  onEntityTypeChange(type: string, target: 'create' | 'inline'): void {
    if (target === 'create') {
      this.entityForm.properties = this.store.buildPropertiesObject('entity', this.entityForm.properties, type);
    } else {
      this.editEntity.properties = this.store.buildPropertiesObject('entity', this.editEntity.properties, type);
    }
  }

  createEntity(): void {
    if (!this.entityForm.name.trim()) return;
    this.creatingEntity.set(true);
    this.createEntityError.set('');
    const body: Parameters<BrainApi['createEntity']>[1] = { name: this.entityForm.name.trim() };
    if (this.entityForm.type.trim()) body.type = this.entityForm.type.trim();
    if (this.entityForm.tags.length) body.tags = this.entityForm.tags;
    if (this.entityForm.description.trim()) body.description = this.entityForm.description.trim();
    const props = this.store.stripEmptyOptionalProps(this.entityForm.properties, this.store.entitySchema(this.entityForm.type));
    if (Object.keys(props).length) body.properties = props;
    this.brainApi.createEntity(this.spaceId(), body).subscribe({
      next: () => {
        this.creatingEntity.set(false);
        this.showEntityForm.set(false);
        this.entityForm = { name: '', type: '', tags: [], description: '', properties: {} as Record<string, string | number | boolean> };
        this.mutated.emit();
        this.load();
      },
      error: (err) => { this.creatingEntity.set(false); this.createEntityError.set(fmtApiError(err, 'Failed to create entity')); },
    });
  }

  startEditEntity(ent: Entity): void {
    this.recordList.editingId.set(ent._id);
    this.recordList.editError.set('');
    this.editEntity = {
      name: ent.name,
      type: ent.type ?? '',
      tags: ent.tags ?? [],
      description: ent.description ?? '',
      properties: this.store.buildPropertiesObject('entity', ent.properties ?? {}, ent.type),
    };
  }

  saveEditEntity(id: string): void {
    this.recordList.editSaving.set(true);
    this.recordList.editError.set('');
    const entProps = this.store.stripEmptyOptionalProps(this.editEntity.properties, this.store.entitySchema(this.editEntity.type));
    this.brainApi.updateEntity(this.spaceId(), id, {
      name: this.editEntity.name.trim(),
      type: this.editEntity.type.trim(),
      tags: this.editEntity.tags,
      description: this.editEntity.description.trim(),
      ...(Object.keys(entProps).length ? { properties: entProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.recordList.editSaving.set(false);
        this.recordList.editingId.set('');
        this.store.entities.update(list => list.map(e => e._id === id ? updated : e));
      },
      error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteEntity(id: string): void {
    this.recordList.confirmDeleteId.set('');
    this.brainApi.deleteEntity(this.spaceId(), id).subscribe({
      next: () => { this.store.entities.update(list => list.filter(e => e._id !== id)); this.mutated.emit(); },
      error: () => {},
    });
  }
}
