/**
 * The describe call's budget is the operator's, because "tight" depends on the backend.
 *
 * ## The finding
 *
 * 30 s was hardcoded, with the reasoning that a description is a nicety on the ingest path and the extractive
 * fallback is always available. That reasoning is right for a model that is already resident — and wrong for
 * a **single-GPU host that swaps models per request**, which is a common way to self-host. The describe call
 * arrives immediately after the transcription pass, so the backend has to unload the vision model and load a
 * chat model before it can answer, and the load alone can eat the budget.
 *
 * The result is the failure shape this repo keeps finding: nothing errors. Every document quietly keeps its
 * extractive text, `descriptionSource` says `extracted`, and one `warn` per file says "timeout" — which reads
 * as a broken model rather than a deadline that does not fit this host. The capability looks unimplemented
 * while working perfectly on the next host along.
 *
 * ## What this pins
 *
 * The resolution and the clamp, both of which have a wrong answer that is worse than an error: a `0` or
 * negative budget would abort every call instantly (descriptions silently stop, permanently), and an absurd
 * one would hold an ingest worker for as long as the caller asked.
 *
 * Run: node --test testing/standalone/describe-timeout.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'server', 'src');

let describeTimeoutMs;

describe('describeTimeoutMs', () => {
  before(async () => {
    ({ describeTimeoutMs } = await import('../../server/dist/files/converters/describe.js'));
  });

  it('defaults to the historical 30 s when nothing is configured', () => {
    // The default is not a preference, it is a promise: an instance that upgrades and configures nothing
    // must describe documents exactly as it did before this setting existed.
    assert.equal(describeTimeoutMs(), 30_000);
    assert.equal(describeTimeoutMs({}), 30_000);
    assert.equal(describeTimeoutMs({ describeTimeoutMs: undefined }), 30_000);
  });

  it('honours a raised budget — the whole point for a swap-based backend', () => {
    assert.equal(describeTimeoutMs({ describeTimeoutMs: 180_000 }), 180_000);
  });

  it('NEVER returns zero or negative, whatever is configured', () => {
    // A zero would abort every describe call before it started: descriptions stop, `extracted` everywhere,
    // one warning per upload, and nothing saying the budget is the cause.
    for (const v of [0, -1, -60_000, 0.5]) {
      assert.ok(describeTimeoutMs({ describeTimeoutMs: v }) >= 1_000, `budget ${v}`);
    }
  });

  it('clamps an absurd budget rather than holding a worker for it', () => {
    assert.equal(describeTimeoutMs({ describeTimeoutMs: 86_400_000 }), 600_000);
  });

  it('ignores a non-numeric or non-finite value', () => {
    for (const v of [NaN, Infinity, '120000', null, {}]) {
      assert.equal(describeTimeoutMs({ describeTimeoutMs: v }), 30_000, String(v));
    }
  });

  it('floors a fractional value instead of passing it to a timer', () => {
    assert.equal(describeTimeoutMs({ describeTimeoutMs: 45_000.9 }), 45_000);
  });

  // ── The setting is only real if it reaches the call and the operator can set it ──

  it('is the value the describe call actually uses — no second hardcoded constant', () => {
    // The bug was a literal at the call site. A grep is the right check for "is there still one", because
    // the alternative is a live model call, and the point is precisely that nobody notices this path.
    const src = readFileSync(join(SERVER_SRC, 'files', 'converters', 'describe.ts'), 'utf8');
    const callSite = /timeoutMs:\s*describeTimeoutMs\(getDocumentProcessingConfig\(\)\)/;
    assert.match(src, callSite, 'the describe call must read the configured budget, not a constant');
    // Any OTHER `timeoutMs: <number>` in this file would be a second, unconfigurable budget.
    const literals = [...src.matchAll(/timeoutMs:\s*(\d[\d_]*)/g)].map(m => m[1]);
    assert.deepEqual(literals, [], `hardcoded timeouts remain: ${literals.join(', ')}`);
  });

  it('is settable through config, env and the admin API — all three, or it is not tunable', () => {
    const loader = readFileSync(join(SERVER_SRC, 'config', 'loader.ts'), 'utf8');
    assert.match(loader, /DOC_DESCRIBE_TIMEOUT_MS/, 'env override missing');
    assert.match(loader, /describeTimeoutMs:\s*\d/, 'default missing from DOCUMENT_PROCESSING_DEFAULTS');
    /*
     * The PATCH schema half. Either spelling counts: an inline `z.number()`, or `bounded('<path>')`, which
     * takes the range from the table the environment door also reads.
     *
     * Matching only the inline form made this fail on the change that gave the field ONE range across both
     * doors — the env door had allowed six times the admin ceiling until then. A gate that pins how a schema
     * is written blocks the fix that makes the schema agree with everything else.
     */
    const api = readFileSync(join(SERVER_SRC, 'api', 'media-config.ts'), 'utf8');
    assert.match(api, /describeTimeoutMs:\s*(?:z\.number\(\)|bounded\(')/,
      'a strict() PATCH schema without the field turns setting it into a 400');
  });
});
