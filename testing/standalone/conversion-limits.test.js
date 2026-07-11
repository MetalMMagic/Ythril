/**
 * Unit tests: document-conversion size caps (H10)
 *
 * - HtmlConverter refuses inputs over its in-process jsdom cap (25 MiB) with
 *   ConversionUnavailableError reason 'too_large' (permanent, never retried)
 * - Normal-size HTML still converts
 * - parseContentRange rejects malformed / inverted ranges (chunked-upload
 *   bounds regression guard, H8)
 *
 * Pure in-process logic — no MongoDB, no Docker.
 * Run: node --test testing/standalone/conversion-limits.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HtmlConverter } from '../../server/dist/files/converters/html.js';
import { ConversionUnavailableError } from '../../server/dist/files/converters/types.js';
import { parseContentRange } from '../../server/dist/files/chunks.js';

describe('HtmlConverter size cap', () => {
  it('rejects HTML over 25 MiB with reason too_large', async () => {
    const conv = new HtmlConverter();
    const big = Buffer.alloc(25 * 1024 * 1024 + 1, 0x61); // 'a' * (25MiB + 1)
    await assert.rejects(
      conv.convert(big, 'huge.html'),
      (err) => {
        assert.ok(err instanceof ConversionUnavailableError, `expected ConversionUnavailableError, got ${err?.constructor?.name}`);
        assert.equal(err.reason, 'too_large');
        return true;
      },
    );
  });

  it('still converts normal-size HTML', async () => {
    const conv = new HtmlConverter();
    const html = Buffer.from(
      '<html><body><article><h1>Title</h1>' +
      `<p>${'Real paragraph content that Readability will keep. '.repeat(20)}</p>` +
      '</article></body></html>',
    );
    const md = await conv.convert(html, 'ok.html');
    assert.ok(md.includes('Real paragraph content'));
  });
});

describe('parseContentRange bounds', () => {
  it('accepts a well-formed range', () => {
    assert.deepEqual(parseContentRange('bytes 0-9/100'), { start: 0, end: 9, total: 100 });
  });

  it('rejects end >= total', () => {
    assert.equal(parseContentRange('bytes 0-100/100'), null);
  });

  it('rejects start > end', () => {
    assert.equal(parseContentRange('bytes 10-5/100'), null);
  });

  it('rejects garbage', () => {
    assert.equal(parseContentRange('bytes x-y/z'), null);
  });
});
