/**
 * Is an open todo item referenced from `_TODO-ORDERED.md`?
 *
 * ## Why this is its own module
 *
 * It was four lines inside `todo-consistency.mjs` and it was WRONG in a way the check itself reported as
 * "✓ _TODO-ORDERED.md references every open item in every tracker". For an item with no `X-LN-N` id it asked:
 *
 *     const words = title.split(/\s+/).filter(w => w.length > 4).slice(0, 4);
 *     const referenced = words.some(w => ordered.toLowerCase().includes(w.toLowerCase()));
 *
 * `.some()` over four ordinary words means **any single one is enough**. `_TODO-ORDERED.md` is a long file
 * about this repository, so it contains "client", "search", "probe", "response" and a hundred other words
 * somewhere — and an item whose title merely contains one of them passed. Proved by appending
 * `- [ ] **ZZZ deliberately unreferenced probe item.**` to a tracker and watching the check pass: it matched
 * on "probe".
 *
 * That is load-bearing rather than cosmetic. The release cadence is "cut the tag when `_TODO-ORDERED.md` is
 * EMPTY", so an item the index never mentions turns "the queue is empty" into a statement about one file
 * rather than about the work — which is the exact failure the surrounding script's own header describes.
 *
 * Extracted so it can be tested directly. The script it came from does its work at module scope and exits,
 * so nothing could import it, and a matcher nobody can call with a fixture is a matcher nobody checks.
 *
 * ## The rule: a contiguous phrase, and why the obvious fallback was cut
 *
 * A reference means **three consecutive words of the item's own wording appear in the index**. That is what a
 * real reference looks like, because whoever wrote the index line was reading the item.
 *
 * The first version of this fix also accepted "every distinctive word appears somewhere", as tolerance for the
 * old comment's point that the index "legitimately paraphrases rather than copying a heading verbatim". It was
 * removed after being tested rather than reasoned about:
 *
 *  - On the real trackers, **all** ID-less items matched by phrase and **none** needed the fallback. It
 *    protected nothing.
 *  - It admitted a known orphan. The `ZZZ deliberately unreferenced probe item` used to prove the original bug
 *    passed the fallback, because the index now DOCUMENTS that probe and therefore contains every one of its
 *    words. Word-presence cannot distinguish "referenced" from "written about elsewhere in the same file".
 *
 * So the two failure modes were weighed rather than split. Phrase-only can produce a **false orphan** when an
 * index line is rewritten past recognition — loud, and fixed by quoting three of the item's words. The
 * fallback produced a **false green** — silent, and indistinguishable from a healthy queue. Loud beats silent
 * for a gate whose whole job is to be believed.
 *
 * Accuracy over speed here is not a trade: the whole match is substring work over ten small markdown files,
 * single-digit milliseconds against ~95 ms of node startup for the script that calls it. There was nothing to
 * weigh and nothing worth moving off the path the owner waits on.
 *
 * Accuracy over speed here is not a trade: the whole match is substring work over ten small markdown files,
 * single-digit milliseconds against ~95 ms of node startup for the script that calls it. There was nothing to
 * weigh and nothing worth moving off the path the owner waits on.
 */

/** Lowercase, drop markdown noise, and collapse everything non-alphanumeric to single spaces. */
export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Words worth matching on: long enough that a coincidental hit is unlikely. */
export function distinctiveWords(title, limit = 4) {
  return [...new Set(normalize(title).split(' ').filter(w => w.length > 4))].slice(0, limit);
}

/**
 * @param {string} title  the item's text, as written in the tracker
 * @param {string} ordered  the whole `_TODO-ORDERED.md` source
 * @returns {{referenced: boolean, how: 'phrase'|'full-title'|'none'}}
 */
export function matchIndexReference(title, ordered) {
  const t = normalize(title);
  const o = normalize(ordered);
  if (!t) return { referenced: false, how: 'none' };

  const words = t.split(' ');

  // A contiguous three-word run from the first part of the title. Beyond ~12 words a title has stopped being
  // a name and started being prose, and prose is where an index line legitimately diverges.
  const head = words.slice(0, 12);
  for (let i = 0; i + 3 <= head.length; i++) {
    if (o.includes(head.slice(i, i + 3).join(' '))) return { referenced: true, how: 'phrase' };
  }

  // A title too short to have a three-word run is not silently exempt — the old code `continue`d past
  // anything with fewer than two long words, a second hole in the same check. Require the whole thing.
  if (words.length < 3) {
    return o.includes(t) ? { referenced: true, how: 'full-title' } : { referenced: false, how: 'none' };
  }

  return { referenced: false, how: 'none' };
}
