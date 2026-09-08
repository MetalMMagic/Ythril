/**
 * What a passed due moment MEANS is a per-type decision, and every reader resolves it the same way.
 *
 * ## The report, and the ruling
 *
 * The canary operator (2026-09-08T0659Z) read the same three chrono records two ways minutes apart: the list
 * route answered `overdue`, the collection held `active`. Their argument, which the owner accepted: **a date
 * passing is a fact; what it MEANS is an interpretation, and it is not the store's to make.** Most of their
 * chronos record things that OCCURRED — an alert episode, a backup run, a deploy — so a past `startsAt` is
 * the normal condition and means the opposite of late.
 *
 * It cost them: two readers compared the returned status against `active`, could therefore never match, and
 * **1 687 of 1 806 chronos never closed**.
 *
 * Owner ruling, 2026-09-08: *"Make derive configurable what it means to pass a date on schema (ladder?).
 * defaults to todays behaviour"*.
 *
 * ## What this asserts, and why the third case is the one worth having
 *
 * The derivation now depends on the record's TYPE, which means three places must agree: the read path, the
 * recall projection, and **the `listChrono` status FILTER**, which translates `status: 'overdue'` into a
 * due-moment comparison in Mongo. Leave the filter alone and a `nothing` type still matches `overdue` there
 * while reading as `active` everywhere else — one rule, two implementations, inside a single door.
 *
 * So the resolution lives in ONE function and every caller is asserted to reach it. That is the same shape
 * `suppressEmbeddings` needed, and it is why `brain/suppress-embeddings.ts` exists rather than three
 * `?? space.suppressEmbeddings` expressions.
 *
 * Run: node --test testing/standalone/a-passed-date-means-what-the-schema-says.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const src = (p) => stripComments(readFileSync(p, 'utf8'));

let MOD = null;
try { MOD = await import('../../server/dist/brain/chrono-date-policy.js'); } catch { /* not built yet */ }
const datePassedPolicy = MOD?.datePassedPolicy
  ?? (() => { throw new Error('brain/chrono-date-policy.ts does not exist yet'); });
const DATE_PASSED_VALUES = MOD?.DATE_PASSED_VALUES ?? [];

const { deriveChronoStatus } = await import('../../server/dist/brain/chrono-status.js');

describe('the policy resolves schema over space, and absent means today', () => {
  it('absent everywhere is the behaviour every existing space already has', () => {
    // The whole promise of the ruling: an instance that upgrades and changes nothing sees nothing change.
    assert.equal(datePassedPolicy(undefined, 'deploy'), 'overdue');
    assert.equal(datePassedPolicy({}, 'deploy'), 'overdue');
    assert.equal(datePassedPolicy({ typeSchemas: { chrono: {} } }, 'deploy'), 'overdue');
  });

  it('a type schema decides for its own type and no other', () => {
    const meta = { typeSchemas: { chrono: { deploy: { whenDuePasses: 'nothing' } } } };
    assert.equal(datePassedPolicy(meta, 'deploy'), 'nothing');
    assert.equal(datePassedPolicy(meta, 'invoice'), 'overdue');
  });

  it('a space-wide setting covers the types that say nothing, and a schema overrides it', () => {
    // Two tiers, matching `retention` and `suppressEmbeddings` rather than inventing a third order. No
    // RECORD tier on purpose: the meaning of a past date belongs to the kind of thing, not to one instance.
    const meta = { whenDuePasses: 'nothing', typeSchemas: { chrono: { invoice: { whenDuePasses: 'overdue' } } } };
    assert.equal(datePassedPolicy(meta, 'deploy'), 'nothing');
    assert.equal(datePassedPolicy(meta, 'invoice'), 'overdue');
  });

  it('an unrecognised value falls back rather than propagating', () => {
    // `config.json` is hand-editable, so the PATCH schema is not the only way in. A typo must not invent a
    // third behaviour — it reads as unset, which is the documented default.
    for (const bad of ['OVERDUE', 'none', '', null, 42]) {
      assert.equal(datePassedPolicy({ typeSchemas: { chrono: { x: { whenDuePasses: bad } } } }, 'x'), 'overdue',
        `${String(bad)} must fall back to the default`);
    }
  });

  it('the vocabulary is exported, and a ladder is not in it', () => {
    // Deliberately a STRING and deliberately two values. A multi-rung ladder has no asker and makes the
    // answer a function of HOW LONG ago, so every reader must agree on "now" at more than one boundary.
    assert.deepEqual([...DATE_PASSED_VALUES].sort(), ['nothing', 'overdue']);
  });
});

describe('the derivation obeys the policy', () => {
  const past = { status: 'active', startsAt: '2020-01-01T00:00:00.000Z' };

  it('still says overdue under the default', () => {
    assert.equal(deriveChronoStatus(past, new Date(), 'overdue'), 'overdue');
  });

  it('returns the STORED status under `nothing` — which is the whole report', () => {
    assert.equal(deriveChronoStatus(past, new Date(), 'nothing'), 'active');
  });

  it('leaves a terminal status alone under either policy', () => {
    for (const policy of ['overdue', 'nothing']) {
      assert.equal(deriveChronoStatus({ ...past, status: 'completed' }, new Date(), policy), 'completed');
      assert.equal(deriveChronoStatus({ ...past, status: 'cancelled' }, new Date(), policy), 'cancelled');
    }
  });

  it('defaults to today when no policy is passed at all', () => {
    // Its third parameter is optional so that a caller which genuinely has no space context — a unit test,
    // a future internal reader — behaves exactly as it did before this existed.
    assert.equal(deriveChronoStatus(past, new Date()), 'overdue');
  });
});

describe('every reader resolves it the same way', () => {
  /**
   * The three that must agree, and the filter is the one that would silently disagree: it translates
   * `status: 'overdue'` into a Mongo due-moment comparison, so left alone it matches records that read as
   * `active` through every other door.
   */
  const READERS = [
    'server/src/brain/chrono.ts',
    'server/src/brain/recall.ts',
  ];

  it('no reader re-implements the resolution', () => {
    // Not "does it mention the policy" — does it reach the ONE function. A `?? 'overdue'` in a reader is a
    // second implementation that a space-wide setting would never reach.
    const offenders = READERS.filter(f => !/datePassedPolicy|whenDuePasses/.test(src(f)));
    assert.deepEqual(offenders, [],
      `these read a chrono status and never resolve the per-type policy: ${offenders.join(', ')}`);
  });

  it('the status FILTER is type-aware, not just the read path', () => {
    const s = src('server/src/brain/chrono.ts');
    const at = s.indexOf('export function buildChronoQuery');
    assert.ok(at > -1, 'buildChronoQuery moved — re-anchor this gate');
    const body = s.slice(at, s.indexOf('\n}', at));
    assert.match(body, /whenDuePasses|datePassed|noDerivation|exemptTypes/i,
      'the `overdue` filter still compares every type against the clock, so a type whose schema says a '
      + 'passed date means nothing would match `overdue` here while reading as its stored status everywhere '
      + 'else — the same rule with two implementations, inside one door');
  });
});
