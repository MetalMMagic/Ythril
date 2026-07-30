/**
 * Jitter for retry backoff — the part that stops a recovering dependency being knocked straight back
 * over by the clients that were waiting for it.
 *
 * ## The failure this prevents
 *
 * Both retry queues here already back off exponentially, which is the half everyone remembers. But the
 * delay was *exactly* the same for every job, so failures that happen together retry together. Upload
 * twenty files while the document sidecar is restarting and all twenty fail within the same second, all
 * wait exactly 30 000 ms, and all hit the sidecar again on the same tick — a synchronised herd, aimed at
 * something that has just come back up and is at its most fragile. If that knocks it over, the twenty
 * fail together again and re-synchronise on the next step of the schedule.
 *
 * Backoff spaces retries out *over time*. Jitter spaces them out *across clients*. Neither substitutes
 * for the other, and the second one is the one that was missing.
 *
 * ## Equal jitter, not full jitter
 *
 * Full jitter (`random(0, delay)`) spreads best but throws away the floor: a job can retry almost
 * immediately after failing, which defeats the point of having chosen 30 s. Equal jitter keeps half the
 * delay as a guaranteed minimum and randomises the rest, so the schedule still means what it says while
 * the herd still breaks up. For a queue measured in tens of jobs rather than thousands, that is the
 * better trade.
 */

/**
 * `delayMs` scattered to somewhere in `[delayMs/2, delayMs)`.
 *
 * Returns 0 for a non-positive delay, so "retry immediately" stays immediate rather than becoming a
 * random tiny wait.
 */
export function withJitter(delayMs: number): number {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  const half = delayMs / 2;
  return Math.round(half + Math.random() * half);
}
