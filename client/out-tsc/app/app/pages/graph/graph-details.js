/**
 * The graph side panel's detail table — deriving, filtering and sorting the rows.
 *
 * Extracted from `graph.component.ts` (2065 lines) as part of the god-file split. Pure by design: no
 * Angular, no HTTP, no DOM. Everything here is pinned by `graph.component.characterization.spec.ts`,
 * which was written and mutation-validated against the ORIGINAL component before this file existed —
 * so behaviour is preserved by construction, not by inspection.
 *
 * Follows the `pages/brain/recall-grouping.ts` precedent: a plain module beside the component rather
 * than an injectable, because nothing here needs DI or holds state. The component's `computed()`
 * signals call straight into these functions.
 *
 * Two behaviours below look like oversights and are deliberately preserved — the split is not the
 * place to change them, and each is characterized so changing it later is a visible decision:
 *
 *   - Memory and chrono rows read DIFFERENT primary fields (`fact` / `title`) with a shared fallback
 *     to `description`, which is why the two mappers are not collapsed into one.
 *   - Chrono rows always carry an EMPTY properties bag, even though chrono records can hold
 *     schema-defined properties (#397). Surfacing them is a feature decision.
 */
/** A memory's display text: its fact, falling back to its description. */
export function memoryText(m) {
    return m.fact || m.description || '';
}
/** A chrono entry's display text: its title, falling back to its description. */
export function chronoText(c) {
    return c.title || c.description || '';
}
/**
 * All rows for the selected node, memories first.
 *
 * Order matters: it is the tie-break whenever two records share a sort key, so it is the difference
 * between a stable table and one that reshuffles on re-render.
 */
export function buildDetailRows(memories, chrono) {
    return [
        ...memories.map((m) => ({
            id: m._id,
            kind: 'memory',
            description: memoryText(m),
            tags: m.tags ?? [],
            properties: m.properties ?? {},
            createdAt: m.createdAt,
            raw: m,
        })),
        ...chrono.map((c) => ({
            id: c._id,
            kind: 'chrono',
            description: chronoText(c),
            tags: c.tags,
            properties: {}, // see the header note — deliberately not read from the record
            createdAt: c.createdAt,
            raw: c,
        })),
    ];
}
/**
 * Narrow by kind, then by a case-insensitive substring of the description, then order.
 *
 * The three compose rather than override — the text filter applies within the chosen kind, and the
 * sort applies to whatever survived. Sorts a copy: the caller's array is derived state and mutating it
 * in place would mean a signal's value changing without a write, which OnPush would never see.
 */
export function filterAndSortDetails(rows, view) {
    let out = rows;
    if (view.type !== 'all')
        out = out.filter(r => r.kind === view.type);
    const needle = view.text.toLowerCase();
    if (needle)
        out = out.filter(r => r.description.toLowerCase().includes(needle));
    return [...out].sort((a, b) => {
        const va = view.field === 'description' ? a.description.toLowerCase() : a.createdAt;
        const vb = view.field === 'description' ? b.description.toLowerCase() : b.createdAt;
        return view.asc ? (va < vb ? -1 : va > vb ? 1 : 0)
            : (va > vb ? -1 : va < vb ? 1 : 0);
    });
}
/**
 * What clicking a column header does.
 *
 * The asymmetry is the whole behaviour: re-clicking the ACTIVE column reverses it, but clicking a NEW
 * column always starts ascending rather than inheriting the previous column's direction. Inheriting
 * would mean the same click producing different orders depending on history.
 */
export function nextSort(current, field) {
    return current.field === field ? { field, asc: !current.asc } : { field, asc: true };
}
