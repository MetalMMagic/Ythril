/**
 * What to do with a peer's copy of a file, and where a conflicting copy is written.
 *
 * Extracted from `syncFiles` in `sync/engine.ts` (god-file split, slice 2b). Both decisions are pure;
 * the engine keeps the downloads and the disk writes.
 *
 * ── The naming half handles peer-controlled input ────────────────────────────────────────────────
 *
 * A conflict copy's filename embeds the PEER'S LABEL, and a peer's label is whatever that instance's
 * operator typed. It reaches a filesystem path, so it is untrusted input in the only sense that
 * matters here: a label containing `../`, a drive letter, a colon, or a NUL would otherwise produce a
 * path that escapes the space directory or simply cannot be created on Windows.
 *
 * The sanitiser is an ALLOWLIST — `[A-Za-z0-9_-]`, everything else becomes `_` — rather than a list of
 * dangerous characters to strip. Same reasoning as the audit change allowlist: forgetting an entry in
 * a denylist is a hole, forgetting one in an allowlist is a slightly uglier filename.
 *
 * The timestamp is a parameter rather than read from the clock, so the result is a pure function of
 * its inputs and a test can assert the exact name.
 */
import path from 'node:path';

/** The minimum a manifest entry needs for this decision. */
export interface ManifestEntry {
  path: string;
  sha256: string;
}

/**
 * What a peer's version of a file means for us.
 *
 *   skip           we already have exactly these bytes
 *   write          we do not have this file — take it
 *   conflict-copy  we have this path with DIFFERENT bytes; keep ours, save theirs alongside
 *
 * The third case is the whole reason this is a decision rather than an overwrite. Sync elsewhere is
 * last-writer-wins by `seq`, but a file has no seq — there is no way to tell which side is newer, so
 * silently taking the peer's bytes would destroy local work with nothing to recover from.
 */
export type FilePullAction = 'skip' | 'write' | 'conflict-copy';

export function decideFilePull(local: ManifestEntry | undefined, remote: ManifestEntry): FilePullAction {
  if (!local) return 'write';
  return local.sha256 === remote.sha256 ? 'skip' : 'conflict-copy';
}

/**
 * Make a peer label safe to embed in a filename.
 *
 * Allowlist, not denylist. Capped at 20 characters so a long label cannot push the whole filename past
 * a filesystem's limit, which would turn a conflict copy into a write error.
 */
export function safePeerLabel(label: string): string {
  return label.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 20);
}

/**
 * Where a conflicting incoming file is written, relative to the space's file root.
 *
 * `<dir>/<base>_<timestamp>_<peer><ext>` — the original extension is preserved so the copy still opens
 * in whatever the file is, and the directory is preserved so it lands beside the file it conflicts
 * with rather than in some quarantine nobody looks in.
 *
 * Colons and dots are replaced in the timestamp because a colon is illegal in a Windows filename and a
 * bare ISO string would otherwise make every conflict copy unwritable there.
 */
export function conflictCopyPath(remotePath: string, peerLabel: string, when: Date): string {
  const ext = path.extname(remotePath);
  const base = path.basename(remotePath, ext);
  const dir = path.dirname(remotePath);
  const ts = when.toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const name = `${base}_${ts}_${safePeerLabel(peerLabel)}${ext}`;
  return dir === '.' ? name : `${dir}/${name}`;
}
