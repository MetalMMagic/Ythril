/**
 * Schema validation engine for space meta definitions.
 *
 * Validates write operations against a space's `meta` block using the
 * per-type `typeSchemas` structure — each entity type / edge label /
 * memory type / chrono type owns its own property schemas, naming pattern,
 * required flags, and tag suggestions.
 *
 * Validation is driven by `validationMode`:
 *   - "off"    → no validation (default)
 *   - "warn"   → validation runs, violations returned as warnings
 *   - "strict" → validation runs, violations cause 400 rejection
 */

import type { SpaceMeta, PropertySchema, TypeSchema } from '../config/types.js';
import { getSchemaLibrary, getConfig } from '../config/loader.js';
import { hasReDoSRisk, MAX_PATTERN_LENGTH } from '../util/redos.js';

// ── Violation type ─────────────────────────────────────────────────────────

export interface SchemaViolation {
  field: string;
  value: unknown;
  reason: string;
}

// ── Library ref resolution ─────────────────────────────────────────────────

/**
 * Resolve a single TypeSchema that may contain a `$ref` pointer to a library entry.
 * Returns the resolved inline schema, or `undefined` if the reference cannot be found.
 * Returns the schema unchanged when no `$ref` is present.
 */
export function resolveTypeSchema(schema: TypeSchema | undefined): TypeSchema | undefined {
  if (!schema) return schema;
  const ref = schema.$ref;
  if (!ref) return schema;

  // Resolve library reference
  if (ref.startsWith('library:')) {
    const name = ref.slice('library:'.length);
    const library = getSchemaLibrary();
    const entry = library.find(e => e.name === name);
    return entry ? entry.schema : undefined;
  }

  // Unknown ref format — treat as unresolved (return empty schema)
  return undefined;
}

/**
 * Return a copy of the SpaceMeta with all `$ref` TypeSchema entries resolved from
 * the instance schema library.  Unresolvable refs produce a TypeSchema with
 * `_unresolvedRef` set so that subsequent validate* calls can surface a violation
 * instead of silently passing with no constraints.
 *
 * This is the preferred integration point: call `resolveMetaRefs(meta)` once before
 * passing meta to the validate functions, so validation operates on fully-resolved schemas.
 */
export function resolveMetaRefs(meta: SpaceMeta): SpaceMeta {
  if (!meta.typeSchemas) return meta;

  let changed = false;
  const resolvedTypeSchemas: typeof meta.typeSchemas = {};

  for (const [kt, ktMap] of Object.entries(meta.typeSchemas) as [string, Record<string, TypeSchema>][]) {
    let ktChanged = false;
    const resolvedKtMap: Record<string, TypeSchema> = {};
    for (const [typeName, typeSchema] of Object.entries(ktMap)) {
      if (typeSchema.$ref) {
        const resolved = resolveTypeSchema(typeSchema);
        // Unresolvable ref → stamp _unresolvedRef so validate* functions can surface a violation
        resolvedKtMap[typeName] = resolved ?? { _unresolvedRef: typeSchema.$ref };
        ktChanged = true;
      } else {
        resolvedKtMap[typeName] = typeSchema;
      }
    }
    resolvedTypeSchemas[kt as 'entity' | 'memory' | 'edge' | 'chrono'] = resolvedKtMap;
    if (ktChanged) changed = true;
  }

  if (!changed) return meta;
  return { ...meta, typeSchemas: resolvedTypeSchemas };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate an entity write against the space meta schema.
 */
export function validateEntity(
  meta: SpaceMeta,
  entity: { name?: string; type?: string; properties?: Record<string, unknown>; tags?: string[] },
): SchemaViolation[] {
  const violations: SchemaViolation[] = [];
  if (!meta) return violations;

  const entitySchemas = meta.typeSchemas?.entity;

  // Entity type allowlist (if any types are defined, entity.type must be one of them)
  if (entity.type && entitySchemas && Object.keys(entitySchemas).length > 0) {
    if (!Object.prototype.hasOwnProperty.call(entitySchemas, entity.type)) {
      violations.push({
        field: 'type',
        value: entity.type,
        reason: `not in entityTypes allowlist: ${Object.keys(entitySchemas).join(', ')}`,
      });
    }
  }

  // Per-type schema (naming pattern + required + property schemas)
  const typeSchema = entity.type ? entitySchemas?.[entity.type] : undefined;

  // Broken $ref check — must come before any further typeSchema access
  violations.push(...checkUnresolvedRef(typeSchema));
  if (typeSchema?._unresolvedRef) return violations;

  // Naming pattern for the entity's type
  if (entity.name && entity.type && typeSchema?.namingPattern) {
    if (!safeRegexTest(typeSchema.namingPattern, entity.name)) {
      violations.push({
        field: 'name',
        value: entity.name,
        reason: `does not match naming pattern for type '${entity.type}': ${typeSchema.namingPattern}`,
      });
    }
  }

  // Required properties + property schemas
  violations.push(...validatePropertiesAgainstSchema(typeSchema, entity.properties));

  return violations;
}

/**
 * Validate an edge write against the space meta schema.
 */
/**
 * Edge labels the SERVER itself writes, which an allowlist permits without naming them.
 *
 * Owner's ruling, 2026-08-29: an edge the server writes is subject to the allowlist like any other — but the
 * allowlist should be correct by construction rather than by an operator remembering. Since 2026-08-29
 * `upsertEdge` validates (no caller can reach the collection around it), so without this a space that declared
 * an edge allowlist and did not happen to name `supersedes` would have its contradiction machinery start
 * failing — punishing exactly the operators who took the schema seriously.
 *
 * **Permitted by construction rather than seeded into each space**, which was the other way to read the
 * ruling. Seeding writes the label into new spaces' schemas and leaves every EXISTING space wrong, needing a
 * backfill — the same gap `ensure-query-indexes.ts` already has, where an addition reaches only spaces created
 * afterwards. This form has no migration and no space left behind.
 *
 * It is not an exemption from validation: a server-written edge is still checked against its type schema's
 * `propertySchemas` like any other. Only the LABEL is taken as given, because the label is the server's, not
 * the caller's.
 *
 * Keep this list minimal and keep it here rather than importing from the writers: a value that decides what a
 * schema permits should not be reachable only through the module that happens to write it.
 */
export const SERVER_WRITTEN_EDGE_LABELS: ReadonlySet<string> = new Set([
  // Written by the contradiction-resolution path when a reviewer picks a winner (`api/contradictions.ts`).
  'supersedes',
]);

export function validateEdge(
  meta: SpaceMeta,
  edge: { label?: string; properties?: Record<string, unknown>; tags?: string[] },
): SchemaViolation[] {
  const violations: SchemaViolation[] = [];
  if (!meta) return violations;

  const edgeSchemas = meta.typeSchemas?.edge;

  // Edge label allowlist
  if (edge.label && edgeSchemas && Object.keys(edgeSchemas).length > 0) {
    if (!SERVER_WRITTEN_EDGE_LABELS.has(edge.label)
      && !Object.prototype.hasOwnProperty.call(edgeSchemas, edge.label)) {
      violations.push({
        field: 'label',
        value: edge.label,
        reason: `not in edgeLabels allowlist: ${Object.keys(edgeSchemas).join(', ')}`,
      });
    }
  }

  const typeSchema = edge.label ? edgeSchemas?.[edge.label] : undefined;
  violations.push(...checkUnresolvedRef(typeSchema));
  if (!typeSchema?._unresolvedRef) {
    violations.push(...validatePropertiesAgainstSchema(typeSchema, edge.properties));
  }

  return violations;
}

/**
 * Validate a memory write against the space meta schema.
 *
 * **No type allowlist, unlike the other three — and that asymmetry is disputed, not settled.** See P-24 in the
 * decisions tracker: `types-knowledge.ts` and two integration-guide pages state that the keys of
 * `typeSchemas.memory` are the allowed values, while this function only ever uses `type` to look one up. The
 * memories tab's free-text type control was designed on the current behaviour deliberately (#366 era), so
 * changing it is a product decision rather than a defect fix.
 */
export function validateMemory(
  meta: SpaceMeta,
  memory: { type?: string; properties?: Record<string, unknown>; tags?: string[] },
): SchemaViolation[] {
  if (!meta) return [];
  const typeSchema = memory.type ? meta.typeSchemas?.memory?.[memory.type] : undefined;
  const refViolations = checkUnresolvedRef(typeSchema);
  if (refViolations.length) return refViolations;
  return validatePropertiesAgainstSchema(typeSchema, memory.properties);
}

/**
 * Return the set of allowed chrono type names for a space.
 * If the space defines custom `typeSchemas.chrono` keys, those are the
 * allowed types; otherwise falls back to the 5 built-in global types.
 */
export function getAllowedChronoTypes(meta: SpaceMeta | undefined): Set<string> {
  const customTypes = meta?.typeSchemas?.chrono;
  if (customTypes && Object.keys(customTypes).length > 0) {
    return new Set(Object.keys(customTypes));
  }
  return new Set(['event', 'deadline', 'plan', 'prediction', 'milestone']);
}

/**
 * Validate a chrono write against the space meta schema.
 */
export function validateChrono(
  meta: SpaceMeta,
  chrono: { type?: string; properties?: Record<string, unknown>; tags?: string[] },
): SchemaViolation[] {
  if (!meta) return [];
  const violations: SchemaViolation[] = [];

  const chronoSchemas = meta.typeSchemas?.chrono;

  // Chrono type allowlist (if custom types are defined, chrono.type must be one of them)
  if (chrono.type && chronoSchemas && Object.keys(chronoSchemas).length > 0) {
    if (!Object.prototype.hasOwnProperty.call(chronoSchemas, chrono.type)) {
      violations.push({
        field: 'type',
        value: chrono.type,
        reason: `not in chronoTypes allowlist: ${Object.keys(chronoSchemas).join(', ')}`,
      });
    }
  }

  const typeSchema = chrono.type ? chronoSchemas?.[chrono.type] : undefined;
  const refViolations = checkUnresolvedRef(typeSchema);
  if (refViolations.length) return [...violations, ...refViolations];
  return [...violations, ...validatePropertiesAgainstSchema(typeSchema, chrono.properties)];
}

/**
 * Build a compact schema summary string for MCP instructions.
 */
export function buildSchemaSummary(meta: SpaceMeta): string {
  const parts: string[] = [];
  const ts = meta.typeSchemas;
  if (ts?.entity && Object.keys(ts.entity).length > 0) {
    parts.push(`Entity types: ${Object.keys(ts.entity).join(', ')}`);
  }
  if (ts?.edge && Object.keys(ts.edge).length > 0) {
    parts.push(`Edge labels: ${Object.keys(ts.edge).join(', ')}`);
  }
  if (ts?.memory && Object.keys(ts.memory).length > 0) {
    parts.push(`Memory types: ${Object.keys(ts.memory).join(', ')}`);
  }
  if (ts?.chrono && Object.keys(ts.chrono).length > 0) {
    parts.push(`Chrono types: ${Object.keys(ts.chrono).join(', ')}`);
  }
  // `meta.tagSuggestions` used to be summarised here. Retired in #365 — one editable list applying to
  // every type in the space, so it steered what agents tagged with while being easy to set once and
  // forget — and REMOVED from every surface in 3.0.
  //
  // A value already in config.json is still left untouched rather than deleted. The meta merge reads
  // an absent field as "not stated", so nothing rewrites it away; it is simply inert, and no request
  // can put a new one there.
  if (parts.length > 0) {
    parts.push('Call get_space_meta for full schema and usage notes.');
  }
  return parts.join('\n');
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Emit a violation when the resolved TypeSchema carries an `_unresolvedRef` marker,
 * meaning the `$ref` pointed to a library entry that no longer exists.
 * Returns an empty array when the schema is fine.
 */
function checkUnresolvedRef(typeSchema: TypeSchema | undefined): SchemaViolation[] {
  if (!typeSchema?._unresolvedRef) return [];
  return [{
    field: '$ref',
    value: typeSchema._unresolvedRef,
    reason: `schema library entry '${typeSchema._unresolvedRef.slice('library:'.length)}' not found — update or remove this $ref`,
  }];
}

/**
 * Validate required properties and property value schemas against a TypeSchema.
 * Returns an empty array when typeSchema is undefined (no constraints).
 */
/**
 * Fill in properties the caller omitted, from the type schema's declared defaults.
 *
 * ## Why this exists at all
 *
 * `PropertySchema.default` was declared in the interface, documented in the integration guide, and editable in
 * the settings UI — and **read by nothing in the entire server**. An operator could set it, save it, and it did
 * nothing, for ever, with no hint that it had not taken. Owner, 2026-08-29: *"thats not a decicion, thats a
 * bugfix"* — the product already promised the behaviour, so the only question was where to put it.
 *
 * ## Applied on INSERT, not on update, and that is deliberate
 *
 * "On write when the property is absent" reads either way, and one reading is dangerous: on an update, a
 * property the caller has just removed with `deleteFields` is *absent*, so filling it from the default would
 * resurrect what somebody deliberately deleted. Silently undoing a deletion is worse than a default that does
 * not apply, so a default seeds a record when it is created and never fights an edit afterwards.
 *
 * ## It runs BEFORE validation, which is the whole point
 *
 * A property that is `required` and has a `default` must not be a violation — the default is what satisfies the
 * requirement. Running this after validation would refuse writes the schema was designed to accept.
 */
export function applyPropertyDefaults(
  typeSchema: TypeSchema | undefined,
  properties: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> | undefined {
  const declared = typeSchema?.propertySchemas;
  if (!declared) return properties;

  const withDefaults = { ...(properties ?? {}) };
  let filled = false;
  for (const [key, schema] of Object.entries(declared)) {
    if (schema.default === undefined) continue;
    if (withDefaults[key] !== undefined) continue;   // the caller said something; never override it
    withDefaults[key] = schema.default;
    filled = true;
  }
  // Returning the original when nothing was filled keeps `undefined` meaning "no properties at all", which
  // several write paths distinguish from an empty object.
  return filled ? withDefaults : properties;
}

function validatePropertiesAgainstSchema(
  typeSchema: TypeSchema | undefined,
  properties?: Record<string, unknown>,
): SchemaViolation[] {
  if (!typeSchema?.propertySchemas) return [];
  const violations: SchemaViolation[] = [];
  const props = properties ?? {};

  for (const [key, schema] of Object.entries(typeSchema.propertySchemas)) {
    const val = props[key];

    // Required check (inline flag on PropertySchema)
    if (schema.required) {
      if (val === undefined || val === null || val === '') {
        violations.push({
          field: `properties.${key}`,
          value: val ?? null,
          reason: `required property '${key}' is missing or empty`,
        });
        continue; // skip further checks for missing required field
      }
    }

    if (val === undefined || val === null) continue; // not present, no further checks

    violations.push(...validateValue(`properties.${key}`, val, schema));
  }

  return violations;
}

/**
 * Validate a single value against a PropertySchema.
 */
function validateValue(field: string, value: unknown, schema: PropertySchema): SchemaViolation[] {
  const violations: SchemaViolation[] = [];

  // Type check — 'date' is stored as ISO string, so validate as string
  if (schema.type) {
    const expectedJsType = schema.type === 'date' ? 'string' : schema.type;
    if (typeof value !== expectedJsType) {
      violations.push({ field, value, reason: `expected type '${schema.type}', got '${typeof value}'` });
      return violations; // no point checking further if type is wrong
    }
  }

  // Enum check
  if (schema.enum && schema.enum.length > 0) {
    if (!schema.enum.includes(value as string | number | boolean)) {
      violations.push({ field, value, reason: `must be one of: ${schema.enum.join(', ')}` });
    }
  }

  // Numeric range
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      violations.push({ field, value, reason: `must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      violations.push({ field, value, reason: `must be <= ${schema.maximum}` });
    }
  }

  // String pattern (also applies to 'date' values stored as strings)
  if (typeof value === 'string' && schema.pattern) {
    if (!safeRegexTest(schema.pattern, value)) {
      violations.push({ field, value, reason: `does not match pattern: ${schema.pattern}` });
    }
  }

  return violations;
}

/**
 * Test a regex pattern against a value with comprehensive ReDoS protection:
 * 1. Length limits on both pattern (500) and value (10K)
 * 2. Structural analysis rejecting nested quantifiers / alternation+quantifier
 *    (`hasReDoSRisk`, shared via util/redos.ts)
 * 3. Fail-safe: returns false (non-matching → reported as violation) on any issue
 */
function safeRegexTest(pattern: string, value: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH || value.length > 10_000) return false;
  if (hasReDoSRisk(pattern)) return false;
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return false;
  }
}

/**
 * Look up the meta block for a space from config, with library refs resolved. Returns undefined if none.
 *
 * Lived in `api/brain/_shared.ts` until the upsert-validation fix, which needed it from `brain/bulk.ts`.
 * `brain/` does not import `api/` — a layering worth keeping — and this function is not an HTTP concern:
 * it reads config and resolves schema refs, both of which live here. `_shared.ts` re-exports it, so no
 * route changed.
 */
export function getSpaceMeta(spaceId: string): SpaceMeta | undefined {
  const cfg = getConfig();
  const meta = cfg.spaces.find(s => s.id === spaceId)?.meta;
  if (!meta) return undefined;
  return resolveMetaRefs(meta);
}

/**
 * Apply schema validation to a write operation.
 * Returns { blocked: true, violations } when strict mode rejects the write.
 * Returns { blocked: false, warnings } when warn mode lets the write through.
 * Returns { blocked: false, warnings: [] } when validation is off or no meta.
 *
 * One definition, because the alternative is each write path deciding for itself what `strict` means.
 */
export function applyValidation(
  meta: SpaceMeta | undefined,
  violations: SchemaViolation[],
): { blocked: boolean; warnings: SchemaViolation[] } {
  if (!meta || !meta.validationMode || meta.validationMode === 'off' || violations.length === 0) {
    return { blocked: false, warnings: [] };
  }
  if (meta.validationMode === 'strict') {
    return { blocked: true, warnings: violations };
  }
  // warn mode
  return { blocked: false, warnings: violations };
}
