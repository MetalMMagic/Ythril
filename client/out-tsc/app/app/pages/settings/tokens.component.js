import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthApi } from '../../core/auth-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { computed } from '@angular/core';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { SummaryStripComponent } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { RightsGlyphComponent } from './rights-glyph.component';
import { TokenCreateDialogComponent } from './token-create-dialog.component';
import { TokenRightsDialogComponent } from './token-rights-dialog.component';
import { OwnTokenRightsComponent } from './own-token-rights.component';
import { TokenQuotaCellComponent } from './token-quota-cell.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { TOKENS_PAGE_STYLES } from './tokens.styles';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _forTrack0 = ($index, $item) => $item.id;
function TokensComponent_Conditional_0_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "common.copied"), " ");
} }
function TokensComponent_Conditional_0_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "tokens.created.copyButton"), " ");
} }
function TokensComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 13);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 14)(8, "span", 15);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "button", 16);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_0_Template_button_click_11_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.copyNew()); });
    i0.ɵɵconditionalCreate(13, TokensComponent_Conditional_0_Conditional_13_Template, 2, 3)(14, TokensComponent_Conditional_0_Conditional_14_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "button", 17);
    i0.ɵɵlistener("click", function TokensComponent_Conditional_0_Template_button_click_15_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.clearNew()); });
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 7, "tokens.created.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 9, "tokens.created.warning"));
    i0.ɵɵadvance(3);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(9, 11, "tokens.created.newTokenValueAria"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.newToken());
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(12, 13, "tokens.created.copyNewAria"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.copied() ? 13 : 14);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 15, "tokens.created.dismissButton"));
} }
function TokensComponent_Conditional_1_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "common.copied"), " ");
} }
function TokensComponent_Conditional_1_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "tokens.created.copyButton"), " ");
} }
function TokensComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 12);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 13);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "div", 14)(8, "span", 15);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵtext(10);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "button", 16);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_1_Template_button_click_11_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.copyRegen()); });
    i0.ɵɵconditionalCreate(13, TokensComponent_Conditional_1_Conditional_13_Template, 2, 3)(14, TokensComponent_Conditional_1_Conditional_14_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "button", 17);
    i0.ɵɵlistener("click", function TokensComponent_Conditional_1_Template_button_click_15_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.clearRegen()); });
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 7, "tokens.rotated.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 9, "tokens.rotated.warning"));
    i0.ɵɵadvance(3);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(9, 11, "tokens.rotated.tokenValueAria"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.regenToken());
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(12, 13, "tokens.rotated.copyAria"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.copiedRegen() ? 13 : 14);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 15, "tokens.created.dismissButton"));
} }
function TokensComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-token-rights-dialog", 18);
    i0.ɵɵlistener("close", function TokensComponent_Conditional_2_Template_app_token_rights_dialog_close_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.editRightsFor.set(null)); })("saved", function TokensComponent_Conditional_2_Template_app_token_rights_dialog_saved_0_listener($event) { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onRightsSaved($event)); })("rotate", function TokensComponent_Conditional_2_Template_app_token_rights_dialog_rotate_0_listener() { const t_r5 = i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.dangerFromEditor(t_r5, "rotate")); })("revoke", function TokensComponent_Conditional_2_Template_app_token_rights_dialog_revoke_0_listener() { const t_r5 = i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.dangerFromEditor(t_r5, "revoke")); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("token", ctx)("availableSpaces", ctx_r1.availableSpaces());
} }
function TokensComponent_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-token-create-dialog", 19);
    i0.ɵɵlistener("close", function TokensComponent_Conditional_3_Template_app_token_create_dialog_close_0_listener() { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(false)); })("created", function TokensComponent_Conditional_3_Template_app_token_create_dialog_created_0_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onTokenCreated($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("availableSpaces", ctx_r1.availableSpaces())("spacesLoadFailed", ctx_r1.spacesLoadFailed());
} }
function TokensComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-summary-strip", 3);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(1, 2, "tokens.list.title"))("items", ctx_r1.summary());
} }
function TokensComponent_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵelement(1, "span", 20);
    i0.ɵɵelementEnd();
} }
function TokensComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 21);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function TokensComponent_Conditional_19_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.load()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "p", 22);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 3, "tokens.loadError"))("reason", ctx_r1.loadError() ?? "");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(4, 5, "tokens.listNeedsAdmin"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 24)(1, "input", 41);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function TokensComponent_Conditional_20_For_28_Conditional_2_Template_input_ngModelChange_1_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); i0.ɵɵtwoWayBindingSet(ctx_r1.editLabelValue, $event) || (ctx_r1.editLabelValue = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown.enter", function TokensComponent_Conditional_20_For_28_Conditional_2_Template_input_keydown_enter_1_listener() { i0.ɵɵrestoreView(_r10); const t_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.saveLabel(t_r11)); })("keydown.escape", function TokensComponent_Conditional_20_For_28_Conditional_2_Template_input_keydown_escape_1_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelEditLabel()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 42);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Conditional_2_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r10); const t_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.saveLabel(t_r11)); });
    i0.ɵɵelement(6, "ph-icon", 43);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "button", 37);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Conditional_2_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.cancelEditLabel()); });
    i0.ɵɵelement(10, "ph-icon", 40);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.editLabelValue);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 9, "tokens.action.editLabelAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", !ctx_r1.editLabelValue.trim());
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(4, 11, "common.save"))("aria-label", i0.ɵɵpipeBind1(5, 13, "common.save"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(8, 15, "common.cancel"))("aria-label", i0.ɵɵpipeBind1(9, 17, "common.cancel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
} }
function TokensComponent_Conditional_20_For_28_Conditional_3_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 46);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.table.currentSession"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelement(0, "span", 44);
    i0.ɵɵtext(1);
    i0.ɵɵelementStart(2, "button", 45);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Conditional_3_Template_button_click_2_listener() { i0.ɵɵrestoreView(_r12); const t_r11 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.startEditLabel(t_r11)); });
    i0.ɵɵelement(5, "ph-icon", 28);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, TokensComponent_Conditional_20_For_28_Conditional_3_Conditional_6_Template, 3, 3, "span", 46);
} if (rf & 2) {
    let tmp_18_0;
    const t_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("dot-active", !ctx_r1.isExpired(t_r11))("dot-expired", ctx_r1.isExpired(t_r11));
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", t_r11.name, " ");
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(3, 9, "tokens.action.editLabelTitle"))("aria-label", i0.ɵɵpipeBind1(4, 11, "tokens.action.editLabelAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance();
    i0.ɵɵconditional(t_r11.id === ((tmp_18_0 = ctx_r1.selfToken()) == null ? null : tmp_18_0.id) ? 6 : -1);
} }
function TokensComponent_Conditional_20_For_28_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-rights-glyph", 25);
} if (rf & 2) {
    const t_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("rights", t_r11.rights);
} }
function TokensComponent_Conditional_20_For_28_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 26);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(1, 2, "tokens.rights.none"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "tokens.rights.none"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
} if (rf & 2) {
    const t_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.stamp(t_r11.lastUsed), " ");
} }
function TokensComponent_Conditional_20_For_28_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 29);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.table.neverUsed"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_17_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 47);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.table.expired"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_17_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 48);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵproperty("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, "tokens.table.expiringSoon"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 30);
    i0.ɵɵconditionalCreate(1, TokensComponent_Conditional_20_For_28_Conditional_17_Conditional_1_Template, 3, 3, "app-status-pill", 47)(2, TokensComponent_Conditional_20_For_28_Conditional_17_Conditional_2_Template, 3, 4, "app-status-pill", 48);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r11 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.isExpired(t_r11) ? 1 : ctx_r1.isExpiringSoon(t_r11) ? 2 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", ctx_r1.stamp(t_r11.expiresAt), " ");
} }
function TokensComponent_Conditional_20_For_28_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 31);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.table.noExpiry"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 32);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.badge.schemaLibraryOnly"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 33);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.badge.allSpaces"));
} }
function TokensComponent_Conditional_20_For_28_Conditional_22_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 34);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r11 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r11.spaces.join(", "));
} }
function TokensComponent_Conditional_20_For_28_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 23);
    i0.ɵɵconditionalCreate(2, TokensComponent_Conditional_20_For_28_Conditional_2_Template, 11, 19, "span", 24)(3, TokensComponent_Conditional_20_For_28_Conditional_3_Template, 7, 13);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "td");
    i0.ɵɵconditionalCreate(5, TokensComponent_Conditional_20_For_28_Conditional_5_Template, 1, 1, "app-rights-glyph", 25)(6, TokensComponent_Conditional_20_For_28_Conditional_6_Template, 4, 6, "span", 26);
    i0.ɵɵelementStart(7, "button", 27);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Template_button_click_7_listener() { const t_r11 = i0.ɵɵrestoreView(_r9).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.editRightsFor.set(t_r11)); });
    i0.ɵɵelement(10, "ph-icon", 28);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "td");
    i0.ɵɵtext(12);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "td");
    i0.ɵɵconditionalCreate(14, TokensComponent_Conditional_20_For_28_Conditional_14_Template, 1, 1)(15, TokensComponent_Conditional_20_For_28_Conditional_15_Template, 3, 3, "span", 29);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "td");
    i0.ɵɵconditionalCreate(17, TokensComponent_Conditional_20_For_28_Conditional_17_Template, 4, 2, "span", 30)(18, TokensComponent_Conditional_20_For_28_Conditional_18_Template, 3, 3, "app-status-pill", 31);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "td");
    i0.ɵɵconditionalCreate(20, TokensComponent_Conditional_20_For_28_Conditional_20_Template, 3, 3, "span", 32)(21, TokensComponent_Conditional_20_For_28_Conditional_21_Template, 3, 3, "span", 33)(22, TokensComponent_Conditional_20_For_28_Conditional_22_Template, 2, 1, "span", 34);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "td");
    i0.ɵɵelement(24, "app-token-quota-cell", 35);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(25, "td", 36)(26, "button", 37);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Template_button_click_26_listener() { const t_r11 = i0.ɵɵrestoreView(_r9).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.regenerate(t_r11)); });
    i0.ɵɵelement(29, "ph-icon", 38);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(30, "button", 39);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_For_28_Template_button_click_30_listener() { const t_r11 = i0.ɵɵrestoreView(_r9).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.revoke(t_r11)); });
    i0.ɵɵelement(33, "ph-icon", 40);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const t_r11 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.editingId() === t_r11.id ? 2 : 3);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(t_r11.rights ? 5 : 6);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(8, 17, "tokens.rights.edit"))("title", i0.ɵɵpipeBind1(9, 19, "tokens.rights.edit"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 13);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.stamp(t_r11.createdAt));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(t_r11.lastUsed ? 14 : 15);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(t_r11.expiresAt ? 17 : 18);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(t_r11.schemaLibrary ? 20 : !t_r11.spaces || t_r11.spaces.length === 0 ? 21 : 22);
    i0.ɵɵadvance(4);
    i0.ɵɵproperty("perToken", t_r11.rateLimitPerMinute)("effective", t_r11.rateLimitEffective);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(27, 21, "tokens.action.rotateTitle"))("aria-label", i0.ɵɵpipeBind1(28, 23, "tokens.action.rotateAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(31, 25, "tokens.action.revokeTitle"))("aria-label", i0.ɵɵpipeBind1(32, 27, "tokens.action.revokeAriaLabel"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
} }
function TokensComponent_Conditional_20_ForEmpty_29_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 49)(2, "div", 50)(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p", 51);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "button", 8);
    i0.ɵɵlistener("click", function TokensComponent_Conditional_20_ForEmpty_29_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r8); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.showCreateDialog.set(true)); });
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "tokens.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "tokens.empty.body"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 7, "tokens.list.createButton"));
} }
function TokensComponent_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 11)(1, "table")(2, "thead")(3, "tr")(4, "th");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "th");
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "th");
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "th");
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(19, "th");
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "th");
    i0.ɵɵtext(23);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(25, "th");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(26, "tbody");
    i0.ɵɵrepeaterCreate(27, TokensComponent_Conditional_20_For_28_Template, 34, 29, "tr", null, _forTrack0, false, TokensComponent_Conditional_20_ForEmpty_29_Template, 12, 9, "tr");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 8, "tokens.table.label"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 10, "tokens.table.permission"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 12, "tokens.table.created"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 14, "tokens.table.lastUsed"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 16, "tokens.table.expires"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 18, "tokens.table.spaces"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 20, "tokens.table.quota"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.tokens());
} }
export class TokensComponent {
    constructor() {
        this.authApi = inject(AuthApi);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.tokens = signal([], ...(ngDevMode ? [{ debugName: "tokens" }] : /* istanbul ignore next */ []));
        this.selfToken = signal(null, ...(ngDevMode ? [{ debugName: "selfToken" }] : /* istanbul ignore next */ []));
        this.availableSpaces = signal([], ...(ngDevMode ? [{ debugName: "availableSpaces" }] : /* istanbul ignore next */ []));
        this.loading = signal(true, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Null until the last load failed — checked before the empty state, so a failure never reads as "no tokens". */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.showCreateDialog = signal(false, ...(ngDevMode ? [{ debugName: "showCreateDialog" }] : /* istanbul ignore next */ []));
        this.editRightsFor = signal(null, ...(ngDevMode ? [{ debugName: "editRightsFor" }] : /* istanbul ignore next */ []));
        /**
         * Whether the operator switched from the legacy permission control to the per-space matrix.
         *
         * Not a view toggle — the two are mutually exclusive on the wire, and the server refuses a body carrying
         * both rather than silently preferring one. So this decides WHICH field the create request sends.
         */
        /** Just the ids, because the matrix keys rows by id and does not need the rest of a space. */
        /** Second factor for the token being created. `inherit` is today's behaviour for every existing token. */
        this.spacesLoadFailed = signal(false, ...(ngDevMode ? [{ debugName: "spacesLoadFailed" }] : /* istanbul ignore next */ []));
        this.newToken = signal('', ...(ngDevMode ? [{ debugName: "newToken" }] : /* istanbul ignore next */ []));
        this.copied = signal(false, ...(ngDevMode ? [{ debugName: "copied" }] : /* istanbul ignore next */ []));
        this.regenToken = signal('', ...(ngDevMode ? [{ debugName: "regenToken" }] : /* istanbul ignore next */ []));
        this.copiedRegen = signal(false, ...(ngDevMode ? [{ debugName: "copiedRegen" }] : /* istanbul ignore next */ []));
        /** Inline label edit: the id of the token whose label is being edited (null = none), + its draft. */
        this.editingId = signal(null, ...(ngDevMode ? [{ debugName: "editingId" }] : /* istanbul ignore next */ []));
        this.editLabelValue = '';
        /** Operator-first rollup: active / expiring-soon / expired counts (warn/error only shown when > 0). */
        this.summary = computed(() => {
            const ts = this.tokens();
            const expired = ts.filter(t => this.isExpired(t)).length;
            const expiring = ts.filter(t => this.isExpiringSoon(t)).length;
            const tr = (k) => this.transloco.translate(k);
            const items = [{ label: tr('tokens.summary.active'), value: ts.length - expired }];
            if (expiring)
                items.push({ label: tr('tokens.summary.expiring'), value: expiring, variant: 'warn' });
            if (expired)
                items.push({ label: tr('tokens.summary.expired'), value: expired, variant: 'error' });
            return items;
        }, ...(ngDevMode ? [{ debugName: "summary" }] : /* istanbul ignore next */ []));
    }
    /** The token whose rights are being edited, or null. Holding the RECORD rather than an id keeps the dialog
     *  from having to look it up again and disagreeing with the row that opened it. */
    /**
     * A credential's timestamps are absolute, not relative.
     *
     * These read "3 days ago" until 3.0.1. That answers how long, when the question an operator auditing
     * access actually asks is WHEN — which log line, which incident, which deploy. "14 days ago" also
     * quietly rounds: a token expiring in 23 hours and one expiring in 47 both read "tomorrow".
     *
     * Rendered in the VIEWER's locale and timezone by the platform, so it needs no timezone label of its own.
     */
    stamp(v) {
        if (!v)
            return '—';
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
    }
    ngOnInit() {
        this.authApi.getMe().subscribe({ next: (t) => this.selfToken.set(t), error: () => { } });
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => this.availableSpaces.set(spaces),
            error: () => this.spacesLoadFailed.set(true),
        });
        this.load();
    }
    load() {
        this.loading.set(true);
        this.loadError.set(null);
        this.authApi.listTokens().subscribe({
            next: ({ tokens }) => { this.tokens.set(tokens); this.loading.set(false); },
            error: (err) => { this.loadError.set(httpErrorReason(err)); this.loading.set(false); },
        });
    }
    /** The dialog owns the create flow; the page owns the list and the one-time plaintext reveal. */
    onRightsSaved(updated) {
        this.editRightsFor.set(null);
        this.tokens.update(list => list.map(t => (t.id === updated.id ? updated : t)));
        this.toast.success(this.transloco.translate('tokens.rights.saved'));
    }
    onTokenCreated(e) {
        this.showCreateDialog.set(false);
        this.tokens.update(list => [e.token, ...list]);
        this.newToken.set(e.plaintext);
    }
    /**
     * A danger action asked for from inside the editor.
     *
     * The editor emits rather than doing it: this page already owns the confirm dialog, the toast on failure,
     * the list removal, and — the part that decides the shape — the **copy-once banner** that rotate's new
     * secret appears in. A second implementation inside the modal would mean a second banner, and a secret is
     * shown exactly once.
     *
     * The editor CLOSES first, and that is not tidiness: the banner renders on this page, behind the modal. A
     * rotate that left the dialog open would put the only copy of a new credential underneath it.
     */
    dangerFromEditor(t, action) {
        this.editRightsFor.set(null);
        if (action === 'rotate')
            void this.regenerate(t);
        else
            void this.revoke(t);
    }
    async regenerate(t) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('tokens.confirm.rotateTitle'),
            message: this.transloco.translate('tokens.confirm.rotate', { name: t.name }),
            confirmLabel: this.transloco.translate('tokens.rotateButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.clearRegen();
        this.authApi.regenerateToken(t.id).subscribe({
            next: ({ plaintext }) => this.regenToken.set(plaintext),
            error: () => this.toast.error(this.transloco.translate('tokens.error.rotateFailed')),
        });
    }
    async revoke(t) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('tokens.confirm.revokeTitle'),
            message: this.transloco.translate('tokens.confirm.revoke', { name: t.name }),
            confirmLabel: this.transloco.translate('common.revoke'),
            danger: true,
        });
        if (!ok)
            return;
        this.authApi.revokeToken(t.id).subscribe({
            next: () => this.tokens.update(list => list.filter(x => x.id !== t.id)),
            error: () => this.toast.error(this.transloco.translate('tokens.error.revokeFailed')),
        });
    }
    startEditLabel(t) {
        this.editingId.set(t.id);
        this.editLabelValue = t.name;
    }
    cancelEditLabel() {
        this.editingId.set(null);
        this.editLabelValue = '';
    }
    saveLabel(t) {
        const name = this.editLabelValue.trim();
        // A blank or unchanged label is a no-op, not a request — just close the editor.
        if (!name || name === t.name) {
            this.cancelEditLabel();
            return;
        }
        this.authApi.renameToken(t.id, name).subscribe({
            next: ({ token }) => {
                this.tokens.update(list => list.map(x => x.id === t.id ? { ...x, name: token.name } : x));
                this.cancelEditLabel();
            },
            error: () => this.toast.error(this.transloco.translate('tokens.error.renameFailed')),
        });
    }
    clearNew() { this.newToken.set(''); this.copied.set(false); }
    clearRegen() { this.regenToken.set(''); this.copiedRegen.set(false); }
    copyNew() {
        navigator.clipboard.writeText(this.newToken()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }
    copyRegen() {
        navigator.clipboard.writeText(this.regenToken()).then(() => {
            this.copiedRegen.set(true);
            setTimeout(() => this.copiedRegen.set(false), 2000);
        });
    }
    isExpired(t) {
        return !!(t.expiresAt && new Date(t.expiresAt) < new Date());
    }
    /** Not yet expired, but expiring within 7 days — the at-risk state that was invisible before. */
    isExpiringSoon(t) {
        if (!t.expiresAt)
            return false;
        const exp = new Date(t.expiresAt).getTime();
        const now = Date.now();
        return exp > now && exp - now <= 7 * 24 * 60 * 60 * 1000;
    }
    static { this.ɵfac = function TokensComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TokensComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TokensComponent, selectors: [["app-tokens"]], decls: 21, vars: 15, consts: [["role", "alert", 1, "new-token-banner"], [3, "token", "availableSpaces"], [3, "availableSpaces", "spacesLoadFailed"], [2, "display", "block", "margin-bottom", "16px", 3, "heading", "items"], [1, "card"], [1, "card-header"], [1, "card-title"], [2, "display", "flex", "gap", "8px"], [1, "btn-primary", "btn", "btn-sm", 3, "click"], [1, "btn-secondary", "btn", "btn-sm", 3, "click"], [1, "loading-overlay"], ["hscrollTop", "", 1, "table-wrapper"], [1, "new-token-banner-title"], [1, "new-token-banner-warn"], [1, "token-copy-row"], [1, "token-copy-value"], [1, "btn-copy-prominent", 3, "click"], [1, "btn-secondary", "btn", "btn-sm", 2, "margin-top", "12px", 3, "click"], [3, "close", "saved", "rotate", "revoke", "token", "availableSpaces"], [3, "close", "created", "availableSpaces", "spacesLoadFailed"], [1, "spinner"], [3, "retry", "message", "reason"], [2, "font-size", "12.5px", "color", "var(--text-muted)", "margin-top", "8px"], [2, "font-weight", "500"], [2, "display", "inline-flex", "align-items", "center", "gap", "6px"], [2, "margin-left", "8px", "vertical-align", "middle", 3, "rights"], [1, "no-rights"], ["type", "button", 1, "icon-btn", 2, "margin-left", "4px", "vertical-align", "middle", 3, "click"], ["name", "pencil-simple", 3, "size"], [2, "font-style", "italic", "color", "var(--text-muted)"], [2, "display", "inline-flex", "align-items", "center", "gap", "6px", "flex-wrap", "wrap"], ["variant", "ok"], [1, "badge", "badge-gray", 2, "font-style", "italic"], [1, "badge", "badge-green"], [1, "badge", "badge-gray"], [3, "perToken", "effective"], [2, "white-space", "nowrap", "display", "flex", "gap", "6px", "align-items", "center"], [1, "icon-btn", 3, "click"], ["name", "arrows-clockwise", 3, "size"], [1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], ["type", "text", "maxlength", "200", 2, "width", "190px", 3, "ngModelChange", "keydown.enter", "keydown.escape", "ngModel"], [1, "icon-btn", 3, "click", "disabled"], ["name", "check", 3, "size"], [1, "token-status-dot"], [1, "icon-btn", 2, "margin-left", "4px", 3, "click"], [2, "margin-left", "6px", "font-size", "0.75rem", "color", "var(--text-muted)"], ["variant", "error"], ["variant", "warn", 3, "dot"], ["colspan", "7"], [1, "empty-state", 2, "padding", "24px"], [2, "color", "var(--text-secondary)", "font-size", "13px", "margin", "6px 0 14px"]], template: function TokensComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, TokensComponent_Conditional_0_Template, 18, 17, "div", 0);
            i0.ɵɵconditionalCreate(1, TokensComponent_Conditional_1_Template, 18, 17, "div", 0);
            i0.ɵɵconditionalCreate(2, TokensComponent_Conditional_2_Template, 1, 2, "app-token-rights-dialog", 1);
            i0.ɵɵconditionalCreate(3, TokensComponent_Conditional_3_Template, 1, 2, "app-token-create-dialog", 2);
            i0.ɵɵconditionalCreate(4, TokensComponent_Conditional_4_Template, 2, 4, "app-summary-strip", 3);
            i0.ɵɵelementStart(5, "div", 4)(6, "div", 5)(7, "div", 6);
            i0.ɵɵtext(8);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(10, "div", 7)(11, "button", 8);
            i0.ɵɵlistener("click", function TokensComponent_Template_button_click_11_listener() { return ctx.showCreateDialog.set(true); });
            i0.ɵɵtext(12);
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(14, "button", 9);
            i0.ɵɵlistener("click", function TokensComponent_Template_button_click_14_listener() { return ctx.load(); });
            i0.ɵɵtext(15);
            i0.ɵɵpipe(16, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelement(17, "app-own-token-rights");
            i0.ɵɵconditionalCreate(18, TokensComponent_Conditional_18_Template, 2, 0, "div", 10)(19, TokensComponent_Conditional_19_Template, 5, 7)(20, TokensComponent_Conditional_20_Template, 30, 22, "div", 11);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            let tmp_2_0;
            i0.ɵɵconditional(ctx.newToken() ? 0 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.regenToken() ? 1 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_2_0 = ctx.editRightsFor()) ? 2 : -1, tmp_2_0);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showCreateDialog() ? 3 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!ctx.loading() && ctx.tokens().length ? 4 : -1);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 9, "tokens.list.title"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(13, 11, "tokens.list.createButton"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 13, "tokens.list.refreshButton"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.loading() ? 18 : ctx.loadError() !== null ? 19 : 20);
        } }, dependencies: [CommonModule, FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.NgModel, PhIconComponent,
            SummaryStripComponent, StatusPillComponent, HscrollTopDirective,
            ErrorStateComponent, RightsGlyphComponent, TokenCreateDialogComponent,
            TokenRightsDialogComponent, OwnTokenRightsComponent, TokenQuotaCellComponent,
            TranslocoPipe], styles: [".new-token-banner[_ngcontent-%COMP%] {\n      background: var(--success-dim);\n      border: 2px solid color-mix(in srgb, var(--success) 50%, transparent);\n      border-radius: var(--radius-md);\n      padding: 20px;\n      margin-bottom: 20px;\n    }\n    .new-token-banner-title[_ngcontent-%COMP%] {\n      font-size: 14px;\n      font-weight: 600;\n      color: var(--success);\n      margin-bottom: 4px;\n    }\n    .new-token-banner-warn[_ngcontent-%COMP%] {\n      font-size: 12px;\n      color: var(--text-secondary);\n      margin-bottom: 12px;\n    }\n    .token-copy-row[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      padding: 10px 14px;\n    }\n    .token-copy-value[_ngcontent-%COMP%] {\n      flex: 1;\n      font-family: var(--font-mono);\n      font-size: 13px;\n      word-break: break-all;\n      color: var(--text-primary);\n    }\n    .btn-copy-prominent[_ngcontent-%COMP%] {\n      background: var(--success);\n      color: var(--text-on-accent);\n      border: none;\n      border-radius: var(--radius-sm);\n      padding: 8px 18px;\n      font-size: 13px;\n      font-weight: 600;\n      cursor: pointer;\n      white-space: nowrap;\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      transition: opacity var(--transition);\n    }\n    .btn-copy-prominent[_ngcontent-%COMP%]:hover { opacity: 0.88; }\n    .scope-hint[_ngcontent-%COMP%] {\n      font-size: 11px;\n      color: var(--text-muted);\n      margin-top: 3px;\n    }\n    .form-grid[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-columns: 1fr 160px;\n      gap: 12px;\n      align-items: start;\n    }\n    .form-grid-bottom[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 12px;\n      align-items: flex-end;\n      flex-wrap: wrap;\n      margin-top: 4px;\n    }\n    .checkbox-field[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 6px;\n      padding-bottom: 6px;\n    }\n    .checkbox-field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n      margin: 0;\n      font-size: 13px;\n      color: var(--text-secondary);\n      text-transform: none;\n      letter-spacing: 0;\n      font-weight: 400;\n    }\n    .spaces-toggle-list[_ngcontent-%COMP%] {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 6px;\n      margin-top: 6px;\n    }\n    .space-toggle-item[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 4px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 12px;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .space-toggle-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n    .space-toggle-item[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }\n    .space-toggle-item[_ngcontent-%COMP%]   .space-id[_ngcontent-%COMP%] { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }\n    .permission-radio-group[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 8px;\n      flex-wrap: wrap;\n      margin-top: 6px;\n    }\n    .permission-radio-item[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 6px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 13px;\n      font-weight: 500;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .permission-radio-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }\n    .permission-radio-item[_ngcontent-%COMP%]   input[type=radio][_ngcontent-%COMP%] { width: 14px; height: 14px; margin: 0; flex-shrink: 0; }\n    .permission-help[_ngcontent-%COMP%] {\n      display: flex; align-items: flex-start; gap: 7px; margin: 8px 0 0;\n      font-size: 12px; line-height: 1.45; color: var(--text-secondary);\n    }\n    .permission-help[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }\n    .capability-table[_ngcontent-%COMP%] {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 11px;\n      margin-top: 10px;\n      color: var(--text-secondary);\n    }\n    .capability-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n      text-align: center;\n      font-weight: 600;\n      padding: 4px 6px;\n      border-bottom: 1px solid var(--border-muted);\n      white-space: nowrap;\n    }\n    .capability-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]:first-child { text-align: left; }\n    .capability-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n      text-align: center;\n      padding: 4px 6px;\n      border-bottom: 1px solid var(--border-muted);\n    }\n    .capability-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { text-align: left; font-weight: 500; color: var(--text-primary); }\n    .capability-table[_ngcontent-%COMP%]   tr.active-row[_ngcontent-%COMP%] { background: var(--bg-elevated); }\n    .cap-yes[_ngcontent-%COMP%] { color: var(--success); }\n    .cap-no[_ngcontent-%COMP%]  { color: var(--text-muted); }\n    .token-status-dot[_ngcontent-%COMP%] {\n      display: inline-block;\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      margin-right: 5px;\n      flex-shrink: 0;\n    }\n    .dot-active[_ngcontent-%COMP%] { background: var(--success); }\n    .dot-expired[_ngcontent-%COMP%] { background: var(--error); }\n    .styled-input[_ngcontent-%COMP%] {\n      padding: 5px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-surface);\n      color: var(--text-primary);\n      font-family: var(--font);\n    }\n    .dialog-backdrop[_ngcontent-%COMP%] {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog[_ngcontent-%COMP%] {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }\n  \n\n\n\n  .no-rights[_ngcontent-%COMP%] { margin-left: 8px; font-size: 11px; color: var(--text-muted); font-style: italic;\n               vertical-align: middle; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TokensComponent, [{
        type: Component,
        args: [{ selector: 'app-tokens', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent, ModalDirective,
                    SummaryStripComponent, StatusPillComponent, HscrollTopDirective,
                    ErrorStateComponent, RightsGlyphComponent, TokenCreateDialogComponent,
                    TokenRightsDialogComponent, OwnTokenRightsComponent, TokenQuotaCellComponent], template: `
    <!-- New token success banner -->
    @if (newToken()) {
      <div class="new-token-banner" role="alert">
        <div class="new-token-banner-title">{{ 'tokens.created.title' | transloco }}</div>
        <div class="new-token-banner-warn">{{ 'tokens.created.warning' | transloco }}</div>
        <div class="token-copy-row">
          <span class="token-copy-value" [attr.aria-label]="'tokens.created.newTokenValueAria' | transloco">{{ newToken() }}</span>
          <button class="btn-copy-prominent" [attr.aria-label]="'tokens.created.copyNewAria' | transloco" (click)="copyNew()">
            @if (copied()) { {{ 'common.copied' | transloco }} } @else { {{ 'tokens.created.copyButton' | transloco }} }
          </button>
        </div>
        <button class="btn-secondary btn btn-sm" style="margin-top:12px;" (click)="clearNew()">{{ 'tokens.created.dismissButton' | transloco }}</button>
      </div>
    }

    <!-- Rotated token banner -->
    @if (regenToken()) {
      <div class="new-token-banner" role="alert">
        <div class="new-token-banner-title">{{ 'tokens.rotated.title' | transloco }}</div>
        <div class="new-token-banner-warn">{{ 'tokens.rotated.warning' | transloco }}</div>
        <div class="token-copy-row">
          <span class="token-copy-value" [attr.aria-label]="'tokens.rotated.tokenValueAria' | transloco">{{ regenToken() }}</span>
          <button class="btn-copy-prominent" [attr.aria-label]="'tokens.rotated.copyAria' | transloco" (click)="copyRegen()">
            @if (copiedRegen()) { {{ 'common.copied' | transloco }} } @else { {{ 'tokens.created.copyButton' | transloco }} }
          </button>
        </div>
        <button class="btn-secondary btn btn-sm" style="margin-top:12px;" (click)="clearRegen()">{{ 'tokens.created.dismissButton' | transloco }}</button>
      </div>
    }

    @if (editRightsFor(); as t) {
      <app-token-rights-dialog
        [token]="t"
        [availableSpaces]="availableSpaces()"
        (close)="editRightsFor.set(null)"
        (saved)="onRightsSaved($event)"
        (rotate)="dangerFromEditor(t, 'rotate')"
        (revoke)="dangerFromEditor(t, 'revoke')"/>
    }

    <!-- The create dialog lives in TokenCreateDialogComponent. It was over a quarter of this file and
         is a self-contained flow with thirteen pieces of its own state; leaving it here is what kept
         this component over the god-file ceiling. -->
    @if (showCreateDialog()) {
      <app-token-create-dialog
        [availableSpaces]="availableSpaces()"
        [spacesLoadFailed]="spacesLoadFailed()"
        (close)="showCreateDialog.set(false)"
        (created)="onTokenCreated($event)"/>
    }

    <!-- Operator summary -->
    @if (!loading() && tokens().length) {
      <app-summary-strip [heading]="'tokens.list.title' | transloco" [items]="summary()" style="display:block;margin-bottom:16px;"/>
    }

    <!-- Token list -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ 'tokens.list.title' | transloco }}</div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'tokens.list.createButton' | transloco }}</button>
          <button class="btn-secondary btn btn-sm" (click)="load()">{{ 'tokens.list.refreshButton' | transloco }}</button>
        </div>
      </div>

      <!-- Your own rights, always, above the list. The list needs admin and 403s for everyone else, so without
           this a non-admin opening this page saw an error where their own access should be. Rendered outside the
           loading branch because it does not depend on the list request at all. -->
      <app-own-token-rights/>

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (loadError() !== null) {
        <!-- The full list is admin-only. That is not a fault to retry your way out of, so it is said plainly
             here rather than left as a bare 403 reason. -->
        <app-error-state [message]="'tokens.loadError' | transloco" [reason]="loadError() ?? ''" (retry)="load()" />
        <p style="font-size:12.5px;color:var(--text-muted);margin-top:8px;">{{ 'tokens.listNeedsAdmin' | transloco }}</p>
      } @else {
        <div class="table-wrapper" hscrollTop>
          <table>
            <thead>
              <tr>
                <th>{{ 'tokens.table.label' | transloco }}</th><th>{{ 'tokens.table.permission' | transloco }}</th><th>{{ 'tokens.table.created' | transloco }}</th><th>{{ 'tokens.table.lastUsed' | transloco }}</th><th>{{ 'tokens.table.expires' | transloco }}</th><th>{{ 'tokens.table.spaces' | transloco }}</th><th>{{ 'tokens.table.quota' | transloco }}</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (t of tokens(); track t.id) {
                <tr>
                  <td style="font-weight:500;">
                    @if (editingId() === t.id) {
                      <span style="display:inline-flex;align-items:center;gap:6px;">
                        <input type="text" [(ngModel)]="editLabelValue" maxlength="200" style="width:190px;"
                          [attr.aria-label]="'tokens.action.editLabelAriaLabel' | transloco"
                          (keydown.enter)="saveLabel(t)" (keydown.escape)="cancelEditLabel()" />
                        <button class="icon-btn" [attr.title]="'common.save' | transloco" [attr.aria-label]="'common.save' | transloco"
                          (click)="saveLabel(t)" [disabled]="!editLabelValue.trim()"><ph-icon name="check" [size]="14"/></button>
                        <button class="icon-btn" [attr.title]="'common.cancel' | transloco" [attr.aria-label]="'common.cancel' | transloco"
                          (click)="cancelEditLabel()"><ph-icon name="x" [size]="14"/></button>
                      </span>
                    } @else {
                      <span class="token-status-dot" [class.dot-active]="!isExpired(t)" [class.dot-expired]="isExpired(t)"></span>
                      {{ t.name }}
                      <button class="icon-btn" style="margin-left:4px;" [attr.title]="'tokens.action.editLabelTitle' | transloco"
                        [attr.aria-label]="'tokens.action.editLabelAriaLabel' | transloco" (click)="startEditLabel(t)"><ph-icon name="pencil-simple" [size]="13"/></button>
                      @if (t.id === selfToken()?.id) { <span style="margin-left:6px;font-size:0.75rem;color:var(--text-muted);">{{ 'tokens.table.currentSession' | transloco }}</span> }
                    }
                  </td>
                  <td>
                    @if (t.rights) {
                      <app-rights-glyph [rights]="t.rights" style="margin-left:8px;vertical-align:middle;"/>
                    } @else {
                      <span class="no-rights" [attr.title]="'tokens.rights.none' | transloco">{{ 'tokens.rights.none' | transloco }}</span>
                    }
                    <button class="icon-btn" type="button" style="margin-left:4px;vertical-align:middle;"
                            [attr.aria-label]="'tokens.rights.edit' | transloco"
                            [attr.title]="'tokens.rights.edit' | transloco"
                            (click)="editRightsFor.set(t)">
                      <ph-icon name="pencil-simple" [size]="13"/>
                    </button>
                  </td>
                  <td>{{ stamp(t.createdAt) }}</td>
                  <td>
                    @if (t.lastUsed) {
                      {{ stamp(t.lastUsed) }}
                    } @else {
                      <span style="font-style:italic;color:var(--text-muted);">{{ 'tokens.table.neverUsed' | transloco }}</span>
                    }
                  </td>
                  <td>
                    @if (t.expiresAt) {
                      <span style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        @if (isExpired(t)) { <app-status-pill variant="error">{{ 'tokens.table.expired' | transloco }}</app-status-pill> }
                        @else if (isExpiringSoon(t)) { <app-status-pill variant="warn" [dot]="true">{{ 'tokens.table.expiringSoon' | transloco }}</app-status-pill> }
                        {{ stamp(t.expiresAt) }}
                      </span>
                    } @else {
                      <app-status-pill variant="ok">{{ 'tokens.table.noExpiry' | transloco }}</app-status-pill>
                    }
                  </td>
                  <td>
                    @if (t.schemaLibrary) {
                      <span class="badge badge-gray" style="font-style:italic;">{{ 'tokens.badge.schemaLibraryOnly' | transloco }}</span>
                    } @else if (!t.spaces || t.spaces.length === 0) {
                      <span class="badge badge-green">{{ 'tokens.badge.allSpaces' | transloco }}</span>
                    } @else {
                      <span class="badge badge-gray">{{ t.spaces.join(', ') }}</span>
                    }
                  </td>
                  <td>
                    <app-token-quota-cell [perToken]="t.rateLimitPerMinute" [effective]="t.rateLimitEffective" />
                  </td>
                  <td style="white-space:nowrap; display:flex; gap:6px; align-items:center;">
                    <button class="icon-btn" [attr.title]="'tokens.action.rotateTitle' | transloco" [attr.aria-label]="'tokens.action.rotateAriaLabel' | transloco" (click)="regenerate(t)"><ph-icon name="arrows-clockwise" [size]="14"/></button>
                    <button class="icon-btn danger" [attr.title]="'tokens.action.revokeTitle' | transloco" [attr.aria-label]="'tokens.action.revokeAriaLabel' | transloco" (click)="revoke(t)"><ph-icon name="x" [size]="14"/></button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state" style="padding:24px;">
                    <h3>{{ 'tokens.empty.title' | transloco }}</h3>
                    <p style="color:var(--text-secondary);font-size:13px;margin:6px 0 14px;">{{ 'tokens.empty.body' | transloco }}</p>
                    <button class="btn-primary btn btn-sm" (click)="showCreateDialog.set(true)">{{ 'tokens.list.createButton' | transloco }}</button>
                  </div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `, styles: ["\n    .new-token-banner {\n      background: var(--success-dim);\n      border: 2px solid color-mix(in srgb, var(--success) 50%, transparent);\n      border-radius: var(--radius-md);\n      padding: 20px;\n      margin-bottom: 20px;\n    }\n    .new-token-banner-title {\n      font-size: 14px;\n      font-weight: 600;\n      color: var(--success);\n      margin-bottom: 4px;\n    }\n    .new-token-banner-warn {\n      font-size: 12px;\n      color: var(--text-secondary);\n      margin-bottom: 12px;\n    }\n    .token-copy-row {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      padding: 10px 14px;\n    }\n    .token-copy-value {\n      flex: 1;\n      font-family: var(--font-mono);\n      font-size: 13px;\n      word-break: break-all;\n      color: var(--text-primary);\n    }\n    .btn-copy-prominent {\n      background: var(--success);\n      color: var(--text-on-accent);\n      border: none;\n      border-radius: var(--radius-sm);\n      padding: 8px 18px;\n      font-size: 13px;\n      font-weight: 600;\n      cursor: pointer;\n      white-space: nowrap;\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      transition: opacity var(--transition);\n    }\n    .btn-copy-prominent:hover { opacity: 0.88; }\n    .scope-hint {\n      font-size: 11px;\n      color: var(--text-muted);\n      margin-top: 3px;\n    }\n    .form-grid {\n      display: grid;\n      grid-template-columns: 1fr 160px;\n      gap: 12px;\n      align-items: start;\n    }\n    .form-grid-bottom {\n      display: flex;\n      gap: 12px;\n      align-items: flex-end;\n      flex-wrap: wrap;\n      margin-top: 4px;\n    }\n    .checkbox-field {\n      display: flex;\n      align-items: center;\n      gap: 6px;\n      padding-bottom: 6px;\n    }\n    .checkbox-field label {\n      margin: 0;\n      font-size: 13px;\n      color: var(--text-secondary);\n      text-transform: none;\n      letter-spacing: 0;\n      font-weight: 400;\n    }\n    .spaces-toggle-list {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 6px;\n      margin-top: 6px;\n    }\n    .space-toggle-item {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 4px 10px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 12px;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .space-toggle-item:hover { background: var(--bg-elevated); }\n    .space-toggle-item input[type=checkbox] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }\n    .space-toggle-item .space-id { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }\n    .permission-radio-group {\n      display: flex;\n      gap: 8px;\n      flex-wrap: wrap;\n      margin-top: 6px;\n    }\n    .permission-radio-item {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 6px 14px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      cursor: pointer;\n      font-size: 13px;\n      font-weight: 500;\n      background: var(--bg-surface);\n      transition: background var(--transition), border-color var(--transition);\n      user-select: none;\n    }\n    .permission-radio-item:hover { background: var(--bg-elevated); }\n    .permission-radio-item input[type=radio] { width: 14px; height: 14px; margin: 0; flex-shrink: 0; }\n    .permission-help {\n      display: flex; align-items: flex-start; gap: 7px; margin: 8px 0 0;\n      font-size: 12px; line-height: 1.45; color: var(--text-secondary);\n    }\n    .permission-help ph-icon { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }\n    .capability-table {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 11px;\n      margin-top: 10px;\n      color: var(--text-secondary);\n    }\n    .capability-table th {\n      text-align: center;\n      font-weight: 600;\n      padding: 4px 6px;\n      border-bottom: 1px solid var(--border-muted);\n      white-space: nowrap;\n    }\n    .capability-table th:first-child { text-align: left; }\n    .capability-table td {\n      text-align: center;\n      padding: 4px 6px;\n      border-bottom: 1px solid var(--border-muted);\n    }\n    .capability-table td:first-child { text-align: left; font-weight: 500; color: var(--text-primary); }\n    .capability-table tr.active-row { background: var(--bg-elevated); }\n    .cap-yes { color: var(--success); }\n    .cap-no  { color: var(--text-muted); }\n    .token-status-dot {\n      display: inline-block;\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      margin-right: 5px;\n      flex-shrink: 0;\n    }\n    .dot-active { background: var(--success); }\n    .dot-expired { background: var(--error); }\n    .styled-input {\n      padding: 5px 8px;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-sm);\n      font-size: 13px;\n      background: var(--bg-surface);\n      color: var(--text-primary);\n      font-family: var(--font);\n    }\n    .dialog-backdrop {\n      position: fixed;\n      inset: 0;\n      background: var(--bg-scrim);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n    }\n    .dialog {\n      background: var(--bg-primary);\n      border: 1px solid var(--border);\n      border-radius: var(--radius-lg);\n      padding: 24px;\n      width: 90%;\n      max-width: 600px;\n      max-height: 90vh;\n      overflow-y: auto;\n    }\n    .dialog-header {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n    }\n  /* A token with no rights matrix. Muted and small: it is an absence, not a level \u2014 the pen beside it\n     is the thing to act on. Before 3.0.1 this row showed nothing at all and no pen, so a rightless\n     token could be seen and not fixed. */\n  .no-rights { margin-left: 8px; font-size: 11px; color: var(--text-muted); font-style: italic;\n               vertical-align: middle; }\n"] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TokensComponent, { className: "TokensComponent", filePath: "app/pages/settings/tokens.component.ts", lineNumber: 208 }); })();
