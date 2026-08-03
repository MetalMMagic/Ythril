/**
 * One definition of "as tightly as Ythril's own state files".
 *
 * `config.json` and its siblings have always been written `0600`. Everything else Ythril puts on disk took the
 * process umask — typically `0755` directories and `0644` files — so on a shared host, or a bind mount visible to
 * another container, the sensitive material was the readable material:
 *
 *   - `<data-root>/backups/` held a complete decrypted NDJSON copy of the database (fixed first, in the same
 *     Privacy audit lens that found this);
 *   - `<data-root>/files/` holds every uploaded document, verbatim — the most sensitive bytes on the volume.
 *
 * Modes are applied at creation AND re-applied after a write. The second part is what makes this self-healing:
 * `mode:` only takes effect when a file is created, so an instance upgrading with existing files would otherwise
 * keep them `0644` forever, and a recursive chmod of a large files tree at boot is exactly the kind of expensive
 * migration that gets skipped. Re-uploading or editing a file tightens it, one syscall at a time.
 *
 * Every chmod here is best-effort. Windows and plenty of network shares (SMB, some NFS exports) do not honour
 * POSIX modes; a hardening must never turn a working upload or backup into a failed one.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';

/** Owner read/write. What `config.json` has always been. */
export const FILE_MODE = 0o600;

/** Owner read/write/execute. A directory needs `x` to be traversable at all. */
export const DIR_MODE = 0o700;

/** `chmod` a path to `mode`, swallowing failure on hosts that do not implement POSIX modes. */
export function hardenSync(target: string, mode: number): void {
  try { fs.chmodSync(target, mode); } catch { /* non-POSIX host, or a path we do not own */ }
}

/** Async twin of {@link hardenSync}. */
export async function harden(target: string, mode: number): Promise<void> {
  try { await fsp.chmod(target, mode); } catch { /* non-POSIX host, or a path we do not own */ }
}

/**
 * Tighten a path whose KIND is not known at the call site, and return the mode chosen.
 *
 * A directory needs its execute bit or it cannot be opened at all — `0600` on a directory is not a tightening,
 * it is a brick. This is not theoretical: applying `FILE_MODE` unconditionally after a rename (`moveFile` moves
 * files *or* directories) produced
 *
 *   filesystem error: directory iterator cannot open directory: Permission denied
 *
 * from `fs.cpSync` during the next offsite backup — and because that error comes out of C++ `std::filesystem`
 * rather than JavaScript, it called `terminate()` and **killed the whole server** (container exit 139). One
 * unreadable directory anywhere under the files root was enough.
 *
 * Returns the mode applied so a test can assert the CHOICE rather than its effect: `chmod` is a no-op on Windows,
 * so an assertion about permissions afterwards would pass on the development machine no matter what.
 */
export async function hardenPath(target: string): Promise<number> {
  let mode = FILE_MODE;
  try {
    if ((await fsp.stat(target)).isDirectory()) mode = DIR_MODE;
  } catch {
    return 0;   // gone already — nothing to tighten, and nothing to report
  }
  await harden(target, mode);
  return mode;
}

/** Create `dir` (and parents) owner-only, tightening it if it already existed. */
export function mkdirPrivateSync(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  hardenSync(dir, DIR_MODE);
}

/** Async twin of {@link mkdirPrivateSync}. */
export async function mkdirPrivate(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true, mode: DIR_MODE });
  await harden(dir, DIR_MODE);
}
