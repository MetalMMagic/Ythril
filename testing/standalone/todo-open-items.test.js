/**
 * "What is an open item" has ONE answer, and it sees both styles the trackers are written in.
 *
 * ## The defect this pins
 *
 * `todo-consistency.mjs` asked that question twice. Rule 2 ("the ordered list indexes every item") learned about
 * heading-style items on 2026-08-30; rule 3 ("every open item says how to verify it is still open"), six lines
 * below it, kept a `- [ ]`-only parser. So rule 3 covered **one item out of eleven** — the single checkbox item
 * in `ARCHITECTURE-TODO.md` — and printed a tick that read as a statement about the queue.
 *
 * The two trackers it could not see are where six of the eight already-shipped rows found that day were sitting.
 * One rule, two implementations, the weaker winning silently, inside the script whose whole job is to catch
 * bookkeeping drift.
 *
 * ## Why a fixture and not the real folder
 *
 * `todo/` is gitignored and absent in CI, so a test that read it would be vacuous exactly where it runs
 * automatically. Every case below is a fixture: this tests the PARSER, not the folder — the same reason
 * `todo-index-match.test.js` gives.
 *
 * ## The case that matters most
 *
 * `finds a heading item that a checkbox-only parser misses` is the regression itself, written so it fails
 * against the pre-fix code rather than merely passing against the fix. A gate case that cannot fail on the
 * original defect is a green tick with nothing behind it.
 *
 * Run: node --test testing/standalone/todo-open-items.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openItems, orderedHomeRows } from '../../scripts/todo-open-items.mjs';

/** Both styles in one file, because a tracker may legitimately mix them as it grows. */
const MIXED = `# A tracker

Some preamble that mentions L-9 without declaring it.

## Open

- [ ] **R-4 — seven model-call budgets are hardcoded.**

  Body of R-4, with a table and prose.

  **Verify:** still open while \`grep -c envInt server/src/files/media/providers.ts\` returns 0.

---

## Live bugs

### L-5 — an edge id is still random, so two peers produce one relationship twice → **P-23 = B**
Body of L-5.

**Verify:** still open while \`grep -c uuidv5 server/src/brain/edges.ts\` returns 0.

### S-1 — the field
Body of S-1, which carries no verify line at all.

### S-2 — \`TypeSchemaZ\` must accept it
Body of S-2, also with no verify line.
`;

describe('openItems finds every open item, in both styles', () => {
  it('finds a heading item that a checkbox-only parser misses', () => {
    // The regression. The pre-fix rule 3 split on /^[ \t]*[-*][ \t]*\[ \]/ and would see exactly ONE of these.
    const ids = openItems(MIXED).map(i => i.id);
    assert.deepEqual(ids, ['R-4', 'L-5', 'S-1', 'S-2'],
      'a heading-style item is an item; a parser that sees only checkboxes exempts whole trackers by formatting');
  });

  it('reports which style each item was written in', () => {
    const byId = Object.fromEntries(openItems(MIXED).map(i => [i.id, i.style]));
    assert.equal(byId['R-4'], 'checkbox');
    assert.equal(byId['L-5'], 'heading');
  });

  it('does not mistake a prose mention for a declaration', () => {
    // "mentions L-9" in the preamble must not become an item, or every rule keyed on items inherits a phantom.
    assert.equal(openItems(MIXED).some(i => i.id === 'L-9'), false);
  });
});

describe('an item body stops where the next item starts', () => {
  it('does not let one verify line satisfy the item after it', () => {
    /*
     * The boundary is the half that decides whether a check is about the item or about its neighbour. S-1 sits
     * directly after L-5, which HAS a verify line — if L-5's body ran on, S-1 would inherit it and the gate
     * would report the queue clean while two items carried no evidence at all.
     */
    const VERIFY = /(?:\*\*)?(?:Verify|Still open because|Evidence)(?:\*\*)?\s*:/i;
    const has = Object.fromEntries(openItems(MIXED).map(i => [i.id, VERIFY.test(i.body)]));
    assert.deepEqual(has, { 'R-4': true, 'L-5': true, 'S-1': false, 'S-2': false });
  });

  it('a checkbox body stops at a horizontal rule, not at the next heading only', () => {
    // R-4 is followed by `---` and then a `##` section heading. Its body must not absorb either.
    const r4 = openItems(MIXED).find(i => i.id === 'R-4');
    assert.match(r4.body, /Body of R-4/);
    assert.doesNotMatch(r4.body, /Live bugs|L-5/, 'the checkbox item swallowed the section that follows it');
  });

  it('the last item runs to end of file', () => {
    const s2 = openItems(MIXED).find(i => i.id === 'S-2');
    assert.match(s2.body, /also with no verify line/);
  });
});

describe('the title is the item, not a flag that trails it', () => {
  it('a heading ending in a bold status flag keeps its real title', () => {
    /*
     * `### L-5 — … → **P-23 = B**`. Preferring the bold run — right for a checkbox, whose whole title IS bold —
     * returns "P-23 = B" here and calls it the item's name. That lands in the gate's failure output, where the
     * name is the only thing telling the reader which row to open.
     */
    const l5 = openItems(MIXED).find(i => i.id === 'L-5');
    assert.match(l5.title, /an edge id is still random/);
    assert.doesNotMatch(l5.title, /^P-23/);
  });

  it('a checkbox title comes from its bold run', () => {
    const r4 = openItems(MIXED).find(i => i.id === 'R-4');
    assert.match(r4.title, /^R-4 — seven model-call budgets/);
  });

  it('reports a 1-based line number that points at the item', () => {
    const l5 = openItems(MIXED).find(i => i.id === 'L-5');
    assert.equal(MIXED.split('\n')[l5.line - 1].startsWith('### L-5'), true);
  });
});

describe('the shapes that are NOT open items', () => {
  it('a checked or struck item is not open', () => {
    // Rule 1 is what reports those; this parser must not hand them to rules that assume "open".
    const src = '- [x] **A-1 — done.**\n- [ ] **A-2 — open.**\n';
    assert.deepEqual(openItems(src).map(i => i.id), ['A-2']);
  });

  it('a level-1 heading is a document title, not an item', () => {
    assert.deepEqual(openItems('# W-1 — the tracker itself\n\nprose\n').map(i => i.id), []);
  });

  it('an id-less open checkbox is still an item', () => {
    // `_TODO-ORDERED.md`'s own §2 and several trackers carry these; rule 2 matches them by title phrase.
    const items = openItems('- [ ] the client suite fails on a cold vitest cache\n');
    assert.equal(items.length, 1);
    assert.equal(items[0].id, null);
    assert.match(items[0].title, /cold vitest cache/);
  });
});

/**
 * The other direction: what the INDEX claims, so a row pointing at nothing can be caught.
 *
 * `W-3` sat in `_TODO-ORDERED.md` for weeks naming `_WRITE-PATH-VALIDATION-TODOS.md` as its home, and that file
 * had never contained a W-3 — its section was destroyed by a cleanup whose backup went to a path that did not
 * exist, and the id was later reused by an unrelated record elsewhere in `todo/`. Rule 2 ran tracker → index
 * only, so the one shape neither end checked was a queue row with no work behind it.
 */
const ORDERED_FIXTURE = `# TODO — the queue

| # | Task | Home | Status | Remark |
|---|---|---|---|---|
| R-4 | Seven model-call budgets are hardcoded | ARCHITECTURE-TODO.md | open | a remark |
| L-5 | Two peers produce one relationship twice | _LINKS-AND-SCHEMA-TODOS.md | open, **P-23 = B** | |
| W-3 | 04-brain-api.md is full | _WRITE-PATH-VALIDATION-TODOS.md | open | |

> A prose paragraph mentioning A-9 and naming _REFERENCE.md, which is not a table row.
`;

describe('orderedHomeRows reads what the index promises', () => {
  it('takes the id and the home file from each row', () => {
    assert.deepEqual(orderedHomeRows(ORDERED_FIXTURE), [
      { id: 'R-4', home: 'ARCHITECTURE-TODO.md' },
      { id: 'L-5', home: '_LINKS-AND-SCHEMA-TODOS.md' },
      { id: 'W-3', home: '_WRITE-PATH-VALIDATION-TODOS.md' },
    ]);
  });

  it('ignores prose that mentions an id and a filename', () => {
    // Without the leading-pipe anchor, a sentence naming both would enter the queue as a row.
    assert.equal(orderedHomeRows(ORDERED_FIXTURE).some(r => r.id === 'A-9'), false);
  });

  it('is not confused by a status cell containing its own bold marker', () => {
    // `open, **P-23 = B**` sits in the status column; the home must still come from column 3.
    assert.equal(orderedHomeRows(ORDERED_FIXTURE).find(r => r.id === 'L-5').home, '_LINKS-AND-SCHEMA-TODOS.md');
  });

  it('the header and separator rows are not items', () => {
    assert.equal(orderedHomeRows(ORDERED_FIXTURE).length, 3);
  });
});
