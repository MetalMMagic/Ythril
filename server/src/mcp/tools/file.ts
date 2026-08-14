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
    const metaOpts: { description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; ttlDays?: number | null; sha256?: string } = {};
    if (typeof a['description'] === 'string') metaOpts.description = a['description'];
    if (Array.isArray(a['tags'])) metaOpts.tags = a['tags'] as string[];
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      metaOpts.properties = a['properties'] as Record<string, string | number | boolean>;
    }
    metaOpts.ttlDays = ttlDaysFromArgs(a);
    metaOpts.sha256 = sha256;
    await upsertFileMeta(wt.target, filePath, sizeBytes, metaOpts);
    // Resolve format, record media state, and enqueue the async embedding job — one shared policy
    // with the REST upload path. Documents are converted by the background worker (not inline), so
    // the tool returns immediately with `embeddingStatus: 'pending'`; the worker produces chunks and
    // sets `chunkCount`/`convertedFileId` shortly after. MCP has no Content-Type; the dispatcher
    // derives the type from the file extension, so an image written here reaches the vision provider
    // as `image/png` rather than the byte-blob type this comment used to describe as intended.
    const ifFmt = typeof a['inputFormat'] === 'string' ? a['inputFormat'] as InputFormat : 'auto';
    await dispatchFileProcessing(wt.target, filePath, { bytes: sizeBytes, inputFormat: ifFmt, sha256 });
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

/**
 * Re-queue a failed file embedding.
 *
 * ## Why this is a tool now
 *
 * breituai-platform, 2026-08-11T1722Z, listed it among five capabilities a token could HOLD and not exercise:
 * *"The rights matrix decides what a token may do; the surface should not also decide whether it can."* This one
 * is the sharpest of the five, because it is the documented recovery path for a failed embedding — so the surface
 * that could see the failure was the surface that could not act on it.
 *
 * ## A wrapper, deliberately
 *
 * `retryJob` is the same function `POST /api/files/:spaceId/retry_embedding` calls. Reimplementing the reset
 * (status, attempts, lastError, claim fields) here would be a second copy of a state machine, and the copy that
 * drifts is the one nobody is watching. The three outcomes are reported verbatim rather than collapsed into
 * success/failure: `processing` means someone else already has it, which is not an error and not a retry.
 */
export const retry_embeddingTool: ToolHandler = {
  name: 'retry_embedding',
  description: 'Re-queue a file whose media embedding failed or was skipped, so the worker picks it up again. '
    + 'Resets the job to pending and clears its attempt count and last error. Returns `processing` unchanged if '
    + 'the worker already holds it — that is not a failure, and retrying it would take the job away from a run in '
    + 'progress. Use the file path as it appears in list_dir.',
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

    // Normalised the same way the REST route does it, so a path that works there works here. A raw path would
    // miss the job whose id is the normalised form, and report `not_found` for a file that exists.
    const { toDocId } = await import('../../util/paths.js');
    let docId: string;
    try {
      docId = toDocId(filePath);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : `Invalid path '${filePath}'`);
    }

    const { retryJob } = await import('../../files/media/job-queue.js');
    const result = await retryJob(wt.target, docId);

    const text = result === 'ok'
      ? `Re-queued '${filePath}' for embedding.`
      : result === 'processing'
        ? `'${filePath}' is being processed right now — left alone rather than reset, so the run in progress is not interrupted.`
        : `No embedding job exists for '${filePath}'. Either it was never queued, or the path does not match a stored file.`;

    // The outcome verbatim, so a caller can branch without reading English.
    return { content: [{ type: 'text' as const, text }], structuredContent: { result, path: filePath } };
  },
};

/**
 * Change a file's metadata WITHOUT resending the file.
 *
 * `write_file` accepts `description`, `tags` and `properties` — but only alongside `content`. The metadata-only
 * edit was `PATCH /api/brain/spaces/:spaceId/files`, which had no tool, so correcting a tag on a 40 MB PDF meant
 * re-uploading it, and correcting one on a file whose bytes you do not have was impossible.
 *
 * Every knowledge type has an `update_*` tool for exactly this reason. Files were the one that did not.
 *
 * Found by the capability matrix (`scripts/surface-matrix.mjs`). Filed as B-23.
 *
 * **The route's rules, not a second copy of them.** `updateFileMeta` performs the write and the same
 * strict-linkage check runs first, because a file carries three reference fields (`entityIds`, `memoryIds`,
 * `chronoIds`) and storing an unresolvable one is the widest silent hole this record type had.
 */
export const update_file_metaTool: ToolHandler = {
  name: 'update_file_meta',
  description: 'Change a file record\'s description, tags, properties or links WITHOUT resending the file. '
    + '`write_file` can set those fields but only together with new content, so correcting a tag used to mean '
    + 're-uploading the bytes. Only the fields you pass are touched; omit one to leave it alone. Under strict '
    + 'linkage every id in `entityIds`/`memoryIds`/`chronoIds` must resolve, or the call is refused rather than '
    + 'stored. Use `list_dir` or a `query` over the `files` collection to find the path.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
    type: 'object',
    properties: {
      space: s.requiredSpace,
      path: { type: 'string', minLength: 1, description: 'The file path within the space, as list_dir reports it.' },
      description: { type: 'string', description: 'Replaces the description. Omit to leave it unchanged.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Replaces the tag list.' },
      properties: { type: 'object', description: 'Replaces the properties object.' },
      entityIds: { type: 'array', items: { type: 'string' }, description: 'Entity ids this file relates to.' },
      memoryIds: { type: 'array', items: { type: 'string' }, description: 'Memory ids this file relates to.' },
      chronoIds: { type: 'array', items: { type: 'string' }, description: 'Chrono ids this file relates to.' },
      targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space holding the file.' },
    },
    required: ['space', 'path'],
    additionalProperties: false,
  }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const filePath = String(a['path'] ?? '').trim();
    if (!filePath) throw new Error('path must not be empty');

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    const { isStrictLinkage } = await import('../../spaces/proxy.js');
    const { assertRefsResolve } = await import('../../brain/entity-refs.js');
    const { updateFileMeta } = await import('../../files/file-meta.js');

    const patch = {
      description: a['description'] as string | undefined,
      tags: a['tags'] as string[] | undefined,
      properties: a['properties'] as Record<string, string | number | boolean> | undefined,
      entityIds: a['entityIds'] as string[] | undefined,
      memoryIds: a['memoryIds'] as string[] | undefined,
      chronoIds: a['chronoIds'] as string[] | undefined,
    };

    // The same check the route runs, in the same order: refuse an unresolvable reference rather than store it.
    if (isStrictLinkage(wt.target)) {
      await assertRefsResolve(wt.target, 'entityIds', 'entity', patch.entityIds);
      await assertRefsResolve(wt.target, 'memoryIds', 'memory', patch.memoryIds);
      await assertRefsResolve(wt.target, 'chronoIds', 'chrono', patch.chronoIds);
    }

    const updated = await updateFileMeta(wt.target, filePath, patch);
    if (!updated) throw new Error(`No file metadata record for '${filePath}' in '${wt.target}'.`);

    return {
      content: [{ type: 'text' as const, text: `Updated metadata for '${filePath}' in '${wt.target}'.` }],
      structuredContent: updated as unknown as Record<string, unknown>,
    };
  },
};
