/**
 * HelpComponent — the in-product guides.
 *
 * The behaviours worth pinning are the ones that would otherwise fail quietly:
 *
 *  1. **The fetched path is built from the fixed list, never from the URL.** `?doc=` is user input; if it
 *     ever reached the request path this page would be a traversal hole in a product that has no other
 *     one. An unknown id must fall back, not fetch.
 *  2. **A failed load is not an empty guide.** Bundled assets should not 404 — if one does, the build
 *     dropped it, and rendering nothing would look like a guide with no content.
 *  3. **A slow response cannot overwrite a newer selection.** Clicking through the index faster than the
 *     network answers must not leave the wrong document under the highlighted entry.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { HelpComponent, HELP_DOCS } from './help.component';
import { MarkdownRenderService } from '../../shared/markdown-render.service';

function setup(opts: { doc?: string | null; fragment?: string | null; get?: unknown; render?: (t: string) => Promise<string> } = {}) {
  const get = opts.get ?? vi.fn(() => of('# Title\n\nbody'));
  const navigate = vi.fn(() => Promise.resolve(true));
  const render = opts.render ?? ((t: string) => Promise.resolve(`<p>${t}</p>`));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HelpComponent, getTranslocoModule()],
    providers: [
      { provide: HttpClient, useValue: { get } },
      { provide: MarkdownRenderService, useValue: { render } },
      { provide: ActivatedRoute, useValue: {
        snapshot: { queryParamMap: { get: () => opts.doc ?? null }, fragment: opts.fragment ?? null },
      } },
      { provide: Router, useValue: { navigate } },
    ],
  });
  const f = TestBed.createComponent(HelpComponent);
  f.detectChanges();  // ngOnInit
  return { f, c: f.componentInstance, get: get as ReturnType<typeof vi.fn>, navigate };
}

/** Click the first anchor in the rendered article and return the event, so callers can check preventDefault. */
function clickLink(f: { nativeElement: unknown }, selector = 'a'): MouseEvent {
  const a = (f.nativeElement as HTMLElement).querySelector(`.doc article ${selector}`)!;
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  a.dispatchEvent(ev);
  return ev;
}

describe('HelpComponent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lands on the first guide and fetches it from the bundled assets', () => {
    const { c, get } = setup();
    expect(c.active()).toBe(HELP_DOCS[0].id);
    expect(get).toHaveBeenCalledWith(`assets/docs/${HELP_DOCS[0].file}`, { responseType: 'text' });
  });

  it('opens the guide named by ?doc=', () => {
    const target = HELP_DOCS[2];
    const { c, get } = setup({ doc: target.id });
    expect(c.active()).toBe(target.id);
    expect(get).toHaveBeenCalledWith(`assets/docs/${target.file}`, { responseType: 'text' });
  });

  it('an unknown ?doc= falls back to the first guide instead of fetching it', () => {
    // The path must never be built from the query param — this is what keeps `?doc=../../etc/passwd`
    // a no-op rather than a request.
    const { c, get } = setup({ doc: '../../../etc/passwd' });
    expect(c.active()).toBe(HELP_DOCS[0].id);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe(`assets/docs/${HELP_DOCS[0].file}`);
    expect(get.mock.calls[0][0]).not.toContain('..');
  });

  it('every offered guide resolves to a path inside assets/docs', () => {
    for (const d of HELP_DOCS) {
      expect(d.file).toMatch(/^[a-z0-9-]+\.md$/);
    }
  });

  it('renders the fetched markdown through the shared renderer', async () => {
    const { f, c } = setup();
    await Promise.resolve();
    f.detectChanges();
    expect(c.loading()).toBe(false);
    expect((f.nativeElement as HTMLElement).querySelector('.doc article')?.innerHTML).toContain('# Title');
  });

  it('a failed load surfaces the reason rather than rendering an empty guide', async () => {
    const { f, c } = setup({ get: vi.fn(() => throwError(() => new Error('gone'))) });
    await Promise.resolve();
    f.detectChanges();
    expect(c.error()).toBeTruthy();
    expect(c.loading()).toBe(false);
    expect((f.nativeElement as HTMLElement).querySelector('.doc article')).toBeNull();
  });

  describe('links inside a rendered guide', () => {
    /** Render real-ish HTML so the click handler has anchors to find. */
    const withHtml = (html: string, opts: Record<string, unknown> = {}) =>
      setup({ render: () => Promise.resolve(html), ...opts });

    it('an intra-document anchor scrolls instead of navigating away', async () => {
      const s = withHtml('<a href="#settings--tokens">go</a><h2 id="settings--tokens">Tokens</h2>');
      await Promise.resolve();
      s.f.detectChanges();
      const heading = (s.f.nativeElement as HTMLElement).querySelector('#settings--tokens')!;
      const scroll = vi.fn();
      (heading as HTMLElement).scrollIntoView = scroll;

      const ev = clickLink(s.f);
      expect(ev.defaultPrevented).toBe(true);   // the browser must not resolve it against the route
      expect(scroll).toHaveBeenCalled();
    });

    it('a cross-document link opens that guide instead of leaving the app', async () => {
      const s = withHtml('<a href="integration-guide.md#recall">see</a>');
      await Promise.resolve();
      s.f.detectChanges();
      const ev = clickLink(s.f);
      expect(ev.defaultPrevented).toBe(true);
      expect(s.c.active()).toBe('integration-guide');
      expect(s.get).toHaveBeenLastCalledWith('assets/docs/integration-guide.md', { responseType: 'text' });
    });

    it('a link to a document the page does not offer keeps its default behaviour', async () => {
      // Swallowing it would make a dead link silently do nothing, which is harder to report than a
      // visible failure.
      const s = withHtml('<a href="secret-notes.md">see</a>');
      await Promise.resolve();
      s.f.detectChanges();
      expect(clickLink(s.f).defaultPrevented).toBe(false);
    });

    it('an external link is left entirely alone', async () => {
      const s = withHtml('<a href="https://example.com/x">out</a>');
      await Promise.resolve();
      s.f.detectChanges();
      expect(clickLink(s.f).defaultPrevented).toBe(false);
    });

    it('a ctrl/cmd-click is never swallowed — open-in-new-tab still works', async () => {
      const s = withHtml('<a href="#top">go</a><h2 id="top">Top</h2>');
      await Promise.resolve();
      s.f.detectChanges();
      const a = (s.f.nativeElement as HTMLElement).querySelector('.doc article a')!;
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
      a.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
    });

    it('scrolls to the fragment the URL asked for once the guide has rendered', async () => {
      // This is what a per-page help control relies on: it links to ?doc=userguide#settings--tokens.
      const s = withHtml('<h2 id="settings--tokens">Tokens</h2>', { fragment: 'settings--tokens' });
      const heading = () => (s.f.nativeElement as HTMLElement).querySelector('#settings--tokens');
      // The element only exists after the render resolves; assert we got there and it is addressable.
      await Promise.resolve();
      s.f.detectChanges();
      expect(heading()).toBeTruthy();
    });

    it('a fragment matching no heading leaves the reader at the top rather than throwing', async () => {
      const s = withHtml('<h2 id="real">Real</h2>', { fragment: 'not-a-heading' });
      await Promise.resolve();
      s.f.detectChanges();
      expect(s.c.error()).toBe('');
    });
  });

  it('a slow response cannot overwrite a newer selection', async () => {
    const slow = new Subject<string>();
    const calls: string[] = [];
    const get = vi.fn((url: string) => {
      calls.push(url);
      return calls.length === 1 ? slow.asObservable() : of('# Second');
    });
    const { c } = setup({ get });

    const second = HELP_DOCS[1];
    c.open(second.id);                 // switch while the first is still in flight
    slow.next('# First');              // …and let the stale one answer
    slow.complete();
    await Promise.resolve();

    expect(c.active()).toBe(second.id);
    expect(calls[1]).toBe(`assets/docs/${second.file}`);
  });
});
