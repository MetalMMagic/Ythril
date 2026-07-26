/**
 * SpaceCreateDialogComponent — proxy-target selection.
 *
 * RELOCATED from spaces.component.spec.ts (A17.8b-2b). The assertions are unchanged from the
 * characterization suite written against the original 1893-line component (#237) and proven green
 * there; only the owner moved, because `toggleProxyFor`/`toggleProxyForAll`/`isProxyForSelected`
 * now live on this dialog. Nothing was rewritten to make the refactor pass.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpacesStore } from './spaces-store.service';
import { SpaceCreateDialogComponent } from './space-create-dialog.component';

function create(createSpaceSpy?: (body: unknown) => unknown) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceCreateDialogComponent, getTranslocoModule()],
    providers: [
      SpacesStore,
      { provide: SpacesApi, useValue: {
        listSpaces: () => of({ spaces: [] }),
        createSpace: createSpaceSpy ?? (() => of({ space: {} })),
      } },
      { provide: NetworksApi, useValue: { listNetworks: () => of({ networks: [] }) } },
    ],
  });
  const fixture = TestBed.createComponent(SpaceCreateDialogComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SpaceCreateDialogComponent', () => {
  it('is compiled as OnPush', () => {
    // Matches the house pattern (brain, file-manager, graph, audit-log all assert this). Every child
    // extracted in A17.8b is OnPush from birth rather than retrofitted onto the old 1600-line parent.
    expect(SpaceCreateDialogComponent.ɵcmp?.onPush).toBe(true);
  });

  it('starts with an empty Purpose and a fully-strict validation default', () => {
    // The Purpose field no longer pre-fills the long MCP tool listing (owner feedback), and validation
    // defaults to strict to match the server's new-space default (#400) — the form must not understate
    // what will actually be created.
    const c = create().componentInstance;
    expect(c.form.purpose).toBe('');
    expect(c.form.validationMode).toBe('strict');
    expect(c.form.strictLinkage).toBe(true);
  });

  it('sends the validation choices explicitly, even when the user picks the lenient options', () => {
    // If the form quietly omitted an "off"/unchecked choice, the server default (strict) would create a
    // strict space while the user was shown "off" — so both flags are always sent.
    const spy = vi.fn(() => of({ space: {} }));
    const c = create(spy).componentInstance;
    c.form.label = 'My Space';
    c.form.validationMode = 'off';
    c.form.strictLinkage = false;
    c.createSpace();
    expect(spy).toHaveBeenCalledTimes(1);
    const body = spy.mock.calls[0][0] as { meta?: { validationMode?: string; strictLinkage?: boolean; purpose?: string } };
    expect(body.meta?.validationMode).toBe('off');
    expect(body.meta?.strictLinkage).toBe(false);
    // An empty Purpose is not sent as a blank string.
    expect(body.meta?.purpose).toBeUndefined();
  });

  it('toggleProxyFor adds then removes an id', () => {
    const c = create().componentInstance;
    c.toggleProxyFor('a');
    expect(c.proxyForSelected).toEqual(['a']);
    expect(c.isProxyForSelected('a')).toBe(true);
    c.toggleProxyFor('a');
    expect(c.proxyForSelected).toEqual([]);
  });

  it('selecting "all" clears individual picks, and blocks further individual toggles', () => {
    const c = create().componentInstance;
    c.toggleProxyFor('a');
    c.toggleProxyForAll();
    expect(c.proxyForAll).toBe(true);
    expect(c.proxyForSelected).toEqual([]);
    c.toggleProxyFor('b');                 // ignored while "all" is on
    expect(c.proxyForSelected).toEqual([]);
    c.toggleProxyForAll();                 // back off — individual selection works again
    c.toggleProxyFor('b');
    expect(c.proxyForSelected).toEqual(['b']);
  });
});
