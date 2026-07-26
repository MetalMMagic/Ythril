import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { resolveSafePathChecked, spaceRoot } from './sandbox.js';
import { getConfig, getDataRoot } from '../config/loader.js';

export interface FileEntry {
  name: string;
  type: 'file' | 'dir';
  size?: number;
  modifiedAt?: string;
  // ── File-level metadata, joined from the `{space}_files` FileMeta record (files only) ──
  /** Embedding lifecycle of the file, for the status pill in the merged Files list. */
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'partial' | 'failed' | 'skipped' | 'disabled';
  /** Tags on the file's metadata record. */
  tags?: string[];
}

/** Ensure the space files directory exists */
export async function ensureSpaceFilesDir(spaceId: string): Promise<void> {
  await fs.mkdir(spaceRoot(spaceId), { recursive: true });
}

/** Read a text file — rejects if it's a directory or doesn't exist */
export async function readFile(spaceId: string, filePath: string): Promise<string> {
  const abs = await resolveSafePathChecked(spaceId, filePath);
  const content = await fs.readFile(abs, 'utf8');
  return content;
}

/** Read a file as a Buffer (for binary files) */
export async function readFileBytes(spaceId: string, filePath: string): Promise<Buffer> {
  const abs = await resolveSafePathChecked(spaceId, filePath);
  return fs.readFile(abs);
}

/** Write a text file, creating parent directories as needed */
export async function writeFile(spaceId: string, filePath: string, content: string): Promise<{ sha256: string }> {
  const abs = await resolveSafePathChecked(spaceId, filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
  const sha256 = createHash('sha256').update(content, 'utf8').digest('hex');
  return { sha256 };
}

/** Write a Buffer to a file */
export async function writeFileBytes(
  spaceId: string,
  filePath: string,
  data: Buffer,
): Promise<{ sha256: string }> {
  const abs = await resolveSafePathChecked(spaceId, filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  const sha256 = createHash('sha256').update(data).digest('hex');
  return { sha256 };
}

/** List entries in a directory (non-recursive) */
export async function listDir(spaceId: string, dirPath: string): Promise<FileEntry[]> {
  const abs = await resolveSafePathChecked(spaceId, dirPath);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const result: FileEntry[] = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      result.push({ name: e.name, type: 'dir' });
    } else if (e.isFile()) {
      let size: number | undefined;
      let modifiedAt: string | undefined;
      try {
        const stat = await fs.stat(path.join(abs, e.name));
        size = stat.size;
        modifiedAt = stat.mtime.toISOString();
      } catch { /* stat failed — omit metadata */ }
      result.push({ name: e.name, type: 'file', size, modifiedAt });
    }
  }
  return result;
}

/** Delete a file (not a directory) */
export async function deleteFile(spaceId: string, filePath: string): Promise<void> {
  const abs = await resolveSafePathChecked(spaceId, filePath);
  await fs.unlink(abs);
}

/** True if a regular file exists at the given space-relative path. */
export async function fileExists(spaceId: string, filePath: string): Promise<boolean> {
  try {
    const abs = await resolveSafePathChecked(spaceId, filePath);
    const st = await fs.stat(abs);
    return st.isFile();
  } catch {
    return false;
  }
}

/** Create a directory (including parents) */
export async function createDir(spaceId: string, dirPath: string): Promise<void> {
  const abs = await resolveSafePathChecked(spaceId, dirPath);
  await fs.mkdir(abs, { recursive: true });
}

/** Move/rename a file or directory */
export async function moveFile(
  spaceId: string,
  srcPath: string,
  dstPath: string,
): Promise<void> {
  const srcAbs = await resolveSafePathChecked(spaceId, srcPath);
  const dstAbs = await resolveSafePathChecked(spaceId, dstPath);
  await fs.mkdir(path.dirname(dstAbs), { recursive: true });
  await fs.rename(srcAbs, dstAbs);
}

/** Recursively sum file sizes under a directory. Returns 0 if dir doesn't exist. */
export async function getDirSizeBytes(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSizeBytes(full);
    } else if (entry.isFile()) {
      try {
        const st = await fs.stat(full);
        total += st.size;
      } catch { /* skip inaccessible files */ }
    }
  }
  return total;
}

/**
 * Recursively list every file under a space-relative directory, returning
 * space-relative forward-slash paths (e.g. `notes/2024/jan.md`). Returns [] if the
 * directory does not exist. Used to enumerate a subtree before deleting it so a sync
 * tombstone can be written for each removed file.
 */
export async function listFilesRecursive(spaceId: string, dirPath: string): Promise<string[]> {
  const root = spaceRoot(spaceId);
  let absDir: string;
  try {
    absDir = await resolveSafePathChecked(spaceId, dirPath);
  } catch {
    return [];
  }
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // missing or unreadable — nothing to list
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }
  await walk(absDir);
  return out;
}

export interface QuotaCheckResult {
  /** true = proceed with write; false = reject with 507 */
  allowed: boolean;
  /** true = within hard limit but past soft limit — caller should include storageWarning */
  softWarning: boolean;
}

/**
 * Check files storage quotas before a write operation.
 *
 * Checks:
 *  1. Global files hard limit (storage.files.hardLimitGiB): total bytes in data/files/
 *  2. Global files soft limit (storage.files.softLimitGiB): warn but allow
 *
 * @param incomingBytes estimated size of the incoming write (0 for a safe check with no addend)
 */
export async function checkFilesQuota(incomingBytes: number): Promise<QuotaCheckResult> {
  const cfg = getConfig();
  const fileLimits = cfg.storage?.files;
  if (!fileLimits) return { allowed: true, softWarning: false };

  const filesRoot = path.join(getDataRoot(), 'files');
  const currentBytes = await getDirSizeBytes(filesRoot);
  const projectedBytes = currentBytes + incomingBytes;

  const GiB = 1024 ** 3;

  if (fileLimits.hardLimitGiB !== undefined && projectedBytes > fileLimits.hardLimitGiB * GiB) {
    return { allowed: false, softWarning: false };
  }

  const softWarning = fileLimits.softLimitGiB !== undefined
    && currentBytes >= fileLimits.softLimitGiB * GiB;

  return { allowed: true, softWarning };
}
