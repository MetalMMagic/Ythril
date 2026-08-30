/**
 * A setting writable through two doors must not have two legal ranges.
 *
 * ## What was actually true
 *
 * Nine settings can be written both by an environment variable and by `PATCH /api/admin/media-config`. Each
 * door validated against numbers written beside it, and five pairs disagreed:
 *
 * | setting | env door | admin door |
 * |---|---|---|
 * | `documentProcessing.ocrTimeoutMs` | 1 000 … 3 600 000 | 10 000 … 1 800 000 |
 * | `documentProcessing.describeTimeoutMs` | 1 000 … 3 600 000 | 1 000 … **600 000** |
 * | `embedding.dimensions` | 1 … 8 192 | 1 … **16 384** |
 * | `embedding.embedConcurrency` | 1 … **256** | 1 … 32 |
 * | `rerank.candidateMultiplier` | unvalidated | 2 … 10 |
 *
 * So the same number was accepted or refused depending on which door the operator happened to use, and the
 * disagreement ran BOTH ways — six times wider on one field, half as wide on another. `EMBEDDING_CONCURRENCY`
 * is the one that shows why it matters: 256 passed validation, was reported as accepted, and was then silently
 * clamped to 32 by the code that actually uses it. Validation that accepts a value the runtime will not honour
 * answers the operator's question wrongly, which is worse than not answering it.
 *
 * ## Why this gate reads SOURCE and not the table
 *
 * The fix is a shared table, `config/setting-bounds.ts`. A gate that read that table to check the two doors
 * would share its blind spot exactly: a field the table forgot would be invisible to both the fix and the check
 * of the fix. So this derives the pairs from the two doors themselves — the loader's env reads and the PATCH
 * schema's fields — and asserts that anything appearing in both takes its numbers from the shared table rather
 * than carrying its own.
 *
 * That is the recorded lesson here: a measurement must not share its subject's blind spot, and scope must come
 * from the shape rather than from a list of names.
 *
 * Run: node --test testing/standalone/one-setting-one-range.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const LOADER = stripComments(readFileSync('server/src/config/loader.ts', 'utf8'));
const ADMIN = stripComments(readFileSync('server/src/api/media-config.ts', 'utf8'));

const { DUAL_DOOR_BOUNDS, ENV_TO_CONFIG_PATH, checkDualDoorValue } =
  await import('../../server/dist/config/setting-bounds.js');

/**
 * Config fields the ENV door writes, by the field name the config object uses.
 *
 * Three spellings, because the loader genuinely has three: `envIntOpt` for the validated helper, `pick` for the
 * media block's own reader, and `numericEnvOrExit` for the reranker's ternary. Matching only the first is how five settings
 * stayed invisible to the gate that was supposed to be exhaustive.
 */
function envWrittenFields() {
  const out = new Map();
  /*
   * Found by the READER, then walked back to the field it assigns — rather than by a `field: reader(` pattern.
   *
   * The tight version was written first and immediately reproduced the bug this file is about: the reranker's
   * read is a ternary, so its `dualDoorOrExit(` sits two lines below `candidateMultiplier:` and matched
   * nothing. A gate keyed on one way of writing an assignment reports a field as absent when it is merely
   * formatted differently, which is the same defect as the code it is checking.
   */
  for (const m of LOADER.matchAll(/\b(?:envIntOpt|pick|numericEnvOrExit)\(\s*'([A-Z0-9_]+)'/g)) {
    /*
     * The nearest property key before the call, found by an END-ANCHORED match over everything that precedes
     * it — never `slice(at - N, at)`.
     *
     * A fixed look-back spans a different number of lines on CRLF than on LF, so it would read a different
     * amount of code on this machine than in CI; `gates-bound-their-subject-structurally.test.js` rejects one
     * and rejected this file's first draft, correctly. `statementAround` is the usual answer and is wrong here
     * for the opposite reason: these reads sit inside one large object literal, so the enclosing "statement" is
     * the whole object and its first key would be returned for every field in it.
     *
     * The excluded set is what makes it the ENCLOSING key rather than any earlier one. The COMMA is the
     * load-bearing member: consecutive properties in an object literal carry no brace or semicolon between
     * them, so without it the match walked back over several properties and reported `workerConcurrency` as
     * the field set by `STALLED_JOB_TIMEOUT_MS`. Newlines stay allowed, because the reranker's read is a
     * ternary that puts its call two lines below its key.
     */
    const field = LOADER.slice(0, m.index).match(/(\w+)\s*:[^;{},]*$/);
    if (field) out.set(field[1], m[1]);
  }
  return out;
}

/** Numeric fields the ADMIN PATCH door writes, and whether each carries its own inline numbers. */
function adminNumericFields() {
  const out = new Map();
  for (const m of ADMIN.matchAll(/(\w+):\s*z\.number\(\)[^,\n]*?\.min\(([^)]+)\)\.max\(([^)]+)\)/g)) {
    out.set(m[1], { inline: true, min: m[2].trim(), max: m[3].trim() });
  }
  for (const m of ADMIN.matchAll(/(\w+):\s*bounded\(\s*'([^']+)'\s*\)/g)) {
    out.set(m[1], { inline: false, path: m[2] });
  }
  return out;
}

describe('the sweep itself works', () => {
  it('found both doors', () => {
    // Without this a rename reduces either side to zero and every assertion below passes by comparing nothing —
    // the failure mode every coverage gate in this repo has had at least once.
    assert.ok(envWrittenFields().size >= 8, `the loader's env reads look empty: ${envWrittenFields().size}`);
    assert.ok(adminNumericFields().size >= 8, `the PATCH schema looks empty: ${adminNumericFields().size}`);
  });

  it('the shared table is populated and reachable from the build', () => {
    assert.ok(Object.keys(DUAL_DOOR_BOUNDS).length >= 9, 'DUAL_DOOR_BOUNDS is empty or did not build');
    for (const [env, path] of Object.entries(ENV_TO_CONFIG_PATH)) {
      assert.ok(DUAL_DOOR_BOUNDS[path], `${env} maps to ${path}, which has no bounds row`);
    }
  });
});

describe('a setting with two doors has one range', () => {
  it('no dual-door field carries inline numbers on the admin side', () => {
    /*
     * The assertion, and it is deliberately about the SHAPE rather than about the values.
     *
     * Comparing the two ranges numerically would need the env side's numbers, which now come from the shared
     * table — so the comparison would be the table against itself and would pass whatever the admin side said.
     * What actually keeps them equal is that neither door writes numbers of its own, and that is what this
     * checks: a dual-door field must read `bounded('…')`, so there is one place for the numbers to live.
     */
    const env = envWrittenFields();
    const admin = adminNumericFields();
    const offenders = [];
    for (const [field, spec] of admin) {
      if (!env.has(field)) continue;              // admin-only: its numbers are its own business
      if (!spec.inline) continue;                 // already reads the shared table
      offenders.push(`${field} (env: ${env.get(field)}) carries min(${spec.min}) max(${spec.max}) inline`);
    }
    assert.deepEqual(offenders, [],
      'these fields are writable through BOTH the environment and PATCH /api/admin/media-config, and the admin '
      + 'side declares its own bounds. Two ranges for one setting means the same value is accepted or refused '
      + 'depending on which door the operator used. Use bounded(\'<config path>\'):\n  '
      + offenders.join('\n  '));
  });

  it('every dual-door field the sweep finds is in the shared table', () => {
    // The other direction: a pair the code has and the table does not. Without this, deleting a table row would
    // make the check above pass by no longer recognising the field as dual-door.
    const env = envWrittenFields();
    const admin = adminNumericFields();
    const known = new Set(Object.values(ENV_TO_CONFIG_PATH).map(p => p.split('.').pop()));
    const missing = [];
    for (const field of admin.keys()) {
      if (!env.has(field)) continue;
      if (!known.has(field)) missing.push(`${field} (env: ${env.get(field)})`);
    }
    assert.deepEqual(missing, [],
      'these have two doors and no row in DUAL_DOOR_BOUNDS, so nothing holds their ranges together:\n  '
      + missing.join('\n  '));
  });

  it('the table names no field that has stopped having two doors', () => {
    // A stale row is not harmless: it is a promise that two doors are held together, and the next reader
    // believes it. The exemption-rot failure, one file over.
    const env = envWrittenFields();
    const stale = [];
    for (const [envName, path] of Object.entries(ENV_TO_CONFIG_PATH)) {
      const field = path.split('.').pop();
      if (![...env.values()].includes(envName) && !env.has(field)) stale.push(`${envName} → ${path}`);
    }
    assert.deepEqual(stale, [], 'these rows describe an env door the loader no longer has:\n  ' + stale.join('\n  '));
  });
});

describe('the validator refuses what the admin door would refuse', () => {
  it('an unset variable is undefined, not a refusal', () => {
    // "Not configured" and "configured wrongly" are different answers, and a caller that cannot tell them apart
    // has to guess which one a falsy result meant.
    assert.equal(checkDualDoorValue('EMBEDDING_CONCURRENCY', undefined), undefined);
  });

  it('a typo is refused rather than becoming NaN', () => {
    // The whole point. `Number('1O24')` is NaN, and NaN compares false against everything — which is how a
    // mistyped MAX_FILE_SIZE_BYTES removed the media size limit instead of raising it.
    const r = checkDualDoorValue('MAX_FILE_SIZE_BYTES', '1O24');
    assert.equal(r.ok, false);
    assert.match(r.why, /is not a number/);
  });

  it('a value the runtime would silently clamp is refused instead', () => {
    // EMBEDDING_CONCURRENCY=256 used to pass and then be clamped to 32 by embedConcurrency().
    const r = checkDualDoorValue('EMBEDDING_CONCURRENCY', '256');
    assert.equal(r.ok, false);
    assert.match(r.why, /outside 1…32/);
  });

  it('a legal value passes and comes back as a number', () => {
    // The other direction: a check that only ever refuses cannot be told from one that refuses everything.
    assert.deepEqual(checkDualDoorValue('EMBEDDING_CONCURRENCY', '8'), { ok: true, value: 8 });
  });

  it('the refusal names the setting in words an operator recognises', () => {
    const r = checkDualDoorValue('DOC_DESCRIBE_TIMEOUT_MS', '99');
    assert.match(r.why, /how long a document description may take/);
  });
});
