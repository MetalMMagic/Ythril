import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout, TimeoutError } from 'rxjs';
import {
  Network, Space, SpaceMeta, SpaceStats,
  KnowledgeType, PropertySchema, TypeSchema, ValidationMode, SchemaLibraryEntry,
  DupeActionRule,
} from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { SchemaApi } from '../../core/schema-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SpaceSettingsState, type TypeSchemaState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsTabComponent } from './space-settings-tab.component';
import { SpaceDuplicatesTabComponent } from './space-duplicates-tab.component';
import { SpaceDangerTabComponent } from './space-danger-tab.component';
import { SpaceSchemaTabComponent } from './space-schema-tab.component';
import { SpaceCreateDialogComponent } from './space-create-dialog.component';

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, DragDropModule, PhIconComponent,
    SpaceSettingsTabComponent, SpaceDuplicatesTabComponent, SpaceDangerTabComponent, SpaceSchemaTabComponent,
    SpaceCreateDialogComponent],
  // Provided here (not root) so each mount gets its own settings state, with a lifetime tied to
  // this component rather than the app.
  providers: [SpacesStore, SpaceSettingsState],
  styles: [SPACE_DIALOG_STYLES],
  template: `
    <!-- CREATE DIALOG -->
    @if (showCreateDialog()) {
      <app-space-create-dialog (closed)="showCreateDialog.set(false)" />
    }

    <!-- SETTINGS POPUP -->
    @if (state.settingsSpace()) {
      <div class="sp-backdrop" (click)="state.closeSettings()">
        <div class="sp-panel" (click)="$event.stopPropagation()">
          <div class="sp-header">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ state.settingsSpace()!.label }}</div>
              <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);">{{ state.settingsSpace()!.id }}</div>
            </div>
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="state.closeSettings()"><ph-icon name="x" [size]="14"/></button>
          </div>
          <div class="sp-tabs">
            <button class="sp-tab" [class.active]="state.settingsTab()==='settings'" (click)="state.settingsTab.set('settings')">{{ 'spaces.popup.tab.settings' | transloco }}</button>
            <button class="sp-tab" [class.active]="state.settingsTab()==='schema'"   (click)="state.settingsTab.set('schema')">{{ 'spaces.popup.tab.schema' | transloco }}</button>
            <button class="sp-tab" [class.active]="state.settingsTab()==='duplicates'" (click)="state.settingsTab.set('duplicates')">{{ 'spaces.popup.tab.duplicates' | transloco }}</button>
            <button class="sp-tab danger-tab" [class.active]="state.settingsTab()==='danger'" (click)="state.settingsTab.set('danger')">{{ 'spaces.popup.tab.dangerZone' | transloco }}</button>
          </div>
          <div class="sp-body">

            <!-- SETTINGS TAB -->
            @if (state.settingsTab() === 'settings') {
              <app-space-settings-tab />
            }

            <!-- SCHEMA TAB -->
            @if (state.settingsTab() === 'schema') {
              <app-space-schema-tab />
            }

            <!-- DUPLICATES TAB -->
            @if (state.settingsTab() === 'duplicates') {
              <app-space-duplicates-tab />
            }

            <!-- DANGER ZONE TAB -->
            @if (state.settingsTab() === 'danger') {
              <app-space-danger-tab />
            }
          </div><!-- sp-body -->

          @if (state.settingsTab() !== 'danger' && state.settingsTab() !== 'duplicates') {
            <div class="sp-footer">
              @if (state.settingsError()) {
                <div class="alert alert-error" style="flex:1;margin:0;padding:6px 12px;font-size:13px;">{{ state.settingsError() }}</div>
              }
              <button class="btn btn-primary" type="button" (click)="saveSettings()" [disabled]="state.settingsSaving()">
                @if (state.settingsSaving()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.popup.footer.saveChanges' | transloco }}
              </button>
            </div>
          }
        </div><!-- sp-panel -->
      </div><!-- sp-backdrop -->
    }

    <!-- Import conflict dialog -->

    <!-- Library picker dialog -->

    <!-- SPACES TABLE -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ 'spaces.table.title' | transloco }}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="search" [value]="spaceSearch()" (input)="spaceSearch.set($any($event.target).value)"
            class="space-search-input"
            [placeholder]="'spaces.table.search.placeholder' | transloco" />
          <div class="sort-group" [attr.aria-label]="'spaces.table.sortLabel' | transloco">
            <button class="sort-btn" [class.active]="sortMode()==='custom'" (click)="sortMode.set('custom')" [attr.title]="'spaces.table.sort.custom' | transloco">⠿</button>
            <button class="sort-btn" [class.active]="sortMode()==='az'" (click)="sortMode.set('az')" [attr.title]="'spaces.table.sort.az' | transloco">A→Z</button>
            <button class="sort-btn" [class.active]="sortMode()==='za'" (click)="sortMode.set('za')" [attr.title]="'spaces.table.sort.za' | transloco">Z→A</button>
            <button class="sort-btn" [class.active]="sortMode()==='usage-desc'" (click)="sortMode.set('usage-desc')" [attr.title]="'spaces.table.sort.usageDesc' | transloco">↓ GiB</button>
            <button class="sort-btn" [class.active]="sortMode()==='usage-asc'" (click)="sortMode.set('usage-asc')" [attr.title]="'spaces.table.sort.usageAsc' | transloco">↑ GiB</button>
          </div>
          <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'spaces.table.createButton' | transloco }}</button>
          <button class="btn-secondary btn btn-sm" (click)="store.load()">{{ 'spaces.table.refreshButton' | transloco }}</button>
        </div>
      </div>
      @if (store.loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th style="width:32px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th><th>{{ 'spaces.table.column.storage' | transloco }}</th><th>{{ 'spaces.table.column.networks' | transloco }}</th><th>{{ 'spaces.table.column.proxy' | transloco }}</th><th></th></tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="store.reorder($event.previousIndex, $event.currentIndex)">
              @for (s of sortedSpaces(); track s.id) {
                @let bar = storageInfo(s);
                <tr cdkDrag cdkDragLockAxis="y" [cdkDragDisabled]="sortMode() !== 'custom'">
                  <td><span class="drag-handle" cdkDragHandle [class.drag-handle-disabled]="sortMode() !== 'custom'" [attr.title]="'spaces.table.dragHandleTitle' | transloco">⠿</span></td>
                  <td style="font-weight:500;">{{ s.label }}
                    @if (s.indexStatus === 'building') {
                      <span class="badge badge-blue" style="font-size:10px;margin-left:6px;font-weight:normal;" [attr.title]="'spaces.indexBuildingTitle' | transloco"><span class="spinner" style="width:8px;height:8px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:3px;"></span>{{ 'spaces.indexBuilding' | transloco }}</span>
                    } @else if (s.indexStatus === 'failed') {
                      <span class="badge badge-red" style="font-size:10px;margin-left:6px;font-weight:normal;" [attr.title]="'spaces.indexFailedTitle' | transloco">{{ 'spaces.indexFailed' | transloco }}</span>
                    }
                  </td>
                  <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
                  <td style="min-width:140px;">
                    @if (bar.label !== '—') {
                      <div class="st-bar"><div [class]="'st-bar-fill '+bar.cls" [style.width.%]="bar.pct"></div></div>
                      <div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;">{{ bar.label }}</div>
                    } @else {
                      <span style="color:var(--text-muted)">—</span>
                    }
                  </td>
                  <td>
                    @let nets = store.networksForSpace(s.id);
                    @if (nets.length) {
                      @for (n of nets; track n.id) {
                        <span class="badge badge-gray" style="margin-right:4px;">{{ n.label }}</span>
                      }
                    } @else { <span style="color:var(--text-muted)">—</span> }
                  </td>
                  <td>
                    @if (s.proxyFor?.[0]==='*') {
                      <span class="badge badge-blue" style="font-style:italic;">{{ 'spaces.badge.allSpaces' | transloco }}</span>
                    } @else if (s.proxyFor?.length) {
                      @for (pid of s.proxyFor; track pid) {
                        <span class="badge badge-blue" style="margin-right:4px;font-size:11px;">{{ pid }}</span>
                      }
                    } @else { <span style="color:var(--text-muted)">—</span> }
                  </td>
                  <td><button class="icon-btn" [attr.title]="'spaces.table.configureTitle' | transloco" (click)="state.openSettings(s)">⚙</button></td>
                </tr>
              } @empty {
                <tr><td colspan="7"><div class="empty-state" style="padding:24px;"><h3>{{ 'spaces.table.empty' | transloco }}</h3></div></td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class SpacesComponent implements OnInit {
  private networksApi = inject(NetworksApi);
  private schemaApi   = inject(SchemaApi);
  private spacesApi   = inject(SpacesApi);
  private transloco = inject(TranslocoService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  /** Settings-dialog state, shared with the tabs. Public: the template binds to it. */
  readonly state = inject(SpaceSettingsState);
  /** Server data for the page (space list + networks). Public: the template binds to it. */
  readonly store = inject(SpacesStore);

  spaceSearch = signal('');
  sortMode = signal<'custom' | 'az' | 'za' | 'usage-desc' | 'usage-asc'>('custom');
  sortedSpaces = computed(() => {
    const list = this.store.spaces();
    const sorted = (() => {
      switch (this.sortMode()) {
        case 'az':         return [...list].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        case 'za':         return [...list].sort((a, b) => b.label.localeCompare(a.label, undefined, { sensitivity: 'base' }));
        case 'usage-desc': return [...list].sort((a, b) => (b.usageGiB ?? 0) - (a.usageGiB ?? 0));
        case 'usage-asc':  return [...list].sort((a, b) => (a.usageGiB ?? 0) - (b.usageGiB ?? 0));
        default:           return list;
      }
    })();
    const q = this.spaceSearch().trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q),
    );
  });

  showCreateDialog = signal(false);

  /** Tracks the kt/typeName target for per-type import. */

  ngOnInit(): void { this.store.load(); }

  storageInfo(s: Space): { pct: number; label: string; cls: string } {
    const used = s.usageGiB ?? 0;
    const max  = s.maxGiB;
    if (!max && !used) return { pct: 0, label: '—', cls: 'ok' };
    if (!max)          return { pct: 0, label: this.fmtGiB(used), cls: 'ok' };
    const pct = Math.min(100, Math.round(used / max * 100));
    return { pct, label: `${this.fmtGiB(used)} / ${max} GiB`, cls: pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'ok' };
  }

  fmtGiB(gib: number): string {
    if (gib < 0.001) return `${Math.round(gib * 1024)} MB`;
    return `${gib.toFixed(2)} GiB`;
  }

  saveSettings(): void {
    const target = this.state.settingsSpace();
    if (!target) return;
    this.state.settingsSaving.set(true);
    this.state.settingsError.set('');
    this.spacesApi.updateSpace(target.id, {
      label:  this.state.stForm.label.trim() || target.label,
      maxGiB: this.state.stForm.maxGiB,
      meta:   this.state.buildMeta(),
    }).subscribe({
      next: ({ space }) => {
        this.state.settingsSaving.set(false);
        this.store.applySpace(space);
        this.state.closeSettings();
      },
      error: (err) => { this.state.settingsSaving.set(false); this.state.settingsError.set(err.error?.error ?? this.transloco.translate('spaces.error.saveFailed')); },
    });
  }

  // ── Schema export / import ─────────────────────────────────────────────────

  // ── Per-type export / import ───────────────────────────────────────────────

  // ── Library: save a type to library ───────────────────────────────────────

  // ── Library: import from library ──────────────────────────────────────────

  /** kt/typeName context for the open library picker */

}
