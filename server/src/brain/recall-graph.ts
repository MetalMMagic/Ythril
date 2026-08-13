/**
 * The graph-augmented recall SHAPE: traversal nested under the seed that reached it.
 *
 * aigents 2026-08-13T1035Z §3–§4 and 1100Z. The flat list this replaces appended every neighbour beside the
 * seeds with `score: null`, and three things followed from that:
 *
 * 1. **With more than one seed, nothing said WHICH seed reached a node.** It was recoverable from the old
 *    `path`, but only by intersecting the first edge's ends against the seed ids.
 * 2. **`count` mixed matches with neighbours.** They asked for `topK: 1` and got `count: 6`, so the number a
 *    caller uses to decide whether to page described something they had not asked for.
 * 3. **The edge was reduced to `{from, label, to}`**, dropping its `description` — which, on their board, is
 *    where the REASON for a link lives — along with its `tags` and `createdAt`.
 *
 * Nesting also settles the ranking question rather than answering it. A traversed node was never selected by
 * matching the query; it is there because the graph relates it to something that did. Off the ranked list
 * there is nothing to rank it against, no `null` score competing with a real one, and no cut for it to fall
 * off. (Our own pipeline already reranks seeds BEFORE traversal — `recall()` returns reranked seeds and the
 * route expands them afterwards — so §4's "rerank after traverse" describes a defect we do not have.)
 *
 * ## Owner rulings, 2026-08-13 — settled, not to be re-derived
 *
 * **The node is `{ edge, node, paths }`, and `paths` is EVERY route to it**, each an array of record ids from
 * the seed, seed first and this node last. The FIRST path is always the one it is nested under. That makes
 * direction implicit (an ordered array of ids IS the direction), makes depth derived (`paths[0].length - 1`),
 * and answers the two-seed case without duplicating the node: one node object, one nesting, every other route
 * recorded beside it.
 *
 * **A node appearing under more than one parent must be COMPLETE wherever it appears** — no stubs, no
 * `{ref: id}` placeholders. Here that is free: the node is nested exactly once and `paths` carries the rest.
 *
 * ## What an id-only path cannot carry, and why that is still right
 *
 * The old `path` carried each hop's `label`. `paths` does not. It is not lost for the route that matters: the
 * node's own `edge` is the whole edge document for its last hop, and every INTERMEDIATE node on that route is
 * itself a nested entry with its own `edge` — so walking the tree yields every label in order. What genuinely
 * has no label is the last hop of an ALTERNATE route, where the caller has both endpoint ids and can ask.
 * Trading that for the owner's stated `[[id],[id,id,id]]` is the right way round: the primary route, which is
 * the one being served, gains a full edge object where it used to have three fields.
 */
import type { EdgeDoc, EntityDoc } from '../config/types.js';
import { traverseRecallSeeds, type SeedTraverseNeighbor } from './edges.js';

/** One traversed node, nested under whatever reached it. */
export interface GraphNode {
  /** The whole edge document for the hop that reached this node — `paths[0]`'s last hop. */
  edge: EdgeDoc;
  /** The reached record itself, embedding stripped. */
  node: EntityDoc;
  /**
   * Every route from a seed to this node, ids only, seed first.
   *
   * `paths[0]` is the route it is nested under. `paths[0].length - 1` is the hop count.
   */
  paths: string[][];
  /** True when this node has more routes than were recorded. */
  pathsTruncated?: boolean;
  /** Nodes reached FROM this one. Absent rather than empty when it is a leaf, so depth reads as a tree. */
  _graph?: GraphNode[];
}

export interface RecallGraph {
  /** Seed id → the nodes hanging off it. A seed that reached nothing is absent. */
  bySeed: Map<string, GraphNode[]>;
  /** How many traversed nodes the tree holds, in total, across every seed. */
  nodes: number;
}

/**
 * Expand recall seeds and return the traversal as a tree per seed.
 *
 * `limit` bounds the number of traversed NODES, exactly as it did for the flat list, so the cost of a
 * `traverse` is unchanged — only its shape is.
 */
export async function buildRecallGraph(
  memberIds: string[],
  seeds: { _id: string; spaceId: string }[],
  maxDepth: number,
  limit: number,
): Promise<RecallGraph> {
  const flat = await traverseRecallSeeds(memberIds, seeds, maxDepth, limit);
  return nestNeighbours(flat, seeds.map(s => s._id));
}

/**
 * The same tree with every `node` put through `shapeNode`.
 *
 * REST returns entity documents as they are; MCP returns its own record shape. Mapping the finished tree keeps
 * ONE nesting implementation instead of one per door — which is the defect this repo produces most, and the
 * reason `_graph` had to reach both surfaces in the same commit anyway.
 */
export function mapGraphNodes<T>(
  nodes: GraphNode[] | undefined,
  shapeNode: (doc: EntityDoc) => T,
): { edge: EdgeDoc; node: T; paths: string[][]; pathsTruncated?: boolean; _graph?: unknown[] }[] | undefined {
  if (!nodes) return undefined;
  return nodes.map(n => {
    const children = mapGraphNodes(n._graph, shapeNode);
    return {
      edge: n.edge,
      node: shapeNode(n.node),
      paths: n.paths,
      ...(n.pathsTruncated ? { pathsTruncated: true } : {}),
      ...(children ? { _graph: children } : {}),
    };
  });
}

/**
 * Turn the flat neighbour list into one tree per seed.
 *
 * Exported for its own tests: the nesting is pure and the BFS is not, and a shape this load-bearing should be
 * assertable without a database.
 */
export function nestNeighbours(flat: SeedTraverseNeighbor[], seedIds: string[]): RecallGraph {
  const byParent = new Map<string, GraphNode[]>();
  const nodeFor = new Map<string, GraphNode>();

  // Shallowest first, so a parent always exists before the child that hangs off it. `traverseRecallSeeds`
  // already sorts by hops, but this function is also called with hand-built lists and must not depend on that.
  const ordered = [...flat].sort((a, b) => a.hops - b.hops);

  for (const n of ordered) {
    const gn: GraphNode = {
      edge: n.edge,
      node: n.record,
      paths: [n.idPath, ...n.altPaths],
      ...(n.altPathsTruncated ? { pathsTruncated: true } : {}),
    };
    nodeFor.set(n._id, gn);
    const siblings = byParent.get(n.parentId) ?? [];
    siblings.push(gn);
    byParent.set(n.parentId, siblings);
  }

  // Attach children to their parents. A child whose parent was dropped by the node limit is attached to the
  // seed its route starts from instead of being discarded: its `paths` still state the real route, so the
  // relationship stays true, and dropping it would make the limit delete a node the caller never asked about.
  const seedSet = new Set(seedIds);
  for (const [parentId, children] of byParent) {
    if (seedSet.has(parentId)) continue;
    const parent = nodeFor.get(parentId);
    if (parent) parent._graph = children;
  }

  const bySeed = new Map<string, GraphNode[]>();
  for (const seedId of seedIds) {
    const direct = byParent.get(seedId);
    if (direct && direct.length > 0) bySeed.set(seedId, direct);
  }
  const orphaned = [...byParent.entries()]
    .filter(([parentId]) => !seedSet.has(parentId) && !nodeFor.has(parentId))
    .flatMap(([, children]) => children);
  for (const child of orphaned) {
    const seedId = child.paths[0]?.[0];
    if (!seedId) continue;
    const list = bySeed.get(seedId) ?? [];
    list.push(child);
    bySeed.set(seedId, list);
  }

  return { bySeed, nodes: nodeFor.size };
}
