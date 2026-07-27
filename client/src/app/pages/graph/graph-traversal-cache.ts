/**
 * The graph's traversal cache — deciding what reaches the network, and what the canvas shows.
 *
 * Extracted from `graph.component.ts` as part of the god-file split. Pure by design: no Angular, no
 * HTTP. Pinned by `graph.component.characterization.spec.ts`, written against the ORIGINAL component
 * before this file existed.
 *
 * ── Why this is worth its own module ─────────────────────────────────────────────────────────────
 *
 * This cache is the reason dragging the depth slider DOWN is instant: a shallower view is always a
 * subset of what was already fetched, so it needs no request at all. Every failure mode here is
 * silent — a broken cache still draws a completely correct graph, just at several times the request
 * volume, and nothing in the UI reports it. That makes it exactly the kind of logic that should be a
 * pure decision function with tests, rather than three conditions buried in a subscribe callback.
 *
 * The decision has three outcomes and they are not interchangeable:
 *
 *   from-cache   same root and direction, and no deeper than what is cached → filter locally.
 *   incremental  same root and direction, deeper, and the cache is COMPLETE → fetch and merge.
 *   replace      anything else → fetch and overwrite.
 *
 * `truncated` is what separates the last two. A truncated result is not a prefix of the deeper one —
 * the server dropped nodes to fit a limit, and which nodes it dropped may change. Merging into it
 * would keep entries the server has since discarded, so a truncated cache must always be replaced.
 */
import type { TraverseNode, TraverseEdge, TraverseResult } from '../../core/api.types';

export type Direction = 'outbound' | 'inbound' | 'both';

/** What a traversal is being asked for. */
export interface TraverseRequest {
  startId: string;
  maxDepth: number;
  direction: Direction;
}

/** Everything fetched so far for one root, at the deepest depth requested. */
export interface TraversalCache {
  startId: string | null;
  direction: Direction | null;
  maxDepth: number;
  nodes: TraverseNode[];
  edges: TraverseEdge[];
  truncated: boolean;
}

/** How the request should be satisfied. */
export type FetchPlan = 'from-cache' | 'incremental' | 'replace';

/** A cache holding nothing — also what a graph reset returns to. */
export function emptyCache(): TraversalCache {
  return { startId: null, direction: null, maxDepth: 0, nodes: [], edges: [], truncated: false };
}

/**
 * Whether this request needs the network, and if so whether it may be merged.
 *
 * Direction is part of the identity check, not a filter: an inbound traversal is a different set of
 * edges, not a subset of a both-direction one, so changing it invalidates the cache even at the same
 * depth.
 */
export function decideFetch(cache: TraversalCache, req: TraverseRequest): FetchPlan {
  const sameRoot = cache.startId === req.startId && cache.direction === req.direction;
  if (!sameRoot) return 'replace';
  if (req.maxDepth <= cache.maxDepth) return 'from-cache';
  return cache.truncated ? 'replace' : 'incremental';
}

/**
 * Fold a fetched result into the cache according to the plan.
 *
 * Merging dedupes by `_id` because a deeper traversal re-returns everything shallower — without this
 * the cache would grow a duplicate of every existing node on each depth increase, and cytoscape would
 * reject the repeated ids.
 *
 * Returns a new cache rather than mutating: the caller holds this in a field read during rendering,
 * and in-place growth would make "what is cached" depend on when it was observed.
 */
export function applyResult(
  cache: TraversalCache,
  plan: FetchPlan,
  req: TraverseRequest,
  result: TraverseResult,
): TraversalCache {
  let nodes: TraverseNode[];
  let edges: TraverseEdge[];

  if (plan === 'incremental') {
    const knownNodes = new Set(cache.nodes.map(n => n._id));
    const knownEdges = new Set(cache.edges.map(e => e._id));
    nodes = [...cache.nodes, ...result.nodes.filter(n => !knownNodes.has(n._id))];
    edges = [...cache.edges, ...result.edges.filter(e => !knownEdges.has(e._id))];
  } else {
    nodes = result.nodes;
    edges = result.edges;
  }

  return {
    startId: req.startId,
    direction: req.direction,
    maxDepth: req.maxDepth,
    nodes,
    edges,
    truncated: result.truncated,
  };
}

/**
 * The slice of the cache the canvas should show at this depth.
 *
 * An edge survives only when BOTH endpoints do. This is load-bearing, not cosmetic: handing cytoscape
 * an edge pointing at a node that was never added throws inside the renderer. The root is forced into
 * the visible set because it is never part of a traversal result — it is the thing being traversed
 * FROM — so without it every edge leaving the root would be dropped as dangling.
 */
export function filterToDepth(
  cache: TraversalCache,
  startId: string,
  maxDepth: number,
): { nodes: TraverseNode[]; edges: TraverseEdge[] } {
  const nodes = cache.nodes.filter(n => n.depth <= maxDepth);
  const visible = new Set<string>(nodes.map(n => n._id));
  visible.add(startId);
  return { nodes, edges: cache.edges.filter(e => visible.has(e.from) && visible.has(e.to)) };
}
