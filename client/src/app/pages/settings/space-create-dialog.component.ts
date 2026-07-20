/**
 * Create-space dialog — label/id/quota, proxy targets, and the initial schema/purpose.
 *
 * Extracted from SpacesComponent (A17.8b). It appends the new space through SpacesStore rather
 * than handing it back to a parent, so the only output is `closed` — the dialog's visibility is
 * genuinely the page's view state, not the dialog's.
 */
import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpacesStore } from './spaces-store.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { SpaceMeta, ValidationMode } from '../../core/api.types';

@Component({
  selector: 'app-space-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [SPACE_DIALOG_STYLES],
  template: `
<div class="dialog-backdrop">
  <div class="dialog" [appModal]="'spaces.create.title' | transloco" (dismiss)="closed.emit()" (click)="$event.stopPropagation()">
    <div class="dialog-header">
      <div class="card-title">{{ 'spaces.create.title' | transloco }}</div>
      <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="closed.emit()"><ph-icon name="x" [size]="14"/></button>
    </div>
    @if (createError()) { <div class="alert alert-error">{{ createError() }}</div> }
    <form (ngSubmit)="createSpace()" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
      <div class="field" style="flex:1;min-width:140px;margin-bottom:0;">
        <label>{{ 'spaces.create.label' | transloco }}</label>
        <input type="text" [(ngModel)]="form.label" name="label" [placeholder]="'spaces.create.labelPlaceholder' | transloco" maxlength="200" required />
      </div>
      <div class="field" style="width:140px;margin-bottom:0;">
        <label>{{ 'spaces.create.id' | transloco }}</label>
        <input type="text" [(ngModel)]="form.id" name="id" [placeholder]="'spaces.create.idPlaceholder' | transloco" pattern="[a-z0-9-]+" />
      </div>
      <div class="field" style="width:120px;margin-bottom:0;">
        <label>{{ 'spaces.create.maxGiB' | transloco }}</label>
        <input type="number" [(ngModel)]="form.maxGiB" name="maxGiB" min="0" step="0.1" placeholder="—" />
      </div>
      <div style="display:flex;gap:12px;flex-basis:100%;">
        <div class="field" style="flex:1;margin-bottom:0;">
          <label>{{ 'spaces.create.purpose' | transloco }}</label>
          <textarea [(ngModel)]="form.purpose" name="purpose" maxlength="4000" rows="5" style="resize:vertical;" [placeholder]="'spaces.create.purposePlaceholder' | transloco"></textarea>
        </div>
        <div class="field" style="flex:1;margin-bottom:0;">
          <label>{{ 'spaces.create.proxyFor' | transloco }}</label>
          @if (store.spaces().length > 0) {
            <div class="table-wrapper" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
              <table style="margin:0;">
                <thead><tr><th style="width:40px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th></tr></thead>
                <tbody>
                  <tr style="cursor:pointer;background:var(--bg-elevated);" (click)="toggleProxyForAll()">
                    <td style="text-align:center;"><input type="checkbox" [checked]="proxyForAll" (click)="$event.stopPropagation()" (change)="toggleProxyForAll()" /></td>
                    <td colspan="2" style="font-style:italic;color:var(--text-muted);">{{ 'spaces.create.proxyForAll' | transloco }}</td>
                  </tr>
                  @for (s of store.spaces(); track s.id) {
                    <tr style="cursor:pointer;" [class.text-muted]="proxyForAll" (click)="!proxyForAll && toggleProxyFor(s.id)">
                      <td style="text-align:center;"><input type="checkbox" [checked]="proxyForAll || isProxyForSelected(s.id)" [disabled]="proxyForAll" (click)="$event.stopPropagation()" (change)="!proxyForAll && toggleProxyFor(s.id)" /></td>
                      <td>{{ s.label }}</td>
                      <td><span class="badge badge-gray mono" style="font-size:11px;">{{ s.id }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">{{ 'spaces.create.noExistingSpaces' | transloco }}</div>
          }
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-basis:100%;align-items:flex-start;">
        <div class="field" style="margin-bottom:0;">
          <label>{{ 'spaces.create.validationMode' | transloco }}</label>
          <select [(ngModel)]="form.validationMode" name="validationMode" style="width:140px;">
            <option value="off">{{ 'spaces.create.validation.off' | transloco }}</option><option value="warn">{{ 'spaces.create.validation.warn' | transloco }}</option><option value="strict">{{ 'spaces.create.validation.strict' | transloco }}</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:0;padding-top:22px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;">
            <input type="checkbox" [(ngModel)]="form.strictLinkage" name="strictLinkage" />{{ 'spaces.create.strictLinkage' | transloco }}
          </label>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-basis:100%;">
        <button class="btn btn-primary" type="submit" style="margin-left:auto;" [disabled]="creating()||!form.label.trim()">
          @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.create.submitButton' | transloco }}
        </button>
      </div>
    </form>
  </div>
</div>
  `,
})
export class SpaceCreateDialogComponent {
  readonly store = inject(SpacesStore);
  private spacesApi = inject(SpacesApi);
  private transloco = inject(TranslocoService);

  /** The page owns whether this dialog is shown; tell it to close. */
  readonly closed = output<void>();

  static readonly DEFAULT_PURPOSE = [
    'MCP endpoint for this space. Available tools:',
    '',
    'Spaces:',
    '  list_spaces()                                      — list all accessible spaces with IDs, labels, counts',
    '  get_stats(space)                                   — counts of memories, entities, edges, chrono',
    '  get_space_meta(space)                              — schema, purpose, validation mode, entry counts',
    '  update_space(space, label?, description?)          — update space label or description (admin)',
    '  wipe_space(space, types?)                          — wipe all or specific collections (admin)',
    '',
    'Knowledge Graph — Memory:',
    '  remember(space, fact, entities?, tags?, properties?) — store a fact with semantic embedding',
    '  recall(query, space?, topK?, types?, filter?)      — semantic search; omit space for cross-space',
    '  find_similar(space, entryId, entryType, topK?, ...) — find similar entries by stored embedding',
    '  update_memory(space, id, fact?, tags?, entityIds?) — update memory (re-embeds on fact change)',
    '  delete_memory(space, id)                           — delete memory',
    '  query(space, collection, filter, projection?, limit?) — structured read-only MongoDB query',
    '  bulk_write(space, memories?, entities?, edges?, chrono?) — batch upsert across all types',
    '',
    'Knowledge Graph — Entities & Edges:',
    '  upsert_entity(space, name, type, tags?, properties?) — create or update named entity',
    '  find_entities_by_name(space, name)                 — find entities by exact name',
    '  update_entity(space, id, ...)                      — update entity fields',
    '  merge_entities(space, survivorId, absorbedId, resolutions?) — merge two entities into one',
    '  upsert_edge(space, from, to, label, type?, weight?) — create or update relationship edge',
    '  update_edge(space, id, ...)                        — update edge fields',
    '  traverse(space, startId, direction?, edgeLabels?, maxDepth?) — traverse the knowledge graph',
    '',
    'Knowledge Graph — Chrono:',
    '  create_chrono(space, title, type, startsAt, ...)   — create event/deadline/plan/milestone',
    '  update_chrono(space, id, ...)                      — update chronological entry',
    '  list_chrono(space?, status?, type?, tags?, limit?) — list chrono entries; omit space for cross-space',
    '',
    'Files:',
    '  read_file(space, path)                   — read file contents',
    '  write_file(space, path, content, inputFormat?) — write file; auto-converts pdf/docx/epub/html',
    '  list_dir(space, path?)                   — list directory contents',
    '  delete_file(space, path)                 — delete a file',
    '  create_dir(space, path)                  — create directory tree',
    '  move_file(space, src, dst)               — move or rename file/directory',
    '',
    'Sync:',
    '  list_peers()                             — list connected peer instances',
    '  sync_now(peerId?)                        — trigger immediate sync cycle',
  ].join('\n');

  // create dialog
  creating         = signal(false);

  createError      = signal('');

  proxyForSelected: string[] = [];

  proxyForAll = false;

  form = {
    label: '', id: '', maxGiB: null as number | null,
    purpose: SpaceCreateDialogComponent.DEFAULT_PURPOSE,
    validationMode: 'off' as ValidationMode,
    strictLinkage: false,
  };

  isProxyForSelected(id: string): boolean { return this.proxyForSelected.includes(id); }

  toggleProxyFor(id: string): void {
    if (this.proxyForAll) return;
    this.proxyForSelected = this.proxyForSelected.includes(id)
      ? this.proxyForSelected.filter(s => s !== id)
      : [...this.proxyForSelected, id];
  }

  toggleProxyForAll(): void {
    this.proxyForAll = !this.proxyForAll;
    if (this.proxyForAll) this.proxyForSelected = [];
  }

  createSpace(): void {
    if (!this.form.label.trim()) return;
    this.creating.set(true);
    this.createError.set('');
    const body: Parameters<SpacesApi['createSpace']>[0] = { label: this.form.label.trim() };
    if (this.form.id.trim()) body.id = this.form.id.trim();
    if (this.form.maxGiB) body.maxGiB = this.form.maxGiB;
    if (this.proxyForAll) body.proxyFor = ['*'];
    else if (this.proxyForSelected.length) body.proxyFor = [...this.proxyForSelected];
    const meta: Partial<SpaceMeta> = {};
    if (this.form.purpose.trim()) meta.purpose = this.form.purpose.trim();
    if (this.form.validationMode !== 'off') meta.validationMode = this.form.validationMode;
    if (this.form.strictLinkage) meta.strictLinkage = true;
    if (Object.keys(meta).length) body.meta = meta;
    this.spacesApi.createSpace(body).pipe(
      timeout(30_000),
      finalize(() => this.creating.set(false)),
    ).subscribe({
      next: ({ space }) => {
        this.closed.emit();
        this.store.spaces.update(list => [...list, space]);
        this.form = { label: '', id: '', maxGiB: null, purpose: SpaceCreateDialogComponent.DEFAULT_PURPOSE, validationMode: 'off', strictLinkage: false };
        this.proxyForSelected = [];
        this.proxyForAll = false;
        // Vector indexes finish building server-side (B1); poll so the "preparing
        // indexes" badge clears on its own when the space is ready.
        if (space.indexStatus === 'building') this.store.pollIndexStatus();
      },
      error: (err) => {
        if (err instanceof TimeoutError) {
          // The server persists the space even if the response was slow — refetch so
          // it appears instead of silently vanishing, and show a soft note.
          this.createError.set(this.transloco.translate('spaces.error.createTimeout'));
          this.store.load();
          this.store.pollIndexStatus();
        } else {
          this.createError.set(err.error?.error ?? this.transloco.translate('spaces.error.createFailed'));
        }
      },
    });
  }
}
