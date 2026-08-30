/**
 * A provider chain is ONE hop, and the stall floor must be told its whole cost.
 *
 * ## The defect
 *
 * `FallbackVisionProvider` and `FallbackSttProvider` call the primary, catch, and then call the fallback —
 * inside a single hop, with nothing beating between the two legs. `hopBudgets()` reported the legs as separate
 * entries and `effectiveStallTimeoutMs` takes the **maximum** of what it is given, so the floor was computed
 * from one leg while a hop could cost both:
 *
 *     STT, fallbackToExternal on:   300 000 + 300 000            =  600 000 ms of hop
 *     floor                         ceil(max(300 000) x 1.5)     =  450 000 ms
 *
 * 150 000 ms short. The sweep re-queues the job mid-call, the replacement reaches the same call, and it is
 * re-queued at the same point — the loop `stall-floor.ts` was written to prevent, reachable by turning on a
 * documented, pinnable, env-settable option (`MEDIA_EMBEDDING_FALLBACK_TO_EXTERNAL`).
 *
 * Vision is the same shape and lands exactly ON the floor — 120 000 + 60 000 = 180 000 = 120 000 x 1.5 — which
 * is precisely the indistinguishability `STALL_FLOOR_FACTOR` exists to buy head-room against. The comment on
 * `STALL_FLOOR_FACTOR` says a stall timeout equal to the hop budget makes a stall and an honest give-up
 * indistinguishable in the log, and that is what the vision chain produced.
 *
 * ## Why `stall-floor-covers-every-hop.test.js` could not catch it
 *
 * That gate enumerates timeout CALL SITES and asserts each budget is one the floor knows about. **Every leg
 * passed it individually.** The blind spot is not an unknown budget — it is two known budgets inside one step,
 * which a list of names cannot express however complete the list is. So this gate asserts the COMPOSITION rule
 * instead, and the two are complementary rather than overlapping.
 *
 * Run: node --test testing/standalone/a-fallback-chain-is-one-hop.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

const { providerHopMs, VISION_TIMEOUT_MS, EXTERNAL_VISION_TIMEOUT_MS, STT_TIMEOUT_MS } =
  await import('../../server/dist/files/media/providers.js');
const { effectiveStallTimeoutMs, STALL_FLOOR_FACTOR } =
  await import('../../server/dist/files/media/stall-floor.js');

/** The admin schema's default for `stalledJobTimeoutMs` — the value an operator who changes nothing gets. */
const DEFAULT_STALL_MS = 300_000;

describe('a fallback chain is one hop', () => {
  it('adds both legs when a chain is built, and neither when it is not', () => {
    // Mirrors `createMediaProviders`, which is the only thing that knows whether a chain exists.
    assert.equal(providerHopMs(120_000, 60_000, 'local', true), 180_000, 'local + fallback is a chain');
    assert.equal(providerHopMs(120_000, 60_000, 'local', false), 120_000, 'local alone');
    assert.equal(
      providerHopMs(120_000, 60_000, 'external', true), 60_000,
      'pointing a slot at `external` returns the external provider ALONE — `fallbackToExternal` builds no '
      + 'chain there, so adding the legs would raise the floor for a hop that cannot happen',
    );
    assert.equal(providerHopMs(120_000, 60_000, 'external', false), 60_000);
  });

  it('the STT chain no longer outruns the floor it produces — the defect, as a number', () => {
    const hop = providerHopMs(STT_TIMEOUT_MS, STT_TIMEOUT_MS, 'local', true);
    assert.equal(hop, 600_000, 'both STT legs share one constant, so the chain is double');

    const { ms } = effectiveStallTimeoutMs(DEFAULT_STALL_MS, { sttHopMs: hop });
    assert.ok(
      ms >= hop * STALL_FLOOR_FACTOR,
      `the floor (${ms} ms) must clear the whole chain (${hop} ms) with head-room. Reporting the legs `
      + 'separately produced 450 000 against a 600 000 ms hop, and a job that is re-queued mid-call reaches '
      + 'the same call again — a loop that never finishes.',
    );

    // And the pre-fix shape, stated so the number that was wrong is on the record.
    const asLegs = effectiveStallTimeoutMs(DEFAULT_STALL_MS, { a: STT_TIMEOUT_MS, b: STT_TIMEOUT_MS });
    assert.ok(asLegs.ms < hop, 'sanity: reporting the legs separately really is short of the chain');
  });

  it('the vision chain clears the floor, where it used to land exactly on it', () => {
    const hop = providerHopMs(VISION_TIMEOUT_MS, EXTERNAL_VISION_TIMEOUT_MS, 'local', true);
    const { ms } = effectiveStallTimeoutMs(DEFAULT_STALL_MS, { visionHopMs: hop });
    assert.ok(
      ms > hop,
      `the floor (${ms} ms) must be strictly greater than the hop (${hop} ms). Equal is the case `
      + '`STALL_FLOOR_FACTOR` exists to prevent: a stall firing in the same instant the hop legitimately '
      + 'gives up is indistinguishable from it in the log.',
    );
  });

  it('the worker feeds the CHAIN, not the legs', () => {
    /*
     * Source-read rather than behavioural, because `hopBudgets` is module-private and reads live config.
     * What it must not do is hand `effectiveStallTimeoutMs` a bare leg constant again — that is the exact
     * regression, and it looks completely reasonable while being wrong.
     */
    const worker = stripComments(readFileSync('server/src/files/media/worker.ts', 'utf8'));
    const body = bodyOf(worker, 'hopBudgets');
    assert.match(body, /providerHopMs\(/, 'hopBudgets no longer composes the chain — re-point this gate');
    assert.doesNotMatch(
      body, /:\s*(VISION_TIMEOUT_MS|EXTERNAL_VISION_TIMEOUT_MS|STT_TIMEOUT_MS)\s*,/,
      'a provider constant is being fed to the stall floor as a bare leg again. Both legs of a chain run '
      + 'inside one hop, so the floor must be told the sum — see providerHopMs().',
    );
  });

  it('the chain rule reads the same config fields the providers are built from', () => {
    // A hop budget derived from a different reading of the config than the one that built the providers is
    // worse than no budget: it would be confidently wrong in whichever direction the two disagreed.
    const worker = stripComments(readFileSync('server/src/files/media/worker.ts', 'utf8'));
    const hops = bodyOf(worker, 'hopBudgets');
    const build = bodyOf(worker, 'buildProviders');
    for (const field of ['visionProvider', 'sttProvider', 'fallbackToExternal']) {
      assert.match(hops, new RegExp(`\\b${field}\\b`), `hopBudgets must read \`${field}\``);
      assert.match(build, new RegExp(`\\b${field}\\b`), `buildProviders must read \`${field}\` — re-point this gate`);
    }
  });

  it('every fallback wrapper is covered by the rule', () => {
    /*
     * Enumerated from source, so a THIRD chain added later fails here rather than silently under-reporting.
     * That is the whole lesson of the gate this one sits beside: the first version of `hopBudgets` was a
     * hand-maintained list, and the thing it could not contain is what broke it.
     */
    const providers = stripComments(readFileSync('server/src/files/media/providers.ts', 'utf8'));
    const wrappers = [...providers.matchAll(/class\s+(Fallback\w+Provider)\b/g)].map(m => m[1]);
    assert.ok(wrappers.length >= 2, `expected the vision and STT fallbacks, found ${wrappers.join(', ') || 'none'}`);

    const worker = stripComments(readFileSync('server/src/files/media/worker.ts', 'utf8'));
    const hops = bodyOf(worker, 'hopBudgets');
    const composed = (hops.match(/providerHopMs\(/g) ?? []).length;
    assert.ok(
      composed >= wrappers.length,
      `${wrappers.length} fallback wrapper(s) exist (${wrappers.join(', ')}) but hopBudgets composes only `
      + `${composed} chain(s). A wrapper whose chain is not composed reports one leg to the stall detector.`,
    );
  });

  it('the composition lives beside the factory that decides it', () => {
    // `createMediaProviders` is the only thing that knows a chain was built. A copy of this rule anywhere else
    // is the two-implementations defect this repo produces most, and it would drift the first time the
    // factory's conditions changed.
    const providers = stripComments(readFileSync('server/src/files/media/providers.ts', 'utf8'));
    const at = providers.indexOf('export function providerHopMs');
    assert.notEqual(at, -1, 'providerHopMs must live in providers.ts, next to createMediaProviders');
    const body = bodyOf(providers, 'providerHopMs');
    assert.match(
      body, /providerType === 'external'/,
      "the rule must reproduce the factory's own condition — `external` returns the external provider alone",
    );
    assert.match(body, /fallbackToExternal\s*\?/, 'and must branch on whether a chain was actually built');
  });
});
