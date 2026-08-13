/**
 * A token's second factor is editable, and granting an EXEMPTION still costs a live code.
 *
 * ## Why it became editable
 *
 * `mfa` was settable only while minting. That put the decision before there was a token to decide it about:
 * an operator who wanted their scheduler exempt had to revoke the token and mint a replacement — rotating a
 * secret, and re-deploying it, to change a flag. The owner's framing was that it is a property of the token:
 * *"we decided to use the MFA setting set by the token and not here on creation."*
 *
 * ## Why that is the dangerous edit on this route
 *
 * `requireAdminMfa` is satisfied by an admin token that is ITSELF exempt. That is correct for ordinary work
 * and catastrophic for this one field: one exemption could grant another, and another, until the instance-wide
 * switch protected nothing.
 *
 * Create already demanded a live TOTP code for granting `exempt`, regardless of who was asking. Adding the
 * field to PATCH without that check would have opened the SAME escalation by a shorter route — editing
 * yourself is shorter than minting a replacement — and the new path would look like an ordinary token edit in
 * the audit log.
 *
 * So the checks are asserted to share one function. Two implementations of "does this exemption need a code"
 * is how the two routes come to disagree, and the weaker one wins.
 *
 * Run: node --test testing/standalone/mfa-is-editable-and-still-guarded.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const strip = s => s.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const src = () => strip(readFileSync('server/src/api/tokens.ts', 'utf8'));
const tokensLib = () => strip(readFileSync('server/src/auth/tokens.ts', 'utf8'));

const patchBody = () => {
  const s = src();
  return s.slice(s.indexOf('const RenameTokenBody'), s.indexOf('tokensRouter.patch'));
};
const patchHandler = () => {
  const s = src();
  const i = s.indexOf("tokensRouter.patch('/:id'");
  return s.slice(i, s.indexOf('tokensRouter.post', i));
};

describe('mfa is editable on PATCH', () => {
  it('the edit body accepts the three states, and only those', () => {
    assert.match(patchBody(), /mfa:\s*z\.enum\(\['inherit',\s*'exempt',\s*'required'\]\)\.optional\(\)/,
      'a free-form string would store a fourth state that nothing reads, and read as `inherit` for ever');
  });

  it('it is NOT in the echo-only list any more', () => {
    // While `mfa` was listed there, sending it was accepted-if-unchanged and refused-if-changed with a
    // message saying it is set when the token is minted. Leaving it there while also accepting it would make
    // the route contradict itself: the echo check fires first, so every real edit would 400.
    const s = src();
    const echoable = s.slice(s.indexOf('const ECHOABLE'), s.indexOf('const ECHOABLE_FIELDS'));
    assert.ok(!/\bmfa:/.test(echoable),
      'mfa is both editable and listed as echo-only — the echo check runs first, so every edit would 400');
  });

  it('a body carrying ONLY mfa is a valid edit, not an empty one', () => {
    // The empty-body refusal used to name `name` and `rights`. If it were left alone, changing nothing but
    // the second factor would be reported as "provide something".
    assert.match(patchHandler(), /name === undefined && rights === undefined && mfa === undefined/,
      'an mfa-only body would be refused as empty');
  });

  it('it is written through its own setter', () => {
    // Not folded into `renameToken` or `setTokenRights`. A combined setter taking an optional `mfa` lets a
    // caller change the second factor while believing it renamed — which is the reason those two are already
    // separate from each other.
    assert.match(tokensLib(), /export function setTokenMfa\(/);
    assert.match(patchHandler(), /setTokenMfa\(id, mfa\)/);
  });

  it('`inherit` is stored as ABSENT, not as the string', () => {
    // Every existing token has no `mfa` field. Writing `'inherit'` explicitly would make a token that follows
    // the instance switch look different on disk depending on whether anyone had opened its editor.
    const fn = tokensLib().slice(tokensLib().indexOf('export function setTokenMfa'));
    assert.match(fn.slice(0, fn.indexOf('\n}')), /if \(mfa === 'inherit'\) delete/);
  });
});

describe('granting an exemption still costs a live code', () => {
  it('PATCH calls the same guard create does', () => {
    // The escalation, asserted directly: `requireAdminMfa` is satisfied by an exempt admin token, so without
    // this an exemption grants another exemption and the instance switch protects nothing.
    assert.match(patchHandler(), /exemptionNeedsLiveCode\(req, res, mfa\)/,
      'PATCH accepts `mfa` without demanding a live code — one exemption can now grant the next');
  });

  it('both routes reach it through ONE function', () => {
    const s = src();
    const calls = [...s.matchAll(/exemptionNeedsLiveCode\(/g)].length;
    // One definition, two call sites.
    assert.equal(calls, 3, `expected the definition plus both call sites, found ${calls} mentions`);
    assert.equal([...s.matchAll(/function exemptionNeedsLiveCode/g)].length, 1,
      'a second implementation is how the two routes come to disagree, and the weaker one wins');
  });

  it('the check runs BEFORE anything is written', () => {
    // Otherwise a refused exemption leaves the token renamed-but-not-exempted: half the edit applied, and a
    // 403 that reads as though nothing happened.
    const h = patchHandler();
    assert.ok(h.indexOf('exemptionNeedsLiveCode') < h.indexOf('renameToken(id'),
      'a refused exemption must not leave a partial edit behind');
  });

  it('the audit snapshot records the second factor on both sides', () => {
    // An exemption is the most security-relevant thing this route can change. A diff that omitted it would
    // record the rename beside it and not the exemption.
    const h = patchHandler();
    const snap = h.slice(h.indexOf('req.auditSnapshots'), h.indexOf('if (name !== undefined'));
    assert.equal([...snap.matchAll(/mfa:/g)].length, 2, 'before and after must both carry mfa');
    assert.match(snap, /previous\.mfa \?\? 'inherit'/,
      'an absent mfa reads as inherit; recording it as undefined would make every first edit look like a change');
  });
});
