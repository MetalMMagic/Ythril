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

/**
 * One area's rung entailing a rung in ANOTHER area, in the same space.
 *
 * Owner ruling 2026-08-15: *"whenever someone has write in knowledge he should automatically have read on
 * schemas."* Writing a record against a schema requires reading that schema, so `knowledge: write` with
 * `schema: none` is not a narrower grant — it is a grant that cannot be exercised. Leaving the pair to an
 * operator means the commonest useful token is one checkbox away from being broken, and broken in a way that
 * surfaces as a 403 on a route nobody deliberately called.
 *
 * ## Why the TABLE lives here and the resolution does not
 *
 * This module is the leaf both `types.ts` and `auth/` can import, so a table here has exactly one copy. The
 * APPLICATION lives in `auth/mint-cap.ts` next to `effectiveRung`, which is the single place the whole server
 * asks "what does this token hold here" — REST middleware, the MCP tool guard, `reachable-spaces.ts` and the
 * mint cap all route through it. An implication applied anywhere else would be a second security rule.
 *
 * The client gets it from `GET /api/tokens/rights-catalog` rather than typing its own copy, for the same
 * reason the route table is published there: a copy of a security rule drifts, and the copy people read is
 * the one that is wrong.
 *
 * ## Implications do NOT chain, deliberately
 *
 * Each rule is evaluated against what the token was GRANTED, never against what an earlier rule inferred. A
 * chain would make the order of this array load-bearing and let two innocuous rules compose into a grant
 * nobody wrote down. If a transitive implication is ever wanted, it goes in as its own row, visibly.
 */
export const RUNG_IMPLICATIONS = [
  { when: 'knowledge', atLeast: 'write', grants: 'schema', rung: 'read' },
] as const satisfies readonly { when: SpaceArea; atLeast: Rung; grants: SpaceArea; rung: Rung }[];

export type RungImplication = typeof RUNG_IMPLICATIONS[number];

export interface TokenRights {
  instanceAdmin: boolean;
  createSpaces: boolean;
  /** The MINIMUM held in every space, including ones created later. `null` means no floor. */
  floor: AreaRungs | null;
  perSpace: Record<string, AreaRungs>;
}

const isRung = (v: unknown): v is Rung => (RUNGS as readonly unknown[]).includes(v);
const isArea = (k: string): k is SpaceArea => (SPACE_AREAS as readonly string[]).includes(k);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v != null && typeof v === 'object' && !Array.isArray(v);

/**
 * Bring a STORED rights object back to the shape the API validates against, without ever granting more.
 *
 * ## Why this exists
 *
 * Owner-reported 2026-08-15: saving a rights matrix was refused with ~40 zod errors, the same two repeated for
 * the floor and for every space — `unrecognized_keys ["admin"]` and an invalid `dataQuality`. Each stored rungs
 * object was `{ knowledge, files, schema, admin }`: three areas plus a key that is not an area, and the fourth
 * area missing. The editor round-trips what it read, so the malformed shape was on DISK and every save of that
 * token was rejected — the matrix could be looked at and never corrected.
 *
 * Nothing in this codebase ever wrote that shape (checked back through `v2.6.0`, which had no rights model at
 * all, and `v2.7.0`, whose migration already wrote `dataQuality`). So the repair cannot be aimed at one known
 * producer: it has to be aimed at the shape itself, which is what makes it a normalizer rather than a patch.
 *
 * ## The rule is the migration's rule — never a superset
 *
 * A missing area becomes `none`, an unreadable rung becomes `none`, and a key that is not an area is DROPPED.
 * All three are what the enforcement code already does with them — `floor?.[area] ?? 'none'` — so this changes
 * no decision anywhere; it only makes the record say what the server was already doing with it. Re-deriving
 * from the legacy fields instead would have been the widening: a legacy `admin` token whose matrix an operator
 * had deliberately narrowed would get `admin` on everything back, silently, at boot.
 *
 * `changed` is reported rather than inferred by comparison, so a caller can persist exactly when there was
 * something to persist and a boot that repairs nothing writes nothing.
 *
 * Returns `null` when the value is not an object at all — there is nothing to preserve, and the caller should
 * derive a fresh matrix from the legacy fields.
 */
export function repairRights(value: unknown): { rights: TokenRights; changed: boolean } | null {
  if (!isPlainObject(value)) return null;
  let changed = false;

  const rungsOf = (v: unknown): AreaRungs | null => {
    if (!isPlainObject(v)) return null;
    const out = {} as AreaRungs;
    for (const a of SPACE_AREAS) {
      out[a] = isRung(v[a]) ? v[a] : 'none';
      if (v[a] !== out[a]) changed = true;              // absent, misspelled, or not a rung
    }
    for (const k of Object.keys(v)) if (!isArea(k)) changed = true;   // dropped: `admin` is not an area
    return out;
  };

  const floor = value['floor'] == null ? null : rungsOf(value['floor']);
  if (value['floor'] !== null && floor === null) changed = true;      // absent, or not an object

  const perSpace: Record<string, AreaRungs> = {};
  if (isPlainObject(value['perSpace'])) {
    for (const [id, row] of Object.entries(value['perSpace'])) {
      const fixed = rungsOf(row);
      if (fixed) perSpace[id] = fixed;
      else changed = true;                                            // a row that is not an object grants nothing
    }
  } else {
    changed = true;                                                   // absent, or not an object: no rows at all
  }

  const instanceAdmin = value['instanceAdmin'] === true;
  const createSpaces = value['createSpaces'] === true;
  if (typeof value['instanceAdmin'] !== 'boolean' || typeof value['createSpaces'] !== 'boolean') changed = true;

  for (const k of Object.keys(value)) {
    if (k !== 'instanceAdmin' && k !== 'createSpaces' && k !== 'floor' && k !== 'perSpace') changed = true;
  }

  return { rights: { instanceAdmin, createSpaces, floor, perSpace }, changed };
}
