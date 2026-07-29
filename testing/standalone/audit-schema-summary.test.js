/**
 * Schema changes are recorded — as names, and only as names.
 *
 * `space.schema.update` and `schema_library.update` change nested objects, and the audit layer records
 * scalars from an allowlist and drops objects outright. The result was that replacing a space's entire
 * schema recorded **nothing**: the log said an admin hit the route and could not say whether they added
 * a type or deleted eleven. The schema decides what the space will accept from then on, so that is the
 * one change least affordable to lose.
 *
 * The fix is a summary, and the whole safety of it rests on one line: **names, never values.** A
 * property's `default` or `enum` can be example data lifted from real records; its KEY is the declared
 * vocabulary an admin chose. The last test here is the one that matters — it feeds a schema whose values
 * are recognisable secrets and asserts none of them appear anywhere in the output, by scanning the
 * serialised result rather than the fields the test happens to think of.
 *
 * Run: node --test testing/standalone/audit-schema-summary.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let auditChanges, summariseTypeSchemas, MAX_KEYS_PER_FIELD;

before(async () => {
  ({ auditChanges } = await import('../../server/dist/audit/audit-changes.js'));
  ({ summariseTypeSchemas, MAX_KEYS_PER_FIELD } = await import('../../server/dist/audit/audit-schema-summary.js'));
});

const ts = (entity = {}) => ({ typeSchemas: { entity } });
const find = (changes, field) => changes.find(c => c.field === field);

describe('space schema changes are no longer invisible', () => {
  it('records which type names were added and removed', () => {
    const changes = auditChanges('space.schema.update',
      ts({ service: {}, runbook: {} }),
      ts({ service: {}, adr: {} }));
    const c = find(changes, 'typeSchemas.entity');
    assert.deepEqual(c.added, ['adr']);
    assert.deepEqual(c.removed, ['runbook']);
  });

  it('records property KEY changes for a type that exists on both sides', () => {
    const changes = auditChanges('space.schema.update',
      ts({ service: { propertySchemas: { owner: {}, tier: {} } } }),
      ts({ service: { propertySchemas: { owner: {}, sla: {} } } }));
    const c = find(changes, 'typeSchemas.entity.service.propertySchemas');
    assert.deepEqual(c.added, ['sla']);
    assert.deepEqual(c.removed, ['tier']);
  });

  it('does not also itemise the properties of a type that was just added or removed', () => {
    // The line saying the whole type arrived already covers them; repeating each field buries the
    // change that matters under the change implied by it.
    const changes = auditChanges('space.schema.update',
      ts({}),
      ts({ service: { propertySchemas: { owner: {}, tier: {} } } }));
    assert.deepEqual(find(changes, 'typeSchemas.entity').added, ['service']);
    assert.equal(find(changes, 'typeSchemas.entity.service.propertySchemas'), undefined);
  });

  it('reports each knowledge kind separately — an edge label is not an entity type', () => {
    const changes = auditChanges('space.schema.update',
      { typeSchemas: { entity: { service: {} }, edge: { runs_on: {} } } },
      { typeSchemas: { entity: { service: {} }, edge: { runs_on: {}, owns: {} } } });
    assert.equal(find(changes, 'typeSchemas.entity'), undefined, 'the entity side did not change');
    assert.deepEqual(find(changes, 'typeSchemas.edge').added, ['owns']);
  });

  it('an unchanged schema records nothing at all', () => {
    const same = ts({ service: { propertySchemas: { owner: {} } } });
    assert.deepEqual(auditChanges('space.schema.update', same, structuredClone(same)), []);
  });

  it('caps the key list so one enormous paste cannot flood a retained store', () => {
    const many = {};
    for (let i = 0; i < MAX_KEYS_PER_FIELD + 10; i++) many[`p${i}`] = {};
    const changes = summariseTypeSchemas(
      { entity: { service: { propertySchemas: {} } } },
      { entity: { service: { propertySchemas: many } } });
    assert.equal(find(changes, 'typeSchemas.entity.service.propertySchemas').added.length, MAX_KEYS_PER_FIELD);
  });

  it('a malformed snapshot records nothing rather than guessing', () => {
    assert.deepEqual(auditChanges('space.schema.update', { typeSchemas: 'nope' }, { typeSchemas: 42 }), []);
    assert.deepEqual(auditChanges('space.schema.update', {}, {}), []);
  });

  it('an operation with no summary rule is unaffected', () => {
    // Silent by default stays the rule: a route added later must not start recording structure nobody
    // vetted, exactly as it does not start recording fields nobody allowlisted.
    assert.deepEqual(auditChanges('token.create', ts({ a: {} }), ts({ b: {} })), []);
  });
});

describe('schema library entries', () => {
  it('records scalar metadata AND the property-key delta together', () => {
    const before = { knowledgeType: 'entity', typeName: 'service', published: false, schema: { propertySchemas: { owner: {} } } };
    const after = { knowledgeType: 'entity', typeName: 'service', published: true, schema: { propertySchemas: { owner: {}, sla: {} } } };
    const changes = auditChanges('schema_library.update', before, after);
    assert.equal(find(changes, 'published').to, true);
    assert.deepEqual(find(changes, 'schema.propertySchemas').added, ['sla']);
  });
});

describe('values never reach the audit log — the property the whole design rests on', () => {
  it('no schema VALUE appears anywhere in the recorded output', () => {
    // Everything below is a value, not a name. A `default` or an `enum` member can be example data
    // copied from a real record, which is exactly what must not land in a retained, admin-queryable
    // store. Asserted by scanning the serialised output, so a future field that starts leaking is
    // caught even though this test never heard of it.
    const secrets = ['sk-live-DEADBEEF', 'hunter2', 'https://user:pw@example.invalid/hook', '^secret-[0-9]+$'];
    const before = ts({ service: { propertySchemas: { owner: {} } } });
    const after = ts({
      service: {
        namingPattern: secrets[3],
        tagSuggestions: [secrets[1]],
        propertySchemas: {
          owner: {},
          apiKey: { type: 'string', default: secrets[0], enum: [secrets[0], secrets[1]] },
          hook: { type: 'string', default: secrets[2] },
        },
      },
      newType: { propertySchemas: { x: { default: secrets[1] } } },
    });

    const serialised = JSON.stringify(auditChanges('space.schema.update', before, after));
    for (const s of secrets) {
      assert.ok(!serialised.includes(s), `a schema value reached the audit entry: ${s}`);
    }
    // …while still recording the change itself, so this is not passing by recording nothing.
    assert.ok(serialised.includes('apiKey'), 'the property KEY is the point — it must still be recorded');
    assert.ok(serialised.includes('newType'));
  });

  it('the same holds for a library entry', () => {
    const secret = 'sk-live-CAFEBABE';
    const changes = auditChanges('schema_library.update',
      { schema: { propertySchemas: {} } },
      { schema: { propertySchemas: { apiKey: { default: secret } } } });
    const serialised = JSON.stringify(changes);
    assert.ok(!serialised.includes(secret));
    assert.ok(serialised.includes('apiKey'));
  });
});
