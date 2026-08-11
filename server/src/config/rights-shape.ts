/**
 * The shape of a token's per-space rights, in a leaf module with no imports.
 *
 * It lives here rather than inline in `types.ts` for a concrete reason: written out there it added six lines
 * to a file that had already taken three god-file ratchet raises in one day, and the honest response to a
 * fifth is to stop putting things in it — not to raise it again.
 *
 * It cannot live in `auth/rights-migration.ts` either, because `types.ts` would then import from `auth/`,
 * which imports `types.ts`. A leaf both can import breaks that cycle without either owning the other.
 */

/** Rungs, lowest first. Each CONTAINS the one below, so "write but not read" is unrepresentable. */
export type Rung = 'none' | 'read' | 'write' | 'admin';

/**
 * The four space-scoped areas, as VALUES — so a validator can reject an unknown one.
 *
 * The type alone was not enough. `POST`/`PATCH /api/tokens` validated the rung values against
 * `none|read|write|admin` and left the area NAME unvalidated, so `{"brain": "write"}` stored happily at 200
 * and granted nothing, because the real area is `knowledge`. An operator wrote that onto a live token while
 * probing and took an agent offline for four minutes; the only thing that named the true area was a later
 * 403's own wording.
 *
 * That is the same conflation fixed for token mints in 2.6.0 — unknown keys accepted and silently dropped —
 * one level deeper. Exported as a tuple so `z.enum` can consume it and there is one list rather than the four
 * hand-written copies that existed before.
 */
export const SPACE_AREAS = ['knowledge', 'files', 'schema', 'dataQuality'] as const;

/** The four space-scoped areas. Instance capabilities are not here — they have no space to scope to. */
export type SpaceArea = typeof SPACE_AREAS[number];

/** The rungs as values, for the same reason. */
export const RUNGS = ['none', 'read', 'write', 'admin'] as const;

export type AreaRungs = Record<SpaceArea, Rung>;

export interface TokenRights {
  instanceAdmin: boolean;
  createSpaces: boolean;
  /** The MINIMUM held in every space, including ones created later. `null` means no floor. */
  floor: AreaRungs | null;
  perSpace: Record<string, AreaRungs>;
}
