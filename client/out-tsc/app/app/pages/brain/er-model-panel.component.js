/**
 * Brain → Overview → the space's data model, inferred and drawn.
 *
 * ## What it shows, and why it is worth a panel
 *
 * The server derives the model from the schema AND from the records, because those two disagree and the
 * disagreement is the point. A type can be declared and used, declared and empty, or — the case nobody sees
 * otherwise — hold records with no declaration at all. An integrator arrived at this product with a space
 * holding 21 undeclared entity types after importing the wrong schema file, and no view in the product would
 * have shown them. This is that view.
 *
 * ## Two things a reader can do from here
 *
 * **The record count is a LINK**, not a button styled like one: it navigates to the entities tab filtered to
 * that type, as a real URL. Right-click, open in a new tab, bookmark, send to someone. The alternative
 * considered was a shared signal the panel sets and the tab consumes — set-then-consume-and-clear, with a
 * lifecycle neither component owns — and the URL is both simpler and strictly more capable. It also means
 * neither component knows the other exists.
 *
 * **An admin gets a pen** that opens the same per-type schema editor Space Settings uses, in place. On an
 * UNDECLARED type it is a `+` instead, because there is no schema to edit yet and declaring one is the useful
 * action at that moment.
 *
 * ## Why the geometry is not in this file
 *
 * `er-layout.ts` computes it, and `er-layout.spec.ts` proves every path endpoint lies on the perimeter of the
 * box it belongs to. The first hand-drawn version of this diagram had a join that ended 78 px short of its
 * target — a line into empty space — and deriving the coordinates is what makes that unrepresentable rather
 * than merely absent. Keep it that way: no coordinate in this template is typed by hand.
 *
 * ## This panel FETCHES
 *
 * Every other Overview panel is presentational — the shell preloads their inputs. This one asks for its own
 * model, because a full ER derivation is too expensive to put on the shell's critical path for a space nobody
 * opens this panel on. The Overview's own doc comment was corrected in the same change rather than left
 * saying the tab adds no fetch of its own.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SkeletonLinesComponent } from '../../shared/skeleton-lines.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import { layoutErModel } from './er-layout';
import * as i0 from "@angular/core";
const _c0 = ["stage"];
const _c1 = () => ["/brain"];
const _c2 = (a0, a1) => ({ space: a0, tab: a1 });
const _c3 = (a0, a1) => ({ space: a0, tab: "entities", type: a1 });
const _c4 = (a0, a1) => ({ scan: a0, limit: a1 });
const _c5 = a0 => ({ n: a0 });
const _forTrack0 = ($index, $item) => $item.from + $item.label + $item.to;
const _forTrack1 = ($index, $item) => $item.type;
const _forTrack2 = ($index, $item) => $item.name;
function ErModelPanelComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 3);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function ErModelPanelComponent_Conditional_0_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.reload()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.overview.er.loadFailed"))("reason", ctx);
} }
function ErModelPanelComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-skeleton-lines", 2);
} if (rf & 2) {
    i0.ɵɵproperty("rows", 4);
} }
function ErModelPanelComponent_Conditional_2_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "brain.overview.er.empty"));
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "g", 9);
    i0.ɵɵelement(1, "path", 11)(2, "path", 12);
    i0.ɵɵelementStart(3, "text", 13);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r3 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵattribute("d", p_r3.d);
    i0.ɵɵadvance();
    i0.ɵɵattribute("d", p_r3.d);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", p_r3.labelX)("y", p_r3.labelY)("text-anchor", p_r3.labelAnchor);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", p_r3.label, " \u00B7 ", p_r3.count);
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "g", 16);
    i0.ɵɵelement(1, "rect", 17)(2, "rect", 18)(3, "rect", 19);
    i0.ɵɵelementStart(4, "text", 20);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "a", 21);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementStart(8, "text", 22);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(10, "text", 23);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const b_r4 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵclassProp("empty-type", b_r4.count === 0);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y)("width", b_r4.w)("height", b_r4.h);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y)("width", b_r4.w);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y + 18)("width", b_r4.w);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x + 14)("y", b_r4.y + 18);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(b_r4.type);
    i0.ɵɵadvance();
    i0.ɵɵproperty("routerLink", i0.ɵɵpureFunction0(28, _c1))("queryParams", i0.ɵɵpureFunction2(29, _c2, ctx_r1.spaceId(), ctx_r1.tabForKind(b_r4.kind)));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(7, 24, "brain.overview.er.openRecords") + " " + b_r4.type);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("x", b_r4.x + b_r4.w - 12)("y", b_r4.y + 18);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(b_r4.count);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x + 14)("y", b_r4.y + 44);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(12, 26, "brain.overview.er.linkedRecords"), " ");
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "g", 31);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_10_Template_g_click_0_listener() { i0.ɵɵrestoreView(_r5); const t_r6 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.editType.emit(t_r6.type)); })("keydown.enter", function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_10_Template_g_keydown_enter_0_listener() { i0.ɵɵrestoreView(_r5); const t_r6 = i0.ɵɵnextContext(); const ctx_r1 = i0.ɵɵnextContext(4); return i0.ɵɵresetView(ctx_r1.editType.emit(t_r6.type)); });
    i0.ɵɵelement(2, "rect", 32);
    i0.ɵɵelementStart(3, "text", 33);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const t_r6 = i0.ɵɵnextContext();
    const b_r4 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 6, t_r6.declared ? "brain.overview.er.editSchema" : "brain.overview.er.declareSchema"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("x", b_r4.x + b_r4.w - 34)("y", b_r4.y + b_r4.h - 26);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x + b_r4.w - 23)("y", b_r4.y + b_r4.h - 12);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6.declared ? "\u270E" : "+");
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_For_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "text", 29);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r7 = ctx.$implicit;
    const ɵ$index_86_r8 = ctx.$index;
    const b_r4 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵattribute("x", b_r4.x + 14)("y", b_r4.y + 44 + ɵ$index_86_r8 * 16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2(" ", p_r7.name, "", p_r7.required ? " *" : "", " ");
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_13_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "text", 30);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const b_r4 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵattribute("x", b_r4.x + 14)("y", b_r4.y + 44);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 3, "brain.overview.er.notDeclared"));
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(0, "g", 24);
    i0.ɵɵelement(1, "rect", 25)(2, "rect", 26)(3, "rect", 27);
    i0.ɵɵelementStart(4, "text", 20);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "a", 21);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementStart(8, "text", 22);
    i0.ɵɵtext(9);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(10, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_10_Template, 5, 8, ":svg:g", 28);
    i0.ɵɵrepeaterCreate(11, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_For_12_Template, 2, 4, ":svg:text", 29, _forTrack2);
    i0.ɵɵconditionalCreate(13, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Conditional_13_Template, 3, 5, ":svg:text", 30);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r6 = ctx;
    const b_r4 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵclassProp("empty-type", t_r6.count === 0);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("undeclared", !t_r6.declared);
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y)("width", b_r4.w)("height", b_r4.h);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y)("width", b_r4.w);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x)("y", b_r4.y + 18)("width", b_r4.w);
    i0.ɵɵadvance();
    i0.ɵɵattribute("x", b_r4.x + 14)("y", b_r4.y + 18);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6.type);
    i0.ɵɵadvance();
    i0.ɵɵproperty("routerLink", i0.ɵɵpureFunction0(27, _c1))("queryParams", i0.ɵɵpureFunction2(28, _c3, ctx_r1.spaceId(), t_r6.type));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(7, 25, "brain.overview.er.openRecords") + " " + t_r6.type);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("x", b_r4.x + b_r4.w - 12)("y", b_r4.y + 18);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r6.count);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.canEdit() ? 10 : -1);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(t_r6.properties.slice(0, 4));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!t_r6.declared ? 13 : -1);
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_0_Template, 13, 32, ":svg:g", 14)(1, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Conditional_1_Template, 14, 31, ":svg:g", 15);
} if (rf & 2) {
    let tmp_14_0;
    const b_r4 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵconditional(b_r4.kind !== "entity" ? 0 : (tmp_14_0 = ctx_r1.typeOf(b_r4.type)) ? 1 : -1, tmp_14_0);
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const tr_r9 = ctx;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "brain.overview.er.truncated", i0.ɵɵpureFunction2(4, _c4, tr_r9.scan, tr_r9.limit)));
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const m_r10 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "brain.overview.er.dangling", i0.ɵɵpureFunction1(4, _c5, m_r10.danglingEdges)));
} }
function ErModelPanelComponent_Conditional_2_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5, 0);
    i0.ɵɵnamespaceSVG();
    i0.ɵɵelementStart(2, "svg", 6);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "defs")(5, "marker", 7);
    i0.ɵɵelement(6, "path", 8);
    i0.ɵɵelementEnd()();
    i0.ɵɵrepeaterCreate(7, ErModelPanelComponent_Conditional_2_Conditional_1_For_8_Template, 5, 7, ":svg:g", 9, _forTrack0);
    i0.ɵɵrepeaterCreate(9, ErModelPanelComponent_Conditional_2_Conditional_1_For_10_Template, 2, 1, null, null, _forTrack1);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(11, ErModelPanelComponent_Conditional_2_Conditional_1_Conditional_11_Template, 3, 7, "div", 10);
    i0.ɵɵconditionalCreate(12, ErModelPanelComponent_Conditional_2_Conditional_1_Conditional_12_Template, 3, 6, "div", 10);
} if (rf & 2) {
    let tmp_10_0;
    const m_r10 = i0.ɵɵnextContext();
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("viewBox", "0 0 " + ctx_r1.view().width + " " + ctx_r1.view().height)("width", ctx_r1.view().width)("height", ctx_r1.view().height)("aria-label", i0.ɵɵpipeBind1(3, 6, "brain.overview.er.diagramLabel"));
    i0.ɵɵadvance(5);
    i0.ɵɵrepeater(ctx_r1.view().paths);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.view().boxes);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_10_0 = m_r10.truncated) ? 11 : -1, tmp_10_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(m_r10.danglingEdges > 0 ? 12 : -1);
} }
function ErModelPanelComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, ErModelPanelComponent_Conditional_2_Conditional_0_Template, 3, 3, "div", 4)(1, ErModelPanelComponent_Conditional_2_Conditional_1_Template, 13, 8);
} if (rf & 2) {
    i0.ɵɵconditional(ctx.entityTypes.length === 0 ? 0 : 1);
} }
export class ErModelPanelComponent {
    /**
     * Which Brain tab a kind box opens.
     *
     * A map rather than the kind string itself, because the two vocabularies are not the same and pretending
     * they are is how the first version of this panel shipped a count that navigated nowhere: the box kinds are
     * singular (`memory`), the tabs are plural (`memories`). One of them is a route and changing it breaks a
     * bookmark; the other is a layout concept. Named here so a rename on either side is a compile error.
     */
    tabForKind(kind) {
        return kind === 'memory' ? 'memories' : kind === 'file' ? 'files' : 'chrono';
    }
    typeOf(name) {
        return this.model()?.entityTypes.find(t => t.type === name);
    }
    constructor() {
        this.api = inject(BrainApi);
        this.spaceId = input.required(...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
        /** Admin-only: the pen appears when the caller says this token may change the schema. */
        this.canEdit = input(false, ...(ngDevMode ? [{ debugName: "canEdit" }] : /* istanbul ignore next */ []));
        /** The host opens the shared schema dialog — this panel does not own that modal, nor its save. */
        this.editType = output();
        this.model = signal(null, ...(ngDevMode ? [{ debugName: "model" }] : /* istanbul ignore next */ []));
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        this.error = signal('', ...(ngDevMode ? [{ debugName: "error" }] : /* istanbul ignore next */ []));
        /**
         * The stage's inner width, in CSS pixels — 0 until measured, which the layout reads as "use your own width".
         *
         * ## Why measured rather than derived
         *
         * The unlinked shelf spreads across the width it is given, and the layout is a pure function of the model, so
         * it cannot know how much room the card has. Reported by the canary operator's owner, 2026-08-20: the shelf
         * wraps after four boxes however wide the window is. The cause is the fallback — the joined picture's own
         * width, which three columns fix — so it was never a four-column grid, just a width that fits four.
         *
         * The STAGE, not the window: the SVG sits in a horizontally scrolling `.stage`, inside a card, inside a page
         * with a sidebar. The window's width is not an amount of room anybody has.
         */
        this.stageWidth = signal(0, ...(ngDevMode ? [{ debugName: "stageWidth" }] : /* istanbul ignore next */ []));
        /**
         * The stage element, once it exists.
         *
         * A signal `viewChild` rather than a template event. The stage lives behind three `@if` branches (error,
         * loading, empty model), so it appears LATER than the component — a `(window:resize)` binding, which was my
         * first attempt, never fires on first render and would leave the shelf on the fallback width until somebody
         * dragged the window.
         */
        this.stage = viewChild('stage', ...(ngDevMode ? [{ debugName: "stage" }] : /* istanbul ignore next */ []));
        /**
         * Measure the stage when it appears, and keep measuring it.
         *
         * `ResizeObserver` rather than a window listener: the stage's width changes when the SIDEBAR collapses or a
         * neighbouring panel appears, and neither of those resizes the window. A window listener misses both and
         * leaves the shelf laid out for a width the card no longer has.
         *
         * **Guarded because jsdom has no `ResizeObserver`.** Constructing one under the component specs throws, and
         * every test in that file would fail on a feature none of them is about. With no observer the width stays 0,
         * which the layout treats as absent — exactly the behaviour before this change, so those specs assert the
         * same geometry they always did.
         */
        this.measureStage = effect(onCleanup => {
            const el = this.stage()?.nativeElement;
            if (!el)
                return;
            // `clientWidth` minus the stage's own 16px padding each side. Laying out into the padded width clips the
            // last box of a row by exactly that, and a clipped box is not an error — it is simply not drawn.
            const apply = () => this.stageWidth.set(Math.max(0, Math.floor(el.clientWidth - 32)));
            apply();
            const RO = globalThis.ResizeObserver;
            if (!RO)
                return;
            const ro = new RO(() => apply());
            ro.observe(el);
            onCleanup(() => ro.disconnect());
        }, ...(ngDevMode ? [{ debugName: "measureStage" }] : /* istanbul ignore next */ []));
        this.view = computed(() => {
            const m = this.model();
            // `stageWidth()` is read INSIDE the computed so a resize recomputes the layout. Passing it in from outside
            // would capture it once, and the shelf would keep the column count it had when the panel first rendered.
            return m
                ? layoutErModel(m.entityTypes, m.relationships, this.stageWidth() || undefined)
                : { boxes: [], paths: [], width: 0, height: 0 };
        }, ...(ngDevMode ? [{ debugName: "view" }] : /* istanbul ignore next */ []));
        effect(() => { const id = this.spaceId(); if (id)
            this.fetch(id); });
    }
    reload() { const id = this.spaceId(); if (id)
        this.fetch(id); }
    fetch(spaceId) {
        this.loading.set(true);
        this.error.set('');
        this.api.getErModel(spaceId).subscribe({
            next: res => {
                // A proxy space answers with its members rather than one model. Showing the first would be a
                // diagram labelled with the proxy's name and drawn from one member's data, which is worse than
                // saying it is not supported here.
                this.model.set('members' in res ? null : res);
                this.loading.set(false);
            },
            error: (err) => {
                // A failed load must never read as "this space has no types" — that is a statement about the space
                // and this is a statement about the request.
                this.error.set(httpErrorReason(err));
                this.loading.set(false);
            },
        });
    }
    static { this.ɵfac = function ErModelPanelComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ErModelPanelComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ErModelPanelComponent, selectors: [["app-er-model-panel"]], viewQuery: function ErModelPanelComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuerySignal(ctx.stage, _c0, 5);
        } if (rf & 2) {
            i0.ɵɵqueryAdvance();
        } }, inputs: { spaceId: [1, "spaceId"], canEdit: [1, "canEdit"] }, outputs: { editType: "editType" }, decls: 3, vars: 1, consts: [["stage", ""], [3, "message", "reason"], [3, "rows"], [3, "retry", "message", "reason"], [1, "note"], [1, "stage"], ["role", "img"], ["id", "er-arrow", "viewBox", "0 0 8 8", "refX", "7.2", "refY", "4", "markerWidth", "6.5", "markerHeight", "6.5", "orient", "auto"], ["d", "M0 1 L7 4 L0 7 z", "fill", "var(--graph-edge)"], [1, "joing"], [1, "note", "warn"], ["marker-end", "url(#er-arrow)", 1, "join"], [1, "join-hit"], [1, "join-label"], [1, "card", "kind-card", 3, "empty-type"], [1, "card", 3, "empty-type"], [1, "card", "kind-card"], ["rx", "8", 1, "box-bg", "kind-bg"], ["height", "26", "rx", "8", 1, "box-head", "kind-head"], ["height", "8", 1, "box-head", "kind-head"], [1, "box-name"], [1, "count-link", 3, "routerLink", "queryParams"], ["text-anchor", "end", 1, "count"], [1, "box-prop", "kind-note"], [1, "card"], ["rx", "8", 1, "box-bg"], ["height", "26", "rx", "8", 1, "box-head"], ["height", "8", 1, "box-head"], ["role", "button", "tabindex", "0", 1, "pen"], [1, "box-prop"], ["fill", "var(--warning)", 1, "box-prop"], ["role", "button", "tabindex", "0", 1, "pen", 3, "click", "keydown.enter"], ["width", "22", "height", "20", "rx", "4", "fill", "var(--bg-elevated)", "stroke", "var(--border)"], ["text-anchor", "middle", "font-size", "12", "fill", "var(--text-secondary)"]], template: function ErModelPanelComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, ErModelPanelComponent_Conditional_0_Template, 2, 4, "app-error-state", 1)(1, ErModelPanelComponent_Conditional_1_Template, 1, 1, "app-skeleton-lines", 2)(2, ErModelPanelComponent_Conditional_2_Template, 2, 1);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.error()) ? 0 : ctx.loading() ? 1 : (tmp_0_0 = ctx.model()) ? 2 : -1, tmp_0_0);
        } }, dependencies: [RouterLink, SkeletonLinesComponent, ErrorStateComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; }\n    .stage[_ngcontent-%COMP%] { padding: 16px; overflow-x: auto; }\n    svg[_ngcontent-%COMP%] { display: block; }\n    .box-bg[_ngcontent-%COMP%] { fill: var(--bg-surface); stroke: var(--border); }\n    .box-head[_ngcontent-%COMP%] { fill: var(--bg-elevated); }\n    .box-name[_ngcontent-%COMP%] { font-size: 12.5px; font-weight: 600; fill: var(--text-primary); }\n    .box-prop[_ngcontent-%COMP%] { font-size: 10.5px; fill: var(--text-muted); font-family: var(--font-mono); }\n    \n\n\n\n    .kind-bg[_ngcontent-%COMP%] { fill: none; stroke: var(--border); stroke-dasharray: 4 3; }\n    .kind-head[_ngcontent-%COMP%] { fill: color-mix(in srgb, var(--bg-elevated) 55%, transparent); }\n    .kind-note[_ngcontent-%COMP%] { font-style: italic; font-family: inherit; }\n    .join[_ngcontent-%COMP%] { fill: none; stroke: var(--graph-edge); stroke-width: 1.25; transition: stroke .1s ease, stroke-width .1s ease; }\n    \n\n\n    .join-hit[_ngcontent-%COMP%] { fill: none; stroke: transparent; stroke-width: 14; cursor: default; }\n    .join-label[_ngcontent-%COMP%] {\n      font-size: 10.5px; fill: var(--graph-edge-label); font-family: var(--font-mono);\n      \n\n\n      paint-order: stroke; stroke: var(--bg-surface); stroke-width: 3px; stroke-linejoin: round;\n      transition: fill .1s ease;\n    }\n    \n\n\n    .joing[_ngcontent-%COMP%]:hover   .join[_ngcontent-%COMP%] { stroke: var(--accent); stroke-width: 2.25; }\n    .joing[_ngcontent-%COMP%]:hover   .join-label[_ngcontent-%COMP%] { fill: var(--accent); }\n    \n\n\n\n    svg[_ngcontent-%COMP%]:has(.joing:hover)   .joing[_ngcontent-%COMP%]:not(:hover)   .join[_ngcontent-%COMP%] { stroke-opacity: .35; }\n    svg[_ngcontent-%COMP%]:has(.joing:hover)   .joing[_ngcontent-%COMP%]:not(:hover)   .join-label[_ngcontent-%COMP%] { opacity: .35; }\n    .count[_ngcontent-%COMP%] { font-size: 11px; font-family: var(--font-mono); fill: var(--text-secondary); }\n    a.count-link[_ngcontent-%COMP%] { cursor: pointer; }\n    a.count-link[_ngcontent-%COMP%]:hover   .count[_ngcontent-%COMP%], a.count-link[_ngcontent-%COMP%]:focus-visible   .count[_ngcontent-%COMP%] { fill: var(--accent); }\n    a.count-link[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .pen[_ngcontent-%COMP%] { opacity: 0; cursor: pointer; transition: opacity .12s ease; }\n    .card[_ngcontent-%COMP%]:hover   .pen[_ngcontent-%COMP%], .card[_ngcontent-%COMP%]:focus-within   .pen[_ngcontent-%COMP%] { opacity: 1; }\n    .undeclared[_ngcontent-%COMP%] { stroke: var(--warning); stroke-opacity: .55; stroke-dasharray: 3 2.5; }\n    .empty-type[_ngcontent-%COMP%] { opacity: .65; }\n    .note[_ngcontent-%COMP%] { padding: 10px 16px; border-top: 1px solid var(--border-muted); font-size: 12px; color: var(--text-muted); }\n    .note.warn[_ngcontent-%COMP%] { color: var(--warning); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ErModelPanelComponent, [{
        type: Component,
        args: [{ selector: 'app-er-model-panel', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [RouterLink, TranslocoPipe, PhIconComponent, SkeletonLinesComponent, ErrorStateComponent], template: `
    @if (error(); as e) {
      <app-error-state [message]="'brain.overview.er.loadFailed' | transloco" [reason]="e" (retry)="reload()" />
    } @else if (loading()) {
      <app-skeleton-lines [rows]="4" />
    } @else if (model(); as m) {
      @if (m.entityTypes.length === 0) {
        <div class="note">{{ 'brain.overview.er.empty' | transloco }}</div>
      } @else {
        <div class="stage" #stage>
          <svg [attr.viewBox]="'0 0 ' + view().width + ' ' + view().height"
               [attr.width]="view().width" [attr.height]="view().height" role="img"
               [attr.aria-label]="'brain.overview.er.diagramLabel' | transloco">
            <defs>
              <marker id="er-arrow" viewBox="0 0 8 8" refX="7.2" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
                <path d="M0 1 L7 4 L0 7 z" fill="var(--graph-edge)" />
              </marker>
            </defs>

            <!-- Each join is a GROUP: the visible stroke, an invisible fat stroke to hover, and the label.
                 The hit path is why hover works at all — a 1.25 px line is not a pointer target, and hovering
                 the visible stroke alone would have been a feature nobody could trigger. The label carries a
                 painted halo (paint-order) so it stays readable where it crosses another lane. -->
            @for (p of view().paths; track p.from + p.label + p.to) {
              <g class="joing">
                <path class="join" [attr.d]="p.d" marker-end="url(#er-arrow)" />
                <path class="join-hit" [attr.d]="p.d" />
                <text class="join-label" [attr.x]="p.labelX" [attr.y]="p.labelY"
                      [attr.text-anchor]="p.labelAnchor">{{ p.label }} · {{ p.count }}</text>
              </g>
            }

            @for (b of view().boxes; track b.type) {
              <!-- A KIND box: memories, chrono or files, one per kind with that kind's total.
                   Deliberately not styled as an entity box. It has no properties and no naming pattern, so
                   giving it the schema treatment would present it as a type somebody declared — and it has no
                   pencil, because there is no schema here to edit.
                   The count links to that kind's own tab, which is the whole point of drawing it: the diagram
                   is the map, and every box on it should be a way in. -->
              @if (b.kind !== 'entity') {
                <g class="card kind-card" [class.empty-type]="b.count === 0">
                  <rect class="box-bg kind-bg" [attr.x]="b.x" [attr.y]="b.y"
                        [attr.width]="b.w" [attr.height]="b.h" rx="8" />
                  <rect class="box-head kind-head" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" height="26" rx="8" />
                  <rect class="box-head kind-head" [attr.x]="b.x" [attr.y]="b.y + 18" [attr.width]="b.w" height="8" />
                  <text class="box-name" [attr.x]="b.x + 14" [attr.y]="b.y + 18">{{ b.type }}</text>

                  <a class="count-link" [routerLink]="['/brain']"
                     [queryParams]="{ space: spaceId(), tab: tabForKind(b.kind) }"
                     [attr.aria-label]="('brain.overview.er.openRecords' | transloco) + ' ' + b.type">
                    <text class="count" [attr.x]="b.x + b.w - 12" [attr.y]="b.y + 18" text-anchor="end">{{ b.count }}</text>
                  </a>

                  <text class="box-prop kind-note" [attr.x]="b.x + 14" [attr.y]="b.y + 44">
                    {{ 'brain.overview.er.linkedRecords' | transloco }}
                  </text>
                </g>
              } @else if (typeOf(b.type); as t) {
                <g class="card" [class.empty-type]="t.count === 0">
                  <rect class="box-bg" [class.undeclared]="!t.declared" [attr.x]="b.x" [attr.y]="b.y"
                        [attr.width]="b.w" [attr.height]="b.h" rx="8" />
                  <rect class="box-head" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" height="26" rx="8" />
                  <rect class="box-head" [attr.x]="b.x" [attr.y]="b.y + 18" [attr.width]="b.w" height="8" />
                  <text class="box-name" [attr.x]="b.x + 14" [attr.y]="b.y + 18">{{ t.type }}</text>

                  <a class="count-link" [routerLink]="['/brain']"
                     [queryParams]="{ space: spaceId(), tab: 'entities', type: t.type }"
                     [attr.aria-label]="('brain.overview.er.openRecords' | transloco) + ' ' + t.type">
                    <text class="count" [attr.x]="b.x + b.w - 12" [attr.y]="b.y + 18" text-anchor="end">{{ t.count }}</text>
                  </a>

                  @if (canEdit()) {
                    <g class="pen" role="button" tabindex="0"
                       [attr.aria-label]="(t.declared ? 'brain.overview.er.editSchema' : 'brain.overview.er.declareSchema') | transloco"
                       (click)="editType.emit(t.type)" (keydown.enter)="editType.emit(t.type)">
                      <rect [attr.x]="b.x + b.w - 34" [attr.y]="b.y + b.h - 26" width="22" height="20" rx="4"
                            fill="var(--bg-elevated)" stroke="var(--border)" />
                      <text [attr.x]="b.x + b.w - 23" [attr.y]="b.y + b.h - 12" text-anchor="middle"
                            font-size="12" fill="var(--text-secondary)">{{ t.declared ? '✎' : '+' }}</text>
                    </g>
                  }

                  @for (p of t.properties.slice(0, 4); track p.name; let i = $index) {
                    <text class="box-prop" [attr.x]="b.x + 14" [attr.y]="b.y + 44 + i * 16">
                      {{ p.name }}{{ p.required ? ' *' : '' }}
                    </text>
                  }
                  @if (!t.declared) {
                    <text class="box-prop" [attr.x]="b.x + 14" [attr.y]="b.y + 44"
                          fill="var(--warning)">{{ 'brain.overview.er.notDeclared' | transloco }}</text>
                  }
                </g>
              }
            }
          </svg>
        </div>

        @if (m.truncated; as tr) {
          <div class="note warn">{{ 'brain.overview.er.truncated' | transloco: { scan: tr.scan, limit: tr.limit } }}</div>
        }
        @if (m.danglingEdges > 0) {
          <div class="note warn">{{ 'brain.overview.er.dangling' | transloco: { n: m.danglingEdges } }}</div>
        }
      }
    }
  `, styles: ["\n    :host { display: block; }\n    .stage { padding: 16px; overflow-x: auto; }\n    svg { display: block; }\n    .box-bg { fill: var(--bg-surface); stroke: var(--border); }\n    .box-head { fill: var(--bg-elevated); }\n    .box-name { font-size: 12.5px; font-weight: 600; fill: var(--text-primary); }\n    .box-prop { font-size: 10.5px; fill: var(--text-muted); font-family: var(--font-mono); }\n    /* A kind box is context, not a declared type. Dashed and unfilled so it reads as \"these records point\n       here\" rather than \"somebody defined this\" \u2014 the entity boxes are the subject of the diagram and must\n       stay the thing your eye lands on. No pencil either: there is no schema here to edit. */\n    .kind-bg { fill: none; stroke: var(--border); stroke-dasharray: 4 3; }\n    .kind-head { fill: color-mix(in srgb, var(--bg-elevated) 55%, transparent); }\n    .kind-note { font-style: italic; font-family: inherit; }\n    .join { fill: none; stroke: var(--graph-edge); stroke-width: 1.25; transition: stroke .1s ease, stroke-width .1s ease; }\n    /* The pointer target. Wide, invisible, and it must NOT paint: a stroke of transparent still receives\n       pointer events, which is exactly what a 1.25 px line cannot do on its own. */\n    .join-hit { fill: none; stroke: transparent; stroke-width: 14; cursor: default; }\n    .join-label {\n      font-size: 10.5px; fill: var(--graph-edge-label); font-family: var(--font-mono);\n      /* A halo, so a label crossing another lane is still readable. paint-order draws the stroke first and\n         the glyphs over it, which is the difference between an outline and a smear. */\n      paint-order: stroke; stroke: var(--bg-surface); stroke-width: 3px; stroke-linejoin: round;\n      transition: fill .1s ease;\n    }\n    /* Hovering anywhere on the join lights the line, its arrow and its label together. Grouping is what makes\n       that one rule instead of three coordinated ones. */\n    .joing:hover .join { stroke: var(--accent); stroke-width: 2.25; }\n    .joing:hover .join-label { fill: var(--accent); }\n    /* The whole diagram dims its other joins while one is hovered, so following a single edge across a busy\n       model is possible at all. Restrained \u2014 .35 still reads as present, which matters because the point is\n       to find one line among many rather than to hide the rest. */\n    svg:has(.joing:hover) .joing:not(:hover) .join { stroke-opacity: .35; }\n    svg:has(.joing:hover) .joing:not(:hover) .join-label { opacity: .35; }\n    .count { font-size: 11px; font-family: var(--font-mono); fill: var(--text-secondary); }\n    a.count-link { cursor: pointer; }\n    a.count-link:hover .count, a.count-link:focus-visible .count { fill: var(--accent); }\n    a.count-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n    .pen { opacity: 0; cursor: pointer; transition: opacity .12s ease; }\n    .card:hover .pen, .card:focus-within .pen { opacity: 1; }\n    .undeclared { stroke: var(--warning); stroke-opacity: .55; stroke-dasharray: 3 2.5; }\n    .empty-type { opacity: .65; }\n    .note { padding: 10px 16px; border-top: 1px solid var(--border-muted); font-size: 12px; color: var(--text-muted); }\n    .note.warn { color: var(--warning); }\n  "] }]
    }], () => [], { spaceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceId", required: true }] }], canEdit: [{ type: i0.Input, args: [{ isSignal: true, alias: "canEdit", required: false }] }], editType: [{ type: i0.Output, args: ["editType"] }], stage: [{ type: i0.ViewChild, args: ['stage', { isSignal: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ErModelPanelComponent, { className: "ErModelPanelComponent", filePath: "app/pages/brain/er-model-panel.component.ts", lineNumber: 207 }); })();
