import path from 'path';
import fs from 'fs/promises';
import { getDataRoot } from '../config/loader.js';

/**
 * Resolve a user-supplied path within a space's data directory (LEXICAL check).
 *
 * Security hardening:
 * 1. Unicode NFC normalization to prevent homoglyph traversal
 * 2. Null-byte rejection
 * 3. Strip leading slashes (browser filenames often start with /)
 * 4. path.resolve against the space data root
 * 5. Strict prefix check — must remain under the space root
 *
 * NOTE: this does NOT URL-decode. The HTTP layer (Express) already decodes
 * query/route params exactly once, and the file-meta `_id` is derived from the
 * same once-decoded string. A second `decodeURIComponent` here double-decoded
 * the path — corrupting any filename containing a literal `%` (e.g. `50%.png`
 * threw `URIError` → HTTP 500) and diverging the on-disk path from the DB `_id`.
 * Callers that receive a raw HTTP value must not pre-decode it either.
 *
 * This is a purely lexical check. It does not follow symlinks — use
 * {@link assertNoSymlinkEscape} (async) before an actual filesystem operation
 * to close the symlink TOCTOU.
 *
 * @returns The absolute safe path
 * @throws RangeError if the path attempts to escape the space root
 */
export function resolveSafePath(spaceId: string, userPath: string): string {
  const spaceRootDir = spaceRoot(spaceId);

  // 1. Unicode NFC normalization
  const normalized = userPath.normalize('NFC');

  // 2. Reject null bytes
  if (normalized.includes('\x00')) {
    throw new RangeError('Path contains null bytes');
  }

  // 3. Strip any leading slashes so browser-supplied filenames like
  //    '/Screenshot 2024.png' are treated as relative.  An absolute path
  //    passed directly to path.resolve() would silently discard spaceRoot,
  //    causing the prefix check below to fire as a false-positive traversal.
  const relative = normalized.replace(/^\/+/, '');

  // 4. Resolve to absolute
  const resolved = path.resolve(spaceRootDir, relative);

  // 5. Prefix check — must start with spaceRoot + separator
  if (!isWithin(spaceRootDir, resolved)) {
    throw new RangeError(`Path traversal attempt: '${userPath}'`);
  }

  return resolved;
}

/** True when `candidate` is the boundary itself or lies beneath it. */
function isWithin(boundaryDir: string, candidate: string): boolean {
  const boundary = boundaryDir.endsWith(path.sep) ? boundaryDir : boundaryDir + path.sep;
  return candidate === boundaryDir || candidate.startsWith(boundary);
}

/**
 * Symlink-aware boundary check: canonicalises `absPath` (following symlinks) and
 * asserts the real location is still inside the space root's real location.
 *
 * The lexical {@link resolveSafePath} guarantees the *string* stays under the
 * root, but a symlink anywhere along the path can still point outside it — the
 * classic TOCTOU that turns a recursive delete or a write into an escape. Since
 * the target (or intermediate directories) may not exist yet, this walks up to
 * the nearest existing ancestor, realpaths that, and re-appends the
 * not-yet-created suffix (which cannot contain a symlink precisely because it
 * does not exist).
 *
 * Call this before every real filesystem operation on a user-controlled path.
 *
 * @throws RangeError if the real path escapes the space root
 */
export async function assertNoSymlinkEscape(spaceId: string, absPath: string): Promise<void> {
  const rootDir = spaceRoot(spaceId);

  let realRoot: string;
  try {
    realRoot = await fs.realpath(rootDir);
  } catch {
    // The space directory does not exist yet — there is nothing to escape into.
    return;
  }

  let probe = absPath;
  // Bounded walk up to the nearest existing ancestor.
  for (let i = 0; i < 4096; i++) {
    try {
      const realProbe = await fs.realpath(probe);
      const suffix = path.relative(probe, absPath); // '' when probe === absPath
      const realFull = suffix ? path.resolve(realProbe, suffix) : realProbe;
      if (!isWithin(realRoot, realFull)) {
        throw new RangeError(`Path escapes the space root via a symlink: '${absPath}'`);
      }
      return;
    } catch (err) {
      if (err instanceof RangeError) throw err;
      // ENOENT (or similar) — this ancestor does not exist; step up one level.
      const parent = path.dirname(probe);
      if (parent === probe) return; // reached the filesystem root without any existing ancestor
      probe = parent;
    }
  }
}

/**
 * Convenience: lexical resolve + symlink-aware check in one call, for the
 * filesystem helpers. Returns the absolute (lexical) path to operate on.
 */
export async function resolveSafePathChecked(spaceId: string, userPath: string): Promise<string> {
  const abs = resolveSafePath(spaceId, userPath);
  await assertNoSymlinkEscape(spaceId, abs);
  return abs;
}

/** Return the absolute data root for a space's files */
export function spaceRoot(spaceId: string): string {
  const dataRoot = getDataRoot();
  return path.resolve(dataRoot, 'files', spaceId);
}
