import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { GRAPH_RECORD_CARD_STYLES } from './graph.styles';
import { memoryText, chronoText } from './graph-details';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
function GraphNodeRecordCardComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 2);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "graph.recordUnavailable." + ctx));
} }
function GraphNodeRecordCardComponent_Conditional_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.type"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().type);
} }
function GraphNodeRecordCardComponent_Conditional_1_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.description"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().description);
} }
function GraphNodeRecordCardComponent_Conditional_1_Conditional_8_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 9);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r2 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r2);
} }
function GraphNodeRecordCardComponent_Conditional_1_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div");
    i0.ɵɵrepeaterCreate(5, GraphNodeRecordCardComponent_Conditional_1_Conditional_8_For_6_Template, 2, 1, "span", 9, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "common.form.tags"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r0.record().tags);
} }
function GraphNodeRecordCardComponent_Conditional_1_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(4, "app-properties-view", 10);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("properties", ctx_r0.record().properties);
} }
function GraphNodeRecordCardComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(6, GraphNodeRecordCardComponent_Conditional_1_Conditional_6_Template, 6, 4, "div", 0);
    i0.ɵɵconditionalCreate(7, GraphNodeRecordCardComponent_Conditional_1_Conditional_7_Template, 6, 4, "div", 0);
    i0.ɵɵconditionalCreate(8, GraphNodeRecordCardComponent_Conditional_1_Conditional_8_Template, 7, 3, "div", 0);
    i0.ɵɵconditionalCreate(9, GraphNodeRecordCardComponent_Conditional_1_Conditional_9_Template, 5, 4, "div", 0);
    i0.ɵɵelement(10, "hr", 5);
    i0.ɵɵelementStart(11, "div", 0)(12, "div", 3);
    i0.ɵɵtext(13, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "div", 6);
    i0.ɵɵtext(15);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(16, "div", 7)(17, "div", 3);
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "div", 8);
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "date");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_5_0;
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 9, ctx_r0.nameLabel()));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.displayName());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().type ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().description ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(((tmp_5_0 = ctx_r0.record().tags) == null ? null : tmp_5_0.length) ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().properties && ctx_r0.objectKeys(ctx_r0.record().properties).length ? 9 : -1);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(ctx_r0.record()._id);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 11, "common.createdAt"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(22, 13, ctx_r0.record().createdAt, "dd.MM.yyyy HH:mm"));
} }
function GraphNodeRecordCardComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
function GraphEdgeRecordCardComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 2);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "graph.recordUnavailable." + ctx));
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.type"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().type);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.description"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().description);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.weight"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().weight);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_9_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 9);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const t_r2 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(t_r2);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div");
    i0.ɵɵrepeaterCreate(5, GraphEdgeRecordCardComponent_Conditional_1_Conditional_9_For_6_Template, 2, 1, "span", 9, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 1, "common.form.tags"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r0.record().tags);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(4, "app-properties-view", 10);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "common.form.properties"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("properties", ctx_r0.record().properties);
} }
function GraphEdgeRecordCardComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 3);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "div", 4);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(6, GraphEdgeRecordCardComponent_Conditional_1_Conditional_6_Template, 6, 4, "div", 0);
    i0.ɵɵconditionalCreate(7, GraphEdgeRecordCardComponent_Conditional_1_Conditional_7_Template, 6, 4, "div", 0);
    i0.ɵɵconditionalCreate(8, GraphEdgeRecordCardComponent_Conditional_1_Conditional_8_Template, 6, 4, "div", 0);
    i0.ɵɵconditionalCreate(9, GraphEdgeRecordCardComponent_Conditional_1_Conditional_9_Template, 7, 3, "div", 0);
    i0.ɵɵconditionalCreate(10, GraphEdgeRecordCardComponent_Conditional_1_Conditional_10_Template, 5, 4, "div", 0);
    i0.ɵɵelement(11, "hr", 5);
    i0.ɵɵelementStart(12, "div", 0)(13, "div", 3);
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(16, "div", 6);
    i0.ɵɵtext(17);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(18, "div", 0)(19, "div", 3);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "div", 6);
    i0.ɵɵtext(23);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 7)(25, "div", 3);
    i0.ɵɵtext(26, "_id");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "div", 8);
    i0.ɵɵtext(28);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_6_0;
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 12, "brain.edges.table.relation"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().label);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().type ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().description ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().weight !== undefined && ctx_r0.record().weight !== null ? 8 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(((tmp_6_0 = ctx_r0.record().tags) == null ? null : tmp_6_0.length) ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r0.record().properties && ctx_r0.objectKeys(ctx_r0.record().properties).length ? 10 : -1);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 14, "common.form.from"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().fromName || ctx_r0.selected().from);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 16, "common.form.to"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r0.record().toName || ctx_r0.selected().to);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(ctx_r0.record()._id);
} }
function GraphEdgeRecordCardComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "common.loading"));
} }
const _c0 = "\n\n  [_nghost-%COMP%] {\n    display: block;\n    flex: 0 0 50%;\n    border-right: 1px solid var(--border);\n    overflow-y: auto;\n    padding: 12px 14px;\n  }\n\n\n  \n\n  .drawer-field[_ngcontent-%COMP%] { margin-bottom: 14px; }\n  .drawer-label[_ngcontent-%COMP%] {\n    font-size: 10px;\n    font-weight: 600;\n    color: var(--text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    margin-bottom: 4px;\n  }\n  .drawer-value[_ngcontent-%COMP%] {\n    font-size: 12px;\n    color: var(--text-primary);\n    white-space: pre-wrap;\n    word-break: break-word;\n    line-height: 1.5;\n  }\n  \n\n\n  .drawer-muted[_ngcontent-%COMP%] { color: var(--text-muted); }\n  .drawer-hr[_ngcontent-%COMP%] { border: none; border-top: 1px solid var(--border); margin: 12px 0; }\n  .drawer-readonly-value[_ngcontent-%COMP%] {\n    font-size: 12px;\n    color: var(--text-muted);\n    padding: 4px 8px;\n    border: 1px solid var(--border-muted, var(--border));\n    border-radius: var(--radius-sm);\n    background: var(--bg-elevated);\n    word-break: break-all;\n    line-height: 1.4;\n  }\n  .drawer-tag[_ngcontent-%COMP%] {\n    display: inline-block;\n    padding: 1px 7px;\n    border-radius: 10px;\n    font-size: 11px;\n    background: var(--bg-elevated);\n    color: var(--text-secondary);\n    border: 1px solid var(--border);\n    margin: 2px 3px 2px 0;\n  }";
/**
 * The record cards in the graph side panel — the LEFT column, showing the record a selection resolved to.
 *
 * Extracted because `graph.component.ts` sits at its size freeze in `no-new-god-files.test.js` and every
 * behaviour change trips it. The cards are the largest self-contained block in that template, and as children
 * they become testable without a cytoscape mock.
 *
 * ## Two components, not one with a mode
 *
 * The node card and the edge card share every class and the field-row idiom, and differ in four ways: the
 * edge card carries `weight`, shows `from`/`to` with a fallback, labels its first row `relation` rather than
 * `name`, and has **no unavailable branch at all**. A single component with a `kind` input would be two
 * components wearing one name, and unifying the two templates would change behaviour rather than move it.
 *
 * They live in one FILE so the divergence is visible side by side. Whether it should be closed is a product
 * question (see G-6, which is about the unavailable branch the edge card lacks), and it is not answered by a
 * refactor.
 *
 * ## `:host` carries `.record-card`, and that is load-bearing
 *
 * `.record-card { flex: 0 0 50%; border-right }` is what makes `.side-panel-body { display: flex }` a
 * two-column layout. The class is set on the HOST rather than on an inner wrapper so the flex sizing applies
 * to the element the parent actually lays out — an inner div would leave the host unsized and the column
 * would collapse.
 *
 * The rules moved here with the markup for the reason `graph-linked-records.component.ts` already records:
 * the parent's styles are scoped to the parent's own template, so markup moved into a child renders
 * **unstyled** unless its rules move with it — and no unit test can see that.
 *
 * ## What is deliberately unchanged
 *
 * `<app-properties-view>` is given `[properties]` and **not** `schema`. It is the only one of five call sites
 * that omits it; passing the schema would be a behaviour change wearing a refactor's clothes.
 *
 * ## The four kinds, and the two defects still carried
 *
 * A graph node is one of four kinds, and since 3.6 a chrono entry, memory or file reaches the canvas through
 * its `entityIds` link. The card reads `kind` and asks `memoryText` / `chronoText` — the same functions the
 * linked-records list in this panel already uses — for the first row. It did not, and rendered a blank name
 * for a memory while its `fact` appeared nowhere (G-5).
 *
 * ## Saying why a record is absent — all three cards' worth
 *
 * An empty panel and an unfetchable record look identical to a reader, and only one of them is true. So a
 * file node (addressed by path, not id) and a synthetic edge (id derived at render time, no stored row) get a
 * sentence instead of a blank.
 *
 * Three things were wrong with that and are fixed together (G-6): the message and the record were two
 * independent `@if`s, so a file node rendered the explanation immediately above "Loading…" and contradicted
 * itself; the message asked for `class="muted"`, which is declared nowhere, so it rendered as ordinary body
 * text; and the EDGE card had no such branch at all — its `'derived'` string was translated into three
 * languages and unreachable on screen, because the only render site was in the node card and `onEdgeTap`
 * nulls the selected node first.
 */
export class GraphNodeRecordCardComponent {
    constructor() {
        /**
         * The fetched record, or null while it is in flight or could not be fetched.
         *
         * Typed as the union it has always RECEIVED. `loadNodeDetails` fetches by kind — `getRecord(space, 'memory',
         * id)` for a memory node — and then cast the result to `Entity`, which is what let the template read a
         * `name` that a memory does not have.
         */
        this.record = input(null, ...(ngDevMode ? [{ debugName: "record" }] : /* istanbul ignore next */ []));
        /** Which collection the node came from. Absent for an entity, as `TraverseNode.kind` reports it. */
        this.kind = input(null, ...(ngDevMode ? [{ debugName: "kind" }] : /* istanbul ignore next */ []));
        /** Why no record can be fetched, when that is a fact rather than a failure. */
        this.unavailable = input(null, ...(ngDevMode ? [{ debugName: "unavailable" }] : /* istanbul ignore next */ []));
        /**
         * The first row's value — the thing the record actually says.
         *
         * An entity has a `name`; a memory has a `fact` and a chrono a `title`, and NEITHER has a name. The card
         * read `name` unconditionally, so a memory node rendered an empty first row and its fact appeared nowhere
         * at all. Every other field happened to share a name and rendered, which is why it went unreported.
         *
         * `memoryText` and `chronoText` are not new: they already decide exactly this for the linked-records list
         * in the SAME panel, and they carry the fallback to `description` that a bare `fact` would miss. Reading
         * them here is what makes it one rule rather than two — the divergence WAS the defect.
         */
        this.displayName = computed(() => {
            const rec = this.record();
            if (!rec)
                return '';
            if (this.kind() === 'memory')
                return memoryText(rec);
            if (this.kind() === 'chrono')
                return chronoText(rec);
            return rec.name;
        }, ...(ngDevMode ? [{ debugName: "displayName" }] : /* istanbul ignore next */ []));
        /** The first row's LABEL, which has to move with its value or a fact is announced as a name. */
        this.nameLabel = computed(() => {
            if (this.kind() === 'memory')
                return 'brain.memories.table.fact';
            if (this.kind() === 'chrono')
                return 'brain.chrono.table.title';
            return 'brain.entities.table.name';
        }, ...(ngDevMode ? [{ debugName: "nameLabel" }] : /* istanbul ignore next */ []));
    }
    /** `Object.keys` for the template's properties guard — an empty object must hide the row, not show an empty view. */
    objectKeys(obj) { return Object.keys(obj); }
    static { this.ɵfac = function GraphNodeRecordCardComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphNodeRecordCardComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphNodeRecordCardComponent, selectors: [["app-graph-node-record-card"]], hostAttrs: [1, "record-card"], inputs: { record: [1, "record"], kind: [1, "kind"], unavailable: [1, "unavailable"] }, decls: 3, vars: 1, consts: [[1, "drawer-field"], [2, "font-size", "12px", "color", "var(--text-muted)", "padding", "8px 0"], [1, "drawer-value", "drawer-muted"], [1, "drawer-label"], [1, "drawer-value"], [1, "drawer-hr"], [1, "drawer-readonly-value", 2, "font-family", "var(--font-mono,monospace)", "font-size", "10px"], [1, "drawer-field", 2, "margin-bottom", "0"], [1, "drawer-readonly-value"], [1, "drawer-tag"], [3, "properties"]], template: function GraphNodeRecordCardComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, GraphNodeRecordCardComponent_Conditional_0_Template, 4, 3, "div", 0)(1, GraphNodeRecordCardComponent_Conditional_1_Template, 23, 16)(2, GraphNodeRecordCardComponent_Conditional_2_Template, 3, 3, "div", 1);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.unavailable()) ? 0 : ctx.record() ? 1 : 2, tmp_0_0);
        } }, dependencies: [CommonModule, PropertiesViewComponent, i1.DatePipe, TranslocoPipe], styles: [_c0], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphNodeRecordCardComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-node-record-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, TranslocoPipe, PropertiesViewComponent], host: { class: 'record-card' }, template: `
    <!--
      Why a record is absent, when that is a fact rather than a failure. Without it the panel is
      simply blank, and blank reads as "this record has nothing in it" — a statement about the data
      rather than about what could be fetched.
    -->
    @if (unavailable(); as why) {
      <div class="drawer-field">
        <div class="drawer-value drawer-muted">{{ 'graph.recordUnavailable.' + why | transloco }}</div>
      </div>
    } @else if (record()) {
      <div class="drawer-field">
        <div class="drawer-label">{{ nameLabel() | transloco }}</div>
        <div class="drawer-value">{{ displayName() }}</div>
      </div>
      @if (record()!.type) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
          <div class="drawer-value">{{ record()!.type }}</div>
        </div>
      }
      @if (record()!.description) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
          <div class="drawer-value">{{ record()!.description }}</div>
        </div>
      }
      @if (record()!.tags?.length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
          <div>
            @for (t of record()!.tags!; track t) {
              <span class="drawer-tag">{{ t }}</span>
            }
          </div>
        </div>
      }
      @if (record()!.properties && objectKeys(record()!.properties!).length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
          <app-properties-view [properties]="record()!.properties!" />
        </div>
      }
      <hr class="drawer-hr">
      <div class="drawer-field">
        <div class="drawer-label">_id</div>
        <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ record()!._id }}</div>
      </div>
      <div class="drawer-field" style="margin-bottom:0;">
        <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
      </div>
    } @else {
      <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
    }
  `, styles: ["\n  /* The card itself \u2014 this component IS the left column of a side panel. */\n  :host {\n    display: block;\n    flex: 0 0 50%;\n    border-right: 1px solid var(--border);\n    overflow-y: auto;\n    padding: 12px 14px;\n  }\n\n\n  /* Drawer fields (same pattern as brain component) */\n  .drawer-field { margin-bottom: 14px; }\n  .drawer-label {\n    font-size: 10px;\n    font-weight: 600;\n    color: var(--text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    margin-bottom: 4px;\n  }\n  .drawer-value {\n    font-size: 12px;\n    color: var(--text-primary);\n    white-space: pre-wrap;\n    word-break: break-word;\n    line-height: 1.5;\n  }\n  /* Why a panel is empty, said quietly. Without this rule the sentence inherits the drawer-value colour,\n     text-primary, and reads as a record's value rather than as an explanation of its absence. */\n  .drawer-muted { color: var(--text-muted); }\n  .drawer-hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }\n  .drawer-readonly-value {\n    font-size: 12px;\n    color: var(--text-muted);\n    padding: 4px 8px;\n    border: 1px solid var(--border-muted, var(--border));\n    border-radius: var(--radius-sm);\n    background: var(--bg-elevated);\n    word-break: break-all;\n    line-height: 1.4;\n  }\n  .drawer-tag {\n    display: inline-block;\n    padding: 1px 7px;\n    border-radius: 10px;\n    font-size: 11px;\n    background: var(--bg-elevated);\n    color: var(--text-secondary);\n    border: 1px solid var(--border);\n    margin: 2px 3px 2px 0;\n  }\n"] }]
    }], null, { record: [{ type: i0.Input, args: [{ isSignal: true, alias: "record", required: false }] }], kind: [{ type: i0.Input, args: [{ isSignal: true, alias: "kind", required: false }] }], unavailable: [{ type: i0.Input, args: [{ isSignal: true, alias: "unavailable", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphNodeRecordCardComponent, { className: "GraphNodeRecordCardComponent", filePath: "app/pages/graph/graph-record-card.component.ts", lineNumber: 127 }); })();
/**
 * The edge card. See the note above `GraphNodeRecordCardComponent` for why this is a second component rather
 * than a mode of that one.
 */
export class GraphEdgeRecordCardComponent {
    constructor() {
        /** The fetched edge record, or null while it is in flight or has none (a synthetic edge). */
        this.record = input(null, ...(ngDevMode ? [{ debugName: "record" }] : /* istanbul ignore next */ []));
        /**
         * Why no record can be fetched — the same signal the node card reads, and the edge card had no branch for
         * it at all.
         *
         * `loadEdgeDetails` sets `'derived'` for a synthetic edge, whose id is `<label>:<from>:<to>` and which has
         * no stored row. That string shipped in three locales and could never appear: the only render site was in
         * the NODE card, and `onEdgeTap` nulls the selected node before calling. So the panel said "Loading" for
         * ever — which is not merely unhelpful, it is the one message that promises something is coming.
         */
        this.unavailable = input(null, ...(ngDevMode ? [{ debugName: "unavailable" }] : /* istanbul ignore next */ []));
        /**
         * The edge as the TRAVERSAL reports it — read only for the `from`/`to` fallbacks.
         *
         * A second source, and the reason it is an input rather than derived: the endpoint rows show the resolved
         * NAMES when the record carries them and the raw ids when it does not, and the ids live on the traversal's
         * edge rather than on the fetched record.
         */
        this.selected = input(null, ...(ngDevMode ? [{ debugName: "selected" }] : /* istanbul ignore next */ []));
    }
    /** See the node card's. */
    objectKeys(obj) { return Object.keys(obj); }
    static { this.ɵfac = function GraphEdgeRecordCardComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphEdgeRecordCardComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphEdgeRecordCardComponent, selectors: [["app-graph-edge-record-card"]], hostAttrs: [1, "record-card"], inputs: { record: [1, "record"], unavailable: [1, "unavailable"], selected: [1, "selected"] }, decls: 3, vars: 1, consts: [[1, "drawer-field"], [2, "font-size", "12px", "color", "var(--text-muted)", "padding", "8px 0"], [1, "drawer-value", "drawer-muted"], [1, "drawer-label"], [1, "drawer-value"], [1, "drawer-hr"], [1, "drawer-readonly-value"], [1, "drawer-field", 2, "margin-bottom", "0"], [1, "drawer-readonly-value", 2, "font-family", "var(--font-mono,monospace)", "font-size", "10px"], [1, "drawer-tag"], [3, "properties"]], template: function GraphEdgeRecordCardComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, GraphEdgeRecordCardComponent_Conditional_0_Template, 4, 3, "div", 0)(1, GraphEdgeRecordCardComponent_Conditional_1_Template, 29, 18)(2, GraphEdgeRecordCardComponent_Conditional_2_Template, 3, 3, "div", 1);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.unavailable()) ? 0 : ctx.record() ? 1 : 2, tmp_0_0);
        } }, dependencies: [CommonModule, PropertiesViewComponent, TranslocoPipe], styles: [_c0], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphEdgeRecordCardComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-edge-record-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, TranslocoPipe, PropertiesViewComponent], host: { class: 'record-card' }, template: `
    <!--
      A synthetic edge has no stored record — its id is derived at render time — so there is nothing to fetch
      and saying so is the answer. This branch did not exist, and the string it renders was translated into
      three languages and unreachable on screen.
    -->
    @if (unavailable(); as why) {
      <div class="drawer-field">
        <div class="drawer-value drawer-muted">{{ 'graph.recordUnavailable.' + why | transloco }}</div>
      </div>
    } @else if (record()) {
      <div class="drawer-field">
        <div class="drawer-label">{{ 'brain.edges.table.relation' | transloco }}</div>
        <div class="drawer-value">{{ record()!.label }}</div>
      </div>
      @if (record()!.type) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
          <div class="drawer-value">{{ record()!.type }}</div>
        </div>
      }
      @if (record()!.description) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
          <div class="drawer-value">{{ record()!.description }}</div>
        </div>
      }
      @if (record()!.weight !== undefined && record()!.weight !== null) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.weight' | transloco }}</div>
          <div class="drawer-value">{{ record()!.weight }}</div>
        </div>
      }
      @if (record()!.tags?.length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
          <div>
            @for (t of record()!.tags!; track t) {
              <span class="drawer-tag">{{ t }}</span>
            }
          </div>
        </div>
      }
      @if (record()!.properties && objectKeys(record()!.properties!).length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
          <app-properties-view [properties]="record()!.properties!" />
        </div>
      }
      <hr class="drawer-hr">
      <div class="drawer-field">
        <div class="drawer-label">{{ 'common.form.from' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.fromName || selected()!.from }}</div>
      </div>
      <div class="drawer-field">
        <div class="drawer-label">{{ 'common.form.to' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.toName || selected()!.to }}</div>
      </div>
      <div class="drawer-field" style="margin-bottom:0;">
        <div class="drawer-label">_id</div>
        <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ record()!._id }}</div>
      </div>
    } @else {
      <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
    }
  `, styles: ["\n  /* The card itself \u2014 this component IS the left column of a side panel. */\n  :host {\n    display: block;\n    flex: 0 0 50%;\n    border-right: 1px solid var(--border);\n    overflow-y: auto;\n    padding: 12px 14px;\n  }\n\n\n  /* Drawer fields (same pattern as brain component) */\n  .drawer-field { margin-bottom: 14px; }\n  .drawer-label {\n    font-size: 10px;\n    font-weight: 600;\n    color: var(--text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    margin-bottom: 4px;\n  }\n  .drawer-value {\n    font-size: 12px;\n    color: var(--text-primary);\n    white-space: pre-wrap;\n    word-break: break-word;\n    line-height: 1.5;\n  }\n  /* Why a panel is empty, said quietly. Without this rule the sentence inherits the drawer-value colour,\n     text-primary, and reads as a record's value rather than as an explanation of its absence. */\n  .drawer-muted { color: var(--text-muted); }\n  .drawer-hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }\n  .drawer-readonly-value {\n    font-size: 12px;\n    color: var(--text-muted);\n    padding: 4px 8px;\n    border: 1px solid var(--border-muted, var(--border));\n    border-radius: var(--radius-sm);\n    background: var(--bg-elevated);\n    word-break: break-all;\n    line-height: 1.4;\n  }\n  .drawer-tag {\n    display: inline-block;\n    padding: 1px 7px;\n    border-radius: 10px;\n    font-size: 11px;\n    background: var(--bg-elevated);\n    color: var(--text-secondary);\n    border: 1px solid var(--border);\n    margin: 2px 3px 2px 0;\n  }\n"] }]
    }], null, { record: [{ type: i0.Input, args: [{ isSignal: true, alias: "record", required: false }] }], unavailable: [{ type: i0.Input, args: [{ isSignal: true, alias: "unavailable", required: false }] }], selected: [{ type: i0.Input, args: [{ isSignal: true, alias: "selected", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphEdgeRecordCardComponent, { className: "GraphEdgeRecordCardComponent", filePath: "app/pages/graph/graph-record-card.component.ts", lineNumber: 249 }); })();
