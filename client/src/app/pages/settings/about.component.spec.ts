/**
 * AboutComponent characterization tests.
 *
 * Written BEFORE the PR-U10 (part 2) redesign and proven green against the ORIGINAL component, so the
 * refactor (grouping into SettingsCards + shared UsageBar) has a safety net. These pin behaviour that
 * must survive the redesign: the load → info / error / loading states, the disk-percent computation and
 * its health thresholds, byte formatting, and the error-message precedence.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { AdminApi } from '../../core/admin-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { AboutComponent } from './about.component';
import type { AboutInfo } from '../../core/api.types';

const INFO: AboutInfo = {
  instanceId: 'inst-abc-123',
  instanceLabel: 'My Brain',
  version: '1.4.4',
  uptime: '3d 4h',
  mongoVersion: '7.0.5',
  diskInfo: { total: 100, used: 40, available: 60 },
};

function make(getAbout: () => unknown) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AboutComponent, getTranslocoModule()],
    providers: [{ provide: AdminApi, useValue: { getAbout } }],
  });
  const f = TestBed.createComponent(AboutComponent);
  f.detectChanges(); // ngOnInit → load()
  return f;
}

describe('AboutComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());
  const el = (f: ReturnType<typeof make>) => f.nativeElement as HTMLElement;

  it('a successful load renders the instance/system fields', () => {
    const f = make(() => of({ ...INFO }));
    const c = f.componentInstance;
    expect(c.loading()).toBe(false);
    expect(c.error()).toBe('');
    expect(c.info()).toEqual(INFO);
    const text = el(f).textContent ?? '';
    expect(text).toContain('My Brain');
    expect(text).toContain('inst-abc-123');
    expect(text).toContain('1.4.4');
    expect(text).toContain('3d 4h');
    expect(text).toContain('7.0.5');
  });

  it('renders the disk usage figures (used / total)', () => {
    const f = make(() => of({ ...INFO }));
    const text = el(f).textContent ?? '';
    expect(text).toContain('40.0 B');   // used
    expect(text).toContain('100.0 B');  // total
  });

  it('diskPercent = used/total*100, and 0 when total is 0', () => {
    const f = make(() => of({ ...INFO }));
    expect(f.componentInstance.diskPercent()).toBeCloseTo(40);

    const z = make(() => of({ ...INFO, diskInfo: { total: 0, used: 0, available: 0 } }));
    expect(z.componentInstance.diskPercent()).toBe(0);
  });

  it('a load failure surfaces the server error message, and falls back when absent', () => {
    const f = make(() => throwError(() => ({ error: { error: 'boom from server' } })));
    expect(f.componentInstance.loading()).toBe(false);
    expect(f.componentInstance.error()).toBe('boom from server');
    expect(el(f).textContent).toContain('boom from server');

    const g = make(() => throwError(() => ({})));
    expect(g.componentInstance.error()).toBe('Failed to load about info');
  });

  it('while the request is pending it stays in the loading state (no info yet)', () => {
    const f = make(() => new Subject()); // never emits
    expect(f.componentInstance.loading()).toBe(true);
    expect(f.componentInstance.info()).toBeNull();
  });

  it('formatBytes renders human units', () => {
    const c = make(() => of({ ...INFO })).componentInstance;
    expect(c.formatBytes(0)).toBe('0 B');
    expect(c.formatBytes(512)).toBe('512.0 B');
    expect(c.formatBytes(2048)).toBe('2.0 KB');
    expect(c.formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(c.formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });

  it('disk health thresholds: <75 healthy, 75–89 warn, ≥90 critical', () => {
    const at = (used: number) => make(() => of({ ...INFO, diskInfo: { total: 100, used, available: 100 - used } }));
    // healthy — no warn/critical marker on the bar fill
    let f = at(40);
    expect(f.nativeElement.querySelector('.disk-bar-fill.warn')).toBeNull();
    expect(f.nativeElement.querySelector('.disk-bar-fill.critical')).toBeNull();
    // warn band
    f = at(80);
    expect(f.nativeElement.querySelector('.disk-bar-fill.warn')).toBeTruthy();
    // critical band
    f = at(95);
    expect(f.nativeElement.querySelector('.disk-bar-fill.critical')).toBeTruthy();
  });
});
