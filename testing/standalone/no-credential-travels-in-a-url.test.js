/**
 * A bearer token is never accepted from a URL, and no code path buckets a request by one.
 *
 * ## Where the exception came from, and why it is gone
 *
 * Until 4.0 there was exactly one route on which a raw `?token=…` authenticated a request: `GET /mcp`, the
 * MCP SSE transport. The reasoning written beside it was sound at the time — an external agent already holds
 * the token, and an SSE client may be unable to set headers, so the transport took the credential the only
 * way its clients could send it.
 *
 * The two BROWSER streams had already been moved off that fallback and onto a single-use `?ticket=`, for the
 * reason the middleware states in its own words: a token in a URL lands in access logs, proxy logs, browser
 * history and `Referer` headers. So the exception survived only because SSE did.
 *
 * SSE is removed in 4.0. `POST /mcp` — streamable HTTP — has been the recommended transport in every guide
 * for the whole of 3.x, it is a POST, and its clients send an `Authorization` header. **There is no longer a
 * client that needs the exception, so the exception is deleted rather than left switched off.**
 *
 * ## Why an empty allowlist was not good enough
 *
 * `QUERY_TOKEN_PATHS` could have been emptied. Two reasons not to:
 *
 * 1. This repository has shipped an empty allowlist read as *"unrestricted"* three times. `Set.has()` on an
 *    empty set fails closed, so it would have been correct — but the shape is one somebody re-reads later.
 * 2. A mechanism with no consumer is the kind of code that gets a consumer by accident. The next route that
 *    cannot set a header would be added to a list that already exists rather than argued about.
 *
 * ## The half that would have been missed: the rate limiter
 *
 * `clientRateLimitKey` also read `?token=`, deliberately — without it every MCP client shared one IP bucket.
 * That was right while the parameter was a credential the server trusted. With the auth fallback gone it
 * INVERTS: a request carrying `?token=` is unauthenticated, so bucketing by it lets an anonymous caller mint
 * a fresh quota bucket per request by varying a string nobody checks, which is the IP limit defeated by a
 * query parameter.
 *
 * A removal makes its neighbours wrong as often as it makes them dead. Both halves are asserted here so
 * neither can come back alone.
 *
 * Run: node --test testing/standalone/no-credential-travels-in-a-url.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const AUTH = 'server/src/auth/middleware.ts';
const RATE = 'server/src/rate-limit/middleware.ts';

const src = (f) => stripComments(readFileSync(f, 'utf8'));

/** Every way of reading the `token` query parameter, dotted and bracketed. */
const READS_QUERY_TOKEN = /query\s*(\?\.)?\s*(\.\s*token\b|\[\s*['"]token['"]\s*\])/;

describe('the check itself fires before it is trusted', () => {
  it('sees both files', () => {
    // A gate that reads nothing passes exactly like a clean repository.
    assert.ok(src(AUTH).length > 5_000, `${AUTH} looks empty after stripping comments`);
    assert.ok(src(RATE).length > 1_000, `${RATE} looks empty after stripping comments`);
  });

  it('FLAGS the pre-removal spellings, and allows the ticket exchange', () => {
    // Mutation-check on the predicate. Both real spellings from before the removal must match.
    assert.match(`const queryToken = req.query['token'];`, READS_QUERY_TOKEN);
    assert.match(`typeof req.query?.['token'] === 'string'`, READS_QUERY_TOKEN);
    assert.match(`const t = req.query.token;`, READS_QUERY_TOKEN);
    // And the surviving mechanism must NOT match — a ticket is single-use and path-bound, not a credential.
    assert.doesNotMatch(`const ticket = req.query['ticket'];`, READS_QUERY_TOKEN);
  });
});

describe('authentication never reads a credential out of the URL', () => {
  it('the auth middleware does not read ?token=', () => {
    assert.doesNotMatch(src(AUTH), READS_QUERY_TOKEN,
      `${AUTH} reads a raw token out of the query string. The one route that needed it — the MCP SSE\n`
      + 'transport — was removed in 4.0. A token in a URL lands in access logs, proxy logs, browser history\n'
      + 'and Referer headers; a browser stream that cannot set a header takes a single-use ?ticket= instead.');
  });

  it('and keeps no allowlist that a future route could be added to', () => {
    assert.doesNotMatch(src(AUTH), /QUERY_TOKEN_PATHS|allowsQueryToken/,
      `${AUTH} still declares the query-token allowlist. An empty allowlist fails closed, but it is a\n`
      + 'mechanism with no consumer — the next route that cannot set a header would be added to a list that\n'
      + 'already exists instead of being argued about. Use a single-use ticket (auth/sse-ticket.ts).');
  });

  it('the single-use ticket path is still there, because that is what replaced it', () => {
    // The inverse assertion: this gate must not be satisfiable by deleting URL auth altogether, which would
    // take the two browser streams down with it.
    assert.match(src(AUTH), /consumeSseTicket/, 'the browser streams still need the ticket exchange');
  });
});

describe('the rate limiter never buckets by an untrusted query parameter', () => {
  it('clientRateLimitKey does not read ?token=', () => {
    assert.doesNotMatch(src(RATE), READS_QUERY_TOKEN,
      `${RATE} derives its bucket from ?token=. Nothing authenticates that parameter any more, so an\n`
      + 'anonymous caller can vary it to get a fresh bucket per request — the IP limit defeated by a string\n'
      + 'nobody checks. Bucket on the Authorization header, and fall back to the address.');
  });

  it('and still separates two tokens presented in the header', () => {
    // Same inverse: deleting the identity half of the key would satisfy the assertion above and put every
    // client back on one shared IP bucket.
    assert.match(src(RATE), /authorization/i, 'the bucket must still follow the client, not the address');
  });
});
