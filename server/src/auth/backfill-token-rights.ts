/**
 * Derive a rights matrix for every token that lacks one, once, and write it down.
 *
 * ## Why it is here and not in `config/loader.ts`
 *
 * It was there, and persisting the result pushed that file past its god-file freeze (764 → 772). The ratchet's
 * instruction is to put new behaviour beside a large file rather than inside it, and this is not
 * configuration-loading behaviour: it is a token migration that happens to run at boot. The loader keeps one call.
 *
 * ## Why it writes to disk
 *
 * Owner ruling, 2026-08-13: *"translate old tokens into matrix rights and overwrite on update. only matrix from
 * now on."*
 *
 * In-memory derivation meant the matrix was never the record of record — recomputed on every boot from fields
 * that were still authoritative, so nobody could tell a token that had been migrated from one nobody had looked
 * at. Written down, "this token has no matrix" means something is wrong rather than something is old.
 *
 * A boot migration is the right shape here at all only because tokens are LOCAL state: `config.json` does not
 * sync. Synced data must be migrated lazily and self-healingly instead.
 */
import type { Config } from '../config/types.js';
import { migrateToken } from './rights-migration.js';
import { repairRights } from '../config/rights-shape.js';
import { log } from '../util/log.js';

/**
 * Give every token a `rights` object derived from its legacy fields, if it lacks one.
 *
 * Returns how many were filled, so a caller can log it and a test can assert the count rather than trusting
 * that the loop ran.
 *
 * **The result is now PERSISTED** — owner ruling 2026-08-13: *"translate old tokens into matrix rights and
 * overwrite on update. only matrix from now on."* It used to be in-memory only, which meant the matrix was
 * re-derived on every boot and never became the record of record. Writing it makes the migration a one-time
 * event with an auditable result, and makes "this token has no matrix" mean something is wrong rather than
 * something is old.
 */
export function backfillTokenRights(config: Config): number {
  let filled = 0;
  for (const t of config.tokens ?? []) {
    if (t.rights) continue;
    t.rights = migrateToken(t) as unknown as typeof t.rights;
    filled++;
  }
  return filled;
}


/**
 * Bring every MALFORMED rights object back to the validated shape, and say how many needed it.
 *
 * ## Why this is a second pass and not a stronger `if` in the backfill above
 *
 * `backfillTokenRights` skips on `if (t.rights) continue;` — the PRESENCE of a matrix, with no look at its
 * SHAPE. That is correct for what it does, and it is exactly why a token carrying a malformed matrix was never
 * repaired at any boot, for ever: the migration ran, saw an object, and moved on. The owner's report reads as
 * *"the migration didn't work"* for that reason.
 *
 * Keeping the two apart also keeps the promise the backfill's tests pin: it must NEVER overwrite a matrix
 * somebody set. Widening that function's condition to "present and well-formed" would have made one function
 * responsible for both "derive from legacy" and "do not lose an operator's edit", and the repair below is the
 * half that must not reach for the legacy fields at all.
 *
 * A token whose `rights` is not an object has nothing to preserve, so that one — and only that one — is
 * re-derived from the legacy fields.
 */
export function repairTokenRights(config: Config): number {
  let repaired = 0;
  for (const t of config.tokens ?? []) {
    if (!t.rights) continue;                       // the backfill's job; a second opinion here would fight it
    const fixed = repairRights(t.rights);
    if (!fixed) {
      t.rights = migrateToken(t) as unknown as typeof t.rights;
      repaired++;
      continue;
    }
    if (!fixed.changed) continue;
    t.rights = fixed.rights;
    repaired++;
  }
  return repaired;
}

/**
 * The boot step: derive, repair, then persist if anything changed.
 *
 * `saveConfig` is injected rather than imported so this module does not depend on the loader that calls it — the
 * cycle would be real, and a token migration has no business reaching back into configuration loading.
 *
 * A failed write is logged and retried next boot, exactly like the media-embedding migration beside it. Throwing
 * would take the instance down over housekeeping; pretending it succeeded would lose the migration silently.
 */
export function migrateTokenRightsOnBoot(config: Config, save?: (c: Config) => void): number {
  const filled = backfillTokenRights(config);
  const repaired = repairTokenRights(config);
  if (filled === 0 && repaired === 0) return 0;
  const persist = save ?? defaultSave;
  try {
    persist(config);
    if (filled) log.info(`Derived a rights matrix for ${filled} token(s) from their legacy fields (written to disk)`);
    // Said separately and at warn, because a repair means something wrote a shape the API refuses — the count
    // is the only place that is visible, and folding it into the line above would read as ordinary migration.
    if (repaired) log.warn(`Repaired a malformed rights matrix on ${repaired} token(s) — unknown areas dropped, missing areas set to 'none'`);
  } catch (err) {
    log.warn(`Could not persist derived token rights (will retry next boot): ${err}`);
  }
  return filled + repaired;
}

/** Late-bound so the import graph stays one-way: loader -> here, never back. */
function defaultSave(config: Config): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { saveConfig } = require('../config/loader.js') as { saveConfig: (c: Config) => void };
  saveConfig(config);
}
