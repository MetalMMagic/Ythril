import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProxySpaceBadgeComponent } from '../../shared/proxy-space-badge.component';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordDrawerComponent } from './record-drawer.component';
import { QueryTabComponent } from './query-tab.component';
import { RecordListState } from './record-list-state.service';
import { MemoriesTabComponent } from './memories-tab.component';
import { EntitiesTabComponent } from './entities-tab.component';
import { EdgesTabComponent } from './edges-tab.component';
import { ChronoTabComponent } from './chrono-tab.component';
import { OverviewTabComponent } from './overview-tab.component';
import { ReviewTabComponent } from './review-tab.component';
import { FormsModule } from '@angular/forms';
import { SpacesApi } from '../../core/spaces-api.service';
import { OverviewDataService } from './overview-data.service';
import { SpacesStore } from '../settings/spaces-store.service';
import { SpaceSettingsState } from '../settings/space-settings-state.service';
import { BrainApi } from '../../core/brain-api.service';
import { AdminApi } from '../../core/admin-api.service';
import { NetworksApi } from '../../core/networks-api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import { ToastService } from '../../core/toast.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';
import { BRAIN_TABS } from './brain-tabs';
import * as i0 from "@angular/core";
const BrainComponent_Conditional_3_Conditional_34_Defer_2_DepsFn = () => [import("../settings/space-settings-popup.component").then(m => m.SpaceSettingsPopupComponent)];
const BrainComponent_Conditional_3_Conditional_37_Defer_2_DepsFn = () => [import("../graph/graph.component").then(m => m.GraphComponent)];
const BrainComponent_Conditional_3_Conditional_38_Defer_2_DepsFn = () => [import("../files/file-manager.component").then(m => m.FileManagerComponent)];
const _forTrack0 = ($index, $item) => $item.space.id;
const _forTrack1 = ($index, $item) => $item.key;
function BrainComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 1);
    i0.ɵɵelement(1, "span", 4);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 1, "brain.loadingSpaces"));
} }
function BrainComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-error-state", 5);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("retry", function BrainComponent_Conditional_1_Template_app_error_state_retry_0_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.loadSpaces()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵproperty("message", i0.ɵɵpipeBind1(1, 2, "brain.loadSpacesError"))("reason", ctx_r1.spacesError() ?? "");
} }
function BrainComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3)(1, "div", 6);
    i0.ɵɵelement(2, "ph-icon", 7);
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
    i0.ɵɵproperty("size", 48);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(5, 3, "brain.emptySpaces.title"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 5, "brain.emptySpaces.body"));
} }
function BrainComponent_Conditional_3_For_2_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-proxy-space-badge", 29);
} if (rf & 2) {
    const sv_r5 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵproperty("proxyFor", sv_r5.space.proxyFor)("size", 12);
} }
function BrainComponent_Conditional_3_For_2_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 32);
    i0.ɵɵelement(1, "ph-icon", 33);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const sv_r5 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassMap("net-" + sv_r5.space.networkStatus);
    i0.ɵɵproperty("title", ctx_r1.networkChipTitle(sv_r5.space));
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 12);
} }
function BrainComponent_Conditional_3_For_2_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 31);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const sv_r5 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", ctx_r1.spaceTotal(sv_r5.stats), " ", i0.ɵɵpipeBind1(2, 2, "brain.spaceChip.records"));
} }
function BrainComponent_Conditional_3_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 26);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_For_2_Template_button_click_0_listener() { const sv_r5 = i0.ɵɵrestoreView(_r4).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.selectSpace(sv_r5.space.id)); });
    i0.ɵɵelementStart(1, "span", 27);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "span", 28);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, BrainComponent_Conditional_3_For_2_Conditional_5_Template, 1, 2, "app-proxy-space-badge", 29);
    i0.ɵɵconditionalCreate(6, BrainComponent_Conditional_3_For_2_Conditional_6_Template, 2, 4, "span", 30);
    i0.ɵɵconditionalCreate(7, BrainComponent_Conditional_3_For_2_Conditional_7_Template, 3, 4, "span", 31);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const sv_r5 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r1.activeSpaceId() === sv_r5.space.id);
    i0.ɵɵproperty("title", sv_r5.space.label + " (" + sv_r5.space.id + ")");
    i0.ɵɵattribute("aria-current", ctx_r1.activeSpaceId() === sv_r5.space.id ? "true" : null);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(sv_r5.space.label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(sv_r5.space.id);
    i0.ɵɵadvance();
    i0.ɵɵconditional((sv_r5.space.proxyFor == null ? null : sv_r5.space.proxyFor.length) ? 5 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(sv_r5.space.networkStatus ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(sv_r5.stats ? 7 : -1);
} }
function BrainComponent_Conditional_3_Conditional_3_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 36);
} }
function BrainComponent_Conditional_3_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 10)(1, "span");
    i0.ɵɵelement(2, "ph-icon", 34);
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 35);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Conditional_3_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.runReindex()); });
    i0.ɵɵconditionalCreate(6, BrainComponent_Conditional_3_Conditional_3_Conditional_6_Template, 1, 0, "span", 36);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(4, 5, "brain.reindex.stale"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("disabled", ctx_r1.reindexing());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.reindexing() ? 6 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(8, 7, "brain.reindex.button"), " ");
} }
function BrainComponent_Conditional_3_For_24_Conditional_4_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 20);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const s_r9 = i0.ɵɵnextContext();
    const tab_r8 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r9[tab_r8.statsKey]);
} }
function BrainComponent_Conditional_3_For_24_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, BrainComponent_Conditional_3_For_24_Conditional_4_Conditional_0_Template, 2, 1, "span", 20);
} if (rf & 2) {
    const tab_r8 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵconditional(tab_r8.statsKey ? 0 : -1);
} }
function BrainComponent_Conditional_3_For_24_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_For_24_Template_button_click_0_listener() { const tab_r8 = i0.ɵɵrestoreView(_r7).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.setTab(tab_r8.key)); });
    i0.ɵɵelement(1, "ph-icon", 37);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵconditionalCreate(4, BrainComponent_Conditional_3_For_24_Conditional_4_Template, 1, 1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    let tmp_16_0;
    const tab_r8 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === tab_r8.key);
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === tab_r8.key);
    i0.ɵɵadvance();
    i0.ɵɵproperty("name", tab_r8.icon)("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 7, tab_r8.label), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_16_0 = ctx_r1.activeStats()) ? 4 : -1, tmp_16_0);
} }
function BrainComponent_Conditional_3_Conditional_29_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 20);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx.files);
} }
function BrainComponent_Conditional_3_Conditional_34_Defer_0_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-space-settings-popup", 38);
    i0.ɵɵlistener("saved", function BrainComponent_Conditional_3_Conditional_34_Defer_0_Template_app_space_settings_popup_saved_0_listener($event) { i0.ɵɵrestoreView(_r10); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.onSpaceSaved($event)); });
    i0.ɵɵelementEnd();
} }
function BrainComponent_Conditional_3_Conditional_34_DeferLoading_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 39);
    i0.ɵɵelement(1, "span", 4);
    i0.ɵɵelementEnd();
} }
function BrainComponent_Conditional_3_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomTemplate(0, BrainComponent_Conditional_3_Conditional_34_Defer_0_Template, 1, 0)(1, BrainComponent_Conditional_3_Conditional_34_DeferLoading_1_Template, 2, 0);
    i0.ɵɵdefer(2, 0, BrainComponent_Conditional_3_Conditional_34_Defer_2_DepsFn, 1, null, null, 0, null, i0.ɵɵdeferEnableTimerScheduling);
    i0.ɵɵdeferOnImmediate();
} }
function BrainComponent_Conditional_3_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 24);
    i0.ɵɵelement(1, "span", 4);
    i0.ɵɵelementEnd();
} }
function BrainComponent_Conditional_3_Conditional_37_Defer_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-graph-view", 40);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("embeddedSpaceId", ctx_r1.activeSpaceId())("focusEntityId", ctx_r1.graphFocusId() ?? undefined);
} }
function BrainComponent_Conditional_3_Conditional_37_DeferLoading_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 41);
    i0.ɵɵelement(1, "span", 4);
    i0.ɵɵelementEnd();
} }
function BrainComponent_Conditional_3_Conditional_37_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomTemplate(0, BrainComponent_Conditional_3_Conditional_37_Defer_0_Template, 1, 2)(1, BrainComponent_Conditional_3_Conditional_37_DeferLoading_1_Template, 2, 0);
    i0.ɵɵdefer(2, 0, BrainComponent_Conditional_3_Conditional_37_Defer_2_DepsFn, 1, null, null, 0, null, i0.ɵɵdeferEnableTimerScheduling);
    i0.ɵɵdeferOnImmediate();
} }
function BrainComponent_Conditional_3_Conditional_38_Defer_0_Template(rf, ctx) { if (rf & 1) {
    const _r11 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-file-manager", 42);
    i0.ɵɵlistener("filesChanged", function BrainComponent_Conditional_3_Conditional_38_Defer_0_Template_app_file_manager_filesChanged_0_listener() { i0.ɵɵrestoreView(_r11); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.loadStats(ctx_r1.activeSpaceId())); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("embeddedSpaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_38_DeferLoading_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 43);
    i0.ɵɵelement(1, "span", 4);
    i0.ɵɵelementEnd();
} }
function BrainComponent_Conditional_3_Conditional_38_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomTemplate(0, BrainComponent_Conditional_3_Conditional_38_Defer_0_Template, 1, 1)(1, BrainComponent_Conditional_3_Conditional_38_DeferLoading_1_Template, 2, 0);
    i0.ɵɵdefer(2, 0, BrainComponent_Conditional_3_Conditional_38_Defer_2_DepsFn, 1, null, null, 0, null, i0.ɵɵdeferEnableTimerScheduling);
    i0.ɵɵdeferOnImmediate();
} }
function BrainComponent_Conditional_3_Conditional_39_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-memories-tab", 44);
    i0.ɵɵlistener("mutated", function BrainComponent_Conditional_3_Conditional_39_Template_app_memories_tab_mutated_0_listener() { i0.ɵɵrestoreView(_r12); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.loadStats(ctx_r1.activeSpaceId())); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_40_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-entities-tab", 45);
    i0.ɵɵlistener("mutated", function BrainComponent_Conditional_3_Conditional_40_Template_app_entities_tab_mutated_0_listener() { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.loadStats(ctx_r1.activeSpaceId())); })("viewInGraph", function BrainComponent_Conditional_3_Conditional_40_Template_app_entities_tab_viewInGraph_0_listener($event) { i0.ɵɵrestoreView(_r13); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.viewInGraph($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_41_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-edges-tab", 45);
    i0.ɵɵlistener("mutated", function BrainComponent_Conditional_3_Conditional_41_Template_app_edges_tab_mutated_0_listener() { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.loadStats(ctx_r1.activeSpaceId())); })("viewInGraph", function BrainComponent_Conditional_3_Conditional_41_Template_app_edges_tab_viewInGraph_0_listener($event) { i0.ɵɵrestoreView(_r14); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.viewInGraph($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_42_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "app-chrono-tab", 25);
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-overview-tab", 47);
    i0.ɵɵlistener("reindex", function BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template_app_overview_tab_reindex_0_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.runReindex()); })("retryFailed", function BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template_app_overview_tab_retryFailed_0_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.runRetryFailedEmbeddings()); })("openTab", function BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template_app_overview_tab_openTab_0_listener($event) { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.setTab($event)); })("resetUsage", function BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template_app_overview_tab_resetUsage_0_listener() { i0.ɵɵrestoreView(_r15); const ctx_r1 = i0.ɵɵnextContext(3); return i0.ɵɵresetView(ctx_r1.resetSpaceUsage()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(3);
    i0.ɵɵproperty("space", ctx)("stats", ctx_r1.activeStats())("needsReindex", ctx_r1.needsReindex())("reindexing", ctx_r1.reindexing())("about", ctx_r1.aboutInfo())("embeddingQueue", ctx_r1.ov.embeddingQueue())("openVotes", ctx_r1.ov.overviewVotes())("tokenAccess", ctx_r1.ov.tokenAccess())("completeness", ctx_r1.ov.completeness())("activity", ctx_r1.ov.spaceActivity())("pending", ctx_r1.ov.overviewPending())("resettingUsage", ctx_r1.resettingUsage())("usageResetResult", ctx_r1.usageResetResult());
} }
function BrainComponent_Conditional_3_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, BrainComponent_Conditional_3_Conditional_43_Conditional_0_Template, 1, 13, "app-overview-tab", 46);
} if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵconditional((tmp_2_0 = ctx_r1.activeSpace()) ? 0 : -1, tmp_2_0);
} }
function BrainComponent_Conditional_3_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    const _r16 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-query-tab", 48);
    i0.ɵɵlistener("viewInGraph", function BrainComponent_Conditional_3_Conditional_44_Template_app_query_tab_viewInGraph_0_listener($event) { i0.ɵɵrestoreView(_r16); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.viewInGraph($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Conditional_45_Template(rf, ctx) { if (rf & 1) {
    const _r17 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "app-review-tab", 49);
    i0.ɵɵlistener("openTab", function BrainComponent_Conditional_3_Conditional_45_Template_app_review_tab_openTab_0_listener($event) { i0.ɵɵrestoreView(_r17); const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.setTab($event)); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵproperty("spaceId", ctx_r1.activeSpaceId());
} }
function BrainComponent_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 8);
    i0.ɵɵrepeaterCreate(1, BrainComponent_Conditional_3_For_2_Template, 8, 9, "button", 9, _forTrack0);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(3, BrainComponent_Conditional_3_Conditional_3_Template, 9, 9, "div", 10);
    i0.ɵɵelementStart(4, "div", 11);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵelementStart(6, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_6_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setTab("overview")); });
    i0.ɵɵelement(7, "ph-icon", 13);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_10_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setTab("query")); });
    i0.ɵɵelement(11, "ph-icon", 14);
    i0.ɵɵtext(12);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(14, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_14_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setTab("graph")); });
    i0.ɵɵelement(15, "ph-icon", 15);
    i0.ɵɵtext(16);
    i0.ɵɵpipe(17, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(18, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_18_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setTab("review")); });
    i0.ɵɵelement(19, "ph-icon", 16);
    i0.ɵɵtext(20);
    i0.ɵɵpipe(21, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(22, "span", 17);
    i0.ɵɵrepeaterCreate(23, BrainComponent_Conditional_3_For_24_Template, 5, 9, "button", 18, _forTrack1);
    i0.ɵɵelementStart(25, "button", 12);
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_25_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setTab("files")); });
    i0.ɵɵelement(26, "ph-icon", 19);
    i0.ɵɵtext(27);
    i0.ɵɵpipe(28, "transloco");
    i0.ɵɵconditionalCreate(29, BrainComponent_Conditional_3_Conditional_29_Template, 2, 1, "span", 20);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(30, "button", 21);
    i0.ɵɵpipe(31, "transloco");
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵlistener("click", function BrainComponent_Conditional_3_Template_button_click_30_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.openSpaceSettings()); });
    i0.ɵɵelement(33, "ph-icon", 22);
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(34, BrainComponent_Conditional_3_Conditional_34_Template, 4, 0);
    i0.ɵɵelementStart(35, "div", 23);
    i0.ɵɵconditionalCreate(36, BrainComponent_Conditional_3_Conditional_36_Template, 2, 0, "div", 24);
    i0.ɵɵconditionalCreate(37, BrainComponent_Conditional_3_Conditional_37_Template, 4, 0);
    i0.ɵɵconditionalCreate(38, BrainComponent_Conditional_3_Conditional_38_Template, 4, 0);
    i0.ɵɵconditionalCreate(39, BrainComponent_Conditional_3_Conditional_39_Template, 1, 1, "app-memories-tab", 25);
    i0.ɵɵconditionalCreate(40, BrainComponent_Conditional_3_Conditional_40_Template, 1, 1, "app-entities-tab", 25);
    i0.ɵɵconditionalCreate(41, BrainComponent_Conditional_3_Conditional_41_Template, 1, 1, "app-edges-tab", 25);
    i0.ɵɵconditionalCreate(42, BrainComponent_Conditional_3_Conditional_42_Template, 1, 1, "app-chrono-tab", 25);
    i0.ɵɵconditionalCreate(43, BrainComponent_Conditional_3_Conditional_43_Template, 1, 1);
    i0.ɵɵconditionalCreate(44, BrainComponent_Conditional_3_Conditional_44_Template, 1, 1, "app-query-tab", 25);
    i0.ɵɵconditionalCreate(45, BrainComponent_Conditional_3_Conditional_45_Template, 1, 1, "app-review-tab", 25);
    i0.ɵɵelementEnd();
    i0.ɵɵelement(46, "app-record-drawer");
} if (rf & 2) {
    let tmp_25_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r1.spaces());
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.needsReindex() && !ctx_r1.activeSpaceIsProxy() ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(5, 43, "brain.tabsAriaLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === "overview");
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === "overview");
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(9, 45, "brain.tab.overview"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === "query");
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === "query");
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(13, 47, "brain.tab.query"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === "graph");
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === "graph");
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(17, 49, "brain.tab.graph"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === "review");
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === "review");
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(21, 51, "brain.tab.review"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r1.collectionTabs);
    i0.ɵɵadvance(2);
    i0.ɵɵclassProp("active", ctx_r1.activeTab() === "files");
    i0.ɵɵattribute("aria-selected", ctx_r1.activeTab() === "files");
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(28, 53, "brain.tab.files"), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_25_0 = ctx_r1.activeStats()) ? 29 : -1, tmp_25_0);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", !ctx_r1.activeSpace());
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(31, 55, "brain.tab.spaceSettings"))("title", i0.ɵɵpipeBind1(32, 57, "brain.tab.spaceSettingsTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 15);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.spaceSettings.settingsSpace() ? 34 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.recordList.loading() ? 36 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "graph" ? 37 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "files" ? 38 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "memories" ? 39 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "entities" ? 40 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "edges" ? 41 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "chrono" ? 42 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "overview" ? 43 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "query" ? 44 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.activeTab() === "review" ? 45 : -1);
} }
export class BrainComponent {
    constructor() {
        this.store = inject(BrainStore);
        this.picker = inject(EntityRefPicker);
        this.drawerState = inject(RecordDrawerState);
        this.recordList = inject(RecordListState);
        this.spacesApi = inject(SpacesApi);
        /** The Overview panel's data, moved out of this shell — see overview-data.service.ts. */
        this.ov = inject(OverviewDataService);
        /**
         * The dialog's state, provided by this component so it opens and closes with the page.
         *
         * Public because the template reads `settingsSpace()` to decide whether the dialog's code should be
         * fetched at all — see the `@defer` around it. The dialog carries the schema editor, the duplicate rules
         * and the danger zone, and this is already the heaviest page in the app; loading all of that on the
         * chance someone presses the cog took `spaces-component` off the bundle-budget list entirely, because
         * the shared code had moved out of it. It now arrives when the cog is pressed and not before.
         */
        this.spaceSettings = inject(SpaceSettingsState);
        this.brainApi = inject(BrainApi);
        this.adminApi = inject(AdminApi);
        this.networksApi = inject(NetworksApi);
        this.transloco = inject(TranslocoService);
        /** Transient outcomes go through the app's one toast channel — see runReindex() for why not inline. */
        this.toast = inject(ToastService);
        // File Meta merged into the Files tab (rendered separately, after these, in the same group).
        /**
         * The record-collection tabs.
         *
         * `label` is an i18n KEY now, not a literal. These four were the only tabs in the strip rendering a
         * hard-coded English string — the translations existed the whole time and were simply never used, so
         * the strip read half-German in a German UI and nothing flagged it.
         *
         * `icon` likewise: Overview, Query, Graph, Review and Files each carried one and these four did not,
         * leaving a strip where some tabs have an icon and some do not. The icons match the Overview tiles
         * that link here, because the tiles and the tabs are the same five things.
         */
        this.collectionTabs = [
            { key: 'entities', label: 'brain.tab.entities', icon: 'stack', statsKey: 'entities' },
            // `link` and not `graph`: the Graph tab already owns that glyph, and two different tabs wearing the
            // same icon in one strip is worse than a slightly less literal one.
            { key: 'edges', label: 'brain.tab.edges', icon: 'link', statsKey: 'edges' },
            { key: 'memories', label: 'brain.tab.memories', icon: 'brain', statsKey: 'memories' },
            { key: 'chrono', label: 'brain.tab.chrono', icon: 'timer', statsKey: 'chrono' },
        ];
        this.pageSize = 20;
        this.spaces = signal([], ...(ngDevMode ? [{ debugName: "spaces" }] : /* istanbul ignore next */ []));
        this.activeSpaceId = signal('', ...(ngDevMode ? [{ debugName: "activeSpaceId" }] : /* istanbul ignore next */ []));
        this.route = inject(ActivatedRoute);
        this.router = inject(Router);
        this.activeTab = signal('overview', ...(ngDevMode ? [{ debugName: "activeTab" }] : /* istanbul ignore next */ []));
        /**
         * The entity the Graph tab should open rooted at, set by a record table's "view in graph" button and
         * consumed by the graph on mount. Null means "the graph opens as it always did, with no root".
         */
        this.graphFocusId = signal(null, ...(ngDevMode ? [{ debugName: "graphFocusId" }] : /* istanbul ignore next */ []));
        this.loadingSpaces = signal(true, ...(ngDevMode ? [{ debugName: "loadingSpaces" }] : /* istanbul ignore next */ []));
        /** Null until the space list failed to load — checked before the empty state, so a failure never reads as "no spaces". */
        this.spacesError = signal(null, ...(ngDevMode ? [{ debugName: "spacesError" }] : /* istanbul ignore next */ []));
        /** Instance identity/health for the Overview's Instance panel — fetched once (instance-wide, not per space). */
        this.aboutInfo = signal(null, ...(ngDevMode ? [{ debugName: "aboutInfo" }] : /* istanbul ignore next */ []));
        // Reindex
        this.needsReindex = signal(false, ...(ngDevMode ? [{ debugName: "needsReindex" }] : /* istanbul ignore next */ []));
        this.reindexing = signal(false, ...(ngDevMode ? [{ debugName: "reindexing" }] : /* istanbul ignore next */ []));
        // Entity picker
        this.activeStats = computed(() => this.spaces().find(sv => sv.space.id === this.activeSpaceId())?.stats, ...(ngDevMode ? [{ debugName: "activeStats" }] : /* istanbul ignore next */ []));
        /** The active space object (for the Overview tab's index-status + quota panels). */
        this.activeSpace = computed(() => this.spaces().find(sv => sv.space.id === this.activeSpaceId())?.space, ...(ngDevMode ? [{ debugName: "activeSpace" }] : /* istanbul ignore next */ []));
        /**
         * The last `?space=` this handler acted on, so a value it has already honoured stops being authoritative.
         *
         * `undefined` before the first emission, and it deliberately also records an ABSENT parameter — otherwise
         * a link that removes `?space=` would look unchanged forever after one that set it.
         */
        this.lastAppliedSpaceParam = undefined;
        /** Set while the usage reset is in flight, so the panel can disable its own button. */
        this.resettingUsage = signal(false, ...(ngDevMode ? [{ debugName: "resettingUsage" }] : /* istanbul ignore next */ []));
        /** The cleared-bucket count from the last reset, reported inline the way runReindex reports its result. */
        this.usageResetResult = signal('', ...(ngDevMode ? [{ debugName: "usageResetResult" }] : /* istanbul ignore next */ []));
        /** A proxy holds no records of its own, so it has no index — and the server refuses to reindex one. */
        this.activeSpaceIsProxy = () => (this.activeSpace()?.proxyFor?.length ?? 0) > 0;
    }
    /**
     * Open the space settings dialog on the space already selected here.
     *
     * No request: this page's list already holds the full `Space` record, which is the whole reason the cog
     * can live here at all. Reaching the same editor previously meant leaving the Brain, finding the row in
     * the admin table, and coming back — three navigations to change the label of a space that was already
     * on screen.
     */
    openSpaceSettings() {
        const space = this.activeSpace();
        if (space)
            this.spaceSettings.openSettings(space);
    }
    /**
     * Patch the one row this page renders from, after a save the dialog APPLIED.
     *
     * The dialog patches `SpacesStore`, but that instance is provided per host — the one here is empty and
     * nothing reads it. Refetching the list instead would also discard the per-space stats hanging off each
     * row, which cost one request each. So the record is merged in place and the stats are left alone: a
     * label or quota edit does not change any count.
     */
    onSpaceSaved(space) {
        this.spaces.update(list => list.map(sv => sv.space.id === space.id ? { ...sv, space } : sv));
    }
    spaceTotal(stats) {
        return stats.memories + stats.entities + stats.edges + stats.chrono + stats.files;
    }
    /** Tooltip for the space-chip network indicator (F8): the network name(s) plus
     *  the human-readable status. Colour alone must not carry the meaning (a11y). */
    networkChipTitle(space) {
        const status = space.networkStatus ?? 'idle';
        const names = (space.networks ?? []).map(n => n.label).join(', ');
        const statusText = this.transloco.translate(`brain.spaceChip.network.${status}`);
        const prefix = this.transloco.translate('brain.spaceChip.network.prefix');
        return names ? `${prefix}: ${names} — ${statusText}` : statusText;
    }
    ngOnInit() {
        this.loadSpaces();
        // Instance identity/health. The Overview no longer shows it (owner, 2026-08-08 — it belongs to About),
        // but the fetch stays: `aboutInfo` still feeds other consumers, and it is one best-effort call.
        this.adminApi.getAbout().subscribe({
            next: a => this.aboutInfo.set(a),
            error: () => { },
        });
    }
    /** Public so the error state's Retry can re-run it without a page reload. */
    loadSpaces() {
        this.loadingSpaces.set(true);
        this.spacesError.set(null);
        this.spacesApi.listSpaces().subscribe({
            next: ({ spaces }) => {
                this.spaces.set(spaces.map(s => ({ space: s })));
                this.loadingSpaces.set(false);
                if (spaces.length > 0) {
                    this.applyUrlState(spaces);
                    // Pre-load stats for all other spaces so counts show on their chips
                    spaces.slice(1).forEach(s => this.loadStats(s.id));
                }
            },
            error: (err) => { this.spacesError.set(httpErrorReason(err)); this.loadingSpaces.set(false); },
        });
    }
    ngOnDestroy() {
        this.closeLiveStream();
        clearTimeout(this.liveRefreshTimer);
    }
    static { this.LIVE_RECONNECT_MS = 3000; }
    static { this.TAB_FOR_COLLECTION = {
        memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono', file: 'files',
    }; }
    /** (Re)open the live-change SSE stream for a space. EventSource can't send an Authorization header, and
     *  a raw token in the URL leaks into logs/history/Referer, so we mint a single-use `?ticket=` first. */
    openLiveStream(spaceId) {
        this.closeLiveStream();
        if (typeof EventSource === 'undefined')
            return; // non-browser (SSR/test) environment
        if (!spaceId)
            return;
        this.connectLiveStream(spaceId);
    }
    /** Mint a ticket, then open the stream. Because the ticket is single-use, the browser's native
     *  auto-reconnect (which would replay the now-dead ticket) is useless — so on error we close and
     *  reconnect ourselves with a FRESH ticket after a fixed backoff, and only while this space is still
     *  active. The backoff + active-space guard keep a persistently-failing stream to ~1 attempt / 3s
     *  (never a request storm) and stop it entirely once the user navigates away. */
    connectLiveStream(spaceId) {
        if (spaceId !== this.activeSpaceId())
            return; // space switched (or torn down) before we got here
        this.brainApi.mintEventsTicket(spaceId).subscribe({
            next: ({ ticket }) => {
                if (spaceId !== this.activeSpaceId())
                    return; // switched while minting — drop this ticket
                const url = `/api/brain/spaces/${encodeURIComponent(spaceId)}/events?ticket=${encodeURIComponent(ticket)}`;
                const es = new EventSource(url);
                es.onmessage = (e) => {
                    let payload;
                    try {
                        payload = JSON.parse(e.data);
                    }
                    catch {
                        return;
                    }
                    this.onLiveEvent(spaceId, payload.event ?? '');
                };
                es.onerror = () => {
                    es.close();
                    if (this.liveStream === es)
                        this.liveStream = undefined;
                    clearTimeout(this.liveReconnectTimer);
                    this.liveReconnectTimer = setTimeout(() => this.connectLiveStream(spaceId), BrainComponent.LIVE_RECONNECT_MS);
                };
                this.liveStream = es;
            },
            // Mint failed (auth / rate limit / offline): stay closed — the next space switch retries. Not
            // retried on a timer here to avoid hammering the mint endpoint when auth is genuinely broken.
            error: () => { },
        });
    }
    closeLiveStream() {
        clearTimeout(this.liveReconnectTimer);
        this.liveStream?.close();
        this.liveStream = undefined;
    }
    /** Debounced refresh: any change updates the count badges; a change to the ACTIVE tab's collection
     *  (or any bulk write) also reloads its current page via the store tick. */
    onLiveEvent(spaceId, event) {
        if (spaceId !== this.activeSpaceId())
            return;
        clearTimeout(this.liveRefreshTimer);
        this.liveRefreshTimer = setTimeout(() => {
            this.loadStats(spaceId);
            this.ov.loadEmbeddingQueue(spaceId, () => this.activeSpaceId() === spaceId); // file/embed events change the queue
            const collection = event.split('.')[0] ?? '';
            if (event.startsWith('bulk') || BrainComponent.TAB_FOR_COLLECTION[collection] === this.activeTab()) {
                this.store.liveRefreshTick.update(t => t + 1);
            }
        }, 250);
    }
    selectSpace(id) {
        // Switching space lands on the new space's OVERVIEW — its landing view (F9). The tab used to
        // persist across the switch, so picking another space while on, say, Entities just swapped the
        // rows underneath you: the page looked unchanged until you clicked a tab, and the space you had
        // chosen never introduced itself. Re-clicking the chip of the space you are ALREADY on is not a
        // switch, so that leaves your current tab alone.
        if (this.activeSpaceId() !== id)
            this.activeTab.set('overview');
        this.activeSpaceId.set(id);
        this.picker.spaceId.set(id);
        this.drawerState.spaceId.set(id);
        this.openLiveStream(id);
        this.store.memorySearch.set('');
        this.store.edgeSearch.set('');
        this.store.chronoSearch.set('');
        this.recordList.confirmDeleteId.set('');
        this.ov.blankForSpaceSwitch();
        this.loadStats(id);
        this.loadSpaceMeta(id);
        this.ov.loadAll(id, () => this.activeSpaceId() === id, this.spaces().find(sv => sv.space.id === id)?.space.networks ?? []);
        /*
         * The selected space is deliberately NOT written to the URL. Owner, 2026-08-30: *"dont use the url please
         * — i use ythril iframed a lot"*, and a page that rewrites its own address inside somebody else's frame
         * is doing something the host did not ask for.
         *
         * That is why the fix for the space-resetting bug lives in `applyQueryParams` instead: an absent
         * `?space=` is read as "no preference" rather than as "go to the first space". Writing the parameter
         * would have fixed the same bug and is the obvious move — do not reintroduce it.
         */
    }
    /**
     * Deep-link state: which space and which tab, read from the URL.
     *
     * The Overview's data-model panel links a type's record count straight to the filtered entities tab, so
     * that link has to be a real URL rather than a signal handed between two components — right-click, open in
     * a new tab, bookmark and back/forward all follow for free, and neither component learns about the other.
     * The Graph page already deep-links the same way with `?space=` and `?entity=`.
     *
     * Read once from the snapshot rather than subscribed: a later in-page navigation is this component
     * WRITING the URL, and re-reading its own write would fight `setTab`.
     */
    applyUrlState(spaces) {
        this.applyQueryParams(spaces);
        /**
         * ...and keep applying it, because a link INTO this page from a component already on it is a query-param
         * change and nothing else.
         *
         * The data-model panel's record count is such a link. Read-once meant clicking it rewrote the URL —
         * `?tab=entities&type=x` — and changed nothing on screen: reported as *"clicking the number does not jump
         * to the correct tab. it just appends a route to the url"*. Exactly right, and the URL being correct while
         * the page ignored it is the worst version of the bug, because the address bar says it worked.
         *
         * The original comment feared re-reading our own writes fighting `setTab`. That fear is answered by
         * applying only DIFFERENCES rather than by not subscribing: when this component writes `tab=x` it has
         * already set `activeTab` to x, so the incoming value equals current state and the handler does nothing.
         * Idempotence, not abstinence — and it cannot loop, because a no-op writes no URL.
         */
        this.route.queryParamMap.subscribe(() => this.applyQueryParams(spaces));
    }
    /** Apply `?space=` / `?tab=` if — and only if — they differ from what is on screen. */
    applyQueryParams(spaces) {
        const qp = this.route.snapshot.queryParamMap;
        const wanted = qp.get('space') ?? undefined;
        /*
         * An ABSENT `?space=` means "no preference", not "go to the first space" — and reading it the second way
         * is what made every tab click on any space but the first snap back to that first space.
         *
         * The sequence, reported 2026-08-30: `setTab` navigates to record the tab, the navigation re-emits
         * `queryParamMap`, this handler reads no `?space=`, falls back to `spaces[0]`, and calls `selectSpace` —
         * which also resets the tab to Overview, because a changed space is a switch. The user's own workaround
         * fits exactly: the second click writes the same `?tab=`, no query-param change is emitted, and this
         * never runs.
         *
         * The fallback is still right for the FIRST pass, when nothing is selected yet. It is only wrong
         * afterwards, so it is now conditioned on that.
         */
        /*
         * A PRESENT `?space=` is honoured only when it CHANGED, and that is the other half of the same bug.
         *
         * The premise this file, its commit and the CHANGELOG all carried — that nothing ever writes `?space=` —
         * was false. `er-model-panel.component.ts` writes it on the knowledge-type count links, which is the very
         * control the report named. So it goes stale the moment the user picks a different space by chip (the
         * screen changes, the URL deliberately does not), and `writeTabToUrl` merges it forward on every
         * subsequent tab click. Read as authoritative each time, it threw the page back exactly as the absent
         * case did.
         *
         * Honouring it only on the FIRST pass would have been the smaller change and would have broken those
         * count links: they navigate to `/brain` from INSIDE `/brain`, so there is no remount and no first pass.
         * "Changed" covers both — a fresh link moves the page, a merge-preserved value does not.
         */
        const current = this.activeSpaceId();
        const fresh = wanted !== this.lastAppliedSpaceParam;
        this.lastAppliedSpaceParam = wanted;
        const known = fresh && wanted && spaces.some(s => s.id === wanted) ? wanted : undefined;
        const initial = known ?? (current || spaces[0].id);
        // Only when it CHANGES: selectSpace reloads the space's data, so calling it on every query-param event
        // would refetch on each tab switch this component itself performs.
        if (initial !== current)
            this.selectSpace(initial);
        // Only a tab that exists. An unknown value in a hand-edited URL must land on the default rather than a
        // blank pane, and `BRAIN_TABS` is the same list the strip renders from.
        const tab = (qp.get('tab') ?? undefined);
        if (tab && tab !== this.activeTab() && BRAIN_TABS.includes(tab))
            this.activeTab.set(tab);
    }
    /**
     * Keep the URL saying which tab is open, so it can be linked to and survives a reload.
     *
     * `replaceUrl` — a tab switch is not a place someone wants to return to with Back; it would take them
     * through every tab they had touched. `queryParamsHandling: 'merge'` preserves `?type=`, which the
     * entities tab reads.
     */
    writeTabToUrl(tab) {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }
    setTab(tab) {
        // Clearing the pending graph focus here (rather than only when leaving the Graph tab) is what stops
        // it becoming sticky: the Graph tab UNMOUNTS on leave and re-reads the input on every remount, so a
        // focus left in place would silently re-root the graph the next time the tab is opened by hand.
        // `viewInGraph()` sets it AFTER calling this, which is why the order there matters.
        this.graphFocusId.set(null);
        this.activeTab.set(tab);
        this.store.memorySearch.set('');
        this.store.edgeSearch.set('');
        this.store.chronoSearch.set('');
        this.store.fileMetaSearch.set('');
        this.recordList.confirmDeleteId.set('');
        this.writeTabToUrl(tab);
    }
    /**
     * A record table's "view in graph" action: open the Graph tab rooted at that entity.
     *
     * The id goes into a signal on the SHELL rather than into the graph component, because the graph is
     * behind `@if (activeTab() === 'graph')` and does not exist yet at the moment the button is clicked.
     * Setting it after `setTab` is deliberate — `setTab` clears it (see above).
     */
    viewInGraph(entityId) {
        this.setTab('graph');
        this.graphFocusId.set(entityId);
    }
    loadStats(spaceId) {
        this.spacesApi.getSpaceStats(spaceId).subscribe({
            next: (stats) => {
                this.spaces.update(list => list.map(sv => sv.space.id === spaceId ? { ...sv, stats } : sv));
            },
            // No pending flag to clear since the statistics strip went: stats still load (other views read them),
            // they just no longer drive a skeleton on this tab.
            error: () => { },
        });
        this.spacesApi.getReindexStatus(spaceId).subscribe({
            next: ({ needsReindex }) => this.needsReindex.set(needsReindex),
            error: () => { },
        });
    }
    requestDelete(id) { this.recordList.confirmDeleteId.set(id); }
    cancelDelete() { this.recordList.confirmDeleteId.set(''); }
    /**
     * Clear this space's recorded usage. The PANEL confirmed already — it owns the dialog, the same way it does
     * for reindex and retry-failed — so this performs the request and reloads.
     *
     * Reloaded rather than zeroed locally: a local zero would be a guess about what the server did, and the count
     * in the response exists precisely because a reset and a genuinely idle space look identical afterwards.
     */
    resetSpaceUsage() {
        const spaceId = this.activeSpaceId();
        if (!spaceId || this.resettingUsage())
            return;
        this.resettingUsage.set(true);
        this.usageResetResult.set('');
        this.spacesApi.resetSpaceActivity(spaceId).subscribe({
            next: ({ cleared }) => {
                this.resettingUsage.set(false);
                this.usageResetResult.set(`Cleared ${cleared} usage buckets.`);
                this.ov.loadSpaceActivity(spaceId, () => this.activeSpaceId() === spaceId);
            },
            error: () => {
                this.resettingUsage.set(false);
                this.usageResetResult.set('Usage reset failed — check server logs.');
            },
        });
    }
    /**
     * Start a reindex and say that it STARTED.
     *
     * ## The report this rewrites
     *
     * Owner, 2026-08-15: *"on clicking reindex on overview it sais reindexed 0 documents in green as if it
     * worked on an unclosable inline message."*
     *
     * The route never awaits the job — `startReindex` schedules the work and both surfaces answer immediately
     * with ZEROED counters, deliberately, so the HTTP call does not hang for the length of a re-embed. This
     * method summed those zeros and printed "Reindexed 0 documents." So the acknowledgement of a job that had
     * just been scheduled was rendered as its result, in green, at the moment it began.
     *
     * There is no count to print here and there never was. Progress lives in `reindex-status` and the log,
     * which is where the panel's own indicator reads it from.
     *
     * A toast rather than an inline banner, for the reason the report gives: the inline one had no dismiss and
     * was cleared only by switching space, so a note about a finished job outlived everything after it.
     */
    runReindex() {
        this.reindexing.set(true);
        this.spacesApi.reindex(this.activeSpaceId()).subscribe({
            next: () => {
                this.reindexing.set(false);
                this.toast.info(this.transloco.translate('brain.reindex.started'));
                // The stale-index banner is NOT cleared here. It was, optimistically — and the index really is
                // still stale, because the job has only just been scheduled. `loadStats` re-reads the true state
                // from `reindex-status` a moment later and would put the banner straight back, so the optimism
                // bought a flicker and a false claim. The toast is what says the work has begun.
                this.loadStats(this.activeSpaceId());
            },
            error: (err) => {
                this.reindexing.set(false);
                // The server's own words when it has them: a proxy refusal names the member spaces to reindex
                // instead, and "check server logs" would send the reader to the one place that does not say it.
                this.toast.error(err?.error?.error ?? this.transloco.translate('brain.reindex.failed'));
            },
        });
    }
    /** Re-queue every failed embedding job for the active space, then refresh the queue panel. */
    runRetryFailedEmbeddings() {
        const spaceId = this.activeSpaceId();
        this.brainApi.retryFailedEmbeddings(spaceId).subscribe({
            next: () => { if (this.activeSpaceId() === spaceId)
                this.ov.loadEmbeddingQueue(spaceId, () => this.activeSpaceId() === spaceId); },
            error: () => { },
        });
    }
    // ── Space meta (schema, loaded for property prefill) ────────────────────
    loadSpaceMeta(spaceId) {
        if (!spaceId)
            return;
        this.spacesApi.getSpaceMeta(spaceId).subscribe({
            next: (meta) => this.store.spaceMeta.set(meta),
            error: () => this.store.spaceMeta.set(null),
        });
    }
    static { this.ɵfac = function BrainComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || BrainComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: BrainComponent, selectors: [["app-brain"]], features: [i0.ɵɵProvidersFeature([BrainStore, EntityRefPicker, RecordDrawerState, RecordListState, OverviewDataService, SpacesStore, SpaceSettingsState])], decls: 4, vars: 1, consts: [[200, null], [1, "loading-overlay"], [3, "message", "reason"], [1, "empty-state"], [1, "spinner"], [3, "retry", "message", "reason"], [1, "empty-state-icon"], ["name", "package", 3, "size"], [1, "space-tabs"], [1, "space-chip", 3, "active", "title"], [1, "reindex-banner"], ["role", "tablist", 1, "tabs"], ["type", "button", "role", "tab", 1, "tab", 3, "click"], ["name", "chart-bar", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], ["name", "magnifying-glass", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], ["name", "graph", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], ["name", "copy", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], [1, "tab-spacer"], ["type", "button", "role", "tab", 1, "tab", 3, "active"], ["name", "folder", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], [1, "tab-count"], ["type", "button", 1, "tab", "tab-cog", 3, "click", "disabled"], ["name", "gear", 2, "display", "inline-flex", "vertical-align", "middle", 3, "size"], [1, "tab-body"], [1, "loading-overlay", "loading-overlay--float"], [3, "spaceId"], [1, "space-chip", 3, "click", "title"], [1, "space-chip-label"], [1, "space-chip-id"], [3, "proxyFor", "size"], [1, "space-chip-net", 3, "class", "title"], [1, "space-chip-count"], [1, "space-chip-net", 3, "title"], ["name", "link", 3, "size"], ["name", "warning", 2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "size"], [1, "btn", "btn-sm", "btn-primary", 3, "click", "disabled"], [1, "spinner", 2, "width", "11px", "height", "11px", "border-width", "2px"], [2, "display", "inline-flex", "vertical-align", "middle", "margin-right", "4px", 3, "name", "size"], [3, "saved"], ["data-tab-defer", "space-settings", 1, "loading-overlay", "loading-overlay--float"], [3, "embeddedSpaceId", "focusEntityId"], ["data-tab-defer", "graph", 1, "loading-overlay", "loading-overlay--float"], [3, "filesChanged", "embeddedSpaceId"], ["data-tab-defer", "files", 1, "loading-overlay", "loading-overlay--float"], [3, "mutated", "spaceId"], [3, "mutated", "viewInGraph", "spaceId"], [3, "space", "stats", "needsReindex", "reindexing", "about", "embeddingQueue", "openVotes", "tokenAccess", "completeness", "activity", "pending", "resettingUsage", "usageResetResult"], [3, "reindex", "retryFailed", "openTab", "resetUsage", "space", "stats", "needsReindex", "reindexing", "about", "embeddingQueue", "openVotes", "tokenAccess", "completeness", "activity", "pending", "resettingUsage", "usageResetResult"], [3, "viewInGraph", "spaceId"], [3, "openTab", "spaceId"]], template: function BrainComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, BrainComponent_Conditional_0_Template, 4, 3, "div", 1)(1, BrainComponent_Conditional_1_Template, 2, 4, "app-error-state", 2)(2, BrainComponent_Conditional_2_Template, 9, 7, "div", 3)(3, BrainComponent_Conditional_3_Template, 47, 59);
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.loadingSpaces() ? 0 : ctx.spacesError() !== null ? 1 : ctx.spaces().length === 0 ? 2 : 3);
        } }, dependencies: [ProxySpaceBadgeComponent, CommonModule, FormsModule, PhIconComponent, RecordDrawerComponent, QueryTabComponent, MemoriesTabComponent, EntitiesTabComponent, EdgesTabComponent, ChronoTabComponent, OverviewTabComponent, ReviewTabComponent, ErrorStateComponent, TranslocoPipe], styles: [".space-tabs[_ngcontent-%COMP%] {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 24px;\n      overflow-x: auto;\n      padding-bottom: 4px;\n    }\n\n    .space-chip[_ngcontent-%COMP%] {\n      padding: 6px 14px;\n      border-radius: 4px;\n      font-size: 12px;\n      font-weight: 500;\n      border: 1px solid var(--border);\n      background: var(--bg-surface);\n      color: var(--text-secondary);\n      cursor: pointer;\n      transition: all var(--transition);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 2px;\n      min-width: 110px;\n      \n\n\n\n\n\n      max-width: 200px;\n      flex: 0 0 auto;\n    }\n\n    \n\n\n    .space-chip[_ngcontent-%COMP%]    > *[_ngcontent-%COMP%] { max-width: 100%; min-width: 0; }\n\n    .space-chip[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--text-primary); }\n\n    .space-chip.active[_ngcontent-%COMP%] {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n\n    .space-chip-label[_ngcontent-%COMP%] { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    .space-chip-id[_ngcontent-%COMP%] { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    .space-chip-count[_ngcontent-%COMP%] {\n      font-size: 10px;\n      color: var(--text-muted);\n      font-variant-numeric: tabular-nums;\n    }\n    .space-chip.active[_ngcontent-%COMP%]   .space-chip-count[_ngcontent-%COMP%] { color: var(--accent); opacity: 0.8; }\n\n    \n\n\n\n    .space-chip-net[_ngcontent-%COMP%] { display: inline-flex; align-items: center; }\n    .space-chip-net.net-idle[_ngcontent-%COMP%] { color: var(--text-muted); }\n    .space-chip-net.net-syncing[_ngcontent-%COMP%] { color: var(--warning); }\n    .space-chip-net.net-degraded[_ngcontent-%COMP%] { color: var(--error); }\n    .space-chip-net.net-vote[_ngcontent-%COMP%] { color: var(--info); }\n    @keyframes _ngcontent-%COMP%_chip-net-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }\n    .space-chip-net.net-syncing[_ngcontent-%COMP%], .space-chip-net.net-vote[_ngcontent-%COMP%] { animation: _ngcontent-%COMP%_chip-net-pulse 1.4s ease-in-out infinite; }\n    @media (prefers-reduced-motion: reduce) { .space-chip-net[_ngcontent-%COMP%] { animation: none !important; } }\n\n    .tab-count[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      background: var(--bg-elevated);\n      border-radius: 10px;\n      padding: 1px 6px;\n      font-size: 11px;\n      font-weight: 600;\n      color: var(--text-muted);\n      margin-left: 5px;\n      min-width: 20px;\n      font-variant-numeric: tabular-nums;\n    }\n\n    .tab.active[_ngcontent-%COMP%]   .tab-count[_ngcontent-%COMP%] {\n      background: var(--accent-dim);\n      color: var(--accent);\n    }\n\n    .reindex-banner[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      padding: 8px 14px;\n      margin-bottom: 12px;\n      border: 1px solid var(--warning);\n      border-radius: var(--radius-md);\n      background: color-mix(in srgb, var(--warning) 6%, transparent);\n      font-size: 13px;\n      color: var(--text-secondary);\n    }\n\n    .tab-spacer[_ngcontent-%COMP%] { flex: 1; }\n    \n\n\n\n    .tab-cog[_ngcontent-%COMP%] {\n      padding: 6px 9px;\n      flex: 0 0 auto;\n      color: var(--text-muted);\n    }\n    .tab-cog[_ngcontent-%COMP%]:hover:not(:disabled) { color: var(--text); }\n    \n\n\n    .tab-cog[_ngcontent-%COMP%]:disabled { opacity: .4; cursor: not-allowed; }\n\n    \n\n\n    .tab-body[_ngcontent-%COMP%] { position: relative; min-height: 80px; }\n    .loading-overlay--float[_ngcontent-%COMP%] {\n      position: absolute;\n      top: 0; left: 0; right: 0;\n      z-index: 5;\n      background: color-mix(in srgb, var(--bg) 72%, transparent);\n      border-radius: 8px;\n    }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadataAsync(BrainComponent, () => [import("../settings/space-settings-popup.component").then(m => m.SpaceSettingsPopupComponent), import("../graph/graph.component").then(m => m.GraphComponent), import("../files/file-manager.component").then(m => m.FileManagerComponent)], (SpaceSettingsPopupComponent, GraphComponent, FileManagerComponent) => { i0.ɵsetClassMetadata(BrainComponent, [{
        type: Component,
        args: [{ selector: 'app-brain', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [ProxySpaceBadgeComponent, CommonModule, FormsModule, GraphComponent, FileManagerComponent, PhIconComponent, RecordDrawerComponent, QueryTabComponent, MemoriesTabComponent, EntitiesTabComponent, EdgesTabComponent, ChronoTabComponent, OverviewTabComponent, ReviewTabComponent, ErrorStateComponent, TranslocoPipe, SpaceSettingsPopupComponent], providers: [BrainStore, EntityRefPicker, RecordDrawerState, RecordListState, OverviewDataService, SpacesStore, SpaceSettingsState], template: `
    @if (loadingSpaces()) {
      <div class="loading-overlay"><span class="spinner"></span> {{ 'brain.loadingSpaces' | transloco }}</div>
    } @else if (spacesError() !== null) {
      <!-- The front door of the product. If this list fails and we fall through to the empty state, a user with a
           full brain is told to create their first space — so the failure gets its own branch, ahead of it. -->
      <app-error-state [message]="'brain.loadSpacesError' | transloco" [reason]="spacesError() ?? ''" (retry)="loadSpaces()" />
    } @else if (spaces().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="package" [size]="48"/></div>
        <h3>{{ 'brain.emptySpaces.title' | transloco }}</h3>
        <p>{{ 'brain.emptySpaces.body' | transloco }}</p>
      </div>
    } @else {

      <!-- Space selector -->
      <div class="space-tabs">
        @for (sv of spaces(); track sv.space.id) {
          <button
            class="space-chip"
            [class.active]="activeSpaceId() === sv.space.id" [attr.aria-current]="activeSpaceId() === sv.space.id ? 'true' : null"
            [title]="sv.space.label + ' (' + sv.space.id + ')'"
            (click)="selectSpace(sv.space.id)"
          >
            <span class="space-chip-label">{{ sv.space.label }}</span>
            <span class="space-chip-id">{{ sv.space.id }}</span>
            @if (sv.space.proxyFor?.length) {
              <app-proxy-space-badge [proxyFor]="sv.space.proxyFor" [size]="12" />
            }
            @if (sv.space.networkStatus) {
              <span class="space-chip-net" [class]="'net-' + sv.space.networkStatus" [title]="networkChipTitle(sv.space)">
                <ph-icon name="link" [size]="12"/>
              </span>
            }
            @if (sv.stats) {
              <span class="space-chip-count">{{ spaceTotal(sv.stats) }} {{ 'brain.spaceChip.records' | transloco }}</span>
            }
          </button>
        }
      </div>

      <!-- Never offered on a proxy: it has no index of its own and the server refuses it with a 400.
           The outcome is a TOAST, not a line in this banner -- see runReindex(). An inline result had no
           dismiss and was cleared only by switching space, so a message about a finished job sat on screen
           through everything that came after it. -->
      @if (needsReindex() && !activeSpaceIsProxy()) {
        <div class="reindex-banner">
          <span><ph-icon name="warning" [size]="16" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.reindex.stale' | transloco }}</span>
          <button class="btn btn-sm btn-primary" [disabled]="reindexing()" (click)="runReindex()">
            @if (reindexing()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
            {{ 'brain.reindex.button' | transloco }}
          </button>
        </div>
      }

      <!-- Sub-tabs: Query on left, collections on right.
           role=tablist / role=tab / aria-selected, matching the pattern review-tab already used. Without
           aria-selected the active tab was conveyed by a CSS class ALONE, so a screen-reader user could not
           tell which of eight views they were on: the state was visible and unannounced. -->
      <div class="tabs" role="tablist" [attr.aria-label]="'brain.tabsAriaLabel' | transloco">
        <button class="tab" type="button" role="tab" [class.active]="activeTab() === 'overview'" [attr.aria-selected]="activeTab() === 'overview'" (click)="setTab('overview')">
          <ph-icon name="chart-bar" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.overview' | transloco }}
        </button>
        <button class="tab" type="button" role="tab" [class.active]="activeTab() === 'query'" [attr.aria-selected]="activeTab() === 'query'" (click)="setTab('query')">
          <ph-icon name="magnifying-glass" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.query' | transloco }}
        </button>
        <button class="tab" type="button" role="tab" [class.active]="activeTab() === 'graph'" [attr.aria-selected]="activeTab() === 'graph'" (click)="setTab('graph')">
          <ph-icon name="graph" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.graph' | transloco }}
        </button>
        <!-- Review (F-REVIEW): duplicate pairs awaiting a decision in this space. Grouped with the
             other whole-space views rather than after Files — it is a workflow, not a record collection. -->
        <button class="tab" type="button" role="tab" [class.active]="activeTab() === 'review'" [attr.aria-selected]="activeTab() === 'review'" (click)="setTab('review')">
          <ph-icon name="copy" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.review' | transloco }}
        </button>
        <span class="tab-spacer"></span>
        @for (tab of collectionTabs; track tab.key) {
          <button class="tab" type="button" role="tab" [class.active]="activeTab() === tab.key" [attr.aria-selected]="activeTab() === tab.key" (click)="setTab(tab.key)">
            <ph-icon [name]="tab.icon" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ tab.label | transloco }}
            @if (activeStats(); as s) {
              @if (tab.statsKey) {
                <span class="tab-count">{{ s[tab.statsKey] }}</span>
              }
            }
          </button>
        }
        <!-- Files (the former File Meta slot) — the file manager and File Meta merged into one tab: the
             explorer now shows each file's status, tags and folder sizes inline. -->
        <button class="tab" type="button" role="tab" [class.active]="activeTab() === 'files'" [attr.aria-selected]="activeTab() === 'files'" (click)="setTab('files')">
          <ph-icon name="folder" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.files' | transloco }}
          @if (activeStats(); as s) {
            <span class="tab-count">{{ s.files }}</span>
          }
        </button>
        <!-- Space settings, as a cog at the far RIGHT of the strip and deliberately not a tab.
             It opens a modal, so it does not select anything — sitting it between the record tabs would
             make it read as a ninth destination and leave the strip looking wrong when the modal closed
             and nothing was selected. .tab-cog drops the label for the same reason: a "Settings" word
             here competes with the instance-wide Settings page, which is a different scope entirely.
             The label lives in the aria-label and the tooltip, where it names the space scope. -->
        <button class="tab tab-cog" type="button"
          [attr.aria-label]="'brain.tab.spaceSettings' | transloco"
          [attr.title]="'brain.tab.spaceSettingsTitle' | transloco"
          [disabled]="!activeSpace()"
          (click)="openSpaceSettings()">
          <ph-icon name="gear" [size]="15" style="display:inline-flex;vertical-align:middle;"/>
        </button>
      </div>

      <!-- The same dialog the admin spaces table opens, hosted here too. It self-gates on
           settingsSpace(), so this renders nothing until the cog is pressed. (saved) patches the one
           row in THIS page's list: the store the dialog patches is a separate instance here, and the
           sidebar renders from spaces() with per-space stats attached. -->
      @if (spaceSettings.settingsSpace()) {
        @defer (on immediate) {
          <app-space-settings-popup (saved)="onSpaceSaved($event)" />
        } @loading (minimum 200ms) {
          <div class="loading-overlay loading-overlay--float" data-tab-defer="space-settings"><span class="spinner"></span></div>
        }
      }

      <!-- Content. Tabs are gated by activeTab() ONLY — NEVER wrapped in @else of
           @if (recordList.loading()). Each record tab WRITES recordList.loading during its own
           load(); gating the tab's existence on that signal made the tab unmount itself mid-load and
           re-mount on the response, an infinite mount⇄reload storm (one full re-create per response,
           ~5/s, self-sustaining even on 429). The load spinner now floats on top (position:absolute)
           so the active tab instance is never torn down. -->
      <div class="tab-body">
        @if (recordList.loading()) {
          <div class="loading-overlay loading-overlay--float"><span class="spinner"></span></div>
        }

        <!-- Graph + Files carry heavy libraries (cytoscape; the file-manager's markdown/mermaid/xlsx
             renderers). They must MOUNT only while their tab is active — an if-block on activeTab() does
             that (same storm-safe "gate on activeTab() alone" rule as the record tabs), and crucially
             UNMOUNTS them again when you leave, so they can't linger over another tab. A defer block
             alone can't do this: its when-trigger is a one-way load and never removes what it rendered.
             The inner defer (on immediate) still keeps these chunks OUT of the landing bundle — it fires
             the moment the tab first renders, and the browser-cached chunk re-instantiates fast. -->
        @if (activeTab() === 'graph') {
          @defer (on immediate) {
            <app-graph-view [embeddedSpaceId]="activeSpaceId()" [focusEntityId]="graphFocusId() ?? undefined" />
          } @loading (minimum 200ms) {
            <div class="loading-overlay loading-overlay--float" data-tab-defer="graph"><span class="spinner"></span></div>
          }
        }

        <!-- Files tab (merged: file manager + File Meta) -->
        @if (activeTab() === 'files') {
          @defer (on immediate) {
            <app-file-manager [embeddedSpaceId]="activeSpaceId()" (filesChanged)="loadStats(activeSpaceId())" />
          } @loading (minimum 200ms) {
            <div class="loading-overlay loading-overlay--float" data-tab-defer="files"><span class="spinner"></span></div>
          }
        }

        <!-- Memories -->
        @if (activeTab() === 'memories') { <app-memories-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" /> }

        <!-- Entities -->
        @if (activeTab() === 'entities') { <app-entities-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" (viewInGraph)="viewInGraph($event)" /> }

        <!-- Edges -->
        @if (activeTab() === 'edges') { <app-edges-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" (viewInGraph)="viewInGraph($event)" /> }

        <!-- Chrono -->
        @if (activeTab() === 'chrono') { <app-chrono-tab [spaceId]="activeSpaceId()" /> }

        <!-- Query -->
        @if (activeTab() === 'overview') {
          @if (activeSpace(); as sp) {
            <app-overview-tab [space]="sp" [stats]="activeStats()" [needsReindex]="needsReindex()"
              [reindexing]="reindexing()" [about]="aboutInfo()" [embeddingQueue]="ov.embeddingQueue()"
              [openVotes]="ov.overviewVotes()" [tokenAccess]="ov.tokenAccess()" [completeness]="ov.completeness()" [activity]="ov.spaceActivity()"
              [pending]="ov.overviewPending()"
              (reindex)="runReindex()" (retryFailed)="runRetryFailedEmbeddings()"
              (openTab)="setTab($event)"
              [resettingUsage]="resettingUsage()" [usageResetResult]="usageResetResult()"
              (resetUsage)="resetSpaceUsage()" />
          }
        }
        @if (activeTab() === 'query') { <app-query-tab [spaceId]="activeSpaceId()" (viewInGraph)="viewInGraph($event)" /> }

        <!-- Review (F-REVIEW): duplicate pairs for THIS space. Was a global Settings page; a duplicate
             pair only ever means something inside one space, so it belongs beside the space's data. -->
        @if (activeTab() === 'review') { <app-review-tab [spaceId]="activeSpaceId()" (openTab)="setTab($event)" /> }
      </div>

      <!-- Detail Drawer -->
      <app-record-drawer />
    }
  `, styles: ["\n    .space-tabs {\n      display: flex;\n      gap: 8px;\n      margin-bottom: 24px;\n      overflow-x: auto;\n      padding-bottom: 4px;\n    }\n\n    .space-chip {\n      padding: 6px 14px;\n      border-radius: 4px;\n      font-size: 12px;\n      font-weight: 500;\n      border: 1px solid var(--border);\n      background: var(--bg-surface);\n      color: var(--text-secondary);\n      cursor: pointer;\n      transition: all var(--transition);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 2px;\n      min-width: 110px;\n      /* A long space name used to render at its full intrinsic width and paint straight over the\n         neighbouring chip \u2014 measured at 284px of label inside a 144px chip. The strip is a horizontal\n         scroller, so the chip must not be allowed to grow without bound, and the label must be told what\n         to do when it does not fit. Truncation is the right answer here: the id line underneath and the\n         title tooltip both carry the full name. */\n      max-width: 200px;\n      flex: 0 0 auto;\n    }\n\n    /* min-width:0 is load-bearing. A flex item defaults to min-width:auto and refuses to shrink below\n       its content, so text-overflow would never engage and the label would overflow exactly as before. */\n    .space-chip > * { max-width: 100%; min-width: 0; }\n\n    .space-chip:hover { border-color: var(--accent); color: var(--text-primary); }\n\n    .space-chip.active {\n      background: var(--accent-dim);\n      border-color: var(--accent);\n      color: var(--accent);\n    }\n\n    .space-chip-label { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    .space-chip-id { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    .space-chip-count {\n      font-size: 10px;\n      color: var(--text-muted);\n      font-variant-numeric: tabular-nums;\n    }\n    .space-chip.active .space-chip-count { color: var(--accent); opacity: 0.8; }\n\n    /* Network-membership indicator (F8): the Networks-menu icon, colour-coded by\n       aggregate sync/governance status. No icon at all when the space is in no\n       network. */\n    .space-chip-net { display: inline-flex; align-items: center; }\n    .space-chip-net.net-idle { color: var(--text-muted); }\n    .space-chip-net.net-syncing { color: var(--warning); }\n    .space-chip-net.net-degraded { color: var(--error); }\n    .space-chip-net.net-vote { color: var(--info); }\n    @keyframes chip-net-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }\n    .space-chip-net.net-syncing, .space-chip-net.net-vote { animation: chip-net-pulse 1.4s ease-in-out infinite; }\n    @media (prefers-reduced-motion: reduce) { .space-chip-net { animation: none !important; } }\n\n    .tab-count {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      background: var(--bg-elevated);\n      border-radius: 10px;\n      padding: 1px 6px;\n      font-size: 11px;\n      font-weight: 600;\n      color: var(--text-muted);\n      margin-left: 5px;\n      min-width: 20px;\n      font-variant-numeric: tabular-nums;\n    }\n\n    .tab.active .tab-count {\n      background: var(--accent-dim);\n      color: var(--accent);\n    }\n\n    .reindex-banner {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      padding: 8px 14px;\n      margin-bottom: 12px;\n      border: 1px solid var(--warning);\n      border-radius: var(--radius-md);\n      background: color-mix(in srgb, var(--warning) 6%, transparent);\n      font-size: 13px;\n      color: var(--text-secondary);\n    }\n\n    .tab-spacer { flex: 1; }\n    /* The cog. Square rather than label-width, and it never takes the active treatment: it opens a modal,\n       so there is no state for \"selected\" to describe. Without this it inherited .tab's text padding and\n       sat as a wide empty button beside Files. */\n    .tab-cog {\n      padding: 6px 9px;\n      flex: 0 0 auto;\n      color: var(--text-muted);\n    }\n    .tab-cog:hover:not(:disabled) { color: var(--text); }\n    /* Disabled while no space is selected \u2014 the dialog has nothing to edit, and a cog that opens an empty\n       modal is worse than one that is visibly unavailable. */\n    .tab-cog:disabled { opacity: .4; cursor: not-allowed; }\n\n    /* The active tab's content region. position:relative anchors the floating load spinner so it\n       overlays the tab WITHOUT unmounting it (see the storm note in the template). */\n    .tab-body { position: relative; min-height: 80px; }\n    .loading-overlay--float {\n      position: absolute;\n      top: 0; left: 0; right: 0;\n      z-index: 5;\n      background: color-mix(in srgb, var(--bg) 72%, transparent);\n      border-radius: 8px;\n    }\n\n  "] }]
    }], null, null); }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(BrainComponent, { className: "BrainComponent", filePath: "app/pages/brain/brain.component.ts", lineNumber: 375 }); })();
