/**
 * How long ONE render call is allowed to take — as a named value, because a derived one is invisible.
 *
 * ## The defect this exists to close
 *
 * The render of a page window is the LONGEST single step a document job takes, and the stall detector did not
 * know it existed. Measured at the DEFAULTS, no configuration change involved:
 *
 *     stalledJobTimeoutMs                       300 000 ms
 *     floor from hopBudgets()  1.5 x ocrTimeoutMs 120 000  ->  300 000 ms  (no raise)
 *     actual render budget     pageTimeoutMs 60 000 x min(maxPages 50, 20)  ->  1 200 000 ms
 *
 * **Four times over.** And a render reports no progress while it runs — the per-page beat fires after the call
 * returns — so the stall sweep re-queues the job mid-render, the replacement renders the same window, and is
 * re-queued at the same point. The loop that never finishes, which `stall-floor.ts` was written to prevent,
 * reached at the defaults rather than through configuration. At the `pageTimeoutMs` ceiling (600 000) it is a
 * 3 h 20 m silent step against a 15-minute floor.
 *
 * ## Why it was invisible
 *
 * `hopBudgets()` listed three CONFIG KEYS. This budget is not a config key — it is a product computed at the
 * call site, so a list of names could never contain it. That is the "a hand-maintained list is never proved
 * complete" failure again, and the cure is the same one: one named function, used by both the caller and the
 * stall floor, so the two cannot disagree.
 */

/**
 * Pages of head-room a single render call gets, beyond which extra pages buy no extra time.
 *
 * A render is one sidecar round trip over a whole window, and its cost grows with the page count until the
 * sidecar's own parallelism saturates. The cap keeps a large `maxPages` from multiplying the budget without
 * limit — 20 pages of budget for a 50-page window is the shipped behaviour, preserved here deliberately rather
 * than re-tuned, because this change is about the stall detector KNOWING the number, not about changing it.
 */
export const RENDER_PAGE_BUDGET_CAP = 20;

/** Mirrors the `pageTimeoutMs` default so this module is answerable with a partial config. */
export const DEFAULT_PAGE_TIMEOUT_MS = 60_000;

/** Mirrors the `maxPages` default — the widest window, and therefore the worst case. */
export const DEFAULT_MAX_PAGES = 50;

/**
 * The timeout for one render call of `pages` pages, given the per-page model budget.
 *
 * Total and pure: it takes numbers and returns a number, so the value the stall floor uses is provably the
 * value the call site uses. `pages` is clamped to at least 1 so a zero-page window still gets a real budget
 * rather than an instant abort.
 */
export function renderWindowTimeoutMs(pageTimeoutMs: number, pages: number): number {
  const perPage = Number.isFinite(pageTimeoutMs) && pageTimeoutMs > 0 ? pageTimeoutMs : DEFAULT_PAGE_TIMEOUT_MS;
  const n = Number.isFinite(pages) && pages > 0 ? Math.trunc(pages) : 1;
  return perPage * Math.min(n, RENDER_PAGE_BUDGET_CAP);
}

/**
 * The WORST-CASE render budget for a configuration — what the stall detector must not fire inside.
 *
 * Uses the configured window size rather than the window actually rendered, because the floor has to hold for
 * the largest render the config permits, not for the one that happens to be running.
 */
export function worstRenderWindowMs(cfg: { pageTimeoutMs?: number; maxPages?: number }): number {
  return renderWindowTimeoutMs(
    cfg.pageTimeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS,
    cfg.maxPages ?? DEFAULT_MAX_PAGES,
  );
}
