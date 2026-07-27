/**
 * Insert-time contradiction warning.
 *
 * A write already runs a near-duplicate check (opt-in per call): it embeds the incoming record, searches
 * for similar ones BEFORE inserting — so it cannot self-match — and returns them as `similar`, which lets a
 * caller update an existing record instead of adding a redundant one.
 *
 * **The candidate pairs are therefore already in hand**, which is what makes this cheap. Judging whether a
 * near-neighbour actually DISAGREES with the incoming record needs no extra vector search: only the
 * neighbours' properties, a single `$in` over at most a handful of ids.
 *
 * Only the **structured** judge runs here, and that is deliberate. It is pure, deterministic and free —
 * both records set the same single-valued property to different values, full stop. The NLI judge is a model
 * call per pair; putting it on the write path would make every insert slower and, with an external
 * endpoint, would egress record text on every write. The nightly scanner already runs the NLI pass, so
 * nothing is lost by leaving it out of the fast path: this is a courtesy warning, not the safety net.
 *
 * The warning never blocks the write. An agent correcting an outdated fact *should* be able to contradict
 * the record it is superseding — the point is to tell it, not to stop it.
 */
import { findPropertyDisagreements, type PropertyDisagreement } from './contradiction-judge.js';
import { structuredClaims, fetchStructuredClaims, type ClaimMap } from './structured-claims.js';
import type { SimilarMatch } from './recall.js';

/** A near-neighbour that disagrees with the record being written. */
export interface ContradictionWarning {
  id: string;
  summary: string;
  /** The single-valued fields they disagree on, with both values. */
  fields: PropertyDisagreement[];
}

/**
 * Which of `hits` structurally contradict the record being written.
 *
 * `incoming` is the record as the caller is about to store it. Pass the whole thing, not just its
 * properties: what counts as a claim is type-specific (a chrono entry claims its `status` in a top-level
 * column), and `structured-claims.ts` owns that knowledge for both this path and the nightly sweep.
 *
 * Returns [] rather than throwing: a warning is a courtesy on the write path and must never be the reason
 * a write fails.
 */
export async function findInsertContradictions(
  spaceId: string,
  type: string,
  incoming: { properties?: ClaimMap } & Record<string, unknown>,
  hits: SimilarMatch[],
): Promise<ContradictionWarning[]> {
  if (hits.length === 0) return [];

  // Nothing to disagree about: the incoming record makes no claims at all.
  const claims = structuredClaims(type, incoming);
  if (!claims || Object.keys(claims).length === 0) return [];

  const byId = await fetchStructuredClaims(spaceId, type, hits.map(h => h._id));
  const out: ContradictionWarning[] = [];
  for (const hit of hits) {
    const theirs = byId.get(hit._id);
    if (!theirs) continue;
    const fields = findPropertyDisagreements(
      { id: 'incoming', text: '', properties: claims },
      { id: hit._id, text: '', properties: theirs },
    );
    if (fields.length > 0) out.push({ id: hit._id, summary: hit.summary, fields });
  }
  return out;
}
