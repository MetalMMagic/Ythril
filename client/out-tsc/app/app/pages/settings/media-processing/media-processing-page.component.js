/**
 * Settings → Models & Pipelines — the page shell.
 *
 * Replaces the 656-line `mediaProcessing.component.ts`, whose six cards sat in the order they were added
 * rather than any order a reader would choose ("very wild, no logic structure or consistent layout" —
 * owner, 2026-07-21).
 *
 * **One route, three tabs across the top of the panel.** Not the main navigation, not a left rail,
 * not a full-width strip — that was settled after three wrong attempts, so it is worth stating
 * plainly: tabs, top of the panel, sized to content.
 *
 * The shell owns the three things the tabs cannot own individually:
 *
 *   - **One load, one save.** All three tabs edit one config object, so `MediaProcessingStateService` is
 *     provided here and lives exactly as long as the page.
 *   - **One status fetch**, shared by Pipelines and Tools. Requested once on entry, never per tab.
 *   - **The unsaved-changes guard spans the tabs.** Switching tabs with a dirty form prompts rather
 *     than silently discarding — the tabs look like navigation, and navigation that eats edits is a
 *     data-loss bug regardless of how small the edit was.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import { MediaProcessingStateService } from './media-processing-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { ModelsTabComponent } from './models-tab.component';
import { PipelinesTabComponent } from './pipelines-tab.component';
import { ToolsTabComponent } from './tools-tab.component';
import { PinnedUnknownNoticeComponent } from './pinned-unknown-notice.component';
import * as i0 from "@angular/core";
function MediaProcessingPageComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0);
    i0.ɵɵelement(1, "span", 2);
    i0.ɵɵelementEnd();
} }
function MediaProcessingPageComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx);
} }
function MediaProcessingPageComponent_Conditional_2_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3);
    i0.ɵɵelement(1, "ph-icon", 9)(2, "span", 10);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵproperty("innerHTML", i0.ɵɵpipeBind1(3, 2, "mediaProcessing.page.managedBanner"), i0.ɵɵsanitizeHtml);
} }
function MediaProcessingPageComponent_Conditional_2_For_4_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 12);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 1, "mediaProcessing.page.unsaved"));
} }
function MediaProcessingPageComponent_Conditional_2_For_4_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 11);
    i0.ɵɵlistener("click", function MediaProcessingPageComponent_Conditional_2_For_4_Template_button_click_0_listener() { const t_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r3 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r3.switchTo(t_r3)); });
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵconditionalCreate(3, MediaProcessingPageComponent_Conditional_2_For_4_Conditional_3_Template, 2, 3, "span", 12);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r3 = ctx.$implicit;
    const ctx_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r3.tab() === t_r3);
    i0.ɵɵattribute("aria-selected", ctx_r3.tab() === t_r3)("id", "tab-" + t_r3)("aria-controls", "panel-" + t_r3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 7, "mediaProcessing.tab." + t_r3), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(t_r3 === "models" && ctx_r3.s.isDirty() ? 3 : -1);
} }
function MediaProcessingPageComponent_Conditional_2_Case_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-models-tab");
} }
function MediaProcessingPageComponent_Conditional_2_Case_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-pipelines-tab");
} }
function MediaProcessingPageComponent_Conditional_2_Case_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-tools-tab");
} }
function MediaProcessingPageComponent_Conditional_2_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 8)(1, "button", 13);
    i0.ɵɵlistener("click", function MediaProcessingPageComponent_Conditional_2_Conditional_10_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r5); const ctx_r3 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r3.s.save()); });
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 14);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "span", 15);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r3.s.saving() || ctx_r3.s.managed);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 4, ctx_r3.s.saving() ? "common.saving" : "common.save"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r3.s.saveError());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r3.s.saveOk());
} }
function MediaProcessingPageComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, MediaProcessingPageComponent_Conditional_2_Conditional_0_Template, 4, 4, "div", 3);
    i0.ɵɵelementStart(1, "nav", 4);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵrepeaterCreate(3, MediaProcessingPageComponent_Conditional_2_For_4_Template, 4, 9, "button", 5, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵelement(5, "app-pinned-unknown-notice", 6);
    i0.ɵɵelementStart(6, "div", 7);
    i0.ɵɵlistener("input", function MediaProcessingPageComponent_Conditional_2_Template_div_input_6_listener() { i0.ɵɵrestoreView(_r1); const ctx_r3 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r3.s.touched.set(true)); })("change", function MediaProcessingPageComponent_Conditional_2_Template_div_change_6_listener() { i0.ɵɵrestoreView(_r1); const ctx_r3 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r3.s.touched.set(true)); });
    i0.ɵɵconditionalCreate(7, MediaProcessingPageComponent_Conditional_2_Case_7_Template, 1, 0, "app-models-tab")(8, MediaProcessingPageComponent_Conditional_2_Case_8_Template, 1, 0, "app-pipelines-tab")(9, MediaProcessingPageComponent_Conditional_2_Case_9_Template, 1, 0, "app-tools-tab");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(10, MediaProcessingPageComponent_Conditional_2_Conditional_10_Template, 8, 6, "div", 8);
} if (rf & 2) {
    let tmp_7_0;
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r3.s.managed ? 0 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 7, "mediaProcessing.page.title"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r3.TABS);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("paths", ctx_r3.s.pinnedUnknown);
    i0.ɵɵadvance();
    i0.ɵɵattribute("id", "panel-" + ctx_r3.tab())("aria-labelledby", "tab-" + ctx_r3.tab());
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_7_0 = ctx_r3.tab()) === "models" ? 7 : tmp_7_0 === "pipelines" ? 8 : tmp_7_0 === "tools" ? 9 : -1);
    i0.ɵɵadvance(3);
    i0.ɵɵconditional(ctx_r3.showsSave() ? 10 : -1);
} }
export class MediaProcessingPageComponent {
    constructor() {
        this.s = inject(MediaProcessingStateService);
        this.pipeline = inject(PipelineStatusService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.transloco = inject(TranslocoService);
        /**
         * Pipelines first, and the landing tab.
         *
         * Owner, 2026-07-30. It is the right default because it answers the question an operator actually
         * arrives with — *what happens to a file I upload* — whereas Models answers *what is configured*, which
         * is the follow-up. Clicking a step in a pipeline already jumps to the model that implements it, so
         * the natural direction is pipeline → model, and the tab order now matches it.
         */
        this.TABS = ['pipelines', 'models', 'tools'];
        this.tab = signal('pipelines', ...(ngDevMode ? [{ debugName: "tab" }] : /* istanbul ignore next */ []));
        /**
         * Tools is read-only, so it never needs the save bar — and Models no longer does either: each of its
         * cards carries its own Save, shown only when that card has an unsaved change. Owner, 2026-07-28:
         * "save button on model page should appear only after change in the changed models box and not one
         * global on the bottom of the page."
         *
         * Pipelines keeps the bar. Its knobs are not grouped into per-provider boxes, so there is no "the box
         * that changed" to put a button in.
         */
        /**
         * No page-level Save anywhere any more.
         *
         * Models lost it first (owner, 2026-07-28) and Pipelines keeps it no longer: every pipeline card now
         * carries its own Save, shown only when that pipeline changed. The comment above used to justify the
         * bar by saying pipeline knobs "are not grouped into per-provider boxes, so there is no box that
         * changed to put a button in" — that was true of the layout, not of the data. Each pipeline owns
         * exactly one class ceiling (or, for Documents, the extraction block), and the server merges both
         * per key, so the boxes were always there.
         */
        this.showsSave = computed(() => false, ...(ngDevMode ? [{ debugName: "showsSave" }] : /* istanbul ignore next */ []));
        /**
         * A pipeline step actor was clicked (see `focusCard`): jump to the Models tab and reveal the card
         * that configures that step. Restores the "click a model in the viz to go configure it" affordance.
         * The signal is cleared inside `focusModelCard` (in a later task), so writing it there is not a
         * write-during-effect.
         */
        this.focusReaction = effect(() => {
            const cardId = this.s.focusCard();
            if (cardId)
                this.focusModelCard(cardId);
        }, ...(ngDevMode ? [{ debugName: "focusReaction" }] : /* istanbul ignore next */ []));
    }
    ngOnInit() {
        this.s.load();
        this.pipeline.load();
    }
    /**
     * Switch to the Models tab (honouring the unsaved-changes guard in `switchTo`) and scroll the named
     * card into view with a brief flash. If the operator cancels the discard prompt we stay put and just
     * clear the request. The scroll is deferred a tick so the tab's cards have rendered.
     */
    async focusModelCard(cardId) {
        await this.switchTo('models');
        if (this.tab() !== 'models') {
            this.s.focusCard.set(null);
            return;
        } // discard was cancelled
        setTimeout(() => {
            const el = document.getElementById('model-card-' + cardId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('flash');
                setTimeout(() => el.classList.remove('flash'), 1400);
            }
            this.s.focusCard.set(null);
        }, 80);
    }
    /**
     * Switching tabs with unsaved edits prompts before discarding.
     *
     * The tabs read as navigation, and navigation that silently eats edits is a data-loss bug however
     * small the edit — a typed API key is the case that stings, since it cannot be recovered by
     * remembering what was in the box.
     */
    async switchTo(t) {
        if (t === this.tab())
            return;
        if (this.s.isDirty()) {
            const ok = await this.confirmDialog.confirm({
                title: this.transloco.translate('mediaProcessing.confirm.discardTitle'),
                message: this.transloco.translate('mediaProcessing.confirm.discardMessage'),
                confirmLabel: this.transloco.translate('mediaProcessing.confirm.discardConfirm'),
                cancelLabel: this.transloco.translate('mediaProcessing.confirm.discardCancel'),
                danger: true,
            });
            if (!ok)
                return;
            // Discarding means going back to what the server has, not keeping the edits around invisibly on
            // a tab the operator can no longer see.
            this.s.load();
        }
        this.tab.set(t);
    }
    static { this.ɵfac = function MediaProcessingPageComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MediaProcessingPageComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: MediaProcessingPageComponent, selectors: [["app-models-page"]], features: [i0.ɵɵProvidersFeature([MediaProcessingStateService, PipelineStatusService])], decls: 3, vars: 1, consts: [[1, "loading-overlay"], [1, "alert", "alert-error"], [1, "spinner"], [1, "managed-banner"], ["role", "tablist", 1, "tabs"], ["type", "button", "role", "tab", 1, "tab", 3, "active"], [3, "paths"], ["role", "tabpanel", 3, "input", "change"], [1, "actions"], ["name", "lock", 3, "size"], [3, "innerHTML"], ["type", "button", "role", "tab", 1, "tab", 3, "click"], [1, "unsaved"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "save-error"], [1, "save-ok"]], template: function MediaProcessingPageComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, MediaProcessingPageComponent_Conditional_0_Template, 2, 0, "div", 0)(1, MediaProcessingPageComponent_Conditional_1_Template, 2, 1, "div", 1)(2, MediaProcessingPageComponent_Conditional_2_Template, 11, 9);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional(ctx.s.loading() ? 0 : (tmp_0_0 = ctx.s.loadError()) ? 1 : 2, tmp_0_0);
        } }, dependencies: [FormsModule, PhIconComponent,
            ModelsTabComponent, PipelinesTabComponent, ToolsTabComponent,
            PinnedUnknownNoticeComponent,
            TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; }\n    \n\n\n\n    \n\n    .tabs[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; row-gap: 2px; gap: 2px;\n      border-bottom: 1px solid var(--border); margin-bottom: 18px; }\n    .tabs[_ngcontent-%COMP%]    > *[_ngcontent-%COMP%] { flex: none; white-space: nowrap; }\n    .tab[_ngcontent-%COMP%] { background: none; border: none; border-bottom: 2px solid transparent; padding: 9px 16px;\n      cursor: pointer; font-size: 13px; font-family: var(--font); color: var(--text-muted);\n      display: flex; align-items: center; gap: 7px; }\n    .tab[_ngcontent-%COMP%]:hover { color: var(--text-primary); }\n    .tab.active[_ngcontent-%COMP%] { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 550; }\n    .tab[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }\n    \n\n    .tab[_ngcontent-%COMP%]   .unsaved[_ngcontent-%COMP%] { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }\n\n    .managed-banner[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 11px 14px;\n      border-radius: 10px; background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.35);\n      font-size: 13px; color: var(--text-secondary); }\n    .managed-banner[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); }\n    .managed-banner[_ngcontent-%COMP%]   b[_ngcontent-%COMP%] { color: var(--text-primary); }\n    .managed-banner[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; }\n\n    .actions[_ngcontent-%COMP%] { display: flex; gap: 12px; align-items: center; margin-top: 20px;\n      padding-top: 16px; border-top: 1px solid var(--border-muted); }\n    .save-error[_ngcontent-%COMP%] { color: var(--error); font-size: 13px; }\n    .save-ok[_ngcontent-%COMP%] { color: var(--success); font-size: 13px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MediaProcessingPageComponent, [{
        type: Component,
        args: [{ selector: 'app-models-page', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, providers: [MediaProcessingStateService, PipelineStatusService], imports: [
                    FormsModule, TranslocoPipe, PhIconComponent,
                    ModelsTabComponent, PipelinesTabComponent, ToolsTabComponent,
                    PinnedUnknownNoticeComponent,
                ], template: `
    @if (s.loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (s.loadError(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else {
      @if (s.managed) {
        <div class="managed-banner">
          <ph-icon name="lock" [size]="16"/>
          <span [innerHTML]="'mediaProcessing.page.managedBanner' | transloco"></span>
        </div>
      }

      <nav class="tabs" role="tablist" [attr.aria-label]="'mediaProcessing.page.title' | transloco">
        @for (t of TABS; track t) {
          <button class="tab" type="button" role="tab" [class.active]="tab() === t"
            [attr.aria-selected]="tab() === t" [attr.id]="'tab-' + t" [attr.aria-controls]="'panel-' + t"
            (click)="switchTo(t)">
            {{ 'mediaProcessing.tab.' + t | transloco }}
            @if (t === 'models' && s.isDirty()) { <span class="unsaved" [attr.aria-label]="'mediaProcessing.page.unsaved' | transloco"></span> }
          </button>
        }
      </nav>

      <!-- AN UNRECOGNISED PIN, on the PAGE rather than inside a tab.
           YTHRIL_PINNED_FIELDS names fields across all three tabs, so a typo in it is not a Models-tab fact —
           and putting it in one tab would hide it from an operator who happened to open another. Above the panel,
           because a pin the operator believes is in force is exactly what they must not scroll past.
           NOTE: no backticks in this template, including in comments. One ends the template string and the
           error points at @Component, never here. -->
      <app-pinned-unknown-notice [paths]="s.pinnedUnknown" />

      <!-- The whole panel delegates input/change so any field marks the form touched. One listener
           instead of an (ngModelChange) on every control — which is how a control gets added later
           without one and quietly stops arming the guard. -->
      <div [attr.id]="'panel-' + tab()" role="tabpanel" [attr.aria-labelledby]="'tab-' + tab()"
        (input)="s.touched.set(true)" (change)="s.touched.set(true)">
        @switch (tab()) {
          @case ('models') { <app-models-tab/> }
          @case ('pipelines') { <app-pipelines-tab/> }
          @case ('tools') { <app-tools-tab/> }
        }
      </div>

      @if (showsSave()) {
        <div class="actions">
          <button class="btn btn-primary" (click)="s.save()" [disabled]="s.saving() || s.managed">
            {{ (s.saving() ? 'common.saving' : 'common.save') | transloco }}
          </button>
          <span class="save-error">{{ s.saveError() }}</span>
          <span class="save-ok">{{ s.saveOk() }}</span>
        </div>
      }
    }
  `, styles: ["\n    :host { display: block; }\n    /* No page header: media embedding is always on (controlled per class on the Models tab), the sidebar\n       nav and tab strip already say where you are, and the old title/subtitle were redundant. */\n\n    /* Tabs sized to content, at the top of the panel \u2014 not a full-width strip. */\n    .tabs { display: flex; flex-wrap: wrap; row-gap: 2px; gap: 2px;\n      border-bottom: 1px solid var(--border); margin-bottom: 18px; }\n    .tabs > * { flex: none; white-space: nowrap; }\n    .tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 9px 16px;\n      cursor: pointer; font-size: 13px; font-family: var(--font); color: var(--text-muted);\n      display: flex; align-items: center; gap: 7px; }\n    .tab:hover { color: var(--text-primary); }\n    .tab.active { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 550; }\n    .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }\n    /* The unsaved marker rides the tab that owns the edit, so switching away names what is at stake. */\n    .tab .unsaved { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }\n\n    .managed-banner { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 11px 14px;\n      border-radius: 10px; background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.35);\n      font-size: 13px; color: var(--text-secondary); }\n    .managed-banner code { font-family: var(--font-mono, monospace); }\n    .managed-banner b { color: var(--text-primary); }\n    .managed-banner ph-icon { flex: none; }\n\n    .actions { display: flex; gap: 12px; align-items: center; margin-top: 20px;\n      padding-top: 16px; border-top: 1px solid var(--border-muted); }\n    .save-error { color: var(--error); font-size: 13px; }\n    .save-ok { color: var(--success); font-size: 13px; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(MediaProcessingPageComponent, { className: "MediaProcessingPageComponent", filePath: "app/pages/settings/media-processing/media-processing-page.component.ts", lineNumber: 134 }); })();
