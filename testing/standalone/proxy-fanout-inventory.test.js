/**
 * Every proxy fan-out is accounted for, so Q-6's second half cannot miss one.
 *
 * ## Why a gate and not a checklist
 *
 * `resolveMemberSpaces(spaceId)` expands a proxy space into its members, and the read paths fan out over the
 * result. Q-6 changes the guard so a token that reaches only SOME members may use the proxy — at which point every
 * one of those fan-outs must narrow to the members that token reaches. A fan-out that is missed hands the caller
 * records from a space it cannot see, and nothing looks wrong: the response is well-formed, the status is 200, and
 * the only way to notice is to already know the space exists.
 *
 * There are enough sites, across enough files, that a hand-written list would be out of date by the time the change
 * landed. So the sites are ENUMERATED from source and each must be classified. A new call site fails this test
 * until someone says which kind it is.
 *
 * ## The two kinds
 *
 *  - **A write target** — the argument is an already-resolved single space (`wt.target` from `resolveWriteTarget`).
 *    A proxy write requires an explicit `targetSpace`, so by the time this is called there is exactly one real
 *    space and there is nothing to narrow. Classified automatically from the argument, not by being listed.
 *  - **A read fan-out** — anything else. The argument is the request's space, which may be a proxy. These are the
 *    ones Q-6 must narrow, and they are listed below with their file.
 *
 * ## What this asserts today
 *
 * That the inventory MATCHES the source exactly — no site missing from the list, and no stale entry left in it. It
 * does not yet assert that each site narrows, because none of them do: the rule shipped in #780 with nothing wired
 * to it, deliberately, because allowing a token through the guard without narrowing is the leak above.
 *
 * When the second half lands, each entry moves from `PENDING` to `NARROWED` and this test tightens to check the
 * call actually consults the token. Until then its job is to make the set unforgettable and to refuse a new
 * unclassified fan-out.
 *
 * Run: node --test testing/standalone/proxy-fanout-inventory.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Read fan-outs, by file, with the count in that file.
 *
 * A count rather than a line number on purpose: line numbers churn on every unrelated edit above them, and a gate
 * that fails for an edit three functions away gets ignored. The count still catches a NEW fan-out appearing in a
 * file that already had some, which a bare file list would not.
 */
const NARROWED = new Set([
  // Converted to memberSpacesForRequest. A no-op while the guard still requires all members, which is what makes
  // the conversion provable rather than a behaviour change taken on trust.
  'server/src/api/brain/search.ts',
  'server/src/api/spaces.ts',
  'server/src/api/brain/file-meta.ts',
  'server/src/api/brain/entities.ts',
  'server/src/api/files.ts',
]);

const PENDING = {
  'server/src/auth/middleware.ts': 2,
  'server/src/brain/write-validation.ts': 1,
  'server/src/mcp/router.ts': 1,
  'server/src/mcp/tools/chrono.ts': 1,
  'server/src/mcp/tools/edge.ts': 1,
  'server/src/mcp/tools/file.ts': 2,
  'server/src/mcp/tools/search.ts': 1,
  'server/src/mcp/tools/spaces.ts': 3,
};

// 28 read fan-outs across 13 files, plus 5 write-target sites. Those numbers came out of this gate, and the first
// version of this list was WRONG in both directions: it said "17 files", which was a `grep -c` count that included
// import lines, and it missed `mcp/tools/search.ts` and `mcp/tools/spaces.ts` entirely because the shell output
// that produced it had been truncated by `head -30`.
//
// That is the standing lesson about scoping a sweep from the shape rather than from the names, and it is exactly why
// the inventory is derived and asserted here instead of being carried in a tracker: a hand-count of a set this size
// is wrong the first time, every time.

/** The module that DEFINES it, and the rule module that only names it in prose. Neither is a fan-out. */
//  DEFINES it,  names it in prose, and  is the narrowing wrapper — its
// own call is the one legitimate un-narrowed use, since it is what does the narrowing.
const NOT_CALL_SITES = new Set([
  'server/src/spaces/proxy.ts',
  'server/src/auth/proxy-reach.ts',
  'server/src/spaces/proxy-scoped.ts',
]);

/**
 * Every `resolveMemberSpaces(<arg>)` call in the server, with its argument text.
 *
 * Derived from source rather than listed, because a list is the thing being checked. Import lines are excluded by
 * requiring an open paren directly after the name.
 */
function callSites() {
  const out = [];
  const files = execSync('git grep --untracked -l "resolveMemberSpaces" -- server/src', { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  for (const f of files) {
    if (NOT_CALL_SITES.has(f)) continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/resolveMemberSpaces\(([^)]*)\)/g)) {
      out.push({ file: f, arg: m[1].trim() });
    }
  }
  return out;
}

/**
 * A write target needs no narrowing: a proxy write requires an explicit `targetSpace`, so the argument is already
 * one real space. Recognised from the ARGUMENT rather than from a list, so a new write path is classified without
 * anyone remembering to add it.
 */
const isWriteTarget = (arg) => /^wt\.target$/.test(arg);


/** Calls that HAVE been narrowed — `memberSpacesForRequest` / `memberSpacesForRecord`. */
function narrowedCalls() {
  const out = [];
  const files = execSync('git grep --untracked -l "memberSpacesFor" -- server/src', { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  for (const f of files) {
    if (NOT_CALL_SITES.has(f) || f === 'server/src/spaces/proxy-scoped.ts') continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/memberSpacesFor(?:Request|Record)\(/g)) out.push({ file: f, at: m.index });
  }
  return out;
}

describe('the inventory matches the source', () => {
  const sites = callSites();
  const done = narrowedCalls();

  it('finds call sites at all — an empty sweep would pass everything', () => {
    // The failure this repo keeps finding: a gate whose measurement returns nothing reads exactly like a clean one.
    assert.ok(sites.length + done.length >= 25, `only found ${sites.length + done.length} — the sweep is broken`);
  });

  it('every un-narrowed read fan-out is a listed PENDING file', () => {
    const unlisted = sites
      .filter(s => !isWriteTarget(s.arg) && !(s.file in PENDING))
      .map(s => `${s.file} → resolveMemberSpaces(${s.arg})`);
    assert.deepEqual(unlisted, [],
      'a read fan-out in a file the inventory does not list. Narrow it with memberSpacesForRequest '
      + '(spaces/proxy-scoped.ts) and move the file to NARROWED, or add it to PENDING with its count.');
  });

  it('PENDING counts match, so a NEW fan-out in a known file is caught', () => {
    const actual = {};
    for (const s of sites) {
      if (isWriteTarget(s.arg)) continue;
      actual[s.file] = (actual[s.file] ?? 0) + 1;
    }
    assert.deepEqual(actual, PENDING);
  });

  it('no PENDING entry is stale', () => {
    // A list that outlives its code starts describing the past — the same reason a tracker checkbox is not evidence.
    const seen = new Set(sites.filter(s => !isWriteTarget(s.arg)).map(s => s.file));
    assert.deepEqual(Object.keys(PENDING).filter(f => !seen.has(f)), []);
  });
});

describe('a NARROWED file is really narrowed', () => {
  it('contains no un-narrowed read fan-out left behind', () => {
    // The half-converted file is the dangerous state: six sites narrowed and a seventh still fanning out over every
    // member reads as done and leaks on one route.
    const leftovers = callSites()
      .filter(s => !isWriteTarget(s.arg) && NARROWED.has(s.file))
      .map(s => `${s.file} → resolveMemberSpaces(${s.arg})`);
    assert.deepEqual(leftovers, []);
  });

  it('actually calls the narrowing helper', () => {
    // Otherwise a file could be moved to NARROWED by deleting its fan-outs rather than converting them.
    const byFile = new Set(narrowedCalls().map(c => c.file));
    assert.deepEqual([...NARROWED].filter(f => !byFile.has(f)), []);
  });
});

describe('the total is conserved', () => {
  it('narrowed + still pending accounts for all 28 read fan-outs', () => {
    // The invariant that makes progress checkable: converting a site must MOVE it, never drop it. A conversion that
    // quietly deleted a fan-out would otherwise look like progress.
    const pending = Object.values(PENDING).reduce((a, b) => a + b, 0);
    assert.equal(pending + narrowedCalls().length, 28,
      `expected 28 total, got ${pending} pending + ${narrowedCalls().length} narrowed`);
  });
});

describe('the write-target classification is real, not a loophole', () => {
  it('recognises exactly the resolved-write-target form', () => {
    assert.equal(isWriteTarget('wt.target'), true);
    for (const arg of ['spaceId', 'id', 'callSpace', 'rawSpace', 's.id', 'wt.target ?? spaceId', 'proxyId']) {
      assert.equal(isWriteTarget(arg), false, `${arg} must not classify as a write target`);
    }
  });

  it('at least one real write-target site exists, so the branch is exercised', () => {
    // At zero, `isWriteTarget` could be wrong in either direction and every test above would still pass.
    assert.ok(callSites().some(s => isWriteTarget(s.arg)), 'no write-target call sites found — check the pattern');
  });
});
