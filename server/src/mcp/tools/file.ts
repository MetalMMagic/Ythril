import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { recall } from '../../brain/memory.js';
import { getMediaEmbeddingConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { type InputFormat, isMediaFormat, resolveInputFormat, runConversionPipeline, storeConversionResults } from '../../files/converters/pipeline.js';
import { ConversionUnavailableError } from '../../files/converters/types.js';
import { deleteFileMeta, renameFileMeta, upsertFileMeta } from '../../files/file-meta.js';
import { createDir, deleteFile, listDir, moveFile, readFile, writeFile } from '../../files/files.js';
import { enqueueMediaJob } from '../../files/media/job-queue.js';
import { QuotaError, checkQuota } from '../../quota/quota.js';
import { resolveMemberSpaces, resolveWriteTarget } from '../../spaces/proxy.js';
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
    // Quota check — throws QuotaError (caught below) on hard limit
    const wfQuota = await checkQuota('files');
    const { sha256 } = await writeFile(wt.target, filePath, content);
    const sizeBytes = Buffer.byteLength(content, 'utf8');
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
    await deleteFileMeta(wt.target, filePath);
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
    await moveFile(wt.target, src, dst);
    await renameFileMeta(wt.target, src, dst);
    return { content: [{ type: 'text' as const, text: `Moved '${src}' → '${dst}'.` }] };
  },
};
