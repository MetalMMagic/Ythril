#!/usr/bin/env node
/**
 * The `todo/` folder holds only actionable open work, and `_TODO-ORDERED.md` indexes all of it.
 *
 * Owner rules:
 *  - 2026-08-02: *"todos must be only actionable open items"* — no `[x]`, no SHIPPED, no standing rules. Shipped
 *    work lives in the CHANGELOG; rationale lives in `_REFERENCE.md`.
 *  - 2026-08-04: *"ordered has to reference all todos in all other todo files"* — `_TODO-ORDERED.md` is the single
 *    index. An item that exists in a domain tracker and is not referenced from the ordered list is invisible to
 *    the thing that decides what gets built next.
 *
 * ## Why this is a script and not a test
 *
 * `todo/` is **gitignored**. It never reaches CI, so a standalone test would either fail there for lack of the
 * folder or have to skip — and a check that skips in the only place it runs automatically is not a check. This is
 * a local pre-push tool instead, and it exits 0 with a clear note when `todo/` is absent, so it can be wired into
 * preflight without breaking a clean checkout.
 *
 * ## Why the second rule matters more than it sounds
 *
 * The release cadence is *"cut the tag when `_TODO-ORDERED.md` is EMPTY"*. If a domain tracker can hold an item
 * the ordered list never mentions, then "the queue is empty" is a statement about one file rather than about the
 * work — and the release gate fires on a queue that only looks drained. That already happened once: a
 * reconciliation on 2026-08-03 found five real items (2 FEATURES, 2 UX, 1 PERFORMANCE) missing from a list that
 * claimed to order all of them.
 *
 * Run: `npm run todo:check`
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchIndexReference } from './todo-index-match.mjs';
import { openItems, orderedHomeRows } from './todo-open-items.mjs';
import { verifyLineOf, parseVerifyLine, evaluateClause } from './verify-line.mjs';
import { resolvedHeadings, decidedButStillFiled, rulingsLeftOnThePage } from './parked-decisions-rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODO = join(ROOT, 'todo');
const R = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

if (!existsSync(TODO)) {
  console.log(`${DIM}todo/ is not present (it is gitignored) — nothing to check.${R}`);
  process.exit(0);
}

const ORDERED = '_TODO-ORDERED.md';

/**
 * Files that are reference material rather than queues, so an unindexed heading in them is not an orphan.
 *
 * Each carries its reason. `_REFERENCE.md` is where resolved rationale goes *by* the rules above, and
 * `_AUDIT-LENSES.md` is a catalogue of methods, not of work.
 */
const NOT_A_QUEUE = new Map([
  ['_REFERENCE.md', 'resolved rationale — where closed work is supposed to end up'],
  ['_AUDIT-LENSES.md', 'a catalogue of review methods, not a list of work'],
  ['_THE_LOOP.md', 'the process description itself'],
  ['_CRYPTO-INVENTORY.md', 'a fact sheet kept for reference; its subject is closed'],
  // Exempt from the QUEUE rules — its items are decisions, not work, so they have no verify line and are not in
  // the ordered index. It is NOT unchecked: rule 5 holds it to open-decisions-only.
  //
  // The old reason read "indexed by outcome rather than queued", which described a file that held outcomes. They
  // moved to `_REFERENCE.md` and the exemption stayed, so this page accumulated resolved history for weeks while
  // every checked page stayed clean — until the owner opened it and found seven settled items filed as open. An
  // exemption's stated reason is load-bearing: it is what the next person checks before adding a rule.
  ['_PARKED-DECISIONS.md', 'owner DECISIONS, not work — no verify line, not in the ordered index (see rule 5)'],
  ['_DEPRECATIONS.md', 'a removal checklist keyed to a future major, not the current queue'],
  ['_CLA-BOT-SETUP.md', 'setup instructions'],
  ['_NEXT-PR-PLAN.md', 'the working plan for the PR in flight; cleared on push'],
]);

/**
 * Items whose evidence genuinely cannot be a count, each with a reason and a date.
 *
 * **Four things make this cost something, and they are the difference between an escape hatch and the hole
 * reopening.** An exemption anybody can take for free is how the last four rounds of the closed-work rule went:
 *
 *  1. **It lives HERE, in a tracked file.** `todo/` is gitignored and reviewed by nobody, so a reason written
 *     beside the item costs nothing. A row in this map lands in a PR diff a human reads. That asymmetry is the
 *     whole lever.
 *  2. **A hard expiry.** On or after `by`, the gate fails. The item comes back on a date its author cannot
 *     quietly extend.
 *  3. **The expiry is bounded** to 120 days out, because an exemption dated 2099 is a deletion wearing a date.
 *  4. **A cap of three**, which makes the hatch rivalrous: taking it for a new item means retiring one.
 *
 * And a stale entry FAILS rather than warns — the existing exemption-rot check only `console.log`s, and this
 * file's own comment records that a stale `NOT_A_QUEUE` reason is how `_PARKED-DECISIONS.md` accumulated
 * resolved history for weeks while every checked page stayed clean.
 */
const MANUAL_VERIFY = new Map([
  ['A-2', { why: 'the measured case is a graph SHAPE — a space of memories carrying entityIds must return '
    + 'graphNodes > 0 at depth 1. No count over source answers it.', by: '2026-11-15' }],
  ['A-3', { why: 'Tier 0-R is a corpus benchmark; no count says "S0+ and S0 converge at traverse 0".',
    by: '2026-11-15' }],
]);

const failures = [];
const fail = (why) => failures.push(why);

const files = readdirSync(TODO).filter(f => f.endsWith('.md'));
if (!files.includes(ORDERED)) {
  console.log(`${RED}${ORDERED} is missing — there is no index.${R}`);
  process.exit(1);
}

const ordered = readFileSync(join(TODO, ORDERED), 'utf8');

console.log(`\n${YELLOW}todo/ consistency${R}  ${DIM}(owner rules 2026-08-02 and 2026-08-04)${R}\n`);

// ── rule 1: only actionable OPEN items
{
  // A completed marker anywhere in todo/ means shipped work is being tracked twice — here and in the CHANGELOG —
  // and the two will disagree. Two survivors labelled OPEN had already shipped when this rule was made.
  //
  // The heading patterns were added after the first three missed all of this: section 1 still listed an item
  // shipped in #678, and P1 sat in section 1b with "CLOSED" in its own heading. Both announced their closure in a
  // *heading* rather than with a checkbox, so a checkbox-only check reported the queue clean. The rule is about
  // closed work being tracked as work, not about one syntax for saying so.
  // 2026-08-13: four MORE shapes got through, and the owner had to say the rule again — *"only open and actionable
  // items here. everything else in parked, reference or changelog"*. All four announced closure somewhere this
  // check was not looking: inside a bullet rather than a heading, or in bold body text rather than a marker.
  //
  //   - [ ] **W-8 — PROMOTED TO WORK AND FIXED: …**        a bullet, not a heading
  //   - `retry_embedding` — **DONE** (#842).               a nested bullet under an open item
  //   **PROGRESS. The map shipped in #841 …**              bold body text
  //
  // The last one is the instructive one: it was ADDED during a tracker update, by me, with a note saying the
  // history was "kept because its reasoning is what made the extraction necessary". That is always the argument,
  // and the answer is that reasoning goes in `_REFERENCE.md` where it is read on demand.
  const CLOSED = [
    [/^\s*[-*]\s*\[x\]/im, 'a checked `[x]` item'],
    [/^\s*[-*]?\s*\*\*?SHIPPED/im, 'a SHIPPED marker'],
    [/^\s*#{1,4}\s+.*\b(SHIPPED|CLOSED|RESOLVED|DONE)\b/im, 'a heading announcing the item is finished'],
    [/^\s*[-*]\s*\[ \]\s*~~/im, 'a struck-through open item — delete it rather than crossing it out'],
    [/\*\*DONE\*\*|\bDONE \(#\d+\)/i, 'a DONE marker inside an item — the closed part belongs in the CHANGELOG'],
    [/\bAND FIXED\b|\bPROMOTED TO WORK AND\b/i, 'an item announcing its own fix'],
    [/^\s*\*\*PROGRESS[.:]/im, 'a PROGRESS block — a record of what shipped, which is the CHANGELOG\'s job'],
  ];
  let clean = true;
  for (const f of files) {
    if (NOT_A_QUEUE.has(f)) continue;
    const src = readFileSync(join(TODO, f), 'utf8');
    for (const [re, what] of CLOSED) {
      const m = re.exec(src);
      if (m) {
        const line = src.slice(0, m.index).split(/\r?\n/).length;
        fail(`${f}:${line} holds ${what}. Shipped work goes in the CHANGELOG; the reasoning goes in `
          + '`_REFERENCE.md`. A checkbox is not evidence — verify a survivor against the code before keeping it.');
        clean = false;
      }
    }
  }
  console.log(clean
    ? `${GREEN}  ✓${R} every queue file holds only open items`
    : `${RED}  ✗${R} a queue file tracks closed work`);
}

// ── rule 2: the ordered list references every item in every other tracker
{
  /**
   * An item is a `### N. Title` heading or a `- [ ]` checkbox. Reference is by ID token or by a distinctive title
   * fragment, because the ordered list legitimately paraphrases rather than copying a heading verbatim.
   */
  const orphans = [];
  for (const f of files) {
    if (f === ORDERED || NOT_A_QUEUE.has(f)) continue;
    const src = readFileSync(join(TODO, f), 'utf8');

    /*
     * IDs like S-L5-1 are the strongest handle; fall back to the first few words of an open checkbox.
     *
     * HEADING-STYLE ITEMS COUNT TOO, and until 2026-08-30 they did not. The docstring above has always said
     * *"an item is a `### N. Title` heading or a `- [ ]` checkbox"* — and only the checkbox half was ever
     * implemented. Two trackers written in heading style therefore contributed ZERO items, so the gate reported
     * `todo/ is consistent` while roughly twenty open rows were absent from the ordered index. A rule that is
     * documented and not enforced is worse than one that is neither, because it is believed.
     */
    const ids = [
      ...[...src.matchAll(/^\s*[-*]\s*\[ \]\s*\**([A-Z]+-[A-Z0-9-]+)\**\.?/gim)].map(m => m[1]),
      ...[...src.matchAll(/^#{2,4}\s+\**([A-Z]+-[A-Z0-9-]+)\**\s*[—:-]/gim)].map(m => m[1]),
    ];
    for (const id of new Set(ids)) {
      /*
       * WHOLE-TOKEN, not substring. `ordered.includes(id)` reported `L-1` as indexed because the string appears
       * inside `L-13` — so removing L-1's row entirely left the gate green, which is how a check passes by
       * matching something adjacent to its subject. With ten or more ids in a series every single-digit one was
       * covered by its own longer siblings.
       */
      const token = new RegExp(`(^|[^A-Z0-9-])${id}([^A-Z0-9-]|$)`, 'm');
      if (!token.test(ordered)) orphans.push(`${f} → ${id}`);
    }

    // Checkboxes with no ID: match on a contiguous phrase from the item's own wording.
    //
    // This used to be `words.some(w => ordered.includes(w))` over the first four long words, which any ONE
    // ordinary word satisfied — so this check reported a rule it did not enforce, and said "✓" while doing it.
    // See `todo-index-match.mjs` for what replaced it and for the two fixtures that prove it discriminates.
    const plain = [...src.matchAll(/^\s*[-*]\s*\[ \]\s*(.{16,120})$/gim)]
      .map(m => m[1].replace(/[*`_]/g, '').trim())
      .filter(t => !/^[A-Z]+-[A-Z0-9-]+/.test(t));
    for (const t of plain) {
      if (!matchIndexReference(t, ordered).referenced) orphans.push(`${f} → "${t.slice(0, 70)}"`);
    }
  }
  if (orphans.length) {
    fail(`${orphans.length} open item(s) exist in a domain tracker and are not referenced from ${ORDERED}:\n`
      + orphans.map(o => `      ${o}`).join('\n')
      + `\n\n      The release cadence is "cut the tag when ${ORDERED} is empty". An item it never mentions makes`
      + '\n      "empty" a statement about one file rather than about the work.');
    console.log(`${RED}  ✗${R} ${ORDERED} does not index every open item`);
  } else {
    console.log(`${GREEN}  ✓${R} ${ORDERED} references every open item in every tracker`);
  }
}

// ── rule 2b: every row in the ordered list resolves to a real item in the home it names
{
  /**
   * Rule 2 runs tracker → index. This is index → tracker, and nothing checked it until 2026-08-30.
   *
   * `W-3` had sat in the ordered list for weeks with `_WRITE-PATH-VALIDATION-TODOS.md` in its Home column and no
   * `W-3` anywhere in that file. The row was a phantom: a queue entry whose work had no description, no detail
   * and no verify line, because the section it pointed at was destroyed by a cleanup script whose backup went to
   * a path that did not exist (`_REFERENCE.md`, 2026-08-13). Its id had since been reused by an unrelated
   * reconstruction in `_REFERENCE.md`, so grepping the folder for "W-3" found something and looked fine.
   *
   * This matters for the same reason rule 2 does, from the other end. The release gate is "cut the tag when the
   * ordered list is EMPTY", so a phantom row can never drain — there is nothing to build and nothing to close,
   * and the queue reads one item longer than the work for as long as nobody opens the home file.
   *
   * The Home column is the claim being checked, which is what makes this independent evidence rather than more
   * status text: the row names a file, and either that file declares the id or it does not.
   */
  const declared = new Map();
  for (const f of files) {
    if (f === ORDERED) continue;
    for (const item of openItems(readFileSync(join(TODO, f), 'utf8'))) {
      if (item.id) declared.set(`${f}::${item.id}`, true);
    }
  }
  const phantoms = [];
  for (const { id, home } of orderedHomeRows(ordered)) {
    if (!files.includes(home)) { phantoms.push(`${id} → ${home} (no such file in todo/)`); continue; }
    if (NOT_A_QUEUE.has(home)) continue;  // a row may legitimately point at reference material for its rationale
    if (!declared.has(`${home}::${id}`)) phantoms.push(`${id} → ${home} declares no ${id}`);
  }
  if (phantoms.length) {
    fail(`${phantoms.length} row(s) in ${ORDERED} name a home that does not declare them:\n`
      + phantoms.map(p => `      ${p}`).join('\n')
      + '\n\n      A queue row whose home has no matching item is work with no description — it can never be'
      + '\n      built and never drains, so "the queue is empty" stays false for a row nobody can act on.');
    console.log(`${RED}  ✗${R} a row in ${ORDERED} points at an item that does not exist`);
  } else {
    console.log(`${GREEN}  ✓${R} every row in ${ORDERED} resolves to a real item in its home`);
  }
}

// ── rule 3: every open item states how to verify it is still open
{
  /**
   * The rule that replaces a title-matching check written and deleted in the same session.
   *
   * The problem it is really solving: **four of ten open items had already shipped**, none of them marked in any
   * way — just `- [ ]` entries describing work that was done. No closure word, no checkbox, nothing to grep.
   *
   * The first attempt compared each item's title against released CHANGELOG sections. It **survived its own
   * mutation**: a known-shipped item was restored and the check stayed green. The premise was wrong, not the
   * implementation — a todo describes the PROBLEM ("Nothing detects an unreachable component") and a CHANGELOG
   * describes the FIX ("The build now fails when a component becomes unreachable"). They share no phrase, so title
   * matching could only ever catch coincidences. A green tick that proves nothing is worse than no tick.
   *
   * So the item carries its own evidence instead. **Every open item names what to look at to confirm it is still
   * open** — a file, a symbol, a test name, a route. That turns "is this still open?" from a judgement call into a
   * one-command answer, and unlike the prose comparison it is mechanically checkable.
   *
   * ## It covered ONE item out of eleven until 2026-08-30
   *
   * This rule split the file on `- [ ]` checkboxes. Rule 2, six lines above, learned about heading-style items
   * that same day and this one did not — so `_LINKS-AND-SCHEMA-TODOS.md` (9 items) and
   * `_WRITE-PATH-VALIDATION-TODOS.md` (1 item) contributed nothing to it, and the tick meant "the single
   * checkbox item in `ARCHITECTURE-TODO.md` has a verify line".
   *
   * That is exactly the defect this codebase produces most, arriving inside the script that exists to catch
   * bookkeeping drift: one rule, two implementations, the weaker one winning without saying anything. Six of the
   * eight stale rows found on 2026-08-30 were in the two files it could not see. `openItems()` is now the single
   * answer to "what is an item", shared with rule 2 — the extraction the codebase's own rule asks for the second
   * time you write the same thing.
   */
  const missing = [];
  const unparsed = [];
  const disagree = [];
  const broken = [];
  const seenManual = new Set();
  let mechanised = 0;

  /*
   * The tracked file set, from git — never `readdirSync`. `todo/` and `dist/` are gitignored, and a path that
   * exists on disk but is not in the repo is exactly the kind of evidence that vanishes on another machine.
   *
   * A git failure is a FAILURE, not a skip. Rule 4 below catches its own `git log` and leaves the result empty,
   * which makes an error indistinguishable from a pass — the gate's one independent check reporting green
   * having compared nothing. Do not reproduce that shape here.
   */
  let tracked;
  try {
    tracked = new Set(
      execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', timeout: 15_000, maxBuffer: 1 << 26 })
        .split('\0').filter(Boolean),
    );
  } catch (err) {
    fail(`could not establish the tracked file set, so no verify line could be checked: ${err}`);
    tracked = null;
  }
  const cache = new Map();
  const ctx = {
    isTracked: p => tracked.has(p),
    readLines: p => {
      if (!cache.has(p)) cache.set(p, readFileSync(join(ROOT, p), 'utf8').split(/\r?\n/));
      return cache.get(p);
    },
  };

  for (const f of files) {
    if (NOT_A_QUEUE.has(f)) continue;
    for (const item of openItems(readFileSync(join(TODO, f), 'utf8'))) {
      const where = `${f}:${item.line} — "${item.title.slice(0, 60)}"`;
      const text = verifyLineOf(item.body);
      if (text === null) { missing.push(where); continue; }

      const parsed = parseVerifyLine(text);
      if (!parsed.ok) { unparsed.push(`${where}\n        ${parsed.reason}\n        → ${parsed.hint}`); continue; }

      if (parsed.kind === 'manual') {
        if (!item.id || !MANUAL_VERIFY.has(item.id)) {
          unparsed.push(`${where}\n        says MANUAL but is not in MANUAL_VERIFY in this script — the reason `
            + 'and the expiry live in the TRACKED file, where a human reads them in a diff');
        } else {
          seenManual.add(item.id);
        }
        continue;
      }
      if (!tracked) continue;
      mechanised++;
      const result = evaluateClause(parsed, ctx);
      if (result.state === 'broken') broken.push(`${where}\n        ${result.why}`);
      else if (result.state === 'disagrees') {
        disagree.push(`${where}\n        its own line says \`grep -c "${parsed.pattern}" ${parsed.path}\` returns `
          + `${parsed.expected}. It returns ${result.actual}. Either the row shipped, or its evidence points at `
          + 'the wrong thing.');
      }
    }
  }

  // The hatch's accounting, which is what stops it becoming the hole again. See MANUAL_VERIFY.
  const today = new Date().toISOString().slice(0, 10);
  for (const [id, { by }] of MANUAL_VERIFY) {
    if (!seenManual.has(id)) {
      fail(`MANUAL_VERIFY names ${id}, which is not an open item with a MANUAL verify line. A stale exemption is `
        + 'how `_PARKED-DECISIONS.md` accumulated resolved history for weeks — remove the row.');
    } else if (today >= by) {
      fail(`the manual verify exemption for ${id} expired on ${by} — mechanise it, or re-argue the reason and `
        + 'set a new date in this script, where the argument lands in a diff somebody reads.');
    } else if (by > new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10)) {
      fail(`the manual verify exemption for ${id} expires ${by}, more than 120 days out. An exemption dated that `
        + 'far ahead is a deletion wearing a date.');
    }
  }
  if (MANUAL_VERIFY.size > 3) {
    fail(`MANUAL_VERIFY holds ${MANUAL_VERIFY.size} entries; the cap is 3. The cap is what makes the hatch cost `
      + 'something: taking it for a new item means retiring an existing one.');
  }
  for (const [what, rows] of [['could not be parsed', unparsed], ['name a file that is gone', broken],
    ['DISAGREE with their own evidence', disagree]]) {
    if (rows.length) {
      fail(`${rows.length} verify line(s) ${what}:\n` + rows.map(r => `      ${r}`).join('\n'));
    }
  }
  if (missing.length) {
    fail(`${missing.length} open item(s) do not say how to verify they are still open:\n`
      + missing.map(x => `      ${x}`).join('\n')
      + '\n\n      Add a line like "Verify: `grep -c prod-deps Dockerfile` returns 0" — a file, a symbol, a test'
      + '\n      name, anything runnable. Four of ten items were once found to have already shipped, with nothing'
      + '\n      in the file to reveal it. This is the cheapest thing that would have.');
    console.log(`${RED}  ✗${R} an open item does not say how to verify it is still open`);
  } else {
    console.log(`${GREEN}  ✓${R} every open item says how to verify it is still open`);
  }

  /*
   * The tick says "its stated evidence still holds" — NOT "it is still open", and the difference is the whole
   * honest bound on this check. They come apart whenever a fix lands somewhere other than the file the row
   * names, which in this codebase is the usual shape rather than the exception, because the convention is to
   * extract. `L-4` named `api/contradictions.ts`; its fix (#1046) went into `brain/edges.ts`, and that file is
   * byte-identical from #1041 through HEAD — so every clause faithful to the row's own words would still have
   * said "holds" four days after it shipped. Six of the eight stale rows of 2026-08-30 were fix-in-place and
   * would have been caught; two were extractions and would not. Claiming the stronger thing is how the four
   * previous rounds of this check went wrong.
   */
  const okVerify = !unparsed.length && !broken.length && !disagree.length;
  console.log(okVerify
    ? `${GREEN}  ✓${R} every mechanised verify line still holds  ${DIM}(${mechanised} checked, `
      + `${MANUAL_VERIFY.size} manual — evidence intact, not "still open": a fix that lands elsewhere is invisible)${R}`
    : `${RED}  ✗${R} a verify line disagrees with the tree, or cannot be checked`);
}


// ── rule 3b: a tracker holds WORK — not watches, and not things blocked on the owner
{
  /**
   * The other half of *"only open and actionable items"* (owner, 2026-08-13). Rule 1 catches work that is FINISHED;
   * this catches material that was never actionable in the first place, which is how the trackers actually grew:
   *
   *  - **a watch item.** Five of them, each saying so in its own text — *"A watch item, not work"*, *"WATCH, not
   *    work"*. Nothing to do until it produces evidence, so it is a note. Its trigger belongs in
   *    `_TODO-ORDERED.md §2` as one line, and its reasoning in `_REFERENCE.md`.
   *  - **something blocked on the owner.** That is `_PARKED-DECISIONS.md`, and putting it in the open list is worse
   *    than useless: it makes the queue look longer than the work, and "the queue is empty" — the release gate —
   *    unreachable. Two were sitting in section 1 when this rule was written, one of them filed there by me the same
   *    night.
   *
   * Both are matched on the item's OWN words, so an item does not become exempt by being described differently
   * somewhere else. The phrasings are the ones that actually occurred, plus the obvious near-misses.
   */
  const NOT_WORK = [
    [/\bwatch item\b/i, 'a watch item', 'its trigger goes in `_TODO-ORDERED.md §2`, its reasoning in `_REFERENCE.md`'],
    [/\bWATCH,?\s+not\s+(a\s+)?(work|task)\b/i, 'an item labelled WATCH rather than work', 'same — §2 plus `_REFERENCE.md`'],
    [/\bnot\s+work\s*[.:]/i, 'an item saying it is not work', 'same — §2 plus `_REFERENCE.md`'],
    [/\bneeds? (an? )?owner (decision|call|word|sign.?off)\b/i, 'an item waiting on the owner', 'it belongs in `_PARKED-DECISIONS.md` with a recommended default'],
    [/\bthat is a question for the owner\b/i, 'a question for the owner', 'it belongs in `_PARKED-DECISIONS.md` with a recommended default'],
    [/\bis the owner['’]s call\b/i, "an owner's call", 'it belongs in `_PARKED-DECISIONS.md` with a recommended default'],
  ];
  let clean = true;
  for (const f of files) {
    if (NOT_A_QUEUE.has(f) || f === ORDERED) continue;   // §2 of the ordered file is where watch ROWS are allowed
    const src = readFileSync(join(TODO, f), 'utf8');
    for (const [re, what, where] of NOT_WORK) {
      const m = re.exec(src);
      if (!m) continue;
      const line = src.slice(0, m.index).split(/\r?\n/).length;
      fail(`${f}:${line} holds ${what}, which is not actionable work — ${where}.`);
      clean = false;
    }
  }
  console.log(clean
    ? `${GREEN}  ✓${R} every tracker item is WORK, not a watch or an owner decision`
    : `${RED}  ✗${R} a tracker holds something that is not actionable work`);
}

// ── rule 4: the working plan must describe work that is still ahead
{
  /**
   * `_NEXT-PR-PLAN.md` is exempt from the queue rules because it is a working document — and that exemption is
   * exactly why it rotted unnoticed until the owner opened it and said "outdated again". It described the
   * pre-2.3.0 world: an item that had shipped, a release that had happened, and layer figures I later corrected.
   *
   * The check that catches it without needing network: **it must not name a PR that is already merged into main.**
   * A plan is about work ahead; a merged PR number in it is a plan describing the past. Context references belong
   * in `_REFERENCE.md`, which is exempt from this for that reason.
   */
  const PLAN = '_NEXT-PR-PLAN.md';
  if (files.includes(PLAN)) {
    const src = readFileSync(join(TODO, PLAN), 'utf8');
    const claimed = [...new Set([...src.matchAll(/#(\d{3,5})\b/g)].map(m => m[1]))];
    /*
     * A git failure is a FAILURE, not a skip.
     *
     * This used to `catch {}` and leave `log = ''`, and the next line then read `log ? … : []` — so an error was
     * indistinguishable from a clean result, and the gate's one independent check printed its green tick having
     * compared nothing. That is the same shape as everything else this script was found to be doing on
     * 2026-08-30: reporting a rule it was not enforcing. The `timeout` matters too — preflight's own `run`
     * helper passes none, so a hung child would hang the gate with nothing to kill it.
     */
    let log = null;
    try {
      log = execFileSync('git', ['log', '--oneline', '-400'],
        { cwd: ROOT, encoding: 'utf8', timeout: 15_000, maxBuffer: 1 << 24 });
    } catch (err) {
      fail(`${PLAN} could not be checked against main: \`git log\` failed (${err}). A plan naming a merged PR is `
        + 'a plan describing the past, and this is the check for it — an unreadable history is an unanswered '
        + 'question, not a pass.');
    }

    const merged = log === null ? [] : claimed.filter(n => log.includes(`(#${n})`));
    if (merged.length) {
      fail(`${PLAN} names PR(s) already merged into main: ${merged.map(n => `#${n}`).join(', ')}. A plan is about `
        + 'work ahead — a merged number in it means the file describes the past. Rewrite it to the current state, '
        + 'or move the context to `_REFERENCE.md`.');
      console.log(`${RED}  ✗${R} ${PLAN} describes work that has already shipped`);
    } else {
      console.log(`${GREEN}  ✓${R} ${PLAN} describes work that is still ahead`);
    }
  }
}

// ── rule 5: the DECISIONS page lists only what the owner still has to decide
//
// Owner, 2026-08-19, reading it: *"why are there so many items? remove everything thats already done. i only
// want to see what i have todo — hence 'todo'"*. It was 312 lines, and SEVEN entries filed as open questions were
// decided — five of them already shipped.
//
// The two rules live in `parked-decisions-rules.mjs`, pure and fixture-tested, for the same reason
// `matchIndexReference` does: `todo/` is gitignored and absent in CI, so a rule that only reads those files
// directly can never be shown to fail. See that file for what each one refuses and which false positives were
// designed out of it.
{
  const PARKED = '_PARKED-DECISIONS.md';
  const REF = '_REFERENCE.md';
  let clean = true;
  if (files.includes(PARKED)) {
    const src = readFileSync(join(TODO, PARKED), 'utf8');

    for (const { heading, line } of resolvedHeadings(src)) {
      fail(`${PARKED}:${line} has a section announcing a resolution — "${heading.slice(0, 70)}". This page is what `
        + 'the owner still has to DECIDE. Record the outcome in `_REFERENCE.md` under Decisions already made.');
      clean = false;
    }

    for (const { id, marker, line } of rulingsLeftOnThePage(src)) {
      fail(`${PARKED}:${line} — ${id} records its own ruling ("${marker}"), so it is not an open decision. Move `
        + 'the outcome to `_REFERENCE.md`. A ruling of "do nothing" leaves no code to find, which is exactly how '
        + 'this one survived a manual pass that checked whether anything had shipped.');
      clean = false;
    }

    if (files.includes(REF)) {
      const both = decidedButStillFiled(src, readFileSync(join(TODO, REF), 'utf8'));
      for (const id of both) {
        fail(`${PARKED} still carries ${id}, which ${REF} records as DECIDED. One of the two is wrong, and a `
          + 'settled row on the decisions page makes every other row less believable.');
        clean = false;
      }
    }
  }
  console.log(clean
    ? `${GREEN}  ✓${R} the decisions page holds only what is still undecided`
    : `${RED}  ✗${R} the decisions page carries settled items`);
}

// ── the exemption list must not rot
{
  const stale = [...NOT_A_QUEUE.keys()].filter(f => !files.includes(f));
  if (stale.length) {
    console.log(`${YELLOW}  !${R} exempt but absent: ${stale.join(', ')} ${DIM}(harmless, but tidy it)${R}`);
  }
}

console.log(`\n${'='.repeat(78)}`);
if (!failures.length) {
  console.log(`${GREEN}todo/ is consistent${R} — open items only, all of them indexed.\n`);
  process.exit(0);
}
console.log(`${RED}todo/ is inconsistent${R} — ${failures.length} problem(s):\n`);
for (const f of failures) console.log(`  ${RED}·${R} ${f}\n`);
process.exit(1);
