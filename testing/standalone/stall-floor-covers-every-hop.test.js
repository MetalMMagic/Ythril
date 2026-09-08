/**
 * Every timeout on the media path must be a hop the stall detector knows about.
 *
 * ## The defect
 *
 * `hopBudgets()` listed three CONFIG KEYS — `pageTimeoutMs`, `ocrTimeoutMs`, `describeTimeoutMs` — and the
 * longest step a document job takes is not a config key. The render of a page window is
 * `pageTimeoutMs × min(maxPages, 20)`, computed at the call site, so at the DEFAULTS:
 *
 *     stalledJobTimeoutMs                                    300 000 ms
 *     floor from the three keys   1.5 × ocrTimeoutMs 120 000  →  300 000 ms   (no raise)
 *     actual render budget        60 000 × min(50, 20)        →  1 200 000 ms
 *
 * Four times over, with nothing configured. A render reports no progress while it runs, so the stall sweep
 * re-queued the job mid-render, the replacement rendered the same window, and it was re-queued at the same
 * point — the loop that never finishes, which `stall-floor.ts` was written to prevent, reachable out of the box.
 *
 * ## Why this gate and not just the fix
 *
 * The bug was not a wrong number, it was a **hand-maintained list of names that could not contain a derived
 * value** — the failure this repo has recorded nine other instances of. So the gate enumerates the timeout call
 * sites from source and asserts each one's budget is represented in the floor's inputs. A new hop added with a
 * fresh constant fails here rather than in a customer's crash loop.
 *
 * Run: node --test testing/standalone/stall-floor-covers-every-hop.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { trackedSources } from './_sources.mjs';

const { DUAL_DOOR_BOUNDS } = await import('../../server/dist/config/setting-bounds.js');

const ROOT = process.cwd();

/** The slot vocabulary the server declares — read, never listed. */
const { MODEL_SLOTS } = await import('../../server/dist/config/model-slots.js');

/** Media-path source files, from git rather than a directory walk (gitignored/untracked files are not source). */
// Two directories, so the floor is 5 rather than the default 100 — a floor above what a scan can ever
// return fails on correct code, which is how a guard gets deleted instead of corrected.
const files = trackedSources(['server/src/files/converters', 'server/src/files/media'], { floor: 5 });

/**
 * A timeout being handed to a call. Both spellings: the option object the converter clients take, and the raw
 * `AbortSignal.timeout` the sidecar fetches use.
 *
 * **Any QUALIFIED spelling counts, and matching only the bare one made this gate go blind.** The converter
 * clients grew `defaultTimeoutMs` and `hardTimeoutMs` — one budget the operator's slot setting can beat, one
 * it cannot — and `timeoutMs:` matches neither, because the qualifier capitalises the T. Every document call
 * site vanished from the scan in the same commit that changed what they mean, and the scan reported clean.
 * Matched on the SHAPE (`<anything>timeoutMs:`) so the next qualifier is covered when it is written.
 */
const TIMEOUT_SITE = /(?:\b\w*[Tt]imeoutMs:\s*|AbortSignal\.timeout\(\s*)([^,)\n]+)/g;

/**
 * Budgets the stall floor is fed, by the expression that produces them. A site whose budget is not one of these
 * is a hop the detector cannot see.
 *
 * Matched on the EXPRESSION, not on a filename, so the rule is a property of the code.
 */
/**
 * **Anchored deliberately.** A substring match would accept `cfg.pageTimeoutMs * Math.min(take, 20)` — the
 * exact expression that caused this bug — because it *contains* a covered name while being four times the
 * covered value. A derived budget has to go through a named function so both ends use one number.
 */
const COVERED = [
  /^[\w.]*\bpageTimeoutMs$/,               // fed directly as `pageTimeoutMs`
  /^[\w.]*\bocrTimeoutMs$/,                // fed directly
  // A CALL is matched by its head only: the site regex stops at the first comma or paren, so a nested
  // argument list arrives truncated. Anchoring the start is what matters — the defect expression begins with
  // `cfg.pageTimeoutMs *`, not with one of these names.
  /^describeTimeoutMs\(/,                  // fed directly (via the describeTimeoutMs() resolver)
  /^renderWindowTimeoutMs\(/,              // fed as `renderWindowMs` via worstRenderWindowMs()
  /^worstRenderWindowMs\(/,
  // The media slots, since they became operator-settable. These used to be the bare constants
  // `VISION_TIMEOUT_MS` / `STT_TIMEOUT_MS` / `FACE_TIMEOUT_MS`, and a name-anchored entry was fine while the
  // number could not change. It can now, so the entry follows this file's own rule two comments up: a budget
  // that varies has to go through a NAMED FUNCTION, and both the call site and `hopBudgets()` call that same
  // function. Reading the constant in either place is the defect, not the spelling.
  /^visionTimeout\(/,                       // providers.ts, both legs — one configured value covers them
  /^sttTimeout\(/,
  /^slotTimeoutMs\(/,                       // face-external.ts, and any slot resolved directly
  // `budgetFor(slot, opts)` in vlm-client.ts is the same resolution with a caller default in front of it —
  // it ends in `slotTimeoutMs` for that slot, and `hopBudgets()` feeds all four document slots through the
  // same function. Anchored on the head like every other call entry here.
  /^budgetFor\(/,
];

/**
 * The admin schema's floor for `stalledJobTimeoutMs` (`api/media-config.ts`). Asserted below rather than
 * trusted, because the exemption threshold is derived from it.
 */
const MIN_STALL_TIMEOUT_MS = 30_000;

/**
 * A budget this small can never raise the stall floor, whatever an operator configures:
 * `floor = ceil(hop × 1.5)`, so a hop below `MIN_STALL_TIMEOUT_MS / 1.5` is always under the smallest
 * `stalledJobTimeoutMs` the API will accept. Health probes live here. This is a property of the NUMBER, not a
 * blessed filename — a name-based allowlist is the thing that goes stale and quietly grows.
 */
const CANNOT_BIND_MS = MIN_STALL_TIMEOUT_MS / 1.5;

/**
 * Sites that are deliberately NOT job steps, by what they are rather than by name:
 *
 *  - a parameter or field DECLARATION (`timeoutMs: number`) is a type, not a value;
 *  - a bare `timeoutMs` identifier is a PASS-THROUGH of whatever the caller supplied, and every caller on this
 *    path passes a covered budget — which the other sites in this scan prove;
 *  - a default inside the helper being called (`opts.timeoutMs ?? 120_000`) is a fallback for a caller that
 *    passed nothing.
 */
const NOT_A_STEP = [
  /^number$/,
  /^timeoutMs$/,
  /^opts\.timeoutMs\s*\?\?/,
];

/** A numeric literal (`3_000`) too small to ever bind. Returns null when the expression is not a literal. */
function literalMs(expr) {
  return /^[\d_]+$/.test(expr) ? Number(expr.replace(/_/g, '')) : null;
}

/**
 * The token to look for in `hopBudgets()` for a given call-site expression — i.e. "what would prove this budget
 * reaches the stall floor". Returns null for an expression that is not a recognised budget.
 */
function budgetToken(expr) {
  // The slot resolvers, which is what a settable budget looks like. `hopBudgets()` proves it reaches the floor
  // by calling `slotTimeoutMs` for the same slot — so the token to look for there is the resolver itself.
  if (/^visionTimeout\(|^sttTimeout\(|^slotTimeoutMs\(|^budgetFor\(/.test(expr)) return 'slotTimeoutMs';
  if (/^renderWindowTimeoutMs\(|^worstRenderWindowMs\(/.test(expr)) return 'worstRenderWindowMs';
  if (/^describeTimeoutMs\(/.test(expr)) return 'describeTimeoutMs';
  if (/^[\w.]*\bpageTimeoutMs$/.test(expr)) return 'pageTimeoutMs';
  if (/^[\w.]*\bocrTimeoutMs$/.test(expr)) return 'ocrTimeoutMs';
  return null;
}

/**
 * One source file as the scan should see it: everything except the hop LIST.
 *
 * `hopBudgets()` is where the budgets are declared FOR the floor — `describeTimeoutMs: doc.describeTimeoutMs`
 * is the answer, not a call to bound. Reading it as a call site makes the gate demand that the list cover
 * itself, and it started doing exactly that the moment the site pattern widened to qualified spellings.
 * Removed structurally, by the function's own body, rather than by skipping the file: worker.ts has real
 * call sites too, and skipping it would hide them.
 */
function scannable(rel) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (!rel.endsWith('files/media/worker.ts')) return src;
  const body = hopBudgetsBody();
  return body ? src.replace(body, '') : src;
}

/** Every distinct budget token actually used to bound a call on the media path. */
function budgetTokens() {
  const toks = new Set();
  for (const rel of files) {
    for (const m of scannable(rel).matchAll(TIMEOUT_SITE)) {
      const tok = budgetToken(m[1].trim());
      if (tok) toks.add(tok);
    }
  }
  return toks;
}

/** The body of `hopBudgets()` in worker.ts — the object literal the stall floor is actually fed. */
function hopBudgetsBody() {
  const worker = readFileSync(join(ROOT, 'server/src/files/media/worker.ts'), 'utf8');
  const start = worker.indexOf('function hopBudgets(');
  if (start < 0) return '';
  const end = worker.indexOf('\n}', start);
  return end < 0 ? '' : worker.slice(start, end);
}

/** `{ file, expr }` for every timeout site that is neither covered nor exempt. */
function uncoveredSites() {
  const bad = [];
  for (const rel of files) {
    const src = scannable(rel);
    for (const m of src.matchAll(TIMEOUT_SITE)) {
      const expr = m[1].trim();
      if (NOT_A_STEP.some(re => re.test(expr))) continue;
      if (COVERED.some(re => re.test(expr))) continue;
      const ms = literalMs(expr);
      if (ms !== null && ms < CANNOT_BIND_MS) continue;
      bad.push({ file: rel, expr });
    }
  }
  return bad;
}

describe('the stall floor knows every hop on the media path', () => {
  it('walked a real set of source files', () => {
    // Without this the scan can break (a moved directory, a changed pathspec) and report zero offenders for the
    // wrong reason — the exact vacuity `gates-cannot-pass-vacuously` polices.
    assert.ok(files.length > 15, `only found ${files.length} media-path source files`);
  });

  it('found timeout call sites to check', () => {
    let sites = 0;
    for (const rel of files) {
      sites += [...scannable(rel).matchAll(TIMEOUT_SITE)].length;
    }
    assert.ok(sites >= 8, `only ${sites} timeout sites found — the pattern probably stopped matching`);
  });

  it('every timeout handed to a call is a budget the floor is fed', () => {
    const bad = uncoveredSites();
    assert.deepEqual(bad, [], 'these hand a timeout to a call using a budget the stall detector never sees, '
      + 'so a step longer than stalledJobTimeoutMs re-queues the job mid-step and it never finishes:\n  '
      + bad.map(b => `${b.file}: ${b.expr}`).join('\n  ')
      + '\n\nEither express it through an existing budget, or add it to hopBudgets() in files/media/worker.ts '
      + 'AND to COVERED here.');
  });

  it('every budget used at a call site actually reaches hopBudgets()', () => {
    // The assertion above only checks the call-site EXPRESSIONS. This checks the other end, and it has to be
    // derived rather than a list: declaring a budget "covered" here while nobody feeds it to the floor is the
    // same invisibility one level up. Found by mutation — an earlier version of this gate asserted only the
    // render budget, so deleting `sttTimeoutMs:` from hopBudgets() passed green.
    const body = hopBudgetsBody();
    const missing = [...budgetTokens()].filter(tok => !body.includes(tok));
    assert.deepEqual(missing, [], 'these budgets are used to bound a call but are not fed to the stall floor, '
      + `so the detector can fire inside them:\n  ${missing.join('\n  ')}`);
  });

  it('every model slot the media path can call is fed to the floor BY NAME', () => {
    /*
     * The check above proves the resolver is REACHED. It cannot prove which slots reach it: every entry in
     * `hopBudgets()` calls `slotTimeoutMs`, so deleting one leaves the token behind and the assertion green.
     * Mutation-tested — removing `docVlmMs` passed, which is the vacuity this repository keeps paying for.
     *
     * The set is derived from the slot names the media path actually NAMES, intersected with the vocabulary
     * the server declares. A list would go stale the way the four-of-six ingest-schema lists did; the
     * intersection also keeps a string like 'local' or 'ollama' out of it without an exclusion list.
     */
    const named = new Set();
    for (const rel of files) {
      for (const m of scannable(rel).matchAll(/'([A-Za-z]+)'/g)) {
        if (MODEL_SLOTS.includes(m[1])) named.add(m[1]);
      }
    }
    assert.ok(named.size >= 6,
      `only ${named.size} model slots named across the media path — the derivation is wrong, not the code`);
    const body = hopBudgetsBody();
    const missing = [...named].filter(slot => !body.includes(`slotTimeoutMs('${slot}'`));
    assert.deepEqual(missing, [],
      'these slots bound a call somewhere on the media path and are not resolved in hopBudgets(), so the '
      + `stall detector can re-queue a job in the middle of one: ${missing.join(', ')}`);
  });

  it('found the budgets to check, and hopBudgets() itself', () => {
    // Floors for both halves of the check above: an empty token set or an empty body would pass it vacuously.
    assert.ok(budgetTokens().size >= 5, `only ${budgetTokens().size} distinct budgets recognised`);
    assert.ok(hopBudgetsBody().length > 100, 'could not locate the hopBudgets() body in worker.ts');
  });

  it('the classifier can fail — an uncovered budget is caught', () => {
    // A gate that can only pass is not a gate.
    const invented = 'AbortSignal.timeout(MY_NEW_TIMEOUT_MS)';
    const expr = [...invented.matchAll(TIMEOUT_SITE)][0][1].trim();
    assert.equal(COVERED.some(re => re.test(expr)), false);
    assert.equal(NOT_A_STEP.some(re => re.test(expr)), false);
    assert.equal(literalMs(expr), null);
  });

  it('rejects the ORIGINAL defect expression, which merely contains a covered name', () => {
    // The whole bug: `cfg.pageTimeoutMs * Math.min(take, 20)` is 20x `pageTimeoutMs`. A substring match would
    // have blessed it, and this gate would have passed against the code that caused the crash loop.
    const bug = 'timeoutMs: cfg.pageTimeoutMs * Math.min(take, 20),';
    const expr = [...bug.matchAll(TIMEOUT_SITE)][0][1].trim();
    assert.equal(COVERED.some(re => re.test(expr)), false, `"${expr}" was accepted as a covered budget`);
    // While the plain pass-through of the same config value is accepted.
    assert.equal(COVERED.some(re => re.test('cfg.pageTimeoutMs')), true);
  });

  it('a big raw literal is NOT exempt, only a provably-too-small one', () => {
    // The exemption is the risky part of this gate: too generous and it excuses the next real hop.
    assert.ok(literalMs('3_000') < CANNOT_BIND_MS, '3 s probe should be exempt');
    assert.ok(literalMs('300_000') >= CANNOT_BIND_MS, 'a 5-minute literal must NOT be exempt');
    assert.ok(literalMs('30_000') >= CANNOT_BIND_MS, 'a 30 s literal must NOT be exempt');
    assert.equal(literalMs('VISION_TIMEOUT_MS'), null);
  });

  it('the exemption threshold is derived from the real schema minimum', () => {
    /*
     * If the API ever accepts a smaller stalledJobTimeoutMs, the threshold above stops being provable and the
     * 3 s probes would need covering too — so the two must not drift.
     *
     * Read from the BUILT bounds table rather than by regex over the admin schema. The regex matched
     * `z.number().int().min(30_000)` written inline, and the day that field started reading its range from the
     * table both doors share — so that an environment variable could not set a range the API refuses — the
     * gate reported the bound "not found" and failed on a change that made the number MORE authoritative, not
     * less. A check on how a value is SPELLED rather than on what it IS fails exactly when the value gets a
     * better home.
     */
    assert.equal(DUAL_DOOR_BOUNDS['mediaEmbedding.stalledJobTimeoutMs'].min, MIN_STALL_TIMEOUT_MS);
  });
});

describe('the numbers, at the shipped defaults', () => {
  let effectiveStallTimeoutMs, worstRenderWindowMs, renderWindowTimeoutMs, RENDER_PAGE_BUDGET_CAP;

  before(async () => {
    ({ effectiveStallTimeoutMs } = await import('../../server/dist/files/media/stall-floor.js'));
    ({ worstRenderWindowMs, renderWindowTimeoutMs, RENDER_PAGE_BUDGET_CAP } =
      await import('../../server/dist/files/converters/render-budget.js'));
  });

  it('the render window really is 1 200 000 ms out of the box', () => {
    // The measurement the fix rests on. If a default moves, this says so here rather than in a crash loop.
    assert.equal(worstRenderWindowMs({}), 1_200_000);
    assert.equal(renderWindowTimeoutMs(60_000, 50), 1_200_000);
  });

  it('extra pages beyond the cap buy no extra budget', () => {
    assert.equal(renderWindowTimeoutMs(60_000, RENDER_PAGE_BUDGET_CAP), 1_200_000);
    assert.equal(renderWindowTimeoutMs(60_000, 500), 1_200_000);
    assert.equal(renderWindowTimeoutMs(60_000, 3), 180_000);
  });

  it('a zero or nonsense page count still gets one page of budget, not an instant abort', () => {
    for (const n of [0, -5, NaN, undefined]) assert.equal(renderWindowTimeoutMs(60_000, n), 60_000);
    for (const t of [0, -1, NaN, undefined]) assert.equal(renderWindowTimeoutMs(t, 1), 60_000);
  });

  it('the floor now RAISES the stall timeout on a stock install — it used not to', () => {
    // The whole defect in one assertion. With only the three config keys the floor was 300 000 (no raise);
    // with the render window it is 1.5 × 1 200 000.
    const hops = {
      pageTimeoutMs: 60_000, ocrTimeoutMs: 120_000, describeTimeoutMs: 30_000,
      renderWindowMs: worstRenderWindowMs({}),
    };
    const { ms, raised } = effectiveStallTimeoutMs(300_000, hops);
    assert.equal(ms, 1_800_000);
    assert.equal(raised?.hop, 'renderWindowMs');
    assert.equal(raised?.from, 300_000);

    // And the pre-fix inputs are exactly what missed it.
    const before = effectiveStallTimeoutMs(300_000, {
      pageTimeoutMs: 60_000, ocrTimeoutMs: 120_000, describeTimeoutMs: 30_000,
    });
    assert.equal(before.ms, 300_000);
    assert.equal(before.raised, undefined);
  });

  it('lowering maxPages lowers the floor — the operator has a lever', () => {
    // Worth pinning: the cost of this fix is a slower recovery for a genuinely wedged job, and this is how an
    // operator buys it back.
    const hops = (maxPages) => ({ ocrTimeoutMs: 120_000, renderWindowMs: worstRenderWindowMs({ maxPages }) });
    assert.equal(effectiveStallTimeoutMs(300_000, hops(50)).ms, 1_800_000);
    assert.equal(effectiveStallTimeoutMs(300_000, hops(3)).ms, 300_000, '3-page windows need no raise');
  });
});
