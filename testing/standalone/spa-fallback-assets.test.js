/**
 * Standalone tests: the SPA fallback must not answer a missing BUILD ASSET with index.html.
 *
 * The failure this pins, observed live on 2026-07-21: after updating an instance, clicking a lazy route
 * in an already-open tab did nothing — no message, no network entry, just
 * `TypeError: error loading dynamically imported module: /chunk-FQS44RLV.js` in the console.
 *
 * Every Angular build rehashes its lazy-chunk filenames, so a tab still running the previous `main-*.js`
 * asks for chunks that no longer exist. The server answered those with `200 text/html` — the SPA fallback
 * handing back index.html — so the browser received HTML where it had asked for JavaScript, and nothing
 * on either side could tell "your build is stale" from "this is a page".
 *
 * A missing asset has to be a 404. The client turns that into a one-shot reload
 * (client/src/app/core/stale-build-recovery.ts); it cannot do that if the server pretends the file exists.
 *
 * Run: node --test testing/standalone/spa-fallback-assets.test.js
 * Pre-requisite: the test stack (`npm run test:up`) — these assert against a running instance.
 *
 * @needs-instance — drives a live server on :3200; runs in CI, skipped by preflight.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { INSTANCES } from '../sync/helpers.js';

const BASE = INSTANCES.a;

/** Filenames shaped like build output — what a stale bundle asks for. */
const MISSING_ASSETS = [
  '/chunk-FQS44RLV.js',           // the exact shape that broke the live instance
  '/main-DEADBEEF.js',
  '/styles-CAFEBABE.css',
  '/media/some-font-ABCDEF12.woff2',
  '/polyfills-00000000.js.map',
];

/** Paths the Angular router owns — these MUST still receive index.html so deep links work. */
const NAVIGATION_PATHS = ['/settings/models', '/settings/spaces', '/brain', '/some/deep/link'];

describe('SPA fallback — build assets vs navigation', () => {
  before(async () => {
    const health = await fetch(`${BASE}/health`);
    assert.equal(health.status, 200, 'test stack must be running (npm run test:up)');
  });

  for (const path of MISSING_ASSETS) {
    it(`404s a missing build asset: ${path}`, async () => {
      const res = await fetch(`${BASE}${path}`);
      assert.equal(
        res.status,
        404,
        `${path} must 404 — answering with index.html is what made a stale tab fail silently`,
      );
      assert.ok(
        !(res.headers.get('content-type') ?? '').includes('text/html'),
        `${path} must not return HTML: the browser asked for a script`,
      );
    });
  }

  for (const path of NAVIGATION_PATHS) {
    it(`still serves the SPA for a navigation path: ${path}`, async () => {
      const res = await fetch(`${BASE}${path}`);
      assert.equal(res.status, 200, `${path} is a client route and must load the app`);
      assert.match(
        res.headers.get('content-type') ?? '',
        /text\/html/,
        `${path} must return index.html so the Angular router can take over`,
      );
    });
  }

  it('keeps returning JSON 404s for unknown API paths', async () => {
    const res = await fetch(`${BASE}/api/definitely-not-a-route`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  });

  it('still serves an asset that DOES exist', async () => {
    // Guard against over-correcting into 404ing the whole build: index.html references the real bundle.
    const index = await fetch(`${BASE}/`);
    const html = await index.text();
    const main = /(?:src|href)="\/?(main-[A-Za-z0-9]+\.js)"/.exec(html)?.[1];
    assert.ok(main, `could not find the main bundle in index.html: ${html.slice(0, 200)}`);
    const res = await fetch(`${BASE}/${main}`);
    assert.equal(res.status, 200, `${main} exists and must still be served`);
  });
});
