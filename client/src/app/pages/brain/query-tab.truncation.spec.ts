/**
 * A shortened search answer says so on the page, and the size ceiling is reachable from the form.
 *
 * ## The defect
 *
 * The server has reported `truncated` since the result spill shipped and the client **never read it**. So a
 * hundred-match search could render a handful of records with nothing anywhere on the page explaining why —
 * under the old record cap that was three records out of a hundred. A reader who scrolls to the end of a
 * shortened answer has already concluded that is all there was.
 *
 * The five accounting fields were typed in the byte-budget commit precisely so this gap would be visible to
 * whoever picked it up; nothing read them until now.
 *
 * ## And the second half
 *
 * `Show advanced` states its own principle — *"everything the API accepts is here, so a search you can describe
 * is a search you can run without writing a request by hand"*. `maxBytes` broke that: it is the one parameter
 * that decides whether the answer is complete, and it could only be set by hand-writing a request.
 *
 * Run: npm run test:client
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Comments STRIPPED, and this file is why the rule exists.
 *
 * Two of the assertions below are "this name must not appear": `budgetBytes`/`bytesReturned` must not reach the
 * interface, and `maxTokens` must not be offered as a second control. Both names appear in the comments that
 * EXPLAIN those decisions — so on the raw source the gate fires on the reasoning for the fix, which punishes
 * writing the reasoning down.
 */
const stripComments = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/).filter(l => !l.trim().startsWith('//')).join('\n');

const component = stripComments(readFileSync('src/app/pages/brain/query-tab.component.ts', 'utf8'));
const api = stripComments(readFileSync('src/app/core/brain-api.service.ts', 'utf8'));
const LOCALES = ['en', 'de', 'pl'] as const;
const locale = (l: string) =>
  JSON.parse(readFileSync(`public/assets/i18n/${l}.json`, 'utf8')) as Record<string, string>;

describe('the page says when an answer was shortened', () => {
  it('reads `truncated` off the response and keeps the two numbers an operator can act on', () => {
    expect(component).toContain('recallTruncated');
    expect(component).toMatch(/res\.truncated === true/);
    expect(component).toMatch(/returned: res\.returned \?\? res\.results\.length, count: res\.count/);
  });

  it('tests `=== true`, so an older server sending nothing reads as NOT truncated', () => {
    // The field is optional on the type. A truthy check would be equivalent today and would start meaning
    // "unknown" the moment anything else could land there; `undefined` must read as "the answer is whole".
    expect(component).not.toMatch(/if \(res\.truncated\)/);
    expect(component).toMatch(/res\.truncated === true/);
  });

  it('does NOT put a byte count in front of the operator', () => {
    /*
     * `budgetBytes` and `bytesReturned` are for a caller tuning a request programmatically. In an interface they
     * are numbers nobody can act on, and showing them would make the notice read as diagnostics rather than as
     * "here is what happened and here is what to do".
     */
    // Four names since 3.7, not two: the one figure that claimed to be bytes was split into the character
    // count it actually was and a real byte count. A character count is exactly as unactionable in an
    // interface as a byte one, so the new pair is refused on the same grounds rather than left unasserted.
    for (const field of ['budgetBytes', 'bytesReturned', 'budgetChars', 'charsReturned']) {
      expect(component).not.toContain(field);
    }
    // And the notice must not have grown one through a locale key either.
    for (const l of LOCALES) {
      const t = locale(l);
      for (const k of ['brain.query.truncated.title', 'brain.query.truncated.body', 'brain.query.truncated.what']) {
        expect(t[k]).not.toMatch(/\{\{(budgetBytes|bytesReturned|budgetChars|charsReturned)\}\}/);
      }
    }
  });

  it('clears the notice when a new search starts AND when results are cleared', () => {
    /*
     * A stale notice is worse than none: it would claim the CURRENT answer was shortened. Both reset paths,
     * because `clearRecall` does not go through `runRecall`.
     *
     * EACH SLICE IS BOUNDED AT THE NEXT METHOD. The first version read from `runRecall` to the end of the file,
     * which also covered `clearRecall`'s reset — so deleting the one in `runRecall` still passed. A window that
     * runs past its subject asserts about whatever follows, and mutation testing is what surfaced it.
     */
    const between = (from: string, to: string) => {
      const a = component.indexOf(from);
      const b = component.indexOf(to, a + from.length);
      expect(a, `${from} not found`).toBeGreaterThan(-1);
      expect(b, `${to} not found after ${from}`).toBeGreaterThan(a);
      return component.slice(a, b);
    };
    expect(between('runRecall(): void', 'clearRecall(): void'))
      .toMatch(/this\.recallTruncated\.set\(null\);/);
    expect(between('clearRecall(): void', 'formatQueryDoc('))
      .toMatch(/this\.recallTruncated\.set\(null\);/);
  });

  it('renders the notice ABOVE the results, not below them', () => {
    /*
     * Ordering is the point rather than a detail. Below the list, the notice is found only by someone who has
     * already read to the end and drawn the wrong conclusion — which is the failure this fixes.
     */
    const notice = component.indexOf('recallTruncated(); as t');
    const resultsHeader = component.indexOf('query-results-header', component.indexOf('recallGroups().length'));
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(resultsHeader);
  });

  it('states BOTH guarantees, or "shortened" reads as "unreliable"', () => {
    // Every record whole, and the top of the ranking with no gap in the middle — the same two the userguide
    // states. Without them an operator cannot tell a shortened answer from a broken one.
    for (const l of LOCALES) {
      const t = locale(l);
      expect(t['brain.query.truncated.title']).toBeTruthy();
      expect(t['brain.query.truncated.body']).toBeTruthy();
      expect(t['brain.query.truncated.what']).toBeTruthy();
      expect(t['brain.query.truncated.title']).toContain('{{returned}}');
      expect(t['brain.query.truncated.title']).toContain('{{count}}');
    }
  });
});

describe('the size ceiling is reachable from the form', () => {
  it('the API method declares maxBytes', () => {
    expect(api).toMatch(/maxBytes\?: number;/);
  });

  it('and the other three units as well — the ceiling is one number in four currencies', () => {
    /*
     * **This assertion was the opposite, and the edit is deliberate.** It required `maxTokens` to be ABSENT,
     * because offering two overlapping numbers would make an operator work out which one won.
     *
     * That was right about two numbers with no stated rule and wrong as a conclusion. The server applies
     * whichever ceiling is SMALLEST, so the honest answer is to say that once and offer all four rather than
     * to hide three quarters of the parameter — which is what the owner's `U-1` instruction asks for in as
     * many words: *"one input field for EACH AND EVERY available option a recall has."*
     *
     * And bytes and characters are not interchangeable: treating them as one number ran a German or Polish
     * space about a quarter over its limit, which was a real bug (B-1). A UI that offers only bytes cannot
     * express the ceiling those operators actually want.
     */
    for (const unit of ['maxBytes', 'maxChars', 'maxTokens', 'charsPerToken']) {
      expect(api).toMatch(new RegExp(`${unit}\\?: number;`));
      expect(component).toMatch(new RegExp(`recallForm\\.${unit}`));
    }
    // And the one dependency between them is enforced rather than merely documented: charsPerToken
    // converts a token ceiling, so it is sent only when there is one.
    //
    // The first version of this line asserted that the source SAYS the server applies the smallest
    // ceiling — and `api` here is comment-STRIPPED, so it was asking for a fact that only exists in a
    // comment. A rule a caller reads is documentation; a rule a gate holds has to be behaviour.
    expect(component).toMatch(/maxTokens > 0 && this\.recallForm\.charsPerToken > 0/);
  });

  it('the form has the control, bound and defaulted to "unset"', () => {
    expect(component).toMatch(/maxBytes: 0,/);
    expect(component).toContain('recallForm.maxBytes');
  });

  it('zero is NOT sent — it would be a ceiling nobody chose', () => {
    // The server floor is 1000, so a literal 0 could not be honoured anyway; it is clamped. Sending it would put
    // a parameter in every request that means the opposite of what the operator left blank.
    expect(component).toMatch(/this\.recallForm\.maxBytes > 0 \? \{ maxBytes: this\.recallForm\.maxBytes \} : \{\}/);
  });

  it('every new key exists in all three locales', () => {
    // The reason this was not folded into the byte-budget PR: a key added to `en` alone fails the coverage spec
    // on the missing `de`/`pl` pair, and that is not a thing to discover inside a PR that is already red.
    const keys = [
      'brain.query.recallMaxBytes', 'brain.query.recallMaxBytes.tooltip', 'brain.query.recallMaxBytes.default',
      'brain.query.truncated.title', 'brain.query.truncated.body', 'brain.query.truncated.what',
    ];
    for (const l of LOCALES) {
      const t = locale(l);
      for (const k of keys) {
        expect(t[k], `${k} missing from ${l}.json`).toBeTruthy();
      }
    }
  });

  it('and no locale left a placeholder untranslated by copying the English', () => {
    // A copied string passes the coverage check and ships English to a German reader. Compared on the two
    // sentences long enough for a match to be meaningful rather than on a one-word label like "default".
    for (const k of ['brain.query.truncated.body', 'brain.query.recallMaxBytes.tooltip']) {
      expect(locale('de')[k]).not.toBe(locale('en')[k]);
      expect(locale('pl')[k]).not.toBe(locale('en')[k]);
    }
  });
});
