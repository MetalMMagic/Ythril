/**
 * AuditLogComponent — verifies the OnPush conversion (P5, slice 2).
 *
 * Every rendered value on this page is a signal. The point of these tests is the OnPush
 * regression guard: after switching the component to OnPush, the signal-driven views must still
 * update — the row table when `entries` is set, the detail panel when `selectedEntry` is set, the
 * empty state when there are no rows. If the conversion had broken change detection, one of these
 * would render stale and the assertion would catch it. (The harness's negative control in
 * change-detection-harness.spec.ts separately proves this harness *can* see a stale OnPush view,
 * so a passing assertion here means the view genuinely refreshed, not that staleness is invisible.)
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { type AuditLogEntry } from '../../core/api.types';
import { AdminApi } from '../../core/admin-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { AuditLogComponent } from './audit-log.component';

function entry(over: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    _id: 'id-' + (over.operation ?? 'x'),
    timestamp: '2026-07-14T10:00:00.000Z',
    operation: 'memory.create',
    status: 200,
    ip: '10.0.0.1',
    durationMs: 12,
    ...over,
  } as AuditLogEntry;
}

/** Minimal API stub: the component only calls these three, all Observable-returning. */
function makeApi(entries: AuditLogEntry[]) {
  return {
    listSpaces: () => of({ spaces: [] }),
    getAuditLog: () => of({ entries, total: entries.length, hasMore: false, retentionDays: 90 }),
    getAboutLogs: () => of({ lines: [] }),
    mintLogsTicket: () => of({ ticket: 't', expiresInMs: 60000 }),
  } as any;
}

describe('AuditLogComponent (OnPush)', () => {
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  function create(entries: AuditLogEntry[]) {
    TestBed.configureTestingModule({
      imports: [AuditLogComponent, getTranslocoModule()],
      providers: [
        { provide: AdminApi, useValue: makeApi(entries) },
        { provide: SpacesApi, useValue: makeApi(entries) },
      ],
    });
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges(); // ngOnInit → load() resolves synchronously via of()
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(AuditLogComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders a table row per audit entry after load (signal-driven view updates under OnPush)', () => {
    const fixture = create([entry({ operation: 'memory.create' }), entry({ operation: 'entity.delete' })]);
    const rows = fixture.nativeElement.querySelectorAll('table.audit-table tbody tr');
    expect(rows.length).toBe(2);
    expect(text(fixture)).toContain('memory.create');
    expect(text(fixture)).toContain('entity.delete');
  });

  it('shows the empty state when there are no entries', () => {
    const fixture = create([]);
    expect(fixture.nativeElement.querySelector('table.audit-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty')).toBeTruthy();
  });

  it('opens the detail panel when selectedEntry is set (OnPush re-checks the signal)', () => {
    const fixture = create([entry({ operation: 'space.wipe' })]);
    expect(fixture.nativeElement.querySelector('.detail-panel')).toBeNull();

    fixture.componentInstance.showDetail(entry({ operation: 'space.wipe' }));
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.detail-panel');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('space.wipe');
  });

  it('re-renders rows when the entries signal is replaced (not just on first load)', () => {
    // Scope to the table body — the filter dropdown lists every operation name, so the
    // full-page text always contains them regardless of what rows are shown.
    const body = (f: { nativeElement: HTMLElement }) =>
      (f.nativeElement.querySelector('table.audit-table tbody') as HTMLElement)?.textContent ?? '';

    const fixture = create([entry({ operation: 'memory.create' })]);
    expect(body(fixture)).toContain('memory.create');
    expect(body(fixture)).not.toContain('token.delete');

    fixture.componentInstance.entries.set([entry({ operation: 'token.delete' })]);
    fixture.detectChanges();

    expect(body(fixture)).toContain('token.delete');
    expect(body(fixture)).not.toContain('memory.create');
  });
});
