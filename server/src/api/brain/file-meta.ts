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
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { updateFileMeta, deleteFileMeta } from '../../files/file-meta.js';
import { fileExists } from '../../files/files.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { parseLimit, parseSkip, capPage } from '../../util/pagination.js';
import { resolveMemberSpaces, resolveWriteTarget, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import type { FileMetaDoc } from '../../config/types.js';

export const fileMetaRouter = Router();


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
  // By default exclude chunk records (parentFileId set) so the file manager only shows
  // top-level files. Pass ?includeChunks=true to see all records (e.g. for debugging).
  const includeChunks = req.query['includeChunks'] === 'true';
  const filter: Record<string, unknown> = {};
  if (!includeChunks) filter['parentFileId'] = { $exists: false };
  if (typeof req.query['tag'] === 'string') filter['tags'] = req.query['tag'];
  if (typeof req.query['path'] === 'string') filter['path'] = toDocId(req.query['path']);
  const all = await collectAcrossMembers(spaceId, mid =>
    col(`${mid}_files`)
      .find(asFilter(filter))
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  );
  res.json({ files: capPage(all, limit), limit, skip });
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

  const { description, tags, entityIds, chronoIds, memoryIds, properties } = req.body ?? {};
  if (tags !== undefined && !Array.isArray(tags)) { res.status(400).json({ error: '`tags` must be an array' }); return; }
  if (entityIds !== undefined && !Array.isArray(entityIds)) { res.status(400).json({ error: '`entityIds` must be an array' }); return; }
  if (chronoIds !== undefined && !Array.isArray(chronoIds)) { res.status(400).json({ error: '`chronoIds` must be an array' }); return; }
  if (memoryIds !== undefined && !Array.isArray(memoryIds)) { res.status(400).json({ error: '`memoryIds` must be an array' }); return; }
  if (properties !== undefined && (typeof properties !== 'object' || properties === null || Array.isArray(properties))) {
    res.status(400).json({ error: '`properties` must be a plain object' }); return;
  }

  const updated = await findFirstAcrossMembers(wt.target,
    mid => updateFileMeta(mid, path, { description, tags, entityIds, chronoIds, memoryIds, properties }));
  if (updated) { res.json(updated); return; }
  res.status(404).json({ error: 'File metadata record not found' });
});
