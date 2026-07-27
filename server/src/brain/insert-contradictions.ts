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
import { col, asFilter } from '../db/mongo.js';
import { findPropertyDisagreements, type PropertyDisagreement } from './contradiction-judge.js';
import type { SimilarMatch } from './recall.js';

/** A near-neighbour that disagrees with the record being written. */
export interface ContradictionWarning {
  id: string;
  summary: string;
  /** The single-valued properties they disagree on, with both values. */
  fields: PropertyDisagreement[];
}

const COLLECTION_SUFFIX: Record<string, string> = {
  memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono', file: 'files',
};

/**
 * Which of `hits` structurally contradict the record being written.
 *
 * Returns [] rather than throwing: a warning is a courtesy on the write path and must never be the reason
 * a write fails.
 */
export async function findInsertContradictions(
  spaceId: string,
  type: string,
  incoming: { properties?: Record<string, string | number | boolean> },
  hits: SimilarMatch[],
): Promise<ContradictionWarning[]> {
  // Nothing to disagree about: the incoming record makes no property claims.
  if (!incoming.properties || Object.keys(incoming.properties).length === 0) return [];
  if (hits.length === 0) return [];

  const suffix = COLLECTION_SUFFIX[type];
  if (!suffix) return [];

  try {
    const ids = hits.map(h => h._id);
    const docs = await col<{ _id: string; properties?: Record<string, string | number | boolean> }>(`${spaceId}_${suffix}`)
      .find(asFilter<{ _id: string }>({ _id: { $in: ids } }), { projection: { _id: 1, properties: 1 } })
      .toArray() as Array<{ _id: string; properties?: Record<string, string | number | boolean> }>;

    const byId = new Map(docs.map(d => [d._id, d.properties]));
    const out: ContradictionWarning[] = [];
    for (const hit of hits) {
      const props = byId.get(hit._id);
      if (!props) continue;
      const fields = findPropertyDisagreements(
        { id: 'incoming', text: '', properties: incoming.properties },
        { id: hit._id, text: '', properties: props },
      );
      if (fields.length > 0) out.push({ id: hit._id, summary: hit.summary, fields });
    }
    return out;
  } catch {
    return [];
  }
}
