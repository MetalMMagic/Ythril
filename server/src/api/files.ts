/**
 * /api/files/:spaceId  — File manager HTTP API
 *
 * All routes require a valid Bearer PAT with access to the requested space.
 * The file path is passed as the `path` query parameter.
 *
 * GET    /api/files/:spaceId?path={path}   Stat path: if dir → JSON listing,
 *                                          if file → stream bytes
 * POST   /api/files/:spaceId?path={path}   Write/overwrite file.
 *                                          Body: raw bytes (any Content-Type
 *                                          except application/json) OR JSON
 *                                          { content: string, encoding?: 'utf8'|'base64' }
 * DELETE /api/files/:spaceId?path={path}   Delete file. Deleting a directory
 *                                          requires { confirm: true } in body.
 * PATCH  /api/files/:spaceId?path={path}   Move/rename.
 *                                          Body: { destination: string }
 * POST   /api/files/:spaceId/mkdir?path={path}  Create directory.
 */

import express, { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { requireSpaceAuth, denyReadOnly } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import {
  readFileBytes,
  writeFileBytes,
  listDir,
  deleteFile,
  createDir,
  moveFile,
  listFilesRecursive,
} from '../files/files.js';
import {
  parseContentRange,
  storeChunk,
  assembleChunks,
  getUploadReceived,
} from '../files/chunks.js';
import { checkQuota, QuotaError, invalidateUsageCache } from '../quota/quota.js';
import { resolveSafePath, assertNoSymlinkEscape, spaceRoot } from '../files/sandbox.js';
import { col, asFilter, asDoc } from '../db/mongo.js';
import type { FileMetaDoc } from '../config/types.js';
import { upsertFileMeta, deleteFileMeta, deleteFileMetaByPrefix, renameFileMeta, renameFileMetaByPrefix, markFileMetaDeleted, markFileMetaDeletedByPrefix } from '../files/file-meta.js';
import { writeFileTombstones } from '../files/tombstones.js';
import { resolveMemberSpaces, resolveWriteTarget } from '../spaces/proxy.js';
import { emitWebhookEvent } from '../webhooks/dispatcher.js';
import { resolveInputFormat, deleteConversionArtifacts, deleteConversionArtifactsByPrefix, isMediaFormat } from '../files/converters/pipeline.js';
import type { InputFormat } from '../files/converters/pipeline.js';
import { enqueueMediaJob, enqueueTextJob, cancelMediaJob, cancelMediaJobsByPrefix } from '../files/media/job-queue.js';
import { getMediaEmbeddingConfig } from '../config/loader.js';

export const filesRouter = Router();

// ── Webhook helper ──────────────────────────────────────────────────────────

/** Extract token identification from the request for webhook payloads. */
function webhookToken(req: Request): { tokenId?: string; tokenLabel?: string } {
  const t = req.authToken;
  if (!t) return {};
  return {
    tokenId: 'id' in t ? (t as { id: string }).id : undefined,
    tokenLabel: t.name,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Validate and return the `path` query param; 404 if missing. */
function requireQueryPath(req: Request, res: Response): string | null {
  const p = req.query['path'];
  if (typeof p !== 'string' || !p.trim()) {
    res.status(400).json({ error: 'Missing required query parameter: path' });
    return null;
  }
  return p;
}

/**
 * Reject requests whose Content-Length exceeds `maxUploadBodyBytes` from
 * config. Must run BEFORE body parsers so the limit check fires early.
 */
function enforceSizeLimit(req: Request, res: Response, next: NextFunction): void {
  const limit = getConfig().maxUploadBodyBytes;
  if (limit !== undefined) {
    const cl = parseInt(req.headers['content-length'] ?? '', 10);
    if (!isNaN(cl) && cl > limit) {
      res
        .status(413)
        .json({ error: `Payload too large. Maximum upload size is ${limit} bytes.` });
      return;
    }
  }
  next();
}

// ── GET /api/files/:spaceId ───────────────────────────────────────────────────
// Stat the path: directory → JSON list, file → stream bytes.
filesRouter.get('/:spaceId', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const filePath = req.query['path'];
  const normalised = typeof filePath === 'string' && filePath.trim() ? filePath : '.';
  const memberIds = resolveMemberSpaces(spaceId);

  // Directory listing — aggregate across all member spaces
  // Try to find the first member where the path resolves successfully
  let foundMid: string | null = null;
  let absPath = '';
  let stat: Awaited<ReturnType<typeof fs.stat>> | null = null;

  for (const mid of memberIds) {
    try {
      const p = resolveSafePath(mid, normalised);
      const s = await fs.stat(p);
      foundMid = mid;
      absPath = p;
      stat = s;
      break;
    } catch {
      continue;
    }
  }

  if (!foundMid || !stat) {
    // For directory listing at root, aggregate even if some members have no dir
    if (normalised === '.') {
      const allEntries: { name: string; type: 'file' | 'dir'; size?: number }[] = [];
      const seen = new Set<string>();
      for (const mid of memberIds) {
        try {
          const entries = await listDir(mid, normalised);
          for (const e of entries) {
            if (!seen.has(e.name)) { seen.add(e.name); allEntries.push(e); }
          }
        } catch { /* member may have no files dir */ }
      }
      res.json({ path: normalised, type: 'dir', entries: allEntries });
      return;
    }
    res.status(404).json({ error: 'Path not found' });
    return;
  }

  if (stat.isDirectory()) {
    // Aggregate directory entries across all member spaces
    const allEntries: { name: string; type: 'file' | 'dir'; size?: number }[] = [];
    const seen = new Set<string>();
    for (const mid of memberIds) {
      try {
        const entries = await listDir(mid, normalised);
        for (const e of entries) {
          if (!seen.has(e.name)) { seen.add(e.name); allEntries.push(e); }
        }
      } catch { /* dir may not exist in this member */ }
    }
    res.json({ path: normalised, type: 'dir', entries: allEntries });
    return;
  }

  // File download — serve from the first member that has it
  try {
    const bytes = await readFileBytes(foundMid, normalised);
    const ext = path.extname(normalised).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    // Stored XSS guard: user-uploaded HTML/SVG/XML rendered inline would run
    // script in this origin (token theft from the web UI). Active-content
    // types are forced to download and get a sandbox CSP so nothing executes
    // even if a browser renders them anyway. Passive types (images, pdf,
    // plain text) stay inline so previews keep working.
    const filename = path.basename(normalised).replace(/[\r\n"\\]/g, '_');
    const isActive = ACTIVE_CONTENT_EXTS.has(ext);
    res
      .status(200)
      .setHeader('Content-Type', contentType)
      .setHeader('Content-Length', bytes.length)
      .setHeader('X-Content-Type-Options', 'nosniff')
      .setHeader('Content-Disposition', `${isActive ? 'attachment' : 'inline'}; filename="${filename}"`);
    if (isActive) {
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    }
    res.send(bytes);
  } catch (err) {
    log.warn(`readFileBytes error for space ${foundMid}, path ${normalised}: ${err}`);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// ── POST /api/files/:spaceId/mkdir ────────────────────────────────────────────
filesRouter.post(
  '/:spaceId/mkdir',
  globalRateLimit,
  requireSpaceAuth,
  denyReadOnly,
  async (req, res) => {
    const spaceId = req.params['spaceId'] as string;
    const cfg = getConfig();
    if (!cfg.spaces.some(s => s.id === spaceId)) {
      res.status(404).json({ error: `Space '${spaceId}' not found` });
      return;
    }

    const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
    if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
    const targetSpace = wt.target;

    const dirPath = requireQueryPath(req, res);
    if (dirPath === null) return;

    try {
      await createDir(targetSpace, dirPath);
      res.status(201).json({ created: dirPath });
    } catch (err) {
      if (err instanceof RangeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      log.warn(`createDir error for space ${targetSpace}, path ${dirPath}: ${err}`);
      res.status(500).json({ error: 'Failed to create directory' });
    }
  },
);

// ── GET /api/files/:spaceId/upload-status ─────────────────────────────────────
// Returns bytes received for an in-progress chunked upload.
filesRouter.get('/:spaceId/upload-status', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const filePath = req.query['path'];
  const total = parseInt(req.query['total'] as string, 10);
  if (typeof filePath !== 'string' || !filePath.trim() || isNaN(total) || total <= 0) {
    res.status(400).json({ error: 'Required query params: path, total (positive integer)' });
    return;
  }
  const received = await getUploadReceived(spaceId, filePath, total);
  res.json({ received });
});

// ── POST /api/files/:spaceId ──────────────────────────────────────────────────
// Write a file. Accepts raw bytes (any non-JSON Content-Type) or
// JSON { content: string, encoding?: 'utf8' | 'base64' }.
filesRouter.post(
  '/:spaceId',
  globalRateLimit,
  requireSpaceAuth,
  denyReadOnly,
  enforceSizeLimit,
  // Raw-body capture for non-JSON content types
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.is('application/json')) { next(); return; }
    express.raw({ type: '*/*', limit: getConfig().maxUploadBodyBytes ?? '50mb' })(req, res, next);
  },
  async (req, res) => {
    const spaceId = req.params['spaceId'] as string;
    const cfg = getConfig();
    if (!cfg.spaces.some(s => s.id === spaceId)) {
      res.status(404).json({ error: `Space '${spaceId}' not found` });
      return;
    }

    const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
    if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
    const targetSpace = wt.target;

    const filePath = requireQueryPath(req, res);
    if (filePath === null) return;

    // ── Chunked upload (Content-Range) ───────────────────────────────────
    const range = parseContentRange(req.headers['content-range'] as string | undefined);
    if (range) {
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'Chunked upload requires raw bytes (not JSON)' });
        return;
      }
      const expectedLen = range.end - range.start + 1;
      if (req.body.length !== expectedLen) {
        res.status(400).json({ error: `Chunk size mismatch: Content-Range says ${expectedLen} bytes but body is ${req.body.length}` });
        return;
      }

      // Bound the declared assembled size — Content-Range totals were previously
      // unlimited, letting a client stage arbitrarily large uploads.
      const maxChunkedTotal = cfg.maxChunkedUploadBytes ?? 10 * 1024 ** 3;
      if (range.total > maxChunkedTotal) {
        res.status(413).json({ error: `Declared upload size ${range.total} exceeds the maximum of ${maxChunkedTotal} bytes` });
        return;
      }

      // Storage quota check on every chunk (mirrors the single-request path —
      // each chunk is its own POST). The FIRST chunk projects the full declared
      // total against an EXACT measurement for precise early rejection; later chunks
      // project their own size and may read a cached usage (P1) — the full-total
      // check on chunk 0 already validated the whole upload fits, so re-walking the
      // files tree per chunk is pure overhead.
      const firstChunk = range.start === 0;
      try {
        await checkQuota(
          'files',
          firstChunk ? range.total : req.body.length,
          firstChunk ? {} : { maxAgeMs: 10_000 },
        );
      } catch (err) {
        if (err instanceof QuotaError) {
          res.status(507).json({ error: err.message, storageExceeded: true });
          return;
        }
        throw err;
      }

      try {
        const { received, complete } = await storeChunk(
          targetSpace, filePath, req.body, range.start, range.end, range.total,
        );

        if (complete) {
          // Assemble final file (symlink-checked before writing the target).
          const absTarget = resolveSafePath(targetSpace, filePath);
          await assertNoSymlinkEscape(targetSpace, absTarget);
          const sha256 = await assembleChunks(targetSpace, filePath, range.total, absTarget);
          await upsertFileMeta(targetSpace, filePath, range.total).catch(err => {
            log.warn(`upsertFileMeta error for space ${targetSpace}, path ${filePath}: ${err}`);
          });

          // Enqueue async text embedding for document formats (same as single-request path)
          const resolvedFmt = resolveInputFormat(filePath, req.headers['content-type']);
          const chunkedMimeType = (req.headers['content-type'] ?? 'application/octet-stream').split(';')[0]!.trim();
          let chunkedEmbeddingStatus: string | undefined;
          if (isMediaFormat(resolvedFmt)) {
            const mediaCfg = getMediaEmbeddingConfig();
            if (mediaCfg.enabled && range.total <= (mediaCfg.maxFileSizeBytes ?? 524_288_000)) {
              await col<FileMetaDoc>(`${targetSpace}_files`).updateOne(
                asFilter<FileMetaDoc>({ _id: filePath.replace(/\\/g, '/').replace(/^\/+/, '') }),
                { $set: { mediaType: resolvedFmt, embeddingStatus: 'pending' } },
              );
              await enqueueMediaJob(targetSpace, filePath, chunkedMimeType, resolvedFmt).catch(err => {
                log.warn(`enqueueMediaJob (chunked) error for ${targetSpace}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
              });
              chunkedEmbeddingStatus = 'pending';
            }
          } else if (resolvedFmt !== 'text') {
            await deleteConversionArtifacts(targetSpace, filePath).catch(() => {});
            await enqueueTextJob(targetSpace, filePath, resolvedFmt, chunkedMimeType).catch(err => {
              log.warn(`enqueueTextJob (chunked) error for ${targetSpace}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
            });
            chunkedEmbeddingStatus = 'pending';
          }

          emitWebhookEvent({ event: 'file.created', spaceId: targetSpace, entry: { path: filePath, sha256 }, ...webhookToken(req) });
          const isDocFormat = resolvedFmt !== 'text' && !isMediaFormat(resolvedFmt);
          const chunkedStatusCode = (chunkedEmbeddingStatus === 'pending' && isDocFormat) ? 202 : 201;
          const chunkedResponse: Record<string, unknown> = { path: filePath, sha256 };
          if (chunkedEmbeddingStatus !== undefined) chunkedResponse['embeddingStatus'] = chunkedEmbeddingStatus;
          res.status(chunkedStatusCode).json(chunkedResponse);
        } else {
          res.status(202).json({ path: filePath, received });
        }
      } catch (err) {
        if (err instanceof RangeError) {
          res.status(400).json({ error: (err as Error).message });
          return;
        }
        log.warn(`Chunked upload error for space ${targetSpace}, path ${filePath}: ${err}`);
        res.status(500).json({ error: 'Chunked upload failed' });
      }
      return;
    }

    // ── Single-request upload ────────────────────────────────────────────
    try {
      let sha256: string;
      let incomingBytes = 0;

      if (Buffer.isBuffer(req.body)) {
        incomingBytes = req.body.length;
      } else if (req.body && typeof req.body === 'object' && typeof req.body.content === 'string') {
        const encoding: string = req.body.encoding ?? 'utf8';
        if (encoding !== 'utf8' && encoding !== 'base64') {
          res.status(400).json({ error: "encoding must be 'utf8' or 'base64'" });
          return;
        }
        incomingBytes = Buffer.byteLength(req.body.content as string, encoding as BufferEncoding);
      } else {
        res
          .status(400)
          .json({
            error:
              'Send file content as a raw body (any Content-Type) or JSON { content: string, encoding?: "utf8"|"base64" }',
          });
        return;
      }

      // Storage quota check — rejects with 507 if hard limit exceeded
      let quotaResult;
      try {
        quotaResult = await checkQuota('files', incomingBytes);
      } catch (err) {
        if (err instanceof QuotaError) {
          res.status(507).json({ error: err.message, storageExceeded: true });
          return;
        }
        throw err;
      }

      if (Buffer.isBuffer(req.body)) {
        ({ sha256 } = await writeFileBytes(targetSpace, filePath, req.body));
      } else {
        const encoding = (req.body.encoding ?? 'utf8') as BufferEncoding;
        const buf = Buffer.from(req.body.content as string, encoding);
        ({ sha256 } = await writeFileBytes(targetSpace, filePath, buf));
      }

      // Persist file metadata to MongoDB
      const metaOpts: { description?: string; tags?: string[]; properties?: Record<string, string | number | boolean> } = {};
      if (typeof req.body?.description === 'string') metaOpts.description = req.body.description;
      if (Array.isArray(req.body?.tags)) metaOpts.tags = req.body.tags as string[];
      if (req.body?.properties != null && typeof req.body.properties === 'object' && !Array.isArray(req.body.properties)) {
        metaOpts.properties = req.body.properties as Record<string, string | number | boolean>;
      }
      await upsertFileMeta(targetSpace, filePath, incomingBytes, metaOpts).catch(err => {
        log.warn(`upsertFileMeta error for space ${targetSpace}, path ${filePath}: ${err}`);
      });

      // Run conversion pipeline for convertible formats, or enqueue media/text jobs
      const inputFormat = typeof req.body?.inputFormat === 'string' ? req.body.inputFormat as InputFormat : 'auto';
      const resolvedFormat = resolveInputFormat(filePath, req.headers['content-type'], inputFormat);
      const normId = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const mimeType = (req.headers['content-type'] ?? 'application/octet-stream').split(';')[0]!.trim();

      let embeddingStatusForResponse: 'disabled' | 'skipped' | 'pending' | undefined;

      if (isMediaFormat(resolvedFormat)) {
        // Media file: enqueue async embedding job (or skip if disabled / oversized)
        const mediaCfg = getMediaEmbeddingConfig();
        if (!mediaCfg.enabled) {
          embeddingStatusForResponse = 'disabled';
          await col<FileMetaDoc>(`${targetSpace}_files`).updateOne(
            asFilter<FileMetaDoc>({ _id: normId }),
            { $set: { mediaType: resolvedFormat, embeddingStatus: 'disabled' } },
          );
        } else if (incomingBytes > (mediaCfg.maxFileSizeBytes ?? 524_288_000)) {
          embeddingStatusForResponse = 'skipped';
          await col<FileMetaDoc>(`${targetSpace}_files`).updateOne(
            asFilter<FileMetaDoc>({ _id: normId }),
            { $set: { mediaType: resolvedFormat, embeddingStatus: 'skipped' } },
          );
          log.info(`Media file ${targetSpace}/${filePath} skipped: ${incomingBytes} bytes exceeds maxFileSizeBytes (${mediaCfg.maxFileSizeBytes})`);
        } else {
          embeddingStatusForResponse = 'pending';
          await col<FileMetaDoc>(`${targetSpace}_files`).updateOne(
            asFilter<FileMetaDoc>({ _id: normId }),
            { $set: { mediaType: resolvedFormat, embeddingStatus: 'pending' } },
          );
          await enqueueMediaJob(targetSpace, filePath, mimeType, resolvedFormat).catch(err => {
            log.warn(`enqueueMediaJob error for ${targetSpace}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
          });
        }
      } else if (resolvedFormat !== 'text') {
        // Text document (md, txt, html, pdf, docx, epub): enqueue async embedding job.
        // Delete stale conversion artifacts from any previous upload first so the
        // worker starts with a clean slate — avoids duplicate chunk records.
        await deleteConversionArtifacts(targetSpace, filePath).catch(err => {
          log.warn(`deleteConversionArtifacts error for ${targetSpace}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        });
        embeddingStatusForResponse = 'pending';
        await enqueueTextJob(targetSpace, filePath, resolvedFormat, mimeType).catch(err => {
          log.warn(`enqueueTextJob error for ${targetSpace}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        });
      }

      const response: { path: string; sha256: string; storageWarning?: boolean; embeddingStatus?: string } = { path: filePath, sha256 };
      if (quotaResult.softBreached) response.storageWarning = true;
      if (embeddingStatusForResponse !== undefined) response.embeddingStatus = embeddingStatusForResponse;
      emitWebhookEvent({ event: 'file.created', spaceId: targetSpace, entry: { path: filePath, sha256 }, ...webhookToken(req) });
      // Return 202 Accepted for document uploads so the HTTP client gets an
      // immediate response before the background embedding worker completes.
      // Media files and unknown-format files keep 201 (no async work or already
      // established contract for media).
      const isDocFormat = resolvedFormat !== 'text' && !isMediaFormat(resolvedFormat);
      const statusCode = (embeddingStatusForResponse === 'pending' && isDocFormat) ? 202 : 201;
      res.status(statusCode).json(response);
    } catch (err) {
      if (err instanceof RangeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      log.warn(`writeFile error for space ${targetSpace}, path ${filePath}: ${err}`);
      res.status(500).json({ error: 'Failed to write file' });
    }
  },
);

// ── POST /api/files/:spaceId/retry_embedding ──────────────────────────────────
// Manually re-trigger media embedding for a failed / skipped file.
filesRouter.post(
  '/:spaceId/retry_embedding',
  globalRateLimit,
  requireSpaceAuth,
  denyReadOnly,
  async (req, res) => {
    const spaceId = req.params['spaceId'] as string;
    const cfg = getConfig();
    if (!cfg.spaces.some(s => s.id === spaceId)) {
      res.status(404).json({ error: `Space '${spaceId}' not found` });
      return;
    }

    const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
    if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
    const targetSpace = wt.target;

    const filePath = req.query['path'];
    if (typeof filePath !== 'string' || !filePath.trim()) {
      res.status(400).json({ error: 'Required query param: path' });
      return;
    }

    let normId: string;
    try {
      normId = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      // Validate the path doesn't escape the space root
      resolveSafePath(targetSpace, filePath);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }

    const { retryJob } = await import('../files/media/job-queue.js');
    const result = await retryJob(targetSpace, normId).catch(err => {
      log.warn(`retryJob error for ${targetSpace}/${normId}: ${err}`);
      return 'error' as const;
    });

    switch (result) {
      case 'not_found':
        res.status(404).json({ error: 'No media job found for this file' });
        break;
      case 'processing':
        res.status(409).json({ error: 'Job is currently processing' });
        break;
      case 'ok':
        res.status(202).json({ queued: true });
        break;
      default:
        res.status(500).json({ error: 'Internal error' });
    }
  },
);

// ── DELETE /api/files/:spaceId ────────────────────────────────────────────────
// Deletes a file. Deleting a directory requires { confirm: true } in the JSON body.
filesRouter.delete('/:spaceId', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const targetSpace = wt.target;

  const filePath = requireQueryPath(req, res);
  if (filePath === null) return;

  let absPath: string;
  try {
    absPath = resolveSafePath(targetSpace, filePath);
    // Symlink-aware boundary re-check before a recursive delete: the lexical
    // path may stay under the root while a symlink component points outside it.
    await assertNoSymlinkEscape(targetSpace, absPath);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    return;
  }

  let stat: Awaited<ReturnType<typeof fs.stat>> | null;
  try {
    stat = await fs.stat(absPath);
  } catch (statErr: unknown) {
    const code = (statErr as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      // Check for an orphaned meta record (file deleted externally, meta still exists).
      // If there is one, clean it up and return 204 so the UI can remove it.
      // If there is none, the path was never known — return 404.
      const normalisedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const orphan = await col<FileMetaDoc>(`${targetSpace}_files`).findOne(
        asFilter<FileMetaDoc>({ _id: normalisedPath }),
      );
      if (orphan) {
        await deleteFileMeta(targetSpace, filePath).catch(err => {
          log.warn(`deleteFileMeta (orphan cleanup) error for space ${targetSpace}, path ${filePath}: ${err}`);
        });
        res.status(204).end();
        return;
      }
      res.status(404).json({ error: 'Path not found' });
      return;
    }
    res.status(404).json({ error: 'Path not found' });
    return;
  }

  if (stat.isDirectory()) {
    if (!req.body || req.body.confirm !== true) {
      res.status(422).json({
        error:
          'Deleting a directory requires { "confirm": true } in the request body.',
      });
      return;
    }
    if (absPath === spaceRoot(targetSpace)) {
      res.status(400).json({ error: 'Cannot delete the space root directory.' });
      return;
    }
    try {
      // Enumerate every file about to be removed — the folder tree AND its conversion
      // sidecars — BEFORE deleting, so we can write a sync tombstone for each. Without
      // tombstones a peer would re-push the files on the next sync (resurrection).
      const removedPaths = (await Promise.all([
        listFilesRecursive(targetSpace, filePath),
        listFilesRecursive(targetSpace, `_converted/${filePath}`),
        listFilesRecursive(targetSpace, `_extracted/${filePath}`),
      ])).flat();

      await fs.rm(absPath, { recursive: true, force: false });
      log.info(`Deleted directory ${absPath} (space: ${targetSpace})`);
      invalidateUsageCache(); // freed disk — reflect it in the next quota check

      // Metadata: soft-flag the user-visible file records (retain for audit) or hard-delete
      // them, per the softDeleteFileMeta setting. Derived chunk records are always removed.
      if (getConfig().softDeleteFileMeta === true) {
        await markFileMetaDeletedByPrefix(targetSpace, filePath).catch(err => {
          log.warn(`markFileMetaDeletedByPrefix error for space ${targetSpace}, path ${filePath}: ${err}`);
        });
      } else {
        await deleteFileMetaByPrefix(targetSpace, filePath).catch(err => {
          log.warn(`deleteFileMetaByPrefix error for space ${targetSpace}, path ${filePath}: ${err}`);
        });
      }
      // Cancel any queued media/text jobs for files under this folder, or they would
      // outlive their sources and retry forever against paths that no longer exist.
      await cancelMediaJobsByPrefix(targetSpace, filePath).catch(err => {
        log.warn(`cancelMediaJobsByPrefix error for space ${targetSpace}, path ${filePath}: ${err}`);
      });
      // Remove conversion sidecar records + on-disk files (`_converted/<path>`,
      // `_extracted/<path>`), which live outside the folder prefix and would otherwise orphan.
      await deleteConversionArtifactsByPrefix(targetSpace, filePath).catch(err => {
        log.warn(`deleteConversionArtifactsByPrefix error for space ${targetSpace}, path ${filePath}: ${err}`);
      });
      // Propagate the deletion to sync peers.
      await writeFileTombstones(targetSpace, removedPaths);
      res.status(204).end();
    } catch (err) {
      log.warn(`rm dir error for space ${targetSpace}, path ${filePath}: ${err}`);
      res.status(500).json({ error: 'Failed to delete directory' });
    }
    return;
  }

  try {
    await deleteFile(targetSpace, filePath);
    invalidateUsageCache(); // freed disk — reflect it in the next quota check
    // Propagate the deletion to sync peers.
    await writeFileTombstones(targetSpace, [filePath]);
    // Metadata: soft-flag (retain for audit) or hard-delete, per softDeleteFileMeta.
    if (getConfig().softDeleteFileMeta === true) {
      await markFileMetaDeleted(targetSpace, filePath).catch(err => {
        log.warn(`markFileMetaDeleted error for space ${targetSpace}, path ${filePath}: ${err}`);
      });
    } else {
      await deleteFileMeta(targetSpace, filePath).catch(err => {
        log.warn(`deleteFileMeta error for space ${targetSpace}, path ${filePath}: ${err}`);
      });
    }
    // Cancel any queued media/text job so it cannot outlive the file and retry forever.
    await cancelMediaJob(targetSpace, filePath).catch(err => {
      log.warn(`cancelMediaJob error for space ${targetSpace}, path ${filePath}: ${err}`);
    });
    await deleteConversionArtifacts(targetSpace, filePath).catch(err => {
      log.warn(`deleteConversionArtifacts error for space ${targetSpace}, path ${filePath}: ${err}`);
    });
    emitWebhookEvent({ event: 'file.deleted', spaceId: targetSpace, entry: { path: filePath }, ...webhookToken(req) });
    res.status(204).end();
  } catch (err) {
    if (err instanceof RangeError) {
      res.status(400).json({ error: err.message });
      return;
    }
    log.warn(`deleteFile error for space ${targetSpace}, path ${filePath}: ${err}`);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ── PATCH /api/files/:spaceId ─────────────────────────────────────────────────
// Move/rename a file or directory. Body: { destination: string }
filesRouter.patch('/:spaceId', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const targetSpace = wt.target;

  const srcPath = requireQueryPath(req, res);
  if (srcPath === null) return;

  const destination = req.body?.destination;
  if (typeof destination !== 'string' || !destination.trim()) {
    res.status(400).json({ error: 'Body must contain { destination: string }' });
    return;
  }

  try {
    // Collect the OLD paths before the move so we can tombstone them: sync has no rename
    // detection, so without a tombstone the peer's manifest still advertises the source path
    // and re-downloads it (the moved-away file resurrects). For a directory move these are the
    // child files; for a single file it is the source path itself.
    const movedChildren = await listFilesRecursive(targetSpace, srcPath);
    const oldPaths = movedChildren.length > 0 ? movedChildren : [srcPath];

    await moveFile(targetSpace, srcPath, destination);
    await Promise.all([
      renameFileMeta(targetSpace, srcPath, destination),
      renameFileMetaByPrefix(targetSpace, srcPath, destination),
    ]).catch(err => {
      log.warn(`renameFileMeta error for space ${targetSpace}, ${srcPath} → ${destination}: ${err}`);
    });
    await writeFileTombstones(targetSpace, oldPaths);
    emitWebhookEvent({ event: 'file.updated', spaceId: targetSpace, entry: { path: destination, previousPath: srcPath }, ...webhookToken(req) });
    res.json({ from: srcPath, to: destination });
  } catch (err) {
    if (err instanceof RangeError) {
      res.status(400).json({ error: err.message });
      return;
    }
    log.warn(`moveFile error for space ${targetSpace}, ${srcPath} → ${destination}: ${err}`);
    res.status(500).json({ error: 'Failed to move path' });
  }
});

// Extensions whose content can execute script when rendered inline by a
// browser — always served as attachments (stored-XSS guard).
const ACTIVE_CONTENT_EXTS = new Set(['.html', '.htm', '.svg', '.xml', '.xhtml']);

// ── MIME type lookup (basic set) ─────────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ts': 'text/typescript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
};
