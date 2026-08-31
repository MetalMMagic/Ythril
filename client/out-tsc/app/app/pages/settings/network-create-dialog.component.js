import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworksApi } from '../../core/networks-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.id;
function NetworkCreateDialogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.createError());
} }
function NetworkCreateDialogComponent_Conditional_42_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 23);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "input", 24);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkCreateDialogComponent_Conditional_42_Template_input_ngModelChange_3_listener($event) { i0.ɵɵrestoreView(_r2); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.networkSpacesFallback, $event) || (ctx_r0.networkSpacesFallback = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 3, "networks.dialog.create.spacesLoadFailed"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.networkSpacesFallback);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(4, 5, "networks.dialog.create.spacesFallbackPlaceholder"));
} }
function NetworkCreateDialogComponent_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "networks.dialog.create.loadingSpaces"));
} }
function NetworkCreateDialogComponent_Conditional_44_For_15_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 29);
    i0.ɵɵlistener("click", function NetworkCreateDialogComponent_Conditional_44_For_15_Template_tr_click_0_listener() { const s_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.toggleNetworkSpace(s_r5.id)); });
    i0.ɵɵelementStart(1, "td", 30)(2, "input", 31);
    i0.ɵɵlistener("click", function NetworkCreateDialogComponent_Conditional_44_For_15_Template_input_click_2_listener($event) { return $event.stopPropagation(); })("change", function NetworkCreateDialogComponent_Conditional_44_For_15_Template_input_change_2_listener() { const s_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.toggleNetworkSpace(s_r5.id)); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td")(6, "span", 32);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const s_r5 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("checked", ctx_r0.isNetworkSpaceSelected(s_r5.id));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(s_r5.label);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(s_r5.id);
} }
function NetworkCreateDialogComponent_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 18)(1, "table", 25)(2, "thead")(3, "tr")(4, "th", 26)(5, "input", 27);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵlistener("change", function NetworkCreateDialogComponent_Conditional_44_Template_input_change_5_listener() { i0.ɵɵrestoreView(_r3); const ctx_r0 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r0.toggleNetworkSelectAll()); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "th");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(13, "tbody");
    i0.ɵɵrepeaterCreate(14, NetworkCreateDialogComponent_Conditional_44_For_15_Template, 8, 3, "tr", 28, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(5);
    i0.ɵɵproperty("checked", ctx_r0.networkSelectAll);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(6, 4, "networks.dialog.create.allSpacesTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 6, "spaces.table.column.label"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 8, "spaces.table.column.id"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r0.availableSpaces());
} }
function NetworkCreateDialogComponent_Conditional_45_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 16)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 33);
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkCreateDialogComponent_Conditional_45_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r0.form.votingDeadlineHours, $event) || (ctx_r0.form.votingDeadlineHours = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "networks.dialog.create.votingDeadline"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.form.votingDeadlineHours);
} }
function NetworkCreateDialogComponent_Conditional_51_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 22);
} }
/**
 * Create-network dialog, extracted from the (large) NetworksComponent as the first slice of taming that
 * 1261-line file (PR-U3). Owns the whole create form — label / type / space selection (with a
 * comma-separated fallback when the spaces list can't load) and the voting-deadline field — and performs
 * the `createNetwork` API call itself, emitting the created `Network` to the host (which appends it and
 * closes the dialog). Behaviour is unchanged from the inline version; the create characterization tests
 * moved here with it (network-create-dialog.component.spec.ts).
 *
 * Host renders it gated: `@if (showCreateDialog()) { <app-network-create-dialog … /> }`, so this
 * component is only alive while open and needs no visibility state of its own.
 */
export class NetworkCreateDialogComponent {
    constructor() {
        this.networksApi = inject(NetworksApi);
        this.transloco = inject(TranslocoService);
        /** Local spaces to offer for selection (resolved by the host). */
        this.availableSpaces = input([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        /** When the host's spaces list failed to load, fall back to a comma-separated ids field. */
        this.spacesLoadFailed = input(false, ...(ngDevMode ? [{ debugName: "spacesLoadFailed" }] : /* istanbul ignore next */ []));
        /** Emitted with the newly-created network — the host appends it and closes this dialog. */
        this.created = output();
        /** Emitted when the user cancels/dismisses. */
        this.close = output();
        this.form = { label: '', type: 'closed', votingDeadlineHours: 48 };
        this.networkSpacesFallback = '';
        this.networkSelectedSpaces = [];
        this.networkSelectAll = false;
        this.creating = signal(false, ...(ngDevMode ? [{ debugName: "creating" }] : /* istanbul ignore next */ []));
        this.createError = signal('', ...(ngDevMode ? [{ debugName: "createError" }] : /* istanbul ignore next */ []));
    }
    createNetwork() {
        if (!this.form.label.trim())
            return;
        this.creating.set(true);
        this.createError.set('');
        let spaces;
        if (this.spacesLoadFailed()) {
            spaces = this.networkSpacesFallback.split(',').map(s => s.trim()).filter(Boolean);
        }
        else {
            spaces = [...this.networkSelectedSpaces];
        }
        this.networksApi.createNetwork({
            label: this.form.label.trim(),
            type: this.form.type,
            spaces,
            votingDeadlineHours: this.form.votingDeadlineHours,
        }).subscribe({
            next: (net) => {
                this.creating.set(false);
                this.created.emit(net);
            },
            error: (err) => {
                this.creating.set(false);
                this.createError.set(err.error?.error ?? this.transloco.translate('networks.error.createFailed'));
            },
        });
    }
    isNetworkSpaceSelected(id) {
        return this.networkSelectedSpaces.includes(id);
    }
    toggleNetworkSpace(id) {
        if (this.networkSelectedSpaces.includes(id)) {
            this.networkSelectedSpaces = this.networkSelectedSpaces.filter(s => s !== id);
        }
        else {
            this.networkSelectedSpaces = [...this.networkSelectedSpaces, id];
        }
        this.networkSelectAll = this.networkSelectedSpaces.length === this.availableSpaces().length;
    }
    toggleNetworkSelectAll() {
        this.networkSelectAll = !this.networkSelectAll;
        if (this.networkSelectAll) {
            this.networkSelectedSpaces = this.availableSpaces().map(s => s.id);
        }
        else {
            this.networkSelectedSpaces = [];
        }
    }
    static { this.ɵfac = function NetworkCreateDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || NetworkCreateDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: NetworkCreateDialogComponent, selectors: [["app-network-create-dialog"]], inputs: { availableSpaces: [1, "availableSpaces"], spacesLoadFailed: [1, "spacesLoadFailed"] }, outputs: { created: "created", close: "close" }, decls: 54, vars: 50, consts: [[1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "card-title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "12px", "align-items", "end", 3, "ngSubmit"], [1, "field", 2, "margin-bottom", "0"], ["type", "text", "name", "label", "required", "", 3, "ngModelChange", "ngModel", "placeholder"], ["name", "type", 3, "ngModelChange", "ngModel"], ["value", "closed"], ["value", "democratic"], ["value", "club"], ["value", "braintree"], ["value", "pubsub"], [1, "field", 2, "margin-bottom", "0", "grid-column", "span 2"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin-top", "4px"], ["hscrollTop", "", 1, "table-wrapper", 2, "max-height", "200px", "overflow-y", "auto", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)"], [2, "grid-column", "span 2", "display", "flex", "gap", "8px", "justify-content", "flex-end"], ["type", "button", 1, "btn-secondary", "btn", 3, "click"], ["type", "submit", 1, "btn-primary", "btn", 3, "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [1, "alert", "alert-error", 2, "margin-bottom", "6px", "font-size", "12px"], ["type", "text", "name", "spaces", 3, "ngModelChange", "ngModel", "placeholder"], [2, "margin", "0"], [2, "width", "40px", "text-align", "center"], ["type", "checkbox", 3, "change", "checked"], [2, "cursor", "pointer"], [2, "cursor", "pointer", 3, "click"], [2, "text-align", "center"], ["type", "checkbox", 3, "click", "change", "checked"], [1, "badge", "badge-gray", "mono"], ["type", "number", "name", "deadline", "min", "1", "max", "72", 3, "ngModelChange", "ngModel"]], template: function NetworkCreateDialogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function NetworkCreateDialogComponent_Template_div_dismiss_1_listener() { return ctx.close.emit(); })("click", function NetworkCreateDialogComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 2)(4, "div", 3);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 4);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function NetworkCreateDialogComponent_Template_button_click_7_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(9, "ph-icon", 5);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, NetworkCreateDialogComponent_Conditional_10_Template, 2, 1, "div", 6);
            i0.ɵɵelementStart(11, "form", 7);
            i0.ɵɵlistener("ngSubmit", function NetworkCreateDialogComponent_Template_form_ngSubmit_11_listener() { return ctx.createNetwork(); });
            i0.ɵɵelementStart(12, "div", 8)(13, "label");
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(16, "input", 9);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function NetworkCreateDialogComponent_Template_input_ngModelChange_16_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.label, $event) || (ctx.form.label = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(18, "div", 8)(19, "label");
            i0.ɵɵtext(20);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(22, "select", 10);
            i0.ɵɵtwoWayListener("ngModelChange", function NetworkCreateDialogComponent_Template_select_ngModelChange_22_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.form.type, $event) || (ctx.form.type = $event); return $event; });
            i0.ɵɵelementStart(23, "option", 11);
            i0.ɵɵtext(24);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(26, "option", 12);
            i0.ɵɵtext(27);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(29, "option", 13);
            i0.ɵɵtext(30);
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "option", 14);
            i0.ɵɵtext(33);
            i0.ɵɵpipe(34, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(35, "option", 15);
            i0.ɵɵtext(36);
            i0.ɵɵpipe(37, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(38, "div", 16)(39, "label");
            i0.ɵɵtext(40);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(42, NetworkCreateDialogComponent_Conditional_42_Template, 5, 7)(43, NetworkCreateDialogComponent_Conditional_43_Template, 3, 3, "div", 17)(44, NetworkCreateDialogComponent_Conditional_44_Template, 16, 10, "div", 18);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(45, NetworkCreateDialogComponent_Conditional_45_Template, 5, 4, "div", 16);
            i0.ɵɵelementStart(46, "div", 19)(47, "button", 20);
            i0.ɵɵlistener("click", function NetworkCreateDialogComponent_Template_button_click_47_listener() { return ctx.close.emit(); });
            i0.ɵɵtext(48);
            i0.ɵɵpipe(49, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(50, "button", 21);
            i0.ɵɵconditionalCreate(51, NetworkCreateDialogComponent_Conditional_51_Template, 1, 0, "span", 22);
            i0.ɵɵtext(52);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵelementEnd()()()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 22, "networks.dialog.create.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 24, "networks.dialog.create.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 26, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.createError() ? 10 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 28, "networks.dialog.create.label"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.label);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(17, 30, "networks.dialog.create.labelPlaceholder"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 32, "networks.dialog.create.type"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.form.type);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 34, "networks.type.closed"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 36, "networks.type.democratic"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 38, "networks.type.club"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(34, 40, "networks.type.braintree"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(37, 42, "networks.type.pubsub"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(41, 44, "networks.dialog.create.spaces"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.spacesLoadFailed() ? 42 : ctx.availableSpaces().length === 0 ? 43 : 44);
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.form.type !== "pubsub" ? 45 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(49, 46, "common.cancel"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.creating() || !ctx.form.label.trim());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.creating() ? 51 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(53, 48, "networks.dialog.create.submitButton"), " ");
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinValidator, i1.MaxValidator, i1.NgModel, i1.NgForm, PhIconComponent, ModalDirective, HscrollTopDirective, TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog[_ngcontent-%COMP%] {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(NetworkCreateDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-network-create-dialog', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective, HscrollTopDirective], template: `
    <div class="dialog-backdrop">
      <div class="dialog" [appModal]="'networks.dialog.create.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="card-title">{{ 'networks.dialog.create.title' | transloco }}</div>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
        </div>

        @if (createError()) { <div class="alert alert-error">{{ createError() }}</div> }

        <form (ngSubmit)="createNetwork()" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:end;">
          <div class="field" style="margin-bottom:0;">
            <label>{{ 'networks.dialog.create.label' | transloco }}</label>
            <input type="text" [(ngModel)]="form.label" name="label" [placeholder]="'networks.dialog.create.labelPlaceholder' | transloco" required />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>{{ 'networks.dialog.create.type' | transloco }}</label>
            <select [(ngModel)]="form.type" name="type">
              <option value="closed">{{ 'networks.type.closed' | transloco }}</option>
              <option value="democratic">{{ 'networks.type.democratic' | transloco }}</option>
              <option value="club">{{ 'networks.type.club' | transloco }}</option>
              <option value="braintree">{{ 'networks.type.braintree' | transloco }}</option>
              <option value="pubsub">{{ 'networks.type.pubsub' | transloco }}</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0; grid-column:span 2;">
            <label>{{ 'networks.dialog.create.spaces' | transloco }}</label>
            @if (spacesLoadFailed()) {
              <div class="alert alert-error" style="margin-bottom:6px; font-size:12px;">{{ 'networks.dialog.create.spacesLoadFailed' | transloco }}</div>
              <input type="text" [(ngModel)]="networkSpacesFallback" name="spaces" [placeholder]="'networks.dialog.create.spacesFallbackPlaceholder' | transloco" />
            } @else if (availableSpaces().length === 0) {
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">{{ 'networks.dialog.create.loadingSpaces' | transloco }}</div>
            } @else {
              <div class="table-wrapper" hscrollTop style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm);">
                <table style="margin:0;">
                  <thead>
                    <tr>
                      <th style="width:40px; text-align:center;">
                        <input type="checkbox" [checked]="networkSelectAll" (change)="toggleNetworkSelectAll()" [attr.title]="'networks.dialog.create.allSpacesTitle' | transloco" />
                      </th>
                      <th>{{ 'spaces.table.column.label' | transloco }}</th>
                      <th>{{ 'spaces.table.column.id' | transloco }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of availableSpaces(); track s.id) {
                      <tr style="cursor:pointer;" (click)="toggleNetworkSpace(s.id)">
                        <td style="text-align:center;">
                          <input type="checkbox" [checked]="isNetworkSpaceSelected(s.id)" (click)="$event.stopPropagation()" (change)="toggleNetworkSpace(s.id)" />
                        </td>
                        <td>{{ s.label }}</td>
                        <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
          @if (form.type !== 'pubsub') {
            <div class="field" style="margin-bottom:0; grid-column:span 2;">
              <label>{{ 'networks.dialog.create.votingDeadline' | transloco }}</label>
              <input type="number" [(ngModel)]="form.votingDeadlineHours" name="deadline" min="1" max="72" />
            </div>
          }
          <div style="grid-column:span 2; display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
            <button class="btn-primary btn" type="submit" [disabled]="creating() || !form.label.trim()">
              @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
              {{ 'networks.dialog.create.submitButton' | transloco }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `, styles: ["\n    .dialog-backdrop {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }\n  "] }]
    }], null, { availableSpaces: [{ type: i0.Input, args: [{ isSignal: true, alias: "availableSpaces", required: false }] }], spacesLoadFailed: [{ type: i0.Input, args: [{ isSignal: true, alias: "spacesLoadFailed", required: false }] }], created: [{ type: i0.Output, args: ["created"] }], close: [{ type: i0.Output, args: ["close"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(NetworkCreateDialogComponent, { className: "NetworkCreateDialogComponent", filePath: "app/pages/settings/network-create-dialog.component.ts", lineNumber: 130 }); })();
