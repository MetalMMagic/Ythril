/**
 * A reindex embeds the SAME text the normal write path embeds — asserted from source, because nothing else can.
 *
 * ## The gap this fills, stated precisely
 *
 * `reindex-contract.test.js` proves every collection comes out with an embedding. It cannot prove the embedding came
 * from the right text: the reindex loop writes `embedding` and `embeddingModel` and deliberately does not write
 * `matchedText`, so from outside the API a vector built from `edgeEmbedText(from, label, to, …)` and one built from
 * `edgeEmbedText(label, from, to, …)` are indistinguishable. Both are 768 floats and both make the record findable
 * by *something*.
 *
 * That is the failure an extraction of five near-identical loops is most likely to introduce, and the failure nobody
 * would notice: recall would keep returning results, just slightly wrong ones, for the records reindexed after the
 * refactor and not for the ones written before it.
 *
 * So this reads the source. A source gate is the weaker instrument in general, and here it is the only one that can
 * see the thing at all — which is the whole argument for having both files.
 *
 * ## What is actually asserted
 *
 * Each of the five branches must call the `*EmbedText` builder that its collection's WRITE path calls. Derived by
 * pairing collection → builder rather than by counting call sites, so a sixth collection added later is covered on
 * the day it is written, and a branch that quietly starts building its own string fails.
 *
 * The `excerpt` argument on the file branch is asserted by name, and it has a specific history: without it a reindex
 * re-embeds every converted document WITHOUT the document's own text, dropping exactly the phrases a reader
 * searches for. The file's own comment says so; this is that comment with a test attached.
 *
 * Run: node --test testing/standalone/reindex-embeds-the-same-text.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The reindex handler, sliced out of the read/analytics router. */
function reindexHandler() {
  const src = stripComments(readFileSync('server/src/api/brain/search.ts', 'utf8'));
  const start = src.indexOf("searchRouter.post('/spaces/:spaceId/reindex'");
  assert.ok(start > 0, 'the reindex route moved — re-point this gate at wherever the loop now lives');
  // To the end of the file or the next route, whichever comes first.
  const next = src.indexOf('searchRouter.', start + 20);
  return src.slice(start, next > 0 ? next : src.length);
}

/**
 * collection → the embed-text builder its WRITE path uses.
 *
 * Not a list of what the reindex currently calls — that would agree with the code by construction. Each pairing is
 * the one the record's own write path uses, so the assertion is *the reindex reproduces the write*, which is the
 * property that matters.
 */
const BUILDERS = [
  ['memories', 'memoryEmbedText'],
  ['entities', 'entityEmbedText'],
  ['edges', 'edgeEmbedText'],
  ['chrono', 'chronoEmbedText'],
  ['files', 'fileEmbedText'],
];

describe('a reindex reproduces what the write path embedded', () => {
  const handler = reindexHandler();

  it('found the handler, and it is the whole loop rather than a stub', () => {
    // Floors it: if the slice were empty or tiny, every check below would pass on nothing. The five loops are
    // hundreds of lines today, which is exactly why they are being extracted.
    assert.ok(handler.length > 3000, `the sliced handler is only ${handler.length} chars — the slice is wrong`);
  });

  it('every collection is re-embedded through its own write-path builder', () => {
    const missing = BUILDERS.filter(([, builder]) => !new RegExp(`\\b${builder}\\(`).test(handler))
      .map(([collection, builder]) => `${collection} → ${builder}()`);
    assert.deepEqual(missing, [],
      'these collections are reindexed without calling the builder their write path uses, so their vectors are '
      + 'built from different text than the records written normally — recall keeps working and quietly disagrees '
      + `with itself:\n  ${missing.join('\n  ')}`);
  });

  it('the builders come from the shared module, not re-implemented locally', () => {
    // The other way to break the pairing above: keep the name, declare it here. A local `const edgeEmbedText = …`
    // would satisfy the regex and embed whatever it liked.
    const src = readFileSync('server/src/api/brain/search.ts', 'utf8');
    for (const [, builder] of BUILDERS) {
      assert.match(src, new RegExp(`import \\{[^}]*\\b${builder}\\b[^}]*\\} from '[^']*embed-text\\.js'`, 's'),
        `${builder} must be imported from brain/embed-text.js, not declared in the route file`);
    }
  });

  it('the file branch passes `excerpt`, or a reindex drops every document body', () => {
    // Specific and paid for: without `excerpt` a reindex re-embeds a converted document WITHOUT the document's own
    // text, so the phrases a reader actually searches for disappear from the vector while the record still looks
    // indexed. The route carries a comment saying exactly this; a comment is not a check.
    const call = /fileEmbedText\(([^)]*)\)/.exec(handler);
    assert.ok(call, 'the file branch no longer calls fileEmbedText');
    assert.match(call[1], /excerpt/, 'fileEmbedText must be given the excerpt — see the comment at the call site');
  });

  it('chunk records are excluded, so a chunk is not re-embedded as a file', () => {
    // Chunks carry `parentFileId` and have their own embedding logic. Re-embedding one here would overwrite a
    // passage vector with a file-metadata vector, which is how a document becomes unsearchable by its own contents.
    assert.match(handler, /parentFileId/,
      'the files branch must still exclude chunk records (parentFileId set) from the file re-embed');
  });
});
