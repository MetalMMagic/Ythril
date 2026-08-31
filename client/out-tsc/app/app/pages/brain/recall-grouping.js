const str = (v) => (typeof v === 'string' && v.trim() ? v : undefined);
/**
 * The key a file hit groups under: its parent document when it is a chunk, otherwise itself.
 *
 * Returning the file's own id for a NON-chunk hit is deliberate — it means a whole-file match and the
 * chunk matches from that same file collapse into one group instead of appearing as a document plus some
 * unrelated-looking fragments.
 */
export function fileGroupKey(r) {
    if (r.type !== 'file')
        return null;
    const f = r;
    return str(f.parentFileId) ?? str(f._id) ?? null;
}
/** The parent document description for a group, from whichever hit carries it. */
function fileOf(hits, key) {
    for (const h of hits) {
        const f = h;
        const p = str(f.parentFile?.path);
        if (p) {
            return {
                id: key, path: p,
                ...(str(f.parentFile?.description) ? { description: str(f.parentFile?.description) } : {}),
                ...(Array.isArray(f.parentFile?.tags) ? { tags: f.parentFile?.tags } : {}),
            };
        }
    }
    // A non-chunk file hit has no `parentFile` — it IS the file, so its own path is the document's path.
    for (const h of hits) {
        const p = str(h.path);
        if (p)
            return { id: key, path: p };
    }
    return { id: key, path: key };
}
/**
 * Collapse chunk hits under their parent document, preserving the incoming order.
 *
 * Order is by each group's FIRST occurrence, not by re-sorting on score: the server has already ranked the
 * results, and re-ranking here would quietly disagree with the ordering every other consumer sees.
 */
export function groupRecallResults(results) {
    const groups = [];
    const byKey = new Map();
    for (const r of results) {
        const key = fileGroupKey(r);
        if (key === null) {
            groups.push({ hits: [r], hitCount: 1, ...(r.score != null ? { score: r.score } : {}) });
            continue;
        }
        const existing = byKey.get(key);
        if (existing) {
            existing.hits.push(r);
            existing.hitCount++;
            continue;
        }
        const group = { hits: [r], hitCount: 1, ...(r.score != null ? { score: r.score } : {}) };
        byKey.set(key, group);
        groups.push(group);
    }
    // The parent is resolved after collection so a group whose FIRST hit lacked `parentFile` can still be
    // named from a later one.
    for (const [key, g] of byKey)
        g.file = fileOf(g.hits, key);
    return groups;
}
/** A short label for where in the document a chunk matched — its heading, when the chunker recorded one. */
export function chunkLabel(r) {
    return str(r.headingText);
}
/** Longest passage rendered inline before it is cut. Long enough to judge relevance, short enough that six
 *  of them under one document stay scannable. */
const PASSAGE_MAX = 400;
/**
 * The matching passage's own text, for display.
 *
 * Recall results otherwise render as pretty-printed JSON, which is defensible for a record you are
 * inspecting and useless for a passage you are reading — and grouping makes it worse, stacking six JSON
 * blobs under one document. `content` is the chunk's text; `matchedText` is the exact string that was
 * embedded, which is what actually matched, so it is the better fallback than the raw record.
 *
 * Returns undefined when there is no text, so the caller can fall back rather than render an empty block.
 */
export function passageText(r) {
    const f = r;
    const text = str(f.content) ?? str(f.matchedText);
    if (!text)
        return undefined;
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > PASSAGE_MAX ? `${clean.slice(0, PASSAGE_MAX - 1)}…` : clean;
}
/**
 * Turn a graph-augmented recall into the flat, ordered list this tab renders.
 *
 * `traverse > 0` no longer returns traversed records beside the matches. Each match carries a `_graph` array
 * of `{edge, node, paths}`, and a nested node carries its own `_graph`, so the answer is a tree per match —
 * which is the right API shape (`count` means matches again, and a structurally-reached node is not competing
 * in a ranked list) and the wrong shape for a list of rows.
 *
 * So the tree is walked DEPTH-FIRST: each match, then what it reached, then what that reached. A reader sees
 * the same rows in the same order as before, and a neighbour sits directly beneath the match it belongs to
 * instead of after every other match. Everything downstream — the file grouping reading `parentFile`, the
 * passage fallback reading `content`, the JSON fallback dumping the hit — keeps receiving records, not
 * envelopes.
 *
 * What the row carries from the graph is what a reader needs to place it: `source: 'traverse'`, the derived
 * `hops`, the reaching edge's `label`, and `graphParentId`. Nothing is computed that the response did not
 * already state.
 */
export function flattenRecallItems(results) {
    const out = [];
    for (const match of results) {
        const { _graph, ...record } = match;
        out.push(record);
        walkGraph(_graph, out);
    }
    return out;
}
/** One `_graph` level, depth-first, appending each node as a row. */
function walkGraph(nodes, out) {
    if (!Array.isArray(nodes))
        return;
    for (const raw of nodes) {
        if (raw === null || typeof raw !== 'object')
            continue;
        const entry = raw;
        const node = entry['node'];
        if (node === null || typeof node !== 'object' || Array.isArray(node))
            continue;
        const edge = (entry['edge'] ?? {});
        const paths = Array.isArray(entry['paths']) ? entry['paths'] : [];
        const primary = Array.isArray(paths[0]) ? paths[0] : [];
        out.push({
            ...node,
            // `type` is the KNOWLEDGE type here, and an entity's own `type` field is its user-defined one
            // (`service`, `decision`) — so the spread must not be allowed to win, and grouping keys off this field.
            //
            // It was the literal `'entity'` until 3.6, on a comment reading *"traversal only ever reaches
            // entities"*. A walk can now also reach a memory, chrono entry or file through `entityIds`, and each
            // arrives carrying `kind`. A memory stamped `entity` renders with an empty name, because a memory has
            // a `fact` and no `name` — a wrong row rather than a missing one.
            type: typeof node['kind'] === 'string'
                ? node['kind']
                : 'entity',
            source: 'traverse',
            // Derived from the route rather than carried: `paths[0]` is the one it is nested under.
            hops: Math.max(0, primary.length - 1),
            graphLabel: edge['label'],
            graphParentId: primary.length > 1 ? primary[primary.length - 2] : undefined,
        });
        walkGraph(entry['_graph'], out);
    }
}
