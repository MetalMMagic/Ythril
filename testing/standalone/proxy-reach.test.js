/**
 * A proxy space narrowed to the members a token may see.
 *
 * ## The direction that matters
 *
 * This exists to LET a scoped token onto a proxy, which means the dangerous mistake is not refusing too much — it
 * is returning one member the token cannot reach. That leaks records from another space through the proxy, and
 * every response still looks well-formed. So most of what follows asserts the subset property from several angles
 * rather than checking a happy path once.
 *
 * A count is deliberately not trusted anywhere: the same size with a substituted id would pass a length check.
 *
 * Run: node --test testing/standalone/proxy-reach.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let memberSpacesForToken, narrowsOnly;
before(async () => {
  ({ memberSpacesForToken, narrowsOnly } = await import('../../server/dist/auth/proxy-reach.js'));
});

const ALL = ['qa', 'team', 'research', 'ops'];

/** Rights reaching exactly the named spaces: a row per space, floor absent. */
const rightsFor = (...spaces) => ({
  instanceAdmin: false,
  createSpaces: false,
  floor: null,
  perSpace: Object.fromEntries(spaces.map(s => [s, { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' }])),
});

/** A floor reaches every space, including ones created later — that is what a floor IS. */
const withFloor = () => ({
  instanceAdmin: false,
  createSpaces: false,
  floor: { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' },
  perSpace: {},
});

describe('narrowing by rights', () => {
  it('returns the INTERSECTION, not the full member list', () => {
    // The ask. A token holding qa+team against an all-spaces proxy sees qa and team, not research or ops.
    assert.deepEqual(memberSpacesForToken(rightsFor('qa', 'team'), ALL), ['qa', 'team']);
  });

  it('preserves the member list ORDER rather than the token\'s', () => {
    // The read path fans out over this; a reordering would make paging and any first-match lookup depend on how a
    // token happened to be written.
    assert.deepEqual(memberSpacesForToken(rightsFor('ops', 'qa'), ALL), ['qa', 'ops']);
  });

  it('drops a space the token holds that is NOT a member of this proxy', () => {
    // Otherwise a token could reach a space through a proxy that does not contain it.
    assert.deepEqual(memberSpacesForToken(rightsFor('qa', 'elsewhere'), ALL), ['qa']);
  });

  it('returns everything when the token has a FLOOR', () => {
    // A floor is a minimum across all spaces including future ones, so it reaches every member by definition.
    assert.deepEqual(memberSpacesForToken(withFloor(), ALL), ALL);
  });

  it('returns nothing when the token reaches no member', () => {
    assert.deepEqual(memberSpacesForToken(rightsFor('elsewhere'), ALL), []);
  });
});

describe('the legacy fallback, for OIDC records with no rights', () => {
  it('a record with NO matrix reaches no member — it used to reach every one', () => {
    /*
     * These four cases asserted the legacy allowlist: filtered by it when present, and UNRESTRICTED when
     * absent. The absent arm is the one that mattered — a record carrying neither a matrix nor an allowlist
     * reached every member of the proxy, and a proxy can span the whole instance.
     *
     * 4.0 removes the arm. The reason it was kept — "an OIDC-derived token is built per request and never
     * seen by the config backfill" — expired when the OIDC path started deriving a matrix through the same
     * `migrateToken` the migration uses, so no record without one reaches a handler
     * (`a-token-without-a-matrix-reaches-nothing.test.js` establishes that end of it).
     */
    assert.deepEqual(memberSpacesForToken(undefined, ALL), []);
  });

  it('never returns a member that is not in the full list', () => {
    // The leak, asserted directly rather than inferred from the implementation reading correctly.
    for (const r of [rightsFor('qa'), rightsFor('qa', 'team'), withFloor(), rightsFor()]) {
      const out = memberSpacesForToken(r, ALL);
      assert.ok(narrowsOnly(out, ALL), `${JSON.stringify(out)} is not a subset of the members`);
    }
  });

  it('narrowsOnly REJECTS a foreign id, so the check is not vacuous', () => {
    // A predicate that returns true for everything would pass every test above.
    assert.equal(narrowsOnly(['qa', 'secret'], ALL), false);
    assert.equal(narrowsOnly(['secret'], ALL), false);
  });

  it('narrowsOnly rejects a DUPLICATE, which a subset check alone would allow', () => {
    // A duplicated member would make a read path visit one space twice and double its results — a wrong answer
    // that is not a permission failure, so nothing else here would catch it.
    assert.equal(narrowsOnly(['qa', 'qa'], ALL), false);
  });

  it('accepts the empty set and the whole set', () => {
    assert.equal(narrowsOnly([], ALL), true);
    assert.equal(narrowsOnly([...ALL], ALL), true);
  });
});

/*
 * `mayUseProxy` was here, and it is DELETED rather than re-pointed.
 *
 * It had no production caller — only this block — and what it expressed was a third statement of a rule two
 * live paths already implement: the MCP dispatcher refuses when `memberSpacesWithin(...)` is empty, and
 * `spaceTargets` hands the original space back so the reach guard answers. A rule with three
 * implementations and one caller is the shape this change exists to reduce, and a function kept alive by
 * its own test is the way it survives.
 *
 * The property it asserted is not lost: "one reachable member is enough" is the same statement as
 * "the intersection is non-empty", which the cases above check directly on `memberSpacesForToken`.
 */

describe('the rule is reached through ONE seam', () => {
  it('only spaces/proxy-scoped.ts calls it', async () => {
    // This replaced an assertion that nothing called it at all, which was right until the conversion began and then
    // failed against correct code. The property worth keeping is not "unused" — it is that every read path goes
    // through the one wrapper that also does the config lookup. A handler calling the pure rule directly would have
    // to resolve the member list itself, which is the second copy that makes two answers to one question.
    const { execSync } = await import('node:child_process');
    const hits = execSync('git grep --untracked -l "memberSpacesForToken(" -- server/src || true',
      { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
    assert.deepEqual(hits, ['server/src/auth/proxy-reach.ts', 'server/src/spaces/proxy-scoped.ts']);
  });
});

/**
 * ── The proxy lens must NARROW, not fail closed on the whole member list ────────────────────────────
 *
 * Shipped grantable in 2.6.0 and never narrowing. `spaceTargets()` returned the full member list, and
 * `enforceAreaRung` then walked it refusing on the first member the token lacked. So a token scoped to 22
 * spaces with the commons deliberately absent got, for the whole proxy:
 *
 *     403 Token needs 'read' on knowledge in space 'general'
 *
 * A token holding ['qa','team'] recalled across NOTHING — the exact opposite of the ask it answered.
 *
 * The reporter located it for us: a proxy over the same members MINUS the commons read 200 and returned
 * results. So proxy-to-a-scoped-token worked; only the narrowing did not, and the difference between the two
 * cases was a member the token cannot see.
 *
 * Asserted on the source because the behaviour needs a live proxy, a scoped token and a route inventory to
 * observe, and the mechanism is what regressed: the area check must read the NARROWED list. A test that
 * mocked all three would be asserting its own mock.
 */
describe('the proxy lens narrows instead of failing closed', () => {
  const src = readFileSync('server/src/auth/middleware.ts', 'utf8')
    .replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

  it('the area/rung check is handed the token record, so it can narrow', () => {
    // The regression is exactly this argument going missing: without the record there is nothing to narrow by,
    // and the function silently falls back to the full member list.
    const calls = [...src.matchAll(/enforceAreaRung\(res, record, req, spaceTargets\(([^)]*)\)\)/g)]
      .map(m => m[1].replace(/\s/g, ''));
    assert.ok(calls.length >= 2, `expected the space-auth call sites, found ${calls.length}`);
    assert.deepEqual([...new Set(calls)], ['spaceId,record'],
      'every call must pass the record — a call site that passes only the id asks the un-narrowed question');
  });

  it('spaceTargets filters the members by reach', () => {
    const fn = src.slice(src.indexOf('function spaceTargets'), src.indexOf('function enforceAreaRung'));
    assert.match(fn, /reachesSpace\(rights, sid\)/,
      'the narrowing must use the same reach predicate the reach guard uses, not a second rule');
  });

  it('no longer reads the allowlist at all, so the conflation cannot come back here', () => {
    /*
     * This asserted the legacy rule inside the narrowing: an EMPTY allowlist reaches nothing, an ABSENT one
     * reaches everything. That rule was right about the field, and it was the conflation of the two — reading
     * empty as absent — that granted whole instances on three routes in 2.6.0.
     *
     * 4.0 removes the arm rather than restating it. Nothing here consults the allowlist, so the conflation
     * has nowhere to reappear, and the case that replaces it is stronger: no matrix reaches NOTHING, where
     * the old composite reached everything.
     */
    const fn = src.slice(src.indexOf('function spaceTargets'), src.indexOf('function enforceAreaRung'));
    assert.doesNotMatch(fn, /legacySpacesOf|\.spaces\b/,
      'the narrowing must not read the legacy allowlist — the matrix is the only scoping input');
    assert.match(fn, /rights \? all\.filter\(sid => reachesSpace\(rights, sid\)\) : \[\]/,
      'and a record with no matrix must narrow to nothing, explicitly');
  });

  it('a narrowing that empties still refuses, via the reach guard', () => {
    // Returning [] here would mean "check no space at all", which is access rather than a refusal. The reach
    // guard owns that 403, so the fallback hands back the original list and lets it answer.
    const fn = src.slice(src.indexOf('function spaceTargets'), src.indexOf('function enforceAreaRung'));
    assert.match(fn, /reachable\.length > 0 \? reachable : all/,
      'an empty narrowing must fall back so the reach guard produces the refusal');
  });
});
