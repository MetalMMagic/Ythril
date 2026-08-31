import { Directive, ElementRef, inject, NgZone, effect, input } from '@angular/core';
import { attachHscrollTop } from './hscroll-top.control';
import * as i0 from "@angular/core";
/**
 * Give every wide table and code block inside rendered markdown a VISIBLE scroll control.
 *
 * ## The gap this closes
 *
 * A wide `<table>` or `<pre>` in a rendered guide already scrolls — `help.component` sets
 * `overflow-x: auto` on both. On this platform that is invisible: overlay scrollbars paint only while
 * scrolling and take no layout space (`offsetHeight - clientHeight === 0`), so the content reads as having
 * been **cut off** rather than as something you can reach. Measured on `/settings/help` at 420px: four
 * occurrences, the widest 50px past a 338px box.
 *
 * Two CSS fixes were tried first and **measured as failures** — recorded so nobody repeats them:
 *
 *  - `scrollbar-width: thin` + `scrollbar-color` yields a **2px** bar AND makes Chromium 121+ ignore
 *    `::-webkit-scrollbar` entirely.
 *  - `::-webkit-scrollbar` with an explicit height did not apply at all here (0px on `table`, 2px on `pre`).
 *
 * ## Why a directive on the container rather than on each element
 *
 * The mechanism that *does* work in this app is the drawn control. It could not reach this content because
 * **Angular never instantiates directives inside `[innerHTML]`** — so a `hscrollTop` attribute in rendered
 * markdown does nothing. This sits on the container instead, and after each render walks the injected DOM,
 * wraps each overflowing element in a positioned parent, and attaches `attachHscrollTop` to it.
 *
 * The wrapping happens here, in the DOM, rather than in `MarkdownRenderService`: the control needs a parent it
 * can insert a sibling into, and doing it here keeps the render service's output a pure function of the
 * markdown. (An attempt to emit the wrapper from a `table` renderer override recursed — the override calls the
 * parser, which calls the override.)
 *
 * Re-run on every `mdScrollers` change, because the Help page swaps documents without recreating the article.
 */
export class MdScrollersDirective {
    constructor() {
        /** Bind to whatever changes when the rendered HTML changes — the value itself is not read. */
        this.mdScrollers = input(...(ngDevMode ? [undefined, { debugName: "mdScrollers" }] : /* istanbul ignore next */ []));
        this.host = inject((ElementRef)).nativeElement;
        this.zone = inject(NgZone);
        this.detachers = [];
        effect(() => {
            this.mdScrollers(); // the dependency; its value is irrelevant
            // After the browser has laid the new HTML out — scrollWidth is 0 until then, so attaching earlier would
            // measure every element as fitting and hide every control.
            requestAnimationFrame(() => this.attachAll());
        });
    }
    ngOnDestroy() {
        this.teardown();
    }
    teardown() {
        for (const d of this.detachers)
            d();
        this.detachers = [];
        // Unwrap, so a re-render does not accumulate a wrapper per pass.
        for (const w of Array.from(this.host.querySelectorAll('.md-scroll'))) {
            const el = w.firstElementChild;
            if (el)
                w.replaceWith(el);
            else
                w.remove();
        }
    }
    attachAll() {
        this.teardown();
        for (const el of Array.from(this.host.querySelectorAll('table, pre'))) {
            // Only what actually overflows. Wrapping a table that fits would add a hidden track to most documents
            // and make the DOM harder to read for no gain.
            if (el.scrollWidth <= el.clientWidth + 2)
                continue;
            if (el.closest('.md-scroll'))
                continue; // already wrapped (defensive)
            const wrap = document.createElement('div');
            wrap.className = 'md-scroll';
            el.replaceWith(wrap);
            wrap.appendChild(el);
            this.detachers.push(attachHscrollTop(el, fn => this.zone.runOutsideAngular(fn)));
        }
    }
    static { this.ɵfac = function MdScrollersDirective_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || MdScrollersDirective)(); }; }
    static { this.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: MdScrollersDirective, selectors: [["", "mdScrollers", ""]], inputs: { mdScrollers: [1, "mdScrollers"] } }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(MdScrollersDirective, [{
        type: Directive,
        args: [{
                selector: '[mdScrollers]',
                standalone: true,
            }]
    }], () => [], { mdScrollers: [{ type: i0.Input, args: [{ isSignal: true, alias: "mdScrollers", required: false }] }] }); })();
