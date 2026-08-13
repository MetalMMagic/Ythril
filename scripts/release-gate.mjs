#!/usr/bin/env node
/**
 * The documentation release gate.
 *
 * Owner rule, 2026-08-04: *"i want the documentation lens to be a release gate from now on. docs/ MUST match code
 * and changelog must be carrying and notice MUST contain all attribution."*
 *
 * ## Why this is a RELEASE gate and not just more CI
 *
 * The individual coverage gates already run per PR. What nothing checked was **the tag itself**. A tag push goes
 * straight to `publish.yml`, so the sequence "cut the tag → build → push to two registries" had no documentation
 * precondition at all. Every one of these three failures could have shipped:
 *
 *  - a version tagged with `[Unreleased]` still holding the entries, so the released CHANGELOG section is empty
 *    and every change in the release is filed under a heading that does not exist yet;
 *  - a version tagged where the four manifests disagree, so the image reports one number and the notes another;
 *  - a dependency added and attributed nowhere, published to two public registries under a licence that requires
 *    attribution.
 *
 * The per-PR gates catch the second and third *eventually*. A release is the moment they stop being recoverable:
 * an image on GHCR and Docker Hub cannot be un-published, and a missing attribution in a shipped artefact is a
 * licence problem rather than a tidiness one.
 *
 * ## What it enforces, in the owner's three terms
 *
 *  1. **docs/ MUST match code** — every documentation-coverage gate, plus markdownlint.
 *  2. **CHANGELOG must be carrying** — this version has a dated section, that section has real content, and
 *     `[Unreleased]` has been emptied into it.
 *  3. **NOTICE MUST contain all attribution** — every direct dependency of the redistributed trees.
 *
 * Run: `npm run release:gate`
 * Also runs in `publish.yml` BEFORE the build, so a bad tag fails in seconds instead of publishing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

const RELEASING = detectReleasing();
const failures = [];
const fail = (gate, why) => failures.push({ gate, why });

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ─────────────────────────────────────────────────── 1. the version, everywhere
/**
 * One version, in every manifest.
 *
 * Not pedantry: the image reports `package.json`'s version from inside itself (that is how a release is verified
 * after publish), while the CHANGELOG heading and the git tag come from elsewhere. A disagreement means the
 * artefact and its notes describe different releases, and the pull that proves the release is fine passes anyway.
 */
function checkVersion() {
  const manifests = ['package.json', 'server/package.json', 'client/package.json'];
  const versions = new Map();
  for (const m of manifests) versions.set(m, JSON.parse(read(m)).version);

  const distinct = [...new Set(versions.values())];
  if (distinct.length !== 1) {
    fail('version', `manifests disagree: ${[...versions].map(([f, v]) => `${f}=${v}`).join(', ')}`);
    return null;
  }
  const version = distinct[0];

  // The lockfile carries the workspace versions too, and it is the one that gets forgotten because nobody edits
  // it by hand.
  const lock = read('package-lock.json');
  const lockHits = (lock.match(new RegExp(`"version": "${version.replace(/\./g, '\\.')}"`, 'g')) ?? []).length;
  if (lockHits < manifests.length) {
    fail('version', `package-lock.json names ${version} ${lockHits} time(s), expected at least ${manifests.length}`
      + ' — run `npm install` after a version bump so the lockfile follows');
  }
  return version;
}

// ─────────────────────────────────────────────────── 2. the CHANGELOG carries the release
/**
 * "Carrying" means three separate things, and only the first is obvious.
 */
function checkChangelog(version) {
  if (!version) return;
  const eolSplit = read('CHANGELOG.md').split(/\r?\n/);
  const text = eolSplit.join('\n');

  // (a) a dated section for THIS version
  const heading = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]\\s+[—-]\\s+(\\d{4}-\\d{2}-\\d{2})`, 'm');
  const m = heading.exec(text);
  if (!m) {
    fail('changelog', `no dated section for ${version}. Expected a line like "## [${version}] — YYYY-MM-DD". `
      + 'The version was bumped without closing [Unreleased] into it, so every change in this release is filed '
      + 'under a heading that does not exist.');
    return;
  }

  // (b) that section has real content — a version can be tagged with an empty one, and an empty release section
  //     is worse than none: it asserts that nothing changed.
  const start = m.index;
  const nextHeading = text.slice(start + 1).search(/^## \[/m);
  const body = nextHeading < 0 ? text.slice(start) : text.slice(start, start + 1 + nextHeading);
  const contentLines = body.split('\n').slice(1).filter(l => l.trim() && !/^#{1,3} /.test(l.trim()));
  if (contentLines.length < 3) {
    fail('changelog', `the ${version} section has ${contentLines.length} content line(s). An empty release section `
      + 'claims nothing changed, which is a stronger and falser statement than saying nothing at all.');
  }

  // (c) [Unreleased] has been emptied into it — but ONLY at release time.
  //
  // Between releases `[Unreleased]` is supposed to be full; that is what it is for. The first version of this
  // check demanded it be empty unconditionally and failed on a perfectly healthy mid-cycle tree, which would have
  // taught everyone to ignore the gate. So the question is not "is it empty" but "are we cutting a release right
  // now", and that has an answer in git rather than in a flag somebody remembers to pass.
  const unrel = /^## \[Unreleased\]/m.exec(text);
  if (!unrel) {
    fail('changelog', 'the [Unreleased] heading is gone. It must exist so the next change has somewhere to go.');
    return;
  }
  if (!RELEASING) return;

  const after = text.slice(unrel.index + unrel[0].length);
  const nextSec = after.search(/^## \[/m);
  const region = nextSec < 0 ? after : after.slice(0, nextSec);
  const leftovers = region.split('\n').filter(l => l.trim() && !/^#{1,3} /.test(l.trim()));
  if (leftovers.length > 0) {
    fail('changelog', `[Unreleased] still holds ${leftovers.length} line(s) at release time. Those changes are `
      + `IN ${version} but documented as unreleased.\n      first: ${leftovers[0].trim().slice(0, 90)}`);
  }
}

/**
 * Are we cutting a release right now?
 *
 * `true` when HEAD is exactly a tag (which is the state `publish.yml` runs in, since a tag push is what triggers
 * it) or when `--releasing` is passed by hand for a pre-tag check. Everything else is mid-cycle, where a populated
 * `[Unreleased]` is correct and demanding otherwise would just train people to ignore this.
 */
function detectReleasing() {
  if (process.argv.includes('--releasing')) return true;
  try {
    execFileSync('git', ['describe', '--exact-match', '--tags', 'HEAD'],
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────── 3+4. the gates that already exist
/**
 * The documentation and attribution gates, run as one group.
 *
 * Listed explicitly rather than globbed. A glob would silently shrink if a file were renamed, and this gate's
 * whole job is to not silently shrink — the same reason every enumeration gate in this repo asserts a floor.
 */
const DOC_GATES = [
  ['env-var-docs-coverage', 'every env var the code reads is documented'],
  ['config-key-docs-coverage', 'every config.json key is documented'],
  ['metric-docs-coverage', 'every metric on /metrics is documented'],
  ['metric-docs-are-accurate', "every metric row says what the code's help says"],
  ['mcp-tool-docs-coverage', 'every MCP tool is documented'],
  ['route-path-docs-coverage', 'every route is documented, and every documented route exists'],
  ['help-docs-coverage', 'every in-product Help anchor resolves'],
  ['docs-tables-render', 'no docs table is malformed'],
  ['error-shape-is-json', 'the documented error shape holds'],
  ['rollback-is-documented', 'every boot migration has a documented way back'],
  ['webhook-docs-are-safe', 'the webhook verification example is safe to copy'],
  ['idempotent-writes-contract', 'retry safety is documented for all four record types'],
];

const NOTICE_GATES = [
  ['notice-coverage', 'every redistributed dependency is attributed in NOTICE'],
  ['notice-ships-in-the-image', 'NOTICE and LICENSE are inside the published image'],
  ['ffmpeg-licensing-is-stated', 'ffmpeg runs as a separate process and is attributed'],
];

function runTest(name) {
  const path = `testing/standalone/${name}.test.js`;
  // A missing gate file must read as "this gate is gone", not as an ordinary assertion failure. A renamed or
  // deleted gate is exactly the silent shrink this list exists to prevent, so it gets its own message.
  if (!existsSync(join(ROOT, path))) {
    return `MISSING — ${path} does not exist. A gate named here and absent from the tree is a gate that stopped `
      + 'running; restore it or remove the entry deliberately.';
  }
  try {
    execFileSync('node', ['--test', path], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return null;
  } catch (e) {
    const out = (e.stdout ?? '') + (e.stderr ?? '');
    const first = out.split('\n').find(l => l.includes('AssertionError') || l.includes('Error:'));
    return first ? first.trim().slice(0, 200) : 'failed (see the full run)';
  }
}

function checkGroup(label, gates) {
  for (const [name, what] of gates) {
    process.stdout.write(`${DIM}  · ${what}…${R}`);
    const err = runTest(name);
    if (err) {
      process.stdout.write(`\r${RED}  ✗ ${what}${R}${' '.repeat(20)}\n`);
      fail(label, `${name}: ${err}`);
    } else {
      process.stdout.write(`\r${GREEN}  ✓${R} ${what}${' '.repeat(20)}\n`);
    }
  }
}

function checkMarkdownLint() {
  process.stdout.write(`${DIM}  · markdown in docs/ lints clean…${R}`);
  try {
    execFileSync('npm', ['run', 'lint:docs'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', shell: true });
    process.stdout.write(`\r${GREEN}  ✓${R} markdown in docs/ lints clean${' '.repeat(20)}\n`);
  } catch (e) {
    process.stdout.write(`\r${RED}  ✗ markdown in docs/ lints clean${R}${' '.repeat(20)}\n`);
    const out = (e.stdout ?? '') + (e.stderr ?? '');
    fail('docs', out.split('\n').filter(l => l.includes('error')).slice(0, 3).join(' | ') || 'markdownlint failed');
  }
}

// ─────────────────────────────────────────────────── run
console.log(`\n${YELLOW}Documentation release gate${R}  ${DIM}(owner rule 2026-08-04)${R}\n`);

const version = checkVersion();
const mode = RELEASING
  ? 'RELEASING — [Unreleased] must be empty'
  : 'mid-cycle — [Unreleased] may hold entries';
console.log(`  version: ${version ?? '(inconsistent)'}   mode: ${mode}\n`);

console.log(`${YELLOW}CHANGELOG carries the release${R}`);
checkChangelog(version);
if (!failures.some(f => f.gate === 'changelog')) {
  // Say what was CHECKED, which is not the same in both modes. This line used to claim "[Unreleased] is
  // empty" unconditionally — five lines after printing "mid-cycle — [Unreleased] may hold entries", and
  // while `checkChangelog` only tests emptiness under RELEASING. So on every mid-cycle run the gate
  // asserted, in green, something it had not looked at and that was usually false.
  //
  // A gate that overstates its coverage is worse than one that covers less: the whole value of a green
  // line is that someone can stop worrying about the thing it names.
  console.log(RELEASING
    ? `${GREEN}  ✓${R} [${version}] is dated, has content, and [Unreleased] is empty\n`
    : `${GREEN}  ✓${R} [${version}] is dated and has content ${DIM}([Unreleased] not checked mid-cycle)${R}\n`);
} else {
  console.log('');
}

console.log(`${YELLOW}docs/ matches code${R}`);
checkGroup('docs', DOC_GATES);
checkMarkdownLint();

console.log(`\n${YELLOW}NOTICE carries all attribution${R}`);
checkGroup('notice', NOTICE_GATES);

console.log(`\n${'='.repeat(78)}`);
if (failures.length === 0) {
  console.log(`${GREEN}Release gate PASSED${R} — docs match code, the CHANGELOG carries ${version}, NOTICE is complete.\n`);
  process.exit(0);
}
console.log(`${RED}Release gate FAILED${R} — ${failures.length} problem(s). A tag must not go out with these:\n`);
for (const f of failures) console.log(`  ${RED}[${f.gate}]${R} ${f.why}\n`);
console.log(`${DIM}These are the three things a published release can never take back: an image on two public${R}`);
console.log(`${DIM}registries, notes that do not describe it, and an attribution that was owed and not given.${R}\n`);
process.exit(1);
