/**
 * The drawn horizontal-scroll control, as a plain class that takes any element.
 *
 * ## Why this is not just the directive's body
 *
 * `HscrollTopDirective` gets its element from `inject(ElementRef)`, which means it can only ever attach to an
 * element Angular itself created. **Angular does not instantiate directives inside `[innerHTML]`** — so a
 * `hscrollTop` attribute in rendered markdown does precisely nothing, and the guides' wide tables and code
 * blocks scroll with no visible affordance at all (measured: 4 occurrences on `/settings/help` at 420px).
 *
 * So the behaviour lives here, taking an element rather than injecting one. The directive is now a thin wrapper
 * that calls `attachHscrollTop(this.host)`; a second caller can walk sanitized HTML and attach one per wrapper.
 * One implementation either way — two copies of pointer-drag maths would drift, and the reason this control is
 * drawn rather than borrowed is subtle enough that a second copy would lose it.
 *
 * ## Why it is drawn rather than borrowed (kept from the directive, because it is the whole point)
 *
 * A scroll container puts its scrollbar at the bottom of its own box. For a tall data table that is the worst
 * possible place — measured ~2800px below the fold on Brain → Entities at a 900px viewport, so the table was
 * scrollable the entire time and nobody could tell. A mirrored *native* scroller placed above it was tried and
 * was invisible: this platform uses **overlay** scrollbars, which paint only while scrolling and take no layout
 * space (`offsetHeight - clientHeight === 0`). An affordance you cannot see until you have already used it is
 * not an affordance. Hence a track and a proportional thumb, always visible while the host overflows.
 *
 * The host keeps its own `overflow-x: auto`, so wheel, trackpad, touch and keyboard scrolling are untouched —
 * this adds a visible, draggable handle for them rather than replacing the mechanism.
 */

/** Tear down everything {@link attachHscrollTop} added. Safe to call twice. */
export type DetachHscrollTop = () => void;

/**
 * Insert a drawn scroll control immediately before `host` and keep it in sync.
 *
 * @param host the scroll container — must already have `overflow-x: auto` and a parent element
 * @param runOutside optional scheduler for the listeners. Angular callers pass `NgZone.runOutsideAngular`,
 *   because scrolling and dragging fire continuously and change no state the framework needs to hear about.
 *   A non-Angular caller omits it.
 * @returns a teardown function, or a no-op when `host` has no parent to insert into
 */
export function attachHscrollTop(host: HTMLElement, runOutside: (fn: () => void) => void = fn => fn()): DetachHscrollTop {
  if (!host.parentElement) return () => { /* nothing was attached */ };

  const track = document.createElement('div');
  track.className = 'hscroll-top';
  // Decorative twin of a control the host already exposes to assistive tech and the keyboard.
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('div');
  thumb.className = 'hscroll-top-thumb';
  track.appendChild(thumb);
  host.parentElement.insertBefore(track, host);

  let ro: ResizeObserver | undefined;
  let mo: MutationObserver | undefined;
  /** Pointer id + geometry captured at drag start, so a drag survives the pointer leaving the thumb. */
  let drag: { pointerId: number; startX: number; startScroll: number } | null = null;

  /** How far the host can scroll. Zero means it fits, and the control hides itself. */
  const range = (): number => host.scrollWidth - host.clientWidth;

  /** Size and place the thumb from the host's current geometry. */
  const render = (): void => {
    if (range() <= 1 || host.clientWidth === 0) {
      track.style.display = 'none';
      return;
    }
    track.style.display = '';

    const trackW = track.clientWidth;
    const ratio = host.clientWidth / host.scrollWidth;
    // A floor, or a very wide table produces a thumb too small to aim at.
    const thumbW = Math.max(28, Math.round(trackW * ratio));
    const maxLeft = trackW - thumbW;
    const left = Math.round((host.scrollLeft / range()) * maxLeft);

    thumb.style.width = `${thumbW}px`;
    thumb.style.transform = `translateX(${left}px)`;
  };

  const onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    e.stopPropagation();   // do not also fire the track's jump-to-position
    drag = { pointerId: e.pointerId, startX: e.clientX, startScroll: host.scrollLeft };
    thumb.classList.add('is-dragging');
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const maxLeft = track.clientWidth - thumb.clientWidth;
    if (maxLeft <= 0) return;
    // Convert thumb travel back into host travel: the thumb crosses `maxLeft` px while the host crosses its
    // whole range, so the two are related by that ratio and nothing else.
    host.scrollLeft = drag.startScroll + ((e.clientX - drag.startX) / maxLeft) * range();
  };

  const onPointerUp = (): void => {
    if (!drag) return;
    drag = null;
    thumb.classList.remove('is-dragging');
  };

  /** Click anywhere on the track: centre the thumb there. */
  const onTrackClick = (e: PointerEvent): void => {
    if (range() <= 1) return;
    const rect = track.getBoundingClientRect();
    const maxLeft = track.clientWidth - thumb.clientWidth;
    if (maxLeft <= 0) return;
    const target = e.clientX - rect.left - thumb.clientWidth / 2;
    host.scrollLeft = (Math.min(Math.max(target, 0), maxLeft) / maxLeft) * range();
  };

  runOutside(() => {
    host.addEventListener('scroll', render, { passive: true });
    thumb.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    track.addEventListener('pointerdown', onTrackClick);

    // The content's width changes without the host resizing — a column filter narrows the data, a row expands.
    // Observe both the box and the subtree, or the thumb goes stale and lies about the range.
    //
    // Feature-detected, not assumed: jsdom has MutationObserver and no ResizeObserver, so constructing one
    // unguarded threw inside `runOutsideAngular` and took down every spec that rendered a table — a decorative
    // scrollbar breaking twelve unrelated tests.
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(render);
      ro.observe(host);
      const table = host.querySelector('table');
      if (table) ro.observe(table);
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(render);
      mo.observe(host, { childList: true, subtree: true });
    }
  });

  render();

  return () => {
    host.removeEventListener('scroll', render);
    thumb.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    track.removeEventListener('pointerdown', onTrackClick);
    ro?.disconnect();
    mo?.disconnect();
    track.remove();
  };
}
