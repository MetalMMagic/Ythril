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

/** The four space-scoped areas. Instance capabilities are not here — they have no space to scope to. */
export type SpaceArea = 'knowledge' | 'files' | 'schema' | 'dataQuality';

export type AreaRungs = Record<SpaceArea, Rung>;

export interface TokenRights {
  instanceAdmin: boolean;
  createSpaces: boolean;
  /** The MINIMUM held in every space, including ones created later. `null` means no floor. */
  floor: AreaRungs | null;
  perSpace: Record<string, AreaRungs>;
}
