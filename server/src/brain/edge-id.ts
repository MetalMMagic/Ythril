/**
 * An edge's `_id`, derived from the relationship it represents.
 *
 * ## Why derive it
 *
 * The id was `uuidv4()`. The collection carries a unique index on `(from, to, label)`
 * (`spaces/lifecycle.ts`), so the relationship itself can only be stored once — what happened instead was that
 * two peers each stored it under a DIFFERENT id, sync exchanged them, and the receiving insert violated that
 * index. One relationship, two identities, and a duplicate key on every cycle.
 *
 * Derived, the two peers arrive at the same `_id` without talking, and the collision becomes an idempotent
 * no-op instead of an error. Owner ruled this on 2026-08-30.
 *
 * ## `spaceId` is deliberately NOT part of the key
 *
 * It is the obvious thing to include, and the plan document still spells it that way. It is wrong.
 * `sync/space-map.ts` lets the same logical space live under a different local id on each peer, so a key
 * including `spaceId` derives differently on the two sides — reproducing the very defect this removes, and
 * reproducing it precisely on the networks that configured aliasing, where it is hardest to see. The
 * collection is per-space already: the space is in its name, not in the key.
 *
 * ## Why the parts are length-prefixed
 *
 * `${from}|${to}|${label}` is ambiguous the moment any part can contain the separator: `('a|b', 'c', 'd')` and
 * `('a', 'b|c', 'd')` produce one key for two different relationships, which would make them collide under the
 * unique index while being genuinely distinct. Endpoint ids are UUIDs today, but a **label is
 * operator-supplied text** and nothing forbids a pipe in it. Prefixing each part with its length makes the
 * encoding injective regardless of what the parts contain.
 *
 * ## The limit: an edge whose identity CHANGES keeps its old id
 *
 * Mongo's `_id` is **immutable**, and two paths mutate an edge's identity in place — `merge.ts` relinks by
 * `$set`ting `from`/`to`, and `updateEdgeById` accepts a new `label`. After either, the stored id no longer
 * equals its derivation.
 *
 * That is a stated limit, not an oversight. Such an edge behaves exactly as every edge did before this change:
 * two peers can still disagree about its id, and the unique index still catches the duplicate. Nothing is made
 * worse; it is simply not yet made better. **Re-keying it is its own work** — delete-and-insert on a synced
 * natural-key collection has to reason about the tombstone the delete leaves behind, and about a peer that
 * pulls the tombstone before the re-insert. `renameFileMeta` does exactly that dance for the other
 * natural-key collection and is the model to follow when it happens.
 *
 * Existing edges keep their v4 ids. There is no migration, because a derived id only has to be agreed on by
 * peers creating an edge from now on.
 */
import { v5 as uuidv5 } from 'uuid';

/**
 * The namespace for edge identity. Fixed forever: changing it re-derives every future id and silently splits
 * new edges from ones already stored on a peer that has not upgraded.
 *
 * Itself a v5 UUID of `ythril.edge-identity` under the DNS namespace, so it is reproducible rather than a
 * number somebody typed — but written as a literal, because deriving it at import time would make the value
 * depend on a library detail rather than on this file.
 */
const EDGE_NAMESPACE = '8fdb66f3-a72f-574e-91a9-55e2a04e19a7';

/** Length-prefixed so no part can forge the separator. See the docblock. */
const part = (s: string): string => `${s.length}:${s}`;

/**
 * The `_id` for the relationship `(from) -[label]-> (to)`.
 *
 * Order matters: `(a)-[knows]->(b)` and `(b)-[knows]->(a)` are two rows under the unique index, so they must
 * be two ids. Sorting the endpoints to make this symmetric would silently merge them.
 */
export function edgeIdFor(from: string, to: string, label: string): string {
  return uuidv5(`${part(from)}${part(to)}${part(label)}`, EDGE_NAMESPACE);
}
