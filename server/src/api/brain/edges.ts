/**
 * Edge CRUD routes (/api/brain/spaces/:spaceId/edges).
 *
 * Split out of the api/brain.ts monolith (A17.3); handlers are unchanged.
 */
import { Router } from 'express';
import { requireSpaceAuth, denyReadOnly } from '../../auth/middleware.js';
import { globalRateLimit, bulkWipeRateLimit } from '../../rate-limit/middleware.js';
import { listEdges, deleteEdge, upsertEdge, getEdgeById, updateEdgeById, bulkDeleteEdges } from '../../brain/edges.js';
import { validateDeleteFields, applyDeleteFields as applyDeleteFieldsPaths } from '../../brain/delete-fields.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { parseLimit, parseSkip, capPage } from '../../util/pagination.js';
import { resolveMemberSpaces, resolveWriteTarget, isProxySpace, isStrictLinkage, findFirstAcrossMembers, collectAcrossMembers } from '../../spaces/proxy.js';
import { validateEdge } from '../../spaces/schema-validation.js';
import { UUID_V4_RE, webhookToken, getSpaceMeta, applyValidation, ttlDaysFromBody, ttlDaysError } from './_shared.js';

export const edgesRouter = Router();


// POST /api/brain/spaces/:spaceId/edges — create/upsert an edge
edgesRouter.post('/spaces/:spaceId/edges', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const { from, to, label, weight, type, description, properties, tags } = req.body ?? {};
  if (!from || typeof from !== 'string') {
    res.status(400).json({ error: '`from` string required' });
    return;
  }
  if (isStrictLinkage(wt.target) && !UUID_V4_RE.test(from)) {
    res.status(400).json({ error: '`from` must be a valid UUID v4 (entity ID), not a name' });
    return;
  }
  if (!to || typeof to !== 'string') {
    res.status(400).json({ error: '`to` string required' });
    return;
  }
  if (isStrictLinkage(wt.target) && !UUID_V4_RE.test(to)) {
    res.status(400).json({ error: '`to` must be a valid UUID v4 (entity ID), not a name' });
    return;
  }
  if (!label || typeof label !== 'string') {
    res.status(400).json({ error: '`label` string required' });
    return;
  }
  if (weight !== undefined && typeof weight !== 'number') {
    res.status(400).json({ error: '`weight` must be a number' });
    return;
  }
  if (type !== undefined && typeof type !== 'string') {
    res.status(400).json({ error: '`type` must be a string' });
    return;
  }
  if (description !== undefined && typeof description !== 'string') {
    res.status(400).json({ error: '`description` must be a string' });
    return;
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string'))) {
    res.status(400).json({ error: '`tags` must be an array of strings' });
    return;
  }
  const safeProps: Record<string, string | number | boolean> | undefined =
    properties != null && typeof properties === 'object' && !Array.isArray(properties)
      ? (properties as Record<string, string | number | boolean>)
      : undefined;
  const safeTags: string[] | undefined = Array.isArray(tags) ? tags : undefined;

  // Schema validation
  const meta = getSpaceMeta(wt.target);
  const violations = validateEdge(meta ?? {}, { label: label.trim(), properties: safeProps });
  const validation = applyValidation(meta, violations);
  if (validation.blocked) {
    res.status(400).json({ error: 'schema_violation', violations: validation.warnings });
    return;
  }
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }

  const edge = await upsertEdge(
    wt.target, from.trim(), to.trim(), label.trim(), weight, type?.trim(),
    typeof description === 'string' ? description : undefined, safeProps, safeTags,
    webhookToken(req), ttlDaysFromBody(req.body),
  );
  const result: Record<string, unknown> = { ...edge };
  if (validation.warnings.length > 0) result['warnings'] = validation.warnings;
  res.status(201).json(result);
});


// GET /api/brain/spaces/:spaceId/edges
edgesRouter.get('/spaces/:spaceId/edges', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const limit = parseLimit(req.query['limit'], 50, 200);
  const skip = parseSkip(req.query['skip']);
  const filter: { from?: string; to?: string; label?: string; type?: string; tag?: string } = {};
  if (typeof req.query['from'] === 'string') filter.from = req.query['from'];
  if (typeof req.query['to'] === 'string') filter.to = req.query['to'];
  if (typeof req.query['label'] === 'string') filter.label = req.query['label'];
  if (typeof req.query['type'] === 'string') filter.type = req.query['type'];
  if (typeof req.query['tag'] === 'string') filter.tag = req.query['tag'];
  const all = await collectAcrossMembers(spaceId, mid => listEdges(mid, filter, limit, skip));
  // Batch-resolve entity names for from/to so the client can display names instead of raw UUIDs
  const allEntityIds = [...new Set(all.flatMap(e => [e.from, e.to]))];
  const nameMap = new Map<string, string>();
  if (allEntityIds.length) {
    const nameDocs = await collectAcrossMembers(spaceId, mid =>
      col<{ _id: string; name: string }>(`${mid}_entities`)
        .find(asFilter<{ _id: string; name: string }>({ _id: { $in: allEntityIds } }), { projection: { _id: 1, name: 1 } })
        .toArray());
    for (const d of nameDocs) nameMap.set(String(d._id), d.name);
  }
  const enriched = all.map(e => ({ ...e, fromName: nameMap.get(e.from), toName: nameMap.get(e.to) }));
  res.json({ edges: capPage(enriched, limit), limit, skip });
});


// GET /api/brain/spaces/:spaceId/edges/:id
edgesRouter.get('/spaces/:spaceId/edges/:id', globalRateLimit, requireSpaceAuth, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const doc = await findFirstAcrossMembers(spaceId, mid => getEdgeById(mid, id));
  if (doc) { res.json(doc); return; }
  res.status(404).json({ error: 'Edge not found' });
});


// DELETE /api/brain/spaces/:spaceId/edges/:id
edgesRouter.delete('/spaces/:spaceId/edges/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const deleted = await findFirstAcrossMembers(spaceId, mid => deleteEdge(mid, id, webhookToken(req)));
  if (deleted) { res.status(204).end(); return; }
  res.status(404).json({ error: 'Edge not found' });
});


// PATCH /api/brain/spaces/:spaceId/edges/:id — partial update an edge by ID
edgesRouter.patch('/spaces/:spaceId/edges/:id', globalRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
  const spaceId = req.params['spaceId'] as string;
  const id = req.params['id'] as string;
  const cfg = getConfig();
  if (!cfg.spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  const wt = resolveWriteTarget(spaceId, req.query['targetSpace'] as string | undefined);
  if (!wt.ok) { res.status(400).json({ error: wt.error }); return; }
  const { label, description, tags, properties, weight, type, deleteFields } = req.body ?? {};
  // Validate deleteFields
  const dfResult = validateDeleteFields(deleteFields);
  if (!dfResult.ok) { res.status(400).json({ error: dfResult.error }); return; }
  const ttlErr = ttlDaysError(req.body);
  if (ttlErr) { res.status(400).json({ error: ttlErr }); return; }
  const ttlDaysProvided = !!req.body && typeof req.body === 'object' && 'ttlDays' in req.body;
  const dfPaths: string[] | undefined = Array.isArray(deleteFields) && deleteFields.length > 0 ? deleteFields : undefined;
  const updates: { label?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; weight?: number; type?: string } = {};
  if (label !== undefined) {
    if (typeof label !== 'string' || !label.trim()) { res.status(400).json({ error: '`label` must be a non-empty string' }); return; }
    updates.label = label.trim();
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
  if (weight !== undefined) {
    if (typeof weight !== 'number') { res.status(400).json({ error: '`weight` must be a number' }); return; }
    updates.weight = weight;
  }
  if (type !== undefined) {
    if (typeof type !== 'string') { res.status(400).json({ error: '`type` must be a string' }); return; }
    updates.type = type.trim();
  }
  if (Object.keys(updates).length === 0 && !dfPaths && !ttlDaysProvided) { res.status(400).json({ error: 'At least one field must be provided' }); return; }
  const memberIds = resolveMemberSpaces(wt.target);
  for (const mid of memberIds) {
    // Schema validation after deleteFields + merge
    if (dfPaths) {
      const existing = await getEdgeById(mid, id);
      if (!existing) continue;
      const resultProps = updates.properties !== undefined
        ? { ...(existing.properties ?? {}), ...updates.properties }
        : { ...(existing.properties ?? {}) };
      const sim: Record<string, unknown> = { properties: resultProps };
      applyDeleteFieldsPaths(sim, dfPaths);
      const simProps = (sim['properties'] ?? {}) as Record<string, unknown>;
      const meta = getSpaceMeta(mid);
      const violations = validateEdge(meta ?? {}, { label: updates.label ?? existing.label, properties: simProps });
      const validation = applyValidation(meta, violations);
      if (validation.blocked) {
        res.status(422).json({ error: 'schema_violation', message: 'deleteFields + merge result violates required properties', violations: validation.warnings });
        return;
      }
    }
    const updated = await updateEdgeById(mid, id, updates, dfPaths, webhookToken(req), ttlDaysFromBody(req.body));
    if (updated) {
      res.json(updated);
      return;
    }
  }
  res.status(404).json({ error: 'Edge not found' });
});


// DELETE /api/brain/spaces/:spaceId/edges — bulk wipe all edges
edgesRouter.delete('/spaces/:spaceId/edges', bulkWipeRateLimit, requireSpaceAuth, denyReadOnly, async (req, res) => {
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
  const deleted = await bulkDeleteEdges(spaceId);
  res.json({ deleted });
});
