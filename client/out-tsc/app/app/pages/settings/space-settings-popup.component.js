/**
 * The space-settings pop-up — identity, schema, duplicates and the Danger Zone for ONE space.
 *
 * ## Why it is its own component
 *
 * It was 84 lines of template inside `spaces.component`, reachable only from that page's own table. It is a
 * self-contained modal driven by a single signal — set `SpaceSettingsState.settingsSpace(space)` and it
 * appears — so hosting it somewhere else was only ever a question of who provides the service.
 *
 * That second host is the Brain page (U-1): a cog at the far right of the tab strip opens these settings for
 * the space you are already looking at, which is also where the per-space RIGHTS question is answered now that
 * the matrix has shipped. This extraction is the step that makes that a re-host rather than a rewrite, and it
 * is deliberately behaviour-neutral so the two changes can be reviewed apart.
 *
 * ## The template was MOVED, not retyped
 *
 * By line range, and asserted byte-identical against the original. A refactor that retypes eighty lines of
 * template is a refactor that loses one of them, and a modal that renders subtly wrong passes every build.
 *
 * ## Where the CSS lives
 *
 * All seven `.sp-*` rules are in `space-dialog.styles.ts` (lines 55-69) and nowhere else. I had claimed five of
 * them were inline in `spaces.component`'s own `styles` — that was a miscount: the grep behind it matched the
 * `<!-- sp-body -->` closing comments in the template, not CSS. There is one home for these rules, which is why
 * this extraction needs no style surgery at all.
 *
 * ## What came with it, and what deliberately did not
 *
 * `governedBy`, `saveSettings` and `attemptClose` moved — they exist only to serve this template. `canLeave`
 * and the `beforeunload` handler stayed on the Spaces page: they are ROUTE concerns, and a modal that can be
 * opened from two pages must not own either page's navigation guard.
 *
 * The discard prompt moved to the SERVICE rather than being copied, because both the modal's (X) and the
 * route guard need it. Two copies of "are you sure you want to lose these edits" is two places for the answer
 * to drift.
 */
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ModalDirective } from '../../shared/modal.directive';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SpacesApi } from '../../core/spaces-api.service';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SpaceSettingsTabComponent } from './space-settings-tab.component';
import { SpaceSchemaTabComponent } from './space-schema-tab.component';
import { SpaceDuplicatesTabComponent } from './space-duplicates-tab.component';
import { SpaceDangerTabComponent } from './space-danger-tab.component';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import * as i0 from "@angular/core";
const _c0 = a0 => ({ networks: a0 });
function SpaceSettingsPopupComponent_Conditional_0_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "app-status-pill", 6);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("title", i0.ɵɵpipeBind2(1, 2, "spaces.popup.governedHint", i0.ɵɵpureFunction1(7, _c0, ctx)));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 5, "spaces.popup.governed"), " ");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_27_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-space-settings-tab");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_28_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-space-schema-tab");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-space-duplicates-tab");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_30_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-space-danger-tab");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.settingsError());
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r1.state.settingsNotice());
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 18);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_3_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.state.closeSettings()); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 1, "spaces.popup.footer.done"), " ");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_4_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 20);
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 19);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_4_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.saveSettings()); });
    i0.ɵɵconditionalCreate(1, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_4_Conditional_1_Template, 1, 0, "span", 20);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("disabled", ctx_r1.state.settingsSaving());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsSaving() ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 3, "spaces.popup.footer.saveChanges"), " ");
} }
function SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵconditionalCreate(1, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_1_Template, 2, 1, "div", 14);
    i0.ɵɵconditionalCreate(2, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_2_Template, 2, 1, "div", 15);
    i0.ɵɵconditionalCreate(3, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_3_Template, 3, 3, "button", 16)(4, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Conditional_4_Template, 4, 5, "button", 17);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsError() ? 1 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsNotice() ? 2 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsNotice() ? 3 : 4);
} }
function SpaceSettingsPopupComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
    i0.ɵɵlistener("dismiss", function SpaceSettingsPopupComponent_Conditional_0_Template_div_dismiss_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.attemptClose()); });
    i0.ɵɵelementStart(2, "div", 2)(3, "div", 3)(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "div", 5);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(8, SpaceSettingsPopupComponent_Conditional_0_Conditional_8_Template, 4, 9, "app-status-pill", 6);
    i0.ɵɵelementStart(9, "button", 7);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Template_button_click_9_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.attemptClose()); });
    i0.ɵɵelement(11, "ph-icon", 8);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(12, "div", 9);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementStart(14, "button", 10);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Template_button_click_14_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.settingsTab.set("settings")); });
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "button", 10);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Template_button_click_17_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.settingsTab.set("schema")); });
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "button", 10);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Template_button_click_20_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.settingsTab.set("duplicates")); });
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "button", 11);
    i0.ɵɵlistener("click", function SpaceSettingsPopupComponent_Conditional_0_Template_button_click_23_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.state.settingsTab.set("danger")); });
    i0.ɵɵtext(24);
    i0.ɵɵpipe(25, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(26, "div", 12);
    i0.ɵɵconditionalCreate(27, SpaceSettingsPopupComponent_Conditional_0_Conditional_27_Template, 1, 0, "app-space-settings-tab");
    i0.ɵɵconditionalCreate(28, SpaceSettingsPopupComponent_Conditional_0_Conditional_28_Template, 1, 0, "app-space-schema-tab");
    i0.ɵɵconditionalCreate(29, SpaceSettingsPopupComponent_Conditional_0_Conditional_29_Template, 1, 0, "app-space-duplicates-tab");
    i0.ɵɵconditionalCreate(30, SpaceSettingsPopupComponent_Conditional_0_Conditional_30_Template, 1, 0, "app-space-danger-tab");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(31, SpaceSettingsPopupComponent_Conditional_0_Conditional_31_Template, 5, 3, "div", 13);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_4_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("appModal", ctx_r1.state.settingsSpace().label);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(ctx_r1.state.settingsSpace().label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.state.settingsSpace().id);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_4_0 = ctx_r1.governedBy()) ? 8 : -1, tmp_4_0);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(10, 28, "common.close"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(13, 30, "spaces.settings.tabsAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.state.settingsTab() === "settings");
    i0.ɵɵattribute("aria-selected", ctx_r1.state.settingsTab() === "settings");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(16, 32, "spaces.popup.tab.settings"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.state.settingsTab() === "schema");
    i0.ɵɵattribute("aria-selected", ctx_r1.state.settingsTab() === "schema");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 34, "spaces.popup.tab.schema"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.state.settingsTab() === "duplicates");
    i0.ɵɵattribute("aria-selected", ctx_r1.state.settingsTab() === "duplicates");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 36, "spaces.popup.tab.duplicates"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.state.settingsTab() === "danger");
    i0.ɵɵattribute("aria-selected", ctx_r1.state.settingsTab() === "danger");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(25, 38, "spaces.popup.tab.dangerZone"));
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r1.state.settingsTab() === "settings" ? 27 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsTab() === "schema" ? 28 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsTab() === "duplicates" ? 29 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsTab() === "danger" ? 30 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.state.settingsTab() !== "danger" && ctx_r1.state.settingsTab() !== "duplicates" ? 31 : -1);
} }
export class SpaceSettingsPopupComponent {
    constructor() {
        this.state = inject(SpaceSettingsState);
        this.spacesApi = inject(SpacesApi);
        this.transloco = inject(TranslocoService);
        /** The list store, so a successful save updates the row behind the modal. Both hosts provide it. */
        this.store = inject(SpacesStore);
        /**
         * A save that was APPLIED, with the updated space.
         *
         * The store row behind the modal is already patched by `applySpace`, which is enough for the spaces
         * page — it renders from that store. The Brain host does not: it holds its own space list (with per-space
         * stats attached), so without this a rename saved from the Brain cog left the old label in the sidebar
         * that had just opened the dialog. Emitting the record rather than a bare signal means the host can patch
         * the one row instead of refetching the list.
         *
         * NOT emitted on the 202 vote_pending path: nothing has been applied yet, and a host that patched its
         * row there would show a change the network has not agreed to.
         */
        this.saved = output();
        /**
         * Which networks govern this space, as a label list — or null when none do.
         *
         * Deliberately not keyed on `networkStatus`: that reports whether something is *happening* (a vote, a sync,
         * a degraded peer), and a quiet network still means Save opens a round. The question the badge answers is
         * "is this space governed", which is membership.
         */
        this.governedBy = computed(() => {
            const nets = this.state.settingsSpace()?.networks ?? [];
            return nets.length > 0 ? nets.map(n => n.label).join(', ') : null;
        }, ...(ngDevMode ? [{ debugName: "governedBy" }] : /* istanbul ignore next */ []));
    }
    /** Close the pop-up, prompting first if the editor has unsaved edits. */
    async attemptClose() {
        if (await this.state.confirmDiscardIfDirty())
            this.state.closeSettings();
    }
    saveSettings() {
        const target = this.state.settingsSpace();
        if (!target)
            return;
        this.state.settingsSaving.set(true);
        this.state.settingsError.set('');
        this.state.settingsNotice.set('');
        this.spacesApi.updateSpace(target.id, {
            label: this.state.stForm.label.trim() || target.label,
            maxGiB: this.state.stForm.maxGiB,
            // NO recordTtlDays. It moved to the Danger Zone, which saves itself; this tab has only a note pointing
            // there. Echoing the stored value back was harmless while it was one number and is not now: the space
            // tier is five buckets, and a scalar write REPLACES the whole object — so a label edit would have
            // flattened every per-collection window to one figure.
            documentExtraction: this.state.stForm.documentExtraction || null, // F11-c ('' = inherit instance default)
            imageAnalysis: this.state.stForm.imageAnalysis || null, // '' = inherit instance default
            audioAnalysis: this.state.stForm.audioAnalysis || null,
            videoAnalysis: this.state.stForm.videoAnalysis || null,
            textAnalysis: this.state.stForm.textAnalysis || null,
            meta: this.state.buildMeta(),
            // Save persists the state the editor is showing. Without this the PATCH merges, so a type deleted in
            // the UI is simply not mentioned and the server keeps it — the delete appears to work, survives the
            // save, and is still there on reload.
            typeSchemasMode: 'replace',
        }).subscribe({
            next: (result) => {
                this.state.settingsSaving.set(false);
                // A networked space does not apply a meta change on the spot: the server opens a vote round per
                // network and answers 202 with no `space`. Destructuring it as one threw inside this callback —
                // which RxJS does not route to `error` — so Save appeared to do nothing at all, and the editor
                // then asked whether to discard the change it had just submitted. Say what happened instead.
                if (result.status === 'vote_pending') {
                    this.state.settingsNotice.set(this.transloco.translate('spaces.settings.votePending', {
                        networks: result.rounds.map(r => r.networkLabel).join(', '),
                    }));
                    this.state.markPristine(); // it is submitted; it is not an unsaved edit any more
                    return; // stay open so the notice is read, unlike the applied path
                }
                this.store.applySpace(result.space);
                this.saved.emit(result.space);
                // Re-baseline BEFORE closing. The dirty snapshot was only ever taken when a space was opened, so
                // a successful save left it stale: the editor still compared against the pre-save values and
                // reported unsaved changes for edits that were already persisted. Closing here happened to hide
                // it, but any path that keeps the dialog open (or reopens it without a full load) nagged — and a
                // discard prompt after a save teaches people to click through discard prompts.
                this.state.markPristine();
                this.state.closeSettings();
            },
            error: (err) => { this.state.settingsSaving.set(false); this.state.settingsError.set(err.error?.error ?? this.transloco.translate('spaces.error.saveFailed')); },
        });
    }
    static { this.ɵfac = function SpaceSettingsPopupComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceSettingsPopupComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceSettingsPopupComponent, selectors: [["app-space-settings-popup"]], outputs: { saved: "saved" }, decls: 1, vars: 1, consts: [[1, "sp-backdrop"], [1, "sp-panel", 3, "dismiss", "appModal"], [1, "sp-header"], [2, "flex", "1", "min-width", "0"], [2, "font-weight", "600", "font-size", "16px", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [2, "font-size", "12px", "color", "var(--text-muted)", "font-family", "var(--font-mono)"], ["variant", "pending", "icon", "link"], [1, "icon-btn", 3, "click"], ["name", "x", 3, "size"], ["role", "tablist", 1, "sp-tabs"], ["role", "tab", 1, "sp-tab", 3, "click"], ["role", "tab", 1, "sp-tab", "danger-tab", 3, "click"], [1, "sp-body"], [1, "sp-footer"], [1, "alert", "alert-error", 2, "flex", "1", "margin", "0", "padding", "6px 12px", "font-size", "13px"], [1, "alert", "alert-info", 2, "flex", "1", "margin", "0", "padding", "6px 12px", "font-size", "13px"], ["type", "button", 1, "btn", "btn-primary"], ["type", "button", 1, "btn", "btn-primary", 3, "disabled"], ["type", "button", 1, "btn", "btn-primary", 3, "click"], ["type", "button", 1, "btn", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"]], template: function SpaceSettingsPopupComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, SpaceSettingsPopupComponent_Conditional_0_Template, 32, 40, "div", 0);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.state.settingsSpace() ? 0 : -1);
        } }, dependencies: [PhIconComponent, ModalDirective, StatusPillComponent,
            SpaceSettingsTabComponent, SpaceSchemaTabComponent, SpaceDuplicatesTabComponent, SpaceDangerTabComponent,
            TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceSettingsPopupComponent, [{
        type: Component,
        args: [{ selector: 'app-space-settings-popup', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [
                    TranslocoPipe, PhIconComponent, ModalDirective, StatusPillComponent,
                    SpaceSettingsTabComponent, SpaceSchemaTabComponent, SpaceDuplicatesTabComponent, SpaceDangerTabComponent,
                ], template: `
    <!-- SETTINGS POPUP -->
    @if (state.settingsSpace()) {
      <div class="sp-backdrop">
        <div class="sp-panel" [appModal]="state.settingsSpace()!.label" (dismiss)="attemptClose()">
          <div class="sp-header">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ state.settingsSpace()!.label }}</div>
              <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);">{{ state.settingsSpace()!.id }}</div>
            </div>
            <!-- Governed BEFORE you type, not after you press Save.
                 Saving a networked space answers 202 vote_pending: the change is submitted for a vote
                 rather than applied. That used to be discovered by pressing the button — the notice
                 explains it afterwards, which is the wrong end of the interaction to learn it. The
                 membership is already on the space record (its networks array), so this costs no request. -->
            @if (governedBy(); as nets) {
              <!-- The link icon, because that is what the sidebar already uses for Networks; the pill has
                   to read as the same concept, not a new one. (No users/gavel icon is registered, and an
                   unregistered name renders BLANK with no error.) -->
              <app-status-pill variant="pending" icon="link"
                [attr.title]="'spaces.popup.governedHint' | transloco: { networks: nets }">
                {{ 'spaces.popup.governed' | transloco }}
              </app-status-pill>
            }
            <button class="icon-btn" [attr.aria-label]="'common.close' | transloco" (click)="attemptClose()"><ph-icon name="x" [size]="14"/></button>
          </div>
          <div class="sp-tabs" role="tablist" [attr.aria-label]="'spaces.settings.tabsAriaLabel' | transloco">
            <button class="sp-tab" [class.active]="state.settingsTab()==='settings'" [attr.aria-selected]="state.settingsTab()==='settings'" role="tab" (click)="state.settingsTab.set('settings')">{{ 'spaces.popup.tab.settings' | transloco }}</button>
            <button class="sp-tab" [class.active]="state.settingsTab()==='schema'" [attr.aria-selected]="state.settingsTab()==='schema'" role="tab"   (click)="state.settingsTab.set('schema')">{{ 'spaces.popup.tab.schema' | transloco }}</button>
            <button class="sp-tab" [class.active]="state.settingsTab()==='duplicates'" [attr.aria-selected]="state.settingsTab()==='duplicates'" role="tab" (click)="state.settingsTab.set('duplicates')">{{ 'spaces.popup.tab.duplicates' | transloco }}</button>
            <button class="sp-tab danger-tab" [class.active]="state.settingsTab()==='danger'" [attr.aria-selected]="state.settingsTab()==='danger'" role="tab" (click)="state.settingsTab.set('danger')">{{ 'spaces.popup.tab.dangerZone' | transloco }}</button>
          </div>
          <div class="sp-body">

            <!-- SETTINGS TAB -->
            @if (state.settingsTab() === 'settings') {
              <app-space-settings-tab />
            }

            <!-- SCHEMA TAB -->
            @if (state.settingsTab() === 'schema') {
              <app-space-schema-tab />
            }

            <!-- DUPLICATES TAB -->
            @if (state.settingsTab() === 'duplicates') {
              <app-space-duplicates-tab />
            }

            <!-- DANGER ZONE TAB -->
            @if (state.settingsTab() === 'danger') {
              <app-space-danger-tab />
            }
          </div><!-- sp-body -->

          @if (state.settingsTab() !== 'danger' && state.settingsTab() !== 'duplicates') {
            <div class="sp-footer">
              @if (state.settingsError()) {
                <div class="alert alert-error" style="flex:1;margin:0;padding:6px 12px;font-size:13px;">{{ state.settingsError() }}</div>
              }
              @if (state.settingsNotice()) {
                <div class="alert alert-info" style="flex:1;margin:0;padding:6px 12px;font-size:13px;">{{ state.settingsNotice() }}</div>
              }
              <!-- Once the outcome is TERMINAL, the button says so.
                   A governed save answers 202 and opens a vote, so the work is finished and there is nothing
                   left to submit, but the button still read "Save changes" and the only exit was the (X),
                   which universally means DISCARD. A reporting operator: "i have to click (X) which feels
                   unsure if the changes are now actually up for vote or discarded."
                   That is a wrong-action risk, not a wobble: read as cancel, someone looks for another way to
                   confirm, saves again, and creates a SECOND proposal for the same change. A button that
                   submitted successfully must not still be offering to submit. -->
              @if (state.settingsNotice()) {
                <button class="btn btn-primary" type="button" (click)="state.closeSettings()">
                  {{ 'spaces.popup.footer.done' | transloco }}
                </button>
              } @else {
                <button class="btn btn-primary" type="button" (click)="saveSettings()" [disabled]="state.settingsSaving()">
                  @if (state.settingsSaving()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.popup.footer.saveChanges' | transloco }}
                </button>
              }
            </div>
          }
        </div><!-- sp-panel -->
      </div><!-- sp-backdrop -->
    }
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n"] }]
    }], null, { saved: [{ type: i0.Output, args: ["saved"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceSettingsPopupComponent, { className: "SpaceSettingsPopupComponent", filePath: "app/pages/settings/space-settings-popup.component.ts", lineNumber: 148 }); })();
