/**
 * `PropertySchema` request validation — against the REAL Zod schema.
 *
 * This file used to keep a hand-copy of `PropertySchemaZ` from `api/spaces.ts` and test that. The
 * copy drifted, and it drifted in the direction that is hardest to notice: it became **stricter than
 * production**, so every test passed while the schema under test accepted less than the real one.
 *
 * Three fields production accepts were missing from the copy, and because the schema is `.strict()`
 * their absence meant *rejection*, not laxity:
 *
 *   - `required` — an inline boolean on the property. This is the one that matters: it is what the
 *     Schema tab sends for every property an operator marks required, so the copy rejected the most
 *     ordinary body the product produces.
 *   - `default` — the seed value used when a record omits the property.
 *   - `type: 'date'` — a fourth declared type, stored as an ISO string.
 *
 * A test suite that rejects what production accepts cannot catch a real regression: it fails only on
 * bodies the product never sends, and stays silent on the ones it does. Importing the real schema
 * removes the whole class of problem — there is nothing left to drift.
 *
 * Run: node --test testing/standalone/mergefn-schema.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { PropertySchemaZ } = await import('../../server/dist/spaces/body-schemas.js');

const accepts = (input, why = '') => assert.ok(
  PropertySchemaZ.safeParse(input).success,
  `expected accepted${why ? ' (' + why + ')' : ''}: ${JSON.stringify(input)}`,
);
const rejects = (input, why = '') => assert.ok(
  !PropertySchemaZ.safeParse(input).success,
  `expected rejected${why ? ' (' + why + ')' : ''}: ${JSON.stringify(input)}`,
);

const NUMERIC = ['avg', 'min', 'max', 'sum'];
const BOOLEAN = ['and', 'or', 'xor'];

describe('mergeFn must match the declared type', () => {
  it('numeric mergeFns are accepted on a number', () => {
    for (const mergeFn of NUMERIC) accepts({ type: 'number', mergeFn });
  });

  it('boolean mergeFns are accepted on a boolean', () => {
    for (const mergeFn of BOOLEAN) accepts({ type: 'boolean', mergeFn });
  });

  it('numeric mergeFns are rejected on a boolean', () => {
    for (const mergeFn of NUMERIC) rejects({ type: 'boolean', mergeFn });
  });

  it('boolean mergeFns are rejected on a number', () => {
    for (const mergeFn of BOOLEAN) rejects({ type: 'number', mergeFn });
  });

  it('no mergeFn is valid on a string — there is nothing to merge numerically or logically', () => {
    for (const mergeFn of [...NUMERIC, ...BOOLEAN]) rejects({ type: 'string', mergeFn });
  });

  it('no mergeFn is valid on a date either', () => {
    // `date` did not exist in the hand-copy at all, so this branch of the refine was never exercised.
    for (const mergeFn of [...NUMERIC, ...BOOLEAN]) rejects({ type: 'date', mergeFn });
  });

  it('a mergeFn with no declared type is allowed, so long as it is a real one', () => {
    for (const mergeFn of [...NUMERIC, ...BOOLEAN]) accepts({ mergeFn });
  });

  it('an unknown mergeFn is rejected however it is declared', () => {
    rejects({ mergeFn: 'frobnicate' });
    rejects({ type: 'number', mergeFn: 'concat' });
    rejects({ type: 'number', mergeFn: '' });
  });

  it('a schema with no mergeFn is fine', () => {
    accepts({ type: 'number' });
    accepts({});
  });
});

describe('the fields the hand-copy was missing — the drift this file existed to have caught', () => {
  it('accepts `required`, which is what the Schema tab sends for every required property', () => {
    // The copy was .strict() without this key, so it rejected the most ordinary body in the product.
    accepts({ type: 'string', required: true }, 'required is an inline flag on the property');
    accepts({ required: false });
  });

  it('accepts `default`', () => {
    accepts({ type: 'string', default: 'unset' });
    accepts({ type: 'number', default: 0 });
    accepts({ type: 'boolean', default: false });
  });

  it("accepts type 'date'", () => {
    accepts({ type: 'date' });
    accepts({ type: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}' });
  });

  it('a realistic property from the Schema tab round-trips', () => {
    accepts({ type: 'string', enum: ['active', 'deprecated'], required: true, default: 'active' });
    accepts({ type: 'number', minimum: 0, maximum: 100, mergeFn: 'avg', required: false });
  });
});

describe('the schema is still strict about what it does not know', () => {
  it('rejects an unrecognised key rather than ignoring it', () => {
    // .strict() is deliberate: a typo like `requried` must be an error, not a silently dropped
    // constraint that leaves the operator believing the property is required.
    rejects({ type: 'string', requried: true }, 'typo must not be silently dropped');
    rejects({ type: 'string', unknownThing: 1 });
  });

  it('rejects a wrong-typed value for a known key', () => {
    rejects({ type: 'number', minimum: 'zero' });
    rejects({ required: 'yes' });
    rejects({ type: 'nonsense' });
  });

  it('caps the pattern length, which is the ReDoS-adjacent input', () => {
    accepts({ type: 'string', pattern: 'a'.repeat(500) });
    rejects({ type: 'string', pattern: 'a'.repeat(501) });
  });
});
