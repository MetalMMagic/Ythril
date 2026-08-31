/**
 * The file manager's formatters, tested where they live.
 *
 * `formatSize` and `msRange` were methods on a 1 600-line component, and their cases reached through it to
 * exercise four lines of arithmetic. That is how `toggleSort` and `sortArrow` came to be tested after the only
 * control that could call them had gone (G-7): a spec that reaches through a component keeps passing when the
 * component stops using the thing.
 *
 * Both are now shared functions — the preview and the extract view need them too — so their cases test the
 * functions.
 */
import { describe, it, expect } from 'vitest';
import { formatSize, msRange } from './file-format';

describe('formatSize', () => {
  it('switches unit at each 1024 boundary, and the boundary belongs to the LARGER unit', () => {
    expect(formatSize(1023)).toBe('1023 B');
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('widens precision with the unit: none, one, one, two', () => {
    // Deliberate rather than an oversight — a figure in gigabytes moves slowly enough that one decimal
    // would look stuck.
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    expect(formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });
});

describe('msRange', () => {
  it('renders a point as one clock and a span as a range', () => {
    expect(msRange(0, null)).toBe('0:00');
    expect(msRange(65_000, 30_000)).toBe('1:05-1:35');
  });

  it('a null offset renders NOTHING, not 0:00', () => {
    /*
     * The distinction the whole function turns on. A document chunk has no timed provenance at all, and
     * `0:00` would claim the very beginning of a file that has no timeline — a confident wrong answer where
     * an empty string is the true one.
     */
    expect(msRange(null, null)).toBe('');
    expect(msRange(null, 30_000)).toBe('');
  });

  it('rounds to the nearest second and never goes negative', () => {
    expect(msRange(1_400, null)).toBe('0:01');
    expect(msRange(1_600, null)).toBe('0:02');
    expect(msRange(-5_000, null)).toBe('0:00');
  });

  it('pads the seconds so a range stays column-aligned', () => {
    // These are read down a list of chunks; an unpadded `1:5` breaks the scan.
    expect(msRange(65_000, null)).toBe('1:05');
    expect(msRange(600_000, null)).toBe('10:00');
  });
});
