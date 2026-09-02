/**
 * MCP and HTTP must answer "which spaces may this token see" the same way.
 *
 * ## The defect this pins
 *
 * `mcp/router.ts` built its accessible-space list from `tokenSpaces` — the legacy allowlist — while
 * `auth/middleware.ts` answered the same question with `reachesSpace` and the per-space rights matrix. Two surfaces,
 * one rule, one of them weaker: the shape of the four defects fixed on 2026-08-05.
 *
 * It was **not exploitable**, and that is worth stating rather than implying, because it changes what this test is
 * for. The migration derives `rights` FROM `spaces`, and `rights-reach-matches-legacy.test.js` proves the two agree
 * across 50 comparisons — so for any config-loaded token both surfaces gave the same answer.
 *
 * The problem was that they can now **diverge**. A token edited directly through the rights-matrix editor has a
 * `spaces` array that no longer describes it, and MCP was still reading the array. The error had no fixed direction
 * either: the matrix can be narrower than the legacy list as well as wider, so this was not "MCP is more permissive"
 * — it was "MCP is answering from stale data".
 *
 * ## Why the assertions are on source
 *
 * `createGlobalMcpServer` is a private factory that builds an SDK `Server` over a live config and a transport. What
 * is worth guarding is not its output but two structural facts: that it consults `reachesSpace` when rights exist,
 * and that the legacy branch survives for records that have none. Both are visible without standing up a session,
 * and a test that needed a session would not have been written.
 *
 * Run: node --test testing/standalone/mcp-reads-rights-matrix.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../server/src/mcp/router.ts', import.meta.url), 'utf8');
/** Comments must not satisfy any of this — several of them describe the very defect being pinned. */
const CODE = SRC.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the rights matrix decides', () => {
  it('consults reachesSpace, not the allowlist alone', () => {
    assert.match(CODE, /reachesSpace\(rights, s\.id\)/);
    assert.match(CODE, /from '\.\.\/auth\/space-reach\.js'/);
  });

  it('receives the rights from the request at every transport that builds a server', () => {
    /*
     * This asserted a count of TWO: SSE and streamable HTTP each built their own server, and threading the
     * rights through one and not the other would have left a whole transport on the old answer — the
     * less-used one, so it would have gone unnoticed. That is exactly the defect this file exists for.
     *
     * 4.0 removed SSE, so the count is ONE. Written as a count against the number of servers the file
     * builds rather than as a literal `1`, because the number is not the rule: the rule is that no server
     * gets constructed without the request's rights, and the next transport added must not be able to
     * satisfy this by leaving the count alone.
     */
    const builds = (CODE.match(/createGlobalMcpServer\(/g) ?? []).length - 1; // -1 for the definition
    assert.ok(builds >= 1, 'no transport builds an MCP server — the parse is wrong, not the code');
    assert.equal((CODE.match(/tokenRights\(req\.authToken\)/g) ?? []).length, builds,
      `${builds} transport(s) build a server; each must pass the request's rights matrix`);
  });

  it('has NO legacy branch, and no second gate one line further on', () => {
    /*
     * This asserted the legacy branch was KEPT, on the grounds that "OIDC tokens are built per request and
     * never reach the config backfill — removing this refuses them all".
     *
     * That reason expired. The OIDC path derives a matrix per request through the same `migrateToken` the
     * migration uses (`oidc.ts`), which was the fix for OIDC connections being governed by the old booleans
     * while PATs were enforced per space and per area. So the branch served nobody — and while it sat there
     * it failed OPEN, because an absent legacy allowlist meant unrestricted.
     *
     * `a-token-without-a-matrix-reaches-nothing.test.js` carries the proof that no record without a matrix
     * reaches a handler; what is asserted here is that this surface no longer has the arm.
     */
    assert.match(CODE, /rights \? reachesSpace\(rights, s\.id\) : false/,
      'the accessible-space filter reads the matrix, and answers false without one');

    /*
     * And the dispatcher's own per-call check went with it, which is the find worth recording: it read
     * `if (tokenSpaces && !tokenSpaces.includes(rawSpace))` on EVERY call, matrix or not — the belt-and-braces
     * `&&` the case below forbids in the filter, sitting one screen away from it. Harmless while the array
     * agreed with the matrix it was derived from, and a silent refusal of access the matrix grants the moment
     * a token was edited through the rights editor.
     */
    assert.doesNotMatch(CODE, /tokenSpaces/,
      'no surface of the dispatcher may consult the legacy allowlist');
  });

  it('does not read `spaces` when rights are present', () => {
    // The whole defect. A belt-and-braces `&&` of the two would re-admit the stale array as a second gate, and the
    // matrix can be WIDER than the legacy list — so an `&&` would silently refuse access the matrix grants.
    const filter = CODE.slice(CODE.indexOf('const accessibleSpaces'), CODE.indexOf('const accessibleSpaceIds'));
    assert.ok(!/tokenSpaces\.includes\(s\.id\)\s*&&/.test(filter), 'the legacy list is still gating alongside rights');
    assert.ok(!/&&\s*!?tokenSpaces/.test(filter), 'the legacy list is still gating alongside rights');
  });
});

describe('the cast is written once', () => {
  it('has a named helper rather than an inline cast per call site', () => {
    // `OidcTokenRecord` has no `rights`, so the union needs a narrowing it cannot express. Two inline copies is how
    // one of them later gets a different fallback.
    assert.match(CODE, /function tokenRights\(record: unknown\): TokenRights \| undefined/);
    assert.ok(!/\(req\.authToken as \{ rights/.test(CODE), 'an inline cast crept back in');
  });

  it('returns undefined rather than throwing on an absent record', () => {
    assert.match(CODE, /\(record as \{ rights\?: TokenRights \} \| undefined\)\?\.rights/);
  });
});
