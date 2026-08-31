import { Component, Input, Output, EventEmitter, signal, computed, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = ["inp"];
function TagInputComponent_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 2);
    i0.ɵɵtext(1);
    i0.ɵɵelementStart(2, "button", 6);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵlistener("click", function TagInputComponent_For_2_Template_button_click_2_listener($event) { const tag_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r3 = i0.ɵɵnextContext(); ctx_r3.remove(tag_r3); return i0.ɵɵresetView($event.stopPropagation()); });
    i0.ɵɵelement(4, "ph-icon", 7);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const tag_r3 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", tag_r3, " ");
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(3, 3, "tagInput.removeAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function TagInputComponent_Conditional_7_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 9);
    i0.ɵɵlistener("mousedown", function TagInputComponent_Conditional_7_For_2_Template_div_mousedown_0_listener() { const s_r6 = i0.ɵɵrestoreView(_r5).$implicit; const ctx_r3 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r3.addTag(s_r6)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r6 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r6);
} }
function TagInputComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5);
    i0.ɵɵrepeaterCreate(1, TagInputComponent_Conditional_7_For_2_Template, 2, 1, "div", 8, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r3.filtered());
} }
export class TagInputComponent {
    constructor() {
        this.value = [];
        this.valueChange = new EventEmitter();
        this.suggestions = [];
        this.placeholder = 'tagInput.placeholder';
        this.inputName = 'tagInput';
        this.query = '';
        this.open = signal(false, ...(ngDevMode ? [{ debugName: "open" }] : /* istanbul ignore next */ []));
        this.filtered = computed(() => {
            const q = this.query.toLowerCase().trim();
            return this.suggestions
                .filter(s => !this.value.includes(s) && (!q || s.toLowerCase().includes(q)))
                .slice(0, 8);
        }, ...(ngDevMode ? [{ debugName: "filtered" }] : /* istanbul ignore next */ []));
    }
    focusInput() {
        this.inp?.nativeElement.focus();
    }
    onInput() {
        this.open.set(true);
    }
    onKey(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = this.query.trim().replace(/,$/, '');
            if (val)
                this.addTag(val);
        }
        else if (e.key === 'Backspace' && !this.query && this.value.length) {
            this.remove(this.value[this.value.length - 1]);
        }
        else if (e.key === 'Escape') {
            this.open.set(false);
        }
    }
    onBlur() {
        // Commit any pending typed text on blur
        const val = this.query.trim().replace(/,$/, '');
        if (val)
            this.addTag(val);
        setTimeout(() => this.open.set(false), 150);
    }
    addTag(tag) {
        const t = tag.trim();
        if (!t || this.value.includes(t)) {
            this.query = '';
            return;
        }
        this.valueChange.emit([...this.value, t]);
        this.query = '';
        this.open.set(false);
    }
    remove(tag) {
        this.valueChange.emit(this.value.filter(t => t !== tag));
    }
    static { this.ɵfac = function TagInputComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TagInputComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TagInputComponent, selectors: [["app-tag-input"]], viewQuery: function TagInputComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuery(_c0, 5);
        } if (rf & 2) {
            let _t;
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.inp = _t.first);
        } }, inputs: { value: "value", suggestions: "suggestions", placeholder: "placeholder", inputName: "inputName" }, outputs: { valueChange: "valueChange" }, decls: 8, vars: 6, consts: [["inp", ""], [1, "tag-input-wrap", 3, "click"], [1, "tag-pill"], [1, "tag-input-inner", 2, "position", "relative", "flex", "1", "min-width", "80px"], ["type", "text", "autocomplete", "off", 1, "tag-text-input", 3, "ngModelChange", "input", "keydown", "focus", "blur", "placeholder", "ngModel", "name"], [1, "tag-dropdown"], ["type", "button", 1, "tag-remove", 3, "click"], ["name", "x", 3, "size"], [1, "tag-option"], [1, "tag-option", 3, "mousedown"]], template: function TagInputComponent_Template(rf, ctx) { if (rf & 1) {
            const _r1 = i0.ɵɵgetCurrentView();
            i0.ɵɵelementStart(0, "div", 1);
            i0.ɵɵlistener("click", function TagInputComponent_Template_div_click_0_listener() { return ctx.focusInput(); });
            i0.ɵɵrepeaterCreate(1, TagInputComponent_For_2_Template, 5, 5, "span", 2, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementStart(3, "div", 3)(4, "input", 4, 0);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function TagInputComponent_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.query, $event) || (ctx.query = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵlistener("input", function TagInputComponent_Template_input_input_4_listener() { return ctx.onInput(); })("keydown", function TagInputComponent_Template_input_keydown_4_listener($event) { return ctx.onKey($event); })("focus", function TagInputComponent_Template_input_focus_4_listener() { return ctx.open.set(true); })("blur", function TagInputComponent_Template_input_blur_4_listener() { return ctx.onBlur(); });
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(7, TagInputComponent_Conditional_7_Template, 3, 0, "div", 5);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.value);
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("placeholder", ctx.value.length ? "" : i0.ɵɵpipeBind1(6, 4, ctx.placeholder));
            i0.ɵɵtwoWayProperty("ngModel", ctx.query);
            i0.ɵɵproperty("name", ctx.inputName);
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.open() && ctx.filtered().length ? 7 : -1);
        } }, dependencies: [FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, TranslocoPipe], styles: [".tag-input-wrap[_ngcontent-%COMP%] {\n      display: flex;\n      flex-wrap: wrap;\n      align-items: center;\n      gap: 4px;\n      min-height: 34px;\n      padding: 4px 6px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm, 4px);\n      background: var(--bg-secondary);\n      cursor: text;\n    }\n    .tag-input-wrap[_ngcontent-%COMP%]:focus-within {\n      border-color: var(--accent);\n    }\n    .tag-pill[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 3px;\n      padding: 1px 6px 1px 8px;\n      border-radius: 12px;\n      background: var(--accent-dim);\n      color: var(--accent);\n      font-size: 11px;\n      white-space: nowrap;\n    }\n    .tag-remove[_ngcontent-%COMP%] {\n      padding: 0;\n      border: none;\n      background: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 13px;\n      line-height: 1;\n      opacity: 0.7;\n    }\n    .tag-remove[_ngcontent-%COMP%]:hover { opacity: 1; }\n    .tag-text-input[_ngcontent-%COMP%] {\n      border: none;\n      outline: none;\n      background: transparent;\n      color: var(--text);\n      font-size: 12px;\n      width: 100%;\n      min-width: 60px;\n      padding: 2px 0;\n    }\n    .tag-dropdown[_ngcontent-%COMP%] {\n      position: absolute;\n      top: calc(100% + 2px);\n      left: 0;\n      min-width: 160px;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md, 6px);\n      box-shadow: var(--shadow-sm);\n      z-index: 300;\n      max-height: 180px;\n      overflow-y: auto;\n    }\n    .tag-option[_ngcontent-%COMP%] {\n      padding: 6px 12px;\n      font-size: 12px;\n      color: var(--text);\n      cursor: pointer;\n      border-bottom: 1px solid var(--border);\n    }\n    .tag-option[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .tag-option[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TagInputComponent, [{
        type: Component,
        args: [{ selector: 'app-tag-input', standalone: true, imports: [FormsModule, TranslocoPipe, PhIconComponent], template: `
    <div class="tag-input-wrap" (click)="focusInput()">
      @for (tag of value; track tag) {
        <span class="tag-pill">
          {{ tag }}
          <button type="button" class="tag-remove" (click)="remove(tag); $event.stopPropagation()" [attr.aria-label]="'tagInput.removeAriaLabel' | transloco"><ph-icon name="x" [size]="12"/></button>
        </span>
      }
      <div class="tag-input-inner" style="position:relative; flex:1; min-width:80px;">
        <input #inp
          type="text"
          class="tag-text-input"
          [placeholder]="value.length ? '' : (placeholder | transloco)"
          [(ngModel)]="query"
          [name]="inputName"
          (input)="onInput()"
          (keydown)="onKey($event)"
          (focus)="open.set(true)"
          (blur)="onBlur()"
          autocomplete="off"
        />
        @if (open() && filtered().length) {
          <div class="tag-dropdown">
            @for (s of filtered(); track s) {
              <div class="tag-option" (mousedown)="addTag(s)">{{ s }}</div>
            }
          </div>
        }
      </div>
    </div>
  `, styles: ["\n    .tag-input-wrap {\n      display: flex;\n      flex-wrap: wrap;\n      align-items: center;\n      gap: 4px;\n      min-height: 34px;\n      padding: 4px 6px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm, 4px);\n      background: var(--bg-secondary);\n      cursor: text;\n    }\n    .tag-input-wrap:focus-within {\n      border-color: var(--accent);\n    }\n    .tag-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 3px;\n      padding: 1px 6px 1px 8px;\n      border-radius: 12px;\n      background: var(--accent-dim);\n      color: var(--accent);\n      font-size: 11px;\n      white-space: nowrap;\n    }\n    .tag-remove {\n      padding: 0;\n      border: none;\n      background: none;\n      color: var(--accent);\n      cursor: pointer;\n      font-size: 13px;\n      line-height: 1;\n      opacity: 0.7;\n    }\n    .tag-remove:hover { opacity: 1; }\n    .tag-text-input {\n      border: none;\n      outline: none;\n      background: transparent;\n      color: var(--text);\n      font-size: 12px;\n      width: 100%;\n      min-width: 60px;\n      padding: 2px 0;\n    }\n    .tag-dropdown {\n      position: absolute;\n      top: calc(100% + 2px);\n      left: 0;\n      min-width: 160px;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md, 6px);\n      box-shadow: var(--shadow-sm);\n      z-index: 300;\n      max-height: 180px;\n      overflow-y: auto;\n    }\n    .tag-option {\n      padding: 6px 12px;\n      font-size: 12px;\n      color: var(--text);\n      cursor: pointer;\n      border-bottom: 1px solid var(--border);\n    }\n    .tag-option:last-child { border-bottom: none; }\n    .tag-option:hover { background: var(--bg-elevated); }\n  "] }]
    }], null, { value: [{
            type: Input
        }], valueChange: [{
            type: Output
        }], suggestions: [{
            type: Input
        }], placeholder: [{
            type: Input
        }], inputName: [{
            type: Input
        }], inp: [{
            type: ViewChild,
            args: ['inp']
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TagInputComponent, { className: "TagInputComponent", filePath: "app/shared/tag-input.component.ts", lineNumber: 113 }); })();
