/**
 * MCP memory CRUD tools — `remember`, `update_memory`, `delete_memory`.
 *
 * The cross-type retrieval tools (`recall`/`find_similar`/`query`) live in `search.ts` and the
 * cross-type batch writer (`bulk_write`) in `bulk.ts`; this file is just memory create/update/delete.
 */

import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { validateDeleteFields } from '../../brain/delete-fields.js';
import { findEntitiesByIds } from '../../brain/entities.js';
import { assertRefsResolve, UUID_V4_PATTERN } from '../../brain/entity-refs.js';
import { deleteMemory, remember, updateMemory } from '../../brain/memory.js';
import { getConfig } from '../../config/loader.js';
import { checkQuota } from '../../quota/quota.js';
import { resolveWriteTarget, findFirstAcrossMembers, isStrictLinkage } from '../../spaces/proxy.js';
import { resolveMetaRefs, validateMemory } from '../../spaces/schema-validation.js';
import { TTL_DAYS_SCHEMA, ttlDaysFromArgs, unitScoreSchema } from './shared.js';

export const rememberTool: ToolHandler = {
  name: 'remember',
  description: 'Store a fact or memory in the knowledge graph with semantic embedding.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            fact: { type: 'string', minLength: 1, maxLength: 50000, description: 'The fact, observation, or memory to store (1–50 000 characters).' },
            entityIds: {
              type: 'array',
              items: { type: 'string', pattern: UUID_V4_PATTERN },
              description: 'Entity IDs (UUID v4) to link this memory to. Pass IDs, not names — look the entity up first (search_entities / list) and use its id. Every id must reference an existing entity; an unknown id is rejected rather than stored as a dead link.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Categorisation tags.',
            },
            description: { type: 'string', description: 'Optional prose context or rationale for this memory.' },
            type: { type: 'string', description: 'Optional memory type (e.g. "note", "decision"). Selects the per-type schema used to validate `properties` — see the space\'s typeSchemas.memory.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata (filterable via query).',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            checkDuplicates: { type: 'boolean', default: true, description: 'Run a semantic near-duplicate check before storing (default true). When a highly similar memory already exists, the response flags it (id + summary + score) so you can update it instead of creating a redundant one. The memory is still stored regardless. Set false to skip the check.' },
            checkContradictions: { type: 'boolean', default: false, description: 'Also flag existing memories that CONTRADICT this one — a near-neighbour that sets the same single-valued property to a different value (e.g. status="active" vs status="retired"). Different question from checkDuplicates: "is this redundant?" vs "does this conflict with what we already believe?". Deterministic only (no model call, no added latency). The memory is still stored regardless — if you are correcting an outdated fact, that is expected; consider updating or superseding the record named in the warning.' },
            dupeThreshold: unitScoreSchema('Cosine-similarity threshold for the duplicate check (0-1, default ~0.92). Lower to flag looser matches.'),
            ttlDays: TTL_DAYS_SCHEMA,
          },
          required: ['space', 'fact'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const fact = String(a['fact'] ?? '');
    if (!fact.trim()) throw new Error('fact must not be empty');
    if (fact.length > 50_000) throw new Error('fact must not exceed 50 000 characters');
    const tags = Array.isArray(a['tags']) ? (a['tags'] as string[]) : [];
    const entityIdsArg = Array.isArray(a['entityIds']) ? (a['entityIds'] as string[]) : [];
    const description = typeof a['description'] === 'string' ? a['description'] : undefined;
    const props = (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties']))
      ? (a['properties'] as Record<string, string | number | boolean>)
      : undefined;
    // `type` selects the per-type schema. Without it, validateMemory() looks up
    // `typeSchemas.memory[undefined]`, finds nothing, and returns NO violations — so the
    // strict-mode gate below could never fire and schema validation was a total no-op on
    // MCP, the surface agents actually use. REST has always accepted `type`.
    const memType = typeof a['type'] === 'string' && a['type'].trim() ? a['type'] : undefined;

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    const ts = wt.target;

    // Schema validation (single pass — reuse for both strict gate and warn output)
    const remMetaRaw = getConfig().spaces.find(s => s.id === ts)?.meta;
    const remMeta = remMetaRaw ? resolveMetaRefs(remMetaRaw) : undefined;
    const remSchemaViolations = remMeta ? validateMemory(remMeta, { type: memType, properties: props }) : [];
    if (remSchemaViolations.length > 0 && remMeta?.validationMode === 'strict') {
      return { content: [{ type: 'text' as const, text: `Error: schema_violation\n${JSON.stringify(remSchemaViolations)}` }], isError: true };
    }

    // Quota check — throws QuotaError (caught below) on hard limit
    const remQuota = await checkQuota('brain');

    // Entity linkage is by ID. This used to accept names and silently store the memory UNLINKED
    // when a name did not resolve — a dropped edge in a graph store, invisible until a traversal
    // that should have found it came back empty. Now: wrong shape or unknown id, the write is
    // refused and the agent is told which value was bad.
    const entityIds: string[] = entityIdsArg;
    if (isStrictLinkage(ts)) {
      await assertRefsResolve(ts, 'entityIds', 'entity', entityIds);
    }
    // Names still go into the embedded text (they are what a search actually matches on), but they
    // are now derived FROM the ids rather than being the input.
    const resolvedNames = (await findEntitiesByIds(ts, entityIds)).map(e => e.name);
    // Insert-time duplicate check defaults ON for the interactive remember tool.
    const remDupeCheck = a['checkDuplicates'] !== false;
    const remContraCheck = a['checkContradictions'] === true;
    const remDupeThreshold = typeof a['dupeThreshold'] === 'number' ? a['dupeThreshold'] : undefined;
    const remTtlDays = ttlDaysFromArgs(a);
    const mem = await remember(ts, fact, entityIds, tags, description, props, resolvedNames, memType,
      { checkDuplicates: remDupeCheck, checkContradictions: remContraCheck, dupeThreshold: remDupeThreshold }, ctx.actor, remTtlDays);
    const warnings: string[] = [];
    if (mem.similar && mem.similar.length > 0) {
      warnings.push(`⚠️ Possible duplicate — ${mem.similar.length} existing memor${mem.similar.length === 1 ? 'y is' : 'ies are'} highly similar: ${mem.similar.map(s => `"${s.summary}" (ID ${s._id}, ${s.score.toFixed(2)})`).join('; ')}. This memory was still stored; pass checkDuplicates:false to skip this check, or update the existing one instead.`);
    }
    if (mem.contradicts && mem.contradicts.length > 0) {
      // Named field + both values: the agent should be able to see WHAT disagrees, not just that
      // something does — otherwise it cannot decide whether it is correcting or mistaken.
      const detail = mem.contradicts.map(c =>
        `"${c.summary}" (ID ${c.id}: ${c.fields.map(f => `${f.key} ${f.aValue} vs ${f.bValue}`).join(', ')})`).join('; ');
      warnings.push(`⚠️ Contradiction — ${mem.contradicts.length} existing memor${mem.contradicts.length === 1 ? 'y disagrees' : 'ies disagree'} with this one: ${detail}. This memory was still stored. If you are correcting an outdated fact, update or supersede the record above instead of leaving both.`);
    }
    // (An unresolved or ambiguous reference is now a hard error above, not a warning on a write
    // that already happened.)
    // Schema warnings (reuse violations from pre-write check)
    if (remMeta?.validationMode === 'warn') {
      for (const v of remSchemaViolations) warnings.push(`⚠️ Schema: ${v.field} — ${v.reason}`);
    }
    const remText = `Stored memory (seq ${mem.seq}, ID ${mem._id}).`
      + (remQuota.softBreached ? `\n⚠️ Storage warning: ${remQuota.warning}` : '')
      + (warnings.length > 0 ? `\n${warnings.join('\n')}` : '');
    return {
      content: [{ type: 'text' as const, text: remText }],
    };
  },
};

export const update_memoryTool: ToolHandler = {
  name: 'update_memory',
  description: 'Update an existing memory\'s fact, tags, entity links, description, or properties. Re-embeds automatically if any content field changes.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', description: 'Memory ID to update.' },
            fact: { type: 'string', description: 'New fact text (triggers re-embedding).' },
            tags: { type: 'array', items: { type: 'string' }, description: 'New tags (replaces existing).' },
            entityIds: { type: 'array', items: { type: 'string', pattern: UUID_V4_PATTERN }, description: 'New entity ID links (UUID v4, replaces existing). Every id must reference an existing entity.' },
            description: { type: 'string', description: 'New prose description or context.' },
            properties: {
              type: 'object',
              description: 'Key-value properties to merge (e.g. {"source": "manual"}). Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            deleteFields: { type: 'array', items: { type: 'string' }, description: 'Dot-notation paths to delete from the memory (e.g. ["properties.oldKey", "description"]). System fields (id, name, type, spaceId, createdAt, updatedAt) cannot be deleted. Deletions are permanent.' },
            ttlDays: TTL_DAYS_SCHEMA,
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

    // Validate deleteFields
    const dfResult = validateDeleteFields(a['deleteFields']);
    if (!dfResult.ok) throw new Error(dfResult.error);
    const dfPaths: string[] | undefined = Array.isArray(a['deleteFields']) && (a['deleteFields'] as string[]).length > 0 ? a['deleteFields'] as string[] : undefined;

    const updates: { fact?: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean> } = {};
    if (typeof a['fact'] === 'string') {
      if (!a['fact'].trim()) throw new Error('fact must not be empty');
      updates.fact = a['fact'] as string;
    }
    if (Array.isArray(a['tags'])) updates.tags = a['tags'] as string[];
    if (Array.isArray(a['entityIds'])) {
      const ids = a['entityIds'] as string[];
      // This path had NO validation at all — not even the strict gate the other tools carried — so
      // any string was written through as a link.
      // Validate against the resolved write target — for a proxy space that is the concrete member
      // the memory will be written to, so the entity must exist where the link will live.
      if (isStrictLinkage(wt.target)) await assertRefsResolve(wt.target, 'entityIds', 'entity', ids);
      updates.entityIds = ids;
    }
    if (typeof a['description'] === 'string') updates.description = a['description'] as string;
    if (a['properties'] !== null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      updates.properties = a['properties'] as Record<string, string | number | boolean>;
    }

    const ttlDays = ttlDaysFromArgs(a);
    if (Object.keys(updates).length === 0 && !dfPaths && ttlDays === undefined) throw new Error('At least one of fact, tags, entityIds, description, properties, deleteFields, or ttlDays must be provided');

    // Search member spaces sequentially — consistent with REST endpoint behaviour.
    const updated = await findFirstAcrossMembers(wt.target, mid => updateMemory(mid, id, updates, dfPaths, ctx.actor, ttlDays));
    if (!updated) throw new Error(`Memory '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Memory updated (ID ${updated._id}, seq ${updated.seq}).` }],
    };
  },
};

export const delete_memoryTool: ToolHandler = {
  name: 'delete_memory',
  description: 'Delete a memory by ID. Creates a tombstone for sync propagation.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', minLength: 1, description: 'Memory ID to delete.' },
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

    const deleted = await findFirstAcrossMembers(wt.target, mid => deleteMemory(mid, id, ctx.actor));
    if (!deleted) throw new Error(`Memory '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Memory deleted (ID ${id}).` }],
    };
  },
};
