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
  ['_PARKED-DECISIONS.md', 'owner decisions, indexed by outcome rather than queued'],
  ['_DEPRECATIONS.md', 'a removal checklist keyed to a future major, not the current queue'],
  ['_CLA-BOT-SETUP.md', 'setup instructions'],
  ['_NEXT-PR-PLAN.md', 'the working plan for the PR in flight; cleared on push'],
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
  const CLOSED = [
    [/^\s*[-*]\s*\[x\]/im, 'a checked `[x]` item'],
    [/^\s*[-*]?\s*\*\*?SHIPPED/im, 'a SHIPPED marker'],
    [/^\s*#{1,4}\s+.*\b(SHIPPED|CLOSED|RESOLVED|DONE)\b/im, 'a heading announcing the item is finished'],
    [/^\s*[-*]\s*\[ \]\s*~~/im, 'a struck-through open item — delete it rather than crossing it out'],
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

    // IDs like S-L5-1 are the strongest handle; fall back to the first few words of an open checkbox.
    const ids = [...src.matchAll(/^\s*[-*]\s*\[ \]\s*\**([A-Z]+-[A-Z0-9-]+)\**\.?/gim)].map(m => m[1]);
    for (const id of new Set(ids)) {
      if (!ordered.includes(id)) orphans.push(`${f} → ${id}`);
    }

    // Checkboxes with no ID: match on a distinctive phrase (the longest run of words in the first 12).
    const plain = [...src.matchAll(/^\s*[-*]\s*\[ \]\s*(.{16,120})$/gim)]
      .map(m => m[1].replace(/[*`_]/g, '').trim())
      .filter(t => !/^[A-Z]+-[A-Z0-9-]+/.test(t));
    for (const t of plain) {
      const words = t.split(/\s+/).filter(w => w.length > 4).slice(0, 4);
      if (words.length < 2) continue;
      const referenced = words.some(w => ordered.toLowerCase().includes(w.toLowerCase()));
      if (!referenced) orphans.push(`${f} → "${t.slice(0, 70)}"`);
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
   */
  const VERIFY = /(?:\*\*)?(?:Verify|Still open because|Evidence)(?:\*\*)?\s*:/i;
  const OPEN_ITEM = /^[ \t]*[-*][ \t]*\[ \]/;
  const missing = [];
  for (const f of files) {
    if (NOT_A_QUEUE.has(f)) continue;
    const src = readFileSync(join(TODO, f), 'utf8');
    // Split on top-level checkboxes so each item is checked together with its own body.
    const parts = src.split(/(?=^[ \t]*[-*][ \t]*\[ \])/m).filter(p => OPEN_ITEM.test(p));
    for (const p of parts) {
      if (VERIFY.test(p)) continue;
      const title = (p.match(/\*\*(.+?)\*\*/)?.[1] ?? p.split(/\r?\n/)[0]).replace(/[`*[\]]/g, '').trim();
      missing.push(`${f} — "${title.slice(0, 66)}"`);
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
    let log = '';
    try {
      log = execFileSync('git', ['log', '--oneline', '-400'], { cwd: ROOT, encoding: 'utf8' });
    } catch { /* no git history available — skip rather than guess */ }

    const merged = log ? claimed.filter(n => log.includes(`(#${n})`)) : [];
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
