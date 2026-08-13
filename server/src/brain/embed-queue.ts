/**
 * The embedding job queue for brain records — memories, entities, edges, chrono entries.
 *
 * ## Why writes stopped waiting for the model
 *
 * Every brain creator embedded inline, so the caller paid the model's latency on every write. Three of
 * the four then swallowed a failure (`try { embed } catch`) and stored the record without a vector;
 * `remember` did not, so a memory write failed outright whenever the embedder was down. Two behaviours,
 * neither of them chosen by the caller, and no path back for a record that missed its vector short of a
 * manual whole-space `POST /reindex` that re-embeds *everything*.
 *
 * A record with no vector is not a slightly worse record — it is **invisible to recall**. Both channels
 * drop it: the vector search never returns it, and the lexical channel's `introduceLexicalOnly` needs an
 * embedding to compute a real similarity and skips what it cannot score. So "stored but never embedded"
 * is silent data loss from the searcher's point of view, and nothing measured it.
 *
 * This queue makes the gap **temporary and self-healing**: the write returns as soon as the record is
 * durable, a worker embeds it moments later, and a failure retries with backoff instead of being final.
 *
 * ## What is deliberately NOT changed
 *
 * A caller who needs the record searchable when the call returns says so — `waitForEmbedding: true` —
 * and gets exactly the old behaviour, including the old failure mode. It is opt-in rather than the
 * default because the common case (an agent writing a memory) does not care, and the uncommon case
 * (write-then-immediately-search) can no longer be silently wrong.
 *
 * ## One job per record, not one per write
 *
 * `_id` is `<type>:<recordId>`, so a record written five times in a second has one job at the end
 * holding its latest content — the work is coalesced rather than queued five deep. This is the same
 * shape the media queue uses (`_id` = file id) and the reason neither queue needs de-duplication logic.
 *
 * Scheduling — the wake signal, the epoch race, the per-space probe hint — is `util/work-signal.ts`,
 * shared with the media queue. Only the job shape and the collection differ.
 */

import { col, asFilter, asDoc, asUpdate } from '../db/mongo.js';
import { withJitter } from '../util/backoff.js';
import { createWorkSignal } from '../util/work-signal.js';
import { newClaimToken } from '../files/media/lease.js';
import type { BrainEmbedJobDoc, BrainEmbedRecordType } from '../config/types.js';

/** Attempts before a job is left `failed` for an operator (or a rewrite) to deal with. */
export const MAX_EMBED_ATTEMPTS = 5;

/**
 * More attempts than the media queue's three, for a different failure profile. A media job fails on a
 * malformed file — retrying identical bytes through the same decoder is unlikely to help. An embedding
 * job fails because the model is loading, the sidecar is restarting, or an external provider is rate
 * limiting: all transient, all resolved by waiting. The backoff carries the schedule; this only bounds it.
 */
const RETRY_BACKOFF_MS: Record<number, number> = {
  1: 5_000,
  2: 30_000,
  3: 120_000,
  4: 600_000,
};

function nextClaimableAfter(nextAttempt: number): string {
  const delay = RETRY_BACKOFF_MS[nextAttempt] ?? 1_800_000;
  // Jittered for the same reason the media queue jitters: a thousand records enqueued while the model
  // was loading would otherwise all become claimable on the same tick and hit it together.
  return new Date(Date.now() + withJitter(delay)).toISOString();
}

const _signal = createWorkSignal();

function jobs(spaceId: string) {
  return col<BrainEmbedJobDoc>(`${spaceId}_embed_jobs`);
}

/** Composite id, so a rewrite of the same record replaces its job rather than adding one. */
export function embedJobId(recordType: BrainEmbedRecordType, recordId: string): string {
  return `${recordType}:${recordId}`;
}

/**
 * The indexes `<space>_embed_jobs` needs, declared where the queries live.
 *
 * Same two shapes as the media queue and for the same reasons: `status` leads because every query pins
 * it to one value, and the sort key comes last so it is satisfied by the index rather than in memory.
 */
export const EMBED_JOB_INDEXES: Array<Record<string, 1>> = [
  // claimNextEmbedJob: { status, $or:[claimableAfter …] } sorted by createdAt.
  { status: 1, claimableAfter: 1, createdAt: 1 },
  // resetStalledEmbedJobs: { status, progressAt < cutoff }, and the per-status counts.
  { status: 1, progressAt: 1 },
];

/** Idempotent — safe on every boot for every space, including spaces that predate this queue. */
export async function ensureEmbedJobIndexes(spaceId: string): Promise<void> {
  for (const keys of EMBED_JOB_INDEXES) await jobs(spaceId).createIndex(keys);
}

/**
 * Announce that a record needs embedding.
 *
 * Always resets `status`, `attempts` and `claimableAfter`: a new write is new content, so a job that had
 * exhausted its attempts on the OLD content must not inherit that verdict. This is what makes rewriting
 * a record the operator's escape hatch from a permanently failed job.
 *
 * Never throws into the caller's write path. An enqueue that fails leaves a record whose vector is missing,
 * and failing the write instead would trade a delayed search hit for lost data.
 *
 * **This used to claim "the periodic backfill sweep will find it". There was no such sweep** — the comment
 * described a repair mechanism that had never been built, which is worse than saying nothing: it is exactly the
 * kind of reassurance that stops anyone checking. A swallowed enqueue error meant a record silently missing from
 * recall forever, with no error, no metric and nothing to grep for.
 *
 * The repair now exists and is `POST /api/spaces/:id/reembed` (`brain/reembed.ts`), which queues a job for every
 * record with no vector. It is **on demand, not periodic** — say that precisely, because "it will be picked up"
 * and "an operator can pick it up" are different promises, and only one of them is true here.
 */
export async function enqueueEmbedJob(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await jobs(spaceId).updateOne(
      asFilter<BrainEmbedJobDoc>({ _id: embedJobId(recordType, recordId) }),
      asUpdate<BrainEmbedJobDoc>({
        $set: {
          spaceId, recordType, recordId,
          status: 'pending',
          attempts: 0,
          maxAttempts: MAX_EMBED_ATTEMPTS,
          lastError: null,
          claimedAt: null,
          progressAt: null,
          claimableAfter: null,
          claimToken: null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      }),
      { upsert: true },
    );
    _signal.markSpaceMayHaveWork(spaceId);
  } catch {
    /* see the note above — a queue failure must never fail the write it was announcing */
  }
}

/** Claim one job across the given spaces, oldest first. Returns null when nothing is claimable. */
export async function claimNextEmbedJob(spaceIds: string[]): Promise<BrainEmbedJobDoc | null> {
  const now = new Date().toISOString();
  // Consumes the full-scan slot, so it is called exactly once per claim.
  for (const spaceId of _signal.spacesToProbe(spaceIds)) {
    const claimed = await jobs(spaceId).findOneAndUpdate(
      asFilter<BrainEmbedJobDoc>({
        status: 'pending',
        $or: [
          { claimableAfter: null },
          { claimableAfter: { $exists: false } },
          { claimableAfter: { $lte: now } as unknown as string },
        ],
      }),
      asUpdate<BrainEmbedJobDoc>({
        $set: {
          status: 'processing', claimedAt: now, progressAt: now, claimableAfter: null,
          updatedAt: now, claimToken: newClaimToken(),
        },
        $inc: { attempts: 1 },
      }),
      { returnDocument: 'after', sort: { createdAt: 1 } },
    ) as BrainEmbedJobDoc | null;

    if (claimed) {
      _signal.noteClaimed(spaceId);
      return claimed;
    }
    _signal.noteEmpty(spaceId);
  }
  return null;
}

/**
 * A finished job is DELETED rather than kept as `complete`.
 *
 * The media queue keeps completed jobs because a file's embedding status is a thing the UI reports per
 * file. Here the record itself carries `embeddingStatus`, so a retained job would be a second copy of
 * one fact — and brain records outnumber files by orders of magnitude, so an unbounded `complete` pile
 * is real storage for no answer. What "how many are pending" needs is the pending ones.
 */
export async function completeEmbedJob(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
): Promise<void> {
  await jobs(spaceId).deleteOne(asFilter<BrainEmbedJobDoc>({ _id: embedJobId(recordType, recordId) }));
}

/**
 * Retire the job for a record that is being DELETED.
 *
 * Same deletion as `completeEmbedJob`, named for the other reason it happens — a caller reading `completeEmbedJob` in a
 * delete path would reasonably wonder what completed.
 *
 * ## Why the delete path has to do this at all
 *
 * Cleanup used to be entirely lazy: the worker claims the job, finds the record gone, and treats `gone` as success. That
 * covers a `pending` job and only a `pending` job — `claimNextEmbedJob` filters on `status: 'pending'`, so a job that
 * exhausted its attempts and went terminal `failed` is **never claimed again**. Delete the record at that moment and the
 * job row outlived it for ever.
 *
 * Invisible until #861, which is exactly why it lasted: the listing and `getEmbedJobCounts` now report that row, so an
 * operator sees a permanent failure naming a `recordId` that 404s. A surface whose whole purpose is that its failures are
 * actionable cannot carry phantoms.
 *
 * Deliberately eager rather than filtered out at read time: hiding an orphan leaves it in the collection, costs a lookup
 * per listed row, and makes the counts disagree with the rows they are counting.
 */
export async function retireEmbedJob(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
): Promise<void> {
  await jobs(spaceId).deleteOne(asFilter<BrainEmbedJobDoc>({ _id: embedJobId(recordType, recordId) }));
}

/** Requeue with backoff, or leave `failed` once the attempt budget is spent. */
export async function failEmbedJob(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
  attempts: number,
  errorMessage: string,
): Promise<void> {
  const now = new Date().toISOString();
  const _id = embedJobId(recordType, recordId);
  const lastError = errorMessage.slice(0, 500);

  if (attempts < MAX_EMBED_ATTEMPTS) {
    await jobs(spaceId).updateOne(
      asFilter<BrainEmbedJobDoc>({ _id }),
      asUpdate<BrainEmbedJobDoc>({
        $set: {
          status: 'pending', claimedAt: null, claimToken: null, lastError, updatedAt: now,
          claimableAfter: nextClaimableAfter(attempts + 1),
        },
      }),
    );
    _signal.markSpaceMayHaveWork(spaceId);
    return;
  }

  await jobs(spaceId).updateOne(
    asFilter<BrainEmbedJobDoc>({ _id }),
    asUpdate<BrainEmbedJobDoc>({
      $set: { status: 'failed', claimedAt: null, claimToken: null, lastError, updatedAt: now },
    }),
  );
}

/**
 * Return jobs whose worker died mid-flight to the pending pool.
 *
 * Measured from `progressAt` (last sign of life), never from `claimedAt` — the media queue learned that
 * a wall-clock deadline from the claim cannot tell "wedged" from "slow", and requeues a long job
 * mid-flight forever. An embedding is short, but a cold model load is not.
 */
export async function resetStalledEmbedJobs(spaceIds: string[], timeoutMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMs).toISOString();
  let reset = 0;
  for (const spaceId of spaceIds) {
    const res = await jobs(spaceId).updateMany(
      asFilter<BrainEmbedJobDoc>({ status: 'processing', progressAt: { $lt: cutoff } as unknown as string }),
      asUpdate<BrainEmbedJobDoc>({
        $set: {
          status: 'pending', claimedAt: null, claimToken: null, claimableAfter: null,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    if (res.modifiedCount > 0) {
      reset += res.modifiedCount;
      _signal.markSpaceMayHaveWork(spaceId);
    }
  }
  return reset;
}

/** Per-status counts for one space. A missing collection reports all-zero. */
export async function getEmbedJobCounts(
  spaceId: string,
): Promise<{ pending: number; processing: number; failed: number }> {
  const rows = await jobs(spaceId)
    .aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    .toArray() as Array<{ _id: string; n: number }>;
  const out = { pending: 0, processing: 0, failed: 0 };
  for (const r of rows) {
    if (r._id === 'pending' || r._id === 'processing' || r._id === 'failed') out[r._id] = r.n;
  }
  return out;
}

/**
 * The record types the queue accepts, as a VALUE — the type union alone cannot validate an incoming string, and every
 * caller that needed to check one was writing its own list. `file` is in here because file CHUNKS are embedded through
 * this same queue; the media pipeline that produces them has its own separate job queue.
 */
export const EMBED_RECORD_TYPES = ['memory', 'entity', 'edge', 'chrono', 'file'] as const;

/** Narrowing guard, so a route can reject an unknown type instead of enqueueing a job nothing will ever claim. */
export function isEmbedRecordType(v: unknown): v is BrainEmbedRecordType {
  return typeof v === 'string' && (EMBED_RECORD_TYPES as readonly string[]).includes(v);
}

/**
 * The queue state, READABLE from outside — the surface B-3 is about.
 *
 * breituai-platform, 2026-08-11T1200Z, read our 2.5.1 note and concluded that a brain record written while the embedder
 * was unreachable is silently dropped. Half wrong, and better than they feared: the record is stored and a persisted job
 * records the failure per record, with `attempts`, `lastError` and a terminal `failed` status. It is unfindable until the
 * vector lands, but it is not invisible.
 *
 * **What was genuinely missing is exactly this: nothing exposed it.** Files have a listable status and a retry endpoint;
 * brain records had the state and no way to ask. So *"which of my records have no vector"* was unanswerable from
 * outside even though the server knew — which is indistinguishable, from a caller's seat, from the data loss they
 * described.
 *
 * Ordered newest-first by `updatedAt`: a caller triaging failures wants the ones that just broke, and a queue drains
 * from the front so the oldest pending are the least interesting.
 */
export async function listEmbedJobs(
  spaceId: string,
  opts: { status?: 'pending' | 'processing' | 'failed'; limit?: number } = {},
): Promise<BrainEmbedJobDoc[]> {
  // A non-positive or non-numeric limit falls back to the DEFAULT rather than being clamped up to 1. `Math.max(n, 1)`
  // would answer a caller who computed `limit: 0` with a single row, and one row out of a hundred failures reads as a
  // nearly empty queue — a wrong answer that looks like a right one. 200 is the ceiling either way.
  const asked = Number(opts.limit);
  const limit = Number.isFinite(asked) && asked >= 1 ? Math.min(Math.floor(asked), 200) : 50;
  const filter = opts.status ? { status: opts.status } : {};
  return await jobs(spaceId)
    .find(asFilter<BrainEmbedJobDoc>(filter), { projection: { claimToken: 0 } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray() as BrainEmbedJobDoc[];
}

/**
 * Re-queue one record's embed job. The brain counterpart of the media queue's `retryJob`, with the same three outcomes
 * and the same reasoning for each.
 *
 * `processing` is NOT an error and NOT retried: a worker already holds the job, and resetting it would take the work
 * away from a run in progress. `not_found` means no job exists — either it never failed, or the record is gone.
 *
 * Deliberately NOT `enqueueEmbedJob`. That function exists for a NEW WRITE and resets the content-derived fields with
 * it; calling it here would claim the record had changed when only the operator's patience had.
 */
export async function retryEmbedJob(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  recordId: string,
): Promise<'ok' | 'not_found' | 'processing'> {
  const _id = embedJobId(recordType, recordId);
  const existing = await jobs(spaceId).findOne(asFilter<BrainEmbedJobDoc>({ _id })) as BrainEmbedJobDoc | null;
  if (!existing) return 'not_found';
  if (existing.status === 'processing') return 'processing';

  const now = new Date().toISOString();
  await jobs(spaceId).updateOne(
    asFilter<BrainEmbedJobDoc>({ _id }),
    asUpdate<BrainEmbedJobDoc>({
      $set: {
        status: 'pending',
        attempts: 0,
        lastError: null,
        claimedAt: null,
        claimableAfter: null,
        claimToken: null,
        progressAt: null,
        updatedAt: now,
      },
    }),
  );
  // A retry is only useful if something picks it up; without this the job sits pending until the next poll.
  wakeEmbedWorkers();
  return 'ok';
}

// ── Worker wake-up, re-exported so callers do not reach into the signal ──────

export const currentEmbedWorkEpoch = (): number => _signal.currentEpoch();
export const waitForEmbedWork = (ms: number, since: number): Promise<boolean> => _signal.wait(ms, since);
export const wakeEmbedWorkers = (): void => _signal.wake();
/** Test seam: forget the probe hint, forcing the next claim to scan every space. */
export const resetEmbedPendingHint = (): void => _signal.reset();

/** Exported for the job doc's own sake — see `asDoc` usage in tests that seed jobs directly. */
export const _asEmbedJobDoc = asDoc<BrainEmbedJobDoc>;

/**
 * Enqueue a record that arrived from a peer, if it needs a vector.
 *
 * ## The bug this closes
 *
 * `embedding` is a DERIVED field, deliberately excluded from replication (`merkle.ts` `DERIVED_FIELDS`)
 * because two peers may run different models. Sync ingest is a plain `replaceOne` of the incoming
 * document. Put those together and a record replicated from a peer arrives with **no vector on the
 * receiving instance** — and nothing ever gave it one.
 *
 * A vectorless record is invisible to recall on that instance: the vector search never returns it, and
 * the lexical channel needs an embedding to compute a real similarity and skips what it cannot score. So
 * an instance could hold a peer's entire knowledge base and answer nothing from it, silently, until an
 * operator happened to run a manual whole-space `POST /reindex`. Nothing measured it and nothing
 * reported it.
 *
 * Guarded on the vector rather than enqueued unconditionally: a peer that DOES send one (an older build,
 * or a future change of mind about derived fields) should not have it thrown away and recomputed.
 */
export async function enqueueIngestedRecord(
  spaceId: string,
  recordType: BrainEmbedRecordType,
  doc: { _id: string; embedding?: number[] },
): Promise<void> {
  const vec = doc.embedding;
  if (Array.isArray(vec) && vec.length > 0) return;
  await enqueueEmbedJob(spaceId, recordType, doc._id);
}
