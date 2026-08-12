import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { OwnTokenRightsComponent } from './own-token-rights.component';
import { RightsCatalogService } from './rights-catalog.service';
import { AuthApi } from '../../core/auth-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import type { TokenRights } from './rights-glyph.component';

/**
 * `GET /api/tokens/me` has always returned the caller's `rights`. The typed client declared
 * `{ id, name, spaces? }`, so the matrix was discarded on arrival and a non-admin opening Settings → Tokens got
 * an error where their own access should be — the list route is admin-only.
 */
const rights = (over: Partial<TokenRights> = {}): TokenRights =>
  ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

const catalogStub = () => ({
  catalog: signal({ areas: ['knowledge', 'files', 'schema', 'dataQuality'], rungs: ['none', 'read', 'write', 'admin'] as const, routes: [] }),
  failed: signal(false), load: () => {}, routesFor: () => [], countFor: () => 0,
});

function make(me: unknown, fail = false) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [OwnTokenRightsComponent, getTranslocoModule()],
    providers: [
      { provide: RightsCatalogService, useValue: catalogStub() },
      { provide: AuthApi, useValue: { verifyToken: () => (fail ? throwError(() => new Error('401')) : of(me)) } },
    ],
  });
  const f = TestBed.createComponent(OwnTokenRightsComponent);
  f.detectChanges();
  return f;
}

describe('OwnTokenRightsComponent', () => {
  it('renders the caller OWN matrix, with a row per space its grid names', () => {
    const f = make({
      id: 't1', name: 'n8n-liaison',
      rights: rights({ perSpace: { qa: { knowledge: 'write', files: 'read', schema: 'none', dataQuality: 'none' } } }),
    });
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('app-rights-matrix')).toBeTruthy();
    expect(el.textContent).toContain('n8n-liaison');
    expect(f.componentInstance.spaces()).toEqual(['qa']);
  });

  it('every control is DISABLED — this view may not edit', () => {
    // The reason it reuses the editor at all is to avoid a second renderer of a permission grid. That only
    // holds if the reused one cannot be operated here.
    const f = make({
      id: 't1', name: 'x',
      rights: rights({ perSpace: { qa: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } } }),
    });
    const buttons = [...(f.nativeElement as HTMLElement).querySelectorAll('app-rung-picker button')];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('a pre-2.6 token gets a sentence, not an empty grid', () => {
    // An empty grid reads as "you have nothing", which is the opposite of a legacy token's truth.
    const el = make({ id: 't1', name: 'old', spaces: ['qa'] }).nativeElement as HTMLElement;
    expect(el.querySelector('app-rights-matrix')).toBeNull();
    expect(el.textContent).toContain('tokens.own.legacy');
  });

  it('renders nothing at all when the call fails, rather than a second error banner', () => {
    const el = make(null, true).nativeElement as HTMLElement;
    expect(el.querySelector('.own')).toBeNull();
  });

  it('shows the floor row for a token that has a floor and no per-space rows', () => {
    const f = make({ id: 't1', name: 'unscoped', rights: rights({ floor: { knowledge: 'write', files: 'write', schema: 'none', dataQuality: 'none' } }) });
    expect((f.nativeElement as HTMLElement).querySelector('tr.floor')).toBeTruthy();
    expect(f.componentInstance.spaces()).toEqual([]);
  });
});
