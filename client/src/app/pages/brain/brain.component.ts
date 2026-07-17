import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordDrawerComponent } from './record-drawer.component';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import { toLocalDatetime, fmtApiError } from './brain-format';
import { FormsModule } from '@angular/forms';
import { Space, SpaceStats, Memory, Entity, Edge, ChronoEntry, ChronoType, ChronoStatus, QueryCollection, QueryResult, RecallResult, RecallKnowledgeType, FileMeta } from '../../core/api.types';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { FilesApi } from '../../core/files-api.service';
import { GraphComponent } from '../graph/graph.component';
import { FileManagerComponent } from '../files/file-manager.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { RecordFilterBarComponent, type RecordFilter } from '../../shared/record-filter-bar.component';
import { catchError, of } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { httpErrorReason } from '../../core/http-error';

type BrainTab = 'query' | 'graph' | 'files' | 'entities' | 'edges' | 'memories' | 'chrono' | 'filemeta';

interface SpaceView {
  space: Space;
  stats?: SpaceStats;
}

@Component({
  selector: 'app-brain',
  standalone: true,
  // OnPush (P5): the heaviest page in the app — five record tabs and an embedded graph (the detail
  // drawer is now its own OnPush component). Safe because every async path (list/create/save
  // subscribes, the 300 ms search debounces) writes signals, which notify OnPush regardless of zone;
  // nothing mutates a signal's value in place. NOTE the plain (non-signal) form models — `memoryForm`,
  // `editMemory`, … — are rendered via ngModel and are re-checked only because each write is
  // accompanied by a signal write in the same turn (the create callbacks set `creatingX`/`showXForm`)
  // or happens in a template event handler, both of which mark the view dirty. That coupling is
  // load-bearing and pinned by the specs (the drawer's own version lives in the drawer component).
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, GraphComponent, FileManagerComponent, EntitySearchComponent, PropertiesViewComponent, PropertiesEditorComponent, TagInputComponent, PhIconComponent, ErrorStateComponent, RecordFilterBarComponent, RecordDrawerComponent, TranslocoPipe],
  providers: [BrainStore, EntityRefPicker, RecordDrawerState],
  styles: [BRAIN_CHIP_STYLES, `
    .space-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .space-chip {
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 110px;
    }

    .space-chip:hover { border-color: var(--accent); color: var(--text-primary); }

    .space-chip.active {
      background: var(--accent-dim);
      border-color: var(--accent);
      color: var(--accent);
    }

    .space-chip-label { font-size: 13px; font-weight: 500; }
    .space-chip-id { font-size: 10px; color: var(--text-muted); }
    .space-chip-count {
      font-size: 10px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .space-chip.active .space-chip-count { color: var(--accent); opacity: 0.8; }

    /* Network-membership indicator (F8): the Networks-menu icon, colour-coded by
       aggregate sync/governance status. No icon at all when the space is in no
       network. */
    .space-chip-net { display: inline-flex; align-items: center; }
    .space-chip-net.net-idle { color: var(--text-muted); }
    .space-chip-net.net-syncing { color: var(--warning); }
    .space-chip-net.net-degraded { color: var(--error); }
    .space-chip-net.net-vote { color: var(--info); }
    @keyframes chip-net-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .space-chip-net.net-syncing, .space-chip-net.net-vote { animation: chip-net-pulse 1.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .space-chip-net { animation: none !important; } }

    .content-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-elevated);
      border-radius: 10px;
      padding: 1px 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: 5px;
      min-width: 20px;
      font-variant-numeric: tabular-nums;
    }

    .tab.active .tab-count {
      background: var(--accent-dim);
      color: var(--accent);
    }

    .tab-files-info {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      font-size: 12px;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      text-decoration: none;
      cursor: pointer;
      transition: color var(--transition), border-color var(--transition);
      white-space: nowrap;
    }
    .tab-files-info:hover {
      color: var(--text-primary);
      border-bottom-color: var(--border);
      text-decoration: none;
    }

    .memory-item {
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
    }
    .filter-bar-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    /* Shared list filter row (F6) — holds <app-record-filter-bar> + any active chips. */
    .list-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--accent);
      background: var(--accent-dim);
      color: var(--accent);
    }
    .filter-chip button {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0 2px;
    }
    .tag-clickable, .entity-clickable {
      cursor: pointer;
      transition: opacity var(--transition);
    }
    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }

    .create-form {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: wrap;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      margin-bottom: 12px;
    }
    .create-form .field { margin-bottom: 0; }
    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }
    .create-form input, .create-form textarea {
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .create-form textarea { resize: vertical; }

    .chrono-desc-preview {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
      white-space: pre-wrap;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .reindex-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      margin-bottom: 12px;
      border: 1px solid var(--warning);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--warning) 6%, transparent);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .reindex-result {
      font-size: 12px;
      color: var(--text-muted);
      margin-left: auto;
    }

    .content-header input[type=search] {
      flex: 1;
      min-width: 180px;
      max-width: 400px;
      padding: 5px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-primary);
    }
    .content-header app-entity-search {
      flex: 1;
      min-width: 180px;
      max-width: 520px;
    }

    .inline-confirm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--error);
    }
    .inline-confirm button { font-size: 11px; }

    .memory-description {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      line-height: 1.4;
    }

    /* Description table cells: clamp to a few lines but honour newlines (F7).
       pre-wrap renders the multi-line text the textareas now allow; the box
       clamp keeps rows compact, and each cell keeps its [title] for the full text. */
    .desc-cell {
      font-size: 12px;
      color: var(--text-muted);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      white-space: pre-wrap;
      word-break: break-word;
    }

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
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .dialog {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .entity-picker-wrap {
      position: relative;
    }
    .entity-picker-dropdown {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      min-width: 300px;
      max-height: 240px;
      overflow-y: auto;
      z-index: 50;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
    }
    .entity-picker-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      cursor: pointer;
      font-size: 12px;
      border-bottom: 1px solid var(--border-muted);
    }
    .entity-picker-item:last-child { border-bottom: none; }
    .entity-picker-item:hover { background: var(--bg-surface); }
    .entity-picker-name { font-weight: 500; color: var(--text-primary); white-space: nowrap; }
    .entity-picker-desc {
      font-size: 11px; color: var(--text-muted); flex: 1;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .entity-picker-id {
      font-size: 10px; color: var(--text-muted);
      font-family: var(--font-mono, monospace); margin-left: auto; flex-shrink: 0;
    }
    .tab-spacer { flex: 1; }

    .link-btn {
      background: none; border: none; cursor: pointer; color: var(--accent);
      text-decoration: underline; padding: 0; font-size: inherit; text-align: left;
    }
    .link-btn:hover { color: var(--accent-light, var(--accent)); }
    .icon-btn-danger { color: var(--error); }
    .icon-btn-danger:hover { color: var(--error); }
    .flyout-result:hover { background: var(--bg-secondary); }
    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }
    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }
    .pill-group button:last-child { border-right:none; }
    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }
    .pill-group button:hover:not(.active) { background:var(--bg-surface); }
  `],
  template: `
    @if (loadingSpaces()) {
      <div class="loading-overlay"><span class="spinner"></span> {{ 'brain.loadingSpaces' | transloco }}</div>
    } @else if (spaces().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="package" [size]="48"/></div>
        <h3>{{ 'brain.emptySpaces.title' | transloco }}</h3>
        <p>{{ 'brain.emptySpaces.body' | transloco }}</p>
      </div>
    } @else {

      @if (picker.flyoutField()) { <div class="flyout-backdrop" (click)="picker.closeFlyout()"></div> }

      <!-- Space selector -->
      <div class="space-tabs">
        @for (sv of spaces(); track sv.space.id) {
          <button
            class="space-chip"
            [class.active]="activeSpaceId() === sv.space.id"
            (click)="selectSpace(sv.space.id)"
          >
            <span class="space-chip-label">{{ sv.space.label }}</span>
            <span class="space-chip-id">{{ sv.space.id }}</span>
            @if (sv.space.networkStatus) {
              <span class="space-chip-net" [class]="'net-' + sv.space.networkStatus" [title]="networkChipTitle(sv.space)">
                <ph-icon name="link" [size]="12"/>
              </span>
            }
            @if (sv.stats) {
              <span class="space-chip-count">{{ spaceTotal(sv.stats) }} {{ 'brain.spaceChip.records' | transloco }}</span>
            }
          </button>
        }
      </div>

      @if (needsReindex()) {
        <div class="reindex-banner">
          <span><ph-icon name="warning" [size]="16" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.reindex.stale' | transloco }}</span>
          <button class="btn btn-sm btn-primary" [disabled]="reindexing()" (click)="runReindex()">
            @if (reindexing()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
            {{ 'brain.reindex.button' | transloco }}
          </button>
          @if (reindexResult()) { <span class="reindex-result">{{ reindexResult() }}</span> }
        </div>
      }
      @if (!needsReindex() && reindexResult()) {
        <div class="alert alert-success" style="margin-bottom:10px; font-size:13px;"><ph-icon name="check" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ reindexResult() }}</div>
      }

      <!-- Sub-tabs: Query on left, collections on right -->
      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'query'" (click)="setTab('query')">
          <ph-icon name="magnifying-glass" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.query' | transloco }}
        </button>
        <button class="tab" [class.active]="activeTab() === 'graph'" (click)="setTab('graph')">
          <ph-icon name="binoculars" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.graph' | transloco }}
        </button>
        <button class="tab" [class.active]="activeTab() === 'files'" (click)="setTab('files')">
          <ph-icon name="folder" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.files' | transloco }}
          @if (activeStats(); as s) {
            <span class="tab-count">{{ s.files }}</span>
          }
        </button>
        <span class="tab-spacer"></span>
        @for (tab of collectionTabs; track tab.key) {
          <button class="tab" [class.active]="activeTab() === tab.key" (click)="setTab(tab.key)">
            {{ tab.label }}
            @if (activeStats(); as s) {
              @if (tab.statsKey) {
                <span class="tab-count">{{ s[tab.statsKey] }}</span>
              }
            }
          </button>
        }
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {

        <!-- Graph tab -->
        @if (activeTab() === 'graph') {
          <app-graph-view [embeddedSpaceId]="activeSpaceId()" />
        }

        <!-- Files tab -->
        @if (activeTab() === 'files') {
          <app-file-manager [embeddedSpaceId]="activeSpaceId()" [navigatePath]="fileManagerNavPath()" (viewFileMeta)="openFileMetaEntry($event)" (fileDeleted)="loadStats(activeSpaceId())" />
        }

        <!-- Memories -->
        @if (activeTab() === 'memories') {

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
                        [spaceId]="activeSpaceId()"
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
                  @if (editingId() === mem._id) {
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
                                    [spaceId]="activeSpaceId()"
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
                            <button class="btn btn-sm btn-primary" [disabled]="editSaving()" (click)="saveEditMemory(mem._id)">
                              @if (editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (editError()) { <div style="font-size:12px; color:var(--error);">{{ editError() }}</div> }
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
                        @if (confirmDeleteId() === mem._id) {
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
                    @if (loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadMemories' | transloco" [reason]="loadError() ?? ''" (retry)="retryCurrentTab()" />
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
        }

        <!-- Entities -->
        @if (activeTab() === 'entities') {

          <div class="content-header">
            <app-entity-search
              mode="bar"
              [spaceId]="activeSpaceId()"
              placeholder="common.searchEntitiesPlaceholder"
              defaultMode="semantic"
              (queryChange)="onEntitySearchChange($event)"
              (cleared)="onEntitySearchClear()"
              (selected)="onEntitySearchPick($event)"
            />
            <button class="btn-primary btn btn-sm" (click)="openEntityForm()" [disabled]="showEntityForm()">{{ 'brain.entities.addButton' | transloco }}</button>
          </div>
          <div class="list-filter-row">
            <app-record-filter-bar
              [typeOptions]="store.entityTypeOptions()"
              [tagSuggestions]="store.entityTagSuggestions()"
              [value]="recordFilter()"
              (filterChange)="onFilterChange($event)"
            />
          </div>

          @if (showEntityForm()) {
            <form class="create-form" (ngSubmit)="createEntity()">
              <div class="field" style="flex:1; min-width:140px;">
                <label>{{ 'brain.entities.table.name' | transloco }}</label>
                <input type="text" [(ngModel)]="entityForm.name" name="name" required />
              </div>
              <div class="field" style="width:140px;">
                <label>Type @if (store.entityTypeNames().length) { <span style="color:var(--error)">*</span> }</label>
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
              <div class="field" style="flex:1; min-width:180px;">
                <label>{{ 'brain.entities.table.tags' | transloco }}</label>
                <app-tag-input [(value)]="entityForm.tags" [suggestions]="store.entityTagSuggestions()" inputName="entFormTags" />
              </div>
              <div class="field" style="flex:1; min-width:200px;">
                <label>{{ 'brain.entities.table.description' | transloco }}</label>
                <textarea [(ngModel)]="entityForm.description" name="description" rows="3" style="resize:vertical;"></textarea>
              </div>
              <div class="field" style="flex:1; min-width:220px;">
                <label>{{ 'brain.entities.table.properties' | transloco }}</label>
                <app-properties-editor
                  [schema]="store.entitySchema(entityForm.type)"
                  [required]="store.requiredProps(store.entitySchema(entityForm.type))"
                  [(value)]="entityForm.properties"
                />
              </div>
              <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEntity() || !entityForm.name.trim() || (store.entityTypeNames().length ? !entityForm.type : false)">
                @if (creatingEntity()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'common.save' | transloco }}
              </button>
              <button class="btn-secondary btn btn-sm" type="button" (click)="showEntityForm.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          @if (createEntityError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEntityError() }}</div>
          }

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ 'brain.entities.table.name' | transloco }}</th><th>{{ 'brain.entities.table.type' | transloco }}</th><th>{{ 'brain.entities.table.description' | transloco }}</th><th>{{ 'brain.entities.table.tags' | transloco }}</th><th>{{ 'brain.entities.table.properties' | transloco }}</th><th>{{ 'brain.entities.table.created' | transloco }}</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (ent of store.entities(); track ent._id) {
                  @if (editingId() === ent._id) {
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
                            <button class="btn btn-sm btn-primary" [disabled]="editSaving()" (click)="saveEditEntity(ent._id)">
                              @if (editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } Save
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (editError()) { <div style="font-size:12px; color:var(--error);">{{ editError() }}</div> }
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
                        {{ ent.description || '—' }}
                      </td>
                      <td style="font-size:11px;">
                        @for (tag of (ent.tags ?? []); track tag) { <span class="tag">{{ tag }}</span> }
                        @if (!(ent.tags?.length)) { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td><app-properties-view [properties]="ent.properties" [schema]="store.entitySchema(ent.type)" /></td>
                      <td style="color:var(--text-muted)">{{ ent.createdAt | date:'dd.MM.yyyy' }}</td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('entity', ent)"><ph-icon name="eye" [size]="16"/></button>
                        @if (confirmDeleteId() === ent._id) {
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
                    @if (loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEntities' | transloco" [reason]="loadError() ?? ''" (retry)="retryCurrentTab()" />
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
            <button class="btn btn-sm btn-secondary" [disabled]="entitySkip() === 0" (click)="prevEntityPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
            <span class="pager-info">{{ store.entities().length ? (entitySkip() + 1) + '–' + (entitySkip() + store.entities().length) : '–' }}</span>
            <button class="btn btn-sm btn-secondary" [disabled]="store.entities().length < pageSize" (click)="nextEntityPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
          </div>
        }

        <!-- Edges -->
        @if (activeTab() === 'edges') {

          <div class="content-header">
            <input type="search" [placeholder]="'brain.edges.searchPlaceholder' | transloco"
              [value]="store.edgeSearch()"
              (input)="onEdgeSearch($any($event.target).value)"
              [attr.aria-label]="'brain.edges.searchPlaceholder' | transloco" />
            <div class="pill-group" [attr.title]="'common.searchMode.tooltip' | transloco">
              <button [class.active]="store.edgeSearchMode() === 'text'" (click)="setEdgeSearchMode('text')">{{ 'common.sortAZ' | transloco }}</button>
              <button [class.active]="store.edgeSearchMode() === 'semantic'" (click)="setEdgeSearchMode('semantic')"><ph-icon name="star-four" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:3px;"/> {{ 'common.semantic' | transloco }}</button>
            </div>
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
              <div class="field" style="flex:1; min-width:120px;">
                <label>{{ 'common.form.from' | transloco }}</label>
                <app-entity-search
                  mode="picker"
                  [spaceId]="activeSpaceId()"
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
                  [spaceId]="activeSpaceId()"
                  placeholder="common.searchEntitiesPlaceholder"

                  [value]="edgeForm.toDisplay"
                  (selected)="pickEdgeTo($event)"
                />
              </div>
              <div class="field" style="width:80px;">
                <label>{{ 'common.form.weight' | transloco }}</label>
                <input type="number" [(ngModel)]="edgeForm.weight" name="weight" step="0.1" />
              </div>
              <div class="field" style="flex:1; min-width:180px;">
                <label>{{ 'brain.edges.table.tags' | transloco }}</label>
                <app-tag-input [(value)]="edgeForm.tags" [suggestions]="store.edgeTagSuggestions()" inputName="edgeFormTags" />
              </div>
              <div class="field" style="flex:2; min-width:200px;">
                <label>{{ 'brain.edges.table.description' | transloco }}</label>
                <textarea [(ngModel)]="edgeForm.description" name="description" rows="3" style="resize:vertical;"></textarea>
              </div>
              <div class="field" style="flex:1; min-width:220px;">
                <label>{{ 'brain.edges.table.properties' | transloco }}</label>
                <app-properties-editor
                  [schema]="store.edgeSchema(edgeForm.label)"
                  [required]="store.requiredProps(store.edgeSchema(edgeForm.label))"
                  [(value)]="edgeForm.properties"
                />
              </div>
              <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingEdge() || !edgeForm.from.trim() || !edgeForm.to.trim() || !edgeForm.label.trim()">
                @if (creatingEdge()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'common.save' | transloco }}
              </button>
              <button class="btn-secondary btn btn-sm" type="button" (click)="showEdgeForm.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          @if (createEdgeError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createEdgeError() }}</div>
          }
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ 'brain.edges.table.from' | transloco }}</th><th>{{ 'brain.edges.table.relation' | transloco }}</th><th>{{ 'brain.edges.table.to' | transloco }}</th><th>{{ 'brain.edges.table.weight' | transloco }}</th><th>{{ 'brain.edges.table.tags' | transloco }}</th><th>{{ 'brain.edges.table.description' | transloco }}</th><th>{{ 'brain.edges.table.properties' | transloco }}</th><th>{{ 'brain.edges.table.created' | transloco }}</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (edge of store.filteredEdges(); track edge._id) {
                  @if (editingId() === edge._id) {
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
                            <button class="btn btn-sm btn-primary" [disabled]="editSaving()" (click)="saveEditEdge(edge._id)">
                              @if (editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (editError()) { <div style="font-size:12px; color:var(--error);">{{ editError() }}</div> }
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
                        @if (confirmDeleteId() === edge._id) {
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
                    @if (loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadEdges' | transloco" [reason]="loadError() ?? ''" (retry)="retryCurrentTab()" />
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
              <button class="btn btn-sm btn-secondary" [disabled]="edgeSkip() === 0" (click)="prevEdgePage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.filteredEdges().length ? (edgeSkip() + 1) + '–' + (edgeSkip() + store.filteredEdges().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.edges().length < pageSize" (click)="nextEdgePage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
        }

        <!-- Chrono -->
        @if (activeTab() === 'chrono') {

          <div class="content-header">
            <input type="search" [placeholder]="'brain.chrono.searchPlaceholder' | transloco"
              [value]="store.chronoSearch()"
              (input)="onChronoSearch($any($event.target).value)"
              [attr.aria-label]="'brain.chrono.searchPlaceholder' | transloco" />
            <div class="pill-group" [attr.title]="'common.searchMode.tooltip' | transloco">
              <button [class.active]="store.chronoSearchMode() === 'text'" (click)="setChronoSearchMode('text')">{{ 'common.sortAZ' | transloco }}</button>
              <button [class.active]="store.chronoSearchMode() === 'semantic'" (click)="setChronoSearchMode('semantic')"><ph-icon name="star-four" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:3px;"/> {{ 'common.semantic' | transloco }}</button>
            </div>
            <button class="btn-primary btn btn-sm" (click)="openChronoForm()" [disabled]="showChronoForm()">{{ 'brain.chrono.addButton' | transloco }}</button>
          </div>
          <div class="list-filter-row">
            <app-record-filter-bar
              [typeOptions]="store.chronoKinds"
              [tagSuggestions]="store.chronoTagSuggestions()"
              typeLabel="common.form.kind"
              typeAllLabel="brain.filter.allKinds"
              [value]="recordFilter()"
              (filterChange)="onFilterChange($event)"
            />
          </div>

          @if (showChronoForm()) {
            <form class="create-form" (ngSubmit)="createChrono()">
              <div class="field" style="flex:2; min-width:200px;">
                <label>{{ 'common.form.title' | transloco }}</label>
                <input type="text" [(ngModel)]="chronoForm.title" name="title" required />
              </div>
              <div class="field" style="width:160px;">
                <label>{{ 'brain.chrono.form.kind' | transloco }}</label>
                @if (chronoForm.kind !== '__custom__') {
                  <select [(ngModel)]="chronoForm.kind" name="kind">
                    @for (k of store.chronoKinds; track k) { <option [value]="k">{{ k }}</option> }
                    <option value="__custom__">{{ 'brain.chrono.form.customKind' | transloco }}</option>
                  </select>
                } @else {
                  <div style="display:flex; gap:4px;">
                    <input type="text" [(ngModel)]="chronoForm.customKind" name="customKind" style="flex:1;" />
                    <button type="button" class="btn-secondary btn btn-sm" style="padding:4px 8px;" (click)="chronoForm.kind = 'event'; chronoForm.customKind = ''" [attr.title]="'brain.chrono.form.backToPresets' | transloco"><ph-icon name="x" [size]="14"/></button>
                  </div>
                }
              </div>
              <div class="field" style="width:200px;">
                <label>{{ 'brain.chrono.form.startsAt' | transloco }}</label>
                <input type="datetime-local" [(ngModel)]="chronoForm.startsAt" name="startsAt" required />
              </div>
              <div class="field" style="width:200px;">
                <label>{{ 'brain.chrono.form.endsAt' | transloco }}</label>
                <input type="datetime-local" [(ngModel)]="chronoForm.endsAt" name="endsAt" />
              </div>
              <div class="field" style="flex:1; min-width:200px;">
                <label>{{ 'brain.chrono.table.description' | transloco }}</label>
                <textarea [(ngModel)]="chronoForm.description" name="description" rows="3" style="resize:vertical;"></textarea>
              </div>
              <div class="field" style="flex:1; min-width:180px;">
                <label>{{ 'brain.chrono.table.tags' | transloco }}</label>
                <app-tag-input [(value)]="chronoForm.tags" [suggestions]="store.chronoTagSuggestions()" inputName="chronoFormTags" />
              </div>
              <div class="field" style="flex:1; min-width:140px;">
                <label>{{ 'brain.chrono.table.entities' | transloco }}</label>
                <div class="flyout-wrap">
                  <div class="entity-multi">
                    @for (chip of picker.entityChips(chronoForm.entityIds); track chip.id) {
                      <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(chronoForm, chip.id)"><ph-icon name="x" [size]="12"/></button></span>
                    }
                    <button type="button" class="chip-add" (click)="picker.openFlyout('create-chrono-entityIds', chronoForm)">{{ 'common.addMore' | transloco }}</button>
                  </div>
                  @if (picker.flyoutField() === 'create-chrono-entityIds') {
                    <div class="flyout-panel">
                      <app-entity-search
                        mode="picker"
                        [spaceId]="activeSpaceId()"
                        placeholder="common.searchEntitiesPlaceholder"

                        (selected)="picker.pickEntity($event, chronoForm)"
                      />
                      <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                        <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
              <button class="btn-primary btn btn-sm" type="submit" [disabled]="creatingChrono() || !chronoForm.title.trim() || !chronoForm.startsAt || (chronoForm.kind === '__custom__' && !chronoForm.customKind.trim())">
                @if (creatingChrono()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                {{ 'common.save' | transloco }}
              </button>
              <button class="btn-secondary btn btn-sm" type="button" (click)="showChronoForm.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          @if (createChronoError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ createChronoError() }}</div>
          }

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ 'brain.chrono.table.title' | transloco }}</th><th>{{ 'brain.chrono.table.description' | transloco }}</th><th>{{ 'brain.chrono.table.kind' | transloco }}</th><th>{{ 'brain.chrono.table.status' | transloco }}</th><th>{{ 'brain.chrono.table.starts' | transloco }}</th><th>{{ 'brain.chrono.table.ends' | transloco }}</th><th>{{ 'brain.chrono.table.tags' | transloco }}</th><th>{{ 'brain.chrono.table.entities' | transloco }}</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (entry of store.filteredChrono(); track entry._id) {
                  @if (editingId() === entry._id) {
                    <tr>
                      <td colspan="9">
                        <div class="create-form" style="border:none; padding:8px 0;">
                          <div class="field" style="flex:2; min-width:180px; margin-bottom:0;">
                            <label>{{ 'common.form.title' | transloco }}</label>
                            <input type="text" [(ngModel)]="editChrono.title" name="editChronoTitle" />
                          </div>
                          <div class="field" style="width:130px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.form.kind' | transloco }}</label>
                            <select [(ngModel)]="editChrono.kind" name="editChronoKind">
                              @for (k of store.chronoKinds; track k) { <option [value]="k">{{ k }}</option> }
                            </select>
                          </div>
                          <div class="field" style="width:130px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.status' | transloco }}</label>
                            <select [(ngModel)]="editChrono.status" name="editChronoStatus">
                              @for (s of store.chronoStatusOptions; track s) { <option [value]="s">{{ s }}</option> }
                            </select>
                          </div>
                          <div class="field" style="width:190px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.form.startsAt' | transloco }}</label>
                            <input type="datetime-local" [(ngModel)]="editChrono.startsAt" name="editChronoStarts" />
                          </div>
                          <div class="field" style="width:190px; margin-bottom:0;">
                            <label>{{ 'common.form.endsAt' | transloco }}</label>
                            <input type="datetime-local" [(ngModel)]="editChrono.endsAt" name="editChronoEnds" />
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.description' | transloco }}</label>
                            <textarea [(ngModel)]="editChrono.description" name="editChronoDesc" rows="2" style="resize:vertical;"></textarea>
                          </div>
                          <div class="field" style="flex:1; min-width:180px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.tags' | transloco }}</label>
                            <app-tag-input [(value)]="editChrono.tags" [suggestions]="store.chronoTagSuggestions()" inputName="chronoEditTags" />
                          </div>
                          <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
                            <label>{{ 'brain.chrono.table.entities' | transloco }}</label>
                            <div class="flyout-wrap">
                              <div class="entity-multi">
                                @for (chip of picker.entityChips(editChrono.entityIds); track chip.id) {
                                  <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(editChrono, chip.id)"><ph-icon name="x" [size]="12"/></button></span>
                                }
                                <button type="button" class="chip-add" (click)="picker.openFlyout('edit-chrono-entityIds', editChrono)">{{ 'common.addMore' | transloco }}</button>
                              </div>
                              @if (picker.flyoutField() === 'edit-chrono-entityIds') {
                                <div class="flyout-panel">
                                  <app-entity-search
                                    mode="picker"
                                    [spaceId]="activeSpaceId()"
                                    placeholder="common.searchEntitiesPlaceholder"

                                    (selected)="picker.pickEntity($event, editChrono)"
                                  />
                                  <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                    <button type="button" class="btn btn-sm btn-secondary" (click)="picker.closeFlyout()">{{ 'common.done' | transloco }}</button>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                          <div style="display:flex; gap:6px; align-items:flex-end;">
                            <button class="btn btn-sm btn-primary" [disabled]="editSaving()" (click)="saveEditChrono(entry._id)">
                              @if (editSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                          @if (editError()) { <div style="font-size:12px; color:var(--error);">{{ editError() }}</div> }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td>{{ entry.title }}</td>
                      <td class="desc-cell" style="max-width:160px;" [title]="entry.description ?? ''">
                        {{ entry.description || '—' }}
                      </td>
                      <td><span class="badge badge-blue">{{ entry.type }}</span></td>
                      <td><span class="badge" [class.badge-purple]="entry.status === 'upcoming'" [class.badge-blue]="entry.status === 'active'" style="font-size:11px">{{ entry.status }}</span></td>
                      <td style="color:var(--text-muted); font-size:12px">{{ entry.startsAt | date:'dd.MM.yyyy HH:mm' }}</td>
                      <td style="color:var(--text-muted); font-size:12px">{{ entry.endsAt ? (entry.endsAt | date:'dd.MM.yyyy HH:mm') : '—' }}</td>
                      <td>
                        @for (tag of entry.tags; track tag) { <span class="tag">{{ tag }}</span> }
                      </td>
                      <td style="font-size:11px;">
                        @if (entry.entityIds.length) {
                          <div class="chip-list">
                            @for (id of entry.entityIds; track id) {
                              <span class="chip" [title]="id">{{ picker.entityNameCache()[id] || id.slice(0,8) + '…' }}</span>
                            }
                          </div>
                        } @else { <span style="color:var(--text-muted)">—</span> }
                      </td>
                      <td style="white-space:nowrap;">
                        <button class="icon-btn" [attr.title]="'common.viewDetails' | transloco" [attr.aria-label]="'common.viewDetails' | transloco" (click)="drawerState.open('chrono', entry)"><ph-icon name="eye" [size]="16"/></button>
                        @if (confirmDeleteId() === entry._id) {
                          <span class="inline-confirm">
                            {{ 'common.deleteConfirm' | transloco }}
                            <button class="btn btn-sm btn-danger" (click)="deleteChrono(entry._id)">{{ 'common.yes' | transloco }}</button>
                            <button class="btn btn-sm btn-secondary" (click)="cancelDelete()">{{ 'common.no' | transloco }}</button>
                          </span>
                        } @else {
                          <button class="icon-btn danger" [attr.aria-label]="'brain.chrono.deleteAriaLabel' | transloco" (click)="requestDelete(entry._id)"><ph-icon name="x" [size]="16"/></button>
                        }
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr><td colspan="9">
                    @if (loadError() !== null) {
                      <app-error-state [message]="'brain.error.loadChrono' | transloco" [reason]="loadError() ?? ''" (retry)="retryCurrentTab()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="timer" [size]="48"/></div>
                      @if (store.chronoSearch()) {
                        <h3>{{ 'common.noMatches' | transloco }}</h3>
                        <p>{{ 'brain.chrono.empty.noMatchQuery' | transloco }}</p>
                      } @else {
                        <h3>{{ 'brain.chrono.empty.title' | transloco }}</h3>
                      }
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (store.chronoSearchMode() !== 'semantic') {
            <div class="pagination">
              <button class="btn btn-sm btn-secondary" [disabled]="chronoSkip() === 0" (click)="prevChronoPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.chrono().length ? (chronoSkip() + 1) + '–' + (chronoSkip() + store.chrono().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.chrono().length < pageSize" (click)="nextChronoPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
        }

        <!-- File Meta -->
        @if (activeTab() === 'filemeta') {
          <div class="content-header">
            <input type="search" [value]="store.fileMetaSearch()" (input)="onFileMetaSearch($any($event.target).value)" [placeholder]="'brain.fileMeta.filterPlaceholder' | transloco" [attr.aria-label]="'brain.fileMeta.filterAriaLabel' | transloco" />
          </div>
          @if (loading()) {
            <div class="empty-state"><span class="spinner"></span></div>
          } @else if (loadError() !== null) {
            <app-error-state [message]="'brain.error.loadFileMeta' | transloco" [reason]="loadError() ?? ''" (retry)="retryCurrentTab()" />
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
                    @if (editingId() === fm._id) {
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
                                    <app-entity-search mode="picker" [spaceId]="activeSpaceId()" placeholder="common.searchEntitiesPlaceholder" (selected)="picker.pickEntity($event, editFileMeta)" />
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
                          @if (editError()) {
                            <div class="error-msg">{{ editError() }}</div>
                          }
                          <div class="edit-form-actions">
                            <button class="btn btn-sm btn-primary" type="submit" [disabled]="editSaving()">
                              @if (editSaving()) { <span class="spinner" style="width:10px;height:10px;border-width:2px;"></span> }
                              {{ 'common.save' | transloco }}
                            </button>
                            <button class="btn btn-sm btn-secondary" type="button" (click)="cancelEdit()">{{ 'common.cancel' | transloco }}</button>
                          </div>
                        </form>
                      </td></tr>
                    } @else {
                      <tr>
                        <td>
                          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <button class="link-btn" [attr.title]="'brain.fileMeta.openInFilesTabTitle' | transloco" (click)="openFileInManager(fm.path)">{{ fm.path }}</button>
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
                          @if (confirmDeleteId() === fm._id) {
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
              <button class="btn btn-sm btn-secondary" [disabled]="fileMetaSkip() === 0" (click)="prevFileMetaPage()"><ph-icon name="arrow-left" [size]="14" style="display:inline-flex;vertical-align:middle;"/> {{ 'common.prev' | transloco }}</button>
              <span class="pager-info">{{ store.fileMetas().length ? (fileMetaSkip() + 1) + '–' + (fileMetaSkip() + store.fileMetas().length) : '–' }}</span>
              <button class="btn btn-sm btn-secondary" [disabled]="store.fileMetas().length < pageSize" (click)="nextFileMetaPage()">{{ 'common.next' | transloco }} <ph-icon name="arrow-right" [size]="14" style="display:inline-flex;vertical-align:middle;"/></button>
            </div>
          }
        }

        <!-- Query -->
        @if (activeTab() === 'query') {
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
        }

      }

      <!-- Detail Drawer -->
      <app-record-drawer />
    }
  `,
})
export class BrainComponent implements OnInit {
  readonly store = inject(BrainStore);
  readonly picker = inject(EntityRefPicker);
  readonly drawerState = inject(RecordDrawerState);
  private spacesApi = inject(SpacesApi);
  private brainApi = inject(BrainApi);
  private filesApi = inject(FilesApi);
  private transloco = inject(TranslocoService);
  private toast = inject(ToastService);

  collectionTabs: { key: BrainTab; label: string; statsKey?: keyof SpaceStats }[] = [
    { key: 'entities', label: 'Entities', statsKey: 'entities' },
    { key: 'edges', label: 'Edges', statsKey: 'edges' },
    { key: 'memories', label: 'Memories', statsKey: 'memories' },
    { key: 'chrono', label: 'Chrono', statsKey: 'chrono' },
    { key: 'filemeta', label: 'File Meta', statsKey: 'files' },
  ];

  readonly pageSize = 20;

  spaces = signal<SpaceView[]>([]);
  activeSpaceId = signal('');
  activeTab = signal<BrainTab>('query');
  loading = signal(false);
  /** Set to the failure reason when the current tab's list load fails; null when
   *  the load succeeded (or hasn't run). Rendered as a distinct error state
   *  BEFORE the empty state so a failed load never reads as "no data" (U3). */
  loadError = signal<string | null>(null);
  loadingSpaces = signal(true);

  fileMetaSkip = signal(0);
  /** Paths whose embedding retry is currently in flight (disables the Retry button). */
  retryingEmbedding = signal<Set<string>>(new Set());
  fileManagerNavPath = signal('');

  editFileMeta = { description: '', tags: [] as string[], entityIds: '', memoryIds: [] as string[], chronoIds: [] as string[] };

  // ── Shared list filter (F6): type + tag, reused across the list tabs ────────
  /** The active list tab's type+tag filter, driven by <app-record-filter-bar>. */
  recordFilter = signal<RecordFilter>({ type: '', tag: '' });

  /** The filter bar changed — reset the active tab's paging and reload. */
  onFilterChange(f: RecordFilter): void {
    this.recordFilter.set(f);
    switch (this.activeTab()) {
      case 'memories': this.skip.set(0); break;
      case 'entities': this.entitySkip.set(0); break;
      case 'edges': this.edgeSkip.set(0); break;
      case 'chrono': this.chronoSkip.set(0); break;
      default: break;
    }
    this.loadCurrentTab(this.activeSpaceId());
  }

  // Memories pagination + filter (tag/type live in `recordFilter`; entity is separate)
  skip = signal(0);
  filterEntity = signal('');

  // Entities pagination + search
  entitySkip = signal(0);
  entitySearch = signal('');
  private _memSemTimer: ReturnType<typeof setTimeout> | null = null;
  private _edgeSemTimer: ReturnType<typeof setTimeout> | null = null;
  private _chronoSemTimer: ReturnType<typeof setTimeout> | null = null;

  // Edges pagination
  edgeSkip = signal(0);

  // Chrono pagination
  chronoSkip = signal(0);

  // Reindex
  needsReindex = signal(false);
  reindexing = signal(false);
  reindexResult = signal('');

  // Inline delete confirmation (stores the ID pending confirmation)
  confirmDeleteId = signal('');

  // Inline edit state
  editingId = signal('');
  editSaving = signal(false);
  editError = signal('');
  editMemory = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
  editEntity = { name: '', type: '', tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  editEdge = { from: '', to: '', fromName: undefined as string | undefined, toName: undefined as string | undefined, label: '', weight: null as number | null, tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };
  editChrono = { title: '', kind: '' as string, status: '' as string, startsAt: '', endsAt: '', description: '', tags: [] as string[], entityIds: '' };

  // Create memory form
  showMemoryForm = signal(false);
  creatingMemory = signal(false);
  createMemoryError = signal('');
  memoryForm = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };

  // Create entity form
  showEntityForm = signal(false);
  creatingEntity = signal(false);
  createEntityError = signal('');
  entityForm = { name: '', type: '', tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };

  // Create edge form
  showEdgeForm = signal(false);
  creatingEdge = signal(false);
  createEdgeError = signal('');
  edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null as number | null, tags: [] as string[], description: '', properties: {} as Record<string, string | number | boolean> };

  // Create chrono form
  showChronoForm = signal(false);
  creatingChrono = signal(false);
  createChronoError = signal('');
  chronoForm = { title: '', kind: 'event' as ChronoType | '__custom__', customKind: '', startsAt: '', endsAt: '', description: '', tags: [] as string[], entityIds: '' };

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

  // Entity picker

  activeStats = computed(() =>
    this.spaces().find(sv => sv.space.id === this.activeSpaceId())?.stats,
  );

  spaceTotal(stats: SpaceStats): number {
    return stats.memories + stats.entities + stats.edges + stats.chrono + stats.files;
  }

  /** Tooltip for the space-chip network indicator (F8): the network name(s) plus
   *  the human-readable status. Colour alone must not carry the meaning (a11y). */
  networkChipTitle(space: Space): string {
    const status = space.networkStatus ?? 'idle';
    const names = (space.networks ?? []).map(n => n.label).join(', ');
    const statusText = this.transloco.translate(`brain.spaceChip.network.${status}`);
    const prefix = this.transloco.translate('brain.spaceChip.network.prefix');
    return names ? `${prefix}: ${names} — ${statusText}` : statusText;
  }

  ngOnInit(): void {
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => {
        this.spaces.set(spaces.map(s => ({ space: s })));
        this.loadingSpaces.set(false);
        if (spaces.length > 0) {
          this.selectSpace(spaces[0].id);
          // Pre-load stats for all other spaces so counts show on their chips
          spaces.slice(1).forEach(s => this.loadStats(s.id));
        }
      },
      error: () => this.loadingSpaces.set(false),
    });
  }

  selectSpace(id: string): void {
    this.activeSpaceId.set(id);
    this.picker.spaceId.set(id);
    this.drawerState.spaceId.set(id);
    this.skip.set(0);
    this.entitySkip.set(0);
    this.edgeSkip.set(0);
    this.chronoSkip.set(0);
    this.recordFilter.set({ type: '', tag: '' });
    this.filterEntity.set('');
    this.entitySearch.set('');
    this.store.memorySearch.set('');
    this.store.edgeSearch.set('');
    this.store.chronoSearch.set('');
    this.store.memorySearchMode.set('text');
    this.store.edgeSearchMode.set('text');
    this.store.chronoSearchMode.set('text');
    this.confirmDeleteId.set('');
    this.reindexResult.set('');
    this.loadStats(id);
    this.loadSpaceMeta(id);
    this.loadCurrentTab(id);
  }

  setTab(tab: BrainTab): void {
    this.activeTab.set(tab);
    this.skip.set(0);
    this.entitySkip.set(0);
    this.edgeSkip.set(0);
    this.chronoSkip.set(0);
    this.fileMetaSkip.set(0);
    this.recordFilter.set({ type: '', tag: '' });
    this.filterEntity.set('');
    this.store.memorySearch.set('');
    this.store.edgeSearch.set('');
    this.store.chronoSearch.set('');
    this.store.fileMetaSearch.set('');
    this.store.memorySearchMode.set('text');
    this.store.edgeSearchMode.set('text');
    this.store.chronoSearchMode.set('text');
    this.confirmDeleteId.set('');
    this.loadCurrentTab(this.activeSpaceId());
  }

  prevPage(): void { this.skip.update(s => Math.max(0, s - this.pageSize)); this.loadCurrentTab(this.activeSpaceId()); }
  nextPage(): void { this.skip.update(s => s + this.pageSize); this.loadCurrentTab(this.activeSpaceId()); }

  prevEntityPage(): void { this.entitySkip.update(s => Math.max(0, s - this.pageSize)); this.loadCurrentTab(this.activeSpaceId()); }
  nextEntityPage(): void { this.entitySkip.update(s => s + this.pageSize); this.loadCurrentTab(this.activeSpaceId()); }

  prevEdgePage(): void { this.edgeSkip.update(s => Math.max(0, s - this.pageSize)); this.loadCurrentTab(this.activeSpaceId()); }
  nextEdgePage(): void { this.edgeSkip.update(s => s + this.pageSize); this.loadCurrentTab(this.activeSpaceId()); }

  prevChronoPage(): void { this.chronoSkip.update(s => Math.max(0, s - this.pageSize)); this.loadCurrentTab(this.activeSpaceId()); }
  nextChronoPage(): void { this.chronoSkip.update(s => s + this.pageSize); this.loadCurrentTab(this.activeSpaceId()); }

  prevFileMetaPage(): void { this.fileMetaSkip.update(s => Math.max(0, s - this.pageSize)); this.loadCurrentTab(this.activeSpaceId()); }
  nextFileMetaPage(): void { this.fileMetaSkip.update(s => s + this.pageSize); this.loadCurrentTab(this.activeSpaceId()); }

  onFileMetaSearch(q: string): void {
    this.store.fileMetaSearch.set(q);
    // client-side filter via filteredFileMetas computed() — no API call per keystroke
  }

  searchEntities(): void { this.entitySkip.set(0); this.loadCurrentTab(this.activeSpaceId()); }

  // ── Entity search bar handlers (brain entities tab) ──────────────────────
  onEntitySearchChange(q: string): void {
    this.entitySearch.set(q);
    this.entitySkip.set(0);
    this.loadEntitiesSilent();
  }
  onEntitySearchClear(): void {
    this.entitySearch.set('');
    this.entitySkip.set(0);
    this.loadEntitiesSilent();
  }
  onEntitySearchPick(ent: Entity): void {
    this.entitySearch.set(ent.name);
    this.entitySkip.set(0);
    this.loadEntitiesSilent();
  }

  loadEntitiesSilent(): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    const ef: { search?: string; type?: string; tag?: string } = {};
    if (this.entitySearch()) ef.search = this.entitySearch();
    if (this.recordFilter().type) ef.type = this.recordFilter().type;
    if (this.recordFilter().tag) ef.tag = this.recordFilter().tag;
    this.brainApi.listEntities(spaceId, this.pageSize, this.entitySkip(), ef).subscribe({
      next: ({ entities }) => this.store.entities.set(entities),
      error: () => {},
    });
  }

  // ── Memory / Edge / Chrono search with mode toggle ─────────────────────────
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
    else { this.skip.set(0); this.loadCurrentTab(this.activeSpaceId()); }
  }
  runSemanticMemorySearch(): void {
    const q = this.store.memorySearch().trim();
    const spaceId = this.activeSpaceId();
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
    else { this.edgeSkip.set(0); this.loadCurrentTab(this.activeSpaceId()); }
  }
  runSemanticEdgeSearch(): void {
    const q = this.store.edgeSearch().trim();
    const spaceId = this.activeSpaceId();
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

  onChronoSearch(q: string): void {
    this.store.chronoSearch.set(q);
    if (this.store.chronoSearchMode() === 'semantic') {
      if (this._chronoSemTimer) clearTimeout(this._chronoSemTimer);
      if (!q.trim()) { this.store.chrono.set([]); return; }
      this._chronoSemTimer = setTimeout(() => this.runSemanticChronoSearch(), 300);
    }
    // text mode: filteredChrono computed() handles filtering automatically
  }
  setChronoSearchMode(m: 'text' | 'semantic'): void {
    this.store.chronoSearchMode.set(m);
    const q = this.store.chronoSearch().trim();
    if (!q) return;
    if (m === 'semantic') this.runSemanticChronoSearch();
    // text mode: filteredChrono computed() handles filtering automatically
  }
  runSemanticChronoSearch(): void {
    const q = this.store.chronoSearch().trim();
    const spaceId = this.activeSpaceId();
    if (!q || !spaceId) { this.store.chrono.set([]); return; }
    this.brainApi.recallBrain(spaceId, { query: q, types: ['chrono'], topK: 20 }).pipe(
      catchError(() => of({ results: [], count: 0 })),
    ).subscribe(res => {
      this.store.chrono.set(res.results.filter(r => r.type === 'chrono').map(r => ({
        _id: r['_id'] as string,
        spaceId: (r['spaceId'] as string) ?? spaceId,
        title: (r['title'] as string) ?? '',
        description: r['description'] as string | undefined,
        type: ((r['type'] as string) ?? 'event') as ChronoType,
        startsAt: (r['startsAt'] as string) ?? '',
        endsAt: r['endsAt'] as string | undefined,
        status: 'upcoming' as ChronoStatus,
        confidence: r['confidence'] as number | undefined,
        tags: (r['tags'] as string[]) ?? [],
        entityIds: (r['entityIds'] as string[]) ?? [],
        memoryIds: [],
        author: (r['author'] as { instanceId: string; instanceLabel: string }) ?? { instanceId: '', instanceLabel: '' },
        createdAt: (r['createdAt'] as string) ?? '',
        updatedAt: (r['createdAt'] as string) ?? '',
        seq: (r['seq'] as number) ?? 0,
      } as ChronoEntry)));
    });
  }

  applyChronoSearch(): void { this.chronoSkip.set(0); this.loadCurrentTab(this.activeSpaceId()); }

  loadStats(spaceId: string): void {
    this.spacesApi.getSpaceStats(spaceId).subscribe({
      next: (stats) => {
        this.spaces.update(list =>
          list.map(sv => sv.space.id === spaceId ? { ...sv, stats } : sv),
        );
      },
      error: () => {},
    });
    this.spacesApi.getReindexStatus(spaceId).subscribe({
      next: ({ needsReindex }) => this.needsReindex.set(needsReindex),
      error: () => {},
    });
  }

  /** Re-run the current tab's load — bound to the error state's Retry button. */
  retryCurrentTab(): void {
    const spaceId = this.activeSpaceId();
    if (spaceId) this.loadCurrentTab(spaceId);
  }

  private loadCurrentTab(spaceId: string): void {
    if (!spaceId) return;
    this.loading.set(true);
    this.loadError.set(null);

    switch (this.activeTab()) {
      case 'memories': {
        const filters: { tag?: string; entity?: string; type?: string } = {};
        if (this.recordFilter().tag) filters.tag = this.recordFilter().tag;
        if (this.filterEntity()) filters.entity = this.filterEntity();
        if (this.recordFilter().type) filters.type = this.recordFilter().type;
        this.brainApi.listMemories(spaceId, this.pageSize, this.skip(), filters).subscribe({
          next: ({ memories }) => {
            this.store.memories.set(memories);
            const ids = [...new Set(memories.flatMap(m => m.entityIds ?? []))];
            if (ids.length) this.picker.resolveEntityNames(ids);
            this.loading.set(false);
          },
          error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
        });
        break;
      }
      case 'entities': {
        const ef: { search?: string; type?: string; tag?: string } = {};
        if (this.entitySearch()) ef.search = this.entitySearch();
        if (this.recordFilter().type) ef.type = this.recordFilter().type;
        if (this.recordFilter().tag) ef.tag = this.recordFilter().tag;
        this.brainApi.listEntities(spaceId, this.pageSize, this.entitySkip(), ef).subscribe({
          next: ({ entities }) => { this.store.entities.set(entities); this.loading.set(false); },
          error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
        });
        break;
      }
      case 'edges': {
        const gf: { type?: string; tag?: string } = {};
        if (this.recordFilter().type) gf.type = this.recordFilter().type;
        if (this.recordFilter().tag) gf.tag = this.recordFilter().tag;
        this.brainApi.listEdges(spaceId, this.pageSize, this.edgeSkip(), gf).subscribe({
          next: ({ edges }) => { this.store.edges.set(edges); this.loading.set(false); },
          error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
        });
        break;
      }
      case 'chrono': {
        const cf: { search?: string; type?: string; tag?: string } = {};
        if (this.store.chronoSearch()) cf.search = this.store.chronoSearch();
        if (this.recordFilter().type) cf.type = this.recordFilter().type;
        if (this.recordFilter().tag) cf.tag = this.recordFilter().tag;
        this.brainApi.listChrono(spaceId, this.pageSize, this.chronoSkip(), cf).subscribe({
          next: ({ chrono }) => {
            this.store.chrono.set(chrono);
            const ids = [...new Set(chrono.flatMap(e => e.entityIds ?? []))];
            if (ids.length) this.picker.resolveEntityNames(ids);
            this.loading.set(false);
          },
          error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
        });
        break;
      }
      case 'query':
        // Query tab manages its own loading state; just clear the global overlay
        this.loading.set(false);
        break;
      case 'graph':
        // Graph tab is self-contained; no data pre-fetch needed
        this.loading.set(false);
        break;
      case 'files':
        // File manager handles its own loading
        this.loading.set(false);
        break;
      case 'filemeta':
        this.filesApi.listFileMeta(spaceId, this.pageSize, this.fileMetaSkip(), this.store.fileMetaSearch() || undefined).subscribe({
          next: ({ files }) => { this.store.fileMetas.set(files); this.loading.set(false); },
          error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
        });
        break;
    }
  }

  /** Re-queue embedding for a file whose embedding failed or is only partial,
   *  then refresh the file-meta list so the badge updates. */
  retryFileEmbedding(fm: FileMeta): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId || this.retryingEmbedding().has(fm.path)) return;
    this.retryingEmbedding.update(s => new Set(s).add(fm.path));
    const done = () => {
      this.retryingEmbedding.update(s => { const n = new Set(s); n.delete(fm.path); return n; });
      this.loadCurrentTab(spaceId);
    };
    this.filesApi.retryEmbedding(spaceId, fm.path).subscribe({ next: done, error: done });
  }

  applyFilter(type: 'tag' | 'entity', value: string): void {
    // A tag-click in the table feeds the shared filter bar (single source of truth).
    if (type === 'tag') this.recordFilter.set({ ...this.recordFilter(), tag: value });
    else this.filterEntity.set(value);
    this.skip.set(0);
    this.loadCurrentTab(this.activeSpaceId());
  }

  clearFilter(which: 'tag' | 'entity' | 'all'): void {
    if (which === 'tag' || which === 'all') this.recordFilter.set({ ...this.recordFilter(), tag: '' });
    if (which === 'entity' || which === 'all') this.filterEntity.set('');
    this.skip.set(0);
    this.loadCurrentTab(this.activeSpaceId());
  }

  requestDelete(id: string): void { this.confirmDeleteId.set(id); }
  cancelDelete(): void { this.confirmDeleteId.set(''); }

  // ── Inline edit methods ────────────────────────────────────────────────

  startEditMemory(mem: Memory): void {
    this.editingId.set(mem._id);
    this.editError.set('');
    this.editMemory = {
      fact: mem.fact,
      tags: mem.tags ?? [],
      entityIds: (mem.entityIds ?? []).join(', '),
      description: mem.description ?? '',
      properties: this.store.buildPropertiesObject('memory', mem.properties ?? {}),
    };
  }

  startEditEntity(ent: Entity): void {
    this.editingId.set(ent._id);
    this.editError.set('');
    this.editEntity = {
      name: ent.name,
      type: ent.type ?? '',
      tags: ent.tags ?? [],
      description: ent.description ?? '',
      properties: this.store.buildPropertiesObject('entity', ent.properties ?? {}, ent.type),
    };
  }

  startEditEdge(edge: Edge): void {
    this.editingId.set(edge._id);
    this.editError.set('');
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

  startEditChrono(entry: ChronoEntry): void {
    this.editingId.set(entry._id);
    this.editError.set('');
    this.editChrono = {
      title: entry.title,
      kind: entry.type,
      status: entry.status,
      startsAt: entry.startsAt ? toLocalDatetime(entry.startsAt) : '',
      endsAt: entry.endsAt ? toLocalDatetime(entry.endsAt) : '',
      description: entry.description ?? '',
      tags: entry.tags ?? [],
      entityIds: (entry.entityIds ?? []).join(', '),
    };
  }

  cancelEdit(): void {
    this.editingId.set('');
    this.editError.set('');
  }

  saveEditMemory(id: string): void {
    this.editSaving.set(true);
    this.editError.set('');
    const memProps = this.editMemory.properties;
    this.brainApi.updateMemory(this.activeSpaceId(), id, {
      fact: this.editMemory.fact.trim(),
      tags: this.editMemory.tags,
      entityIds: this.editMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
      description: this.editMemory.description.trim(),
      ...(Object.keys(memProps).length ? { properties: memProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.editingId.set('');
        this.store.memories.update(list => list.map(m => m._id === id ? updated : m));
      },
      error: (err) => { this.editSaving.set(false); this.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  saveEditEntity(id: string): void {
    this.editSaving.set(true);
    this.editError.set('');
    const entProps = this.store.stripEmptyOptionalProps(this.editEntity.properties, this.store.entitySchema(this.editEntity.type));
    this.brainApi.updateEntity(this.activeSpaceId(), id, {
      name: this.editEntity.name.trim(),
      type: this.editEntity.type.trim(),
      tags: this.editEntity.tags,
      description: this.editEntity.description.trim(),
      ...(Object.keys(entProps).length ? { properties: entProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.editingId.set('');
        this.store.entities.update(list => list.map(e => e._id === id ? updated : e));
      },
      error: (err) => { this.editSaving.set(false); this.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  saveEditEdge(id: string): void {
    this.editSaving.set(true);
    this.editError.set('');
    const edgeProps = this.store.stripEmptyOptionalProps(this.editEdge.properties, this.store.edgeSchema(this.editEdge.label));
    this.brainApi.updateEdge(this.activeSpaceId(), id, {
      label: this.editEdge.label.trim(),
      tags: this.editEdge.tags,
      description: this.editEdge.description.trim(),
      ...(this.editEdge.weight != null ? { weight: this.editEdge.weight } : {}),
      ...(Object.keys(edgeProps).length ? { properties: edgeProps } : {}),
    }).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.editingId.set('');
        this.store.edges.update(list => list.map(e => e._id === id ? updated : e));
      },
      error: (err) => { this.editSaving.set(false); this.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  saveEditChrono(id: string): void {
    this.editSaving.set(true);
    this.editError.set('');
    this.brainApi.updateChrono(this.activeSpaceId(), id, {
      title: this.editChrono.title.trim(),
      type: this.editChrono.kind as ChronoType,
      status: this.editChrono.status as ChronoStatus,
      ...(this.editChrono.startsAt ? { startsAt: new Date(this.editChrono.startsAt).toISOString() } : {}),
      ...(this.editChrono.endsAt ? { endsAt: new Date(this.editChrono.endsAt).toISOString() } : {}),
      description: this.editChrono.description.trim(),
      tags: this.editChrono.tags,
      entityIds: this.editChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean),
    }).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.editingId.set('');
        this.store.chrono.update(list => list.map(c => c._id === id ? updated : c));
      },
      error: (err) => { this.editSaving.set(false); this.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteMemory(id: string): void {
    this.confirmDeleteId.set('');
    this.brainApi.deleteMemory(this.activeSpaceId(), id).subscribe({
      next: () => { this.store.memories.update(list => list.filter(m => m._id !== id)); this.loadStats(this.activeSpaceId()); },
      error: () => {},
    });
  }

  // ── File Meta inline edit ─────────────────────────────────────────────────

  startEditFileMeta(entry: FileMeta): void {
    this.editingId.set(entry._id);
    this.editError.set('');
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
    this.editSaving.set(true);
    this.editError.set('');
    this.filesApi.updateFileMeta(this.activeSpaceId(), id, {
      description: this.editFileMeta.description.trim(),
      tags: this.editFileMeta.tags,
      entityIds: this.editFileMeta.entityIds.split(',').map(s => s.trim()).filter(Boolean),
      memoryIds: this.editFileMeta.memoryIds,
      chronoIds: this.editFileMeta.chronoIds,
    }).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.editingId.set('');
        this.store.fileMetas.update(list => list.map(f => f._id === id ? updated : f));
      },
      error: (err) => { this.editSaving.set(false); this.editError.set(fmtApiError(err, 'Failed to save')); },
    });
  }

  deleteFileMeta(id: string): void {
    // Deleting just removes the metadata record, not the file itself.
    const fm = this.store.fileMetas().find(f => f._id === id);
    if (!fm) { this.confirmDeleteId.set(''); return; }
    this.filesApi.deleteFileMeta(this.activeSpaceId(), fm.path).subscribe({
      next: () => {
        this.confirmDeleteId.set('');
        this.store.fileMetas.update(list => list.filter(f => f._id !== id));
        this.loadStats(this.activeSpaceId());
      },
      error: () => {
        this.confirmDeleteId.set('');
        this.toast.error(this.transloco.translate('brain.error.deleteFileMetaFailed'));
      },
    });
  }

  // ── File Meta navigation helpers ─────────────────────────────────────────

  /** Called from Files tab file preview: switch to Filemeta tab filtered by path. */
  openFileMetaEntry(path: string): void {
    this.store.fileMetaSearch.set(path.replace(/^\/+/, ''));
    this.fileMetaSkip.set(0);
    this.activeTab.set('filemeta');
    this.loadCurrentTab(this.activeSpaceId());
  }

  /** Called from Filemeta tab: switch to Files tab and navigate to the file's directory. */
  openFileInManager(path: string): void {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) || '/' : '/';
    this.fileManagerNavPath.set(dir === '/' ? '' : dir);
    this.setTab('files');
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
    this.brainApi.createMemory(this.activeSpaceId(), body).subscribe({
      next: () => {
        this.creatingMemory.set(false);
        this.showMemoryForm.set(false);
        this.memoryForm = { fact: '', tags: [], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
        this.loadStats(this.activeSpaceId());
        this.loadCurrentTab(this.activeSpaceId());
      },
      error: (err) => { this.creatingMemory.set(false); this.createMemoryError.set(fmtApiError(err, 'Failed to create memory')); },
    });
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
    this.brainApi.createEntity(this.activeSpaceId(), body).subscribe({
      next: () => {
        this.creatingEntity.set(false);
        this.showEntityForm.set(false);
        this.entityForm = { name: '', type: '', tags: [], description: '', properties: {} as Record<string, string | number | boolean> };
        this.loadStats(this.activeSpaceId());
        this.loadCurrentTab(this.activeSpaceId());
      },
      error: (err) => { this.creatingEntity.set(false); this.createEntityError.set(fmtApiError(err, 'Failed to create entity')); },
    });
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
    this.brainApi.createEdge(this.activeSpaceId(), body).subscribe({
      next: () => {
        this.creatingEdge.set(false);
        this.showEdgeForm.set(false);
        this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: '', weight: null, tags: [], description: '', properties: {} as Record<string, string | number | boolean> };
        this.loadStats(this.activeSpaceId());
        this.loadCurrentTab(this.activeSpaceId());
      },
      error: (err) => { this.creatingEdge.set(false); this.createEdgeError.set(fmtApiError(err, 'Failed to create edge')); },
    });
  }

  deleteEntity(id: string): void {
    this.confirmDeleteId.set('');
    this.brainApi.deleteEntity(this.activeSpaceId(), id).subscribe({
      next: () => { this.store.entities.update(list => list.filter(e => e._id !== id)); this.loadStats(this.activeSpaceId()); },
      error: () => {},
    });
  }

  deleteEdge(id: string): void {
    this.confirmDeleteId.set('');
    this.brainApi.deleteEdge(this.activeSpaceId(), id).subscribe({
      next: () => this.store.edges.update(list => list.filter(e => e._id !== id)),
      error: () => {},
    });
  }

  createChrono(): void {
    if (!this.chronoForm.title.trim() || !this.chronoForm.startsAt) return;
    const resolvedKind = this.chronoForm.kind === '__custom__'
      // Custom kind: the server accepts free-text values beyond the predefined enum.
      ? (this.chronoForm.customKind.trim() as ChronoType)
      : this.chronoForm.kind as ChronoType;
    if (!resolvedKind) return;
    this.creatingChrono.set(true);
    this.createChronoError.set('');
    const entityIds = this.chronoForm.entityIds.split(',').map(s => s.trim()).filter(Boolean);
    const body: Parameters<BrainApi['createChrono']>[1] = {
      title: this.chronoForm.title.trim(),
      type: resolvedKind,
      startsAt: new Date(this.chronoForm.startsAt).toISOString(),
    };
    if (this.chronoForm.endsAt) body.endsAt = new Date(this.chronoForm.endsAt).toISOString();
    if (this.chronoForm.description.trim()) body.description = this.chronoForm.description.trim();
    if (this.chronoForm.tags.length) body.tags = this.chronoForm.tags;
    if (entityIds.length) body.entityIds = entityIds;
    this.brainApi.createChrono(this.activeSpaceId(), body).subscribe({
      next: () => {
        this.creatingChrono.set(false);
        this.showChronoForm.set(false);
        this.chronoForm = { title: '', kind: 'event', customKind: '', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '' };
        this.loadCurrentTab(this.activeSpaceId());
      },
      error: (err) => { this.creatingChrono.set(false); this.createChronoError.set(fmtApiError(err, 'Failed to create chrono entry')); },
    });
  }

  deleteChrono(id: string): void {
    this.confirmDeleteId.set('');
    this.brainApi.deleteChrono(this.activeSpaceId(), id).subscribe({
      next: () => this.store.chrono.update(list => list.filter(c => c._id !== id)),
      error: () => {},
    });
  }

  runReindex(): void {
    this.reindexing.set(true);
    this.reindexResult.set('');
    this.spacesApi.reindex(this.activeSpaceId()).subscribe({
      next: (result) => {
        this.reindexing.set(false);
        const total = Object.values(result).reduce((s: number, n) => s + (typeof n === 'number' ? n : 0), 0);
        this.reindexResult.set(`Reindexed ${total} documents.`);
        this.needsReindex.set(false);
        this.loadStats(this.activeSpaceId());
      },
      error: () => { this.reindexing.set(false); this.reindexResult.set('Reindex failed — check server logs.'); },
    });
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
    this.brainApi.queryBrain(this.activeSpaceId(), {
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
    this.brainApi.recallBrain(this.activeSpaceId(), {
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

  // ── Space meta (schema, loaded for property prefill) ────────────────────

  loadSpaceMeta(spaceId: string): void {
    if (!spaceId) return;
    this.spacesApi.getSpaceMeta(spaceId).subscribe({
      next: (meta) => this.store.spaceMeta.set(meta),
      error: () => this.store.spaceMeta.set(null),
    });
  }

  // ── Form openers with schema prefill ────────────────────────────────────

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

  openEdgeForm(): void {
    const firstLabel = Object.keys(this.store.spaceMeta()?.typeSchemas?.edge ?? {})[0] ?? '';
    this.edgeForm = { from: '', fromDisplay: '', to: '', toDisplay: '', label: firstLabel, weight: null, tags: [], description: '', properties: this.store.buildPropertiesObject('edge', {}, firstLabel) };
    this.showEdgeForm.set(true);
  }

  openMemoryForm(): void {
    this.memoryForm = { fact: '', tags: [], entityIds: '', description: '', properties: this.store.buildPropertiesObject('memory') };
    this.showMemoryForm.set(true);
  }

  openChronoForm(): void {
    this.chronoForm = { title: '', kind: 'event', customKind: '', startsAt: '', endsAt: '', description: '', tags: [], entityIds: '' };
    this.showChronoForm.set(true);
  }

  // ── Edge endpoint pickers ───────────────────────────────────────────────
  // Edge from/to set display fields on the shell-owned edgeForm and do NOT touch the entity-name
  // cache — the two branches of the old pickEntity that stay here rather than move to the picker.

  pickEdgeFrom(ent: Entity): void {
    this.edgeForm.from = ent._id;
    this.edgeForm.fromDisplay = ent.name;
  }

  pickEdgeTo(ent: Entity): void {
    this.edgeForm.to = ent._id;
    this.edgeForm.toDisplay = ent.name;
  }

}

