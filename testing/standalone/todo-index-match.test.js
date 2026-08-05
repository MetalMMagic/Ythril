/**
 * The tracker index check can actually FAIL.
 *
 * ## Why this test exists
 *
 * `npm run todo:check` printed *"✓ `_TODO-ORDERED.md` references every open item in every tracker"* while not
 * enforcing it. For an item with no `X-LN-N` id it asked `words.some(w => ordered.includes(w))` over the first
 * four long words of the title, so **any single ordinary word was enough** — and `_TODO-ORDERED.md` is a long
 * document about this repository, so it contains "client", "search", "probe" and a hundred others somewhere.
 *
 * Found by experiment, not by reading: appending `- [ ] **ZZZ deliberately unreferenced probe item.**` to a
 * tracker and running the check produced "todo/ is consistent — open items only, all of them indexed". It
 * matched on "probe".
 *
 * That is load-bearing. The release cadence is "cut the tag when `_TODO-ORDERED.md` is EMPTY", so an item the
 * index never mentions makes "the queue is empty" a claim about one file rather than about the work — which is
 * what `todo-consistency.mjs`'s own header says the check is for.
 *
 * ## What this test refuses to let happen again
 *
 * A gate that cannot fail. Every case below is a fixture, so `todo/` being gitignored (and absent in CI) does
 * not make this test vacuous — it tests the MATCHER, not the folder.
 *
 * Run: node --test testing/standalone/todo-index-match.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchIndexReference, normalize, distinctiveWords } from '../../scripts/todo-index-match.mjs';

/** A stand-in for `_TODO-ORDERED.md`: real index lines, plus prose that mentions ordinary words. */
const ORDERED = `
# Ordered queue

## 1 · Open work, in shipping order

1. **A-L6-1** — maxPerType on recall, a ceiling to match minPerType's floor
2. **C-L5-5** — a stable layer for the embedding model
3. The client suite fails on a cold vitest cache, with NG0950

### Watch items

- The unreproduced preflight flake — capture the full tail if it recurs.

Notes: a probe that asserted success by checking a string was absent; every search response is deliberately
unreferenced from this list unless it names the item.
`;

describe('the tracker index matcher discriminates a reference from a coincidence', () => {
  it('a genuine index line is a reference', () => {
    for (const title of [
      'A stable layer for the embedding model.',
      'The client suite fails on a cold vitest cache, with NG0950',
      'Unreproduced preflight flake',
    ]) {
      const r = matchIndexReference(title, ORDERED);
      assert.equal(r.referenced, true, `"${title}" should be referenced, got ${r.how}`);
    }
  });

  it('THE regression: a single common word is NOT a reference', () => {
    // The exact fixture that passed the old rule, and the exact reason it passed: every one of its long words
    // occurs somewhere in the index prose, just never together and never about this item.
    const probe = 'ZZZ deliberately unreferenced probe item.';
    for (const w of distinctiveWords(probe)) {
      assert.ok(normalize(ORDERED).includes(w),
        `fixture is wrong: "${w}" must appear in the index prose, or this test proves nothing`);
    }
    // The old rule, reconstructed, to show the fixture really did fool it.
    const oldRule = distinctiveWords(probe).some(w => normalize(ORDERED).includes(w));
    assert.equal(oldRule, true, 'the predecessor called this referenced — that is the bug');

    assert.equal(matchIndexReference(probe, ORDERED).referenced, false,
      'a title whose words merely occur in the index is an ORPHAN — the index never mentions the item');
  });

  it('a title made only of words the index happens to contain is an orphan', () => {
    assert.equal(matchIndexReference('A client search response for the user.', ORDERED).referenced, false);
  });

  it('paraphrase is tolerated as long as three words survive', () => {
    // The tolerance the old comment was reaching for. The index says "a stable layer for the embedding model";
    // an item written the other way round still shares a three-word run.
    assert.equal(matchIndexReference('Give the embedding model a stable layer, measured', ORDERED).referenced, true);
  });

  it('a rewritten index line fails LOUDLY rather than passing quietly', () => {
    // The accepted cost of dropping the every-word fallback: an index line rewritten past any shared
    // three-word run reports an orphan. That is the intended direction — it is fixed by quoting three of the
    // item's words in the index, and it is visible, where the old failure was not.
    assert.equal(matchIndexReference('Ceiling per type so one long chunk cannot crowd out the distilled tier', ORDERED).referenced, false);
  });

  it('a two-word item must appear in full, rather than being skipped', () => {
    // The second hole in the old code: it `continue`d past anything with fewer than two long words, exempting
    // it silently.
    assert.equal(matchIndexReference('Vitest cache', ORDERED).referenced, true);
    assert.equal(matchIndexReference('Nonexistent thing', ORDERED).referenced, false);
  });

  it('markdown emphasis and punctuation do not decide the answer', () => {
    assert.equal(matchIndexReference('**A stable layer** for the `embedding model`!', ORDERED).referenced, true);
  });

  it('an empty or whitespace title is an orphan, not a pass', () => {
    assert.equal(matchIndexReference('   ', ORDERED).referenced, false);
    assert.equal(matchIndexReference('', ORDERED).referenced, false);
  });
});
