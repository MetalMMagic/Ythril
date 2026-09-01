/**
 * Resolving an edge's endpoints to the names a reader — or an embedding model — sees.
 *
 * ## Why it is its own module
 *
 * `edges.ts` is one of the largest files in the server and is frozen at its current size by
 * `no-new-god-files.test.js`, whose message is the reason rather than the rule: *"the failure mode of a
 * god-file is not its size on any given day — it is that every change lands in the same place because that is
 * where the code already is."* This is new behaviour about endpoints, so it goes beside that file rather than
 * inside it.
 *
 * ## What it is for
 *
 * An edge embeds `from label to` and nothing else, with the endpoints resolved to names: `ServiceA depends_on
 * ServiceB` IS the edge's content, which is why an edge resolves its endpoints while a memory deliberately
 * does not resolve the entities it links (measured at 1.5 points of strict evidence recall — see
 * `entity-names-are-not-in-the-embed-text.test.js`).
 *
 * Four paths reach this, and that is the whole risk: the inline upsert, the queued embed job, the reindex job,
 * and the edge list route. It used to be one function called `resolveEdgeEntityNames` that looked both ends
 * up in the entities collection — right while every endpoint was an entity, and the reason `reindex` once
 * embedded raw entity IDs while the writer embedded names. One function, four callers, and the kind travels
 * with the endpoint.
 */
import { col, asFilter } from '../db/mongo.js';
import { collectionForRefKind, edgeEndpointKind, endpointNameField } from './entity-refs.js';
import type { RefKind } from '../config/types-knowledge.js';

/**
 * How much of an endpoint's name reaches the edge's embedding.
 *
 * An entity name and a chrono title are short by nature; a memory's `fact` is a sentence or several. An edge
 * embeds `from label to` and nothing else, so an untruncated fact at one end would make the edge's vector
 * mostly that fact — the edge would then be recalled for queries about the memory rather than about the
 * relationship, which is the same dilution that cost 1.5 points when memories embedded their entity names.
 */
export const ENDPOINT_NAME_MAX = 200;

/**
 * Resolve one endpoint to the string that stands for it.
 *
 * A file needs no lookup: its `_id` IS its path, which is also the best thing to call it.
 *
 * Falls back to the raw id, as this has always done: an endpoint pointing at a record that is not there still
 * has to produce an embedding rather than throw, because the edge is already stored by the time this runs.
 */
export async function resolveEndpointName(spaceId: string, id: string, kind: RefKind): Promise<string> {
  if (kind === 'file') return id;
  const field = endpointNameField(kind);
  const doc = await col<Record<string, unknown>>(`${spaceId}_${collectionForRefKind(kind)}`)
    .findOne(asFilter<Record<string, unknown>>({ _id: id }), { projection: { [field]: 1 } });
  const value = doc?.[field];
  if (typeof value !== 'string' || !value.trim()) return id;
  return value.trim().slice(0, ENDPOINT_NAME_MAX);
}

/**
 * Resolve an edge's two endpoints, each according to the KIND it declares.
 *
 * An omitted kind means `entity`, read here through `edgeEndpointKind` rather than with a `?? 'entity'` at
 * this call site — the coalesce lives in one place so the fifth caller cannot be the one that forgets it.
 */
export async function resolveEdgeEndpointNames(
  spaceId: string,
  fromId: string,
  toId: string,
  fromKind?: RefKind,
  toKind?: RefKind,
): Promise<[string, string]> {
  return await Promise.all([
    resolveEndpointName(spaceId, fromId, edgeEndpointKind(fromKind)),
    resolveEndpointName(spaceId, toId, edgeEndpointKind(toKind)),
  ]) as [string, string];
}
