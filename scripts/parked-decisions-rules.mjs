/**
 * The two rules that keep the DECISIONS page a list of what the owner still has to decide.
 *
 * ## Why they are here rather than inline in `todo-consistency.mjs`
 *
 * The same reason `todo-index-match.mjs` exists: `todo/` is gitignored and absent in CI, so a rule that reads
 * those files directly is untestable and would sit in the repo unable to fail. These are pure — text in, findings
 * out — so `parked-decisions-rules.test.js` can prove they discriminate using fixtures.
 *
 * ## What went wrong that they prevent
 *
 * Owner, 2026-08-19, opening the page: *"why are there so many items? remove everything thats already done. i
 * only want to see what i have todo — hence 'todo'"*. It was 312 lines, and SEVEN entries filed as open questions
 * were decided; five of those had already shipped.
 *
 * It rotted because it was on `todo-consistency.mjs`'s `NOT_A_QUEUE` exemption list, whose stated reason —
 * "indexed by outcome rather than queued" — described a file that held outcomes. The outcomes moved to
 * `_REFERENCE.md` and the exemption stayed, so an unchecked page accumulated history for weeks while every
 * checked page stayed clean.
 *
 * **The damage is not the length.** One settled row makes every other row less believable, so the owner has to
 * re-read all of them to find out which still count.
 */

/**
 * Section headings that announce a RESOLUTION on a page that should hold none.
 *
 * ## Two false positives designed out, and both are the reason this is not a keyword ban
 *
 * - **Body text is never read.** A live decision legitimately says "fixed" and "reverted" in its own prose: P-10
 *   opens with *"the current release is fixed; the backlog is the question"*, and P-7 records an approach that was
 *   tried and reverted. Scanning the body fires on both.
 * - **Entry titles are skipped.** `## P-10 — six tags SHIPPED with no GitHub Release` says what happened to the
 *   tags, not to the decision. The first version of this check failed on exactly that, which is the
 *   rule-versus-one-spelling mistake: an outcome word in a title says nothing about whether the question is
 *   answered.
 *
 * So it looks only at headings that are NOT a `P-N` entry — which is where the rot actually lived, as whole
 * sections of resolved history (`## Answered`, `## ANSWERED 2026-08-08`, `## Also owner-scoped`). A decided `P-N`
 * left in place is caught by `decidedButStillFiled` instead, on evidence rather than on wording.
 */
export function resolvedHeadings(src) {
  const re = /^#{2,3}[ \t]+(?!P-\d)(?=.*\b(?:answered|resolved|closed|decided|shipped|done)\b).*$/gim;
  return [...src.matchAll(re)].map(m => ({
    heading: m[0].trim(),
    line: src.slice(0, m.index).split(/\r?\n/).length,
  }));
}

/**
 * Decisions that are on the parked page AND recorded as decided in the reference.
 *
 * **This is the check that actually bites**, and the reason it exists as well as the heading scan: a coverage rule
 * can only see that something is mentioned, while drift needs the second copy compared. Every decided item is a
 * row in `_REFERENCE.md`'s table keyed by its `P-` number, so a number in both files is decided-but-still-filed —
 * precisely the state the owner found, and it needs no judgement about wording to detect.
 */
export function decidedButStillFiled(parkedSrc, referenceSrc) {
  const decided = new Set([...referenceSrc.matchAll(/^\|[ \t]*(P-\d+)[ \t]*\|/gim)].map(m => m[1]));
  const filed = new Set([...parkedSrc.matchAll(/^#{2,3}[ \t]+(P-\d+)\b/gim)].map(m => m[1]));
  return [...filed].filter(id => decided.has(id)).sort();
}

/**
 * Entries whose own body records that they were RULED, and which are therefore not open.
 *
 * ## The gap this closes, found the same day the other two were written
 *
 * P-10 survived the first cleanup. It had been ruled by the owner on 2026-08-17 — *"P-10 no backfill, only newset
 * is interesting"* — and said **CLOSED** in its own text, and it still sat on the page as an open decision.
 *
 * Neither existing rule could see it. `resolvedHeadings` deliberately skips `P-N` titles and never reads bodies,
 * because a title saying "six tags shipped" is about the tags; `decidedButStillFiled` needs a row in the reference
 * table, and nobody had written one. **The ruling was in the body, which was the one place nothing looked.**
 *
 * And my own manual check missed it for a worse reason: I verified each entry by asking whether the code had
 * shipped. P-10's ruling was *do nothing*, so the six missing Releases were the IMPLEMENTED OUTCOME and I read
 * them as evidence the question was still open. An absence cannot distinguish "not done" from "deliberately not
 * done"; only the ruling can.
 *
 * ## Why markers and not outcome words
 *
 * Scanning bodies for words like "fixed" or "closed" is what the heading rule was narrowed to avoid — P-11 ends
 * with *"this genuinely closes it"* about an option it is offering, and P-7 records an approach that was reverted.
 * So this matches only SHOUTED markers, which is how this repo writes a ruling and not how it writes prose:
 * `RULED`, `CLOSED`, `OVERRIDDEN`, or the phrase "Owner ruled". Case-sensitive, deliberately.
 */
export function rulingsLeftOnThePage(parkedSrc) {
  const lines = parkedSrc.split(/\r?\n/);
  const out = [];
  let entry = null;
  for (let i = 0; i < lines.length; i++) {
    const heading = /^#{2,3}[ \t]+(P-\d+)\b/.exec(lines[i]);
    if (heading) { entry = heading[1]; continue; }
    // A marker before any entry heading belongs to the page preamble, which legitimately explains that decided
    // items live elsewhere.
    if (!entry) continue;
    const marker = /\b(RULED|CLOSED|OVERRIDDEN)\b|Owner ruled/.exec(lines[i]);
    if (marker && !out.some(o => o.id === entry)) {
      out.push({ id: entry, marker: marker[0], line: i + 1 });
    }
  }
  return out;
}
