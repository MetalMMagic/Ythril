/**
 * Every path we rely on being un-committable is protected by a rule that TRAVELS with the repository.
 *
 * ## Why this gate exists
 *
 * This repo is public. On 2026-08-05 an integrator running their own Ythril instance reported the shape
 * after hitting it on two repos of their own: `git check-ignore` PASSED on `.claude/settings.local.json`
 * while the only matching rule lived outside the repository — a machine-wide `core.excludesFile` in one
 * case, `.git/info/exclude` in the other. Neither is committed. Both protect exactly one working copy and
 * no clone, and `git check-ignore` reports success either way, so the usual check cannot tell the two apart.
 *
 * Here, `.mcp.json` — which names a live instance URL and the env var holding its bearer token — was
 * covered only by `.git/info/exclude`. The paragraph in `.gitignore` explaining why that is not protection
 * was committed WITHOUT the line that fixes it: the explanation travelled and the protection did not.
 *
 * ## Why it checks the file rather than asking git
 *
 * `git check-ignore` consults `.gitignore` and `.git/info/exclude` together, and `info/exclude` takes
 * PRECEDENCE — so on this machine it answers "ignored" and names the non-travelling source, while in CI
 * `info/exclude` is empty and the same question means something different. A gate whose subject changes
 * between here and CI cannot be trusted in either place, so the authority for "does this travel?" is the
 * text of the committed `.gitignore` itself. The local `check-ignore` assertion is kept as a second,
 * weaker check for paths that happen to exist.
 *
 * Run: node --test testing/standalone/ignore-rules-travel.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

/**
 * Paths that must never reach a commit, and what is at stake in each. The reason is in the table because a
 * bare list invites deletion by whoever finds a rule inconvenient.
 */
const MUST_NOT_TRAVEL = [
  ['.claude/settings.local.json', 'holds the literal bearer token for a live instance'],
  ['.mcp.json', 'names the instance URL and the token env var; one paste from holding the token itself'],
  ['ideas/', "the owner's product notes — not ours to publish"],
  ['.claude/mailbox/', 'agent-session state that can carry conversation text'],
  ['.claude/checkpoints/', 'agent-session state that can carry conversation text'],
  ['.claude/agent-memory-local', 'agent-session state that can carry conversation text'],
  ['.claude/scheduled_tasks.json', 'local scheduler state'],
  ['.claude/agent-registry.json', 'local agent registry'],
  ['todo/', 'local trackers, including unpatched security findings'],
  ['communication/', "correspondence carrying other parties' internals"],
];

/** `.gitignore` with comments and blank lines removed — a comment is not a rule. */
const gitignorePatterns = () => readFileSync(`${ROOT}/.gitignore`, 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0 && !l.startsWith('#'));

/**
 * Does the committed `.gitignore` carry a rule for this path?
 *
 * Deliberately narrow: an exact match on the path, on it with a trailing slash, or on a `**\/`-prefixed
 * form. It does NOT try to reimplement gitignore's matching — a broad pattern that happens to cover the
 * path would pass a clever matcher and still be invisible to the next person reading the file.
 */
const hasTravellingRule = (path) => {
  const bare = path.replace(/\/$/, '');
  const candidates = new Set([bare, `${bare}/`, `**/${bare}`, `**/${bare}/`]);
  return gitignorePatterns().some(p => candidates.has(p));
};

describe('ignore rules that protect secrets travel with the repository', () => {
  it('the matcher accepts a committed rule and rejects one that is only a comment', () => {
    // Self-check first: this gate's whole claim is that it can tell a rule from prose about a rule, which
    // is the exact distinction the repo got wrong.
    assert.ok(gitignorePatterns().includes('.claude/settings.local.json'));
    assert.equal(gitignorePatterns().some(l => l.startsWith('#')), false, 'comments must be stripped');
    assert.equal(hasTravellingRule('definitely-not-ignored-xyz'), false);
  });

  it('every path on the list has a rule in the committed .gitignore', () => {
    const unprotected = MUST_NOT_TRAVEL
      .filter(([p]) => !hasTravellingRule(p))
      .map(([p, why]) => `${p} — ${why}`);
    assert.deepEqual(unprotected, [],
      'these paths are not ignored by any rule in the COMMITTED .gitignore. If a local `git check-ignore` '
      + 'says they are ignored, the rule is in .git/info/exclude or a machine-wide excludesFile — neither '
      + 'is committed, so a clone of this PUBLIC repo has no protection at all. Add the rule to .gitignore.');
  });

  it('nothing on the list is already tracked', () => {
    // An ignore rule does nothing for a file git is already following, and this is the failure that would
    // have already happened rather than one waiting to.
    const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/);
    const offenders = MUST_NOT_TRAVEL
      .map(([p]) => p.replace(/\/$/, ''))
      .filter(p => tracked.some(t => t === p || t.startsWith(`${p}/`)));
    assert.deepEqual(offenders, [],
      'these paths are TRACKED — the ignore rule is irrelevant while git is already following them. '
      + '`git rm --cached` and rotate anything they exposed.');
  });

  it('paths that exist here are ignored in practice too, with the machine-wide file disabled', () => {
    // Second, weaker check: proves the rule actually matches, for whichever of these exist locally.
    for (const [path] of MUST_NOT_TRAVEL) {
      if (!existsSync(`${ROOT}/${path}`)) continue;
      let ignored = true;
      try {
        execFileSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '-q', '--', path],
          { cwd: ROOT, stdio: 'ignore' });
      } catch { ignored = false; }
      assert.ok(ignored, `${path} exists and is NOT ignored with core.excludesFile disabled`);
    }
  });
});
