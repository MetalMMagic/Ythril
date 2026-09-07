/**
 * One entry point for a recall filter, in EITHER grammar.
 *
 * The fleet integrator, 2026-08-13T1035Z §2: `recall`'s filter is one operator object per key, ANDed — no `$or`, no `$regex`, no
 * nesting — while `query`'s takes the full allowlisted Mongo grammar to depth 8. Their case is the mailbox query in this
 * very board's usage notes: *a message is ours if `from`, `to` or `alsoFor` names us, and separately our own asks are live
 * while `status` is open.* One `query` filter expresses it; in recall's filter it is not expressible at any length. So they
 * ran `query` first and fed ids into something else.
 *
 * ## Why both grammars, rather than replacing the old one
 *
 * `{"properties.status": {"eq": "accepted"}}` is **not valid raw Mongo** — `eq` has no `$`. Swapping parsers would break
 * every existing caller, including our own client. So the shape decides: a `$`-prefixed key anywhere means raw Mongo.
 *
 * A MIXED filter is refused rather than resolved. `{"$or": [...], "type": {"eq": "message"}}` is a caller who believes one
 * thing and would get another; a 400 naming both costs them one round trip and saves a wrong answer.
 *
 * ## The key allowlist STAYS, and applies inside `$or`
 *
 * Widening the grammar is not widening the keys. A recall filter still reaches only `properties.*`, `tags`, `type`,
 * `name`, `status` and `label` — recursively, so `$or` cannot smuggle a key past it. Otherwise this becomes a way to
 * filter a vector search on fields the index cannot serve, which is a performance cliff wearing a feature's clothes.
 */
import { sanitizeFilter } from './query.js';
import { validateFilterExpression, filterKeyAllowed, type FilterExpression } from './filter.js';

/*
 * The allowlist and its matching rule come from `filter.ts`, which is where the same six prefixes and the
 * same three-clause predicate already lived. This file held a byte-identical copy of both while importing
 * that module for something else -- one rule, two implementations, on the exact pair (`recall` and `query`)
 * that `CLAUDE.md`'s parity section was written from.
 */
const keyAllowed = filterKeyAllowed;

/** Does this look like raw Mongo? A `$` on any key, at any depth — that is the only signal the two grammars differ by. */
function looksLikeRawMongo(node: unknown, depth = 0): boolean {
  if (depth > 12 || node === null || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(v => looksLikeRawMongo(v, depth + 1));
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k.startsWith('$')) return true;
    if (looksLikeRawMongo(v, depth + 1)) return true;
  }
  return false;
}

/** Every FIELD key in a raw-Mongo filter, ignoring `$`-operators and array indices. */
function fieldKeys(node: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 12 || node === null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const v of node) fieldKeys(v, out, depth + 1);
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k.startsWith('$')) fieldKeys(v, out, depth + 1);
    else {
      out.push(k);
      // A field's VALUE may hold operators (`{$in: [...]}`) but never further field names, so it is not walked for keys.
    }
  }
  return out;
}

/**
 * The result says WHICH grammar it was, and that is not bookkeeping.
 *
 * An operator-object filter can be pushed into `$vectorSearch` as a native pre-filter; a raw filter with `$or` cannot, and
 * has to take the exhaustive path. Collapsing both to "a Mongo filter" would silently move every existing caller off the
 * fast path — a performance regression delivered as a refactor.
 */
export type ResolvedRecallFilter =
  | { ok: true; kind: 'none' }
  /** The original grammar, untouched, so the native pre-filter path stays available. */
  | { ok: true; kind: 'expression'; expression: FilterExpression }
  /** Raw Mongo, validated. Correct on the exhaustive path only. */
  | { ok: true; kind: 'mongo'; filter: RawMongoFilter }
  | { ok: false; error: string };

/**
 * Turn a caller's filter — either grammar — into a Mongo filter, or into the message explaining why not.
 *
 * `kind: 'none'` means no filter, which every caller already treats as unfiltered.
 */
export function resolveRecallFilter(raw: unknown): ResolvedRecallFilter {
  if (raw === undefined || raw === null) return { ok: true, kind: 'none' };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'filter must be an object' };
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) return { ok: true, kind: 'none' };

  const rawMongo = looksLikeRawMongo(raw);
  if (!rawMongo) {
    // The original grammar, unchanged: same validator, same translation, same errors.
    const err = validateFilterExpression(raw as FilterExpression);
    if (err) return { ok: false, error: err };
    return { ok: true, kind: 'expression', expression: raw as FilterExpression };
  }

  // Mixed: some key uses the operator-object form while another uses raw Mongo. Refuse, naming both sides.
  const legacyKeys = entries
    .filter(([k, v]) => !k.startsWith('$') && v !== null && typeof v === 'object' && !Array.isArray(v)
      && Object.keys(v as Record<string, unknown>).some(op => !op.startsWith('$')))
    .map(([k]) => k);
  if (legacyKeys.length > 0) {
    return {
      ok: false,
      error: `filter mixes both grammars: ${legacyKeys.join(', ')} use the operator-object form (eq, ne, in, …) while `
        + 'the rest is raw MongoDB. Pick one — raw MongoDB accepts everything the operator form does, spelled `$eq`, '
        + '`$ne`, `$in`.',
    };
  }

  const bad = [...new Set(fieldKeys(raw))].filter(k => !keyAllowed(k));
  if (bad.length > 0) {
    return {
      ok: false,
      error: `Filter key(s) ${bad.join(', ')} are not allowed. Keys must start with: properties., tags, type, name, `
        + 'status, or label.',
    };
  }

  try {
    return { ok: true, kind: 'mongo', filter: { __raw: sanitizeFilter(raw) as Record<string, unknown> } };
  } catch (err: unknown) {
    // `sanitizeFilter` throws on a disallowed operator, excessive depth, or an unsafe regex. Its message is the one
    // `query` gives for the same filter, which is the point of sharing it.
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * A validated raw-MongoDB filter, wrapped so it can travel in the SAME parameter as the operator-object form.
 *
 * Threading a second `mongoFilter` argument through `recall` → `recallByType` → `applyLexicalFusion` cost three signature
 * lines and pushed `recall.ts` past the god-file ratchet. That gate was right to object, and the smaller design is better
 * anyway: there is ONE filter channel carrying two grammars, which is exactly what the feature is, rather than two channels
 * a reader has to know are mutually exclusive.
 */
export interface RawMongoFilter { __raw: Record<string, unknown> }

/** Is this the raw grammar? The wrapper exists so this question has one answer instead of a convention. */
export function isRawFilter(f: unknown): f is RawMongoFilter {
  return f !== null && typeof f === 'object' && '__raw' in (f as Record<string, unknown>);
}

/** Either grammar, in one channel — the type `recall` and its helpers take for their `filter` parameter. */
export type RecallFilter = FilterExpression | RawMongoFilter;
