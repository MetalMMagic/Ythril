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
import { isOnPush } from '../../testing/onpush';

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
    expect(isOnPush(AuditLogComponent)).toBe(true);
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

  // The change list. Recorded server-side behind a per-operation allowlist, which makes ABSENCE the
  // subtle case: a detail panel that simply shows nothing reads as "this operation changed nothing",
  // when it actually means "changes are not recorded for this operation".
  describe('what changed', () => {
    it('lists the recorded field changes', () => {
      const fixture = create([]);
      fixture.componentInstance.showDetail(entry({
        operation: 'space.update',
        changes: [{ field: 'label', from: 'General', to: 'Renamed' }],
      }));
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('.changes-table tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('label');
      expect(rows[0].textContent).toContain('General');
      expect(rows[0].textContent).toContain('Renamed');
    });

    it('says changes are NOT RECORDED rather than showing an empty panel', () => {
      // Silence here would be read as "nothing happened" — the exact misreading this text prevents.
      const fixture = create([]);
      fixture.componentInstance.showDetail(entry({ operation: 'token.create' }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.changes-table')).toBeNull();
      expect(fixture.nativeElement.querySelector('.changes-none')).toBeTruthy();
    });

    it('distinguishes a field that was NOT SET from one set to null', () => {
      // Different facts: "this field was introduced" vs "this field was cleared". Rendering both as a
      // dash would lose exactly what an audit reader is trying to recover.
      const fixture = create([]);
      fixture.componentInstance.showDetail(entry({
        operation: 'space.update',
        changes: [
          { field: 'purpose', to: 'research' },          // no `from` — did not exist before
          { field: 'label', from: 'General', to: null }, // existed, cleared
        ],
      }));
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('.changes-table tbody tr');
      // The transloco test module echoes keys rather than translating, so match the marker either way —
      // what matters is that the two cases render DIFFERENTLY, not the wording.
      const notSet = /not set|notSet/;
      expect(rows[0].textContent).toMatch(notSet);          // no `from` → "not set"
      expect(rows[1].textContent).toContain('null');        // from present, to null → "null"
      expect(notSet.test(rows[1].textContent)).toBe(false); // and NOT conflated with "not set"
    });

    it('quotes strings so a value of "null" is not mistaken for the literal', () => {
      const c = fixture0().componentInstance;
      expect(c.fmtValue('null')).toBe('"null"');
      expect(c.fmtValue(null)).toBe('null');
      expect(c.fmtValue(true)).toBe('true');
      expect(c.fmtValue(42)).toBe('42');
    });

    function fixture0() { return create([]); }
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

  // ── PR-U5: design-system redesign ───────────────────────────────────────────
  it('renders a StatusPill per row with the variant mapped from the HTTP status', () => {
    const fixture = create([
      entry({ status: 200, operation: 'a' }),
      entry({ status: 404, operation: 'b' }),
      entry({ status: 503, operation: 'c' }),
    ]);
    const pills = Array.from(
      fixture.nativeElement.querySelectorAll('table.audit-table tbody app-status-pill .pill'),
    ) as HTMLElement[];
    expect(pills.length).toBe(3);
    const classes = pills.map(p => p.className);
    expect(classes.some(c => c.includes('ok'))).toBe(true);    // 200
    expect(classes.some(c => c.includes('warn'))).toBe(true);  // 404
    expect(classes.some(c => c.includes('error'))).toBe(true); // 503
  });

  it('gives 5xx rows a row-error stripe and auth failures a row-warn stripe (200 gets none)', () => {
    const fixture = create([
      entry({ status: 500, operation: 'a' }),
      entry({ status: 401, operation: 'auth.failed' }),
      entry({ status: 200, operation: 'b' }),
    ]);
    const rows = fixture.nativeElement.querySelectorAll('table.audit-table tbody tr');
    expect(rows[0].className).toContain('row-error');
    expect(rows[1].className).toContain('row-warn');
    expect(rows[2].className).not.toContain('row-');
  });

  it('summary strip counts client/server errors and auth failures in view', () => {
    const fixture = create([
      entry({ status: 404, operation: 'a' }),
      entry({ status: 500, operation: 'b' }),
      entry({ status: 401, operation: 'auth.failed' }),
      entry({ status: 200, operation: 'c' }),
    ]);
    expect(fixture.nativeElement.querySelector('app-summary-strip')).toBeTruthy();
    const items = fixture.componentInstance.summaryItems();
    const val = (frag: string) => items.find(i => i.label.includes(frag))?.value;
    expect(val('shown')).toBe(4);
    expect(val('clientErrors')).toBe(2); // 404 + 401
    expect(val('serverErrors')).toBe(1); // 500
    expect(val('authFailures')).toBe(1); // auth.failed
  });

  it('detail panel shows structured fields (method+path) and a collapsible raw-JSON block', () => {
    const fixture = create([entry()]);
    fixture.componentInstance.showDetail(
      entry({ operation: 'space.wipe', method: 'POST', path: '/api/admin/spaces/x/wipe', status: 500 }),
    );
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.detail-panel');
    expect(panel.querySelector('dl.detail-grid')).toBeTruthy();
    expect(panel.textContent).toContain('POST');
    expect(panel.textContent).toContain('/api/admin/spaces/x/wipe');
    expect(panel.querySelector('app-status-pill')).toBeTruthy();
    expect(panel.querySelector('details.detail-raw')).toBeTruthy(); // raw JSON is collapsible, not the whole panel
  });

  it('status filter options are derived from the statuses present in the results', () => {
    const fixture = create([
      entry({ status: 200, operation: 'a' }),
      entry({ status: 200, operation: 'b' }),
      entry({ status: 404, operation: 'c' }),
    ]);
    expect(fixture.componentInstance.statusOptions()).toEqual([200, 404]);
  });
});
