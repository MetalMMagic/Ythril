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
import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState, emptyTypeSchemaState, typeSchemaFromState, type TypeSchemaState } from './space-settings-state.service';
import { SchemaApi } from '../../core/schema-api.service';
import { ToastService } from '../../core/toast.service';
import { KnowledgeType, PropertySchema, SchemaLibraryEntry, TypeSchema, recordTtlWindows } from '../../core/api.types';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';

const SCHEMA_MD_STYLES = `
/* A floor, so this row cannot collapse and drag the master/detail grid up with it. The row's height is
   otherwise stable by construction now: one hint string for all four collections, differing by a single
   field name, so it wraps the same way whichever tab is open. That is what stops the add control below
   from moving when you switch category. */
.sch-head-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  min-height:20px; }
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
.sch-detail-head { display:flex; align-items:center; gap:10px; min-height:var(--sch-head-h);
  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }
.sch-detail-head .dt { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;
  overflow:hidden; text-overflow:ellipsis; }
.sch-detail-head .acts { display:flex; gap:4px; flex-shrink:0; }
/* Pinned above the list: a bottom rule, not a top one, because it now heads the column.

   It and the detail pane's head are the two column headers, side by side, so they share one height and
   one bottom margin — otherwise their rules sit at different y and the two columns read as misaligned
   even though the grid starts them at the same top edge. --sch-head-h is that shared height; changing
   it moves both. */
.sch-md { --sch-head-h:34px; }
.sch-add-row { display:flex; gap:6px; align-items:center; min-height:var(--sch-head-h);
  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }
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
/* The two retention windows sit side by side and wrap only on a genuinely narrow pane.
   .field must be given a BASIS: it is a flex column, so its intrinsic width is its widest child, and the
   chrono hint under the second input is a long sentence — left to size itself that field claimed the whole
   row and both stacked. Verified by measurement, not by looking at the CSS: the first attempt reported
   two inputs with the labels and placeholders all correct, and they were one above the other. */
.ret-row { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }
.ret-row .field { flex:1 1 190px; min-width:0; max-width:260px; }
.ret-row input { max-width:150px; }
.sch-msg { font-size:12px; margin-top:6px; }
.sch-msg.err { color:var(--error); }
.sch-msg.ok  { color:var(--success); }
.sch-type-badges .badge { font-size:9px; }
`;

@Component({
  selector: 'app-space-schema-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, HscrollTopDirective],
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
  <button class="btn btn-secondary btn-sm" type="button" (click)="triggerImportFromLibraryAny()" [attr.title]="'spaces.schema.importFromLibraryTitle' | transloco"><ph-icon name="bookmarks" [size]="13" style="margin-right:5px;"/>{{ 'spaces.schema.importLibraryButton' | transloco }}</button>
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
  <!-- ONE hint, with the field name as a parameter. There used to be four near-identical strings that
       differed only in the field they named (entity.type, edge.label, and so on), which is both the
       "different styles" the owner saw and the reason this row changed height between collections —
       and everything below it, the add control included, moved with it. -->
  <div class="sch-head-row">
    <div class="sch-sub">
      {{ (state.schemaCollTab() === 'edge' ? 'spaces.schema.subtitle.labels' : 'spaces.schema.subtitle.types') | transloco }}
      <span class="sch-hint">{{ 'spaces.schema.typeHint' | transloco: { field: allowlistField() } }}</span>
    </div>
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
              <!-- A window deletes records, so it is visible from the list rather than only after selecting
                   the type. Amber, not grey: this is the one badge here that describes data loss. -->
              @if (state.typeState(kt,name).retentionDays || state.typeState(kt,name).retentionContentDays) {
                <span class="badge badge-yellow">ttl</span>
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
      </div>
      @if (schImportError()) {
        <div class="sch-msg err">{{ schImportError() }}</div>
      }
      @if (libImportSkipped().length) {
        <div class="sch-msg err">{{ 'spaces.schema.libPicker.skipped' | transloco: { names: libImportSkipped().join(', ') } }}</div>
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
                [attr.aria-label]="'spaces.schema.saveToLibraryButton' | transloco"><ph-icon name="bookmarks" [size]="13"/></button>
            }
            <button class="icon-btn danger" type="button" (click)="state.removeType(kt,name)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
          </span>
        </div>

        @if (state.typeLibRef(kt,name); as libRef) {
          <!-- Linked library schema — editable only after unlinking; shown read-only meanwhile. -->
          <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:var(--text-secondary);font-size:13px;">
            <ph-icon name="bookmarks" [size]="16" style="color:var(--accent);flex-shrink:0;"/>
            <span>{{ 'spaces.schema.libRef.linkedHint' | transloco: {name: libRef} }}</span>
            <button class="btn btn-secondary btn-sm" type="button" style="margin-left:auto;flex-shrink:0;"
              (click)="unlinkType(kt,name)" [attr.title]="'spaces.schema.libRef.unlinkTitle' | transloco">{{ 'spaces.schema.libRef.unlinkButton' | transloco }}</button>
          </div>
          <!-- Read-only view of the linked entry's properties, so you can see what the type enforces
               without unlinking first. -->
          @if (linkedProps(kt,name); as props) {
            @if (props.length) {
              <div class="sch-section-label" style="margin-top:12px;">{{ 'spaces.schema.propertySchemas' | transloco }}</div>
              <div class="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
                      <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
                      <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of props; track p.key) {
                      <tr>
                        <td style="font-family:var(--font-mono);font-size:12.5px;">{{ p.key }}</td>
                        <td>{{ p.s.type || '—' }}</td>
                        <td style="color:var(--text-secondary);font-size:12.5px;">{{ propConstraintSummary(p.s) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="sch-hint" style="margin-top:8px;">{{ 'spaces.schema.libRef.noProps' | transloco }}</div>
            }
          }
        } @else {
          <!-- Naming pattern (entity only) -->
          @if (kt === 'entity') {
            <div class="field" style="margin:0 0 12px;">
              <label>{{ 'spaces.schema.namingPattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
              <input type="text" [(ngModel)]="state.typeState(kt,name).namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
            </div>
          }
          <!-- Retention — the SCHEMA tier of record > schema > space, and the control the Danger Zone, the
               integration guide and the API have all been pointing at. It belongs here, beside the type's
               other rules, rather than in a second parallel map an operator has to know exists.

               The hint names what an empty field inherits, with the space default's actual number in it: the
               operator who asked for this said the old arrangement was a convention they had to know, and
               "inherit" without saying inherit-WHAT is the same failure one level down.

               NOTE: no backticks anywhere in this comment — one kills the whole template string and the
               error then points at @Component. -->
          <div class="sch-section-label">{{ 'spaces.schema.retention.label' | transloco }}
            <!-- The inherited number is THIS collection's bucket, not one space-wide figure: the space tier is
                 five windows, and naming the wrong one would be worse than naming none. -->
            <span class="sch-hint">
              @if (spaceWindow(kt); as days) {
                {{ 'spaces.schema.retention.hintSpace' | transloco: { days } }}
              } @else {
                {{ 'spaces.schema.retention.hintNoSpace' | transloco }}
              }
            </span>
          </div>
          <div class="ret-row">
            <div class="field" style="margin:0;">
              <label>{{ 'spaces.schema.retention.days' | transloco }}</label>
              <input type="number" min="1" step="1" [(ngModel)]="state.typeState(kt,name).retentionDays"
                [placeholder]="'spaces.schema.retention.inherit' | transloco" />
            </div>
            <!-- chrono only, because that is the only collection whose sweep implements it. Offering it on
                 the others would store a number that never fires. -->
            @if (kt === 'chrono') {
              <div class="field" style="margin:0;">
                <label>{{ 'spaces.schema.retention.contentDays' | transloco }}</label>
                <input type="number" min="1" step="1" [(ngModel)]="state.typeState(kt,name).retentionContentDays"
                  [placeholder]="'spaces.schema.retention.never' | transloco" />
                <div class="sch-hint" style="margin-top:3px;">{{ 'spaces.schema.retention.contentDaysHint' | transloco }}</div>
              </div>
            }
          </div>
          <!-- The server CLAMPS a content window that is not strictly inside the delete window (it would
               never fire), so without this the field would accept a number and silently do nothing. -->
          @if (contentWindowNeverFires(kt,name); as total) {
            <div class="sch-msg err">{{ 'spaces.schema.retention.contentTooLate' | transloco: { total } }}</div>
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
          <div class="table-wrapper" hscrollTop style="margin-bottom:0;">
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
          @for (g of libPickerGroups(); track g.group) {
            @if (g.group) {
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
                <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);">{{ g.group }}</strong>
                <button class="btn btn-secondary btn-sm" type="button" (click)="importGroupFromLibrary(g.group)">{{ 'spaces.schema.libPicker.importGroup' | transloco }}</button>
              </div>
            }
          @for (entry of g.entries; track entry.name) {
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
export class SpaceSchemaTabComponent implements OnInit {
  readonly state = inject(SpaceSettingsState);
  private schemaApi = inject(SchemaApi);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  @ViewChild('schImportInput') schImportInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('schTypeImportInput') schTypeImportInputRef?: ElementRef<HTMLInputElement>;
  private _typeImportTarget: { kt: KnowledgeType; name: string } | null = null;
  /**
   * Where a library import lands. `kt: null` means the pick came from the TOP action row, which is not
   * scoped to a knowledge type — the entry carries its own, so the target is derived per entry.
   */
  private _libPickerTarget: { kt: KnowledgeType | null; name: string } | null = null;

  schImportError = signal('');

  /**
   * The record field the active collection's allowlist governs — the one word that differs between the
   * four collections, so the guidance around it can be a single string rather than four near-copies.
   */
  readonly allowlistField = computed(() => {
    switch (this.state.schemaCollTab()) {
      case 'edge': return 'edge.label';
      case 'memory': return 'memory.type';
      case 'chrono': return 'chrono.type';
      default: return 'entity.type';
    }
  });

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

  /** All schema-library entries by name — used to show a linked type's properties read-only and to
   *  resolve its schema when unlinking (turning the $ref into an inline, editable copy). */
  readonly libEntriesByName = signal<Record<string, SchemaLibraryEntry>>({});

  ngOnInit(): void {
    // Load the library once so linked types can render their (read-only) properties and be unlinked
    // into an inline copy without a per-type round-trip.
    this.schemaApi.listSchemaLibrary().subscribe({
      next: ({ entries }) => this.libEntriesByName.set(Object.fromEntries(entries.map(e => [e.name, e]))),
      error: () => this.libEntriesByName.set({}),
    });
  }

  /** The library entry a linked type points at, if it has been loaded — else null. */
  linkedEntry(kt: KnowledgeType, name: string): SchemaLibraryEntry | null {
    const ref = this.state.typeLibRef(kt, name);
    return ref ? (this.libEntriesByName()[ref] ?? null) : null;
  }

  /** A linked type's property schemas, as a display list (read-only), resolved from the library. */
  linkedProps(kt: KnowledgeType, name: string): { key: string; s: PropertySchema }[] {
    const schema = this.linkedEntry(kt, name)?.schema;
    return Object.entries(schema?.propertySchemas ?? {}).map(([key, s]) => ({ key, s }));
  }

  /**
   * The effective delete window when a chrono type's content window sits at or beyond it — else null.
   *
   * Mirrors `contentDays()` on the server exactly, including its fall-through: a type with no `days` of its own
   * is still deleted at the SPACE default, so a 30-day content window under a 30-day space default never fires
   * either. Returning the number lets the message say which window it lost to, which is the part an operator
   * cannot work out from the two fields in front of them.
   */
  contentWindowNeverFires(kt: KnowledgeType, name: string): number | null {
    if (kt !== 'chrono') return null;
    const s = this.state.typeState(kt, name);
    const content = Number(s.retentionContentDays);
    if (!Number.isFinite(content) || content <= 0) return null;
    const total = Number(s.retentionDays) || this.spaceWindow(kt) || 0;
    return total > 0 && content >= total ? total : null;
  }

  /**
   * The space-tier window this collection would inherit, or null.
   *
   * The space tier is five per-collection windows, so "the space default" is not one number. Naming the wrong
   * bucket in the hint would be worse than naming none — an operator would set a window against a figure that
   * does not apply to the type in front of them.
   */
  spaceWindow(kt: KnowledgeType): number | null {
    return recordTtlWindows(this.state.settingsSpace()?.recordTtlDays)[kt];
  }

  /** A one-line, read-only summary of a property's constraints for the linked-type view. */
  propConstraintSummary(s: PropertySchema): string {
    const parts: string[] = [];
    if (s.required) parts.push(this.transloco.translate('spaces.schema.propDetail.required'));
    if (s.enum?.length) parts.push(`${this.transloco.translate('spaces.schema.propDetail.enumValues')}: ${s.enum.join(', ')}`);
    if (s.minimum != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.min')} ${s.minimum}`);
    if (s.maximum != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.max')} ${s.maximum}`);
    if (s.pattern) parts.push(`/${s.pattern}/`);
    if (s.default != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.default')} ${s.default}`);
    return parts.join(' · ') || '—';
  }

  /**
   * Unlink a library-linked type: replace the `$ref` with an inline copy of the library entry's schema
   * so the space can then customise it. Mirrors the inline branch of the state loader; leaves the change
   * pending in the form (buildMeta() then stores it inline instead of a $ref) — the footer Save persists.
   */
  unlinkType(kt: KnowledgeType, name: string): void {
    const entry = this.linkedEntry(kt, name);
    if (!entry) { this.toast.error(this.transloco.translate('spaces.schema.libRef.unlinkFailed')); return; }
    const schema = entry.schema;
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [kt]: {
        ...(this.state.schTypeSchemas[kt] ?? {}),
        // No retention: a library entry cannot carry one (the library's own schema rejects the field), so an
        // unlinked type starts on the space default rather than inheriting a window from somewhere it never had.
        // _libRef intentionally dropped — the type is now a plain inline schema.
        [name]: emptyTypeSchemaState({
          namingPattern:   schema.namingPattern ?? '',
          tagSuggestions:  [...(schema.tagSuggestions ?? [])],
          propertySchemas: Object.entries(schema.propertySchemas ?? {}).map(([k, ps]) => ({ key: k, s: { ...ps }, _enumInput: '' })),
        }),
      },
    };
  }

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
    // A retention window travels with the type it belongs to. It is read defensively because the file is
    // arbitrary JSON: a string or a negative number becomes "inherit" rather than a save the API will reject.
    const ret = ts2['retention'];
    const win = (k: string): number | null => {
      if (!ret || typeof ret !== 'object' || Array.isArray(ret)) return null;
      const v = (ret as Record<string, unknown>)[k];
      return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
    };
    return emptyTypeSchemaState({
      namingPattern:   typeof ts2['namingPattern'] === 'string' ? ts2['namingPattern'] : '',
      retentionDays:        win('days'),
      retentionContentDays: win('contentDays'),
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
    });
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
    // The export carries the retention window: it is part of what this type IS, and a file that omits it
    // re-imports as "inherit the space default" — a silent policy change on a round trip.
    const schema = typeSchemaFromState(kt, this.state.typeState(kt, name));
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
        // Same mapping as the whole-schema import, and deliberately the same CALL: this was a hand-copied
        // duplicate of it, so the two paths read different subsets of a type — the bulk import gained
        // fields the per-type one silently dropped.
        const imported: TypeSchemaState = this.mapImportedTypeSchema(schemaRaw as Record<string, unknown>);
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

    // `withRetention: false` — a library entry has no `retention` key and its schema is strict, so including
    // one would 400. That is also why the caller is warned: converting this type to a $ref leaves the window
    // behind, and a silently-dropped delete policy is the worst kind to drop.
    const schema = typeSchemaFromState(kt, state, { withRetention: false });
    const losesRetention = state.retentionDays !== null || state.retentionContentDays !== null;

    const body = { knowledgeType: kt, typeName: name, schema: schema as Omit<TypeSchema, '$ref'> };
    this.schemaApi.upsertSchemaLibraryEntry(entryName, body).subscribe({
      next: () => {
        // Convert the in-space type to a $ref pointing at the new library entry
        const refState: TypeSchemaState = emptyTypeSchemaState({ _libRef: entryName });
        this.state.schTypeSchemas = {
          ...this.state.schTypeSchemas,
          [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [name]: refState },
        };
        if (losesRetention) this.toast.info(this.transloco.translate('spaces.schema.retention.libDropped', { name }));
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


  /**
   * Open the library picker unscoped — every entry, from the top action row.
   *
   * Replaces the per-knowledge-type buttons that used to sit under each section: those existed only to
   * tell the importer where the schema belonged, and the library entry already records that.
   */
  triggerImportFromLibraryAny(): void {
    this.libImportSkipped.set([]);
    this._libPickerTarget = { kt: null, name: '' };
    this.libPickerLoading.set(true);
    this.showLibPickerDialog.set(true);
    this.schemaApi.listSchemaLibrary().subscribe({
      next: ({ entries }) => { this.libPickerEntries.set(entries); this.libPickerLoading.set(false); },
      error: () => { this.libPickerEntries.set([]); this.libPickerLoading.set(false); },
    });
  }

  /** Entries bucketed by `schemaGroup`, so a whole group can be taken in one action. Ungrouped last. */
  libPickerGroups = computed<{ group: string; entries: SchemaLibraryEntry[] }[]>(() => {
    const byGroup = new Map<string, SchemaLibraryEntry[]>();
    for (const e of this.libPickerEntries()) {
      const g = e.schemaGroup?.trim() || '';
      byGroup.set(g, [...(byGroup.get(g) ?? []), e]);
    }
    return [...byGroup.entries()]
      .map(([group, entries]) => ({ group, entries }))
      .sort((a, b) => (a.group === '' ? 1 : b.group === '' ? -1 : a.group.localeCompare(b.group)));
  });

  /**
   * Import every entry in a group.
   *
   * Silently SKIPS a type that already exists rather than raising the single-import conflict dialog:
   * a group can hold many entries, and a modal per collision would be unusable. The skipped names are
   * surfaced so the outcome is never a silent partial import.
   */
  importGroupFromLibrary(group: string): void {
    const entries = this.libPickerGroups().find(g => g.group === group)?.entries ?? [];
    const skipped: string[] = [];
    let next: Record<string, Record<string, TypeSchemaState>> =
      { ...this.state.schTypeSchemas } as Record<string, Record<string, TypeSchemaState>>;
    for (const entry of entries) {
      const kt = entry.knowledgeType;
      const typeName = entry.typeName;
      if (!typeName) continue;
      if (Object.keys(next[kt] ?? {}).includes(typeName)) { skipped.push(typeName); continue; }
      const refState: TypeSchemaState = emptyTypeSchemaState({ _libRef: entry.name });
      next = { ...next, [kt]: { ...(next[kt] ?? {}), [typeName]: refState } };
    }
    this.state.schTypeSchemas = next as typeof this.state.schTypeSchemas;
    this.libImportSkipped.set(skipped);
    this.closeLibPicker();
  }

  /** Type names a group import left alone because the space already had them. */
  libImportSkipped = signal<string[]>([]);

  closeLibPicker(): void {
    this.showLibPickerDialog.set(false);
    this._libPickerTarget = null;
  }

  /** Set the space's type to use a $ref pointing at this library entry. */
  importFromLibraryRef(entry: SchemaLibraryEntry): void {
    const target = this._libPickerTarget;
    if (!target) return;
    // An unscoped (top-row) pick takes the knowledge type from the ENTRY. That is what lets one button
    // replace the per-type ones: the library already records where each schema belongs.
    const kt = target.kt ?? entry.knowledgeType;
    const typeName = target.name || entry.typeName;
    if (!typeName) return;
    // Store as a special sentinel state that renders as a $ref in buildMeta()
    const refState: TypeSchemaState = emptyTypeSchemaState({ _libRef: entry.name });
    // When adding a new type from lib (no pre-existing name), check for collision
    if (!target.name && this.state.typeNames(kt).includes(typeName)) {
      this.closeLibPicker();
      this.importConflict.set({ kt, name: typeName, state: refState, allowAddAs: false });
      return;
    }
    this.state.schTypeSchemas = {
      ...this.state.schTypeSchemas,
      [kt]: { ...(this.state.schTypeSchemas[kt] ?? {}), [typeName]: refState },
    };
    this.closeLibPicker();
  }
}
