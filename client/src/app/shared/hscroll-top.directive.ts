import { Directive, ElementRef, OnDestroy, AfterViewInit, inject, NgZone } from '@angular/core';

/**
 * Draw a horizontal scroll control ABOVE the element it scrolls.
 *
 * ## Why this exists
 *
 * A scroll container puts its horizontal scrollbar at the bottom of its own box. For a data table that
 * is the worst possible place: the table is the tallest thing on the page, so the only hint that there
 * is more to the right sits below everything, and the box moves as the page scrolls. Measured on
 * Brain → Entities at a 900px viewport, the bar was roughly **2800px** below the fold — the table was
 * scrollable the whole time and nobody could tell.
 *
 * Three approaches were tried before this one. Recording them because each looked correct:
 *
 *  1. **A blanket `min-width` on `table`.** Stopped the column collapse, and forced a horizontal
 *     scrollbar onto every narrow three-column settings table that previously fit.
 *  2. **Bounding the wrapper's height** so the bar could not be far away. It shortened the distance,
 *     added a second vertical scrollbar nested in a page that already scrolls — rejected on sight — and
 *     the bar still moved with the page, because height was never the problem. *Position* was.
 *  3. **A mirrored native scroller above the table.** Right position, invisible: this platform uses
 *     OVERLAY scrollbars, which paint only while scrolling and occupy no layout space. Measured
 *     `offsetHeight - clientHeight === 0`, and a screenshot showed nothing at all. An affordance you
 *     cannot see until you have already used it is not an affordance.
 *
 * So the control is **drawn**, not borrowed: a track and a proportional thumb, always visible while the
 * host overflows, positioned immediately above it. The host keeps its own `overflow-x: auto`, so wheel,
 * trackpad, touch and keyboard scrolling all still work untouched — this adds a visible, draggable
 * handle for them rather than replacing the mechanism.
 */
@Directive({
  selector: '[hscrollTop]',
  standalone: true,
})
export class HscrollTopDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly zone = inject(NgZone);

  private track?: HTMLDivElement;
  private thumb?: HTMLDivElement;
  private ro?: ResizeObserver;
  private mo?: MutationObserver;

  /** Pointer id + geometry captured at drag start, so a drag survives the pointer leaving the thumb. */
  private drag: { pointerId: number; startX: number; startScroll: number } | null = null;

  ngAfterViewInit(): void {
    if (!this.host.parentElement) return;

    const track = document.createElement('div');
    track.className = 'hscroll-top';
    // Decorative twin of a control the host already exposes to assistive tech and the keyboard.
    track.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('div');
    thumb.className = 'hscroll-top-thumb';
    track.appendChild(thumb);
    this.host.parentElement.insertBefore(track, this.host);
    this.track = track;
    this.thumb = thumb;

    // Outside Angular: scrolling and dragging fire continuously and change no state the framework
    // needs to hear about.
    this.zone.runOutsideAngular(() => {
      this.host.addEventListener('scroll', this.render, { passive: true });
      thumb.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerup', this.onPointerUp, { passive: true });
      track.addEventListener('pointerdown', this.onTrackClick);

      // The table's width changes without the host resizing — a column filter narrows the data, a row
      // expands. Observe both the box and the subtree, or the thumb goes stale and lies about the range.
      //
      // Feature-detected, not assumed: jsdom has MutationObserver and no ResizeObserver, so
      // constructing one unguarded threw inside `runOutsideAngular` and took down every spec that
      // rendered a table — a decorative scrollbar breaking twelve unrelated tests.
      if (typeof ResizeObserver !== 'undefined') {
        this.ro = new ResizeObserver(this.render);
        this.ro.observe(this.host);
        const table = this.host.querySelector('table');
        if (table) this.ro.observe(table);
      }
      if (typeof MutationObserver !== 'undefined') {
        this.mo = new MutationObserver(this.render);
        this.mo.observe(this.host, { childList: true, subtree: true });
      }
    });

    this.render();
  }

  ngOnDestroy(): void {
    this.host.removeEventListener('scroll', this.render);
    this.thumb?.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.track?.removeEventListener('pointerdown', this.onTrackClick);
    this.ro?.disconnect();
    this.mo?.disconnect();
    this.track?.remove();
  }

  /** How far the host can scroll. Zero means it fits, and the control hides itself. */
  private get range(): number { return this.host.scrollWidth - this.host.clientWidth; }

  /** Size and place the thumb from the host's current geometry. */
  private render = (): void => {
    const track = this.track, thumb = this.thumb;
    if (!track || !thumb) return;

    if (this.range <= 1 || this.host.clientWidth === 0) {
      track.style.display = 'none';
      return;
    }
    track.style.display = '';

    const trackW = track.clientWidth;
    const ratio = this.host.clientWidth / this.host.scrollWidth;
    // A floor, or a very wide table produces a thumb too small to aim at.
    const thumbW = Math.max(28, Math.round(trackW * ratio));
    const maxLeft = trackW - thumbW;
    const left = Math.round((this.host.scrollLeft / this.range) * maxLeft);

    thumb.style.width = `${thumbW}px`;
    thumb.style.transform = `translateX(${left}px)`;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.thumb) return;
    e.preventDefault();
    e.stopPropagation();   // do not also fire the track's jump-to-position
    this.drag = { pointerId: e.pointerId, startX: e.clientX, startScroll: this.host.scrollLeft };
    this.thumb.classList.add('is-dragging');
  };

  private onPointerMove = (e: PointerEvent): void => {
    const drag = this.drag, track = this.track, thumb = this.thumb;
    if (!drag || drag.pointerId !== e.pointerId || !track || !thumb) return;
    const maxLeft = track.clientWidth - thumb.clientWidth;
    if (maxLeft <= 0) return;
    // Convert thumb travel back into host travel: the thumb crosses `maxLeft` px while the host
    // crosses its whole range, so the two are related by that ratio and nothing else.
    this.host.scrollLeft = drag.startScroll + ((e.clientX - drag.startX) / maxLeft) * this.range;
  };

  private onPointerUp = (): void => {
    if (!this.drag) return;
    this.drag = null;
    this.thumb?.classList.remove('is-dragging');
  };

  /** Click anywhere on the track: centre the thumb there. */
  private onTrackClick = (e: PointerEvent): void => {
    const track = this.track, thumb = this.thumb;
    if (!track || !thumb || this.range <= 1) return;
    const rect = track.getBoundingClientRect();
    const maxLeft = track.clientWidth - thumb.clientWidth;
    if (maxLeft <= 0) return;
    const target = e.clientX - rect.left - thumb.clientWidth / 2;
    this.host.scrollLeft = (Math.min(Math.max(target, 0), maxLeft) / maxLeft) * this.range;
  };
}
