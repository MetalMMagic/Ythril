/**
 * Create-space dialog — label/id/quota, proxy targets, and the initial schema/purpose.
 *
 * Extracted from SpacesComponent (A17.8b). It appends the new space through SpacesStore rather
 * than handing it back to a parent, so the only output is `closed` — the dialog's visibility is
 * genuinely the page's view state, not the dialog's.
 */
import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpacesStore } from './spaces-store.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.id;
function SpaceCreateDialogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.createError());
} }
function SpaceCreateDialogComponent_Conditional_40_For_19_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 36);
    i0.ɵɵlistener("click", function SpaceCreateDialogComponent_Conditional_40_For_19_Template_tr_click_0_listener() { const s_r4 = i0.ɵɵrestoreView(_r3).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(!ctx_r0.proxyForAll && ctx_r0.toggleProxyFor(s_r4.id)); });
    i0.ɵɵelementStart(1, "td", 32)(2, "input", 37);
    i0.ɵɵlistener("click", function SpaceCreateDialogComponent_Conditional_40_For_19_Template_input_click_2_listener($event) { return $event.stopPropagation(); })("change", function SpaceCreateDialogComponent_Conditional_40_For_19_Template_input_change_2_listener() { const s_r4 = i0.ɵɵrestoreView(_r3).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(!ctx_r0.proxyForAll && ctx_r0.toggleProxyFor(s_r4.id)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td")(6, "span", 38);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const s_r4 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("text-muted", ctx_r0.proxyForAll);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("checked", ctx_r0.proxyForAll || ctx_r0.isProxyForSelected(s_r4.id))("disabled", ctx_r0.proxyForAll);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(s_r4.label);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(s_r4.id);
} }
function SpaceCreateDialogComponent_Conditional_40_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 17)(1, "table", 29)(2, "thead")(3, "tr");
    i0.ɵɵelement(4, "th", 30);
    i0.ɵɵelementStart(5, "th");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "th");
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(11, "tbody")(12, "tr", 31);
    i0.ɵɵlistener("click", function SpaceCreateDialogComponent_Conditional_40_Template_tr_click_12_listener() { i0.ɵɵrestoreView(_r2); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.toggleProxyForAll()); });
    i0.ɵɵelementStart(13, "td", 32)(14, "input", 33);
    i0.ɵɵlistener("click", function SpaceCreateDialogComponent_Conditional_40_Template_input_click_14_listener($event) { return $event.stopPropagation(); })("change", function SpaceCreateDialogComponent_Conditional_40_Template_input_change_14_listener() { i0.ɵɵrestoreView(_r2); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.toggleProxyForAll()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "td", 34);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵrepeaterCreate(18, SpaceCreateDialogComponent_Conditional_40_For_19_Template, 8, 6, "tr", 35, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 4, "spaces.table.column.label"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 6, "spaces.table.column.id"));
    i0.ɵɵadvance(5);
    i0.ɵɵproperty("checked", ctx_r0.proxyForAll);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 8, "spaces.create.proxyForAll"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r0.store.spaces());
} }
function SpaceCreateDialogComponent_Conditional_41_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 18);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.create.noExistingSpaces"));
} }
function SpaceCreateDialogComponent_Conditional_62_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 28);
} }
export class SpaceCreateDialogComponent {
    constructor() {
        this.store = inject(SpacesStore);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        /** The page owns whether this dialog is shown; tell it to close. */
        this.closed = output();
        // create dialog
        this.creating = signal(false, ...(ngDevMode ? [{ debugName: "creating" }] : /* istanbul ignore next */ []));
        this.createError = signal('', ...(ngDevMode ? [{ debugName: "createError" }] : /* istanbul ignore next */ []));
        this.proxyForSelected = [];
        this.proxyForAll = false;
        // The Purpose field starts empty — it used to pre-fill a long MCP tool listing, which the owner
        // never wanted persisted (it is exposed over MCP anyway). Validation defaults to the fully-strict
        // posture, matching the server's new-space default (#400), so the form never understates what will
        // actually be created.
        this.form = {
            label: '', id: '', maxGiB: null,
            purpose: '',
            validationMode: 'strict',
            strictLinkage: true,
        };
    }
    isProxyForSelected(id) { return this.proxyForSelected.includes(id); }
    toggleProxyFor(id) {
        if (this.proxyForAll)
            return;
        this.proxyForSelected = this.proxyForSelected.includes(id)
            ? this.proxyForSelected.filter(s => s !== id)
            : [...this.proxyForSelected, id];
    }
    toggleProxyForAll() {
        this.proxyForAll = !this.proxyForAll;
        if (this.proxyForAll)
            this.proxyForSelected = [];
    }
    createSpace() {
        if (!this.form.label.trim())
            return;
        this.creating.set(true);
        this.createError.set('');
        const body = { label: this.form.label.trim() };
        if (this.form.id.trim())
            body.id = this.form.id.trim();
        if (this.form.maxGiB)
            body.maxGiB = this.form.maxGiB;
        if (this.proxyForAll)
            body.proxyFor = ['*'];
        else if (this.proxyForSelected.length)
            body.proxyFor = [...this.proxyForSelected];
        // Send the validation choices EXPLICITLY, always. The server now defaults a new space to a
        // fully-strict posture when they are omitted (#400); if the form quietly dropped an 'off'/unchecked
        // choice it would create a strict space while showing the user 'off' — so the form must be
        // authoritative over its own visible values.
        const meta = {
            validationMode: this.form.validationMode,
            strictLinkage: this.form.strictLinkage,
        };
        if (this.form.purpose.trim())
            meta.purpose = this.form.purpose.trim();
        body.meta = meta;
        this.spacesApi.createSpace(body).pipe(timeout(30_000), finalize(() => this.creating.set(false))).subscribe({
            next: ({ space }) => {
                this.closed.emit();
                this.store.spaces.update(list => [...list, space]);
                this.form = { label: '', id: '', maxGiB: null, purpose: '', validationMode: 'strict', strictLinkage: true };
                this.proxyForSelected = [];
                this.proxyForAll = false;
                // Vector indexes finish building server-side (B1); poll so the "preparing
                // indexes" badge clears on its own when the space is ready.
                if (space.indexStatus === 'building')
                    this.store.pollIndexStatus();
            },
            error: (err) => {
                if (err instanceof TimeoutError) {
                    // The server persists the space even if the response was slow — refetch so
                    // it appears instead of silently vanishing, and show a soft note.
                    this.createError.set(this.transloco.translate('spaces.error.createTimeout'));
                    this.store.load();
                    this.store.pollIndexStatus();
                }
                else {
                    this.createError.set(err.error?.error ?? this.transloco.translate('spaces.error.createFailed'));
                }
            },
        });
    }
    static { this.ɵfac = function SpaceCreateDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceCreateDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceCreateDialogComponent, selectors: [["app-space-create-dialog"]], outputs: { closed: "closed" }, decls: 65, vars: 62, consts: [[1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "card-title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error"], [2, "display", "flex", "gap", "12px", "align-items", "flex-end", "flex-wrap", "wrap", 3, "ngSubmit"], [1, "field", 2, "flex", "1", "min-width", "140px", "margin-bottom", "0"], ["type", "text", "name", "label", "maxlength", "200", "required", "", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "width", "140px", "margin-bottom", "0"], ["type", "text", "name", "id", "pattern", "[a-z0-9-]+", 3, "ngModelChange", "ngModel", "placeholder"], [1, "field", 2, "width", "120px", "margin-bottom", "0"], ["type", "number", "name", "maxGiB", "min", "0", "step", "0.1", "placeholder", "\u2014", 3, "ngModelChange", "ngModel"], [2, "display", "flex", "gap", "12px", "flex-basis", "100%", "align-items", "stretch"], [1, "field", 2, "flex", "1", "margin-bottom", "0", "display", "flex", "flex-direction", "column"], ["name", "purpose", "maxlength", "4000", "rows", "8", 2, "resize", "vertical", "flex", "1", "min-height", "160px", 3, "ngModelChange", "ngModel", "placeholder"], ["hscrollTop", "", 1, "table-wrapper", 2, "flex", "1", "min-height", "160px", "max-height", "240px", "overflow-y", "auto", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin-top", "4px"], [2, "display", "flex", "gap", "12px", "flex-basis", "100%", "align-items", "flex-end"], [1, "field", 2, "margin-bottom", "0"], ["name", "validationMode", 2, "width", "140px", 3, "ngModelChange", "ngModel"], ["value", "off"], ["value", "warn"], ["value", "strict"], [1, "field", 2, "margin-bottom", "0", "display", "flex", "flex-direction", "row", "align-items", "center", "gap", "8px", "font-weight", "normal", "cursor", "pointer", "height", "34px"], ["type", "checkbox", "name", "strictLinkage", 3, "ngModelChange", "ngModel"], ["type", "submit", 1, "btn", "btn-primary", 2, "margin-left", "auto", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [2, "margin", "0"], [2, "width", "40px"], [2, "cursor", "pointer", "background", "var(--bg-elevated)", 3, "click"], [2, "text-align", "center"], ["type", "checkbox", 3, "click", "change", "checked"], ["colspan", "2", 2, "font-style", "italic", "color", "var(--text-muted)"], [2, "cursor", "pointer", 3, "text-muted"], [2, "cursor", "pointer", 3, "click"], ["type", "checkbox", 3, "click", "change", "checked", "disabled"], [1, "badge", "badge-gray", "mono"]], template: function SpaceCreateDialogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function SpaceCreateDialogComponent_Template_div_dismiss_1_listener() { return ctx.closed.emit(); })("click", function SpaceCreateDialogComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 2)(4, "div", 3);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 4);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function SpaceCreateDialogComponent_Template_button_click_7_listener() { return ctx.closed.emit(); });
            i0.ɵɵelement(9, "ph-icon", 5);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, SpaceCreateDialogComponent_Conditional_10_Template, 2, 1, "div", 6);
            i0.ɵɵelementStart(11, "form", 7);
            i0.ɵɵlistener("ngSubmit", function SpaceCreateDialogComponent_Template_form_ngSubmit_11_listener() { return ctx.createSpace(); });
            i0.ɵɵelementStart(12, "div", 8)(13, "label");
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(16, "input", 9);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_input_ngModelChange_16_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.label, $event) || (ctx.form.label = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(18, "div", 10)(19, "label");
            i0.ɵɵtext(20);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(22, "input", 11);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_input_ngModelChange_22_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.id, $event) || (ctx.form.id = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(24, "div", 12)(25, "label");
            i0.ɵɵtext(26);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(28, "input", 13);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_input_ngModelChange_28_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.maxGiB, $event) || (ctx.form.maxGiB = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(29, "div", 14)(30, "div", 15)(31, "label");
            i0.ɵɵtext(32);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(34, "textarea", 16);
            i0.ɵɵpipe(35, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_textarea_ngModelChange_34_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.purpose, $event) || (ctx.form.purpose = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(36, "div", 15)(37, "label");
            i0.ɵɵtext(38);
            i0.ɵɵpipe(39, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(40, SpaceCreateDialogComponent_Conditional_40_Template, 20, 10, "div", 17)(41, SpaceCreateDialogComponent_Conditional_41_Template, 3, 3, "div", 18);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(42, "div", 19)(43, "div", 20)(44, "label");
            i0.ɵɵtext(45);
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(47, "select", 21);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_select_ngModelChange_47_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.validationMode, $event) || (ctx.form.validationMode = $event); return $event; });
            i0.ɵɵelementStart(48, "option", 22);
            i0.ɵɵtext(49);
            i0.ɵɵpipe(50, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(51, "option", 23);
            i0.ɵɵtext(52);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(54, "option", 24);
            i0.ɵɵtext(55);
            i0.ɵɵpipe(56, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(57, "label", 25)(58, "input", 26);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceCreateDialogComponent_Template_input_ngModelChange_58_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.strictLinkage, $event) || (ctx.form.strictLinkage = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵtext(59);
            i0.ɵɵpipe(60, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(61, "button", 27);
            i0.ɵɵconditionalCreate(62, SpaceCreateDialogComponent_Conditional_62_Template, 1, 0, "span", 28);
            i0.ɵɵtext(63);
            i0.ɵɵpipe(64, "transloco");
            i0.ɵɵelementEnd()()()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 28, "spaces.create.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 30, "spaces.create.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 32, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createError() ? 10 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 34, "spaces.create.label"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.label);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(17, 36, "spaces.create.labelPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 38, "spaces.create.id"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.id);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(23, 40, "spaces.create.idPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 42, "spaces.create.maxGiB"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.maxGiB);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(33, 44, "spaces.create.purpose"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.purpose);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(35, 46, "spaces.create.purposePlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 48, "spaces.create.proxyFor"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.store.spaces().length > 0 ? 40 : 41);
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(46, 50, "spaces.create.validationMode"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.validationMode);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 52, "spaces.create.validation.off"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(53, 54, "spaces.create.validation.warn"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(56, 56, "spaces.create.validation.strict"));
            i0.ɵɵadvance(3);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.strictLinkage);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(60, 58, "spaces.create.strictLinkage"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.creating() || !ctx.form.label.trim());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.creating() ? 62 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(64, 60, "spaces.create.submitButton"), " ");
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.MinValidator, i1.NgModel, i1.NgForm, PhIconComponent, ModalDirective, HscrollTopDirective, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceCreateDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-space-create-dialog', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, HscrollTopDirective], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<div class="dialog-backdrop">
  <div class="dialog" [appModal]="'spaces.create.title' | transloco" (dismiss)="closed.emit()" (click)="$event.stopPropagation()">
    <div class="dialog-header">
      <div class="card-title">{{ 'spaces.create.title' | transloco }}</div>
      <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="closed.emit()"><ph-icon name="x" [size]="14"/></button>
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
      <div style="display:flex;gap:12px;flex-basis:100%;align-items:stretch;">
        <div class="field" style="flex:1;margin-bottom:0;display:flex;flex-direction:column;">
          <label>{{ 'spaces.create.purpose' | transloco }}</label>
          <textarea [(ngModel)]="form.purpose" name="purpose" maxlength="4000" rows="8" style="resize:vertical;flex:1;min-height:160px;" [placeholder]="'spaces.create.purposePlaceholder' | transloco"></textarea>
        </div>
        <div class="field" style="flex:1;margin-bottom:0;display:flex;flex-direction:column;">
          <label>{{ 'spaces.create.proxyFor' | transloco }}</label>
          @if (store.spaces().length > 0) {
            <div class="table-wrapper" hscrollTop style="flex:1;min-height:160px;max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
              <table style="margin:0;">
                <thead><tr><th style="width:40px;"></th><th>{{ 'spaces.table.column.label' | transloco }}</th><th>{{ 'spaces.table.column.id' | transloco }}</th></tr></thead>
                <tbody>
                  <tr style="cursor:pointer;background:var(--bg-elevated);" (click)="toggleProxyForAll()">
                    <td style="text-align:center;"><input type="checkbox" [checked]="proxyForAll" (click)="$event.stopPropagation()" (change)="toggleProxyForAll()" /></td>
                    <td colspan="2" style="font-style:italic;color:var(--text-muted);">{{ 'spaces.create.proxyForAll' | transloco }}</td>
                  </tr>
                  @for (s of store.spaces(); track s.id) {
                    <tr style="cursor:pointer;" [class.text-muted]="proxyForAll" (click)="!proxyForAll && toggleProxyFor(s.id)">
                      <td style="text-align:center;"><input type="checkbox" [checked]="proxyForAll || isProxyForSelected(s.id)" [disabled]="proxyForAll" (click)="$event.stopPropagation()" (change)="!proxyForAll && toggleProxyFor(s.id)" /></td>
                      <td>{{ s.label }}</td>
                      <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
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
      <div style="display:flex;gap:12px;flex-basis:100%;align-items:flex-end;">
        <div class="field" style="margin-bottom:0;">
          <label>{{ 'spaces.create.validationMode' | transloco }}</label>
          <select [(ngModel)]="form.validationMode" name="validationMode" style="width:140px;">
            <option value="off">{{ 'spaces.create.validation.off' | transloco }}</option><option value="warn">{{ 'spaces.create.validation.warn' | transloco }}</option><option value="strict">{{ 'spaces.create.validation.strict' | transloco }}</option>
          </select>
        </div>
        <label class="field" style="margin-bottom:0;display:flex;flex-direction:row;align-items:center;gap:8px;font-weight:normal;cursor:pointer;height:34px;">
          <input type="checkbox" [(ngModel)]="form.strictLinkage" name="strictLinkage" />{{ 'spaces.create.strictLinkage' | transloco }}
        </label>
        <button class="btn btn-primary" type="submit" style="margin-left:auto;" [disabled]="creating()||!form.label.trim()">
          @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.create.submitButton' | transloco }}
        </button>
      </div>
    </form>
  </div>
</div>
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n"] }]
    }], null, { closed: [{ type: i0.Output, args: ["closed"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceCreateDialogComponent, { className: "SpaceCreateDialogComponent", filePath: "app/pages/settings/space-create-dialog.component.ts", lineNumber: 98 }); })();
