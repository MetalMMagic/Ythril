/**
 * A truncated graph traversal used to be indistinguishable from a complete one. Now it is never truncated
 * silently: the caller either gets the whole neighbourhood inline, or gets a link to the whole neighbourhood.
 *
 * ## The defect
 *
 * `traverseRecallSeeds` ends with `collected.slice(0, limit)` and the response said nothing about it. Sorting
 * by hops before truncating is right — near neighbours survive — but `graphNodes: 7` at `topK: 1, traverse: 1`
 * might be the whole neighbourhood or the first 7 of 40, and no field distinguished them.
 *
 * `degraded` does not cover it: that reports recall-stage degradation, a member that failed or timed out, not
 * the traversal cap.
 *
 * **Worse here than on a list.** A caller paging a list can compare against `total`. There is no total for a
 * neighbourhood, and the natural reading of a short graph is *"this record has few relationships"* — a wrong
 * conclusion about the DATA rather than about the request. The cap, `topK * (traverse + 1) * 4`, is also not
 * something a caller can predict from the parameters they set.
 *
 * ## Owner ruling, 2026-08-13 — a flag is not the answer
 *
 * *"Report the SIZE, and when a result exceeds a threshold, write the whole thing to the space's tmp files as
 * JSON and hand back a download link with a 1-day TTL instead of truncating it."*
 *
 * And that is the better answer: a flag tells a caller their graph was cut and leaves them no way to get the
 * rest, which on a neighbourhood is the same dead end the paging cap was on a list.
 *
 * ## The four decisions, and what each is grounded in
 *
 * - **The threshold is the ROW COUNT**, using the existing cap formula, so today's truncation point becomes
 *   the spill point. It is the number the caller reasoned about when they set `topK` and `traverse`; a byte
 *   size is not.
 * - **The file lives in `_tmp/` inside the space's own store**, so it inherits the space's access control
 *   rather than needing new rules, and it joins `_converted/`/`_extracted/` in `DERIVED_TREES` so it is hidden
 *   from browsing. It is not a thing a person put there.
 * - **TTL one day, through the record TTL machinery that already exists.** `upsertFileMeta`'s `ttlDays` stamps
 *   `_expireAt`, and the TTL sweep's `files` handler runs the full `deleteFileCascade` — so the blob goes with
 *   the record and no new sweeper exists to forget about.
 * - **The link is the ordinary authenticated download.** `GET /api/files/:spaceId?path=…` behind
 *   `requireSpaceAuth`. A URL that worked without the caller's token would be a way to read a space's records
 *   with no auth, which is the one thing this must not become.
 *
 * ## The ceiling, which is the part a spill could get wrong
 *
 * "Write the whole thing" cannot be unbounded — one hub with a hundred thousand edges would turn a bounded
 * read into an unbounded one. So the walk is bounded at `SPILL_CEILING_MULTIPLE ×` the inline cap, and when
 * even that is reached the spill file and the response BOTH say so (`ceilingHit`). A second silent truncation
 * hiding inside the fix for the first one is the failure this file exists to avoid.
 */
import { randomUUID } from 'node:crypto';
import { writeFile } from '../files/files.js';
import { upsertFileMeta } from '../files/file-meta.js';
import { traverseRecallSeeds } from './edges.js';
import { nestNeighbours, type RecallGraph } from './recall-graph.js';
import { SPILL_DIR } from './spill-path.js';

/** How many days a spill lives. The owner's ruling, expressed as the record TTL the sweep already honours. */
export const SPILL_TTL_DAYS = 1;

/**
 * How far past the inline cap a spill is allowed to walk.
 *
 * 20× turns a cap of 8 into 160 rows and a cap of 200 into 4000 — large enough that the spill is the complete
 * neighbourhood in every graph anyone has, small enough that one dense hub cannot make a read unbounded.
 */
export const SPILL_CEILING_MULTIPLE = 20;

/** Where the complete graph went, for a caller who received a truncated one inline. */
export interface GraphSpill {
  /** How many traversed nodes the FILE holds. */
  nodes: number;
  /** Path within the space's file store. */
  path: string;
  /** Authenticated download URL — the caller's own token is required, as for any file in the space. */
  download: string;
  /** ISO timestamp after which the file and its record are gone. */
  expiresAt: string;
  /** Present and true when even the spill walk hit its ceiling, so the file itself is not the whole graph. */
  ceilingHit?: boolean;
}

export interface GraphWithSpill {
  /** The tree to return inline — capped exactly as before. */
  graph: RecallGraph;
  /** Present only when the inline tree is short of the real neighbourhood. */
  spill: GraphSpill | null;
}

/**
 * Expand the seeds, and if the neighbourhood is bigger than the inline cap, write the whole thing out.
 *
 * ONE walk, at the ceiling: a small graph exhausts itself long before the higher limit matters, so the extra
 * budget costs nothing on the calls that do not need it, and the calls that do are precisely the ones the
 * owner ruled must come back complete.
 */
export async function buildGraphWithSpill(
  memberIds: string[],
  seeds: { _id: string; spaceId: string }[],
  maxDepth: number,
  inlineCap: number,
): Promise<GraphWithSpill> {
  const seedIds = seeds.map(s => s._id);
  if (inlineCap < 1 || maxDepth < 1 || seeds.length === 0) {
    return { graph: nestNeighbours([], seedIds), spill: null };
  }

  const ceiling = inlineCap * SPILL_CEILING_MULTIPLE;
  const flat = await traverseRecallSeeds(memberIds, seeds, maxDepth, ceiling);

  if (flat.length <= inlineCap) {
    // The whole neighbourhood fits. No file, no flag, and `graphNodes` is the complete count.
    return { graph: nestNeighbours(flat, seedIds), spill: null };
  }

  const graph = nestNeighbours(flat.slice(0, inlineCap), seedIds);
  const complete = nestNeighbours(flat, seedIds);
  // The file goes to the space a SEED came from, never to the space the call was addressed to.
  //
  // A proxy space is a lens, not a store: `resolveWriteTarget` refuses a write to one without an explicit
  // `targetSpace`, precisely because it owns no files of its own. Addressing the spill at the request's space
  // would have created a file tree and a `{proxy}_files` record for a space that is supposed to have neither —
  // and the download would then be served, or not, depending on how the merged listing resolved a path nobody
  // put there. A seed's `spaceId` is always a concrete member, so taking it removes the whole question.
  const spill = await writeSpill(seeds[0]!.spaceId, complete, flat.length, flat.length >= ceiling);
  return { graph, spill };
}

/**
 * Serialise a complete graph into the space's `_tmp/`, with a one-day record TTL.
 *
 * `memberSpaceId`, not `spaceId`: the parameter being called after the request's space is what let a proxy id
 * reach a write in the first version of this file. A proxy owns no store, so only a member may be named here.
 */
async function writeSpill(
  memberSpaceId: string,
  complete: RecallGraph,
  nodes: number,
  ceilingHit: boolean,
): Promise<GraphSpill> {
  const path = `${SPILL_DIR}/graph-${randomUUID()}.json`;
  const expiresAt = new Date(Date.now() + SPILL_TTL_DAYS * 86_400_000).toISOString();
  const body = JSON.stringify({
    kind: 'graph-traversal',
    generatedFor: memberSpaceId,
    nodes,
    expiresAt,
    // Stated in the FILE as well as the response: whoever opens this a day later has only the file, and a
    // partial graph that does not say so is the defect this whole module is about.
    ...(ceilingHit ? { ceilingHit: true, ceiling: nodes } : {}),
    // A Map does not survive JSON, and a caller wants the seed id anyway.
    graph: [...complete.bySeed.entries()].map(([seedId, graph]) => ({ seedId, graph })),
  });

  const { sha256 } = await writeFile(memberSpaceId, path, body);
  void sha256;
  await upsertFileMeta(memberSpaceId, path, Buffer.byteLength(body, 'utf8'), {
    description: `Complete graph traversal (${nodes} nodes), expires ${expiresAt}`,
    tags: ['graph-spill'],
    ttlDays: SPILL_TTL_DAYS,
  });

  return {
    nodes,
    path,
    download: `/api/files/${encodeURIComponent(memberSpaceId)}?path=${encodeURIComponent(path)}`,
    expiresAt,
    ...(ceilingHit ? { ceilingHit: true } : {}),
  };
}
