/**
 * Build the rights matrix that the removed `spaces` / `admin` / `readOnly` mint options used to produce.
 *
 * `POST /api/tokens` stopped accepting those three in 4.0 (`D-5`) — the per-space matrix has been the
 * permission model since 2.6 and expresses everything they could. Every fixture that minted with the old
 * shorthand needs a matrix now, and there were 44 of them.
 *
 * ## It DELEGATES rather than reimplementing, and that is the whole point
 *
 * `migrateToken` is the function that derives a matrix from those exact three fields — it is what every
 * pre-matrix token on every instance was upgraded through, and `grantsMoreThan` holds it to never granting
 * more than the legacy token had. So calling it here means a migrated fixture asks for **precisely** what
 * the old input would have produced, and that equivalence is guaranteed by construction rather than by 44
 * hand-written matrices being individually right.
 *
 * Writing the matrices out by hand was the alternative and it is worse in a way that matters: a fixture
 * that means "read-only" and is transcribed as a slightly-too-wide matrix still passes its own test, and
 * the assertion it was written to make quietly stops being made.
 *
 * ## `admin: false` is not here, because it never did anything
 *
 * `migrateToken({ admin: false })` and `migrateToken({})` return the same matrix — a write floor over every
 * space — so a fixture saying `admin: false` was asking for the default. Those call sites drop the option
 * rather than gaining a matrix, because adding one would imply a restriction that was never there.
 */
import { migrateToken } from '../../server/dist/auth/rights-migration.js';

/**
 * @param {{ spaces?: string[], admin?: boolean, readOnly?: boolean, schemaLibrary?: boolean }} legacy
 * @returns the matrix `POST /api/tokens` would have derived from those options before 4.0
 */
export function legacyRights(legacy) {
  return migrateToken(legacy);
}
