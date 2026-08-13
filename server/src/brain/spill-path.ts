/**
 * Where a spilled read result lives, and how to recognise one.
 *
 * Its own module because two sides need it and they cannot import each other: `graph-spill.ts` writes into
 * `_tmp/` through `upsertFileMeta`, and `upsertFileMeta` enqueues an embedding through `embed-queue.ts`, which
 * has to recognise the path in order to decline. A constant in either one closes that loop.
 */

/** The store root holding spilled read results. Hidden from browsing by `DERIVED_TREES` in `api/files.ts`. */
export const SPILL_DIR = '_tmp';

/**
 * Is this path a spilled read result?
 *
 * Only at the ROOT, matching how `hideDerivedTrees` treats `_converted/` and `_extracted/`: a user directory
 * called `_tmp` deeper in the tree is theirs, and their files in it are content like any other.
 */
export function isSpillPath(filePath: string): boolean {
  const normalised = filePath.replace(/^\/+/, '');
  return normalised === SPILL_DIR || normalised.startsWith(`${SPILL_DIR}/`);
}
