/**
 * Characterization tests for the drawn scroll control.
 *
 * Written **because the refactor found there were none.** The plan for extracting this out of
 * `HscrollTopDirective` said "proven against the existing behaviour first — the directive has a spec"; it did
 * not. ~150 lines of DOM insertion and pointer-drag arithmetic were covered only by a Playwright sweep that
 * needs a running instance, so nothing offline would have caught the extraction breaking it.
 *
 * jsdom computes no layout, so `scrollWidth`/`clientWidth` are 0 and the geometry has to be supplied. That is
 * not a weakness here: the arithmetic *is* the thing worth pinning, and feeding it known geometry tests it more
 * precisely than a real browser would. What jsdom cannot check — that the control is VISIBLE — is exactly what
 * `testing/responsive-sweep.mjs` exists for, and why that sweep is not replaced by this file.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachHscrollTop } from './hscroll-top.control';

/** Give an element the layout jsdom will not compute. */
function geometry(el: HTMLElement, { client, scroll }: { client: number; scroll: number }): void {
  Object.defineProperty(el, 'clientWidth', { value: client, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: scroll, configurable: true });
}

function setup({ client = 400, scroll = 1000 } = {}) {
  const parent = document.createElement('div');
  const host = document.createElement('div');
  parent.appendChild(host);
  document.body.appendChild(parent);
  geometry(host, { client, scroll });
  const detach = attachHscrollTop(host);
  const track = parent.querySelector('.hscroll-top') as HTMLDivElement | null;
  const thumb = track?.querySelector('.hscroll-top-thumb') as HTMLDivElement | null;
  if (track) {
    // The track only exists after attach, so its width has to be supplied afterwards — and then the control
    // has to render AGAIN, or every assertion reads geometry from a 0-width track.
    //
    // This is not a nitpick: with trackW = 0 the thumb maths yields max(28, 0) = 28, so the "floors at 28px"
    // test passed for entirely the wrong reason until this line existed. A test that agrees with the code by
    // accident is worse than no test.
    geometry(track, { client, scroll: client });
    host.dispatchEvent(new Event('scroll'));
  }
  return { parent, host, track, thumb, detach };
}

describe('attachHscrollTop', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => vi.restoreAllMocks());

  it('inserts a track with a thumb immediately BEFORE the host', () => {
    // Position is the entire point of this control — a native bar sits ~2800px below the fold on a tall table.
    const { parent, host, track, thumb } = setup();
    expect(track).toBeTruthy();
    expect(thumb).toBeTruthy();
    expect(parent.firstElementChild).toBe(track);
    expect(track!.nextElementSibling).toBe(host);
  });

  it('marks the track aria-hidden — it is a decorative twin of the host', () => {
    // The host is already scrollable by keyboard and exposed to assistive tech; announcing a second control
    // would be noise.
    const { track } = setup();
    expect(track!.getAttribute('aria-hidden')).toBe('true');
  });

  it('does nothing at all when the host has no parent to insert into', () => {
    const orphan = document.createElement('div');
    geometry(orphan, { client: 400, scroll: 1000 });
    const detach = attachHscrollTop(orphan);
    // Asserted on the ORPHAN, not on `document`: a mutation that wrapped the host in a detached parent still
    // left `document.querySelector` empty, so that check passed while the guard was gone. What the guard
    // actually promises is that the host is not re-parented and nothing is built.
    expect(orphan.parentElement).toBeNull();
    expect(orphan.previousElementSibling).toBeNull();
    expect(document.querySelector('.hscroll-top')).toBeNull();
    expect(() => detach()).not.toThrow();   // the teardown must still be safe to call
  });

  it('hides itself when the content fits', () => {
    const { track } = setup({ client: 400, scroll: 400 });
    expect(track!.style.display).toBe('none');
  });

  it('hides itself when the host has no width yet (a tab not on screen)', () => {
    // clientWidth 0 with a non-zero scrollWidth is what a display:none ancestor looks like. Without this the
    // thumb maths divides by a zero-width track and produces NaN transforms.
    const { track } = setup({ client: 0, scroll: 1000 });
    expect(track!.style.display).toBe('none');
  });

  it('sizes the thumb in proportion to how much is visible', () => {
    // 400 of 1000 visible → 40% of a 400px track → 160px.
    const { thumb } = setup({ client: 400, scroll: 1000 });
    expect(thumb!.style.width).toBe('160px');
  });

  it('floors the thumb at 28px, so a very wide table stays aimable', () => {
    // 400 of 40000 visible is 1% — a 4px thumb nobody can grab.
    const { thumb } = setup({ client: 400, scroll: 40000 });
    expect(parseInt(thumb!.style.width, 10)).toBe(28);
  });

  it('places the thumb from the host scroll position, and tracks scrolling', () => {
    const { host, thumb } = setup({ client: 400, scroll: 1000 });
    expect(thumb!.style.transform).toBe('translateX(0px)');

    // Halfway through a 600px range → halfway along the 240px of thumb travel.
    host.scrollLeft = 300;
    host.dispatchEvent(new Event('scroll'));
    expect(thumb!.style.transform).toBe('translateX(120px)');

    host.scrollLeft = 600;
    host.dispatchEvent(new Event('scroll'));
    expect(thumb!.style.transform).toBe('translateX(240px)');
  });

  it('a track click centres the thumb there and scrolls the host to match', () => {
    const { host, track, thumb } = setup({ client: 400, scroll: 1000 });
    geometry(thumb!, { client: 160, scroll: 160 });
    vi.spyOn(track!, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 400 } as DOMRect);

    // Click at 200: target left = 200 - 80 = 120 of 240 max → half the 600px range.
    track!.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, bubbles: true }));
    expect(host.scrollLeft).toBe(300);
  });

  it('dragging the thumb converts thumb travel into host travel', () => {
    const { host, track, thumb } = setup({ client: 400, scroll: 1000 });
    geometry(thumb!, { client: 160, scroll: 160 });
    geometry(track!, { client: 400, scroll: 400 });

    thumb!.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 0, bubbles: true }));
    expect(thumb!.classList.contains('is-dragging')).toBe(true);

    // 120px of thumb travel out of 240 available → half of the 600px range.
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120 }));
    expect(host.scrollLeft).toBe(300);

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(thumb!.classList.contains('is-dragging')).toBe(false);

    // After release, a move must no longer scroll.
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 240 }));
    expect(host.scrollLeft).toBe(300);
  });

  it('ignores pointermove from a different pointer than the one that started the drag', () => {
    // A second finger on a touch screen must not hijack the drag.
    const { host, thumb, track } = setup({ client: 400, scroll: 1000 });
    geometry(thumb!, { client: 160, scroll: 160 });
    geometry(track!, { client: 400, scroll: 400 });

    thumb!.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 0, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 99, clientX: 120 }));
    expect(host.scrollLeft).toBe(0);
  });

  it('a thumb pointerdown does not also trigger the track jump', () => {
    // Both listen for pointerdown on overlapping boxes; without stopPropagation a grab would jump first.
    const { host, thumb } = setup({ client: 400, scroll: 1000 });
    geometry(thumb!, { client: 160, scroll: 160 });
    thumb!.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 200, bubbles: true }));
    expect(host.scrollLeft).toBe(0);
  });

  it('teardown removes the track AND detaches the scroll listener', () => {
    const { parent, host, thumb, detach } = setup({ client: 400, scroll: 1000 });
    const before = thumb!.style.transform;
    detach();
    expect(parent.querySelector('.hscroll-top')).toBeNull();

    // The listener half needs its own assertion. "Does not throw" was not enough: a leaked listener still
    // renders happily against the detached track, so removing the removeEventListener call survived. Keeping
    // the thumb reference and checking it does NOT move is what detects the leak.
    host.scrollLeft = 600;
    host.dispatchEvent(new Event('scroll'));
    expect(thumb!.style.transform).toBe(before);

    expect(() => detach()).not.toThrow();
  });

  it('survives a jsdom-like environment with no ResizeObserver', () => {
    // Feature-detected rather than assumed: constructing one unguarded previously threw and took down twelve
    // unrelated specs that merely rendered a table.
    expect(typeof ResizeObserver).toBe('undefined');
    expect(() => setup()).not.toThrow();
  });
});
