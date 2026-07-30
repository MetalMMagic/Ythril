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
 * So the invariant is narrower and much sharper:
 *
 *   1. **`.main` must never scroll horizontally.** The routed page must fit the width it is given.
 *   2. Anything overflowing with no horizontal scroller anywhere above it (genuinely clipped).
 *
 * Rule 1 catches both bugs the owner reported; rule 2 catches the clipped case that rule 1 cannot see.
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
 * Exit code is 1 when anything unreachable is found, so CI could adopt it later if the stack is up.
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

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const ctx = await browser.newContext(STATE ? { storageState: STATE } : {});
const page = await ctx.newPage();

let findings = 0;

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

    const hits = await page.evaluate(() => {
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

      const out = [];

      // Rule 1 — the routed page pane must fit its width. This is the one that catches the real bugs.
      const main = document.querySelector('.main');
      if (main && main.scrollWidth > main.clientWidth + 2) {
        out.push({
          tag: 'main', cls: 'PAGE PANE SCROLLS SIDEWAYS',
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
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
          over: el.scrollWidth - el.clientWidth,
          box: el.clientWidth,
        });
      }
      // A clipped child inside a clipped parent is one problem, not two — report the worst few.
      return out.sort((a, b) => b.over - a.over).slice(0, 6);
    });

    if (!hits.length) continue;
    findings += hits.length;
    console.log(route);
    for (const f of hits) console.log(`    ${f.tag}.${f.cls || '(no class)'} — ${f.over}px past a ${f.box}px box`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sweep-${route.replace(/\//g, '_')}-${w}.png` });
  }
}

await browser.close();
console.log(`\nunreachable-overflow findings: ${findings}`);
process.exit(findings ? 1 : 0);
