/**
 * A type-schema field that only means something on ONE collection is REFUSED on the others.
 *
 * ## The claim that was not true
 *
 * `retention.contentDays` is chrono-only, and three places said it was rejected elsewhere:
 * `TypeSchema.retention`'s docblock (*"Rejected on other collections rather than silently ignored"*),
 * `chrono-retention.ts` (*"the write path rejects it on other collections"*), and — the one that matters most —
 * `docs/integration-guide/04f-write-semantics.md`, which is an integrator's authoritative reference and says the
 * same sentence.
 *
 * It was accepted, stored, and silently ignored. `CONTENT_TIER_COLLECTIONS` existed and was read in exactly one
 * place: the RESOLVER, which returns `undefined` for a non-chrono collection long after the write was accepted.
 * Nothing refused anything.
 *
 * So an operator could set a content window on an entity type, get a 200, see it in their own config, and watch
 * it do nothing for ever. The rule this repo holds is that a behaviour the product already promises to a user is
 * not a decision to re-open — the fix direction is fixed, so the code moved rather than the sentence.
 *
 * The client believed it too: `space-settings-state.service.ts` sends `contentDays` only for chrono because
 * *"the API refuses it elsewhere and a control that cannot work is worse than none"*. That comment is now true.
 *
 * ## Where it has to live
 *
 * At `TypeSchemasZ`, because that is the only layer that sees BOTH the field and the collection it was filed
 * under. A `TypeSchemaZ` validates one type object and cannot know whether it arrived under `entity` or `edge`;
 * the resolver knows the collection but runs after the write is already accepted.
 *
 * ## Why a list for one row
 *
 * The next collection-scoped fields are already specified — `S-1`'s `endpoints` and `functional` are edge-only
 * for the same reason this is chrono-only. Written as an inline `if`, the second is the one somebody forgets,
 * which is exactly how the first came to be documented and absent.
 *
 * Run: node --test testing/standalone/a-collection-scoped-schema-field-is-refused-elsewhere.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { TypeSchemasZ } = await import('../../server/dist/spaces/body-schemas.js');

/** A `typeSchemas` map with one type of one collection carrying `schema`. */
const under = (collection, schema) => ({ [collection]: { thing: schema } });

const ALL = ['entity', 'memory', 'edge', 'chrono'];

/** The message of the first issue, or `null` when the value was accepted. */
function reject(value) {
  const r = TypeSchemasZ.safeParse(value);
  return r.success ? null : (r.error.issues[0]?.message ?? '(no message)');
}

describe('the checker itself works before it is trusted', () => {
  it('an ordinary type schema still parses on every collection', () => {
    // Floors every refusal below: a schema that refused everything would pass them all.
    for (const c of ALL) {
      assert.equal(reject(under(c, { namingPattern: '^x' })), null, `${c} refused an ordinary schema`);
    }
  });

  it('and an unknown key is still a refusal, not a strip', () => {
    // `.strict()` is what the whole family of these fields rests on: a key the schema does not declare is a 400
    // rather than a silent removal. Losing that would make this check moot for every future field.
    assert.ok(reject(under('edge', { nonsense: true })), 'an unlisted key was accepted');
  });
});

describe('retention.contentDays is CHRONO only, which was promised and not done', () => {
  for (const c of ['entity', 'memory', 'edge']) {
    it(`contentDays is refused on ${c}`, () => {
      const msg = reject(under(c, { retention: { contentDays: 30 } }));
      assert.ok(msg,
        `${c} accepted a content window. The integration guide says "Rejected on other collections rather than `
        + 'silently ignored", and it was accepted, stored and ignored');
      assert.match(msg, /chrono/, 'the refusal must name the collection the field belongs to');
      assert.match(msg, new RegExp(c), 'and the collection it was wrongly set on');
    });

    it(`but plain retention.days is still fine on ${c}`, () => {
      // The control, and the one that stops this being "refuse retention off chrono". `days` applies to every
      // collection and is the tier the whole feature exists for — taking it out would be a far worse bug than
      // the one being fixed.
      assert.equal(reject(under(c, { retention: { days: 30 } })), null, `${c} lost its delete window`);
    });
  }

  it('and contentDays is accepted on chrono, beside days', () => {
    assert.equal(reject(under('chrono', { retention: { contentDays: 30, days: 90 } })), null);
    assert.equal(reject(under('chrono', { retention: { contentDays: 30 } })), null);
  });
});

describe('the refusal says what to do instead', () => {
  it('the message names the field, the collection it belongs to, and a way forward', () => {
    /*
     * The message is the feature. An operator who set a content window on an entity type is making a reasonable
     * guess about where the setting lives, not a typo — so a bare "unrecognised key" would leave them no better
     * off, and a bare "chrono only" would not tell them what to use instead.
     */
    const msg = reject(under('entity', { retention: { contentDays: 30 } }));
    assert.match(msg, /contentDays/, 'the message must name the field');
    assert.match(msg, /chrono/);
    assert.match(msg, /retention\.days/, 'and point at the setting that does work everywhere');
    assert.ok(msg.length > 60, `the message is too short to explain anything: ${msg}`);
  });

  it('the issue is reported at the PATH the operator wrote', () => {
    // So the error points at `entity.thing.retention.contentDays` rather than at the top of the object. A
    // schema editor shows the issue beside the field; a top-level path shows it nowhere useful.
    const r = TypeSchemasZ.safeParse(under('entity', { retention: { contentDays: 30 } }));
    assert.equal(r.success, false);
    assert.deepEqual(r.error.issues[0].path, ['entity', 'thing', 'retention', 'contentDays']);
  });
});
