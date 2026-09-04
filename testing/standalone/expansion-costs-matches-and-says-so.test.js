/**
 * Wherever the product promises whole records, it also says what that costs.
 *
 * ## The ruling this implements
 *
 * A budgeted search counts **one match plus its entire `_graph` subtree** as the unit that has to fit, and
 * refuses to emit a partial one. So a match with a large subtree can push later matches out of the answer
 * entirely — they are not shortened, they are absent.
 *
 * The obvious fix is to budget the bare matches first and attach subtrees to whichever survive. **Owner ruled
 * A on 2026-08-30: keep the behaviour.** It is the promise the product makes in nine places, including the UI
 * in English, German and Polish — *"never a record missing part of its graph"* — and a record arriving with
 * half its relationships is a worse answer than a shorter list of complete ones.
 *
 * What was wrong was not the behaviour but the silence. Every one of those nine places stated the guarantee
 * and none stated its price, so an operator whose hundred-match search returned eleven records had no way to
 * connect that to the expansion depth they had asked for. This gate holds the two halves together.
 *
 * ## Why the file list is derived rather than written down
 *
 * A hardcoded list of nine paths is a tenth place waiting to happen: the next page that explains the byte
 * budget would state the guarantee, omit the cost, and no gate would notice. So the subject is derived from
 * the promise itself — every file that makes the guarantee must also carry its price, and a new one is
 * covered on the commit that adds it.
 *
 * ## Why the check is per-paragraph and not per-file
 *
 * `04a-recall-api.md` is a long reference page. A file-wide search would be satisfied by the cost sentence
 * appearing anywhere in it — a screen away from the guarantee, which is exactly where a reader would not see
 * it. The window is the enclosing paragraph, which is what somebody actually reads in one go.
 *
 * Run: node --test testing/standalone/expansion-costs-matches-and-says-so.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * The guarantee, in every spelling it is written in. Matching one phrasing would exempt the pages that word it
 * differently — and they are the same promise to the reader, who does not know which words we chose where.
 */
const GUARANTEE = /never a record missing part of its graph|missing part of its graph|every record (?:in it )?is (?:complete|WHOLE|whole)|every record whole|never a partial subtree|jeder Datensatz ist vollständig|każdy rekord jest kompletny/;

/** The price, per language. A translated page must say it in its own language or it has not said it. */
const COST = {
  en: /fewer matches/i,
  de: /weniger Treffer/i,
  pl: /mniej trafień/i,
};

/** Everything tracked, so a gitignored scratch file cannot be mistaken for a product surface. */
const TRACKED = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').map(s => s.trim()).filter(Boolean);

/**
 * The block containing `at` — blank-line delimited, extended over any INDENTED paragraphs that follow.
 *
 * The indentation rule is what makes this a markdown unit rather than a text one. A bullet's second paragraph
 * is separated from its first by a blank line but indented to stay inside the item, so the tightest reading
 * would treat the two halves of one bullet as unrelated — and reject a page where the cost is written directly
 * under the promise, in the same bullet, which is exactly where it belongs. A NON-indented paragraph ends the
 * block, so a sentence a screen away still cannot satisfy this.
 *
 * ## THE NEWLINES ARE NORMALISED FIRST, AND WITHOUT THAT THIS GATE WAS VACUOUS ON WINDOWS
 *
 * It searched for `'\n\n'`. This repo checks out CRLF on Windows, where a blank line is `'\r\n\r\n'` — so
 * both searches returned -1, `start` fell back to 0, the loop never ran, and the "paragraph" was the WHOLE
 * FILE. The cost sentence then satisfied a promise anywhere in the same document, which is precisely what
 * the docblock above says it must not.
 *
 * So it passed locally and failed in CI, on the same tree: a gate that is real on Linux and decorative on
 * the machine it is run on before pushing. It cost a red run on 2026-09-04 for a paragraph I had rewritten
 * without its price — the defect the gate exists to catch, invisible where I could have caught it.
 */
function paragraphAround(rawText, at) {
  /*
   * Normalising shifts indices, so `at` has to be recomputed rather than reused: it was measured against
   * the raw text. Taking the match's own offset through the same transform keeps the two in step.
   */
  const text = rawText.replace(/\r\n/g, '\n');
  at = rawText.slice(0, at).replace(/\r\n/g, '\n').length;
  return paragraphIn(text, at);
}

function paragraphIn(text, at) {
  const before = text.lastIndexOf('\n\n', at);
  const start = before === -1 ? 0 : before + 2;
  let end = text.indexOf('\n\n', at);
  while (end !== -1) {
    const nextStart = end + 2;
    const lineEnd = text.indexOf('\n', nextStart);
    const firstLine = text.slice(nextStart, lineEnd === -1 ? undefined : lineEnd);
    if (!/^[ \t]+\S/.test(firstLine)) break;          // not a continuation — the block ends here
    const nextEnd = text.indexOf('\n\n', nextStart);
    if (nextEnd === -1) return text.slice(start);
    end = nextEnd;
  }
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

/** Files that state the guarantee, excluding this gate and its own fixtures. */
function filesStatingTheGuarantee() {
  return TRACKED.filter(f => (f.startsWith('docs/') || f.startsWith('server/src/') || f.startsWith('client/'))
    && !f.includes('expansion-costs-matches')
    && /\.(md|ts)$/.test(f)
    && GUARANTEE.test(readFileSync(f, 'utf8')));
}

describe('the sweep itself works', () => {
  it('found the places that make the promise', () => {
    // Without this, a reworded guarantee reduces the subject to zero files and every assertion below passes by
    // examining nothing — the failure mode every coverage gate in this repo has had at least once.
    const files = filesStatingTheGuarantee();
    assert.ok(files.length >= 3, `expected the pages that promise whole records, found ${files.length}`);
    assert.ok(files.includes('docs/userguide/02-brain.md'), 'the operator page no longer states the guarantee');
    assert.ok(files.includes('server/src/brain/result-budget.ts'), 'the budget itself no longer states it');
  });
});

describe('every place that promises whole records also says what it costs', () => {
  it('states the price beside the promise, not elsewhere in the file', () => {
    const offenders = [];
    for (const f of filesStatingTheGuarantee()) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(new RegExp(GUARANTEE.source, 'g'))) {
        const para = paragraphAround(text, m.index);
        if (!COST.en.test(para)) {
          const line = text.slice(0, m.index).split(/\r?\n/).length;
          offenders.push(`${f}:${line}`);
        }
      }
    }
    assert.deepEqual(offenders, [],
      'these promise a whole record with its whole graph and do not say that the graph is what fills the '
      + 'budget — so a search that returned eleven of a hundred matches looks like a fault rather than the '
      + 'documented consequence of the expansion that was asked for:\n  ' + offenders.join('\n  '));
  });
});

describe('the UI says it in every language it makes the promise in', () => {
  for (const loc of ['en', 'de', 'pl']) {
    it(loc, () => {
      /*
       * A missing translation here is not cosmetic. The German and Polish pages carry the guarantee in full —
       * `jeder Datensatz ist vollständig`, `każdy rekord jest kompletny` — so leaving the price in English
       * would state the promise in the reader's language and its cost in one they may not read, which is the
       * worst of the three options available.
       */
      const j = JSON.parse(readFileSync(`client/public/assets/i18n/${loc}.json`, 'utf8'));
      const stating = Object.entries(j).filter(([, v]) => GUARANTEE.test(String(v)));
      assert.ok(stating.length >= 2, `${loc} states the guarantee in ${stating.length} strings, expected at least 2`);
      const silent = stating.filter(([, v]) => !COST[loc].test(String(v))).map(([k]) => k);
      assert.deepEqual(silent, [], `these ${loc} strings promise a whole record and do not say what it costs`);
    });
  }
});
