/**
 * An unacknowledged face endpoint is STORED and UNUSED — it no longer refuses unrelated writes.
 *
 * ## The change, and the property that must survive it
 *
 * breituai-platform, 2026-08-20T1155Z §5, arguing for a principle rather than reporting a bug:
 * *"the acknowledgement should gate USE of the endpoint, not VALIDITY of the config."*
 *
 * The write-time gate keyed off the endpoint EXISTING (`if (effBaseUrl)`), resolved from patch-or-stored. So
 * once an endpoint was stored unacknowledged, every subsequent patch to the route was refused whatever it
 * touched — their owner met it raising an image level, which has nothing to do with face egress.
 *
 * **The property that must not move: no face crop is ever sent to an unacknowledged host.** That is what makes
 * this change safe rather than a relaxation, and it is why this file asserts the SEND SITE first and the route
 * second. If the send-site check ever goes, the write-time gate is no longer there to catch it.
 *
 * It was already enforced there and always has been — `detectFacesExternal` returns null unless
 * `faceEndpointConsented` matches, and its own comment says why: *"a config edited on disk (bypassing the API)
 * still cannot silently egress biometric data."* So the write-time refusal protected nothing the use-time one
 * does not. That is the finding, and it is what turned their principle from defensible into obvious.
 *
 * ## What is still refused
 *
 * A patch that TOUCHES `externalModel` without a matching acknowledgement — the moment the operator is present
 * and deciding. They asked us not to weaken that and were right to: it caught a real mistake of theirs within
 * minutes, and it names the exact host:port.
 *
 * Run: node --test testing/standalone/face-egress-consent-gates-use-not-validity.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blockAfter, statementFrom } from './_structural-window.mjs';

const strip = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const API = strip(readFileSync('server/src/api/media-config.ts', 'utf8'));
const EXT = strip(readFileSync('server/src/files/media/face-external.ts', 'utf8'));

let faceEndpointConsented, detectFacesExternal;
before(async () => {
  ({ faceEndpointConsented, detectFacesExternal } =
    await import('../../server/dist/files/media/face-external.js'));
});

describe('THE PROPERTY: no crop is sent to an unacknowledged host', () => {
  it('consent requires the acknowledged host to MATCH the host it would send to', () => {
    // Exercised, not read. An acknowledgement for a different host is the interesting case: it is what an
    // operator produces by acknowledging once and then repointing the endpoint.
    assert.equal(faceEndpointConsented({ baseUrl: 'https://faces.example.com/embed', acknowledgedHost: 'faces.example.com' }), true);
    assert.equal(faceEndpointConsented({ baseUrl: 'https://faces.example.com/embed', acknowledgedHost: 'other.example.com' }), false,
      'an acknowledgement for another host must not carry over when the endpoint is repointed');
    assert.equal(faceEndpointConsented({ baseUrl: 'https://faces.example.com/embed' }), false,
      'no acknowledgement at all is not consent');
    assert.equal(faceEndpointConsented({ acknowledgedHost: 'faces.example.com' }), false,
      'an acknowledgement with no endpoint is not a usable endpoint');
    assert.equal(faceEndpointConsented(undefined), false);
  });

  it('a port is part of the host, so acknowledging the bare name is not consent', () => {
    // Their own first mistake, and the error message is what corrected them: they wrote the acknowledgement as
    // a bare host copying the assist model's shape. The rule must stay strict about it.
    assert.equal(faceEndpointConsented({ baseUrl: 'http://face-embed.svc:3120/embed', acknowledgedHost: 'face-embed.svc' }), false);
    assert.equal(faceEndpointConsented({ baseUrl: 'http://face-embed.svc:3120/embed', acknowledgedHost: 'face-embed.svc:3120' }), true);
  });

  it('the SEND SITE refuses before it does anything else', () => {
    /*
     * This is the assertion the whole change rests on. The write-time gate no longer catches an unacknowledged
     * endpoint on an unrelated patch, so the send site is the only thing standing between a stored endpoint and
     * a face crop on the wire.
     *
     * Asserted as ORDER inside the function: the consent check must precede the fetch. A check that ran after
     * would satisfy any test looking only for its presence.
     */
    const at = EXT.indexOf('export async function detectFacesExternal');
    assert.ok(at > -1, 'detectFacesExternal is gone — re-anchor this gate');
    const body = blockAfter(EXT, EXT.indexOf(')', at), 'detectFacesExternal');
    const guard = body.indexOf('externalFaceReady()');
    const send = body.indexOf('ssrfSafeFetch(');
    assert.ok(guard > -1, 'the send site does not check consent at all');
    assert.ok(send > guard, 'consent must be checked BEFORE the request is made');
    assert.match(statementFrom(body, guard, 'the consent guard'), /return null/,
      'and an unconsented endpoint must return rather than continue');
  });

  it('the caller is told to fall back rather than being thrown at', () => {
    // Asserted from the CONTRACT rather than exercised, and the first draft got this wrong: it called
    // `detectFacesExternal` with no config loaded and expected null, which throws `Config not loaded` because
    // the consent read goes through `getConfig()`. That is not a defect — the media worker runs long after
    // boot — but the test was asserting something untrue, so it says what it can prove instead.
    //
    // The behaviour that matters is exercised above through `faceEndpointConsented`, which is the rule; this
    // pins that the function REPORTS a refusal rather than raising one, because a throw here would take the
    // media job down instead of letting it fall back in-process.
    const at = EXT.indexOf('export async function detectFacesExternal');
    const body = blockAfter(EXT, EXT.indexOf(')', at), 'detectFacesExternal');
    assert.match(body, /if \(!externalFaceReady\(\)\) return null;/,
      'an unconsented endpoint must return null, not throw — the caller decides what to do about it');
  });
});

describe('the ROUTE gates on the patch, not on the stored state', () => {
  it('the refusal fires when the caller TOUCHES externalModel', () => {
    // The one condition that changed. `facePatch !== undefined` means "the caller is configuring the
    // endpoint"; the old `if (effBaseUrl)` meant "an endpoint exists", which is a fact about the config
    // rather than about the request.
    assert.match(API, /facePatch !== undefined \|\| rungActivatesFaces/,
      'the face consent block no longer gates on the patch — an unrelated write can be refused again');
    assert.match(API, /needsAcknowledgment: host/,
      'it must still name the host, which is the affordance a client acts on');
    assert.match(API, /face crops \(biometric data\)/,
      'and still say WHY in plain language — they asked for that not to be weakened');
    assert.match(API, /document content \(OCR text/,
      'and the assist endpoint must still say what IT sends');
  });

  it('neither endpoint refuses on the STORED state', () => {
    /*
     * The regression this file exists to catch: a consent gate keyed on the config rather than on the request,
     * which brings back the whole-page failure by whichever route it reappears on.
     *
     * BOTH endpoints, because the assist model had the identical shape and its own comment said so out loud —
     * the trigger was the rung "in the same or an EARLIER save". A test naming only the face endpoint would
     * have passed while document content had the same defect on the same page.
     *
     * Comments stripped at the top of this file, deliberately: the account of the defect quotes the old
     * conditions, and a naive search would find the explanation and report the fix as missing.
     */
    assert.doesNotMatch(API, /if \(effBaseUrl\) \{/,
      'a gate keyed on the endpoint existing refuses every unrelated patch again');
    assert.doesNotMatch(API, /if \(repairReachable && effBaseUrl\)/,
      'the assist gate is keyed on the stored rung again');
    /*
     * And the positive half, asserted on the PROPERTY rather than on the name.
     *
     * The first version counted `const activatedByThisPatch =` and required two — and SURVIVED rewriting the
     * assist one back to the defective `rungActivatesAssist && !!effBaseUrl`, because that is still an
     * assignment to that name. Counting a variable proves it exists, not that it means anything.
     *
     * What makes activation about the REQUEST is that touching the endpoint counts on its own. So each
     * assignment must name its own patch, and must not be gated on the stored endpoint existing.
     */
    const activations = [...API.matchAll(/const activatedByThisPatch = [^;]*;/g)].map(m => m[0]);
    assert.equal(activations.length, 2,
      `both endpoints must decide activation from this patch; found ${activations.length}`);
    for (const a of activations) {
      assert.match(a, /Patch !== undefined \|\|/,
        `activation must include "the caller touched the endpoint" as sufficient on its own: ${a}`);
      assert.doesNotMatch(a, /effBaseUrl/,
        `activation must not depend on an endpoint already being stored: ${a}`);
    }
  });

  it('a RUNG raise activates consent, which is the owner ruling', () => {
    // P-12, ruled A + C on 2026-08-20: consent is accepted — and therefore demanded — from the pipeline entry
    // point as well as the endpoint's own control, because raising an image level to its recognition rung is
    // equally an act of switching faces on.
    //
    // `auto` must count. It resolves to the recognition rung, which is why images default to `caption` — so a
    // check for `'recognition'` alone would let `auto` switch on a biometric pipeline without asking.
    assert.match(API, /patchedImageLevel === 'recognition' \|\| patchedImageLevel === 'auto'/,
      'raising the image ceiling must demand consent, and `auto` resolves to recognition');
    assert.match(API, /patchedMode === 'repair' \|\| patchedMode === 'auto'/,
      'and the same for the extraction mode that reaches the assist model');
    // Read off THIS patch, never the stored value — that distinction IS the fix.
    assert.match(API, /const patchedImageLevel = parsed\.data\.levels\?\.images;/,
      'the rung must come from the request; the stored one is not this caller\'s act');
    assert.doesNotMatch(API, /parsed\.data\.levels\?\.images \?\? activeCfg/,
      'falling back to the stored level reintroduces the defect on the rung side');
  });

  it('SSRF is checked when the endpoint is TOUCHED, independently of consent', () => {
    // Two different rules that used to share one `if`. A private-address endpoint is refused even from a
    // caller who has acknowledged it, and consent is demanded even when the URL is fine — collapsing them
    // means whichever check came first hid the other.
    for (const slot of ['faceExternal', 'assist']) {
      const at = API.indexOf(`allowPrivateForSlot('${slot}')`);
      assert.ok(at > -1, `${slot}: the SSRF check is gone`);
      const stmt = statementFrom(API, API.lastIndexOf('if (', at), `${slot} SSRF guard`);
      assert.match(stmt, /Patch !== undefined/,
        `${slot}: SSRF must be gated on the caller touching the endpoint, not on consent`);
    }
  });

  it('one helper, called twice — not two copies of the rule', () => {
    // The defect this codebase produces most, and on a consent rule the weaker copy means data on the wire.
    const calls = [...API.matchAll(/refuseUnacknowledgedEgress\(\{/g)];
    assert.equal(calls.length, 2, `expected both endpoints to call the shared helper; found ${calls.length}`);
    assert.doesNotMatch(API, /effAck !== host/,
      'an inline host comparison is a second copy of the consent rule');
  });

  it('the unacknowledged state is REPORTED on the GET', () => {
    // Because it is now reachable and silent. "Falls back quietly" is right for an unreachable endpoint — a
    // runtime condition nobody chose — and wrong for an unacknowledged one, which is a decision waiting on a
    // person.
    assert.match(API, /faceEndpointAwaitingAcknowledgment/,
      'the UI cannot say "configured, not in use" unless the server says so');
    const at = API.indexOf("masked['faceEndpointAwaitingAcknowledgment']");
    assert.ok(at > -1, 're-anchor this gate');
    const stmt = statementFrom(API, at, 'the awaiting-acknowledgment derivation');
    assert.match(stmt, /faceEndpointConsented/,
      'derived from the shared rule, not from a second comparison that could disagree with it');
    assert.match(stmt, /baseUrl/,
      'and only when an endpoint is actually configured — an empty slot is not awaiting anything');
  });

  it('the route and the send site read ONE consent rule', () => {
    // Two implementations of "is this endpoint consented to" is the defect this codebase produces most, and on
    // this rule the weaker one would mean biometric data on the wire.
    assert.match(API, /faceEndpointConsented/, 'the route must import the shared predicate');
    assert.doesNotMatch(API, /acknowledgedHost === new URL/,
      'a second copy of the comparison in the route is how the two drift');
  });
});
