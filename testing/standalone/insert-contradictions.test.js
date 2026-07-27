/**
 * Standalone tests for the insert-time contradiction warning.
 *
 * `findInsertContradictions` needs the database (it fetches the neighbours' properties), so what is pinned
 * here is the pure judging rule it delegates to — `findPropertyDisagreements` — for exactly the shapes the
 * write path hands it, plus the guard conditions that decide whether it does any work at all.
 *
 * Why this warning is structured-only, restated because it is a deliberate limit rather than an omission:
 * the NLI judge is a model call per candidate pair. On the write path that is latency on every insert and,
 * with an external endpoint, record text leaving the instance on every insert. The nightly scanner already
 * runs the NLI pass over the same pairs, so nothing is lost by keeping the fast path deterministic — this
 * is a courtesy warning, not the safety net.
 *
 * Run: node --test testing/standalone/insert-contradictions.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let findPropertyDisagreements;
const rec = (properties) => ({ id: 'x', text: '', ...(properties ? { properties } : {}) });

describe('insert-time contradiction warning', () => {
  before(async () => {
    ({ findPropertyDisagreements } = await import('../../server/dist/brain/contradiction-judge.js'));
  });

  it('flags the same property set to a different value — the case the warning exists for', () => {
    const d = findPropertyDisagreements(rec({ status: 'active' }), rec({ status: 'retired' }));
    assert.equal(d.length, 1);
    assert.deepEqual(d[0], { key: 'status', aValue: 'active', bValue: 'retired' });
  });

  it('reports BOTH values, so the caller can tell whether it is correcting or mistaken', () => {
    const [d] = findPropertyDisagreements(rec({ port: 8080 }), rec({ port: 9090 }));
    assert.equal(d.aValue, 8080, 'the incoming value');
    assert.equal(d.bValue, 9090, 'the value already stored');
  });

  it('says nothing when the incoming record makes no property claims', () => {
    // The common case for a plain text memory — it must not cost a lookup or produce noise.
    assert.deepEqual(findPropertyDisagreements(rec(), rec({ status: 'active' })), []);
  });

  it('says nothing when only one side claims a property', () => {
    // Additive information is not a disagreement; flagging it would train people to ignore the warning.
    assert.deepEqual(findPropertyDisagreements(rec({ owner: 'ana' }), rec({ status: 'active' })), []);
  });

  it('says nothing when they agree', () => {
    assert.deepEqual(findPropertyDisagreements(rec({ status: 'active' }), rec({ status: 'active' })), []);
  });

  it('flags every disagreeing property, not just the first', () => {
    const d = findPropertyDisagreements(
      rec({ status: 'active', port: 8080, owner: 'ana' }),
      rec({ status: 'retired', port: 9090, owner: 'ana' }));
    assert.deepEqual(d.map(x => x.key).sort(), ['port', 'status'], 'owner agrees and is not reported');
  });
});
