import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworksApi } from '../../core/networks-api.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
function NetworkJoinDialogComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.joinError());
} }
function NetworkJoinDialogComponent_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r0.joinSuccess());
} }
function NetworkJoinDialogComponent_Conditional_19_For_8_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "input", 23);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function NetworkJoinDialogComponent_Conditional_19_For_8_Conditional_10_Template_input_ngModelChange_0_listener($event) { i0.ɵɵrestoreView(_r4); const remoteId_r3 = i0.ɵɵnextContext().$implicit; const ctx_r0 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r0.joinSpaceAliases[remoteId_r3], $event) || (ctx_r0.joinSpaceAliases[remoteId_r3] = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const remoteId_r3 = i0.ɵɵnextContext().$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r0.joinSpaceAliases[remoteId_r3]);
    i0.ɵɵproperty("name", "alias-" + remoteId_r3)("placeholder", i0.ɵɵpipeBind1(1, 3, "networks.dialog.join.aliasPlaceholder"));
} }
function NetworkJoinDialogComponent_Conditional_19_For_8_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 17)(1, "span", 18);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "select", 19);
    i0.ɵɵlistener("ngModelChange", function NetworkJoinDialogComponent_Conditional_19_For_8_Template_select_ngModelChange_3_listener($event) { const remoteId_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.onCollisionActionChange(remoteId_r3, $event)); });
    i0.ɵɵelementStart(4, "option", 20);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "option", 21);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, NetworkJoinDialogComponent_Conditional_19_For_8_Conditional_10_Template, 2, 5, "input", 22);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const remoteId_r3 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(remoteId_r3);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngModel", ctx_r0.joinSpaceActions[remoteId_r3])("name", "collision-" + remoteId_r3);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 6, "networks.dialog.join.collision.merge"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 8, "networks.dialog.join.collision.alias"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r0.joinSpaceActions[remoteId_r3] === "alias" ? 10 : -1);
} }
function NetworkJoinDialogComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10)(1, "div", 15);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "p", 16);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(7, NetworkJoinDialogComponent_Conditional_19_For_8_Template, 11, 10, "div", 17, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "networks.dialog.join.collisions.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(6, 4, "networks.dialog.join.collisions.body"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r0.joinCollisionSpaces());
} }
function NetworkJoinDialogComponent_Conditional_25_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 14);
} }
/**
 * Join-network dialog, extracted from the (large) NetworksComponent (PR-U3). Owns the invite-bundle
 * textarea, the bundle validation (JSON / required fields / this brain's URL), the space-id
 * **collision-resolution** UI (merge vs alias, with alias validation), and the `joinRemote` call.
 *
 * `myUrl` is a one-way input: the host computes this brain's own URL (used to gate the enable-networks
 * flow) and passes it in; the join dialog never lets the user edit it, it only needs it to submit. On a
 * successful join the dialog shows its result message and emits `joined` so the host reloads the network
 * list and refreshes its spaces (a join can create new local spaces). Behaviour matches the inline
 * version; the join characterization tests moved here with it.
 */
export class NetworkJoinDialogComponent {
    constructor() {
        this.networksApi = inject(NetworksApi);
        this.transloco = inject(TranslocoService);
        /** Local spaces (for collision detection). */
        this.availableSpaces = input([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        /** This brain's own URL, computed by the host — used to submit the join (never edited here). */
        this.myUrl = input('', ...(ngDevMode ? [{ debugName: "myUrl" }] : /* istanbul ignore next */ []));
        /** Emitted after a successful join so the host reloads networks and refreshes its spaces list. */
        this.joined = output();
        /** Emitted when the user cancels/dismisses. */
        this.close = output();
        this.joinBundle = '';
        this.joining = signal(false, ...(ngDevMode ? [{ debugName: "joining" }] : /* istanbul ignore next */ []));
        this.joinError = signal('', ...(ngDevMode ? [{ debugName: "joinError" }] : /* istanbul ignore next */ []));
        this.joinSuccess = signal('', ...(ngDevMode ? [{ debugName: "joinSuccess" }] : /* istanbul ignore next */ []));
        this.joinCollisionSpaces = signal([], ...(ngDevMode ? [{ debugName: "joinCollisionSpaces" }] : /* istanbul ignore next */ []));
        this.joinSpaceActions = {};
        this.joinSpaceAliases = {};
        this.joinParsedBundle = null;
    }
    joinNetwork() {
        this.joinError.set('');
        this.joinSuccess.set('');
        this.joinCollisionSpaces.set([]);
        let bundle;
        try {
            bundle = JSON.parse(this.joinBundle);
        }
        catch {
            this.joinError.set(this.transloco.translate('networks.dialog.join.error.invalidJson'));
            return;
        }
        if (!bundle.handshakeId || !bundle.inviteUrl || !bundle.rsaPublicKeyPem || !bundle.networkId) {
            this.joinError.set(this.transloco.translate('networks.dialog.join.error.incompleteBundle'));
            return;
        }
        if (!this.myUrl().trim()) {
            this.joinError.set(this.transloco.translate('networks.dialog.join.error.missingMyUrl'));
            return;
        }
        // Detect space name collisions — show resolution UI if any overlap
        if (bundle.spaces?.length) {
            const localIds = new Set(this.availableSpaces().map(s => s.id));
            const overlap = bundle.spaces.filter((s) => localIds.has(s));
            if (overlap.length > 0) {
                this.joinParsedBundle = bundle;
                this.joinSpaceActions = {};
                this.joinSpaceAliases = {};
                for (const id of overlap) {
                    this.joinSpaceActions[id] = 'merge';
                    this.joinSpaceAliases[id] = '';
                }
                this.joinCollisionSpaces.set(overlap);
                return; // wait for user to resolve collisions
            }
        }
        this.joinParsedBundle = bundle;
        this.executeJoin();
    }
    onCollisionActionChange(remoteId, action) {
        this.joinSpaceActions[remoteId] = action;
        if (action === 'alias' && !this.joinSpaceAliases[remoteId]) {
            this.joinSpaceAliases[remoteId] = remoteId + '-local';
        }
    }
    confirmJoin() {
        // Validate alias inputs
        for (const remoteId of this.joinCollisionSpaces()) {
            if (this.joinSpaceActions[remoteId] === 'alias') {
                const alias = this.joinSpaceAliases[remoteId]?.trim();
                if (!alias) {
                    this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasRequired', { remoteId }));
                    return;
                }
                if (!/^[a-z0-9-]+$/.test(alias)) {
                    this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasInvalid', { alias }));
                    return;
                }
                const localIds = new Set(this.availableSpaces().map(s => s.id));
                if (localIds.has(alias)) {
                    this.joinError.set(this.transloco.translate('networks.dialog.join.error.aliasExists', { alias }));
                    return;
                }
            }
        }
        this.executeJoin();
    }
    executeJoin() {
        const bundle = this.joinParsedBundle;
        if (!bundle)
            return;
        // Build spaceMap from collision resolutions
        const spaceMap = {};
        for (const remoteId of this.joinCollisionSpaces()) {
            if (this.joinSpaceActions[remoteId] === 'alias') {
                spaceMap[remoteId] = this.joinSpaceAliases[remoteId].trim();
            }
        }
        this.joining.set(true);
        this.networksApi.joinRemote({
            handshakeId: bundle.handshakeId,
            inviteUrl: bundle.inviteUrl,
            rsaPublicKeyPem: bundle.rsaPublicKeyPem,
            networkId: bundle.networkId,
            myUrl: this.myUrl().trim(),
            expiresAt: bundle.expiresAt,
            ...(Object.keys(spaceMap).length > 0 ? { spaceMap } : {}),
        }).subscribe({
            next: (result) => {
                this.joining.set(false);
                // Vote-governed networks hold the join in a vote round on the inviter's
                // side; sync begins once the members/ancestors approve.
                const successKey = result.status === 'vote_pending'
                    ? 'networks.dialog.join.success.votePending'
                    : 'networks.dialog.join.success.joined';
                let msg = this.transloco.translate(successKey, { networkLabel: result.networkLabel });
                if (result.createdSpaces?.length) {
                    msg += ` ${this.transloco.translate('networks.dialog.join.success.createdSpaces', { spaces: result.createdSpaces.join(', ') })}`;
                }
                if (result.existingSpaces?.length) {
                    msg += ` ${this.transloco.translate('networks.dialog.join.success.existingSpaces', { spaces: result.existingSpaces.join(', ') })}`;
                }
                if (result.spaceMap && Object.keys(result.spaceMap).length > 0) {
                    const aliases = Object.entries(result.spaceMap).map(([r, l]) => `${r} → ${l}`).join(', ');
                    msg += ` ${this.transloco.translate('networks.dialog.join.success.aliases', { aliases })}`;
                }
                this.joinSuccess.set(msg);
                this.joinBundle = '';
                this.joinParsedBundle = null;
                this.joinCollisionSpaces.set([]);
                this.joinSpaceActions = {};
                this.joinSpaceAliases = {};
                this.joined.emit(); // host reloads networks + refreshes spaces (a join can create local spaces)
            },
            error: (err) => {
                this.joining.set(false);
                this.joinError.set(err.error?.error ?? this.transloco.translate('networks.error.joinFailed'));
            },
        });
    }
    static { this.ɵfac = function NetworkJoinDialogComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || NetworkJoinDialogComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: NetworkJoinDialogComponent, selectors: [["app-network-join-dialog"]], inputs: { availableSpaces: [1, "availableSpaces"], myUrl: [1, "myUrl"] }, outputs: { joined: "joined", close: "close" }, decls: 29, vars: 33, consts: [[1, "dialog-backdrop"], [1, "dialog", 3, "dismiss", "click", "appModal"], [1, "dialog-header"], [1, "card-title"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], [1, "alert", "alert-error"], [1, "alert", "alert-success"], [1, "field"], ["name", "joinBundle", "rows", "5", 2, "font-family", "var(--font-mono)", "font-size", "12px", "resize", "vertical", 3, "ngModelChange", "ngModel", "placeholder"], [2, "margin", "0 0 12px", "padding", "12px", "border", "1px solid var(--border)", "border-radius", "var(--radius-sm)", "background", "var(--bg-elevated)"], [2, "display", "flex", "gap", "8px", "justify-content", "flex-end"], ["type", "button", 1, "btn-secondary", "btn", 3, "click"], [1, "btn-primary", "btn", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [2, "font-weight", "600", "font-size", "13px", "margin-bottom", "8px"], [2, "font-size", "12px", "color", "var(--text-muted)", "margin", "0 0 12px"], [2, "display", "flex", "align-items", "center", "gap", "8px", "margin-bottom", "8px"], [1, "badge", "badge-gray", "mono", 2, "min-width", "80px"], [2, "width", "140px", 3, "ngModelChange", "ngModel", "name"], ["value", "merge"], ["value", "alias"], ["type", "text", "pattern", "[a-z0-9-]+", "maxlength", "40", "required", "", 2, "width", "140px", "padding", "4px 8px", "font-size", "12px", 3, "ngModel", "name", "placeholder"], ["type", "text", "pattern", "[a-z0-9-]+", "maxlength", "40", "required", "", 2, "width", "140px", "padding", "4px 8px", "font-size", "12px", 3, "ngModelChange", "ngModel", "name", "placeholder"]], template: function NetworkJoinDialogComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵlistener("dismiss", function NetworkJoinDialogComponent_Template_div_dismiss_1_listener() { return ctx.close.emit(); })("click", function NetworkJoinDialogComponent_Template_div_click_1_listener($event) { return $event.stopPropagation(); });
            i0.ɵɵelementStart(3, "div", 2)(4, "div", 3);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "button", 4);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵlistener("click", function NetworkJoinDialogComponent_Template_button_click_7_listener() { return ctx.close.emit(); });
            i0.ɵɵelement(9, "ph-icon", 5);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(10, NetworkJoinDialogComponent_Conditional_10_Template, 2, 1, "div", 6);
            i0.ɵɵconditionalCreate(11, NetworkJoinDialogComponent_Conditional_11_Template, 2, 1, "div", 7);
            i0.ɵɵelementStart(12, "div", 8)(13, "label");
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(16, "textarea", 9);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function NetworkJoinDialogComponent_Template_textarea_ngModelChange_16_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.joinBundle, $event) || (ctx.joinBundle = $event); return $event; });
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(19, NetworkJoinDialogComponent_Conditional_19_Template, 9, 6, "div", 10);
            i0.ɵɵelementStart(20, "div", 11)(21, "button", 12);
            i0.ɵɵlistener("click", function NetworkJoinDialogComponent_Template_button_click_21_listener() { return ctx.close.emit(); });
            i0.ɵɵtext(22);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(24, "button", 13);
            i0.ɵɵlistener("click", function NetworkJoinDialogComponent_Template_button_click_24_listener() { return ctx.joinCollisionSpaces().length > 0 ? ctx.confirmJoin() : ctx.joinNetwork(); });
            i0.ɵɵconditionalCreate(25, NetworkJoinDialogComponent_Conditional_25_Template, 1, 0, "span", 14);
            i0.ɵɵtext(26);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementEnd()()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("appModal", i0.ɵɵpipeBind1(2, 15, "networks.dialog.join.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 17, "networks.dialog.join.title"));
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 19, "common.close"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.joinError() ? 10 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.joinSuccess() ? 11 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 21, "networks.dialog.join.bundleLabel"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.joinBundle);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(17, 23, "networks.dialog.join.bundlePlaceholder"));
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(18, 25, "networks.dialog.join.bundleAriaLabel"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.joinCollisionSpaces().length > 0 ? 19 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 27, "common.cancel"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.joining() || !ctx.joinBundle.trim() || !ctx.myUrl().trim());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.joining() ? 25 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", ctx.joinCollisionSpaces().length > 0 ? i0.ɵɵpipeBind1(27, 29, "networks.dialog.join.confirmJoinButton") : i0.ɵɵpipeBind1(28, 31, "networks.dialog.join.submitButton"), " ");
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.RequiredValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.NgModel, PhIconComponent, ModalDirective, TranslocoPipe], styles: [".dialog-backdrop[_ngcontent-%COMP%] {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog[_ngcontent-%COMP%] {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(NetworkJoinDialogComponent, [{
        type: Component,
        args: [{ selector: 'app-network-join-dialog', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective], template: `
    <div class="dialog-backdrop">
      <div class="dialog" [appModal]="'networks.dialog.join.title' | transloco" (dismiss)="close.emit()" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="card-title">{{ 'networks.dialog.join.title' | transloco }}</div>
          <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="close.emit()"><ph-icon name="x" [size]="14"/></button>
        </div>

        @if (joinError()) { <div class="alert alert-error">{{ joinError() }}</div> }
        @if (joinSuccess()) { <div class="alert alert-success">{{ joinSuccess() }}</div> }

        <div class="field">
          <label>{{ 'networks.dialog.join.bundleLabel' | transloco }}</label>
          <textarea
            [(ngModel)]="joinBundle"
            name="joinBundle"
            rows="5"
            [placeholder]="'networks.dialog.join.bundlePlaceholder' | transloco"
            [attr.aria-label]="'networks.dialog.join.bundleAriaLabel' | transloco"
            style="font-family:var(--font-mono); font-size:12px; resize:vertical;"
          ></textarea>
        </div>

        @if (joinCollisionSpaces().length > 0) {
          <div style="margin:0 0 12px; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-elevated);">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px;">{{ 'networks.dialog.join.collisions.title' | transloco }}</div>
            <p style="font-size:12px; color:var(--text-muted); margin:0 0 12px;">
              {{ 'networks.dialog.join.collisions.body' | transloco }}
            </p>
            @for (remoteId of joinCollisionSpaces(); track remoteId) {
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span class="badge badge-gray mono" style="min-width:80px;">{{ remoteId }}</span>
                <select
                  [ngModel]="joinSpaceActions[remoteId]"
                  (ngModelChange)="onCollisionActionChange(remoteId, $event)"
                  [name]="'collision-' + remoteId"
                  style="width:140px;"
                >
                  <option value="merge">{{ 'networks.dialog.join.collision.merge' | transloco }}</option>
                  <option value="alias">{{ 'networks.dialog.join.collision.alias' | transloco }}</option>
                </select>
                @if (joinSpaceActions[remoteId] === 'alias') {
                  <input
                    type="text"
                    [(ngModel)]="joinSpaceAliases[remoteId]"
                    [name]="'alias-' + remoteId"
                    [placeholder]="'networks.dialog.join.aliasPlaceholder' | transloco"
                    pattern="[a-z0-9-]+"
                    maxlength="40"
                    style="width:140px; padding:4px 8px; font-size:12px;"
                    required
                  />
                }
              </div>
            }
          </div>
        }

        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn-secondary btn" type="button" (click)="close.emit()">{{ 'common.cancel' | transloco }}</button>
          <button
            class="btn-primary btn"
            (click)="joinCollisionSpaces().length > 0 ? confirmJoin() : joinNetwork()"
            [disabled]="joining() || !joinBundle.trim() || !myUrl().trim()"
          >
            @if (joining()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
            {{ joinCollisionSpaces().length > 0 ? ('networks.dialog.join.confirmJoinButton' | transloco) : ('networks.dialog.join.submitButton' | transloco) }}
          </button>
        </div>
      </div>
    </div>
  `, styles: ["\n    .dialog-backdrop {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }\n  "] }]
    }], null, { availableSpaces: [{ type: i0.Input, args: [{ isSignal: true, alias: "availableSpaces", required: false }] }], myUrl: [{ type: i0.Input, args: [{ isSignal: true, alias: "myUrl", required: false }] }], joined: [{ type: i0.Output, args: ["joined"] }], close: [{ type: i0.Output, args: ["close"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(NetworkJoinDialogComponent, { className: "NetworkJoinDialogComponent", filePath: "app/pages/settings/network-join-dialog.component.ts", lineNumber: 125 }); })();
