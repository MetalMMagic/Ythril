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
import { deleteMemory, listMemories, remember, updateMemory } from '../../brain/memory.js';
import { applyDeleteFields as applyDeleteFieldsPaths } from '../../brain/delete-fields.js';
// The API layer's write gate, imported rather than reimplemented: `update_chrono` once shipped without
// the allowlist `create_chrono` enforced, and two copies of a validation rule is how that happens.
import { assertUpdateAllowed, classifyUpdateViolations, locateForUpdate } from '../../brain/write-validation.js';
import { getConfig } from '../../config/loader.js';
import { checkQuota } from '../../quota/quota.js';
import { resolveWriteTarget, findFirstAcrossMembers, isStrictLinkage } from '../../spaces/proxy.js';
import { resolveMetaRefs, validateMemory } from '../../spaces/schema-validation.js';
import { TTL_DAYS_SCHEMA, EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA, ttlDaysFromArgs, unitScoreSchema, uuidSchema } from './shared.js';
import { mergePropertiesOrKeep } from '../../brain/merge-fields.js';

export const rememberTool: ToolHandler = {
  name: 'remember',
  description: 'Store a fact in the knowledge graph. It is embedded for semantic search, so write it as a SENTENCE that carries its own context — a memory retrieved months later arrives without the conversation it was written in, and "he agreed to the change" is unusable on its own.\n\n'
    + 'WITHOUT `id` IT IS ALWAYS AN INSERT, and nothing deduplicates by content: remembering the same fact twice stores it twice, and both then compete for the same result slots in a recall. Search before writing if a fact may already be there, and use `update_memory` when you mean to revise one.\n\n'
    + 'WITH an `id` that already names a record it CONVERGES instead of duplicating — that is the retry-safety contract, and it is why a repeated call after a timeout is safe. Convergence MERGES, the same way `upsert_entity` does: tags are unioned and properties shallow-merged over what is stored, so a partial payload does not erase the rest. An id that names nothing is ignored rather than adopted; identity is server-generated.\n\n'
    + 'Embedding is ASYNCHRONOUS. The write returns as soon as the record is stored, and a queued job computes the vector — so a `recall` issued seconds later may not find what you just wrote. Pass `includeFreshWrites: true` on that recall to read straight from the collection instead of waiting.\n\n'
    + 'IF THE SPACE VALIDATES, a refusal names WHOSE FAULT it is: `introduced` are violations this write caused and are what refuses it; `preExisting` were already stored, are reported, and do NOT block. Branch on `introduced`.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            id: uuidSchema('UUID v4 of an EXISTING record to update. It is not a way to choose an id: identity is server-generated, so an id that names nothing is ignored rather than adopted. To carry your own reference, use `name` or `description`.'),
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
              description: 'Categorisation tags. They are part of what gets EMBEDDED, so a tag influences '
                + 'meaning-ranking as well as being a filter — and they are filterable exactly, by `query` on '
                + '`tags` and by `recall`\'s own `filter`. On the idempotent path (an `id` naming an entry '
                + 'that already exists) they are MERGED over the stored list rather than replacing it.',
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
            waitForEmbedding: { type: 'boolean', default: false, description: 'Block until this memory is embedded, so it is searchable the moment this returns (default false). Normally the vector is computed moments later by the embedding queue and the write does not pay the model latency. Set true when you will immediately search for what you just wrote, or when a failure to embed should fail the write rather than be repaired in the background. Note: checkDuplicates (default true) already requires the vector up front, so it implies this.' },
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
      // The violations travel as structured data rather than a JSON tail glued to the sentence: a
      // caller had to parse the message to act on them. The prose is unchanged for a client that
      // reads only the content blocks.
      return {
        content: [{ type: 'text' as const, text: 'Error: schema_violation' }],
        isError: true,
        structuredContent: { error: 'schema_violation', violations: remSchemaViolations },
      };
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
    // NOTE: `checkDuplicates` defaults to TRUE on this tool, and a duplicate check needs the vector
    // before the insert — so an MCP remember still embeds inline unless the caller passes
    // `checkDuplicates: false`. The queue's latency win therefore reaches REST today and MCP only on
    // request. Whether that default should flip is a product call, not one to make inside this change.
    const remDupeCheck = a['checkDuplicates'] !== false;
    const remContraCheck = a['checkContradictions'] === true;
    const remDupeThreshold = typeof a['dupeThreshold'] === 'number' ? a['dupeThreshold'] : undefined;
    const remTtlDays = ttlDaysFromArgs(a);
    const mem = await remember(ts, fact, entityIds, tags, description, props, resolvedNames, memType,
      {
        checkDuplicates: remDupeCheck, checkContradictions: remContraCheck, dupeThreshold: remDupeThreshold,
        ...(a['waitForEmbedding'] === true ? { waitForEmbedding: true } : {}),
      }, ctx.actor, remTtlDays,
      typeof a['id'] === 'string' ? a['id'] : undefined);
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
  description: 'Update one memory by its ID. Every field except `id` is optional; a field you omit is left '
    + 'exactly as it was. Changing content re-embeds the record automatically — you never queue that '
    + 'yourself.\n\n'
    + 'TAGS REPLACE HERE. THEY MERGE ON `update_entity` AND `update_edge`. Read that twice: it is one word of '
    + 'difference between three tools that otherwise take the same arguments. Sending `tags: ["b"]` on a memory '
    + 'tagged `["a"]` leaves it tagged `["b"]` — `"a"` is gone. The same call on an entity would leave it '
    + 'tagged `["a","b"]`. The difference is deliberate and pinned by a test rather than an accident waiting to '
    + 'be unified, so do not expect it to change: send the FULL tag list you want this memory to end up with. '
    + '`entityIds` replaces the same way.\n\n'
    + '`properties` MERGES, on this tool and on the other two. Keys you do not name are kept, so patching one '
    + 'key is safe. It used to replace, which silently destroyed every other property on the record; removing a '
    + 'key is `deleteFields`\' job, and an absence never means "delete".\n\n'
    + 'VALIDATION IS OF THE RESULT, and it refuses only what your edit BREAKS. The memory as it will be — your '
    + 'fields plus the stored ones — is checked against the space schema. A record that was ALREADY invalid '
    + 'before you touched it is reported and still saved, because refusing your edit would not fix a problem '
    + 'that is already stored, it would only stop you maintaining the record. Violations your change introduces '
    + 'are refused as before, in a `strict` space.\n\n'
    + 'PARAMETERS:\n'
    + '- `id` — the memory\'s `_id`, as `recall` and `query` report it. Required.\n'
    + '- `fact` — the memory\'s text, replaced when sent. Re-embeds. Must not be empty.\n'
    + '- `tags` — REPLACES the stored list. See above.\n'
    + '- `entityIds` — REPLACES the stored links. UUID v4 each, and in a space with strict linkage every one '
    + 'must resolve to an entity that exists in the member space this write lands in. Before 3.0 this path '
    + 'checked nothing and wrote any string through as a link.\n'
    + '- `description` — replaced when sent.\n'
    + '- `properties` — MERGED key by key. String, number or boolean values only.\n'
    + '- `deleteFields` — dot-notation paths to remove, permanently and with no undo. System fields are '
    + 'refused. This is the ONLY way to unset a property; applied AFTER the merge above.\n'
    + '- `excludeFromVectorSearch` — see its own description. In short: it removes the vector, so `recall` can '
    + 'no longer RANK this memory by meaning, but `query`, `list`, `get` and recall\'s `traverse` expansion all '
    + 'still reach it. Excluding a record does not hide it from the graph.\n'
    + '- `ttlDays` — this record\'s own expiry, the MOST specific of three tiers: it beats the type\'s '
    + 'retention window, which beats the space-wide one.\n'
    + '- `targetSpace` — required when `space` is a proxy: the member space holding the record.\n\n'
    + 'RESPONSE: one line with the memory\'s id and its new `seq` — the sync sequence number, which increments '
    + 'on every write and is how a peer knows this version is newer. An id that does not exist is an error, not '
    + 'a silent no-op.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: {
              type: 'string',
              description: 'The memory\'s `_id`, as `recall`, `query` and the list endpoints report it. '
                + 'Required. An id that names nothing is an ERROR, not a silent no-op — so a failed update '
                + 'is something you find out about rather than something you assume worked.',
            },
            fact: {
              type: 'string',
              description: 'Replaces the stored fact. Write it as a SENTENCE carrying its own context: it is '
                + 'what gets embedded, and a memory read back months later arrives without the conversation '
                + 'it was written in. A re-embed is queued after EVERY successful update, not only when this '
                + 'field changes, so there is nothing to trigger by hand.',
            },
            tags: {
              type: 'array', items: { type: 'string' },
              description: 'REPLACES the stored tag list — send the FULL list you want the memory to end up '
                + 'with, because sending one tag drops the rest. `update_entity` and `update_edge` MERGE tags '
                + 'instead; this tool and `update_chrono` replace, and the split is not guessable from the '
                + 'field name. To clear them, send `deleteFields: ["tags"]`.',
            },
            entityIds: { type: 'array', items: { type: 'string', pattern: UUID_V4_PATTERN }, description: 'New entity ID links (UUID v4, replaces existing). Every id must reference an existing entity.' },
            description: {
              type: 'string',
              description: 'Replaces the stored prose context. Embedded alongside the fact, so it widens what '
                + 'a `recall` can match this memory on. An omitted field is left alone, so there is no value '
                + 'that clears it — use `deleteFields: ["description"]`.',
            },
            properties: {
              type: 'object',
              description: 'Key-value properties to merge into the stored map (e.g. {"source": "manual"}) — keys you do not name are kept. Use deleteFields to remove one. Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            excludeFromVectorSearch: EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA,
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

    const updates: { fact?: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean>; excludeFromVectorSearch?: boolean } = {};
    if (typeof a['excludeFromVectorSearch'] === 'boolean') updates.excludeFromVectorSearch = a['excludeFromVectorSearch'];
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
    if (Object.keys(updates).length === 0 && !dfPaths && ttlDays === undefined) throw new Error('At least one of fact, tags, entityIds, description, properties, excludeFromVectorSearch, deleteFields, or ttlDays must be provided');

    // Validate the memory AS IT WILL BE, against the meta of the member space it actually lives in.
    // This path had no schema validation at all, so an agent could write through MCP a value the same
    // space refuses at `remember` time — and, since #571, one the REST route refuses too.
    const found = await locateForUpdate(wt.target, async mid => (await listMemories(mid, { _id: id }, 1, 0))[0]);
    if (found) {
      const priorProps = (found.record.properties ?? {}) as Record<string, unknown>;
      const sim: Record<string, unknown> = { properties: mergePropertiesOrKeep(found.record.properties, updates.properties) ?? {} };
      if (dfPaths) applyDeleteFieldsPaths(sim, dfPaths);
      assertUpdateAllowed(classifyUpdateViolations(
        found.meta,
        validateMemory(found.meta ?? {}, { type: found.record.type, properties: priorProps }),
        validateMemory(found.meta ?? {}, { type: found.record.type, properties: (sim['properties'] ?? {}) as Record<string, unknown> }),
      ));
    }

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
  description: 'Delete one memory by its ID. IRREVERSIBLE — there is no undelete and no trash.\n\n'
    + 'IF YOU WANT IT OUT OF SEARCH RATHER THAN GONE, this is the wrong tool. Set '
    + '`excludeFromVectorSearch` with `update_memory` instead: the record stays readable, listable and '
    + 'traversable, and only stops being ranked by meaning. Deleting is for records that should not exist.\n\n'
    + 'IT IS NEVER REFUSED FOR BEING REFERENCED, and that differs from `delete_entity`. A chrono entry '
    + 'listing this memory in `memoryIds` keeps the id after the memory is gone, and nothing reports it — '
    + 'strict linkage guards ENTITY deletion only. Check `query` for referrers first if a dangling id would '
    + 'matter to you.\n\n'
    + 'A TOMBSTONE IS WRITTEN, so the deletion propagates to peer instances on the next sync and the record '
    + 'is not quietly resurrected from a peer that still has it. That is also why this cannot be undone by '
    + 'writing the record back with the same id — the tombstone outranks it.\n\n'
    + 'PARAMETERS:\n'
    + '- `id` — the memory\'s `_id`. Required. An id that does not exist is an ERROR, not a silent success, '
    + 'so a successful reply means a record really was deleted.\n'
    + '- `targetSpace` — required when `space` is a proxy: the member space holding the memory. Without it '
    + 'the call is refused rather than guessing which member you meant.\n\n'
    + 'RESPONSE: one line confirming the id that was deleted.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: {
              type: 'string', minLength: 1,
              description: 'The memory\'s `_id`, as `recall` and `query` report it. An id that does not exist '
                + 'is an ERROR, not a silent success, so a successful reply means a record really was '
                + 'deleted. A tombstone is written under this id, which is why re-creating the record with '
                + 'it does not undo the delete.',
            },
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
