import { Directive, ElementRef, OnDestroy, inject, NgZone, effect, input } from '@angular/core';
import { attachHscrollTop, type DetachHscrollTop } from './hscroll-top.control';

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
@Directive({
  selector: '[mdScrollers]',
  standalone: true,
})
export class MdScrollersDirective implements OnDestroy {
  /** Bind to whatever changes when the rendered HTML changes — the value itself is not read. */
  readonly mdScrollers = input<unknown>();

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly zone = inject(NgZone);

  private detachers: DetachHscrollTop[] = [];

  constructor() {
    effect(() => {
      this.mdScrollers();          // the dependency; its value is irrelevant
      // After the browser has laid the new HTML out — scrollWidth is 0 until then, so attaching earlier would
      // measure every element as fitting and hide every control.
      requestAnimationFrame(() => this.attachAll());
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private teardown(): void {
    for (const d of this.detachers) d();
    this.detachers = [];
    // Unwrap, so a re-render does not accumulate a wrapper per pass.
    for (const w of Array.from(this.host.querySelectorAll('.md-scroll'))) {
      const el = w.firstElementChild;
      if (el) w.replaceWith(el);
      else w.remove();
    }
  }

  private attachAll(): void {
    this.teardown();

    for (const el of Array.from(this.host.querySelectorAll<HTMLElement>('table, pre'))) {
      // Only what actually overflows. Wrapping a table that fits would add a hidden track to most documents
      // and make the DOM harder to read for no gain.
      if (el.scrollWidth <= el.clientWidth + 2) continue;
      if (el.closest('.md-scroll')) continue;          // already wrapped (defensive)

      const wrap = document.createElement('div');
      wrap.className = 'md-scroll';
      el.replaceWith(wrap);
      wrap.appendChild(el);

      this.detachers.push(attachHscrollTop(el, fn => this.zone.runOutsideAngular(fn)));
    }
  }
}
