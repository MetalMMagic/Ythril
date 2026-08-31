/** A cache holding nothing — also what a graph reset returns to. */
export function emptyCache() {
    return { startId: null, direction: null, maxDepth: 0, nodes: [], edges: [], truncated: false };
}
/**
 * Whether this request needs the network, and if so whether it may be merged.
 *
 * Direction is part of the identity check, not a filter: an inbound traversal is a different set of
 * edges, not a subset of a both-direction one, so changing it invalidates the cache even at the same
 * depth.
 */
export function decideFetch(cache, req) {
    const sameRoot = cache.startId === req.startId && cache.direction === req.direction;
    if (!sameRoot)
        return 'replace';
    if (req.maxDepth <= cache.maxDepth)
        return 'from-cache';
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
export function applyResult(cache, plan, req, result) {
    let nodes;
    let edges;
    if (plan === 'incremental') {
        const knownNodes = new Set(cache.nodes.map(n => n._id));
        const knownEdges = new Set(cache.edges.map(e => e._id));
        nodes = [...cache.nodes, ...result.nodes.filter(n => !knownNodes.has(n._id))];
        edges = [...cache.edges, ...result.edges.filter(e => !knownEdges.has(e._id))];
    }
    else {
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
export function filterToDepth(cache, startId, maxDepth) {
    const nodes = cache.nodes.filter(n => n.depth <= maxDepth);
    const visible = new Set(nodes.map(n => n._id));
    visible.add(startId);
    return { nodes, edges: cache.edges.filter(e => visible.has(e.from) && visible.has(e.to)) };
}
