/**
 * Reindexing a PROXY space is a 400 that names its members, not a 200 that does the work twice.
 *
 * ## What happened
 *
 * `POST /api/brain/spaces/<proxy>/reindex` answered `200 {"status":"started"}` and then re-embedded the member
 * spaces — which the caller was also reindexing individually, because they are in the same space list. So
 * everything under the proxy was embedded twice. It is idempotent, so nothing broke: on the reporting
 * operator's largest instance it was simply the longest job of the run, and all of it was waste.
 *
 * It is also inconsistent with the rest of the model. A WRITE to a proxy already requires an explicit
 * `targetSpace`, because a proxy is not a place records live. Accepting one here without comment was the odd
 * one out.
 *
 * ## One half of their report was wrong, and it is worth recording which
 *
 * They wrote that the caller *"cannot avoid it: `GET /api/spaces` returns ids with no indication of which are
 * proxies."* It does return one — `proxyFor` is on the list projection whenever a space has it, and this test
 * pins that, because it is the field a client would branch on and the reason the refusal can be actionable.
 *
 * Their conclusion still held: a 200 that silently doubles the work is the wrong answer. But the premise that
 * nothing distinguishes a proxy was not the reason, and shipping a new `isProxy` field to "fix" it would have
 * added a second spelling of a fact already on the wire.
 *
 * Run: node --test testing/standalone/reindex-refuses-a-proxy.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const search = () => strip(readFileSync('server/src/api/brain/search.ts', 'utf8'));
const spaces = () => strip(readFileSync('server/src/api/spaces.ts', 'utf8'));

const handler = () => {
  const s = search();
  const i = s.indexOf("searchRouter.post('/spaces/:spaceId/reindex'");
  assert.ok(i > 0, 'the reindex route moved — re-point this test');
  return s.slice(i, s.indexOf('setImmediate', i));
};

describe('a proxy is refused', () => {
  it('the handler checks proxyFor and answers 400', () => {
    const h = handler();
    assert.match(h, /space\.proxyFor && space\.proxyFor\.length > 0/,
      'an empty proxyFor array is not a proxy — treating it as one would refuse a normal space');
    assert.match(h, /res\.status\(400\)/, 'a proxy must be refused, not started');
  });

  it('the message names the member spaces', () => {
    // A bare 400 sends the caller looking for a permissions problem. The remedy is the response itself, not a
    // second lookup — and they have to know WHICH spaces to reindex instead.
    assert.match(handler(), /Reindex its members instead: \$\{space\.proxyFor\.join\(', '\)\}/,
      'the members must be named in the message');
  });

  it('the refusal comes BEFORE the singleton check', () => {
    // Otherwise a proxy request during a running reindex answers 409 "already in progress", which reads as
    // "try again later" — so the caller retries a request that can never be right.
    const h = handler();
    assert.ok(h.indexOf('proxyFor') < h.indexOf('reindexJobRunning'),
      'a proxy must be refused for being a proxy, not queued behind the singleton');
  });

  it('and AFTER the 404, so an unknown id is still not-found', () => {
    const h = handler();
    assert.ok(h.indexOf('not found') < h.indexOf('proxyFor'),
      'an id that does not exist must 404 rather than being told it is not a proxy');
  });

  it('nothing is marked running before the refusal', () => {
    // The flag is a global singleton. Setting it and then returning early would block every real reindex on
    // the instance until a restart — a worse bug than the one being fixed.
    const h = handler();
    assert.ok(h.indexOf('res.status(400)') < h.indexOf('reindexJobRunning = true'),
      'the proxy refusal must not leave the singleton flag set');
  });
});

describe('the caller can already tell a proxy from a real space', () => {
  it('GET /api/spaces emits proxyFor', () => {
    // The half of the report that was wrong. Asserted so nobody "fixes" it by adding a second field that
    // means the same thing.
    assert.match(spaces(), /\.\.\.\(proxyFor \? \{ proxyFor \} : \{\}\)/,
      'proxyFor is no longer on the list projection — a client has nothing to branch on, and the refusal '
      + 'above becomes something they can only discover by trying it');
  });
});
