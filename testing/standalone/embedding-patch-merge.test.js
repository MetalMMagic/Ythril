/**
 * Clearing an embedding field from the admin API actually clears it.
 *
 * The UI's "go back to the bundled model" gesture is `PATCH { embedding: { baseUrl: null } }` — the same
 * shape `rerank` and `nli` use to switch themselves off. The embedding branch of that handler deleted the
 * null from the PATCH and then spread the patch over the stored block, so the null never met the stored
 * value: the configured endpoint survived, and the save response (resolved from the config that had just not
 * changed) put the old URL straight back in the field. It reads as "the save was ignored", with a 200 and
 * no log line.
 *
 * The ordering is the whole fix, and ordering is exactly what a source-level check cannot see, so this
 * exercises the merge itself.
 *
 * Run: node --test testing/standalone/embedding-patch-merge.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let mergeEmbeddingPatch;

describe('mergeEmbeddingPatch', () => {
  before(async () => {
    ({ mergeEmbeddingPatch } = await import('../../server/dist/config/embedding-patch.js'));
  });

  it('CLEARS baseUrl on null — the previous endpoint must not survive', () => {
    const out = mergeEmbeddingPatch({ baseUrl: 'http://emb:8080', model: 'nomic' }, { baseUrl: null });
    assert.ok(!('baseUrl' in out), `baseUrl survived the clear: ${JSON.stringify(out)}`);
    assert.equal(out.model, 'nomic', 'clearing one field must not drop the others');
  });

  it('clears on an empty string too', () => {
    const out = mergeEmbeddingPatch({ baseUrl: 'http://emb:8080' }, { baseUrl: '' });
    assert.ok(!('baseUrl' in out));
  });

  it('clears embedConcurrency back to the per-embedder default', () => {
    // Absent is meaningful here: the default differs by embedder, so a stored 0 or 2 is not the same thing.
    const out = mergeEmbeddingPatch({ embedConcurrency: 16 }, { embedConcurrency: null });
    assert.ok(!('embedConcurrency' in out));
  });

  it('sets a new value, and leaves untouched fields alone', () => {
    const out = mergeEmbeddingPatch(
      { baseUrl: 'http://old:8080', model: 'nomic', dimensions: 768 },
      { baseUrl: 'http://new:8080', embedConcurrency: 4 },
    );
    assert.equal(out.baseUrl, 'http://new:8080');
    assert.equal(out.embedConcurrency, 4);
    assert.equal(out.model, 'nomic');
    assert.equal(out.dimensions, 768);
  });

  it('never lets apiKey into the config block — it belongs in secrets.json', () => {
    const out = mergeEmbeddingPatch({ model: 'nomic' }, { apiKey: 'sk-live-secret' });
    assert.ok(!('apiKey' in out), 'an API key in config.json is the thing this repo is careful about');
    assert.ok(!JSON.stringify(out).includes('sk-live-secret'));
  });

  it('drops a stored apiKey that a previous version had written', () => {
    const out = mergeEmbeddingPatch({ apiKey: 'sk-legacy', model: 'nomic' }, { model: 'qwen' });
    assert.ok(!('apiKey' in out), 'the merge is also the migration');
  });

  it('does not mutate the stored block it was handed', () => {
    const existing = { baseUrl: 'http://emb:8080' };
    mergeEmbeddingPatch(existing, { baseUrl: null });
    assert.equal(existing.baseUrl, 'http://emb:8080', 'saveConfig writes the object it was given');
  });

  it('handles a first-ever patch with nothing stored', () => {
    assert.deepEqual(mergeEmbeddingPatch(undefined, { model: 'nomic' }), { model: 'nomic' });
    assert.deepEqual(mergeEmbeddingPatch(undefined, { baseUrl: null }), {});
  });

  it('leaves a field alone when the patch omits it — absent is not cleared', () => {
    // The client sends the whole block, but a scripted PATCH sends one field; omission must not mean delete.
    const out = mergeEmbeddingPatch({ baseUrl: 'http://emb:8080' }, { model: 'nomic' });
    assert.equal(out.baseUrl, 'http://emb:8080');
  });
});
