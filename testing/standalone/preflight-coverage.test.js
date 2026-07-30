/**
 * Preflight must not silently skip a test.
 *
 * ## What went wrong
 *
 * Preflight runs the standalone tests that need no live server, and it decided which those were by
 * CONTENT MATCH: `fetch(|127.0.0.1|localhost:|INSTANCES|BASE_URL`. That guarded one direction — a test
 * that really does hit the network without a marker fails loudly with ECONNREFUSED — and completely
 * missed the other: a **pure** test that merely *mentions* one of those strings was excluded and never
 * ran locally at all.
 *
 * Measured by running every standalone file alone with nothing listening: **22 of 158 were pure and
 * being skipped**, among them `ssrf-hardening`, `ssrf-ip-pinning`, `peer-ssrf-policy`,
 * `oidc-issuer-ssrf`, `log-redaction`, `secrets-permissions` and `config-permissions`. "Preflight
 * PASSED" was not running the SSRF suites.
 *
 * It cost two red CI runs. #559 failed on an assertion in `private-model-endpoints.test.js`, excluded
 * for containing `127.0.0.1` as test *data* — a blocked address. #562 failed on one in
 * `vlm-endpoint-egress.test.js`, excluded for containing the word `fetch(` inside its own failure
 * messages. Both were pure. Both passed a green preflight minutes before CI rejected them.
 *
 * ## The rule now
 *
 * The split is **declared**, not inferred: a test that drives a live server says `@needs-instance` in
 * its header. Everything else runs in preflight. Zero files were wrong in that direction when measured,
 * so the only failure mode a marker introduces is the loud one that was already handled.
 *
 * Run: node --test testing/standalone/preflight-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PREFLIGHT = readFileSync('scripts/preflight.mjs', 'utf8');

const NUL = String.fromCharCode(0);
const files = execFileSync('git', ['ls-files', '-z', 'testing/standalone'], { encoding: 'utf8' })
  .split(NUL).filter(f => f.endsWith('.test.js')).sort();

const marked = files.filter(f => readFileSync(f, 'utf8').includes('@needs-instance'));

describe('the exclusion is declared, not guessed', () => {
  it('preflight selects on the marker', () => {
    // Asserts the SELECTOR, not its exact spelling — the pattern is anchored to a header line
    // (` * @needs-instance …`) and that detail is free to change.
    assert.match(PREFLIGHT, /const NEEDS_INSTANCE = \/[^\n]*@needs-instance/);
  });

  it('the marker match is anchored, so a file that merely mentions it is not excluded', () => {
    // An unanchored match excluded THIS file, which necessarily names the marker in its assertions —
    // the same "matched test data, not behaviour" mistake the old heuristic made, one level up.
    assert.match(PREFLIGHT, /const NEEDS_INSTANCE = \/\^/, 'the pattern must be line-anchored');
  });

  it('and NOT on a content heuristic', () => {
    // The exact shape that skipped 22 pure files. Matching test data is not evidence about behaviour.
    assert.doesNotMatch(
      PREFLIGHT,
      /NEEDS_INSTANCE = \/[^/]*(fetch\\\(|127\\\.0\\\.0\\\.1|localhost:|BASE_URL)/,
      'inferring from file contents excludes pure tests that merely mention a URL or the word fetch',
    );
  });

  it('the skipped count is printed, so an exclusion is visible in the run', () => {
    assert.match(PREFLIGHT, /declare @needs-instance and run in CI/);
  });
});

describe('the marker is used honestly', () => {
  it('every marked file really does look like it drives a server', () => {
    // A marker added by reflex is an exclusion nobody notices. If a file claims to need an instance, it
    // should show some sign of reaching one.
    const suspicious = marked.filter(f => {
      const src = readFileSync(f, 'utf8');
      return !/BASE_URL|INSTANCES|127\.0\.0\.1|localhost:\d|:3200/.test(src);
    });
    assert.deepEqual(suspicious, [], `these declare @needs-instance but show no sign of using one:\n  ${suspicious.join('\n  ')}`);
  });

  it('the marked set stays a small minority', () => {
    // Measured at 16 of 158. A jump means either a burst of integration tests, or markers being used to
    // silence a failure — the second is the one worth catching, and it will show up here first.
    assert.ok(marked.length <= 30, `${marked.length} files declare @needs-instance; that was 16 when measured`);
    assert.ok(marked.length / files.length < 0.25, 'more than a quarter of standalone tests need a server?');
  });

  it('the marker carries an explanation, not just a token', () => {
    for (const f of marked) {
      const line = readFileSync(f, 'utf8').split('\n').find(l => l.includes('@needs-instance'));
      assert.ok(line.length > 30, `${f}: bare marker with no reason — say what it drives`);
    }
  });

  it('the scan actually reads the tree', () => {
    assert.ok(files.length > 100, `expected the standalone suite, got ${files.length}`);
    assert.ok(marked.length > 0, 'no file declares the marker — the split would be meaningless');
  });
});
