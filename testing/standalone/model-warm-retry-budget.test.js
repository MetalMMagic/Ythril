/**
 * The model-warm retry policy, driven from the Dockerfile that actually runs it.
 *
 * ## The failure this closes
 *
 * The loop used to be six attempts backing off 2, 4, 8, 16, 32 seconds. It looked like protection and was
 * not: the entire budget is 62 seconds, and the failure it actually receives is `Error (429)` — HuggingFace
 * rate-limiting the anonymous download after a day's build volume. A rate-limit window does not clear in a
 * minute, so the loop exhausted itself against an error that could not have succeeded in the time allowed,
 * and took the 2.5.1 release build down with it.
 *
 * **The loop was never broken.** It logged all five retries and threw on the sixth, exactly as written. It
 * was CALIBRATED for the wrong failure. Worth stating in a test, because "the retry loop is broken" is the
 * natural reading of the symptom and it would send the next person rewriting a loop that works while leaving
 * the budget — the actual defect — untouched.
 *
 * ## Why this test extracts the script instead of copying it
 *
 * The policy lives inside a `printf '%s\n' … > /app/warm.mjs` in the Dockerfile. A test that restated the
 * loop would be a second copy of it, and the two would drift — which is the failure mode this repo keeps
 * finding, and the reason `buildEmbedText` exists in the first place.
 *
 * So the Dockerfile is parsed, the exact script it will write is reconstructed, and THAT is executed with
 * `load` and `setTimeout` stubbed. If someone edits the Dockerfile, this test runs the edit. If the printf
 * block moves or changes shape so it can no longer be extracted, the test fails loudly rather than passing
 * on a stale copy.
 *
 * Run: node --test testing/standalone/model-warm-retry-budget.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Reconstruct the exact `warm.mjs` the Dockerfile's printf writes. */
function extractWarmScript() {
  const lines = readFileSync(join(ROOT, 'Dockerfile'), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(l => l.trim().startsWith("printf '%s"));
  if (start < 0) return null;

  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    let raw = lines[i].trim();
    if (raw.includes('> /app/warm.mjs')) break;
    if (raw.endsWith('\\')) raw = raw.slice(0, -1).trim();
    if (!raw.startsWith("'") || !raw.endsWith("'")) return null;
    out.push(raw.slice(1, -1));
  }
  return out.length > 0 ? out.join('\n') : null;
}

/**
 * Run the extracted policy against a stubbed `load`, with time recorded rather than slept.
 *
 * `load`, `setTimeout` and `console` are shadowed as local bindings inside the function body, so the script
 * runs its own control flow unmodified — only its two side effects on the outside world are replaced.
 */
async function runPolicy(failWith, { succeedOnAttempt = Infinity } = {}) {
  const script = extractWarmScript();
  assert.ok(script, 'could not reconstruct warm.mjs from the Dockerfile — the printf block moved or changed '
    + 'shape. Re-point the extractor; do NOT paste a copy of the loop into this test.');

  // The first three lines are the import, the cache dir and the real `load`. Everything after them is the
  // policy, which is what this test is about.
  const body = script
    .split('\n')
    .filter(l => !l.startsWith('import ') && !l.startsWith('env.cacheDir') && !l.startsWith('const load ='))
    .join('\n');

  const delays = [];
  let calls = 0;
  const load = async () => {
    calls++;
    if (calls >= succeedOnAttempt) return 'ok';
    throw new Error(failWith);
  };
  const setTimeout = (fn, ms) => { delays.push(ms / 1000); fn(); };
  const console = { warn() {} };

  const fn = new Function('load', 'setTimeout', 'console',
    `return (async () => { ${body} })();`);

  let threw = null;
  try { await fn(load, setTimeout, console); } catch (e) { threw = e; }
  return { calls, delays, threw, budget: delays.reduce((a, b) => a + b, 0) };
}

const RATE_LIMIT = 'Error (429) occurred while trying to load file: "https://huggingface.co/x/config.json".';
const NOT_FOUND = 'Error (404) occurred while trying to load file: "https://huggingface.co/nope/config.json".';

describe('a rate limit is waited out', () => {
  it('keeps trying for long enough that a 429 window can expire', () => {
    // The whole point. The old policy spent 62 seconds; a rate limit is measured in minutes, so it lost
    // every time by construction.
    return runPolicy(RATE_LIMIT).then(({ budget }) => {
      assert.ok(budget >= 300,
        `the rate-limit retry budget is ${budget}s. A HuggingFace 429 does not clear inside that, so the `
        + 'loop will exhaust itself against an error that could not have succeeded — which is exactly what '
        + 'took the 2.5.1 release build down.');
    });
  });

  it('backs off increasingly, and caps so it does not run away', async () => {
    const { delays } = await runPolicy(RATE_LIMIT);
    assert.ok(delays.length >= 5, `only ${delays.length} retries before giving up on a rate limit`);
    for (let i = 1; i < delays.length; i++) {
      assert.ok(delays[i] >= delays[i - 1],
        `backoff went DOWN at retry ${i} (${delays[i - 1]}s then ${delays[i]}s)`);
    }
    assert.ok(Math.max(...delays) <= 120,
      `a single sleep of ${Math.max(...delays)}s is long enough to look like a hung build`);
  });

  it('stops as soon as the download succeeds', async () => {
    const { calls, threw } = await runPolicy(RATE_LIMIT, { succeedOnAttempt: 3 });
    assert.equal(threw, null, 'a download that eventually succeeded still failed the build');
    assert.equal(calls, 3, 'the loop kept going after a success');
  });
});

describe('anything that is not a rate limit fails fast', () => {
  it('gives up quickly on an error that waiting cannot fix', async () => {
    // A wrong model name, a 404, a full disk. None of them become true by waiting, and without this split
    // raising the budget would make every genuine misconfiguration take ten minutes to report itself.
    const { calls, budget, threw } = await runPolicy(NOT_FOUND);
    assert.ok(threw, 'a 404 did not fail the build at all');
    assert.ok(calls <= 4, `a 404 was retried ${calls} times`);
    assert.ok(budget <= 30,
      `a 404 spent ${budget}s backing off. Waiting cannot turn a missing model into a present one, and a `
      + 'build that takes ten minutes to report a typo is worse than one that reports it immediately.');
  });

  it('the two policies are genuinely different, not the same number twice', async () => {
    // Guards the case where someone "simplifies" the branch away and both paths get the long budget — the
    // tests above would each still pass on their own.
    const limited = await runPolicy(RATE_LIMIT);
    const other = await runPolicy(NOT_FOUND);
    assert.ok(limited.budget > other.budget * 5,
      `rate-limit budget ${limited.budget}s vs other-error budget ${other.budget}s — these are supposed to `
      + 'be different policies, because they are answers to opposite questions');
  });
});

describe('the script the Dockerfile writes is valid', () => {
  it('reconstructs, and is syntactically valid JavaScript', () => {
    // A mangled shell escape here fails the image build about ten minutes in, with a syntax error rather
    // than anything pointing at the Dockerfile line that produced it.
    const script = extractWarmScript();
    assert.ok(script, 'the printf block could not be reconstructed');
    assert.doesNotThrow(() => new Function(`return (async () => { ${script.split('\n').filter(l => !l.startsWith('import ')).join('\n')} })();`),
      'the script the Dockerfile writes is not valid JavaScript — check the quoting in the printf block');
  });
});
