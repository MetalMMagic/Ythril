/**
 * A small "?" that opens the guide explaining THIS screen.
 *
 * The point is the anchor, not the link. A control that dumps someone at the top of a 900-line user
 * guide has moved the search rather than answered it, so every use of this component names the heading
 * its screen is documented under and lands the reader on that section.
 *
 * The slug is GitHub's, the same dialect the documents' own tables of contents are written in — see
 * `headingSlug` in `MarkdownRenderService`. A `help-anchor-coverage` gate resolves every anchor used
 * here against the real headings in `docs/`, because a wrong one scrolls nowhere and says nothing.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';
import * as i0 from "@angular/core";
const _c0 = () => ["/settings/help"];
const _c1 = a0 => ({ doc: a0 });
export class HelpLinkComponent {
    constructor() {
        /** A `HELP_DOCS` id. */
        this.doc = input.required(...(ngDevMode ? [{ debugName: "doc" }] : /* istanbul ignore next */ []));
        /** The heading slug within that guide. Required on purpose: an unanchored help link is a search box. */
        this.anchor = input.required(...(ngDevMode ? [{ debugName: "anchor" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function HelpLinkComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || HelpLinkComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: HelpLinkComponent, selectors: [["app-help-link"]], inputs: { doc: [1, "doc"], anchor: [1, "anchor"] }, decls: 7, vars: 16, consts: [[3, "routerLink", "queryParams", "fragment"], ["name", "question", 3, "size"]], template: function HelpLinkComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "a", 0);
            i0.ɵɵpipe(1, "transloco");
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵelement(3, "ph-icon", 1);
            i0.ɵɵelementStart(4, "span");
            i0.ɵɵtext(5);
            i0.ɵɵpipe(6, "transloco");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵproperty("routerLink", i0.ɵɵpureFunction0(13, _c0))("queryParams", i0.ɵɵpureFunction1(14, _c1, ctx.doc()))("fragment", ctx.anchor());
            i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 7, "help.link.aria"))("title", i0.ɵɵpipeBind1(2, 9, "help.link.title"));
            i0.ɵɵadvance(3);
            i0.ɵɵproperty("size", 14);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(6, 11, "help.link.label"));
        } }, dependencies: [RouterLink, PhIconComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: inline-flex; }\n    a[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted);\n      font-size: 12px; text-decoration: none; border-radius: 6px; padding: 2px 6px;\n      border: 1px solid transparent; transition: color var(--transition), border-color var(--transition); }\n    a[_ngcontent-%COMP%]:hover { color: var(--accent); border-color: var(--border); }\n    a[_ngcontent-%COMP%]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(HelpLinkComponent, [{
        type: Component,
        args: [{ selector: 'app-help-link', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [RouterLink, PhIconComponent, TranslocoPipe], template: `
    <a [routerLink]="['/settings/help']" [queryParams]="{ doc: doc() }" [fragment]="anchor()"
       [attr.aria-label]="'help.link.aria' | transloco" [attr.title]="'help.link.title' | transloco">
      <ph-icon name="question" [size]="14"/><span>{{ 'help.link.label' | transloco }}</span>
    </a>
  `, styles: ["\n    :host { display: inline-flex; }\n    a { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted);\n      font-size: 12px; text-decoration: none; border-radius: 6px; padding: 2px 6px;\n      border: 1px solid transparent; transition: color var(--transition), border-color var(--transition); }\n    a:hover { color: var(--accent); border-color: var(--border); }\n    a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n  "] }]
    }], null, { doc: [{ type: i0.Input, args: [{ isSignal: true, alias: "doc", required: true }] }], anchor: [{ type: i0.Input, args: [{ isSignal: true, alias: "anchor", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(HelpLinkComponent, { className: "HelpLinkComponent", filePath: "app/shared/help-link.component.ts", lineNumber: 37 }); })();
