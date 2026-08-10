import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { TimestampComponent, formatTimestampParts, toEpochMs } from './timestamp.component';

/**
 * The absolute-time treatment for data tables.
 *
 * Every test pins `timeZone` and `locale`. Without that these assertions pass in one office and fail in the next,
 * which is the specific way a local-rendering test is worthless — and this component exists precisely because
 * rendering is local while storage is not.
 */
describe('formatTimestampParts', () => {
  const UTC_NOON = '2026-08-10T12:00:03.000Z';

  it('renders the date and the time SEPARATELY', () => {
    const p = formatTimestampParts(UTC_NOON, 'de-DE', 'UTC')!;
    expect(p.date).toBe('10.08.2026');
    expect(p.time).toBe('12:00:03');
  });

  it('includes SECONDS, which the format it replaces dropped', () => {
    // `HH:mm` was the majority format. An audit log where two entries share a minute is unreadable without these.
    expect(formatTimestampParts(UTC_NOON, 'en-GB', 'UTC')!.time).toBe('12:00:03');
  });

  it('converts to the given zone — the whole point of "render local"', () => {
    const p = formatTimestampParts(UTC_NOON, 'de-DE', 'Europe/Berlin')!;
    expect(p.time).toBe('14:00:03');   // CEST, UTC+2 in August
    expect(p.date).toBe('10.08.2026');
  });

  it('crosses the DATE line when the zone says so', () => {
    // A late-evening UTC timestamp is the next day in Berlin. If only the time were converted, the two lines would
    // disagree with each other and the row would be wrong in a way nobody would question.
    const p = formatTimestampParts('2026-08-10T23:30:00.000Z', 'de-DE', 'Europe/Berlin')!;
    expect(p.date).toBe('11.08.2026');
    expect(p.time).toBe('01:30:00');
  });

  it('keeps the ISO as UTC, never the localised string', () => {
    // The DOM must stay UTC: `datetime` is what a test, a scraper or a copy-paste reads. This is the assertion that
    // holds the owner's "we save utc, render local" line at the boundary.
    expect(formatTimestampParts(UTC_NOON, 'de-DE', 'Europe/Berlin')!.iso).toBe(UTC_NOON);
  });

  it('uses a 24-hour clock regardless of locale', () => {
    // Left to the locale, `en-US` gives `11:59:03 PM` while `de-DE` gives `23:59:03` — a column mixing both cannot
    // be scanned, which is the drift this component exists to end.
    expect(formatTimestampParts('2026-08-10T23:59:03.000Z', 'en-US', 'UTC')!.time).toBe('23:59:03');
  });

  it('accepts an ISO string, epoch-ms and a Date alike', () => {
    const ms = Date.parse(UTC_NOON);
    for (const v of [UTC_NOON, ms, new Date(ms)]) {
      expect(formatTimestampParts(v, 'de-DE', 'UTC')!.time).toBe('12:00:03');
    }
  });

  it('returns null for absent or unparseable input rather than a plausible date', () => {
    // `new Date(undefined)` is Invalid Date and `Intl` would render "Invalid Date" into the cell. Returning null lets
    // the component show a dash instead of a string that looks like a bug in the data.
    for (const v of [null, undefined, '', 'not a date', NaN]) {
      expect(formatTimestampParts(v as never, 'de-DE', 'UTC')).toBe(null);
    }
  });
});

describe('toEpochMs, which exists so nobody sorts the rendered text', () => {
  it('orders two timestamps the way a string comparison would NOT', () => {
    // `01.02.2026` vs `02.01.2025`: as strings the 2026 date sorts first, which is wrong and looks plausible.
    const later = toEpochMs('2026-02-01T00:00:00Z')!;
    const earlier = toEpochMs('2025-01-02T00:00:00Z')!;
    expect(earlier).toBeLessThan(later);
    expect('01.02.2026' < '02.01.2025').toBe(true);   // the trap, asserted so it is not theoretical
  });

  it('is null for unparseable input, so a bad row does not sort as epoch 0', () => {
    expect(toEpochMs('nonsense')).toBe(null);
  });
});

describe('TimestampComponent', () => {
  const render = (value: unknown, over: Record<string, unknown> = {}) => {
    const f = TestBed.createComponent(TimestampComponent);
    f.componentRef.setInput('value', value);
    f.componentRef.setInput('locale', 'de-DE');
    f.componentRef.setInput('timeZone', 'UTC');
    for (const [k, v] of Object.entries(over)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [TimestampComponent] }).compileComponents();
  });

  it('renders two lines inside a machine-readable <time>', () => {
    const el = render('2026-08-10T12:00:03.000Z').nativeElement as HTMLElement;
    expect(el.querySelector('.d')!.textContent).toBe('10.08.2026');
    expect(el.querySelector('.t')!.textContent).toBe('12:00:03');
    expect(el.querySelector('time')!.getAttribute('datetime')).toBe('2026-08-10T12:00:03.000Z');
  });

  it('shows a dash for an absent value, not an empty cell', () => {
    // An empty cell reads as a layout bug and invites someone to "fix" the component.
    const el = render(null).nativeElement as HTMLElement;
    expect(el.textContent!.trim()).toBe('—');
    expect(el.querySelector('time')).toBe(null);
  });

  it('exposes epoch-ms as a sort key', () => {
    const f = render('2026-08-10T12:00:03.000Z');
    expect(f.componentInstance.sortKey()).toBe(Date.parse('2026-08-10T12:00:03.000Z'));
  });

  it('sortKey is null when the value is unusable, rather than 0', () => {
    // Zero would sort a broken row to 1970 and look like real data.
    expect(render('nonsense').componentInstance.sortKey()).toBe(null);
  });
});
