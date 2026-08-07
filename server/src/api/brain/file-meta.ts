/**
 * File-metadata routes (/api/brain/spaces/:spaceId/files).
 *
 * This is the brain's file RECORD (a knowledge-graph doc: tags/entityIds/properties, one of the
 * five `query` collections). The file STORE — the bytes on disk — is `fileStoreRouter` in
 * api/files.ts, mounted at /api/files. The two are deliberately named as a Store/Meta pair: they
 * were both `filesRouter` at first, which broke name-keyed route analysis (the audit-coverage guard
 * resolved these routes to the wrong /api/files prefix) and read as one API to anyone skimming.
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { toDocId } from '../../util/paths.js';
import { requireSpaceAuth, denyReadOnly, requireAdmin } from '../../auth/middleware.js';
import { listTokens } from '../../auth/tokens.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { updateFileMeta, deleteFileMeta, getFileMeta } from '../../files/file-meta.js';
import { assertRefsResolve } from '../../brain/entity-refs.js';
import { fileExists, readFile } from '../../files/files.js';
import { log } from '../../util/log.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { parseLimit, parseSkip, capPage } from '../../util/pagination.js';
import { parseSortParam, toMongoSort, SORTABLE_FIELDS } from '../../brain/list-sort.js';
import { textSearchOr, SEARCHABLE_FIELDS } from '../../brain/text-search.js';
import { resolveMemberSpaces, resolveWriteTarget, findFirstAcrossMembers, collectAcrossMembers, isStrictLinkage } from '../../spaces/proxy.js';
import type { FileMetaDoc } from '../../config/types.js';
import { fetchJobProgress, getMediaJobCounts, FAILED_SAMPLE_LIMIT, FAILED_REASON_LIMIT, type MediaJobCounts } from '../../files/media/job-queue.js';
import { tagContains } from '../../brain/tag-filter.js';



export const fileMetaRouter = Router();

/** Statuses worth a progress lookup. Anything else is finished and has nothing left to draw. */
const IN_FLIGHT = new Set(['pending', 'processing']);

/**
 * Decorate a page of file records with their job's step progress.
 *
 * The rule worth pinning is that a page with nothing in flight issues **no query at all**, so the
 * common case — a listing of finished files, which is most listings — does not pay for the rare one.
 * `lookup` is injectable purely so a test can observe that: asserting on the returned records cannot
 * distinguish "did not query" from "queried and got nothing", which is exactly the regression this
 * guards against.
 */
export async function attachJobProgress(
  memberId: string,
  files: Array<Record<string, unknown>>,
  lookup: typeof fetchJobProgress = fetchJobProgress,
): Promise<Array<Record<string, unknown>>> {
  const inFlight = files.filter(f => IN_FLIGHT.has(String(f['embeddingStatus'] ?? '')));
  if (inFlight.length === 0) return files;
  const byId = await lookup(memberId, inFlight.map(f => String(f['_id'])));
  if (byId.size === 0) return files;
  return files.map(f => {
    const view = byId.get(String(f['_id']));
    // A job row with no `progress` yet (claimed, first step not reported) adds nothing — leaving the
    // field absent keeps "we do not know yet" distinct from "the route has no steps".
    return view?.progress ? { ...f, progress: view.progress, progressAt: view.progressAt } : f;
  });
}


// GET /api/brain/spaces/:spaceId/files — list file metadata records
fileMetaRouter.get('/spaces/:spaceId/files', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const limit = parseLimit(req.query['limit'], 50, 200);
  const skip = parseSkip(req.query['skip']);
  const sortParse = parseSortParam(req.query['sort'], req.query['dir'], SORTABLE_FIELDS.files);
  if ('error' in sortParse) {
    res.status(400).json({ error: sortParse.error });
    return;
  }
  const mongoSort = sortParse.sort ? toMongoSort(sortParse.sort) : { updatedAt: -1 as const };
  // By default exclude chunk records (parentFileId set) so the file manager only shows
  // top-level files. Pass ?includeChunks=true to see all records (e.g. for debugging).
  const includeChunks = req.query['includeChunks'] === 'true';
  const filter: Record<string, unknown> = {};
  if (!includeChunks) filter['parentFileId'] = { $exists: false };
  if (typeof req.query['tag'] === 'string') filter['tags'] = tagContains(req.query['tag']);
  if (typeof req.query['path'] === 'string') filter['path'] = toDocId(req.query['path']);
  // Freetext substring over path + description (escaped, mirrors 2b-iii-a on the other collections).
  // Distinct from the exact `?path=` filter above; the client's docked freetext box feeds this.
  const search = textSearchOr(req.query['search'] as string | undefined, SEARCHABLE_FIELDS.files);
  if (search) Object.assign(filter, search);
  const all = await collectAcrossMembers(spaceId, async mid => {
    const files = await col(`${mid}_files`)
      .find(asFilter(filter))
      .sort(mongoSort)
      .skip(skip)
      .limit(limit)
      .toArray();
    // Attach step progress for files still in flight, so the UI can draw which stage is running
    // instead of a spinner that never resolves. Joined per MEMBER: on a proxy space the ids belong
    // to that member's job collection, and looking them up in another's would silently find nothing.
    return attachJobProgress(mid, files as Array<Record<string, unknown>>);
  });
  const files = capPage(all, limit, sortParse.sort);

  res.json({ files, limit, skip });
});

/**
 * GET /api/brain/spaces/:spaceId/files/extract?path=… — what retrieval actually sees for one file.
 *
 * ## Why this exists
 *
 * `_converted/` and `_extracted/` are hidden from browsing, which the docs promised and a reporter asked
 * for. But that hidden folder was the only place to SEE what conversion produced, so the fix removed the
 * only answer to *"what did the pipeline actually extract from this file?"* — the first question anyone asks
 * when a document answers queries badly. Their words: hide them from browsing, not from inspection.
 *
 * ## Why it is one endpoint rather than three
 *
 * The three things an operator needs are the converted Markdown, the chunks in order, and the extracted
 * images with their captions. They are all derived from ONE parent, they are only meaningful together, and
 * the ordering and the partitioning are server-side facts — a client assembling this from the generic list
 * endpoint would have to know that a chunk is "a record with a chunkIndex" and an extracted image is "a
 * record whose path starts with `_extracted/`". That is not knowledge a UI should carry.
 *
 * Nothing here is new data: every part is an addressable record that conversion already wrote.
 *
 * ## Bounds
 *
 * A 500-page document has thousands of chunks and a Markdown file measured in megabytes, and this is a
 * diagnostic — so chunks paginate (`limit`/`skip`, newest-agnostic: always by `chunkIndex`), and the
 * Markdown is capped with `truncated` telling the truth about it. The full file is downloadable through the
 * file store, which is where an unbounded read belongs.
 */
const MAX_CONVERTED_BYTES = 256 * 1024;
/** Extracted images are capped at 50 by the pipeline; 200 leaves room without becoming unbounded. */
const MAX_DERIVED_RECORDS = 200;

fileMetaRouter.get('/spaces/:spaceId/files/extract', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const rawPath = req.query['path'];
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    res.status(400).json({ error: '`path` query parameter required' });
    return;
  }
  const parentId = toDocId(rawPath);
  const limit = parseLimit(req.query['limit'], 100, 500);
  const skip = parseSkip(req.query['skip']);

  // Resolved per MEMBER, and the member is kept: on a proxy space the derived records live in the same
  // member collection as their parent, and querying another member's would silently return nothing.
  let member: string | null = null;
  let parent: FileMetaDoc | null = null;
  for (const mid of resolveMemberSpaces(spaceId)) {
    const found = await getFileMeta(mid, parentId);
    if (found) { member = mid; parent = found; break; }
  }
  if (!member || !parent) {
    res.status(404).json({ error: 'File metadata record not found' });
    return;
  }

  const files = col<FileMetaDoc>(`${member}_files`);

  // Chunks: everything carrying a chunkIndex, in document order. `chunkIndex` is the discriminator
  // rather than the path shape, because a chunk's id is `<parent>#chunk<n>` for text and
  // `#media-chunk<n>` for audio — two spellings of one thing.
  const chunkFilter = { parentFileId: parentId, chunkIndex: { $exists: true } };
  const [chunkDocs, chunkTotal] = await Promise.all([
    files.find(asFilter<FileMetaDoc>(chunkFilter)).sort({ chunkIndex: 1 }).skip(skip).limit(limit).toArray(),
    files.countDocuments(asFilter<FileMetaDoc>(chunkFilter)),
  ]);

  // Everything else derived from this parent: the `_converted/` record and the `_extracted/` images.
  // One query, partitioned by path, because both are bounded and neither is worth a round trip.
  const derived = await files
    .find(asFilter<FileMetaDoc>({ parentFileId: parentId, chunkIndex: { $exists: false } }))
    .limit(MAX_DERIVED_RECORDS)
    .toArray() as FileMetaDoc[];

  const images = derived
    .filter(d => d.path.startsWith('_extracted/'))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
    .map(d => ({
      path: d.path,
      description: d.description ?? null,
      // Says whether a caption was written by a model or is the operator's own text — the same
      // provenance the file detail pane shows, because "generated" is a claim.
      descriptionSource: d.descriptionSource ?? null,
      sizeBytes: d.sizeBytes,
      embeddingStatus: d.embeddingStatus ?? null,
    }));

  // The converted Markdown, read from the file store rather than from the record — the record carries
  // metadata, the bytes are the thing being inspected. Absent for formats that need no conversion
  // (`.md`/`.txt` are already Markdown and produce no `_converted/` copy).
  const convertedRecord = derived.find(d => d.path.startsWith('_converted/'))
    ?? (parent.convertedFileId ? await getFileMeta(member, parent.convertedFileId) : null);
  let converted: { path: string; markdown: string; truncated: boolean; sizeBytes: number } | null = null;
  if (convertedRecord) {
    try {
      const text = await readFile(member, convertedRecord.path);
      converted = {
        path: convertedRecord.path,
        markdown: text.slice(0, MAX_CONVERTED_BYTES),
        truncated: text.length > MAX_CONVERTED_BYTES,
        sizeBytes: convertedRecord.sizeBytes,
      };
    } catch (err) {
      // The record exists and the bytes do not. Worth reporting as its own state rather than as an
      // empty document: it means the sidecar was removed out from under the record, which is exactly
      // the kind of drift this view exists to make visible.
      log.warn(`extract: could not read ${member}/${convertedRecord.path}: ${err instanceof Error ? err.message : String(err)}`);
      converted = { path: convertedRecord.path, markdown: '', truncated: false, sizeBytes: convertedRecord.sizeBytes };
    }
  }

  res.json({
    path: parentId,
    embeddingStatus: parent.embeddingStatus ?? null,
    conversionError: parent.conversionError ?? null,
    // The parent's own derived prose and the document's opening text, so the tab answers "what does
    // retrieval see" completely rather than sending the reader back to another tab for two fields.
    description: parent.description ?? null,
    descriptionSource: parent.descriptionSource ?? null,
    excerpt: parent.excerpt ?? null,
    converted,
    chunks: chunkDocs.map(c => ({
      id: c._id,
      index: c.chunkIndex ?? null,
      headingText: c.headingText ?? null,
      content: c.content ?? '',
      // Audio/video chunks carry their position in the recording; documents carry heading provenance.
      // Both spellings are returned as they are, so the client formats rather than guesses.
      chunkOffsetMs: (c as { chunkOffsetMs?: number }).chunkOffsetMs ?? null,
      chunkDurationMs: (c as { chunkDurationMs?: number }).chunkDurationMs ?? null,
      embeddingStatus: c.embeddingStatus ?? null,
    })),
    chunkTotal,
    limit,
    skip,
    images,
  });
});

// GET /api/brain/spaces/:spaceId/embedding-queue — this space's embedding-job backlog by status (F9 Overview).
// Read-only summary; sums across member spaces for a proxy space (resolveMemberSpaces → [spaceId] otherwise).
fileMetaRouter.get('/spaces/:spaceId/embedding-queue', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const total: MediaJobCounts = {
    pending: 0, processing: 0, complete: 0, failed: 0, failedSample: [], failedByReason: [],
  };
  // Reasons are summed across member spaces before truncating, so a proxy space's grouping is the grouping of
  // its whole fleet rather than of whichever member was iterated first.
  const reasons = new Map<string | null, number>();
  for (const mid of resolveMemberSpaces(spaceId)) {
    const c = await getMediaJobCounts(mid);
    total.pending += c.pending; total.processing += c.processing; total.complete += c.complete; total.failed += c.failed;
    total.failedSample.push(...c.failedSample);
    for (const r of c.failedByReason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + r.count);
  }
  total.failedSample = total.failedSample.slice(0, FAILED_SAMPLE_LIMIT);
  total.failedByReason = [...reasons.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, FAILED_REASON_LIMIT);
  res.json(total);
});

// POST /api/brain/spaces/:spaceId/embedding-queue/retry-failed — re-queue every failed media job in
// this space (F9 Overview "retry all failed"). Sums across member spaces like the GET above.
fileMetaRouter.post('/spaces/:spaceId/embedding-queue/retry-failed', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const { retryFailedJobs } = await import('../../files/media/job-queue.js');
  let retried = 0;
  for (const mid of resolveMemberSpaces(spaceId)) {
    retried += await retryFailedJobs(mid);
  }
  res.status(202).json({ retried });
});

// GET /api/brain/spaces/:spaceId/token-access — which tokens can reach this space and at what level
// (F9 Overview token-access matrix). ADMIN-only (requireAdmin after requireSpaceAuth) so a non-admin
// space token gets 403 and the panel simply hides. Returns the MINIMUM the matrix needs — never a
// hash, prefix, or any other secret material.
fileMetaRouter.get('/spaces/:spaceId/token-access', globalRateLimit, requireSpaceAuth, requireAdmin, (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  // A token reaches this space when it has no `spaces` allow-list (all spaces) or lists this one.
  // schemaLibrary tokens have no space access at all, so they never appear.
  const tokens = listTokens()
    .filter(t => !t.schemaLibrary && (!t.spaces || t.spaces.includes(spaceId)))
    .map(t => ({
      name: t.name,
      level: t.admin ? 'admin' : (t.readOnly ? 'readOnly' : 'full'),
      allSpaces: !t.spaces,
      peer: !!t.peerInstanceId,
      expiresAt: t.expiresAt,
    }));
  res.json({ tokens });
});


// DELETE /api/brain/spaces/:spaceId/files — delete file metadata record by path (does NOT delete the file on disk)
fileMetaRouter.delete('/spaces/:spaceId/files', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` }); return;
  }
  const path = req.query['path'];
  if (typeof path !== 'string' || !path.trim()) {
    res.status(400).json({ error: '`path` query parameter required' }); return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const memberIds = resolveMemberSpaces(wt.target);
  const norm = toDocId(path);
  // Guard: a metadata record may only be removed if its file is gone (orphan) or the
  // record is flagged deleted. Deleting the metadata of a file that still exists would
  // silently orphan a live file — refuse and tell the caller to delete the file itself.
  for (const mid of memberIds) {
    const rec = await col<FileMetaDoc>(`${mid}_files`).findOne(asFilter<FileMetaDoc>({ _id: norm })) as FileMetaDoc | null;
    if (rec && !rec.deletedAt && await fileExists(mid, norm)) {
      res.status(409).json({
        error: 'Cannot delete metadata while the file still exists. Delete the file itself (which also removes its metadata), or enable softDeleteFileMeta and delete the file first.',
      });
      return;
    }
  }
  for (const mid of memberIds) {
    await deleteFileMeta(mid, path);
  }
  res.status(204).end();
});


// PATCH /api/brain/spaces/:spaceId/files — update file metadata by path (query param ?path=)
fileMetaRouter.patch('/spaces/:spaceId/files', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` }); return;
  }
  const path = req.query['path'];
  if (typeof path !== 'string' || !path.trim()) {
    res.status(400).json({ error: '`path` query parameter required' }); return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  // The four brain record types honour `If-Match` against their `seq`. File-metadata records have no `seq`
  // — `updateFileMeta` never calls `nextSeq` — so there is nothing here to condition a write on. Refused
  // rather than ignored, because the failure mode of ignoring is the one this feature exists to prevent:
  // the client asked for a guarantee and would be told, with a 200, that it held.
  if (req.get('If-Match') !== undefined) {
    res.status(400).json({ error: '`If-Match` is not supported on file metadata: these records carry no `seq` to condition a write on. It is honoured on `PATCH` for memories, entities, edges and chrono entries.' });
    return;
  }

  const { description, tags, entityIds, chronoIds, memoryIds, properties } = req.body ?? {};
  if (tags !== undefined && !Array.isArray(tags)) { res.status(400).json({ error: '`tags` must be an array' }); return; }
  if (entityIds !== undefined && !Array.isArray(entityIds)) { res.status(400).json({ error: '`entityIds` must be an array' }); return; }
  if (chronoIds !== undefined && !Array.isArray(chronoIds)) { res.status(400).json({ error: '`chronoIds` must be an array' }); return; }
  if (memoryIds !== undefined && !Array.isArray(memoryIds)) { res.status(400).json({ error: '`memoryIds` must be an array' }); return; }
  if (properties !== undefined && (typeof properties !== 'object' || properties === null || Array.isArray(properties))) {
    res.status(400).json({ error: '`properties` must be a plain object' }); return;
  }

  // A file carries THREE reference fields, and until now none of them was validated — not even under
  // strict linkage, which every other brain route already honoured. So this was the widest silent
  // hole: attach a memory to a file with a name or a stale id and it stored clean, then the file
  // simply never turned up in anything that traversed the link.
  if (isStrictLinkage(wt.target)) {
    try {
      await assertRefsResolve(wt.target, 'entityIds', 'entity', entityIds as string[] | undefined);
      await assertRefsResolve(wt.target, 'memoryIds', 'memory', memoryIds as string[] | undefined);
      await assertRefsResolve(wt.target, 'chronoIds', 'chrono', chronoIds as string[] | undefined);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
  }

  // Snapshot for the audit change list — see the note in memories.ts. `properties` is not allowlisted,
  // so handing the record over cannot publish it.
  const prior = await findFirstAcrossMembers(wt.target, mid => getFileMeta(mid, path));
  const updated = await findFirstAcrossMembers(wt.target,
    mid => updateFileMeta(mid, path, { description, tags, entityIds, chronoIds, memoryIds, properties }));
  if (updated) {
    req.auditSnapshots = { before: prior ?? {}, after: updated };
    res.json(updated);
    return;
  }
  res.status(404).json({ error: 'File metadata record not found' });
});
