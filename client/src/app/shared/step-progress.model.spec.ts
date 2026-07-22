/**
 * The step-progress bar model.
 *
 * Every judgement here can be wrong in a way that still LOOKS fine, which is why it is pure and
 * tested directly rather than asserted through a rendered component. The two that matter:
 *
 *  - **the degrade rule** — a one-stage route drawn as a segmented bar claims a granularity that is
 *    not there, telling the reader there are further stages they are waiting for. The OCR route
 *    really is one stage, so this is the common case, not an edge case.
 *  - **the weighting** — equal-width segments would sit at 33 % for the minutes the VLM pass takes
 *    and then leap to 100 %. A bar that moves at a believable rate is the entire point of the
 *    feature; one that stalls and jumps is worse than the spinner it replaces.
 */
import { describe, it, expect } from 'vitest';
import { buildBarModel, isStale } from './step-progress.model';

describe('buildBarModel — degrading honestly', () => {
  it('returns an indeterminate model when there is no progress at all', () => {
    for (const input of [null, undefined, { step: 'ocr', steps: [] }]) {
      const m = buildBarModel(input as never);
      expect(m.segmented).toBe(false);
      expect(m.overall).toBeNull();
      expect(m.segments).toEqual([]);
    }
  });

  it('THE DEGRADE RULE: a single-stage route is not drawn as segmented', () => {
    // The OCR route has exactly one stage. One box with a border around it reads as "step 1 of
    // several", which is a claim about work that does not exist.
    const m = buildBarModel({ step: 'ocr', steps: ['ocr'], done: 3, total: 10 });
    expect(m.segmented).toBe(false);
    expect(m.overall).toBeCloseTo(0.3, 5);   // still reports real progress — just not as sections
  });

  it('a multi-stage route is segmented', () => {
    const m = buildBarModel({ step: 'render', steps: ['ocr', 'render', 'vlm', 'validate'] });
    expect(m.segmented).toBe(true);
    expect(m.segments).toHaveLength(4);
  });

  it('an active step that is not on the reported route does not throw or fake a position', () => {
    // Shapes drift: a worker on a newer build can report a stage this client has never heard of.
    const m = buildBarModel({ step: 'transmogrify', steps: ['ocr', 'vlm'] });
    expect(m.activeIndex).toBe(-1);
    expect(m.overall).toBeNull();                       // unknown, not zero
    expect(m.segments.every(s => s.state === 'pending')).toBe(true);
  });

  it('an unrecognised step still gets a share of the bar rather than collapsing to zero width', () => {
    const m = buildBarModel({ step: 'brandnew', steps: ['brandnew', 'embed'] });
    expect(m.segments[0].weight).toBeGreaterThan(0);
    expect(m.segments.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 5);
  });
});

describe('buildBarModel — segment states and fill', () => {
  const route = ['ocr', 'render', 'vlm', 'validate'];

  it('marks earlier stages done, the current one active, later ones pending', () => {
    const m = buildBarModel({ step: 'vlm', steps: route, done: 5, total: 10 });
    expect(m.segments.map(s => s.state)).toEqual(['done', 'done', 'active', 'pending']);
    expect(m.segments[0].fill).toBe(1);
    expect(m.segments[2].fill).toBeCloseTo(0.5, 5);
    expect(m.segments[3].fill).toBe(0);
  });

  it('a stage that cannot count its work is not drawn as half-finished', () => {
    // No done/total means one indivisible call. Inventing 50% would be fabricated progress.
    const m = buildBarModel({ step: 'vlm', steps: route });
    expect(m.segments[2].fill).toBe(0);
    expect(m.overall).toBeGreaterThan(0);   // the completed stages still count
  });

  it('clamps a worker that overshoots its own estimate', () => {
    // More pages than predicted must not push a segment past its width or overall past 1.
    const m = buildBarModel({ step: 'vlm', steps: route, done: 99, total: 10 });
    expect(m.segments[2].fill).toBe(1);
    expect(m.overall).toBeLessThanOrEqual(1);
  });

  it('ignores a nonsense total instead of dividing by zero', () => {
    const m = buildBarModel({ step: 'vlm', steps: route, done: 5, total: 0 });
    expect(Number.isFinite(m.overall!)).toBe(true);
    expect(m.segments[2].fill).toBe(0);
  });

  it('weights always sum to the full bar', () => {
    for (const steps of [['ocr'], ['ocr', 'vlm'], ['ocr', 'render', 'vlm', 'validate', 'repair', 'verify', 'embed']]) {
      const m = buildBarModel({ step: steps[0], steps });
      expect(m.segments.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 5);
    }
  });
});

describe('buildBarModel — the weighting is what stops the bar stalling then jumping', () => {
  const route = ['ocr', 'render', 'vlm', 'validate'];

  it('gives the dominant stage the largest share of the bar', () => {
    const m = buildBarModel({ step: 'ocr', steps: route });
    const w = Object.fromEntries(m.segments.map(s => [s.step, s.weight]));
    expect(w['vlm']).toBeGreaterThan(w['ocr']);
    expect(w['vlm']).toBeGreaterThan(w['render']);
    expect(w['vlm']).toBeGreaterThan(w['validate']);
  });

  it('a near-instant stage does not advance the bar as much as a long one', () => {
    // Equal weights would make finishing `validate` worth as much as finishing `vlm` — the exact
    // lie that makes a progress bar untrustworthy.
    const afterValidate = buildBarModel({ step: 'validate', steps: route, done: 1, total: 1 }).overall!;
    const afterVlm = buildBarModel({ step: 'validate', steps: route }).overall!;
    expect(afterValidate - afterVlm).toBeLessThan(0.1);
  });

  it('overall only reaches 1 when the last stage is complete', () => {
    const m = buildBarModel({ step: 'validate', steps: route, done: 1, total: 1 });
    expect(m.overall).toBeCloseTo(1, 5);
  });
});

describe('isStale — a frozen bar must not look like a working one', () => {
  const NOW = Date.parse('2026-07-22T12:00:00.000Z');

  it('is stale once nothing has been reported for longer than the timeout', () => {
    expect(isStale('2026-07-22T11:50:00.000Z', 5 * 60_000, NOW)).toBe(true);
  });

  it('is not stale while reports are still arriving', () => {
    expect(isStale('2026-07-22T11:59:30.000Z', 5 * 60_000, NOW)).toBe(false);
  });

  it('a job that has never reported is not accused of stalling', () => {
    // "No heartbeat yet" and "stopped heartbeating" are different claims; only the second is a fault.
    expect(isStale(null, 5 * 60_000, NOW)).toBe(false);
    expect(isStale(undefined, 5 * 60_000, NOW)).toBe(false);
  });

  it('an unparseable timestamp is not treated as ancient', () => {
    // Date.parse returns NaN, and NaN comparisons are false in a way that is easy to get backwards —
    // getting it backwards would mark every job stale.
    expect(isStale('not-a-date', 5 * 60_000, NOW)).toBe(false);
  });
});
