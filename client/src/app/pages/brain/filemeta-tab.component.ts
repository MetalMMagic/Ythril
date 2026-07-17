import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FileMeta } from '../../core/api.types';
import { FilesApi } from '../../core/files-api.service';
import { ToastService } from '../../core/toast.service';
import { httpErrorReason } from '../../core/http-error';
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordTabBase } from './record-tab-base';
import { RecordSearchBarComponent } from './record-search-bar.component';
import { fmtApiError } from './brain-format';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { BRAIN_RECORD_TABLE_STYLES } from './brain-table.styles';

/**
 * The File Meta record tab, extracted from BrainComponent (A17.9b-6g). The odd one of the five:
 * records come from ingested files (NO create form), it uses the FILES api (updateFileMeta /
 * deleteFileMeta by path / retryEmbedding), it wires the shared `fm` memory/chrono pickers on
 * `EntityRefPicker`, and it has NO semantic search — its search is a pure client-side filter via
 * `store.filteredFileMetas` (the loader still passes the term for the server-side first page).
 *
 * Self-loads via a `spaceId` effect. Two outputs: `mutated` (delete refreshes the space stats) and
 * `openInManager` (navigating to the Files tab is shell nav — the shell handles the emitted path).
 */
@Component({
  selector: 'app-filemeta-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagInputComponent, EntitySearchComponent, PhIconComponent, ErrorStateComponent, RecordSearchBarComponent],
  styles: [BRAIN_CHIP_STYLES, BRAIN_RECORD_TABLE_STYLES],
  template: `
          <div class="content-header">
            <app-record-search-bar [value]="store.fileMetaSearch()" (valueChange)="onFileMetaSearch($event)" placeholder="brain.fileMeta.filterPlaceholder" ariaLabel="brain.fileMeta.filterAriaLabel" />
          </div>
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
                    <th>{{ 'brain.fileMeta.table.path' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.description' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.tags' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.entities' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.memories' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.chrono' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.size' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.updated' | transloco }}</th>
                    <th>{{ 'brain.fileMeta.table.actions' | transloco }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fm of store.filteredFileMetas(); track fm._id) {
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
                              <div class="flyout-wrap">
                                <div class="entity-multi">
                                  @for (chip of picker.entityChips(editFileMeta.entityIds); track chip.id) {
                                    <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(editFileMeta, chip.id)"><ph-icon name="x" [size]="12"/></button></span>
                                  }
                                  <button type="button" class="chip-add" (click)="picker.openFlyout('edit-filemeta-entityIds', editFileMeta)">{{ 'common.addMore' | transloco }}</button>
                                </div>
                                @if (picker.flyoutField() === 'edit-filemeta-entityIds') {
                                  <div class="flyout-panel">
                                    <app-entity-search mode="picker" [spaceId]="spaceId()" placeholder="common.searchEntitiesPlaceholder" (selected)="picker.pickEntity($event, editFileMeta)" />
                                    <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                      <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.memories' | transloco }}</label>
                              <div class="flyout-wrap">
                                <div class="entity-multi">
                                  @for (id of editFileMeta.memoryIds; track id) {
                                    <span class="chip" [title]="id"><span class="chip-name">{{ picker.fmMemoryTitle(id) }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeFmMemoryId(editFileMeta, id)"><ph-icon name="x" [size]="12"/></button></span>
                                  }
                                  <button type="button" class="chip-add" (click)="picker.openFlyout('edit-filemeta-memoryIds')">{{ 'common.addMore' | transloco }}</button>
                                </div>
                                @if (picker.flyoutField() === 'edit-filemeta-memoryIds') {
                                  <div class="flyout-panel">
                                    <input type="text" [value]="picker.fmMemPickerQuery()" (input)="picker.onFmMemPickerInput($any($event.target).value)" [placeholder]="'brain.fileMeta.picker.searchMemories' | transloco" style="width:100%; margin-bottom:6px;" />
                                    @for (mem of picker.fmMemPickerResults(); track mem._id) {
                                      <div class="flyout-result" (click)="picker.addFmMemoryId(editFileMeta, mem._id); picker.closeFlyout()" style="cursor:pointer; padding:4px 6px; border-radius:4px;">
                                        {{ mem.fact.slice(0, 60) }}{{ mem.fact.length > 60 ? '…' : '' }}
                                      </div>
                                    }
                                    <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                      <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                            <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                              <label>{{ 'brain.fileMeta.table.chrono' | transloco }}</label>
                              <div class="flyout-wrap">
                                <div class="entity-multi">
                                  @for (id of editFileMeta.chronoIds; track id) {
                                    <span class="chip" [title]="id"><span class="chip-name">{{ picker.fmChronoTitle(id) }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeFmChronoId(editFileMeta, id)"><ph-icon name="x" [size]="12"/></button></span>
                                  }
                                  <button type="button" class="chip-add" (click)="picker.openFlyout('edit-filemeta-chronoIds')">{{ 'common.addMore' | transloco }}</button>
                                </div>
                                @if (picker.flyoutField() === 'edit-filemeta-chronoIds') {
                                  <div class="flyout-panel">
                                    <input type="text" [value]="picker.fmChronoPickerQuery()" (input)="picker.onFmChronoPickerInput($any($event.target).value)" [placeholder]="'brain.fileMeta.picker.searchChrono' | transloco" style="width:100%; margin-bottom:6px;" />
                                    @for (c of picker.fmChronoPickerResults(); track c._id) {
                                      <div class="flyout-result" (click)="picker.addFmChronoId(editFileMeta, c._id); picker.closeFlyout()" style="cursor:pointer; padding:4px 6px; border-radius:4px;">
                                        {{ c.title.slice(0, 60) }}{{ c.title.length > 60 ? '…' : '' }}
                                      </div>
                                    }
                                    <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                      <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                                    </div>
                                  </div>
                                }
                              </div>
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
                              <span class="badge badge-blue" style="font-size:10px;" title="Embedding in progress…"><span class="spinner" style="width:8px;height:8px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:3px;"></span>{{ 'brain.fileMeta.embedding' | transloco }}</span>
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
                        <td class="desc-cell" style="max-width:200px;" [title]="fm.description ?? ''">{{ fm.description || '–' }}</td>
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
                              <span class="chip" [title]="id">{{ picker.fmMemoryTitle(id) }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <div class="chip-list">
                            @for (id of (fm.chronoIds ?? []); track id) {
                              <span class="chip" [title]="id">{{ picker.fmChronoTitle(id) }}</span>
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

  // No resetOnSpaceChange override: file-meta has no filter bar, so the base's skip reset is enough.

  protected override load(): void {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.recordList.loading.set(true);
    this.recordList.loadError.set(null);
    this.filesApi.listFileMeta(spaceId, this.pageSize, this.skip(), this.store.fileMetaSearch() || undefined).subscribe({
      next: ({ files }) => { this.store.fileMetas.set(files); this.recordList.loading.set(false); },
      error: (e) => { this.recordList.loadError.set(httpErrorReason(e)); this.recordList.loading.set(false); },
    });
  }

  onFileMetaSearch(q: string): void {
    this.store.fileMetaSearch.set(q);
    // client-side filter via filteredFileMetas computed() — no API call per keystroke
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
    // Resolve entity names for chips display
    this.picker.resolveEntityNamesFor(this.editFileMeta.entityIds);
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
