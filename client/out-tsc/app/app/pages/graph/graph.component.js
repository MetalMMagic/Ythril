import { ChangeDetectionStrategy, Component, Input, inject, signal, computed, effect, viewChild, } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ProxySpaceBadgeComponent } from '../../shared/proxy-space-badge.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { AuthApi } from '../../core/auth-api.service';
import { EntryPopupComponent } from '../../shared/entry-popup.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { GraphLinkedRecordsComponent } from './graph-linked-records.component';
import { GraphNodeRecordCardComponent, GraphEdgeRecordCardComponent } from './graph-record-card.component';
import { GraphPanelHeaderComponent } from './graph-panel-header.component';
import { GraphToolbarComponent } from './graph-toolbar.component';
import { TranslocoPipe } from '@jsverse/transloco';
// The record drawer and its state are shared with the Brain page rather than forked here: this page
// used to carry a copy that had drifted behind (no schema-driven properties, no confidence field, no
// tag suggestions, and its own retired entity-picker flyout).
import { RecordDrawerComponent } from '../brain/record-drawer.component';
import { RecordDrawerState } from '../brain/record-drawer-state.service';
import { BrainStore } from '../brain/brain-store.service';
import { EntityRefPicker } from '../brain/entity-ref-picker.service';
import { buildDetailRows, filterAndSortDetails, } from './graph-details';
import { emptyCache, decideFetch, applyResult, filterToDepth, } from './graph-traversal-cache';
import { DEFAULT_GRAPH_THEME, readGraphTheme, typeColor, buildElements, createGraphCytoscape, renderElements, } from './graph-cytoscape';
import { GRAPH_STYLES } from './graph.styles';
import { canWriteAnywhere } from '../../core/token-capability';
import { lookupForNode, lookupForEdge } from './graph-record-lookup';
import * as i0 from "@angular/core";
const _c0 = ["cyContainer"];
const _c1 = (a0, a1) => ({ nodes: a0, edges: a1 });
const _forTrack0 = ($index, $item) => $item.id;
function GraphComponent_Conditional_0_For_2_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-proxy-space-badge", 13);
} if (rf & 2) {
    const s_r2 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("proxyFor", s_r2.proxyFor)("size", 12);
} }
function GraphComponent_Conditional_0_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 12);
    i0.ɵɵlistener("click", function GraphComponent_Conditional_0_For_2_Template_button_click_0_listener() { const s_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.onSpaceChange(s_r2.id)); });
    i0.ɵɵtext(1);
    i0.ɵɵconditionalCreate(2, GraphComponent_Conditional_0_For_2_Conditional_2_Template, 1, 2, "app-proxy-space-badge", 13);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r2.activeSpaceId() === s_r2.id);
    i0.ɵɵattribute("aria-current", ctx_r2.activeSpaceId() === s_r2.id ? "true" : null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r2.label);
    i0.ɵɵadvance();
    i0.ɵɵconditional((s_r2.proxyFor == null ? null : s_r2.proxyFor.length) ? 2 : -1);
} }
function GraphComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵrepeaterCreate(1, GraphComponent_Conditional_0_For_2_Template, 3, 5, "button", 11, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.spaces());
} }
function GraphComponent_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 5);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementStart(3, "button", 14);
    i0.ɵɵlistener("click", function GraphComponent_Conditional_4_Template_button_click_3_listener() { i0.ɵɵrestoreView(_r4); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.truncated.set(false)); });
    i0.ɵɵelement(4, "ph-icon", 15);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(2, 2, "graph.truncated"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 14);
} }
function GraphComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 6);
    i0.ɵɵelement(1, "div", 16);
    i0.ɵɵelementEnd();
} }
function GraphComponent_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 7)(1, "app-error-state", 17);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("retry", function GraphComponent_Conditional_6_Template_app_error_state_retry_1_listener() { i0.ɵɵrestoreView(_r5); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.retryTraverse()); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(2, 2, "graph.error.load"))("reason", ctx_r2.loadError() ?? "");
} }
function GraphComponent_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 7)(1, "div", 18);
    i0.ɵɵelement(2, "ph-icon", 19);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "h3");
    i0.ɵɵtext(4);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "p");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 52);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "graph.empty.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "graph.empty.subtitle"));
} }
function GraphComponent_Conditional_10_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 9)(1, "app-graph-panel-header", 20);
    i0.ɵɵlistener("view", function GraphComponent_Conditional_10_Template_app_graph_panel_header_view_1_listener() { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.openEntityPopup(ctx_r2.selectedNode())); })("close", function GraphComponent_Conditional_10_Template_app_graph_panel_header_close_1_listener() { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.selectedNode.set(null)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(2, "div", 21);
    i0.ɵɵelement(3, "app-graph-node-record-card", 22);
    i0.ɵɵelementStart(4, "app-graph-linked-records", 23);
    i0.ɵɵtwoWayListener("typeFilterChange", function GraphComponent_Conditional_10_Template_app_graph_linked_records_typeFilterChange_4_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.detailTypeFilter, $event) || (ctx_r2.detailTypeFilter = $event); return i0.ɵɵresetView($event); })("descFilterChange", function GraphComponent_Conditional_10_Template_app_graph_linked_records_descFilterChange_4_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.detailDescFilter, $event) || (ctx_r2.detailDescFilter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("open", function GraphComponent_Conditional_10_Template_app_graph_linked_records_open_4_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.openDetailPopup($event)); });
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("color", ctx_r2.panelColor())("title", ctx_r2.panelTitle())("badge", ctx_r2.selectedNode().type || "entity");
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("record", ctx_r2.selectedEntityRecord())("kind", ctx_r2.selectedNode().kind ?? null)("unavailable", ctx_r2.recordUnavailable());
    i0.ɵɵadvance();
    i0.ɵɵproperty("memories", ctx_r2.filteredMemories())("chrono", ctx_r2.filteredChrono());
    i0.ɵɵtwoWayProperty("typeFilter", ctx_r2.detailTypeFilter)("descFilter", ctx_r2.detailDescFilter);
    i0.ɵɵproperty("emptyMemoriesKey", ctx_r2.detailFilterActive() ? "graph.panel.noMatches" : "graph.panel.noMemories")("emptyChronoKey", ctx_r2.detailFilterActive() ? "graph.panel.noMatches" : "graph.panel.noChronoEntries");
} }
function GraphComponent_Conditional_11_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 9)(1, "app-graph-panel-header", 24);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("view", function GraphComponent_Conditional_11_Template_app_graph_panel_header_view_1_listener() { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(); ctx_r2.popupRecord.set(ctx_r2.asRecord(ctx_r2.selectedEdgeRecord())); return i0.ɵɵresetView(ctx_r2.popupType.set("edge")); })("close", function GraphComponent_Conditional_11_Template_app_graph_panel_header_close_1_listener() { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(); ctx_r2.selectedEdge.set(null); return i0.ɵɵresetView(ctx_r2.selectedEdgeRecord.set(null)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 21);
    i0.ɵɵelement(4, "app-graph-edge-record-card", 25);
    i0.ɵɵelementStart(5, "app-graph-linked-records", 23);
    i0.ɵɵtwoWayListener("typeFilterChange", function GraphComponent_Conditional_11_Template_app_graph_linked_records_typeFilterChange_5_listener($event) { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.detailTypeFilter, $event) || (ctx_r2.detailTypeFilter = $event); return i0.ɵɵresetView($event); })("descFilterChange", function GraphComponent_Conditional_11_Template_app_graph_linked_records_descFilterChange_5_listener($event) { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r2.detailDescFilter, $event) || (ctx_r2.detailDescFilter = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("open", function GraphComponent_Conditional_11_Template_app_graph_linked_records_open_5_listener($event) { i0.ɵɵrestoreView(_r7); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.openDetailPopup($event)); });
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("color", ctx_r2.panelColor())("title", ctx_r2.panelTitle())("badge", i0.ɵɵpipeBind1(2, 13, "graph.drawer.badge.edge"))("canView", !!ctx_r2.selectedEdgeRecord());
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("record", ctx_r2.selectedEdgeRecord())("selected", ctx_r2.selectedEdge())("unavailable", ctx_r2.recordUnavailable());
    i0.ɵɵadvance();
    i0.ɵɵproperty("memories", ctx_r2.filteredMemories())("chrono", ctx_r2.filteredChrono());
    i0.ɵɵtwoWayProperty("typeFilter", ctx_r2.detailTypeFilter)("descFilter", ctx_r2.detailDescFilter);
    i0.ɵɵproperty("emptyMemoriesKey", ctx_r2.detailFilterActive() ? "graph.panel.noMatches" : "graph.panel.noLinkedMemories")("emptyChronoKey", ctx_r2.detailFilterActive() ? "graph.panel.noMatches" : "graph.panel.noLinkedChrono");
} }
function GraphComponent_Conditional_12_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-entry-popup", 26);
    i0.ɵɵlistener("closed", function GraphComponent_Conditional_12_Template_app_entry_popup_closed_0_listener() { i0.ɵɵrestoreView(_r8); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.closePopup()); })("saved", function GraphComponent_Conditional_12_Template_app_entry_popup_saved_0_listener($event) { i0.ɵɵrestoreView(_r8); const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.onPopupSaved($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵproperty("record", ctx_r2.popupRecord())("recordType", ctx_r2.popupType())("spaceId", ctx_r2.activeSpaceId())("canEdit", ctx_r2.canEdit());
} }
export class GraphComponent {
    constructor() {
        // ── DI ──────────────────────────────────────────────────────────────────────
        this.spacesApi = inject(SpacesApi);
        this.brainApi = inject(BrainApi);
        this.authApi = inject(AuthApi);
        this.location = inject(Location);
        this.route = inject(ActivatedRoute);
        this.store = inject(BrainStore);
        this.picker = inject(EntityRefPicker);
        this.drawerState = inject(RecordDrawerState);
        // ── Element refs ────────────────────────────────────────────────────────────
        this.cyContainer = viewChild('cyContainer', ...(ngDevMode ? [{ debugName: "cyContainer" }] : /* istanbul ignore next */ []));
        this.pendingFocusId = null;
        // ── State signals ───────────────────────────────────────────────────────────
        this.isEmbedded = signal(false, ...(ngDevMode ? [{ debugName: "isEmbedded" }] : /* istanbul ignore next */ []));
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.activeSpaceId = signal('', ...(ngDevMode ? [{ debugName: "activeSpaceId" }] : /* istanbul ignore next */ []));
        this.searchQuery = signal('', ...(ngDevMode ? [{ debugName: "searchQuery" }] : /* istanbul ignore next */ []));
        this.rootEntity = signal(null, ...(ngDevMode ? [{ debugName: "rootEntity" }] : /* istanbul ignore next */ []));
        this.depth = signal(2, ...(ngDevMode ? [{ debugName: "depth" }] : /* istanbul ignore next */ []));
        this.direction = signal('both', ...(ngDevMode ? [{ debugName: "direction" }] : /* istanbul ignore next */ []));
        this.hideLabels = signal(false, ...(ngDevMode ? [{ debugName: "hideLabels" }] : /* istanbul ignore next */ []));
        this.truncated = signal(false, ...(ngDevMode ? [{ debugName: "truncated" }] : /* istanbul ignore next */ []));
        this.selectedNode = signal(null, ...(ngDevMode ? [{ debugName: "selectedNode" }] : /* istanbul ignore next */ []));
        this.selectedEntityRecord = signal(null, ...(ngDevMode ? [{ debugName: "selectedEntityRecord" }] : /* istanbul ignore next */ []));
        this.selectedEdge = signal(null, ...(ngDevMode ? [{ debugName: "selectedEdge" }] : /* istanbul ignore next */ []));
        this.selectedEdgeRecord = signal(null, ...(ngDevMode ? [{ debugName: "selectedEdgeRecord" }] : /* istanbul ignore next */ []));
        /**
         * Why the detail panel has no record, when that is a fact rather than a failure.
         *
         * A file node is addressed by PATH and a graph node carries an id; a synthetic edge has no stored record at
         * all. Both used to issue a request that 404ed into `catchError`, so the panel opened empty and said
         * nothing — and an empty panel is indistinguishable from a record that failed to load. Only one of those is
         * worth a retry.
         *
         * ONE signal, not one per kind of selection: a node tap clears the edge and an edge tap clears the node, so
         * the panel only ever describes one thing. Two parallel signals could disagree, and the reason they carry
         * is what the message is chosen by anyway.
         */
        this.recordUnavailable = signal(null, ...(ngDevMode ? [{ debugName: "recordUnavailable" }] : /* istanbul ignore next */ []));
        this.nodeMemories = signal([], ...(ngDevMode ? [{ debugName: "nodeMemories" }] : /* istanbul ignore next */ []));
        this.nodeChrono = signal([], ...(ngDevMode ? [{ debugName: "nodeChrono" }] : /* istanbul ignore next */ []));
        this.detailTypeFilter = signal('all', ...(ngDevMode ? [{ debugName: "detailTypeFilter" }] : /* istanbul ignore next */ []));
        this.detailDescFilter = signal('', ...(ngDevMode ? [{ debugName: "detailDescFilter" }] : /* istanbul ignore next */ []));
        this.nodeCount = signal(0, ...(ngDevMode ? [{ debugName: "nodeCount" }] : /* istanbul ignore next */ []));
        this.edgeCount = signal(0, ...(ngDevMode ? [{ debugName: "edgeCount" }] : /* istanbul ignore next */ []));
        this.popupRecord = signal(null, ...(ngDevMode ? [{ debugName: "popupRecord" }] : /* istanbul ignore next */ []));
        this.popupType = signal('entity', ...(ngDevMode ? [{ debugName: "popupType" }] : /* istanbul ignore next */ []));
        this.canEdit = signal(false, ...(ngDevMode ? [{ debugName: "canEdit" }] : /* istanbul ignore next */ []));
        // -- Record drawer (memory / chrono) ----------------------------------------
        // Drawer state lives in the shared `RecordDrawerState` provided above. This page only opens it
        // and reacts to `lastSaved`; it holds no edit models of its own.
        this.loading = signal(false, ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
        /** Failure reason for the last traversal; null when it succeeded (U3). A
         *  failed traversal must not render as an empty graph (which reads as "no
         *  connections"). */
        this.loadError = signal(null, ...(ngDevMode ? [{ debugName: "loadError" }] : /* istanbul ignore next */ []));
        this.lastTraverse = null;
        // ── Computed ────────────────────────────────────────────────────────────────
        this.allDetails = computed(() => buildDetailRows(this.nodeMemories(), this.nodeChrono()), ...(ngDevMode ? [{ debugName: "allDetails" }] : /* istanbul ignore next */ []));
        /*
         * The sort arguments are FIXED, and saying so is the honest version of what was already happening. Nothing
         * could change them once the detail table moved to `graph-linked-records`, which filters but does not sort —
         * and the order is discarded anyway, because the only reader of this turns it into a Set of ids.
         */
        this.filteredDetails = computed(() => filterAndSortDetails(this.allDetails(), {
            type: this.detailTypeFilter(),
            text: this.detailDescFilter(),
            field: 'createdAt',
            asc: false,
        }), ...(ngDevMode ? [{ debugName: "filteredDetails" }] : /* istanbul ignore next */ []));
        /** True when the panel is showing less than everything — drives the "no matches" empty state. */
        this.detailFilterActive = computed(() => this.detailTypeFilter() !== 'all' || this.detailDescFilter().trim() !== '', ...(ngDevMode ? [{ debugName: "detailFilterActive" }] : /* istanbul ignore next */ []));
        /**
         * The surviving row ids, used to narrow the two lists.
         *
         * The lists render `Memory`/`ChronoEntry` records, not `DetailRow`s, and that matters: a chrono row
         * shows `startsAt` (when the thing happens) while a `DetailRow` only carries `createdAt` (when it was
         * written). Feeding rows straight through would silently swap the date on every chrono entry. So the
         * tested pipeline decides WHICH records survive, and the records themselves still supply what is drawn.
         */
        this.visibleDetailIds = computed(() => new Set(this.filteredDetails().map(r => r.id)), ...(ngDevMode ? [{ debugName: "visibleDetailIds" }] : /* istanbul ignore next */ []));
        this.filteredMemories = computed(() => {
            if (!this.detailFilterActive())
                return this.nodeMemories();
            const ids = this.visibleDetailIds();
            return this.nodeMemories().filter(m => ids.has(m._id));
        }, ...(ngDevMode ? [{ debugName: "filteredMemories" }] : /* istanbul ignore next */ []));
        this.filteredChrono = computed(() => {
            if (!this.detailFilterActive())
                return this.nodeChrono();
            const ids = this.visibleDetailIds();
            return this.nodeChrono().filter(c => ids.has(c._id));
        }, ...(ngDevMode ? [{ debugName: "filteredChrono" }] : /* istanbul ignore next */ []));
        this.panelTitle = computed(() => {
            const n = this.selectedNode();
            if (n)
                return n.name;
            const e = this.selectedEdge();
            if (e)
                return e.label || 'edge';
            return '';
        }, ...(ngDevMode ? [{ debugName: "panelTitle" }] : /* istanbul ignore next */ []));
        this.panelColor = computed(() => {
            const n = this.selectedNode();
            if (n)
                return this.typeColor(n.type || 'default');
            const e = this.selectedEdgeRecord();
            if (e)
                return this.typeColor(e.label || 'edge');
            return this.theme.fallback;
        }, ...(ngDevMode ? [{ debugName: "panelColor" }] : /* istanbul ignore next */ []));
        // ── Private state ───────────────────────────────────────────────────────────
        this.cy = null;
        this.subs = new Subscription();
        /** Palette read from CSS vars once the view exists; the default until then. */
        this.theme = DEFAULT_GRAPH_THEME;
        // Currently rendered (depth-filtered) view
        this.graphNodes = [];
        this.graphEdges = [];
        /** Full-depth traversal cache — what makes a shallower depth free. See `graph-traversal-cache.ts`. */
        this.cache = emptyCache();
        // One propagation point for the three places `activeSpaceId` is written (the embedded @Input
        // setter, the initial route read, and the space picker). An effect rather than three call sites
        // so a fourth writer added later cannot forget to feed the drawer — that failure mode is silent:
        // the drawer opens and saves into the empty space id.
        effect(() => {
            const id = this.activeSpaceId();
            this.drawerState.spaceId.set(id);
            this.picker.spaceId.set(id);
            this.loadSpaceMeta(id);
        });
        // Clear the panel filters whenever the selection changes. Tied to the selection rather than added
        // to the three places that clear the lists, because a fourth path added later would silently skip
        // it — and the symptom is nasty: filter one node, click another, and its panel reads as "no
        // memories" while the filter that hid them sits several rows up, unmentioned.
        effect(() => {
            this.selectedNode();
            this.selectedEdge();
            this.detailTypeFilter.set('all');
            this.detailDescFilter.set('');
        });
        // The drawer patches the `BrainStore` lists, which this page does not render. Its per-node arrays
        // are its own, so without this a save would succeed and leave the stale row on screen underneath.
        effect(() => {
            const saved = this.drawerState.lastSaved();
            if (!saved)
                return;
            // Read `saved.record` inside each branch, not once above: the discriminant only narrows the
            // record while it is still reached through `saved`.
            if (saved.kind === 'memory') {
                const rec = saved.record;
                this.nodeMemories.update(list => list.map(m => m._id === rec._id ? rec : m));
            }
            else if (saved.kind === 'chrono') {
                const rec = saved.record;
                this.nodeChrono.update(list => list.map(c => c._id === rec._id ? rec : c));
            }
        });
    }
    // ── Embedded input ──────────────────────────────────────────────────────────
    set embeddedSpaceId(v) {
        if (v !== undefined) {
            this.isEmbedded.set(true);
            const changed = this.activeSpaceId() !== v;
            this.activeSpaceId.set(v);
            if (changed && this.cy)
                this.resetGraph();
        }
    }
    /**
     * An entity to open as the root on mount — the embedded equivalent of the `?entity=` query param,
     * set by the record tables' "view in graph" action.
     *
     * It is REMEMBERED rather than applied here. This setter runs during construction, and `renderGraph`
     * begins `if (!this.cy) return` — cytoscape does not exist until `ngAfterViewInit`. Rooting the graph
     * from the setter therefore fetches, traverses, caches the result and draws nothing, with no error:
     * the empty canvas reads as "this node has no connections". So the id is parked and consumed after
     * `initCytoscape()`.
     */
    set focusEntityId(v) {
        if (v)
            this.pendingFocusId = v;
    }
    typeColor(type) {
        return typeColor(this.theme, type);
    }
    // ── Lifecycle ───────────────────────────────────────────────────────────────
    ngOnInit() {
        // Load spaces only in standalone mode; in embedded mode the space is injected via @Input
        if (!this.isEmbedded()) {
            this.spacesApi.listSpaces().subscribe(res => {
                this.spaces.set(res.spaces);
                const qp = this.route.snapshot.queryParams;
                const initial = qp['space'] || (res.spaces.length ? res.spaces[0].id : '');
                this.activeSpaceId.set(initial);
                // If entity query-param present, load it as root
                if (qp['entity'] && initial) {
                    this.brainApi.getEntity(initial, qp['entity']).pipe(catchError(() => of(null))).subscribe(ent => {
                        if (ent)
                            this.selectRoot(ent);
                    });
                }
            });
        }
        this.authApi.getMe().pipe(catchError(() => of(null))).subscribe(me => {
            // From the matrix, not the removed `readOnly` flag. `canEdit` only greys the editor out; every
            // action it enables is re-checked by the server per space and per area.
            this.canEdit.set(canWriteAnywhere(me?.rights ?? null));
        });
    }
    ngAfterViewInit() {
        this.theme = readGraphTheme(); // CSS vars resolve only once the view exists
        this.initCytoscape();
        this.applyPendingFocus();
        // Watch direction / depth / hideLabels changes via effect
        // Using effect in AfterViewInit requires the injection context to still be active
        // so we'll use subscriptions on signals via polling or explicit calls.
        // The signals are updated via template bindings and we trigger traverse from those handlers.
    }
    ngOnDestroy() {
        this.subs.unsubscribe();
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
    }
    /**
     * Root the graph at the entity a record table sent us, with the whole neighbourhood in view:
     * **both directions, depth 2**. Called once, after cytoscape exists.
     *
     * The two settings are written explicitly rather than left to the signal initialisers they happen to
     * match. "Arriving from a table shows n=2 bidirectional" is the requested behaviour, and a behaviour
     * that holds only because two unrelated defaults agree is one a later change to either default breaks
     * silently.
     *
     * A failed lookup sets `loadError` rather than leaving an empty canvas: a deleted or cross-space id
     * must not render as a node with no connections.
     */
    applyPendingFocus() {
        const id = this.pendingFocusId;
        const spaceId = this.activeSpaceId();
        if (!id || !spaceId)
            return;
        this.pendingFocusId = null;
        this.direction.set('both');
        this.depth.set(2);
        this.brainApi.getEntity(spaceId, id).pipe(catchError(() => of(null))).subscribe(ent => {
            if (ent)
                this.selectRoot(ent);
            else
                this.loadError.set(`Entity '${id}' could not be loaded in this space.`);
        });
    }
    // ── Cytoscape init ──────────────────────────────────────────────────────────
    initCytoscape() {
        const container = this.cyContainer()?.nativeElement;
        if (!container)
            return;
        this.cy = createGraphCytoscape(container, this.theme, {
            onNodeTap: (id) => this.onNodeTap(id),
            onEdgeTap: (id) => this.onEdgeTap(id),
            onNodeDoubleTap: (id) => this.onNodeDoubleTap(id),
            onBackgroundTap: () => this.onBackgroundTap(),
        });
    }
    // ── Canvas interactions ───────────────────────────────────────────────────────
    //
    // These run OUTSIDE the Angular zone (cytoscape's own event system). Safe under OnPush only because
    // each writes a SIGNAL — a plain field would update nothing on screen.
    onNodeTap(id) {
        // graphNodes does NOT include the root (it is added to the canvas separately), so a tap on the
        // root — the most-clicked node in any graph — has to be reconstructed from rootEntity.
        let tn = this.graphNodes.find(n => n._id === id);
        if (!tn) {
            const root = this.rootEntity();
            if (root && root._id === id) {
                tn = { _id: root._id, name: root.name, type: root.type || 'default', depth: 0, description: root.description, tags: root.tags };
            }
        }
        if (!tn)
            return;
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
        this.selectedEntityRecord.set(null);
        this.selectedNode.set(tn);
        // `tn.kind` decides which collection the record comes from. Passing the id alone is what made every
        // chrono/memory/file node open an empty panel — the branch existed and nothing fed it.
        this.loadNodeDetails(id, tn.kind);
    }
    onEdgeTap(id) {
        const te = this.graphEdges.find(e => e._id === id);
        if (!te)
            return;
        this.selectedNode.set(null);
        this.selectedEdge.set(te);
        this.loadEdgeDetails(te);
    }
    onNodeDoubleTap(id) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.brainApi.getEntity(spaceId, id).pipe(catchError(() => of(null))).subscribe(ent => { if (ent)
            this.selectRoot(ent, true); });
    }
    onBackgroundTap() {
        this.selectedNode.set(null);
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
    }
    // ── Toolbar handlers ────────────────────────────────────────────────────────
    onSearchQueryChange(q) {
        this.searchQuery.set(q);
    }
    onSpaceChange(spaceId) {
        this.activeSpaceId.set(spaceId);
        this.resetGraph();
    }
    onDepthChange(val) {
        this.depth.set(+val);
        if (this.rootEntity()) {
            this.traverse(this.rootEntity()._id, +val, this.direction());
        }
    }
    setDirection(dir) {
        this.direction.set(dir);
        if (this.rootEntity()) {
            this.traverse(this.rootEntity()._id, this.depth(), dir);
        }
    }
    onHideLabelsChange(hide) {
        this.hideLabels.set(hide);
        if (this.cy) {
            if (hide) {
                this.cy.edges().addClass('hide-labels');
            }
            else {
                this.cy.edges().removeClass('hide-labels');
            }
        }
    }
    selectRoot(entity, pushHistory = false) {
        this.rootEntity.set(entity);
        this.searchQuery.set(entity.name);
        this.selectedNode.set(null);
        this.selectedEntityRecord.set(null);
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
        this.nodeMemories.set([]);
        this.nodeChrono.set([]);
        if (!this.isEmbedded())
            this.updateUrl(entity._id, pushHistory);
        this.traverse(entity._id, this.depth(), this.direction());
    }
    fitGraph() {
        if (this.cy)
            this.cy.fit(undefined, 40);
    }
    resetGraph() {
        this.rootEntity.set(null);
        this.selectedNode.set(null);
        this.selectedEntityRecord.set(null);
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
        this.nodeMemories.set([]);
        this.nodeChrono.set([]);
        this.searchQuery.set('');
        this.truncated.set(false);
        this.graphNodes = [];
        this.graphEdges = [];
        this.cache = emptyCache();
        if (this.cy) {
            this.cy.elements().remove();
        }
    }
    // ── Graph traversal ─────────────────────────────────────────────────────────
    traverse(startId, maxDepth, direction) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.selectedNode.set(null);
        this.selectedEntityRecord.set(null);
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
        const req = { startId, maxDepth, direction };
        const plan = decideFetch(this.cache, req);
        // A shallower view is always a subset of what was already fetched — no request needed.
        if (plan === 'from-cache') {
            this.applyDepthFilter(startId, maxDepth);
            return;
        }
        this.loading.set(true);
        this.loadError.set(null);
        this.lastTraverse = req;
        this.brainApi.traverseGraph(spaceId, { startId, direction, maxDepth, limit: 200 }).subscribe({
            error: (e) => { this.loading.set(false); this.loadError.set(httpErrorReason(e)); },
            next: (result) => {
                this.loading.set(false);
                this.cache = applyResult(this.cache, plan, req, result);
                this.truncated.set(result.truncated);
                this.applyDepthFilter(startId, maxDepth);
            },
        });
    }
    /** Re-run the last traversal — bound to the error state's Retry button. */
    retryTraverse() {
        if (this.lastTraverse) {
            const { startId, maxDepth, direction } = this.lastTraverse;
            this.traverse(startId, maxDepth, direction);
        }
    }
    // Filter the full cache down to the requested depth and re-render
    applyDepthFilter(startId, maxDepth) {
        const view = filterToDepth(this.cache, startId, maxDepth);
        this.graphNodes = view.nodes;
        this.graphEdges = view.edges;
        this.renderGraph(startId);
    }
    renderGraph(rootId) {
        if (!this.cy)
            return;
        const elements = buildElements(this.rootEntity(), this.graphNodes, this.graphEdges, rootId);
        // Count what was actually handed over, not what is cached — the badges must track the canvas, or
        // they keep reporting depth-5 nodes after the slider went back to 2.
        this.nodeCount.set(elements.filter(e => e.group === 'nodes').length);
        this.edgeCount.set(elements.filter(e => e.group === 'edges').length);
        renderElements(this.cy, elements, rootId, this.hideLabels(), () => this.onLayoutSettled());
    }
    /** Fit the finished layout, and open the root's panel if the user has not chosen something else. */
    onLayoutSettled() {
        if (!this.cy)
            return;
        // Resize first: Angular may have opened or closed the side panel since renderGraph() ran, which
        // changes the canvas width without cytoscape knowing.
        this.cy.resize();
        this.cy.fit(undefined, 40);
        const root = this.rootEntity();
        if (!root || this.selectedNode() || this.selectedEdge())
            return;
        this.selectedNode.set({ _id: root._id, name: root.name, type: root.type || 'default', depth: 0, description: root.description, tags: root.tags });
        this.loadNodeDetails(root._id);
        // Opening the panel narrows the canvas — refit once the DOM has caught up.
        setTimeout(() => {
            if (this.cy) {
                this.cy.resize();
                this.cy.fit(undefined, 40);
            }
        }, 50);
    }
    // ── Detail panel helpers ────────────────────────────────────────────────────
    /** `lookupForNode` decides which collection, or that there is none. `BrainApi.getRecord` owns the dispatch. */
    loadNodeDetails(entityId, kind) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.recordUnavailable.set(null);
        const want = lookupForNode(kind);
        if ('unavailable' in want) {
            this.recordUnavailable.set(want.unavailable);
            return;
        }
        this.brainApi.getRecord(spaceId, want.fetch, entityId).pipe(catchError(() => of(null))).subscribe(rec => { if (rec)
            this.selectedEntityRecord.set(rec); });
        forkJoin({
            mems: this.brainApi.listMemories(spaceId, 100, 0, { entity: entityId }).pipe(catchError(() => of({ memories: [] }))),
            chrono: this.brainApi.queryBrain(spaceId, {
                collection: 'chrono',
                filter: { entityIds: entityId },
                limit: 100,
            }).pipe(catchError(() => of({ results: [], collection: 'chrono', count: 0 }))),
        }).subscribe(({ mems, chrono }) => {
            this.nodeMemories.set(mems.memories);
            this.nodeChrono.set(chrono.results);
        });
    }
    openEntityPopup(node) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.brainApi.getEntity(spaceId, node._id).pipe(catchError(() => of(null))).subscribe(ent => {
            if (ent) {
                this.popupRecord.set(ent);
                this.popupType.set('entity');
            }
        });
    }
    loadEdgeDetails(te) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        this.nodeMemories.set([]);
        this.nodeChrono.set([]);
        this.recordUnavailable.set(null);
        // A synthetic edge is derived at render time and stored nowhere — see `lookupForEdge`.
        const want = lookupForEdge(te._id);
        if ('unavailable' in want) {
            this.recordUnavailable.set(want.unavailable);
        }
        else {
            this.brainApi.getEdge(spaceId, te._id).pipe(catchError(() => of(null))).subscribe(edge => { if (edge)
                this.selectedEdgeRecord.set(edge); });
        }
        // Load memories/chronos linked to BOTH endpoints
        forkJoin({
            mems: this.brainApi.listMemories(spaceId, 100, 0, { entity: te.from }).pipe(catchError(() => of({ memories: [] }))),
            chrono: this.brainApi.queryBrain(spaceId, {
                collection: 'chrono',
                filter: { entityIds: te.from },
                limit: 100,
            }).pipe(catchError(() => of({ results: [], collection: 'chrono', count: 0 }))),
        }).subscribe(({ mems, chrono }) => {
            // filter to those also referencing te.to
            const filteredMems = mems.memories.filter(m => Array.isArray(m.entityIds) && m.entityIds.includes(te.to));
            const filteredChrono = chrono.results.filter(c => Array.isArray(c.entityIds) && c.entityIds.includes(te.from) && c.entityIds.includes(te.to));
            this.nodeMemories.set(filteredMems);
            this.nodeChrono.set(filteredChrono);
        });
    }
    // Takes only what it reads. The template used to build seven-field DetailRow literals at four call
    // sites for these two fields; the table's own rows still satisfy this shape.
    openDetailPopup(row) {
        const spaceId = this.activeSpaceId();
        if (!spaceId)
            return;
        if (row.kind === 'memory') {
            this.brainApi.getMemory(spaceId, row.id).pipe(catchError(() => of(null))).subscribe(m => {
                if (m)
                    this.openBrainDrawer('memory', m);
            });
        }
        else {
            this.brainApi.getChrono(spaceId, row.id).pipe(catchError(() => of(null))).subscribe(c => {
                if (c)
                    this.openBrainDrawer('chrono', c);
            });
        }
    }
    openBrainDrawer(kind, record) {
        if (kind === 'memory')
            this.drawerState.open(kind, record);
        else
            this.drawerState.open(kind, record);
    }
    /**
     * Feed the schema the drawer's property editors and tag suggestions read.
     *
     * A space with no typeSchemas is not an error: `buildPropertiesObject` returns the record's own
     * properties untouched, which is exactly what the forked drawer used to do for every space.
     */
    loadSpaceMeta(spaceId) {
        if (!spaceId) {
            this.store.spaceMeta.set(null);
            return;
        }
        this.spacesApi.getSpaceMeta(spaceId).subscribe({
            next: (meta) => this.store.spaceMeta.set(meta),
            error: () => this.store.spaceMeta.set(null),
        });
    }
    asRecord(obj) {
        return obj;
    }
    closePopup() {
        this.popupRecord.set(null);
    }
    onPopupSaved(_evt) {
        this.popupRecord.set(null);
        const root = this.rootEntity();
        if (root) {
            this.traverse(root._id, this.depth(), this.direction());
            const sel = this.selectedNode();
            if (sel)
                this.loadNodeDetails(sel._id, sel.kind);
            const edge = this.selectedEdge();
            if (edge)
                this.loadEdgeDetails(edge);
        }
    }
    // ── URL management ──────────────────────────────────────────────────────────
    updateUrl(entityId, push = false) {
        const spaceId = this.activeSpaceId();
        const path = this.location.path().split('?')[0];
        const qs = `space=${spaceId}&entity=${entityId}`;
        if (push) {
            this.location.go(path, qs);
        }
        else {
            this.location.replaceState(path, qs);
        }
    }
    static { this.ɵfac = function GraphComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || GraphComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: GraphComponent, selectors: [["app-graph-view"]], viewQuery: function GraphComponent_Query(rf, ctx) { if (rf & 1) {
            i0.ɵɵviewQuerySignal(ctx.cyContainer, _c0, 5);
        } if (rf & 2) {
            i0.ɵɵqueryAdvance();
        } }, hostVars: 2, hostBindings: function GraphComponent_HostBindings(rf, ctx) { if (rf & 2) {
            i0.ɵɵclassProp("embedded", ctx.isEmbedded());
        } }, inputs: { embeddedSpaceId: "embeddedSpaceId", focusEntityId: "focusEntityId" }, features: [i0.ɵɵProvidersFeature([BrainStore, EntityRefPicker, RecordDrawerState])], decls: 14, vars: 17, consts: [["cyContainer", ""], [1, "space-tabs"], [3, "depthChange", "directionChange", "hideLabelsChange", "rootSelected", "queryChange", "fit", "reset", "spaceId", "stats", "depth", "direction", "hideLabels"], [1, "canvas-row"], [1, "canvas-zone"], [1, "truncation-banner"], [1, "loading-overlay"], [1, "canvas-empty"], [1, "cy-container"], [1, "side-panel"], [3, "record", "recordType", "spaceId", "canEdit"], ["type", "button", 1, "space-chip", 3, "active"], ["type", "button", 1, "space-chip", 3, "click"], [3, "proxyFor", "size"], [3, "click"], ["name", "x", 3, "size"], [1, "loading-spinner"], [3, "retry", "message", "reason"], [1, "empty-icon"], ["name", "circle-dashed", 3, "size"], [3, "view", "close", "color", "title", "badge"], [1, "side-panel-body"], [3, "record", "kind", "unavailable"], [3, "typeFilterChange", "descFilterChange", "open", "memories", "chrono", "typeFilter", "descFilter", "emptyMemoriesKey", "emptyChronoKey"], [3, "view", "close", "color", "title", "badge", "canView"], [3, "record", "selected", "unavailable"], [3, "closed", "saved", "record", "recordType", "spaceId", "canEdit"]], template: function GraphComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, GraphComponent_Conditional_0_Template, 3, 0, "div", 1);
            i0.ɵɵelementStart(1, "app-graph-toolbar", 2);
            i0.ɵɵlistener("depthChange", function GraphComponent_Template_app_graph_toolbar_depthChange_1_listener($event) { return ctx.onDepthChange($event); })("directionChange", function GraphComponent_Template_app_graph_toolbar_directionChange_1_listener($event) { return ctx.setDirection($event); })("hideLabelsChange", function GraphComponent_Template_app_graph_toolbar_hideLabelsChange_1_listener($event) { return ctx.onHideLabelsChange($event); })("rootSelected", function GraphComponent_Template_app_graph_toolbar_rootSelected_1_listener($event) { return ctx.selectRoot($event); })("queryChange", function GraphComponent_Template_app_graph_toolbar_queryChange_1_listener($event) { return ctx.onSearchQueryChange($event); })("fit", function GraphComponent_Template_app_graph_toolbar_fit_1_listener() { return ctx.fitGraph(); })("reset", function GraphComponent_Template_app_graph_toolbar_reset_1_listener() { return ctx.resetGraph(); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "div", 3)(3, "div", 4);
            i0.ɵɵconditionalCreate(4, GraphComponent_Conditional_4_Template, 5, 4, "div", 5);
            i0.ɵɵconditionalCreate(5, GraphComponent_Conditional_5_Template, 2, 0, "div", 6);
            i0.ɵɵconditionalCreate(6, GraphComponent_Conditional_6_Template, 3, 4, "div", 7)(7, GraphComponent_Conditional_7_Template, 9, 7, "div", 7);
            i0.ɵɵelement(8, "div", 8, 0);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(10, GraphComponent_Conditional_10_Template, 5, 12, "div", 9);
            i0.ɵɵconditionalCreate(11, GraphComponent_Conditional_11_Template, 6, 15, "div", 9);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(12, GraphComponent_Conditional_12_Template, 1, 4, "app-entry-popup", 10);
            i0.ɵɵelement(13, "app-record-drawer");
        } if (rf & 2) {
            i0.ɵɵconditional(!ctx.isEmbedded() && ctx.spaces().length > 0 ? 0 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("spaceId", ctx.activeSpaceId())("stats", ctx.rootEntity() ? i0.ɵɵpureFunction2(14, _c1, ctx.nodeCount(), ctx.edgeCount()) : null)("depth", ctx.depth())("direction", ctx.direction())("hideLabels", ctx.hideLabels());
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.truncated() ? 4 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loading() ? 5 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.loadError() !== null && !ctx.loading() ? 6 : !ctx.rootEntity() && !ctx.loading() ? 7 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵstyleProp("visibility", ctx.rootEntity() ? "visible" : "hidden");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.selectedNode() ? 10 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.selectedEdge() ? 11 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.popupRecord() ? 12 : -1);
        } }, dependencies: [ProxySpaceBadgeComponent, CommonModule, FormsModule, EntryPopupComponent, PhIconComponent, ErrorStateComponent, RecordDrawerComponent, GraphLinkedRecordsComponent, GraphNodeRecordCardComponent, GraphEdgeRecordCardComponent, GraphPanelHeaderComponent, GraphToolbarComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] {\n      display: flex;\n      flex-direction: column;\n      height: calc(100vh - 56px - 56px);\n      min-height: 0;\n      gap: 8px;\n    }\n    .embedded[_nghost-%COMP%] {\n      height: 70vh;\n      min-height: 400px;\n    }\n\n    \n\n    .space-tabs[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 8px;\n      overflow-x: auto;\n      padding-bottom: 2px;\n      flex-shrink: 0;\n    }\n    .space-chip[_ngcontent-%COMP%] {\n      padding: 5px 12px;\n      border-radius: 4px;\n      font-size: 12px;\n      font-weight: 500;\n      border: 1px solid var(--border);\n      background: var(--bg-surface);\n      color: var(--text-secondary);\n      cursor: pointer;\n      transition: all var(--transition);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 1px;\n      min-width: 90px;\n      white-space: nowrap;\n    }\n    .space-chip[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--text-primary); }\n    .space-chip.active[_ngcontent-%COMP%] {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n    .space-chip-label[_ngcontent-%COMP%] { font-size: 12px; font-weight: 500; }\n    .space-chip-id[_ngcontent-%COMP%] { font-size: 10px; color: var(--text-muted); }\n    .space-chip.active[_ngcontent-%COMP%]   .space-chip-id[_ngcontent-%COMP%] { color: var(--accent); opacity: 0.7; }\n\n    \n\n\n    \n\n\n    .canvas-row[_ngcontent-%COMP%] {\n      display: flex;\n      flex: 1;\n      min-height: 0;\n      gap: 8px;\n    }\n\n    .canvas-zone[_ngcontent-%COMP%] {\n      position: relative;\n      flex: 1;\n      min-height: 0;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-primary);\n      overflow: hidden;\n    }\n\n    .cy-container[_ngcontent-%COMP%] {\n      width: 100%;\n      height: 100%;\n      position: absolute;\n      inset: 0;\n    }\n\n    .truncation-banner[_ngcontent-%COMP%] {\n      position: absolute;\n      top: 12px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: 20;\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 16px;\n      background: var(--error-dim);\n      border: 1px solid var(--error);\n      border-radius: var(--radius-sm);\n      color: var(--warning);\n      font-size: 13px;\n      white-space: nowrap;\n    }\n    .truncation-banner[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n      background: transparent;\n      border: none;\n      color: var(--text-secondary);\n      font-size: 14px;\n      cursor: pointer;\n      padding: 0 2px;\n    }\n\n    .canvas-empty[_ngcontent-%COMP%] {\n      position: absolute;\n      inset: 0;\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      pointer-events: none;\n      gap: 8px;\n    }\n    .empty-icon[_ngcontent-%COMP%] {\n      font-size: 52px;\n      line-height: 1;\n      opacity: 0.2;\n    }\n    .canvas-empty[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n      color: var(--text-muted);\n      font-weight: 500;\n      font-size: 15px;\n      margin: 0;\n    }\n    .canvas-empty[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n      color: var(--text-muted);\n      font-size: 13px;\n      margin: 0;\n      opacity: 0.7;\n    }\n\n    \n\n    .loading-overlay[_ngcontent-%COMP%] {\n      position: absolute;\n      inset: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      background: color-mix(in srgb, var(--bg-primary) 60%, transparent);\n      z-index: 30;\n      backdrop-filter: blur(2px);\n    }\n    .loading-spinner[_ngcontent-%COMP%] {\n      width: 36px;\n      height: 36px;\n      border: 3px solid color-mix(in srgb, var(--accent) 25%, transparent);\n      border-top-color: var(--accent);\n      border-radius: 50%;\n      animation: _ngcontent-%COMP%_graph-spin 0.75s linear infinite;\n    }\n    @keyframes _ngcontent-%COMP%_graph-spin { to { transform: rotate(360deg); } }\n\n    \n\n\n    .side-panel[_ngcontent-%COMP%] {\n      width: 560px;\n      flex-shrink: 0;\n      display: flex;\n      flex-direction: column;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      overflow: hidden;\n      min-height: 0;\n    }\n\n    \n\n    .side-panel-body[_ngcontent-%COMP%] {\n      display: flex;\n      flex: 1;\n      min-height: 0;\n      overflow: hidden;\n    }\n\n\n\n    \n\n    .tag[_ngcontent-%COMP%] {\n      display: inline-block;\n      padding: 1px 7px;\n      border-radius: 10px;\n      font-size: 11px;\n      background: var(--bg-elevated);\n      color: var(--text-secondary);\n      border: 1px solid var(--border);\n      margin-right: 3px;\n    }\n\n    \n\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px;\n      padding: 2px 8px; border-radius: 10px;\n      background: var(--accent-dim); border: 1px solid var(--accent);\n      font-size: 11px; color: var(--text-primary);\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(GraphComponent, [{
        type: Component,
        args: [{ selector: 'app-graph-view', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [ProxySpaceBadgeComponent, CommonModule, FormsModule, EntryPopupComponent, EntitySearchComponent, PropertiesViewComponent, PhIconComponent, ErrorStateComponent, TranslocoPipe, RecordDrawerComponent, GraphLinkedRecordsComponent, GraphNodeRecordCardComponent, GraphEdgeRecordCardComponent, GraphPanelHeaderComponent, GraphToolbarComponent], providers: [BrainStore, EntityRefPicker, RecordDrawerState], host: { '[class.embedded]': 'isEmbedded()' }, template: `
    <!-- ═══ Space selector ══════════════════════════════════════════════════ -->
    @if (!isEmbedded() && spaces().length > 0) {
      <div class="space-tabs">
        @for (s of spaces(); track s.id) {
          <button class="space-chip" type="button" [class.active]="activeSpaceId() === s.id" [attr.aria-current]="activeSpaceId() === s.id ? 'true' : null" (click)="onSpaceChange(s.id)">{{ s.label }}@if (s.proxyFor?.length) { <app-proxy-space-badge [proxyFor]="s.proxyFor" [size]="12" /> }</button>
        }
      </div>
    }

    <app-graph-toolbar
      [spaceId]="activeSpaceId()"
      [stats]="rootEntity() ? { nodes: nodeCount(), edges: edgeCount() } : null"
      [depth]="depth()"
      [direction]="direction()"
      [hideLabels]="hideLabels()"
      (depthChange)="onDepthChange($event)"
      (directionChange)="setDirection($event)"
      (hideLabelsChange)="onHideLabelsChange($event)"
      (rootSelected)="selectRoot($event)"
      (queryChange)="onSearchQueryChange($event)"
      (fit)="fitGraph()"
      (reset)="resetGraph()" />

    <!-- ═══ Canvas row (canvas + optional side panel) ══════════════════════ -->
    <div class="canvas-row">

      <!-- ── Canvas zone ────────────────────────────────────────────────── -->
      <div class="canvas-zone">
        @if (truncated()) {
          <div class="truncation-banner">
            {{ 'graph.truncated' | transloco }}
            <button (click)="truncated.set(false)"><ph-icon name="x" [size]="14"/></button>
          </div>
        }

        @if (loading()) {
          <div class="loading-overlay"><div class="loading-spinner"></div></div>
        }

        @if (loadError() !== null && !loading()) {
          <div class="canvas-empty">
            <app-error-state [message]="'graph.error.load' | transloco" [reason]="loadError() ?? ''" (retry)="retryTraverse()" />
          </div>
        } @else if (!rootEntity() && !loading()) {
          <div class="canvas-empty">
            <div class="empty-icon"><ph-icon name="circle-dashed" [size]="52"/></div>
            <h3>{{ 'graph.empty.title' | transloco }}</h3>
            <p>{{ 'graph.empty.subtitle' | transloco }}</p>
          </div>
        }

        <div #cyContainer class="cy-container" [style.visibility]="rootEntity() ? 'visible' : 'hidden'"></div>
      </div>

      <!-- ── Side panel (node selected) ────────────────────────────────── -->
      @if (selectedNode()) {
        <div class="side-panel">
          <app-graph-panel-header
            [color]="panelColor()"
            [title]="panelTitle()"
            [badge]="selectedNode()!.type || 'entity'"
            (view)="openEntityPopup(selectedNode()!)"
            (close)="selectedNode.set(null)" />
          <div class="side-panel-body">

            <!-- Record card. Its 57 lines are now app-graph-node-record-card — same DOM, same classes, and
                 the styles moved with them, because a parent's styles do not reach a child's template. -->
            <app-graph-node-record-card
              [record]="selectedEntityRecord()"
              [kind]="selectedNode()!.kind ?? null"
              [unavailable]="recordUnavailable()" />

            <!-- Lists pane: memories + chrono -->
            <app-graph-linked-records
              [memories]="filteredMemories()"
              [chrono]="filteredChrono()"
              [(typeFilter)]="detailTypeFilter"
              [(descFilter)]="detailDescFilter"
              [emptyMemoriesKey]="detailFilterActive() ? 'graph.panel.noMatches' : 'graph.panel.noMemories'"
              [emptyChronoKey]="detailFilterActive() ? 'graph.panel.noMatches' : 'graph.panel.noChronoEntries'"
              (open)="openDetailPopup($event)" />

          </div>
        </div>
      }

      <!-- ── Side panel (edge selected) ────────────────────────────────── -->
      @if (selectedEdge()) {
        <div class="side-panel">
          <app-graph-panel-header
            [color]="panelColor()"
            [title]="panelTitle()"
            [badge]="'graph.drawer.badge.edge' | transloco"
            [canView]="!!selectedEdgeRecord()"
            (view)="popupRecord.set(asRecord(selectedEdgeRecord()!)); popupType.set('edge')"
            (close)="selectedEdge.set(null); selectedEdgeRecord.set(null)" />
          <div class="side-panel-body">

            <!-- Edge record card. A SECOND component rather than a mode of the node one: it has weight,
                 endpoint rows with a fallback, a different first label, and no unavailable branch. -->
            <app-graph-edge-record-card
              [record]="selectedEdgeRecord()"
              [selected]="selectedEdge()"
              [unavailable]="recordUnavailable()" />

            <!-- Lists pane: memories + chrono for both endpoints -->
            <app-graph-linked-records
              [memories]="filteredMemories()"
              [chrono]="filteredChrono()"
              [(typeFilter)]="detailTypeFilter"
              [(descFilter)]="detailDescFilter"
              [emptyMemoriesKey]="detailFilterActive() ? 'graph.panel.noMatches' : 'graph.panel.noLinkedMemories'"
              [emptyChronoKey]="detailFilterActive() ? 'graph.panel.noMatches' : 'graph.panel.noLinkedChrono'"
              (open)="openDetailPopup($event)" />

          </div>
        </div>
      }

    </div><!-- /canvas-row -->

    <!-- ═══ Entry popup (entity / edge) ═══════════════════════════════════ -->
    @if (popupRecord()) {
      <app-entry-popup
        [record]="popupRecord()"
        [recordType]="popupType()"
        [spaceId]="activeSpaceId()"
        [canEdit]="canEdit()"
        (closed)="closePopup()"
        (saved)="onPopupSaved($event)"
      />
    }

    <!-- Record drawer (memory / chrono) - the shared brain drawer, not a copy -->
    <app-record-drawer />
  `, styles: ["\n    :host {\n      display: flex;\n      flex-direction: column;\n      height: calc(100vh - 56px - 56px);\n      min-height: 0;\n      gap: 8px;\n    }\n    :host.embedded {\n      height: 70vh;\n      min-height: 400px;\n    }\n\n    /* \u2500\u2500 Space chips (matches brain style) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n    .space-tabs {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 8px;\n      overflow-x: auto;\n      padding-bottom: 2px;\n      flex-shrink: 0;\n    }\n    .space-chip {\n      padding: 5px 12px;\n      border-radius: 4px;\n      font-size: 12px;\n      font-weight: 500;\n      border: 1px solid var(--border);\n      background: var(--bg-surface);\n      color: var(--text-secondary);\n      cursor: pointer;\n      transition: all var(--transition);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 1px;\n      min-width: 90px;\n      white-space: nowrap;\n    }\n    .space-chip:hover { border-color: var(--accent); color: var(--text-primary); }\n    .space-chip.active {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n    .space-chip-label { font-size: 12px; font-weight: 500; }\n    .space-chip-id { font-size: 10px; color: var(--text-muted); }\n    .space-chip.active .space-chip-id { color: var(--accent); opacity: 0.7; }\n\n    /* \u2500\u2500 Toolbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n    /* \u2500\u2500 Canvas zone \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n    .canvas-row {\n      display: flex;\n      flex: 1;\n      min-height: 0;\n      gap: 8px;\n    }\n\n    .canvas-zone {\n      position: relative;\n      flex: 1;\n      min-height: 0;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-primary);\n      overflow: hidden;\n    }\n\n    .cy-container {\n      width: 100%;\n      height: 100%;\n      position: absolute;\n      inset: 0;\n    }\n\n    .truncation-banner {\n      position: absolute;\n      top: 12px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: 20;\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 8px 16px;\n      background: var(--error-dim);\n      border: 1px solid var(--error);\n      border-radius: var(--radius-sm);\n      color: var(--warning);\n      font-size: 13px;\n      white-space: nowrap;\n    }\n    .truncation-banner button {\n      background: transparent;\n      border: none;\n      color: var(--text-secondary);\n      font-size: 14px;\n      cursor: pointer;\n      padding: 0 2px;\n    }\n\n    .canvas-empty {\n      position: absolute;\n      inset: 0;\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      pointer-events: none;\n      gap: 8px;\n    }\n    .empty-icon {\n      font-size: 52px;\n      line-height: 1;\n      opacity: 0.2;\n    }\n    .canvas-empty h3 {\n      color: var(--text-muted);\n      font-weight: 500;\n      font-size: 15px;\n      margin: 0;\n    }\n    .canvas-empty p {\n      color: var(--text-muted);\n      font-size: 13px;\n      margin: 0;\n      opacity: 0.7;\n    }\n\n    /* Loading overlay */\n    .loading-overlay {\n      position: absolute;\n      inset: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      background: color-mix(in srgb, var(--bg-primary) 60%, transparent);\n      z-index: 30;\n      backdrop-filter: blur(2px);\n    }\n    .loading-spinner {\n      width: 36px;\n      height: 36px;\n      border: 3px solid color-mix(in srgb, var(--accent) 25%, transparent);\n      border-top-color: var(--accent);\n      border-radius: 50%;\n      animation: graph-spin 0.75s linear infinite;\n    }\n    @keyframes graph-spin { to { transform: rotate(360deg); } }\n\n    /* \u2500\u2500 Side panel (shown when node or edge selected) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n    .side-panel {\n      width: 560px;\n      flex-shrink: 0;\n      display: flex;\n      flex-direction: column;\n      border: 1px solid var(--border);\n      border-radius: var(--radius-md);\n      background: var(--bg-surface);\n      overflow: hidden;\n      min-height: 0;\n    }\n\n    /* Side panel body: two columns */\n    .side-panel-body {\n      display: flex;\n      flex: 1;\n      min-height: 0;\n      overflow: hidden;\n    }\n\n\n\n    /* \u2500\u2500 Shared badge, button helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n    .tag {\n      display: inline-block;\n      padding: 1px 7px;\n      border-radius: 10px;\n      font-size: 11px;\n      background: var(--bg-elevated);\n      color: var(--text-secondary);\n      border: 1px solid var(--border);\n      margin-right: 3px;\n    }\n\n    /* entity chips */\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px;\n      padding: 2px 8px; border-radius: 10px;\n      background: var(--accent-dim); border: 1px solid var(--accent);\n      font-size: 11px; color: var(--text-primary);\n    }\n"] }]
    }], () => [], { cyContainer: [{ type: i0.ViewChild, args: ['cyContainer', { isSignal: true }] }], embeddedSpaceId: [{
            type: Input
        }], focusEntityId: [{
            type: Input
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(GraphComponent, { className: "GraphComponent", filePath: "app/pages/graph/graph.component.ts", lineNumber: 227 }); })();
