import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FileMeta } from '../../core/api.types';
import { FilesApi } from '../../core/files-api.service';
import { ToastService } from '../../core/toast.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from './entity-ref-field.component';
import { MemoryRefFieldComponent } from './memory-ref-field.component';
import { ChronoRefFieldComponent } from './chrono-ref-field.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { StepProgressBarComponent } from '../../shared/step-progress-bar.component';
import { RecordTabBase } from './record-tab-base';
import { SortableHeaderComponent } from './sortable-header.component';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';

/**
 * The File Meta record tab, extracted from BrainComponent (A17.9b-6g). The odd one of the five:
 * records come from ingested files (NO create form), it uses the FILES api (updateFileMeta /
 * deleteFileMeta by path / retryEmbedding), it wires the shared `fm` memory/chrono pickers on
 * `EntityRefPicker`. Freetext is the docked **Path column** filter → the server's substring `?search=`
 * (slice 4c-i, matching the other list tabs). The shell's Files-tab "open in File Meta" deep-link seeds
 * that column filter via `store.fileMetaSearch` (consumed in `resetOnSpaceChange`). A **semantic** file
 * top bar is a later slice (4c-ii).
 *
 * Self-loads via a `spaceId` effect. Two outputs: `mutated` (delete refreshes the space stats) and
 * `openInManager` (navigating to the Files tab is shell nav — the shell handles the emitted path).
 */
@Component({
  selector: 'app-filemeta-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, ChronoRefFieldComponent, PhIconComponent, ErrorStateComponent, StepProgressBarComponent, SortableHeaderComponent],
  styles: [BRAIN_CHIP_STYLES, BRAIN_RECORD_TABLE_STYLES],
  template: `
          @if (recordList.loading()) {
            <div class="empty-state"><span class="spinner"></span></div>
          } @else if (recordList.loadError() !== null) {
            <app-error-state [message]="'brain.error.loadFileMeta' | transloco" [reason]="recordList.loadError() ?? ''" (retry)="retryCurrentTab()" />
          } @else if (!store.fileMetas().length) {
            <div class="empty-state">{{ 'brain.fileMeta.empty' | transloco }}</div>
          } @else {
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th app-sort-th field="path" label="brain.fileMeta.table.path" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)">
                      <input class="col-filter-input" type="text" [ngModel]="search()" (ngModelChange)="setSearchFilter($event)"
                        [placeholder]="'brain.filter.searchPlaceholder' | transloco" [attr.aria-label]="'brain.filter.searchPlaceholder' | transloco" />
                    </th>
                    <th>{{ 'brain.fileMeta.table.description' | transloco }}</th>
                    <th app-sort-th label="brain.fileMeta.table.tags">
                      <input class="col-filter-input" type="text" [ngModel]="recordFilter().tag" (ngModelChange)="setTagFilter($event)"
                        [placeholder]="'brain.filter.tagPlaceholder' | transloco" [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco" />
                    </th>
                    <th>{{ 'brain.fileMeta.table.entities' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.memories' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.chrono' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.size' | transloco }}</th>
                    <th app-sort-th field="updatedAt" label="brain.fileMeta.table.updated" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                    <th>{{ 'brain.fileMeta.table.actions' | transloco }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fm of store.fileMetas(); track fm._id) {
                    @if (recordList.editingId() === fm._id) {
                      <tr class="edit-row"><td colspan="9">
                        <form class="edit-form" (ngSubmit)="saveEditFileMeta(fm._id)" #fmEditForm="ngForm">
                          <div class="edit-form-fields">
                            <div class="field" style="flex:2; min-width:180px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.description' | transloco }}</label>
                              <textarea [(ngModel)]="editFileMeta.description" name="fmEditDesc" rows="2" style="resize:vertical;"></textarea>
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.tags' | transloco }}</label>
                              <app-tag-input [(value)]="editFileMeta.tags" inputName="fmEditTags" />
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.entities' | transloco }}</label>
                              <app-entity-ref-field [target]="editFileMeta" [spaceId]="spaceId()" />
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.memories' | transloco }}</label>
                              <app-memory-ref-field [target]="editFileMeta" />
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.chrono' | transloco }}</label>
                              <app-chrono-ref-field [target]="editFileMeta" />
                            </div>
                          </div>
                          @if (recordList.editError()) {
                            <div class="error-msg">{{ recordList.editError() }}</div>
                          }
                          <div class="edit-form-actions">
                            <button class="btn btn-sm btn-primary" type="submit" [disabled]="recordList.editSaving()">
                              @if (recordList.editSaving()) { <span class="spinner" style="width:10px;height:10px;border-width:2px;"></span> }
                              {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" type="button" (click)="recordList.cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                        </form>
                      </td></tr>
                    } @else {
                      <tr>
                        <td>
                          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <button class="link-btn" [attr.title]="'brain.fileMeta.openInFilesTabTitle' | transloco" (click)="openInManager.emit(fm.path)">{{ fm.path }}</button>
                            @if (fm.deletedAt) {
                              <span class="badge badge-red" style="font-size:10px;" [title]="'Deleted ' + (fm.deletedAt | date:'dd.MM.yyyy HH:mm')">{{ 'brain.fileMeta.deleted' | transloco }}</span>
                            }
                            @if (fm.embeddingStatus === 'pending' || fm.embeddingStatus === 'processing') {
                              @if (fm.progress) {
                                <!-- The route is known, so show WHICH stage is running rather than
                                     that something is. The spinner below is the fallback for a job
                                     that has been claimed but has not reported its first step. -->
                                <app-step-progress-bar [progress]="fm.progress" [progressAt]="fm.progressAt"/>
                              } @else {
                                <span class="badge badge-blue" style="font-size:10px;" [attr.title]="'brain.fileMeta.embedding' | transloco"><span class="spinner" style="width:8px;height:8px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:3px;"></span>{{ 'brain.fileMeta.embedding' | transloco }}</span>
                              }
                            } @else if (fm.embeddingStatus === 'failed') {
                              <span class="badge badge-red" style="font-size:10px;" [title]="fm.mediaJobError || 'Embedding failed'">{{ 'brain.fileMeta.embeddingFailed' | transloco }}</span>
                            } @else if (fm.embeddingStatus === 'partial') {
                              <span class="badge badge-yellow" style="font-size:10px;" title="Some chunks could not be embedded — retry to complete">{{ 'brain.fileMeta.embeddingPartial' | transloco }}</span>
                            }
                            @if (fm.embeddingStatus === 'failed' || fm.embeddingStatus === 'partial') {
                              <button class="link-btn" style="font-size:10px;" [disabled]="retryingEmbedding().has(fm.path)" (click)="retryFileEmbedding(fm)">{{ 'brain.fileMeta.retryEmbedding' | transloco }}</button>
                            }
                          </div>
                        </td>
                        <td class="desc-cell" style="max-width:200px;" [title]="fm.description ?? ''"><div class="desc-clamp">{{ fm.description || '–' }}</div></td>
                        <td>
                          <div class="chip-list">
                            @for (tag of fm.tags; track tag) {
                              <span class="chip chip-tag">{{ tag }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <div class="chip-list">
                            @for (id of (fm.entityIds ?? []); track id) {
                              <span class="chip" [title]="id">{{ picker.entityNameCache()[id] || id.slice(0,8) + '…' }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <div class="chip-list">
                            @for (id of (fm.memoryIds ?? []); track id) {
                              <span class="chip" [title]="id">{{ picker.memoryRefTitle(id) }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <div class="chip-list">
                            @for (id of (fm.chronoIds ?? []); track id) {
                              <span class="chip" [title]="id">{{ picker.chronoRefTitle(id) }}</span>
                            }
                          </div>
                        </td>
                        <td class="text-muted" style="white-space:nowrap;">{{ (fm.sizeBytes / 1024).toFixed(1) }} KB</td>
                        <td class="text-muted" style="white-space:nowrap;">{{ fm.updatedAt | date:'dd.MM.yyyy HH:mm' }}</td>
                        <td class="actions-cell">
                          @if (recordList.confirmDeleteId() === fm._id) {
                            <span class="delete-confirm">
                              <button class="btn btn-xs btn-danger" (click)="deleteFileMeta(fm._id)">{{ 'common.confirm' | transloco }}</button>
                              <button class="btn btn-xs btn-secondary" (click)="cancelDelete()">{{ 'common.cancel' | transloco }}</button>
                            </span>
                          } @else {
                            <button class="icon-btn" [attr.title]="'brain.fileMeta.editTitle' | transloco" [attr.aria-label]="'brain.fileMeta.editAriaLabel' | transloco" (click)="startEditFileMeta(fm)"><ph-icon name="pencil-simple" [size]="16"/></button>
                            <button class="icon-btn icon-btn-danger" [attr.title]="'brain.fileMeta.removeTitle' | transloco" [attr.aria-label]="'brain.fileMeta.removeAriaLabel' | transloco" (click)="requestDelete(fm._id)"><ph-icon name="trash" [size]="16"/></button>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="skip() === 0" (click)="prevPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.fileMetas().length ? (skip() + 1) + '–' + (skip() + store.fileMetas().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.fileMetas().length < pageSize" (click)="nextPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
  `,
})
export class FilemetaTabComponent extends RecordTabBase {
  private filesApi = inject(FilesApi);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  /** Emitted after a delete so the shell can refresh the space's tab-count stats. */
  readonly mutated = output<void>();
  /** Emitted to open a file's directory in the Files tab (shell navigation). */
  readonly openInManager = output<string>();

  retryingEmbedding = signal<Set<string>>(new Set());
  editFileMeta = { description: '', tags: [] as string[], entityIds: '', memoryIds: [] as string[], chronoIds: [] as string[] };

  protected override resetOnSpaceChange(): void {
    this.recordFilter.set({ type: '', tag: '' });
    // Seed the Path-column freetext from the deep-link term the shell may have set (Files-tab
    // "open in File Meta" → `store.fileMetaSearch(path)`), so that navigation still filters the list.
    // Runs after the base's `search.set('')`; a normal open (empty seed) leaves the filter clear.
    this.search.set(this.store.fileMetaSearch());
  }

  protected override load(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.recordList.loading.set(true);
    this.recordList.loadError.set(null);
    const filters: { search?: string; tag?: string } = {};
    if (this.searchParam()) filters.search = this.searchParam();
    if (this.recordFilter().tag) filters.tag = this.recordFilter().tag;
    this.filesApi.listFileMeta(spaceId, this.pageSize, this.skip(), filters, this.sortParam()).subscribe({
      next: ({ files }) => { this.store.fileMetas.set(files); this.recordList.loading.set(false); },
      error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
    });
  }

  startEditFileMeta(entry: FileMeta): void {
    this.recordList.editingId.set(entry._id);
    this.recordList.editError.set('');
    this.editFileMeta = {
      description: entry.description ?? '',
      tags: entry.tags ?? [],
      entityIds: (entry.entityIds ?? []).join(', '),
      memoryIds: [...(entry.memoryIds ?? [])],
      chronoIds: [...(entry.chronoIds ?? [])],
    };
    // Resolve entity names / memory facts / chrono titles so the chips show labels, not truncated ids.
    this.picker.resolveEntityNamesFor(this.editFileMeta.entityIds);
    this.picker.resolveMemoryTitles(this.editFileMeta.memoryIds);
    this.picker.resolveChronoTitles(this.editFileMeta.chronoIds);
  }

  saveEditFileMeta(id: string): void {
    this.recordList.editSaving.set(true);
    this.recordList.editError.set('');
    this.filesApi.updateFileMeta(this.spaceId(), id, {
      description: this.editFileMeta.description.trim(),
      tags: this.editFileMeta.tags,
      entityIds: this.editFileMeta.entityIds.split(',').map(s => s.trim()).filter(Boolean),
      memoryIds: this.editFileMeta.memoryIds,
      chronoIds: this.editFileMeta.chronoIds,
    }).subscribe({
      next: (updated) => {
        this.recordList.editSaving.set(false);
        this.recordList.editingId.set('');
        this.store.fileMetas.update(list => list.map(f => f._id === id ? updated : f));
      },
      error: (err) => { this.recordList.editSaving.set(false); this.recordList.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteFileMeta(id: string): void {
    // Deleting just removes the metadata record, not the file itself.
    const fm = this.store.fileMetas().find(f => f._id === id);
    if (!fm) { this.recordList.confirmDeleteId.set(''); return; }
    this.filesApi.deleteFileMeta(this.spaceId(), fm.path).subscribe({
      next: () => {
        this.recordList.confirmDeleteId.set('');
        this.store.fileMetas.update(list => list.filter(f => f._id !== id));
        this.mutated.emit();
      },
      error: () => {
        this.recordList.confirmDeleteId.set('');
        this.toast.error(this.transloco.translate('brain.error.deleteFileMetaFailed'));
      },
    });
  }

  retryFileEmbedding(fm: FileMeta): void {
    const spaceId = this.spaceId();
    if (!spaceId || this.retryingEmbedding().has(fm.path)) return;
    this.retryingEmbedding.update(s => new Set(s).add(fm.path));
    const done = () => {
      this.retryingEmbedding.update(s => { const n = new Set(s); n.delete(fm.path); return n; });
      this.load();
    };
    this.filesApi.retryEmbedding(spaceId, fm.path).subscribe({ next: done, error: done });
  }
}
