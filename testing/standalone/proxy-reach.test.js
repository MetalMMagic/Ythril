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

let memberSpacesForToken, narrowsOnly, mayUseProxy;
before(async () => {
  ({ memberSpacesForToken, narrowsOnly, mayUseProxy } = await import('../../server/dist/auth/proxy-reach.js'));
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
    assert.deepEqual(memberSpacesForToken(rightsFor('qa', 'team'), undefined, ALL), ['qa', 'team']);
  });

  it('preserves the member list ORDER rather than the token\'s', () => {
    // The read path fans out over this; a reordering would make paging and any first-match lookup depend on how a
    // token happened to be written.
    assert.deepEqual(memberSpacesForToken(rightsFor('ops', 'qa'), undefined, ALL), ['qa', 'ops']);
  });

  it('drops a space the token holds that is NOT a member of this proxy', () => {
    // Otherwise a token could reach a space through a proxy that does not contain it.
    assert.deepEqual(memberSpacesForToken(rightsFor('qa', 'elsewhere'), undefined, ALL), ['qa']);
  });

  it('returns everything when the token has a FLOOR', () => {
    // A floor is a minimum across all spaces including future ones, so it reaches every member by definition.
    assert.deepEqual(memberSpacesForToken(withFloor(), undefined, ALL), ALL);
  });

  it('returns nothing when the token reaches no member', () => {
    assert.deepEqual(memberSpacesForToken(rightsFor('elsewhere'), undefined, ALL), []);
  });
});

describe('the legacy fallback, for OIDC records with no rights', () => {
  it('filters by the spaces allowlist', () => {
    assert.deepEqual(memberSpacesForToken(undefined, ['team', 'ops'], ALL), ['team', 'ops']);
  });

  it('UNDEFINED spaces means unrestricted — every member', () => {
    assert.deepEqual(memberSpacesForToken(undefined, undefined, ALL), ALL);
  });

  it('an EMPTY array is not unrestricted', () => {
    // The trap this repo has hit in three separate files: `!spaces || spaces.length === 0` reading as "all".
    // The check must be on `undefined` alone.
    assert.deepEqual(memberSpacesForToken(undefined, [], ALL), []);
  });

  it('does not return a member the allowlist omits', () => {
    assert.deepEqual(memberSpacesForToken(undefined, ['qa'], ALL), ['qa']);
  });
});

describe('it can only ever NARROW', () => {
  it('never returns a member that is not in the full list', () => {
    // The leak, asserted directly rather than inferred from the implementation reading correctly.
    for (const r of [rightsFor('qa'), rightsFor('qa', 'team'), withFloor(), rightsFor()]) {
      const out = memberSpacesForToken(r, undefined, ALL);
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

describe('may the token use the proxy at all', () => {
  it('ONE reachable member is enough', () => {
    // The entire point of the change: today the answer is "only if you reach every member", which is why a scoped
    // token gets 403 on an all-spaces proxy.
    assert.equal(mayUseProxy(rightsFor('qa'), undefined, ALL), true);
  });

  it('no reachable member is a refusal', () => {
    assert.equal(mayUseProxy(rightsFor('elsewhere'), undefined, ALL), false);
    assert.equal(mayUseProxy(undefined, [], ALL), false);
  });

  it('an EMPTY proxy is refused, not answered with nothing', () => {
    // A proxy whose members were all deleted. Answering 200 with an empty body would be indistinguishable from a
    // space the caller cannot see into, which is the worse of the two failures.
    assert.equal(mayUseProxy(withFloor(), undefined, []), false);
    assert.equal(mayUseProxy(undefined, undefined, []), false);
  });

  it('agrees with memberSpacesForToken in every case', () => {
    // Two functions answering one question is how they drift. Pinned so a later change to either is caught.
    for (const [r, legacy] of [[rightsFor('qa'), undefined], [rightsFor('elsewhere'), undefined],
      [withFloor(), undefined], [undefined, ['ops']], [undefined, []], [undefined, undefined]]) {
      assert.equal(
        mayUseProxy(r, legacy, ALL),
        memberSpacesForToken(r, legacy, ALL).length > 0,
        `disagreement for ${JSON.stringify({ r, legacy })}`,
      );
    }
  });
});

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
