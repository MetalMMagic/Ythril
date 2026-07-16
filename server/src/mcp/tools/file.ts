import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { recall } from '../../brain/memory.js';
import { getConfig, getMediaEmbeddingConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { type InputFormat, isMediaFormat, resolveInputFormat, runConversionPipeline, storeConversionResults, deleteConversionArtifacts } from '../../files/converters/pipeline.js';
import { ConversionUnavailableError } from '../../files/converters/types.js';
import { deleteFileMeta, markFileMetaDeleted, renameFileMeta, renameFileMetaByPrefix, upsertFileMeta } from '../../files/file-meta.js';
import { createDir, deleteFile, listDir, listFilesRecursive, moveFile, readFile, writeFile } from '../../files/files.js';
import { enqueueMediaJob, cancelMediaJob } from '../../files/media/job-queue.js';
import { writeFileTombstones } from '../../files/tombstones.js';
import { QuotaError, checkQuota, invalidateUsageCache } from '../../quota/quota.js';
import { resolveMemberSpaces, resolveWriteTarget } from '../../spaces/proxy.js';
import { emitWebhookEvent } from '../../webhooks/dispatcher.js';
import { log } from '../../util/log.js';

export const read_fileTool: ToolHandler = {
  name: 'read_file',
  description: 'Read the text contents of a file in the space file store.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            path: { type: 'string', description: 'File path relative to the space root.' },
          },
          required: ['space', 'path'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const filePath = String(a['path'] ?? '');
    if (!filePath.trim()) throw new Error('path must not be empty');
    const memberIds = resolveMemberSpaces(callSpace);
    let content: string | null = null;
    for (const mid of memberIds) {
      try { content = await readFile(mid, filePath); break; } catch { /* try next */ }
    }
    if (content === null) throw new Error(`File not found: ${filePath}`);
    return { content: [{ type: 'text' as const, text: content }] };
  },
};

export const write_fileTool: ToolHandler = {
  name: 'write_file',
  description: 'Write text content to a file in the space file store.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            path: { type: 'string', description: 'File path relative to the space root.' },
            content: { type: 'string', description: 'Text content to write.' },
            description: { type: 'string', description: 'Optional human-readable summary stored as file metadata.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for filtering and recall.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata for this file.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            inputFormat: {
              type: 'string',
              enum: ['pdf', 'docx', 'epub', 'html', 'md', 'txt', 'text', 'auto'],
              description: 'How to process the file. "auto" (default) detects from extension/MIME type. "text" bypasses conversion (single flat embedding). "md"/"txt" use the in-process normaliser+chunker. "pdf"/"docx"/"epub"/"html" use the full conversion pipeline.',
            },
          },
          required: ['space', 'path', 'content'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const filePath = String(a['path'] ?? '');
    const content = String(a['content'] ?? '');
    if (!filePath.trim()) throw new Error('path must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    // Quota check — project the incoming size so a write that would exceed the hard limit is
    // rejected up-front (parity with the REST upload), throwing QuotaError (caught below).
    const sizeBytes = Buffer.byteLength(content, 'utf8');
    const wfQuota = await checkQuota('files', sizeBytes);
    const { sha256 } = await writeFile(wt.target, filePath, content);
    const metaOpts: { description?: string; tags?: string[]; properties?: Record<string, string | number | boolean> } = {};
    if (typeof a['description'] === 'string') metaOpts.description = a['description'];
    if (Array.isArray(a['tags'])) metaOpts.tags = a['tags'] as string[];
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      metaOpts.properties = a['properties'] as Record<string, string | number | boolean>;
    }
    await upsertFileMeta(wt.target, filePath, sizeBytes, metaOpts);
    // Conversion pipeline — or async media job
    const ifFmt = typeof a['inputFormat'] === 'string' ? a['inputFormat'] as InputFormat : 'auto';
    const fileBytes = Buffer.from(content, 'utf8');
    const resolvedFmt = resolveInputFormat(filePath, undefined, ifFmt);
    const normId = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

    if (isMediaFormat(resolvedFmt)) {
      // MCP write_file is text-only; media content via MCP is not expected,
      // but handle gracefully: record as disabled/pending same as REST API.
      const mediaCfg = getMediaEmbeddingConfig();
      if (!mediaCfg.enabled) {
        await col<import('../../config/types.js').FileMetaDoc>(`${wt.target}_files`).updateOne(
          asFilter<import('../../config/types.js').FileMetaDoc>({ _id: normId }),
          { $set: { mediaType: resolvedFmt, embeddingStatus: 'disabled' } },
        );
      } else if (sizeBytes > (mediaCfg.maxFileSizeBytes ?? 524_288_000)) {
        await col<import('../../config/types.js').FileMetaDoc>(`${wt.target}_files`).updateOne(
          asFilter<import('../../config/types.js').FileMetaDoc>({ _id: normId }),
          { $set: { mediaType: resolvedFmt, embeddingStatus: 'skipped' } },
        );
      } else {
        const mimeType = 'application/octet-stream';
        await col<import('../../config/types.js').FileMetaDoc>(`${wt.target}_files`).updateOne(
          asFilter<import('../../config/types.js').FileMetaDoc>({ _id: normId }),
          { $set: { mediaType: resolvedFmt, embeddingStatus: 'pending' } },
        );
        await enqueueMediaJob(wt.target, filePath, mimeType, resolvedFmt).catch(err => {
          log.warn(`write_file enqueueMediaJob error for ${wt.target}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    } else if (resolvedFmt !== 'text') {
      try {
        // Clear any prior conversion artifacts first so overwriting a document does not leave
        // stale/duplicate chunk records behind (parity with the REST upload path).
        await deleteConversionArtifacts(wt.target, filePath).catch(() => {});
        const { chunks, convertedMarkdown, extractedImages } = await runConversionPipeline(fileBytes, filePath, resolvedFmt);
        if (chunks.length > 0 || extractedImages.length > 0) {
          const { chunkCount, convertedFileId } = await storeConversionResults(wt.target, filePath, chunks, convertedMarkdown, extractedImages);
          const metaUpdate: Record<string, unknown> = { chunkCount };
          if (convertedFileId) metaUpdate['convertedFileId'] = convertedFileId;
          await col<import('../../config/types.js').FileMetaDoc>(`${wt.target}_files`).updateOne(
            asFilter<import('../../config/types.js').FileMetaDoc>({ _id: normId }),
            { $set: metaUpdate },
          );
        }
      } catch (err) {
        if (err instanceof ConversionUnavailableError) {
          log.warn(`write_file conversion failed for ${wt.target}/${filePath}: ${err.message}`);
          await col<import('../../config/types.js').FileMetaDoc>(`${wt.target}_files`).updateOne(
            asFilter<import('../../config/types.js').FileMetaDoc>({ _id: normId }),
            { $set: { conversionError: err.message } },
          );
        }
      }
    }
    emitWebhookEvent({ event: 'file.created', spaceId: wt.target, entry: { path: filePath, sha256 }, ...(ctx.actor ?? {}) });
    const wfText = `Written (sha256: ${sha256}).`
      + (wfQuota.softBreached ? `\n⚠️ Storage warning: ${wfQuota.warning}` : '');
    return {
      content: [{ type: 'text' as const, text: wfText }],
    };
  },
};

export const list_dirTool: ToolHandler = {
  name: 'list_dir',
  description: 'List files and directories at a path in the space file store.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            path: {
              type: 'string',
              description: 'Directory path relative to space root (default: root).',
            },
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const dirPath = String(a['path'] ?? '');
    const memberIds = resolveMemberSpaces(callSpace);
    const seen = new Set<string>();
    const allEntries: { name: string; type: 'file' | 'dir'; size?: number }[] = [];
    for (const mid of memberIds) {
      try {
        const entries = await listDir(mid, dirPath || '.');
        for (const e of entries) {
          if (!seen.has(e.name)) { seen.add(e.name); allEntries.push(e); }
        }
      } catch { /* dir may not exist in this member */ }
    }
    const text =
      allEntries.length === 0
        ? '(empty directory)'
        : allEntries
            .map(e => `${e.type === 'dir' ? 'd' : 'f'}  ${e.name}${e.size != null ? `  (${e.size}B)` : ''}`)
            .join('\n');
    return { content: [{ type: 'text' as const, text }] };
  },
};

export const delete_fileTool: ToolHandler = {
  name: 'delete_file',
  description: 'Delete a file from the space file store.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            path: { type: 'string', description: 'File path relative to the space root.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'path'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const filePath = String(a['path'] ?? '');
    if (!filePath.trim()) throw new Error('path must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    await deleteFile(wt.target, filePath);
    // Propagate the deletion to sync peers (else the peer's manifest re-pushes the file).
    await writeFileTombstones(wt.target, [filePath]);
    // Soft-flag (retain for audit) or hard-delete the metadata, per softDeleteFileMeta.
    if (getConfig().softDeleteFileMeta === true) {
      await markFileMetaDeleted(wt.target, filePath);
    } else {
      await deleteFileMeta(wt.target, filePath);
    }
    // Cancel any queued embedding job and remove conversion artifacts so nothing
    // outlives the file (a stale job would retry forever against the missing path).
    await cancelMediaJob(wt.target, filePath).catch(() => {});
    await deleteConversionArtifacts(wt.target, filePath).catch(() => {});
    invalidateUsageCache(); // freed disk — reflect it in the next quota check
    emitWebhookEvent({ event: 'file.deleted', spaceId: wt.target, entry: { path: filePath }, ...(ctx.actor ?? {}) });
    return { content: [{ type: 'text' as const, text: `Deleted '${filePath}'.` }] };
  },
};

export const create_dirTool: ToolHandler = {
  name: 'create_dir',
  description: 'Create a directory (and any required parents) in the space file store.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            path: { type: 'string', description: 'Directory path relative to the space root.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'path'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const dirPath = String(a['path'] ?? '');
    if (!dirPath.trim()) throw new Error('path must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    await createDir(wt.target, dirPath);
    return { content: [{ type: 'text' as const, text: `Directory '${dirPath}' created.` }] };
  },
};

export const move_fileTool: ToolHandler = {
  name: 'move_file',
  description: 'Move or rename a file or directory within the space file store.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            src: { type: 'string', description: 'Source path.' },
            dst: { type: 'string', description: 'Destination path.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'src', 'dst'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const src = String(a['src'] ?? '');
    const dst = String(a['dst'] ?? '');
    if (!src.trim()) throw new Error('src must not be empty');
    if (!dst.trim()) throw new Error('dst must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    // Tombstone the OLD path(s) before moving (sync has no rename detection, so the source
    // would otherwise resurrect from a peer's manifest). Children for a dir move, else src.
    const movedChildren = await listFilesRecursive(wt.target, src);
    const oldPaths = movedChildren.length > 0 ? movedChildren : [src];

    await moveFile(wt.target, src, dst);
    // Re-root metadata: the file record at `src` AND, for a directory move, every child
    // record under `src/` (renameFileMetaByPrefix). The HTTP PATCH route does both; MCP
    // previously did only the single-file rename, orphaning child records on a dir move.
    await Promise.all([
      renameFileMeta(wt.target, src, dst),
      renameFileMetaByPrefix(wt.target, src, dst),
    ]).catch(err => {
      log.warn(`move_file renameFileMeta error for ${wt.target}, ${src} → ${dst}: ${err instanceof Error ? err.message : String(err)}`);
    });
    await writeFileTombstones(wt.target, oldPaths);
    emitWebhookEvent({ event: 'file.updated', spaceId: wt.target, entry: { path: dst, previousPath: src }, ...(ctx.actor ?? {}) });
    return { content: [{ type: 'text' as const, text: `Moved '${src}' → '${dst}'.` }] };
  },
};
