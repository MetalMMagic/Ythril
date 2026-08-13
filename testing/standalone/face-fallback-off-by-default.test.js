/**
 * A configured-but-failing external face provider does NOT quietly hand off to the bundled model.
 *
 * ## What this protects
 *
 * The two embedders emit the same descriptor width, so mixing their output corrupts a gallery in a way
 * nothing can detect: the vectors are the right shape, they are simply from a different vector space, and
 * every similarity score computed against them is wrong. Owner decision 2026-08-08 — *"disable by default
 * and enable consciously. its a silent pollution."*
 *
 * ## The trap this file exists for
 *
 * "Disabled by default" must mean **no fallback when an external provider was configured and failed**, NOT
 * **no in-process recognition**. An instance with no external provider has in-process as its only path; that
 * is not a fallback. Gating on `!faces` alone — the obvious reading — would silently switch face recognition
 * off for every existing single-model install, which is a far worse outcome than the one being fixed and
 * would look identical to "the images have no faces".
 *
 * So the condition must consult `externalFaceReady()`. That is the assertion that matters here, and it is
 * the one a plausible-looking implementation gets wrong.
 *
 * Run: node --test testing/standalone/face-fallback-off-by-default.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../server/src/files/media/face-embedder.ts', import.meta.url), 'utf8');
const ext = readFileSync(new URL('../../server/src/files/media/face-external.ts', import.meta.url), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

let fallbackAllowedIn;
before(async () => {
  ({ fallbackAllowedIn } = await import('../../server/dist/files/media/face-external.js'));
});

describe('the in-process fallback is off unless asked for', () => {
  it('defaults to false when nothing is configured', () => {
    // The default IS the decision. A flag that defaults on would ship the old behaviour under a new name.
    assert.equal(fallbackAllowedIn(undefined), false);
    assert.equal(fallbackAllowedIn({}), false);
  });

  it('is true only for the boolean, never for a truthy lookalike', () => {
    assert.equal(fallbackAllowedIn({ allowInProcessFallback: true }), true);
    assert.equal(fallbackAllowedIn({ allowInProcessFallback: false }), false);
    // A config hand-edited on disk carries strings. "false" is truthy, so a truthy read would invert the
    // operator's explicit refusal — which is the one direction this flag must never fail in.
    assert.equal(fallbackAllowedIn({ allowInProcessFallback: 'false' }), false);
    assert.equal(fallbackAllowedIn({ allowInProcessFallback: 'true' }), false);
    assert.equal(fallbackAllowedIn({ allowInProcessFallback: 1 }), false);
  });
});

describe('the skip is gated on an external provider being configured', () => {
  const code = withoutComments(src);
  // The guard is the `if` that returns early when the fallback is refused. Located by its condition rather
  // than by line number so a reordering does not silently re-point this at nothing. Matched line-wise
  // because the condition contains call parentheses, which a bracket-counting regex cannot span.
  const lines = code.split('\n');
  const guardIdx = lines.findIndex((l) => /\bif\s*\(/.test(l) && l.includes('inProcessFallbackAllowed()'));
  const guard = guardIdx >= 0 ? [lines[guardIdx]] : null;

  it('has a guard at all', () => {
    assert.ok(guard, 'no guard consulting inProcessFallbackAllowed() — the unconditional fallback is back');
  });

  it('consults externalFaceReady, not merely the absence of faces', () => {
    // THE assertion. Without this term, a single-model install loses face recognition entirely and the
    // symptom reads as "no faces detected" — the exact silent failure this whole area keeps producing.
    assert.match(
      guard[0],
      /externalFaceReady\(\)/,
      'the guard does not check whether an external provider was configured, so an instance with no '
      + 'provider would stop embedding faces altogether',
    );
  });

  it('refuses the fallback only when the flag is off', () => {
    assert.match(guard[0], /!\s*inProcessFallbackAllowed\(\)/, 'the flag must be negated in the refusal path');
  });

  it('returns without writing anything, leaving the job to retry', () => {
    const after = lines.slice(guardIdx).join('\n');
    const body = after.slice(0, after.indexOf('\n  }') + 4);
    assert.match(body, /return;/, 'the guard must return — a partial write is what it exists to prevent');
    assert.doesNotMatch(body, /replaceOne|updateOne|insertOne/, 'nothing may be persisted on the skip path');
  });

  it('no provider-failure log promises a fallback that will not happen', () => {
    // These two lines said "falling back to in-process recognition" on every provider failure. With the
    // fallback off by default that is the OPPOSITE of what happens, and a log that misreports the outcome
    // is worse than no log — an operator would stop looking for the reason their gallery went quiet.
    const extCode = withoutComments(ext);
    const logs = [...extCode.matchAll(/log\.(?:warn|info|error)\(([^\n]*)/g)].map((m) => m[1]);
    const liars = logs.filter((l) => /falling back|fall back/i.test(l));
    assert.deepEqual(liars, [], 'a provider-failure log claims a fallback the default configuration refuses');
  });

  it('warns once rather than per image', () => {
    // A provider that is down is down for the whole backlog; a per-image log buries the one line that matters.
    assert.match(code, /warnedFallbackDisabled/, 'the warning must be latched');
    assert.match(src, /Logged once per process/, 'the message must tell the operator it is deduplicated');
  });
});
