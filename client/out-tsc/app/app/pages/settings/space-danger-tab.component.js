/**
 * Danger zone — rename, wipe, delete the space, and leave its networks.
 *
 * Extracted from SpacesComponent (A17.8b). Needs no inputs and no data outputs: SpacesStore owns
 * the server data and SpaceSettingsState owns the dialog form state, and both are services the
 * page provides — so this component just renders them and calls them.
 */
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { TTL_BUCKETS, recordTtlWindows } from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ enqueued: a0 });
const _c1 = a0 => ({ remaining: a0 });
const _c2 = a0 => ({ skipped: a0 });
const _forTrack0 = ($index, $item) => $item.key;
const _forTrack1 = ($index, $item) => $item.label;
const _forTrack2 = ($index, $item) => $item.id;
function SpaceDangerTabComponent_For_9_Template(rf, ctx) { if (rf & 1) {
    const _r2 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 4)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 27);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SpaceDangerTabComponent_For_9_Template_input_ngModelChange_4_listener($event) { const b_r3 = i0.ɵɵrestoreView(_r2).$implicit; const ctx_r3 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r3.ttl[b_r3], $event) || (ctx_r3.ttl[b_r3] = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const b_r3 = ctx.$implicit;
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.dangerZone.retentionBucket." + b_r3));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r3.ttl[b_r3]);
    i0.ɵɵproperty("name", "ttl-" + b_r3)("placeholder", i0.ɵɵpipeBind1(5, 6, "spaces.dangerZone.retentionNever"));
} }
function SpaceDangerTabComponent_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_18_For_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r5 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r5.label);
} }
function SpaceDangerTabComponent_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "ul", 28);
    i0.ɵɵrepeaterCreate(5, SpaceDangerTabComponent_Conditional_18_For_6_Template, 2, 1, "li", null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate2("", i0.ɵɵpipeBind1(2, 2, "spaces.dangerZone.retentionPerType"), " \u2014 ", i0.ɵɵpipeBind1(3, 4, "spaces.dangerZone.retentionPerTypeHint"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r3.declaredRetention());
} }
function SpaceDangerTabComponent_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.dangerZone.retentionPerTypeNone"));
} }
function SpaceDangerTabComponent_Conditional_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 14);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.dangerZone.embeddingsNoBackfill"));
} }
function SpaceDangerTabComponent_Conditional_33_For_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "li");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r6 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(r_r6.label);
} }
function SpaceDangerTabComponent_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 9);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "ul", 29);
    i0.ɵɵrepeaterCreate(4, SpaceDangerTabComponent_Conditional_33_For_5_Template, 2, 1, "li", null, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.dangerZone.embeddingsPerType"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(ctx_r3.declaredSuppression());
} }
function SpaceDangerTabComponent_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_40_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_43_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.dangerZone.embeddingsBackfillBlocked"));
} }
function SpaceDangerTabComponent_Conditional_44_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "br");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    const r_r7 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind2(2, 1, "spaces.dangerZone.embeddingsBackfillMore", i0.ɵɵpureFunction1(4, _c1, r_r7.remaining)), " ");
} }
function SpaceDangerTabComponent_Conditional_44_Conditional_4_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "br");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
} if (rf & 2) {
    const r_r7 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind2(2, 1, "spaces.dangerZone.embeddingsBackfillSkipped", i0.ɵɵpureFunction1(4, _c2, r_r7.skippedSuppressed)), " ");
} }
function SpaceDangerTabComponent_Conditional_44_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 17);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵconditionalCreate(3, SpaceDangerTabComponent_Conditional_44_Conditional_3_Template, 3, 6);
    i0.ɵɵconditionalCreate(4, SpaceDangerTabComponent_Conditional_44_Conditional_4_Template, 3, 6);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const r_r7 = ctx;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(2, 3, "spaces.dangerZone.embeddingsBackfillDone", i0.ɵɵpureFunction1(6, _c0, r_r7.enqueued)), " ");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(r_r7.truncated ? 3 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(r_r7.skippedSuppressed > 0 ? 4 : -1);
} }
function SpaceDangerTabComponent_Conditional_59_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_62_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 22);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r3.state.dangerRenameError());
} }
function SpaceDangerTabComponent_Conditional_71_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_81_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23);
    i0.ɵɵelement(1, "span", 30);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 1, "spaces.dangerZone.loadingCounts"), " ");
} }
function SpaceDangerTabComponent_Conditional_82_For_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 31)(1, "div", 32);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 33);
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const col_r8 = ctx.$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(col_r8.value);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(col_r8.label);
} }
function SpaceDangerTabComponent_Conditional_82_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 24);
    i0.ɵɵrepeaterCreate(1, SpaceDangerTabComponent_Conditional_82_For_2_Template, 5, 2, "div", 31, _forTrack1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r3.state.wipeStatCols());
} }
function SpaceDangerTabComponent_Conditional_83_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 25);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r3.state.dangerWipeError());
} }
function SpaceDangerTabComponent_Conditional_85_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_89_For_8_Template(rf, ctx) { if (rf & 1) {
    const _r9 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 34)(1, "div")(2, "span", 35);
    i0.ɵɵtext(3);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "span", 36);
    i0.ɵɵtext(5);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(6, "button", 37);
    i0.ɵɵlistener("click", function SpaceDangerTabComponent_Conditional_89_For_8_Template_button_click_6_listener() { const n_r10 = i0.ɵɵrestoreView(_r9).$implicit; const ctx_r3 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r3.leaveNetworkDanger(n_r10.id)); });
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const n_r10 = ctx.$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(n_r10.label);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(n_r10.id);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 3, "spaces.dangerZone.leaveButton"));
} }
function SpaceDangerTabComponent_Conditional_89_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 10)(1, "div", 1);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "p", 2);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(7, SpaceDangerTabComponent_Conditional_89_For_8_Template, 9, 5, "div", 34, _forTrack2);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵnextContext();
    const spaceNets_r11 = i0.ɵɵreadContextLet(88);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 2, "spaces.dangerZone.leaveNetworksTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 4, "spaces.dangerZone.leaveNetworksDescription"));
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(spaceNets_r11);
} }
function SpaceDangerTabComponent_Conditional_90_Conditional_7_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 25);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r3.state.dangerDeleteError());
} }
function SpaceDangerTabComponent_Conditional_90_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "span", 8);
} }
function SpaceDangerTabComponent_Conditional_90_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "p", 2);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(7, SpaceDangerTabComponent_Conditional_90_Conditional_7_Template, 2, 1, "div", 25);
    i0.ɵɵelementStart(8, "button", 26);
    i0.ɵɵlistener("click", function SpaceDangerTabComponent_Conditional_90_Template_button_click_8_listener() { i0.ɵɵrestoreView(_r12); const ctx_r3 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r3.confirmDangerDelete()); });
    i0.ɵɵconditionalCreate(9, SpaceDangerTabComponent_Conditional_90_Conditional_9_Template, 1, 0, "span", 8);
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r3 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 6, "spaces.dangerZone.deleteTitle"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 8, "spaces.dangerZone.deleteDescription"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r3.state.dangerDeleteError() ? 7 : -1);
    i0.ɵɵadvance();
    i0.ɵɵproperty("disabled", ctx_r3.state.dangerDeleting());
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r3.state.dangerDeleting() ? 9 : -1);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(11, 10, "spaces.dangerZone.deleteButton"), " ");
} }
export class SpaceDangerTabComponent {
    constructor() {
        this.state = inject(SpaceSettingsState);
        this.store = inject(SpacesStore);
        this.spacesApi = inject(SpacesApi);
        this.networksApi = inject(NetworksApi);
        this.toast = inject(ToastService);
        this.confirmDialog = inject(ConfirmDialogService);
        this.transloco = inject(TranslocoService);
        this.rebuildingIndexes = signal(false, ...(ngDevMode ? [{ debugName: "rebuildingIndexes" }] : /* istanbul ignore next */ []));
        // ── Retention ──────────────────────────────────────────────────────────────────────────────────────
        //
        // Local form state rather than SpaceSettingsState: this section saves itself. Retention deletes records,
        // so it should not ride along in a footer save with a label edit — an operator must press a button that
        // says what it does.
        /**
         * One window per bucket, in days. 0 / empty = never expire.
         *
         * FIVE fields, not one, because a space does not hold one kind of thing: a `tickets` space holds ticket
         * entities that must outlive their status-change chronos, and a single number cannot express that. The schema
         * tier does not help — it keys on a type NAME, while this is about a whole collection.
         *
         * `file` is the fifth and it earns its own: uploads share this tier (they have no type, so the schema tier
         * cannot reach them), so folding them into one of the other four would have attached every file to whichever
         * bucket was picked.
         */
        this.ttl = { entity: null, memory: null, edge: null, chrono: null, file: null };
        this.buckets = TTL_BUCKETS;
        this.savingRetention = signal(false, ...(ngDevMode ? [{ debugName: "savingRetention" }] : /* istanbul ignore next */ []));
        /** Seeded from the space the dialog opened on; re-seeds when that changes. */
        this.seeded = '';
        // ── Embeddings ─────────────────────────────────────────────────────────────────────────────────────
        //
        // Its own save, like retention and for the same reason: this changes what the space is findable BY, so it
        // must not ride along in a footer save with a label edit.
        /** The space-wide tier of record > schema > space. The LOWEST tier — any type schema that states a value wins. */
        this.suppress = signal(false, ...(ngDevMode ? [{ debugName: "suppress" }] : /* istanbul ignore next */ []));
        this.savingSuppress = signal(false, ...(ngDevMode ? [{ debugName: "savingSuppress" }] : /* istanbul ignore next */ []));
        this.backfilling = signal(false, ...(ngDevMode ? [{ debugName: "backfilling" }] : /* istanbul ignore next */ []));
        this.backfillResult = signal(null, ...(ngDevMode ? [{ debugName: "backfillResult" }] : /* istanbul ignore next */ []));
        /**
         * The per-TYPE overrides already declared in the schema, read-only.
         *
         * Same reasoning as `declaredRetention`: an operator setting a space-wide switch needs to know which types
         * ignore it, or they tick the box and wonder why one type is still being embedded. Only types that STATE a
         * value are listed — a type that says nothing inherits, and listing it would suggest an override that is not
         * there.
         */
        this.declaredSuppression = computed(() => {
            const schemas = this.state.settingsSpace()?.meta?.typeSchemas ?? {};
            const t = (k, p) => this.transloco.translate(k, p);
            const out = [];
            for (const [kt, map] of Object.entries(schemas)) {
                for (const [name, schema] of Object.entries(map ?? {})) {
                    const v = schema.suppressEmbeddings;
                    if (v === undefined)
                        continue;
                    out.push({
                        key: `${kt}.${name}`,
                        label: t(v ? 'spaces.dangerZone.embeddingsTypeSuppressed' : 'spaces.dangerZone.embeddingsTypeEmbedded', { type: name }),
                    });
                }
            }
            return out;
        }, ...(ngDevMode ? [{ debugName: "declaredSuppression" }] : /* istanbul ignore next */ []));
        /**
         * The per-TYPE windows already declared in the schema, read-only.
         *
         * Shown rather than edited here on purpose: a window set in two places drifts, and the type is where an
         * operator already went to define it. But an operator standing in the Danger Zone about to set a space-wide
         * number needs to know which types override it — otherwise they set 30 days and wonder why one type keeps
         * everything for ten years.
         */
        this.declaredRetention = computed(() => {
            const schemas = this.state.settingsSpace()?.meta?.typeSchemas ?? {};
            const t = (k, p) => this.transloco.translate(k, p);
            const out = [];
            for (const [collection, types] of Object.entries(schemas)) {
                for (const [type, schema] of Object.entries(types ?? {})) {
                    const r = schema?.retention;
                    if (!r || (!r.days && !r.contentDays))
                        continue;
                    const name = `${collection}.${type}`;
                    const label = r.days && r.contentDays
                        ? t('brain.overview.retentionTypeContent', { type: name, days: r.days, contentDays: r.contentDays })
                        : r.days
                            ? t('brain.overview.retentionType', { type: name, days: r.days })
                            : t('brain.overview.retentionTypeContentOnly', { type: name, contentDays: r.contentDays });
                    out.push({ key: name, label });
                }
            }
            return out.sort((a, b) => a.key.localeCompare(b.key));
        }, ...(ngDevMode ? [{ debugName: "declaredRetention" }] : /* istanbul ignore next */ []));
        effect(() => {
            const s = this.state.settingsSpace();
            if (!s || this.seeded === s.id)
                return;
            this.seeded = s.id;
            // `recordTtlWindows` widens a legacy scalar, so a space that set one number before the split shows it on
            // all five fields — which is what it has always meant — rather than appearing to have no policy.
            this.ttl = recordTtlWindows(s.recordTtlDays);
            // Absent reads as false, matching the server: suppression is opt-in, and the failure direction of getting
            // that backwards is records silently missing from recall, which nobody reports because there is nothing to
            // see. Re-seeded per space, and the previous space's backfill result is cleared with it.
            this.suppress.set(s.meta?.suppressEmbeddings === true);
            this.backfillResult.set(null);
        });
    }
    async saveSuppress() {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        this.savingSuppress.set(true);
        try {
            // `firstValueFrom`, not `await` on the Observable — `updateSpace` is cold, and awaiting one resolves with
            // the Observable itself without subscribing, so no request is sent and the success toast fires anyway.
            // That exact bug shipped on the retention button in this same file.
            //
            // Sent inside `meta`, because the server MERGES a partial meta over what is stored: sending the whole meta
            // back would race any other edit made since this dialog opened.
            await firstValueFrom(this.spacesApi.updateSpace(space.id, { meta: { suppressEmbeddings: this.suppress() } }));
            this.store.load();
            this.toast.success(this.transloco.translate('spaces.dangerZone.embeddingsSaved'));
        }
        catch (err) {
            this.toast.error(err instanceof Error ? err.message : String(err));
        }
        finally {
            this.savingSuppress.set(false);
        }
    }
    async backfill() {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        this.backfilling.set(true);
        this.backfillResult.set(null);
        try {
            // The counts ARE the result — `enqueued`, and `remaining` when the call was capped. Reporting only
            // "started" would leave an operator unable to tell a fully-swept space from one that needs three more
            // calls, which is the whole reason the endpoint returns numbers instead of `202`.
            this.backfillResult.set(await firstValueFrom(this.spacesApi.reembedSpace(space.id)));
        }
        catch (err) {
            this.toast.error(err instanceof Error ? err.message : String(err));
        }
        finally {
            this.backfilling.set(false);
        }
    }
    async saveRetention() {
        const space = this.state.settingsSpace();
        if (!space)
            return;
        this.savingRetention.set(true);
        try {
            // Every bucket is sent explicitly, including the empty ones as `null`. The server MERGES a partial object
            // over what is stored, so omitting a cleared field would leave its old window in place — the operator
            // emptied it and the save would look like it worked.
            const windows = {};
            for (const b of TTL_BUCKETS) {
                const v = Number(this.ttl[b]);
                windows[b] = Number.isInteger(v) && v > 0 ? v : null;
            }
            // Five nulls is a valid write and clears everything: the route only refuses an object that mentions no
            // bucket at all, because THAT would make "clear everything" and "change nothing" the same request.
            //
            // `firstValueFrom`, NOT `await` on the Observable. `updateSpace` returns a cold Observable, and awaiting
            // one resolves immediately with the Observable itself without ever subscribing — so no request is sent and
            // the success toast fires anyway. That is what this button did: it reported "Retention saved." and saved
            // nothing, from the moment retention moved to this tab. Every other call in this file uses `.subscribe`;
            // this was the one that did not, and the one nobody could see failing.
            await firstValueFrom(this.spacesApi.updateSpace(space.id, { recordTtlDays: windows }));
            this.store.load();
            this.toast.success(this.transloco.translate('spaces.dangerZone.retentionSaved'));
        }
        catch (err) {
            this.toast.error(err instanceof Error ? err.message : String(err));
        }
        finally {
            this.savingRetention.set(false);
        }
    }
    /**
     * Rebuild this space's vector search indexes — the repair for "search returns nothing".
     *
     * It sits in the danger zone because it has a real cost: recall returns EMPTY until the rebuild
     * finishes, which on a large space is minutes. It is not destructive — no record is touched, only the
     * index is recreated — so the confirmation explains the outage rather than demanding a typed id.
     */
    async rebuildIndexes() {
        const target = this.state.settingsSpace();
        if (!target)
            return;
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.rebuildIndexesTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmRebuildIndexes', { label: target.label }),
            confirmLabel: this.transloco.translate('spaces.dangerZone.rebuildIndexesButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.rebuildingIndexes.set(true);
        this.spacesApi.rebuildSpaceIndexes(target.id).subscribe({
            next: () => {
                this.rebuildingIndexes.set(false);
                this.toast.success(this.transloco.translate('spaces.dangerZone.rebuildIndexesStarted'));
            },
            error: (err) => {
                this.rebuildingIndexes.set(false);
                this.toast.error(err?.error?.error ?? err?.message ?? this.transloco.translate('spaces.dangerZone.rebuildIndexesFailed'));
            },
        });
    }
    async submitDangerRename() {
        const target = this.state.settingsSpace();
        const newId = this.state.dangerRenameId.trim();
        if (!target || !newId || newId === target.id)
            return;
        // Renaming changes the space id, which breaks existing MCP/token references to it — so require the
        // operator to type the CURRENT id to confirm (same type-to-confirm ritual as wipe/delete).
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.confirmRenameTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmRename', { label: target.label, id: target.id, newId }),
            confirmLabel: this.transloco.translate('spaces.dangerZone.renameButton'),
            danger: true,
            requireText: target.id,
            requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
        });
        if (!ok)
            return;
        this.state.dangerRenaming.set(true);
        this.state.dangerRenameError.set('');
        this.spacesApi.renameSpace(target.id, newId).subscribe({
            next: ({ space }) => {
                this.state.dangerRenaming.set(false);
                this.store.spaces.update(list => list.map(s => s.id === target.id ? space : s));
                this.state.settingsSpace.set(space);
                this.state.dangerRenameId = space.id;
                this.networksApi.listNetworks().subscribe({ next: ({ networks }) => this.store.networks.set(networks), error: () => { } });
            },
            error: (err) => { this.state.dangerRenaming.set(false); this.state.dangerRenameError.set(err.error?.error ?? this.transloco.translate('spaces.error.renameFailed')); },
        });
    }
    async confirmDangerWipe() {
        const target = this.state.settingsSpace();
        if (!target)
            return;
        // Irreversible: require the operator to type the space id (GitHub-style, C3).
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.confirmWipeTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmWipe', { label: target.label }),
            confirmLabel: this.transloco.translate('spaces.dangerZone.wipeButton'),
            danger: true,
            requireText: target.id,
            requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
        });
        if (!ok)
            return;
        this.state.dangerWiping.set(true);
        this.state.dangerWipeError.set('');
        this.spacesApi.wipeSpace(target.id).subscribe({
            next: () => {
                this.state.dangerWiping.set(false);
                this.state.dangerWipeStats.set(null);
                this.state.dangerWipeLoading.set(true);
                this.spacesApi.getSpaceStats(target.id).subscribe({
                    next: (stats) => { this.state.dangerWipeStats.set(stats); this.state.dangerWipeLoading.set(false); },
                    error: () => this.state.dangerWipeLoading.set(false),
                });
            },
            error: (err) => { this.state.dangerWiping.set(false); this.state.dangerWipeError.set(err.error?.error ?? this.transloco.translate('spaces.error.wipeFailed')); },
        });
    }
    async confirmDangerDelete() {
        const target = this.state.settingsSpace();
        if (!target)
            return;
        // Irreversible: require the operator to type the space id (GitHub-style, C3).
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.confirmDeleteTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmDelete', { label: target.label, id: target.id }),
            confirmLabel: this.transloco.translate('spaces.dangerZone.deleteButton'),
            danger: true,
            requireText: target.id,
            requireTextLabel: this.transloco.translate('spaces.dangerZone.typeIdToConfirm', { id: target.id }),
        });
        if (!ok)
            return;
        this.state.dangerDeleting.set(true);
        this.state.dangerDeleteError.set('');
        this.spacesApi.deleteSpace(target.id).subscribe({
            next: () => {
                this.state.dangerDeleting.set(false);
                this.store.spaces.update(list => list.filter(s => s.id !== target.id));
                this.state.closeSettings();
            },
            error: (err) => { this.state.dangerDeleting.set(false); this.state.dangerDeleteError.set(err.error?.error ?? this.transloco.translate('spaces.error.deleteFailed')); },
        });
    }
    async leaveNetworkDanger(networkId) {
        const ok = await this.confirmDialog.confirm({
            title: this.transloco.translate('spaces.dangerZone.confirmLeaveNetworkTitle'),
            message: this.transloco.translate('spaces.dangerZone.confirmLeaveNetwork'),
            confirmLabel: this.transloco.translate('networks.leaveButton'),
            danger: true,
        });
        if (!ok)
            return;
        this.networksApi.leaveNetwork(networkId).subscribe({
            next: () => this.store.refreshNetworks(),
            error: () => this.toast.error(this.transloco.translate('spaces.error.leaveNetworkFailed')),
        });
    }
    static { this.ɵfac = function SpaceDangerTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceDangerTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceDangerTabComponent, selectors: [["app-space-danger-tab"]], decls: 91, vars: 83, consts: [[1, "dz-section", "dz-red"], [1, "dz-section-title"], [2, "font-size", "13px", "color", "var(--text-muted)", "margin-bottom", "12px"], [1, "ttl-grid"], [1, "field", 2, "margin", "0"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin", "6px 0 14px"], [2, "margin-bottom", "12px"], ["type", "button", 1, "btn", "btn-secondary", 3, "click", "disabled"], [1, "spinner", 2, "width", "12px", "height", "12px", "border-width", "2px"], [1, "dz-hint"], [1, "dz-section"], [2, "display", "flex", "align-items", "flex-start", "gap", "8px", "cursor", "pointer", "margin-bottom", "10px"], ["type", "checkbox", "name", "suppressEmbeddings", 2, "margin-top", "2px", 3, "ngModelChange", "ngModel"], [2, "font-size", "13px"], [1, "alert", "alert-warning", 2, "margin-bottom", "12px", "font-size", "12px"], [2, "display", "flex", "gap", "8px", "flex-wrap", "wrap", "align-items", "center"], [1, "dz-hint", 2, "margin-top", "6px"], [1, "alert", "alert-success", 2, "margin-top", "10px", "font-size", "12px"], [2, "display", "flex", "gap", "8px", "align-items", "flex-end", "flex-wrap", "wrap", 3, "ngSubmit"], [1, "field", 2, "margin", "0", "flex", "1", "max-width", "280px"], ["type", "text", "name", "state.dangerRenameId", "pattern", "[a-z0-9-]+", "maxlength", "40", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "submit", 1, "btn", "btn-secondary", 3, "disabled"], [1, "alert", "alert-error", 2, "margin-top", "8px"], [2, "display", "flex", "gap", "8px", "align-items", "center", "color", "var(--text-muted)", "font-size", "13px", "margin-bottom", "12px"], [2, "display", "grid", "grid-template-columns", "repeat(auto-fit,minmax(88px,1fr))", "gap", "8px", "margin-bottom", "16px"], [1, "alert", "alert-error", 2, "margin-bottom", "8px"], ["type", "button", 1, "btn", "btn-danger", 3, "click", "disabled"], ["type", "number", "min", "0", "step", "1", 3, "ngModelChange", "ngModel", "name", "placeholder"], [2, "margin", "6px 0 0", "padding-left", "18px", "font-size", "12px", "color", "var(--text-secondary)"], [2, "margin", "6px 0 12px", "padding-left", "18px", "font-size", "12px", "color", "var(--text-secondary)"], [1, "spinner", 2, "width", "14px", "height", "14px", "border-width", "2px"], [2, "text-align", "center", "padding", "10px 6px", "background", "var(--bg-elevated)", "border-radius", "var(--radius-sm)"], [2, "font-size", "20px", "font-weight", "700", "font-family", "var(--font-mono)"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-top", "2px"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "padding", "8px 0", "border-bottom", "1px solid var(--border)"], [2, "font-weight", "500"], [1, "badge", "badge-gray", 2, "margin-left", "8px"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 3, "click"]], template: function SpaceDangerTabComponent_Template(rf, ctx) { if (rf & 1) {
            const _r1 = i0.ɵɵgetCurrentView();
            i0.ɵɵelementStart(0, "div", 0)(1, "div", 1);
            i0.ɵɵtext(2);
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(4, "p", 2);
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(7, "div", 3);
            i0.ɵɵrepeaterCreate(8, SpaceDangerTabComponent_For_9_Template, 6, 8, "div", 4, i0.ɵɵrepeaterTrackByIdentity);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(10, "div", 5);
            i0.ɵɵtext(11);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(13, "div", 6)(14, "button", 7);
            i0.ɵɵlistener("click", function SpaceDangerTabComponent_Template_button_click_14_listener() { return ctx.saveRetention(); });
            i0.ɵɵconditionalCreate(15, SpaceDangerTabComponent_Conditional_15_Template, 1, 0, "span", 8);
            i0.ɵɵtext(16);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(18, SpaceDangerTabComponent_Conditional_18_Template, 7, 6)(19, SpaceDangerTabComponent_Conditional_19_Template, 3, 3, "p", 9);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(20, "div", 10)(21, "div", 1);
            i0.ɵɵtext(22);
            i0.ɵɵpipe(23, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(24, "p", 2);
            i0.ɵɵtext(25);
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(27, "label", 11)(28, "input", 12);
            i0.ɵɵlistener("ngModelChange", function SpaceDangerTabComponent_Template_input_ngModelChange_28_listener($event) { return ctx.suppress.set($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(29, "span", 13);
            i0.ɵɵtext(30);
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(32, SpaceDangerTabComponent_Conditional_32_Template, 3, 3, "div", 14);
            i0.ɵɵconditionalCreate(33, SpaceDangerTabComponent_Conditional_33_Template, 6, 3);
            i0.ɵɵelementStart(34, "div", 15)(35, "button", 7);
            i0.ɵɵlistener("click", function SpaceDangerTabComponent_Template_button_click_35_listener() { return ctx.saveSuppress(); });
            i0.ɵɵconditionalCreate(36, SpaceDangerTabComponent_Conditional_36_Template, 1, 0, "span", 8);
            i0.ɵɵtext(37);
            i0.ɵɵpipe(38, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(39, "button", 7);
            i0.ɵɵlistener("click", function SpaceDangerTabComponent_Template_button_click_39_listener() { return ctx.backfill(); });
            i0.ɵɵconditionalCreate(40, SpaceDangerTabComponent_Conditional_40_Template, 1, 0, "span", 8);
            i0.ɵɵtext(41);
            i0.ɵɵpipe(42, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(43, SpaceDangerTabComponent_Conditional_43_Template, 3, 3, "div", 16);
            i0.ɵɵconditionalCreate(44, SpaceDangerTabComponent_Conditional_44_Template, 5, 8, "div", 17);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(45, "div", 10)(46, "div", 1);
            i0.ɵɵtext(47);
            i0.ɵɵpipe(48, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(49, "p", 2);
            i0.ɵɵtext(50);
            i0.ɵɵpipe(51, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(52, "form", 18);
            i0.ɵɵlistener("ngSubmit", function SpaceDangerTabComponent_Template_form_ngSubmit_52_listener() { return ctx.submitDangerRename(); });
            i0.ɵɵelementStart(53, "div", 19)(54, "label");
            i0.ɵɵtext(55);
            i0.ɵɵpipe(56, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(57, "input", 20);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceDangerTabComponent_Template_input_ngModelChange_57_listener($event) { i0.ɵɵrestoreView(_r1); i0.ɵɵtwoWayBindingSet(ctx.state.dangerRenameId, $event) || (ctx.state.dangerRenameId = $event); return i0.ɵɵresetView($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(58, "button", 21);
            i0.ɵɵconditionalCreate(59, SpaceDangerTabComponent_Conditional_59_Template, 1, 0, "span", 8);
            i0.ɵɵtext(60);
            i0.ɵɵpipe(61, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(62, SpaceDangerTabComponent_Conditional_62_Template, 2, 1, "div", 22);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(63, "div", 10)(64, "div", 1);
            i0.ɵɵtext(65);
            i0.ɵɵpipe(66, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(67, "p", 2);
            i0.ɵɵtext(68);
            i0.ɵɵpipe(69, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(70, "button", 7);
            i0.ɵɵlistener("click", function SpaceDangerTabComponent_Template_button_click_70_listener() { return ctx.rebuildIndexes(); });
            i0.ɵɵconditionalCreate(71, SpaceDangerTabComponent_Conditional_71_Template, 1, 0, "span", 8);
            i0.ɵɵtext(72);
            i0.ɵɵpipe(73, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(74, "div", 0)(75, "div", 1);
            i0.ɵɵtext(76);
            i0.ɵɵpipe(77, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(78, "p", 2);
            i0.ɵɵtext(79);
            i0.ɵɵpipe(80, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(81, SpaceDangerTabComponent_Conditional_81_Template, 4, 3, "div", 23)(82, SpaceDangerTabComponent_Conditional_82_Template, 3, 0, "div", 24);
            i0.ɵɵconditionalCreate(83, SpaceDangerTabComponent_Conditional_83_Template, 2, 1, "div", 25);
            i0.ɵɵelementStart(84, "button", 26);
            i0.ɵɵlistener("click", function SpaceDangerTabComponent_Template_button_click_84_listener() { return ctx.confirmDangerWipe(); });
            i0.ɵɵconditionalCreate(85, SpaceDangerTabComponent_Conditional_85_Template, 1, 0, "span", 8);
            i0.ɵɵtext(86);
            i0.ɵɵpipe(87, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵdeclareLet(88);
            i0.ɵɵconditionalCreate(89, SpaceDangerTabComponent_Conditional_89_Template, 9, 6, "div", 10);
            i0.ɵɵconditionalCreate(90, SpaceDangerTabComponent_Conditional_90_Template, 12, 12, "div", 0);
        } if (rf & 2) {
            let tmp_21_0;
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 44, "spaces.dangerZone.retentionTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 46, "spaces.dangerZone.retentionDescription"));
            i0.ɵɵadvance(3);
            i0.ɵɵrepeater(ctx.buckets);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 48, "spaces.dangerZone.retentionSpaceWideHint"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("disabled", ctx.savingRetention());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.savingRetention() ? 15 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(17, 50, "spaces.dangerZone.retentionSave"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.declaredRetention().length ? 18 : 19);
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 52, "spaces.dangerZone.embeddingsTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 54, "spaces.dangerZone.embeddingsDescription"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("ngModel", ctx.suppress());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(31, 56, "spaces.dangerZone.embeddingsSuppress"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.suppress() ? 32 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.declaredSuppression().length ? 33 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.savingSuppress());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.savingSuppress() ? 36 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(38, 58, "spaces.dangerZone.embeddingsSave"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.backfilling() || ctx.suppress());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.backfilling() ? 40 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(42, 60, "spaces.dangerZone.embeddingsBackfill"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.suppress() ? 43 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional((tmp_21_0 = ctx.backfillResult()) ? 44 : -1, tmp_21_0);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 62, "spaces.dangerZone.renameTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(51, 64, "spaces.dangerZone.renameDescription"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(56, 66, "spaces.dangerZone.newId"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.dangerRenameId);
            i0.ɵɵproperty("placeholder", ctx.state.settingsSpace().id);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.state.dangerRenaming() || !ctx.state.dangerRenameId.trim() || ctx.state.dangerRenameId.trim() === ctx.state.settingsSpace().id);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.state.dangerRenaming() ? 59 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(61, 68, "spaces.dangerZone.renameButton"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.dangerRenameError() ? 62 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(66, 70, "spaces.dangerZone.rebuildIndexesTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(69, 72, "spaces.dangerZone.rebuildIndexesDescription"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.rebuildingIndexes());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.rebuildingIndexes() ? 71 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(73, 74, "spaces.dangerZone.rebuildIndexesButton"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(77, 76, "spaces.dangerZone.wipeTitle"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(80, 78, "spaces.dangerZone.wipeDescription"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.dangerWipeLoading() ? 81 : ctx.state.dangerWipeStats() ? 82 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.state.dangerWipeError() ? 83 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("disabled", ctx.state.dangerWiping());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.state.dangerWiping() ? 85 : -1);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(87, 80, "spaces.dangerZone.wipeButton"), " ");
            i0.ɵɵadvance(2);
            const spaceNets_r13 = i0.ɵɵstoreLet(ctx.store.networksForSpace(ctx.state.settingsSpace().id));
            i0.ɵɵadvance();
            i0.ɵɵconditional(spaceNets_r13.length > 0 ? 89 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(!ctx.state.settingsSpace().builtIn ? 90 : -1);
        } }, dependencies: [CommonModule, FormsModule, i1.ɵNgNoValidate, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.CheckboxControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.MaxLengthValidator, i1.PatternValidator, i1.MinValidator, i1.NgModel, i1.NgForm, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceDangerTabComponent, [{
        type: Component,
        args: [{ selector: 'app-space-danger-tab', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<!-- ── Retention ────────────────────────────────────────────────────────────────────────────────────────
     Here rather than in Settings (owner call, 2026-08-02) because this DELETES records on a timer. It used
     to sit next to the storage cap, which only refuses new writes — the same card for "you cannot add more"
     and "what you have will be removed".

     Two levels, and the copy is explicit that a per-record ttlDays overrides both, because that is the part
     an operator cannot discover from a form. NOTE: no backticks anywhere in this template — one kills the
     whole string and the error points at @Component, never at the comment. -->
<div class="dz-section dz-red">
  <div class="dz-section-title">{{ 'spaces.dangerZone.retentionTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.retentionDescription' | transloco }}</p>

  <!-- One field per bucket. It was ONE number for all five, which a space holding two kinds of thing cannot
       use: a tickets space keeps ticket entities for a year and their status-change chronos for a month.
       Files get their own because they share this tier and have no type for the Schema tab to reach. -->
  <div class="ttl-grid">
    @for (b of buckets; track b) {
      <div class="field" style="margin:0;">
        <label>{{ 'spaces.dangerZone.retentionBucket.' + b | transloco }}</label>
        <input type="number" [(ngModel)]="ttl[b]" [name]="'ttl-' + b" min="0" step="1"
          [placeholder]="'spaces.dangerZone.retentionNever' | transloco" />
      </div>
    }
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin:6px 0 14px;">{{ 'spaces.dangerZone.retentionSpaceWideHint' | transloco }}</div>

  <div style="margin-bottom:12px;">
    <button class="btn btn-secondary" type="button" [disabled]="savingRetention()" (click)="saveRetention()">
      @if (savingRetention()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.retentionSave' | transloco }}
    </button>
  </div>

  <!-- A pointer, not a titled block. The reporter's operator "understood every individual word and could not
       tell what the block was for", and they were right about why: a heading promises a control, and this
       section has none — the control is on the Schema tab. So it is one line when there is nothing to list,
       and a labelled list only when there is something that overrides the field above.

       The precedence now lives in the section description at the top, once, instead of arriving here as a
       mid-sentence aside on first mention. And nothing says "the number above" any more: that was a bare
       back-reference the reader had to scroll up and guess at. -->
  @if (declaredRetention().length) {
    <p class="dz-hint">{{ 'spaces.dangerZone.retentionPerType' | transloco }} — {{ 'spaces.dangerZone.retentionPerTypeHint' | transloco }}</p>
    <ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:var(--text-secondary);">
      @for (r of declaredRetention(); track r.key) {
        <li>{{ r.label }}</li>
      }
    </ul>
  } @else {
    <p class="dz-hint">{{ 'spaces.dangerZone.retentionPerTypeNone' | transloco }}</p>
  }
</div>

<div class="dz-section">
  <div class="dz-section-title">{{ 'spaces.dangerZone.embeddingsTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.embeddingsDescription' | transloco }}</p>

  <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-bottom:10px;">
    <input type="checkbox" [ngModel]="suppress()" (ngModelChange)="suppress.set($event)" name="suppressEmbeddings" style="margin-top:2px;" />
    <span style="font-size:13px;">{{ 'spaces.dangerZone.embeddingsSuppress' | transloco }}</span>
  </label>

  <!-- Shown while the box is ticked rather than only after saving: the consequence an operator needs is that
       records written from now on have no vector, and telling them that AFTER they save is telling them too late. -->
  @if (suppress()) {
    <div class="alert alert-warning" style="margin-bottom:12px;font-size:12px;">{{ 'spaces.dangerZone.embeddingsNoBackfill' | transloco }}</div>
  }

  <!-- The per-TYPE overrides, read-only, for the same reason retention lists them: an operator setting a
       space-wide switch needs to know which types ignore it, or they set it and wonder why one type keeps
       being embedded. -->
  @if (declaredSuppression().length) {
    <p class="dz-hint">{{ 'spaces.dangerZone.embeddingsPerType' | transloco }}</p>
    <ul style="margin:6px 0 12px;padding-left:18px;font-size:12px;color:var(--text-secondary);">
      @for (r of declaredSuppression(); track r.key) {
        <li>{{ r.label }}</li>
      }
    </ul>
  }

  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
    <button class="btn btn-secondary" type="button" [disabled]="savingSuppress()" (click)="saveSuppress()">
      @if (savingSuppress()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.embeddingsSave' | transloco }}
    </button>
    <!-- Disabled while suppression is on, because the server would skip every candidate and report zero. A
         button that runs and does nothing is worse than one that says why it cannot. -->
    <button class="btn btn-secondary" type="button" [disabled]="backfilling() || suppress()" (click)="backfill()">
      @if (backfilling()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.embeddingsBackfill' | transloco }}
    </button>
  </div>
  @if (suppress()) {
    <div class="dz-hint" style="margin-top:6px;">{{ 'spaces.dangerZone.embeddingsBackfillBlocked' | transloco }}</div>
  }
  @if (backfillResult(); as r) {
    <div class="alert alert-success" style="margin-top:10px;font-size:12px;">
      {{ 'spaces.dangerZone.embeddingsBackfillDone' | transloco: { enqueued: r.enqueued } }}
      @if (r.truncated) { <br/>{{ 'spaces.dangerZone.embeddingsBackfillMore' | transloco: { remaining: r.remaining } }} }
      @if (r.skippedSuppressed > 0) { <br/>{{ 'spaces.dangerZone.embeddingsBackfillSkipped' | transloco: { skipped: r.skippedSuppressed } }} }
    </div>
  }
</div>

<div class="dz-section">
  <div class="dz-section-title">{{ 'spaces.dangerZone.renameTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.renameDescription' | transloco }}</p>
  <form (ngSubmit)="submitDangerRename()" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
    <div class="field" style="margin:0;flex:1;max-width:280px;">
      <label>{{ 'spaces.dangerZone.newId' | transloco }}</label>
      <input type="text" [(ngModel)]="state.dangerRenameId" name="state.dangerRenameId" pattern="[a-z0-9-]+" maxlength="40" [placeholder]="state.settingsSpace()!.id" />
    </div>
    <button class="btn btn-secondary" type="submit" [disabled]="state.dangerRenaming()||!state.dangerRenameId.trim()||state.dangerRenameId.trim()===state.settingsSpace()!.id">
      @if (state.dangerRenaming()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.renameButton' | transloco }}
    </button>
  </form>
  @if (state.dangerRenameError()) { <div class="alert alert-error" style="margin-top:8px;">{{ state.dangerRenameError() }}</div> }
</div>

<div class="dz-section">
  <div class="dz-section-title">{{ 'spaces.dangerZone.rebuildIndexesTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.rebuildIndexesDescription' | transloco }}</p>
  <button class="btn btn-secondary" type="button" [disabled]="rebuildingIndexes()" (click)="rebuildIndexes()">
    @if (rebuildingIndexes()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.rebuildIndexesButton' | transloco }}
  </button>
</div>

<div class="dz-section dz-red">
  <div class="dz-section-title">{{ 'spaces.dangerZone.wipeTitle' | transloco }}</div>
  <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.wipeDescription' | transloco }}</p>
  @if (state.dangerWipeLoading()) {
    <div style="display:flex;gap:8px;align-items:center;color:var(--text-muted);font-size:13px;margin-bottom:12px;">
      <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> {{ 'spaces.dangerZone.loadingCounts' | transloco }}
    </div>
  } @else if (state.dangerWipeStats()) {
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin-bottom:16px;">
      @for (col of state.wipeStatCols(); track col.label) {
        <div style="text-align:center;padding:10px 6px;background:var(--bg-elevated);border-radius:var(--radius-sm);">
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);">{{ col.value }}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">{{ col.label }}</div>
        </div>
      }
    </div>
  }
  @if (state.dangerWipeError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerWipeError() }}</div> }
  <button class="btn btn-danger" type="button" (click)="confirmDangerWipe()" [disabled]="state.dangerWiping()">
    @if (state.dangerWiping()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.wipeButton' | transloco }}
  </button>
</div>

@let spaceNets = store.networksForSpace(state.settingsSpace()!.id);
@if (spaceNets.length > 0) {
  <div class="dz-section">
    <div class="dz-section-title">{{ 'spaces.dangerZone.leaveNetworksTitle' | transloco }}</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.leaveNetworksDescription' | transloco }}</p>
    @for (n of spaceNets; track n.id) {
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <span style="font-weight:500;">{{ n.label }}</span>
          <span class="badge badge-gray" style="margin-left:8px">{{ n.id }}</span>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="leaveNetworkDanger(n.id)">{{ 'spaces.dangerZone.leaveButton' | transloco }}</button>
      </div>
    }
  </div>
}

@if (!state.settingsSpace()!.builtIn) {
  <div class="dz-section dz-red">
    <div class="dz-section-title">{{ 'spaces.dangerZone.deleteTitle' | transloco }}</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">{{ 'spaces.dangerZone.deleteDescription' | transloco }}</p>
    @if (state.dangerDeleteError()) { <div class="alert alert-error" style="margin-bottom:8px;">{{ state.dangerDeleteError() }}</div> }
    <button class="btn btn-danger" type="button" (click)="confirmDangerDelete()" [disabled]="state.dangerDeleting()">
      @if (state.dangerDeleting()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }{{ 'spaces.dangerZone.deleteButton' | transloco }}
    </button>
  </div>
}
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n"] }]
    }], () => [], null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceDangerTabComponent, { className: "SpaceDangerTabComponent", filePath: "app/pages/settings/space-danger-tab.component.ts", lineNumber: 207 }); })();
