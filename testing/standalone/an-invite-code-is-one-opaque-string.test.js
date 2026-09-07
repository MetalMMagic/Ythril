/**
 * A network invite is ONE opaque line, and it round-trips to exactly the bundle it replaced.
 *
 * ## What the owner asked for, and why it is an appearance requirement
 *
 * 2026-09-02: *"i just would like it to be a single string at the end and not something that looks like a
 * json object — thats too frightening for some tech-averse people i had to learn from my wife."*
 *
 * So the acceptance test is about what the recipient SEES. No braces, no quotes, no line breaks, nothing
 * that looks breakable — one line to select and paste. That is asserted here as a property of the string
 * rather than left to a screenshot, because a future change that starts embedding a newline (a PEM does
 * contain them) would pass every test about the DATA and fail the requirement completely.
 *
 * ## The whole bundle travels, and that is the security decision rather than a convenience
 *
 * The alternative was a short URL the joiner fetches the rest from. The inviter's RSA public key is what
 * pins the handshake to the intended instance, and it currently travels OUT OF BAND — so a fetch is a place
 * to substitute a key, after which the joiner encrypts to whoever answered. Carrying everything keeps the
 * key out of band, adds no unauthenticated GET, and costs about a kilobyte of one unbroken line.
 *
 * **Base64 is an ENCODING, not encryption, and the code contains the `handshakeId`** — which `apply` and
 * `finalize` accept as their only credential. What limits that is what limits an SSE ticket: the session
 * expires after an hour and is consumed on apply. The UI has to say so, which is asserted at the end.
 *
 * Run: node --test testing/standalone/an-invite-code-is-one-opaque-string.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { INVITE_CODE_PREFIX, encodeInviteCode, decodeInviteCode } =
  await import('../../server/dist/api/invite-code.js');

/** A bundle shaped like the one `/api/invite/generate` returns, PEM line breaks included. */
const BUNDLE = {
  handshakeId: '7b2b0f6e-0000-4000-8000-00000000abcd',
  networkId: 'n-1',
  inviteUrl: 'https://inviter.example/api/invite/apply',
  rsaPublicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIICIjANBg\nkqhkiG9w0B\n-----END PUBLIC KEY-----\n',
  expiresAt: '2026-09-07T23:00:00.000Z',
  spaces: ['general', 'ops'],
};

describe('the code is one line a person can paste without fear', () => {
  it('carries nothing that looks like structure', () => {
    const code = encodeInviteCode(BUNDLE);
    for (const [what, re] of [
      ['a brace', /[{}]/], ['a quote', /["']/], ['a line break', /[\r\n]/], ['a space', /\s/],
      ['an angle bracket', /[<>]/], ['a comma', /,/],
    ]) {
      assert.doesNotMatch(code, re, `the invite code contains ${what}, which is what the JSON bundle was`);
    }
  });

  it('says what it is, so a recipient can tell it apart from a password or a token', () => {
    // The prefix is the one thing in it a person can read. Without it, an invite and any other long
    // opaque string are indistinguishable in a chat window, and the joiner's UI would have to guess.
    const code = encodeInviteCode(BUNDLE);
    assert.ok(code.startsWith(INVITE_CODE_PREFIX), `an invite code must start with ${INVITE_CODE_PREFIX}`);
    assert.match(INVITE_CODE_PREFIX, /\d/, 'the prefix must carry a version, or the format cannot change');
  });

  it('uses the URL-safe alphabet, so a chat client cannot linkify or wrap it', () => {
    // `+` and `/` are what make plain base64 unsafe here: a `/` invites a client to read the tail as a
    // path, and both are re-encoded by some transports. Padding is dropped for the same reason.
    const code = encodeInviteCode(BUNDLE);
    assert.doesNotMatch(code.slice(INVITE_CODE_PREFIX.length), /[+/=]/,
      'the payload must be base64url without padding');
  });
});

describe('and it decodes to exactly what was encoded', () => {
  it('round-trips the bundle, PEM and all', () => {
    assert.deepEqual(decodeInviteCode(encodeInviteCode(BUNDLE)), BUNDLE);
  });

  it('refuses anything that is not one of ours, rather than half-decoding it', () => {
    for (const bad of ['', 'hello', 'ythril1_', 'ythril1_!!!!', '{"handshakeId":"x"}',
      `${INVITE_CODE_PREFIX}bm90LWpzb24`]) {
      assert.equal(decodeInviteCode(bad), null, `${JSON.stringify(bad)} must not decode`);
    }
  });

  it('refuses a decoded object that is missing a field the joiner needs', () => {
    // The joiner's next step posts these four to the inviter. A code missing one produces a request that
    // fails at the far end with a message about a field the person never saw — so it is refused here.
    for (const drop of ['handshakeId', 'networkId', 'inviteUrl', 'rsaPublicKeyPem']) {
      const partial = { ...BUNDLE };
      delete partial[drop];
      assert.equal(decodeInviteCode(encodeInviteCode(partial)), null,
        `a code with no ${drop} must be refused, not accepted and half-used`);
    }
  });

  it('tolerates what a person does to a pasted string', () => {
    // Selecting a line picks up spaces at both ends, and mail clients add them. Refusing that would be a
    // failure the recipient cannot see the cause of.
    const code = encodeInviteCode(BUNDLE);
    assert.deepEqual(decodeInviteCode(`  ${code}\n`), BUNDLE);
  });
});

describe('both doors and both sides agree', () => {
  const server = readFileSync('server/src/api/invite-code.ts', 'utf8');
  const client = readFileSync('client/src/app/core/invite-code.ts', 'utf8');

  it('the prefix is spelled the same in the client and the server', () => {
    // Two implementations, because the server encodes in Node and the joiner decodes in a browser — there
    // is no shared module between them. What must not drift is the FORMAT, so the one literal that names
    // it is compared directly. A mismatch means every code the inviter produces is rejected by the joiner.
    const quoted = new RegExp(`['"]${INVITE_CODE_PREFIX}['"]`);
    assert.match(server, quoted, 'the server module must declare the prefix as a literal');
    assert.match(client, quoted, 'the client decoder must use the same literal prefix');
  });

  it('the client only ever DECODES — nothing in the browser mints an invite', () => {
    assert.doesNotMatch(client, /\bencodeInviteCode\b/,
      'the browser must not be able to build an invite code: the handshake session it refers to exists '
      + 'only on the inviting server, so a client-built code would name a session nobody has');
  });

  it('the generate route hands the code back beside the bundle it replaces', () => {
    // Beside, not instead of: operators have blobs in flight, and an integrator may already read the
    // fields. The old shape stays until it is deprecated on its own terms.
    const route = readFileSync('server/src/api/invite.ts', 'utf8');
    assert.match(route, /inviteCode:\s*encodeInviteCode\(/, 'the route must return the one-string form');
    assert.match(route, /rsaPublicKeyPem/, 'and must keep the fields the current joiner reads');
  });
});
