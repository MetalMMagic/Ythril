import { Directive, ElementRef, OnDestroy, AfterViewInit, inject, NgZone } from '@angular/core';
import { attachHscrollTop, type DetachHscrollTop } from './hscroll-top.control';

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
@Directive({
  selector: '[hscrollTop]',
  standalone: true,
})
export class HscrollTopDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly zone = inject(NgZone);

  private detach?: DetachHscrollTop;

  ngAfterViewInit(): void {
    // Outside Angular: scrolling and dragging fire continuously and change no state the framework needs to
    // hear about. Passed in as a scheduler rather than imported, so the control stays framework-free.
    this.detach = attachHscrollTop(this.host, fn => this.zone.runOutsideAngular(fn));
  }

  ngOnDestroy(): void {
    this.detach?.();
  }
}
