/**
 * Memory CRUD routes (/api/brain/spaces/:spaceId/memories).
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { assertRefsResolve } from '../../brain/entity-refs.js';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit, bulkWipeRateLimit } from '../../rate-limit/middleware.js';
import { listMemories, deleteMemory, bulkDeleteMemories, remember, updateMemory } from '../../brain/memory.js';
import { validateDeleteFields, applyDeleteFields as applyDeleteFieldsPaths } from '../../brain/delete-fields.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { parseLimit, parseSkip, capPage } from '../../util/pagination.js';
import { parseSortParam, SORTABLE_FIELDS } from '../../brain/list-sort.js';
import { checkQuota, QuotaError } from '../../quota/quota.js';
import { resolveMemberSpaces, resolveWriteTarget, isProxySpace, isStrictLinkage, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import { validateMemory } from '../../spaces/schema-validation.js';
import type { MemoryDoc } from '../../config/types.js';
import { UUID_V4_RE, webhookToken, getSpaceMeta, applyValidation, buildMemoryFilter, ttlDaysFromBody, ttlDaysError, dupeCheckOptsFromBody } from './_shared.js';
import { classifyUpdateViolations } from '../../brain/write-validation.js';
import { resolveEntityIdsByName } from '../../brain/entities.js';
import { mergePropertiesOrKeep } from '../../brain/merge-fields.js';

export const memoriesRouter = Router();

// POST /api/brain/spaces/:spaceId/memories — create a memory
memoriesRouter.post('/spaces/:spaceId/memories', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  // Proxy space: resolve target space for write
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const targetSpace = wt.target;
  const { fact, tags = [], entityIds = [], description, properties, type: memoryType } = req.body ?? {};
  if (!fact || typeof fact !== 'string') {
    res.status(400).json({ error: '`fact` string required' });
    return;
  }
  if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string')) {
    res.status(400).json({ error: '`tags` must be an array of strings' });
    return;
  }
  if ((fact as string).length > 50_000) {
    res.status(400).json({ error: '`fact` must not exceed 50 000 characters' });
    return;
  }
  // Quota check — reject with 507 if brain hard limit exceeded
  let quotaResult;
  try {
    quotaResult = await checkQuota('brain');
  } catch (err) {
    if (err instanceof QuotaError) {
      res.status(507).json({ error: err.message, storageExceeded: true });
      return;
    }
    throw err;
  }
  const safeDesc: string | undefined = typeof description === 'string' ? description : undefined;
  const safeProps: Record<string, string | number | boolean> | undefined =
    properties != null && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, string | number | boolean>)
      : undefined;
  const safeEntityIds: string[] = Array.isArray(entityIds) ? entityIds : [];
  // Every id must be a UUID v4 AND name an entity that exists. Format alone was never enough: a
  // syntactically perfect id pointing at nothing stores exactly as silently as a name did, and the
  // dangling link only shows up later as a traversal that comes back empty.
  if (isStrictLinkage(wt.target)) {
    try {
      await assertRefsResolve(wt.target, 'entityIds', 'entity', safeEntityIds);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
  }
  const safeTags: string[] = Array.isArray(tags) ? tags : [];

  // Schema validation
  const safeMemoryType: string | undefined = typeof memoryType === 'string' ? memoryType : undefined;
  const meta = getSpaceMeta(wt.target);
  const violations = validateMemory(meta ?? {}, { type: safeMemoryType, properties: safeProps });
  const validation = applyValidation(meta, violations);
  if (validation.blocked) {
    res.status(400).json({ error: 'schema_violation', violations: validation.warnings });
    return;
  }

  // Persist through the shared remember() so REST and MCP produce identical records: the same
  // embed-text derivation (properties folded as `key value` via propsEmbedText, entity names
  // resolved consistently), the `matchedText` source string, the author, insert-time duplicate-
  // rule evaluation, and the memory.created webhook. Previously inlined here, which had drifted
  // into three bugs: values-only property embedding, no `matchedText`, and no dupe-rule firing.
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }

  // A caller-supplied id becomes the sync identity of a record that replicates across networks, so it is held
  // to the same shape the rest of the API uses. (The entity route accepts any string here — pre-existing, and
  // tightening it would be a breaking change, so it is filed rather than copied.)
  const rawId: unknown = req.body?.['id'];
  if (rawId !== undefined && (typeof rawId !== 'string' || !UUID_V4_RE.test(rawId))) {
    res.status(400).json({ error: '`id` must be a UUID v4 when supplied. Omit it to have one generated, or reuse the same value to make a retry idempotent.' });
    return;
  }
  const safeId: string | undefined = typeof rawId === 'string' ? rawId : undefined;

  // `waitForEmbedding` (default false): the vector is normally computed by the embedding queue moments
  // after this returns, so the write no longer pays the model latency. Pass true when the caller will
  // search for what it just wrote, or when a failure to embed should fail the write.
  const waitForEmbedding = req.body?.waitForEmbedding;
  if (waitForEmbedding !== undefined && typeof waitForEmbedding !== 'boolean') {
    res.status(400).json({ error: '`waitForEmbedding` must be a boolean' });
    return;
  }
  // The insert-time near-duplicate / contradiction check MCP's `remember` has always taken. `remember`
  // already merges `similar` and `contradicts` into what it returns, so the spread below reports them with
  // no further work — the only thing missing on this surface was reading the flags off the body.
  const dupe = dupeCheckOptsFromBody(req.body);
  if ('error' in dupe) { res.status(400).json({ error: dupe.error }); return; }
  const writeOpts = { ...dupe.opts, ...(waitForEmbedding === true ? { waitForEmbedding: true } : {}) };

  const doc = await remember(
    targetSpace, fact, safeEntityIds, safeTags, safeDesc, safeProps,
    undefined, safeMemoryType, Object.keys(writeOpts).length > 0 ? writeOpts : undefined,
    webhookToken(req), ttlDaysFromBody(req.body), safeId,
  );
  const body: Record<string, unknown> = { ...doc };
  if (quotaResult?.softBreached) body['storageWarning'] = true;
  if (validation.warnings.length > 0) body['warnings'] = validation.warnings;
  res.status(201).json(body);
});


// GET /api/brain/spaces/:spaceId/memories/:id — get single memory
memoriesRouter.get('/spaces/:spaceId/memories/:id', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const doc = await findFirstAcrossMembers(spaceId,
    mid => col<MemoryDoc>(`${mid}_memories`).findOne(asFilter<MemoryDoc>({ _id: id })));
  if (doc) { res.json(doc); return; }
  res.status(404).json({ error: 'Memory not found' });
});


// GET /api/brain/spaces/:spaceId/memories
memoriesRouter.get('/spaces/:spaceId/memories', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const limit = parseLimit(req.query['limit'], 100, 500);
  const skip = parseSkip(req.query['skip']);
  const sortParse = parseSortParam(req.query['sort'], req.query['dir'], SORTABLE_FIELDS.memories);
  if ('error' in sortParse) {
    res.status(400).json({ error: sortParse.error });
    return;
  }
  const filter = buildMemoryFilter(req.query as Record<string, unknown>);
  // The Entities column shows entity NAMES; records store ids. Resolved per member for the same reason
  // as edges: an id belongs to the member that owns it. An empty resolution filters to nothing, which is
  // correct — "no entity by that name" must not fall back to showing everything.
  const entityName = typeof req.query['entityName'] === 'string' ? req.query['entityName'] : undefined;
  const all = await collectAcrossMembers(spaceId, async mid => {
    const perMember: Record<string, unknown> = { ...filter };
    if (entityName) perMember['entityIds'] = { $in: await resolveEntityIdsByName(mid, entityName) };
    return listMemories(mid, perMember, limit, skip, sortParse.sort);
  });
  res.json({ memories: capPage(all, limit, sortParse.sort), limit, skip });
});


// DELETE /api/brain/spaces/:spaceId/memories/:id
memoriesRouter.delete('/spaces/:spaceId/memories/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const deleted = await findFirstAcrossMembers(spaceId, mid => deleteMemory(mid, id, webhookToken(req)));
  if (deleted) { res.status(204).end(); return; }
  res.status(404).json({ error: 'Memory not found' });
});


// PATCH /api/brain/spaces/:spaceId/memories/:id — partial update a memory (long-form)
memoriesRouter.patch('/spaces/:spaceId/memories/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const { fact, tags, entityIds, description, properties, deleteFields } = req.body ?? {};
  // Validate deleteFields
  const dfResult = validateDeleteFields(deleteFields);
  if (!dfResult.ok) { res.status(400).json({ error: dfResult.error }); return; }
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }
  const ttlDaysProvided = !!req.body && typeof req.body === 'object' && 'ttlDays' in req.body;
  const dfPaths: string[] | undefined = Array.isArray(deleteFields) && deleteFields.length > 0 ? deleteFields : undefined;
  const updates: { fact?: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean>; excludeFromVectorSearch?: boolean } = {};
  if (fact !== undefined) {
    if (typeof fact !== 'string' || !fact.trim()) { res.status(400).json({ error: '`fact` must be a non-empty string' }); return; }
    updates.fact = fact;
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string')) { res.status(400).json({ error: '`tags` must be an array of strings' }); return; }
    updates.tags = tags;
  }
  if (entityIds !== undefined) {
    if (!Array.isArray(entityIds) || entityIds.some((t: unknown) => typeof t !== 'string')) { res.status(400).json({ error: '`entityIds` must be an array of strings' }); return; }
    if (isStrictLinkage(wt.target)) {
      const invalidIds = entityIds.filter((id: string) => !UUID_V4_RE.test(id));
      if (invalidIds.length > 0) { res.status(400).json({ error: '`entityIds` must contain valid UUID v4 values (entity IDs), not names', invalid: invalidIds }); return; }
    }
    updates.entityIds = entityIds;
  }
  if (description !== undefined) {
    if (typeof description !== 'string') { res.status(400).json({ error: '`description` must be a string' }); return; }
    updates.description = description;
  }
  if (properties !== undefined) {
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) { res.status(400).json({ error: '`properties` must be a plain object' }); return; }
    updates.properties = properties as Record<string, string | number | boolean>;
  }
  // A boolean, and the ONLY field a caller may send on its own — retiring a record from vector search is a
  // complete edit in itself. It was wired into the update functions and into no PATCH handler, so it
  // shipped unreachable over REST; a caller sending it alone was told they had sent no fields at all.
  if (req.body?.excludeFromVectorSearch !== undefined) {
    if (typeof req.body.excludeFromVectorSearch !== 'boolean') {
      res.status(400).json({ error: '`excludeFromVectorSearch` must be a boolean' });
      return;
    }
    updates.excludeFromVectorSearch = req.body.excludeFromVectorSearch;
  }
  if (Object.keys(updates).length === 0 && !dfPaths && !ttlDaysProvided) { res.status(400).json({ error: 'At least one field must be provided' }); return; }
  const memberIds = resolveMemberSpaces(wt.target);
  for (const mid of memberIds) {
    // Validate the record AS IT WILL BE, on every patch — not only when `deleteFields` is present.
    //
    // That branch used to be the whole of update validation, so any other patch wrote values the same
    // space rejects at create time. Merging first is what makes the check meaningful: a required property
    // the patch does not mention is present in the record and absent from the patch, so validating the
    // fragment answers a question nobody asked.
    //
    // The read this needs is the same one the audit snapshot below needed, so it is done once and shared
    // rather than issued twice per patch.
    const existing = await listMemories(mid, { _id: id }, 1, 0);
    if (existing.length === 0) continue;
    {
      const mem = existing[0]!;
      const priorProps = mem.properties != null ? { ...mem.properties } : {};
      const resultProps = mergePropertiesOrKeep(mem.properties, updates.properties) ?? {};
      const sim: Record<string, unknown> = { properties: resultProps };
      if (dfPaths) applyDeleteFieldsPaths(sim, dfPaths);
      const simProps = (sim['properties'] ?? {}) as Record<string, unknown>;
      const meta = getSpaceMeta(mid);
      const check = classifyUpdateViolations(
        meta,
        validateMemory(meta ?? {}, { type: mem.type, properties: priorProps }),
        validateMemory(meta ?? {}, { type: mem.type, properties: simProps }),
      );
      if (check.blocked) {
        res.status(422).json({
          error: 'schema_violation',
          message: check.message,
          violations: check.all,
          introduced: check.introduced,
          preExisting: check.preExisting,
        });
        return;
      }
    }
    // Snapshot for the audit change list, taken from the read above. `audit-changes.ts` reads only the
    // allowlisted fields, so handing the whole record over cannot publish `properties` (deliberately
    // unlisted: its keys are user-chosen and could hold a pasted credential).
    const updated = await updateMemory(mid, id, updates, dfPaths, webhookToken(req), ttlDaysFromBody(req.body));
    if (updated) {
      req.auditSnapshots = { before: existing[0] ?? {}, after: updated };
      res.json(updated);
      return;
    }
  }
  res.status(404).json({ error: 'Memory not found' });
});


// DELETE /api/brain/spaces/:spaceId/memories — bulk wipe (long-form)
memoriesRouter.delete('/spaces/:spaceId/memories', bulkWipeRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  if (isProxySpace(spaceId)) {
    res.status(400).json({ error: 'Bulk wipe not supported on proxy spaces — target member spaces individually' });
    return;
  }
  if (req.body?.confirm !== true) {
    res.status(400).json({ error: '`confirm: true` required in request body' });
    return;
  }
  const deleted = await bulkDeleteMemories(spaceId);
  res.json({ deleted });
});
