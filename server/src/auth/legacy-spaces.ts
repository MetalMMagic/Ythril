/**
 * The pre-3.0 `spaces` allowlist, read from wherever it still legitimately lives.
 *
 * ## Why a helper rather than a property access
 *
 * `spaces` is gone from `TokenRecord` (D-8d). It survives on `OidcTokenRecord` — built per request from a
 * claim mapping, carrying no matrix — and inside stored config, which `migrateToken` reads to derive a matrix
 * for a token minted before the matrix existed.
 *
 * Every remaining reader is a FALLBACK: it consults `rights` first and reaches for this only when there is
 * none. Those readers take `TokenRecord | OidcTokenRecord`, so after the deletion each one needs the same
 * narrowing — and writing that narrowing out ten times is how the next person ends up with ten slightly
 * different answers to one question.
 *
 * ## The absent/empty distinction is the whole point
 *
 * An **absent** allowlist means every space. An **empty** one means none. Reading empty as absent turns the
 * narrowest token into the widest, and this codebase has shipped that bug more than once — `rights-migration`
 * documents it, `reachable-spaces` documents it, and three scope holes closed in this release were variants
 * of it.
 *
 * So this returns `undefined` and `[]` as the distinct values they are, and never collapses them to a
 * truthiness check. Callers must branch on `=== undefined`.
 */

/** The token's legacy allowlist, or `undefined` when it has none (which means every space). */
export function legacySpacesOf(record: unknown): string[] | undefined {
  const spaces = (record as { spaces?: unknown } | null | undefined)?.spaces;
  return Array.isArray(spaces) ? spaces as string[] : undefined;
}
