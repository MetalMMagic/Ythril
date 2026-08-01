/**
 * What goes over the wire, and how many times.
 *
 * Two decisions that were never made, both measured before being changed:
 *
 * 1. **Nothing was compressed.** `client/dist/browser` is **5.83 MiB** of JS/CSS/HTML and **1.64 MiB**
 *    gzipped — a 72% saving, 4.19 MiB per cold load. There was no `compression` middleware anywhere, and
 *    this is a self-hosted product where the Node process IS the web server: there is no reverse proxy to
 *    assume. JSON responses compress in the same range and are on every interaction, not just the first.
 *
 * 2. **Content-hashed assets carried no `Cache-Control`.** `express.static(clientDist)` took no options, so
 *    163 hashed files got ETag/Last-Modified only and revalidated on every navigation. The filenames already
 *    carry a content hash, which is the precondition `immutable` exists for.
 *
 * Both decisions live here as pure functions because both have a wrong answer that is silent: compressing an
 * event stream makes it buffer (SSE stops being live, and nothing errors), and caching `index.html` pins a
 * browser to chunk hashes that no longer exist — the failure the SPA-fallback comment in `app.ts` already
 * describes. A function can be tested; a middleware option buried in a call cannot.
 */
import type { Request, Response } from 'express';

/** Angular's content-hashed build output: `main-A1B2C3D4.js`, `chunk-ZFTNOQXJ.js`, `styles-XXXXXXXX.css`. */
const HASHED_ASSET = /-[A-Za-z0-9_]{8,}\.(?:js|css)$/;

/** A year, the conventional ceiling for `max-age` (RFC 9111 does not cap it, but longer means nothing). */
export const IMMUTABLE_MAX_AGE_SECONDS = 31_536_000;

/**
 * The `Cache-Control` value for one static file.
 *
 * `immutable` ONLY for names that carry a content hash. Everything else is `no-cache`, which does not mean
 * "do not store" — it means revalidate before use, so a client still gets a 304 for unchanged bytes while
 * never serving a stale `index.html` or a stale translation bundle from cache.
 *
 * `assets/i18n/*.json` is the case that makes the distinction load-bearing: those files are NOT hashed, they
 * change every release, and a year of `immutable` would leave a user reading last release's German.
 */
export function staticCacheControl(filePath: string): string {
  return HASHED_ASSET.test(filePath)
    ? `public, max-age=${IMMUTABLE_MAX_AGE_SECONDS}, immutable`
    : 'no-cache';
}

/**
 * Should this response be compressed?
 *
 * Delegates to `compression`'s own default for the ordinary cases and refuses in the two that matter:
 *
 * - **`text/event-stream`.** `compressible` says event streams are compressible, and technically they are —
 *   but a compressor holds bytes back until it has enough to emit a block, so events arrive in bursts or not
 *   at all until the connection closes. A live stream that is silently no longer live is the worst kind of
 *   regression, because every test that checks "did the event arrive" still passes eventually.
 * - **An already-encoded body.** A response that sets `Content-Encoding` itself (a pre-compressed artefact,
 *   a proxied upstream) must not be wrapped again.
 */
export function shouldCompress(
  req: Request,
  res: Response,
  fallback: (req: Request, res: Response) => boolean,
): boolean {
  const type = String(res.getHeader('Content-Type') ?? '');
  if (type.includes('text/event-stream')) return false;
  if (res.getHeader('Content-Encoding')) return false;
  // A caller can opt one response out without reaching into this filter.
  if (res.getHeader('X-No-Compression')) return false;
  return fallback(req, res);
}
