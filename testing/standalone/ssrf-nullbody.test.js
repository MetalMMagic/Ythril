/**
 * Regression: `ssrfSafeFetch` must reconstruct null-body statuses (204/205/304) without throwing.
 *
 * The real (non-injected) path buffers the body and returns `new Response(buf, { status })` so it can
 * close the pinned undici agent before returning. But 204/205/304 are null-body statuses — the Response
 * constructor throws if handed ANY body, even an empty buffer. A peer's `/api/notify` returns 204, so
 * routing those calls through `ssrfSafeFetch` (PR: SSRF egress call-sites) surfaced this: the throw was
 * swallowed into a warning, flipping the network-DELETE response from 204 to 200.
 *
 * The existing ssrf-hardening tests inject a `fetchImpl`, which returns the upstream Response directly and
 * NEVER exercises the reconstruction branch — so this bug was invisible to them. This test drives the REAL
 * undici pinned-agent path by pointing a fake hostname (via injected `lookup`) at a server bound on a
 * non-loopback private IP (loopback is a crown-jewel address and is always blocked, even with allowPrivate).
 *
 * Run: node --test testing/standalone/ssrf-nullbody.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import { ssrfSafeFetch } from '../../server/dist/util/ssrf.js';

const lanIp = Object.values(os.networkInterfaces()).flat()
  .find(a => a && a.family === 'IPv4' && !a.internal)?.address;

describe('ssrfSafeFetch — real undici path reconstructs null-body statuses', () => {
  it('returns 204 without throwing, and preserves a 200 body', async (t) => {
    if (!lanIp) { t.skip('no non-loopback IPv4 to bind a reachable private target'); return; }

    const server = http.createServer((req, res) => {
      if (req.url === '/notify') { res.writeHead(204); res.end(); return; }        // null-body status
      res.writeHead(200, { 'content-type': 'text/plain' }); res.end('hello');       // body must survive
    });
    await new Promise(r => server.listen(0, '0.0.0.0', r));
    const port = server.address().port;
    // Resolve the fake peer hostname to the bound private IP; allowPrivate lets a 10/172/192 target pass.
    const lookup = async () => [{ address: lanIp, family: 4 }];

    try {
      const r204 = await ssrfSafeFetch(`http://peer.test:${port}/notify`, {}, { allowPrivate: true, lookup });
      assert.equal(r204.status, 204, 'a 204 upstream must round-trip as 204, not throw');
      assert.equal(await r204.text(), '', '204 has no body');

      const r200 = await ssrfSafeFetch(`http://peer.test:${port}/ok`, {}, { allowPrivate: true, lookup });
      assert.equal(r200.status, 200);
      assert.equal(await r200.text(), 'hello', 'the reconstruction path must preserve a real body');
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
