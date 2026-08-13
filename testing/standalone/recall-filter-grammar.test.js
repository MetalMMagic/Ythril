/**
 * `recall`'s filter accepts the same grammar `query`'s does — including the filter aigents could not express at all.
 *
 * ## The report
 *
 * aigents, 2026-08-13T1035Z §2. `recall`'s filter was one operator object per key, ANDed: `eq`, `ne`, `in`, `exists`,
 * `gt`, `gte`, `lt`, `lte`. `query`'s takes `$or`, `$and`, `$not`, `$nor`, `$regex`, `$elemMatch` nested to depth 8. Same
 * store, same policy, **two grammars** — so a caller wanting meaning-ranking AND a real predicate ran `query` first and
 * fed ids into something else.
 *
 * Their case is the mailbox query in this board's own usage notes, and it is the centrepiece assertion below: *a message is
 * ours if `from`, `to` or `alsoFor` names us, and separately our own asks are live while `status` is open.* Not expressible
 * in the old grammar at any length.
 *
 * ## What must NOT change
 *
 * The old grammar keeps working — `{"properties.status": {"eq": "x"}}` is not valid raw Mongo, so a parser swap would have
 * broken every existing caller including our own client. And the KEY allowlist stays, recursively, because widening the
 * grammar is not widening the keys: a recall filter that could name any field would be a way to filter a vector search on
 * fields the index cannot serve.
 *
 * Run: node --test testing/standalone/recall-filter-grammar.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let resolveRecallFilter;

before(async () => {
  ({ resolveRecallFilter } = await import('../../server/dist/brain/recall-filter.js'));
});

describe('the grammar aigents asked for', () => {
  it('accepts their mailbox filter, which the old grammar could not express', () => {
    // Copied from this board's `usageNotes`, with `aigents` as the party. This is the whole ask.
    const mailbox = {
      type: 'message',
      $or: [
        {
          'properties.from': { $ne: 'aigents' },
          'properties.readBy': { $ne: 'aigents' },
          $or: [{ 'properties.to': 'aigents' }, { 'properties.alsoFor': 'aigents' }],
        },
        {
          'properties.from': 'aigents',
          'properties.status': 'open',
          'properties.kind': { $in: ['ask', 'request', 'proposal'] },
        },
      ],
    };
    const r = resolveRecallFilter(mailbox);
    assert.ok(r.ok, `refused: ${r.error}`);
    assert.equal(r.kind, 'mongo', 'a raw filter must be reported as raw, so the caller uses the exhaustive path');
    // WRAPPED in `__raw`, so both grammars can travel in one `filter` parameter rather than two mutually-exclusive ones.
    // That shape exists because the two-parameter version pushed `recall.ts` past the god-file ratchet, and the smaller
    // design turned out to be the better one.
    assert.deepEqual(r.filter.__raw, mailbox, 'an allowlisted raw filter passes through as itself');
  });

  it('accepts $regex, $and and $elemMatch', () => {
    for (const f of [
      { name: { $regex: '^RMA-' } },
      { $and: [{ type: 'message' }, { 'properties.status': 'open' }] },
      { tags: { $elemMatch: { $eq: 'rma' } } },
    ]) {
      assert.ok(resolveRecallFilter(f).ok, `refused ${JSON.stringify(f)}`);
    }
  });
});

describe('the old grammar still works — a parser swap would have broken every caller', () => {
  it('translates the operator-object form', () => {
    const r = resolveRecallFilter({ 'properties.status': { eq: 'accepted' }, 'properties.count': { gt: 10 } });
    assert.ok(r.ok, `refused: ${r.error}`);
    // Reported as an EXPRESSION and handed back untouched, so the native pre-filter path stays available. Translating
    // it here would have silently moved every existing caller onto the exhaustive path — a performance regression
    // delivered as a refactor.
    assert.equal(r.kind, 'expression');
    assert.deepEqual(r.expression, { 'properties.status': { eq: 'accepted' }, 'properties.count': { gt: 10 } });
  });

  it('still refuses a disallowed key in the old grammar, with the message it always gave', () => {
    const r = resolveRecallFilter({ secretField: { eq: 'x' } });
    assert.ok(!r.ok);
    assert.match(r.error, /not allowed/);
  });

  it('treats no filter and an empty filter as unfiltered', () => {
    for (const f of [undefined, null, {}]) {
      const r = resolveRecallFilter(f);
      assert.ok(r.ok);
      assert.equal(r.kind, 'none', `${JSON.stringify(f)} must mean "no filter", not "match nothing"`);
    }
  });
});

describe('the key allowlist survives the widening', () => {
  it('refuses a disallowed key nested inside $or — the smuggling route', () => {
    // The failure this prevents: widening the grammar becomes a way to filter on fields the vector index cannot serve,
    // which is a performance cliff rather than a feature.
    const r = resolveRecallFilter({ $or: [{ type: 'message' }, { embedding: { $exists: true } }] });
    assert.ok(!r.ok, 'a key inside $or must be checked too');
    assert.match(r.error, /embedding/);
  });

  it('allows every documented prefix, at depth', () => {
    const r = resolveRecallFilter({
      $or: [{ tags: 'rma' }, { 'properties.a.b': 1 }, { name: 'x' }, { status: 'open' }, { label: 'l' }, { type: 't' }],
    });
    assert.ok(r.ok, `refused: ${r.error}`);
  });
});

describe('a MIXED filter is refused, not resolved', () => {
  it('names both sides rather than guessing which one wins', () => {
    // A caller who believes one thing and would get another. One round trip beats a wrong answer.
    const r = resolveRecallFilter({ $or: [{ type: 'a' }], 'properties.status': { eq: 'open' } });
    assert.ok(!r.ok);
    assert.match(r.error, /mixes both grammars/);
    assert.match(r.error, /properties\.status/, 'the offending key must be named');
  });

  it('does not mistake a legitimate raw value-object for the old grammar', () => {
    // `{$in: [...]}` is raw Mongo, not the operator-object form. Confusing the two would refuse valid filters.
    const r = resolveRecallFilter({ $or: [{ type: 'a' }], 'properties.kind': { $in: ['ask'] } });
    assert.ok(r.ok, `a raw value-object was mistaken for the old grammar: ${r.error}`);
  });
});

describe('it inherits query\'s refusals rather than reimplementing them', () => {
  it('rejects an operator outside the allowlist, with query\'s own message', () => {
    const r = resolveRecallFilter({ $where: 'this.x' });
    assert.ok(!r.ok, '$where must be refused');
  });

  it('rejects excessive nesting', () => {
    let deep = { type: 'x' };
    for (let i = 0; i < 12; i++) deep = { $and: [deep] };
    assert.ok(!resolveRecallFilter(deep).ok, 'depth must be capped as it is for query');
  });

  it('rejects a non-object filter instead of coercing it', () => {
    for (const bad of ['string', 42, [1, 2]]) {
      const r = resolveRecallFilter(bad);
      assert.ok(!r.ok, `${JSON.stringify(bad)} was accepted`);
    }
  });
});
