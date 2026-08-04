/**
 * The webhook verification example we hand integrators must not be weaker than our own code.
 *
 * ## The finding
 *
 * The webhook documentation is otherwise thorough — the signature scheme, the exact backoff schedule, the
 * `failing` state, SSRF pinning with the redirect cap. Which is why these two stood out:
 *
 *  1. **The verification example used `===` on the HMAC.** Our own code reaches for `crypto.timingSafeEqual` in
 *     three places (the metrics token, TOTP twice). So we wrote constant-time comparison for ourselves and
 *     recommended a timing-unsafe one to everybody integrating with us. A receiver following the example exactly
 *     gets a timing oracle on a value derived from their own secret.
 *  2. **At-least-once delivery was documented and `X-Ythril-Delivery` was listed, and the two were never
 *     joined.** The actionable consequence of at-least-once is "you will receive the same event twice, dedupe on
 *     this header" — and that sentence did not exist. It is also the only mitigation for replay, because the
 *     signature covers the body and not a timestamp, so a captured delivery verifies forever.
 *
 * Neither is a code defect. Both are the documentation telling an integrator to build something less safe than
 * what we built, which a docs gate should catch — and the documentation lens is a release gate now.
 *
 * ## Why a gate rather than just the fix
 *
 * A code sample rots differently from prose: it gets copied into a reader's codebase verbatim, and it gets
 * "simplified" by the next person editing the page who does not know why the comparison is shaped that way. The
 * comment in the sample explains it; this makes removing the comparison a build failure.
 *
 * Run: node --test testing/standalone/webhook-docs-are-safe.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DOC = 'docs/integration-guide/14-duplicates-and-webhooks.md';
const doc = readFileSync(join(ROOT, DOC), 'utf8');

/**
 * The fenced js blocks in the doc, so assertions can target code rather than prose about code.
 *
 * `\r?\n`, not `\n` — the repo checks out CRLF, and the first version of this returned **zero** blocks. The
 * constant-time assertions below then iterated an empty list and passed **vacuously**, on a doc that still had the
 * `===` in it. Only the floor assertion caught it, which is exactly what a floor is for.
 */
function codeBlocks() {
  return [...doc.matchAll(/```js\r?\n([\s\S]*?)```/g)].map(m => m[1]);
}

/** HMAC examples, with the floor inline so no assertion over them can pass on an empty list. */
function hmacExamples() {
  const blocks = codeBlocks().filter(b => b.includes('createHmac'));
  assert.ok(blocks.length >= 1, 'no HMAC example found in the webhook doc — every check below would pass vacuously');
  return blocks;
}

describe('the signature-verification example is safe to copy', () => {
  it('finds the example — the parse still works', () => {
    const blocks = codeBlocks();
    assert.ok(blocks.length >= 1, 'no js code blocks found in the webhook doc; the enumeration broke');
    assert.ok(blocks.some(b => b.includes('createHmac')),
      'the HMAC verification example is gone from the webhook doc');
  });

  it('compares in constant time', () => {
    const hmacBlocks = hmacExamples();
    for (const b of hmacBlocks) {
      assert.match(b, /timingSafeEqual/,
        'the verification example does not compare in constant time. We use crypto.timingSafeEqual in our own '
        + 'code (metrics token, TOTP) — recommending a weaker comparison to integrators than the one we wrote for '
        + 'ourselves is the defect, whatever the practical exploitability.');
    }
  });

  it('does not compare the digest with === or ==', () => {
    // The specific shape that was there. Checked separately from the positive assertion because a sample could
    // gain timingSafeEqual and still leave the old line above it, which is worse than either alone.
    const hmacBlocks = hmacExamples();
    for (const b of hmacBlocks) {
      const bad = b.split('\n').filter(l => /signature\s*===|===\s*`sha256=/.test(l) && !l.trim().startsWith('//'));
      assert.deepEqual(bad, [],
        `the example still compares the signature with ===:\n  ${bad.join('\n  ')}`);
    }
  });

  it('tells the reader to sign over the RAW body', () => {
    // The most common integration failure after the comparison itself: verifying a re-serialised body, which
    // never matches because a parse/stringify round trip does not preserve key order or whitespace.
    assert.match(doc, /RAW body/i,
      'the doc does not warn that the signature is over the raw body, which is the failure every integrator hits '
      + 'second');
  });
});

describe('at-least-once delivery is joined to its consequence', () => {
  it('states that duplicates WILL arrive', () => {
    assert.match(doc, /at-least-once/i, 'the delivery guarantee is gone from the doc');
    assert.match(doc, /same event more than once|receive the same event twice/i,
      'the doc states at-least-once without stating the consequence. "At-least-once" is a term of art; "you will '
      + 'receive this twice" is the sentence that changes what an integrator builds.');
  });

  it('names the deduplication key', () => {
    const region = doc.slice(doc.search(/### Delivery Guarantees/));
    assert.match(region, /X-Ythril-Delivery/,
      'the delivery-guarantees section does not name X-Ythril-Delivery as the dedupe key, so an integrator is told '
      + 'duplicates arrive and not what to key on');
  });

  it('is honest that the signature does not cover a timestamp', () => {
    // Stating it is the point: the mitigation is the dedupe key, and a reader who does not know the signature is
    // replayable cannot judge whether their own dedupe window is enough.
    assert.match(doc, /body only, not a timestamp|does not cover a timestamp/i,
      'the doc does not state that the signature covers the body only, so a reader cannot tell that a captured '
      + 'delivery verifies indefinitely');
  });
});

describe('the code still matches what the doc describes', () => {
  it('the dispatcher signs with HMAC-SHA256 and sends the three documented headers', () => {
    // Guards the other direction: a docs gate that only reads docs will happily hold a description of code that
    // has changed underneath it.
    const src = readFileSync(join(ROOT, 'server/src/webhooks/dispatcher.ts'), 'utf8');
    assert.match(src, /createHmac\('sha256'/, 'the dispatcher no longer signs with HMAC-SHA256');
    for (const h of ['X-Ythril-Signature', 'X-Ythril-Event', 'X-Ythril-Delivery']) {
      assert.ok(src.includes(h), `the dispatcher no longer sends ${h}, but the doc still documents it`);
      assert.ok(doc.includes(h), `the doc no longer documents ${h}, but the dispatcher still sends it`);
    }
  });

  it('retries are bounded by a real ceiling, as the doc claims', () => {
    const src = readFileSync(join(ROOT, 'server/src/webhooks/dispatcher.ts'), 'utf8');
    assert.match(src, /MAX_ATTEMPTS/, 'the retry ceiling is gone; the doc promises retries stop and a subscription '
      + 'goes `failing`');
    assert.match(src, /attempt < MAX_ATTEMPTS/,
      'nothing compares the attempt count against the ceiling, so retries would not actually stop');
  });
});
