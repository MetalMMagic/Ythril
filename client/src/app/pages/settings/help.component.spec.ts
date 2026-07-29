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

function setup(opts: { doc?: string | null; get?: unknown } = {}) {
  const get = opts.get ?? vi.fn(() => of('# Title\n\nbody'));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HelpComponent, getTranslocoModule()],
    providers: [
      { provide: HttpClient, useValue: { get } },
      { provide: MarkdownRenderService, useValue: { render: (t: string) => Promise.resolve(`<p>${t}</p>`) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => opts.doc ?? null } } } },
      { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
    ],
  });
  const f = TestBed.createComponent(HelpComponent);
  f.detectChanges();  // ngOnInit
  return { f, c: f.componentInstance, get: get as ReturnType<typeof vi.fn> };
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
