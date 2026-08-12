/**
 * A schema type deleted in the editor is actually gone after Save.
 *
 * ## The bug
 *
 * Reported by an integrator whose space had accumulated 21 foreign entity types after a schema file was
 * imported against the wrong space. They deleted every declared type in the UI, re-imported the correct
 * file, and all 21 were still there. From outside they could not tell whether the deletes had failed to
 * persist or whether import was re-merging against a stored prior version.
 *
 * It was the first, and no sequence of UI actions could have worked. Three additive layers stacked:
 *
 *   1. the file import staged into the existing staged schemas rather than replacing them;
 *   2. `buildMeta()` omitted a knowledge type from the payload entirely when it held zero types;
 *   3. `mergeSpaceMeta()` merges per type-NAME and only touches knowledge types present in the payload.
 *
 * So deleting the last entity type meant the `entity` key never left the browser, and the server —
 * correctly, by its own documented contract — preserved everything it had. The delete could be performed,
 * saved, and confirmed, and nothing anywhere had changed.
 *
 * ## Why PATCH was not simply changed
 *
 * The additive behaviour is deliberate and was asked for: a caller editing one type must not have to
 * resend the other forty. Both semantics have to exist, so the request says which it wants. `merge` stays
 * the default, so every existing integration keeps its behaviour byte for byte.
 *
 * Run: node --test testing/standalone/schema-type-deletion-persists.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let mergeSpaceMeta;

before(async () => {
  ({ mergeSpaceMeta } = await import('../../server/dist/spaces/meta-update.js'));
});

/** A space declaring two entity types and one edge label. */
const EXISTING = {
  version: 9,
  updatedAt: '2026-08-06T00:00:00.000Z',
  purpose: 'flows',
  typeSchemas: {
    entity: {
      flow: { namingPattern: '^f-' },
      step: { propertySchemas: { order: { type: 'number' } } },
    },
    edge: { follows: {} },
  },
};

describe('a deleted schema type is gone after save', () => {
  it('the module under test is the real one', () => {
    // Floors the suite: an import that silently resolved to undefined would make every assertion below
    // throw on call rather than pass, but a helper that existed and did nothing would not be caught.
    assert.equal(typeof mergeSpaceMeta, 'function');
    const sanity = mergeSpaceMeta(EXISTING, {}, 'merge');
    assert.deepEqual(Object.keys(sanity.typeSchemas.entity).sort(), ['flow', 'step']);
  });

  it('replace mode removes a type absent from the payload', () => {
    // The editor showed one entity type because the user deleted the other. Save must mean that.
    const out = mergeSpaceMeta(EXISTING, {
      typeSchemas: { entity: { flow: { namingPattern: '^f-' } }, edge: { follows: {} } },
    }, 'replace');
    assert.deepEqual(Object.keys(out.typeSchemas.entity), ['flow'],
      '`step` was deleted in the editor and left out of the payload, so it must be gone from the space');
  });

  it('replace mode clears a knowledge type sent as empty', () => {
    // The case that actually bit: every entity type deleted. An absent key and an empty object have to
    // mean different things, or "this kind declares nothing" is inexpressible.
    const out = mergeSpaceMeta(EXISTING, {
      typeSchemas: { entity: {}, edge: { follows: {} } },
    }, 'replace');
    assert.deepEqual(out.typeSchemas.entity, {}, 'an empty entity map must clear the declared entity types');
  });

  it('replace mode with an empty typeSchemas clears everything', () => {
    const out = mergeSpaceMeta(EXISTING, { typeSchemas: {} }, 'replace');
    assert.deepEqual(out.typeSchemas, {}, 'a space must be able to declare nothing at all');
  });

  it('merge mode is unchanged — the default keeps every existing contract', () => {
    // The regression that would hurt most: silently making PATCH authoritative would delete types for
    // every integrator who sends a partial body, which is what a partial body is FOR.
    const out = mergeSpaceMeta(EXISTING, {
      typeSchemas: { entity: { flow: { namingPattern: '^flow-' } } },
    });
    assert.deepEqual(Object.keys(out.typeSchemas.entity).sort(), ['flow', 'step'],
      'a type not mentioned in a merge PATCH must survive');
    assert.equal(out.typeSchemas.entity.flow.namingPattern, '^flow-', 'a mentioned type must be updated');
    assert.deepEqual(Object.keys(out.typeSchemas.edge), ['follows'],
      'a knowledge type absent from a merge PATCH must survive');
  });

  it('an absent typeSchemas changes nothing in either mode', () => {
    // `replace` describes how to apply typeSchemas WHEN PRESENT. A caller renaming a space sends no
    // schemas at all, and must not thereby erase them.
    for (const mode of ['merge', 'replace']) {
      const out = mergeSpaceMeta(EXISTING, { purpose: 'renamed' }, mode);
      assert.deepEqual(out.typeSchemas, EXISTING.typeSchemas, `${mode}: schemas must be untouched`);
      assert.equal(out.purpose, 'renamed');
    }
  });

  it('scalars still overwrite, and untouched ones survive, in replace mode', () => {
    const out = mergeSpaceMeta({ ...EXISTING, usageNotes: 'keep me' }, {
      purpose: 'new', typeSchemas: {},
    }, 'replace');
    assert.equal(out.purpose, 'new');
    assert.equal(out.usageNotes, 'keep me',
      'replace applies to typeSchemas only — it is not a whole-meta replacement');
  });
});
