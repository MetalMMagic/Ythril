import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE, TTL_DAYS_SCHEMA, ttlDaysFromArgs, unitScoreSchema } from './shared.js';
import { ChronoFilter, createChrono, getChronoById, listChrono, updateChrono, parseRecurrence } from '../../brain/chrono.js';
// The API layer's write gate, imported rather than reimplemented — see the note in memory.ts.
import { assertUpdateAllowed, classifyUpdateViolations, locateForUpdate } from '../../brain/write-validation.js';
import { getConfig } from '../../config/loader.js';
import { checkQuota } from '../../quota/quota.js';
import { isStrictLinkage, resolveMemberSpaces, resolveWriteTarget } from '../../spaces/proxy.js';
import { getAllowedChronoTypes, resolveMetaRefs, validateChrono } from '../../spaces/schema-validation.js';

export const create_chronoTool: ToolHandler = {
  name: 'create_chrono',
  description: 'Create a chronological entry in the knowledge graph. The default types are event, deadline, plan, prediction, and milestone; spaces with a custom typeSchemas.chrono accept their own type names instead.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', description: 'Optional UUID v4. Supply one to make this call IDEMPOTENT: retrying with the same id converges on the same entry instead of creating a second one. Generate it before your first attempt and reuse it on every retry. Omit it and each call creates a new entry.' },
            title: { type: 'string', minLength: 1, description: 'Entry title.' },
            type: { type: 'string', minLength: 1, description: 'Entry type. Rejected unless it is one of the space\'s allowed chrono types: the defaults are event, deadline, plan, prediction, milestone, or the custom set declared in the space\'s typeSchemas.chrono.' },
            startsAt: { type: 'string', minLength: 1, description: 'ISO 8601 start date/time.' },
            endsAt: { type: 'string', description: 'Optional ISO 8601 end date/time.' },
            status: { type: 'string', enum: ['upcoming', 'active', 'completed', 'overdue', 'cancelled'], default: 'upcoming', description: 'Status (default: upcoming).' },
            confidence: unitScoreSchema('Confidence level 0–1 (for predictions).'),
            tags: { type: 'array', items: { type: 'string' }, description: 'Categorisation tags.' },
            entityIds: { type: 'array', items: { type: 'string' }, description: 'Related entity IDs.' },
            memoryIds: { type: 'array', items: { type: 'string' }, description: 'Related memory IDs.' },
            description: { type: 'string', description: 'Optional longer description.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata for this entry.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            recurrence: {
              type: 'object',
              description: 'Optional recurrence rule, e.g. { freq: "weekly", interval: 1, until: "2027-01-01T00:00:00Z" }.',
              properties: {
                freq: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
                interval: { type: 'integer', minimum: 1, default: 1, description: 'Repeat every N periods (positive integer, default 1).' },
                until: { type: 'string', description: 'Optional ISO 8601 end date.' },
              },
              required: ['freq'],
              additionalProperties: false,
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            checkDuplicates: { type: 'boolean', default: true, description: 'Run a semantic near-duplicate check before storing (default true). When a highly similar entry already exists, the response flags it (id + summary + score) so you can update it instead of logging the same event twice. The entry is still stored regardless. Set false to skip.' },
            checkContradictions: { type: 'boolean', default: false, description: 'Also flag existing entries that CONTRADICT this one — a near-neighbour claiming a different status, or setting the same single-valued property to a different value. Deterministic only (no model call). The entry is still stored regardless.' },
            dupeThreshold: unitScoreSchema('Cosine-similarity threshold for the duplicate check (0-1, default ~0.92). Lower to flag looser matches.'),
            ttlDays: TTL_DAYS_SCHEMA,
          },
          required: ['space', 'title', 'type', 'startsAt'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const title = String(a['title'] ?? '').trim();
    const chronoType = String(a['type'] ?? '') as import('../../config/types.js').ChronoType;
    const startsAt = String(a['startsAt'] ?? '');
    if (!title) throw new Error('title must not be empty');
    if (!startsAt) throw new Error('startsAt must not be empty');

    const chronoProps = (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties']))
      ? (a['properties'] as Record<string, string | number | boolean>)
      : undefined;

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    // Schema validation (single pass)
    // Validate type against the space-specific allowlist (custom or default built-ins).
    const { meta: chronoMeta, allowed: allowedChronoTypes } = chronoTypeGate(wt.target);
    if (!allowedChronoTypes.has(chronoType)) {
      throw new Error(`type must be one of: ${[...allowedChronoTypes].join(', ')}`);
    }

    const chronoSchemaViolations = chronoMeta ? validateChrono(chronoMeta, { type: chronoType, properties: chronoProps }) : [];
    if (chronoSchemaViolations.length > 0 && chronoMeta?.validationMode === 'strict') {
      // The violations travel as structured data rather than a JSON tail glued to the sentence: a
      // caller had to parse the message to act on them. The prose is unchanged for a client that
      // reads only the content blocks.
      return {
        content: [{ type: 'text' as const, text: 'Error: schema_violation' }],
        isError: true,
        structuredContent: { error: 'schema_violation', violations: chronoSchemaViolations },
      };
    }

    const remQuota = await checkQuota('brain');

    // Validate entityIds and memoryIds are UUIDs (when strictLinkage is on)
    const chronoEntityIds = Array.isArray(a['entityIds']) ? (a['entityIds'] as string[]) : undefined;
    const chronoMemoryIds = Array.isArray(a['memoryIds']) ? (a['memoryIds'] as string[]) : undefined;
    if (isStrictLinkage(wt.target)) {
      if (chronoEntityIds) {
        const invalidEIds = chronoEntityIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidEIds.length > 0) throw new Error(`entityIds must contain valid UUID v4 values (entity IDs), not names: ${invalidEIds.join(', ')}`);
      }
      if (chronoMemoryIds) {
        const invalidMIds = chronoMemoryIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidMIds.length > 0) throw new Error(`memoryIds must contain valid UUID v4 values (memory IDs), not names: ${invalidMIds.join(', ')}`);
      }
    }

    const rec = parseRecurrence(a['recurrence']);
    if (!rec.ok) throw new Error(rec.error);

    const entry = await createChrono(wt.target, {
      id: typeof a['id'] === 'string' ? a['id'] : undefined,
      title,
      type: chronoType,
      startsAt,
      description: typeof a['description'] === 'string' ? a['description'] : undefined,
      endsAt: typeof a['endsAt'] === 'string' ? a['endsAt'] : undefined,
      status: typeof a['status'] === 'string' ? a['status'] as import('../../config/types.js').ChronoStatus : undefined,
      confidence: typeof a['confidence'] === 'number' ? a['confidence'] : undefined,
      tags: Array.isArray(a['tags']) ? (a['tags'] as string[]) : undefined,
      entityIds: chronoEntityIds,
      memoryIds: chronoMemoryIds,
      properties: chronoProps,
      ...(rec.value ? { recurrence: rec.value } : {}),
    }, ctx.actor, ttlDaysFromArgs(a), {
      // Duplicate check defaults ON for the interactive create tool, as it does for remember/upsert_entity.
      checkDuplicates: a['checkDuplicates'] !== false,
      checkContradictions: a['checkContradictions'] === true,
      dupeThreshold: typeof a['dupeThreshold'] === 'number' ? a['dupeThreshold'] : undefined,
    });
    let text = `Chrono entry '${entry.title}' (${entry.type}) created (ID ${entry._id}, seq ${entry.seq}).`
      + (remQuota.softBreached ? `\n⚠️ Storage warning: ${remQuota.warning}` : '');
    if (entry.similar && entry.similar.length > 0) {
      text += `\n⚠️ Possible duplicate — ${entry.similar.length} existing entr${entry.similar.length === 1 ? 'y is' : 'ies are'} highly similar: ${entry.similar.map(s => `"${s.summary}" (ID ${s._id}, ${s.score.toFixed(2)})`).join('; ')}. This entry was still stored; pass checkDuplicates:false to skip this check, or update the existing one instead.`;
    }
    if (entry.contradicts && entry.contradicts.length > 0) {
      // Named field + both values: the agent should be able to see WHAT disagrees, not just that
      // something does — otherwise it cannot decide whether it is correcting or mistaken.
      const detail = entry.contradicts.map(c =>
        `"${c.summary}" (ID ${c.id}: ${c.fields.map(f => `${f.key} ${f.aValue} vs ${f.bValue}`).join(', ')})`).join('; ');
      text += `\n⚠️ Contradiction — ${entry.contradicts.length} existing entr${entry.contradicts.length === 1 ? 'y disagrees' : 'ies disagree'} with this one: ${detail}. This entry was still stored. If you are correcting an outdated entry, update or supersede the record above instead of leaving both.`;
    }
    if (chronoMeta?.validationMode === 'warn') {
      for (const v of chronoSchemaViolations) text += `\n⚠️ Schema: ${v.field} — ${v.reason}`;
    }
    return { content: [{ type: 'text' as const, text }] };
  },
};

/**
 * The space's resolved meta, and the chrono types it allows.
 *
 * Extracted because create and update MUST agree: `update_chrono` shipped without the allowlist check
 * `create_chrono` has, so a record could be moved to a disallowed type through the door that did not
 * check. One helper, called by both, is what stops that recurring — two copies of a validation rule is
 * how they diverged in the first place.
 */
function chronoTypeGate(spaceId: string): { meta: ReturnType<typeof resolveMetaRefs> | undefined; allowed: Set<string> } {
  const raw = getConfig().spaces.find(s => s.id === spaceId)?.meta;
  const meta = raw ? resolveMetaRefs(raw) : undefined;
  return { meta, allowed: getAllowedChronoTypes(meta) };
}

export const update_chronoTool: ToolHandler = {
  name: 'update_chrono',
  description: 'Update an existing chronological entry.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', minLength: 1, description: 'Chrono entry ID.' },
            title: { type: 'string', description: 'New title.' },
            type: { type: 'string', description: 'Entry type (e.g. event, deadline, plan, prediction, milestone, or a custom type defined in the space schema).' },
            startsAt: { type: 'string', description: 'New ISO 8601 start date/time.' },
            endsAt: { type: 'string', description: 'New ISO 8601 end date/time.' },
            status: { type: 'string', enum: ['upcoming', 'active', 'completed', 'overdue', 'cancelled'] },
            confidence: unitScoreSchema('Confidence level 0–1.'),
            tags: { type: 'array', items: { type: 'string' } },
            entityIds: { type: 'array', items: { type: 'string' } },
            memoryIds: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata for this entry.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            recurrence: {
              type: 'object',
              description: 'Recurrence rule, e.g. { freq: "weekly", interval: 1, until: "2027-01-01T00:00:00Z" }.',
              properties: {
                freq: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
                interval: { type: 'integer', minimum: 1, default: 1, description: 'Repeat every N periods (positive integer, default 1).' },
                until: { type: 'string', description: 'Optional ISO 8601 end date.' },
              },
              required: ['freq'],
              additionalProperties: false,
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
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

    const updates: Record<string, unknown> = {};
    if (typeof a['title'] === 'string') updates['title'] = a['title'];
    if (typeof a['type'] === 'string') {
      // Same allowlist check `create_chrono` runs, and the same one the REST PATCH already runs.
      // Without it this was the ONE surface of four that let a record be moved to a type the space
      // does not allow — and an asymmetry between two write paths is worse than either rule alone,
      // because the constraint looks enforced right up until someone uses the other door.
      const { allowed } = chronoTypeGate(wt.target);
      if (!allowed.has(a['type'] as string)) {
        throw new Error(`type must be one of: ${[...allowed].join(', ')}`);
      }
      updates['type'] = a['type'];
    }
    if (typeof a['startsAt'] === 'string') updates['startsAt'] = a['startsAt'];
    if (typeof a['endsAt'] === 'string') updates['endsAt'] = a['endsAt'];
    if (typeof a['status'] === 'string') updates['status'] = a['status'];
    if (typeof a['confidence'] === 'number') updates['confidence'] = a['confidence'];
    if (typeof a['description'] === 'string') updates['description'] = a['description'];
    if (Array.isArray(a['tags'])) updates['tags'] = a['tags'];
    if (Array.isArray(a['entityIds'])) {
      const eIds = a['entityIds'] as string[];
      if (isStrictLinkage(wt.target)) {
        const invalidEIds = eIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidEIds.length > 0) throw new Error(`entityIds must contain valid UUID v4 values (entity IDs), not names: ${invalidEIds.join(', ')}`);
      }
      updates['entityIds'] = eIds;
    }
    if (Array.isArray(a['memoryIds'])) {
      const mIds = a['memoryIds'] as string[];
      if (isStrictLinkage(wt.target)) {
        const invalidMIds = mIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidMIds.length > 0) throw new Error(`memoryIds must contain valid UUID v4 values (memory IDs), not names: ${invalidMIds.join(', ')}`);
      }
      updates['memoryIds'] = mIds;
    }
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      updates['properties'] = a['properties'];
    }
    if (a['recurrence'] !== undefined) {
      const rec = parseRecurrence(a['recurrence']);
      if (!rec.ok) throw new Error(rec.error);
      updates['recurrence'] = rec.value;
    }

    // Validate the entry AS IT WILL BE, against the meta of the member space it actually lives in. The
    // type allowlist above is not the whole schema: property constraints applied at `create_chrono` and
    // nowhere on this path, so an agent could write a value the same space refuses on creation.
    const found = await locateForUpdate(wt.target, mid => getChronoById(mid, id));
    if (found) {
      const prior = found.record;
      const priorProps = (prior.properties ?? {}) as Record<string, unknown>;
      assertUpdateAllowed(classifyUpdateViolations(
        found.meta,
        validateChrono(found.meta ?? {}, { type: prior.type, properties: priorProps }),
        validateChrono(found.meta ?? {}, {
          type: (updates['type'] as string | undefined) ?? prior.type,
          properties: (updates['properties'] as Record<string, unknown> | undefined) ?? priorProps,
        }),
      ));
    }

    const entry = await updateChrono(wt.target, id, updates as Parameters<typeof updateChrono>[2], ctx.actor, ttlDaysFromArgs(a));
    if (!entry) throw new Error(`Chrono entry '${id}' not found`);
    return { content: [{ type: 'text' as const, text: `Chrono entry '${entry.title}' updated (seq ${entry.seq}).` }] };
  },
};

export const list_chronoTool: ToolHandler = {
  name: 'list_chrono',
  description: 'List chronological entries, optionally filtered by status, type, tags, date range, or a text search. Omit space to list across all accessible spaces.',
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.optionalSpace,
            status: { type: 'string', enum: ['upcoming', 'active', 'completed', 'overdue', 'cancelled'], description: 'Filter by status.' },
            type: { type: 'string', description: 'Filter by type (e.g. event, deadline, plan, prediction, milestone, or a custom type).' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Return entries containing ALL of these tags (AND semantics).' },
            tagsAny: { type: 'array', items: { type: 'string' }, description: 'Return entries containing ANY of these tags (OR semantics).' },
            after: { type: 'string', description: 'ISO 8601 timestamp — return entries created after this point in time.' },
            before: { type: 'string', description: 'ISO 8601 timestamp — return entries created before this point in time.' },
            search: { type: 'string', description: 'Case-insensitive substring match on title and description.' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Max results (clamped to 1–100). Default 20.' },
            skip: { type: 'number', minimum: 0, default: 0, description: 'Number of results to skip for pagination (default 0).' },
          },
          required: [],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, accessibleSpaceIds } = ctx;
    const filter: ChronoFilter = {};
    if (typeof a['status'] === 'string') filter.status = a['status'];
    if (typeof a['type'] === 'string') filter.type = a['type'];
    if (Array.isArray(a['tags']) && (a['tags'] as unknown[]).length > 0) {
      filter.tags = a['tags'] as string[];
    }
    if (Array.isArray(a['tagsAny']) && (a['tagsAny'] as unknown[]).length > 0) {
      filter.tagsAny = a['tagsAny'] as string[];
    }
    if (typeof a['after'] === 'string') filter.after = a['after'];
    if (typeof a['before'] === 'string') filter.before = a['before'];
    if (typeof a['search'] === 'string') filter.search = a['search'];
    const limit = typeof a['limit'] === 'number' ? Math.min(a['limit'], 100) : 20;
    const skip = typeof a['skip'] === 'number' ? Math.max(a['skip'], 0) : 0;

    const memberIds = callSpace ? resolveMemberSpaces(callSpace) : accessibleSpaceIds;
    // Fetch skip+limit from each member so the combined list has enough entries
    // after global sort/slice. For large skip values this over-fetches slightly,
    // but chrono lists are expected to be small in practice.
    const all = (await Promise.all(memberIds.map(mid => listChrono(mid, filter, skip + limit)))).flat();
    all.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    const results = all.slice(skip, skip + limit);
    return {
      content: [{
        type: 'text' as const,
        text: results.length === 0
          ? 'No chrono entries found.'
          : results.map((e, i) => `[${i + 1}] ${e.type} | ${e.status} | ${e.startsAt} | ${e.title} (ID ${e._id})`).join('\n'),
      }],
    };
  },
};
