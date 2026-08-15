/**
 * Nothing is mounted at `/setup`, so the SPA's own first-run page is reachable.
 *
 * ## Deprecation 1.5, and why it waited three releases
 *
 * `setupRouter` was mounted twice: at `/api/setup`, which is what the SPA polls for `configExists()`, and
 * again at `/setup`, which served a server-rendered HTML form and `404`ed once configured. Express matches a
 * mount before the SPA's index fallback, so the second line made the Angular `/setup` route **unreachable**.
 * The legacy form was the live first-run path and the SPA's own page had never served one.
 *
 * It was kept "for non-SPA access" from before the SPA existed. Removing it is one line, and the risk is why
 * it waited: this is the unauthenticated boot path, and getting it wrong means an instance nobody can set up.
 *
 * ## The two pages were NOT the same flow, which is what the proof found
 *
 * The legacy form asked for a label and nothing else. The SPA page asks for a label, a settings password and
 * a confirmation, and keeps its submit disabled until all three are filled. So "the SPA route exists" was
 * never evidence that removing the mount was safe — it collects different information and posts a different
 * body.
 *
 * ## What was proven, end to end, against a genuine first run
 *
 * Config deleted and the database dropped, then through a browser at `/setup`:
 *
 *     GET /setup                  ->  200, and the response is the SPA shell, not the form
 *     app-root present            ->  true
 *     password fields             ->  2   (the legacy form had 0)
 *     setup completes             ->  a token appears after ~15s
 *     GET /api/setup/status       ->  configured: false  ->  true
 *     the issued token            ->  200 on /api/tokens/me and /api/spaces
 *
 * The 15 seconds matter and are the reason this is not a five-second check: the first boot creates the
 * default space and starts an index build, so the page sits on "Setting up…" for a while. A shorter wait
 * reports NO TOKEN and looks exactly like the failure this test exists to catch.
 *
 * ## What this file can assert, and what it cannot
 *
 * A browser first-run cannot run here — that is the `verify` skill's scratch instance, and the recipe is in
 * `scratchpad/verify/firstrun.mjs`. What is gated here is the thing that regresses silently: the mount coming
 * back. A re-added `app.use('/setup', …)` would restore the shadow with no test failing anywhere else,
 * because every other suite reaches setup through `/api/setup`.
 *
 * Run: node --test testing/standalone/setup-does-not-shadow-the-spa.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = 'server/src/app.ts';
/** Line comments first, then block — a block-open inside a line comment otherwise swallows real code. */
const strip = (src) => src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the SPA owns /setup', () => {
  const src = strip(readFileSync(APP, 'utf8'));

  it('mounts the setup router on the API path only', () => {
    const mounts = [...src.matchAll(/app\.use\(\s*'([^']*setup[^']*)'/g)].map(m => m[1]);
    assert.deepEqual(mounts, ['/api/setup'],
      `only /api/setup may be mounted; found ${JSON.stringify(mounts)} — a '/setup' mount shadows the SPA route`);
  });

  it('still serves the JSON API the SPA depends on', () => {
    // The other direction: removing the shadow must not remove the endpoint the setup page polls. Without
    // `/api/setup/status` the SPA cannot tell a first run from a configured instance at all.
    assert.match(src, /app\.use\(\s*'\/api\/setup'\s*,\s*setupRouter\s*\)/);
    const routes = strip(readFileSync('server/src/setup/routes.ts', 'utf8'));
    assert.match(routes, /setupRouter\.get\('\/status'/, 'the SPA polls /api/setup/status');
  });

  it('the router still refuses a second setup once configured', () => {
    // The guard that makes an unauthenticated route safe at all. It is unchanged by this removal, and it is
    // the one thing that must not be lost while moving the entry point.
    const routes = strip(readFileSync('server/src/setup/routes.ts', 'utf8'));
    assert.match(routes, /configExists\(\)/, 'setup must still be first-run only');
  });
});
