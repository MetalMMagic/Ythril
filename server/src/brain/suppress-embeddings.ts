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
