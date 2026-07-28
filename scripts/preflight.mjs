/**
 * Pre-push structural gates — one command, so "which check applies to this change?" stops being a
 * judgement call.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────────────────────
 *
 * A PR shipped `icon="activity"`, which is not in the ICONS registry. `PhIconComponent` resolves an
 * unknown name to an empty string, so it rendered as a blank space with no error and no build failure.
 * Docs lint passed, all 685 client tests passed, the production AOT build passed. The one check that
 * catches it — `icon-registry-coverage` — was the one not run, because remembering which gate matches
 * which change is exactly the kind of thing a person gets wrong at the end of a long task.
 *
 * Every gate below shares that shape: it catches something that produces NO error, NO failed build and
 * NO failed unit test. A blank icon, an undocumented setting, a documented endpoint that 404s, a
 * scheduler nobody starts, a route nobody audits. They are cheap to run and impossible to remember.
 *
 * ── What this is not ────────────────────────────────────────────────────────────────────────────
 *
 * Not a replacement for CI. It deliberately skips everything needing Docker or a live instance
 * (integration, sync, red-team), because a gate that takes fifteen minutes is a gate people stop
 * running. This is the fast half: seconds, no containers, run it before every push.
 *
 * Usage:  npm run preflight
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Gates that read SOURCE only — no build required, so they run first and fail fastest. */
const SOURCE_GATES = [
  ['icon-registry-coverage', 'an unregistered icon renders as a blank space, silently'],
  ['scheduler-wiring', 'a background scheduler nobody starts looks exactly like one with nothing to do'],
  ['route-guard-coverage', 'an unguarded route is only visible by reading every router'],
  ['env-var-docs-coverage', 'a setting no doc mentions is one nobody can find'],
  ['config-key-docs-coverage', 'a wrong key in a config example is IGNORED at runtime — no error to search for'],
  ['route-path-docs-coverage', 'a documented endpoint that does not exist 404s with nothing to explain it'],
  ['mcp-tool-docs-coverage', 'a tool documented as blocked for read-only tokens that is not actually blocked'],
  ['doc-cited-constants', 'a number the docs quote that no longer matches the constant it quotes'],
];

/** Gates that import from server/dist and therefore need a build. */
const BUILT_GATES = [
  ['audit-route-coverage', 'a mutating route with no audit rule leaves no trace of who changed what'],
];

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const failures = [];

function gate(name, why, file) {
  process.stdout.write(`\n── ${name} ──\n`);
  try {
    run(`node --test testing/standalone/${file}.test.js`);
  } catch {
    failures.push({ name, why });
  }
}

console.log('Preflight — the checks that catch failures with no error message.\n');

for (const [file, why] of SOURCE_GATES) gate(file, why, file);

// Build once, only if something needs it or dist is missing.
if (BUILT_GATES.length > 0) {
  if (!existsSync('server/dist')) {
    console.log('\n── building server (a gate below imports from server/dist) ──');
    try { run('npm run build:server'); } catch { failures.push({ name: 'build:server', why: 'the server does not compile' }); }
  }
  for (const [file, why] of BUILT_GATES) gate(file, why, file);
}

console.log('\n── docs lint ──');
try { run('npm run lint:docs'); } catch { failures.push({ name: 'lint:docs', why: 'markdown that will fail CI' }); }

console.log('\n── client unit tests (includes i18n key coverage) ──');
try { run('npm run test:client'); } catch {
  failures.push({ name: 'test:client', why: 'component behaviour, and translation keys missing from de/pl' });
}

console.log('\n' + '='.repeat(76));
if (failures.length === 0) {
  console.log('Preflight PASSED. Docker-dependent suites (integration, sync, red-team) still run in CI.');
  process.exit(0);
}
console.log(`Preflight FAILED — ${failures.length} gate(s):\n`);
for (const f of failures) console.log(`  ${f.name}\n      ${f.why}`);
console.log('\nEach of these catches something that produces no error on its own. Fix before pushing.');
process.exit(1);
