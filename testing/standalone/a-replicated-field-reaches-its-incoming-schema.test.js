/**
 * Every field on a replicated document is either declared by its `Incoming*` schema or listed here with a
 * reason — because zod strips what it does not declare, and the loss is silent and one-directional.
 *
 * ## The mechanism, which this repo has already paid for once
 *
 * `docs.ts` runs each pushed document through `safeParse` before `replaceOne`. Zod 4 STRIPS unlisted keys, so a
 * field the schema does not name simply does not arrive. The pull path validates nothing, so the same edge
 * keeps its field when it arrives by pull and loses it when pushed: **same version, push-only,
 * direction-dependent.**
 *
 * `sync-carries-suppressed-memories.test.js` documents the harder version of this — a REQUIRED field the sender
 * legitimately omits, where the whole document is dropped, "counted in no statistic, logged nowhere, and the
 * receiver answers 200". This file is the other half: a field the sender sends and the receiver discards.
 *
 * ## Why a declared list rather than "every field must be present"
 *
 * Several omissions are correct. A vector is recomputed rather than shipped; `_expireAt` is a local TTL index
 * field. A gate demanding parity would fire on those and get switched off.
 *
 * So each omission is a ROW with a reason, and the rule becomes: adding a field to a replicated document means
 * either declaring it on the `Incoming*` schema or writing here why it must not cross the wire. Both are
 * decisions; the current state is neither, which is how `suppressEmbeddings` came to be stripped for all four
 * types with nothing saying so (W-8).
 *
 * Run: node --test testing/standalone/a-replicated-field-reaches-its-incoming-schema.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TYPES = 'server/src/config/types.ts';
const SHARED = 'server/src/api/sync/_shared.ts';

/** Fields of a `*Doc` interface, in declaration order. */
function docFields(src, name) {
  const at = src.indexOf(`export interface ${name}`);
  if (at < 0) return null;
  const body = src.slice(at, src.indexOf('\n}', at));
  return [...body.matchAll(/^ {2}([a-zA-Z_]\w*)\??:/gm)].map(m => m[1]);
}

/** Keys of an `Incoming*` zod object. */
function incomingKeys(src, name) {
  const at = src.indexOf(`export const ${name}`);
  if (at < 0) return null;
  const body = src.slice(at, src.indexOf('});', at));
  return [...body.matchAll(/^ {2}([a-zA-Z_]\w*):/gm)].map(m => m[1]);
}

/**
 * Fields deliberately not replicated, per document type, each with the reason.
 *
 * A row here is a claim somebody made on purpose. `suppressEmbeddings` and `excludeFromVectorSearch` are listed
 * as OPEN rather than as decided, because they are neither — W-8 asks for the ruling, and pretending the
 * current behaviour was chosen would close a question nobody answered.
 */
const NOT_REPLICATED = {
  EdgeDoc: {
    embedding: 'recomputed by the receiver; a vector is derived data and shipping it wastes the wire',
    embeddingModel: 'set and unset with the vector',
    matchedText: 'the exact string the local vector was built from — meaningless beside a different vector',
    _expireAt: 'a local TTL index field; each instance stamps its own from the space policy',
    suppressEmbeddings: 'W-8: NOT a decision. Stripped today with nothing stating it, and the ruling is open.',
    excludeFromVectorSearch: 'W-8: the pre-3.1 spelling of the above, with the same open question.',
  },
};

describe('a replicated field reaches its Incoming schema', () => {
  const types = readFileSync(TYPES, 'utf8');
  const shared = readFileSync(SHARED, 'utf8');

  it('the extractors find both shapes (the check itself works)', () => {
    // A rename that broke either would make every assertion below pass by comparing two empty lists.
    assert.ok((docFields(types, 'EdgeDoc') ?? []).length > 8, 'EdgeDoc fields not found — re-anchor');
    assert.ok((incomingKeys(shared, 'IncomingEdgeDoc') ?? []).length > 8, 'IncomingEdgeDoc keys not found');
  });

  for (const [docName, exempt] of Object.entries(NOT_REPLICATED)) {
    const incName = `Incoming${docName.replace(/Doc$/, '')}Doc`;

    it(`${docName}: every field is declared by ${incName} or listed as not replicated`, () => {
      const fields = docFields(types, docName);
      const keys = incomingKeys(shared, incName);
      const undeclared = fields.filter(f => !keys.includes(f) && !(f in exempt));
      assert.deepEqual(undeclared, [],
        `${undeclared.join(', ')} on ${docName} would be STRIPPED on push and kept on pull — same version, `
        + `one direction. Declare them on ${incName}, or add a row to NOT_REPLICATED saying why they must not `
        + 'cross the wire.');
    });

    it(`${docName}: the not-replicated list has no stale rows`, () => {
      /*
       * The other direction, and the reason the exemption is not free: a row naming a field that no longer
       * exists, or one the schema has since learned, is a reason nobody will re-read. That is how a stale
       * `NOT_A_QUEUE` reason let `_PARKED-DECISIONS.md` accumulate resolved history for weeks.
       */
      const fields = docFields(types, docName);
      const keys = incomingKeys(shared, incName);
      const stale = Object.keys(exempt).filter(f => !fields.includes(f) || keys.includes(f));
      assert.deepEqual(stale, [],
        `${stale.join(', ')} is listed as not replicated but is either gone from ${docName} or now declared `
        + `by ${incName} — remove the row`);
    });
  }

  it('and the endpoint KINDS cross the wire, which is the whole of M-1', () => {
    /*
     * The field this file was written for. `from`/`to` are bare ids, unambiguous only while both ends are
     * always entities — the owner's case is a party photo whose file meta links to person entities, a chrono
     * event and a memory, so `to: "abc"` becomes ambiguous across four collections and `{from, to, label}`
     * stops being well defined when two records in different collections can share an id.
     *
     * Asserted on BOTH shapes in one case on purpose: the field existing on `EdgeDoc` alone is the defect, not
     * a step towards the fix.
     */
    for (const f of ['fromKind', 'toKind']) {
      assert.ok(docFields(types, 'EdgeDoc').includes(f), `EdgeDoc does not declare ${f}`);
      assert.ok(incomingKeys(shared, 'IncomingEdgeDoc').includes(f),
        `IncomingEdgeDoc does not declare ${f}, so a pushed edge loses the kind of its own endpoints`);
    }
  });
});
