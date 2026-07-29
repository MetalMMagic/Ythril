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
import { readdirSync, readFileSync } from 'node:fs';

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
  ['help-docs-coverage', 'a guide that ships but the in-product Help page never offers, or offers and cannot load'],
  ['help-anchor-coverage', 'a help link whose anchor matches no heading — it opens the guide and scrolls nowhere'],
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

// Build UNCONDITIONALLY before anything that imports from server/dist.
//
// This used to build only when `server/dist` was missing, which made every gate below it a check on
// whatever was compiled last — a different branch, a different commit, code that no longer exists. It
// cost a red CI run: a PR changed `toRecallRecord`'s output, preflight reported PASSED, and the
// standalone test that contradicts the change had been run against the PREVIOUS build. A stale pass is
// worse than no check, because it is indistinguishable from a real one. A `tsc` run is cheap; being
// told the wrong answer is not.
console.log('\n── building server (the gates below import from server/dist) ──');
try { run('npm run build:server'); } catch { failures.push({ name: 'build:server', why: 'the server does not compile' }); }

for (const [file, why] of BUILT_GATES) gate(file, why, file);

// Every standalone test that does NOT need a running instance, rather than the curated handful above.
//
// `npm run test:standalone` assumes the Docker stack — a third of those files drive a live server on
// :3200. The rest are pure: they import from `server/dist` and assert on logic. Those had no reason to
// wait for CI, and waiting for CI is exactly how a PR that changed `toRecallRecord`'s output shipped
// with the test contradicting it still asserting the old shape.
//
// The split is by grep for an instance marker, and the skipped count is PRINTED. A file that reaches
// the network without one of these markers fails here with ECONNREFUSED rather than being skipped
// silently — loud and wrong beats quiet and wrong, and the fix is to add the marker.
const NEEDS_INSTANCE = /fetch\(|127\.0\.0\.1|localhost:|INSTANCES|BASE_URL/;
const allStandalone = readdirSync('testing/standalone').filter(f => f.endsWith('.test.js')).sort();
const pure = allStandalone.filter(f => !NEEDS_INSTANCE.test(readFileSync(`testing/standalone/${f}`, 'utf8')));
console.log(`\n── standalone tests that need no running instance (${pure.length} of ${allStandalone.length}; ` +
  `${allStandalone.length - pure.length} drive a live server and run in CI) ──`);
try { run(`node --test --test-concurrency=1 ${pure.map(f => `testing/standalone/${f}`).join(' ')}`); } catch {
  failures.push({ name: 'test:standalone (offline subset)', why: 'server contracts and pure logic — no Docker needed, so no reason to learn this from CI' });
}

console.log('\n── docs lint ──');
try { run('npm run lint:docs'); } catch { failures.push({ name: 'lint:docs', why: 'markdown that will fail CI' }); }

console.log('\n── client unit tests (includes i18n key coverage) ──');
try { run('npm run test:client'); } catch {
  failures.push({ name: 'test:client', why: 'component behaviour, and translation keys missing from de/pl' });
}

// The production build type-checks TEMPLATES (AOT) and compiles under the app's own tsconfig, neither of
// which the unit-test run does. It caught a `[...NodeList]` spread that every test passed straight over,
// and it is where an unknown element, a bad binding or a broken inline template surfaces. ~7 seconds.
console.log('\n── client production build (AOT template type-check) ──');
let buildOut = '';
try {
  // Captured, not inherited, so the chunk table below can be read — then printed, because a build whose
  // output vanishes is a build nobody can debug.
  buildOut = execSync('npm run build:prod --workspace=client', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  process.stdout.write(buildOut);
} catch (e) {
  buildOut = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  process.stdout.write(buildOut);
  failures.push({ name: 'build:prod', why: 'AOT template errors and tsconfig differences the unit tests never see' });
}

// A `bundle`-type budget names a chunk. Angular does NOT complain when that name matches nothing — the
// budget is simply never evaluated, the build stays green, and the chunk it was meant to guard grows
// without limit. That is the same silent no-op the budgets exist to prevent, one level up, and the only
// place it can be checked is against the real chunk table the build just printed.
console.log('\n── bundle budgets bind to real chunks ──');
try {
  const cfg = JSON.parse(readFileSync('client/angular.json', 'utf8'));
  const project = cfg.projects[Object.keys(cfg.projects)[0]];
  const named = (project.architect.build.configurations.production.budgets ?? [])
    .filter(b => b.type === 'bundle').map(b => b.name);
  const plain = buildOut.replace(/\x1b\[[0-9;]*m/g, '');
  const unmatched = named.filter(n => !new RegExp(`\\|\\s*${n}\\s*\\|`).test(plain));
  if (unmatched.length) {
    console.log(`  budgets naming no emitted chunk: ${unmatched.join(', ')}`);
    failures.push({
      name: 'bundle-budgets',
      why: `${unmatched.join(', ')} — Angular evaluates these against nothing, so the build stays green while the chunk grows`,
    });
  } else {
    console.log(`  ${named.length} bundle budget(s) matched an emitted chunk.`);
  }
} catch (e) {
  failures.push({ name: 'bundle-budgets', why: `could not verify budget names: ${e}` });
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
