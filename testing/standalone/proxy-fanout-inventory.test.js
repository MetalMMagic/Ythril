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
const PENDING = {
  'server/src/api/brain/entities.ts': 1,
  'server/src/api/brain/file-meta.ts': 3,
  'server/src/api/brain/search.ts': 7,
  'server/src/api/files.ts': 1,
  'server/src/api/spaces.ts': 4,
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
const NOT_CALL_SITES = new Set(['server/src/spaces/proxy.ts', 'server/src/auth/proxy-reach.ts']);

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

describe('the fan-out inventory matches the source', () => {
  const sites = callSites();

  it('finds call sites at all — an empty sweep would pass everything', () => {
    // The failure this repo keeps finding: a gate whose measurement returns nothing reads exactly like a clean one.
    assert.ok(sites.length >= 20, `only found ${sites.length} call sites — the sweep is broken`);
  });

  it('classifies every site as a write target or a listed read fan-out', () => {
    const unlisted = [];
    for (const s of sites) {
      if (isWriteTarget(s.arg)) continue;
      if (!(s.file in PENDING)) unlisted.push(`${s.file} → resolveMemberSpaces(${s.arg})`);
    }
    assert.deepEqual(unlisted, [],
      'a read fan-out in a file the inventory does not list. Narrow it to the token\'s members '
      + '(auth/proxy-reach.ts) and add the file to PENDING, or explain why it cannot expose another space.');
  });

  it('counts match per file, so a NEW fan-out in a known file is caught', () => {
    const actual = {};
    for (const s of sites) {
      if (isWriteTarget(s.arg)) continue;
      actual[s.file] = (actual[s.file] ?? 0) + 1;
    }
    assert.deepEqual(actual, PENDING);
  });

  it('has no stale entry — every listed file still contains a fan-out', () => {
    // A list that outlives its code is how an inventory starts describing the past. Same reason the tracker rule
    // says a checkbox is not evidence.
    const seen = new Set(sites.filter(s => !isWriteTarget(s.arg)).map(s => s.file));
    assert.deepEqual([...Object.keys(PENDING)].filter(f => !seen.has(f)), []);
  });
});

describe('the write-target classification is real, not a loophole', () => {
  it('recognises exactly the resolved-write-target form', () => {
    assert.equal(isWriteTarget('wt.target'), true);
    // Anything that merely mentions the request's space is a fan-out, however it is spelled.
    for (const arg of ['spaceId', 'id', 'callSpace', 'rawSpace', 's.id', 'wt.target ?? spaceId', 'proxyId']) {
      assert.equal(isWriteTarget(arg), false, `${arg} must not classify as a write target`);
    }
  });

  it('at least one real write-target site exists, so the branch is exercised', () => {
    // If this were zero, `isWriteTarget` could be wrong in either direction and every test above would still pass.
    assert.ok(callSites().some(s => isWriteTarget(s.arg)), 'no write-target call sites found — check the pattern');
  });
});

describe('the rule from #780 is still unwired', () => {
  it('no fan-out consults it yet, which is what makes this a PENDING list', () => {
    // When this starts failing, it is because the second half has begun — at which point the entries move to
    // NARROWED and the assertions above tighten. It failing is the signal to update this file, not a defect.
    const hits = execSync('git grep --untracked -l "memberSpacesForToken\\|mayUseProxy" -- server/src || true',
      { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    assert.deepEqual(hits, ['server/src/auth/proxy-reach.ts']);
  });
});
