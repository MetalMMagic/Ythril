/**
 * Chrono entry CRUD routes (/api/brain/spaces/:spaceId/chrono).
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit, bulkWipeRateLimit } from '../../rate-limit/middleware.js';
import { createChrono, updateChrono, getChronoById, listChrono, deleteChrono, bulkDeleteChrono, parseRecurrence, ChronoFilter } from '../../brain/chrono.js';
import { getConfig } from '../../config/loader.js';
import { parseLimit, parseSkip, capPage } from '../../util/pagination.js';
import { parseSortParam, SORTABLE_FIELDS } from '../../brain/list-sort.js';
import { resolveWriteTarget, isProxySpace, isStrictLinkage, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import { validateChrono, getAllowedChronoTypes } from '../../spaces/schema-validation.js';
import type { ChronoStatus } from '../../config/types.js';
import { UUID_V4_RE, webhookToken, getSpaceMeta, applyValidation, ttlDaysFromBody, ttlDaysError } from './_shared.js';
import { classifyUpdateViolations } from '../../brain/write-validation.js';
import { resolveEntityIdsByName } from '../../brain/entities.js';

export const chronoRouter = Router();


// ── Chrono CRUD ───────────────────────────────────────────────────────────────

const CHRONO_STATUSES = new Set<ChronoStatus>(['upcoming', 'active', 'completed', 'overdue', 'cancelled']);

// POST /api/brain/spaces/:spaceId/chrono — create a chrono entry
chronoRouter.post('/spaces/:spaceId/chrono', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }

  const { title, type, startsAt, endsAt, status, confidence, tags, entityIds, memoryIds, description, properties, recurrence } = req.body ?? {};
  // `recurrence` was previously persisted straight from the request body with NO shape
  // check — unlike every sibling field — so an arbitrary object could be stored and later
  // read as a recurrence rule. Shared with MCP so both surfaces enforce the same shape.
  const recCheck = parseRecurrence(recurrence);
  if (!recCheck.ok) { res.status(400).json({ error: recCheck.error }); return; }
  const safeRecurrence = recCheck.value;
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: '`title` string required' }); return;
  }
  const meta = getSpaceMeta(wt.target);
  const allowedChronoTypes = getAllowedChronoTypes(meta);
  if (!type || !allowedChronoTypes.has(type)) {
    res.status(400).json({ error: `\`type\` must be one of: ${[...allowedChronoTypes].join(', ')}` }); return;
  }
  if (!startsAt || typeof startsAt !== 'string') {
    res.status(400).json({ error: '`startsAt` ISO8601 string required' }); return;
  }
  if (endsAt !== undefined && typeof endsAt !== 'string') {
    res.status(400).json({ error: '`endsAt` must be an ISO8601 string' }); return;
  }
  if (status !== undefined && !CHRONO_STATUSES.has(status)) {
    res.status(400).json({ error: '`status` must be one of: upcoming, active, completed, overdue, cancelled' }); return;
  }
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
    res.status(400).json({ error: '`confidence` must be a number between 0 and 1' }); return;
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string'))) {
    res.status(400).json({ error: '`tags` must be an array of strings' }); return;
  }
  if (entityIds !== undefined && (!Array.isArray(entityIds) || entityIds.some((t: unknown) => typeof t !== 'string'))) {
    res.status(400).json({ error: '`entityIds` must be an array of strings' }); return;
  }
  if (entityIds !== undefined) {
    if (isStrictLinkage(wt.target)) {
      const invalidEIds = (entityIds as string[]).filter((id: string) => !UUID_V4_RE.test(id));
      if (invalidEIds.length > 0) { res.status(400).json({ error: '`entityIds` must contain valid UUID v4 values (entity IDs), not names', invalid: invalidEIds }); return; }
    }
  }
  if (memoryIds !== undefined && (!Array.isArray(memoryIds) || memoryIds.some((t: unknown) => typeof t !== 'string'))) {
    res.status(400).json({ error: '`memoryIds` must be an array of strings' }); return;
  }
  if (memoryIds !== undefined) {
    if (isStrictLinkage(wt.target)) {
      const invalidMIds = (memoryIds as string[]).filter((id: string) => !UUID_V4_RE.test(id));
      if (invalidMIds.length > 0) { res.status(400).json({ error: '`memoryIds` must contain valid UUID v4 values (memory IDs), not names', invalid: invalidMIds }); return; }
    }
  }
  if (description !== undefined && typeof description !== 'string') {
    res.status(400).json({ error: '`description` must be a string' }); return;
  }
  if (properties !== undefined && (typeof properties !== 'object' || properties === null || Array.isArray(properties))) {
    res.status(400).json({ error: '`properties` must be a plain object' }); return;
  }
  const safeProps: Record<string, string | number | boolean> | undefined =
    properties != null && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, string | number | boolean>)
      : undefined;

  // Schema validation (meta already resolved above)
  const violations = validateChrono(meta ?? {}, { type, properties: safeProps });
  const validation = applyValidation(meta, violations);
  if (validation.blocked) {
    res.status(400).json({ error: 'schema_violation', violations: validation.warnings });
    return;
  }

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

  const entry = await createChrono(wt.target, {
    title: title.trim(), type, startsAt, endsAt, status, confidence,
    tags, entityIds, memoryIds, description, properties: safeProps, recurrence: safeRecurrence,
    id: safeId,
  }, webhookToken(req), ttlDaysFromBody(req.body));
  const result: Record<string, unknown> = { ...entry };
  if (validation.warnings.length > 0) result['warnings'] = validation.warnings;
  res.status(201).json(result);
});


// POST /api/brain/spaces/:spaceId/chrono/:id — update a chrono entry
chronoRouter.post('/spaces/:spaceId/chrono/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }

  const { title, type, startsAt, endsAt, status, confidence, tags, entityIds, memoryIds, description, properties, recurrence } = req.body ?? {};
  // `recurrence` was previously persisted straight from the request body with NO shape
  // check — unlike every sibling field — so an arbitrary object could be stored and later
  // read as a recurrence rule. Shared with MCP so both surfaces enforce the same shape.
  const recCheck = parseRecurrence(recurrence);
  if (!recCheck.ok) { res.status(400).json({ error: recCheck.error }); return; }
  const safeRecurrence = recCheck.value;
  if (status !== undefined && !CHRONO_STATUSES.has(status)) {
    res.status(400).json({ error: '`status` must be one of: upcoming, active, completed, overdue, cancelled' }); return;
  }
  if (type !== undefined) {
    const allowedChronoTypes = getAllowedChronoTypes(getSpaceMeta(wt.target));
    if (!allowedChronoTypes.has(type)) {
      res.status(400).json({ error: `\`type\` must be one of: ${[...allowedChronoTypes].join(', ')}` }); return;
    }
  }
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
    res.status(400).json({ error: '`confidence` must be a number between 0 and 1' }); return;
  }
  if (entityIds !== undefined && Array.isArray(entityIds) && isStrictLinkage(wt.target)) {
    const invalidEIds = entityIds.filter((id: string) => !UUID_V4_RE.test(id));
    if (invalidEIds.length > 0) { res.status(400).json({ error: '`entityIds` must contain valid UUID v4 values (entity IDs), not names', invalid: invalidEIds }); return; }
  }
  if (memoryIds !== undefined && Array.isArray(memoryIds) && isStrictLinkage(wt.target)) {
    const invalidMIds = memoryIds.filter((id: string) => !UUID_V4_RE.test(id));
    if (invalidMIds.length > 0) { res.status(400).json({ error: '`memoryIds` must contain valid UUID v4 values (memory IDs), not names', invalid: invalidMIds }); return; }
  }
  if (properties !== undefined && (typeof properties !== 'object' || properties === null || Array.isArray(properties))) {
    res.status(400).json({ error: '`properties` must be a plain object' }); return;
  }
  const safeProps: Record<string, string | number | boolean> | undefined =
    properties != null && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, string | number | boolean>)
      : undefined;

  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }

  const updated = await updateChrono(wt.target, id, {
    title, type, startsAt, endsAt, status, confidence,
    tags, entityIds, memoryIds, description, properties: safeProps, recurrence: safeRecurrence,
  }, webhookToken(req), ttlDaysFromBody(req.body));
  if (!updated) { res.status(404).json({ error: 'Chrono entry not found' }); return; }
  res.json(updated);
});


// PATCH /api/brain/spaces/:spaceId/chrono/:id — partial update a chrono entry by ID
chronoRouter.patch('/spaces/:spaceId/chrono/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }

  const { title, type, startsAt, endsAt, status, confidence, tags, entityIds, memoryIds, description, properties, recurrence } = req.body ?? {};
  // `recurrence` was previously persisted straight from the request body with NO shape
  // check — unlike every sibling field — so an arbitrary object could be stored and later
  // read as a recurrence rule. Shared with MCP so both surfaces enforce the same shape.
  const recCheck = parseRecurrence(recurrence);
  if (!recCheck.ok) { res.status(400).json({ error: recCheck.error }); return; }
  const safeRecurrence = recCheck.value;
  if (status !== undefined && !CHRONO_STATUSES.has(status)) {
    res.status(400).json({ error: '`status` must be one of: upcoming, active, completed, overdue, cancelled' }); return;
  }
  if (type !== undefined) {
    const allowedChronoTypes = getAllowedChronoTypes(getSpaceMeta(wt.target));
    if (!allowedChronoTypes.has(type)) {
      res.status(400).json({ error: `\`type\` must be one of: ${[...allowedChronoTypes].join(', ')}` }); return;
    }
  }
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
    res.status(400).json({ error: '`confidence` must be a number between 0 and 1' }); return;
  }
  if (entityIds !== undefined && Array.isArray(entityIds) && isStrictLinkage(wt.target)) {
    const invalidEIds = entityIds.filter((id: string) => !UUID_V4_RE.test(id));
    if (invalidEIds.length > 0) { res.status(400).json({ error: '`entityIds` must contain valid UUID v4 values (entity IDs), not names', invalid: invalidEIds }); return; }
  }
  if (memoryIds !== undefined && Array.isArray(memoryIds) && isStrictLinkage(wt.target)) {
    const invalidMIds = memoryIds.filter((id: string) => !UUID_V4_RE.test(id));
    if (invalidMIds.length > 0) { res.status(400).json({ error: '`memoryIds` must contain valid UUID v4 values (memory IDs), not names', invalid: invalidMIds }); return; }
  }
  if (properties !== undefined && (typeof properties !== 'object' || properties === null || Array.isArray(properties))) {
    res.status(400).json({ error: '`properties` must be a plain object' }); return;
  }
  const safeProps: Record<string, string | number | boolean> | undefined =
    properties != null && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, string | number | boolean>)
      : undefined;

  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }

  // Snapshot for the audit change list — see the note in memories.ts. Read before the write, since
  // `updateChrono` returns only the new document.
  const prior = await findFirstAcrossMembers(wt.target, mid => getChronoById(mid, id));

  // Validate the entry AS IT WILL BE. This path had NO property validation at all — the `type` allowlist
  // above was the whole of it — so a patch could write a property the same space rejects at create time.
  // Merging first is what makes the check meaningful: a required property the patch does not mention is
  // present in the record and absent from the patch.
  if (prior) {
    const meta = getSpaceMeta(wt.target);
    const priorProps = (prior.properties ?? {}) as Record<string, unknown>;
    const check = classifyUpdateViolations(
      meta,
      validateChrono(meta ?? {}, { type: prior.type, properties: priorProps }),
      validateChrono(meta ?? {}, { type: type ?? prior.type, properties: safeProps ?? priorProps }),
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

  const updated = await findFirstAcrossMembers(wt.target, mid => updateChrono(mid, id, {
    title, type, startsAt, endsAt, status, confidence,
    tags, entityIds, memoryIds, description, properties: safeProps, recurrence: safeRecurrence,
  }, webhookToken(req), ttlDaysFromBody(req.body)));
  if (updated) {
    req.auditSnapshots = { before: prior ?? {}, after: updated };
    res.json(updated);
    return;
  }
  res.status(404).json({ error: 'Chrono entry not found' });
});


// GET /api/brain/spaces/:spaceId/chrono/:id
chronoRouter.get('/spaces/:spaceId/chrono/:id', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const doc = await findFirstAcrossMembers(spaceId, mid => getChronoById(mid, id));
  if (doc) { res.json(doc); return; }
  res.status(404).json({ error: 'Chrono entry not found' });
});


// GET /api/brain/spaces/:spaceId/chrono
chronoRouter.get('/spaces/:spaceId/chrono', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const limit = parseLimit(req.query['limit'], 50, 500);
  const skip = parseSkip(req.query['skip']);
  const sortParse = parseSortParam(req.query['sort'], req.query['dir'], SORTABLE_FIELDS.chrono);
  if ('error' in sortParse) {
    res.status(400).json({ error: sortParse.error });
    return;
  }
  const filter: ChronoFilter = {};
  if (typeof req.query['status'] === 'string') filter.status = req.query['status'];
  if (typeof req.query['type'] === 'string') filter.type = req.query['type'];

  // tags — comma-separated or repeated — AND semantics
  if (Array.isArray(req.query['tags'])) {
    filter.tags = (req.query['tags'] as string[]).flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean);
  } else if (typeof req.query['tags'] === 'string') {
    filter.tags = req.query['tags'].split(',').map(s => s.trim()).filter(Boolean);
  } else if (typeof req.query['tag'] === 'string') {
    // Singular `?tag=` is the UI's search box: substring, not an exact set.
    filter.tagLike = req.query['tag'];
  }
  if (typeof req.query['description'] === 'string') filter.descriptionLike = req.query['description'];
  if (typeof req.query['properties'] === 'string') filter.propertiesLike = req.query['properties'];

  // tagsAny — comma-separated or repeated — OR semantics
  if (Array.isArray(req.query['tagsAny'])) {
    filter.tagsAny = (req.query['tagsAny'] as string[]).flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean);
  } else if (typeof req.query['tagsAny'] === 'string') {
    filter.tagsAny = req.query['tagsAny'].split(',').map(s => s.trim()).filter(Boolean);
  }

  if (typeof req.query['after'] === 'string') filter.after = req.query['after'];
  if (typeof req.query['before'] === 'string') filter.before = req.query['before'];
  if (typeof req.query['search'] === 'string') filter.search = req.query['search'];

  // The Entities column shows entity NAMES; records store ids. Resolved per member for the same reason
  // as edges: an id belongs to the member that owns it. An empty resolution filters to nothing, which is
  // correct — "no entity by that name" must not fall back to showing everything.
  const entityName = typeof req.query['entityName'] === 'string' ? req.query['entityName'] : undefined;
  const all = await collectAcrossMembers(spaceId, async mid => {
    const perMember: Record<string, unknown> = { ...filter };
    if (entityName) perMember['entityIds'] = { $in: await resolveEntityIdsByName(mid, entityName) };
    return listChrono(mid, perMember, limit, skip, sortParse.sort);
  });
  res.json({ chrono: capPage(all, limit, sortParse.sort), limit, skip });
});


// DELETE /api/brain/spaces/:spaceId/chrono/:id
chronoRouter.delete('/spaces/:spaceId/chrono/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const deleted = await findFirstAcrossMembers(spaceId, mid => deleteChrono(mid, id, webhookToken(req)));
  if (deleted) { res.status(204).end(); return; }
  res.status(404).json({ error: 'Chrono entry not found' });
});


// DELETE /api/brain/spaces/:spaceId/chrono — bulk wipe all chrono entries
chronoRouter.delete('/spaces/:spaceId/chrono', bulkWipeRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
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
  const deleted = await bulkDeleteChrono(spaceId);
  res.json({ deleted });
});
