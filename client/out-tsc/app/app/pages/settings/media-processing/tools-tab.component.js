/**
 * Tab 3 — Tools. Things that run, with nothing to set.
 *
 * They exist here so every pipeline step leads somewhere: a chain that names `ffmpeg` and `text
 * chunker` as actors and then offers no page for either leaves the reader wondering whether those are
 * real components or labels. More importantly, this tab is "is it working?" for exactly the class of
 * component that has no settings screen — which is the class whose failure went unnoticed for months.
 *
 * **The vector index table now carries a per-row Rebuild button.** This table is the one place drift
 * is actually visible — `config.json` recording a space as `ready` while the database has no such index
 * — so it is also where the repair belongs, right next to the row that shows the problem. It is the
 * SAME rebuild the space's Danger Zone offers (`rebuildSpaceIndexes` → `POST .../rebuild-indexes`), with
 * the same guard: a confirm that spells out that recall returns empty until the rebuild finishes. It
 * rebuilds the missing `$vectorSearch` index; it is not the config-change reindex that re-embeds the
 * brain, and it touches no records. Rebuild — not reindex — is what fixes the drift this table surfaces.
 *
 * The drift row is the reason `GET /api/admin/pipeline-status` exists. `config.json` recording a
 * space as `ready` while the database has no such index is invisible everywhere else in the product —
 * recall simply returns nothing, forever, with no error anywhere.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { HealthDotComponent } from './health-dot.component';
import { ModelProviderCardComponent } from './model-provider-card.component';
import { HscrollTopDirective } from '../../../shared/hscroll-top.directive';
import { PipelineStatusService } from './pipeline-status.service';
import { SpacesApi } from '../../../core/spaces-api.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import * as i0 from "@angular/core";
const _c0 = a0 => ({ count: a0 });
const _c1 = a0 => ({ detail: a0 });
const _forTrack0 = ($index, $item) => $item.id;
function ToolsTabComponent_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 12);
    i0.ɵɵelement(1, "ph-icon", 15);
    i0.ɵɵelementStart(2, "span")(3, "b");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(5, 3, "mediaProcessing.tools.driftTitle", i0.ɵɵpureFunction1(8, _c0, ctx_r0.drifted().length)));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(7, 6, "mediaProcessing.tools.driftBody"), " ");
} }
function ToolsTabComponent_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "mediaProcessing.tools.indexUnavailable", i0.ɵɵpureFunction1(4, _c1, ctx)));
} }
function ToolsTabComponent_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 13);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "mediaProcessing.tools.indexEmpty"));
} }
function ToolsTabComponent_Conditional_35_For_21_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 24);
} }
function ToolsTabComponent_Conditional_35_For_21_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "ph-icon", 25);
} if (rf & 2) {
    i0.ɵɵproperty("size", 14);
} }
function ToolsTabComponent_Conditional_35_For_21_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 19);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td")(4, "app-status-pill", 20);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "td")(8, "app-status-pill", 21);
    i0.ɵɵtext(9);
    i0.ɵɵpipe(10, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(11, "td", 22)(12, "button", 23);
    i0.ɵɵlistener("click", function ToolsTabComponent_Conditional_35_For_21_Template_button_click_12_listener() { const sp_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r0 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r0.rebuildIndexes(sp_r3)); });
    i0.ɵɵconditionalCreate(13, ToolsTabComponent_Conditional_35_For_21_Conditional_13_Template, 1, 0, "span", 24)(14, ToolsTabComponent_Conditional_35_For_21_Conditional_14_Template, 1, 1, "ph-icon", 25);
    i0.ɵɵtext(15);
    i0.ɵɵpipe(16, "transloco");
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const sp_r3 = ctx.$implicit;
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(sp_r3.label);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("variant", ctx_r0.liveVariant(sp_r3))("dot", true);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 9, "mediaProcessing.indexState." + sp_r3.live));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("variant", sp_r3.drifted ? "error" : "off");
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(10, 11, "mediaProcessing.indexState." + sp_r3.stored));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", ctx_r0.rebuilding().has(sp_r3.id));
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.rebuilding().has(sp_r3.id) ? 13 : 14);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(16, 13, "mediaProcessing.tools.rebuildRowButton"), " ");
} }
function ToolsTabComponent_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14)(1, "table")(2, "thead")(3, "tr")(4, "th");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "th")(11, "span", 16);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtext(13);
    i0.ɵɵpipe(14, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "th", 17)(16, "span", 18);
    i0.ɵɵtext(17);
    i0.ɵɵpipe(18, "transloco");
    i0.ɵɵelementEnd()()()();
    i0.ɵɵelementStart(19, "tbody");
    i0.ɵɵrepeaterCreate(20, ToolsTabComponent_Conditional_35_For_21_Template, 17, 15, "tr", null, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 5, "mediaProcessing.tools.colSpace"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 7, "mediaProcessing.tools.colLive"));
    i0.ɵɵadvance(3);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(12, 9, "mediaProcessing.tools.colStoredHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 11, "mediaProcessing.tools.colStored"));
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 13, "mediaProcessing.tools.colAction"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r0.spaces());
} }
export class ToolsTabComponent {
    constructor() {
        this.pipeline = inject(PipelineStatusService);
        this.spacesApi = inject(SpacesApi);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.transloco = inject(TranslocoService);
        /** Space ids whose rebuild is in flight — drives the per-row spinner + disabled state. */
        this.rebuilding = signal(new Set(), ...(ngDevMode ? [{ debugName: "rebuilding" }] : /* istanbul ignore next */ []));
        this.spaces = computed(() => this.pipeline.status()?.index.spaces ?? [], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.unavailable = computed(() => this.pipeline.status()?.index.unavailable ?? null, ...(ngDevMode ? [{ debugName: "unavailable" }] : /* istanbul ignore next */ []));
        this.drifted = computed(() => this.pipeline.driftedSpaces(), ...(ngDevMode ? [{ debugName: "drifted" }] : /* istanbul ignore next */ []));
        /** One dot for the whole index: the worst thing any space reports. */
        this.indexHealth = computed(() => {
            const spaces = this.spaces();
            if (!this.pipeline.status())
                return null;
            if (this.unavailable() || spaces.some(s => s.live === 'unknown'))
                return null;
            if (spaces.some(s => s.live === 'missing'))
                return 'down';
            if (spaces.some(s => s.live === 'building'))
                return 'degraded';
            return 'ok';
        }, ...(ngDevMode ? [{ debugName: "indexHealth" }] : /* istanbul ignore next */ []));
    }
    liveVariant(sp) {
        if (sp.live === 'ready')
            return 'ok';
        if (sp.live === 'building')
            return 'warn';
        if (sp.live === 'missing')
            return 'error';
        return 'off';
    }
    /**
     * Rebuild one space's `$vectorSearch` index — the repair for the drift this table surfaces.
     *
     * Same operation and guard as the space Danger Zone (`rebuildSpaceIndexes`), surfaced here because
     * this is where drift is visible. It is not destructive — no record is touched, only the index is
     * recreated — but recall returns EMPTY until the build finishes, so the confirm spells that out.
     * Reuses the Danger Zone's confirm/toast copy so the two entry points read identically.
     */
    async rebuildIndexes(sp) {
        if (this.rebuilding().has(sp.id))
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.rebuildIndexesTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmRebuildIndexes', { label: sp.label }),
            confirmLabel: this.transloco.translate('spaces.dangerZone.rebuildIndexesButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.rebuilding.update(s => new Set(s).add(sp.id));
        this.spacesApi.rebuildSpaceIndexes(sp.id).subscribe({
            next: () => {
                this.clearRebuilding(sp.id);
                this.toast.success(this.transloco.translate('spaces.dangerZone.rebuildIndexesStarted'));
            },
            error: (err) => {
                this.clearRebuilding(sp.id);
                this.toast.error(err?.error?.error ?? err?.message ?? this.transloco.translate('spaces.dangerZone.rebuildIndexesFailed'));
            },
        });
    }
    clearRebuilding(id) {
        this.rebuilding.update(s => { const n = new Set(s); n.delete(id); return n; });
    }
    static { this.ɵfac = function ToolsTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ToolsTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ToolsTabComponent, selectors: [["app-tools-tab"]], decls: 36, vars: 36, consts: [[1, "tools-grid"], ["id", "splitter", "icon", "scissors", 3, "heading", "purpose", "health"], ["pill", "", "variant", "ok"], [1, "meta"], ["id", "chunker", "icon", "text-align-left", 3, "heading", "purpose", "health"], [1, "tool"], [1, "tool-h"], [1, "ic"], ["name", "database", 3, "size"], [1, "t"], [3, "state", "subject"], [1, "tool-b"], [1, "drift"], [1, "empty"], ["hscrollTop", "", 1, "tablewrap"], ["name", "warning", 3, "size"], [1, "th-hint"], [1, "act-h"], [1, "sr-only"], [1, "space"], [3, "variant", "dot"], [3, "variant"], [1, "act"], ["type", "button", 1, "btn", "btn-danger", "btn-sm", 3, "click", "disabled"], [1, "spinner"], ["name", "arrows-clockwise", 3, "size"]], template: function ToolsTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-model-provider-card", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementStart(4, "app-status-pill", 2);
            i0.ɵɵtext(5, "ffmpeg");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(6, "div", 3);
            i0.ɵɵtext(7);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(9, "app-model-provider-card", 4);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementStart(12, "app-status-pill", 2);
            i0.ɵɵtext(13);
            i0.ɵɵpipe(14, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(15, "div", 3);
            i0.ɵɵtext(16);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(18, "section", 5)(19, "header", 6)(20, "span", 7);
            i0.ɵɵelement(21, "ph-icon", 8);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(22, "div", 9)(23, "h3");
            i0.ɵɵtext(24);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵelement(26, "app-health-dot", 10);
            i0.ɵɵpipe(27, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(28, "p");
            i0.ɵɵtext(29);
            i0.ɵɵpipe(30, "transloco");
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(31, "div", 11);
            i0.ɵɵconditionalCreate(32, ToolsTabComponent_Conditional_32_Template, 8, 10, "div", 12);
            i0.ɵɵconditionalCreate(33, ToolsTabComponent_Conditional_33_Template, 3, 6, "div", 13)(34, ToolsTabComponent_Conditional_34_Template, 3, 3, "div", 13)(35, ToolsTabComponent_Conditional_35_Template, 22, 15, "div", 14);
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            let tmp_15_0;
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 16, "mediaProcessing.tools.splitter"))("purpose", i0.ɵɵpipeBind1(3, 18, "mediaProcessing.tools.splitterPurpose"))("health", "ok");
            i0.ɵɵadvance(6);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 20, "mediaProcessing.tools.splitterDetail"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(10, 22, "mediaProcessing.tools.chunker"))("purpose", i0.ɵɵpipeBind1(11, 24, "mediaProcessing.tools.chunkerPurpose"))("health", "ok");
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(14, 26, "mediaProcessing.tools.inProcess"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(17, 28, "mediaProcessing.tools.chunkerDetail"));
            i0.ɵɵadvance(5);
            i0.ɵɵproperty("size", 17);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(25, 30, "mediaProcessing.tools.vectorIndex"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("state", ctx.indexHealth())("subject", i0.ɵɵpipeBind1(27, 32, "mediaProcessing.tools.vectorIndex"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(30, 34, "mediaProcessing.tools.vectorIndexPurpose"));
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.drifted().length ? 32 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_15_0 = ctx.unavailable()) ? 33 : !ctx.spaces().length ? 34 : 35, tmp_15_0);
        } }, dependencies: [PhIconComponent, StatusPillComponent, HealthDotComponent, ModelProviderCardComponent, HscrollTopDirective, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; }\n    \n\n    .tools-grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n      gap: 16px; margin-bottom: 16px; align-items: stretch; }\n    .tool[_ngcontent-%COMP%] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      margin-bottom: 16px; overflow: hidden; }\n    .tool-h[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }\n    .ic[_ngcontent-%COMP%] { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .tool-h[_ngcontent-%COMP%]   .t[_ngcontent-%COMP%] { flex: 1; min-width: 0; }\n    .tool-h[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] { margin: 0; font-size: 14.5px; font-weight: 620; display: flex; align-items: center; gap: 8px; }\n    .tool-h[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n    .tool-b[_ngcontent-%COMP%] { border-top: 1px solid var(--border-muted); padding: 12px 18px 16px; }\n    .meta[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-secondary); }\n    .meta[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 11.5px; }\n\n    \n\n    .tablewrap[_ngcontent-%COMP%] { overflow-x: auto; }\n    table[_ngcontent-%COMP%] { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 420px; }\n    th[_ngcontent-%COMP%] { text-align: left; font-weight: 600; color: var(--text-muted); font-size: 11px;\n      text-transform: uppercase; letter-spacing: .06em; padding: 6px 10px 6px 0; }\n    td[_ngcontent-%COMP%] { padding: 7px 10px 7px 0; border-top: 1px solid var(--border-muted); vertical-align: top; }\n    td.space[_ngcontent-%COMP%] { font-weight: 550; }\n    \n\n    .th-hint[_ngcontent-%COMP%] { cursor: help; text-decoration: underline dotted; text-underline-offset: 2px; }\n    \n\n    th.act-h[_ngcontent-%COMP%], td.act[_ngcontent-%COMP%] { text-align: right; white-space: nowrap; padding-right: 0; }\n    td.act[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 6px; }\n    td.act[_ngcontent-%COMP%]   .spinner[_ngcontent-%COMP%] { width: 12px; height: 12px; border-width: 2px; }\n    \n\n    .sr-only[_ngcontent-%COMP%] { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;\n      clip: rect(0 0 0 0); white-space: nowrap; border: 0; }\n\n    .drift[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 14px; padding: 11px 13px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--error-border); background: var(--error-bg); }\n    .drift[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; margin-top: 1px; }\n    .drift[_ngcontent-%COMP%]   b[_ngcontent-%COMP%] { color: var(--text-primary); }\n    .empty[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-muted); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ToolsTabComponent, [{
        type: Component,
        args: [{ selector: 'app-tools-tab', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [TranslocoPipe, PhIconComponent, StatusPillComponent, HealthDotComponent, ModelProviderCardComponent, HscrollTopDirective], template: `
    <!-- ── Media splitter + Text chunker ──────────────────────────────────
         Both are in-process, nothing-to-set tools, so they now ride the same
         app-model-provider-card as the Models tab (in a 2-up grid) rather than a
         bespoke card, for one card vocabulary across all three Models tabs. -->
    <div class="tools-grid">
      <app-model-provider-card id="splitter" icon="scissors"
        [heading]="'mediaProcessing.tools.splitter' | transloco"
        [purpose]="'mediaProcessing.tools.splitterPurpose' | transloco"
        [health]="'ok'">
        <app-status-pill pill variant="ok">ffmpeg</app-status-pill>
        <div class="meta">{{ 'mediaProcessing.tools.splitterDetail' | transloco }}</div>
      </app-model-provider-card>

      <app-model-provider-card id="chunker" icon="text-align-left"
        [heading]="'mediaProcessing.tools.chunker' | transloco"
        [purpose]="'mediaProcessing.tools.chunkerPurpose' | transloco"
        [health]="'ok'">
        <app-status-pill pill variant="ok">{{ 'mediaProcessing.tools.inProcess' | transloco }}</app-status-pill>
        <div class="meta">{{ 'mediaProcessing.tools.chunkerDetail' | transloco }}</div>
      </app-model-provider-card>
    </div>

    <!-- ── Vector index ───────────────────────────────────────────────── -->
    <section class="tool">
      <header class="tool-h">
        <span class="ic"><ph-icon name="database" [size]="17"/></span>
        <div class="t">
          <h3>
            {{ 'mediaProcessing.tools.vectorIndex' | transloco }}
            <app-health-dot [state]="indexHealth()" [subject]="'mediaProcessing.tools.vectorIndex' | transloco"/>
          </h3>
          <p>{{ 'mediaProcessing.tools.vectorIndexPurpose' | transloco }}</p>
        </div>
      </header>
      <div class="tool-b">
        @if (drifted().length) {
          <div class="drift">
            <ph-icon name="warning" [size]="16"/>
            <span>
              <b>{{ 'mediaProcessing.tools.driftTitle' | transloco: { count: drifted().length } }}</b>
              {{ 'mediaProcessing.tools.driftBody' | transloco }}
            </span>
          </div>
        }

        @if (unavailable(); as u) {
          <div class="empty">{{ 'mediaProcessing.tools.indexUnavailable' | transloco: { detail: u } }}</div>
        } @else if (!spaces().length) {
          <div class="empty">{{ 'mediaProcessing.tools.indexEmpty' | transloco }}</div>
        } @else {
          <div class="tablewrap" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th>{{ 'mediaProcessing.tools.colSpace' | transloco }}</th>
                  <th>{{ 'mediaProcessing.tools.colLive' | transloco }}</th>
                  <!-- "Recorded" needs a word: it is what config.json believes, which "In the database"
                       is checked against — a mismatch is the drift this table exists to surface. -->
                  <th><span class="th-hint" [attr.title]="'mediaProcessing.tools.colStoredHint' | transloco">{{ 'mediaProcessing.tools.colStored' | transloco }}</span></th>
                  <th class="act-h"><span class="sr-only">{{ 'mediaProcessing.tools.colAction' | transloco }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (sp of spaces(); track sp.id) {
                  <tr>
                    <td class="space">{{ sp.label }}</td>
                    <td><app-status-pill [variant]="liveVariant(sp)" [dot]="true">{{ 'mediaProcessing.indexState.' + sp.live | transloco }}</app-status-pill></td>
                    <td><app-status-pill [variant]="sp.drifted ? 'error' : 'off'">{{ 'mediaProcessing.indexState.' + sp.stored | transloco }}</app-status-pill></td>
                    <td class="act">
                      <button class="btn btn-danger btn-sm" type="button" [disabled]="rebuilding().has(sp.id)" (click)="rebuildIndexes(sp)">
                        @if (rebuilding().has(sp.id)) { <span class="spinner"></span> } @else { <ph-icon name="arrows-clockwise" [size]="14"/> }
                        {{ 'mediaProcessing.tools.rebuildRowButton' | transloco }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `, styles: ["\n    :host { display: block; }\n    /* Splitter + chunker sit side by side as model-style cards, matching the Models tab grid. */\n    .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n      gap: 16px; margin-bottom: 16px; align-items: stretch; }\n    .tool { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;\n      margin-bottom: 16px; overflow: hidden; }\n    .tool-h { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }\n    .ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;\n      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }\n    .tool-h .t { flex: 1; min-width: 0; }\n    .tool-h h3 { margin: 0; font-size: 14.5px; font-weight: 620; display: flex; align-items: center; gap: 8px; }\n    .tool-h p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }\n    .tool-b { border-top: 1px solid var(--border-muted); padding: 12px 18px 16px; }\n    .meta { font-size: 12.5px; color: var(--text-secondary); }\n    .meta code { font-family: var(--font-mono, monospace); font-size: 11.5px; }\n\n    /* Wide content scrolls inside its own box \u2014 the page body must never scroll sideways. */\n    .tablewrap { overflow-x: auto; }\n    table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 420px; }\n    th { text-align: left; font-weight: 600; color: var(--text-muted); font-size: 11px;\n      text-transform: uppercase; letter-spacing: .06em; padding: 6px 10px 6px 0; }\n    td { padding: 7px 10px 7px 0; border-top: 1px solid var(--border-muted); vertical-align: top; }\n    td.space { font-weight: 550; }\n    /* The \"Recorded\" header carries a tooltip; the dotted underline advertises it. */\n    .th-hint { cursor: help; text-decoration: underline dotted; text-underline-offset: 2px; }\n    /* Action column: right-aligned Rebuild button, never wraps its label. */\n    th.act-h, td.act { text-align: right; white-space: nowrap; padding-right: 0; }\n    td.act .btn { display: inline-flex; align-items: center; gap: 6px; }\n    td.act .spinner { width: 12px; height: 12px; border-width: 2px; }\n    /* Visually-hidden accessible label for the action column header. */\n    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;\n      clip: rect(0 0 0 0); white-space: nowrap; border: 0; }\n\n    .drift { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 14px; padding: 11px 13px;\n      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--error-border); background: var(--error-bg); }\n    .drift ph-icon { flex: none; margin-top: 1px; }\n    .drift b { color: var(--text-primary); }\n    .empty { font-size: 12.5px; color: var(--text-muted); }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ToolsTabComponent, { className: "ToolsTabComponent", filePath: "app/pages/settings/media-processing/tools-tab.component.ts", lineNumber: 164 }); })();
