import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
import * as i1 from "@jsverse/transloco";
function ProxySpaceBadgeComponent_Conditional_2_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "span", 2);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "spaces.badge.proxy"));
} }
/**
 * Marks a space as a PROXY — a view onto another instance's space, reached over a network, rather than data this
 * instance holds.
 *
 * ## Why this is a shared component and not markup in two templates
 *
 * The space-chip strip is duplicated: `pages/brain/brain.component.ts` and `pages/graph/graph.component.ts` each
 * carry their own copy of `class="space-chip"`. Adding the marker inline would have made three copies of one
 * meaning, which is the finding filed as A-L2-1 in the same session — a rule written eleven times because the
 * shared helper was named for its first caller and nobody found it. So this ships as a shared primitive with an
 * obvious name, which is the whole point of the lens-2 red flag *"shared UI primitives instead of every page
 * re-rolling pills"*.
 *
 * ## Why a proxy space needs marking at all
 *
 * A proxy space looks exactly like a local one in every list, and the difference is not cosmetic:
 *
 *  - its records live on a **peer**, so what you see depends on that peer being reachable;
 *  - the server's own metric collectors skip it (`cfg.spaces.filter(s => !s.proxyFor)`), so storage and record
 *    counts for it are **absent by design**, not zero;
 *  - a write intent that makes sense locally may not make sense against someone else's space.
 *
 * Someone who cannot tell the two apart reads an absent count as an empty space.
 *
 * ## `globe`, deliberately
 *
 * It is registered in `ph-icon.component.ts` — an unregistered name renders **blank** with no error, which has
 * bitten this repo twice. And it is visually distinct from the `link` icon already used on the same chip for
 * `networkStatus`: `link` says *this space participates in a network*, `globe` says *this space's data is
 * elsewhere*. Those are different facts and a chip can carry both.
 */
export class ProxySpaceBadgeComponent {
    constructor() {
        /** The space ids this space proxies. `['*']` means every space on the peer. */
        this.proxyFor = input(null, ...(ngDevMode ? [{ debugName: "proxyFor" }] : /* istanbul ignore next */ []));
        /** Icon size. 12 matches the network chip in the space strip; 14 suits a table cell. */
        this.size = input(12, ...(ngDevMode ? [{ debugName: "size" }] : /* istanbul ignore next */ []));
        /** Off in a dense chip strip where the icon plus its tooltip is enough. */
        this.showLabel = input(false, ...(ngDevMode ? [{ debugName: "showLabel" }] : /* istanbul ignore next */ []));
        this.i18n = inject(TranslocoService);
    }
    /**
     * The tooltip names WHICH spaces are proxied, because "this is a proxy" without "of what" is half an answer —
     * and `['*']` is the case a reader is most likely to misread as a wildcard typo.
     *
     * Translated, not interpolated in English. The first draft of this returned hardcoded strings while the visible
     * label went through transloco — which is precisely the untranslated-string class an earlier accessibility lens
     * already found in this codebase, and a tooltip is exactly where it hides.
     */
    titleText() {
        const ids = this.proxyFor() ?? [];
        if (ids[0] === '*')
            return this.i18n.translate('spaces.badge.proxyAllTitle');
        if (ids.length)
            return this.i18n.translate('spaces.badge.proxyTitle', { ids: ids.join(', ') });
        return this.i18n.translate('spaces.badge.proxy');
    }
    static { this.ɵfac = function ProxySpaceBadgeComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ProxySpaceBadgeComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ProxySpaceBadgeComponent, selectors: [["app-proxy-space-badge"]], inputs: { proxyFor: [1, "proxyFor"], size: [1, "size"], showLabel: [1, "showLabel"] }, decls: 3, vars: 4, consts: [[1, "badge", "badge-blue", "proxy-space-badge"], ["name", "globe", 3, "size"], [1, "proxy-space-badge-text"]], template: function ProxySpaceBadgeComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "span", 0);
            i0.ɵɵelement(1, "ph-icon", 1);
            i0.ɵɵconditionalCreate(2, ProxySpaceBadgeComponent_Conditional_2_Template, 3, 3, "span", 2);
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵattribute("title", ctx.titleText())("aria-label", ctx.titleText());
            i0.ɵɵadvance();
            i0.ɵɵproperty("size", ctx.size());
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.showLabel() ? 2 : -1);
        } }, dependencies: [TranslocoModule, PhIconComponent, i1.TranslocoPipe], styles: [".proxy-space-badge[_ngcontent-%COMP%] {\n      display: inline-flex;\n      align-items: center;\n      gap: 3px;\n      \n\n      line-height: 1;\n    }\n    .proxy-space-badge-text[_ngcontent-%COMP%] { font-size: 0.85em; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ProxySpaceBadgeComponent, [{
        type: Component,
        args: [{ selector: 'app-proxy-space-badge', standalone: true, imports: [TranslocoModule, PhIconComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <span
      class="badge badge-blue proxy-space-badge"
      [attr.title]="titleText()"
      [attr.aria-label]="titleText()"
    >
      <ph-icon name="globe" [size]="size()" />
      @if (showLabel()) {
        <span class="proxy-space-badge-text">{{ 'spaces.badge.proxy' | transloco }}</span>
      }
    </span>
  `, styles: ["\n    .proxy-space-badge {\n      display: inline-flex;\n      align-items: center;\n      gap: 3px;\n      /* Vertical rhythm with the sibling network chip on the same row, which sets its own line-height. */\n      line-height: 1;\n    }\n    .proxy-space-badge-text { font-size: 0.85em; }\n  "] }]
    }], null, { proxyFor: [{ type: i0.Input, args: [{ isSignal: true, alias: "proxyFor", required: false }] }], size: [{ type: i0.Input, args: [{ isSignal: true, alias: "size", required: false }] }], showLabel: [{ type: i0.Input, args: [{ isSignal: true, alias: "showLabel", required: false }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ProxySpaceBadgeComponent, { className: "ProxySpaceBadgeComponent", filePath: "app/shared/proxy-space-badge.component.ts", lineNumber: 64 }); })();
