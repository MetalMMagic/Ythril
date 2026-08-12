import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE, TTL_DAYS_SCHEMA, EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA, ttlDaysFromArgs, uuidSchema, unitScoreSchema } from './shared.js';
import { validateDeleteFields, applyDeleteFields as applyDeleteFieldsPaths } from '../../brain/delete-fields.js';
import { deleteEntity, findEntitiesByName, findEntityBacklinks, getEntityById, updateEntityById, upsertEntity } from '../../brain/entities.js';
// The shared write gate, imported rather than reimplemented — see the note in memory.ts.
import { assertUpdateAllowed, classifyEntityUpsert, classifyUpdateViolations, locateForUpdate } from '../../brain/write-validation.js';
import { type PropertyResolution, applyResolutions, computeMergePlan, executeMerge, validateResolution } from '../../brain/merge.js';
import { getConfig } from '../../config/loader.js';
import { isProxySpace, isStrictLinkage, resolveMemberSpaces, resolveWriteTarget, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import { resolveMetaRefs, validateEntity } from '../../spaces/schema-validation.js';
import { mergePropertiesOrKeep, mergeTagsOrKeep } from '../../brain/merge-fields.js';

export const upsert_entityTool: ToolHandler = {
  name: 'upsert_entity',
  description: 'Create or update a named entity in the knowledge graph. Identity is by `id` — if `id` is supplied the matching record is updated (or a new record with that ID is created); if `id` is omitted a new record is always inserted regardless of name.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: uuidSchema('UUID v4 of an EXISTING record to update. It is not a way to choose an id: identity is server-generated, so an id that names nothing is ignored rather than adopted. To carry your own reference, use `name` or `description`.'),
            name: { type: 'string', minLength: 1, description: 'Entity name.' },
            type: { type: 'string', minLength: 1, description: 'Entity type (person, place, concept, …).' },
            tags: { type: 'array', items: { type: 'string' } },
            description: { type: 'string', description: 'Optional prose description or summary of this entity.' },
            properties: {
              type: 'object',
              description: 'Key-value properties (e.g. {"wheels": 4, "color": "red"}). Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            checkContradictions: { type: 'boolean', default: false, description: 'Also flag existing entities that CONTRADICT this one — a near-neighbour setting the same single-valued property to a different value. Deterministic only (no model call). The entity is still stored regardless.' },
            checkDuplicates: { type: 'boolean', default: true, description: 'On a NEW entity insert (no id / unknown id), run a semantic near-duplicate check first (default true). Flags highly similar existing entities (id + summary + score) so you can merge or update instead of creating a duplicate. Does not fire on updates. Set false to skip.' },
            dupeThreshold: unitScoreSchema('Cosine-similarity threshold for the duplicate check (0-1, default ~0.92). Lower to flag looser matches.'),
            ttlDays: TTL_DAYS_SCHEMA,
          },
          required: ['space', 'name', 'type'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const eName = String(a['name'] ?? '');
    const eType = String(a['type'] ?? '');
    if (!eName.trim()) throw new Error('name must not be empty');
    if (!eType.trim()) throw new Error('type must not be empty');
    const tags = Array.isArray(a['tags']) ? (a['tags'] as string[]) : [];
    const props = (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties']))
      ? (a['properties'] as Record<string, string | number | boolean>)
      : {};
    const description = typeof a['description'] === 'string' ? a['description'] : undefined;
    const rawId = typeof a['id'] === 'string' ? a['id'].trim() : undefined;
    if (rawId !== undefined && !UUID_V4_RE.test(rawId)) throw new Error('id must be a valid UUID v4');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    // Schema validation of the record this upsert will PRODUCE, not of the payload. With an `id` that
    // matches, `upsertEntity` merges into the stored record, so validating the payload alone refused
    // partial patches whose merged result was perfectly conformant.
    const entMetaRaw = getConfig().spaces.find(s => s.id === wt.target)?.meta;
    const entMeta = entMetaRaw ? resolveMetaRefs(entMetaRaw) : undefined;
    const entCheck = await classifyEntityUpsert(wt.target, { name: eName.trim(), type: eType.trim(), properties: props, tags }, rawId);
    const entSchemaViolations = entCheck.all;
    if (entCheck.blocked) {
      // The violations travel as structured data rather than a JSON tail glued to the sentence: a
      // caller had to parse the message to act on them. The prose is unchanged for a client that
      // reads only the content blocks.
      return {
        content: [{ type: 'text' as const, text: `Error: schema_violation: ${entCheck.message}` }],
        isError: true,
        structuredContent: { error: 'schema_violation', message: entCheck.message, introduced: entCheck.introduced, preExisting: entCheck.preExisting, violations: entSchemaViolations },
      };
    }

    // Insert-time duplicate check defaults ON for the interactive upsert tool
    // (only fires on inserts, not updates — see upsertEntity).
    const entDupeCheck = a['checkDuplicates'] !== false;
    const entContraCheck = a['checkContradictions'] === true;
    const entDupeThreshold = typeof a['dupeThreshold'] === 'number' ? a['dupeThreshold'] : undefined;
    const entTtlDays = ttlDaysFromArgs(a);
    const { entity, warning, similar, contradicts } = await upsertEntity(wt.target, eName, eType, tags, props, description, rawId,
      { checkDuplicates: entDupeCheck, checkContradictions: entContraCheck, dupeThreshold: entDupeThreshold }, ctx.actor, entTtlDays);
    let msg = `Entity '${entity.name}' (${entity.type}) upserted (ID ${entity._id}).${warning ? `\n⚠️ ${warning}` : ''}`;
    if (similar && similar.length > 0) {
      msg += `\n⚠️ Possible duplicate — ${similar.length} existing entit${similar.length === 1 ? 'y is' : 'ies are'} highly similar: ${similar.map(s => `"${s.summary}" (ID ${s._id}, ${s.score.toFixed(2)})`).join('; ')}. Pass checkDuplicates:false to skip, or provide the existing id to update it instead.`;
    }
    if (contradicts && contradicts.length > 0) {
      const detail = contradicts.map(c =>
        `"${c.summary}" (ID ${c.id}: ${c.fields.map(f => `${f.key} ${f.aValue} vs ${f.bValue}`).join(', ')})`).join('; ');
      msg += `
⚠️ Contradiction — ${contradicts.length} existing entit${contradicts.length === 1 ? 'y disagrees' : 'ies disagree'} with this one: ${detail}. The entity was still stored. If you are correcting an outdated fact, update the record above instead of leaving both.`;
    }
    // Schema warnings (reuse violations from pre-write check)
    if (entMeta?.validationMode === 'warn') {
      for (const v of entSchemaViolations) msg += `\n⚠️ Schema: ${v.field} — ${v.reason}`;
    }
    return {
      content: [{ type: 'text' as const, text: msg }],
    };
  },
};

export const update_entityTool: ToolHandler = {
  name: 'update_entity',
  description: 'Update an existing entity by its ID. All fields are optional — only supplied fields are changed.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', minLength: 1, description: 'Entity ID to update.' },
            name: { type: 'string', description: 'New entity name.' },
            type: { type: 'string', description: 'New entity type.' },
            description: { type: 'string', description: 'New prose description or summary.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to merge with existing tags.' },
            properties: {
              type: 'object',
              description: 'Key-value properties to merge with existing (e.g. {"wheels": 4}). Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            excludeFromVectorSearch: EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA,
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            deleteFields: { type: 'array', items: { type: 'string' }, description: 'Dot-notation paths to delete from the entity (e.g. ["properties.oldKey", "description"]). System fields (id, name, type, spaceId, createdAt, updatedAt) cannot be deleted. Deletions are permanent.' },
            ttlDays: TTL_DAYS_SCHEMA,
          },
          additionalProperties: false,
          required: ['space', 'id'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const id = String(a['id'] ?? '').trim();
    if (!id) throw new Error('id must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    // Validate deleteFields
    const dfResult = validateDeleteFields(a['deleteFields']);
    if (!dfResult.ok) throw new Error(dfResult.error);
    const dfPaths: string[] | undefined = Array.isArray(a['deleteFields']) && (a['deleteFields'] as string[]).length > 0 ? a['deleteFields'] as string[] : undefined;
    const updates: { name?: string; type?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; excludeFromVectorSearch?: boolean } = {};
    if (typeof a['excludeFromVectorSearch'] === 'boolean') updates.excludeFromVectorSearch = a['excludeFromVectorSearch'];
    if (typeof a['name'] === 'string') updates.name = a['name'].trim();
    if (typeof a['type'] === 'string') updates.type = (a['type'] as string).trim();
    if (typeof a['description'] === 'string') updates.description = a['description'] as string;
    if (Array.isArray(a['tags'])) updates.tags = a['tags'] as string[];
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      updates.properties = a['properties'] as Record<string, string | number | boolean>;
    }
    const ttlDays = ttlDaysFromArgs(a);
    if (Object.keys(updates).length === 0 && !dfPaths && ttlDays === undefined) throw new Error('At least one of name, type, description, tags, properties, excludeFromVectorSearch, deleteFields, or ttlDays must be provided');

    // Validate the entity AS IT WILL BE, against the meta of the member space it actually lives in. This
    // path had no schema validation at all, so `type` could be moved outside the allowlist that
    // `upsert_entity` enforces on the very same record.
    const found = await locateForUpdate(wt.target, mid => getEntityById(mid, id));
    if (found) {
      const prior = found.record;
      const resultTags = mergeTagsOrKeep(prior.tags, updates.tags);
      const sim: Record<string, unknown> = {
        properties: mergePropertiesOrKeep(prior.properties, updates.properties) ?? {},
        tags: resultTags,
      };
      if (dfPaths) applyDeleteFieldsPaths(sim, dfPaths);
      assertUpdateAllowed(classifyUpdateViolations(
        found.meta,
        validateEntity(found.meta ?? {}, { name: prior.name, type: prior.type, properties: prior.properties ?? {}, tags: prior.tags ?? [] }),
        validateEntity(found.meta ?? {}, {
          name: updates.name ?? prior.name,
          type: updates.type ?? prior.type,
          properties: (sim['properties'] ?? {}) as Record<string, unknown>,
          tags: sim['tags'] as string[],
        }),
      ));
    }

    const updatedEnt = await findFirstAcrossMembers(wt.target, mid => updateEntityById(mid, id, updates, dfPaths, ctx.actor, ttlDays));
    if (!updatedEnt) throw new Error(`Entity '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Entity '${updatedEnt.name}' (${updatedEnt.type}) updated (ID ${updatedEnt._id}, seq ${updatedEnt.seq}).` }],
    };
  },
};

export const merge_entitiesTool: ToolHandler = {
  name: 'merge_entities',
  description: 'Merge two entities into one. The survivor keeps its identity; the absorbed entity is deleted after relinking all references. Call with an empty or partial resolution map to get a conflict plan (409), or with a fully resolved map to execute. Numeric properties support fn:<avg|min|max|sum>, boolean properties support fn:<and|or|xor>, strings require "survivor", "absorbed", or "custom" with customValue.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            survivorId: uuidSchema('UUID v4 of the entity to keep (must differ from absorbedId).'),
            absorbedId: uuidSchema('UUID v4 of the entity to absorb and delete (must differ from survivorId).'),
            resolutions: {
              type: 'array',
              description: 'Per-property conflict resolutions. Each entry: { key, resolution, customValue? }.',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: 'Property key to resolve.' },
                  resolution: { type: 'string', pattern: '^(survivor|absorbed|custom|fn:(avg|min|max|sum|and|or|xor))$', description: 'One of: "survivor", "absorbed", "custom" (requires customValue), or "fn:<name>" where <name> is a numeric merge (avg, min, max, sum) or boolean merge (and, or, xor).' },
                  customValue: { description: 'Required when resolution is "custom".' },
                },
                required: ['key', 'resolution'],
                additionalProperties: false,
              },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'survivorId', 'absorbedId'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const survivorId = String(a['survivorId'] ?? '').trim();
    const absorbedId = String(a['absorbedId'] ?? '').trim();
    if (!survivorId || !UUID_V4_RE.test(survivorId)) throw new Error('survivorId must be a valid UUID v4');
    if (!absorbedId || !UUID_V4_RE.test(absorbedId)) throw new Error('absorbedId must be a valid UUID v4');
    if (survivorId === absorbedId) throw new Error('Cannot merge an entity with itself');

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    if (isProxySpace(callSpace)) throw new Error('Entity merge not supported on proxy spaces');

    const resolutions: PropertyResolution[] = [];
    if (Array.isArray(a['resolutions'])) {
      for (const r of a['resolutions'] as Array<Record<string, unknown>>) {
        if (typeof r?.key !== 'string' || typeof r?.resolution !== 'string') {
          throw new Error('Each resolution must have key (string) and resolution (string)');
        }
        resolutions.push({
          key: r.key,
          resolution: r.resolution,
          ...(r.customValue !== undefined ? { customValue: r.customValue } : {}),
        });
      }
    }

    const result = await computeMergePlan(wt.target, survivorId, absorbedId, resolutions);
    if ('error' in result) throw new Error(result.error);

    const { plan, fullyResolved, survivor, absorbed } = result;

    // Validate resolutions
    for (const c of plan.propertyConflicts) {
      if (!c.resolved) continue;
      const err = validateResolution(c.resolution!, c.type, c.customValue !== undefined);
      if (err) throw new Error(`Invalid resolution for '${c.key}': ${err}`);
    }

    if (!fullyResolved) {
      const lines: string[] = ['Merge plan — unresolved conflicts remain:'];
      for (const c of plan.propertyConflicts) {
        const status = c.resolved ? '✓' : '✗';
        lines.push(`  ${status} ${c.key} (${c.type}): survivor=${JSON.stringify(c.survivorValue)}, absorbed=${JSON.stringify(c.absorbedValue)}${c.suggestedFn ? ` [suggested: fn:${c.suggestedFn}]` : ''}`);
      }
      if (plan.absorbedOnlyProperties.length > 0) {
        lines.push('Absorbed-only properties (auto-added):');
        for (const p of plan.absorbedOnlyProperties) {
          lines.push(`  + ${p.key}=${JSON.stringify(p.value)}`);
        }
      }
      if (plan.duplicateEdgeWarnings.length > 0) {
        lines.push('Duplicate edge warnings:');
        for (const w of plan.duplicateEdgeWarnings) {
          lines.push(`  ⚠ (${w.from} → ${w.to} [${w.label}]) survivor edge: ${w.survivorEdgeId}, absorbed edge: ${w.absorbedEdgeId}`);
        }
      }
      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
        isError: true,
      };
    }

    // Execute merge
    const mergedProperties = applyResolutions(
      survivor.properties ?? {},
      absorbed.properties ?? {},
      plan.propertyConflicts,
      plan.absorbedOnlyProperties,
    );

    const mergeResult = await executeMerge(wt.target, survivor, absorbed, mergedProperties, ctx.actor);
    const mergedEntity = mergeResult.entity;

    const lines: string[] = [
      `Entities merged successfully.`,
      `Survivor: ${mergedEntity._id} (${mergedEntity.name})`,
      `Absorbed: ${absorbed._id} (${absorbed.name}) — deleted`,
    ];
    if (mergeResult.deletedDuplicateEdgeIds.length > 0) {
      lines.push(`🗑 ${mergeResult.deletedDuplicateEdgeIds.length} duplicate edge(s) auto-deleted after relinking.`);
    }
    if (plan.duplicateEdgeWarnings.length > mergeResult.deletedDuplicateEdgeIds.length) {
      const remaining = plan.duplicateEdgeWarnings.length - mergeResult.deletedDuplicateEdgeIds.length;
      lines.push(`⚠ ${remaining} near-duplicate edge(s) remain (differing properties/tags) — resolve via delete_edge.`);
    }
    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  },
};

export const find_entities_by_nameTool: ToolHandler = {
  name: 'find_entities_by_name',
  description: 'Find all entities in the space that match the given name (exact, case-sensitive). Returns a list — multiple entities may share a name. Prefer this over querying by name + type to avoid missing entities with unexpected types.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            name: { type: 'string', minLength: 1, description: 'Exact entity name to look up.' },
          },
          required: ['space', 'name'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const searchName = String(a['name'] ?? '').trim();
    if (!searchName) throw new Error('name must not be empty');
    const all = await collectAcrossMembers(callSpace, mid => findEntitiesByName(mid, searchName));
    if (all.length === 0) {
      return { content: [{ type: 'text' as const, text: `No entities found with name '${searchName}'.` }] };
    }
    return {
      content: [{
        type: 'text' as const,
        text: `Found ${all.length} entit${all.length === 1 ? 'y' : 'ies'} with name '${searchName}':\n` +
          all.map((e, i) => `[${i + 1}] ${e.name} (${e.type}) — ID ${e._id}`).join('\n'),
      }],
    };
  },
};

/**
 * Delete one entity — including the REST route's referential guard, not a weaker version of it.
 *
 * `DELETE /api/brain/spaces/:id/entities/:id` refuses with 409 when `strictLinkage` is on and something
 * still points at the entity. Shipping an MCP delete without that check would be the two-surfaces-one-rule
 * defect this very tool exists to close: an agent would be able to leave dangling references that a REST
 * client is stopped from creating.
 *
 * Face labels are reported by `findEntityBacklinks` but deliberately do NOT block, exactly as in REST —
 * `deleteEntity` unlabels them in the same operation, so they cannot dangle, and blocking on them would make
 * "delete this person" the one thing an operator cannot do for the subject whose data is biometric.
 */
export const delete_entityTool: ToolHandler = {
  name: 'delete_entity',
  description: 'Delete an entity by ID. Refused when strictLinkage is on and other records still reference it. Creates a tombstone for sync propagation.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
    type: 'object',
    properties: {
      space: s.requiredSpace,
      id: { type: 'string', minLength: 1, description: 'Entity ID to delete.' },
      targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
    },
    required: ['space', 'id'],
    additionalProperties: false,
  }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const id = String(a['id'] ?? '').trim();
    if (!id) throw new Error('id must not be empty');

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    for (const mid of resolveMemberSpaces(wt.target)) {
      const existing = await getEntityById(mid, id);
      if (!existing) continue;
      if (isStrictLinkage(mid)) {
        const blocking = (await findEntityBacklinks(mid, id)).filter(b => b.type !== 'face');
        if (blocking.length > 0) {
          const where = blocking.map(b => `${b.type} ${b._id}`).join(', ');
          throw new Error(`Cannot delete entity '${id}': still referenced by ${where}`);
        }
      }
      if (await deleteEntity(mid, id, ctx.actor)) {
        return { content: [{ type: 'text' as const, text: `Entity deleted (ID ${id}).` }] };
      }
    }
    throw new Error(`Entity '${id}' not found`);
  },
};
