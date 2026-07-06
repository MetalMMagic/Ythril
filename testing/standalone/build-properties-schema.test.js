/**
 * Unit tests: buildPropertiesFromSchema — client-side form auto-population logic
 *
 * Covers:
 *  - Building a properties object from a type's property schema (defaults per field type)
 *  - Using the selected type's schema rather than always the first type
 *  - Preserving existing property values when a type already has stored data
 *  - Handling enum, number, boolean, string, and date field types
 *  - stripEmptyOptionalProps — removes empty optional fields, keeps required ones
 *  - Edge cases: no schema, unknown typeName, empty schemas
 *
 * These tests use pure in-process logic and do NOT require a MongoDB instance.
 * Run with:
 *   node --test testing/standalone/build-properties-schema.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Replicated logic (matches client/src/app/pages/brain/brain.component.ts) ──
//
// buildPropertiesFromSchema: given a typeSchemas map, a knowledge type,
// an optional selected typeName, and an existing properties object, returns a
// new properties object that includes one entry per schema field — using the
// existing value where present, and a type-appropriate default otherwise.
//
// Matches the behaviour of the private buildPropertiesObject() method in
// brain.component.ts so that changes to either can be validated here.

function buildPropertiesFromSchema(typeSchemas, knowledgeType, typeName, existing = {}) {
  const ktSchemas = typeSchemas?.[knowledgeType];
  if (!ktSchemas || Object.keys(ktSchemas).length === 0) return existing;

  // Use the specified type's schema; fall back to the first type when no name is given
  const schemas = (typeName ? ktSchemas[typeName] : Object.values(ktSchemas)[0])?.propertySchemas ?? {};
  if (Object.keys(schemas).length === 0) return existing;

  const result = { ...existing };
  for (const [key, schema] of Object.entries(schemas)) {
    if (key in result) continue;
    if (schema.enum?.length) {
      result[key] = schema.enum[0];
    } else if (schema.type === 'number') {
      result[key] = 0;
    } else if (schema.type === 'boolean') {
      result[key] = false;
    } else {
      // string, date, or untyped → empty string
      result[key] = '';
    }
  }
  return result;
}

// stripEmptyOptionalProps: removes properties whose value is an empty string
// unless the property is marked required in the schema.
// Required fields are preserved even when empty so the server can surface a
// clear validation error instead of silently omitting the field.
function stripEmptyOptionalProps(props, schema) {
  if (!schema) return props;
  return Object.fromEntries(
    Object.entries(props).filter(([k, v]) => v !== '' || (schema[k]?.required ?? false)),
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  buildPropertiesFromSchema
// ═════════════════════════════════════════════════════════════════════════════

describe('buildPropertiesFromSchema — no schema / empty schema', () => {
  it('returns existing props when typeSchemas is undefined', () => {
    const result = buildPropertiesFromSchema(undefined, 'entity', 'service', { a: 'x' });
    assert.deepStrictEqual(result, { a: 'x' });
  });

  it('returns existing props when the knowledge type has no entries', () => {
    const result = buildPropertiesFromSchema({ entity: {} }, 'entity', 'service', { a: 'x' });
    assert.deepStrictEqual(result, { a: 'x' });
  });

  it('returns existing props when the selected type has no propertySchemas', () => {
    const typeSchemas = { entity: { service: { namingPattern: '^svc-' } } };
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service', { a: 'x' });
    assert.deepStrictEqual(result, { a: 'x' });
  });

  it('returns empty object when no existing props and no schema', () => {
    const result = buildPropertiesFromSchema({}, 'entity', 'service');
    assert.deepStrictEqual(result, {});
  });
});

describe('buildPropertiesFromSchema — default values by field type', () => {
  const typeSchemas = {
    entity: {
      service: {
        propertySchemas: {
          status:  { type: 'string', enum: ['active', 'inactive'], required: true },
          version: { type: 'string' },
          count:   { type: 'number' },
          enabled: { type: 'boolean' },
          since:   { type: 'date' },
          notes:   {},
        },
      },
    },
  };

  it('sets enum field to first enum value', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.status, 'active');
  });

  it('sets number field to 0', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.count, 0);
  });

  it('sets boolean field to false', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.enabled, false);
  });

  it('sets string field to empty string', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.version, '');
  });

  it('sets date field to empty string', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.since, '');
  });

  it('sets untyped field to empty string', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(result.notes, '');
  });

  it('includes all schema fields in the result', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.deepStrictEqual(Object.keys(result).sort(), ['count', 'enabled', 'notes', 'since', 'status', 'version']);
  });
});

describe('buildPropertiesFromSchema — preserves existing values', () => {
  const typeSchemas = {
    entity: {
      service: {
        propertySchemas: {
          status:  { type: 'string', enum: ['active', 'inactive'] },
          version: { type: 'string' },
        },
      },
    },
  };

  it('keeps existing value for a field already in existing', () => {
    const existing = { status: 'inactive' };
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service', existing);
    assert.equal(result.status, 'inactive');
  });

  it('adds missing schema fields with defaults while preserving existing ones', () => {
    const existing = { status: 'inactive' };
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service', existing);
    assert.equal(result.status, 'inactive');
    assert.equal(result.version, '');
  });

  it('preserves extra properties not in schema', () => {
    const existing = { custom: 'myval' };
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service', existing);
    assert.equal(result.custom, 'myval');
    assert.equal(result.status, 'active');
  });
});

describe('buildPropertiesFromSchema — uses selected type schema, not always first', () => {
  const typeSchemas = {
    entity: {
      service: {
        propertySchemas: {
          version: { type: 'string' },
          team:    { type: 'string', enum: ['alpha', 'beta'] },
        },
      },
      person: {
        propertySchemas: {
          department: { type: 'string' },
          level:      { type: 'number' },
        },
      },
    },
  };

  it('uses service schema when typeName is service', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.ok('version' in result, 'should have version from service schema');
    assert.ok('team' in result,    'should have team from service schema');
    assert.ok(!('department' in result), 'should not have department from person schema');
  });

  it('uses person schema when typeName is person', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'person');
    assert.ok('department' in result, 'should have department from person schema');
    assert.ok('level' in result,      'should have level from person schema');
    assert.ok(!('version' in result), 'should not have version from service schema');
  });

  it('falls back to first type schema when typeName is undefined', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', undefined);
    // First type in insertion order is 'service'
    assert.ok('version' in result, 'should fall back to service schema');
  });

  it('falls back to first type schema when typeName is empty string', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', '');
    assert.ok('version' in result, 'should fall back to first type schema');
  });

  it('returns existing props when typeName is unknown', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'entity', 'nonexistent', { a: 1 });
    // nonexistent type has no propertySchemas so we get back existing unchanged
    assert.deepStrictEqual(result, { a: 1 });
  });
});

describe('buildPropertiesFromSchema — edge and memory knowledge types', () => {
  const typeSchemas = {
    edge: {
      depends_on: {
        propertySchemas: { since: { type: 'date' }, strength: { type: 'number' } },
      },
      owned_by: {
        propertySchemas: { since: { type: 'date' } },
      },
    },
    memory: {
      decision: {
        propertySchemas: { outcome: { type: 'string', enum: ['approved', 'rejected'] } },
      },
    },
  };

  it('populates edge schema for depends_on label', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'edge', 'depends_on');
    assert.equal(result.since, '');
    assert.equal(result.strength, 0);
  });

  it('populates edge schema for owned_by label (not depends_on)', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'edge', 'owned_by');
    assert.ok('since' in result);
    assert.ok(!('strength' in result));
  });

  it('populates memory schema for decision type', () => {
    const result = buildPropertiesFromSchema(typeSchemas, 'memory', 'decision');
    assert.equal(result.outcome, 'approved');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  stripEmptyOptionalProps
// ═════════════════════════════════════════════════════════════════════════════

describe('stripEmptyOptionalProps — no schema', () => {
  it('returns props unchanged when schema is undefined', () => {
    const props = { a: '', b: 'hello', c: 0 };
    assert.deepStrictEqual(stripEmptyOptionalProps(props, undefined), props);
  });

  it('returns props unchanged when schema is null', () => {
    const props = { a: '', b: 'world' };
    assert.deepStrictEqual(stripEmptyOptionalProps(props, null), props);
  });
});

describe('stripEmptyOptionalProps — strips empty optional fields', () => {
  const schema = {
    status:  { type: 'string', required: true },
    version: { type: 'string' },
    owner:   { type: 'string' },
  };

  it('removes empty optional string fields', () => {
    const result = stripEmptyOptionalProps({ status: 'active', version: '', owner: '' }, schema);
    assert.deepStrictEqual(result, { status: 'active' });
  });

  it('keeps required field even when empty', () => {
    const result = stripEmptyOptionalProps({ status: '', version: '' }, schema);
    assert.deepStrictEqual(result, { status: '' });
  });

  it('keeps optional field when it has a non-empty value', () => {
    const result = stripEmptyOptionalProps({ status: 'active', version: '1.0', owner: '' }, schema);
    assert.deepStrictEqual(result, { status: 'active', version: '1.0' });
  });

  it('keeps non-string values (number 0, boolean false) that equal falsy but are not empty string', () => {
    const schema2 = {
      count:   { type: 'number' },
      enabled: { type: 'boolean' },
    };
    const result = stripEmptyOptionalProps({ count: 0, enabled: false }, schema2);
    assert.deepStrictEqual(result, { count: 0, enabled: false });
  });

  it('returns empty object when all optional fields are empty', () => {
    const result = stripEmptyOptionalProps({ version: '', owner: '' }, schema);
    assert.deepStrictEqual(result, {});
  });

  it('keeps properties whose key is not present in schema (extra/freeform fields)', () => {
    const result = stripEmptyOptionalProps({ version: '', custom: '', status: 'on' }, schema);
    // 'custom' is not in schema so schema[k] is undefined → schema[k]?.required is undefined → false → stripped if empty
    assert.deepStrictEqual(result, { status: 'on' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Integration: full create-entity flow simulation
// ═════════════════════════════════════════════════════════════════════════════

describe('create entity flow — open form, change type, save', () => {
  const typeSchemas = {
    entity: {
      service: {
        propertySchemas: {
          team:    { type: 'string', enum: ['alpha', 'beta'], required: true },
          version: { type: 'string' },
          active:  { type: 'boolean' },
        },
      },
      person: {
        propertySchemas: {
          department: { type: 'string', required: true },
          level:      { type: 'number' },
        },
      },
    },
  };

  it('opening the form with service selected auto-populates service fields', () => {
    const props = buildPropertiesFromSchema(typeSchemas, 'entity', 'service');
    assert.equal(props.team,    'alpha');  // first enum value
    assert.equal(props.version, '');
    assert.equal(props.active,  false);
    assert.ok(!('department' in props));
  });

  it('switching to person type rebuilds properties with person fields', () => {
    // existing values from service form (some filled in by user)
    const existing = { team: 'beta', version: '2.0', active: false };
    const props = buildPropertiesFromSchema(typeSchemas, 'entity', 'person', existing);
    // department and level are added with defaults
    assert.equal(props.department, '');
    assert.equal(props.level,      0);
    // Values from the old type are preserved in the result
    assert.equal(props.team, 'beta');
  });

  it('saving with required field filled and optional fields empty strips optional fields', () => {
    const schema = typeSchemas.entity.service.propertySchemas;
    const formProps = { team: 'alpha', version: '', active: false };
    const savedProps = stripEmptyOptionalProps(formProps, schema);
    // 'version' is optional and empty → stripped
    // 'active' is optional but false (not '') → kept
    assert.ok(!('version' in savedProps), 'empty optional string should be stripped');
    assert.equal(savedProps.team,   'alpha');
    assert.equal(savedProps.active, false);
  });

  it('saving with required field empty keeps it so the server can reject it', () => {
    const schema = typeSchemas.entity.service.propertySchemas;
    const formProps = { team: '', version: '', active: true };
    const savedProps = stripEmptyOptionalProps(formProps, schema);
    // 'team' is required and empty → kept (server returns a clear violation)
    assert.equal(savedProps.team, '');
    assert.ok(!('version' in savedProps));
    assert.equal(savedProps.active, true);
  });
});
