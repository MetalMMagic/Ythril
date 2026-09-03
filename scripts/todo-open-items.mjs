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
 * What an item id looks like — ONE definition, because EIGHT places needed the same answer.
 *
 * `R-4`, `S-L5-1`, `P-28` … and a numbered SUB-id, `G-3.1`, for a step of a decomposition its parent row
 * tracks as a whole. The owner asked for those steps to appear in the queue so progress and remaining length
 * are visible, and the three patterns below could not see one — each in its own way, and all three silently:
 *
 *   - the index row matched NOTHING, so the rule that checks a queue row against its home skipped it;
 *   - a tracker item matched the PARENT, so `G-3.1` read as `G-3` and that same rule ticked the row because
 *     the parent was declared. A step nobody had checked existed then counted as checked.
 *
 * Written out repeatedly, that is this repo's signature defect inside the script whose job is to catch it —
 * and the first attempt at this fix found three copies here and left FIVE in `todo-consistency.mjs`, in the
 * module that imports this one. Two of those mattered:
 *
 *   - **rule 2 re-implemented `openItems`** with its own two patterns, so it saw neither a dotted sub-id nor
 *     an item marked `[~]` in progress. Its copy also accepted a sub-id as indexed whenever the PARENT's id
 *     appeared in the queue, which is a false green on the rule that decides whether the queue is complete.
 *   - **the working-order plan row** read `G-3.2` as `G-3` and then refused the job, because the queue held
 *     the sub-rows and not the parent. Loud rather than silent, which is the only reason it was found.
 *
 * The trailing dot of the older `- [ ] **A-1.**` shape is punctuation rather than a sub-number, and the two
 * are told apart by what follows: a digit continues the id, anything else ends it.
 */
const ID = String.raw`[A-Z]+-[A-Z0-9-]+(?:\.\d+)*`;

/**
 * One TICKED row of `_WORKING-ORDER.md`, found by its NAME, with the body it attests — or `null`.
 *
 * ## Why not by number, which is how it worked until 2026-09-03
 *
 * The three rules that read this checklist located their rows with a literal `2`, `6` and `7`. Write it
 * with nine rows — the natural thing when a job has more than seven things worth attesting — and `7 full
 * suite` lands where the guides check looks, while whatever happens to be row 2 lands where the tests check
 * looks. Two of the three checks then read the wrong row and say nothing about it.
 *
 * That was found by writing a nine-row checklist, and only because two of the three complained AT ONCE. A
 * numbering that lined up differently would have passed with rows unread. The rows are the attestation this
 * gate exists for, so losing them quietly is the gate reporting on something it never looked at.
 *
 * Matching the name also removes the reason to keep the checklist at exactly seven rows, which was a
 * constraint on the writing rather than on the work.
 *
 * ## What it takes and what it returns
 *
 * `name` is the row's own label — `plan`, `tests first`, `CHANGELOG`, `guides`. **`tests first` rather
 * than `tests`**: row 4 says "those tests pass" and attests something else entirely.
 *
 * An UNTICKED row answers `null`: it exists but nothing is claimed, so there is nothing to read. `[~]`
 * counts as ticked, because marking a row in progress while its PR is in flight is the honest thing to do
 * and must not remove it from view — the same blind spot `openItems` had.
 *
 * The body runs to the next row or a blank line, so a reason that wraps across lines survives. The guides
 * row's reason usually does.
 *
 * @param {string} src   the whole of `_WORKING-ORDER.md`
 * @param {string} name  the row's label, e.g. `guides`
 * @returns {string|null}
 */
export function workingOrderRow(src, name) {
  const lit = name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const re = new RegExp(
    // `(?![\s\S])` and not `$`: with the `m` flag `$` matches at every LINE end, so the lazy body would
    // stop at the first one and a wrapped reason would lose everything after line 1. The guides row's
    // reason usually wraps, which is exactly the row whose reason has to be read.
    String.raw`^[ \t]*[-*][ \t]*\[[x~]\][^\n]*?\b${lit}\b[^\n]*?[\u2014:-][ \t]*([\s\S]*?)(?=\n[ \t]*[-*][ \t]*\[|\n[ \t]*\n|(?![\s\S]))`,
    'im',
  );
  return re.exec(src)?.[1]?.trim() ?? null;
}

/** The first item id in a line of prose, or `null`. What the working-order plan row is read with. */
export function itemIdIn(text) {
  return new RegExp(String.raw`\b(${ID})\b`).exec(text)?.[1] ?? null;
}

/**
 * Does `ordered` name this id — as a WHOLE TOKEN, not as a substring?
 *
 * `ordered.includes(id)` reported `L-1` as indexed because the string appears inside `L-13`, so deleting
 * L-1's row left the gate green: a check passing by matching something adjacent to its subject. With ten ids
 * in a series every single-digit one was covered by its own longer siblings.
 *
 * **The id is ESCAPED before it becomes a pattern**, which sub-ids made load-bearing. Interpolated raw,
 * `G-3.1` is a pattern whose dot matches any character — so a queue holding `G-3x1` would satisfy an item
 * declared as `G-3.1`. Unlikely to happen by accident and free to rule out.
 *
 * A sub-id is NOT satisfied by its parent. `G-3.1` needs `G-3.1` in the queue; `G-3` alone is the parent
 * row, and treating it as cover is exactly the false green this rule exists to prevent.
 */
export function isNamedIn(id, ordered) {
  const lit = id.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return new RegExp(`(^|[^A-Z0-9-])${lit}([^A-Z0-9-]|$)`, 'm').test(ordered);
}

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
  const HOME_ROW = new RegExp(String.raw`^\|\s*(${ID})\s*\|[^|]*\|\s*([A-Za-z0-9._-]+\.md)\s*\|`, 'gm');
  return [...ordered.matchAll(HOME_ROW)].map(m => ({ id: m[1], home: m[2] }));
}

/** A `### L-5 — …` or `## R-3: …` item heading, capturing the id. Levels 2-4; level 1 is the document title. */
const HEADING_ITEM = new RegExp(String.raw`^#{2,4}[ \t]+\**(${ID})\**[ \t]*[—:-]`);

/**
 * A `- [ ] **W-2 — …` item, capturing the id when it has one.
 *
 * **`[~]` counts too, and leaving it out was a real blind spot.** Every tracker's legend reads
 * `[ ] open · [~] in progress`, so marking a row in-progress — the honest thing to do while its PR is in
 * flight — removed it from this parser's view entirely. "Every open item is indexed" then passed over a row
 * nobody could see, and the ordered queue could name a home the gate no longer found the item in. Found the
 * first time a row was actually marked `[~]`.
 *
 * `[x]` is deliberately NOT here: a ticked box is finished work, and finished work belongs in the CHANGELOG.
 */
const CHECKBOX_ITEM = new RegExp(String.raw`^[ \t]*[-*][ \t]*\[[ ~]\][ \t]*\**(${ID})?\**\.?`);

/** Any open-or-in-progress checkbox, id or not — the split point for checkbox-style bodies. */
const CHECKBOX_ANY = /^[ \t]*[-*][ \t]*\[[ ~]\]/;

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
