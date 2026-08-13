/**
 * `POST /api/tokens` accepts a rights matrix, refuses one above the minter, and refuses both descriptions
 * of access in one request.
 *
 * ## Why "both" is a refusal rather than a precedence rule
 *
 * A body carrying `rights` AND `spaces`/`admin`/`readOnly` describes the same thing twice. Any precedence
 * rule makes one of them silent — the caller states an access, the server ignores it, and both parties
 * believe the request succeeded. That is the failure this whole area keeps producing. Refusing costs one
 * call; guessing costs an access nobody chose.
 *
 * ## Why the cap is asserted on the ROUTE and not only on `capRights`
 *
 * `mint-cannot-exceed-minter.test.js` proves the rule. This proves the route applies it — and that it reads
 * the minter's own matrix rather than trusting the request. A correct rule nobody calls is indistinguishable
 * from no rule, and on this endpoint the difference is an escalation ladder.
 *
 * Run: node --test testing/standalone/mint-accepts-rights-capped.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/api/tokens.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const code = withoutComments(src);

describe('minting with a rights matrix', () => {
  it('the create body accepts `rights`', () => {
    assert.match(code, /rights:\s*z\.object\(/, 'a rights matrix cannot be set on mint, so nothing can use it');
  });

  it('the rights object is itself strict', () => {
    // The same defect the body had: an unknown key inside `rights` would be dropped, and a mis-spelled area
    // would mint a token with less than asked for while reporting success.
    const i = code.indexOf('rights: z.object(');
    assert.match(code.slice(i, i + 600), /\}\)\.strict\(\)/, 'the nested rights object drops unknown keys');
  });

  it('refuses `rights` together with the legacy fields', () => {
    assert.match(code, /Specify either `rights` or the legacy/,
      'both descriptions are accepted, so one of them is applied silently');
  });

  it('calls the cap, and refuses rather than trimming', () => {
    assert.match(code, /capRights\(/, 'the mint cap is not applied on the route');
    assert.match(code, /status\(403\)/);
    assert.match(code, /cannot mint rights it does not hold/);
    assert.match(code, /describeExcess\(/, 'the refusal must name what was over the line');
  });

  it('derives the minter matrix when the record carries none', () => {
    // OIDC records never pass through the config backfill. Treating a missing matrix as "unrestricted"
    // would be the widening this endpoint exists to prevent, so it is derived from the legacy fields.
    assert.match(code, /migrateToken\(req\.authToken/,
      'a token with no rights would mint unchecked');
  });

  it('the accepted rights actually REACH the stored token', () => {
    // The defect this endpoint already had once: a field accepted, validated, and then dropped on the way to
    // storage. The caller is told 201, the token is minted, and the matrix they asked for is nowhere. Here
    // the drop would be worse than in #750 — the token would fall back to the legacy fields it was meant to
    // replace, so it would work, and work WRONGLY.
    assert.match(code, /createToken\(\{[^}]*rights/,
      'createToken is called without `rights`, so an accepted matrix is silently discarded');
    const store = readFileSync(join(ROOT, 'server/src/auth/tokens.ts'), 'utf8');
    assert.match(withoutComments(store), /opts\.rights \? \{ rights: opts\.rights \}/,
      'createToken does not persist the matrix it was handed');
  });

  it('the cap runs BEFORE anything is created', () => {
    const capAt = code.indexOf('capRights(');
    const createAt = code.indexOf('createToken(');
    assert.ok(capAt > 0 && createAt > 0, 'expected both calls to exist');
    assert.ok(capAt < createAt, 'the token is minted before the cap is checked, so the refusal is too late');
  });
});
