#!/usr/bin/env node
/**
 * A change to shipped code needs a CHANGELOG entry under `[Unreleased]`.
 *
 * ## Why this exists
 *
 * The rule was already the house rule, and it was followed — 28 PRs in the batch that added this check, every one
 * with an entry. Nothing enforced it. A rule kept alive by memory alone is one distracted afternoon from lapsing,
 * and the lapse is invisible: nobody notices the entry that was never written.
 *
 * ## What counts
 *
 * A diff that touches `server/src/` or `client/src/` — the code that ships — must also add at least one line inside
 * the `[Unreleased]` section of `CHANGELOG.md`.
 *
 * Deliberately NOT required for: tests, `testing/`, `docs/`, workflows, `scripts/`, `todo/`, or a `*.spec.ts`
 * anywhere. Those change without changing what a user gets. The exemption is **by path**, with no "skip changelog"
 * escape hatch: if a source change genuinely has no user-facing effect, saying so in one CHANGELOG line is cheap and
 * leaves a record, whereas a marker in a PR title leaves nothing and is used the moment it is inconvenient.
 *
 * ## Why "inside `[Unreleased]`" rather than "the file changed"
 *
 * Touching `CHANGELOG.md` is easy to satisfy accidentally — a released section gets a typo fix and the check passes
 * while the actual change goes unrecorded. The added line has to land in the section that describes what is not
 * shipped yet.
 *
 * Usage: node scripts/check-changelog.mjs <base-ref>
 *   e.g. node scripts/check-changelog.mjs origin/main
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'origin/main';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

/** Paths whose change never needs a user-facing note. */
const EXEMPT = [
  /^testing\//,
  /^docs\//,
  /^scripts\//,
  /^todo\//,
  /^\.github\//,
  /\.spec\.ts$/,
  /\.test\.js$/,
];

/** Paths that ship to a user, and therefore need one. */
const SHIPPED = [/^server\/src\//, /^client\/src\//, /^client\/public\//];

let changed;
try {
  changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').map(s => s.trim()).filter(Boolean);
} catch (err) {
  // A diff that cannot run must NOT look like a pass. In CI that is an environment fault worth stopping for — a
  // shallow clone with no merge base would otherwise turn this check into a no-op that reports success, which is
  // precisely the failure mode the check exists to prevent. Locally, skipping is fine.
  const why = err.message.split('\n')[0];
  if (process.env['CI']) {
    console.error(`check-changelog: cannot diff against ${base} (${why}).`);
    console.error('In CI this is a hard failure: a check that cannot run must not report success. Ensure the base ref');
    console.error('is fetched — actions/checkout needs `fetch-depth: 0` for a merge base to exist.');
    process.exit(1);
  }
  console.log(`check-changelog: cannot diff against ${base} (${why}) — skipping (not CI).`);
  process.exit(0);
}

const shipped = changed.filter(f => SHIPPED.some(re => re.test(f)) && !EXEMPT.some(re => re.test(f)));

if (shipped.length === 0) {
  console.log(`check-changelog: no shipped-code changes in ${changed.length} changed file(s) — nothing to require.`);
  process.exit(0);
}

/** Line numbers added to CHANGELOG.md in this diff. */
function addedChangelogLines() {
  let patch;
  try {
    patch = git('diff', '-U0', `${base}...HEAD`, '--', 'CHANGELOG.md');
  } catch {
    return [];
  }
  const lines = [];
  // Hunk headers look like `@@ -12,0 +13,4 @@` — the `+start,count` is what we need.
  for (const m of patch.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) lines.push(start + i);
  }
  return lines;
}

/** The line range of the `[Unreleased]` section in the CURRENT file. */
function unreleasedRange() {
  const src = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
  const start = src.findIndex(l => /^##\s*\[Unreleased\]/i.test(l));
  if (start < 0) return null;
  let end = src.length;
  for (let i = start + 1; i < src.length; i++) {
    if (/^##\s*\[/.test(src[i])) { end = i; break; }
  }
  return { start: start + 1, end };   // 1-based, end exclusive
}

const range = unreleasedRange();
if (!range) {
  console.error('check-changelog: CHANGELOG.md has no "## [Unreleased]" section — add one.');
  process.exit(1);
}

const added = addedChangelogLines().filter(n => n > range.start && n <= range.end);

if (added.length === 0) {
  console.error('check-changelog: FAILED\n');
  console.error(`These files change what ships, and CHANGELOG.md gained no line under [Unreleased]:\n`);
  for (const f of shipped.slice(0, 20)) console.error(`  ${f}`);
  if (shipped.length > 20) console.error(`  … and ${shipped.length - 20} more`);
  console.error('\nAdd an entry describing the change from a user\'s point of view. If it genuinely has no');
  console.error('user-facing effect, say that in one line — it is cheap, and it leaves a record that someone');
  console.error('considered the question.');
  process.exit(1);
}

console.log(`check-changelog: OK — ${shipped.length} shipped file(s) changed, `
  + `${added.length} line(s) added under [Unreleased].`);
