/**
 * ShellComponent — mobile nav drawer logic (U2).
 *
 * The drawer's open/close state is the load-bearing behavior: the hamburger
 * toggles it, Escape and a resize above the breakpoint close it, and (verified
 * separately end-to-end) navigation and the backdrop close it too. These unit
 * tests lock the state transitions; the Playwright run covered the DOM/focus
 * trap/close-on-navigate wiring that needs a real router + layout.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { provideRouter, Router, NavigationEnd } from '@angular/router';
import { of } from 'rxjs';
import { FilesApi } from '../../core/files-api.service';
import { AuthService } from '../../core/auth.service';
import { EmbedService } from '../../core/embed.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { ShellComponent } from './shell.component';

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ShellComponent, getTranslocoModule()],
    providers: [
      provideRouter([]),
      { provide: FilesApi, useValue: { listConflicts: () => of({ conflicts: [] }) } as any },
      { provide: AuthService, useValue: { logout: () => {}, logoutOidc: async () => false } as unknown as AuthService },
      { provide: EmbedService, useValue: { embedded: () => false } as unknown as EmbedService },
    ],
  });
  const fixture = TestBed.createComponent(ShellComponent);
  return { fixture, cmp: fixture.componentInstance };
}

describe('ShellComponent — drawer', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.restoreAllMocks());

  it('starts closed', () => {
    const { cmp } = make();
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('toggleDrawer flips open/closed', () => {
    const { cmp } = make();
    cmp.toggleDrawer();
    expect(cmp.drawerOpen()).toBe(true);
    cmp.toggleDrawer();
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('closeDrawer forces closed', () => {
    const { cmp } = make();
    cmp.toggleDrawer();
    cmp.closeDrawer();
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('Escape closes an open drawer and is a no-op when already closed', () => {
    const { cmp } = make();
    cmp.onEscape();
    expect(cmp.drawerOpen()).toBe(false); // no-op
    cmp.toggleDrawer();
    cmp.onEscape();
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('resizing above the breakpoint closes the drawer; staying mobile keeps it', () => {
    const { cmp } = make();
    cmp.toggleDrawer();

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
    cmp.onResize();
    expect(cmp.drawerOpen()).toBe(true); // still mobile → stays open

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    cmp.onResize();
    expect(cmp.drawerOpen()).toBe(false); // crossed to desktop → closed
  });

  it('navigation closes the drawer (NavigationEnd subscription)', () => {
    const events = new Subject();
    const { fixture, cmp } = make();
    const router = TestBed.inject(Router);
    // Swap the router event stream for a controllable subject before ngOnInit
    // wires up its subscription.
    Object.defineProperty(router, 'events', { value: events.asObservable(), configurable: true });
    fixture.detectChanges(); // runs ngOnInit → subscribes to router.events

    cmp.toggleDrawer();
    expect(cmp.drawerOpen()).toBe(true);
    events.next(new NavigationEnd(1, '/settings/spaces', '/settings/spaces'));
    expect(cmp.drawerOpen()).toBe(false);
  });
});
