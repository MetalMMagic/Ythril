import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RungPickerComponent } from './rung-picker.component';
import { SpaceAdminToggleComponent } from './space-admin-toggle.component';
import { RIGHT_AREAS } from './rights-glyph.component';
import { RightsCatalogService } from './rights-catalog.service';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.route;
const _forTrack1 = ($index, $item) => $item.method + $item.route;
function RightsMatrixComponent_For_7_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "th");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "button", 2);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵlistener("click", function RightsMatrixComponent_For_7_Template_button_click_3_listener() { const a_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.toggleExplain(a_r2)); });
    i0.ɵɵtext(6, "?");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const a_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 4, "tokens.rights.area." + a_r2), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(4, 6, "tokens.rights.area." + a_r2 + ".desc"))("aria-label", i0.ɵɵpipeBind1(5, 8, "tokens.rights.explain"))("aria-expanded", ctx_r2.explaining() === a_r2);
} }
function RightsMatrixComponent_For_24_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "td")(1, "app-rung-picker", 6);
    i0.ɵɵlistener("changed", function RightsMatrixComponent_For_24_Template_app_rung_picker_changed_1_listener($event) { const a_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.setFloor(a_r5, $event)); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_12_0;
    let tmp_13_0;
    const a_r5 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("value", ctx_r2.floorShown(a_r5))("area", a_r5)("implied", ((tmp_12_0 = ctx_r2.floorImplied(a_r5)) == null ? null : tmp_12_0.rung) ?? "none")("impliedBy", ((tmp_13_0 = ctx_r2.floorImplied(a_r5)) == null ? null : tmp_13_0.by) ?? null)("readonlyView", ctx_r2.readonlyView());
} }
function RightsMatrixComponent_For_28_For_4_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "td")(1, "app-rung-picker", 7);
    i0.ɵɵlistener("changed", function RightsMatrixComponent_For_28_For_4_Template_app_rung_picker_changed_1_listener($event) { const a_r8 = i0.ɵɵrestoreView(_r7).$implicit; const s_r9 = i0.ɵɵnextContext().$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.setCell(s_r9, a_r8, $event)); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_23_0;
    let tmp_24_0;
    const a_r8 = ctx.$implicit;
    const s_r9 = i0.ɵɵnextContext().$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("value", ctx_r2.cellShown(s_r9, a_r8))("area", a_r8)("floor", ctx_r2.floorOf(a_r8))("implied", ((tmp_23_0 = ctx_r2.cellImplied(s_r9, a_r8)) == null ? null : tmp_23_0.rung) ?? "none")("impliedBy", ((tmp_24_0 = ctx_r2.cellImplied(s_r9, a_r8)) == null ? null : tmp_24_0.by) ?? null)("readonlyView", ctx_r2.readonlyView());
} }
function RightsMatrixComponent_For_28_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr")(1, "td", 0);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(3, RightsMatrixComponent_For_28_For_4_Template, 2, 6, "td", null, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementStart(5, "td", 1)(6, "app-space-admin-toggle", 4);
    i0.ɵɵlistener("changed", function RightsMatrixComponent_For_28_Template_app_space_admin_toggle_changed_6_listener($event) { const s_r9 = i0.ɵɵrestoreView(_r6).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.setSpaceAdmin(s_r9, $event)); });
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const s_r9 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(s_r9);
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.areas);
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("on", ctx_r2.isSpaceAdmin(s_r9))("readonlyView", ctx_r2.readonlyView());
} }
function RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "ul", 8)(1, "li");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "li");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const d_r10 = ctx;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(3, 4, "tokens.rights.spaceAdmin.grants"), " ", d_r10.grants);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(6, 6, "tokens.rights.spaceAdmin.excludes"), " ", d_r10.excludes);
} }
function RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_7_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "code");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const n_r11 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(n_r11.route);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" \u2014 ", n_r11.why);
} }
function RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "ul", 8);
    i0.ɵɵrepeaterCreate(4, RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_7_For_5_Template, 4, 2, "li", null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext(3);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.rights.notAreaScoped"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r2.catalog.notAreaScoped());
} }
function RightsMatrixComponent_Conditional_29_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h4");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(6, RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_6_Template, 7, 8, "ul", 8);
    i0.ɵɵconditionalCreate(7, RightsMatrixComponent_Conditional_29_Conditional_1_Conditional_7_Template, 6, 3);
} if (rf & 2) {
    let tmp_5_0;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 4, "tokens.rights.spaceAdmin"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 6, "tokens.rights.spaceAdmin.desc"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_5_0 = ctx_r2.catalog.derived("spaceAdmin")) ? 6 : -1, tmp_5_0);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r2.catalog.notAreaScoped().length ? 7 : -1);
} }
function RightsMatrixComponent_Conditional_29_Conditional_2_For_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li")(1, "code");
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r12 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(r_r12);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" \u2014 ", i0.ɵɵpipeBind1(4, 2, "tokens.rights.rung." + r_r12 + ".desc"));
} }
function RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_9_For_12_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td")(2, "span", 12);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td", 13);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const r_r13 = ctx.$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(r_r13.method);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", r_r13.route);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(r_r13.needs);
} }
function RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10)(1, "table")(2, "thead")(3, "tr")(4, "th");
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(7, "th");
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(10, "tbody");
    i0.ɵɵrepeaterCreate(11, RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_9_For_12_Template, 7, 3, "tr", null, _forTrack1);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const a_r14 = i0.ɵɵnextContext(2);
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 2, "tokens.rights.endpoint"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 4, "tokens.rights.fromRung"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r2.catalog.routesFor(a_r14, "admin"));
} }
function RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "tokens.rights.endpointsUnavailable"));
} }
function RightsMatrixComponent_Conditional_29_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h4");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "ul", 8);
    i0.ɵɵrepeaterCreate(7, RightsMatrixComponent_Conditional_29_Conditional_2_For_8_Template, 5, 4, "li", null, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(9, RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_9_Template, 13, 6, "div", 10)(10, RightsMatrixComponent_Conditional_29_Conditional_2_Conditional_10_Template, 3, 3, "p", 11);
} if (rf & 2) {
    const a_r14 = i0.ɵɵnextContext();
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 3, "tokens.rights.area." + a_r14));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 5, "tokens.rights.area." + a_r14 + ".desc"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r2.rungs);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r2.catalog.catalog() ? 9 : ctx_r2.catalog.failed() ? 10 : -1);
} }
function RightsMatrixComponent_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 5);
    i0.ɵɵconditionalCreate(1, RightsMatrixComponent_Conditional_29_Conditional_1_Template, 8, 8)(2, RightsMatrixComponent_Conditional_29_Conditional_2_Template, 11, 7);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx === "spaceAdmin" ? 1 : 2);
} }
const EMPTY = () => ({ knowledge: 'none', files: 'none', schema: 'none', dataQuality: 'none' });
/**
 * The rights matrix: an all-spaces FLOOR on top, then one row per space.
 *
 * ## The floor is a minimum, not a bulk button
 *
 * Whatever it says, every space below is at least that — and so is every space created after this token was
 * minted. That is the whole reason the separate `spaces` allowlist could be dropped: a token reaches a
 * future space only if somebody said so here, deliberately, in advance.
 *
 * Rungs under the floor are therefore clamped in each cell rather than removed, so the reason a cell will
 * not go lower is visible where the click happens rather than inferred from a row above.
 *
 * ## Emits a whole matrix, never a patch
 *
 * The parent holds a draft and saves it as one thing. Emitting per-cell deltas would mean the parent
 * reassembles the object, which is a second place the shape is known — and the shape is what the server
 * caps and audits.
 */
export class RightsMatrixComponent {
    constructor() {
        this.rights = input.required(...(ngDevMode ? [{ debugName: "rights" }] : /* istanbul ignore next */ []));
        this.spaces = input.required(...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.changed = output();
        /** Display only — passed through to every cell. Used by the read-only view of your own rights. */
        this.readonlyView = input(false, ...(ngDevMode ? [{ debugName: "readonlyView" }] : /* istanbul ignore next */ []));
        this.areas = RIGHT_AREAS;
        /** Every rung EXCEPT `none`, which needs no explanation beyond the word. */
        this.rungs = ['read', 'write', 'admin'];
        this.catalog = inject(RightsCatalogService);
        /** Which area's explanation is open, or null. One at a time — two open panels stack the table off-screen. */
        this.explaining = signal(null, ...(ngDevMode ? [{ debugName: "explaining" }] : /* istanbul ignore next */ []));
        this.floorOf = (area) => this.rights().floor?.[area] ?? 'none';
        /**
         * What another area entails for this one — read from the catalog, never described here.
         *
         * Two scopes, one rule. The floor is compared against the floor's own other areas, a cell against that
         * space's other areas, which is exactly the split the server makes between `floorRung` and `effectiveRung`.
         * Passing the WRITTEN rung rather than `cellOf` matters: an implication must be entailed by what somebody
         * set, or two rules could compose into a grant nobody wrote down.
         */
        this.floorImplied = (area) => this.catalog.impliedFor(area, a => this.floorOf(a));
        this.cellImplied = (space, area) => this.catalog.impliedFor(area, a => {
            const row = this.rights().perSpace[space]?.[a] ?? 'none';
            const floor = this.floorOf(a);
            return rank(row) > rank(floor) ? row : floor;
        });
        /**
         * A cell shows the higher of its own row and the floor.
         *
         * Showing the stored row alone would display `none` for a space the token can in fact reach through the
         * floor — the cell would say one thing and the enforcement do another, in the direction that under-states
         * access. That is the direction that matters most on a screen somebody is auditing.
         */
        this.cellOf = (space, area) => {
            const row = this.rights().perSpace[space]?.[area] ?? 'none';
            const floor = this.floorOf(area);
            return rank(row) > rank(floor) ? row : floor;
        };
        /**
         * What the cell DISPLAYS: the written rung raised by anything another area entails.
         *
         * Same argument as the floor one rung up. A cell showing `none` for schema while the token holds
         * `knowledge: write` would say one thing and the server do another, in the direction that under-states
         * access — which is the direction that matters on a screen somebody is auditing.
         *
         * Nothing is written down for it. The stored matrix keeps saying what the operator set, and the implication
         * is resolved at enforcement, so dropping knowledge back to `read` returns schema to whatever it was rather
         * than leaving a grant nobody chose. Storing the inferred rung is how a temporary implication becomes
         * permanent access.
         */
        this.cellShown = (space, area) => {
            const held = this.cellOf(space, area);
            const implied = this.cellImplied(space, area);
            return implied && rank(implied.rung) > rank(held) ? implied.rung : held;
        };
        /** The floor cell's display value, raised the same way and for the same reason. */
        this.floorShown = (area) => {
            const held = this.floorOf(area);
            const implied = this.floorImplied(area);
            return implied && rank(implied.rung) > rank(held) ? implied.rung : held;
        };
        /**
         * Is this space administered — every area at its top rung?
         *
         * Reads the SHOWN value, not the stored one, so a row whose areas are all at admin because the floor put them
         * there reads as administered. That is what the server enforces, and a column that disagreed with the four
         * cells beside it would be worse than no column.
         */
        this.isSpaceAdmin = (space) => this.areas.every(a => this.cellShown(space, a) === 'admin');
        /** The same question for the floor row — every space, including ones created later. */
        this.floorIsAdmin = () => this.areas.every(a => this.floorShown(a) === 'admin');
    }
    ngOnInit() {
        // Asked for here rather than in the parent: any grid that renders is a grid someone may want explained,
        // and the service call is idempotent, so a second grid on the page costs nothing.
        this.catalog.load();
    }
    toggleExplain(area) {
        this.explaining.update(cur => (cur === area ? null : area));
    }
    setFloor(area, rung) {
        const r = this.rights();
        this.changed.emit({ ...r, floor: { ...(r.floor ?? EMPTY()), [area]: rung } });
    }
    setCell(space, area, rung) {
        const r = this.rights();
        const row = { ...(r.perSpace[space] ?? EMPTY()), [area]: rung };
        this.changed.emit({ ...r, perSpace: { ...r.perSpace, [space]: row } });
    }
    /**
     * Grant or withdraw space admin, writing the row WHOLESALE.
     *
     * Not a loop over `setCell`: that would emit four times and let a listener observe three inconsistent
     * intermediate states — a row that is briefly admin on knowledge and none on schema is a token that briefly
     * means something nobody asked for, and the parent form persists on change.
     *
     * Withdrawing sets every area to `none` rather than restoring what was there before. There is nothing to
     * restore to: the control expresses one state across four cells, so its off position is the empty row. The four
     * pickers remain the way to express anything in between, which is the model this column is a shortcut for and
     * must not replace.
     */
    setSpaceAdmin(space, on) {
        const r = this.rights();
        const row = Object.fromEntries(this.areas.map(a => [a, on ? 'admin' : 'none']));
        this.changed.emit({ ...r, perSpace: { ...r.perSpace, [space]: row } });
    }
    /** Same, for the floor. One emit, whole object. */
    setFloorAdmin(on) {
        const r = this.rights();
        const floor = Object.fromEntries(this.areas.map(a => [a, on ? 'admin' : 'none']));
        this.changed.emit({ ...r, floor });
    }
    static { this.ɵfac = function RightsMatrixComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RightsMatrixComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RightsMatrixComponent, selectors: [["app-rights-matrix"]], inputs: { rights: [1, "rights"], spaces: [1, "spaces"], readonlyView: [1, "readonlyView"] }, outputs: { changed: "changed" }, decls: 30, vars: 22, consts: [[1, "l"], [1, "admincol"], ["type", "button", 1, "area-info", 3, "click"], [1, "floor"], [3, "changed", "on", "readonlyView"], [1, "explain"], [3, "changed", "value", "area", "implied", "impliedBy", "readonlyView"], [3, "changed", "value", "area", "floor", "implied", "impliedBy", "readonlyView"], [1, "rungs"], [1, "muted"], [1, "scroll"], [1, "miss"], [1, "meth"], [1, "needs"]], template: function RightsMatrixComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "table")(1, "thead")(2, "tr")(3, "th", 0);
            i0.ɵɵtext(4);
            i0.ɵɵpipe(5, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵrepeaterCreate(6, RightsMatrixComponent_For_7_Template, 7, 10, "th", null, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementStart(8, "th", 1);
            i0.ɵɵtext(9);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵelementStart(11, "button", 2);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵpipe(13, "transloco");
            i0.ɵɵlistener("click", function RightsMatrixComponent_Template_button_click_11_listener() { return ctx.toggleExplain("spaceAdmin"); });
            i0.ɵɵtext(14, "?");
            i0.ɵɵelementEnd()()()();
            i0.ɵɵelementStart(15, "tbody")(16, "tr", 3)(17, "td", 0);
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementStart(20, "small");
            i0.ɵɵtext(21);
            i0.ɵɵpipe(22, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵrepeaterCreate(23, RightsMatrixComponent_For_24_Template, 2, 5, "td", null, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementStart(25, "td", 1)(26, "app-space-admin-toggle", 4);
            i0.ɵɵlistener("changed", function RightsMatrixComponent_Template_app_space_admin_toggle_changed_26_listener($event) { return ctx.setFloorAdmin($event); });
            i0.ɵɵelementEnd()()();
            i0.ɵɵrepeaterCreate(27, RightsMatrixComponent_For_28_Template, 7, 3, "tr", null, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(29, RightsMatrixComponent_Conditional_29_Template, 3, 1, "div", 5);
        } if (rf & 2) {
            let tmp_12_0;
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 10, "tokens.rights.space"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.areas);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(10, 12, "tokens.rights.spaceAdmin"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵattribute("title", i0.ɵɵpipeBind1(12, 14, "tokens.rights.spaceAdmin.desc"))("aria-label", i0.ɵɵpipeBind1(13, 16, "tokens.rights.explain"))("aria-expanded", ctx.explaining() === "spaceAdmin");
            i0.ɵɵadvance(7);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 18, "tokens.rights.allSpaces"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 20, "tokens.rights.allSpacesHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.areas);
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("on", ctx.floorIsAdmin())("readonlyView", ctx.readonlyView());
            i0.ɵɵadvance();
            i0.ɵɵrepeater(ctx.spaces());
            i0.ɵɵadvance(2);
            i0.ɵɵconditional((tmp_12_0 = ctx.explaining()) ? 29 : -1, tmp_12_0);
        } }, dependencies: [RungPickerComponent, SpaceAdminToggleComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: block; overflow-x: auto; }\n    table[_ngcontent-%COMP%] { border-collapse: collapse; width: 100%; font-size: 13px; }\n    th[_ngcontent-%COMP%], td[_ngcontent-%COMP%] { border-bottom: 1px solid var(--border-muted); padding: 8px 10px; text-align: center; }\n    th.l[_ngcontent-%COMP%], td.l[_ngcontent-%COMP%] { text-align: left; white-space: nowrap; font-weight: 600; }\n    thead[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { background: var(--bg-elevated); font-size: 11.5px; color: var(--text-secondary); font-weight: 620; }\n    tr.floor[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background: color-mix(in srgb, var(--accent) 6%, transparent); }\n    tr.floor[_ngcontent-%COMP%] { border-bottom: 2px solid var(--accent); }\n    tr.floor[_ngcontent-%COMP%]   td.l[_ngcontent-%COMP%] { color: var(--accent); }\n    td.l[_ngcontent-%COMP%]   small[_ngcontent-%COMP%] { display: block; font-weight: 400; font-size: 11px; color: var(--text-muted); }\n    .area-info[_ngcontent-%COMP%] {\n      \n\n\n\n      display: inline-flex; align-items: center; justify-content: center;\n      margin-left: 5px; width: 15px; height: 15px; padding: 0; line-height: 1;\n      border: 1px solid var(--border); border-radius: 50%;\n      background: var(--bg-surface); color: var(--text-muted);\n      font-size: 10px; font-weight: 700; cursor: pointer; vertical-align: middle;\n    }\n    .area-info[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    .area-info[aria-expanded=\"true\"][_ngcontent-%COMP%] { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }\n    .explain[_ngcontent-%COMP%] {\n      margin: 10px 0 2px; padding: 10px 12px; text-align: left;\n      border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated);\n    }\n    .explain[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] { margin: 0 0 4px; font-size: 12.5px; }\n    .explain[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); }\n    .explain[_ngcontent-%COMP%]   .rungs[_ngcontent-%COMP%] { margin: 0 0 8px; padding: 0; list-style: none; font-size: 12px; }\n    .explain[_ngcontent-%COMP%]   .rungs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] { margin: 2px 0; color: var(--text-secondary); }\n    .explain[_ngcontent-%COMP%]   .rungs[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { font-weight: 650; color: var(--text-primary); }\n    .explain[_ngcontent-%COMP%]   table[_ngcontent-%COMP%] { font-size: 11.5px; font-family: var(--font-mono, monospace); }\n    .explain[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], .explain[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding: 3px 8px; text-align: left; border-bottom: none; }\n    .explain[_ngcontent-%COMP%]   .meth[_ngcontent-%COMP%] { color: var(--accent); font-weight: 650; }\n    .explain[_ngcontent-%COMP%]   .needs[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .explain[_ngcontent-%COMP%]   .scroll[_ngcontent-%COMP%] { max-height: 240px; overflow-y: auto; }\n    .explain[_ngcontent-%COMP%]   .miss[_ngcontent-%COMP%] { font-size: 12px; color: var(--text-muted); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RightsMatrixComponent, [{
        type: Component,
        args: [{ selector: 'app-rights-matrix', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [RungPickerComponent, SpaceAdminToggleComponent, TranslocoPipe], template: `
    <table>
      <thead>
        <tr>
          <th class="l">{{ 'tokens.rights.space' | transloco }}</th>
          @for (a of areas; track a) {
            <th>
              {{ 'tokens.rights.area.' + a | transloco }}
              <!-- The non-technical half rides on the header as a title, so it needs no click. The technical
                   half is a click, because a 37-route list is not a tooltip. -->
              <button class="area-info" type="button"
                      [attr.title]="'tokens.rights.area.' + a + '.desc' | transloco"
                      [attr.aria-label]="'tokens.rights.explain' | transloco"
                      [attr.aria-expanded]="explaining() === a"
                      (click)="toggleExplain(a)">?</button>
            </th>
          }
          <!-- SPACE ADMIN, and it is a column rather than a hidden shortcut because that is what was asked for.
               It is DERIVED: a space administrator is a token holding admin on all four areas of that space, and
               the server has enforced it since #937. The matrix showed four independent rungs and nothing said
               that all four at admin IS administering the space, so the commonest grant meant setting four cells
               and hoping none was missed. -->
          <th class="admincol">
            {{ 'tokens.rights.spaceAdmin' | transloco }}
            <button class="area-info" type="button"
                    [attr.title]="'tokens.rights.spaceAdmin.desc' | transloco"
                    [attr.aria-label]="'tokens.rights.explain' | transloco"
                    [attr.aria-expanded]="explaining() === 'spaceAdmin'"
                    (click)="toggleExplain('spaceAdmin')">?</button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="floor">
          <td class="l">{{ 'tokens.rights.allSpaces' | transloco }}<small>{{ 'tokens.rights.allSpacesHint' | transloco }}</small></td>
          @for (a of areas; track a) {
            <td>
              <app-rung-picker [value]="floorShown(a)" [area]="a"
                               [implied]="floorImplied(a)?.rung ?? 'none'" [impliedBy]="floorImplied(a)?.by ?? null"
                               [readonlyView]="readonlyView()" (changed)="setFloor(a, $event)"/>
            </td>
          }
          <td class="admincol">
            <app-space-admin-toggle [on]="floorIsAdmin()" [readonlyView]="readonlyView()"
                                    (changed)="setFloorAdmin($event)"/>
          </td>
        </tr>
        @for (s of spaces(); track s) {
          <tr>
            <td class="l">{{ s }}</td>
            @for (a of areas; track a) {
              <td>
                <app-rung-picker [value]="cellShown(s, a)" [area]="a" [floor]="floorOf(a)"
                                 [implied]="cellImplied(s, a)?.rung ?? 'none'" [impliedBy]="cellImplied(s, a)?.by ?? null"
                                 [readonlyView]="readonlyView()" (changed)="setCell(s, a, $event)"/>
              </td>
            }
            <td class="admincol">
              <app-space-admin-toggle [on]="isSpaceAdmin(s)" [readonlyView]="readonlyView()"
                                      (changed)="setSpaceAdmin(s, $event)"/>
            </td>
          </tr>
        }
      </tbody>
    </table>

    <!-- One panel, under the table, rather than a popover per column: the endpoint list for knowledge is 37
         rows, and a floating layer that long is unreadable inside a dialog that already scrolls.
         NOTE no backticks anywhere in this template, comments included — one ends the template string and the
         error points at @Component, never at the line that caused it. -->
    @if (explaining(); as a) {
      <div class="explain">
        <!-- SPACE ADMIN IS NOT AN AREA, so it gets the server's own words rather than an area key that does not
             exist. grants and excludes come from the rights-shape endpoint, where requires is computed from
             SPACE_AREAS — so this is the description that cannot drift. A sentence written here would be a second
             copy of a containment rule that has already been red-teamed. -->
        @if (a === 'spaceAdmin') {
          <h4>{{ 'tokens.rights.spaceAdmin' | transloco }}</h4>
          <p>{{ 'tokens.rights.spaceAdmin.desc' | transloco }}</p>
          @if (catalog.derived('spaceAdmin'); as d) {
            <ul class="rungs">
              <li>{{ 'tokens.rights.spaceAdmin.grants' | transloco }} {{ d.grants }}</li>
              <li>{{ 'tokens.rights.spaceAdmin.excludes' | transloco }} {{ d.excludes }}</li>
            </ul>
          }
          <!-- The routes NO area governs, from the server's own exemption list. This belongs in the Space
               Admin panel because it answers the question the panel raises: if the four areas do not cover
               renaming a space, what does. Before this the answer existed only in server source, so a grid
               of four areas read as complete while three space-scoped routes sat outside all of them. -->
          @if (catalog.notAreaScoped().length) {
            <p class="muted">{{ 'tokens.rights.notAreaScoped' | transloco }}</p>
            <ul class="rungs">
              @for (n of catalog.notAreaScoped(); track n.route) {
                <li><code>{{ n.route }}</code> — {{ n.why }}</li>
              }
            </ul>
          }
        } @else {
        <h4>{{ 'tokens.rights.area.' + a | transloco }}</h4>
        <p>{{ 'tokens.rights.area.' + a + '.desc' | transloco }}</p>

        <!-- The rung meanings are stated once, not once per area: a rung means the same thing everywhere,
             because each contains the one below. Four sentences instead of sixteen that can disagree. -->
        <ul class="rungs">
          @for (r of rungs; track r) {
            <li><code>{{ r }}</code> — {{ 'tokens.rights.rung.' + r + '.desc' | transloco }}</li>
          }
        </ul>

        @if (catalog.catalog()) {
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>{{ 'tokens.rights.endpoint' | transloco }}</th>
                  <th>{{ 'tokens.rights.fromRung' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of catalog.routesFor(a, 'admin'); track r.method + r.route) {
                  <tr>
                    <td><span class="meth">{{ r.method }}</span> {{ r.route }}</td>
                    <td class="needs">{{ r.needs }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (catalog.failed()) {
          <!-- The grid must not depend on its own explanation loading. -->
          <p class="miss">{{ 'tokens.rights.endpointsUnavailable' | transloco }}</p>
        }
        }
      </div>
    }
  `, styles: ["\n    :host { display: block; overflow-x: auto; }\n    table { border-collapse: collapse; width: 100%; font-size: 13px; }\n    th, td { border-bottom: 1px solid var(--border-muted); padding: 8px 10px; text-align: center; }\n    th.l, td.l { text-align: left; white-space: nowrap; font-weight: 600; }\n    thead th { background: var(--bg-elevated); font-size: 11.5px; color: var(--text-secondary); font-weight: 620; }\n    tr.floor td { background: color-mix(in srgb, var(--accent) 6%, transparent); }\n    tr.floor { border-bottom: 2px solid var(--accent); }\n    tr.floor td.l { color: var(--accent); }\n    td.l small { display: block; font-weight: 400; font-size: 11px; color: var(--text-muted); }\n    .area-info {\n      /* Flex-centred, not left to text metrics. A bare ? has left side bearing, so in a 15px circle at\n         10px it sits visibly left of centre - reported as the help question-marks being off. A button's\n         default text centring works on the ADVANCE width, which is not where the ink is. */\n      display: inline-flex; align-items: center; justify-content: center;\n      margin-left: 5px; width: 15px; height: 15px; padding: 0; line-height: 1;\n      border: 1px solid var(--border); border-radius: 50%;\n      background: var(--bg-surface); color: var(--text-muted);\n      font-size: 10px; font-weight: 700; cursor: pointer; vertical-align: middle;\n    }\n    .area-info:hover { border-color: var(--accent); color: var(--accent); }\n    .area-info[aria-expanded=\"true\"] { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }\n    .explain {\n      margin: 10px 0 2px; padding: 10px 12px; text-align: left;\n      border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated);\n    }\n    .explain h4 { margin: 0 0 4px; font-size: 12.5px; }\n    .explain p { margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); }\n    .explain .rungs { margin: 0 0 8px; padding: 0; list-style: none; font-size: 12px; }\n    .explain .rungs li { margin: 2px 0; color: var(--text-secondary); }\n    .explain .rungs code { font-weight: 650; color: var(--text-primary); }\n    .explain table { font-size: 11.5px; font-family: var(--font-mono, monospace); }\n    .explain table th, .explain table td { padding: 3px 8px; text-align: left; border-bottom: none; }\n    .explain .meth { color: var(--accent); font-weight: 650; }\n    .explain .needs { color: var(--text-muted); }\n    .explain .scroll { max-height: 240px; overflow-y: auto; }\n    .explain .miss { font-size: 12px; color: var(--text-muted); }\n  "] }]
    }], null, { rights: [{ type: i0.Input, args: [{ isSignal: true, alias: "rights", required: true }] }], spaces: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaces", required: true }] }], changed: [{ type: i0.Output, args: ["changed"] }], readonlyView: [{ type: i0.Input, args: [{ isSignal: true, alias: "readonlyView", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RightsMatrixComponent, { className: "RightsMatrixComponent", filePath: "app/pages/settings/rights-matrix.component.ts", lineNumber: 208 }); })();
const ORDER = ['none', 'read', 'write', 'admin'];
const rank = (r) => ORDER.indexOf(r);
