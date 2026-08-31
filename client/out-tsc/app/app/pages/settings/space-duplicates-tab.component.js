/**
 * Duplicates tab — near-duplicate detection rules for the space.
 *
 * Extracted from SpacesComponent (A17.8b). Needs no inputs and no data outputs: SpacesStore owns
 * the server data and SpaceSettingsState owns the dialog form state, and both are services the
 * page provides — so this component just renders them and calls them.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { SpacesStore } from './spaces-store.service';
import { ToastService } from '../../core/toast.service';
import { TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function SpaceDuplicatesTabComponent_For_30_Conditional_24_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 31)(1, "label", 26);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 34);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SpaceDuplicatesTabComponent_For_30_Conditional_24_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r3); const r_r2 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(r_r2.webhookUrl, $event) || (r_r2.webhookUrl = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const r_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 3, "spaces.dupe.webhookUrl"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", r_r2.webhookUrl);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(5, 5, "spaces.dupe.webhookPlaceholder"));
} }
function SpaceDuplicatesTabComponent_For_30_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 11)(1, "div", 21)(2, "label", 22)(3, "span");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 23);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "input", 24);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SpaceDuplicatesTabComponent_For_30_Template_input_ngModelChange_8_listener($event) { const r_r2 = i0.ɵɵrestoreView(_r1).$implicit; i0.ɵɵtwoWayBindingSet(r_r2.minScore, $event) || (r_r2.minScore = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "div", 25)(11, "label", 26);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "select", 27);
    i0.ɵɵtwoWayListener("ngModelChange", function SpaceDuplicatesTabComponent_For_30_Template_select_ngModelChange_14_listener($event) { const r_r2 = i0.ɵɵrestoreView(_r1).$implicit; i0.ɵɵtwoWayBindingSet(r_r2.action, $event) || (r_r2.action = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(15, "option", 28);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "option", 29);
    i0.ɵɵtext(19);
    i0.ɵɵpipe(20, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(21, "option", 30);
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(24, SpaceDuplicatesTabComponent_For_30_Conditional_24_Template, 6, 7, "div", 31);
    i0.ɵɵelementStart(25, "button", 32);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵlistener("click", function SpaceDuplicatesTabComponent_For_30_Template_button_click_25_listener() { const $index_r4 = i0.ɵɵrestoreView(_r1).$index; const ctx_r4 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r4.state.removeDupeRule($index_r4)); });
    i0.ɵɵelement(27, "ph-icon", 33);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const r_r2 = ctx.$implicit;
    const ctx_r4 = i0.ɵɵnextContext();
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 12, "spaces.dupe.minScore"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", ctx_r4.pct(r_r2.minScore), "%");
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", r_r2.minScore);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(9, 14, "spaces.dupe.minScore"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 16, "spaces.dupe.action"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", r_r2.action);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 18, "spaces.dupe.actionFlag"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(20, 20, "spaces.dupe.actionAutomerge"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 22, "spaces.dupe.actionNotify"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(r_r2.action === "notify" ? 24 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(26, 24, "spaces.dupe.removeRule"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
} }
function SpaceDuplicatesTabComponent_ForEmpty_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "spaces.dupe.rulesEmpty"), " ");
} }
function SpaceDuplicatesTabComponent_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵelement(1, "ph-icon", 35);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 18);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 2, "spaces.dupe.automergeWarning"));
} }
function SpaceDuplicatesTabComponent_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r4 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r4.state.dupeError());
} }
function SpaceDuplicatesTabComponent_Conditional_40_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 19);
} }
function SpaceDuplicatesTabComponent_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 20);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.dupe.saved"));
} }
export class SpaceDuplicatesTabComponent {
    constructor() {
        this.state = inject(SpaceSettingsState);
        this.spacesApi = inject(SpacesApi);
        this.toast = inject(ToastService);
        this.transloco = inject(TranslocoService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.store = inject(SpacesStore);
    }
    /** Render a 0–1 minScore as a whole-number percent for the slider label. */
    pct(v) { return Math.round((Number(v) || 0) * 100); }
    async saveDupeRules() {
        const target = this.state.settingsSpace();
        if (!target)
            return;
        // Validate notify override URLs client-side (the field is not inside a <form>).
        for (const r of this.state.dupeRulesState) {
            if (r.action === 'notify' && r.webhookUrl?.trim()) {
                try {
                    new URL(r.webhookUrl.trim());
                }
                catch {
                    this.state.dupeError.set(this.transloco.translate('spaces.dupe.invalidUrl'));
                    return;
                }
            }
        }
        // Auto-merge is destructive and unattended — confirm before enabling it.
        if (this.state.hasAutomergeRule()) {
            const ok = await this.confirmDialog.confirm({
                title: this.transloco.translate('spaces.dupe.automergeConfirmTitle'),
                message: this.transloco.translate('spaces.dupe.automergeConfirm'),
                danger: true,
            });
            if (!ok)
                return;
        }
        // Normalise: clamp scores, drop empty override URLs.
        const rules = this.state.dupeRulesState.map(r => ({
            minScore: Math.min(Math.max(Number(r.minScore) || 0, 0), 1),
            action: r.action,
            ...(r.types && r.types.length > 0 ? { types: r.types } : {}),
            ...(r.action === 'notify' && r.webhookUrl?.trim() ? { webhookUrl: r.webhookUrl.trim() } : {}),
        }));
        this.state.dupeSaving.set(true);
        this.state.dupeError.set('');
        this.state.dupeSaved.set(false);
        this.spacesApi.updateSpace(target.id, { dupeRules: rules, dupeMergeSurvivor: this.state.dupeSurvivor, dupeRulesOnInsert: this.state.dupeOnInsert }).subscribe({
            next: (result) => {
                this.state.dupeSaving.set(false);
                this.state.dupeSaved.set(true);
                // Duplicate rules are local and never governed, so this endpoint always answers with the space
                // for THIS request — but the response type admits `vote_pending` because a meta change on the
                // same endpoint can. Guard rather than assert: if a future field on this form ever becomes
                // governed, the tab skips the reflect instead of throwing inside its own success handler, which
                // is precisely the failure the settings tab shipped with.
                const space = result.space;
                if (!space) {
                    this.state.markDupePristine();
                    return;
                }
                // Reflect saved state back onto the space object.
                this.state.settingsSpace.set(space);
                this.store.spaces.update(list => list.map(x => x.id === space.id ? space : x));
                // Re-baseline the dupe dirty snapshot so the close guard doesn't flag freshly-saved rules.
                this.state.markDupePristine();
            },
            error: (e) => { this.state.dupeSaving.set(false); this.state.dupeError.set(e?.error?.error || this.transloco.translate('spaces.dupe.saveError')); },
        });
    }
    static { this.ɵfac = function SpaceDuplicatesTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceDuplicatesTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceDuplicatesTabComponent, selectors: [["app-space-duplicates-tab"]], decls: 44, vars: 39, consts: [[2, "max-width", "760px"], [2, "font-size", "13px", "color", "var(--text-muted)", "margin", "0 0 16px"], [1, "field"], [2, "max-width", "220px", 3, "ngModelChange", "ngModel"], ["value", "older"], ["value", "newer"], [2, "display", "flex", "align-items", "center", "gap", "8px", "cursor", "pointer", "margin-bottom", "12px", "font-size", "13px"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "-6px 0 16px"], [1, "dz-section-title", 2, "margin-top", "8px"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "4px 0 12px"], [2, "display", "flex", "gap", "8px", "align-items", "flex-end", "flex-wrap", "wrap", "padding", "10px", "background", "var(--bg-secondary)", "border-radius", "8px", "margin-bottom", "8px"], [2, "border", "1px dashed var(--border)", "border-radius", "8px", "padding", "16px 18px", "color", "var(--text-muted)", "font-size", "13px", "line-height", "1.5"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 2, "margin-top", "8px", 3, "click"], ["name", "plus", 3, "size"], [1, "alert", "alert-warning", 2, "margin-top", "16px", "display", "flex", "gap", "8px", "align-items", "flex-start"], [1, "alert", "alert-error", 2, "margin-top", "12px"], [2, "margin-top", "20px", "display", "flex", "gap", "8px", "align-items", "center"], ["type", "button", 1, "btn", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [2, "font-size", "13px", "color", "var(--success)"], [1, "field", 2, "margin", "0", "width", "170px"], [2, "font-size", "11px", "display", "flex", "justify-content", "space-between", "gap", "6px"], [2, "color", "var(--accent)", "font-weight", "600", "font-variant-numeric", "tabular-nums"], ["type", "range", "min", "0", "max", "1", "step", "0.01", 2, "width", "100%", 3, "ngModelChange", "ngModel"], [1, "field", 2, "margin", "0", "width", "150px"], [2, "font-size", "11px"], [3, "ngModelChange", "ngModel"], ["value", "flag"], ["value", "automerge"], ["value", "notify"], [1, "field", 2, "margin", "0", "flex", "1", "min-width", "220px"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"], ["name", "x", 3, "size"], ["type", "url", 3, "ngModelChange", "ngModel", "placeholder"], ["name", "warning", 3, "size"]], template: function SpaceDuplicatesTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "p", 1);
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "div", 2)(5, "label");
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "select", 3);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceDuplicatesTabComponent_Template_select_ngModelChange_8_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.dupeSurvivor, $event) || (ctx.state.dupeSurvivor = $event); return $event; });
            i0.ɵɵelementStart(9, "option", 4);
            i0.ɵɵtext(10);
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(12, "option", 5);
            i0.ɵɵtext(13);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(15, "label", 6)(16, "input", 7);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceDuplicatesTabComponent_Template_input_ngModelChange_16_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.dupeOnInsert, $event) || (ctx.state.dupeOnInsert = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(17, "span");
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(20, "p", 8);
            i0.ɵɵtext(21);
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(23, "div", 9);
            i0.ɵɵtext(24);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(26, "p", 10);
            i0.ɵɵtext(27);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(29, SpaceDuplicatesTabComponent_For_30_Template, 28, 26, "div", 11, i0.ɵɵrepeaterTrackByIndex, false, SpaceDuplicatesTabComponent_ForEmpty_31_Template, 3, 3, "div", 12);
            i0.ɵɵelementStart(32, "button", 13);
            i0.ɵɵlistener("click", function SpaceDuplicatesTabComponent_Template_button_click_32_listener() { return ctx.state.addDupeRule(); });
            i0.ɵɵelement(33, "ph-icon", 14);
            i0.ɵɵtext(34);
            i0.ɵɵpipe(35, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(36, SpaceDuplicatesTabComponent_Conditional_36_Template, 5, 4, "div", 15);
            i0.ɵɵconditionalCreate(37, SpaceDuplicatesTabComponent_Conditional_37_Template, 2, 1, "div", 16);
            i0.ɵɵelementStart(38, "div", 17)(39, "button", 18);
            i0.ɵɵlistener("click", function SpaceDuplicatesTabComponent_Template_button_click_39_listener() { return ctx.saveDupeRules(); });
            i0.ɵɵconditionalCreate(40, SpaceDuplicatesTabComponent_Conditional_40_Template, 1, 0, "span", 19);
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(43, SpaceDuplicatesTabComponent_Conditional_43_Template, 3, 3, "span", 20);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 19, "spaces.dupe.intro"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 21, "spaces.dupe.survivor"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.dupeSurvivor);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 23, "spaces.dupe.survivorOlder"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 25, "spaces.dupe.survivorNewer"));
            i0.ɵɵadvance(3);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.dupeOnInsert);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 27, "spaces.dupe.onInsert"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 29, "spaces.dupe.onInsertHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 31, "spaces.dupe.rulesTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 33, "spaces.dupe.rulesHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.state.dupeRulesState);
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(35, 35, "spaces.dupe.addRule"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.hasAutomergeRule() ? 36 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.state.dupeError() ? 37 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.state.dupeSaving());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.state.dupeSaving() ? 40 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(42, 37, "spaces.dupe.save"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.dupeSaved() ? 43 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgModel, PhIconComponent, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceDuplicatesTabComponent, [{
        type: Component,
        args: [{ selector: 'app-space-duplicates-tab', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
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
      <div class="field" style="margin:0;width:170px;">
        <label style="font-size:11px;display:flex;justify-content:space-between;gap:6px;">
          <span>{{ 'spaces.dupe.minScore' | transloco }}</span>
          <span style="color:var(--accent);font-weight:600;font-variant-numeric:tabular-nums;">{{ pct(r.minScore) }}%</span>
        </label>
        <input type="range" min="0" max="1" step="0.01" [(ngModel)]="r.minScore" style="width:100%;" [attr.aria-label]="'spaces.dupe.minScore' | transloco" />
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
  } @empty {
    <div style="border:1px dashed var(--border);border-radius:8px;padding:16px 18px;color:var(--text-muted);font-size:13px;line-height:1.5;">
      {{ 'spaces.dupe.rulesEmpty' | transloco }}
    </div>
  }

  <button class="btn btn-secondary btn-sm" type="button" (click)="state.addDupeRule()" style="margin-top:8px;">
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
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceDuplicatesTabComponent, { className: "SpaceDuplicatesTabComponent", filePath: "app/pages/settings/space-duplicates-tab.component.ts", lineNumber: 103 }); })();
