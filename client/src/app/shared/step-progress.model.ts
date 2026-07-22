/**
 * Turning a job's step report into a drawable bar.
 *
 * Kept pure and separate from the component because every judgement here is one that can be wrong in
 * a way that still *looks* fine — a bar that sits still and then jumps, or a single segment
 * pretending to be a breakdown. The component draws what this returns; it decides nothing.
 *
 * Input is `MediaJobDoc.progress` from #358: the stage now running, the full route THAT document
 * takes (from `decideRoute`, so it differs per file and per extraction level), and how far through
 * the current stage it is.
 */

/** What the server reports, mirrored from `MediaJobDoc.progress`. */
export interface StepProgress {
  step: string;
  steps: string[];
  done?: number;
  total?: number;
}

export interface Segment {
  step: string;
  /** Share of the bar's width, 0–1. Weighted — see `STEP_WEIGHTS`. */
  weight: number;
  state: 'done' | 'active' | 'pending';
  /** 0–1 within this segment. Only meaningful when `state === 'active'`. */
  fill: number;
}

export interface BarModel {
  /** Empty when the route is unknown or has fewer than two stages — see `segmented`. */
  segments: Segment[];
  /**
   * False when the bar must degrade to a plain one. A single-segment "breakdown" claims a
   * granularity that is not there: the OCR route really is one stage, and drawing it as a segmented
   * bar tells the reader there are others they are waiting for.
   */
  segmented: boolean;
  /** Overall 0–1 across the whole route, or null when genuinely unknown (indeterminate bar). */
  overall: number | null;
  /** Index into `segments`, or -1 when the active step is not on the reported route. */
  activeIndex: number;
}

/**
 * Relative cost per stage. **A display heuristic, not a measurement.**
 *
 * Equal-width segments would be actively misleading: on a 40-page PDF the VLM pass is minutes and
 * `validate` is milliseconds, so an even bar sits at 33 % for the whole job and then leaps to 100 %.
 * These weights only need to be roughly proportional to make the bar move at a believable rate; they
 * do not need to be accurate, and nothing downstream treats them as an estimate of time remaining.
 */
const STEP_WEIGHTS: Record<string, number> = {
  ocr: 2,
  render: 3,
  vlm: 10,       // dominates on every route that includes it
  validate: 0.5, // near-instant, but visible so the reader can see it happened
  repair: 6,
  verify: 5,
  embed: 1,
  chunk: 0.5,
  transcribe: 8,
  caption: 4,
  split: 1,
};
/** Anything the client has not been taught about still gets a share rather than collapsing to zero. */
const DEFAULT_WEIGHT = 2;

function weightOf(step: string): number {
  return STEP_WEIGHTS[step] ?? DEFAULT_WEIGHT;
}

/**
 * Build the bar model for one job.
 *
 * Returns a non-segmented, indeterminate model for anything it cannot describe honestly: no
 * progress, an empty route, or a single-stage route. That is the default rather than the exception —
 * an unknown shape drawn as a confident bar is worse than a spinner.
 */
export function buildBarModel(progress: StepProgress | null | undefined): BarModel {
  const steps = progress?.steps ?? [];
  if (!progress || steps.length === 0) {
    return { segments: [], segmented: false, overall: null, activeIndex: -1 };
  }

  const activeIndex = steps.indexOf(progress.step);

  // Fraction through the ACTIVE stage. `done`/`total` are optional: a stage that cannot count its
  // work (a single indivisible call) reports neither, and guessing 0 would make the bar look stuck
  // while guessing 50 % would invent progress. Treated as 0 for width, but `overall` stays honest.
  const hasUnits = typeof progress.done === 'number' && typeof progress.total === 'number' && progress.total > 0;
  // Clamp: a worker that overshoots its own estimate (more pages than predicted) must not push a
  // segment past its width or drive `overall` above 1.
  const activeFill = hasUnits ? Math.min(1, Math.max(0, progress.done! / progress.total!)) : 0;

  const segments: Segment[] = steps.map((step, i) => ({
    step,
    weight: weightOf(step),
    state: activeIndex < 0 ? 'pending' : i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending',
    fill: i === activeIndex ? activeFill : i < activeIndex ? 1 : 0,
  }));

  // Normalise weights to shares of the bar so the component never does arithmetic.
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0) || 1;
  for (const s of segments) s.weight = s.weight / totalWeight;

  // Overall is weighted too — otherwise finishing `validate` (0.5 weight) would advance the bar as
  // much as finishing `vlm` (10), which is the same lie the equal-width segments told.
  const overall = activeIndex < 0
    ? null
    : segments.reduce((sum, s) => sum + s.weight * s.fill, 0);

  return {
    segments,
    // One stage is not a breakdown. Degrade rather than draw a single box and imply there are more.
    segmented: steps.length > 1,
    overall,
    activeIndex,
  };
}

/**
 * True when a job has not reported in longer than the stall timeout.
 *
 * A frozen segment looks identical to a working one, which is precisely the failure #357 existed to
 * end — from the UI side this time. Better to say "no progress for 6 minutes" than to keep drawing a
 * bar that stopped moving.
 */
export function isStale(progressAt: string | null | undefined, stallTimeoutMs: number, now = Date.now()): boolean {
  if (!progressAt) return false;          // never reported: not the same claim as "stopped reporting"
  const t = Date.parse(progressAt);
  if (Number.isNaN(t)) return false;      // unparseable: do not accuse a job on a bad timestamp
  return now - t > stallTimeoutMs;
}
