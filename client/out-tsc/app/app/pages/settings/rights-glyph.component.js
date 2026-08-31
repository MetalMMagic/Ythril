import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.area;
function RightsGlyphComponent_For_1_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElement(0, "span", 3);
} if (rf & 2) {
    const b_r1 = i0.ɵɵnextContext().$implicit;
    i0.ɵɵclassMap("floor " + b_r1.f);
} }
function RightsGlyphComponent_For_1_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "span", 1);
    i0.ɵɵconditionalCreate(1, RightsGlyphComponent_For_1_Conditional_1_Template, 1, 2, "span", 2);
    i0.ɵɵdomElementEnd();
} if (rf & 2) {
    const b_r1 = ctx.$implicit;
    i0.ɵɵclassMap("bar " + b_r1.h);
    i0.ɵɵattribute("title", b_r1.label);
    i0.ɵɵadvance();
    i0.ɵɵconditional(b_r1.f ? 1 : -1);
} }
/** The four areas, in the order the matrix shows them. Bars follow this order so a row reads left to right. */
export const RIGHT_AREAS = ['knowledge', 'files', 'schema', 'dataQuality'];
const RANK = { none: 0, read: 1, write: 2, admin: 3 };
/**
 * One bar per area: height is the CEILING, a red line marks the FLOOR.
 *
 * ## Why a glyph and not a label
 *
 * A token's rights are four areas across every space. "read-write" was what the old model could say and it
 * is exactly what this replaces — a single label cannot express "admin on Files here, nothing anywhere
 * else". A row of bars can be scanned down a column, which is what a list is for.
 *
 * ## Why the floor is a separate mark rather than a second bar
 *
 * Ceiling and floor answer different questions — *how high does this go* and *how much of that applies
 * everywhere, including spaces that do not exist yet*. Drawn as two bars they read as two unrelated numbers;
 * drawn as a bar with a line, the gap between them is visible and is exactly the part that is granted per
 * space and can be audited space by space.
 *
 * A line at the top of a bar therefore means ceiling equals floor: that level everywhere, forever, with
 * nothing space-specific to review. That is the state worth spotting from across a list, which is why the
 * mark is red rather than another shade of the bar.
 */
export class RightsGlyphComponent {
    constructor() {
        this.rights = input.required(...(ngDevMode ? [{ debugName: "rights" }] : /* istanbul ignore next */ []));
        /**
         * The ceiling for an area is the highest rung held in ANY space — floor or row, whichever is higher.
         *
         * Reading only `perSpace` under-reports a token whose reach comes from its floor; reading only the floor
         * under-reports one with a specific row. Both are wrong in the same direction — they make a token look
         * smaller than it is — which is the direction that matters least in a refusal and most in a list somebody
         * is auditing.
         */
        this.bars = computed(() => {
            const r = this.rights();
            return RIGHT_AREAS.map(area => {
                if (r.instanceAdmin) {
                    return { area, h: 'hx', f: 'f3', label: `${area}: instance administrator` };
                }
                const floor = r.floor?.[area] ?? 'none';
                const ceiling = Object.values(r.perSpace).reduce((hi, row) => (RANK[row[area] ?? 'none'] > RANK[hi] ? row[area] : hi), floor);
                return {
                    area,
                    h: `h${RANK[ceiling]}`,
                    // No mark when the floor is `none`: a line at the baseline would read as a floor of zero rather
                    // than as no floor at all, and those are different facts.
                    f: floor === 'none' ? '' : `f${RANK[floor]}`,
                    label: `${area}: up to ${ceiling}${floor === 'none' ? '' : `, ${floor} everywhere`}`,
                };
            });
        }, ...(ngDevMode ? [{ debugName: "bars" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function RightsGlyphComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || RightsGlyphComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: RightsGlyphComponent, selectors: [["app-rights-glyph"]], inputs: { rights: [1, "rights"] }, decls: 2, vars: 0, consts: [[1, "bar", 3, "class"], [1, "bar"], [1, "floor", 3, "class"], [1, "floor"]], template: function RightsGlyphComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵrepeaterCreate(0, RightsGlyphComponent_For_1_Template, 2, 4, "span", 0, _forTrack0);
        } if (rf & 2) {
            i0.ɵɵrepeater(ctx.bars());
        } }, styles: ["[_nghost-%COMP%] { display: inline-flex; align-items: flex-end; gap: 4px; height: 24px; padding-top: 2px; }\n    .bar[_ngcontent-%COMP%] { position: relative; width: 10px; border-radius: 2px; display: block; background: var(--bg-elevated); }\n    .bar.h0[_ngcontent-%COMP%] { height: 4px; }\n    .bar.h1[_ngcontent-%COMP%] { height: 9px;  background: var(--info); }\n    .bar.h2[_ngcontent-%COMP%] { height: 15px; background: var(--accent); }\n    .bar.h3[_ngcontent-%COMP%] { height: 22px; background: var(--warning); }\n    \n\n    .bar.hx[_ngcontent-%COMP%] { height: 22px; background: var(--error); }\n    .floor[_ngcontent-%COMP%] { position: absolute; left: -2px; right: -2px; height: 2px; background: var(--error);\n      border-radius: 1px; box-shadow: 0 0 0 1px var(--bg-surface); }\n    .floor.f1[_ngcontent-%COMP%] { bottom: 8px; } .floor.f2[_ngcontent-%COMP%] { bottom: 14px; } .floor.f3[_ngcontent-%COMP%] { bottom: 21px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RightsGlyphComponent, [{
        type: Component,
        args: [{ selector: 'app-rights-glyph', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `
    @for (b of bars(); track b.area) {
      <span class="bar" [class]="'bar ' + b.h" [attr.title]="b.label">
        @if (b.f) { <span class="floor" [class]="'floor ' + b.f"></span> }
      </span>
    }
  `, styles: ["\n    :host { display: inline-flex; align-items: flex-end; gap: 4px; height: 24px; padding-top: 2px; }\n    .bar { position: relative; width: 10px; border-radius: 2px; display: block; background: var(--bg-elevated); }\n    .bar.h0 { height: 4px; }\n    .bar.h1 { height: 9px;  background: var(--info); }\n    .bar.h2 { height: 15px; background: var(--accent); }\n    .bar.h3 { height: 22px; background: var(--warning); }\n    /* Instance administrator is not a rung \u2014 it is everything, everywhere, and reads as its own state. */\n    .bar.hx { height: 22px; background: var(--error); }\n    .floor { position: absolute; left: -2px; right: -2px; height: 2px; background: var(--error);\n      border-radius: 1px; box-shadow: 0 0 0 1px var(--bg-surface); }\n    .floor.f1 { bottom: 8px; } .floor.f2 { bottom: 14px; } .floor.f3 { bottom: 21px; }\n  "] }]
    }], null, { rights: [{ type: i0.Input, args: [{ isSignal: true, alias: "rights", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(RightsGlyphComponent, { className: "RightsGlyphComponent", filePath: "app/pages/settings/rights-glyph.component.ts", lineNumber: 72 }); })();
