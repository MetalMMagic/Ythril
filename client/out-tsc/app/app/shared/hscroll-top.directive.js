import { Directive, ElementRef, inject, NgZone } from '@angular/core';
import { attachHscrollTop } from './hscroll-top.control';
import * as i0 from "@angular/core";
/**
 * Draw a horizontal scroll control ABOVE the element it scrolls.
 *
 * **The behaviour lives in `hscroll-top.control.ts`** — including why the control is *drawn* rather than
 * borrowed from the platform, and the three approaches tried before it. This file is only the Angular binding.
 *
 * ## Why the behaviour moved out
 *
 * A directive takes its element from `inject(ElementRef)`, so it can only attach to an element Angular created.
 * **Angular does not instantiate directives inside `[innerHTML]`** — so this control could never reach the
 * rendered guides on `/settings/help`, where wide tables and code blocks scroll with no visible affordance at
 * all, because this platform's overlay scrollbars paint nothing. Extracting it lets a second caller walk
 * sanitized HTML and attach one per wrapper, with **one** implementation of the pointer maths rather than two
 * copies that drift.
 */
export class HscrollTopDirective {
    constructor() {
        this.host = inject((ElementRef)).nativeElement;
        this.zone = inject(NgZone);
    }
    ngAfterViewInit() {
        // Outside Angular: scrolling and dragging fire continuously and change no state the framework needs to
        // hear about. Passed in as a scheduler rather than imported, so the control stays framework-free.
        this.detach = attachHscrollTop(this.host, fn => this.zone.runOutsideAngular(fn));
    }
    ngOnDestroy() {
        this.detach?.();
    }
    static { this.ɵfac = function HscrollTopDirective_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || HscrollTopDirective)(); }; }
    static { this.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: HscrollTopDirective, selectors: [["", "hscrollTop", ""]] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(HscrollTopDirective, [{
        type: Directive,
        args: [{
                selector: '[hscrollTop]',
                standalone: true,
            }]
    }], null, null); })();
