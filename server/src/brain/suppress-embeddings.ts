import { TYPE_FIELD } from './ttl.js';
import type { KnowledgeType } from '../config/types.js';

/**
 * Should this record be embedded at all?
 *
 * ## Why the tiers, and why THIS order
 *
 * Asked by an operator for records that are **state rather than prose**: a queue row whose name and
 * description never change, whose weight is PATCHed every tick, and which nobody will ever search for by
 * meaning. Each of those writes re-embedded text byte-identical to the last, ~4,800 times a day, producing a
 * vector that already existed.
 *
 * `record > schema > space`, matching `retention` exactly (owner decision). Two tiered settings that resolve
 * differently is the kind of thing nobody discovers until it is wrong, and there is no reason for this one to
 * be novel.
 *
 * ## Suppresses the WRITE, not the read
 *
 * The operator was explicit: excluding from search while still computing the vector saves nothing, because
 * the cost is the embedding call. So this is consulted where a vector is WRITTEN.
 *
 * ## The edge trap
 *
 * A schema is looked up by the record's type field, and **edges key on `label` while everything else keys on
 * `type`**. `EdgeDoc` carries both, so reading `type` for an edge finds a schema that is never there and
 * looks like it worked — the suppression would silently never apply to the one record kind the owner
 * specifically widened this to cover. `TYPE_FIELD` already encodes that and is reused rather than re-derived.
 */
export interface SuppressInputs {
  /** The per-record flag, if the record carries one. `undefined` means "not stated". */
  record?: boolean | undefined;
  /** The type schema for this record's type, if any. */
  schema?: { suppressEmbeddings?: boolean } | undefined;
  /** The space-wide setting from the Danger Zone. */
  space?: boolean | undefined;
}

/** `record > schema > space`, with "not stated" falling through rather than counting as `false`. */
export function embeddingSuppressed(i: SuppressInputs): boolean {
  if (i.record !== undefined) return i.record;
  if (i.schema?.suppressEmbeddings !== undefined) return i.schema.suppressEmbeddings;
  return i.space === true;
}

/**
 * ## One name for the record tier, and the old one is still read
 *
 * The per-record tier was called `excludeFromVectorSearch` until 3.1.0 while the two tiers below it were
 * already called `suppressEmbeddings`. Owner-raised 2026-08-15: the old name reads as *removed from search*,
 * which would include traversal, and it does not — the flag is implemented as the ABSENCE of a vector, so
 * `query`, `list`, `get`, the `traverse` tool and recall's own `traverse` expansion all still reach the
 * record. `suppressEmbeddings` names what actually happens, at every tier.
 *
 * ## Why both spellings are still WRITTEN, not just read
 *
 * These are per-space record collections, which replicate by whole-document `replaceOne`, last-writer-wins
 * by seq — not a field merge. So a peer on an older build that rewrites a normalised record would drop a
 * field it does not know about, and the record it re-embeds is one its owner asked to keep unembedded: not a
 * cosmetic gap but a suppressed record becoming rankable again, plus the model call that was the point of
 * suppressing it.
 *
 * Writing both keeps a mixed-version network exactly correct in both directions — an old peer reads the
 * legacy key it already knows, a new peer prefers the new key and falls back. `_DEPRECATIONS.md` carries the
 * row that drops the legacy write in 4.0; until then the pair is deliberate rather than the two-names defect
 * this rename exists to end, because only ONE of them is a name anybody types.
 */
export const RECORD_SUPPRESS_FIELD = 'suppressEmbeddings';

/** The pre-3.1.0 spelling of {@link RECORD_SUPPRESS_FIELD}. Read everywhere, still written, never offered. */
export const LEGACY_RECORD_SUPPRESS_FIELD = 'excludeFromVectorSearch';

/**
 * The record tier's value for a stored document, under either spelling.
 *
 * Returns `true` or `undefined` and never `false`, which is not a rounding of the stored value but the tier
 * rule: **`false` means "not stated"** and must fall THROUGH to the schema and space tiers rather than
 * overriding them. Returning `false` here would make the space-wide switch do nothing for any record that
 * had ever been explicitly un-suppressed.
 *
 * The new spelling wins outright when present, so a `false` written by this build is not overridden by a
 * `true` the legacy key still carries from before.
 */
export function recordSuppression(doc: Record<string, unknown> | undefined): true | undefined {
  const v = doc?.[RECORD_SUPPRESS_FIELD] ?? doc?.[LEGACY_RECORD_SUPPRESS_FIELD];
  return v === true ? true : undefined;
}

/** Mongo fragment matching the records the record tier does NOT suppress — both spellings, or a sweep misses half. */
export function recordNotSuppressedFilter(): Record<string, unknown> {
  return {
    [RECORD_SUPPRESS_FIELD]: { $ne: true },
    [LEGACY_RECORD_SUPPRESS_FIELD]: { $ne: true },
  };
}

/**
 * Mirror whatever this write did to the record tier onto the legacy spelling, in either direction.
 *
 * Called by all four update functions once, AFTER `deleteFields` has been applied, which is what makes a
 * removal mirror as well as a set: unsetting only the new key would leave a stale legacy `true` behind, and
 * the next reader falls back to it and keeps the record suppressed after somebody asked for it not to be.
 */
export function mirrorLegacySuppression(
  $set: Record<string, unknown>,
  $unset: Record<string, unknown>,
): void {
  if (RECORD_SUPPRESS_FIELD in $set) $set[LEGACY_RECORD_SUPPRESS_FIELD] = $set[RECORD_SUPPRESS_FIELD];
  if (RECORD_SUPPRESS_FIELD in $unset) $unset[LEGACY_RECORD_SUPPRESS_FIELD] = '';
}

/** The one refusal text for a bad record-tier value, so both doors say the same thing. */
export const RECORD_SUPPRESS_TYPE_ERROR = `\`${RECORD_SUPPRESS_FIELD}\` must be a boolean`;

/**
 * Read the record tier out of a request body or a set of MCP tool args, under either spelling.
 *
 * One parser for both doors, because this is exactly the shape that goes wrong here: the same rule written
 * twice, one copy validating and the other checking only `typeof === 'boolean'` and silently dropping
 * anything else. `undefined` means the caller said nothing; the refusal text is shared so a `400` and a tool
 * error read identically.
 *
 * The legacy spelling is accepted as an INPUT alias and nothing more — it is named on neither door's schema.
 * Refusing it outright was the alternative and is worse while the key is still stored and still synced: the
 * API would deny a name the database depends on. It leaves in 4.0 together with the stored key, one removal
 * rather than two.
 */
export function parseRecordSuppression(
  body: unknown,
): { ok: true; value: boolean | undefined } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: true, value: undefined };
  const b = body as Record<string, unknown>;
  const raw = b[RECORD_SUPPRESS_FIELD] !== undefined
    ? b[RECORD_SUPPRESS_FIELD]
    : b[LEGACY_RECORD_SUPPRESS_FIELD];
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== 'boolean') return { ok: false, error: RECORD_SUPPRESS_TYPE_ERROR };
  return { ok: true, value: raw };
}

/**
 * The type name to look a schema up by, for a given record.
 *
 * Exported because the caller has the document and this file has the rule. Returning `undefined` rather than
 * guessing keeps an untyped record out of the schema tier instead of matching some other type's schema.
 */
export function schemaKeyFor(
  kind: KnowledgeType,
  doc: Record<string, unknown> | undefined,
): string | undefined {
  const field = TYPE_FIELD[kind];
  const v = doc?.[field];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
