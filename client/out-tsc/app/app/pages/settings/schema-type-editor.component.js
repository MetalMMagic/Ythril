/**
 * The per-type schema editor — one component, two hosts.
 *
 * ## Why it exists
 *
 * This body lived inside `space-schema-tab.component.ts`, bound to `SpaceSettingsState` through
 * `state.typeState(kt, name)` on roughly thirty template expressions. That made it unreachable from
 * anywhere else, and the Brain Overview's data-model panel needs exactly this editor in place — sending an
 * operator to Space Settings to change one field, and then back, is the flow this whole feature exists to
 * remove.
 *
 * `SpaceSettingsState` is `@Injectable()` with no `providedIn`, so it is provided by the settings page and
 * the Brain page cannot inject it. Root-providing it would turn per-space editing state into a cross-page
 * singleton, which is worse than the problem. So this component takes a DRAFT and edits it.
 *
 * ## What it deliberately does NOT do
 *
 * **It does not save.** The two hosts persist differently and must keep doing so: Space Settings is STAGED
 * (edit several types, then Save) while the Overview panel is IMMEDIATE (edit one type, write it now). A
 * save in here would force one host to adopt the other's model. The panel's write must additionally go
 * through `PATCH /api/spaces/:id` rather than `PUT /:id/schema`, which applies directly and would be a
 * silent consensus bypass on a networked space.
 *
 * **It does not own the library actions.** Export, save-to-library, unlink and remove stay with the settings
 * tab's header. Those are about the schema LIBRARY and about deleting a type, not about editing one, and the
 * Overview panel has no business offering them — a dialog that could delete a type would be answerable for
 * something no caller asked it to do. `unlink` is emitted rather than performed, because the read-only
 * notice that offers it lives in this body while the action belongs to the host.
 *
 * **It does not read the space config.** The inherited retention window arrives as an input; the component
 * has no opinion about where a space keeps its defaults.
 *
 * ## What it DOES own
 *
 * Which property rows are expanded. That is view state, not schema — the settings tab kept one set spanning
 * every type it had open, and a dialog editing a single type has no use for that. It is also why
 * `addProp` in `type-schema-edits.ts` returns the key it added rather than a boolean: the caller expands the
 * row it just created.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { addProp, removeProp, addEnumVal, removeEnumVal } from './type-schema-edits';
import { SCHEMA_MD_STYLES } from './schema-styles';
import { CHIP_STYLES } from '../../shared/chip.styles';
import { PROP_TABLE_STYLES } from '../../shared/prop-table.styles';
import { mergeFnsFor, mergeFnAfterTypeChange } from '../../shared/merge-fns';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ name: a0 });
const _c1 = a0 => ({ days: a0 });
const _c2 = a0 => ({ total: a0 });
const _c3 = () => [];
const _forTrack0 = ($index, $item) => $item.key;
function SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_0_For_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 8);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "td");
    i0.ɵɵtext(4);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "td", 9);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r3 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(4);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(p_r3.key);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(p_r3.s.type || "\u2014");
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(ctx_r1.propConstraintSummary(p_r3.s));
} }
function SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "div", 5)(4, "table")(5, "thead")(6, "tr")(7, "th", 6);
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(10, "th", 7);
    i0.ɵɵtext(11);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "th");
    i0.ɵɵtext(14);
    i0.ɵɵpipe(15, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(16, "tbody");
    i0.ɵɵrepeaterCreate(17, SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_0_For_18_Template, 7, 3, "tr", null, _forTrack0);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const props_r4 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 4, "spaces.schema.propertySchemas"));
    i0.ɵɵadvance(7);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 6, "spaces.schema.propTable.property"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(12, 8, "spaces.schema.propTable.type"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(15, 10, "spaces.schema.propTable.constraints"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(props_r4);
} }
function SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 3);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.libRef.noProps"));
} }
function SchemaTypeEditorComponent_Conditional_0_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵconditionalCreate(0, SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_0_Template, 19, 12)(1, SchemaTypeEditorComponent_Conditional_0_Conditional_9_Conditional_1_Template, 3, 3, "div", 3);
} if (rf & 2) {
    i0.ɵɵconditional(ctx.length ? 0 : 1);
} }
function SchemaTypeEditorComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 0);
    i0.ɵɵelement(1, "ph-icon", 1);
    i0.ɵɵelementStart(2, "span");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(5, "button", 2);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_0_Template_button_click_5_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.unlink.emit()); });
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(9, SchemaTypeEditorComponent_Conditional_0_Conditional_9_Template, 2, 1);
} if (rf & 2) {
    let tmp_6_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(4, 5, "spaces.schema.libRef.linkedHint", i0.ɵɵpureFunction1(12, _c0, ctx)));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(6, 8, "spaces.schema.libRef.unlinkTitle"));
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 10, "spaces.schema.libRef.unlinkButton"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((tmp_6_0 = ctx_r1.linkedProps()) ? 9 : -1, tmp_6_0);
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r6 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 10)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 12);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "input", 32);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_Conditional_0_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r6); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.d().namingPattern, $event) || (ctx_r1.d().namingPattern = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 4, "spaces.schema.namingPattern"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 6, "spaces.schema.namingPatternHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.d().namingPattern);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(8, 8, "spaces.schema.namingPatternPlaceholder"));
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind2(1, 1, "spaces.schema.retention.hintSpace", i0.ɵɵpureFunction1(4, _c1, ctx)), " ");
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_6_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵtext(0);
    i0.ɵɵpipe(1, "transloco");
} if (rf & 2) {
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(1, 1, "spaces.schema.retention.hintNoSpace"), " ");
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_14_Template(rf, ctx) { if (rf & 1) {
    const _r7 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 15);
    i0.ɵɵpipe(5, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_Conditional_14_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r7); const ctx_r1 = i0.ɵɵnextContext(2); i0.ɵɵtwoWayBindingSet(ctx_r1.d().retentionContentDays, $event) || (ctx_r1.d().retentionContentDays = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(6, "div", 22);
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.schema.retention.contentDays"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.d().retentionContentDays);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(5, 6, "spaces.schema.retention.never"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 8, "spaces.schema.retention.contentDaysHint"));
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_15_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 16);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.schema.retention.contentTooLate", i0.ɵɵpureFunction1(4, _c2, ctx)));
} }
function SchemaTypeEditorComponent_Conditional_1_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 23);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.suppressEmbeddings.noBackfill"));
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_16_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 42);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("enum ", p_r9.s.enum.length);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_17_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 43);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("min:", p_r9.s.minimum);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 43);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("max:", p_r9.s.maximum);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_19_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 43);
    i0.ɵɵtext(1, "pattern");
    i0.ɵɵelementEnd();
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 43);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("default:", p_r9.s.default);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 44);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(p_r9.s.mergeFn);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_For_32_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 61);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const fn_r11 = ctx.$implicit;
    i0.ɵɵproperty("value", fn_r11);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(fn_r11);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_33_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 12);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.schema.propDetail.mergeFnUnavailable"));
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_34_Template(rf, ctx) { if (rf & 1) {
    const _r12 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 12);
    i0.ɵɵtext(5);
    i0.ɵɵpipe(6, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "input", 63);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_34_Template_input_ngModelChange_7_listener($event) { i0.ɵɵrestoreView(_r12); const p_r9 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.pattern, $event) || (p_r9.s.pattern = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 3, "spaces.schema.propDetail.pattern"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 5, "spaces.schema.propDetail.patternHint"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.pattern);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_35_Template(rf, ctx) { if (rf & 1) {
    const _r13 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 14)(1, "label");
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "input", 64);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_35_Template_input_ngModelChange_4_listener($event) { i0.ɵɵrestoreView(_r13); const p_r9 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.minimum, $event) || (p_r9.s.minimum = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(5, "div", 14)(6, "label");
    i0.ɵɵtext(7);
    i0.ɵɵpipe(8, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(9, "input", 64);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_35_Template_input_ngModelChange_9_listener($event) { i0.ɵɵrestoreView(_r13); const p_r9 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.maximum, $event) || (p_r9.s.maximum = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(3, 4, "spaces.schema.propDetail.min"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.minimum);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 6, "spaces.schema.propDetail.max"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.maximum);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_For_10_Template(rf, ctx) { if (rf & 1) {
    const _r15 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 66);
    i0.ɵɵtext(1);
    i0.ɵɵelementStart(2, "button", 68);
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_For_10_Template_button_click_2_listener() { const ev_r16 = i0.ɵɵrestoreView(_r15).$implicit; const p_r9 = i0.ɵɵnextContext(3).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onRemoveEnum(p_r9.key, ev_r16)); });
    i0.ɵɵelement(3, "ph-icon", 47);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ev_r16 = ctx.$implicit;
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ev_r16);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_Template(rf, ctx) { if (rf & 1) {
    const _r14 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 62)(1, "div", 14)(2, "label");
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementStart(5, "span", 12);
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(8, "div", 65);
    i0.ɵɵrepeaterCreate(9, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_For_10_Template, 4, 2, "span", 66, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementStart(11, "input", 67);
    i0.ɵɵpipe(12, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_Template_input_ngModelChange_11_listener($event) { i0.ɵɵrestoreView(_r14); const p_r9 = i0.ɵɵnextContext(2).$implicit; i0.ɵɵtwoWayBindingSet(p_r9._enumInput, $event) || (p_r9._enumInput = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_Template_input_keydown_11_listener($event) { i0.ɵɵrestoreView(_r14); const p_r9 = i0.ɵɵnextContext(2).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onEnumKey($event, p_r9.key)); });
    i0.ɵɵelementEnd()()()();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext(2).$implicit;
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(4, 4, "spaces.schema.propDetail.enumValues"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 6, "spaces.schema.propDetail.enumHint"));
    i0.ɵɵadvance(3);
    i0.ɵɵrepeater(p_r9.s.enum ?? i0.ɵɵpureFunction0(10, _c3));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9._enumInput);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(12, 8, "spaces.schema.propDetail.enumPlaceholder"));
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template(rf, ctx) { if (rf & 1) {
    const _r10 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 49);
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template_tr_click_0_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(1, "td", 50)(2, "div", 51)(3, "div", 52)(4, "div", 14)(5, "label");
    i0.ɵɵtext(6);
    i0.ɵɵpipe(7, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "select", 53);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template_select_ngModelChange_8_listener($event) { i0.ɵɵrestoreView(_r10); const p_r9 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.type, $event) || (p_r9.s.type = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template_select_ngModelChange_8_listener() { i0.ɵɵrestoreView(_r10); const p_r9 = i0.ɵɵnextContext().$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onTypeChange(p_r9)); });
    i0.ɵɵelementStart(9, "option", 54);
    i0.ɵɵtext(10, "any");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(11, "option", 55);
    i0.ɵɵtext(12, "string");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(13, "option", 56);
    i0.ɵɵtext(14, "number");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(15, "option", 57);
    i0.ɵɵtext(16, "boolean");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(17, "option", 58);
    i0.ɵɵtext(18, "date");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(19, "div", 14)(20, "label");
    i0.ɵɵtext(21);
    i0.ɵɵpipe(22, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(23, "input", 59);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template_input_ngModelChange_23_listener($event) { i0.ɵɵrestoreView(_r10); const p_r9 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.default, $event) || (p_r9.s.default = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(24, "div", 14)(25, "label");
    i0.ɵɵtext(26);
    i0.ɵɵpipe(27, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(28, "select", 60);
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template_select_ngModelChange_28_listener($event) { i0.ɵɵrestoreView(_r10); const p_r9 = i0.ɵɵnextContext().$implicit; i0.ɵɵtwoWayBindingSet(p_r9.s.mergeFn, $event) || (p_r9.s.mergeFn = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementStart(29, "option", 54);
    i0.ɵɵtext(30, "\u2014");
    i0.ɵɵelementEnd();
    i0.ɵɵrepeaterCreate(31, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_For_32_Template, 2, 2, "option", 61, i0.ɵɵrepeaterTrackByIdentity);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(33, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_33_Template, 3, 3, "span", 12);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(34, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_34_Template, 8, 7, "div", 14);
    i0.ɵɵconditionalCreate(35, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_35_Template, 10, 8);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(36, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Conditional_36_Template, 13, 11, "div", 62);
    i0.ɵɵelementEnd()()();
} if (rf & 2) {
    const p_r9 = i0.ɵɵnextContext().$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵadvance(6);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 13, "spaces.schema.propDetail.type"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.type);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngValue", undefined);
    i0.ɵɵadvance(12);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(22, 15, "spaces.schema.propDetail.default"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.default);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(27, 17, "spaces.schema.propDetail.mergeFn"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", p_r9.s.mergeFn);
    i0.ɵɵproperty("disabled", !ctx_r1.mergeFnsFor(p_r9.s.type).length);
    i0.ɵɵadvance();
    i0.ɵɵproperty("ngValue", undefined);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx_r1.mergeFnsFor(p_r9.s.type));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(!ctx_r1.mergeFnsFor(p_r9.s.type).length ? 33 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.type === "string" || p_r9.s.type === undefined ? 34 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.type === "number" || p_r9.s.type === undefined ? 35 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.type !== "boolean" ? 36 : -1);
} }
function SchemaTypeEditorComponent_Conditional_1_For_57_Template(rf, ctx) { if (rf & 1) {
    const _r8 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "tr", 33);
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Template_tr_click_0_listener() { const p_r9 = i0.ɵɵrestoreView(_r8).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.toggleOpen(p_r9.key)); });
    i0.ɵɵelementStart(1, "td")(2, "span", 34);
    i0.ɵɵelement(3, "ph-icon", 35);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(4, "td")(5, "div", 36)(6, "span", 37);
    i0.ɵɵtext(7);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(8, "label", 38);
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Template_label_click_8_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(9, "input", 39);
    i0.ɵɵlistener("change", function SchemaTypeEditorComponent_Conditional_1_For_57_Template_input_change_9_listener() { const p_r9 = i0.ɵɵrestoreView(_r8).$implicit; return i0.ɵɵresetView(p_r9.s.required = !p_r9.s.required); });
    i0.ɵɵelementEnd();
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(12, "td")(13, "span", 40);
    i0.ɵɵtext(14);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(15, "td", 41);
    i0.ɵɵconditionalCreate(16, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_16_Template, 2, 1, "span", 42);
    i0.ɵɵconditionalCreate(17, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_17_Template, 2, 1, "span", 43);
    i0.ɵɵconditionalCreate(18, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_18_Template, 2, 1, "span", 43);
    i0.ɵɵconditionalCreate(19, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_19_Template, 2, 0, "span", 43);
    i0.ɵɵconditionalCreate(20, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_20_Template, 2, 1, "span", 43);
    i0.ɵɵconditionalCreate(21, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_21_Template, 2, 1, "span", 44);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(22, "td", 45);
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Template_td_click_22_listener($event) { return $event.stopPropagation(); });
    i0.ɵɵelementStart(23, "button", 46);
    i0.ɵɵpipe(24, "transloco");
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_For_57_Template_button_click_23_listener() { const p_r9 = i0.ɵɵrestoreView(_r8).$implicit; const ctx_r1 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r1.onRemoveProp(p_r9.key)); });
    i0.ɵɵelement(25, "ph-icon", 47);
    i0.ɵɵelementEnd()()();
    i0.ɵɵconditionalCreate(26, SchemaTypeEditorComponent_Conditional_1_For_57_Conditional_26_Template, 37, 19, "tr", 48);
} if (rf & 2) {
    const p_r9 = ctx.$implicit;
    const ctx_r1 = i0.ɵɵnextContext(2);
    i0.ɵɵclassProp("prow-open", ctx_r1.isOpen(p_r9.key));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("name", ctx_r1.isOpen(p_r9.key) ? "caret-up" : "caret-down")("size", 13);
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(p_r9.key);
    i0.ɵɵadvance();
    i0.ɵɵclassProp("is-req", p_r9.s.required);
    i0.ɵɵadvance();
    i0.ɵɵproperty("checked", p_r9.s.required);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(11, 19, "spaces.schema.propDetail.required"), " ");
    i0.ɵɵadvance(4);
    i0.ɵɵtextInterpolate(p_r9.s.type ?? "any");
    i0.ɵɵadvance(2);
    i0.ɵɵconditional((p_r9.s.enum == null ? null : p_r9.s.enum.length) ? 16 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.minimum !== undefined ? 17 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.maximum !== undefined ? 18 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.pattern ? 19 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.default !== undefined ? 20 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional(p_r9.s.mergeFn ? 21 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(24, 21, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 14);
    i0.ɵɵadvance();
    i0.ɵɵconditional(ctx_r1.isOpen(p_r9.key) ? 26 : -1);
} }
function SchemaTypeEditorComponent_Conditional_1_ForEmpty_58_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "tr")(1, "td", 69);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(3, 1, "spaces.schema.noProps"), " ");
} }
function SchemaTypeEditorComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r5 = i0.ɵɵgetCurrentView();
    i0.ɵɵconditionalCreate(0, SchemaTypeEditorComponent_Conditional_1_Conditional_0_Template, 9, 10, "div", 10);
    i0.ɵɵelementStart(1, "div", 11);
    i0.ɵɵtext(2);
    i0.ɵɵpipe(3, "transloco");
    i0.ɵɵelementStart(4, "span", 12);
    i0.ɵɵconditionalCreate(5, SchemaTypeEditorComponent_Conditional_1_Conditional_5_Template, 2, 6)(6, SchemaTypeEditorComponent_Conditional_1_Conditional_6_Template, 2, 3);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(7, "div", 13)(8, "div", 14)(9, "label");
    i0.ɵɵtext(10);
    i0.ɵɵpipe(11, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(12, "input", 15);
    i0.ɵɵpipe(13, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_Template_input_ngModelChange_12_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.d().retentionDays, $event) || (ctx_r1.d().retentionDays = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵelementEnd()();
    i0.ɵɵconditionalCreate(14, SchemaTypeEditorComponent_Conditional_1_Conditional_14_Template, 9, 10, "div", 14);
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(15, SchemaTypeEditorComponent_Conditional_1_Conditional_15_Template, 3, 6, "div", 16);
    i0.ɵɵelementStart(16, "div", 17)(17, "label");
    i0.ɵɵtext(18);
    i0.ɵɵpipe(19, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(20, "select", 18);
    i0.ɵɵlistener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_Template_select_ngModelChange_20_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.setSuppress($event)); });
    i0.ɵɵelementStart(21, "option", 19);
    i0.ɵɵtext(22);
    i0.ɵɵpipe(23, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(24, "option", 20);
    i0.ɵɵtext(25);
    i0.ɵɵpipe(26, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(27, "option", 21);
    i0.ɵɵtext(28);
    i0.ɵɵpipe(29, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(30, "div", 22);
    i0.ɵɵtext(31);
    i0.ɵɵpipe(32, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(33, SchemaTypeEditorComponent_Conditional_1_Conditional_33_Template, 3, 3, "div", 23);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(34, "div", 11);
    i0.ɵɵtext(35);
    i0.ɵɵpipe(36, "transloco");
    i0.ɵɵelementStart(37, "span", 12);
    i0.ɵɵtext(38);
    i0.ɵɵpipe(39, "transloco");
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(40, "div", 24)(41, "table", 25)(42, "thead")(43, "tr");
    i0.ɵɵelement(44, "th", 26);
    i0.ɵɵelementStart(45, "th", 6);
    i0.ɵɵtext(46);
    i0.ɵɵpipe(47, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(48, "th", 7);
    i0.ɵɵtext(49);
    i0.ɵɵpipe(50, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(51, "th");
    i0.ɵɵtext(52);
    i0.ɵɵpipe(53, "transloco");
    i0.ɵɵelementEnd();
    i0.ɵɵelement(54, "th", 27);
    i0.ɵɵelementEnd()();
    i0.ɵɵelementStart(55, "tbody");
    i0.ɵɵrepeaterCreate(56, SchemaTypeEditorComponent_Conditional_1_For_57_Template, 27, 23, null, null, _forTrack0, false, SchemaTypeEditorComponent_Conditional_1_ForEmpty_58_Template, 4, 3, "tr");
    i0.ɵɵelementEnd()()();
    i0.ɵɵelementStart(59, "div", 28)(60, "input", 29);
    i0.ɵɵpipe(61, "transloco");
    i0.ɵɵpipe(62, "transloco");
    i0.ɵɵtwoWayListener("ngModelChange", function SchemaTypeEditorComponent_Conditional_1_Template_input_ngModelChange_60_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); i0.ɵɵtwoWayBindingSet(ctx_r1.d()._newPropInput, $event) || (ctx_r1.d()._newPropInput = $event); return i0.ɵɵresetView($event); });
    i0.ɵɵlistener("keydown.enter", function SchemaTypeEditorComponent_Conditional_1_Template_input_keydown_enter_60_listener($event) { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); $event.preventDefault(); return i0.ɵɵresetView(ctx_r1.onAddProp()); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(63, "button", 30);
    i0.ɵɵpipe(64, "transloco");
    i0.ɵɵpipe(65, "transloco");
    i0.ɵɵlistener("click", function SchemaTypeEditorComponent_Conditional_1_Template_button_click_63_listener() { i0.ɵɵrestoreView(_r5); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.onAddProp()); });
    i0.ɵɵelement(66, "ph-icon", 31);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    let tmp_3_0;
    let tmp_8_0;
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵconditional(ctx_r1.knowledgeType() === "entity" ? 0 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(3, 28, "spaces.schema.retention.label"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵconditional((tmp_3_0 = ctx_r1.spaceWindowDays()) ? 5 : 6, tmp_3_0);
    i0.ɵɵadvance(5);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(11, 30, "spaces.schema.retention.days"));
    i0.ɵɵadvance(2);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.d().retentionDays);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(13, 32, "spaces.schema.retention.inherit"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.knowledgeType() === "chrono" ? 14 : -1);
    i0.ɵɵadvance();
    i0.ɵɵconditional((tmp_8_0 = ctx_r1.contentWindowNeverFires()) ? 15 : -1, tmp_8_0);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(19, 34, "spaces.schema.suppressEmbeddings.label"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("ngModel", ctx_r1.suppressValue());
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(23, 36, "spaces.schema.suppressEmbeddings.inherit"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(26, 38, "spaces.schema.suppressEmbeddings.on"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(29, 40, "spaces.schema.suppressEmbeddings.off"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(32, 42, "spaces.schema.suppressEmbeddings.hint"));
    i0.ɵɵadvance(2);
    i0.ɵɵconditional(ctx_r1.d().suppressEmbeddings === true ? 33 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(36, 44, "spaces.schema.propertySchemas"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 46, "spaces.schema.propertySchemasHint"));
    i0.ɵɵadvance(8);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(47, 48, "spaces.schema.propTable.property"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(50, 50, "spaces.schema.propTable.type"));
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(53, 52, "spaces.schema.propTable.constraints"));
    i0.ɵɵadvance(4);
    i0.ɵɵrepeater(ctx_r1.d().propertySchemas);
    i0.ɵɵadvance(4);
    i0.ɵɵtwoWayProperty("ngModel", ctx_r1.d()._newPropInput);
    i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(61, 54, "spaces.schema.newPropNamePlaceholder"));
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(62, 56, "spaces.schema.addPropertyButton"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("disabled", !ctx_r1.d()._newPropInput.trim());
    i0.ɵɵattribute("title", i0.ɵɵpipeBind1(64, 58, "spaces.schema.addPropertyButton"))("aria-label", i0.ɵɵpipeBind1(65, 60, "spaces.schema.addPropertyButton"));
    i0.ɵɵadvance(3);
    i0.ɵɵproperty("size", 18);
} }
export class SchemaTypeEditorComponent {
    constructor() {
        this.transloco = inject(TranslocoService);
        /** Which collection the type belongs to. Only `chrono` offers a content-retention window. */
        this.knowledgeType = input.required(...(ngDevMode ? [{ debugName: "knowledgeType" }] : /* istanbul ignore next */ []));
        /** The draft being edited, IN PLACE. The host owns it and decides when it is persisted. */
        this.draft = input.required(...(ngDevMode ? [{ debugName: "draft" }] : /* istanbul ignore next */ []));
        /** The library entry this type is linked to, if any — a linked type is read-only until unlinked. */
        this.libRef = input(null, ...(ngDevMode ? [{ debugName: "libRef" }] : /* istanbul ignore next */ []));
        /** A linked entry's properties, resolved by the host, for the read-only view. */
        this.linkedProps = input([], ...(ngDevMode ? [{ debugName: "linkedProps" }] : /* istanbul ignore next */ []));
        /** The retention window this collection inherits from the space, or null. Shown as the fallback hint. */
        this.spaceWindowDays = input(null, ...(ngDevMode ? [{ debugName: "spaceWindowDays" }] : /* istanbul ignore next */ []));
        /** Asked for, not done: the notice lives here, the action belongs to the host. */
        this.unlink = output();
        /** Short alias so the template reads as `d().field` rather than repeating `draft()`. */
        this.d = this.draft;
        // ── Expanded rows. Local, because it is view state and each host wants its own.
        this.openRows = signal(new Set(), ...(ngDevMode ? [{ debugName: "openRows" }] : /* istanbul ignore next */ []));
        /**
         * The merge functions this type may declare — the API's own rule, so the control cannot offer a refusal.
         *
         * A method rather than a pipe because the answer depends on a field the row owns and changes in place.
         */
        this.mergeFnsFor = mergeFnsFor;
        /**
         * The effective delete window when a chrono type's content window sits at or beyond it — else null.
         *
         * Mirrors `contentDays()` on the server exactly, including its fall-through: a type with no `days` of its
         * own is still deleted at the SPACE default, so a 30-day content window under a 30-day space default never
         * fires either. Returning the number lets the message say which window it lost to, which is the part an
         * operator cannot work out from the two fields in front of them.
         */
        this.contentWindowNeverFires = computed(() => {
            if (this.knowledgeType() !== 'chrono')
                return null;
            const s = this.draft();
            const content = Number(s.retentionContentDays);
            if (!Number.isFinite(content) || content <= 0)
                return null;
            const total = Number(s.retentionDays) || this.spaceWindowDays() || 0;
            return total > 0 && content >= total ? total : null;
        }, ...(ngDevMode ? [{ debugName: "contentWindowNeverFires" }] : /* istanbul ignore next */ []));
        /**
         * The tri-state suppression control, as a select value.
         *
         * `null` is "inherit" and must round-trip as `null` — mapping it to `false` would write a decision on every
         * save for every type nobody edited, and pin each of them to embedding regardless of the space setting.
         */
        this.suppressValue = computed(() => {
            const v = this.draft().suppressEmbeddings;
            return v === null || v === undefined ? 'inherit' : v ? 'on' : 'off';
        }, ...(ngDevMode ? [{ debugName: "suppressValue" }] : /* istanbul ignore next */ []));
    }
    isOpen(key) { return this.openRows().has(key); }
    toggleOpen(key) {
        const next = new Set(this.openRows());
        if (!next.delete(key))
            next.add(key);
        this.openRows.set(next);
    }
    // ── Edits, delegated to the pure operations so the settings tab and this component cannot diverge.
    onAddProp() {
        const key = addProp(this.draft());
        if (key !== null)
            this.toggleOpen(key); // expand what was just created
    }
    onRemoveProp(key) {
        removeProp(this.draft(), key);
        const next = new Set(this.openRows());
        next.delete(key);
        this.openRows.set(next);
    }
    /**
     * Changing the type clears a merge function the new type cannot hold.
     *
     * This component had NO type-change handler at all — the shared `prop-schema-table` had one and this copy
     * did not, which is the same one-rule-two-implementations split that lost its stylesheet. Without it,
     * switching `number` to `date` leaves `min` behind, invisible, until the save is refused for a field the
     * operator was not editing.
     */
    onTypeChange(p) {
        p.s.mergeFn = mergeFnAfterTypeChange(p.s.type, p.s.mergeFn);
    }
    onAddEnum(key) { addEnumVal(this.draft(), key); }
    onRemoveEnum(key, val) { removeEnumVal(this.draft(), key, val); }
    onEnumKey(e, key) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            this.onAddEnum(key);
        }
    }
    setSuppress(v) {
        this.draft().suppressEmbeddings = v === 'inherit' ? null : v === 'on';
    }
    /**
     * One line summarising a property's constraints, for the collapsed row.
     *
     * Moved here with the body it serves. It reads nothing but the property it is given, so it had no reason
     * to stay behind on the tab once the rows did.
     */
    propConstraintSummary(s) {
        const parts = [];
        if (s.required)
            parts.push(this.transloco.translate('spaces.schema.propDetail.required'));
        if (s.enum?.length)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.enumValues')}: ${s.enum.join(', ')}`);
        if (s.minimum != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.min')} ${s.minimum}`);
        if (s.maximum != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.max')} ${s.maximum}`);
        if (s.pattern)
            parts.push(`/${s.pattern}/`);
        if (s.default != null)
            parts.push(`${this.transloco.translate('spaces.schema.propDetail.default')} ${s.default}`);
        return parts.join(' · ') || '—';
    }
    static { this.ɵfac = function SchemaTypeEditorComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SchemaTypeEditorComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SchemaTypeEditorComponent, selectors: [["app-schema-type-editor"]], inputs: { knowledgeType: [1, "knowledgeType"], draft: [1, "draft"], libRef: [1, "libRef"], linkedProps: [1, "linkedProps"], spaceWindowDays: [1, "spaceWindowDays"] }, outputs: { unlink: "unlink" }, decls: 2, vars: 1, consts: [[2, "display", "flex", "align-items", "center", "gap", "10px", "padding", "4px 0", "color", "var(--text-secondary)", "font-size", "13px"], ["name", "bookmarks", 2, "color", "var(--accent)", "flex-shrink", "0", 3, "size"], ["type", "button", 1, "btn", "btn-secondary", "btn-sm", 2, "margin-left", "auto", "flex-shrink", "0", 3, "click"], [1, "sch-hint", 2, "margin-top", "8px"], [1, "sch-section-label", 2, "margin-top", "12px"], [1, "tablewrap"], [2, "width", "150px"], [2, "width", "80px"], [2, "font-family", "var(--font-mono)", "font-size", "12.5px"], [2, "color", "var(--text-secondary)", "font-size", "12.5px"], [1, "field", 2, "margin", "0 0 12px"], [1, "sch-section-label"], [1, "sch-hint"], [1, "ret-row"], [1, "field", 2, "margin", "0"], ["type", "number", "min", "1", "step", "1", 3, "ngModelChange", "ngModel", "placeholder"], [1, "sch-msg", "err"], [1, "field"], [2, "max-width", "320px", 3, "ngModelChange", "ngModel"], ["value", "inherit"], ["value", "on"], ["value", "off"], [1, "sch-hint", 2, "margin-top", "3px"], [1, "sch-msg", "warn"], ["hscrollTop", "", 1, "table-wrapper", 2, "margin-bottom", "0"], [1, "prop-table", 2, "margin-bottom", "0"], [2, "width", "30px"], [2, "width", "40px"], [1, "sch-add-row", "sch-add-prop"], ["type", "text", 3, "ngModelChange", "keydown.enter", "ngModel", "placeholder"], ["type", "button", 1, "sch-add-btn", 3, "click", "disabled"], ["name", "plus-circle", 3, "size"], ["type", "text", 2, "max-width", "320px", 3, "ngModelChange", "ngModel", "placeholder"], [1, "prop-row", 3, "click"], [1, "prop-caret"], [3, "name", "size"], [1, "prop-name"], [1, "prop-name-key"], [1, "req-toggle", 3, "click"], ["type", "checkbox", 3, "change", "checked"], [1, "badge", "badge-gray"], [2, "font-size", "11px", "color", "var(--text-muted)"], [1, "badge", "badge-gray", 2, "margin-right", "3px"], [2, "margin-right", "4px"], [1, "badge", "badge-blue"], [3, "click"], ["type", "button", 1, "icon-btn", "danger", 3, "click"], ["name", "x", 3, "size"], [1, "prop-expand-row"], [1, "prop-expand-row", 3, "click"], ["colspan", "5", 2, "padding", "0"], [1, "pdet"], [1, "pdet-fields"], [3, "ngModelChange", "ngModel"], [3, "ngValue"], ["value", "string"], ["value", "number"], ["value", "boolean"], ["value", "date"], ["type", "text", "placeholder", "\u2014", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel", "disabled"], [3, "value"], [1, "pdet-full"], ["type", "text", "placeholder", "^[A-Z].*", 3, "ngModelChange", "ngModel"], ["type", "number", "placeholder", "\u2014", 3, "ngModelChange", "ngModel"], [1, "chip-wrap"], [1, "chip"], ["type", "text", 1, "chip-field", 3, "ngModelChange", "keydown", "ngModel", "placeholder"], ["type", "button", 1, "chip-rm", 3, "click"], ["colspan", "5", 2, "padding", "24px 0", "text-align", "center", "color", "var(--text-muted)", "font-size", "13px", "font-style", "italic"]], template: function SchemaTypeEditorComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, SchemaTypeEditorComponent_Conditional_0_Template, 10, 14)(1, SchemaTypeEditorComponent_Conditional_1_Template, 67, 62);
        } if (rf & 2) {
            let tmp_0_0;
            i0.ɵɵconditional((tmp_0_0 = ctx.libRef()) ? 0 : 1, tmp_0_0);
        } }, dependencies: [FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.MinValidator, i1.NgModel, PhIconComponent, HscrollTopDirective, TranslocoPipe], styles: ["\n\n\n\n\n.sch-head-row[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;\n  min-height:20px; }\n.val-controls[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:16px; flex-wrap:wrap; }\n.val-lbl[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; }\n.val-select[_ngcontent-%COMP%] { font:inherit; font-size:12px; text-transform:none; letter-spacing:0; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); }\n.val-check[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; }\n.val-check[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { margin:0; }\n.sch-validation-bar[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; gap:16px 20px; flex-wrap:wrap;\n  padding:12px 14px; margin-bottom:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-label[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:2px; min-width:0; }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-title[_ngcontent-%COMP%] { font-size:13px; font-weight:640; color:var(--text-primary); }\n.sch-validation-bar[_ngcontent-%COMP%]   .svb-hint[_ngcontent-%COMP%] { font-size:11.5px; color:var(--text-muted); }\n.sch-md[_ngcontent-%COMP%] { display:grid; grid-template-columns:minmax(190px,250px) 1fr; gap:18px; align-items:start; margin-top:6px; }\n@media (max-width:760px) { .sch-md[_ngcontent-%COMP%] { grid-template-columns:1fr; } }\n.sch-master[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:3px; min-width:0; }\n\n\n.sch-type-list[_ngcontent-%COMP%] { display:flex; flex-direction:column; gap:3px; min-height:0; overflow-y:auto; max-height:340px; }\n.sch-type-item[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none;\n  border:1px solid transparent; border-radius:8px; padding:7px 9px; cursor:pointer; font:inherit; color:var(--text-primary); }\n.sch-type-item[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); }\n.sch-type-item.sel[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 12%,transparent); border-color:color-mix(in srgb,var(--accent) 34%,transparent); }\n.sch-type-item[_ngcontent-%COMP%]   .nm[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:13px; color:var(--accent); flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sch-type-badges[_ngcontent-%COMP%] { display:inline-flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }\n.sch-empty-list[_ngcontent-%COMP%] { color:var(--text-muted); font-size:12.5px; font-style:italic; padding:14px 6px; text-align:center; }\n.sch-detail[_ngcontent-%COMP%] { min-width:0; }\n.sch-detail-empty[_ngcontent-%COMP%] { color:var(--text-muted); font-size:13px; font-style:italic; padding:26px 20px; text-align:center;\n  border:1px dashed var(--border); border-radius:10px; }\n.sch-detail-head[_ngcontent-%COMP%] { display:flex; align-items:center; gap:10px; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-detail-head[_ngcontent-%COMP%]   .dt[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; }\n.sch-detail-head[_ngcontent-%COMP%]   .acts[_ngcontent-%COMP%] { display:flex; gap:4px; flex-shrink:0; }\n\n\n\n\n\n\n\n.sch-md[_ngcontent-%COMP%] { --sch-head-h:34px; }\n.sch-add-row[_ngcontent-%COMP%] { display:flex; gap:6px; align-items:center; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-add-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { flex:1; min-width:0; }\n.sch-add-btn[_ngcontent-%COMP%] { display:grid; place-items:center; flex:none; width:30px; height:30px; padding:0;\n  border:1px solid var(--border); border-radius:8px; background:var(--bg-primary);\n  color:var(--accent); cursor:pointer; }\n.sch-add-btn[_ngcontent-%COMP%]:hover:not(:disabled) { border-color:var(--accent); }\n.sch-add-btn[_ngcontent-%COMP%]:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.6; }\n.sch-add-btn[_ngcontent-%COMP%]:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }\n\n\n.sch-add-prop[_ngcontent-%COMP%] { margin-bottom:0; padding-bottom:0; border-bottom:none;\n  margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }\n.sch-add-prop[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:260px; }\n.sch-add-imports[_ngcontent-%COMP%] { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px;\n  border-top:1px solid var(--border-muted); }\n\n\n\n\n\n\n\n\n.sch-hint[_ngcontent-%COMP%] { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted); }\n.sch-section-label[_ngcontent-%COMP%] { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }\n\n\n\n\n.sch-detail[_ngcontent-%COMP%]   .sch-section-label[_ngcontent-%COMP%], \n.sch-detail[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%]    > label[_ngcontent-%COMP%] { margin-top:16px; }\n.sch-detail[_ngcontent-%COMP%]    > .field[_ngcontent-%COMP%]:first-of-type    > label[_ngcontent-%COMP%], \n.sch-detail[_ngcontent-%COMP%]   .sch-section-label[_ngcontent-%COMP%]:first-of-type { margin-top:0; }\n\n\n\n\n\n\n.ret-row[_ngcontent-%COMP%] { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }\n.ret-row[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { flex:1 1 190px; min-width:0; max-width:260px; }\n.ret-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:150px; }\n.sch-msg[_ngcontent-%COMP%] { font-size:12px; margin-top:6px; }\n.sch-msg.err[_ngcontent-%COMP%] { color:var(--error); }\n.sch-msg.ok[_ngcontent-%COMP%]  { color:var(--success); }\n.sch-type-badges[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] { font-size:9px; }", ".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }", "\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SchemaTypeEditorComponent, [{
        type: Component,
        args: [{ selector: 'app-schema-type-editor', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, TranslocoPipe, PhIconComponent, HscrollTopDirective], template: `
@if (libRef(); as libRef) {
  <!-- Linked library schema — editable only after unlinking; shown read-only meanwhile. -->
  <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:var(--text-secondary);font-size:13px;">
    <ph-icon name="bookmarks" [size]="16" style="color:var(--accent);flex-shrink:0;"/>
    <span>{{ 'spaces.schema.libRef.linkedHint' | transloco: {name: libRef} }}</span>
    <button class="btn btn-secondary btn-sm" type="button" style="margin-left:auto;flex-shrink:0;"
      (click)="unlink.emit()" [attr.title]="'spaces.schema.libRef.unlinkTitle' | transloco">{{ 'spaces.schema.libRef.unlinkButton' | transloco }}</button>
  </div>
  <!-- Read-only view of the linked entry's properties, so you can see what the type enforces
       without unlinking first. -->
  @if (linkedProps(); as props) {
    @if (props.length) {
      <div class="sch-section-label" style="margin-top:12px;">{{ 'spaces.schema.propertySchemas' | transloco }}</div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
              <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
              <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of props; track p.key) {
              <tr>
                <td style="font-family:var(--font-mono);font-size:12.5px;">{{ p.key }}</td>
                <td>{{ p.s.type || '—' }}</td>
                <td style="color:var(--text-secondary);font-size:12.5px;">{{ propConstraintSummary(p.s) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="sch-hint" style="margin-top:8px;">{{ 'spaces.schema.libRef.noProps' | transloco }}</div>
    }
  }
} @else {
  <!-- Naming pattern (entity only) -->
  @if (knowledgeType() === 'entity') {
    <div class="field" style="margin:0 0 12px;">
      <label>{{ 'spaces.schema.namingPattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
      <input type="text" [(ngModel)]="d().namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
    </div>
  }
  <!-- Retention — the SCHEMA tier of record > schema > space, and the control the Danger Zone, the
       integration guide and the API have all been pointing at. It belongs here, beside the type's
       other rules, rather than in a second parallel map an operator has to know exists.

       The hint names what an empty field inherits, with the space default's actual number in it: the
       operator who asked for this said the old arrangement was a convention they had to know, and
       "inherit" without saying inherit-WHAT is the same failure one level down.

       NOTE: no backticks anywhere in this comment — one kills the whole template string and the
       error then points at @Component. -->
  <div class="sch-section-label">{{ 'spaces.schema.retention.label' | transloco }}
    <!-- The inherited number is THIS collection's bucket, not one space-wide figure: the space tier is
         five windows, and naming the wrong one would be worse than naming none. -->
    <span class="sch-hint">
      @if (spaceWindowDays(); as days) {
        {{ 'spaces.schema.retention.hintSpace' | transloco: { days } }}
      } @else {
        {{ 'spaces.schema.retention.hintNoSpace' | transloco }}
      }
    </span>
  </div>
  <div class="ret-row">
    <div class="field" style="margin:0;">
      <label>{{ 'spaces.schema.retention.days' | transloco }}</label>
      <input type="number" min="1" step="1" [(ngModel)]="d().retentionDays"
        [placeholder]="'spaces.schema.retention.inherit' | transloco" />
    </div>
    <!-- chrono only, because that is the only collection whose sweep implements it. Offering it on
         the others would store a number that never fires. -->
    @if (knowledgeType() === 'chrono') {
      <div class="field" style="margin:0;">
        <label>{{ 'spaces.schema.retention.contentDays' | transloco }}</label>
        <input type="number" min="1" step="1" [(ngModel)]="d().retentionContentDays"
          [placeholder]="'spaces.schema.retention.never' | transloco" />
        <div class="sch-hint" style="margin-top:3px;">{{ 'spaces.schema.retention.contentDaysHint' | transloco }}</div>
      </div>
    }
  </div>
  <!-- The server CLAMPS a content window that is not strictly inside the delete window (it would
       never fire), so without this the field would accept a number and silently do nothing. -->
  @if (contentWindowNeverFires(); as total) {
    <div class="sch-msg err">{{ 'spaces.schema.retention.contentTooLate' | transloco: { total } }}</div>
  }
  <!-- Three states, not a checkbox. "Inherit" is the space setting and is the DEFAULT; the other two are
       deliberate overrides in each direction. A two-state control could not express "embed this type even
       though the space suppresses", and it would write a value on every save for types nobody touched. -->
  <div class="field">
    <label>{{ 'spaces.schema.suppressEmbeddings.label' | transloco }}</label>
    <select [ngModel]="suppressValue()" (ngModelChange)="setSuppress($event)" style="max-width:320px;">
      <option value="inherit">{{ 'spaces.schema.suppressEmbeddings.inherit' | transloco }}</option>
      <option value="on">{{ 'spaces.schema.suppressEmbeddings.on' | transloco }}</option>
      <option value="off">{{ 'spaces.schema.suppressEmbeddings.off' | transloco }}</option>
    </select>
    <div class="sch-hint" style="margin-top:3px;">{{ 'spaces.schema.suppressEmbeddings.hint' | transloco }}</div>
    @if (d().suppressEmbeddings === true) {
      <div class="sch-msg warn">{{ 'spaces.schema.suppressEmbeddings.noBackfill' | transloco }}</div>
    }
  </div>
  <!-- Per-type tag suggestions were retired here. The editor reached nothing: not the Brain
       record forms (they suggest from tags already in use) and not the schema guidance sent to
       MCP clients. Offering a control that does nothing is the dishonesty the Models rebuild
       spent four PRs removing, and it is the same reasoning that retired the space-wide list
       in #365. Stored values are preserved — see the note on TypeSchema.tagSuggestions. -->
  <!-- Property schemas -->
  <!-- Every other section in this pane explains itself; this one did not, and it is the one
       doing the most work. The hint also points at the control that decides enforcement,
       which is a whole panel away at the top of the tab. -->
  <div class="sch-section-label">{{ 'spaces.schema.propertySchemas' | transloco }}
    <span class="sch-hint">{{ 'spaces.schema.propertySchemasHint' | transloco }}</span></div>
  <div class="table-wrapper" hscrollTop style="margin-bottom:0;">
    <table class="prop-table" style="margin-bottom:0;">
      <thead>
        <tr>
          <th style="width:30px;"></th>
          <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
          <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
          <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
          <th style="width:40px;"></th>
        </tr>
      </thead>
      <tbody>
        @for (p of d().propertySchemas; track p.key) {
          <tr class="prop-row" [class.prow-open]="isOpen(p.key)"
            (click)="toggleOpen(p.key)">
            <td><span class="prop-caret"><ph-icon [name]="isOpen(p.key) ? 'caret-up' : 'caret-down'" [size]="13"/></span></td>
            <td>
              <div class="prop-name">
                <span class="prop-name-key">{{ p.key }}</span>
                <label class="req-toggle" [class.is-req]="p.s.required" (click)="$event.stopPropagation()">
                  <input type="checkbox" [checked]="p.s.required" (change)="p.s.required = !p.s.required" />
                  {{ 'spaces.schema.propDetail.required' | transloco }}
                </label>
              </div>
            </td>
            <td><span class="badge badge-gray">{{ p.s.type ?? 'any' }}</span></td>
            <td style="font-size:11px;color:var(--text-muted);">
              @if (p.s.enum?.length) { <span class="badge badge-gray" style="margin-right:3px">enum {{ p.s.enum!.length }}</span> }
              @if (p.s.minimum!==undefined) { <span style="margin-right:4px;">min:{{ p.s.minimum }}</span> }
              @if (p.s.maximum!==undefined) { <span style="margin-right:4px;">max:{{ p.s.maximum }}</span> }
              @if (p.s.pattern) { <span style="margin-right:4px;">pattern</span> }
              @if (p.s.default!==undefined) { <span style="margin-right:4px;">default:{{ p.s.default }}</span> }
              @if (p.s.mergeFn) { <span class="badge badge-blue">{{ p.s.mergeFn }}</span> }
            </td>
            <td (click)="$event.stopPropagation()">
              <button class="icon-btn danger" type="button" (click)="onRemoveProp(p.key)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
            </td>
          </tr>
          @if (isOpen(p.key)) {
            <tr class="prop-expand-row" (click)="$event.stopPropagation()">
              <td colspan="5" style="padding:0;">
                <div class="pdet">
                  <div class="pdet-fields">
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.type' | transloco }}</label>
                      <select [(ngModel)]="p.s.type" (ngModelChange)="onTypeChange(p)">
                        <option [ngValue]="undefined">any</option>
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="date">date</option>
                      </select>
                    </div>
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.default' | transloco }}</label>
                      <input type="text" [(ngModel)]="p.s.default" placeholder="—" />
                    </div>
                    <!-- Only the functions the API accepts for this type. Offering all seven is what let a
                         date + min be chosen and then refused at save with a wall of zod JSON. -->
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.mergeFn' | transloco }}</label>
                      <select [(ngModel)]="p.s.mergeFn" [disabled]="!mergeFnsFor(p.s.type).length">
                        <option [ngValue]="undefined">—</option>
                        @for (fn of mergeFnsFor(p.s.type); track fn) { <option [value]="fn">{{ fn }}</option> }
                      </select>
                      @if (!mergeFnsFor(p.s.type).length) {
                        <span class="sch-hint">{{ 'spaces.schema.propDetail.mergeFnUnavailable' | transloco }}</span>
                      }
                    </div>
                    @if (p.s.type==='string'||p.s.type===undefined) {
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
                        <input type="text" [(ngModel)]="p.s.pattern" placeholder="^[A-Z].*" />
                      </div>
                    }
                    @if (p.s.type==='number'||p.s.type===undefined) {
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.min' | transloco }}</label>
                        <input type="number" [(ngModel)]="p.s.minimum" placeholder="—" />
                      </div>
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.max' | transloco }}</label>
                        <input type="number" [(ngModel)]="p.s.maximum" placeholder="—" />
                      </div>
                    }
                  </div>
                  @if (p.s.type !== 'boolean') {
                    <div class="pdet-full">
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
                        <div class="chip-wrap">
                          @for (ev of (p.s.enum??[]); track ev) {
                            <span class="chip">{{ ev }}<button type="button" class="chip-rm" (click)="onRemoveEnum(p.key,ev)"><ph-icon name="x" [size]="12"/></button></span>
                          }
                          <input type="text" class="chip-field" [(ngModel)]="p._enumInput"
                            [placeholder]="'spaces.schema.propDetail.enumPlaceholder' | transloco" (keydown)="onEnumKey($event,p.key)" />
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </td>
            </tr>
          }
        } @empty {
          <tr>
            <td colspan="5" style="padding:24px 0;text-align:center;color:var(--text-muted);font-size:13px;font-style:italic;">
              {{ 'spaces.schema.noProps' | transloco }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
  <!-- add property — the same inline [input][+] affordance as the add-type row, so the two
       "add something" controls on this tab read and behave identically. -->
  <div class="sch-add-row sch-add-prop">
    <input type="text" [(ngModel)]="d()._newPropInput" [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
      [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco"
      (keydown.enter)="$event.preventDefault();onAddProp()" />
    <button class="sch-add-btn" type="button"
      (click)="onAddProp()" [disabled]="!d()._newPropInput.trim()"
      [attr.title]="'spaces.schema.addPropertyButton' | transloco" [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco">
      <ph-icon name="plus-circle" [size]="18"/>
    </button>
  </div>
}
  `, styles: ["\n/* A floor, so this row cannot collapse and drag the master/detail grid up with it. The row's height is\n   otherwise stable by construction now: one hint string for all four collections, differing by a single\n   field name, so it wraps the same way whichever tab is open. That is what stops the add control below\n   from moving when you switch category. */\n.sch-head-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;\n  min-height:20px; }\n.val-controls { display:inline-flex; align-items:center; gap:16px; flex-wrap:wrap; }\n.val-lbl { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; }\n.val-select { font:inherit; font-size:12px; text-transform:none; letter-spacing:0; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); }\n.val-check { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; }\n.val-check input { margin:0; }\n.sch-validation-bar { display:flex; align-items:center; justify-content:space-between; gap:16px 20px; flex-wrap:wrap;\n  padding:12px 14px; margin-bottom:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); }\n.sch-validation-bar .svb-label { display:flex; flex-direction:column; gap:2px; min-width:0; }\n.sch-validation-bar .svb-title { font-size:13px; font-weight:640; color:var(--text-primary); }\n.sch-validation-bar .svb-hint { font-size:11.5px; color:var(--text-muted); }\n.sch-md { display:grid; grid-template-columns:minmax(190px,250px) 1fr; gap:18px; align-items:start; margin-top:6px; }\n@media (max-width:760px) { .sch-md { grid-template-columns:1fr; } }\n.sch-master { display:flex; flex-direction:column; gap:3px; min-width:0; }\n/* The list of types scrolls inside itself; the add-row above and imports below stay pinned. */\n.sch-type-list { display:flex; flex-direction:column; gap:3px; min-height:0; overflow-y:auto; max-height:340px; }\n.sch-type-item { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none;\n  border:1px solid transparent; border-radius:8px; padding:7px 9px; cursor:pointer; font:inherit; color:var(--text-primary); }\n.sch-type-item:hover { background:var(--bg-elevated); }\n.sch-type-item.sel { background:color-mix(in srgb,var(--accent) 12%,transparent); border-color:color-mix(in srgb,var(--accent) 34%,transparent); }\n.sch-type-item .nm { font-family:var(--font-mono); font-size:13px; color:var(--accent); flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sch-type-badges { display:inline-flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; }\n.sch-empty-list { color:var(--text-muted); font-size:12.5px; font-style:italic; padding:14px 6px; text-align:center; }\n.sch-detail { min-width:0; }\n.sch-detail-empty { color:var(--text-muted); font-size:13px; font-style:italic; padding:26px 20px; text-align:center;\n  border:1px dashed var(--border); border-radius:10px; }\n.sch-detail-head { display:flex; align-items:center; gap:10px; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-detail-head .dt { font-family:var(--font-mono); font-size:15px; color:var(--accent); font-weight:600; flex:1; min-width:0;\n  overflow:hidden; text-overflow:ellipsis; }\n.sch-detail-head .acts { display:flex; gap:4px; flex-shrink:0; }\n/* Pinned above the list: a bottom rule, not a top one, because it now heads the column.\n\n   It and the detail pane's head are the two column headers, side by side, so they share one height and\n   one bottom margin \u2014 otherwise their rules sit at different y and the two columns read as misaligned\n   even though the grid starts them at the same top edge. --sch-head-h is that shared height; changing\n   it moves both. */\n.sch-md { --sch-head-h:34px; }\n.sch-add-row { display:flex; gap:6px; align-items:center; min-height:var(--sch-head-h);\n  margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); box-sizing:content-box; }\n.sch-add-row input { flex:1; min-width:0; }\n.sch-add-btn { display:grid; place-items:center; flex:none; width:30px; height:30px; padding:0;\n  border:1px solid var(--border); border-radius:8px; background:var(--bg-primary);\n  color:var(--accent); cursor:pointer; }\n.sch-add-btn:hover:not(:disabled) { border-color:var(--accent); }\n.sch-add-btn:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.6; }\n.sch-add-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }\n/* Same row, but it heads the detail pane's foot rather than the list's head: rule on top, not bottom. */\n.sch-add-prop { margin-bottom:0; padding-bottom:0; border-bottom:none;\n  margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }\n.sch-add-prop input { max-width:260px; }\n.sch-add-imports { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px;\n  border-top:1px solid var(--border-muted); }\n/* .prop-caret moved to PROP_TABLE_STYLES \u2014 it belongs with the rows it opens, and a component rendering the\n   caret needs the row rules anyway. Two homes for one class is how the caret survived while the table around\n   it lost its styling. */\n/* One coherent text scale for the tab: guidance, section labels, inline messages.\n   Every section label reads the same and every hint hangs off it the same way \u2014 the delimiter is an\n   em dash in all of them, where it used to be parentheses in some and a dash in others. */\n.sch-hint { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted); }\n.sch-section-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }\n/* One rhythm between sections of the detail pane. They were spaced by whatever each block's own\n   margins happened to add up to, so the gaps above \"Tag suggestions\" and \"Property schemas\" differed\n   by several pixels for no reason a reader could infer. */\n.sch-detail .sch-section-label,\n.sch-detail > .field > label { margin-top:16px; }\n.sch-detail > .field:first-of-type > label,\n.sch-detail .sch-section-label:first-of-type { margin-top:0; }\n/* The two retention windows sit side by side and wrap only on a genuinely narrow pane.\n   .field must be given a BASIS: it is a flex column, so its intrinsic width is its widest child, and the\n   chrono hint under the second input is a long sentence \u2014 left to size itself that field claimed the whole\n   row and both stacked. Verified by measurement, not by looking at the CSS: the first attempt reported\n   two inputs with the labels and placeholders all correct, and they were one above the other. */\n.ret-row { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }\n.ret-row .field { flex:1 1 190px; min-width:0; max-width:260px; }\n.ret-row input { max-width:150px; }\n.sch-msg { font-size:12px; margin-top:6px; }\n.sch-msg.err { color:var(--error); }\n.sch-msg.ok  { color:var(--success); }\n.sch-type-badges .badge { font-size:9px; }\n", "\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n", "\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n"] }]
    }], null, { knowledgeType: [{ type: i0.Input, args: [{ isSignal: true, alias: "knowledgeType", required: true }] }], draft: [{ type: i0.Input, args: [{ isSignal: true, alias: "draft", required: true }] }], libRef: [{ type: i0.Input, args: [{ isSignal: true, alias: "libRef", required: false }] }], linkedProps: [{ type: i0.Input, args: [{ isSignal: true, alias: "linkedProps", required: false }] }], spaceWindowDays: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceWindowDays", required: false }] }], unlink: [{ type: i0.Output, args: ["unlink"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SchemaTypeEditorComponent, { className: "SchemaTypeEditorComponent", filePath: "app/pages/settings/schema-type-editor.component.ts", lineNumber: 314 }); })();
