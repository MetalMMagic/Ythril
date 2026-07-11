/**
 * Unit tests: Merkle leaves hash document CONTENT (M6)
 *
 * The leaf used to be SHA-256("doc:<type>:<_id>:<seq>"), so a peer could serve
 * tampered content under the same _id/seq and the roots would still agree —
 * verification detected missing / version-skewed documents, never modified ones.
 * Leaves now include a canonical content hash.
 *
 * Pure in-process logic — no MongoDB (docLeaf is exported for exactly this).
 * Run: node --test testing/standalone/merkle-content-hash.test.js
 * (build the server first: npm run build:server)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { docLeaf } from '../../server/dist/brain/merkle.js';

const base = () => ({
  _id: 'mem-1',
  seq: 7,
  fact: 'The deploy key rotates on Fridays.',
  tags: ['ops'],
  author: { instanceId: 'inst-a', instanceLabel: 'A' },
});

describe('docLeaf — content sensitivity', () => {
  it('identical documents produce identical leaves', () => {
    assert.equal(docLeaf('memories', base()), docLeaf('memories', base()));
  });

  it('TAMPERED content under the same _id and seq changes the leaf', () => {
    const tampered = { ...base(), fact: 'The deploy key rotates on Mondays.' };
    assert.notEqual(
      docLeaf('memories', base()),
      docLeaf('memories', tampered),
      'VULNERABILITY: a modified fact produced the same Merkle leaf',
    );
  });

  it('a changed nested field changes the leaf', () => {
    const tampered = { ...base(), author: { instanceId: 'attacker', instanceLabel: 'A' } };
    assert.notEqual(docLeaf('memories', base()), docLeaf('memories', tampered));
  });

  it('a changed tag changes the leaf', () => {
    assert.notEqual(
      docLeaf('memories', base()),
      docLeaf('memories', { ...base(), tags: ['ops', 'secret'] }),
    );
  });

  it('key ORDER does not change the leaf (canonicalisation)', () => {
    const reordered = {
      author: { instanceLabel: 'A', instanceId: 'inst-a' },
      tags: ['ops'],
      fact: 'The deploy key rotates on Fridays.',
      seq: 7,
      _id: 'mem-1',
    };
    assert.equal(
      docLeaf('memories', base()),
      docLeaf('memories', reordered),
      'Mongo does not guarantee field order — the hash must not depend on it',
    );
  });

  it('the embedding vector is EXCLUDED (peers may run different models)', () => {
    const withVec = { ...base(), embedding: [0.1, 0.2], embeddingModel: 'nomic-v1.5', matchedText: 'x' };
    const otherVec = { ...base(), embedding: [0.9, 0.4], embeddingModel: 'other-model', matchedText: 'y' };
    assert.equal(docLeaf('memories', base()), docLeaf('memories', withVec));
    assert.equal(docLeaf('memories', withVec), docLeaf('memories', otherVec));
  });

  it('the same content in a different collection produces a different leaf', () => {
    assert.notEqual(docLeaf('memories', base()), docLeaf('entities', base()));
  });

  it('a changed seq still changes the leaf (regression — version skew)', () => {
    assert.notEqual(docLeaf('memories', base()), docLeaf('memories', { ...base(), seq: 8 }));
  });
});
