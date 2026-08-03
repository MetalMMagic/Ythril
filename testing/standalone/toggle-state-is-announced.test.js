/**
 * A control whose selected state is visible must also be announced.
 *
 * ## The finding — Accessibility & Internationalization audit lens
 *
 * **39 buttons conveyed their selected state through a CSS class alone; 3 carried an ARIA state.** For a screen-reader
 * user that means the current view is simply not there: on the Brain page — the product's primary navigation — none of
 * the eight tabs was marked selected, so which one you were on was visible and unannounced.
 *
 * It is a consistency gap rather than a design question, because the codebase already had the right pattern.
 * `review-tab.component.ts`:
 *
 *     <nav class="tabs" role="tablist" [attr.aria-label]="'review.title' | transloco">
 *       <button class="tab" role="tab" [class.active]="sub() === t" [attr.aria-selected]="sub() === t" …>
 *
 * ## Fixed here, and what is left
 *
 * The three highest-impact groups: the **Brain tab strip** (6 buttons, primary navigation), the **schema-library page
 * tabs**, and the **graph toolbar** (`aria-pressed` on the direction/label toggles, `aria-current` on the space chips —
 * a single-select set is not a set of independent toggles).
 *
 * **25 remain, in 8 files, and they are enumerated below rather than described.** The allowlist is the point: it makes
 * the debt finite and visible, a NEW control cannot skip ARIA, and no listed file may get worse. It can only shrink.
 * Recording the count honestly beats a gate that passes because it only looks where the work was already done.
 *
 * Run: node --test testing/standalone/toggle-state-is-announced.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Known gaps, by path, with the exact number of buttons still missing an ARIA state.
 *
 * Keyed on the full path, not the basename: two different components are called `schema-library.component.ts`.
 */
const KNOWN_GAPS = {
  'client/src/app/pages/settings/spaces.component.ts': 11,
  'client/src/app/pages/settings/space-schema-tab.component.ts': 4,
  'client/src/app/pages/schema-library/schema-library.component.ts': 2,
  'client/src/app/pages/settings/media-processing/pipelines-tab.component.ts': 2,
  'client/src/app/shared/entity-search.component.ts': 2,
  'client/src/app/shared/properties-view.component.ts': 2,
  'client/src/app/pages/brain/brain.component.ts': 1,
  'client/src/app/pages/settings/preferences.component.ts': 1,
};

function clientSources(dir = join('client', 'src', 'app'), out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) clientSources(p, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const HAS_ACTIVE_CLASS = /<button[^>]*\[class\.(?:active|selected|on)\][^>]*>/g;
const HAS_ARIA_STATE = /aria-selected|aria-pressed|aria-current/;

/** path (forward slashes) → count of state-bearing buttons with no ARIA state. */
function gaps() {
  const out = {};
  for (const f of clientSources()) {
    const hits = [...readFileSync(f, 'utf8').matchAll(HAS_ACTIVE_CLASS)].filter(m => !HAS_ARIA_STATE.test(m[0]));
    if (hits.length) out[f.split('\\').join('/')] = hits.length;
  }
  return out;
}

describe('the sweep works before it is trusted', () => {
  it('sees the client and finds state-bearing buttons at all', () => {
    const files = clientSources();
    assert.ok(files.length > 100, `expected the client tree, found ${files.length} files`);
    const total = files.reduce(
      (n, f) => n + [...readFileSync(f, 'utf8').matchAll(HAS_ACTIVE_CLASS)].length, 0);
    assert.ok(total >= 30, `expected the toggle/tab buttons, found ${total} — has the pattern changed?`);
  });
});

describe('no NEW control conveys its state by CSS alone', () => {
  it('every file with a gap is a known one', () => {
    const unknown = Object.keys(gaps()).filter(f => !(f in KNOWN_GAPS));
    assert.deepEqual(unknown, [], 'these have a button whose selected state is conveyed by a CSS class only, so a '
      + 'screen reader announces nothing. Add [attr.aria-selected] for a tab, [attr.aria-pressed] for a toggle, or '
      + `[attr.aria-current] for one item in a single-select set:\n  ${unknown.join('\n  ')}`);
  });

  it('no known gap gets worse', () => {
    // The allowlist is a ceiling, never a licence. Adding one more unannounced button to a listed file is the same
    // defect as adding the first one to a clean file.
    const now = gaps();
    const worse = [];
    for (const [f, ceiling] of Object.entries(KNOWN_GAPS)) {
      const count = now[f] ?? 0;
      if (count > ceiling) worse.push(`${f}: ${count}, allowed ${ceiling}`);
    }
    assert.deepEqual(worse, [], `these regressed:\n  ${worse.join('\n  ')}`);
  });

  it('a fixed file is removed from the list rather than left as slack', () => {
    // Otherwise the allowlist stops describing reality and quietly permits a regression later.
    const now = gaps();
    const stale = Object.keys(KNOWN_GAPS).filter(f => (now[f] ?? 0) === 0);
    assert.deepEqual(stale, [], 'these are fixed — delete them from KNOWN_GAPS so the list keeps meaning what it '
      + `says:\n  ${stale.join('\n  ')}`);
  });

  it('the remaining debt is going DOWN', () => {
    // A single number, checked, so "we will get to it" cannot drift upward unnoticed.
    const total = Object.values(gaps()).reduce((a, b) => a + b, 0);
    assert.ok(total <= 25, `${total} controls still convey state by CSS alone; the recorded ceiling is 25`);
  });
});

describe('the groups fixed here stay fixed', () => {
  it('the Brain tab strip is a labelled tablist with selected state', () => {
    // The product's primary navigation. Eight views, and which one you were on was unannounced.
    const src = readFileSync(join('client', 'src', 'app', 'pages', 'brain', 'brain.component.ts'), 'utf8');
    const at = src.indexOf('<div class="tabs"');
    assert.ok(at > 0, 'the Brain tab strip is gone — re-anchor this gate');
    const strip = src.slice(at, src.indexOf('</div>', at));
    assert.match(src.slice(at, at + 200), /role="tablist"/, 'the strip must be a tablist');
    assert.match(src.slice(at, at + 200), /aria-label/, 'a tablist needs a name');
    const tabs = [...strip.matchAll(/<button class="tab"[^>]*>/g)];
    assert.ok(tabs.length >= 5, `expected the tab buttons, found ${tabs.length}`);
    const silent = tabs.filter(m => !/aria-selected/.test(m[0])).length;
    assert.equal(silent, 0, `${silent} Brain tab(s) still do not report aria-selected`);
  });

  it('the graph toolbar distinguishes a toggle from a single-select set', () => {
    // `aria-pressed` on independent toggles; `aria-current` on the space chips, where exactly one is active.
    // Using pressed for both would tell a screen reader that several spaces are simultaneously on.
    const src = readFileSync(join('client', 'src', 'app', 'pages', 'graph', 'graph.component.ts'), 'utf8');
    assert.match(src, /aria-pressed/, 'the direction/label toggles must report pressed state');
    assert.match(src, /aria-current/, 'the space chips are a single-select set, so aria-current is the right one');
  });

  it('the pattern this copied is still there to copy', () => {
    const src = readFileSync(join('client', 'src', 'app', 'pages', 'brain', 'review-tab.component.ts'), 'utf8');
    assert.match(src, /role="tablist"/, 'review-tab was the reference implementation');
    assert.match(src, /aria-controls/,
      'review-tab also wires aria-controls to its panel — the next pass should bring the others up to that');
  });
});
