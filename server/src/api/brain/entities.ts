/**
 * Entity CRUD, lookup-by-name/ids, and merge routes (/api/brain/spaces/:spaceId/entities).
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { escapeRegex } from '../../util/redos.js';
import { reportServerFailure } from '../../util/report-failure.js';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit, bulkWipeRateLimit } from '../../rate-limit/middleware.js';
import { listEntities, deleteEntity, upsertEntity, getEntityById, updateEntityById, bulkDeleteEntities } from '../../brain/entities.js';
import { entityDeleteBlockers } from '../../brain/entity-delete-guard.js';
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
import { UUID_V4_RE, webhookToken, getSpaceMeta, ttlDaysFromBody, ttlDaysError, dupeCheckOptsFromBody, ifMatchFromRequest, preconditionFailedBody } from './_shared.js';
import { SchemaViolationError, type UpdateValidation } from '../../brain/write-validation.js';
import { tagContains, textContains, propertiesValueContains } from '../../brain/tag-filter.js';
import { mergePropertiesOrKeep, mergeTagsOrKeep } from '../../brain/merge-fields.js';
import { parseRecordSuppression } from '../../brain/suppress-embeddings.js';
import { withoutListDiagnostics } from '../../brain/read-projection.js';
import { listDiagnosticsAsked } from './_shared.js';

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

  // Schema validation happens inside `upsertEntity` now, not here.
  //
  // It used to run in this route AND in the MCP tool AND in `bulk.ts` — one rule, three copies, and `bulk.ts`
  // enforced a different one, so the same upsert was refused through `/bulk` and accepted through here. The
  // writer is the door. This route keeps its response shape by catching `SchemaViolationError`, which carries
  // the whole classification rather than a message, and by taking the warnings through `onValidation` — so a
  // `warn` space still gets them in its 201 without a second lookup.
  let check: UpdateValidation | undefined;
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
      webhookToken(req), ttlDaysFromBody(req.body), c => { check = c; });
    const result: Record<string, unknown> = { ...entity };
    if (warning) result['warning'] = warning;
    if (check && check.warnings.length > 0) result['warnings'] = check.warnings;
    // Advisory, never blocking: the write already happened. An agent correcting an outdated fact must be
    // able to contradict the record it supersedes — the point is that it is TOLD, not that it is stopped.
    if (similar && similar.length > 0) result['similar'] = similar;
    if (contradicts && contradicts.length > 0) result['contradicts'] = contradicts;
    res.status(201).json(result);
  } catch (err) {
    // The refusal the writer now raises, translated to this route's existing 400 shape. Caught before the
    // generic handler so a schema violation never reads as an internal error.
    if (err instanceof SchemaViolationError) {
      res.status(400).json({ error: 'schema_violation', message: err.check.message, violations: err.check.all, introduced: err.check.introduced, preExisting: err.check.preExisting });
      return;
    }
    // The body stays flat and generic — `public-probes-leak-nothing.test.js` pins that, and a write route is
    // the last place to start echoing an exception back. The operator gets the cause; the caller gets a code.
    reportServerFailure('brain POST /spaces/:spaceId/entities', err);
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
  // A pagination name we do not have is a 400 naming the one we do — the fleet integrator paged with `offset`, which was accepted
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
  res.json({ entities: withoutListDiagnostics(page.rows, listDiagnosticsAsked(req)),
    limit, skip, total, truncated: skip + page.rows.length < total });
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
    /*
     * ONE guard for both doors, including the `strictLinkage` check and the face exemption.
     *
     * This route and the MCP tool each used to compute the blocking set and word the refusal themselves, and
     * they said different things: this one claimed "inbound references" while checking both ends of every
     * edge, and the tool threw prose with no structured rows in it at all. Now the sentence and the rows come
     * from `entityDeleteBlockers` and this door only decides the status code.
     *
     * `backlinks` carries every reference, face labels included, so a UI can warn "this will unlabel N
     * faces"; `blocking` is what refused it. Each edge row names the end that matched, which is the field the
     * reporter who found the wrong wording actually needed — it says which query clears it.
     */
    const block = await entityDeleteBlockers(mid, id);
    if (block) {
      res.status(409).json({ error: block.message, backlinks: block.blocking, references: block.backlinks });
      return;
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
    /*
     * The schema check moved into `updateEntityById`.
     *
     * This route used to SIMULATE the merge here — rebuild `resultProps`, re-apply `deleteFields` to a
     * throwaway object, and validate that — which is the merge logic written a second time, twenty lines from
     * the one that actually runs. Two implementations of "what will this record look like" is precisely the
     * defect that produced the memory-upsert bug, and the simulation is the copy that drifts, because nothing
     * fails when it stops matching.
     *
     * The 422 below is preserved deliberately: this route has always answered 422 where the POST answers 400,
     * and a status code is part of a caller's contract even when the pair looks inconsistent.
     */
    // Snapshot for the audit change list, from the read above — see the note in memories.ts.
    // `properties` is deliberately not allowlisted, so handing the record over cannot publish it.
    let updated;
    try {
      updated = await updateEntityById(mid, id, updates, dfPaths, webhookToken(req), ttlDaysFromBody(req.body), ifMatch.seq);
    } catch (err) {
      if (err instanceof SchemaViolationError) {
        res.status(422).json({
          error: 'schema_violation',
          message: err.check.message,
          violations: err.check.all,
          introduced: err.check.introduced,
          preExisting: err.check.preExisting,
        });
        return;
      }
      throw err;
    }
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
