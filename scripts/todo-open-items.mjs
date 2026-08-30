/**
 * What counts as an open item in a `todo/` tracker — one answer, for every rule that needs one.
 *
 * ## Why this is its own module
 *
 * `todo-consistency.mjs` asked the question twice, six lines apart, and the two answers disagreed. Rule 2 ("the
 * ordered list indexes every item") learned about heading-style items on 2026-08-30; rule 3 ("every open item
 * says how to verify it is still open") kept its checkbox-only parser, so it went on reporting green while
 * covering **one item out of eleven**. The ten it could not see are where six of the eight stale rows found that
 * same day were sitting.
 *
 * That is this repo's signature defect — one rule, two implementations, the weaker winning silently — inside the
 * script whose job is to catch bookkeeping drift. The rule the codebase already carries applies here: when you
 * find yourself writing the same rule a second time, extract it instead.
 *
 * ## The two shapes, and why both are legitimate
 *
 * Trackers are written by hand and two styles are in use. Neither is wrong; they suit different densities:
 *
 *   - **checkbox** — `- [ ] **R-4 — seven model-call budgets are hardcoded.**`, body indented beneath.
 *     Used where items are short and the file is a list.
 *   - **heading** — `### L-5 — an edge id is still random`, body until the next heading. Used where each item
 *     carries paragraphs, tables and a design discussion, which is most of the schema work.
 *
 * A rule that understands one and not the other does not enforce a weaker version of itself. It exempts whole
 * files, silently, based on a formatting choice nobody made for that reason.
 */

/**
 * The `| id | task | home.md | …` rows of `_TODO-ORDERED.md` — what the index CLAIMS exists, and where.
 *
 * Separate from `openItems` because it answers the opposite question. `openItems` reads a tracker and says what
 * is really there; this reads the index and says what it promises. Rule 2 compares them one way and rule 2b the
 * other, and until 2026-08-30 only one direction was ever checked — so `W-3` sat in the queue for weeks naming a
 * home file that had never declared it.
 *
 * @param {string} ordered  the full text of `_TODO-ORDERED.md`
 * @returns {Array<{id: string, home: string}>}
 */
export function orderedHomeRows(ordered) {
  const HOME_ROW = /^\|\s*([A-Z]+-[A-Z0-9-]+)\s*\|[^|]*\|\s*([A-Za-z0-9._-]+\.md)\s*\|/gm;
  return [...ordered.matchAll(HOME_ROW)].map(m => ({ id: m[1], home: m[2] }));
}

/** A `### L-5 — …` or `## R-3: …` item heading, capturing the id. Levels 2-4; level 1 is the document title. */
const HEADING_ITEM = /^#{2,4}[ \t]+\**([A-Z]+-[A-Z0-9-]+)\**[ \t]*[—:-]/;

/** A `- [ ] **W-2 — …` item, capturing the id when it has one. */
const CHECKBOX_ITEM = /^[ \t]*[-*][ \t]*\[ \][ \t]*\**([A-Z]+-[A-Z0-9-]+)?\**\.?/;

/** Any open checkbox, id or not — the split point for checkbox-style bodies. */
const CHECKBOX_ANY = /^[ \t]*[-*][ \t]*\[ \]/;

/**
 * Every open item in one tracker's source, in file order, each with the body that belongs to it.
 *
 * The body is what a rule reads to answer "does this item carry X?", so getting its END right is the half that
 * decides whether a check is about the item or about its neighbour. A checkbox item ends at the next top-level
 * checkbox; a heading item ends at the next heading of any level 2-4. Both stop at a `---` rule, which the
 * trackers use to close a section.
 *
 * @param {string} src  the tracker's full text
 * @returns {Array<{id: string|null, title: string, body: string, line: number, style: 'checkbox'|'heading'}>}
 */
export function openItems(src) {
  const lines = src.split(/\r?\n/);
  const starts = [];

  for (let i = 0; i < lines.length; i++) {
    const h = HEADING_ITEM.exec(lines[i]);
    if (h) { starts.push({ i, id: h[1], style: 'heading' }); continue; }
    const c = CHECKBOX_ITEM.exec(lines[i]);
    if (c && CHECKBOX_ANY.test(lines[i])) starts.push({ i, id: c[1] ?? null, style: 'checkbox' });
  }

  return starts.map((s, n) => {
    // The body runs to whichever comes first: the next item of EITHER style, a `---` rule, or end of file.
    // "Either style" matters — a file may open with checkboxes and continue with headings, and an item whose
    // body swallowed the next item would let one verify line satisfy two rows.
    let end = starts[n + 1]?.i ?? lines.length;
    for (let i = s.i + 1; i < end; i++) {
      if (/^#{2,4}[ \t]/.test(lines[i]) || /^---\s*$/.test(lines[i])) { end = i; break; }
    }
    const raw = lines[s.i];
    /*
     * A checkbox wraps its whole title in bold — `- [ ] **R-4 — seven budgets are hardcoded.**` — so the bold
     * run IS the title. A heading does not, and several end with a bold status flag (`… → **P-23 = B**`), so
     * preferring bold there returns the flag and calls it the title. Take the line for a heading.
     */
    const title = (s.style === 'checkbox' ? raw.match(/\*\*(.+?)\*\*/)?.[1] ?? raw : raw)
      .replace(/^#{2,4}[ \t]+/, '')
      .replace(/^[ \t]*[-*][ \t]*\[ \][ \t]*/, '')
      .replace(/[`*[\]]/g, '')
      .trim();
    return { id: s.id, title, body: lines.slice(s.i, end).join('\n'), line: s.i + 1, style: s.style };
  });
}
