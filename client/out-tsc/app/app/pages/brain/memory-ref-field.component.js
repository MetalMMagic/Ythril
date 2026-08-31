import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { EntityRefPicker } from './entity-ref-picker.service';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item._id;
function MemoryRefFieldComponent_Conditional_0_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 4)(1, "span", 5);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 6);
    i0.ɵɵlistener("mousedown", function MemoryRefFieldComponent_Conditional_0_For_2_Template_button_mousedown_3_listener() { const id_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.picker.removeMemoryRef(ctx_r2.target(), id_r2)); });
    i0.ɵɵelement(4, "ph-icon", 7);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const id_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("title", id_r2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r2.picker.memoryRefTitle(id_r2));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function MemoryRefFieldComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0);
    i0.ɵɵrepeaterCreate(1, MemoryRefFieldComponent_Conditional_0_For_2_Template, 5, 3, "span", 4, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.target().memoryIds);
} }
function MemoryRefFieldComponent_Conditional_5_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 9);
    i0.ɵɵlistener("mousedown", function MemoryRefFieldComponent_Conditional_5_For_2_Template_button_mousedown_0_listener() { const mem_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.picker.addMemoryRef(ctx_r2.target(), mem_r5)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const mem_r5 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", mem_r5.fact.slice(0, 90), "", mem_r5.fact.length > 90 ? "\u2026" : "");
} }
function MemoryRefFieldComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3);
    i0.ɵɵrepeaterCreate(1, MemoryRefFieldComponent_Conditional_5_For_2_Template, 2, 2, "button", 8, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.picker.memPickResults());
} }
/**
 * The memory-reference field: linked-memory chips + an inline title typeahead, in one element.
 *
 * The sibling of `app-entity-ref-field` (slice 3-refactor). The identical "chips + `.mem-pick` search
 * dropdown" block (slice 3c) was hand-written at the chrono create form and the detail drawer's chrono
 * section; drift between the two is the visual/UX snag the composite refactor exists to kill, so it
 * lives once here. Label-less by design: the caller supplies its own `<label>` / `.drawer-label`.
 *
 * Dumb + OnPush: it owns no state. `target` is the caller's form object; adding/removing mutates
 * `target.memoryIds` by reference and the title cache via the shared `EntityRefPicker`, exactly as the
 * inline copies did — `addMemoryRef`/`removeMemoryRef`/`memoryRefTitle` are unchanged. The picker's
 * `memPickQuery`/`memPickResults` are a single shared set (only one memory field is ever visible at a
 * time — create form OR drawer), preserving the pre-extraction behaviour.
 *
 * NOT converted: file-meta's memory picker uses the separate `fm*` picker signals; it folds into the
 * slice-4d File Meta rebuild rather than switching here.
 */
export class MemoryRefFieldComponent {
    constructor() {
        this.picker = inject(EntityRefPicker);
        /** The caller's form object; adding/removing edits its `memoryIds`. */
        this.target = input.required(...(ngDevMode ? [{ debugName: "target" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function MemoryRefFieldComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MemoryRefFieldComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: MemoryRefFieldComponent, selectors: [["app-memory-ref-field"]], inputs: { target: [1, "target"] }, decls: 6, vars: 9, consts: [[1, "entity-multi"], [1, "mem-pick"], ["type", "search", 3, "input", "value", "placeholder"], [1, "mem-pick-menu"], [1, "chip", 3, "title"], [1, "chip-name"], ["type", "button", 1, "chip-remove", 3, "mousedown"], ["name", "x", 3, "size"], ["type", "button", 1, "mem-pick-item"], ["type", "button", 1, "mem-pick-item", 3, "mousedown"]], template: function MemoryRefFieldComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, MemoryRefFieldComponent_Conditional_0_Template, 3, 0, "div", 0);
            i0.ɵɵelementStart(1, "div", 1)(2, "input", 2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵpipe(4, "transloco");
            i0.ɵɵlistener("input", function MemoryRefFieldComponent_Template_input_input_2_listener($event) { return ctx.picker.onMemPickInput($event.target.value); });
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(5, MemoryRefFieldComponent_Conditional_5_Template, 3, 0, "div", 3);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.target().memoryIds.length ? 0 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("value", ctx.picker.memPickQuery())("placeholder", i0.ɵɵpipeBind1(3, 5, "brain.chrono.form.searchMemories"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(4, 7, "brain.chrono.form.searchMemories"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.picker.memPickResults().length ? 5 : -1);
        } }, dependencies: [PhIconComponent, TranslocoPipe], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MemoryRefFieldComponent, [{
        type: Component,
        args: [{ selector: 'app-memory-ref-field', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [PhIconComponent, TranslocoPipe], template: `
    @if (target().memoryIds.length) {
      <div class="entity-multi">
        @for (id of target().memoryIds; track id) {
          <span class="chip" [title]="id"><span class="chip-name">{{ picker.memoryRefTitle(id) }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeMemoryRef(target(), id)"><ph-icon name="x" [size]="12"/></button></span>
        }
      </div>
    }
    <div class="mem-pick">
      <input type="search" [value]="picker.memPickQuery()" (input)="picker.onMemPickInput($any($event.target).value)" [placeholder]="'brain.chrono.form.searchMemories' | transloco" [attr.aria-label]="'brain.chrono.form.searchMemories' | transloco" />
      @if (picker.memPickResults().length) {
        <div class="mem-pick-menu">
          @for (mem of picker.memPickResults(); track mem._id) {
            <button type="button" class="mem-pick-item" (mousedown)="picker.addMemoryRef(target(), mem)">{{ mem.fact.slice(0, 90) }}{{ mem.fact.length > 90 ? '…' : '' }}</button>
          }
        </div>
      }
    </div>
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n"] }]
    }], null, { target: [{ type: i0.Input, args: [{ isSignal: true, alias: "target", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(MemoryRefFieldComponent, { className: "MemoryRefFieldComponent", filePath: "app/pages/brain/memory-ref-field.component.ts", lineNumber: 53 }); })();
