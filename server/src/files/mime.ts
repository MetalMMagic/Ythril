/**
 * One MIME table, and the two conversions every caller actually wants:
 * path → MIME (`mimeTypeForPath`) and MIME → extension (`extForMimeType`).
 *
 * ## Why this module exists
 *
 * A 2.0.0 report: external vision failed 100% of the time with
 *
 *     {"error":{"code":500,"message":"Invalid uri format: data:application/octet-stream;base64", ...}}
 *
 * on a `.png` upload. The reporter read it as a hardcoded type in the vision request. It was not —
 * `ExternalVisionProvider.caption` faithfully interpolates the MIME it is handed. The wrong value was
 * handed to it, from three entry points at once:
 *
 *   - the web UI set `Content-Type: application/octet-stream` on **every** upload, whatever the file;
 *   - MCP `write_file` has no Content-Type at all;
 *   - `dispatchFileProcessing` defaulted the missing/generic header to `application/octet-stream`
 *     without ever consulting the extension — on the line directly *after* `resolveInputFormat` had
 *     classified the very same file as an image, by that extension.
 *
 * So the pipeline knew it was an image and simultaneously described it as a byte blob. Everything
 * downstream that has to name the format then guessed, each in its own way and each wrongly:
 *
 *   | consumer                          | got                        | consequence                        |
 *   |-----------------------------------|----------------------------|------------------------------------|
 *   | external vision data URI          | `data:application/octet-…` | strict servers 500 (the report)    |
 *   | Whisper multipart filename        | `audio.octet-stream`       | extension-whitelist reject         |
 *   | audio ffmpeg input                | `input.bin`                | relies on content probing          |
 *   | video ffmpeg input                | `input.mp4` for any video  | a `.webm` written as `.mp4`        |
 *   | face-recognition re-enqueue       | `image/jpeg` for a `.png`  | actively mislabelled               |
 *
 * The fix is upstream of all of them: derive the type from the name when the caller did not give a
 * usable one. The extension is not a guess here — it is the same evidence `resolveInputFormat`
 * already trusts to decide the file is media at all.
 */

import path from 'node:path';

/**
 * Types that carry no information. A caller sending one of these has told us "bytes", which is the
 * absence of an answer rather than an answer — so the extension is consulted instead.
 *
 * `application/octet-stream` is on this list because browsers and generic HTTP clients send it as a
 * default, not as a claim. That is exactly the case this module exists to repair.
 */
const UNINFORMATIVE_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
  'application/binary',
  'application/x-binary',
  'application/download',
  'application/force-download',
  'application/unknown',
  '*/*',
]);

/**
 * Extension → MIME. The canonical direction.
 *
 * Ordering is significant: `extForMimeType` inverts this table, so the **first** extension listed for
 * a given MIME is the one produced. `.jpg` precedes `.jpeg` deliberately.
 *
 * Coverage is a superset of `converters/pipeline.ts`'s `EXT_MAP` — every extension the pipeline will
 * classify as media or as a document resolves to a real type here, so no path through
 * `dispatchFileProcessing` can reach a provider with a blob type.
 */
const MIME_BY_EXT: Record<string, string> = {
  // Documents
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.epub': 'application/epub+zip',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xhtml': 'application/xhtml+xml',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.heic': 'image/heic',
  '.avif': 'image/avif',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
  // Archives
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
};

/**
 * Non-canonical spellings that mean the same thing, folded onto the canonical type.
 *
 * These are real values seen in the wild, not hypotheticals: `audio/x-wav` is what several recorders
 * emit, and it is precisely the case that broke the old `mimeType.split('/')[1]` filename derivation
 * — that produced `audio.x-wav`, which OpenAI's transcription endpoint rejects because `x-wav` is not
 * on its extension whitelist.
 */
const MIME_ALIASES: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/mpeg3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
  'audio/wave': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/m4a': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/x-flac': 'audio/flac',
  'audio/x-aac': 'audio/aac',
  'audio/vorbis': 'audio/ogg',
  'audio/x-ogg': 'audio/ogg',
  'video/x-quicktime': 'video/quicktime',
  'video/avi': 'video/x-msvideo',
  'video/msvideo': 'video/x-msvideo',
  'video/matroska': 'video/x-matroska',
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  'image/x-ms-bmp': 'image/bmp',
  'image/x-tiff': 'image/tiff',
  'text/xml': 'application/xml',
};

/** MIME → extension (no leading dot). Built by inverting {@link MIME_BY_EXT}, first listing wins. */
const EXT_BY_MIME: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [ext, mime] of Object.entries(MIME_BY_EXT)) {
    if (!(mime in out)) out[mime] = ext.slice(1);
  }
  return out;
})();

/** Strip parameters (`; charset=…`), lower-case, and fold aliases onto the canonical spelling. */
export function normalizeMimeType(mimeType: string): string {
  const base = (mimeType.split(';')[0] ?? '').trim().toLowerCase();
  return MIME_ALIASES[base] ?? base;
}

/** True when a declared type actually says something about the format. */
export function isInformativeMimeType(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false;
  const base = normalizeMimeType(mimeType);
  if (base.length === 0 || !base.includes('/')) return false;
  return !UNINFORMATIVE_MIME_TYPES.has(base);
}

/** The MIME for a file extension, or undefined when the extension is unknown. */
export function mimeTypeForExtension(ext: string): string | undefined {
  const key = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return MIME_BY_EXT[key];
}

/**
 * The MIME type to process a file as.
 *
 * A declared type wins when it is informative — the caller may genuinely know better than the name,
 * and this preserves the precedence `resolveInputFormat` already applies. Otherwise the extension
 * decides. `application/octet-stream` is returned only when the caller said nothing usable *and* the
 * extension is unrecognised, which is the one case where it is true rather than a shrug.
 */
export function mimeTypeForPath(filePath: string, declared?: string | undefined): string {
  if (isInformativeMimeType(declared)) return normalizeMimeType(declared!);
  return mimeTypeForExtension(path.extname(filePath)) ?? 'application/octet-stream';
}

/**
 * The file extension (no dot) for a MIME type.
 *
 * Used to name the temp files handed to ffmpeg and the multipart filename sent to Whisper, both of
 * which pick a demuxer/decoder from the name. `split('/')[1]` is not a substitute: it yields
 * `x-wav`, `mpeg3`, and `octet-stream` — none of which are extensions.
 */
export function extForMimeType(mimeType: string, fallback: string): string {
  return EXT_BY_MIME[normalizeMimeType(mimeType)] ?? fallback;
}

/**
 * Identify an image from its leading bytes.
 *
 * The last line of defence for the vision path, and the only one that cannot be lied to: the caller's
 * header can be generic and the filename can be wrong, but the bytes are the file. It exists because
 * a job row persists its MIME — an instance that queued work before this fix has rows already stamped
 * `application/octet-stream`, and those rows are retried after an upgrade. Sniffing means those
 * retries succeed instead of reproducing the original failure forever.
 *
 * Returns undefined for anything not recognised, so callers keep their own fallback.
 */
export function sniffImageMimeType(bytes: Buffer): string | undefined {
  if (bytes.length < 12) return undefined;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const ascii4 = bytes.toString('latin1', 0, 4);
  if (ascii4 === 'GIF8') return 'image/gif';
  if (ascii4 === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  // TIFF, little-endian (II) and big-endian (MM).
  if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) return 'image/tiff';
  if (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a) return 'image/tiff';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  // ISO base-media container: the brand at offset 8 distinguishes HEIC from AVIF.
  if (bytes.toString('latin1', 4, 8) === 'ftyp') {
    const brand = bytes.toString('latin1', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand.startsWith('hei') || brand === 'mif1' || brand === 'msf1') return 'image/heic';
  }
  return undefined;
}

/** Extensions whose MIME should carry `; charset=utf-8` when served over HTTP. */
const TEXTUAL_MIME_PREFIXES = ['text/'];
const TEXTUAL_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'image/svg+xml',
]);

/**
 * The `Content-Type` to serve a stored file with, charset included for textual formats.
 *
 * Separate from {@link mimeTypeForPath} because the two have different jobs: this one is a response
 * header for a browser, that one is a format decision for a provider. Sharing the table keeps them
 * from drifting; keeping the functions apart keeps `; charset=utf-8` out of a data URI.
 */
export function contentTypeForDownload(filePath: string): string {
  const mime = mimeTypeForExtension(path.extname(filePath));
  if (!mime) return 'application/octet-stream';
  const textual = TEXTUAL_MIME_PREFIXES.some(p => mime.startsWith(p)) || TEXTUAL_MIME_TYPES.has(mime);
  return textual ? `${mime}; charset=utf-8` : mime;
}
