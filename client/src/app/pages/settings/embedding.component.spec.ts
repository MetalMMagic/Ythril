/**
 * The embedding page behaves like a form that tells the truth about what the server did.
 *
 * ## What is worth testing here, and what is not
 *
 * Not that the origins are valid — the page deliberately does not know. `isValidEmbedOrigin` lives on the server and
 * is shared with the config-file path, because a copy here would be free to disagree with it and the operator would
 * be told their origin was bad by code a version behind.
 *
 * What IS worth testing is every way this page could lie:
 *
 *  - a refused origin that renders like an accepted one, so a save looks like it worked;
 *  - a stored-but-invalid entry from `config.json` that renders like a valid one, which is the whole answer to
 *    "why will my portal not frame" and the answer would be hidden;
 *  - a blank row sent as an origin and refused, when it is really somebody who clicked Add and changed their mind;
 *  - a red mark left on a row after it has been edited, saying the new text was refused when nothing has checked it.
 *
 * Run: npm run test:client
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { EmbeddingComponent } from './embedding.component';

function setup() {
  TestBed.configureTestingModule({
    imports: [EmbeddingComponent, getTranslocoModule()],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(EmbeddingComponent);
  const http = TestBed.inject(HttpTestingController);
  return { fixture, cmp: fixture.componentInstance, http };
}

describe('the embedding page', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => { ctx = setup(); });

  it('loads the stored list', () => {
    ctx.http.expectOne('/api/admin/embed-config')
      .flush({ allowedOrigins: ['https://portal.example.com'], resolved: ['https://portal.example.com'], invalid: [] });
    expect(ctx.cmp.origins()).toEqual(['https://portal.example.com']);
    expect(ctx.cmp.rejected()).toEqual([]);
  });

  it('marks a STORED entry the server already rejects', () => {
    /*
     * The diagnostic case. An operator whose portal opens in a tab comes here to find out why, and the answer is
     * often an entry written by hand into `config.json` that the validator drops. Rendering it identically to a
     * valid one would hide the only useful thing on the page.
     */
    ctx.http.expectOne('/api/admin/embed-config').flush({
      allowedOrigins: ['https://good.example.com', 'http://bad.example.com'],
      resolved: ['https://good.example.com'],
      invalid: ['http://bad.example.com'],
    });
    expect(ctx.cmp.rejected()).toEqual(['http://bad.example.com']);
  });

  it('sends the list and adopts what the server stored', () => {
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: [], resolved: [], invalid: [] });
    ctx.cmp.addOrigin();
    ctx.cmp.setOrigin(0, 'https://portal.example.com/');
    ctx.cmp.save();

    const req = ctx.http.expectOne(r => r.method === 'PATCH');
    expect(req.request.body).toEqual({ allowedOrigins: ['https://portal.example.com/'] });
    // The server normalises, so the page must show the STORED value rather than what was typed — otherwise the
    // trailing slash stays on screen and an operator comparing it with the portal's origin sees a mismatch.
    req.flush({ allowedOrigins: ['https://portal.example.com'], resolved: ['https://portal.example.com'] });
    expect(ctx.cmp.origins()).toEqual(['https://portal.example.com']);
    expect(ctx.cmp.savedAt()).toBe(true);
  });

  it('drops blank rows rather than sending them to be refused', () => {
    // An empty input is somebody who clicked Add and changed their mind. Sending it would produce a 400 about an
    // origin nobody was trying to add.
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: [], resolved: [], invalid: [] });
    ctx.cmp.addOrigin();
    ctx.cmp.addOrigin();
    ctx.cmp.setOrigin(0, '  https://portal.example.com  ');
    ctx.cmp.save();

    const req = ctx.http.expectOne(r => r.method === 'PATCH');
    expect(req.request.body).toEqual({ allowedOrigins: ['https://portal.example.com'] });
  });

  it('shows a refusal and marks the row that caused it', () => {
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: [], resolved: [], invalid: [] });
    ctx.cmp.addOrigin();
    ctx.cmp.setOrigin(0, 'https://portal.example.com/app');
    ctx.cmp.save();

    ctx.http.expectOne(r => r.method === 'PATCH').flush(
      { error: 'Every entry must be an exact, scheme-qualified origin with no path', invalid: ['https://portal.example.com/app'] },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(ctx.cmp.problem()).toMatch(/exact, scheme-qualified/);
    expect(ctx.cmp.rejected()).toEqual(['https://portal.example.com/app']);
    // NOT saved. A refusal that left the success note up would be the worst possible reading of this screen.
    expect(ctx.cmp.savedAt()).toBe(false);
    expect(ctx.cmp.saving()).toBe(false);
  });

  it('keeps what the operator typed after a refusal, so it can be corrected', () => {
    // Clearing the field on refusal would make them retype an origin that is one character wrong.
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: [], resolved: [], invalid: [] });
    ctx.cmp.addOrigin();
    ctx.cmp.setOrigin(0, 'http://portal.example.com');
    ctx.cmp.save();
    ctx.http.expectOne(r => r.method === 'PATCH').flush(
      { error: 'https is required', invalid: ['http://portal.example.com'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(ctx.cmp.origins()).toEqual(['http://portal.example.com']);
  });

  it('clears the red mark when the row is edited', () => {
    // Leaving it red would assert that the NEW text was refused, which nothing has checked.
    ctx.http.expectOne('/api/admin/embed-config').flush({
      allowedOrigins: ['http://bad.example.com'], resolved: [], invalid: ['http://bad.example.com'],
    });
    expect(ctx.cmp.rejected()).toEqual(['http://bad.example.com']);
    ctx.cmp.setOrigin(0, 'https://bad.example.com');
    expect(ctx.cmp.rejected()).toEqual([]);
  });

  it('removing a row clears the saved note, so it cannot describe a stale state', () => {
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: ['https://a.example.com'], resolved: ['https://a.example.com'], invalid: [] });
    ctx.cmp.save();
    ctx.http.expectOne(r => r.method === 'PATCH').flush({ allowedOrigins: ['https://a.example.com'], resolved: ['https://a.example.com'] });
    expect(ctx.cmp.savedAt()).toBe(true);
    ctx.cmp.removeOrigin(0);
    expect(ctx.cmp.savedAt()).toBe(false);
  });

  it('renders the framing-and-restyling warning, in its own callout', () => {
    /*
     * Asserted on the ELEMENT, not on the words. The transloco test module resolves every key to the key itself, so
     * checking the rendered prose for "restyle" tests the harness rather than the page — my first version did that
     * and failed against a page that renders the warning correctly. The WORDING is pinned where it lives, in
     * `embed-origins-are-editable.test.js` against the locale files.
     */
    ctx.http.expectOne('/api/admin/embed-config').flush({ allowedOrigins: [], resolved: [], invalid: [] });
    ctx.fixture.detectChanges();
    const callout = ctx.fixture.nativeElement.querySelector('.danger-note');
    expect(callout).toBeTruthy();
    expect(callout.textContent).toContain('embedding.origins.warning');
    // It must survive a populated list too — a warning that only shows on an empty page is missing when it matters.
    ctx.cmp.origins.set(['https://portal.example.com']);
    ctx.fixture.detectChanges();
    expect(ctx.fixture.nativeElement.querySelector('.danger-note')).toBeTruthy();
  });

  it('survives a load failure without leaving the page blank and silent', () => {
    ctx.http.expectOne('/api/admin/embed-config').error(new ProgressEvent('network'));
    expect(ctx.cmp.problem()).toBeTruthy();
    expect(ctx.cmp.origins()).toEqual([]);
  });
});
