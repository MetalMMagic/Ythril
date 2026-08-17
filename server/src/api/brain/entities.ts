/**
 * Entity CRUD, lookup-by-name/ids, and merge routes (/api/brain/spaces/:spaceId/entities).
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { escapeRegex } from '../../util/redos.js';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit, bulkWipeRateLimit } from '../../rate-limit/middleware.js';
import { listEntities, deleteEntity, upsertEntity, getEntityById, updateEntityById, bulkDeleteEntities, findEntityBacklinks } from '../../brain/entities.js';
import { computeMergePlan, applyResolutions, executeMerge, validateResolution, type PropertyResolution } from '../../brain/merge.js';
import { validateDeleteFields, applyDeleteFields as applyDeleteFieldsPaths } from '../../brain/delete-fields.js';
import { getConfig } from '../../config/loader.js';
import { parseLimit, parseSkip, unsupportedPageParam } from '../../util/pagination.js';
import { pageAcrossMembers } from '../../spaces/page-across-members.js';
import { countBrain, compareBySort, PROXY_PAGE_CEILING } from '../../brain/query.js';
import { parseSortParam, SORTABLE_FIELDS, toMongoSort } from '../../brain/list-sort.js';
import { textSearchOr, SEARCHABLE_FIELDS } from '../../brain/text-search.js';
import { resolveMemberSpaces, resolveWriteTarget, isProxySpace, isStrictLinkage, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import { memberSpacesForRequest } from '../../spaces/proxy-scoped.js';
import { validateEntity } from '../../spaces/schema-validation.js';
import { UUID_V4_RE, webhookToken, getSpaceMeta, ttlDaysFromBody, ttlDaysError, dupeCheckOptsFromBody, ifMatchFromRequest, preconditionFailedBody } from './_shared.js';
import { classifyEntityUpsert, classifyUpdateViolations } from '../../brain/write-validation.js';
import { tagContains, textContains, propertiesValueContains } from '../../brain/tag-filter.js';
import { mergePropertiesOrKeep, mergeTagsOrKeep } from '../../brain/merge-fields.js';
import { parseRecordSuppression } from '../../brain/suppress-embeddings.js';

export const entitiesRouter = Router();


// POST /api/brain/spaces/:spaceId/entities — create/upsert an entity
entitiesRouter.post('/spaces/:spaceId/entities', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const { id, name, type = '', tags = [], properties = {}, description } = req.body ?? {};
  if (id !== undefined) {
    if (typeof id !== 'string' || !UUID_V4_RE.test(id)) {
      res.status(400).json({ error: '`id` must be a valid UUID v4' });
      return;
    }
  }
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: '`name` string required' });
    return;
  }
  if (typeof type !== 'string') {
    res.status(400).json({ error: '`type` must be a string' });
    return;
  }
  if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string')) {
    res.status(400).json({ error: '`tags` must be an array of strings' });
    return;
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    res.status(400).json({ error: '`properties` must be a plain object' });
    return;
  }
  for (const [k, v] of Object.entries(properties)) {
    if (typeof k !== 'string' || (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')) {
      res.status(400).json({ error: '`properties` values must be string, number, or boolean' });
      return;
    }
  }
  const safeDesc: string | undefined = typeof description === 'string' ? description : undefined;
  const safeId: string | undefined = typeof id === 'string' ? id : undefined;

  // Schema validation of the record this upsert will PRODUCE. `upsertEntity` merges into the stored
  // record when `id` matches, so the payload on its own is not the thing being written.
  const check = await classifyEntityUpsert(wt.target, { name: name.trim(), type: type.trim(), properties, tags }, safeId);
  if (check.blocked) {
    res.status(400).json({ error: 'schema_violation', message: check.message, violations: check.all, introduced: check.introduced, preExisting: check.preExisting });
    return;
  }
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }

  try {
    // `waitForEmbedding` (default false): the vector is normally computed by the embedding queue moments
    // after this returns. Pass true when the caller will search for, scan, or compare what it just wrote —
    // a duplicate scan cannot pair records that have no vector yet.
    const waitForEmbedding = req.body?.waitForEmbedding;
    if (waitForEmbedding !== undefined && typeof waitForEmbedding !== 'boolean') {
      res.status(400).json({ error: '`waitForEmbedding` must be a boolean' });
      return;
    }
    // The insert-time near-duplicate / contradiction check, which MCP has always had and REST never
    // exposed. Same options object, same shared implementation — the only thing that was missing here was
    // reading the flags off the body and reporting what came back.
    const dupe = dupeCheckOptsFromBody(req.body);
    if ('error' in dupe) { res.status(400).json({ error: dupe.error }); return; }

    const writeOpts = { ...dupe.opts, ...(waitForEmbedding === true ? { waitForEmbedding: true } : {}) };
    const { entity, warning, similar, contradicts } = await upsertEntity(
      wt.target, name.trim(), type.trim(), tags, properties, safeDesc, safeId,
      Object.keys(writeOpts).length > 0 ? writeOpts : undefined,
      webhookToken(req), ttlDaysFromBody(req.body));
    const result: Record<string, unknown> = { ...entity };
    if (warning) result['warning'] = warning;
    if (check.warnings.length > 0) result['warnings'] = check.warnings;
    // Advisory, never blocking: the write already happened. An agent correcting an outdated fact must be
    // able to contradict the record it supersedes — the point is that it is TOLD, not that it is stopped.
    if (similar && similar.length > 0) result['similar'] = similar;
    if (contradicts && contradicts.length > 0) result['contradicts'] = contradicts;
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/brain/spaces/:spaceId/entities
entitiesRouter.get('/spaces/:spaceId/entities', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const limit = parseLimit(req.query['limit'], 50, 500);
  // A pagination name we do not have is a 400 naming the one we do — aigents paged with `offset`, which was accepted
  // and ignored, and summed 67 identical pages into a count 67x the truth.
  const badParam = unsupportedPageParam(req.query as Record<string, unknown>);
  if (badParam) { res.status(400).json(badParam); return; }
  const skip = parseSkip(req.query['skip']);
  const sortParse = parseSortParam(req.query['sort'], req.query['dir'], SORTABLE_FIELDS.entities);
  if ('error' in sortParse) {
    res.status(400).json({ error: sortParse.error });
    return;
  }
  const filter: Record<string, unknown> = {};
  if (typeof req.query['name'] === 'string') filter['name'] = req.query['name'];
  if (typeof req.query['type'] === 'string') filter['type'] = req.query['type'];
  if (typeof req.query['tag'] === 'string') filter['tags'] = tagContains(req.query['tag']);
  // Per-column description filter — narrows its own column, unlike `search` which also spans `name`.
  if (typeof req.query['description'] === 'string') filter['description'] = textContains(req.query['description']);
  if (typeof req.query['properties'] === 'string') Object.assign(filter, propertiesValueContains(req.query['properties']));
  const search = textSearchOr(req.query['search'] as string | undefined, SEARCHABLE_FIELDS.entities);
  if (search) Object.assign(filter, search);
  const members = memberSpacesForRequest(req, spaceId);
  const page = await pageAcrossMembers<Record<string, unknown>>({
    members, limit, skip, ceiling: PROXY_PAGE_CEILING,
    compare: compareBySort(sortParse.sort ? toMongoSort(sortParse.sort) : { createdAt: -1, _id: -1 }),
    readMember: async (mid, lim, sk) => await listEntities(mid, filter, lim, sk, sortParse.sort) as unknown as Record<string, unknown>[],
  });
  if (!page.ok) { res.status(400).json({ error: page.error }); return; }
  let total = 0;
  for (const mid of members) total += await countBrain(mid, 'entities', filter);
  res.json({ entities: page.rows, limit, skip, total, truncated: skip + page.rows.length < total });
});


// GET /api/brain/spaces/:spaceId/entities/by-ids?ids=id1,id2,... — batch fetch up to 100 entities by ID
entitiesRouter.get('/spaces/:spaceId/entities/by-ids', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const raw = req.query['ids'];
  if (typeof raw !== 'string' || !raw.trim()) {
    res.status(400).json({ error: '`ids` query parameter required (comma-separated)' });
    return;
  }
  const ids = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 100);
  if (!ids.length) { res.json({ entities: [] }); return; }
  const all = await collectAcrossMembers(spaceId, mid => listEntities(mid, { _id: { $in: ids } }, 100));
  res.json({ entities: all });
});


// GET /api/brain/spaces/:spaceId/entities/by-name?name=... — find entities by name (no type constraint)
entitiesRouter.get('/spaces/:spaceId/entities/by-name', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const name = req.query['name'];
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: '`name` query parameter required' });
    return;
  }
  // Case-insensitive substring search — escape user input to prevent ReDoS
  const escaped = escapeRegex(name.trim());
  const all = await collectAcrossMembers(spaceId, mid => listEntities(mid, { name: { $regex: escaped, $options: 'i' } }, 20));
  res.json({ entities: all });
});


// GET /api/brain/spaces/:spaceId/entities/:id
entitiesRouter.get('/spaces/:spaceId/entities/:id', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const doc = await findFirstAcrossMembers(spaceId, mid => getEntityById(mid, id));
  if (doc) { res.json(doc); return; }
  res.status(404).json({ error: 'Entity not found' });
});


// DELETE /api/brain/spaces/:spaceId/entities/:id
entitiesRouter.delete('/spaces/:spaceId/entities/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const memberIds = memberSpacesForRequest(req, spaceId);
  for (const mid of memberIds) {
    const entity = await getEntityById(mid, id);
    if (!entity) continue;
    // Check for inbound references before allowing deletion (only when strictLinkage is on).
    //
    // Face labels are deliberately NOT blocking, even though findEntityBacklinks now reports them.
    // strictLinkage exists to stop a delete that would leave a DANGLING reference behind — and a face
    // label can no longer dangle, because deleteEntity unlabels it in the same operation. Blocking on
    // them would be actively harmful: face labels are written by the recognition pipeline, not by a
    // person, so an admin would face a 409 they never created and could only clear by hand-unlabelling
    // every photo — turning "delete this person" into the one thing you cannot do for the subject whose
    // data is biometric. Reported (so the UI can warn "this will unlabel N faces"), never blocking.
    if (isStrictLinkage(mid)) {
      const backlinks = await findEntityBacklinks(mid, id);
      const blocking = backlinks.filter(b => b.type !== 'face');
      if (blocking.length > 0) {
        res.status(409).json({ error: 'Cannot delete: entity has inbound references', backlinks: blocking });
        return;
      }
    }
    if (await deleteEntity(mid, id, webhookToken(req))) {
      res.status(204).end();
      return;
    }
  }
  res.status(404).json({ error: 'Entity not found' });
});


// PATCH /api/brain/spaces/:spaceId/entities/:id — partial update an entity by ID
entitiesRouter.patch('/spaces/:spaceId/entities/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const ifMatch = ifMatchFromRequest(req);
  if (!ifMatch.ok) { res.status(400).json({ error: ifMatch.error }); return; }
  const { name, type, description, tags, properties, deleteFields } = req.body ?? {};
  // Validate deleteFields
  const dfResult = validateDeleteFields(deleteFields);
  if (!dfResult.ok) { res.status(400).json({ error: dfResult.error }); return; }
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }
  const ttlDaysProvided = !!req.body && typeof req.body === 'object' && 'ttlDays' in req.body;
  const dfPaths: string[] | undefined = Array.isArray(deleteFields) && deleteFields.length > 0 ? deleteFields : undefined;
  const updates: { name?: string; type?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; suppressEmbeddings?: boolean } = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) { res.status(400).json({ error: '`name` must be a non-empty string' }); return; }
    updates.name = name.trim();
  }
  if (type !== undefined) {
    if (typeof type !== 'string') { res.status(400).json({ error: '`type` must be a string' }); return; }
    updates.type = type.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string') { res.status(400).json({ error: '`description` must be a string' }); return; }
    updates.description = description;
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string')) { res.status(400).json({ error: '`tags` must be an array of strings' }); return; }
    updates.tags = tags;
  }
  if (properties !== undefined) {
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) { res.status(400).json({ error: '`properties` must be a plain object' }); return; }
    updates.properties = properties as Record<string, string | number | boolean>;
  }
  // A boolean, and the ONLY field a caller may send on its own — retiring a record from vector search is a
  // complete edit in itself. It was wired into the update functions and into no PATCH handler, so it
  // shipped unreachable over REST; a caller sending it alone was told they had sent no fields at all.
  const sup = parseRecordSuppression(req.body);
  if (!sup.ok) { res.status(400).json({ error: sup.error }); return; }
  if (sup.value !== undefined) updates.suppressEmbeddings = sup.value;
  if (Object.keys(updates).length === 0 && !dfPaths && !ttlDaysProvided) { res.status(400).json({ error: 'At least one field must be provided' }); return; }
  const memberIds = resolveMemberSpaces(wt.target);
  for (const mid of memberIds) {
    // Validate the entity AS IT WILL BE, on every patch — not only when `deleteFields` is present. That
    // branch used to be the whole of update validation, so a patch that set `type` outside the allowlist,
    // or a property outside its enum, wrote a value the same space rejects at create time. One read,
    // shared with the audit snapshot below.
    const existing = await getEntityById(mid, id);
    if (!existing) continue;
    {
      // Build the resulting entity state to validate against schema
      const resultName = updates.name ?? existing.name;
      const resultType = updates.type ?? existing.type;
      const resultTags = mergeTagsOrKeep(existing.tags, updates.tags);
      const resultProps = mergePropertiesOrKeep(existing.properties, updates.properties) ?? {};
      // Build a simulation and apply deleteFields for schema check
      const sim: Record<string, unknown> = { properties: resultProps, tags: resultTags, description: updates.description !== undefined ? updates.description : existing.description };
      if (dfPaths) applyDeleteFieldsPaths(sim, dfPaths);
      const simProps = (sim['properties'] ?? {}) as Record<string, unknown>;
      const meta = getSpaceMeta(mid);
      const check = classifyUpdateViolations(
        meta,
        validateEntity(meta ?? {}, { name: existing.name, type: existing.type, properties: existing.properties ?? {}, tags: existing.tags ?? [] }),
        validateEntity(meta ?? {}, { name: resultName, type: resultType, properties: simProps, tags: sim['tags'] as string[] }),
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
    // Snapshot for the audit change list, from the read above — see the note in memories.ts.
    // `properties` is deliberately not allowlisted, so handing the record over cannot publish it.
    const updated = await updateEntityById(mid, id, updates, dfPaths, webhookToken(req), ttlDaysFromBody(req.body), ifMatch.seq);
    if (updated) {
      req.auditSnapshots = { before: existing ?? {}, after: updated };
      res.json(updated);
      return;
    }
    // The record was there a moment ago and the write matched nothing, so the precondition is what
    // stopped it. Do NOT fall through to the next member space — that would retry the write the client
    // explicitly asked us not to make.
    if (ifMatch.seq !== undefined) {
      res.status(412).json(preconditionFailedBody('entity', (await getEntityById(mid, id))?.seq));
      return;
    }
  }
  res.status(404).json({ error: 'Entity not found' });
});


// POST /api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId — merge two entities
entitiesRouter.post('/spaces/:spaceId/entities/:survivorId/merge/:absorbedId', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const survivorId = req.params['survivorId'] as string;
  const absorbedId = req.params['absorbedId'] as string;

  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }

  if (!UUID_V4_RE.test(survivorId)) {
    res.status(400).json({ error: '`survivorId` must be a valid UUID v4' });
    return;
  }
  if (!UUID_V4_RE.test(absorbedId)) {
    res.status(400).json({ error: '`absorbedId` must be a valid UUID v4' });
    return;
  }
  if (survivorId === absorbedId) {
    res.status(400).json({ error: 'Cannot merge an entity with itself' });
    return;
  }

  if (isProxySpace(spaceId)) {
    res.status(400).json({ error: 'Entity merge not supported on proxy spaces — target member spaces directly' });
    return;
  }

  // Parse resolution map from body (optional)
  const resolutions: PropertyResolution[] = [];
  const bodyResolutions = req.body?.resolutions;
  if (bodyResolutions && Array.isArray(bodyResolutions)) {
    for (const r of bodyResolutions) {
      if (typeof r !== 'object' || !r || typeof r.key !== 'string' || typeof r.resolution !== 'string') {
        res.status(400).json({ error: 'Each resolution must be an object with `key` (string) and `resolution` (string)' });
        return;
      }
      resolutions.push({
        key: r.key,
        resolution: r.resolution,
        ...(r.customValue !== undefined ? { customValue: r.customValue } : {}),
      });
    }
  }

  // Compute merge plan
  const result = await computeMergePlan(spaceId, survivorId, absorbedId, resolutions);
  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  const { plan, fullyResolved, survivor, absorbed } = result;

  // Validate all provided resolutions
  for (const conflict of plan.propertyConflicts) {
    if (!conflict.resolved) continue;
    const err = validateResolution(conflict.resolution!, conflict.type, conflict.customValue !== undefined);
    if (err) {
      res.status(400).json({ error: `Invalid resolution for property '${conflict.key}': ${err}` });
      return;
    }
  }

  // If not fully resolved, return 409 with the plan
  if (!fullyResolved) {
    res.status(409).json(plan);
    return;
  }

  // All conflicts resolved — execute merge atomically
  const mergedProperties = applyResolutions(
    survivor.properties ?? {},
    absorbed.properties ?? {},
    plan.propertyConflicts,
    plan.absorbedOnlyProperties,
  );

  // Snapshot for the audit change list. A merge is a deletion wearing an edit's clothes: the entry
  // already carries the survivor's id and the path carries the absorbed one, but an id means nothing
  // once the record it pointed at is gone. The absorbed NAME is the only fact that becomes
  // unrecoverable, so it is recorded as name → null.
  req.auditSnapshots = {
    before: { absorbedName: absorbed.name },
    after: { absorbedName: null },
  };

  const mergeResult = await executeMerge(spaceId, survivor, absorbed, mergedProperties, webhookToken(req));
  const mergedEntity = mergeResult.entity;

  res.json({
    merged: { ...mergedEntity, embedding: undefined },
    absorbedId: absorbed._id,
    relinked: true,
    duplicateEdgeWarnings: plan.duplicateEdgeWarnings,
    deletedDuplicateEdgeIds: mergeResult.deletedDuplicateEdgeIds,
  });
});

entitiesRouter.delete('/spaces/:spaceId/entities', bulkWipeRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
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
  const deleted = await bulkDeleteEntities(spaceId);
  res.json({ deleted });
});
