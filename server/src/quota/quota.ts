/**
 * Storage quota enforcement.
 *
 * Quota is configured in config.json under `storage`:
 *
 *   storage.total   — hard cap on files + brain combined
 *   storage.files   — hard cap on file storage alone
 *   storage.brain   — hard cap on MongoDB brain data alone
 *
 * Each area has a `softLimitGiB` (warning) and `hardLimitGiB` (reject).
 * If no `storage` key is present in config, quota enforcement is disabled.
 *
 * Usage measurement:
 *   files  — recursive stat-sum of /data/files/
 *   brain  — MongoDB dbStats (dataSize + indexSize)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfig, getDataRoot } from '../config/loader.js';
import { getDb } from '../db/mongo.js';

const GiB = 1024 ** 3;

// ── Types ──────────────────────────────────────────────────────────────────

export interface UsageGiB {
  files: number;  // GiB used by /data/files/
  brain: number;  // GiB used by MongoDB (dataSize + indexSize)
  total: number;  // files + brain
}

/** Thrown by checkQuota() when a hard limit is exceeded. */
export class QuotaError extends Error {
  readonly area: 'files' | 'brain' | 'total';
  readonly usedGiB: number;
  readonly limitGiB: number;

  constructor(area: 'files' | 'brain' | 'total', usedGiB: number, limitGiB: number) {
    super(
      `Storage ${area} hard limit exceeded: ` +
      `${usedGiB.toFixed(2)} GiB used of ${limitGiB} GiB allowed`,
    );
    this.name = 'QuotaError';
    this.area = area;
    this.usedGiB = usedGiB;
    this.limitGiB = limitGiB;
  }
}

export interface QuotaCheckResult {
  usage: UsageGiB;
  /** True if a soft limit is breached (warning only — write proceeds). */
  softBreached: boolean;
  /** Human-readable soft-limit warning message, if softBreached. */
  warning?: string;
}

// ── Usage measurement ──────────────────────────────────────────────────────

/** Recursively sum file sizes under a directory. Returns 0 if directory absent. */
export async function dirSizeBytes(dirPath: string): Promise<number> {
  let total = 0;

  async function walk(p: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(p, { withFileTypes: true });
    } catch {
      return; // directory doesn't exist or unreadable
    }
    for (const e of entries) {
      const full = path.join(p, e.name);
      if (e.isSymbolicLink()) {
        continue; // Skip symlinks to prevent quota inflation via external targets
      } else if (e.isDirectory()) {
        await walk(full);
      } else {
        try { total += (await fs.stat(full)).size; } catch { /* skip */ }
      }
    }
  }

  await walk(dirPath);
  return total;
}

// ── Usage cache ──────────────────────────────────────────────────────────────
// measureUsage() recursively stat-sums the whole files tree AND runs a dbStats
// command — seconds of I/O on a large store. checkQuota() runs on EVERY upload
// chunk, so an uncached measure made a chunked upload O(total_files × chunks). This
// short-TTL cache collapses that: exact callers (first chunk, single writes, brain
// checks, metrics) re-measure and refresh it, so later chunks in the same burst read
// a fresh value instead of re-walking. See measureUsage(maxAgeMs).
let usageCache: { usage: UsageGiB; at: number } | null = null;
// Date.now() is fine here (not inside a workflow script); monotonic enough for a TTL.
const nowMs = (): number => Date.now();

/** Drop the cached usage so the next measureUsage() re-reads from disk/DB. Call
 *  after an operation that frees space (delete, wipe) so freed capacity is honoured
 *  immediately instead of after the TTL. Writes need no explicit call — the next
 *  exact check re-measures anyway. */
export function invalidateUsageCache(): void {
  usageCache = null;
}

/**
 * Measure current storage usage.
 *
 * @param maxAgeMs  Reuse a cached measurement if it is younger than this many ms.
 *   Default 0 → always measure fresh (and refresh the cache). Pass a small window
 *   (e.g. 10_000) on hot, repeated checks like per-chunk quota enforcement where an
 *   exact re-walk per chunk is the bottleneck and a slightly stale value is safe.
 */
export async function measureUsage(maxAgeMs = 0): Promise<UsageGiB> {
  if (maxAgeMs > 0 && usageCache && nowMs() - usageCache.at < maxAgeMs) {
    return usageCache.usage;
  }
  const usage = await measureUsageUncached();
  usageCache = { usage, at: nowMs() };
  return usage;
}

/** Measure current storage usage synchronously (uncached). */
async function measureUsageUncached(): Promise<UsageGiB> {
  const dataRoot = getDataRoot();
  const filesDir = path.join(dataRoot, 'files');
  // In-progress chunked uploads stage under .chunks — count them toward the
  // files quota so partial uploads cannot fill the disk invisibly.
  const chunksDir = path.join(dataRoot, '.chunks');

  const [fileBytes, brainBytes] = await Promise.all([
    Promise.all([dirSizeBytes(filesDir), dirSizeBytes(chunksDir)])
      .then(([a, b]) => a + b),
    (async () => {
      try {
        const db = getDb();
        const stats = await db.command({ dbStats: 1 }) as {
          dataSize?: number;
          indexSize?: number;
        };
        return (stats.dataSize ?? 0) + (stats.indexSize ?? 0);
      } catch {
        return 0;
      }
    })(),
  ]);

  const filesGiB = fileBytes / GiB;
  const brainGiB = brainBytes / GiB;
  return { files: filesGiB, brain: brainGiB, total: filesGiB + brainGiB };
}

// ── Quota check ────────────────────────────────────────────────────────────

/**
 * Check quota limits for a write operation.
 *
 * @param area  'files' for file writes; 'brain' for memory/entity/edge writes
 * @param incomingBytes  projected size of the write being checked — added to
 *        current usage before hard-limit comparison so an upload that would
 *        push usage past the limit is rejected up front, not after landing
 * @throws QuotaError if any hard limit is exceeded — caller should return HTTP 507
 * @returns QuotaCheckResult — caller should surface `warning` to the user if softBreached
 * @param opts.maxAgeMs  reuse a usage measurement younger than this (default 0 = exact).
 *   Only pass a window on a hot repeated check (later upload chunks) where the first
 *   chunk already validated the full declared total exactly.
 */
export async function checkQuota(
  area: 'files' | 'brain',
  incomingBytes = 0,
  opts: { maxAgeMs?: number } = {},
): Promise<QuotaCheckResult> {
  const cfg = getConfig();
  const storage = cfg.storage;

  // No storage config → quota disabled, always allow.
  if (!storage) {
    return { usage: { files: 0, brain: 0, total: 0 }, softBreached: false };
  }

  const usage = await measureUsage(opts.maxAgeMs ?? 0);
  const incomingGiB = incomingBytes / GiB;
  const warnings: string[] = [];
  let softBreached = false;

  // ── Hard limits (throw on exceed) ─────────────────────────────────────

  if (storage.total?.hardLimitGiB != null && usage.total + incomingGiB >= storage.total.hardLimitGiB) {
    throw new QuotaError('total', usage.total + incomingGiB, storage.total.hardLimitGiB);
  }

  if (area === 'files' && storage.files?.hardLimitGiB != null && usage.files + incomingGiB >= storage.files.hardLimitGiB) {
    throw new QuotaError('files', usage.files + incomingGiB, storage.files.hardLimitGiB);
  }

  if (area === 'brain' && storage.brain?.hardLimitGiB != null && usage.brain + incomingGiB >= storage.brain.hardLimitGiB) {
    throw new QuotaError('brain', usage.brain + incomingGiB, storage.brain.hardLimitGiB);
  }

  // ── Soft limits (warn, do not reject) ─────────────────────────────────

  if (storage.total?.softLimitGiB != null && usage.total >= storage.total.softLimitGiB) {
    softBreached = true;
    warnings.push(
      `Storage soft limit reached: ${usage.total.toFixed(2)} GiB / ${storage.total.softLimitGiB} GiB total`,
    );
  }

  if (area === 'files' && storage.files?.softLimitGiB != null && usage.files >= storage.files.softLimitGiB) {
    softBreached = true;
    warnings.push(
      `File storage soft limit reached: ${usage.files.toFixed(2)} GiB / ${storage.files.softLimitGiB} GiB`,
    );
  }

  if (area === 'brain' && storage.brain?.softLimitGiB != null && usage.brain >= storage.brain.softLimitGiB) {
    softBreached = true;
    warnings.push(
      `Brain storage soft limit reached: ${usage.brain.toFixed(2)} GiB / ${storage.brain.softLimitGiB} GiB`,
    );
  }

  return {
    usage,
    softBreached,
    warning: warnings.length > 0 ? warnings.join('; ') : undefined,
  };
}
