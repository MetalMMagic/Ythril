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

  it('renders the shared usage bar + a health pill when a limit is configured', () => {
    const f = make(() => of({ storage: { usageGiB: { files: 1, brain: 1, total: 2 }, limits: { totalLimitGiB: 10, warnAtPercent: 80 } } }));
    expect(el(f).querySelector('app-usage-bar')).toBeTruthy();
    expect(el(f).querySelector('app-status-pill')).toBeTruthy();
  });

  it('healthPill reflects the usage level (ok / warn / full), and is null with no limit', () => {
    const c = make(() => of({ storage: null })).componentInstance;
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 5 }, limits: { totalLimitGiB: 10, warnAtPercent: 80 } } as never);
    expect(c.healthPill()?.variant).toBe('ok'); // 50%
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 9 }, limits: { totalLimitGiB: 10, warnAtPercent: 80 } } as never);
    expect(c.healthPill()?.variant).toBe('warn'); // 90%
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 10 }, limits: { totalLimitGiB: 10 } } as never);
    expect(c.healthPill()?.variant).toBe('error'); // 100%
    c.data.set({ usageGiB: { files: 0, brain: 0, total: 5 } } as never); // no limit
    expect(c.healthPill()).toBeNull();
  });
});
