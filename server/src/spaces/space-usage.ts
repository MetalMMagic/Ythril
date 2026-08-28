/**
 * Per-space file usage, measured once and read by both doors.
 *
 * ## Why this is a module and not four lines in a route
 *
 * `GET /api/spaces` computed it inline. MCP's `list_spaces` did not compute it at all, while `help()` told
 * callers *"Call list_spaces for storage/quota details"* — so a caller who read the authoritative reference and
 * believed it got counts and nothing else. That is the pair of defects this repo produces most: one rule with
 * two implementations, and a schema description that had drifted from the tool it describes.
 *
 * ## The figure can be a FLOOR, and it has to say so
 *
 * The inline version read `dirSizeBytes` and its comment said *"falls back to 0 on error"*. A space whose files
 * directory the process cannot list then showed **0 GiB used** — which is also what an empty space shows — so
 * the Brain overview's usage bar read 0% against a quota that was in fact being approached, and nothing
 * anywhere said the number was incomplete.
 *
 * `measureDirSize` distinguishes the two: an ABSENT directory is a complete answer of zero (a space that has
 * never held a file uses no files), and anything else that fails is incompleteness with a reason. This carries
 * that through, per space, so both doors report a total or a floor and never one disguised as the other.
 */
import path from 'node:path';
import { getDataRoot } from '../config/loader.js';
import { measureDirSize } from '../quota/quota.js';

const GiB = 1024 ** 3;

export interface SpaceUsage {
  /** GiB used by this space's files. A FLOOR when `incomplete` is non-empty. */
  usageGiB: number;
  /**
   * Why this figure is a floor, empty when it is a total.
   *
   * A list rather than a boolean because the reason is what an operator acts on — a path and an error code
   * distinguish "the disk is failing" from "the container runs as the wrong user".
   */
  incomplete: string[];
}

/**
 * Measure each space's file usage, in parallel, one entry per requested id.
 *
 * A measurement that THROWS outright — as opposed to reading part of its subject — is reported as a floor of
 * zero with the error as its reason. Zero is the only honest number when nothing was read, and the reason is
 * what stops it being confused with an empty space.
 */
export async function measureSpaceUsage(spaceIds: readonly string[]): Promise<Map<string, SpaceUsage>> {
  const dataRoot = getDataRoot();
  const results = await Promise.allSettled(
    spaceIds.map(id => measureDirSize(path.join(dataRoot, 'files', id))),
  );
  const out = new Map<string, SpaceUsage>();
  spaceIds.forEach((id, idx) => {
    const r = results[idx];
    if (r?.status === 'fulfilled') {
      out.set(id, {
        usageGiB: r.value.bytes / GiB,
        // Summarised with the COUNT kept: an unreadable tree can produce thousands of entries, and neither an
        // API response nor a log line is a place to put them. The count is what an operator acts on and the
        // first path is what they act on it with.
        incomplete: r.value.unreadable.length > 0
          ? [`${r.value.unreadable.length} path(s) unreadable, first: ${r.value.unreadable[0]}`]
          : [],
      });
    } else {
      out.set(id, {
        usageGiB: 0,
        incomplete: [`measurement failed: ${r?.reason instanceof Error ? r.reason.message : String(r?.reason)}`],
      });
    }
  });
  return out;
}
