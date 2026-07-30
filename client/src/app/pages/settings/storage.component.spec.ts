/**
 * StorageComponent — pins the empty-vs-error distinction (the U0 correctness bug: a successful load with
 * no/zero storage must NOT render the red error state) and the health status pill driven by the shared
 * UsageBar's level thresholds.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { SpacesApi } from '../../core/spaces-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { StorageComponent } from './storage.component';

function make(listSpaces: () => unknown) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [StorageComponent, getTranslocoModule()],
    providers: [{ provide: SpacesApi, useValue: { listSpaces } }],
  });
  const f = TestBed.createComponent(StorageComponent);
  f.detectChanges(); // ngOnInit → load()
  return f;
}

describe('StorageComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());
  const el = (f: ReturnType<typeof make>) => f.nativeElement as HTMLElement;

  it('a successful empty load shows the info state, NOT the error state', () => {
    const f = make(() => of({ storage: null }));
    expect(el(f).querySelector('.alert-error')).toBeNull();
    expect(el(f).querySelector('.alert-info')).toBeTruthy();
  });

  it('a load failure shows the error state', () => {
    const f = make(() => throwError(() => ({})));
    expect(el(f).querySelector('.alert-error')).toBeTruthy();
  });

  // Every fixture below sends the shape the SERVER sends. The previous ones seeded
  // `{ totalLimitGiB, warnAtPercent }` — a shape the server has never produced — and silenced the type
  // error with `as never`. That is why the dead quota UI survived: the spec agreed with the client's
  // wrong type instead of with the payload, so both were consistently wrong and nothing failed.
  const limits = (soft?: number, hard?: number) => ({ total: { softLimitGiB: soft, hardLimitGiB: hard } });

  it('renders the shared usage bar + a health pill when a limit is configured', () => {
    const f = make(() => of({ storage: { usageGiB: { files: 1, brain: 1, total: 2 }, limits: limits(8, 10) } }));
    expect(el(f).querySelector('app-usage-bar')).toBeTruthy();
    expect(el(f).querySelector('app-status-pill')).toBeTruthy();
  });

  it('lists every configured area, and badges the ones the host pinned', () => {
    const f = make(() => of({ storage: {
      usageGiB: { files: 1, brain: 1, total: 2 },
      limits: {
        total: { softLimitGiB: 8, hardLimitGiB: 10 },
        files: { hardLimitGiB: 5 },
        lockedByInfra: ['files.hardLimitGiB'],
      },
    } }));
    const c = f.componentInstance;
    expect(c.limitRows().map((r: { area: string; pinned: boolean }) => [r.area, r.pinned]))
      .toEqual([['total', false], ['files', true]]);
    expect(el(f).textContent).toContain('mediaProcessing.pill.env');
  });

  it('the warn threshold comes from the soft limit, not a hard-coded 80', () => {
    // soft 5 of hard 10 means the bar should turn amber at 50%, not at whatever 80 happens to mean.
    const c = make(() => of({ storage: null })).componentInstance;
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 0 }, limits: limits(5, 10) });
    expect(c.warnAtPercent()).toBe(50);
    // With no soft limit there is nothing to derive from, so it falls back.
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 0 }, limits: limits(undefined, 10) });
    expect(c.warnAtPercent()).toBe(80);
  });

  it('the bar is drawn against the HARD limit, falling back to soft', () => {
    // Hard is what actually refuses a write. Falling back matters because an operator may set a warning
    // threshold and no hard cap, and drawing no bar at all is how this page looked unconfigured.
    const c = make(() => of({ storage: null })).componentInstance;
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 0 }, limits: limits(8, 10) });
    expect(c.totalHard()).toBe(10);
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 0 }, limits: limits(8, undefined) });
    expect(c.totalHard()).toBe(8);
  });

  it('healthPill reflects the usage level (ok / warn / full), and is null with no limit', () => {
    const c = make(() => of({ storage: null })).componentInstance;
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 4 }, limits: limits(8, 10) });
    expect(c.healthPill()?.variant).toBe('ok'); // 40%, under the 80% soft share
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 9 }, limits: limits(8, 10) });
    expect(c.healthPill()?.variant).toBe('warn'); // 90%
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 10 }, limits: limits(undefined, 10) });
    expect(c.healthPill()?.variant).toBe('error'); // 100%
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 5 } }); // no limit
    expect(c.healthPill()).toBeNull();
  });
});
