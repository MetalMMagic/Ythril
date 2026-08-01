/**
 * What goes over the wire, and how many times.
 *
 * ## The findings (lens 4, Performance)
 *
 * Nothing was compressed. `client/dist/browser` is **5.83 MiB** of JS/CSS/HTML and **1.64 MiB** gzipped — a
 * 72% saving, 4.19 MiB per cold load — and there was no `compression` middleware anywhere. This is a product
 * where the Node process IS the web server, so there is no reverse proxy to assume was doing it.
 *
 * And `express.static(clientDist)` took no options, so 163 content-hashed files carried no `Cache-Control` at
 * all and revalidated on every navigation, despite their filenames containing a content hash.
 *
 * ## Why these are unit tests over pure functions
 *
 * Both decisions have a WRONG answer that produces no error:
 *
 *   - compressing `text/event-stream` makes a live stream buffer, so events arrive in bursts or only at
 *     close. Every test that asks "did the event arrive" still passes, eventually.
 *   - caching `index.html` pins a browser to chunk hashes that no longer exist — the exact failure the
 *     SPA-fallback comment in `app.ts` was written for — and caching `assets/i18n/*.json` for a year leaves a
 *     user reading last release's German.
 *
 * Neither is visible in a response-code check, so the rules are functions and these assert them directly.
 *
 * Run: node --test testing/standalone/transfer-headers.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let staticCacheControl, shouldCompress, IMMUTABLE_MAX_AGE_SECONDS;

/** Minimal express-ish response: only the header access the filter performs. */
function res(headers = {}) {
  const h = new Map(Object.entries(headers));
  return { getHeader: (k) => h.get(k), setHeader: (k, v) => h.set(k, v) };
}

describe('transfer — cache headers and the compression filter', () => {
  before(async () => {
    ({ staticCacheControl, shouldCompress, IMMUTABLE_MAX_AGE_SECONDS } =
      await import('../../server/dist/util/transfer.js'));
  });

  describe('staticCacheControl', () => {
    it('marks content-hashed chunks immutable for a year', () => {
      for (const f of ['main-A1B2C3D4.js', 'chunk-ZFTNOQXJ.js', 'styles-5IMT3BWC.css',
        '/app/client/dist/browser/chunk-4YGO2JET.js']) {
        const cc = staticCacheControl(f);
        assert.match(cc, /immutable/, f);
        assert.match(cc, new RegExp(`max-age=${IMMUTABLE_MAX_AGE_SECONDS}`), f);
      }
    });

    it('NEVER caches index.html — it is what names the current chunk hashes', () => {
      // Cache this and a browser asks for chunks that were deleted by the next build. The SPA fallback
      // comment in app.ts exists because of that exact loop.
      assert.equal(staticCacheControl('index.html'), 'no-cache');
      assert.equal(staticCacheControl('/app/client/dist/browser/index.html'), 'no-cache');
    });

    it('does not cache UNHASHED assets — translations change every release', () => {
      for (const f of ['assets/i18n/de.json', 'assets/logo.svg', 'favicon.ico', 'prerendered-routes.json']) {
        assert.equal(staticCacheControl(f), 'no-cache', f);
      }
    });

    it('does not mistake a short suffix for a content hash', () => {
      // `-min.js` or `-v2.css` are names, not hashes. Caching them for a year would be permanent.
      assert.equal(staticCacheControl('vendor-min.js'), 'no-cache');
      assert.equal(staticCacheControl('theme-v2.css'), 'no-cache');
    });
  });

  describe('shouldCompress', () => {
    const yes = () => true;

    it('refuses to compress an event stream, whatever the default says', () => {
      // `compressible` considers text/event-stream compressible, and a compressor holds bytes back until it
      // can emit a block — so SSE stops being live and nothing reports it.
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'text/event-stream' }), yes), false);
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'text/event-stream; charset=utf-8' }), yes), false);
    });

    it('refuses a body that is already encoded', () => {
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }), yes), false);
    });

    it('honours an explicit opt-out header', () => {
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'application/json', 'X-No-Compression': '1' }), yes), false);
    });

    it('otherwise defers to the library default — it decides by content type, and we do not repeat that table', () => {
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'application/json' }), yes), true);
      assert.equal(shouldCompress({}, res({ 'Content-Type': 'image/png' }), () => false), false,
        'a JPEG/PNG must stay uncompressed, and that call belongs to `compressible`');
    });

    it('does not throw when a response has no Content-Type yet', () => {
      // The filter runs before headers are flushed, so an absent type is normal, not an error.
      assert.equal(shouldCompress({}, res({}), yes), true);
    });
  });
});
