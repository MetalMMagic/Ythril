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

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, DragDropModule, PhIconComponent],
  // Provided here (not root) so each mount gets its own settings state, with a lifetime tied to
  // this component rather than the app.
  providers: [SpaceSettingsState],
  styles: [`
    /* chip inputs */
    .chip-wrap {
      display:flex; flex-wrap:wrap; gap:4px; align-items:center;
      border:1px solid var(--border); border-radius:var(--radius-sm);
      padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;
    }
    .chip {
      display:inline-flex; align-items:center; gap:3px;
      background:color-mix(in srgb,var(--accent) 15%,transparent);
      color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;
    }
    .chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }
    .chip-rm:hover { color:var(--danger); }
    .chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }
    /* storage bar */
    .st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }
    .st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }
    .st-bar-fill.ok     { background:var(--success); }
    .st-bar-fill.warn   { background:var(--warning); }
    .st-bar-fill.danger { background:var(--danger); }
    /* drag handle */
    .drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }
    .drag-handle:hover { color:var(--text-primary); }
    .drag-handle-disabled { cursor:default; opacity:0.3; }
    .drag-handle-disabled:hover { color:var(--text-muted); }
    .cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }
    .cdk-drag-placeholder { opacity:0.3; }
    .cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }
    /* sort buttons */
    .sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }
    .sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }
    .sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }
    .sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }
    /* search input */
    .space-search-input { height:28px; padding:0 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-surface); color:var(--text-primary); font-size:13px; min-width:160px; }
    /* create dialog */
    .dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }
    .dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }
    .dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    /* settings popup */
    .sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }
    .sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }
    .sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }
    .sp-tabs { display:flex; border-bottom:1px solid var(--border); flex-shrink:0; background:var(--bg-surface); }
    .sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }
    .sp-tab:hover { color:var(--text-primary); }
    .sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }
    .sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }
    .sp-body { flex:1; overflow-y:auto; padding:24px; }
    .sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }
    /* schema */
    .sch-section { margin-bottom:28px; }
    .sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }
    .sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .prop-table { width:100%; border-collapse:collapse; font-size:13px; }
    .prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }
    .prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .prop-expand-row td { background:var(--bg-elevated); padding:0; }
    .prop-expand-inner { padding:12px 16px; }
    /* danger zone */
    .dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }
    .dz-section.dz-red { border-color:var(--danger); }
    .dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }
    .dz-section.dz-red .dz-section-title { color:var(--danger); }
    /* ── schema: top-level collection tabs ── */
    .sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }
    .sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }
    .sch-coll-tab:hover { color:var(--text-primary); }
    .sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }
    .sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }
    .sch-coll-body { padding:20px 0 0; }
    /* ── type-list table (entity types / edge labels) ── */
    .type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }
    .type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }
    .type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .type-table tr:hover td { background:var(--bg-elevated); }
    /* ── property rows ── */
    .prop-row { cursor:pointer; user-select:none; }
    .prop-row:hover td { background:var(--bg-elevated); }
    .prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }
    /* ── property detail card ── */
    .pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); }
    .pdet-fields { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 16px; padding:14px; }
    .pdet-full { padding:0 14px 14px; }
    .req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:3px 10px; border-radius:var(--radius-sm); transition:all .15s; }
    .req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }
    .req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }
    /* ── schema sub-section headers ── */
    .sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }
  `],
  template: `
    <!-- CREATE DIALOG -->
    @if (showCreateDialog()) {
      <div class="dialog-backdrop" (click)="showCreateDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div class="card-title">{{ 'spaces.create.title' | transloco }}</div>
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="showCreateDialog.set(false)"><ph-icon name="x" [size]="14"/></button>
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
                @if (spaces().length > 0) {
                  <div class="table-wrapper" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
                    <table style="margin:0;">
                      <thead><tr><th style="width:40px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th></tr></thead>
                      <tbody>
                        <tr style="cursor:pointer;background:var(--bg-elevated);" (click)="toggleProxyForAll()">
                          <td style="text-align:center;"><input type="checkbox" [checked]="proxyForAll" (click)="$event.stopPropagation()" (change)="toggleProxyForAll()" /></td>
                          <td colspan="2" style="font-style:italic;color:var(--text-muted);">{{ 'spaces.create.proxyForAll' | transloco }}</td>
                        </tr>
                        @for (s of spaces(); track s.id) {
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
              <div style="max-width:720px;">
                <div class="field">
                  <label>{{ 'spaces.settings.label' | transloco }}</label>
                  <input type="text" [(ngModel)]="state.stForm.label" maxlength="200" />
                </div>
                <div class="field">
                  <label>{{ 'spaces.settings.purpose' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.purposeHint' | transloco }}</span></label>
                  <textarea [(ngModel)]="state.stForm.purpose" rows="6" maxlength="4000" style="resize:vertical;"></textarea>
                </div>
                <div class="field">
                  <label>{{ 'spaces.settings.usageNotes' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.usageNotesHint' | transloco }}</span></label>
                  <textarea [(ngModel)]="state.stForm.usageNotes" rows="3" maxlength="2000" style="resize:vertical;"></textarea>
                </div>
                <div class="field" style="max-width:220px;">
                  <label>{{ 'spaces.settings.maxStorage' | transloco }}</label>
                  <input type="number" [(ngModel)]="state.stForm.maxGiB" min="0" step="0.1" [placeholder]="'spaces.settings.unlimitedPlaceholder' | transloco" />
                  <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.maxStorageHint' | transloco }}</div>
                </div>
                <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
                  <div class="field" style="margin:0;">
                    <label>{{ 'spaces.settings.validationMode' | transloco }}</label>
                    <select [(ngModel)]="state.schValidation" style="width:220px;">
                      <option value="off">{{ 'spaces.settings.validation.off' | transloco }}</option>
                      <option value="warn">{{ 'spaces.settings.validation.warn' | transloco }}</option>
                      <option value="strict">{{ 'spaces.settings.validation.strict' | transloco }}</option>
                    </select>
                  </div>
                  <div class="field" style="margin:0;padding-top:22px;">
                    <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;">
                      <input type="checkbox" [(ngModel)]="state.schStrictLinkage" />
                      {{ 'spaces.settings.strictLinkage' | transloco }}
                      <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.strictLinkageHint' | transloco }}</span>
                    </label>
                  </div>
                </div>
              </div>
            }

            <!-- SCHEMA TAB -->
            @if (state.settingsTab() === 'schema') {
              <!-- export / import toolbar -->
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" type="button" (click)="exportSchema()" [attr.title]="'spaces.schema.exportTitle' | transloco"><ph-icon name="upload" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.exportJsonButton' | transloco }}</button>
                <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportSchema()" [attr.title]="'spaces.schema.importTitle' | transloco"><ph-icon name="download-simple" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.importJsonButton' | transloco }}</button>
                <input #schImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportSchemaFile($event)" />
                <input #schTypeImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportTypeSchemaFile($event)" />
                <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">{{ 'spaces.schema.autoSyncHint' | transloco }}</span>
              </div>
              <!-- collection tabs -->
              <div class="sch-coll-tabs">
                <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='entity'" (click)="state.schemaCollTab.set('entity');schImportError='';schImportInfo=''">
                  {{ 'spaces.schema.tab.entities' | transloco }}
                  @if (state.typeCount('entity')) { <span class="sch-cnt-badge">{{ state.typeCount('entity') }}</span> }
                </button>
                <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='edge'" (click)="state.schemaCollTab.set('edge');schImportError='';schImportInfo=''">
                  {{ 'spaces.schema.tab.edges' | transloco }}
                  @if (state.typeCount('edge')) { <span class="sch-cnt-badge">{{ state.typeCount('edge') }}</span> }
                </button>
                <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='memory'" (click)="state.schemaCollTab.set('memory');schImportError='';schImportInfo=''">
                  {{ 'spaces.schema.tab.memories' | transloco }}
                  @if (state.typeCount('memory')) { <span class="sch-cnt-badge">{{ state.typeCount('memory') }}</span> }
                </button>
                <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='chrono'" (click)="state.schemaCollTab.set('chrono');schImportError='';schImportInfo=''">
                  {{ 'spaces.schema.tab.chrono' | transloco }}
                  @if (state.typeCount('chrono')) { <span class="sch-cnt-badge">{{ state.typeCount('chrono') }}</span> }
                </button>
              </div>
              <div class="sch-coll-body">

                @if (state.schemaCollTab() === 'entity') {
                  <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">{{ 'spaces.schema.entityTypeHint' | transloco }}</span></div>
                }
                @if (state.schemaCollTab() === 'edge') {
                  <div class="sch-sub">{{ 'spaces.schema.subtitle.labels' | transloco }} <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">{{ 'spaces.schema.edgeLabelHint' | transloco }}</span></div>
                }
                @if (state.schemaCollTab() === 'memory') {
                  <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">{{ 'spaces.schema.memoryTypeHint' | transloco }}</span></div>
                }
                @if (state.schemaCollTab() === 'chrono') {
                  <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">{{ 'spaces.schema.chronoTypeHint' | transloco }}</span></div>
                }

                <!-- type list -->
                <ng-container *ngTemplateOutlet="typeList; context: { kt: state.schemaCollTab() }"></ng-container>

                <!-- Global tag suggestions (entity tab) -->
                @if (state.schemaCollTab() === 'entity') {
                  <div class="sch-sub" style="margin-top:28px;">{{ 'spaces.schema.globalTagSuggestions' | transloco }} <span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">{{ 'spaces.schema.globalTagSuggestionsHint' | transloco }}</span></div>
                  <div class="chip-wrap">
                    @for (t of state.schTagSuggestions; track t) {
                      <span class="chip">{{ t }}<button type="button" class="chip-rm" (click)="state.schTagSuggestions=state.schTagSuggestions.filter(x=>x!==t)"><ph-icon name="x" [size]="12"/></button></span>
                    }
                    <input type="text" class="chip-field" [(ngModel)]="state.schNewTagInput"
                      [placeholder]="state.schTagSuggestions.length ? '' : ('spaces.schema.addTagSuggestionPlaceholder' | transloco)"
                      (keydown.enter)="$event.preventDefault();state.addGlobalTag()" />
                  </div>
                }

              </div><!-- sch-coll-body -->

              <!-- ── shared type-list template ── -->
              <ng-template #typeList let-kt="kt">
                <div class="table-wrapper" style="margin-bottom:0;">
                  <table class="type-table">
                    <thead>
                      <tr>
                        <th>{{ kt === 'edge' ? ('spaces.schema.typeTable.labelColumn' | transloco) : ('spaces.schema.typeTable.typeName' | transloco) }}</th>
                        <th style="width:48px;"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (name of state.typeNames(kt); track name) {
                        <tr class="prop-row" [class.prow-open]="state.isTypeExpanded(kt,name)">
                          <td (click)="state.toggleTypeExpand(kt,name)" style="cursor:pointer;">
                            <div style="display:flex;align-items:center;gap:8px;">
                              <span style="font-family:var(--font-mono);font-size:13px;color:var(--accent);">{{ name }}</span>
                              @if (state.typeLibRef(kt,name)) {
                                <span class="badge badge-blue" style="font-size:10px;">Library</span>
                              } @else {
                                @if (state.typeState(kt,name).propertySchemas.length) {
                                  <span class="badge badge-gray" style="font-size:10px;">{{ state.typeState(kt,name).propertySchemas.length }} prop{{ state.typeState(kt,name).propertySchemas.length !== 1 ? 's' : '' }}</span>
                                }
                                @if (state.typeState(kt,name).tagSuggestions.length) {
                                  <span class="badge badge-gray" style="font-size:10px;">{{ state.typeState(kt,name).tagSuggestions.length }} tag{{ state.typeState(kt,name).tagSuggestions.length !== 1 ? 's' : '' }}</span>
                                }
                                @if (kt === 'entity' && state.typeState(kt,name).namingPattern) {
                                  <span class="badge badge-gray" style="font-size:10px;">pattern</span>
                                }
                              }
                            </div>
                          </td>
                          <td (click)="$event.stopPropagation()">
                            <div style="display:flex;gap:4px;justify-content:flex-end;">
                              <button class="btn btn-ghost btn-sm" type="button" (click)="exportTypeSchema(kt,name)"
                                style="padding:2px 6px;" [attr.title]="'spaces.schema.exportTypeTitle' | transloco"><ph-icon name="upload" [size]="12"/></button>
                              @if (!state.typeLibRef(kt,name)) {
                                <button class="btn btn-ghost btn-sm" type="button" (click)="saveTypeToLibrary(kt,name)"
                                  style="font-size:10px;padding:2px 6px;" [attr.title]="'spaces.schema.saveToLibraryTitle' | transloco">{{ 'spaces.schema.saveToLibraryButton' | transloco }}</button>
                              }
                              <button class="btn btn-ghost btn-sm" type="button" (click)="state.toggleTypeExpand(kt,name)"
                                style="font-size:10px;padding:2px 8px;min-width:28px;">{{ state.isTypeExpanded(kt,name) ? '▲' : '▼' }}</button>
                              <button class="icon-btn danger" type="button" (click)="state.removeType(kt,name)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
                            </div>
                          </td>
                        </tr>
                        @if (state.isTypeExpanded(kt,name)) {
                          <tr class="prop-expand-row" (click)="$event.stopPropagation()">
                            <td colspan="2" style="padding:0;">
                              <div class="pdet">
                                @if (state.typeLibRef(kt,name); as libRef) {
                                  <!-- Linked library schema — non-editable -->
                                  <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:var(--text-secondary);font-size:13px;">
                                    <ph-icon name="bookmarks" [size]="16" style="color:var(--accent);flex-shrink:0;"/>
                                    <span>{{ 'spaces.schema.libRef.linkedHint' | transloco: {name: libRef} }}</span>
                                  </div>
                                } @else {
                                <!-- Naming pattern (entity only) -->
                                @if (kt === 'entity') {
                                  <div class="pdet-fields" style="margin-bottom:12px;">
                                    <div class="field" style="margin:0;">
                                      <label>{{ 'spaces.schema.namingPattern' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
                                      <input type="text" [(ngModel)]="state.typeState(kt,name).namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
                                    </div>
                                  </div>
                                }
                                <!-- Tag suggestions per type -->
                                <div class="pdet-full" style="margin-bottom:12px;">
                                  <div class="field" style="margin:0;">
                                    <label>{{ 'spaces.schema.tagSuggestions' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.tagSuggestionsHint' | transloco }}</span></label>
                                    <div class="chip-wrap">
                                      @for (tag of state.typeState(kt,name).tagSuggestions; track tag) {
                                        <span class="chip">{{ tag }}<button type="button" class="chip-rm" (click)="state.typeState(kt,name).tagSuggestions=state.typeState(kt,name).tagSuggestions.filter(x=>x!==tag)"><ph-icon name="x" [size]="12"/></button></span>
                                      }
                                      <input type="text" class="chip-field" [(ngModel)]="state.typeState(kt,name)._newTagInput"
                                        [placeholder]="state.typeState(kt,name).tagSuggestions.length ? '' : ('spaces.schema.addTagPlaceholder' | transloco)"
                                        (keydown.enter)="$event.preventDefault();state.addTypeTag(kt,name)" />
                                    </div>
                                  </div>
                                </div>
                                <!-- Property schemas -->
                                <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">{{ 'spaces.schema.propertySchemas' | transloco }}</div>
                                <div class="table-wrapper" style="margin-bottom:0;">
                                  <table class="prop-table" style="margin-bottom:0;">
                                    <thead>
                                      <tr>
                                        <th style="width:160px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
                                        <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
                                        <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
                                        <th style="width:68px;"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      @for (p of state.typeState(kt,name).propertySchemas; track p.key) {
                                        <tr class="prop-row" [class.prow-open]="state.isPropExpanded(kt,name,p.key)"
                                          (click)="state.togglePropExpand(kt,name,p.key)">
                                          <td>
                                            <div style="display:flex;align-items:center;gap:7px;">
                                              <span style="font-family:var(--font-mono);font-size:12px;">{{ p.key }}</span>
                                              <label class="req-toggle" [class.is-req]="p.s.required" (click)="$event.stopPropagation()">
                                                <input type="checkbox" [checked]="p.s.required" (change)="p.s.required = !p.s.required" style="pointer-events:none;" />
                                                {{ 'spaces.schema.propDetail.required' | transloco }}
                                              </label>
                                            </div>
                                          </td>
                                          <td><span class="badge badge-gray" style="font-size:11px;">{{ p.s.type ?? 'any' }}</span></td>
                                          <td style="font-size:11px;color:var(--text-muted);">
                                            @if (p.s.enum?.length) { <span class="badge badge-gray" style="font-size:10px;margin-right:3px;">enum {{ p.s.enum!.length }}</span> }
                                            @if (p.s.minimum!==undefined) { <span style="margin-right:4px;">min:{{ p.s.minimum }}</span> }
                                            @if (p.s.maximum!==undefined) { <span style="margin-right:4px;">max:{{ p.s.maximum }}</span> }
                                            @if (p.s.pattern) { <span style="margin-right:4px;">pattern</span> }
                                            @if (p.s.default!==undefined) { <span style="margin-right:4px;">default:{{ p.s.default }}</span> }
                                            @if (p.s.mergeFn) { <span class="badge badge-blue" style="font-size:10px;">{{ p.s.mergeFn }}</span> }
                                          </td>
                                          <td (click)="$event.stopPropagation()">
                                            <div style="display:flex;gap:4px;justify-content:flex-end;">
                                              <button class="icon-btn danger" type="button" (click)="state.removeProp(kt,name,p.key)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
                                            </div>
                                          </td>
                                        </tr>
                                        @if (state.isPropExpanded(kt,name,p.key)) {
                                          <tr class="prop-expand-row" (click)="$event.stopPropagation()">
                                            <td colspan="4" style="padding:0;">
                                              <div class="pdet">
                                                <div class="pdet-fields">
                                                  <div class="field" style="margin:0;">
                                                    <label>{{ 'spaces.schema.propDetail.type' | transloco }}</label>
                                                    <select [(ngModel)]="p.s.type">
                                                      <option [ngValue]="undefined">any</option>
                                                      <option value="string">string</option>
                                                      <option value="number">number</option>
                                                      <option value="boolean">boolean</option>
                                                      <option value="date">date</option>
                                                    </select>
                                                  </div>
                                                  <div class="field" style="margin:0;">
                                                    <label>{{ 'spaces.schema.propDetail.default' | transloco }}</label>
                                                    <input type="text" [(ngModel)]="p.s.default" placeholder="—" />
                                                  </div>
                                                  <div class="field" style="margin:0;">
                                                    <label>{{ 'spaces.schema.propDetail.mergeFn' | transloco }}</label>
                                                    <select [(ngModel)]="p.s.mergeFn">
                                                      <option [ngValue]="undefined">—</option>
                                                      <option value="avg">avg</option><option value="min">min</option>
                                                      <option value="max">max</option><option value="sum">sum</option>
                                                      <option value="and">and</option><option value="or">or</option>
                                                      <option value="xor">xor</option>
                                                    </select>
                                                  </div>
                                                  @if (p.s.type==='string'||p.s.type===undefined) {
                                                    <div class="field" style="margin:0;">
                                                      <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
                                                      <input type="text" [(ngModel)]="p.s.pattern" placeholder="^[A-Z].*" />
                                                    </div>
                                                  }
                                                  @if (p.s.type==='number'||p.s.type===undefined) {
                                                    <div class="field" style="margin:0;">
                                                      <label>{{ 'spaces.schema.propDetail.min' | transloco }}</label>
                                                      <input type="number" [(ngModel)]="p.s.minimum" placeholder="—" />
                                                    </div>
                                                    <div class="field" style="margin:0;">
                                                      <label>{{ 'spaces.schema.propDetail.max' | transloco }}</label>
                                                      <input type="number" [(ngModel)]="p.s.maximum" placeholder="—" />
                                                    </div>
                                                  }
                                                </div>
                                                @if (p.s.type !== 'boolean') {
                                                  <div class="pdet-full">
                                                    <div class="field" style="margin:0;">
                                                      <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span style="font-size:11px;font-weight:normal;color:var(--text-muted);">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
                                                      <div class="chip-wrap">
                                                        @for (ev of (p.s.enum??[]); track ev) {
                                                          <span class="chip">{{ ev }}<button type="button" class="chip-rm" (click)="state.removeEnumVal(kt,name,p.key,ev)"><ph-icon name="x" [size]="12"/></button></span>
                                                        }
                                                        <input type="text" class="chip-field" [(ngModel)]="p._enumInput"
                                                          [placeholder]="'spaces.schema.propDetail.enumPlaceholder' | transloco" (keydown)="state.onEnumKey($event,kt,name,p.key)" />
                                                      </div>
                                                    </div>
                                                  </div>
                                                }
                                              </div>
                                            </td>
                                          </tr>
                                        }
                                      } @empty {
                                        <tr>
                                          <td colspan="4" style="padding:28px 0;text-align:center;color:var(--text-muted);font-size:13px;font-style:italic;">
                                            {{ 'spaces.schema.noProps' | transloco }}
                                          </td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                </div>
                                <!-- add property -->
                                <div style="display:flex;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
                                  <input type="text" [(ngModel)]="state.typeState(kt,name)._newPropInput" [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
                                    style="flex:1;max-width:220px;"
                                    (keydown.enter)="$event.preventDefault();state.addProp(kt,name)" />
                                  <button class="btn btn-secondary btn-sm" type="button"
                                    (click)="state.addProp(kt,name)" [disabled]="!state.typeState(kt,name)._newPropInput.trim()">{{ 'spaces.schema.addPropertyButton' | transloco }}</button>
                                </div>
                                } <!-- end @else (not a lib-ref type) -->
                              </div>
                            </td>
                          </tr>
                        }
                      } @empty {
                        <tr>
                          <td colspan="2" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;font-style:italic;">
                            {{ kt === 'edge' ? ('spaces.schema.noEdgeLabels' | transloco) : ('spaces.schema.noTypes' | transloco) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <!-- add type/label -->
                <div style="display:flex;gap:8px;align-items:center;margin-top:8px;padding-top:8px;">
                  <input type="text" [(ngModel)]="state.schNewTypeInputs[kt]" [placeholder]="kt === 'edge' ? ('spaces.schema.newLabelPlaceholder' | transloco) : ('spaces.schema.newTypeNamePlaceholder' | transloco)"
                    style="flex:1;max-width:200px;"
                    (keydown.enter)="$event.preventDefault();state.addType(kt)" />
                  <button class="btn btn-secondary btn-sm" type="button"
                    (click)="state.addType(kt)" [disabled]="!state.schNewTypeInputs[kt]?.trim()">{{ kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco) }}</button>
                  <button class="btn btn-secondary btn-sm" type="button"
                    (click)="triggerImportTypeSchemaNew(kt)"
                    [attr.title]="'spaces.schema.importFromFileButton' | transloco"><ph-icon name="download-simple" [size]="13" style="margin-right:4px;vertical-align:-2px;"/>{{ 'spaces.schema.importFromFileButton' | transloco }}</button>
                  <button class="btn btn-secondary btn-sm" type="button"
                    (click)="triggerImportFromLibraryNew(kt)"
                    [attr.title]="'spaces.schema.importFromLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="13" style="margin-right:4px;vertical-align:-2px;"/>{{ 'spaces.schema.importFromLibraryButton' | transloco }}</button>
                </div>
                @if (schImportError) {
                  <div style="font-size:12px;color:var(--error);margin-top:4px;">{{ schImportError }}</div>
                }
                @if (schImportInfo) {
                  <div style="font-size:12px;color:var(--success);margin-top:4px;">{{ schImportInfo }}</div>
                }
              </ng-template>
            }

            <!-- DUPLICATES TAB -->
            @if (state.settingsTab() === 'duplicates') {
              <div style="max-width:760px;">
                <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px;">{{ 'spaces.dupe.intro' | transloco }}</p>

                <div class="field">
                  <label>{{ 'spaces.dupe.survivor' | transloco }}</label>
                  <select [(ngModel)]="state.dupeSurvivor" style="max-width:220px;">
                    <option value="older">{{ 'spaces.dupe.survivorOlder' | transloco }}</option>
                    <option value="newer">{{ 'spaces.dupe.survivorNewer' | transloco }}</option>
                  </select>
                </div>

                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px;font-size:13px;">
                  <input type="checkbox" [(ngModel)]="state.dupeOnInsert" />
                  <span>{{ 'spaces.dupe.onInsert' | transloco }}</span>
                </label>
                <p style="font-size:12px;color:var(--text-muted);margin:-6px 0 16px;">{{ 'spaces.dupe.onInsertHint' | transloco }}</p>

                <div class="dz-section-title" style="margin-top:8px;">{{ 'spaces.dupe.rulesTitle' | transloco }}</div>
                <p style="font-size:12px;color:var(--text-muted);margin:4px 0 12px;">{{ 'spaces.dupe.rulesHint' | transloco }}</p>

                @for (r of state.dupeRulesState; track $index) {
                  <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:8px;">
                    <div class="field" style="margin:0;width:120px;">
                      <label style="font-size:11px;">{{ 'spaces.dupe.minScore' | transloco }}</label>
                      <input type="number" min="0" max="1" step="0.01" [(ngModel)]="r.minScore" />
                    </div>
                    <div class="field" style="margin:0;width:150px;">
                      <label style="font-size:11px;">{{ 'spaces.dupe.action' | transloco }}</label>
                      <select [(ngModel)]="r.action">
                        <option value="flag">{{ 'spaces.dupe.actionFlag' | transloco }}</option>
                        <option value="automerge">{{ 'spaces.dupe.actionAutomerge' | transloco }}</option>
                        <option value="notify">{{ 'spaces.dupe.actionNotify' | transloco }}</option>
                      </select>
                    </div>
                    @if (r.action === 'notify') {
                      <div class="field" style="margin:0;flex:1;min-width:220px;">
                        <label style="font-size:11px;">{{ 'spaces.dupe.webhookUrl' | transloco }}</label>
                        <input type="url" [(ngModel)]="r.webhookUrl" [placeholder]="'spaces.dupe.webhookPlaceholder' | transloco" />
                      </div>
                    }
                    <button class="btn btn-secondary btn-sm" type="button" (click)="state.removeDupeRule($index)"
                            [attr.aria-label]="'spaces.dupe.removeRule' | transloco"><ph-icon name="x" [size]="14"/></button>
                  </div>
                }

                <button class="btn btn-secondary btn-sm" type="button" (click)="state.addDupeRule()" style="margin-top:4px;">
                  <ph-icon name="plus" [size]="14"/> {{ 'spaces.dupe.addRule' | transloco }}
                </button>

                @if (state.hasAutomergeRule()) {
                  <div class="alert alert-warning" style="margin-top:16px;display:flex;gap:8px;align-items:flex-start;">
                    <ph-icon name="warning" [size]="18"/>
                    <span>{{ 'spaces.dupe.automergeWarning' | transloco }}</span>
                  </div>
                }

                @if (state.dupeError()) { <div class="alert alert-error" style="margin-top:12px;">{{ state.dupeError() }}</div> }

                <div style="margin-top:20px;display:flex;gap:8px;align-items:center;">
                  <button class="btn btn-primary" type="button" (click)="saveDupeRules()" [disabled]="state.dupeSaving()">
                    @if (state.dupeSaving()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dupe.save' | transloco }}
                  </button>
                  @if (state.dupeSaved()) { <span style="font-size:13px;color:var(--success);">{{ 'spaces.dupe.saved' | transloco }}</span> }
                </div>
              </div>
            }

            <!-- DANGER ZONE TAB -->
            @if (state.settingsTab() === 'danger') {
              <div class="dz-section">
                <div class="dz-section-title">{{ 'spaces.dangerZone.renameTitle' | transloco }}</div>
                <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.renameDescription' | transloco }}</p>
                <form (ngSubmit)="submitDangerRename()" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                  <div class="field" style="margin:0;flex:1;max-width:280px;">
                    <label>{{ 'spaces.dangerZone.newId' | transloco }}</label>
                    <input type="text" [(ngModel)]="state.dangerRenameId" name="state.dangerRenameId" pattern="[a-z0-9-]+" maxlength="40" [placeholder]="state.settingsSpace()!.id" />
                  </div>
                  <button class="btn btn-secondary" type="submit" [disabled]="state.dangerRenaming()||!state.dangerRenameId.trim()||state.dangerRenameId.trim()===state.settingsSpace()!.id">
                    @if (state.dangerRenaming()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.renameButton' | transloco }}
                  </button>
                </form>
                @if (state.dangerRenameError()) { <div class="alert alert-error" style="margin-top:8px;">{{ state.dangerRenameError() }}</div> }
              </div>

              <div class="dz-section">
                <div class="dz-section-title">{{ 'spaces.dangerZone.wipeTitle' | transloco }}</div>
                <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.wipeDescription' | transloco }}</p>
                @if (state.dangerWipeLoading()) {
                  <div style="display:flex;gap:8px;align-items:center;color:var(--text-muted);font-size:13px;margin-bottom:12px;">
                    <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> {{ 'spaces.dangerZone.loadingCounts' | transloco }}
                  </div>
                } @else if (state.dangerWipeStats()) {
                  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">
                    @for (col of state.wipeStatCols(); track col.label) {
                      <div style="text-align:center;padding:10px 6px;background:var(--bg-elevated);border-radius:var(--radius-sm);">
                        <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);">{{ col.value }}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">{{ col.label }}</div>
                      </div>
                    }
                  </div>
                }
                @if (state.dangerWipeError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerWipeError() }}</div> }
                <button class="btn btn-danger" type="button" (click)="confirmDangerWipe()" [disabled]="state.dangerWiping()">
                  @if (state.dangerWiping()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.wipeButton' | transloco }}
                </button>
              </div>

              @let spaceNets = networksForSpace(state.settingsSpace()!.id);
              @if (spaceNets.length > 0) {
                <div class="dz-section">
                  <div class="dz-section-title">{{ 'spaces.dangerZone.leaveNetworksTitle' | transloco }}</div>
                  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.leaveNetworksDescription' | transloco }}</p>
                  @for (n of spaceNets; track n.id) {
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                      <div>
                        <span style="font-weight:500;">{{ n.label }}</span>
                        <span class="badge badge-gray" style="margin-left:8px;font-size:11px;">{{ n.id }}</span>
                      </div>
                      <button class="btn btn-secondary btn-sm" type="button" (click)="leaveNetworkDanger(n.id)">{{ 'spaces.dangerZone.leaveButton' | transloco }}</button>
                    </div>
                  }
                </div>
              }

              @if (!state.settingsSpace()!.builtIn) {
                <div class="dz-section dz-red">
                  <div class="dz-section-title">{{ 'spaces.dangerZone.deleteTitle' | transloco }}</div>
                  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.deleteDescription' | transloco }}</p>
                  @if (state.dangerDeleteError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerDeleteError() }}</div> }
                  <button class="btn btn-danger" type="button" (click)="confirmDangerDelete()" [disabled]="state.dangerDeleting()">
                    @if (state.dangerDeleting()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.deleteButton' | transloco }}
                  </button>
                </div>
              }
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
    @if (importConflict(); as conflict) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:320;" (click)="dismissImportConflict()">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:440px;max-width:96vw;" (click)="$event.stopPropagation()">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px;">Type already exists</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">A type named <strong style="font-family:var(--font-mono);">{{ conflict.name }}</strong> already exists in <strong>{{ conflict.kt }}</strong>. What would you like to do?</p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-secondary" type="button" (click)="resolveImportConflictOverride()">Override existing</button>
            @if (importConflict()!.allowAddAs) {
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" [ngModel]="importConflictAddAsName()" (ngModelChange)="importConflictAddAsName.set($event)"
                  placeholder="New type name" style="flex:1;" (keydown.enter)="$event.preventDefault();resolveImportConflictAddAs()" />
                <button class="btn btn-primary btn-sm" type="button" (click)="resolveImportConflictAddAs()" [disabled]="!importConflictAddAsName().trim()">Add as</button>
              </div>
            }
            <button class="btn btn-ghost" type="button" (click)="dismissImportConflict()">{{ 'common.cancel' | transloco }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Library picker dialog -->
    @if (showLibPickerDialog()) {
      <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:310;" (click)="closeLibPicker()">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:560px;max-width:96vw;max-height:80vh;overflow-y:auto;" (click)="$event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <strong>{{ 'spaces.schema.libPicker.title' | transloco }}</strong>
            <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeLibPicker()"><ph-icon name="x" [size]="14"/></button>
          </div>
          @if (libPickerLoading()) {
            <div class="empty-state"><span class="spinner"></span></div>
          } @else if (!libPickerEntries().length) {
            <p style="font-size:13px;color:var(--text-muted);">{{ 'spaces.schema.libPicker.empty' | transloco }}</p>
          } @else {
            <div style="display:grid;gap:8px;">
              @for (entry of libPickerEntries(); track entry.name) {
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface);">
                  <div>
                    <div style="font-weight:600;font-size:13px;font-family:var(--font-mono);">{{ entry.name }}</div>
                    <div style="font-size:11px;color:var(--text-muted);">{{ entry.knowledgeType }} · {{ entry.typeName }}</div>
                    @if (entry.description) { <div style="font-size:11px;color:var(--text-secondary);">{{ entry.description }}</div> }
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button class="btn btn-secondary btn-sm" type="button" (click)="importFromLibraryRef(entry)">{{ 'spaces.schema.libPicker.importRef' | transloco }}</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

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
          <button class="btn-secondary btn btn-sm" (click)="load()">{{ 'spaces.table.refreshButton' | transloco }}</button>
        </div>
      </div>
      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th style="width:32px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th><th>{{ 'spaces.table.column.storage' | transloco }}</th><th>{{ 'spaces.table.column.networks' | transloco }}</th><th>{{ 'spaces.table.column.proxy' | transloco }}</th><th></th></tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="onSpaceDrop($event)">
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
                    @if (networksForSpace(s.id).length) {
                      @for (n of networksForSpace(s.id); track n.id) {
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

  spaces   = signal<Space[]>([]);
  networks = signal<Network[]>([]);
  loading  = signal(true);

  spaceSearch = signal('');
  sortMode = signal<'custom' | 'az' | 'za' | 'usage-desc' | 'usage-asc'>('custom');
  sortedSpaces = computed(() => {
    const list = this.spaces();
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

  // create dialog
  creating         = signal(false);
  createError      = signal('');
  showCreateDialog = signal(false);
  proxyForSelected: string[] = [];
  proxyForAll = false;

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

  form = {
    label: '', id: '', maxGiB: null as number | null,
    purpose: SpacesComponent.DEFAULT_PURPOSE,
    validationMode: 'off' as ValidationMode,
    strictLinkage: false,
  };

  schImportError     = '';
  /** Success/info note after a schema import stages types (cleared on the next action). */
  schImportInfo      = '';
  /** Pending import conflict: holds the parsed state waiting for user resolution. */
  importConflict = signal<{ kt: KnowledgeType; name: string; state: TypeSchemaState; allowAddAs: boolean } | null>(null);
  importConflictAddAsName = signal('');

  @ViewChild('schImportInput') schImportInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('schTypeImportInput') schTypeImportInputRef?: ElementRef<HTMLInputElement>;

  /** Tracks the kt/typeName target for per-type import. */
  private _typeImportTarget: { kt: KnowledgeType; name: string } | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => { this.spaces.set(spaces); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.networksApi.listNetworks().subscribe({
      next: ({ networks }) => this.networks.set(networks),
      error: () => {},
    });
  }

  onSpaceDrop(event: CdkDragDrop<Space[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.spaces()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.spaces.set(list);
    this.spacesApi.reorderSpaces(list.map(s => s.id)).subscribe({
      next: ({ spaces }) => { this.spaces.set(spaces); },
      error: () => this.load(),
    });
  }

  networksForSpace(spaceId: string): Network[] {
    return this.networks().filter(n => n.spaces.includes(spaceId));
  }

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
        this.showCreateDialog.set(false);
        this.spaces.update(list => [...list, space]);
        this.form = { label: '', id: '', maxGiB: null, purpose: SpacesComponent.DEFAULT_PURPOSE, validationMode: 'off', strictLinkage: false };
        this.proxyForSelected = [];
        this.proxyForAll = false;
        // Vector indexes finish building server-side (B1); poll so the "preparing
        // indexes" badge clears on its own when the space is ready.
        if (space.indexStatus === 'building') this.pollIndexStatus();
      },
      error: (err) => {
        if (err instanceof TimeoutError) {
          // The server persists the space even if the response was slow — refetch so
          // it appears instead of silently vanishing, and show a soft note.
          this.createError.set(this.transloco.translate('spaces.error.createTimeout'));
          this.load();
          this.pollIndexStatus();
        } else {
          this.createError.set(err.error?.error ?? this.transloco.translate('spaces.error.createFailed'));
        }
      },
    });
  }

  /** Refetch the space list every few seconds while any space is still building its
   *  vector indexes, so the "preparing indexes" badge clears without a manual reload.
   *  Bounded so it always stops. */
  private pollIndexStatus(attempt = 0): void {
    if (attempt > 40) return; // ~2 min cap
    setTimeout(() => {
      this.spacesApi.listSpaces().subscribe({
        next: ({ spaces }) => {
          this.spaces.set(spaces);
          if (spaces.some(s => s.indexStatus === 'building')) this.pollIndexStatus(attempt + 1);
        },
        error: () => {},
      });
    }, 3000);
  }

  async saveDupeRules(): Promise<void> {
    const target = this.state.settingsSpace();
    if (!target) return;
    // Validate notify override URLs client-side (the field is not inside a <form>).
    for (const r of this.state.dupeRulesState) {
      if (r.action === 'notify' && r.webhookUrl?.trim()) {
        try { new URL(r.webhookUrl.trim()); }
        catch { this.state.dupeError.set(this.transloco.translate('spaces.dupe.invalidUrl')); return; }
      }
    }
    // Auto-merge is destructive and unattended — confirm before enabling it.
    if (this.state.hasAutomergeRule()) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('spaces.dupe.automergeConfirmTitle'),
        message: this.transloco.translate('spaces.dupe.automergeConfirm'),
        danger: true,
      });
      if (!ok) return;
    }
    // Normalise: clamp scores, drop empty override URLs.
    const rules: DupeActionRule[] = this.state.dupeRulesState.map(r => ({
      minScore: Math.min(Math.max(Number(r.minScore) || 0, 0), 1),
      action: r.action,
      ...(r.types && r.types.length > 0 ? { types: r.types } : {}),
      ...(r.action === 'notify' && r.webhookUrl?.trim() ? { webhookUrl: r.webhookUrl.trim() } : {}),
    }));
    this.state.dupeSaving.set(true);
    this.state.dupeError.set('');
    this.state.dupeSaved.set(false);
    this.spacesApi.updateSpace(target.id, { dupeRules: rules, dupeMergeSurvivor: this.state.dupeSurvivor, dupeRulesOnInsert: this.state.dupeOnInsert }).subscribe({
      next: ({ space }) => {
        this.state.dupeSaving.set(false);
        this.state.dupeSaved.set(true);
        // Reflect saved state back onto the space object.
        this.state.settingsSpace.set(space);
        this.spaces.update(list => list.map(x => x.id === space.id ? space : x));
      },
      error: (e) => { this.state.dupeSaving.set(false); this.state.dupeError.set(e?.error?.error || this.transloco.translate('spaces.dupe.saveError')); },
    });
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
        this.spaces.update(list => list.map(s => s.id === space.id ? { ...s, ...space } : s));
        this.state.closeSettings();
      },
      error: (err) => { this.state.settingsSaving.set(false); this.state.settingsError.set(err.error?.error ?? this.transloco.translate('spaces.error.saveFailed')); },
    });
  }

  // ── Schema export / import ─────────────────────────────────────────────────

  exportSchema(): void {
    const space = this.state.settingsSpace();
    if (!space) return;
    const meta = this.state.buildMeta();
    const payload = {
      spaceId:     space.id,
      spaceLabel:  space.label,
      exportedAt:  new Date().toISOString(),
      typeSchemas: meta.typeSchemas ?? {},
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${space.id}_schemas.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  triggerImportSchema(): void {
    this.schImportError = '';
    this.schImportInputRef?.nativeElement.click();
  }

  /** Map one raw type-schema object (as exported / stored) into editor state. */
  private mapImportedTypeSchema(ts2: Record<string, unknown>): TypeSchemaState {
    return {
      namingPattern:   typeof ts2['namingPattern'] === 'string' ? ts2['namingPattern'] : '',
      tagSuggestions:  Array.isArray(ts2['tagSuggestions']) ? [...ts2['tagSuggestions'] as string[]] : [],
      propertySchemas: (() => {
        const ps = ts2['propertySchemas'];
        if (!ps || typeof ps !== 'object' || Array.isArray(ps)) return [];
        // Spread preserves every field, including `$ref` (library references).
        return Object.entries(ps as Record<string, unknown>).map(([k, v]) => ({
          key: k,
          s:   { ...(v as PropertySchema) },
          _enumInput: '',
        }));
      })(),
      _newPropInput: '',
      _newTagInput:  '',
    };
  }

  onImportSchemaFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.schImportError = '';
    this.schImportInfo = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        // Accept either { typeSchemas: {...} } wrapper or a bare typeSchemas object.
        const ts: unknown = raw?.typeSchemas ?? raw;
        if (!ts || typeof ts !== 'object' || Array.isArray(ts)) {
          this.schImportError = this.transloco.translate('spaces.schema.import.invalidFile');
          return;
        }
        const tsObj = ts as Record<string, unknown>;
        const KINDS: KnowledgeType[] = ['entity', 'edge', 'memory', 'chrono'];
        const merged = { ...this.state.schTypeSchemas };
        let imported = 0;

        if (typeof tsObj['knowledgeType'] === 'string'
            && typeof tsObj['typeName'] === 'string'
            && tsObj['schema'] && typeof tsObj['schema'] === 'object' && !Array.isArray(tsObj['schema'])) {
          // Shape 1: Ythril's own per-type export — { knowledgeType, typeName, schema }.
          const kt = tsObj['knowledgeType'] as KnowledgeType;
          if (KINDS.includes(kt)) {
            const existing = { ...(merged[kt] ?? {}) };
            existing[tsObj['typeName'] as string] = this.mapImportedTypeSchema(tsObj['schema'] as Record<string, unknown>);
            merged[kt] = existing;
            imported++;
          }
        } else {
          // Shape 2: { entity: { <typeName>: <schema>, ... }, edge: {...}, ... }.
          for (const kt of KINDS) {
            const ktRaw = tsObj[kt];
            if (!ktRaw || typeof ktRaw !== 'object' || Array.isArray(ktRaw)) continue;
            const existing = { ...(merged[kt] ?? {}) };
            for (const [typeName, tsRaw] of Object.entries(ktRaw as Record<string, unknown>)) {
              existing[typeName] = this.mapImportedTypeSchema(tsRaw as Record<string, unknown>);
              imported++;
            }
            merged[kt] = existing;
          }
        }

        if (imported === 0) {
          // Valid JSON, but nothing recognisable — tell the user instead of silently
          // clearing the error and appearing to succeed (B2).
          const foundKeys = Object.keys(tsObj).slice(0, 12).join(', ') || '(none)';
          this.schImportError = this.transloco.translate('spaces.schema.import.noTypesFound', { keys: foundKeys });
          return;
        }

        this.state.schTypeSchemas = merged;
        this.schImportError = '';
        // Import only STAGES the schemas — they aren't persisted until Save is pressed.
        this.schImportInfo = this.transloco.translate('spaces.schema.import.staged', { count: imported });
      } catch {
        this.schImportError = this.transloco.translate('spaces.schema.import.parseFailed');
      } finally {
        // Reset the input so the same file can be re-imported if needed
        if (this.schImportInputRef) this.schImportInputRef.nativeElement.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ── Per-type export / import ───────────────────────────────────────────────

  /** Download a single type definition as a JSON snippet. */
  exportTypeSchema(kt: KnowledgeType, name: string): void {
    const space = this.state.settingsSpace();
    if (!space) return;
    const state = this.state.typeState(kt, name);
    const schema: TypeSchema = {};
    const trimmedPattern = state.namingPattern.trim();
    if (kt === 'entity' && trimmedPattern) schema.namingPattern = trimmedPattern;
    if (state.tagSuggestions.length) schema.tagSuggestions = [...state.tagSuggestions];
    if (state.propertySchemas.length) {
      const ps: Record<string, PropertySchema> = {};
      for (const { key, s } of state.propertySchemas) {
        const entry: PropertySchema = {};
        if (s.type)            entry.type    = s.type;
        if (s.enum?.length)    entry.enum    = [...s.enum];
        if (s.minimum != null) entry.minimum = s.minimum;
        if (s.maximum != null) entry.maximum = s.maximum;
        const trimmedProp = s.pattern?.trim();
        if (trimmedProp)       entry.pattern = trimmedProp;
        if (s.mergeFn)         entry.mergeFn = s.mergeFn;
        if (s.required)        entry.required = s.required;
        if (s.default != null) entry.default  = s.default;
        ps[key] = entry;
      }
      schema.propertySchemas = ps;
    }
    const payload = { knowledgeType: kt, typeName: name, schema };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${space.id}_${kt}_${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Open the file picker for per-type schema import (existing type replacement). */
  triggerImportTypeSchema(kt: KnowledgeType, name: string): void {
    this._typeImportTarget = { kt, name };
    this.schImportError = '';
    this.schTypeImportInputRef?.nativeElement.click();
  }

  /** Open the file picker to import a type schema as a new type (name derived from file). */
  triggerImportTypeSchemaNew(kt: KnowledgeType): void {
    this._typeImportTarget = { kt, name: '' };
    this.schImportError = '';
    this.schTypeImportInputRef?.nativeElement.click();
  }

  /** Handle the file chosen for per-type import. */
  onImportTypeSchemaFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this._typeImportTarget) return;
    const { kt } = this._typeImportTarget;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        // Accept either a full snippet { knowledgeType, typeName, schema } or a bare TypeSchema object
        const schemaRaw: unknown = raw?.schema ?? raw;
        if (!schemaRaw || typeof schemaRaw !== 'object' || Array.isArray(schemaRaw)) {
          this.schImportError = this.transloco.translate('spaces.schema.import.invalidTypeFile');
          return;
        }
        // Determine target type name: from _typeImportTarget.name (existing), or file's typeName (new)
        const name: string = this._typeImportTarget?.name || (typeof raw?.typeName === 'string' ? raw.typeName.trim() : '');
        if (!name) {
          this.schImportError = this.transloco.translate('spaces.schema.import.invalidTypeFile');
          return;
        }
        const ts2 = schemaRaw as Record<string, unknown>;
        const imported: TypeSchemaState = {
          namingPattern:   typeof ts2['namingPattern'] === 'string' ? ts2['namingPattern'] : '',
          tagSuggestions:  Array.isArray(ts2['tagSuggestions']) ? [...ts2['tagSuggestions'] as string[]] : [],
          propertySchemas: (() => {
            const ps = ts2['propertySchemas'];
            if (!ps || typeof ps !== 'object' || Array.isArray(ps)) return [];
            return Object.entries(ps as Record<string, unknown>).map(([k, v]) => ({
              key: k,
              s:   { ...(v as PropertySchema) },
              _enumInput: '',
            }));
          })(),
          _newPropInput: '',
          _newTagInput:  '',
        };
        // When importing as a new type (name derived from file), check for collision
        if (!this._typeImportTarget?.name && this.state.typeNames(kt).includes(name)) {
          // Stash parsed state and show conflict dialog instead of erroring
          this.importConflict.set({ kt, name, state: imported, allowAddAs: true });
          this.importConflictAddAsName.set(name + '-2');
          return;
        }
        this.state.schTypeSchemas = {
          ...this.state.schTypeSchemas,
          [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [name]: imported },
        };
        this.schImportError = '';
      } catch {
        this.schImportError = this.transloco.translate('spaces.schema.import.parseFailed');
      } finally {
        if (this.schTypeImportInputRef) this.schTypeImportInputRef.nativeElement.value = '';
        this._typeImportTarget = null;
      }
    };
    reader.readAsText(file);
  }

  dismissImportConflict(): void {
    this.importConflict.set(null);
    this.importConflictAddAsName.set('');
  }

  resolveImportConflictOverride(): void {
    const c = this.importConflict();
    if (!c) return;
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [c.kt]: { ...(this.state.schTypeSchemas[c.kt] ?? {}), [c.name]: c.state },
    };
    this.dismissImportConflict();
  }

  resolveImportConflictAddAs(): void {
    const c = this.importConflict();
    const newName = this.importConflictAddAsName().trim();
    if (!c || !newName) return;
    if (this.state.typeNames(c.kt).includes(newName)) {
      // Still conflicts — update the suggested name signal so the input shakes visually
      this.importConflictAddAsName.set(newName);
      return;
    }
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [c.kt]: { ...(this.state.schTypeSchemas[c.kt] ?? {}), [newName]: c.state },
    };
    this.dismissImportConflict();
  }

  async submitDangerRename(): Promise<void> {
    const target = this.state.settingsSpace();
    const newId  = this.state.dangerRenameId.trim();
    if (!target || !newId || newId === target.id) return;
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmRenameTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmRename', { label: target.label, id: target.id, newId }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.renameButton'),
    });
    if (!ok) return;
    this.state.dangerRenaming.set(true);
    this.state.dangerRenameError.set('');
    this.spacesApi.renameSpace(target.id, newId).subscribe({
      next: ({ space }) => {
        this.state.dangerRenaming.set(false);
        this.spaces.update(list => list.map(s => s.id === target.id ? space : s));
        this.state.settingsSpace.set(space);
        this.state.dangerRenameId = space.id;
        this.networksApi.listNetworks().subscribe({ next: ({ networks }) => this.networks.set(networks), error: () => {} });
      },
      error: (err) => { this.state.dangerRenaming.set(false); this.state.dangerRenameError.set(err.error?.error ?? this.transloco.translate('spaces.error.renameFailed')); },
    });
  }

  async confirmDangerWipe(): Promise<void> {
    const target = this.state.settingsSpace();
    if (!target) return;
    // Irreversible: require the operator to type the space id (GitHub-style, C3).
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmWipeTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmWipe', { label: target.label }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.wipeButton'),
      danger: true,
      requireText: target.id,
      requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
    });
    if (!ok) return;
    this.state.dangerWiping.set(true);
    this.state.dangerWipeError.set('');
    this.spacesApi.wipeSpace(target.id).subscribe({
      next: () => {
        this.state.dangerWiping.set(false);
        this.state.dangerWipeStats.set(null);
        this.state.dangerWipeLoading.set(true);
        this.spacesApi.getSpaceStats(target.id).subscribe({
          next: (stats) => { this.state.dangerWipeStats.set(stats); this.state.dangerWipeLoading.set(false); },
          error: () => this.state.dangerWipeLoading.set(false),
        });
      },
      error: (err) => { this.state.dangerWiping.set(false); this.state.dangerWipeError.set(err.error?.error ?? this.transloco.translate('spaces.error.wipeFailed')); },
    });
  }

  async confirmDangerDelete(): Promise<void> {
    const target = this.state.settingsSpace();
    if (!target) return;
    // Irreversible: require the operator to type the space id (GitHub-style, C3).
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmDeleteTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmDelete', { label: target.label, id: target.id }),
      confirmLabel: this.transloco.translate('spaces.dangerZone.deleteButton'),
      danger: true,
      requireText: target.id,
      requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
    });
    if (!ok) return;
    this.state.dangerDeleting.set(true);
    this.state.dangerDeleteError.set('');
    this.spacesApi.deleteSpace(target.id).subscribe({
      next: () => {
        this.state.dangerDeleting.set(false);
        this.spaces.update(list => list.filter(s => s.id !== target.id));
        this.state.closeSettings();
      },
      error: (err) => { this.state.dangerDeleting.set(false); this.state.dangerDeleteError.set(err.error?.error ?? this.transloco.translate('spaces.error.deleteFailed')); },
    });
  }

  async leaveNetworkDanger(networkId: string): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('spaces.dangerZone.confirmLeaveNetworkTitle'),
      message: this.transloco.translate('spaces.dangerZone.confirmLeaveNetwork'),
      confirmLabel: this.transloco.translate('networks.leaveButton'),
      danger: true,
    });
    if (!ok) return;
    this.networksApi.leaveNetwork(networkId).subscribe({
      next: () => this.networksApi.listNetworks().subscribe({ next: ({ networks }) => this.networks.set(networks), error: () => {} }),
      error: () => this.toast.error(this.transloco.translate('spaces.error.leaveNetworkFailed')),
    });
  }

  // ── Library: save a type to library ───────────────────────────────────────

  saveTypeToLibrary(kt: KnowledgeType, name: string): void {
    const state = this.state.typeState(kt, name);
    // Auto-derive entry name from the type name (slug)
    const entryName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 200);
    if (!entryName) return;

    const schema: TypeSchema = {};
    if (kt === 'entity' && state.namingPattern.trim()) schema.namingPattern = state.namingPattern.trim();
    if (state.tagSuggestions.length) schema.tagSuggestions = [...state.tagSuggestions];
    if (state.propertySchemas.length) {
      const ps: Record<string, PropertySchema> = {};
      for (const { key, s } of state.propertySchemas) {
        const entry: PropertySchema = {};
        if (s.type)            entry.type    = s.type;
        if (s.enum?.length)    entry.enum    = [...s.enum];
        if (s.minimum != null) entry.minimum = s.minimum;
        if (s.maximum != null) entry.maximum = s.maximum;
        if (s.pattern?.trim()) entry.pattern = s.pattern.trim();
        if (s.mergeFn)         entry.mergeFn = s.mergeFn;
        if (s.required)        entry.required = s.required;
        if (s.default != null) entry.default  = s.default;
        ps[key] = entry;
      }
      schema.propertySchemas = ps;
    }

    const body = { knowledgeType: kt, typeName: name, schema: schema as Omit<TypeSchema, '$ref'> };
    this.schemaApi.upsertSchemaLibraryEntry(entryName, body).subscribe({
      next: () => {
        // Convert the in-space type to a $ref pointing at the new library entry
        const refState: TypeSchemaState & { _libRef?: string } = {
          namingPattern:   '',
          tagSuggestions:  [],
          propertySchemas: [],
          _newPropInput:   '',
          _newTagInput:    '',
          _libRef:         entryName,
        };
        this.state.schTypeSchemas = {
          ...this.state.schTypeSchemas,
          [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [name]: refState },
        };
      },
      error: (err) => {
        this.schImportError = err?.error?.error ?? this.transloco.translate('spaces.schema.libSave.failed');
      },
    });
  }

  // ── Library: import from library ──────────────────────────────────────────

  showLibPickerDialog = signal(false);
  libPickerLoading    = signal(false);
  libPickerEntries    = signal<SchemaLibraryEntry[]>([]);
  /** kt/typeName context for the open library picker */
  private _libPickerTarget: { kt: KnowledgeType; name: string } | null = null;

  triggerImportFromLibrary(kt: KnowledgeType, name: string): void {
    this._libPickerTarget = { kt, name };
    this.libPickerLoading.set(true);
    this.showLibPickerDialog.set(true);
    this.schemaApi.listSchemaLibrary().subscribe({
      next: ({ entries }) => {
        this.libPickerEntries.set(entries.filter(e => e.knowledgeType === kt));
        this.libPickerLoading.set(false);
      },
      error: () => {
        this.libPickerEntries.set([]);
        this.libPickerLoading.set(false);
      },
    });
  }

  triggerImportFromLibraryNew(kt: KnowledgeType): void {
    this._libPickerTarget = { kt, name: '' };
    this.libPickerLoading.set(true);
    this.showLibPickerDialog.set(true);
    this.schemaApi.listSchemaLibrary().subscribe({
      next: ({ entries }) => {
        this.libPickerEntries.set(entries.filter(e => e.knowledgeType === kt));
        this.libPickerLoading.set(false);
      },
      error: () => {
        this.libPickerEntries.set([]);
        this.libPickerLoading.set(false);
      },
    });
  }

  closeLibPicker(): void {
    this.showLibPickerDialog.set(false);
    this._libPickerTarget = null;
  }

  /** Import the library entry's schema as an inline TypeSchemaState (merges into current). */
  importFromLibraryInline(entry: SchemaLibraryEntry): void {
    const target = this._libPickerTarget;
    if (!target) return;
    const typeName = target.name || entry.typeName;
    if (!typeName) return;
    const s = entry.schema;
    const imported: TypeSchemaState = {
      namingPattern:   s.namingPattern ?? '',
      tagSuggestions:  [...(s.tagSuggestions ?? [])],
      propertySchemas: Object.entries(s.propertySchemas ?? {}).map(([k, v]) => ({
        key: k, s: { ...v }, _enumInput: '',
      })),
      _newPropInput: '',
      _newTagInput:  '',
    };
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [target.kt]: { ...(this.state.schTypeSchemas[target.kt] ?? {}), [typeName]: imported },
    };
    this.closeLibPicker();
  }

  /** Set the space's type to use a $ref pointing at this library entry. */
  importFromLibraryRef(entry: SchemaLibraryEntry): void {
    const target = this._libPickerTarget;
    if (!target) return;
    const typeName = target.name || entry.typeName;
    if (!typeName) return;
    // Store as a special sentinel state that renders as a $ref in buildMeta()
    const refState: TypeSchemaState & { _libRef?: string } = {
      namingPattern:   '',
      tagSuggestions:  [],
      propertySchemas: [],
      _newPropInput:   '',
      _newTagInput:    '',
      _libRef:         entry.name,
    };
    // When adding a new type from lib (no pre-existing name), check for collision
    if (!target.name && this.state.typeNames(target.kt).includes(typeName)) {
      this.closeLibPicker();
      this.importConflict.set({ kt: target.kt, name: typeName, state: refState, allowAddAs: false });
      return;
    }
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [target.kt]: { ...(this.state.schTypeSchemas[target.kt] ?? {}), [typeName]: refState },
    };
    this.closeLibPicker();
  }
}
