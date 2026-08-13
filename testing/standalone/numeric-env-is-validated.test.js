/**
 * A typo in a numeric setting must stop the boot, not silently change behaviour.
 *
 * ## The finding — Observability & Operability audit lens
 *
 * Fifteen numeric settings were read as `Number(process.env[X])`, and exactly **one** checked the result. A typo —
 * `8OOO` with letter O, `30_000`, `5s`, a stray space in a YAML block — yields `NaN`, and `NaN` does not fail.
 * Measured against real Node, not assumed:
 *
 * | setting | what NaN does | consequence |
 * |---|---|---|
 * | `SHUTDOWN_DRAIN_MS` | `setTimeout(fn, NaN)` fires after **0 ms** | the graceful drain does not drain |
 * | `MONGO_CONNECT_RETRY_MS` | `elapsed < NaN` is **false** | zero retries; the mongod boot race returns |
 * | `EMBEDDING_DIMENSIONS` | serialises as **`null`** | a vector index with a null dimension |
 * | `RECALL_BUDGET_MS` | every budget comparison **false** | the budget stops applying |
 *
 * `PORT` was already safe and is recorded here because the expectation was wrong: `listen(NaN)` throws
 * `ERR_SOCKET_BAD_PORT`, so a typo there fails loudly. That is the behaviour every setting now has.
 *
 * ## What this gate holds
 *
 * That the registry stays **exhaustive** — a new unvalidated read is the way this class of bug returns — that the
 * boot actually refuses, and that the refusal names every offender rather than the first.
 *
 * Run: node --test testing/standalone/numeric-env-is-validated.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(p, 'utf8');

/** Every .ts file under server/src. */
function sources(dir = 'server/src') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (entry.endsWith('.ts')) out.push(p);
  }
  return out;
}

const FILES = sources();
const HELPER = read('server/src/config/env-num.ts');

describe('the sweep itself works', () => {
  it('found the server sources', () => {
    // Without this, a rename would reduce the sweep to zero files and the coverage assertion below would pass by
    // examining nothing — the failure mode every coverage gate in this repo has had at least once.
    assert.ok(FILES.length > 100, `expected the server tree, found ${FILES.length} files`);
    assert.ok(FILES.includes(join('server', 'src', 'index.ts')), 'index.ts was not found');
  });
});

describe('every numeric env read goes through the validated helper', () => {
  it('no raw Number()/parseInt() on process.env outside the helper', () => {
    const RAW = /(?:Number|parseInt|parseFloat)\(\s*(?:process\.env\[|process\.env\.)/;
    const offenders = [];
    for (const f of FILES) {
      if (f.endsWith(join('config', 'env-num.ts'))) continue;   // the helper is allowed to parse
      const src = read(f);
      src.split(/\r?\n/).forEach((line, i) => {
        // Comment lines are skipped. This is the THIRD gate this session to fire on its own documentation — the
        // comment explaining a fix quotes the pattern it warns against, every time. A gate that reads prose as
        // code gets appeased by deleting the explanation, which is precisely backwards.
        const code = line.replace(/\/\*.*?\*\//g, '').trim();
        if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
        if (RAW.test(code)) offenders.push(`${f}:${i + 1}  ${code}`);
      });
    }
    assert.deepEqual(offenders, [],
      'these read a numeric setting without validating it, so a typo becomes NaN and silently changes behaviour '
      + 'instead of stopping the boot. Use envInt / envIntOpt and add the variable to NUMERIC_SETTINGS:\n  '
      + offenders.join('\n  '));
  });

  it('the registry covers every setting the helper is asked for', () => {
    // A call site that passes a name the registry does not know still gets parsed, but with no bounds and no entry
    // in the boot-time sweep — half-validated, which is the worst of both.
    const names = new Set([...HELPER.matchAll(/name:\s*'([A-Z0-9_]+)'/g)].map(m => m[1]));
    assert.ok(names.size >= 12, `the registry looks empty: ${names.size} entries`);

    const missing = [];
    for (const f of FILES) {
      if (f.endsWith(join('config', 'env-num.ts'))) continue;
      for (const m of read(f).matchAll(/envInt(?:Opt)?\(\s*'([A-Z0-9_]+)'/g)) {
        if (!names.has(m[1])) missing.push(`${f}: ${m[1]}`);
      }
    }
    assert.deepEqual(missing, [], 'these are read through the helper but have no registry entry, so they are '
      + `unbounded and invisible to the boot check:\n  ${missing.join('\n  ')}`);
  });
});

describe('the boot refuses to start on a malformed value', () => {
  it('index.ts checks before it does anything else', () => {
    // Comments stripped FIRST. Commenting the call out left `indexOf` finding it inside the comment, so the gate
    // passed with the check disabled — the fourth time this session a gate read prose as code.
    const src = read('server/src/index.ts')
      .replace(/^[ 	]*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('assertNumericEnvOrExit()');
    assert.ok(at > 0, 'nothing calls assertNumericEnvOrExit, so a malformed setting still starts the instance');
    // Ordering is the whole value: after `loadConfig()` it would be reported behind whatever the config loader
    // does with a NaN, and after `listen()` it would be reported to an instance already serving traffic.
    const loadConfig = src.indexOf('loadConfig()');
    const listen = src.indexOf('.listen(');
    assert.ok(loadConfig < 0 || at < loadConfig, 'the check must run before the config is loaded');
    assert.ok(listen < 0 || at < listen, 'the check must run before the server starts listening');
  });

  it('the process actually exits', () => {
    const at = HELPER.indexOf('export function assertNumericEnvOrExit');
    assert.ok(at > 0, 'assertNumericEnvOrExit is gone');
    const fn = HELPER.slice(at, HELPER.indexOf('\n}', at));
    assert.match(fn, /process\.exit\(1\)/, 'a malformed setting must stop the boot, not warn and continue');
    // The ENUMERATION, not just any log.error: the summary line ("2 settings are malformed") survived deleting
    // the loop that actually names them, and a count without names is not actionable.
    assert.match(fn, /for \(const p of problems\)/,
      'every offender must be logged by name, not summarised as a count');
    assert.match(fn, /log\.error/, 'the reason must be logged, or an operator sees an exit with no explanation');
  });

  it('the reader does NOT throw, so a module-scope read cannot pre-empt the message', () => {
    // Several settings are read at module scope. A throw there happens during import, before any of index.ts
    // runs — the operator would get a stack trace from a module they have never heard of instead of the message.
    const at = HELPER.indexOf('export function envIntOpt');
    const fn = HELPER.slice(at, HELPER.indexOf('\n}', at));
    assert.doesNotMatch(fn, /throw /, 'envIntOpt must not throw — see the note in the helper');
  });
});

describe('it is documented', () => {
  it('the hosting guide says the boot refuses, and what a typo used to do', () => {
    const doc = read('docs/integration-guide/02-hosting.md');
    const at = doc.indexOf('### A Malformed Setting Stops the Boot');
    assert.ok(at > 0, 'the section is gone');
    const section = doc.slice(at, doc.indexOf('\n### ', at + 10));
    assert.match(section, /refuse to start/i, 'it must say the instance refuses to start');
    assert.match(section, /empty/i, 'it must say that an empty value means "not set" — the usual way to clear one');
    assert.match(section, /NaN/, 'it must say what a typo used to do, or the refusal reads as pedantry');
    assert.match(section, /every offender|all/i, 'it must say every offender is reported at once');
  });
});

describe('the helper, against values an operator really types', () => {
  const CASES = [
    ['8000', 'accepted'],
    ['0', 'accepted'],
    ['8OOO', 'refused'],      // letter O
    ['30_000', 'refused'],    // JS numeric separator, not shell
    ['5s', 'refused'],        // a duration
    ['8000ms', 'refused'],
    ['', 'unset'],            // empty is "not set", not an error — a common way to clear a value
    ['  8000  ', 'accepted'], // whitespace from a YAML block scalar
    ['8000.5', 'refused'],    // milliseconds are whole
    ['-1', 'refused'],        // below the floor
    ['999999999', 'refused'], // above the ceiling
  ];

  it('classifies each one as expected', async () => {
    const { validateNumericEnv, envIntOpt } = await import('../../server/dist/config/env-num.js');
    const wrong = [];
    const before = process.env['SHUTDOWN_DRAIN_MS'];
    try {
      for (const [raw, expected] of CASES) {
        process.env['SHUTDOWN_DRAIN_MS'] = raw;
        const { ok, problems } = validateNumericEnv();
        const got = !ok ? 'refused' : envIntOpt('SHUTDOWN_DRAIN_MS') === undefined ? 'unset' : 'accepted';
        if (got !== expected) {
          wrong.push(`${JSON.stringify(raw)} → ${got}, expected ${expected}${problems[0] ? ` (${problems[0]})` : ''}`);
        }
      }
    } finally {
      if (before === undefined) delete process.env['SHUTDOWN_DRAIN_MS'];
      else process.env['SHUTDOWN_DRAIN_MS'] = before;
    }
    assert.deepEqual(wrong, [], `misjudged:\n  ${wrong.join('\n  ')}`);
  });

  it('reports EVERY offender, not just the first', async () => {
    // An operator with two typos should learn about both. Reporting one at a time turns a five-second fix into
    // as many restarts as they made mistakes.
    const { validateNumericEnv } = await import('../../server/dist/config/env-num.js');
    const saved = { d: process.env['SHUTDOWN_DRAIN_MS'], r: process.env['RECALL_BUDGET_MS'] };
    try {
      process.env['SHUTDOWN_DRAIN_MS'] = 'nope';
      process.env['RECALL_BUDGET_MS'] = 'also-nope';
      const { ok, problems } = validateNumericEnv();
      assert.equal(ok, false);
      assert.equal(problems.length, 2, `expected both to be reported, got ${problems.length}`);
      assert.ok(problems.some(p => p.includes('SHUTDOWN_DRAIN_MS')), 'the first offender is missing');
      assert.ok(problems.some(p => p.includes('RECALL_BUDGET_MS')), 'the second offender is missing');
    } finally {
      for (const [k, v] of [['SHUTDOWN_DRAIN_MS', saved.d], ['RECALL_BUDGET_MS', saved.r]]) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  });

  it('the message says what the setting DOES, not just that it is wrong', async () => {
    // "SHUTDOWN_DRAIN_MS is invalid" makes an operator go and look it up. Naming the effect and the range makes
    // the fix obvious from the log line alone.
    const { validateNumericEnv } = await import('../../server/dist/config/env-num.js');
    const before = process.env['MONGO_CONNECT_RETRY_MS'];
    try {
      process.env['MONGO_CONNECT_RETRY_MS'] = 'oops';
      const { problems } = validateNumericEnv();
      assert.equal(problems.length, 1);
      assert.match(problems[0], /MONGO_CONNECT_RETRY_MS/, 'the message must name the variable');
      assert.match(problems[0], /"oops"/, 'it must quote the value, so a trailing space is visible');
      // Deliberately checked on SHUTDOWN_DRAIN_MS below rather than here: "retry" also appears in the variable
      // name MONGO_CONNECT_RETRY_MS, so this assertion passed with the description removed entirely.
      assert.match(problems[0], /between 0 and \d+/, 'it must state the accepted range');
    } finally {
      if (before === undefined) delete process.env['MONGO_CONNECT_RETRY_MS'];
      else process.env['MONGO_CONNECT_RETRY_MS'] = before;
    }
  });

  it('the message describes the setting in words the NAME does not already contain', async () => {
    // The point of `what`: an operator should not have to look the variable up. Checked on a setting whose
    // description shares no words with its name, so the assertion cannot pass on the name alone.
    const { validateNumericEnv } = await import('../../server/dist/config/env-num.js');
    const before = process.env['SHUTDOWN_DRAIN_MS'];
    try {
      process.env['SHUTDOWN_DRAIN_MS'] = 'oops';
      const { problems } = validateNumericEnv();
      assert.equal(problems.length, 1);
      assert.match(problems[0], /in-flight requests/i,
        'the message must say what the setting does, in words the variable name does not already give away');
    } finally {
      if (before === undefined) delete process.env['MONGO_CONNECT_RETRY_MS'];
      else process.env['MONGO_CONNECT_RETRY_MS'] = before;
    }
  });
});
