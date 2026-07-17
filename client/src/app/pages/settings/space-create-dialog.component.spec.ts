/**
 * SpaceCreateDialogComponent — proxy-target selection.
 *
 * RELOCATED from spaces.component.spec.ts (A17.8b-2b). The assertions are unchanged from the
 * characterization suite written against the original 1893-line component (#237) and proven green
 * there; only the owner moved, because `toggleProxyFor`/`toggleProxyForAll`/`isProxyForSelected`
 * now live on this dialog. Nothing was rewritten to make the refactor pass.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpacesStore } from './spaces-store.service';
import { SpaceCreateDialogComponent } from './space-create-dialog.component';

function create() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceCreateDialogComponent, getTranslocoModule()],
    providers: [
      SpacesStore,
      { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [] }), createSpace: () => of({ space: {} }) } },
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
