/**
 * The wake-up and space-probing machinery a per-space job queue needs, with no job type in it.
 *
 * ## Why this is a module and not two copies
 *
 * `files/media/job-queue.ts` grew a careful answer to two problems that have nothing to do with media:
 *
 *  - **latency on an idle queue.** A worker that backs its poll off to 30 s is right for CPU and wrong
 *    for latency — work enqueued into an idle system waits up to the full interval before anything
 *    starts. The fix is an announcement that wakes the sleeper, plus an epoch counter to close the race
 *    where work arrives *between* a failed claim and the start of the sleep.
 *  - **the empty-queue walk.** Per-space collections mean claiming walks the spaces one
 *    `findOneAndUpdate` at a time. On an idle 100-space instance that is ~300 useless round trips per
 *    tick. A hint records which spaces might hold claimable work; a periodic full scan re-seeds it, which
 *    is what stops a job whose retry backoff has not yet elapsed from sitting unnoticed forever.
 *
 * Both are properties of "a queue with per-space collections and a sleeping worker". The brain embedding
 * queue is exactly that, and re-deriving forty lines of race-closing logic for it is how a codebase ends
 * up with two subtly different answers to one question — the same finding as `merge-fields.ts`.
 *
 * ## Why a factory rather than module-level state
 *
 * The media queue held `_workEpoch` and `_wakeWaiters` as module globals, which is correct while there
 * is one queue. With two, shared globals would mean a brain enqueue wakes the media worker: harmless
 * (it claims nothing and sleeps again) but it turns an idle instance into one that wakes on every write
 * and makes "why did this worker wake" unanswerable. Each queue gets its own signal.
 */

/** How long a queue may go without re-probing every space, however quiet the hint says it is. */
export const DEFAULT_FULL_SCAN_INTERVAL_MS = 30_000;

/** A monotonic clock, injectable so the tests do not sleep. Defaults to `Date.now`. */
export type NowFn = () => number;

export interface WorkSignal {
  /** Monotonic counter, bumped every time claimable work is announced. */
  currentEpoch(): number;
  /**
   * Sleep up to `ms`, returning early if work is announced. Resolves true if woken, false on timeout.
   *
   * `sinceEpoch` must be sampled BEFORE the caller's claim attempt — that is what makes the race
   * closed rather than merely unlikely.
   */
  wait(ms: number, sinceEpoch: number): Promise<boolean>;
  /** Wake every waiter. Used on announcement, and on shutdown so stopping is not delayed. */
  wake(): void;
  /** Record that a space may have claimable work (enqueue, requeue-on-failure, stall reset). */
  markSpaceMayHaveWork(spaceId: string): void;
  /**
   * The spaces worth probing on this claim: every space when a full scan is due, otherwise only the
   * hinted ones. Calling this CONSUMES the full-scan slot, so call it once per claim.
   */
  spacesToProbe(spaceIds: string[]): string[];
  /** A space that just yielded a job — keep probing it next time. */
  noteClaimed(spaceId: string): void;
  /** A space with nothing claimable right now. A future announcement or full scan puts it back. */
  noteEmpty(spaceId: string): void;
  /** Test seam: forget everything the hint knows, forcing the next claim to do a full scan. */
  reset(): void;
}

export function createWorkSignal(opts: {
  fullScanIntervalMs?: number;
  now?: NowFn;
} = {}): WorkSignal {
  const fullScanIntervalMs = opts.fullScanIntervalMs ?? DEFAULT_FULL_SCAN_INTERVAL_MS;
  const now = opts.now ?? Date.now;

  const pendingHint = new Set<string>();
  let lastFullScan = 0;
  let epoch = 0;
  let waiters: Array<() => void> = [];

  return {
    currentEpoch: () => epoch,

    wait(ms, sinceEpoch) {
      // Work already arrived while the caller was claiming — do not sleep at all.
      if (epoch !== sinceEpoch) return Promise.resolve(true);

      return new Promise<boolean>(resolve => {
        let settled = false;
        const finish = (woken: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          waiters = waiters.filter(w => w !== wake);
          resolve(woken);
        };
        const wake = () => finish(true);
        const timer = setTimeout(() => finish(false), ms);
        // Unref'd: a sleeping worker must never be the reason the process will not exit.
        if (typeof timer.unref === 'function') timer.unref();
        waiters.push(wake);
      });
    },

    wake() {
      const current = waiters;
      waiters = [];
      for (const w of current) w();
    },

    markSpaceMayHaveWork(spaceId) {
      pendingHint.add(spaceId);
      epoch++;
      this.wake();
    },

    spacesToProbe(spaceIds) {
      const due = now() - lastFullScan >= fullScanIntervalMs;
      if (due) {
        lastFullScan = now();
        return spaceIds;
      }
      return spaceIds.filter(s => pendingHint.has(s));
    },

    noteClaimed(spaceId) { pendingHint.add(spaceId); },
    noteEmpty(spaceId) { pendingHint.delete(spaceId); },

    reset() {
      pendingHint.clear();
      lastFullScan = 0;
    },
  };
}
