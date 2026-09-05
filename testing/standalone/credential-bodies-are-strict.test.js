/**
 * Every body schema on the token routes rejects unknown keys.
 *
 * ## The defect this closes
 *
 * Zod drops unknown keys by default. `POST /api/tokens {name, admin:false, spaceIds:['qa']}` therefore
 * returned **201** and minted a token with no `spaces` field at all — an UNSCOPED credential, reported as a
 * success, in response to a request that plainly asked for a scoped one.
 *
 * Reported 2026-08-09 by an operator who probed four plausible spellings (`allowedSpaces`, `scope`,
 * `spaceIds`, `denySpaces`) and got 201 from every one. They found it only by reading the stored token back
 * and noticing four of five probes had no `spaces`. In their words: "somebody guessing the field name gets a
 * token that looks scoped, reports success, and is not scoped at all."
 *
 * The rename route had the same shape with a sharper edge: it accepts a rename only, so `spaces` or `admin`
 * sent alongside the name was dropped and answered 200 — an attempt to widen a token through the rename
 * endpoint looked like it had worked.
 *
 * ## Why this is a gate rather than one assertion
 *
 * The defect is a schema HABIT, not a typo. `z.object({...})` is permissive unless someone remembers
 * otherwise, and remembering is exactly what failed here. So this enumerates every body schema on these
 * routes from source and requires each to be strict — a new one added without `.strict()` fails rather than
 * silently joining the pattern.
 *
 * Run: node --test testing/standalone/credential-bodies-are-strict.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { statementFrom } from './_structural-window.mjs';

const ROOT = process.cwd();
const SRC = 'server/src/api/tokens.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
const code = withoutComments(src);

/** Every `const XBody = z.object({ … })` in the file, with the text that closes it. */
function bodySchemas() {
  const out = [];
  const re = /const\s+(\w*Body)\s*=\s*z\.object\(\{/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    /*
     * The whole declaration, to its terminating `;`. Two things were wrong with the version this replaces: the
     * brace walker counted a `{` or `}` inside a string as nesting, and the 40-character tail meant a comment
     * between the object and its `.strict()` reported the schema LOOSE. Both are the shared helper's job now.
     */
    out.push({ name: m[1], tail: statementFrom(code, m.index, `the ${m[1]} body schema`) });
  }
  return out;
}

describe('token route bodies reject unknown keys', () => {
  it('finds the schemas it is meant to be checking', () => {
    // A gate that enumerates nothing passes vacuously and would keep passing if the file were renamed.
    const found = bodySchemas();
    assert.ok(found.length >= 2, `expected at least two body schemas in ${SRC}, found ${found.length}`);
    assert.ok(found.some(s => s.name === 'CreateTokenBody'), `CreateTokenBody is gone — re-point this test`);
  });

  it('every body schema is .strict()', () => {
    /*
     * Anchored to the END of the declaration, which matters more than it looks.
     *
     * `.strict()` ANYWHERE in the statement is satisfied by a nested one — and both bodies here nest a
     * `rights: z.object({…}).strict().optional()`. Mutation testing removed the OUTER `.strict()` from
     * `CreateTokenBody` and this stayed green, matching the inner one instead: the schema that mints credentials
     * would have gone back to dropping unknown keys silently with the gate reporting fine.
     *
     * The predecessor read 40 characters past the object's closing brace, which happened to exclude the nested
     * call. That is not a property anyone had chosen — it is why the position is now stated rather than inherited.
     */
    const STRICT_AT_END = /\}\)\s*\.strict\(\)\s*;?\s*$/;
    const loose = bodySchemas().filter(s => !STRICT_AT_END.test(s.tail)).map(s => s.name);
    assert.deepEqual(
      loose,
      [],
      `${loose.join(', ')} accept unknown keys. On a credential endpoint that means a mis-spelled scope `
      + 'field mints an UNSCOPED token and answers 201 — the caller is told it worked.',
    );
  });

  it('server-owned fields are STRIPPED, not refused — strictness alone breaks a round-trip', () => {
    // The half this gate missed on its first pass. `.strict()` on its own turned `POST /api/tokens` with a
    // token read back from the API into a 400, because `id`, `hash` and `prefix` are fields WE emit. A
    // red-team test pins that they are stripped; this pins that the strip still runs before the strict
    // parse, since removing it would be green here and red there — and the two suites do not run together
    // in preflight.
    assert.match(code, /SERVER_OWNED_TOKEN_FIELDS\s*=\s*\[\s*'id',\s*'hash',\s*'prefix'/,
      'the server-owned field list is gone or changed — a round-tripped token body will 400');
    const parses = [...code.matchAll(/(\w+Body)\.safeParse\(([^)]*)\)/g)];
    assert.ok(parses.length >= 2, `expected both bodies to be parsed, found ${parses.length}`);
    for (const [, name, arg] of parses) {
      assert.match(arg, /stripServerOwnedToken\(/,
        `${name} parses req.body directly, so a client posting a token it read back gets a 400`);
    }
  });

  it('the create schema still declares a real field, so strictness is being tested on something', () => {
    /*
     * The vacuity guard for the strictness rule: `.strict()` on a schema with no fields refuses
     * everything and would pass every test below for the wrong reason.
     *
     * It used to name `spaces`, which `D-5` removed from this door — the matrix replaced it. Re-pointed
     * at `rights`, which is the field that now carries scope, so the guard names the thing it is
     * guarding rather than a field that happened to be there.
     */
    const at = code.indexOf('const CreateTokenBody');
    assert.ok(at > 0, 'CreateTokenBody is gone — re-point this gate');
    const createBody = code.slice(at, code.indexOf('});', at));
    assert.match(createBody, /rights/,
      'CreateTokenBody no longer declares `rights` — re-point this guard at whatever now carries scope, '
      + 'or the strictness assertions below are passing over an empty schema');
  });
});
