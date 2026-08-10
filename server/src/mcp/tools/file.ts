import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { recall } from '../../brain/recall.js';
import { TTL_DAYS_SCHEMA, ttlDaysFromArgs } from './shared.js';
import { type InputFormat } from '../../files/converters/pipeline.js';
import { renameFileMeta, renameFileMetaByPrefix, upsertFileMeta } from '../../files/file-meta.js';
import { createDir, listDir, listFilesRecursive, moveFile, readFile, writeFile } from '../../files/files.js';
import { dispatchFileProcessing } from '../../files/dispatch.js';
import { writeFileTombstones } from '../../files/tombstones.js';
import { deleteFileCascade } from '../../files/delete-cascade.js';
import { QuotaError, checkQuota } from '../../quota/quota.js';
import { resolveMemberSpaces, resolveWriteTarget } from '../../spaces/proxy.js';
import { memberSpacesWithin } from '../../spaces/proxy-scoped.js';
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
            path: { type: 'string', minLength: 1, description: 'File path relative to the space root.' },
          },
          required: ['space', 'path'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace , accessibleSpaceIds } = ctx;
    const filePath = String(a['path'] ?? '');
    if (!filePath.trim()) throw new Error('path must not be empty');
    const memberIds = memberSpacesWithin(callSpace, accessibleSpaceIds);
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
            path: { type: 'string', minLength: 1, description: 'File path relative to the space root.' },
            content: { type: 'string', description: 'Text content to write.' },
            description: { type: 'string', description: 'Optional human-readable summary stored as file metadata.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for filtering and recall.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata for this file.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            ttlDays: TTL_DAYS_SCHEMA,
            inputFormat: {
              type: 'string',
              enum: ['pdf', 'docx', 'epub', 'html', 'md', 'txt', 'text', 'auto'],
              default: 'auto',
              description: 'How to process the file. "auto" (default) detects from extension/MIME type. "text" bypasses conversion (single flat embedding). "md"/"txt" use the in-process normaliser+chunker. "pdf"/"docx"/"epub"/"html" use the full conversion pipeline.',
            },
          },
          required: ['space', 'path', 'content'],
          additionalProperties: false,
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
    const metaOpts: { description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; ttlDays?: number | null } = {};
    if (typeof a['description'] === 'string') metaOpts.description = a['description'];
    if (Array.isArray(a['tags'])) metaOpts.tags = a['tags'] as string[];
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      metaOpts.properties = a['properties'] as Record<string, string | number | boolean>;
    }
    metaOpts.ttlDays = ttlDaysFromArgs(a);
    await upsertFileMeta(wt.target, filePath, sizeBytes, metaOpts);
    // Resolve format, record media state, and enqueue the async embedding job — one shared policy
    // with the REST upload path. Documents are converted by the background worker (not inline), so
    // the tool returns immediately with `embeddingStatus: 'pending'`; the worker produces chunks and
    // sets `chunkCount`/`convertedFileId` shortly after. MCP has no Content-Type; the dispatcher
    // derives the type from the file extension, so an image written here reaches the vision provider
    // as `image/png` rather than the byte-blob type this comment used to describe as intended.
    const ifFmt = typeof a['inputFormat'] === 'string' ? a['inputFormat'] as InputFormat : 'auto';
    await dispatchFileProcessing(wt.target, filePath, { bytes: sizeBytes, inputFormat: ifFmt });
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
              default: '',
              description: 'Directory path relative to space root (default: root).',
            },
          },
          required: ['space'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name , accessibleSpaceIds } = ctx;
    const dirPath = String(a['path'] ?? '');
    const memberIds = memberSpacesWithin(callSpace, accessibleSpaceIds);
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
            path: { type: 'string', minLength: 1, description: 'File path relative to the space root.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'path'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const filePath = String(a['path'] ?? '');
    if (!filePath.trim()) throw new Error('path must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    // Full cascade (blob + tombstone + meta + job + artifacts + usage + webhook) — shared with the REST
    // DELETE route and the TTL sweep so every delete path cleans up identically.
    await deleteFileCascade(wt.target, filePath, ctx.actor);
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
            path: { type: 'string', minLength: 1, description: 'Directory path relative to the space root.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'path'],
          additionalProperties: false,
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
            src: { type: 'string', minLength: 1, description: 'Source path.' },
            dst: { type: 'string', minLength: 1, description: 'Destination path.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'src', 'dst'],
          additionalProperties: false,
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
