/**
 * Brain-record embed jobs (/api/brain/spaces/:spaceId/embedding-queue/records).
 *
 * ## Why this exists at all
 *
 * breituai-platform read our 2.5.1 note and concluded that a brain record written while the embedder was unreachable is
 * **silently dropped**. That was half wrong, and the reality is better than they feared: the record is stored, and a
 * persisted job carries the failure per record — `attempts`, `lastError`, and a terminal `failed` status after
 * `MAX_EMBED_ATTEMPTS`. The record is unfindable by `recall` until its vector lands, but it is not lost.
 *
 * **What was genuinely missing is this router.** The state existed and nothing exposed it. Files had a listable queue
 * and a retry endpoint; brain records had the state and no way to ask for it, so *"which of my records have no vector"*
 * was unanswerable from outside — which, from a caller's seat, is indistinguishable from the data loss they described.
 * Their report was wrong about the mechanism and right about the consequence.
 *
 * ## Why it nests under `embedding-queue` instead of a name of its own
 *
 * Two sibling top-level names (`embedding-queue` and, say, `embed-jobs`) would have left a caller guessing which
 * half of the same subsystem each one meant. Nesting says it in the URL: the queue, and which half of it.
 *
 * **Both halves are named as of 3.1 — `/embedding-queue/media` and `/embedding-queue/records`.** The media half
 * used to be the BARE `/embedding-queue`, so "the queue with no qualifier means files, not records" was true and
 * knowable only from this comment and the integration guide. That is the half of X-3 that lived on REST; the MCP
 * half was a flat tool name with no namespace to sit in at all.
 *
 * The media half stays where it is, in file-meta.ts next to the file records it reports on.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { getConfig } from '../../config/loader.js';
import { memberSpacesForRequest } from '../../spaces/proxy-scoped.js';
import { resolveWriteTarget } from '../../spaces/proxy.js';
import {
  listEmbedJobs, getEmbedJobCounts, retryEmbedJob, EMBED_RECORD_TYPES, isEmbedRecordType,
} from '../../brain/embed-queue.js';
import { pageAcrossMembers } from '../../spaces/page-across-members.js';
import { PROXY_PAGE_CEILING } from '../../brain/query.js';

/** Page size when the caller names none. Matches `listEmbedJobs`'s own default, so one number governs. */
const DEFAULT_JOB_PAGE = 50;
import type { BrainEmbedJobDoc } from '../../config/types.js';

export const embedJobsRouter = Router();

/** Query-string `status`, or nothing. An unknown value is a 400 rather than a silently ignored filter. */
const STATUSES = ['pending', 'processing', 'failed'] as const;
type JobStatus = (typeof STATUSES)[number];

/**
 * The wire shape. `claimToken` never leaves the server — it is a lease secret, and a caller that could read it could
 * steal a job from the worker holding it. Everything else the queue records is returned, because the whole point of
 * the endpoint is that the operator sees what the server sees.
 */
function toWire(job: BrainEmbedJobDoc, spaceId: string) {
  return {
    recordType: job.recordType,
    recordId: job.recordId,
    spaceId,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

// GET /api/brain/spaces/:spaceId/embedding-queue/records — the brain-record half of the queue: counts, plus the jobs.
//
// Sums and merges across member spaces for a proxy space, exactly like the media GET beside it, so a fleet reads as one
// queue. Each row carries its OWN `spaceId` — without it a proxy caller sees a `recordId` and cannot tell which member
// space to retry it in, which would make the listing unactionable through the very surface it is meant to enable.
embedJobsRouter.get('/spaces/:spaceId/embedding-queue/records', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  if (!getConfig().spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const rawStatus = req.query['status'];
  let status: JobStatus | undefined;
  if (rawStatus !== undefined && rawStatus !== '') {
    if (typeof rawStatus !== 'string' || !STATUSES.includes(rawStatus as JobStatus)) {
      res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
      return;
    }
    status = rawStatus as JobStatus;
  }

  const rawLimit = req.query['limit'];
  let limit: number | undefined;
  if (rawLimit !== undefined && rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      res.status(400).json({ error: 'limit must be a positive integer' });
      return;
    }
    limit = n;
  }

  const rawSkip = req.query['skip'];
  let skip = 0;
  if (rawSkip !== undefined && rawSkip !== '') {
    const n = Number(rawSkip);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      res.status(400).json({ error: 'skip must be a non-negative integer' });
      return;
    }
    skip = n;
  }

  const members = memberSpacesForRequest(req, spaceId);
  const counts = { pending: 0, processing: 0, failed: 0 };
  for (const mid of members) {
    const c = await getEmbedJobCounts(mid);
    counts.pending += c.pending; counts.processing += c.processing; counts.failed += c.failed;
  }

  // `counts` aggregates EVERY job while the listing returns a page, so without `skip` a caller could be told
  // `failed: 500` and never reach failure #201 — an accurate total beside an unreachable tail, on the one surface whose
  // justification is that its failures are actionable. Same asymmetry that cost aigents a fabricated number on `/query`,
  // and paged here by the same function rather than by the same shape written twice.
  const effectiveLimit = limit ?? DEFAULT_JOB_PAGE;
  const page = await pageAcrossMembers<ReturnType<typeof toWire>>({
    members,
    limit: effectiveLimit,
    skip,
    ceiling: PROXY_PAGE_CEILING,
    // Newest-first by `updatedAt`, with `_id` breaking every tie so the order is TOTAL and the pages cannot overlap.
    compare: (a, b) => (a.updatedAt === b.updatedAt
      ? (a.recordId < b.recordId ? 1 : a.recordId > b.recordId ? -1 : 0)
      : (a.updatedAt < b.updatedAt ? 1 : -1)),
    readMember: async (mid, lim, sk) =>
      (await listEmbedJobs(mid, { ...(status ? { status } : {}), limit: lim, skip: sk })).map(j => toWire(j, mid)),
  });
  if (!page.ok) { res.status(400).json({ error: page.error }); return; }

  res.json({
    counts, jobs: page.rows, limit: effectiveLimit, skip,
    ...(status ? { status } : {}),
  });
});

// POST /api/brain/spaces/:spaceId/embedding-queue/records/retry — re-queue ONE record's embed job.
//
// Per record rather than "retry all failed" (the media route's shape) because a brain record's failure is usually about
// that record — an oversized fact, a property the embedder choked on — where a media failure is usually about the
// worker. Retrying a thousand records that will each fail again is a way to hide a problem, not to fix one.
//
// `recordType`/`recordId` go in the BODY, not the path: a recordId is caller-supplied and may contain a slash, and a
// path-segment id would 404 on exactly the records most likely to be malformed.
embedJobsRouter.post('/spaces/:spaceId/embedding-queue/records/retry', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  if (!getConfig().spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const body = (req.body ?? {}) as { recordType?: unknown; recordId?: unknown; targetSpace?: unknown };
  if (!isEmbedRecordType(body.recordType)) {
    res.status(400).json({ error: `recordType must be one of ${EMBED_RECORD_TYPES.join(', ')}` });
    return;
  }
  const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';
  if (!recordId) {
    res.status(400).json({ error: 'recordId is required' });
    return;
  }

  // A proxy space stores nothing itself, so a retry has to name the member. Same helper the write routes use, so the
  // error text a caller gets is the one they already know from every other proxy write.
  const wt = resolveWriteTarget(spaceId, typeof body.targetSpace === 'string' ? body.targetSpace : undefined);
  if (!wt.ok) {
    res.status(400).json({ error: wt.error });
    return;
  }

  const result = await retryEmbedJob(wt.target, body.recordType, recordId);
  if (result === 'not_found') {
    res.status(404).json({
      error: `No embed job for ${body.recordType} '${recordId}' in space '${wt.target}'`,
      result,
    });
    return;
  }
  // `processing` is 200, not a conflict: the job IS queued and IS going to run, which is what the caller wanted. The
  // outcome is returned verbatim so a caller can branch without reading the English.
  res.status(result === 'ok' ? 202 : 200).json({ result, recordType: body.recordType, recordId, spaceId: wt.target });
});
