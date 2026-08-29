/**
 * `recall`'s `traverse` option: a depth, or a whole traversal.
 *
 * ## Why it grew from a number
 *
 * Recall's graph expansion used to be one integer — a depth — and followed EVERY edge in BOTH directions,
 * because there was nowhere to say otherwise. The standalone `traverse` tool, building the same Mongo query
 * twenty lines away in the same file, applied an `edgeLabels` filter and honoured `direction`. One rule, two
 * implementations, and the one reachable from a search had the weaker.
 *
 * That is not a missing convenience. On any corpus where a few nodes hold most of the edges — every real one —
 * an unnarrowed hop off a hub returns whichever neighbours the node cap happened to keep, and the caller cannot
 * tell that from a deliberate answer. The owner's ruling, 2026-08-29: *"recall's traverse must be the same as
 * the real thing"*.
 *
 * ## The shape
 *
 * It is a `traverse` call without its start node, because in a recall the start nodes ARE the results:
 *
 *     traverse: 2
 *     traverse: { depth: 2, edgeLabels: ['owns', 'lives_in'], direction: 'outbound' }
 *
 * The number still works and means exactly what it always meant. That is not politeness to old callers — it is
 * the common case, and a parameter that forces `{ depth: 1 }` on somebody who wants one hop of everything has
 * made the simple thing harder to buy the complex one.
 *
 * `limit` is deliberately NOT accepted. In a standalone traverse the caller sets it; in a recall the node cap is
 * derived from `topK` and the byte budget, and letting a caller raise it here would let `traverse` overrule the
 * budget that governs the rest of the answer.
 */

export interface TraverseOption {
  depth: number;
  edgeLabels?: string[] | undefined;
  direction?: 'outbound' | 'inbound' | 'both' | undefined;
}

/** Every key the object form accepts. Exported so both doors refuse the same set rather than each their own. */
export const TRAVERSE_OPTION_FIELDS = ['depth', 'edgeLabels', 'direction'] as const;

const DIRECTIONS = new Set(['outbound', 'inbound', 'both']);

export type TraverseParseResult =
  | { ok: true; value: TraverseOption }
  | { ok: false; error: string };

/**
 * Parse `traverse` from a request body: absent, a number, or an object.
 *
 * REFUSES rather than coerces, in every direction. `traverse: "2"` is a mistake, not a two; `direction: 'up'`
 * is a mistake, not a default; an unknown key is a misspelling of a real one. A parameter that silently
 * downgrades to its default returns a shallower graph with a 200 — which is the shape of defect this file's
 * neighbours have been fixing for three releases, and the reason `/traverse` and `/query` already refuse
 * unknown body fields.
 *
 * @param raw      the caller's value, or `undefined`
 * @param maxDepth the ceiling this door allows, so the two doors quote the same number in the same message
 */
export function parseTraverseOption(raw: unknown, maxDepth: number): TraverseParseResult {
  if (raw === undefined || raw === null) return { ok: true, value: { depth: 0 } };

  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 0 || raw > maxDepth) {
      return { ok: false, error: `traverse must be an integer between 0 and ${maxDepth}, or an object` };
    }
    return { ok: true, value: { depth: raw } };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'traverse must be a number (the depth) or an object { depth, edgeLabels, direction }' };
  }

  const obj = raw as Record<string, unknown>;
  const unknown = Object.keys(obj).filter(k => !(TRAVERSE_OPTION_FIELDS as readonly string[]).includes(k));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `traverse has unknown field(s): ${unknown.join(', ')}. Allowed: ${TRAVERSE_OPTION_FIELDS.join(', ')}. `
        + 'Note `limit` is not accepted here — in a recall the node cap comes from topK and the byte budget.',
    };
  }

  const depth = obj['depth'];
  if (typeof depth !== 'number' || !Number.isInteger(depth) || depth < 0 || depth > maxDepth) {
    return { ok: false, error: `traverse.depth must be an integer between 0 and ${maxDepth}` };
  }

  const value: TraverseOption = { depth };

  const labels = obj['edgeLabels'];
  if (labels !== undefined) {
    if (!Array.isArray(labels) || !labels.every(l => typeof l === 'string' && l.length > 0)) {
      return { ok: false, error: 'traverse.edgeLabels must be an array of non-empty strings' };
    }
    // An EMPTY array is preserved as "no narrowing" rather than "match nothing", matching the standalone
    // traverse. Both readings are defensible; they must not differ between the two doors, and this is the one
    // the standalone path has always taken.
    if (labels.length > 0) value.edgeLabels = labels as string[];
  }

  const direction = obj['direction'];
  if (direction !== undefined) {
    if (typeof direction !== 'string' || !DIRECTIONS.has(direction)) {
      return { ok: false, error: "traverse.direction must be one of 'outbound', 'inbound', 'both'" };
    }
    value.direction = direction as 'outbound' | 'inbound' | 'both';
  }

  return { ok: true, value };
}

/**
 * What to echo back on the response, so a caller can see what the server actually did.
 *
 * The number form echoes as a number and the object form as an object: a response that always reported the
 * expanded shape would make every existing caller's assertion fail for no behavioural reason, and one that
 * always reported a number would hide the narrowing that was applied.
 */
export function echoTraverse(opt: TraverseOption): number | TraverseOption {
  return opt.edgeLabels === undefined && opt.direction === undefined ? opt.depth : opt;
}
