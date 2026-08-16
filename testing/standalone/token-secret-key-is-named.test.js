/**
 * The token-creation response has two keys and only one is a credential — the guide must say so.
 *
 * ## What happened
 *
 * `POST /api/tokens` answers `{ token: <the record>, plaintext: <the secret> }`. An integrator read the field
 * called `token`, wrote it into a handover file, and rendered the actual secret to a terminal. They revoked
 * and re-minted rather than reason about the exposure, and filed it as *"our bug, but the shape invited it"*.
 *
 * They are right about the shape. Every other route reinforces the wrong reading: `PATCH /api/tokens/:id`
 * returns `{ token: … }` and `GET /api/tokens` lists records under the same word. `regenerate` is the only
 * one that cannot be misread.
 *
 * ## Why a gate for one paragraph
 *
 * The rename is the real fix and is an owner decision (a new key plus `plaintext` as an alias for a major).
 * Until then the guide's note is the only thing between a reader and a mistake that has already been made
 * once — and its failure mode is silent, so nothing tells anyone it happened again. A paragraph nobody
 * defends is a paragraph that gets tidied away in an edit that looks harmless.
 *
 * This asserts the two claims that prevent the mistake, not the prose around them.
 *
 * Run: node --test testing/standalone/token-secret-key-is-named.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GUIDE = 'docs/integration-guide/07-tokens-api.md';

describe('the tokens guide says which key is the secret', () => {
  const doc = readFileSync(join(ROOT, GUIDE), 'utf8');

  it('the guide still documents the create response at all', () => {
    // Floors the checks below: if this section is renamed or moved, they would pass over an empty file.
    assert.match(doc, /"plaintext"/, `${GUIDE} no longer shows the create response`);
    assert.ok(doc.length > 2000, `${GUIDE} looks truncated (${doc.length} bytes)`);
  });

  it('says `token` is the RECORD and carries no credential', () => {
    assert.match(doc, /`token`[^\n]*[Tt]he record/,
      'the guide must state that the key named `token` is metadata — that misreading is the reported incident');
    assert.match(doc, /carries no credential|not the secret/,
      'and say plainly that it is not a credential');
  });

  it('says `plaintext` is the secret and is shown once', () => {
    assert.match(doc, /`plaintext`[^\n]*[Tt]he secret|[Tt]he secret\.\*\*/,
      'the guide must name `plaintext` as the credential');
    assert.match(doc, /[Ss]hown once/, 'and that it cannot be retrieved again');
  });

  it('the server really does answer with those two keys — or this gate documents a fiction', () => {
    // The guide could be right about a response that no longer exists. Checked against the route so the
    // two cannot drift apart in either direction.
    const src = readFileSync(join(ROOT, 'server/src/api/tokens.ts'), 'utf8');
    // The two KEYS, not the exact expression that fills them. This pinned
    // `{ token: safeRecord, plaintext }` verbatim and fired when `safeRecord` gained a wrapper that changed
    // no key at all — a false positive on a gate whose whole subject is the response SHAPE. `token:` and a
    // bare `plaintext` shorthand are what the guide promises and what a client destructures.
    assert.match(src, /res\.status\(201\)\.json\(\{ token: [^,]+, plaintext \}\)/,
      'the create route no longer answers `{ token, plaintext }` — update the guide and this gate together');
  });
});
