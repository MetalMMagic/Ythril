/**
 * EntitySearchComponent — shared entity search with name and semantic modes.
 *
 * Modes:
 *   bar    — Full search bar with A–Z / Semantic toggle. Emits `selected` when
 *            the user picks an entity from the dropdown. Used in the Entities
 *            tab to drive list filtering (parent controls actual load).
 *   picker — Compact inline picker for form fields (edge from/to, memory/chrono
 *            entityIds). Emits `selected` on pick. Parent owns the display text.
 *
 * Inputs:
 *   spaceId      — Required. Which space to search in.
 *   mode         — 'bar' (default) or 'picker'.
 *   placeholder  — Input placeholder text.
 *   defaultMode  — 'name' (default) or 'semantic'.
 *   showModeToggle — show the A–Z/Semantic pill (default true; pickers always keep it).
 *   value        — Controlled display value (picker mode).
 *   debounceMs   — Debounce delay (default 280ms).
 *
 * Outputs:
 *   selected     — Emits the Entity the user clicked.
 *   queryChange  — Emits raw query string on every keystroke (bar mode —
 *                  parent uses this to trigger name-filter list reload).
 *   cleared      — Emits when the clear button is clicked (bar mode).
 */
import { Component, Input, Output, EventEmitter, signal, inject, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { BrainApi } from '../core/brain-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item._id;
function EntitySearchComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 2);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵelementStart(2, "button", 5);
    i0.ɵɵlistener("click", function EntitySearchComponent_Conditional_4_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setMode("name")); });
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 5);
    i0.ɵɵlistener("click", function EntitySearchComponent_Conditional_4_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setMode("semantic")); });
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 9, "common.searchMode.tooltip"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.searchMode() === "name");
    i0.ɵɵattribute("aria-pressed", ctx_r1.searchMode() === "name");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 11, "common.sortAZ"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.searchMode() === "semantic");
    i0.ɵɵattribute("aria-pressed", ctx_r1.searchMode() === "semantic");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 13, "entitySearch.semantic"));
} }
function EntitySearchComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 6);
    i0.ɵɵlistener("click", function EntitySearchComponent_Conditional_5_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.clear()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "entitySearch.clearButton"));
} }
function EntitySearchComponent_Conditional_6_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵelement(1, "div", 9);
    i0.ɵɵelementEnd();
} }
function EntitySearchComponent_Conditional_6_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 8);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "entitySearch.noResults"));
} }
function EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ent_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ent_r5.type);
} }
function EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 15);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ent_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ent_r5.description);
} }
function EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ent_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ent_r5._id);
} }
function EntitySearchComponent_Conditional_6_Conditional_3_For_1_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11);
    i0.ɵɵlistener("mousedown", function EntitySearchComponent_Conditional_6_Conditional_3_For_1_Template_div_mousedown_0_listener() { const ent_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.pick(ent_r5)); });
    i0.ɵɵelementStart(1, "span", 12);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 13);
    i0.ɵɵconditionalCreate(4, EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_4_Template, 2, 1, "span", 14);
    i0.ɵɵconditionalCreate(5, EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_5_Template, 2, 1, "span", 15);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, EntitySearchComponent_Conditional_6_Conditional_3_For_1_Conditional_6_Template, 2, 1, "span", 16);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ent_r5 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ent_r5.name);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ent_r5.type ? 4 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ent_r5.description ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.mode === "bar" ? 6 : -1);
} }
function EntitySearchComponent_Conditional_6_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵrepeaterCreate(0, EntitySearchComponent_Conditional_6_Conditional_3_For_1_Template, 7, 4, "div", 10, _forTrack0);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵrepeater(ctx_r1.results());
} }
function EntitySearchComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵconditionalCreate(1, EntitySearchComponent_Conditional_6_Conditional_1_Template, 2, 0, "div", 7)(2, EntitySearchComponent_Conditional_6_Conditional_2_Template, 3, 3, "div", 8)(3, EntitySearchComponent_Conditional_6_Conditional_3_Template, 2, 0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.loading() ? 1 : ctx_r1.results().length === 0 ? 2 : 3);
} }
export class EntitySearchComponent {
    constructor() {
        this.spaceId = '';
        this.mode = 'bar';
        this.placeholder = 'entitySearch.defaultPlaceholder';
        this.defaultMode = 'name';
        /**
         * Show the A–Z / Semantic mode pill. Default true — pickers keep it (exact name lookup matters when
         * linking a known entity, e.g. "ADR002" among many, where semantic recall struggles). A `bar`-mode
         * consumer can pass false to become semantic-only (the entities tab, 2b-iii-c/d: its plain-text
         * lookup is the docked Name column freetext filter now). Ignored in `picker` mode — pickers always
         * keep the toggle.
         */
        this.showModeToggle = true;
        /** Controlled display value for picker mode (parent sets this after pick). */
        this.value = '';
        this.debounceMs = 280;
        this.selected = new EventEmitter();
        this.queryChange = new EventEmitter();
        this.cleared = new EventEmitter();
        this.brainApi = inject(BrainApi);
        this.searchMode = signal('semantic', ...(ngDevMode ? [{ debugName: "searchMode" }] : /* istanbul ignore next */ []));
        this.results = signal([], ...(ngDevMode ? [{ debugName: "results" }] : /* istanbul ignore next */ []));
        this.focused = signal(false, ...(ngDevMode ? [{ debugName: "focused" }] : /* istanbul ignore next */ []));
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.query = signal('', ...(ngDevMode ? [{ debugName: "query" }] : /* istanbul ignore next */ []));
        this.input$ = new Subject();
        this.subs = new Subscription();
        this.closeTimer = null;
    }
    displayValue() {
        // picker mode: prefer parent-controlled value (single-select), fall back to
        // internal query (multi-select where [value] is never bound) so the input
        // reflects what the user typed AND clears to '' after pick().
        if (this.mode === 'picker')
            return this.value || this.query();
        return this.query();
    }
    ngOnInit() {
        // The pill is hidden only for a bar with the toggle off — there the user can't switch modes, so
        // lock to semantic regardless of defaultMode. Pickers always keep the pill, so they honour
        // defaultMode ('name' by default — exact lookup).
        const pillHidden = this.mode === 'bar' && !this.showModeToggle;
        this.searchMode.set(pillHidden ? 'semantic' : this.defaultMode);
        this.subs.add(this.input$.pipe(debounceTime(this.debounceMs), distinctUntilChanged(), switchMap(q => {
            if (!q.trim() || !this.spaceId) {
                this.loading.set(false);
                return of({ entities: [] });
            }
            this.loading.set(true);
            if (this.searchMode() === 'semantic') {
                return this.brainApi.recallBrain(this.spaceId, { query: q, types: ['entity'], topK: 10 }).pipe(catchError(() => of({ results: [], count: 0 })), map(res => ({
                    entities: res.results
                        .filter(r => r['type'] === 'entity')
                        .map(r => ({
                        _id: r['_id'],
                        spaceId: this.spaceId,
                        name: r['name'] || '',
                        type: r['entityType'] || '',
                        description: r['description'],
                        tags: r['tags'] ?? [],
                        properties: r['properties'] ?? {},
                        createdAt: r['createdAt'],
                        updatedAt: r['createdAt'],
                        seq: 0,
                    })),
                })));
            }
            return this.brainApi.searchEntitiesByName(this.spaceId, q).pipe(catchError(() => of({ entities: [] })));
        })).subscribe(res => {
            this.results.set(res.entities);
            this.loading.set(false);
        }));
    }
    ngOnChanges(changes) {
        // If spaceId changes (user switches space), clear stale results
        if (changes['spaceId'] && !changes['spaceId'].firstChange) {
            this.results.set([]);
            this.query.set('');
        }
    }
    ngOnDestroy() {
        this.subs.unsubscribe();
        if (this.closeTimer)
            clearTimeout(this.closeTimer);
    }
    onInput(v) {
        this.query.set(v);
        this.input$.next(v);
        this.queryChange.emit(v);
        // In semantic mode we always search regardless; in name mode the parent
        // may use queryChange to filter without needing a separate API call
        // (listEntities already does server-side name filtering).
        if (!v.trim()) {
            this.results.set([]);
            this.loading.set(false);
        }
    }
    setMode(m) {
        this.searchMode.set(m);
        // Re-fire current query in new mode
        const q = this.query();
        if (q.trim())
            this.input$.next(q);
    }
    selectFirst() {
        const first = this.results()[0];
        if (first)
            this.pick(first);
    }
    pick(ent) {
        this.selected.emit(ent);
        this.results.set([]);
        this.focused.set(false);
        if (this.mode === 'picker') {
            // Keep display value controlled by parent — clear internal query
            this.query.set('');
        }
        else {
            this.query.set(ent.name);
        }
    }
    clear() {
        this.query.set('');
        this.results.set([]);
        this.cleared.emit();
        this.queryChange.emit('');
    }
    schedulClose() {
        if (this.closeTimer)
            clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(() => {
            this.focused.set(false);
            this.results.set([]);
        }, 200);
    }
    static { this.ɵfac = function EntitySearchComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EntitySearchComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EntitySearchComponent, selectors: [["app-entity-search"]], inputs: { spaceId: "spaceId", mode: "mode", placeholder: "placeholder", defaultMode: "defaultMode", showModeToggle: "showModeToggle", value: "value", debounceMs: "debounceMs" }, outputs: { selected: "selected", queryChange: "queryChange", cleared: "cleared" }, features: [i0.ɵɵNgOnChangesFeature], decls: 7, vars: 11, consts: [[1, "search-row"], ["autocomplete", "off", 3, "ngModelChange", "focus", "blur", "keyup.enter", "type", "placeholder", "ngModel"], [1, "pill-group"], ["type", "button", 1, "btn-clear"], [1, "dropdown"], ["type", "button", 3, "click"], ["type", "button", 1, "btn-clear", 3, "click"], [1, "spinner-wrap"], [1, "dropdown-empty"], [1, "spinner"], [1, "dropdown-item"], [1, "dropdown-item", 3, "mousedown"], [1, "item-name"], [1, "item-meta"], [1, "item-type"], [1, "item-desc"], [1, "item-id"]], template: function EntitySearchComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "input", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵlistener("ngModelChange", function EntitySearchComponent_Template_input_ngModelChange_1_listener($event) { return ctx.onInput($event); })("focus", function EntitySearchComponent_Template_input_focus_1_listener() { return ctx.focused.set(true); })("blur", function EntitySearchComponent_Template_input_blur_1_listener() { return ctx.schedulClose(); })("keyup.enter", function EntitySearchComponent_Template_input_keyup_enter_1_listener() { return ctx.selectFirst(); });
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(4, EntitySearchComponent_Conditional_4_Template, 8, 15, "div", 2);
            i0.ɵɵconditionalCreate(5, EntitySearchComponent_Conditional_5_Template, 3, 3, "button", 3);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(6, EntitySearchComponent_Conditional_6_Template, 4, 1, "div", 4);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("type", ctx.mode === "picker" ? "text" : "search")("placeholder", i0.ɵɵpipeBind1(2, 7, ctx.placeholder))("ngModel", ctx.displayValue());
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(3, 9, ctx.placeholder));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.mode !== "bar" || ctx.showModeToggle ? 4 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.mode === "bar" && ctx.displayValue() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.focused() && (ctx.results().length > 0 || ctx.loading()) ? 6 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgModel, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; position: relative; }\n\n    .search-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n\n    \n\n\n\n\n    input[type=\"search\"][_ngcontent-%COMP%], \n   input[type=\"text\"][_ngcontent-%COMP%] {\n      flex: 1;\n      min-width: 0;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      color: var(--text-primary);\n      padding: 5px 10px;\n      font-size: 13px;\n    }\n    input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }\n\n    \n\n    .pill-group[_ngcontent-%COMP%] {\n      display: flex;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      overflow: hidden;\n      flex-shrink: 0;\n    }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      padding: 5px 10px;\n      font-size: 11px;\n      background: transparent;\n      border: none;\n      border-right: 1px solid var(--border);\n      color: var(--text-secondary);\n      cursor: pointer;\n      white-space: nowrap;\n    }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child { border-right: none; }\n    .pill-group[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n      background: var(--accent-dim);\n      color: var(--accent);\n    }\n    .pill-group[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover:not(.active) { background: var(--bg-surface); }\n\n    .btn-clear[_ngcontent-%COMP%] {\n      padding: 5px 8px;\n      font-size: 11px;\n      background: transparent;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      color: var(--text-muted);\n      cursor: pointer;\n      flex-shrink: 0;\n    }\n    .btn-clear[_ngcontent-%COMP%]:hover { color: var(--text-primary); border-color: var(--text-muted); }\n\n    .dropdown[_ngcontent-%COMP%] {\n      position: absolute;\n      top: calc(100% + 4px);\n      left: 0;\n      right: 0;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      box-shadow: var(--shadow-md);\n      z-index: 200;\n      max-height: 260px;\n      overflow-y: auto;\n    }\n\n    .dropdown-item[_ngcontent-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      gap: 2px;\n      padding: 8px 12px;\n      cursor: pointer;\n      border-bottom: 1px solid var(--border);\n    }\n    .dropdown-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .dropdown-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n\n    .item-name[_ngcontent-%COMP%] {\n      font-size: 13px;\n      font-weight: 500;\n      color: var(--text-primary);\n    }\n    .item-meta[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 6px;\n      align-items: center;\n    }\n    .item-type[_ngcontent-%COMP%] {\n      font-size: 10px;\n      padding: 1px 5px;\n      border-radius: 3px;\n      background: var(--accent-dim);\n      color: var(--accent);\n      font-weight: 500;\n    }\n    .item-desc[_ngcontent-%COMP%] {\n      font-size: 11px;\n      color: var(--text-muted);\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n    }\n    .item-id[_ngcontent-%COMP%] {\n      font-size: 10px;\n      color: var(--text-muted);\n      font-family: var(--font-mono);\n    }\n    .item-score[_ngcontent-%COMP%] {\n      font-size: 10px;\n      color: var(--text-muted);\n    }\n\n    .dropdown-empty[_ngcontent-%COMP%] {\n      padding: 12px;\n      font-size: 12px;\n      color: var(--text-muted);\n      text-align: center;\n    }\n\n    .spinner-wrap[_ngcontent-%COMP%] {\n      padding: 10px;\n      display: flex;\n      justify-content: center;\n    }\n    .spinner[_ngcontent-%COMP%] {\n      width: 16px; height: 16px;\n      border: 2px solid var(--border);\n      border-top-color: var(--accent);\n      border-radius: 50%;\n      animation: _ngcontent-%COMP%_spin 0.7s linear infinite;\n    }\n    @keyframes _ngcontent-%COMP%_spin { to { transform: rotate(360deg); } }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EntitySearchComponent, [{
        type: Component,
        args: [{ selector: 'app-entity-search', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe], template: `
    <div class="search-row">
      <input
        [type]="mode === 'picker' ? 'text' : 'search'"
        [placeholder]="placeholder | transloco"
        [ngModel]="displayValue()"
        (ngModelChange)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="schedulClose()"
        (keyup.enter)="selectFirst()"
        [attr.aria-label]="placeholder | transloco"
        autocomplete="off"
      />
      @if (mode !== 'bar' || showModeToggle) {
        <div class="pill-group" [attr.title]="'common.searchMode.tooltip' | transloco">
          <button type="button" [class.active]="searchMode() === 'name'" [attr.aria-pressed]="searchMode() === 'name'"     (click)="setMode('name')">{{ 'common.sortAZ' | transloco }}</button>
          <button type="button" [class.active]="searchMode() === 'semantic'" [attr.aria-pressed]="searchMode() === 'semantic'" (click)="setMode('semantic')">{{ 'entitySearch.semantic' | transloco }}</button>
        </div>
      }
      @if (mode === 'bar' && displayValue()) {
        <button type="button" class="btn-clear" (click)="clear()">{{ 'entitySearch.clearButton' | transloco }}</button>
      }
    </div>

    @if (focused() && (results().length > 0 || loading())) {
      <div class="dropdown">
        @if (loading()) {
          <div class="spinner-wrap"><div class="spinner"></div></div>
        } @else if (results().length === 0) {
          <div class="dropdown-empty">{{ 'entitySearch.noResults' | transloco }}</div>
        } @else {
          @for (ent of results(); track ent._id) {
            <div class="dropdown-item" (mousedown)="pick(ent)">
              <span class="item-name">{{ ent.name }}</span>
              <div class="item-meta">
                @if (ent.type) { <span class="item-type">{{ ent.type }}</span> }
                @if (ent.description) { <span class="item-desc">{{ ent.description }}</span> }
              </div>
              @if (mode === 'bar') {
                <span class="item-id">{{ ent._id }}</span>
              }
            </div>
          }
        }
      </div>
    }
  `, styles: ["\n    :host { display: block; position: relative; }\n\n    .search-row {\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n\n    /* Visual spec kept in lockstep with the record tabs' plain search input\n       (.content-header input[type=search] in brain-table.styles.ts) so the entities bar and the\n       memories/edges/chrono/file-meta bars render identically. Only the layout props (flex/min-width)\n       differ, because this component lives in a .search-row rather than as a display:contents child. */\n    input[type=\"search\"],\n    input[type=\"text\"] {\n      flex: 1;\n      min-width: 0;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      color: var(--text-primary);\n      padding: 5px 10px;\n      font-size: 13px;\n    }\n    input:focus { outline: none; border-color: var(--accent); }\n\n    /* pill group (reuse graph style) */\n    .pill-group {\n      display: flex;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      overflow: hidden;\n      flex-shrink: 0;\n    }\n    .pill-group button {\n      padding: 5px 10px;\n      font-size: 11px;\n      background: transparent;\n      border: none;\n      border-right: 1px solid var(--border);\n      color: var(--text-secondary);\n      cursor: pointer;\n      white-space: nowrap;\n    }\n    .pill-group button:last-child { border-right: none; }\n    .pill-group button.active {\n      background: var(--accent-dim);\n      color: var(--accent);\n    }\n    .pill-group button:hover:not(.active) { background: var(--bg-surface); }\n\n    .btn-clear {\n      padding: 5px 8px;\n      font-size: 11px;\n      background: transparent;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      color: var(--text-muted);\n      cursor: pointer;\n      flex-shrink: 0;\n    }\n    .btn-clear:hover { color: var(--text-primary); border-color: var(--text-muted); }\n\n    .dropdown {\n      position: absolute;\n      top: calc(100% + 4px);\n      left: 0;\n      right: 0;\n      background: var(--bg-surface);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      box-shadow: var(--shadow-md);\n      z-index: 200;\n      max-height: 260px;\n      overflow-y: auto;\n    }\n\n    .dropdown-item {\n      display: flex;\n      flex-direction: column;\n      gap: 2px;\n      padding: 8px 12px;\n      cursor: pointer;\n      border-bottom: 1px solid var(--border);\n    }\n    .dropdown-item:last-child { border-bottom: none; }\n    .dropdown-item:hover { background: var(--bg-elevated); }\n\n    .item-name {\n      font-size: 13px;\n      font-weight: 500;\n      color: var(--text-primary);\n    }\n    .item-meta {\n      display: flex;\n      gap: 6px;\n      align-items: center;\n    }\n    .item-type {\n      font-size: 10px;\n      padding: 1px 5px;\n      border-radius: 3px;\n      background: var(--accent-dim);\n      color: var(--accent);\n      font-weight: 500;\n    }\n    .item-desc {\n      font-size: 11px;\n      color: var(--text-muted);\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n    }\n    .item-id {\n      font-size: 10px;\n      color: var(--text-muted);\n      font-family: var(--font-mono);\n    }\n    .item-score {\n      font-size: 10px;\n      color: var(--text-muted);\n    }\n\n    .dropdown-empty {\n      padding: 12px;\n      font-size: 12px;\n      color: var(--text-muted);\n      text-align: center;\n    }\n\n    .spinner-wrap {\n      padding: 10px;\n      display: flex;\n      justify-content: center;\n    }\n    .spinner {\n      width: 16px; height: 16px;\n      border: 2px solid var(--border);\n      border-top-color: var(--accent);\n      border-radius: 50%;\n      animation: spin 0.7s linear infinite;\n    }\n    @keyframes spin { to { transform: rotate(360deg); } }\n  "] }]
    }], null, { spaceId: [{
            type: Input
        }], mode: [{
            type: Input
        }], placeholder: [{
            type: Input
        }], defaultMode: [{
            type: Input
        }], showModeToggle: [{
            type: Input
        }], value: [{
            type: Input
        }], debounceMs: [{
            type: Input
        }], selected: [{
            type: Output
        }], queryChange: [{
            type: Output
        }], cleared: [{
            type: Output
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EntitySearchComponent, { className: "EntitySearchComponent", filePath: "app/shared/entity-search.component.ts", lineNumber: 243 }); })();
