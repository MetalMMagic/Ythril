/**
 * A token you READ must be a token you can WRITE back.
 *
 * ## What was reported
 *
 * `GET /api/tokens` returns the whole record minus the hash — twelve fields. `PATCH /api/tokens/:id`
 * accepted two, `name` and `rights`, and refused everything else by way of `.strict()`. So the ordinary
 * integration shape — read a token, change its name, send it back — answered:
 *
 *     400  Unrecognized key(s) in object: 'spaces'
 *
 * The reporter's words: *"the shape you read is not the shape you may write, and nothing says which fields
 * are which."* `spaces` is only the first field alphabetically; `createdAt`, `expiresAt`, `lastUsed`,
 * `admin`, `readOnly`, `mfa`, `schemaLibrary`, `peerInstanceId` and `oauthClientId` were all in the same
 * position. The 400 named one of them and implied the field did not exist, when the truth is that its
 * remedy moved to `rights`.
 *
 * ## Why neither obvious fix is right, and what the third one is
 *
 * **Strip them**, the way `id`/`hash`/`prefix` are stripped, and a body carrying `spaces: ['other']` beside
 * the name is silently dropped and answered **200** — an attempt to widen a token that looks exactly like
 * one that worked. This route already had that bug and already fixed it; re-fixing the round-trip that way
 * would trade one silent failure for the one it replaced.
 *
 * **Refuse them** and you have the report.
 *
 * The distinction both answers lose is ECHO versus CHANGE. The same value back is a round-trip: ignore it.
 * A different value is an attempt to edit through a field that no longer writes: refuse it, and name the
 * field that does. That needs the stored record, which is why it cannot live in the schema — a `.refine()`
 * sees only the body, and every check below is one a schema is structurally unable to make.
 *
 * Run: node --test testing/standalone/token-read-shape-round-trips.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let ECHOABLE, isEcho;
before(async () => {
  ({ ECHOABLE, isEcho } = await import('../../server/dist/api/tokens.js'));
});

const strip = s => s.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const src = () => strip(readFileSync('server/src/api/tokens.ts', 'utf8'));

describe('every field the list route emits is answerable by the edit route', () => {
  it('covers the record, field for field — derived from the type, not hand-listed', () => {
    // The point of deriving: a field added to `TokenRecord` tomorrow appears in `GET` for free and would
    // silently go back to 400-ing the round-trip. Hand-listing the names here would keep passing.
    const types = strip(readFileSync('server/src/config/types.ts', 'utf8'));
    const body = types.slice(types.indexOf('export interface TokenRecord'));
    const fields = [...body.slice(0, body.indexOf('\n}')).matchAll(/^\s{2}(\w+)\??:/gm)].map(m => m[1]);
    assert.ok(fields.length >= 10, `parsed only ${fields.length} fields off TokenRecord — re-point this`);

    // `hash` never leaves the server; `id`/`prefix` are stripped; `name`, `rights` and `mfa` are the three the
    // route actually edits. Everything else must be echoable or the round-trip 400s on it.
    //
    // `mfa` joined the editable set rather than the echoable one: it was settable only while minting, which
    // meant changing a scheduler's second factor required revoking the token and minting a replacement —
    // rotating a secret to change a flag. Granting an exemption still costs a live TOTP code on the request,
    // pinned by `mfa-is-editable-and-still-guarded.test.js`.
    const accountedFor = new Set(['hash', 'id', 'prefix', 'name', 'rights', 'mfa', ...Object.keys(ECHOABLE)]);
    const orphans = fields.filter(f => !accountedFor.has(f));
    assert.deepEqual(orphans, [],
      `${orphans.join(', ')} are returned by GET and would be refused by PATCH — a token read back cannot `
      + 'be written back, which is the exact report this fixed');
  });

  it('the three legacy scope fields name their replacement; the mint-time ones do not pretend to have one', () => {
    // A 400 that says "unknown key" for `spaces` is worse than useless: the field IS real, it is just no
    // longer where scope is written. The message has to carry the remedy or the caller probes for it.
    for (const f of ['spaces', 'admin', 'readOnly']) {
      assert.match(ECHOABLE[f], /rights/,
        `\`${f}\` moved to the rights matrix; its refusal must say so rather than denying the field exists`);
    }
    assert.equal(ECHOABLE['createdAt'], null, 'createdAt has no remedy — claiming one would send the caller looking');
    assert.equal(ECHOABLE['oauthClientId'], null);
  });
});

describe('echo versus change', () => {
  it('the same value back is an echo, whatever the type', () => {
    assert.equal(isEcho('createdAt', '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z'), true);
    assert.equal(isEcho('mfa', 'exempt', 'exempt'), true);
    assert.equal(isEcho('expiresAt', null, null), true);
    assert.equal(isEcho('spaces', ['qa', 'team'], ['qa', 'team']), true);
  });

  it('a different value is a change', () => {
    assert.equal(isEcho('createdAt', '2026-08-02T00:00:00Z', '2026-08-01T00:00:00Z'), false);
    assert.equal(isEcho('mfa', 'exempt', 'required'), false);
    assert.equal(isEcho('spaces', ['qa', 'ops'], ['qa', 'team']), false);
  });

  it('a REORDERED allowlist is still an echo', () => {
    // An allowlist has no order, and a client that round-trips through a map or a set may hand it back
    // permuted. Refusing that would fail a caller who changed nothing.
    assert.equal(isEcho('spaces', ['team', 'qa'], ['qa', 'team']), true);
  });

  it('a LONGER allowlist containing the stored one is NOT an echo', () => {
    // The widening this whole check exists to catch, and the one a "does it contain everything stored"
    // reading would wave through.
    assert.equal(isEcho('spaces', ['qa', 'team', 'secret'], ['qa', 'team']), false);
    assert.equal(isEcho('spaces', ['qa'], ['qa', 'team']), false);
  });

  it('a DUPLICATE that keeps the length is not an echo', () => {
    // `['qa','qa']` against `['qa','team']`: same length, same first element, and `team` silently dropped.
    // A length check plus a first-element check would pass it.
    assert.equal(isEcho('spaces', ['qa', 'qa'], ['qa', 'team']), false);
  });

  it('ABSENT and EMPTY spaces are not the same value', () => {
    // Absent means every space including future ones; `[]` means none. Reading them as equal here would let
    // a token scoped to nothing be echoed as unrestricted, or the reverse — the same conflation this repo
    // has now fixed in four separate files, arriving through an equality check.
    assert.equal(isEcho('spaces', [], undefined), false);
    assert.equal(isEcho('spaces', undefined, []), false);
    assert.equal(isEcho('spaces', undefined, undefined), true);
    assert.equal(isEcho('spaces', [], []), true);
  });

  it('an absent boolean and an explicit false ARE the same token', () => {
    // `admin` is optional on the record and omitted when false, so a client that reads a non-admin token
    // and sends `admin: false` back has changed nothing. This is the one place a loose reading is correct,
    // and it is correct because both spellings mean exactly one thing — unlike `spaces`.
    assert.equal(isEcho('admin', false, undefined), true);
    assert.equal(isEcho('readOnly', false, undefined), true);
    assert.equal(isEcho('admin', true, undefined), false, 'undefined is not admin; true would be an escalation');
    assert.equal(isEcho('admin', false, true), false, 'a DEMOTION is still a change, and still refused by name');
  });
});

describe('the route wires it in the only order that works', () => {
  const patch = () => {
    const s = src();
    const i = s.indexOf("tokensRouter.patch('/:id'");
    return s.slice(i, s.indexOf('tokensRouter.post', i));
  };

  it('presence is read off the RAW body, not the parsed data', () => {
    // `z.unknown()` cannot tell an absent key from one explicitly set to `undefined`, and that is the
    // difference between "did not mention spaces" and "sent spaces: undefined" — which for this field is
    // the difference between no change and a change to all-spaces.
    assert.match(patch(), /hasOwnProperty\.call\(sentBody, f\)/,
      'reading presence off the parsed object cannot distinguish absent from undefined');
  });

  it('the change check runs BEFORE the nothing-to-change answer', () => {
    // Order is the message quality. A body of `{spaces: ['other']}` must say "spaces moved to rights", not
    // "provide name or rights" — the latter is true and tells the caller nothing about what they attempted.
    const b = patch();
    assert.ok(b.indexOf('attempted.length > 0') < b.indexOf("name === undefined && rights === undefined"),
      'the empty-body refusal would mask the useful one');
  });

  it('both answers come after the token is known to exist', () => {
    // Otherwise a PATCH to a nonexistent id reports on its BODY, which tells an unauthenticated prober that
    // the id was at least well-formed. 404 first.
    const b = patch();
    assert.ok(b.indexOf("res.status(404)") < b.indexOf('attempted.length > 0'),
      'a 400 about field shape must not precede the 404 for a token that is not there');
  });

  it('the echo fields are declared on the schema, so strictness still catches a MIS-SPELLING', () => {
    // The half that must not be lost: `.strict()` is what stops `spaceIds` from being accepted and dropped.
    // Widening the schema to `.passthrough()` would have fixed the round-trip and re-opened that.
    const s = src();
    const schema = s.slice(s.indexOf('const RenameTokenBody'), s.indexOf('tokensRouter.patch'));
    assert.match(schema, /\}\)\.strict\(\)/, 'the edit body must stay strict — a mis-spelled field is a silent no-op');
    assert.match(schema, /ECHOABLE_FIELDS\.map/,
      'the echo fields must be declared from the one list, not spelled again beside it');
  });
});
