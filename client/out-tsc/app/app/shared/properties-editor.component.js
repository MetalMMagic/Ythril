import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function PropertiesEditorComponent_For_2_Conditional_3_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const opt_r5 = ctx.$implicit;
    i0.ɵɵproperty("value", opt_r5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(opt_r5);
} }
function PropertiesEditorComponent_For_2_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 10);
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_3_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r4); const row_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(row_r2.val, $event) || (row_r2.val = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_3_Template_select_ngModelChange_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵrepeaterCreate(1, PropertiesEditorComponent_For_2_Conditional_3_For_2_Template, 2, 2, "option", 11, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    const row_r2 = ctx_r5.$implicit;
    const ɵ$index_3_r7 = ctx_r5.$index;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵtwoWayProperty("ngModel", row_r2.val);
    i0.ɵɵproperty("name", "propVal" + ɵ$index_3_r7);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.schema[row_r2.key].enum);
} }
function PropertiesEditorComponent_For_2_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "select", 10);
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_4_Template_select_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r8); const row_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(row_r2.val, $event) || (row_r2.val = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_4_Template_select_ngModelChange_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵelementStart(1, "option", 12);
    i0.ɵɵtext(2, "true");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "option", 13);
    i0.ɵɵtext(4, "false");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    const row_r2 = ctx_r5.$implicit;
    const ɵ$index_3_r7 = ctx_r5.$index;
    i0.ɵɵtwoWayProperty("ngModel", row_r2.val);
    i0.ɵɵproperty("name", "propVal" + ɵ$index_3_r7);
} }
function PropertiesEditorComponent_For_2_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 14);
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_5_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r9); const row_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(row_r2.val, $event) || (row_r2.val = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_5_Template_input_ngModelChange_0_listener() { i0.ɵɵrestoreView(_r9); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    const row_r2 = ctx_r5.$implicit;
    const ɵ$index_3_r7 = ctx_r5.$index;
    i0.ɵɵtwoWayProperty("ngModel", row_r2.val);
    i0.ɵɵproperty("name", "propVal" + ɵ$index_3_r7);
} }
function PropertiesEditorComponent_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 15);
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_6_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r10); const row_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(row_r2.val, $event) || (row_r2.val = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_6_Template_input_ngModelChange_0_listener() { i0.ɵɵrestoreView(_r10); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    const row_r2 = ctx_r5.$implicit;
    const ɵ$index_3_r7 = ctx_r5.$index;
    i0.ɵɵtwoWayProperty("ngModel", row_r2.val);
    i0.ɵɵproperty("name", "propVal" + ɵ$index_3_r7);
} }
function PropertiesEditorComponent_For_2_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 16);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_7_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r11); const row_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(row_r2.val, $event) || (row_r2.val = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Conditional_7_Template_input_ngModelChange_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r5 = i0.ɵɵnextContext();
    const row_r2 = ctx_r5.$implicit;
    const ɵ$index_3_r7 = ctx_r5.$index;
    i0.ɵɵtwoWayProperty("ngModel", row_r2.val);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(1, 3, "propertiesEditor.valuePlaceholder"))("name", "propVal" + ɵ$index_3_r7);
} }
function PropertiesEditorComponent_For_2_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 17);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function PropertiesEditorComponent_For_2_Conditional_8_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r12); const ɵ$index_3_r7 = i0.ɵɵnextContext().$index; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.removeRow(ɵ$index_3_r7)); });
    i0.ɵɵelement(2, "ph-icon", 18);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "propertiesEditor.removeTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
function PropertiesEditorComponent_For_2_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "propertiesEditor.requiredBadge"));
} }
function PropertiesEditorComponent_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 1)(1, "input", 3);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function PropertiesEditorComponent_For_2_Template_input_ngModelChange_1_listener($event) { const row_r2 = i0.ɵɵrestoreView(_r1).$implicit; i0.ɵɵtwoWayBindingSet(row_r2.key, $event) || (row_r2.key = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function PropertiesEditorComponent_For_2_Template_input_ngModelChange_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.emit()); });
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, PropertiesEditorComponent_For_2_Conditional_3_Template, 3, 2, "select", 4)(4, PropertiesEditorComponent_For_2_Conditional_4_Template, 5, 2, "select", 4)(5, PropertiesEditorComponent_For_2_Conditional_5_Template, 1, 2, "input", 5)(6, PropertiesEditorComponent_For_2_Conditional_6_Template, 1, 2, "input", 6)(7, PropertiesEditorComponent_For_2_Conditional_7_Template, 2, 5, "input", 7);
    i0.ɵɵconditionalCreate(8, PropertiesEditorComponent_For_2_Conditional_8_Template, 3, 4, "button", 8)(9, PropertiesEditorComponent_For_2_Conditional_9_Template, 3, 3, "span", 9);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const row_r2 = ctx.$implicit;
    const ɵ$index_3_r7 = ctx.$index;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(2, 6, "propertiesEditor.keyPlaceholder"));
    i0.ɵɵtwoWayProperty("ngModel", row_r2.key);
    i0.ɵɵproperty("name", "propKey" + ɵ$index_3_r7)("readOnly", !row_r2.removable && !!(ctx_r2.schema == null ? null : ctx_r2.schema[row_r2.key]));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((ctx_r2.schema == null ? null : ctx_r2.schema[row_r2.key] == null ? null : ctx_r2.schema[row_r2.key].enum == null ? null : ctx_r2.schema[row_r2.key].enum.length) ? 3 : (ctx_r2.schema == null ? null : ctx_r2.schema[row_r2.key] == null ? null : ctx_r2.schema[row_r2.key].type) === "boolean" ? 4 : (ctx_r2.schema == null ? null : ctx_r2.schema[row_r2.key] == null ? null : ctx_r2.schema[row_r2.key].type) === "number" ? 5 : (ctx_r2.schema == null ? null : ctx_r2.schema[row_r2.key] == null ? null : ctx_r2.schema[row_r2.key].type) === "date" ? 6 : 7);
    i0.ɵɵadvance(5);
    i0.ɵɵconditional(row_r2.removable ? 8 : 9);
} }
export class PropertiesEditorComponent {
    constructor() {
        this.value = {};
        this.valueChange = new EventEmitter();
        this.rows = [];
    }
    ngOnInit() {
        this.rows = Object.entries(this.value).map(([key, val]) => ({
            key,
            val: String(val),
            removable: !(this.required?.includes(key) ?? false),
        }));
    }
    addRow() {
        this.rows.push({ key: '', val: '', removable: true });
    }
    removeRow(i) {
        this.rows.splice(i, 1);
        this.emit();
    }
    emit() {
        const result = {};
        for (const row of this.rows) {
            const k = row.key.trim();
            if (!k)
                continue;
            const s = this.schema?.[k];
            if (s?.type === 'number') {
                const n = parseFloat(row.val);
                result[k] = isNaN(n) ? row.val : n;
            }
            else if (s?.type === 'boolean') {
                result[k] = row.val === 'true';
            }
            else {
                result[k] = row.val;
            }
        }
        this.valueChange.emit(result);
    }
    static { this.ɵfac = function PropertiesEditorComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PropertiesEditorComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PropertiesEditorComponent, selectors: [["app-properties-editor"]], inputs: { schema: "schema", required: "required", value: "value" }, outputs: { valueChange: "valueChange" }, decls: 6, vars: 3, consts: [[1, "prop-editor"], [1, "prop-row"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", "prop-add", 3, "click"], ["type", "text", 1, "prop-key", 3, "ngModelChange", "placeholder", "ngModel", "name", "readOnly"], [1, "prop-val", 3, "ngModel", "name"], ["type", "number", 1, "prop-val", 3, "ngModel", "name"], ["type", "date", 1, "prop-val", 3, "ngModel", "name"], ["type", "text", 1, "prop-val", 3, "ngModel", "placeholder", "name"], ["type", "button", 1, "prop-remove"], [1, "prop-req"], [1, "prop-val", 3, "ngModelChange", "ngModel", "name"], [3, "value"], ["value", "true"], ["value", "false"], ["type", "number", 1, "prop-val", 3, "ngModelChange", "ngModel", "name"], ["type", "date", 1, "prop-val", 3, "ngModelChange", "ngModel", "name"], ["type", "text", 1, "prop-val", 3, "ngModelChange", "ngModel", "placeholder", "name"], ["type", "button", 1, "prop-remove", 3, "click"], ["name", "x", 3, "size"]], template: function PropertiesEditorComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0);
            i0.ɵɵrepeaterCreate(1, PropertiesEditorComponent_For_2_Template, 10, 8, "div", 1, i0.ɵɵrepeaterTrackByIndex);
            i0.ɵɵelementStart(3, "button", 2);
            i0.ɵɵlistener("click", function PropertiesEditorComponent_Template_button_click_3_listener() { return ctx.addRow(); });
            i0.ɵɵtext(4);
            i0.ɵɵpipe(5, "transloco");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.rows);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 1, "propertiesEditor.addButton"));
        } }, dependencies: [FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, TranslocoPipe], styles: [".prop-editor[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }\n    .prop-row[_ngcontent-%COMP%] { display: flex; gap: 4px; align-items: center; }\n    .prop-key[_ngcontent-%COMP%] { width: 110px; font-size: 12px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-secondary); color: var(--text); min-width: 0; }\n    .prop-key[readonly][_ngcontent-%COMP%] { opacity: 0.6; cursor: default; }\n    .prop-val[_ngcontent-%COMP%] { flex: 1; font-size: 12px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-secondary); color: var(--text); min-width: 0; }\n    select.prop-val[_ngcontent-%COMP%] { background: var(--bg-secondary); }\n    .prop-remove[_ngcontent-%COMP%] { width: 20px; height: 22px; padding: 0; border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; flex-shrink: 0; }\n    .prop-remove[_ngcontent-%COMP%]:hover { color: var(--error); }\n    .prop-req[_ngcontent-%COMP%] { width: 28px; font-size: 10px; color: var(--text-muted); text-align: center; flex-shrink: 0; }\n    .prop-add[_ngcontent-%COMP%] { align-self: flex-start; margin-top: 2px; font-size: 11px; padding: 2px 8px; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PropertiesEditorComponent, [{
        type: Component,
        args: [{ selector: 'app-properties-editor', standalone: true, imports: [FormsModule, TranslocoPipe, PhIconComponent], template: `
    <div class="prop-editor">
      @for (row of rows; track $index; let i = $index) {
        <div class="prop-row">
          <input class="prop-key" type="text" [placeholder]="'propertiesEditor.keyPlaceholder' | transloco"
            [(ngModel)]="row.key" [name]="'propKey' + i"
            [readOnly]="!row.removable && !!schema?.[row.key]"
            (ngModelChange)="emit()" />
          @if (schema?.[row.key]?.enum?.length) {
            <select class="prop-val" [(ngModel)]="row.val" [name]="'propVal' + i" (ngModelChange)="emit()">
              @for (opt of schema![row.key].enum!; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
          } @else if (schema?.[row.key]?.type === 'boolean') {
            <select class="prop-val" [(ngModel)]="row.val" [name]="'propVal' + i" (ngModelChange)="emit()">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          } @else if (schema?.[row.key]?.type === 'number') {
            <input class="prop-val" type="number" [(ngModel)]="row.val"
              [name]="'propVal' + i" (ngModelChange)="emit()" />
          } @else if (schema?.[row.key]?.type === 'date') {
            <input class="prop-val" type="date" [(ngModel)]="row.val"
              [name]="'propVal' + i" (ngModelChange)="emit()" />
          } @else {
            <input class="prop-val" type="text" [(ngModel)]="row.val"
              [placeholder]="'propertiesEditor.valuePlaceholder' | transloco" [name]="'propVal' + i" (ngModelChange)="emit()" />
          }
          @if (row.removable) {
            <button type="button" class="prop-remove" [attr.title]="'propertiesEditor.removeTitle' | transloco" (click)="removeRow(i)"><ph-icon name="x" [size]="14"/></button>
          } @else {
            <span class="prop-req">{{ 'propertiesEditor.requiredBadge' | transloco }}</span>
          }
        </div>
      }
      <button type="button" class="btn btn-sm btn-secondary prop-add" (click)="addRow()">{{ 'propertiesEditor.addButton' | transloco }}</button>
    </div>
  `, styles: ["\n    .prop-editor { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }\n    .prop-row { display: flex; gap: 4px; align-items: center; }\n    .prop-key { width: 110px; font-size: 12px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-secondary); color: var(--text); min-width: 0; }\n    .prop-key[readonly] { opacity: 0.6; cursor: default; }\n    .prop-val { flex: 1; font-size: 12px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-secondary); color: var(--text); min-width: 0; }\n    select.prop-val { background: var(--bg-secondary); }\n    .prop-remove { width: 20px; height: 22px; padding: 0; border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; flex-shrink: 0; }\n    .prop-remove:hover { color: var(--error); }\n    .prop-req { width: 28px; font-size: 10px; color: var(--text-muted); text-align: center; flex-shrink: 0; }\n    .prop-add { align-self: flex-start; margin-top: 2px; font-size: 11px; padding: 2px 8px; }\n  "] }]
    }], null, { schema: [{
            type: Input
        }], required: [{
            type: Input
        }], value: [{
            type: Input
        }], valueChange: [{
            type: Output
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PropertiesEditorComponent, { className: "PropertiesEditorComponent", filePath: "app/shared/properties-editor.component.ts", lineNumber: 69 }); })();
