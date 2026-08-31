/**
 * Settings tab — identity, purpose, and storage limits, grouped into SettingsCards (PR-U9 pt3).
 *
 * Extracted from SpacesComponent (A17.8b). Needs no inputs and no data outputs: SpacesStore owns
 * the server data and SpaceSettingsState owns the dialog form state, and both are services the
 * page provides — so this component just renders them and calls them.
 *
 * The schema-validation controls (`validationMode`, `strictLinkage`) deliberately live on the SCHEMA
 * tab, not here: validation posture governs the schemas, so it belongs beside them (U9 pt3 IA fix).
 * Their state still lives in the shared SpaceSettingsState, so moving the inputs changed nothing about
 * how the footer save persists them.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SPACE_DIALOG_STYLES } from './space-dialog.styles';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
const _c0 = a0 => ({ ceiling: a0 });
function SpaceSettingsTabComponent_Conditional_69_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 23);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.extractionOcr"));
} }
function SpaceSettingsTabComponent_Conditional_70_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 24);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.extractionVlm"));
} }
function SpaceSettingsTabComponent_Conditional_71_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 25);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.extractionRepair"));
} }
function SpaceSettingsTabComponent_Conditional_75_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.settings.extractionCeilingHint", i0.ɵɵpureFunction1(4, _c0, ctx_r0.store.docExtractionCeiling())));
} }
function SpaceSettingsTabComponent_Conditional_94_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 29);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.caption"));
} }
function SpaceSettingsTabComponent_Conditional_95_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 30);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.recognition"));
} }
function SpaceSettingsTabComponent_Conditional_96_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.settings.media.ceilingHint", i0.ɵɵpureFunction1(4, _c0, ctx_r0.mediaCeiling("image"))));
} }
function SpaceSettingsTabComponent_Conditional_111_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 31);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.on"));
} }
function SpaceSettingsTabComponent_Conditional_112_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.settings.media.ceilingHint", i0.ɵɵpureFunction1(4, _c0, ctx_r0.mediaCeiling("audio"))));
} }
function SpaceSettingsTabComponent_Conditional_127_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 32);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.audioOnly"));
} }
function SpaceSettingsTabComponent_Conditional_128_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 33);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.full"));
} }
function SpaceSettingsTabComponent_Conditional_129_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.settings.media.ceilingHint", i0.ɵɵpureFunction1(4, _c0, ctx_r0.mediaCeiling("video"))));
} }
function SpaceSettingsTabComponent_Conditional_144_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 34);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.embed"));
} }
function SpaceSettingsTabComponent_Conditional_145_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "option", 35);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.settings.media.lvl.chunk"));
} }
function SpaceSettingsTabComponent_Conditional_146_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 15);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind2(2, 1, "spaces.settings.media.ceilingHint", i0.ɵɵpureFunction1(4, _c0, ctx_r0.mediaCeiling("text"))));
} }
export class SpaceSettingsTabComponent {
    constructor() {
        this.state = inject(SpaceSettingsState);
        this.store = inject(SpacesStore);
        // ── Field limits, matching the API ────────────────────────────────────────────────────────────────────
        //
        // `usageNotes` had `maxlength="2000"` here while the API accepts 50 000 and the docs say 50 000. A browser
        // does not warn at `maxlength` — it silently refuses the rest of a paste — so an operator who authored
        // 2,377 characters got 2,000 stored, with no error on either side and no counter to notice it by.
        //
        // That field is the instruction sheet an MCP client receives at handshake. A truncated instruction sheet
        // does not fail; it stops instructing, and the rules that get cut are the ones at the END, which is where
        // people put the specific ones. The operator who reported it lost their write-order and repair-on-defect
        // rules and only caught it by reading the field back in the same session.
        //
        // So the cap now matches the API rather than undercutting it by 25x, and both fields show a live count —
        // a limit you cannot see is one you learn about by losing work.
        this.PURPOSE_MAX = 4000;
        this.USAGE_NOTES_MAX = 50_000;
    }
    /** Within 10% of the cap — the point at which a counter should start being noticeable. */
    near(value, max) {
        return (value?.length ?? 0) >= max * 0.9;
    }
    static { this.LADDER = ['off', 'ocr', 'vlm', 'repair']; }
    /** Per-class media ladders, low to high (excluding `auto`, which resolves rather than ranks). Same
     *  contract as the extraction ladder: a level is offered only when it sits at or below the ceiling. */
    static { this.MEDIA_LADDERS = {
        image: ['off', 'caption', 'recognition'],
        audio: ['off', 'on'],
        video: ['off', 'audio', 'full'],
        text: ['off', 'embed', 'chunk'],
    }; }
    /**
     * Whether a concrete extraction mode is within the instance ceiling — so the per-space dropdown only
     * offers levels the space could actually reach. `auto` ceiling imposes no limit; `off`/`auto`/inherit
     * options are always offered separately (a space can always do less, or follow the ceiling).
     */
    isExtractionAllowed(mode) {
        const ceiling = this.store.docExtractionCeiling();
        if (ceiling === 'auto')
            return true;
        return SpaceSettingsTabComponent.LADDER.indexOf(mode) <= SpaceSettingsTabComponent.LADDER.indexOf(ceiling);
    }
    /**
     * Whether a concrete media level is within the instance ceiling for its class — the media analogue of
     * `isExtractionAllowed`, so a per-space picker never offers a level the runtime would silently cap.
     * `auto` ceiling imposes no limit; the stored value is kept visible separately even if since-excluded.
     */
    isMediaAllowed(cls, level) {
        const ceiling = this.store.mediaCeilings()[cls];
        if (ceiling === 'auto')
            return true;
        const ladder = SpaceSettingsTabComponent.MEDIA_LADDERS[cls];
        return ladder.indexOf(level) <= ladder.indexOf(ceiling);
    }
    /** The instance ceiling for a media class (raw level code), for the "capped by the instance" hint. */
    mediaCeiling(cls) {
        return this.store.mediaCeilings()[cls];
    }
    /**
     * Whether to show the ceiling hint for a class: only when the instance imposes a real limit — the
     * ceiling is neither `auto` (no limit) nor the class maximum (a ceiling AT the top caps nothing).
     */
    showMediaCeiling(cls) {
        const ceiling = this.store.mediaCeilings()[cls];
        const ladder = SpaceSettingsTabComponent.MEDIA_LADDERS[cls];
        return ceiling !== 'auto' && ceiling !== ladder[ladder.length - 1];
    }
    static { this.ɵfac = function SpaceSettingsTabComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpaceSettingsTabComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: SpaceSettingsTabComponent, selectors: [["app-space-settings-tab"]], decls: 150, vars: 160, consts: [[2, "display", "flex", "flex-direction", "column", "gap", "16px", "max-width", "720px"], ["icon", "tag", 3, "heading", "purpose"], [1, "field", 2, "margin", "0"], ["type", "text", "maxlength", "200", 3, "ngModelChange", "ngModel"], ["icon", "info", 3, "heading", "purpose"], [1, "field"], [2, "font-size", "11px", "color", "var(--text-muted)", "font-weight", "normal"], ["rows", "6", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], [1, "char-count"], [1, "field", 2, "margin-bottom", "0"], ["rows", "3", 2, "resize", "vertical", 3, "ngModelChange", "ngModel"], ["icon", "database", 3, "heading", "purpose"], [2, "display", "flex", "gap", "24px", "align-items", "flex-start", "flex-wrap", "wrap"], [1, "field", 2, "margin", "0", "max-width", "220px"], ["type", "number", "min", "0", "step", "0.1", 3, "ngModelChange", "ngModel", "placeholder"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-top", "3px"], [1, "field", 2, "margin", "0", "max-width", "260px"], [2, "font-size", "12px", "color", "var(--text-muted)"], ["icon", "package", 3, "heading", "purpose"], [3, "ngModelChange", "ngModel"], ["value", ""], ["value", "auto"], ["value", "off"], ["value", "ocr"], ["value", "vlm"], ["value", "repair"], ["icon", "image", 3, "heading", "purpose"], [2, "display", "flex", "flex-wrap", "wrap", "gap", "16px"], [1, "field", 2, "margin", "0", "max-width", "190px"], ["value", "caption"], ["value", "recognition"], ["value", "on"], ["value", "audio"], ["value", "full"], ["value", "embed"], ["value", "chunk"], [2, "font-size", "11px", "color", "var(--text-muted)", "margin-top", "8px"]], template: function SpaceSettingsTabComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-settings-card", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementStart(4, "div", 2)(5, "label");
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "input", 3);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_input_ngModelChange_8_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.label, $event) || (ctx.state.stForm.label = $event); return $event; });
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(9, "app-settings-card", 4);
            i0.ɵɵpipe(10, "transloco");
            i0.ɵɵpipe(11, "transloco");
            i0.ɵɵelementStart(12, "div", 5)(13, "label");
            i0.ɵɵtext(14);
            i0.ɵɵpipe(15, "transloco");
            i0.ɵɵelementStart(16, "span", 6);
            i0.ɵɵtext(17);
            i0.ɵɵpipe(18, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(19, "textarea", 7);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_textarea_ngModelChange_19_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.purpose, $event) || (ctx.state.stForm.purpose = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(20, "div", 8);
            i0.ɵɵtext(21);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(22, "div", 9)(23, "label");
            i0.ɵɵtext(24);
            i0.ɵɵpipe(25, "transloco");
            i0.ɵɵelementStart(26, "span", 6);
            i0.ɵɵtext(27);
            i0.ɵɵpipe(28, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(29, "textarea", 10);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_textarea_ngModelChange_29_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.usageNotes, $event) || (ctx.state.stForm.usageNotes = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(30, "div", 8);
            i0.ɵɵtext(31);
            i0.ɵɵelementEnd()()();
            i0.ɵɵelementStart(32, "app-settings-card", 11);
            i0.ɵɵpipe(33, "transloco");
            i0.ɵɵpipe(34, "transloco");
            i0.ɵɵelementStart(35, "div", 12)(36, "div", 13)(37, "label");
            i0.ɵɵtext(38);
            i0.ɵɵpipe(39, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(40, "input", 14);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_input_ngModelChange_40_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.maxGiB, $event) || (ctx.state.stForm.maxGiB = $event); return $event; });
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(42, "div", 15);
            i0.ɵɵtext(43);
            i0.ɵɵpipe(44, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(45, "div", 16)(46, "label");
            i0.ɵɵtext(47);
            i0.ɵɵpipe(48, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(49, "div", 17);
            i0.ɵɵtext(50);
            i0.ɵɵpipe(51, "transloco");
            i0.ɵɵelementEnd()()()();
            i0.ɵɵelementStart(52, "app-settings-card", 18);
            i0.ɵɵpipe(53, "transloco");
            i0.ɵɵpipe(54, "transloco");
            i0.ɵɵelementStart(55, "div", 16)(56, "label");
            i0.ɵɵtext(57);
            i0.ɵɵpipe(58, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(59, "select", 19);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_select_ngModelChange_59_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.documentExtraction, $event) || (ctx.state.stForm.documentExtraction = $event); return $event; });
            i0.ɵɵelementStart(60, "option", 20);
            i0.ɵɵtext(61);
            i0.ɵɵpipe(62, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(63, "option", 21);
            i0.ɵɵtext(64);
            i0.ɵɵpipe(65, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(66, "option", 22);
            i0.ɵɵtext(67);
            i0.ɵɵpipe(68, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(69, SpaceSettingsTabComponent_Conditional_69_Template, 3, 3, "option", 23);
            i0.ɵɵconditionalCreate(70, SpaceSettingsTabComponent_Conditional_70_Template, 3, 3, "option", 24);
            i0.ɵɵconditionalCreate(71, SpaceSettingsTabComponent_Conditional_71_Template, 3, 3, "option", 25);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(72, "div", 15);
            i0.ɵɵtext(73);
            i0.ɵɵpipe(74, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(75, SpaceSettingsTabComponent_Conditional_75_Template, 3, 6, "div", 15);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(76, "app-settings-card", 26);
            i0.ɵɵpipe(77, "transloco");
            i0.ɵɵpipe(78, "transloco");
            i0.ɵɵelementStart(79, "div", 27)(80, "div", 28)(81, "label");
            i0.ɵɵtext(82);
            i0.ɵɵpipe(83, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(84, "select", 19);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_select_ngModelChange_84_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.imageAnalysis, $event) || (ctx.state.stForm.imageAnalysis = $event); return $event; });
            i0.ɵɵelementStart(85, "option", 20);
            i0.ɵɵtext(86);
            i0.ɵɵpipe(87, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(88, "option", 21);
            i0.ɵɵtext(89);
            i0.ɵɵpipe(90, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(91, "option", 22);
            i0.ɵɵtext(92);
            i0.ɵɵpipe(93, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(94, SpaceSettingsTabComponent_Conditional_94_Template, 3, 3, "option", 29);
            i0.ɵɵconditionalCreate(95, SpaceSettingsTabComponent_Conditional_95_Template, 3, 3, "option", 30);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(96, SpaceSettingsTabComponent_Conditional_96_Template, 3, 6, "div", 15);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(97, "div", 28)(98, "label");
            i0.ɵɵtext(99);
            i0.ɵɵpipe(100, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(101, "select", 19);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_select_ngModelChange_101_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.audioAnalysis, $event) || (ctx.state.stForm.audioAnalysis = $event); return $event; });
            i0.ɵɵelementStart(102, "option", 20);
            i0.ɵɵtext(103);
            i0.ɵɵpipe(104, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(105, "option", 21);
            i0.ɵɵtext(106);
            i0.ɵɵpipe(107, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(108, "option", 22);
            i0.ɵɵtext(109);
            i0.ɵɵpipe(110, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(111, SpaceSettingsTabComponent_Conditional_111_Template, 3, 3, "option", 31);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(112, SpaceSettingsTabComponent_Conditional_112_Template, 3, 6, "div", 15);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(113, "div", 28)(114, "label");
            i0.ɵɵtext(115);
            i0.ɵɵpipe(116, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(117, "select", 19);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_select_ngModelChange_117_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.videoAnalysis, $event) || (ctx.state.stForm.videoAnalysis = $event); return $event; });
            i0.ɵɵelementStart(118, "option", 20);
            i0.ɵɵtext(119);
            i0.ɵɵpipe(120, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(121, "option", 21);
            i0.ɵɵtext(122);
            i0.ɵɵpipe(123, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(124, "option", 22);
            i0.ɵɵtext(125);
            i0.ɵɵpipe(126, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(127, SpaceSettingsTabComponent_Conditional_127_Template, 3, 3, "option", 32);
            i0.ɵɵconditionalCreate(128, SpaceSettingsTabComponent_Conditional_128_Template, 3, 3, "option", 33);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(129, SpaceSettingsTabComponent_Conditional_129_Template, 3, 6, "div", 15);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(130, "div", 28)(131, "label");
            i0.ɵɵtext(132);
            i0.ɵɵpipe(133, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(134, "select", 19);
            i0.ɵɵtwoWayListener("ngModelChange", function SpaceSettingsTabComponent_Template_select_ngModelChange_134_listener($event) { i0.ɵɵtwoWayBindingSet(ctx.state.stForm.textAnalysis, $event) || (ctx.state.stForm.textAnalysis = $event); return $event; });
            i0.ɵɵelementStart(135, "option", 20);
            i0.ɵɵtext(136);
            i0.ɵɵpipe(137, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(138, "option", 21);
            i0.ɵɵtext(139);
            i0.ɵɵpipe(140, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(141, "option", 22);
            i0.ɵɵtext(142);
            i0.ɵɵpipe(143, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(144, SpaceSettingsTabComponent_Conditional_144_Template, 3, 3, "option", 34);
            i0.ɵɵconditionalCreate(145, SpaceSettingsTabComponent_Conditional_145_Template, 3, 3, "option", 35);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(146, SpaceSettingsTabComponent_Conditional_146_Template, 3, 6, "div", 15);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(147, "div", 36);
            i0.ɵɵtext(148);
            i0.ɵɵpipe(149, "transloco");
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 76, "spaces.settings.card.identity"))("purpose", i0.ɵɵpipeBind1(3, 78, "spaces.settings.card.identityHint"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 80, "spaces.settings.label"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.label);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(10, 82, "spaces.settings.card.purpose"))("purpose", i0.ɵɵpipeBind1(11, 84, "spaces.settings.card.purposeCardHint"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(15, 86, "spaces.settings.purpose"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(18, 88, "spaces.settings.purposeHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.purpose);
            i0.ɵɵattribute("maxlength", ctx.PURPOSE_MAX);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("near", ctx.near(ctx.state.stForm.purpose, ctx.PURPOSE_MAX));
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate2("", (ctx.state.stForm.purpose || "").length, " / ", ctx.PURPOSE_MAX);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(25, 90, "spaces.settings.usageNotes"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(28, 92, "spaces.settings.usageNotesHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.usageNotes);
            i0.ɵɵattribute("maxlength", ctx.USAGE_NOTES_MAX);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("near", ctx.near(ctx.state.stForm.usageNotes, ctx.USAGE_NOTES_MAX));
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate2("", (ctx.state.stForm.usageNotes || "").length, " / ", ctx.USAGE_NOTES_MAX);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(33, 94, "spaces.settings.card.limits"))("purpose", i0.ɵɵpipeBind1(34, 96, "spaces.settings.card.limitsHint"));
            i0.ɵɵadvance(6);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(39, 98, "spaces.settings.maxStorage"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.maxGiB);
            i0.ɵɵproperty("placeholder", i0.ɵɵpipeBind1(41, 100, "spaces.settings.unlimitedPlaceholder"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(44, 102, "spaces.settings.maxStorageHint"));
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(48, 104, "spaces.settings.recordTtl"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(51, 106, "spaces.settings.recordTtlMoved"));
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(53, 108, "spaces.settings.card.extraction"))("purpose", i0.ɵɵpipeBind1(54, 110, "spaces.settings.card.extractionHint"));
            i0.ɵɵadvance(5);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(58, 112, "spaces.settings.extractionMode"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.documentExtraction);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(62, 114, "spaces.settings.extractionInherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(65, 116, "spaces.settings.extractionAuto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(68, 118, "spaces.settings.extractionOff"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.isExtractionAllowed("ocr") || ctx.state.stForm.documentExtraction === "ocr" ? 69 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isExtractionAllowed("vlm") || ctx.state.stForm.documentExtraction === "vlm" ? 70 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isExtractionAllowed("repair") || ctx.state.stForm.documentExtraction === "repair" ? 71 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(74, 120, "spaces.settings.extractionHint"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.store.docExtractionCeiling() !== "auto" && ctx.store.docExtractionCeiling() !== "repair" ? 75 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(77, 122, "spaces.settings.card.media"))("purpose", i0.ɵɵpipeBind1(78, 124, "spaces.settings.card.mediaHint"));
            i0.ɵɵadvance(6);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(83, 126, "spaces.settings.media.image"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.imageAnalysis);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(87, 128, "spaces.settings.media.lvl.inherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(90, 130, "spaces.settings.media.lvl.auto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(93, 132, "spaces.settings.media.lvl.off"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.isMediaAllowed("image", "caption") || ctx.state.stForm.imageAnalysis === "caption" ? 94 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isMediaAllowed("image", "recognition") || ctx.state.stForm.imageAnalysis === "recognition" ? 95 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showMediaCeiling("image") ? 96 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(100, 134, "spaces.settings.media.audio"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.audioAnalysis);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(104, 136, "spaces.settings.media.lvl.inherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(107, 138, "spaces.settings.media.lvl.auto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(110, 140, "spaces.settings.media.lvl.off"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.isMediaAllowed("audio", "on") || ctx.state.stForm.audioAnalysis === "on" ? 111 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showMediaCeiling("audio") ? 112 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(116, 142, "spaces.settings.media.video"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.videoAnalysis);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(120, 144, "spaces.settings.media.lvl.inherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(123, 146, "spaces.settings.media.lvl.auto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(126, 148, "spaces.settings.media.lvl.off"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.isMediaAllowed("video", "audio") || ctx.state.stForm.videoAnalysis === "audio" ? 127 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isMediaAllowed("video", "full") || ctx.state.stForm.videoAnalysis === "full" ? 128 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showMediaCeiling("video") ? 129 : -1);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(133, 150, "spaces.settings.media.text"));
            i0.ɵɵadvance(2);
            i0.ɵɵtwoWayProperty("ngModel", ctx.state.stForm.textAnalysis);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(137, 152, "spaces.settings.media.lvl.inherit"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(140, 154, "spaces.settings.media.lvl.auto"));
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(143, 156, "spaces.settings.media.lvl.off"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.isMediaAllowed("text", "embed") || ctx.state.stForm.textAnalysis === "embed" ? 144 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.isMediaAllowed("text", "chunk") || ctx.state.stForm.textAnalysis === "chunk" ? 145 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showMediaCeiling("text") ? 146 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(149, 158, "spaces.settings.media.hint"));
        } }, dependencies: [CommonModule, FormsModule, i1.NgSelectOption, i1.ɵNgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.SelectControlValueAccessor, i1.NgControlStatus, i1.MaxLengthValidator, i1.MinValidator, i1.NgModel, SettingsCardComponent, TranslocoPipe], styles: [".chip-wrap[_ngcontent-%COMP%] {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip[_ngcontent-%COMP%] {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm[_ngcontent-%COMP%] { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm[_ngcontent-%COMP%]:hover { color:var(--danger); }\n.chip-field[_ngcontent-%COMP%] { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n\n\n.prop-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n\n\n.prop-row[_ngcontent-%COMP%] { cursor:pointer; user-select:none; }\n.prop-row[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret[_ngcontent-%COMP%] { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row[_ngcontent-%COMP%]:hover   .prop-caret[_ngcontent-%COMP%], .prop-row.prow-open[_ngcontent-%COMP%]   .prop-caret[_ngcontent-%COMP%] { color:var(--accent); }\n\n\n.prop-name[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key[_ngcontent-%COMP%] { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n\n\n.prop-expand-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner[_ngcontent-%COMP%] { padding:12px 16px; }\n\n\n.pdet[_ngcontent-%COMP%] { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n\n\n.pdet-fields[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] { margin:0; min-width:0; }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%], .pdet-full[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .pdet-fields[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] { width:100%; }\n.pdet-full[_ngcontent-%COMP%] { padding:0 16px 14px; }\n\n\n.req-toggle[_ngcontent-%COMP%] { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle[_ngcontent-%COMP%]:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle[_ngcontent-%COMP%]:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req[_ngcontent-%COMP%] { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n\n\n.req-toggle[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n\n\n.req-toggle[_ngcontent-%COMP%]::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req[_ngcontent-%COMP%]::before { background:currentColor; }\n\n\n\n.st-bar[_ngcontent-%COMP%] { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill[_ngcontent-%COMP%] { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok[_ngcontent-%COMP%]     { background:var(--success); }\n.st-bar-fill.warn[_ngcontent-%COMP%]   { background:var(--warning); }\n.st-bar-fill.danger[_ngcontent-%COMP%] { background:var(--danger); }\n\n\n.drag-handle[_ngcontent-%COMP%] { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.drag-handle-disabled[_ngcontent-%COMP%] { cursor:default; opacity:0.3; }\n.drag-handle-disabled[_ngcontent-%COMP%]:hover { color:var(--text-muted); }\n.cdk-drag-preview[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder[_ngcontent-%COMP%] { opacity:0.3; }\n.cdk-drag-animating[_ngcontent-%COMP%] { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n\n\n.sort-group[_ngcontent-%COMP%] { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn[_ngcontent-%COMP%] { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn[_ngcontent-%COMP%]:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active[_ngcontent-%COMP%] { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n\n\n\n\n\n\n.space-search-input[_ngcontent-%COMP%] { min-width:160px; }\n\n\n.dialog-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog[_ngcontent-%COMP%] { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header[_ngcontent-%COMP%] { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n\n\n.sp-backdrop[_ngcontent-%COMP%] { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel[_ngcontent-%COMP%] { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header[_ngcontent-%COMP%] { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n\n\n\n\n.sp-tabs[_ngcontent-%COMP%] { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs[_ngcontent-%COMP%]    > .sp-tab[_ngcontent-%COMP%] { flex:none; white-space:nowrap; }\n.sp-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sp-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active[_ngcontent-%COMP%] { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body[_ngcontent-%COMP%] { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer[_ngcontent-%COMP%] { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n\n\n.sch-section[_ngcontent-%COMP%] { margin-bottom:28px; }\n.sch-section-title[_ngcontent-%COMP%] { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n\n\n.dz-section[_ngcontent-%COMP%] { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red[_ngcontent-%COMP%] { border-color:var(--danger); }\n.dz-section-title[_ngcontent-%COMP%] { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red[_ngcontent-%COMP%]   .dz-section-title[_ngcontent-%COMP%] { color:var(--danger); }\n\n\n\n\n.dz-hint[_ngcontent-%COMP%] { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n\n\n\n\n.ttl-grid[_ngcontent-%COMP%] { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] { max-width:120px; }\n.ttl-grid[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n\n\n.sch-coll-tabs[_ngcontent-%COMP%] { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab[_ngcontent-%COMP%] { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab[_ngcontent-%COMP%]:hover { color:var(--text-primary); }\n.sch-coll-tab.active[_ngcontent-%COMP%] { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge[_ngcontent-%COMP%] { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body[_ngcontent-%COMP%] { padding:20px 0 0; }\n\n\n.type-table[_ngcontent-%COMP%] { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] { background:var(--bg-elevated); }\n\n\n\n\n\n.sch-sub[_ngcontent-%COMP%] { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }", "\n\n    .char-count[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 3px;\n      font-variant-numeric: tabular-nums; }\n    .char-count.near[_ngcontent-%COMP%] { color: var(--warning); font-weight: 600; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpaceSettingsTabComponent, [{
        type: Component,
        args: [{ selector: 'app-space-settings-tab', standalone: true, imports: [CommonModule, FormsModule, TranslocoPipe, SettingsCardComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<div style="display:flex;flex-direction:column;gap:16px;max-width:720px;">

  <app-settings-card icon="tag" [heading]="'spaces.settings.card.identity' | transloco" [purpose]="'spaces.settings.card.identityHint' | transloco">
    <div class="field" style="margin:0;">
      <label>{{ 'spaces.settings.label' | transloco }}</label>
      <input type="text" [(ngModel)]="state.stForm.label" maxlength="200" />
    </div>
  </app-settings-card>

  <app-settings-card icon="info" [heading]="'spaces.settings.card.purpose' | transloco" [purpose]="'spaces.settings.card.purposeCardHint' | transloco">
    <div class="field">
      <label>{{ 'spaces.settings.purpose' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.purposeHint' | transloco }}</span></label>
      <textarea [(ngModel)]="state.stForm.purpose" rows="6" [attr.maxlength]="PURPOSE_MAX" style="resize:vertical;"></textarea>
      <div class="char-count" [class.near]="near(state.stForm.purpose, PURPOSE_MAX)">{{ (state.stForm.purpose || '').length }} / {{ PURPOSE_MAX }}</div>
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>{{ 'spaces.settings.usageNotes' | transloco }} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">{{ 'spaces.settings.usageNotesHint' | transloco }}</span></label>
      <textarea [(ngModel)]="state.stForm.usageNotes" rows="3" [attr.maxlength]="USAGE_NOTES_MAX" style="resize:vertical;"></textarea>
      <div class="char-count" [class.near]="near(state.stForm.usageNotes, USAGE_NOTES_MAX)">{{ (state.stForm.usageNotes || '').length }} / {{ USAGE_NOTES_MAX }}</div>
    </div>
  </app-settings-card>

  <app-settings-card icon="database" [heading]="'spaces.settings.card.limits' | transloco" [purpose]="'spaces.settings.card.limitsHint' | transloco">
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
      <div class="field" style="margin:0;max-width:220px;">
        <label>{{ 'spaces.settings.maxStorage' | transloco }}</label>
        <input type="number" [(ngModel)]="state.stForm.maxGiB" min="0" step="0.1" [placeholder]="'spaces.settings.unlimitedPlaceholder' | transloco" />
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.maxStorageHint' | transloco }}</div>
      </div>
      <!-- Retention moved to the Danger Zone (owner call, 2026-08-02). It DELETES records, which is what the
           Danger Zone is for, and it sat here beside a storage cap that only refuses new writes — two very
           different consequences in one card. The pointer stays so nobody concludes the setting vanished. -->
      <div class="field" style="margin:0;max-width:260px;">
        <label>{{ 'spaces.settings.recordTtl' | transloco }}</label>
        <div style="font-size:12px;color:var(--text-muted);">{{ 'spaces.settings.recordTtlMoved' | transloco }}</div>
      </div>
    </div>
  </app-settings-card>

  <app-settings-card icon="package" [heading]="'spaces.settings.card.extraction' | transloco" [purpose]="'spaces.settings.card.extractionHint' | transloco">
    <div class="field" style="margin:0;max-width:260px;">
      <label>{{ 'spaces.settings.extractionMode' | transloco }}</label>
      <select [(ngModel)]="state.stForm.documentExtraction">
        <option value="">{{ 'spaces.settings.extractionInherit' | transloco }}</option>
        <option value="auto">{{ 'spaces.settings.extractionAuto' | transloco }}</option>
        <option value="off">{{ 'spaces.settings.extractionOff' | transloco }}</option>
        <!-- Only offer modes within the instance ceiling: a space can't extract more than the instance
             allows, so a higher option would just be silently capped. The current value is always kept
             visible, even if a since-lowered ceiling now excludes it. -->
        @if (isExtractionAllowed('ocr') || state.stForm.documentExtraction === 'ocr') { <option value="ocr">{{ 'spaces.settings.extractionOcr' | transloco }}</option> }
        @if (isExtractionAllowed('vlm') || state.stForm.documentExtraction === 'vlm') { <option value="vlm">{{ 'spaces.settings.extractionVlm' | transloco }}</option> }
        @if (isExtractionAllowed('repair') || state.stForm.documentExtraction === 'repair') { <option value="repair">{{ 'spaces.settings.extractionRepair' | transloco }}</option> }
      </select>
      <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.extractionHint' | transloco }}</div>
      @if (store.docExtractionCeiling() !== 'auto' && store.docExtractionCeiling() !== 'repair') {
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.extractionCeilingHint' | transloco: { ceiling: store.docExtractionCeiling() } }}</div>
      }
    </div>
  </app-settings-card>

  <app-settings-card icon="image" [heading]="'spaces.settings.card.media' | transloco" [purpose]="'spaces.settings.card.mediaHint' | transloco">
    <div style="display:flex; flex-wrap:wrap; gap:16px;">
      <div class="field" style="margin:0; max-width:190px;">
        <label>{{ 'spaces.settings.media.image' | transloco }}</label>
        <select [(ngModel)]="state.stForm.imageAnalysis">
          <option value="">{{ 'spaces.settings.media.lvl.inherit' | transloco }}</option>
          <option value="auto">{{ 'spaces.settings.media.lvl.auto' | transloco }}</option>
          <option value="off">{{ 'spaces.settings.media.lvl.off' | transloco }}</option>
          @if (isMediaAllowed('image', 'caption') || state.stForm.imageAnalysis === 'caption') { <option value="caption">{{ 'spaces.settings.media.lvl.caption' | transloco }}</option> }
          @if (isMediaAllowed('image', 'recognition') || state.stForm.imageAnalysis === 'recognition') { <option value="recognition">{{ 'spaces.settings.media.lvl.recognition' | transloco }}</option> }
        </select>
        @if (showMediaCeiling('image')) {
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.media.ceilingHint' | transloco: { ceiling: mediaCeiling('image') } }}</div>
        }
      </div>
      <div class="field" style="margin:0; max-width:190px;">
        <label>{{ 'spaces.settings.media.audio' | transloco }}</label>
        <select [(ngModel)]="state.stForm.audioAnalysis">
          <option value="">{{ 'spaces.settings.media.lvl.inherit' | transloco }}</option>
          <option value="auto">{{ 'spaces.settings.media.lvl.auto' | transloco }}</option>
          <option value="off">{{ 'spaces.settings.media.lvl.off' | transloco }}</option>
          @if (isMediaAllowed('audio', 'on') || state.stForm.audioAnalysis === 'on') { <option value="on">{{ 'spaces.settings.media.lvl.on' | transloco }}</option> }
        </select>
        @if (showMediaCeiling('audio')) {
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.media.ceilingHint' | transloco: { ceiling: mediaCeiling('audio') } }}</div>
        }
      </div>
      <div class="field" style="margin:0; max-width:190px;">
        <label>{{ 'spaces.settings.media.video' | transloco }}</label>
        <select [(ngModel)]="state.stForm.videoAnalysis">
          <option value="">{{ 'spaces.settings.media.lvl.inherit' | transloco }}</option>
          <option value="auto">{{ 'spaces.settings.media.lvl.auto' | transloco }}</option>
          <option value="off">{{ 'spaces.settings.media.lvl.off' | transloco }}</option>
          @if (isMediaAllowed('video', 'audio') || state.stForm.videoAnalysis === 'audio') { <option value="audio">{{ 'spaces.settings.media.lvl.audioOnly' | transloco }}</option> }
          @if (isMediaAllowed('video', 'full') || state.stForm.videoAnalysis === 'full') { <option value="full">{{ 'spaces.settings.media.lvl.full' | transloco }}</option> }
        </select>
        @if (showMediaCeiling('video')) {
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.media.ceilingHint' | transloco: { ceiling: mediaCeiling('video') } }}</div>
        }
      </div>
      <div class="field" style="margin:0; max-width:190px;">
        <label>{{ 'spaces.settings.media.text' | transloco }}</label>
        <select [(ngModel)]="state.stForm.textAnalysis">
          <option value="">{{ 'spaces.settings.media.lvl.inherit' | transloco }}</option>
          <option value="auto">{{ 'spaces.settings.media.lvl.auto' | transloco }}</option>
          <option value="off">{{ 'spaces.settings.media.lvl.off' | transloco }}</option>
          @if (isMediaAllowed('text', 'embed') || state.stForm.textAnalysis === 'embed') { <option value="embed">{{ 'spaces.settings.media.lvl.embed' | transloco }}</option> }
          @if (isMediaAllowed('text', 'chunk') || state.stForm.textAnalysis === 'chunk') { <option value="chunk">{{ 'spaces.settings.media.lvl.chunk' | transloco }}</option> }
        </select>
        @if (showMediaCeiling('text')) {
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">{{ 'spaces.settings.media.ceilingHint' | transloco: { ceiling: mediaCeiling('text') } }}</div>
        }
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">{{ 'spaces.settings.media.hint' | transloco }}</div>
  </app-settings-card>

</div>
  `, styles: ["\n\n.chip-wrap {\n  display:flex; flex-wrap:wrap; gap:4px; align-items:center;\n  border:1px solid var(--border); border-radius:var(--radius-sm);\n  padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text;\n}\n.chip {\n  display:inline-flex; align-items:center; gap:3px;\n  background:color-mix(in srgb,var(--accent) 15%,transparent);\n  color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px;\n}\n.chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }\n.chip-rm:hover { color:var(--danger); }\n.chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }\n\n\n/* \u2500\u2500 the table \u2500\u2500 */\n.prop-table { width:100%; border-collapse:collapse; font-size:13px; }\n.prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }\n.prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }\n/* \u2500\u2500 property rows \u2500\u2500 */\n.prop-row { cursor:pointer; user-select:none; }\n.prop-row:hover td { background:var(--bg-elevated); }\n.prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }\n.prop-row.prow-open td:first-child { box-shadow:inset 2px 0 0 var(--accent); }\n.prop-caret { color:var(--text-muted); flex-shrink:0; display:inline-flex; transition:color .15s; }\n.prop-row:hover .prop-caret, .prop-row.prow-open .prop-caret { color:var(--accent); }\n/* The name is the row identity, so it does not shrink when the constraint column is long. */\n.prop-name { display:flex; align-items:center; gap:8px; min-width:0; }\n.prop-name-key { font-family:var(--font-mono); font-size:12px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 expanded detail card \u2500\u2500 */\n.prop-expand-row td { background:var(--bg-elevated); padding:0; }\n.prop-expand-inner { padding:12px 16px; }\n/* Inset on the left so the card reads as belonging to the row above rather than as a sibling of the table. */\n.pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 45%,transparent); }\n/* auto-fit, not repeat(3,1fr): three fixed columns in a narrow dialog wrap every label. */\n.pdet-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px 16px; padding:14px 16px; }\n.pdet-fields .field { margin:0; min-width:0; }\n.pdet-fields .field label, .pdet-full .field label { display:block; margin-bottom:4px; font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--text-muted); }\n.pdet-fields .field input, .pdet-fields .field select { width:100%; }\n.pdet-full { padding:0 16px 14px; }\n/* \u2500\u2500 the Required toggle \u2500\u2500 */\n.req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1; white-space:nowrap; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:4px 9px; border-radius:999px; transition:all .15s; }\n.req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }\n.req-toggle:focus-within { outline:2px solid var(--accent); outline-offset:1px; }\n.req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }\n/* Visually hidden, not display:none \u2014 a removed input is not focusable and not announced. */\n.req-toggle input { position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }\n/* The dot IS the state, since the native box cannot be styled to match anything around it. */\n.req-toggle::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; border:1px solid currentColor; transition:background .15s; }\n.req-toggle.is-req::before { background:currentColor; }\n\n/* storage bar */\n.st-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; }\n.st-bar-fill { height:100%; border-radius:3px; transition:width .3s; }\n.st-bar-fill.ok     { background:var(--success); }\n.st-bar-fill.warn   { background:var(--warning); }\n.st-bar-fill.danger { background:var(--danger); }\n/* drag handle */\n.drag-handle { cursor:grab; color:var(--text-muted); padding:0 4px; user-select:none; font-size:16px; line-height:1; }\n.drag-handle:hover { color:var(--text-primary); }\n.drag-handle-disabled { cursor:default; opacity:0.3; }\n.drag-handle-disabled:hover { color:var(--text-muted); }\n.cdk-drag-preview { background:var(--bg-primary); border:1px solid var(--accent); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); opacity:0.95; }\n.cdk-drag-placeholder { opacity:0.3; }\n.cdk-drag-animating { transition:transform 250ms cubic-bezier(0,0,0.2,1); }\n/* sort buttons */\n.sort-group { display:flex; gap:2px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }\n.sort-btn { background:none; border:none; padding:3px 8px; font-size:12px; cursor:pointer; color:var(--text-muted); font-family:var(--font); transition:background .15s,color .15s; white-space:nowrap; }\n.sort-btn:hover { background:var(--bg-surface); color:var(--text-primary); }\n.sort-btn.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }\n/* search input */\n/* Only what the global input rule does not decide. This used to set its own height (28px), its own padding, and --\n   the real defect -- background:var(--bg-surface), which made it the one input in the product sitting on a different\n   surface token from every other. */\n.space-search-input { min-width:160px; }\n/* create dialog */\n.dialog-backdrop { position:fixed; inset:0; background:var(--bg-scrim); display:flex; align-items:center; justify-content:center; z-index:100; }\n.dialog { background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; width:90%; max-width:960px; max-height:90vh; overflow-y:auto; }\n.dialog-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }\n/* settings popup */\n.sp-backdrop { position:fixed; inset:0; background:var(--bg-scrim); z-index:200; display:flex; align-items:center; justify-content:center; }\n.sp-panel { width:92vw; height:92vh; max-width:1200px; background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-lg); display:flex; flex-direction:column; overflow:hidden; }\n.sp-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }\n/* Wraps rather than clips: Danger Zone is the last tab and was the first to vanish in a narrow dialog,\n   which is a poor thing to make unreachable. Wrapping over a scroller for the same reason as the global\n   .tabs \u2014 a scrolled strip looks exactly like a clipped one, so nothing signals the missing tabs. */\n.sp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); flex-shrink:0;\n  background:var(--bg-surface); }\n.sp-tabs > .sp-tab { flex:none; white-space:nowrap; }\n.sp-tab { background:none; border:none; border-bottom:2px solid transparent; padding:10px 20px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); transition:color .15s; }\n.sp-tab:hover { color:var(--text-primary); }\n.sp-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:500; }\n.sp-tab.danger-tab.active { color:var(--danger); border-bottom-color:var(--danger); }\n.sp-body { flex:1; overflow-y:auto; padding:24px; }\n.sp-footer { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid var(--border); flex-shrink:0; }\n/* schema */\n.sch-section { margin-bottom:28px; }\n.sch-section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }\n.sch-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }\n.sch-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }\n/* danger zone */\n.dz-section { border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; }\n.dz-section.dz-red { border-color:var(--danger); }\n.dz-section-title { font-weight:600; margin-bottom:6px; font-size:14px; }\n.dz-section.dz-red .dz-section-title { color:var(--danger); }\n/* A secondary note inside a danger-zone section \u2014 for a pointer to a control that lives elsewhere, which must\n   NOT get a heading: a heading promises a control, and a reader who finds none cannot tell what the block is\n   for (reported verbatim by an operator). */\n.dz-hint { font-size:12px; color:var(--text-muted); margin:2px 0 0; }\n/* The five retention buckets. auto-fit with a minimum rather than five fixed columns, so a narrow dialog wraps\n   to two rows instead of overflowing; the inputs are capped because a day count is three digits at most.\n   NO BACKTICKS in this file \u2014 it is one template string, and one backtick ends it.  */\n.ttl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr)); gap:10px 12px; }\n.ttl-grid input { max-width:120px; }\n.ttl-grid label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n/* \u2500\u2500 schema: top-level collection tabs \u2500\u2500 */\n.sch-coll-tabs { display:flex; border-bottom:2px solid var(--border); margin-bottom:0; overflow-x:auto; gap:0; flex-shrink:0; }\n.sch-coll-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:10px 22px; cursor:pointer; font-size:13px; font-family:var(--font); color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; transition:color .15s; white-space:nowrap; }\n.sch-coll-tab:hover { color:var(--text-primary); }\n.sch-coll-tab.active { color:var(--text-primary); border-bottom-color:var(--accent); font-weight:600; }\n.sch-cnt-badge { background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); font-size:10px; font-weight:700; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }\n.sch-coll-body { padding:20px 0 0; }\n/* \u2500\u2500 type-list table (entity types / edge labels) \u2500\u2500 */\n.type-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }\n.type-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:5px 10px; border-bottom:1px solid var(--border); background:var(--bg-elevated); }\n.type-table td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }\n.type-table tr:hover td { background:var(--bg-elevated); }\n/* The property table, its rows, its detail card and the Required toggle are interpolated at the top of this\n   const from PROP_TABLE_STYLES \u2014 three components render them, so they are not owned by this file. */\n/* \u2500\u2500 schema sub-section headers \u2500\u2500 */\n.sch-sub { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); padding:14px 0 8px; margin-bottom:2px; }\n", "\n    /* A cap you cannot see is one you only learn about by losing work. Muted until it matters, then not. */\n    .char-count { font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 3px;\n      font-variant-numeric: tabular-nums; }\n    .char-count.near { color: var(--warning); font-weight: 600; }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(SpaceSettingsTabComponent, { className: "SpaceSettingsTabComponent", filePath: "app/pages/settings/space-settings-tab.component.ts", lineNumber: 154 }); })();
