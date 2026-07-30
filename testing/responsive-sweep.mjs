/**
 * Responsive sweep — find content the user cannot reach at narrow window sizes.
 *
 * ## Why this exists
 *
 * The owner reported (2026-07-29) that tables and tab strips were cut off in a small window. The cause
 * was a single missing `min-width: 0` on the shell's `.main`: a flex item defaults to `min-width: auto`
 * and refuses to shrink below its content, so wide content overflowed it and the ancestor's
 * `overflow: hidden` **clipped** the overflow. No scrollbar, no error, no failing test — the right-hand
 * columns and the last tabs were simply absent. Fixed in PR #534.
 *
 * **That class of bug is invisible to every check this repo has.** It does not exist in the stylesheet
 * (the offending property is a default), it does not throw, and the unit tests render in jsdom, which
 * computes no layout at all. It only exists in a real browser at a real width — so the only honest way
 * to look for it is to open the app narrow and measure.
 *
 * ## What it reports, and why the obvious invariant is the wrong one
 *
 * The first version of this file looked for *unreachable* content — overflowing with no scrollable
 * ancestor. Mutation-testing it against the real pre-#534 code showed it reported **zero findings on the
 * broken build**, which is the worst possible outcome for a check: confident silence.
 *
 * The reason is instructive. `.main` carries `overflow-y: auto`, and CSS computes the other axis to
 * `auto` too — so `.main` is a horizontal scroller. Nothing inside it is ever strictly unreachable; you
 * *can* scroll to the missing table columns. What actually happens is that **the entire page pane slides
 * sideways** — filter bars, headings and all — which is what "cut off" looks like to a user, and it is a
 * bug whether or not the pixels are technically reachable.
 *
 * So the invariants are narrower and much sharper:
 *
 *   1. **`.main` must never scroll horizontally.** The routed page must fit the width it is given.
 *   2. Anything overflowing with no horizontal scroller anywhere above it (genuinely clipped).
 *   3. **A scroller that overflows must show a scroll affordance the user can SEE.**
 *
 * ## Rule 3, and the two bugs that motivated it
 *
 * Rules 1 and 2 both passed on code the owner rejected twice, because "reachable" is not the same as
 * "discoverable":
 *
 *   - **#548.** Brain → Entities was scrollable the entire time. Its scrollbar sat at the bottom of the
 *     table's own box, measured ~2800px below the fold at a 900px viewport. Reachable, and no one could
 *     find it.
 *   - **#551, first attempt.** A mirrored native scroller placed directly above the table. Correct
 *     position, and *invisible*: this platform uses OVERLAY scrollbars, which paint only while scrolling
 *     and take no layout space — `offsetHeight - clientHeight === 0`. It measured present and correct
 *     and a screenshot showed nothing at all.
 *
 * The same shape had already bitten a tab strip that scrolled while showing 5 of 10 tabs. So rule 3 asks
 * the only question that distinguishes those states: is there something with non-zero size that a person
 * would see? Either a native scrollbar thick enough to render, or the drawn `.hscroll-top` control with a
 * real thumb. A finding here means "the content is reachable and nothing says so".
 *
 * ## Tabbed content
 *
 * The earlier version visited `/brain` and never clicked a tab. Every Brain tab body is behind
 * `@if (activeTab() === …)`, so the tables #548 was about **were not in the DOM** when it measured — it
 * was reporting on a page whose content it had never loaded. It now walks each tab strip it finds, and
 * one level of sub-strip (Review's sub-tabs, the file-detail segmented control), measuring each.
 *
 * ## Usage
 *
 *   1. Boot an isolated instance and the client dev server (see `.claude/skills/verify`).
 *   2. `npm i playwright` somewhere, then:
 *      `BASE=http://localhost:4260 STATE=/path/to/state.json node testing/responsive-sweep.mjs`
 *
 * It needs a running instance, so it is deliberately NOT a preflight gate — preflight is the offline
 * half. Run it when touching layout, and after any change to the shell.
 *
 * Exit code is 1 when anything is found, so CI could adopt it later if the stack is up.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4260';
const STATE = process.env.STATE;          // storageState json from an authenticated session
const SHOTS = process.env.SHOTS;          // optional dir for screenshots of offending pages

const ROUTES = (process.env.ROUTES ?? [
  '/brain', '/graph', '/files', '/files/conflicts', '/schema-library',
  '/settings/tokens', '/settings/spaces', '/settings/storage', '/settings/networks',
  '/settings/preferences', '/settings/audit-log', '/settings/data', '/settings/webhooks',
  '/settings/about', '/settings/help', '/settings/media-processing',
].join(',')).split(',');

/** Widths worth checking: a narrow desktop window, and a phone. */
const VIEWPORTS = [[600, 900], [420, 900]];

/** Every tab-strip flavour in the app: Brain's `.tabs`, and anything using the ARIA role. */
const TAB_SELECTOR = '.tabs .tab, [role="tab"]';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const ctx = await browser.newContext(STATE ? { storageState: STATE } : {});
const page = await ctx.newPage();

let findings = 0;

/**
 * Measure the current DOM. Runs in page context; returns the worst few findings.
 *
 * Pulled out of the route loop so it can run again after every tab click — the tab bodies are the
 * content this sweep exists to look at, and they only exist once their tab is active.
 */
const measure = () => page.evaluate(() => {
  const scrollsX = el => {
    const s = getComputedStyle(el);
    return s.overflowX === 'auto' || s.overflowX === 'scroll';
  };
  /**
   * `overflow-x: auto` is NOT enough to call something reachable.
   *
   * An element can advertise auto and still be unable to scroll, because a `overflow: hidden`
   * ancestor is clipping it before it ever gets the chance. That is the exact shape of the bug this
   * file was written for, and the first version of this check missed it: `.main` computes
   * `overflow-x: auto` (a side effect of its `overflow-y: auto`), so every descendant looked
   * reachable while `.layout` quietly clipped the lot.
   *
   * So a scroller only counts if it is not itself being clipped horizontally by a hidden ancestor.
   */
  const clippedByHiddenAncestor = el => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowX === 'hidden' && n.scrollWidth > n.clientWidth + 2) return true;
      if (s.overflowX === 'auto' || s.overflowX === 'scroll') return false;  // a real scroller above
    }
    return false;
  };
  /**
   * Visually-hidden text is CLIPPED ON PURPOSE — the standard sr-only recipe is a 1px box with
   * `overflow: hidden`, which trips the same measurement. Excluded by shape rather than by class
   * name, so a page that rolls its own sr-only span is not reported either.
   */
  const isVisuallyHidden = el => el.clientWidth <= 2 || el.clientHeight <= 2;

  const describe = el =>
    `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').slice(0, 60) || '(no class)'}`;

  const out = [];

  // Rule 1 — the routed page pane must fit its width. This is the one that catches the real bugs.
  const main = document.querySelector('.main');
  if (main && main.scrollWidth > main.clientWidth + 2) {
    out.push({
      what: 'main', why: 'PAGE PANE SCROLLS SIDEWAYS',
      over: main.scrollWidth - main.clientWidth, box: main.clientWidth,
    });
  }

  // Rule 2 — genuinely clipped content, which rule 1 cannot see.
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollWidth <= el.clientWidth + 2) continue;
    if (isVisuallyHidden(el)) continue;
    let reachable = false;
    for (let n = el; n; n = n.parentElement) {
      if (scrollsX(n) && !clippedByHiddenAncestor(n)) { reachable = true; break; }
    }
    if (reachable) continue;
    out.push({ what: describe(el), why: 'CLIPPED — no scroller above it', over: el.scrollWidth - el.clientWidth, box: el.clientWidth });
  }

  // Rule 3 — reachable, but is there anything a person would SEE that says so?
  for (const el of document.querySelectorAll('body *')) {
    if (!scrollsX(el)) continue;
    if (el.scrollWidth <= el.clientWidth + 2) continue;       // fits: no affordance needed
    if (isVisuallyHidden(el)) continue;
    if (el.clientWidth < 120) continue;                        // too small to be a content scroller
    if (el.classList.contains('main')) continue;               // rule 1 owns this one

    // A native scrollbar only counts if it actually takes layout space. Overlay scrollbars — this
    // platform's default — report zero here, which is precisely the invisible case.
    const nativeBarPx = el.offsetHeight - el.clientHeight;

    // The drawn control the `hscrollTop` directive inserts immediately BEFORE its host.
    const prev = el.previousElementSibling;
    const track = prev && prev.classList.contains('hscroll-top') ? prev : null;
    const thumb = track ? track.querySelector('.hscroll-top-thumb') : null;
    let drawnVisible = false;
    if (track && thumb) {
      const t = track.getBoundingClientRect();
      const b = thumb.getBoundingClientRect();
      drawnVisible = getComputedStyle(track).display !== 'none'
        && t.width > 0 && t.height >= 3
        && b.width > 0 && b.height >= 3;
    }

    if (nativeBarPx >= 4 || drawnVisible) continue;

    out.push({
      what: describe(el),
      why: track ? 'SCROLLS — control present but not visible' : 'SCROLLS — no visible affordance',
      over: el.scrollWidth - el.clientWidth, box: el.clientWidth,
    });
  }

  // A clipped child inside a clipped parent is one problem, not two — report the worst few.
  return out.sort((a, b) => b.over - a.over).slice(0, 6);
});

const report = (label, hits) => {
  if (!hits.length) return false;
  findings += hits.length;
  console.log(label);
  for (const f of hits) console.log(`    ${f.what} — ${f.why} (${f.over}px past a ${f.box}px box)`);
  return true;
};

const shoot = async (label, w) => {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/sweep-${label.replace(/[^a-z0-9]+/gi, '_')}-${w}.png` });
};

/**
 * Click through a tab strip, measuring each panel.
 *
 * Re-queries by index on every iteration rather than holding element handles: activating a tab
 * re-renders the strip, and a stale handle would either throw or click the wrong control. Recursion is
 * capped at one extra level, which covers Review's sub-tabs and the file-detail segmented control
 * without wandering into dialogs.
 */
async function sweepTabs(routeLabel, w, depth = 0) {
  const count = await page.locator(TAB_SELECTOR).count();
  if (count === 0 || depth > 1) return;

  for (let i = 0; i < count; i++) {
    const tab = page.locator(TAB_SELECTOR).nth(i);
    let label = '';
    try {
      label = ((await tab.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
      await tab.click({ timeout: 3_000 });
    } catch {
      continue;   // a tab that vanished when a sibling was activated is not a finding
    }
    await page.waitForTimeout(450);   // deferred blocks and the first data fetch

    const panelLabel = `${routeLabel} > ${label || `tab#${i}`}`;
    if (report(panelLabel, await measure())) await shoot(panelLabel, w);

    // Sub-strips only: if activating this tab revealed MORE tabs than the strip we are walking.
    if (depth === 0 && (await page.locator(TAB_SELECTOR).count()) > count) {
      await sweepTabs(panelLabel, w, depth + 1);
    }
  }
}

for (const [w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h });
  console.log(`\n===== ${w}x${h} =====`);

  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 25_000 });
    } catch {
      console.log(`${route}  — load timed out, skipped`);
      continue;
    }
    await page.waitForTimeout(700);   // let deferred blocks and async data settle

    if (report(route, await measure())) await shoot(route, w);
    await sweepTabs(route, w);
  }
}

await browser.close();
console.log(`\nfindings: ${findings}`);
process.exit(findings ? 1 : 0);
