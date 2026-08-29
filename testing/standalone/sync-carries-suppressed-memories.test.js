/**
 * A memory with no vector must survive the push door. Today it does not, and it is never offered again.
 *
 * ## The mismatch
 *
 * `MemoryDoc.embedding` is **optional** — `config/types.ts:1350`, optional since the embedding queue landed —
 * and `embedStoredRecord` `$unset`s both `embedding` and `embeddingModel` for any record whose type or space
 * suppresses embeddings (`brain/embed-record.ts:166-170`). `IncomingMemoryDoc` declares both **required**
 * (`api/sync/_shared.ts:142,152`).
 *
 * So the sender puts a perfectly valid stored document on the wire and the receiver's `safeParse` rejects it.
 * The rejection is a `flatMap` returning `[]` (`api/sync/docs.ts:528-529`): the document is removed from the
 * batch, counted in no statistic, logged nowhere, and the receiver answers **200**. The sender then advances
 * its watermark, and `embedStoredRecord` deliberately does not bump `seq` — so the record is never offered
 * again. **Permanent, silent, one-directional loss.**
 *
 * ## Why memories and nothing else
 *
 * `IncomingEntityDoc`, `IncomingEdgeDoc` and `IncomingChronoDoc` do not declare `embedding` at all. Zod strips
 * unlisted keys, so their vector is simply discarded and the document survives. Memories are the only record
 * type that requires the field, which is why they are the only type that vanishes.
 *
 * ## Why this is a schema test rather than a two-instance one
 *
 * The loss is entirely decided by one `safeParse`, and the document that triggers it is exactly what
 * `embedStoredRecord` leaves behind. Driving two live peers to reproduce it would add a fixture larger than the
 * defect and would not pin the thing that is actually wrong, which is that the two declarations of one document
 * disagree about a field.
 *
 * The companion rule — that a dropped record is never silent — is `sync-dropped-record-is-not-silent.test.js`.
 * That gate pins the fork-depth drop. This is the same principle on the path it does not reach.
 *
 * Run: node --test testing/standalone/sync-carries-suppressed-memories.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { IncomingMemoryDoc } = await import('../../server/dist/api/sync/_shared.js');

/** A stored memory as `embedStoredRecord` leaves it once suppression has unset the vector fields. */
function suppressedMemory(overrides = {}) {
  return {
    _id: '11111111-1111-4111-8111-111111111111',
    spaceId: 'demo',
    fact: 'Ada adopted a beagle called Pepper.',
    tags: [],
    entityIds: [],
    author: { instanceId: 'inst-1', instanceLabel: 'Peer A' },
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
    seq: 7,
    ...overrides,
  };
}

describe('a memory with no vector survives the push door', () => {
  it('accepts a suppressed memory — no embedding, no embeddingModel', () => {
    const r = IncomingMemoryDoc.safeParse(suppressedMemory());
    assert.ok(
      r.success,
      'a suppressed memory is a valid stored document and must replicate. Rejecting it here removes it from '
      + 'the batch with no counter and no log, the receiver still answers 200, and the sender never offers it '
      + `again. Issues: ${JSON.stringify(r.error?.issues ?? [])}`,
    );
  });

  it('accepts a memory whose embed job has not run yet', () => {
    // Same shape: the queue writes the vector later, and `seq` is not bumped when it does.
    const r = IncomingMemoryDoc.safeParse(suppressedMemory({ description: 'pending its first embed' }));
    assert.ok(r.success, `a not-yet-embedded memory must replicate. Issues: ${JSON.stringify(r.error?.issues ?? [])}`);
  });

  it('still accepts an embedded memory unchanged', () => {
    // The fix must be additive: the ordinary case keeps working exactly as it did.
    const r = IncomingMemoryDoc.safeParse(suppressedMemory({
      embedding: [0.1, 0.2, 0.3],
      embeddingModel: 'nomic-embed-text-v1.5',
    }));
    assert.ok(r.success, `an embedded memory must still parse. Issues: ${JSON.stringify(r.error?.issues ?? [])}`);
    assert.deepEqual(r.data.embedding, [0.1, 0.2, 0.3], 'the vector must survive the parse, not be stripped');
  });

  it('the other three incoming schemas do not require a vector either', async () => {
    // Stated as an assertion because it is the reason memories were the only type that vanished — if a future
    // change adds `embedding` to one of these, it acquires the same silent loss.
    const shared = await import('../../server/dist/api/sync/_shared.js');
    for (const name of ['IncomingEntityDoc', 'IncomingEdgeDoc', 'IncomingChronoDoc']) {
      const shape = shared[name]?.shape ?? {};
      assert.equal(
        Object.prototype.hasOwnProperty.call(shape, 'embedding'), false,
        `${name} must not declare 'embedding'. Zod strips unlisted keys, so leaving it out is what lets a `
        + 'suppressed record of that type replicate at all.',
      );
    }
  });
});
