/**
 * A worker's claim on a job, and what happens when it loses one.
 *
 * ## Why a token
 *
 * Stall recovery flips a `processing` job back to `pending` when nothing has reported progress for
 * `stalledJobTimeoutMs`. Recovery is what makes a crashed pod's work resumable, so it cannot be removed —
 * but until now it also had no way to tell the *previous* holder that its claim was gone. When a live job
 * was recovered (because the phase it was in reported no progress), the outcome was two runs on the same
 * file: the old one still embedding, the new one starting over, each writing the same chunk `_id`s, both
 * competing for the same CPU that the first one was already too slow on.
 *
 * The token is compared on every heartbeat. Recovery clears it, so the next heartbeat from the old holder
 * matches nothing, and that is the signal to stop — one extra field, no extra round trip, and it uses the
 * write the heartbeat was already making.
 *
 * ## Why the loser stops rather than finishes
 *
 * The recovered job is `pending` with `attempts` already incremented: the queue has decided a new run owns
 * this file. If the old run finished anyway it would write chunks the new run then overwrites, and could
 * report `complete` on a job the queue has re-queued — a completed job with a live claimant.
 */

/** A fresh claim token. Random rather than time-based: two pods claiming in the same millisecond must differ. */
export function newClaimToken(): string {
  // `randomUUID` is available on Node 18+; this module is imported by the worker, never by the client.
  return crypto.randomUUID();
}

/**
 * Thrown when a job's claim was taken away while it was running.
 *
 * Not a failure of the work: the file is fine and another claimant is already on it. The worker treats it
 * as an abandonment — no `failJob` (which would burn an attempt and write a `lastError` describing nothing
 * wrong), no `completeJob` (which would mark a re-queued job done).
 */
export class JobLeaseLostError extends Error {
  readonly spaceId: string;
  readonly jobId: string;

  constructor(spaceId: string, jobId: string) {
    super(`Lease lost for ${spaceId}/${jobId} — the job was re-queued while it was still running`);
    this.name = 'JobLeaseLostError';
    this.spaceId = spaceId;
    this.jobId = jobId;
  }
}

/** True when `err` is a lost lease, including across module instances (name check, not `instanceof`). */
export function isLeaseLost(err: unknown): boolean {
  return err instanceof JobLeaseLostError
    || (err instanceof Error && err.name === 'JobLeaseLostError');
}

/**
 * How long a heartbeat may be withheld while a phase makes many small steps.
 *
 * Chunk embedding lands a step every ~200 ms and each heartbeat is a database write, so an unthrottled
 * heartbeat would triple the writes the phase performs to say nothing new. 2 s is far below any usable
 * `stalledJobTimeoutMs` (the minimum the API accepts is 30 s) and far above the cost of a write.
 */
export const HEARTBEAT_MIN_INTERVAL_MS = 2_000;

/**
 * Should this step's heartbeat be written, given when the last one was?
 *
 * `isLast` forces a write so the final state of a phase is always recorded — a progress bar that stops at
 * 47/50 because the last three steps fell inside the throttle window reads as a hang.
 */
export function shouldHeartbeat(lastWriteAt: number, now: number, isLast = false): boolean {
  return isLast || now - lastWriteAt >= HEARTBEAT_MIN_INTERVAL_MS;
}

/**
 * One line describing a job that stall recovery is about to re-queue.
 *
 * Exists because the log said `reset 1 stalled job(s) to pending` at `info`, which names neither the file
 * nor how long it was quiet — so a fleet whose large documents were being recovered mid-flight had a
 * `WARN`-free log and no way to connect the restarts to a document. Everything an operator needs to decide
 * "too slow" vs "wedged" goes on the line: which file, how long silent, how big, which step it was in, and
 * which attempt this is.
 */
export function stalledJobWarning(job: {
  spaceId?: string;
  _id?: string;
  filePath?: string;
  progressAt?: string | null;
  claimedAt?: string | null;
  attempts?: number;
  maxAttempts?: number;
  progress?: { step?: string; done?: number; total?: number } | null;
}, nowMs: number, sizeBytes?: number): string {
  const since = job.progressAt ?? job.claimedAt ?? null;
  const quietMs = since ? Math.max(0, nowMs - Date.parse(since)) : NaN;
  const quiet = Number.isFinite(quietMs) ? `${Math.round(quietMs / 1000)}s` : 'unknown time';
  const where = job.progress?.step
    ? `${job.progress.step}${job.progress.done !== undefined ? ` ${job.progress.done}/${job.progress.total ?? '?'}` : ''}`
    : 'no step reported';
  const size = sizeBytes !== undefined && Number.isFinite(sizeBytes)
    ? `${(sizeBytes / 1024).toFixed(0)} KiB` : 'unknown size';
  return `Media worker: re-queued ${job.spaceId ?? '?'}/${job.filePath ?? job._id ?? '?'} after ${quiet}`
    + ` with no progress (${size}, last step: ${where}, attempt ${job.attempts ?? '?'}/${job.maxAttempts ?? '?'}).`
    + ` If the file is large and the instance is CPU-bound this is a slow job being killed, not a stuck one:`
    + ` raise stalledJobTimeoutMs or lower embedding.embedConcurrency.`;
}
