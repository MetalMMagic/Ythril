/**
 * Schema tab — per-type schemas, property rules, and schema-library import/export.
 *
 * Extracted from SpacesComponent (A17.8b), together with the import-conflict and library-picker
 * dialogs it owns. Needs no inputs/outputs: SpaceSettingsState holds the schema being edited.
 *
 * Layout is master/detail (PR-U4): a type list on the left selects the type shown in a stable editor
 * pane on the right, so editing a type or a property no longer collapses the whole list (the old
 * 4-level accordion). Property editors are multi-open — several can be expanded at once in the pane.
 *
 * `schImportError`/`schImportInfo` are signals here, unlike in the old component where they were
 * plain fields. They are written from `FileReader.onload`, which is a bare async callback with no
 * signal write of its own — under OnPush a plain field mutated there would leave the message
 * unrendered. That hazard is exactly why OnPush was not retrofitted onto the 1600-line parent and
 * is applied per component instead.
 */
import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState, type TypeSchemaState } from './space-settings-state.service';
import { SchemaApi } from '../../core/schema-api.service';
import { ToastService } from '../../core/toast.service';
import { KnowledgeType, PropertySchema, SchemaLibraryEntry, TypeSchema } from '../../core/api.types';

const SCHEMA_MD_STYLES = `
.sch-head-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.val-controls { display:inline-flex; align-items:center; gap:16px; flex-wrap:wrap; }
.val-lbl { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
.val-select { font:inherit; font-size:12px; text-transform:none; letter-spacing:0; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); }
.val-check { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; }
.val-check input { margin:0; }
.sch-validation-bar { display:flex; align-items:center; justify-content:space-between; gap:16px 20px; flex-wrap:wrap;
  padding:12px 14px; margin-bottom:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); }
.sch-validation-bar .svb-label { display:flex; flex-direction:column; gap:2px; min-width:0; }
.sch-validation-bar .svb-title { font-size:13px; font-weight:640; color:var(--text-primary); }
.sch-validation-bar .svb-hint { font-size:11.5px; color:var(--text-muted); }
.sch-md { display:grid; grid-template-columns:minmax(190px,250px) 1fr; gap:18px; align-items:start; margin-top:6px; }
@media (max-width:760px) { .sch-md { grid-template-columns:1fr; } }
.sch-master { display:flex; flex-direction:column; gap:3px; min-width:0; }
/* The list of types scrolls inside itself; the add-row above and imports below stay pinned. */
.sch-type-list { display:flex; flex-direction:column; gap:3px; min-height:0; overflow-y:auto; max-height:340px; }
.sch-type-item { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none;
  border:1px solid transparent; border-radius:8px; padding:7px 9px; cursor:pointer; font:inherit; color:var(--text-primary); }
.sch-type-item:hover { background:var(--bg-elevated); }
.sch-type-item.sel { background:color-mix(in srgb,var(--accent) 12%,transparent); border-color:color-mix(in srgb,var(--accent) 34%,transparent); }
.sch-type-item .nm { font-family:var(--font-mono); font-size:13px; color:var(--accent); flex:1; min-width:0;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sch-type-badges { display:inline-flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }
.sch-empty-list { color:var(--text-muted); font-size:12.5px; font-style:italic; padding:14px 6px; text-align:center; }
.sch-detail { min-width:0; }
.sch-detail-empty { color:var(--text-muted); font-size:13px; font-style:italic; padding:26px 20px; text-align:center;
  border:1px dashed var(--border); border-radius:10px; }
.sch-detail-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); }
.sch-detail-head .dt { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;
  overflow:hidden; text-overflow:ellipsis; }
.sch-detail-head .acts { display:flex; gap:4px; flex-shrink:0; }
/* Pinned above the list: a bottom rule, not a top one, because it now heads the column. */
.sch-add-row { display:flex; gap:6px; align-items:center; margin-bottom:8px; padding-bottom:8px;
  border-bottom:1px solid var(--border); }
.sch-add-row input { flex:1; min-width:0; }
.sch-add-btn { display:grid; place-items:center; flex:none; width:30px; height:30px; padding:0;
  border:1px solid var(--border); border-radius:8px; background:var(--bg-primary);
  color:var(--accent); cursor:pointer; }
.sch-add-btn:hover:not(:disabled) { border-color:var(--accent); }
.sch-add-btn:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.6; }
.sch-add-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
/* Same row, but it heads the detail pane's foot rather than the list's head: rule on top, not bottom. */
.sch-add-prop { margin-bottom:0; padding-bottom:0; border-bottom:none;
  margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }
.sch-add-prop input { max-width:260px; }
.sch-add-imports { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px;
  border-top:1px solid var(--border-muted); }
.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; }
/* One coherent text scale for the tab: guidance, section labels, inline messages.
   Every section label reads the same and every hint hangs off it the same way — the delimiter is an
   em dash in all of them, where it used to be parentheses in some and a dash in others. */
.sch-hint { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted); }
.sch-section-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }
/* One rhythm between sections of the detail pane. They were spaced by whatever each block's own
   margins happened to add up to, so the gaps above "Tag suggestions" and "Property schemas" differed
   by several pixels for no reason a reader could infer. */
.sch-detail .sch-section-label,
.sch-detail > .field > label { margin-top:16px; }
.sch-detail > .field:first-of-type > label,
.sch-detail .sch-section-label:first-of-type { margin-top:0; }
.sch-msg { font-size:12px; margin-top:6px; }
.sch-msg.err { color:var(--error); }
.sch-msg.ok  { color:var(--success); }
.sch-type-badges .badge { font-size:9px; }
`;

@Component({
  selector: 'app-space-schema-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [SPACE_DIALOG_STYLES, SCHEMA_MD_STYLES],
  template: `
<!-- space-wide schema validation (governs every type in this space, not one collection) -->
<div class="sch-validation-bar">
  <div class="svb-label">
    <span class="svb-title">{{ 'spaces.schema.validation.sectionTitle' | transloco }}</span>
    <span class="svb-hint">{{ 'spaces.schema.validation.appliesHint' | transloco }}</span>
  </div>
  <div class="val-controls">
    <label class="val-lbl" [attr.title]="'spaces.schema.validation.hint' | transloco">
      {{ 'spaces.schema.validation.label' | transloco }}
      <select [(ngModel)]="state.schValidation" class="val-select">
        <option value="off">{{ 'spaces.settings.validation.off' | transloco }}</option>
        <option value="warn">{{ 'spaces.settings.validation.warn' | transloco }}</option>
        <option value="strict">{{ 'spaces.settings.validation.strict' | transloco }}</option>
      </select>
    </label>
    <label class="val-check" [attr.title]="'spaces.settings.strictLinkageHint' | transloco">
      <input type="checkbox" [(ngModel)]="state.schStrictLinkage" />
      {{ 'spaces.settings.strictLinkage' | transloco }}
    </label>
  </div>
</div>

<!-- export / import toolbar -->
<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
  <button class="btn btn-secondary btn-sm" type="button" (click)="exportSchema()" [attr.title]="'spaces.schema.exportTitle' | transloco"><ph-icon name="upload" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.exportJsonButton' | transloco }}</button>
  <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportSchema()" [attr.title]="'spaces.schema.importTitle' | transloco"><ph-icon name="download-simple" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.importJsonButton' | transloco }}</button>
  <button class="btn btn-secondary btn-sm" type="button" (click)="openExportToLibrary()" [attr.title]="'spaces.schema.exportToLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.exportToLibraryButton' | transloco }}</button>
  <input #schImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportSchemaFile($event)" />
  <input #schTypeImportInput type="file" accept=".json,application/json" style="display:none" (change)="onImportTypeSchemaFile($event)" />
  <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">{{ 'spaces.schema.autoSyncHint' | transloco }}</span>
</div>
<!-- collection tabs -->
<div class="sch-coll-tabs">
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='entity'" (click)="state.schemaCollTab.set('entity');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.entities' | transloco }}
    @if (state.typeCount('entity')) { <span class="sch-cnt-badge">{{ state.typeCount('entity') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='edge'" (click)="state.schemaCollTab.set('edge');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.edges' | transloco }}
    @if (state.typeCount('edge')) { <span class="sch-cnt-badge">{{ state.typeCount('edge') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='memory'" (click)="state.schemaCollTab.set('memory');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.memories' | transloco }}
    @if (state.typeCount('memory')) { <span class="sch-cnt-badge">{{ state.typeCount('memory') }}</span> }
  </button>
  <button class="sch-coll-tab" [class.active]="state.schemaCollTab()==='chrono'" (click)="state.schemaCollTab.set('chrono');schImportError.set('');schImportInfo.set('')">
    {{ 'spaces.schema.tab.chrono' | transloco }}
    @if (state.typeCount('chrono')) { <span class="sch-cnt-badge">{{ state.typeCount('chrono') }}</span> }
  </button>
</div>
<div class="sch-coll-body">

  <!-- collection sub-header (per-type guidance for the active collection) -->
  <div class="sch-head-row">
    @if (state.schemaCollTab() === 'entity') {
      <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span class="sch-hint">{{ 'spaces.schema.entityTypeHint' | transloco }}</span></div>
    } @else if (state.schemaCollTab() === 'edge') {
      <div class="sch-sub">{{ 'spaces.schema.subtitle.labels' | transloco }} <span class="sch-hint">{{ 'spaces.schema.edgeLabelHint' | transloco }}</span></div>
    } @else if (state.schemaCollTab() === 'memory') {
      <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span class="sch-hint">{{ 'spaces.schema.memoryTypeHint' | transloco }}</span></div>
    } @else {
      <div class="sch-sub">{{ 'spaces.schema.subtitle.types' | transloco }} <span class="sch-hint">{{ 'spaces.schema.chronoTypeHint' | transloco }}</span></div>
    }
  </div>

  <!-- master / detail -->
  <ng-container *ngTemplateOutlet="masterDetail; context: { kt: state.schemaCollTab() }"></ng-container>

  <!-- The space-wide tag-suggestion editor stood here. Retired: one list, editable in a single
       place, applied to every type and every record form in the space — so it steered what agents
       and people tagged with while being easy to set once and never revisit. Tag autocomplete now
       comes from the tags actually in use, which maintains itself. Any stored list is preserved in
       config.json untouched (see space-settings-state.service). -->

</div><!-- sch-coll-body -->

<!-- ── master/detail template ── -->
<ng-template #masterDetail let-kt="kt">
  <div class="sch-md">
    <!-- MASTER: selectable type list -->
    <div class="sch-master">
      <!-- Pinned ABOVE the list on purpose. It used to sit underneath, so it slid further down the
           column with every type added — the control you reach for most moved every time you used
           it. Fixed position, one line: type a name, press Enter or the plus. -->
      <div class="sch-add-row">
        <input type="text" [(ngModel)]="state.schNewTypeInputs[kt]"
          [placeholder]="kt === 'edge' ? ('spaces.schema.newLabelPlaceholder' | transloco) : ('spaces.schema.newTypeNamePlaceholder' | transloco)"
          [attr.aria-label]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)"
          (keydown.enter)="$event.preventDefault();state.addType(kt)" />
        <button class="sch-add-btn" type="button" (click)="state.addType(kt)"
          [disabled]="!state.schNewTypeInputs[kt]?.trim()"
          [attr.title]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)"
          [attr.aria-label]="kt === 'edge' ? ('spaces.schema.addLabelButton' | transloco) : ('spaces.schema.addTypeButton' | transloco)">
          <ph-icon name="plus-circle" [size]="18"/>
        </button>
      </div>

      <!-- The type list scrolls inside its own box: a long allowlist must not stretch the whole dialog
           (and push the imports / Save out of reach) — it stays put and the list scrolls. -->
      <div class="sch-type-list">
      @for (name of state.typeNames(kt); track name) {
        <button type="button" class="sch-type-item" [class.sel]="state.isTypeSelected(kt,name)" (click)="state.selectType(kt,name)">
          <span class="nm">{{ name }}</span>
          <span class="sch-type-badges">
            @if (state.typeLibRef(kt,name)) {
              <span class="badge badge-blue">Library</span>
            } @else {
              @if (state.typeState(kt,name).propertySchemas.length) {
                <span class="badge badge-gray">{{ state.typeState(kt,name).propertySchemas.length }}p</span>
              }
              @if (kt === 'entity' && state.typeState(kt,name).namingPattern) {
                <span class="badge badge-gray">pat</span>
              }
            }
          </span>
        </button>
      } @empty {
        <div class="sch-empty-list">{{ kt === 'edge' ? ('spaces.schema.noEdgeLabels' | transloco) : ('spaces.schema.noTypes' | transloco) }}</div>
      }
      </div>

      <!-- Imports stay at the bottom: they are the occasional path, and putting them beside the
           everyday control is what made the top of this column busy. -->
      <div class="sch-add-imports">
        <button class="btn btn-ghost btn-sm" type="button"
          (click)="triggerImportTypeSchemaNew(kt)"
          [attr.title]="'spaces.schema.importFromFileButton' | transloco"><ph-icon name="download-simple" [size]="12" style="margin-right:3px;vertical-align:-2px;"/>{{ 'spaces.schema.importFromFileButton' | transloco }}</button>
        <button class="btn btn-ghost btn-sm" type="button"
          (click)="triggerImportFromLibraryNew(kt)"
          [attr.title]="'spaces.schema.importFromLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="12" style="margin-right:3px;vertical-align:-2px;"/>{{ 'spaces.schema.importFromLibraryButton' | transloco }}</button>
      </div>
      @if (schImportError()) {
        <div class="sch-msg err">{{ schImportError() }}</div>
      }
      @if (schImportInfo()) {
        <div class="sch-msg ok">{{ schImportInfo() }}</div>
      }
    </div>

    <!-- DETAIL: editor for the selected type -->
    <div class="sch-detail">
      @if (selectedTypeName(kt); as name) {
        <div class="sch-detail-head">
          <span class="dt">{{ name }}</span>
          <span class="acts">
            <button class="btn btn-ghost btn-sm" type="button" (click)="exportTypeSchema(kt,name)"
              style="padding:2px 6px;" [attr.title]="'spaces.schema.exportTypeTitle' | transloco"><ph-icon name="upload" [size]="13"/></button>
            @if (!state.typeLibRef(kt,name)) {
              <button class="btn btn-ghost btn-sm" type="button" (click)="saveTypeToLibrary(kt,name)"
                style="padding:2px 6px;" [attr.title]="'spaces.schema.saveToLibraryTitle' | transloco"
                [attr.aria-label]="'spaces.schema.saveToLibraryButton' | transloco"><ph-icon name="bookmark-simple" [size]="13"/></button>
            }
            <button class="icon-btn danger" type="button" (click)="state.removeType(kt,name)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
          </span>
        </div>

        @if (state.typeLibRef(kt,name); as libRef) {
          <!-- Linked library schema — non-editable -->
          <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:var(--text-secondary);font-size:13px;">
            <ph-icon name="bookmarks" [size]="16" style="color:var(--accent);flex-shrink:0;"/>
            <span>{{ 'spaces.schema.libRef.linkedHint' | transloco: {name: libRef} }}</span>
          </div>
        } @else {
          <!-- Naming pattern (entity only) -->
          @if (kt === 'entity') {
            <div class="field" style="margin:0 0 12px;">
              <label>{{ 'spaces.schema.namingPattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
              <input type="text" [(ngModel)]="state.typeState(kt,name).namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
            </div>
          }
          <!-- Per-type tag suggestions were retired here. The editor reached nothing: not the Brain
               record forms (they suggest from tags already in use) and not the schema guidance sent to
               MCP clients. Offering a control that does nothing is the dishonesty the Models rebuild
               spent four PRs removing, and it is the same reasoning that retired the space-wide list
               in #365. Stored values are preserved — see the note on TypeSchema.tagSuggestions. -->
          <!-- Property schemas -->
          <!-- Every other section in this pane explains itself; this one did not, and it is the one
               doing the most work. The hint also points at the control that decides enforcement,
               which is a whole panel away at the top of the tab. -->
          <div class="sch-section-label">{{ 'spaces.schema.propertySchemas' | transloco }}
            <span class="sch-hint">{{ 'spaces.schema.propertySchemasHint' | transloco }}</span></div>
          <div class="table-wrapper" style="margin-bottom:0;">
            <table class="prop-table" style="margin-bottom:0;">
              <thead>
                <tr>
                  <th style="width:30px;"></th>
                  <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
                  <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
                  <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
                  <th style="width:40px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (p of state.typeState(kt,name).propertySchemas; track p.key) {
                  <tr class="prop-row" [class.prow-open]="state.isPropExpanded(kt,name,p.key)"
                    (click)="state.togglePropExpand(kt,name,p.key)">
                    <td><span class="prop-caret"><ph-icon [name]="state.isPropExpanded(kt,name,p.key) ? 'caret-up' : 'caret-down'" [size]="13"/></span></td>
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
                      <button class="icon-btn danger" type="button" (click)="state.removeProp(kt,name,p.key)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
                    </td>
                  </tr>
                  @if (state.isPropExpanded(kt,name,p.key)) {
                    <tr class="prop-expand-row" (click)="$event.stopPropagation()">
                      <td colspan="5" style="padding:0;">
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
                                <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
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
                                <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
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
                    <td colspan="5" style="padding:24px 0;text-align:center;color:var(--text-muted);font-size:13px;font-style:italic;">
                      {{ 'spaces.schema.noProps' | transloco }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <!-- add property — the same inline [input][+] affordance as the add-type row, so the two
               "add something" controls on this tab read and behave identically. -->
          <div class="sch-add-row sch-add-prop">
            <input type="text" [(ngModel)]="state.typeState(kt,name)._newPropInput" [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
              [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco"
              (keydown.enter)="$event.preventDefault();state.addProp(kt,name)" />
            <button class="sch-add-btn" type="button"
              (click)="state.addProp(kt,name)" [disabled]="!state.typeState(kt,name)._newPropInput.trim()"
              [attr.title]="'spaces.schema.addPropertyButton' | transloco" [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco">
              <ph-icon name="plus-circle" [size]="18"/>
            </button>
          </div>
        }
      } @else {
        <div class="sch-detail-empty">{{ kt === 'edge' ? ('spaces.schema.detail.emptyEdge' | transloco) : ('spaces.schema.detail.empty' | transloco) }}</div>
      }
    </div>
  </div>
</ng-template>

@if (importConflict(); as conflict) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:320;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:440px;max-width:96vw;" [appModal]="'spaces.schema.conflict.title' | transloco" (dismiss)="dismissImportConflict()" (click)="$event.stopPropagation()">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">{{ 'spaces.schema.conflict.title' | transloco }}</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;" [innerHTML]="'spaces.schema.conflict.body' | transloco: { name: conflict.name, kt: conflict.kt }"></p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-secondary" type="button" (click)="resolveImportConflictOverride()">{{ 'spaces.schema.conflict.override' | transloco }}</button>
        @if (importConflict()!.allowAddAs) {
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" [ngModel]="importConflictAddAsName()" (ngModelChange)="importConflictAddAsName.set($event)"
              [placeholder]="'spaces.schema.conflict.newNamePlaceholder' | transloco" style="flex:1;" (keydown.enter)="$event.preventDefault();resolveImportConflictAddAs()" />
            <button class="btn btn-primary btn-sm" type="button" (click)="resolveImportConflictAddAs()" [disabled]="!importConflictAddAsName().trim()">{{ 'spaces.schema.conflict.addAs' | transloco }}</button>
          </div>
        }
        <button class="btn btn-ghost" type="button" (click)="dismissImportConflict()">{{ 'common.cancel' | transloco }}</button>
      </div>
    </div>
  </div>
}

@if (showLibPickerDialog()) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:310;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:560px;max-width:96vw;max-height:80vh;overflow-y:auto;" [appModal]="'spaces.schema.libPicker.title' | transloco" appModalCloseOnBackdrop (dismiss)="closeLibPicker()" (click)="$event.stopPropagation()">
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

@if (exportLibDialog(); as d) {
  <div style="position:fixed;inset:0;background:var(--bg-scrim);display:flex;align-items:center;justify-content:center;z-index:320;">
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;width:480px;max-width:96vw;" [appModal]="'spaces.schema.exportToLibrary.title' | transloco" appModalCloseOnBackdrop (dismiss)="closeExportToLibrary()" (click)="$event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <strong>{{ 'spaces.schema.exportToLibrary.title' | transloco }}</strong>
        <button class="icon-btn" type="button" [attr.aria-label]="'common.close' | transloco" (click)="closeExportToLibrary()"><ph-icon name="x" [size]="14"/></button>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;">{{ 'spaces.schema.exportToLibrary.hint' | transloco }}</p>
      @if (state.isDirty()) {
        <div class="alert alert-warning" style="font-size:12px;margin-bottom:12px;">{{ 'spaces.schema.exportToLibrary.dirtyWarning' | transloco }}</div>
      }
      <div class="field" style="margin-bottom:10px;">
        <label style="font-size:12px;">{{ 'spaces.schema.exportToLibrary.groupLabel' | transloco }}</label>
        <input type="text" [ngModel]="d.groupName" (ngModelChange)="exportLibDialog.set({ ...d, groupName: $event })" style="width:100%;" />
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label style="font-size:12px;">{{ 'spaces.schema.exportToLibrary.prefixLabel' | transloco }}</label>
        <input type="text" [ngModel]="d.namePrefix" (ngModelChange)="exportLibDialog.set({ ...d, namePrefix: $event })" style="width:100%;" />
      </div>
      @if (d.error) { <div class="alert alert-error" style="font-size:12px;margin-bottom:12px;">{{ d.error }}</div> }
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-secondary btn-sm" type="button" (click)="closeExportToLibrary()">{{ 'common.cancel' | transloco }}</button>
        <button class="btn btn-primary btn-sm" type="button" (click)="doExportToLibrary()" [disabled]="d.saving || state.isDirty() || !d.groupName.trim()">
          @if (d.saving) { <span class="spinner" style="width:12px;height:12px;border-width:2px;margin-right:5px;"></span> }
          {{ 'spaces.schema.exportToLibrary.confirm' | transloco }}
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class SpaceSchemaTabComponent {
  readonly state = inject(SpaceSettingsState);
  private schemaApi = inject(SchemaApi);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  @ViewChild('schImportInput') schImportInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('schTypeImportInput') schTypeImportInputRef?: ElementRef<HTMLInputElement>;
  private _typeImportTarget: { kt: KnowledgeType; name: string } | null = null;
  private _libPickerTarget: { kt: KnowledgeType; name: string } | null = null;

  schImportError = signal('');

  /** Success/info note after a schema import stages types (cleared on the next action). */
  schImportInfo = signal('');

  /** Pending import conflict: holds the parsed state waiting for user resolution. */
  importConflict = signal<{ kt: KnowledgeType; name: string; state: TypeSchemaState; allowAddAs: boolean } | null>(null);

  importConflictAddAsName = signal('');

  showLibPickerDialog = signal(false);

  /** "Export whole schema to library" dialog state (null = closed). */
  exportLibDialog = signal<{ groupName: string; namePrefix: string; saving: boolean; error: string } | null>(null);

  libPickerLoading    = signal(false);

  libPickerEntries    = signal<SchemaLibraryEntry[]>([]);

  /** The selected type's name if it belongs to the given collection and still exists, else null. */
  selectedTypeName(kt: KnowledgeType): string | null {
    const s = this.state.schSelectedType;
    return s && s.kt === kt && this.state.typeNames(kt).includes(s.name) ? s.name : null;
  }

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
    this.schImportError.set('');
    this.schImportInputRef?.nativeElement.click();
  }

  /**
   * Export the WHOLE space schema into the instance schema library as a named, reusable group
   * (auto-grouped: one entry per inline type, `$ref` types skipped). Reuses the server `export-space`
   * endpoint, which reads the SAVED space config — so it is disabled while the editor has unsaved
   * changes (the dialog says so). The Schema-Library page's "apply group" is the reverse.
   */
  openExportToLibrary(): void {
    const space = this.state.settingsSpace();
    if (!space) return;
    this.exportLibDialog.set({ groupName: space.label || space.id, namePrefix: space.id, saving: false, error: '' });
  }

  closeExportToLibrary(): void { this.exportLibDialog.set(null); }

  doExportToLibrary(): void {
    const d = this.exportLibDialog();
    const space = this.state.settingsSpace();
    if (!d || !space || this.state.isDirty() || !d.groupName.trim()) return;
    this.exportLibDialog.set({ ...d, saving: true, error: '' });
    this.schemaApi.exportSpaceSchemaToLibrary({
      spaceId: space.id,
      groupName: d.groupName.trim(),
      namePrefix: d.namePrefix.trim() || undefined,
    }).subscribe({
      next: (r) => {
        this.exportLibDialog.set(null);
        this.toast.success(this.transloco.translate('spaces.schema.exportToLibrary.done', {
          created: r.created, updated: r.updated, group: d.groupName.trim(),
        }));
      },
      error: (err) => {
        this.exportLibDialog.set({ ...d, saving: false, error: err?.error?.error ?? this.transloco.translate('spaces.schema.exportToLibrary.failed') });
      },
    });
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
    this.schImportError.set('');
    this.schImportInfo.set('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        // Accept either { typeSchemas: {...} } wrapper or a bare typeSchemas object.
        const ts: unknown = raw?.typeSchemas ?? raw;
        if (!ts || typeof ts !== 'object' || Array.isArray(ts)) {
          this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidFile'));
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
          this.schImportError.set(this.transloco.translate('spaces.schema.import.noTypesFound', { keys: foundKeys }));
          return;
        }

        this.state.schTypeSchemas = merged;
        this.schImportError.set('');
        // Import only STAGES the schemas — they aren't persisted until Save is pressed.
        this.schImportInfo.set(this.transloco.translate('spaces.schema.import.staged', { count: imported }));
      } catch {
        this.schImportError.set(this.transloco.translate('spaces.schema.import.parseFailed'));
      } finally {
        // Reset the input so the same file can be re-imported if needed
        if (this.schImportInputRef) this.schImportInputRef.nativeElement.value = '';
      }
    };
    reader.readAsText(file);
  }

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
    this.schImportError.set('');
    this.schTypeImportInputRef?.nativeElement.click();
  }

  /** Open the file picker to import a type schema as a new type (name derived from file). */
  triggerImportTypeSchemaNew(kt: KnowledgeType): void {
    this._typeImportTarget = { kt, name: '' };
    this.schImportError.set('');
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
          this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidTypeFile'));
          return;
        }
        // Determine target type name: from _typeImportTarget.name (existing), or file's typeName (new)
        const name: string = this._typeImportTarget?.name || (typeof raw?.typeName === 'string' ? raw.typeName.trim() : '');
        if (!name) {
          this.schImportError.set(this.transloco.translate('spaces.schema.import.invalidTypeFile'));
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
        this.schImportError.set('');
      } catch {
        this.schImportError.set(this.transloco.translate('spaces.schema.import.parseFailed'));
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
        this.schImportError.set(err?.error?.error ?? this.transloco.translate('spaces.schema.libSave.failed'));
      },
    });
  }

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
