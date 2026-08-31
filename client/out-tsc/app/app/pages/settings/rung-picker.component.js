import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.rung;
function RungPickerComponent_For_1_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵdomElementStart(0, "button", 1);
    i0.ɵɵdomListener("click", function RungPickerComponent_For_1_Template_button_click_0_listener() { const s_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.pick(s_r2.rung)); });
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const s_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵclassMap(s_r2.classes);
    i0.ɵɵdomProperty("disabled", s_r2.clamped || ctx_r2.readonlyView());
    i0.ɵɵattribute("aria-pressed", s_r2.filled)("title", s_r2.title);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(s_r2.label);
} }
export const RUNGS = ['none', 'read', 'write', 'admin'];
const RANK = { none: 0, read: 1, write: 2, admin: 3 };
/** What each rung is called in the grid. Short, because a matrix cell has no room for a sentence. */
const LABEL = { none: '—', read: 'R', write: 'W', admin: 'A' };
/**
 * One cell of the rights matrix: an escalation, not four checkboxes.
 *
 * ## Why an escalation
 *
 * Each rung CONTAINS the one below it, so "write but not read" is not a thing that can be expressed. Four
 * checkboxes would let somebody save it, and the server would then have to decide what it meant — which is
 * a decision nobody should be making at read time.
 *
 * ## Two behaviours that are easy to get wrong
 *
 *  - **Clicking the current rung steps DOWN one.** Without it, a cell can only ever go up by clicking and
 *    down by clicking a specific lower segment, which reads as "the control resists being narrowed".
 *  - **Rungs below the floor are clamped, not hidden.** The floor is set on another row entirely, so a cell
 *    that silently refuses to go lower with no visible reason looks broken. Dimmed-and-titled says why.
 *
 * ## Two sources of a minimum, one clamp
 *
 * A cell also cannot go below what another AREA entails: `knowledge: write` needs `schema: read` to be
 * exercisable at all, so the server grants it (`RUNG_IMPLICATIONS`, resolved in `effectiveRung`). Both the
 * floor and an implication are the same thing to this control — a minimum with a reason — so they share one
 * clamp rather than getting one mechanism each. The title names whichever is BINDING, because a reader who
 * cannot lower a cell wants the one fact that would let them.
 *
 * The implication is not hard-coded here. It arrives from `GET /api/tokens/rights-catalog`, which publishes
 * what the server enforces; a copy typed into the client would be a second description of a security rule.
 *
 * ## The tooltip says what the rung GRANTS, then what the click does
 *
 * Owner, 2026-08-15: *"the tooltip on hovering a rung is still missing."* It was not absent — it was
 * answering the wrong question. It read `Set write` and `Set write — click again to step down`, which
 * describes the CLICK. Somebody hovering a cell in a permissions grid is asking what the rung grants; the
 * click is confirmation of a choice they have already made.
 *
 * The answer was already written and already translated — sixteen `tokens.rights.plain.<area>.<rung>` strings
 * in all three locales, which the column-header glyph has been using all along. This control could not reach
 * them for one reason: it did not know its own area. Both call sites have it in scope, so it is now an input.
 *
 * Capability first, action second, and when a cell is clamped the clamp explanation is APPENDED rather than
 * substituted — "why can I not go lower" is still a live question in that state, but so is "what would it
 * give me if I could".
 */
export class RungPickerComponent {
    constructor() {
        this.t = inject(TranslocoService);
        this.value = input.required(...(ngDevMode ? [{ debugName: "value" }] : /* istanbul ignore next */ []));
        /**
         * Which area this cell is for, so the tooltip can say what the rung GRANTS.
         *
         * Both call sites already have it in scope. Without it the control could only describe its own click, which
         * is the defect — see the class comment.
         */
        this.area = input('', ...(ngDevMode ? [{ debugName: "area" }] : /* istanbul ignore next */ []));
        /** The floor for this area. A cell may never sit below it — see the class comment. */
        this.floor = input('none', ...(ngDevMode ? [{ debugName: "floor" }] : /* istanbul ignore next */ []));
        /** A minimum entailed by another area in the same space, or `none`. See the class comment. */
        this.implied = input('none', ...(ngDevMode ? [{ debugName: "implied" }] : /* istanbul ignore next */ []));
        /** Which area entails `implied`, and at what rung — for the title. Ignored when `implied` is `none`. */
        this.impliedBy = input(null, ...(ngDevMode ? [{ debugName: "impliedBy" }] : /* istanbul ignore next */ []));
        /**
         * Display only: every segment is disabled and no click emits.
         *
         * Added for the read-only view of a token`s OWN rights, so that view reuses this renderer instead of a
         * second one. Two renderers of a permission grid is two places the colours and the clamping can disagree,
         * and the one people trust would be whichever they happened to open.
         */
        this.readonlyView = input(false, ...(ngDevMode ? [{ debugName: "readonlyView" }] : /* istanbul ignore next */ []));
        this.changed = output();
        /** The binding minimum: the higher of the floor and whatever another area entails. */
        this.minRung = computed(() => RANK[this.implied()] > RANK[this.floor()] ? this.implied() : this.floor(), ...(ngDevMode ? [{ debugName: "minRung" }] : /* istanbul ignore next */ []));
        /**
         * Why the cell will not go lower — naming the SOURCE that is actually binding.
         *
         * When both apply, the higher one wins and is the one worth explaining: telling somebody about the floor
         * while an implication holds the cell two rungs above it sends them to change the wrong control.
         */
        this.clampTitle = computed(() => {
            const by = this.impliedBy();
            return RANK[this.implied()] > RANK[this.floor()] && by
                ? this.t.translate('tokens.rights.clamp.implied', { rung: this.implied(), area: this.t.translate('tokens.rights.area.' + by.area), cause: by.rung })
                : this.t.translate('tokens.rights.clamp.floor', { rung: this.floor() });
        }, ...(ngDevMode ? [{ debugName: "clampTitle" }] : /* istanbul ignore next */ []));
        this.segments = computed(() => {
            const held = RANK[this.value()];
            const min = RANK[this.minRung()];
            const clampTitle = this.clampTitle();
            return RUNGS.map((rung, i) => {
                const clamped = i < min;
                const filled = i <= held;
                return {
                    rung, label: LABEL[rung], clamped, filled,
                    // The colour comes from the SELECTED rung, not from each segment's own level, so a filled bar reads
                    // as one block at one level rather than a gradient nobody asked for.
                    classes: `${filled ? `on r${held}` : ''}${clamped ? ' clamped' : ''}`,
                    // Capability FIRST, action second. Somebody hovering a rung is asking what it grants, not what the
                    // click does — the click is confirmation, and it was all this control used to say.
                    //
                    // Joined through a filter rather than by interpolation: with no `[area]` wired the capability half is
                    // empty, and interpolating it would leave a leading space on every tooltip in the grid.
                    title: [this.grants(rung), clamped ? clampTitle : this.action(rung)].filter(Boolean).join(' '),
                };
            });
        }, ...(ngDevMode ? [{ debugName: "segments" }] : /* istanbul ignore next */ []));
    }
    /**
     * What this rung GRANTS in this area, in the words the glyph tooltip already uses.
     *
     * Sixteen `tokens.rights.plain.<area>.<rung>` strings exist in all three locales and this control was not
     * reading any of them — it described the CLICK instead ("Set write", "Set write — click again to step
     * down"), which answers a question nobody hovering has. Owner, 2026-08-15: *"the tooltip on hovering a rung
     * is still missing."* It was not absent; it was answering the wrong question.
     *
     * Falls back to the empty string when the area is not wired or the key is missing, so a caller that forgot
     * `[area]` degrades to the old action-only tooltip rather than printing a raw translation key at a user.
     */
    grants(rung) {
        const a = this.area();
        if (!a)
            return '';
        const key = `tokens.rights.plain.${a}.${rung}`;
        const text = this.t.translate(key);
        return text === key ? '' : `${text}`;
    }
    /** What the click will do. Kept, because a reader still needs to know a second click steps down. */
    action(rung) {
        return `Set ${rung}${rung === this.value() ? ' — click again to step down' : ''}`;
    }
    pick(rung) {
        // Belt and braces: a disabled button cannot be clicked, but a caller could still call this.
        if (this.readonlyView())
            return;
        const min = this.minRung();
        if (RANK[rung] < RANK[min])
            return;
        // Clicking the rung you are already on steps down one, never below the minimum. A control that can only
        // climb reads as resisting being narrowed, which is the direction anyone auditing wants to move.
        const next = rung === this.value()
            ? RUNGS[Math.max(RANK[min], RANK[rung] - 1)]
            : rung;
        if (next !== this.value())
            this.changed.emit(next);
    }
    static { this.ɵfac = function RungPickerComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RungPickerComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RungPickerComponent, selectors: [["app-rung-picker"]], inputs: { value: [1, "value"], area: [1, "area"], floor: [1, "floor"], implied: [1, "implied"], impliedBy: [1, "impliedBy"], readonlyView: [1, "readonlyView"] }, outputs: { changed: "changed" }, decls: 2, vars: 0, consts: [["type", "button", 3, "class", "disabled"], ["type", "button", 3, "click", "disabled"]], template: function RungPickerComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵrepeaterCreate(0, RungPickerComponent_For_1_Template, 2, 6, "button", 0, _forTrack0);
        } if (rf & 2) {
            i0.ɵɵrepeater(ctx.segments());
        } }, styles: ["[_nghost-%COMP%] { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; }\n    button[_ngcontent-%COMP%] { font-family: var(--font-mono, monospace); font-size: 10.5px; font-weight: 600; padding: 5px 8px;\n      color: var(--text-muted); background: var(--bg-surface); border: 0;\n      border-right: 1px solid var(--border-muted); cursor: pointer; }\n    button[_ngcontent-%COMP%]:last-child { border-right: 0; }\n    button[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }\n    button.on.r0[_ngcontent-%COMP%] { background: var(--text-muted); color: var(--bg-primary); }\n    button.on.r1[_ngcontent-%COMP%] { background: var(--info);    color: var(--bg-primary); }\n    button.on.r2[_ngcontent-%COMP%] { background: var(--accent);  color: var(--text-on-accent); }\n    button.on.r3[_ngcontent-%COMP%] { background: var(--warning); color: var(--bg-primary); }\n    button.clamped[_ngcontent-%COMP%] { opacity: .35; cursor: not-allowed; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RungPickerComponent, [{
        type: Component,
        args: [{ selector: 'app-rung-picker', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
    @for (s of segments(); track s.rung) {
      <button type="button"
              [class]="s.classes"
              [disabled]="s.clamped || readonlyView()"
              [attr.aria-pressed]="s.filled"
              [attr.title]="s.title"
              (click)="pick(s.rung)">{{ s.label }}</button>
    }
  `, styles: ["\n    :host { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; }\n    button { font-family: var(--font-mono, monospace); font-size: 10.5px; font-weight: 600; padding: 5px 8px;\n      color: var(--text-muted); background: var(--bg-surface); border: 0;\n      border-right: 1px solid var(--border-muted); cursor: pointer; }\n    button:last-child { border-right: 0; }\n    button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }\n    button.on.r0 { background: var(--text-muted); color: var(--bg-primary); }\n    button.on.r1 { background: var(--info);    color: var(--bg-primary); }\n    button.on.r2 { background: var(--accent);  color: var(--text-on-accent); }\n    button.on.r3 { background: var(--warning); color: var(--bg-primary); }\n    button.clamped { opacity: .35; cursor: not-allowed; }\n  "] }]
    }], null, { value: [{ type: i0.Input, args: [{ isSignal: true, alias: "value", required: true }] }], area: [{ type: i0.Input, args: [{ isSignal: true, alias: "area", required: false }] }], floor: [{ type: i0.Input, args: [{ isSignal: true, alias: "floor", required: false }] }], implied: [{ type: i0.Input, args: [{ isSignal: true, alias: "implied", required: false }] }], impliedBy: [{ type: i0.Input, args: [{ isSignal: true, alias: "impliedBy", required: false }] }], readonlyView: [{ type: i0.Input, args: [{ isSignal: true, alias: "readonlyView", required: false }] }], changed: [{ type: i0.Output, args: ["changed"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RungPickerComponent, { className: "RungPickerComponent", filePath: "app/pages/settings/rung-picker.component.ts", lineNumber: 81 }); })();
