/**
 * Shared file-processing dispatch — the single decision point for what happens to a freshly
 * written file's embedding pipeline.
 *
 * The REST single-request upload (`api/files.ts`), the REST chunked-complete finaliser, and the
 * MCP `write_file` tool were three inline copies of the same
 * `resolveInputFormat → media-branch | document-branch` sequence, and they had drifted:
 *   - the chunked path only recorded `pending` for media, never `disabled`/`skipped`;
 *   - MCP `write_file` converted documents **synchronously inline** (`runConversionPipeline` +
 *     `storeConversionResults`) while REST enqueued an async worker job — same work, two mechanisms;
 *   - the 500 MiB media size cap was a magic `524_288_000` literal in three places.
 *
 * All three now call {@link dispatchFileProcessing}. One policy: documents are always converted by
 * the background worker (never inline), so REST and MCP behave identically and every write inherits
 * the worker's retry/backoff/404-flagging/restart-survival. The file must already be on disk before
 * calling this (the worker reads it back).
 */

import { col, asFilter } from '../db/mongo.js';
import type { FileMetaDoc } from '../config/types.js';
import { getMediaEmbeddingConfig, DEFAULT_MEDIA_MAX_FILE_SIZE_BYTES } from '../config/loader.js';
import { resolveInputFormat, deleteConversionArtifacts, isMediaFormat, type ResolvedFormat } from './converters/pipeline.js';
import { enqueueMediaJob, enqueueTextJob } from './media/job-queue.js';
import { documentsAreOff } from './converters/extraction-level.js';
import { mediaIsOff } from './converters/media-level.js';
import { toDocId } from '../util/paths.js';
import { log } from '../util/log.js';

/** Embedding-pipeline state surfaced to the HTTP/MCP response after a write. */
export type FileEmbeddingStatus = 'disabled' | 'skipped' | 'pending';

export interface DispatchInput {
  /** File size in bytes (used for the media size cap). */
  bytes: number;
  /** Raw `Content-Type` header, if any — used to resolve the format and as the enqueue MIME type. */
  contentType?: string;
  /** Caller-declared `inputFormat` hint (`auto` when omitted). */
  inputFormat?: string;
}

export interface DispatchResult {
  resolvedFormat: ResolvedFormat;
  /** Present for media (all cases) and documents (`pending`); undefined for plain text. */
  embeddingStatus?: FileEmbeddingStatus;
}

/**
 * Decide and enqueue the embedding work for a just-written file, and record media state on its
 * metadata record. Returns the resolved format (so the caller can pick a 202/201 status code) and
 * the embedding status (for the response body). Never throws for enqueue/DB hiccups — those are
 * logged and swallowed so a transient worker/queue error can't fail the write itself.
 */
export async function dispatchFileProcessing(
  spaceId: string,
  filePath: string,
  input: DispatchInput,
): Promise<DispatchResult> {
  const resolvedFormat = resolveInputFormat(filePath, input.contentType, input.inputFormat ?? 'auto');
  const normId = toDocId(filePath);
  const mimeType = (input.contentType ?? 'application/octet-stream').split(';')[0]!.trim();

  if (isMediaFormat(resolvedFormat)) {
    // Media (image/audio/video): enqueue an async embedding job, or record why we didn't.
    // `mediaType` is the guard-narrowed format so it satisfies FileMetaDoc's media subset.
    const mediaType = resolvedFormat;
    const setMediaStatus = (status: FileEmbeddingStatus): Promise<unknown> =>
      col<FileMetaDoc>(`${spaceId}_files`).updateOne(
        asFilter<FileMetaDoc>({ _id: normId }),
        { $set: { mediaType, embeddingStatus: status } },
      );
    const mediaCfg = getMediaEmbeddingConfig();
    const maxBytes = mediaCfg.maxFileSizeBytes ?? DEFAULT_MEDIA_MAX_FILE_SIZE_BYTES;
    // No master switch any more: whether this class runs is decided entirely by its per-class level
    // below (`mediaIsOff`). A whole-instance "off" is now `levels.<class> = off`, which lands as
    // 'skipped' with a reason — not the old blanket 'disabled'. (Existing 'disabled' records still
    // render; that status just has no producer now.)
    if (input.bytes > maxBytes) {
      await setMediaStatus('skipped');
      log.info(`Media file ${spaceId}/${filePath} skipped: ${input.bytes} bytes exceeds maxFileSizeBytes (${maxBytes})`);
      return { resolvedFormat, embeddingStatus: 'skipped' };
    }
    // This class is off for this space: store the file, analyse nothing, and say so terminally.
    // Enqueuing a job that will do nothing leaves the file at `pending` forever — indistinguishable
    // from a stuck queue, and the reason recall comes back empty would be nowhere to be found.
    if (mediaIsOff(spaceId, mediaType)) {
      await setMediaStatus('skipped');
      log.info(`Media file ${spaceId}/${filePath} not analysed: ${mediaType} analysis is off for this space`);
      return { resolvedFormat, embeddingStatus: 'skipped' };
    }
    await setMediaStatus('pending');
    await enqueueMediaJob(spaceId, filePath, mimeType, mediaType).catch(err => {
      log.warn(`enqueueMediaJob error for ${spaceId}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    });
    return { resolvedFormat, embeddingStatus: 'pending' };
  }

  if (resolvedFormat !== 'text') {
    // Documents are off for this space: the file is stored but never analysed. Record a terminal
    // state instead of queueing work that will do nothing — a job that is enqueued and then produces
    // no chunks leaves the file at `pending` forever, which is indistinguishable from a stuck queue.
    // That is precisely the silent-failure shape the vector-index work was about: the UI shows a
    // spinner, recall returns nothing, and neither says why.
    if (documentsAreOff(spaceId)) {
      await col<FileMetaDoc>(`${spaceId}_files`).updateOne(
        asFilter<FileMetaDoc>({ _id: normId }),
        { $set: { embeddingStatus: 'skipped' } },
      );
      log.info(`Document ${spaceId}/${filePath} not analysed: document extraction is off for this space`);
      return { resolvedFormat, embeddingStatus: 'skipped' };
    }
    // Document (md/txt/html/pdf/docx/epub): always converted by the background worker.
    // Clear stale conversion artifacts first so overwriting a document does not leave
    // duplicate chunk records behind.
    await deleteConversionArtifacts(spaceId, filePath).catch(err => {
      log.warn(`deleteConversionArtifacts error for ${spaceId}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    });
    await enqueueTextJob(spaceId, filePath, resolvedFormat, mimeType).catch(err => {
      log.warn(`enqueueTextJob error for ${spaceId}/${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    });
    return { resolvedFormat, embeddingStatus: 'pending' };
  }

  // Plain text ('text'): stored as-is, no embedding pipeline.
  return { resolvedFormat };
}
