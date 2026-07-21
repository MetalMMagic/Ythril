/**
 * The one definition of what a reference between brain records looks like.
 *
 * Every link field — a memory's `entityIds`, an edge's `from`/`to`, a chrono entry's
 * `entityIds`/`memoryIds`, a file's `entityIds`/`chronoIds`/`memoryIds` — names another record by its
 * `_id`, which is a UUID v4 (`brain/entities.ts` assigns `uuidv4()` on insert). Anything else is not a
 * reference, it is a string that happens to be stored in a reference field.
 *
 * This module exists because the regex previously had three separate copies (MCP tools, brain/bulk,
 * the REST helpers) and the validation was applied inconsistently across the call sites that used
 * them: some checked, some checked only under a flag, and some never checked at all. A dropped link in
 * a graph store is invisible — the record saves, the write returns success, and the gap only surfaces
 * later as a traversal that quietly returns nothing. One definition and one assert make "did we
 * validate this?" answerable by grep rather than by reading every handler.
 */
import { col, asFilter } from '../db/mongo.js';

/** Canonical UUID v4 matcher. The only copy — import it, never re-declare it. */
export const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Same pattern as a string, for embedding in a published JSON schema. */
export const UUID_V4_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value);
}

/** What kind of record a reference field points at — used only to word the error. */
export type RefKind = 'entity' | 'memory' | 'chrono';

const REF_NOUN: Record<RefKind, string> = {
  entity: 'entity ID',
  memory: 'memory ID',
  chrono: 'chrono ID',
};

/**
 * Check one reference field. Returns `null` when every value is a UUID v4, otherwise a message that
 * names the field AND the offending values.
 *
 * The message matters as much as the check: the caller is usually an LLM agent, and "invalid
 * reference" tells it nothing it can act on, while "`entityIds` expects entity IDs (UUID v4), got
 * 'Traefik'" tells it exactly what to fix and how. Listing the bad values (not just the count) is what
 * makes the error self-correcting.
 */
export function invalidRefsMessage(field: string, kind: RefKind, values: readonly string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  const bad = values.filter(v => !isUuidV4(v));
  if (bad.length === 0) return null;
  const shown = bad.slice(0, 5).map(v => JSON.stringify(v)).join(', ');
  const more = bad.length > 5 ? ` (+${bad.length - 5} more)` : '';
  return `\`${field}\` expects ${REF_NOUN[kind]}s (UUID v4), got ${shown}${more}. ` +
    `Look the record up by name first and pass its id — a name is not a reference.`;
}

/** Throwing form, for the MCP handlers whose errors surface to the agent as `isError` text. */
export function assertRefs(field: string, kind: RefKind, values: readonly string[] | undefined): void {
  const msg = invalidRefsMessage(field, kind, values);
  if (msg) throw new Error(msg);
}

const COLLECTION_FOR: Record<RefKind, string> = {
  entity: 'entities',
  memory: 'memories',
  chrono: 'chrono',
};

/**
 * Format check PLUS an existence check: every id must be a UUID v4 *and* name a record that is
 * actually there.
 *
 * Format alone is not enough to satisfy "an unresolvable reference must be an error". A well-formed
 * UUID that points at nothing stores exactly as silently as a name did — the write succeeds, the link
 * dangles, and the only symptom is a traversal that later comes back empty. Checking existence is one
 * batched `$in` per field, which is a fair price on a single-record write for the guarantee that a
 * stored reference resolves.
 *
 * Deliberately NOT used by the bulk path: a bulk payload may legitimately reference a record created
 * earlier in the same payload, so checking against the database would reject valid forward references.
 * Bulk keeps the format check, and the `strictLinkage: false` escape hatch covers staged imports.
 */
export async function assertRefsResolve(
  spaceId: string,
  field: string,
  kind: RefKind,
  values: readonly string[] | undefined,
): Promise<void> {
  assertRefs(field, kind, values);
  if (!values || values.length === 0) return;
  const unique = [...new Set(values)];
  const docs = await col<{ _id: string }>(`${spaceId}_${COLLECTION_FOR[kind]}`)
    .find(asFilter<{ _id: string }>({ _id: { $in: unique } }), { projection: { _id: 1 } })
    .toArray();
  const found = new Set(docs.map(d => d._id));
  const missing = unique.filter(id => !found.has(id));
  if (missing.length === 0) return;
  const shown = missing.slice(0, 5).map(v => JSON.stringify(v)).join(', ');
  const more = missing.length > 5 ? ` (+${missing.length - 5} more)` : '';
  throw new Error(
    `\`${field}\` references ${missing.length} ${REF_NOUN[kind]}${missing.length === 1 ? '' : 's'} that ` +
    `do${missing.length === 1 ? 'es' : ''} not exist in space '${spaceId}': ${shown}${more}. ` +
    `Create the record first, then link it — the write was refused rather than stored with a dead link.`,
  );
}
