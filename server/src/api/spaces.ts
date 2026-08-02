import { Router } from 'express';
import path from 'path';
import { requireAuth, requireAdmin, requireAdminMfa, requireAdminMfaScoped } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { getConfig, saveConfig, getSecrets, getDataRoot, getSchemaLibrary, getDocumentProcessingConfig, getMediaEmbeddingConfig, getStorageConfig } from '../config/loader.js';
import { capDocExtractionMode } from '../files/converters/extraction-level.js';
import { slugify, SPACE_PURPOSE_MAX } from '../spaces/_shared.js';
import { createSpace, removeSpace } from '../spaces/lifecycle.js';
import { renameSpace } from '../spaces/rename.js';
import { updateSpace, reorderSpaces, spaceDescriptionAlias, spaceResponse } from '../spaces/spaces.js';
import { checkMetaPrecondition, preconditionErrorBody } from '../spaces/meta-precondition.js';
import { gatherCompletenessFacts, scoreCompleteness } from '../spaces/completeness.js';
import { ensureTtlIndex } from '../brain/ttl.js';
import { measureUsage, dirSizeBytes } from '../quota/quota.js';
import { col } from '../db/mongo.js';
import { resolveMemberSpaces } from '../spaces/proxy.js';
import { isNetworkSyncing } from '../sync/engine.js';
import { spaceNetworkInfo } from '../spaces/network-status.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../util/log.js';
import { buildSpaceVectorIndexes } from '../spaces/vector-index.js';
import { isSsrfSafeUrl, SSRF_SAFE_MESSAGE } from '../util/ssrf.js';
import { peerSafeFetch } from '../sync/peer-fetch.js';
import { proposedMetaFields } from '../sync/meta-round-merge.js';
import type { SpaceMeta, KnowledgeType, TypeSchema } from '../config/types.js';
import { DOC_EXTRACTION_MODES_IN, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS, normalizeDocExtractionMode } from '../config/types.js';
import { writeFile as writeSpaceFile } from '../files/files.js';

export const spacesRouter = Router();

// ── Zod schema for PropertySchema ──────────────────────────────────────────
/**
 * Exported for the standalone tests, which used to keep a hand-copy of this schema and drifted:
 * the copy was missing `required`, `default` and `type: "date"`, so it REJECTED bodies this accepts —
 * including every property the Schema tab sends, since `required` is an inline flag on the property.
 */
export const PropertySchemaZ = z.object({
  type: z.enum(['string', 'number', 'boolean', 'date']).optional(),
  enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  pattern: z.string().max(500).optional(),
  mergeFn: z.enum(['avg', 'min', 'max', 'sum', 'and', 'or', 'xor']).optional(),
  required: z.boolean().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
}).strict().refine(data => {
  if (!data.mergeFn) return true;
  const numericFns = new Set(['avg', 'min', 'max', 'sum']);
  const booleanFns = new Set(['and', 'or', 'xor']);
  if (data.type === 'number') return numericFns.has(data.mergeFn);
  if (data.type === 'boolean') return booleanFns.has(data.mergeFn);
  // mergeFn requires a compatible type declaration
  if (data.type === 'string' || data.type === 'date') return false;
  // No type declared but mergeFn given — allow if the fn could be valid for some type
  return numericFns.has(data.mergeFn) || booleanFns.has(data.mergeFn);
}, {
  message: 'mergeFn is incompatible with the declared type (numeric fns require type "number", boolean fns require type "boolean")',
});

const TypeSchemaZ = z.union([
  // Reference to a schema library entry
  z.object({
    $ref: z.string().regex(/^library:[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/, '$ref must be in format "library:<name>"'),
  }).strict(),
  // Inline schema definition
  z.object({
    namingPattern: z.string().max(500).optional(),
    tagSuggestions: z.array(z.string().min(1).max(200)).max(200).optional(),
    propertySchemas: z.record(z.string().min(1).max(200), PropertySchemaZ).optional(),
    // The schema tier of record > schema > space. `.strict()` above means an unlisted key is REJECTED, so
    // without this the field would be stripped from every PATCH and the feature would silently not exist.
    retention: z.object({
      days: z.number().int().positive().max(36500).optional(),
      contentDays: z.number().int().positive().max(36500).optional(),
    }).strict().refine(v => v.days !== undefined || v.contentDays !== undefined, {
      message: 'retention needs days, contentDays, or both',
    }).optional(),
  }).strict(),
]);

const TypeSchemasZ = z.object({
  entity: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  memory: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  edge:   z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  chrono: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
}).strict();

/**
 * Return names of any `$ref` library entries referenced in typeSchemas that do not
 * exist in the instance schema library.  Used to reject PATCH/PUT early with 422.
 */
function findBrokenLibraryRefs(typeSchemas: z.infer<typeof TypeSchemasZ> | undefined): string[] {
  if (!typeSchemas) return [];
  const library = getSchemaLibrary();
  const broken: string[] = [];
  for (const ktMap of Object.values(typeSchemas)) {
    if (!ktMap) continue;
    for (const schema of Object.values(ktMap)) {
      if (typeof schema === 'object' && schema !== null && '$ref' in schema) {
        const ref = (schema as { $ref: string }).$ref;
        const name = ref.startsWith('library:') ? ref.slice('library:'.length) : ref;
        if (!library.some(e => e.name === name) && !broken.includes(name)) {
          broken.push(name);
        }
      }
    }
  }
  return broken;
}

const SpaceMetaBody = z.object({
  purpose: z.string().max(SPACE_PURPOSE_MAX).optional(),
  usageNotes: z.string().max(50_000).optional(),
  validationMode: z.enum(['off', 'warn', 'strict']).optional(),
  typeSchemas: TypeSchemasZ.optional(),
  tagSuggestions: z.array(z.string().min(1).max(200)).max(200).optional(),
  strictLinkage: z.boolean().optional(),
}).strict();

// proxyFor accepts either the wildcard sentinel ['*'] or a list of specific space IDs
const ProxyForZ = z.union([
  z.tuple([z.literal('*')]),
  z.array(z.string().min(1).max(40)).min(1),
]);

const CreateSpaceBody = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/).optional(),
  label: z.string().min(1).max(200),
  description: z.string().max(SPACE_PURPOSE_MAX).optional(),
  folders: z.array(z.string()).optional(),
  maxGiB: z.number().positive().optional(),
  proxyFor: ProxyForZ.optional(),
  meta: SpaceMetaBody.optional(),
});

const DeleteSpaceBody = z.object({
  confirm: z.literal(true),
});

const RenameSpaceBody = z.object({
  newId: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
});

const DupeActionRuleBody = z.object({
  minScore: z.number().min(0).max(1),
  action: z.enum(['flag', 'automerge', 'notify']),
  types: z.array(z.enum(['memory', 'entity', 'edge', 'chrono', 'file'])).optional(),
  webhookUrl: z.string().url().refine(isSsrfSafeUrl, { message: SSRF_SAFE_MESSAGE }).optional(),
}).strict();

const UpdateSpaceBody = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(SPACE_PURPOSE_MAX).optional(),
  maxGiB: z.number().positive().nullable().optional(),
  meta: SpaceMetaBody.optional(),
  dupeRules: z.array(DupeActionRuleBody).max(20).optional(),
  dupeMergeSurvivor: z.enum(['older', 'newer']).optional(),
  dupeRulesOnInsert: z.boolean().optional(),
  // F10: auto-TTL in days. 0/null clears it; a positive value stamps every new/updated record.
  recordTtlDays: z.number().int().nonnegative().max(36500).nullable().optional(),
  // F11-c: per-space document-extraction mode override. null clears it (inherit the instance default).
  // `max` is accepted as the legacy spelling of `repair` and normalised on the way in.
  documentExtraction: z.enum(DOC_EXTRACTION_MODES_IN).nullable().optional(),
  // Per-space analysis level for the other media classes, capped by the instance ceiling.
  // null clears the override so the space follows the instance again.
  imageAnalysis: z.enum(IMAGE_LEVELS).nullable().optional(),
  audioAnalysis: z.enum(AUDIO_LEVELS).nullable().optional(),
  videoAnalysis: z.enum(VIDEO_LEVELS).nullable().optional(),
  textAnalysis: z.enum(TEXT_LEVELS).nullable().optional(),
}).refine(d => d.label !== undefined || d.description !== undefined || d.meta !== undefined || d.maxGiB !== undefined || d.dupeRules !== undefined || d.dupeMergeSurvivor !== undefined || d.dupeRulesOnInsert !== undefined || d.recordTtlDays !== undefined || d.documentExtraction !== undefined || d.imageAnalysis !== undefined || d.audioAnalysis !== undefined || d.videoAnalysis !== undefined || d.textAnalysis !== undefined, {
  message: 'At least one of label, description, maxGiB, meta, dupeRules, dupeMergeSurvivor, dupeRulesOnInsert, recordTtlDays, documentExtraction, imageAnalysis, audioAnalysis, videoAnalysis, or textAnalysis must be provided',
});

const ReorderSpacesBody = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1),
});

const PutSchemaBody = z.object({
  typeSchemas: TypeSchemasZ,
});

/**
 * Deep-merge an incoming PATCH `meta` payload into the existing SpaceMeta.
 *
 * - Scalar fields (purpose, usageNotes, validationMode, tagSuggestions,
 *   strictLinkage) overwrite the existing value when present in `incoming`.
 * - `typeSchemas` is merged per-knowledge-type, then per-type-name:
 *   types present in `incoming` are added or updated; types *not* mentioned
 *   in the request body are left untouched.
 *
 * The `version`, `updatedAt`, and `previousVersions` housekeeping fields are
 * intentionally omitted from the return value — `updateSpace()` re-adds them.
 */
function mergeSpaceMeta(
  existing: SpaceMeta,
  incoming: Partial<SpaceMeta>,
): Omit<SpaceMeta, 'version' | 'updatedAt' | 'previousVersions'> {
  // Spread the existing base (drop housekeeping fields that updateSpace re-adds)
  const { version: _v, updatedAt: _u, previousVersions: _pv, ...existingBase } = existing;
  const merged: Omit<SpaceMeta, 'version' | 'updatedAt' | 'previousVersions'> = { ...existingBase };

  // Scalar fields — replace if present in incoming
  if (incoming.purpose !== undefined) merged.purpose = incoming.purpose;
  if (incoming.usageNotes !== undefined) merged.usageNotes = incoming.usageNotes;
  if (incoming.validationMode !== undefined) merged.validationMode = incoming.validationMode;
  if (incoming.tagSuggestions !== undefined) merged.tagSuggestions = incoming.tagSuggestions;
  if (incoming.strictLinkage !== undefined) merged.strictLinkage = incoming.strictLinkage;

  // typeSchemas — merge per-KT, per-type: incoming types add/update, existing untouched types preserved
  if (incoming.typeSchemas !== undefined) {
    const existingTs = existingBase.typeSchemas ?? {};
    const mergedTs: Partial<Record<KnowledgeType, Record<string, TypeSchema>>> = { ...existingTs };
    for (const [kt, ktMap] of Object.entries(incoming.typeSchemas) as
        [KnowledgeType, Record<string, TypeSchema> | undefined][]) {
      if (!ktMap) continue;
      mergedTs[kt] = { ...(existingTs[kt] ?? {}), ...ktMap };
    }
    merged.typeSchemas = mergedTs;
  }

  return merged;
}

// POST /api/spaces/:id/rebuild-indexes
//
// The repair operation for "semantic recall returns nothing". Until this existed there was NO way to
// recreate a space's vector search indexes: `POST .../reindex` only re-embeds documents, so an operator
// could reindex the entire space, watch every record be processed, and still get zero results. The only
// paths that ever built an index were creating a space and — by accident — editing its type schemas.
//
// Restoring a backup used to leave exactly that state (the restore drops collections, which destroys
// their indexes); that is now repaired automatically, but a manual lever still matters for any other
// way an index can go missing, and for verifying a recovery.
//
// Deliberately `force`: the caller is here because something is wrong, so the "definition already
// matches" shortcut is not to be trusted — a stale entry that mongot has not yet collected would make
// the repair silently do nothing.
spacesRouter.post('/:id/rebuild-indexes', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const spaceId = req.params['id'] as string;
  if (!getConfig().spaces.some(s => s.id === spaceId)) {
    res.status(404).json({ error: `Space '${spaceId}' not found` });
    return;
  }
  try {
    // Not awaiting READY: a rebuild over a large space takes minutes and would time out the request.
    // Recall returns empty until the build completes — that gap is why this lives in the danger zone.
    await buildSpaceVectorIndexes(spaceId, false, { force: true });
    res.json({ ok: true, spaceId, status: 'rebuilding' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`POST /api/spaces/${spaceId}/rebuild-indexes: ${err}`);
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/spaces/:id/rename
spacesRouter.patch('/:id/rename', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const oldId = req.params['id'] as string;
  const parsed = RenameSpaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // The rename IS the change, so the snapshot is just the two ids. Set before the attempt and only read
  // by the audit middleware on a <400 response, so a failed rename records nothing.
  req.auditSnapshots = { before: { id: oldId }, after: { id: parsed.data.newId } };

  try {
    const space = await renameSpace(oldId, parsed.data.newId);
    res.json({ space });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: msg });
    } else if (msg.includes('already exists')) {
      res.status(409).json({ error: msg });
    } else if (msg.includes('built-in')) {
      res.status(400).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

// POST /api/spaces/reorder
spacesRouter.post('/reorder', globalRateLimit, requireAdminMfa, (req, res) => {
  const parsed = ReorderSpacesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reordered = reorderSpaces(parsed.data.ids);
  if (!reordered) {
    res.status(400).json({ error: 'One or more space IDs not found' });
    return;
  }
  res.json({ spaces: reordered.map(space => ({
    id: space.id, label: space.label, builtIn: space.builtIn, folders: space.folders,
    maxGiB: space.maxGiB, flex: space.flex, ...spaceDescriptionAlias(space),
    ...(space.proxyFor ? { proxyFor: space.proxyFor } : {}),
  })) });
});

// GET /api/spaces
spacesRouter.get('/', globalRateLimit, requireAuth, async (req, res) => {
  const cfg = getConfig();
  const dataRoot = getDataRoot();
  const GiB = 1024 ** 3;

  // Respect token space-scope restrictions: if the token is scoped to specific
  // spaces, only return those spaces. Full-access tokens (no `spaces` field)
  // receive the full list.
  const tokenSpaces = req.authToken && 'spaces' in req.authToken ? req.authToken.spaces : undefined;
  const visibleSpaces = tokenSpaces
    ? cfg.spaces.filter(s => tokenSpaces.includes(s.id))
    : cfg.spaces;

  // Measure per-space file usage in parallel (non-blocking; falls back to 0 on error)
  const usageResults = await Promise.allSettled(
    visibleSpaces.map(s => dirSizeBytes(path.join(dataRoot, 'files', s.id))),
  );
  const usageGiBByIdx = usageResults.map(r => r.status === 'fulfilled' ? r.value / GiB : 0);

  // Optional per-space entity/memory/edge/chrono counts (?counts=true)
  const includeCounts = req.query['counts'] === 'true';
  let countsBySpaceId: Record<string, { memories: number; entities: number; edges: number; chrono: number }> = {};
  if (includeCounts) {
    const countResults = await Promise.allSettled(
      visibleSpaces.map(async s => {
        const memberIds = resolveMemberSpaces(s.id);
        const perMember = await Promise.all(memberIds.map(async mid => ({
          memories: await col(`${mid}_memories`).countDocuments(),
          entities: await col(`${mid}_entities`).countDocuments(),
          edges:    await col(`${mid}_edges`).countDocuments(),
          chrono:   await col(`${mid}_chrono`).countDocuments(),
        })));
        return {
          id: s.id,
          counts: {
            memories: perMember.reduce((n, c) => n + c.memories, 0),
            entities: perMember.reduce((n, c) => n + c.entities, 0),
            edges:    perMember.reduce((n, c) => n + c.edges, 0),
            chrono:   perMember.reduce((n, c) => n + c.chrono, 0),
          },
        };
      }),
    );
    for (const r of countResults) {
      if (r.status === 'fulfilled') countsBySpaceId[r.value.id] = r.value.counts;
    }
  }

  const spaces = visibleSpaces.map((space, idx) => {
    const { id, label, builtIn, folders, maxGiB, flex, proxyFor, meta, dupeRules, dupeMergeSurvivor, dupeRulesOnInsert, recordTtlDays, documentExtraction, imageAnalysis, audioAnalysis, videoAnalysis, textAnalysis, indexStatus } = space;
    return {
    id, label, builtIn, folders, maxGiB, flex,
    // Deprecated alias of `meta.purpose`, derived rather than stored — see `spaceDescriptionAlias`.
    ...spaceDescriptionAlias(space),
    usageGiB: usageGiBByIdx[idx],
    ...(indexStatus ? { indexStatus } : {}),
    ...(proxyFor ? { proxyFor } : {}),
    // Network membership + status for the Brain space-chip indicator (F8).
    ...(spaceNetworkInfo(cfg.networks, id, isNetworkSyncing, cfg.instanceId) ?? {}),
    ...(meta ? { meta: { ...meta, previousVersions: undefined } } : {}),
    ...(dupeRules ? { dupeRules } : {}),
    ...(dupeMergeSurvivor ? { dupeMergeSurvivor } : {}),
    ...(dupeRulesOnInsert ? { dupeRulesOnInsert } : {}),
    ...(recordTtlDays ? { recordTtlDays } : {}),
    ...(documentExtraction ? { documentExtraction } : {}),
    // Only present when the space overrides the instance — an absent field means 'follows the
    // instance', which the UI renders differently from an explicit choice.
    ...(imageAnalysis ? { imageAnalysis } : {}),
    ...(audioAnalysis ? { audioAnalysis } : {}),
    ...(videoAnalysis ? { videoAnalysis } : {}),
    ...(textAnalysis ? { textAnalysis } : {}),
    ...(includeCounts && countsBySpaceId[id] ? { counts: countsBySpaceId[id] } : {}),
    };
  });
  // Include storage usage summary when quota is configured
  // Resolved, not raw: `getStorageConfig()` applies the env pins, and `lockedByInfra` is what lets the
  // Settings page render a host-imposed limit read-only instead of as something the tenant may edit.
  const resolvedStorage = getStorageConfig();
  let storage: {
    usageGiB?: { files: number; brain: number; total: number };
    limits?: ReturnType<typeof getStorageConfig>;
  } | undefined;
  if (resolvedStorage) {
    try {
      const usage = await measureUsage();
      storage = { usageGiB: usage, limits: resolvedStorage };
    } catch {
      // Non-fatal: storage summary omitted on measurement error
    }
  }
  // The instance document-extraction ceiling — the most any space may do. The client uses it to offer
  // only the extraction modes a space could actually reach, so the per-space dropdown can't propose a
  // level the runtime would silently cap. 'auto' means the instance imposes no policy limit.
  const docExtractionCeiling = getDocumentProcessingConfig().mode ?? 'auto';
  // The per-class media-analysis ceilings — the highest level any space may pick for each class.
  // Same contract as docExtractionCeiling: the client offers only levels within each ceiling so a
  // per-space picker can't propose a level the runtime would silently cap. 'auto' = no policy limit.
  // (Config keys images/audio/video/text; the image class is exposed singular to match the space field.)
  const mediaLevels = getMediaEmbeddingConfig().levels ?? {};
  const mediaCeilings = {
    image: mediaLevels.images ?? 'auto',
    audio: mediaLevels.audio ?? 'auto',
    video: mediaLevels.video ?? 'auto',
    text: mediaLevels.text ?? 'auto',
  };
  res.json({ spaces, docExtractionCeiling, mediaCeilings, ...(storage ? { storage } : {}) });
});

// POST /api/spaces
spacesRouter.post('/', globalRateLimit, requireAdminMfa, async (req, res) => {
  const parsed = CreateSpaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { id: rawId, label, description, folders, maxGiB, proxyFor, meta } = parsed.data;
  const id = rawId ?? slugify(label);

  // Validate proxy members exist and are not themselves proxies
  // '*' is the wildcard sentinel — skip per-member validation
  if (proxyFor && !(proxyFor.length === 1 && proxyFor[0] === '*')) {
    const cfg = getConfig();
    for (const memberId of proxyFor) {
      const member = cfg.spaces.find(s => s.id === memberId);
      if (!member) {
        res.status(400).json({ error: `Proxy member space '${memberId}' not found` });
        return;
      }
      if (member.proxyFor) {
        res.status(400).json({ error: `Proxy member '${memberId}' is itself a proxy space (nesting not allowed)` });
        return;
      }
    }
  }

  // New user-created spaces default to a fully-strict schema posture (owner decision 2026-07-25):
  // validationMode:'strict' + strictLinkage:true, so a space enforces its schema and referential
  // integrity from day one. An explicit value in the request wins (spread last). Proxy spaces hold no
  // data of their own, so they are left un-defaulted. The federation-join path (networks/join) calls
  // createSpace directly and is intentionally NOT affected — defaulting strict there would reject
  // incoming off-schema federated records on ingest. With no typeSchemas yet defined, 'strict' still
  // accepts every type/label (nothing to violate), so this never blocks a brand-new empty space.
  const requestMeta = meta as SpaceMeta | undefined;
  const seededMeta: SpaceMeta | undefined = proxyFor
    ? requestMeta
    : { validationMode: 'strict', strictLinkage: true, ...(requestMeta ?? {}) };

  try {
    const space = await createSpace({ id, label, description, folders, maxGiB, proxyFor, meta: seededMeta });
    res.status(201).json({ space: spaceResponse(space) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('already exists')) {
      res.status(409).json({ error: msg });
    } else {
      res.status(500).json({ error: 'Failed to create space' });
    }
  }
});

// PATCH /api/spaces/:id
spacesRouter.patch('/:id', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const id = req.params['id'] as string;
  const cfg = getConfig();

  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Optimistic concurrency: honour If-Match against the current meta version, if the client sent one.
  // Runs before validation, the audit snapshot and every side effect — a rejected write must change
  // nothing and record nothing.
  const precondition = checkMetaPrecondition(req.get('If-Match'), space.meta?.version ?? 0);
  if (!precondition.ok) {
    res.status(precondition.status).json(preconditionErrorBody(precondition));
    return;
  }

  const parsed = UpdateSpaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // `description` is the deprecated spelling of `meta.purpose`. Rewrite it into meta HERE, before any
  // branching, so it travels the meta path in full: the $ref check, the merge, the version bump, and —
  // the one that matters — the network vote. Applying it further down as a "non-meta update" would let a
  // directive change skip governance in exactly the spaces that voted to govern it.
  // `meta.purpose` wins when both are sent; it is the current name.
  if (parsed.data.description !== undefined) {
    const legacy = parsed.data.description.trim();
    parsed.data.meta = { ...(parsed.data.meta ?? {}), ...(parsed.data.meta?.purpose === undefined ? { purpose: legacy } : {}) };
    delete parsed.data.description;
  }

  // Snapshot for the audit log's change list, taken BEFORE anything is applied. Handing the whole record
  // over is safe: `audit-changes.ts` reads only the fields allowlisted for `space.update` and never
  // touches the rest, so this cannot publish something by carrying it. The middleware only records it on
  // a <400 response, so a request rejected below logs no change.
  req.auditSnapshots = {
    before: { ...space, ...space.meta },
    after: { ...space, ...space.meta, ...parsed.data, ...(parsed.data.meta ?? {}) },
  };

  // Validate any $ref values in the incoming meta against the instance schema library
  if (parsed.data.meta?.typeSchemas) {
    const brokenRefs = findBrokenLibraryRefs(parsed.data.meta.typeSchemas as z.infer<typeof TypeSchemasZ>);
    if (brokenRefs.length > 0) {
      res.status(422).json({ error: `Schema library ${brokenRefs.length === 1 ? 'entry' : 'entries'} not found: ${brokenRefs.join(', ')}. Create ${brokenRefs.length === 1 ? 'it' : 'them'} via POST /api/schema-library before referencing.` });
      return;
    }
  }

  // Duplicate rules are local (never governed) — apply them now, so they are
  // not silently dropped when a meta change on the same request opens a
  // network vote and returns 202 below.
  if (parsed.data.dupeRules !== undefined || parsed.data.dupeMergeSurvivor !== undefined || parsed.data.dupeRulesOnInsert !== undefined) {
    updateSpace(id, { dupeRules: parsed.data.dupeRules, dupeMergeSurvivor: parsed.data.dupeMergeSurvivor, dupeRulesOnInsert: parsed.data.dupeRulesOnInsert });
  }

  // Record TTL (F10) is a local operational setting (like dupe rules) — apply immediately, never voted.
  // 0/null clears it. When enabled, ensure the sweep's `_expireAt` index (best-effort).
  if (parsed.data.recordTtlDays !== undefined) {
    const ttl = parsed.data.recordTtlDays && parsed.data.recordTtlDays > 0 ? parsed.data.recordTtlDays : undefined;
    updateSpace(id, { recordTtlDays: ttl });
    if (ttl) void ensureTtlIndex(id).catch(err => log.warn(`ensureTtlIndex ${id}: ${err}`));
  }


  // A space may pick any extraction mode up to the instance ceiling and nothing beyond. The client only
  // offers valid options, but an API caller (or a space whose stored value predates a lowered ceiling)
  // could still send more — so cap it here rather than store a value the runtime would only clamp later
  // anyway. Distinguish field ABSENT (leave the override alone) from an explicit value: `null`/legacy
  // clears it (stored as undefined), `auto` follows the ceiling, a concrete mode is capped to the
  // ceiling. `hasDocExtraction` gates the write so a clear is applied, not skipped as if absent.
  const hasDocExtraction = parsed.data.documentExtraction !== undefined;
  const cappedDocExtraction = !hasDocExtraction
    ? undefined
    : (() => {
        const requested = normalizeDocExtractionMode(parsed.data.documentExtraction);
        if (!requested || requested === 'auto') return requested;  // null (clear → undefined) / auto pass through
        return capDocExtractionMode(getDocumentProcessingConfig().mode ?? 'auto', requested);
      })();

  if (hasDocExtraction) {
    updateSpace(id, { documentExtraction: cappedDocExtraction });
  }

  // Merge the incoming meta with the existing meta so that PATCH has true
  // RFC-7396 semantics: scalar fields overwrite, typeSchemas entries are
  // added/updated, and types *not* mentioned in the body are preserved.
  const mergedMeta: SpaceMeta | undefined =
    parsed.data.meta !== undefined
      ? mergeSpaceMeta(space.meta ?? {}, parsed.data.meta)
      : undefined;

  // ── Network voting for meta changes ──────────────────────────────────────
  // If this space is part of a network and a meta change is requested,
  // open a meta_change vote round instead of applying immediately.
  if (mergedMeta !== undefined) {
    const networkedIn = cfg.networks.filter(n => n.spaces.includes(id));
    if (networkedIn.length > 0) {
      const now = new Date().toISOString();
      const rounds: { networkId: string; networkLabel: string; roundId: string }[] = [];

      for (const net of networkedIn) {
        const roundId = uuidv4();
        const deadline = new Date(Date.now() + net.votingDeadlineHours * 3_600_000).toISOString();
        net.pendingRounds.push({
          roundId,
          type: 'meta_change',
          subjectInstanceId: cfg.instanceId,
          subjectLabel: cfg.instanceLabel,
          subjectUrl: '',
          deadline,
          openedAt: now,
          votes: [{ instanceId: cfg.instanceId, vote: 'yes', castAt: now }],
          spaceId: id,
          pendingMeta: mergedMeta as SpaceMeta,
          // Provenance, so conclusion can apply just this patch rather than this whole snapshot. Rounds
          // stay open for `votingDeadlineHours`, so a second proposal landing before the first concludes
          // is ordinary, and without these two fields the later one reverts the earlier one's edit with
          // no error anywhere. See sync/meta-round-merge.ts.
          metaChangedFields: proposedMetaFields(parsed.data.meta ?? {}),
          baseMetaVersion: space.meta?.version ?? 0,
        });
        rounds.push({ networkId: net.id, networkLabel: net.label, roundId });
      }

      // Apply non-meta updates immediately (label, maxGiB). `description` is not among them any more:
      // it was rewritten into `meta.purpose` above, so it is in the vote with the rest of the meta.
      const nonMetaUpdates: { label?: string; maxGiB?: number | null } = {};
      if (parsed.data.label !== undefined) nonMetaUpdates.label = parsed.data.label;
      if (parsed.data.maxGiB !== undefined) nonMetaUpdates.maxGiB = parsed.data.maxGiB;
      if (Object.keys(nonMetaUpdates).length > 0) {
        updateSpace(id, nonMetaUpdates);
      } else {
        saveConfig(cfg);
      }

      // Notify peers (best-effort)
      const secrets = getSecrets();
      for (const net of networkedIn) {
        for (const member of net.members) {
          const peerToken = secrets.peerTokens[member.instanceId];
          if (!peerToken) continue;
          peerSafeFetch(`${member.url}/api/notify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${peerToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              networkId: net.id,
              instanceId: cfg.instanceId,
              event: 'meta_change_pending',
              data: { spaceId: id, spaceLabel: space.label },
            }),
            signal: AbortSignal.timeout(5_000),
          }).catch(err => log.warn(`notify ${member.label} of meta_change_pending: ${err}`));
        }
      }

      res.status(202).json({ status: 'vote_pending', rounds, message: 'Meta change requires network vote' });
      return;
    }
  }

  // Pull documentExtraction out of the spread: the parsed value may still be the legacy `max`,
  // and only the normalised, ceiling-capped spelling is ever stored (see `cappedDocExtraction` above).
  const { documentExtraction: _rawMode, ...restPatch } = parsed.data;
  const updated = updateSpace(id, {
    ...restPatch,
    meta: mergedMeta,
    ...(hasDocExtraction ? { documentExtraction: cappedDocExtraction } : {}),
  });
  if (!updated) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }
  res.json({ space: spaceResponse(updated) });
});

// PUT /api/spaces/:id/schema — full replacement of the space's typeSchemas.
// Unlike PATCH (which merges types), this completely overwrites `meta.typeSchemas`
// with the supplied value.  Before applying, the previous schema is written to a
// timestamped JSON backup file inside the space so it can be recovered or re-imported.
spacesRouter.put('/:id/schema', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const id = req.params['id'] as string;
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Optimistic concurrency: honour If-Match against the current meta version, if the client sent one.
  // Checked BEFORE the schema backup is written — a rejected write must leave no trace on disk.
  const schemaPrecondition = checkMetaPrecondition(req.get('If-Match'), space.meta?.version ?? 0);
  if (!schemaPrecondition.ok) {
    res.status(schemaPrecondition.status).json(preconditionErrorBody(schemaPrecondition));
    return;
  }

  const parsed = PutSchemaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Validate any $ref values against the instance schema library
  const brokenRefs = findBrokenLibraryRefs(parsed.data.typeSchemas as z.infer<typeof TypeSchemasZ>);
  if (brokenRefs.length > 0) {
    res.status(422).json({ error: `Schema library ${brokenRefs.length === 1 ? 'entry' : 'entries'} not found: ${brokenRefs.join(', ')}. Create ${brokenRefs.length === 1 ? 'it' : 'them'} via POST /api/schema-library before referencing.` });
    return;
  }

  // Write a backup of the previous schema before replacing it
  const previousTypeSchemas = space.meta?.typeSchemas;
  if (previousTypeSchemas && Object.keys(previousTypeSchemas).length > 0) {
    try {
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupContent = JSON.stringify({ typeSchemas: previousTypeSchemas }, null, 2);
      await writeSpaceFile(id, `_schema-backup-${backupTimestamp}.json`, backupContent);
    } catch (err) {
      log.warn(`PUT /${id}/schema: could not write schema backup: ${err}`);
      // Non-fatal — proceed with replacement
    }
  }

  // Re-read AFTER the backup write. `space` was found before `await writeSpaceFile` above, and a
  // config reload during that write orphans it — the spread below would then carry the PRE-reload
  // meta, so any concurrent edit to this space's purpose / usageNotes / validationMode is silently
  // dropped on a schema save. Same class as the invite finalize path and #353; cheap to avoid.
  const freshSpace = getConfig().spaces.find(s => s.id === id);
  if (!freshSpace) {
    res.status(409).json({ error: `Space '${id}' was removed while the schema backup was being written` });
    return;
  }

  // Replace the entire typeSchemas (full-replace semantics)
  const newMeta: SpaceMeta = {
    ...(freshSpace.meta ?? {}),
    typeSchemas: parsed.data.typeSchemas as SpaceMeta['typeSchemas'],
  };

  const updated = updateSpace(id, { meta: newMeta });
  if (!updated) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }
  // Full-replace: `previousTypeSchemas` was read before the write, so this is a true before/after. The
  // audit layer summarises it as type and property-key NAMES — a schema replacement that recorded
  // nothing was the whole gap here.
  req.auditSnapshots = {
    before: { typeSchemas: previousTypeSchemas ?? {} },
    after: { typeSchemas: newMeta.typeSchemas ?? {} },
  };
  res.json({ space: spaceResponse(updated) });
});

// GET /api/spaces/:id/meta — read the meta block with derived stats
spacesRouter.get('/:id/meta', globalRateLimit, requireAuth, async (req, res) => {
  const id = req.params['id'] as string;
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // With `?resolve=1`, expand library `$ref` types to their effective schema (propertySchemas from the
  // linked library entry) so consumers like the brain entry forms — which pre-fill properties from the
  // selected type — see the real fields, not a bare `{ $ref }`. Default (raw) is preserved for the
  // edit/round-trip view and existing callers that verify the stored `$ref`.
  const resolveRefs = req.query['resolve'] === '1' || req.query['resolve'] === 'true';
  const rawMeta = space.meta ?? {};
  const meta = resolveRefs
    ? (await import('../spaces/schema-validation.js')).resolveMetaRefs(rawMeta)
    : rawMeta;
  const memberIds = resolveMemberSpaces(id);
  const counts = await Promise.all(memberIds.map(async mid => ({
    memories: await col(`${mid}_memories`).countDocuments(),
    entities: await col(`${mid}_entities`).countDocuments(),
    edges: await col(`${mid}_edges`).countDocuments(),
    chrono: await col(`${mid}_chrono`).countDocuments(),
    files: await col(`${mid}_files`).countDocuments(),
  })));

  const stats = {
    memories: counts.reduce((s, c) => s + c.memories, 0),
    entities: counts.reduce((s, c) => s + c.entities, 0),
    edges: counts.reduce((s, c) => s + c.edges, 0),
    chrono: counts.reduce((s, c) => s + c.chrono, 0),
    files: counts.reduce((s, c) => s + c.files, 0),
  };

  // Strip previousVersions from public response (available via dedicated endpoint if needed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { previousVersions: _pv, ...metaPublic } = meta;

  res.json({
    spaceId: id,
    spaceName: space.label,
    ...metaPublic,
    stats,
  });
});

// GET /api/spaces/:id/completeness — how much of what this space declared it would hold, it holds.
//
// Separate from `/meta` rather than folded into its `stats`: `/meta` is read on every schema edit and
// must stay cheap, while this walks the collections. Read-only, so no audit entry — the
// audit-route-coverage gate is about mutating verbs.
spacesRouter.get('/:id/completeness', globalRateLimit, requireAuth, async (req, res) => {
  const id = req.params['id'] as string;
  const space = getConfig().spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }
  const facts = await gatherCompletenessFacts(resolveMemberSpaces(id));
  res.json(scoreCompleteness(id, space.meta ?? {}, facts));
});

// ── Granular type schema CRUD ─────────────────────────────────────────────────

const VALID_KNOWLEDGE_TYPES = new Set(['entity', 'memory', 'edge', 'chrono']);
const MAX_TYPES_PER_KIND = 200;

// GET /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName
spacesRouter.get('/:id/meta/typeSchemas/:knowledgeType/:typeName', globalRateLimit, requireAuth, (req, res) => {
  const { id, knowledgeType, typeName } = req.params as { id: string; knowledgeType: string; typeName: string };

  if (!VALID_KNOWLEDGE_TYPES.has(knowledgeType)) {
    res.status(400).json({ error: `Invalid knowledgeType '${knowledgeType}'. Must be one of: entity, memory, edge, chrono` });
    return;
  }

  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  const kt = knowledgeType as 'entity' | 'memory' | 'edge' | 'chrono';
  const typeMap = space.meta?.typeSchemas?.[kt] ?? {};
  if (!(typeName in typeMap)) {
    res.status(404).json({ error: `Type '${typeName}' not found in typeSchemas.${kt}` });
    return;
  }

  res.json({ knowledgeType: kt, typeName, schema: typeMap[typeName] ?? {} });
});

// PUT /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName — upsert a single type definition
spacesRouter.put('/:id/meta/typeSchemas/:knowledgeType/:typeName', globalRateLimit, requireAdminMfaScoped('id'), (req, res) => {
  const { id, knowledgeType, typeName } = req.params as { id: string; knowledgeType: string; typeName: string };

  if (!VALID_KNOWLEDGE_TYPES.has(knowledgeType)) {
    res.status(400).json({ error: `Invalid knowledgeType '${knowledgeType}'. Must be one of: entity, memory, edge, chrono` });
    return;
  }

  const parsed = TypeSchemaZ.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Validate any $ref against the instance schema library before writing
  if ('$ref' in parsed.data) {
    const brokenRefs = findBrokenLibraryRefs({ [knowledgeType]: { _check: parsed.data } });
    if (brokenRefs.length > 0) {
      res.status(422).json({ error: `Schema library ${brokenRefs.length === 1 ? 'entry' : 'entries'} not found: ${brokenRefs.join(', ')}. Create ${brokenRefs.length === 1 ? 'it' : 'them'} via POST /api/schema-library before referencing.` });
      return;
    }
  }

  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Same optimistic-concurrency contract as PATCH /:id — this writes meta too.
  const upsertPrecondition = checkMetaPrecondition(req.get('If-Match'), space.meta?.version ?? 0);
  if (!upsertPrecondition.ok) {
    res.status(upsertPrecondition.status).json(preconditionErrorBody(upsertPrecondition));
    return;
  }

  const kt = knowledgeType as 'entity' | 'memory' | 'edge' | 'chrono';
  const existingMeta: SpaceMeta = space.meta ?? {};
  const existingKtMap: Record<string, import('../config/types.js').TypeSchema> = { ...(existingMeta.typeSchemas?.[kt] ?? {}) };

  // Enforce max 200 types per knowledge type (only for new types)
  const isNew = !(typeName in existingKtMap);
  if (isNew && Object.keys(existingKtMap).length >= MAX_TYPES_PER_KIND) {
    res.status(400).json({
      error: `Max ${MAX_TYPES_PER_KIND} type definitions per knowledge type reached for '${kt}'. Remove unused types before adding new ones.`,
    });
    return;
  }

  // Merge the new type definition into the existing map
  existingKtMap[typeName] = parsed.data;

  const updatedMeta: SpaceMeta = {
    ...existingMeta,
    typeSchemas: {
      ...existingMeta.typeSchemas,
      [kt]: existingKtMap,
    },
  };

  const updated = updateSpace(id, { meta: updatedMeta });
  if (!updated) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // A single-type upsert is audited under the same `space.schema.update` operation as the full replace,
  // so it needs the same snapshot shape. Without it the granular route — the one the Schema tab actually
  // uses — was the silent half of an already-silent pair.
  req.auditSnapshots = {
    before: { typeSchemas: existingMeta.typeSchemas ?? {} },
    after: { typeSchemas: updatedMeta.typeSchemas ?? {} },
  };

  res.json({ knowledgeType: kt, typeName, schema: parsed.data });
});

// DELETE /api/spaces/:id/meta/typeSchemas/:knowledgeType/:typeName — remove a single type definition
spacesRouter.delete('/:id/meta/typeSchemas/:knowledgeType/:typeName', globalRateLimit, requireAdminMfaScoped('id'), (req, res) => {
  const { id, knowledgeType, typeName } = req.params as { id: string; knowledgeType: string; typeName: string };

  if (!VALID_KNOWLEDGE_TYPES.has(knowledgeType)) {
    res.status(400).json({ error: `Invalid knowledgeType '${knowledgeType}'. Must be one of: entity, memory, edge, chrono` });
    return;
  }

  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Same optimistic-concurrency contract as PATCH /:id — removing a type is a meta write.
  const deletePrecondition = checkMetaPrecondition(req.get('If-Match'), space.meta?.version ?? 0);
  if (!deletePrecondition.ok) {
    res.status(deletePrecondition.status).json(preconditionErrorBody(deletePrecondition));
    return;
  }

  const kt = knowledgeType as 'entity' | 'memory' | 'edge' | 'chrono';
  const existingMeta: SpaceMeta = space.meta ?? {};
  const existingKtMap = existingMeta.typeSchemas?.[kt] ?? {};

  if (!(typeName in existingKtMap)) {
    res.status(404).json({ error: `Type '${typeName}' not found in typeSchemas.${kt}` });
    return;
  }

  // Build updated map without the deleted type
  const updatedKtMap: Record<string, import('../config/types.js').TypeSchema> = {};
  for (const [k, v] of Object.entries(existingKtMap)) {
    if (k !== typeName) updatedKtMap[k] = v;
  }

  const updatedTypeSchemas = { ...existingMeta.typeSchemas, [kt]: updatedKtMap };

  const updatedMeta: SpaceMeta = {
    ...existingMeta,
    typeSchemas: updatedTypeSchemas,
  };

  const updated = updateSpace(id, { meta: updatedMeta });
  if (!updated) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Deleting a type is the change most worth having in the log: it silently widens what the space
  // accepts from then on, and the definition it removed is not recoverable from the entry alone.
  req.auditSnapshots = {
    before: { typeSchemas: existingMeta.typeSchemas ?? {} },
    after: { typeSchemas: updatedTypeSchemas },
  };

  res.status(204).end();
});

// POST /api/spaces/:id/validate-schema — dry-run validation of existing data
spacesRouter.post('/:id/validate-schema', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const id = req.params['id'] as string;
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  // Use the provided meta for dry-run, or fall back to the space's current meta
  // Strip internal-only fields (version, updatedAt, previousVersions) before Zod validation
  const rawMeta = req.body?.meta ?? space.meta ?? {};
  const { version: _v, updatedAt: _u, previousVersions: _pv, ...metaForParse } = rawMeta;
  const parsedMeta = SpaceMetaBody.safeParse(metaForParse);
  if (!parsedMeta.success) {
    res.status(400).json({ error: parsedMeta.error.message });
    return;
  }
  const dryMeta = parsedMeta.data as SpaceMeta;

  // Import validation functions dynamically to avoid circular deps
  const { validateEntity, validateEdge, validateMemory, validateChrono, resolveMetaRefs } = await import('../spaces/schema-validation.js');
  const resolvedMeta = resolveMetaRefs(dryMeta);

  const violations: Array<{ collection: string; _id: string; violations: Array<{ field: string; value: unknown; reason: string }> }> = [];
  const memberIds = resolveMemberSpaces(id);
  const SCAN_LIMIT = 10_000;

  for (const mid of memberIds) {
    // Entities
    const entities = await col(`${mid}_entities`).find({}).limit(SCAN_LIMIT).toArray();
    for (const ent of entities) {
      const doc = ent as unknown as { _id: string; name?: string; type?: string; properties?: Record<string, unknown> };
      const v = validateEntity(resolvedMeta, doc);
      if (v.length) violations.push({ collection: 'entities', _id: String(doc._id), violations: v });
    }

    // Edges
    const edges = await col(`${mid}_edges`).find({}).limit(SCAN_LIMIT).toArray();
    for (const edge of edges) {
      const doc = edge as unknown as { _id: string; label?: string; properties?: Record<string, unknown> };
      const v = validateEdge(resolvedMeta, doc);
      if (v.length) violations.push({ collection: 'edges', _id: String(doc._id), violations: v });
    }

    // Memories
    const memories = await col(`${mid}_memories`).find({}).limit(SCAN_LIMIT).toArray();
    for (const mem of memories) {
      const doc = mem as unknown as { _id: string; properties?: Record<string, unknown> };
      const v = validateMemory(resolvedMeta, doc);
      if (v.length) violations.push({ collection: 'memories', _id: String(doc._id), violations: v });
    }

    // Chrono
    const chronoEntries = await col(`${mid}_chrono`).find({}).limit(SCAN_LIMIT).toArray();
    for (const ch of chronoEntries) {
      const doc = ch as unknown as { _id: string; properties?: Record<string, unknown> };
      const v = validateChrono(resolvedMeta, doc);
      if (v.length) violations.push({ collection: 'chrono', _id: String(doc._id), violations: v });
    }
  }

  res.json({
    spaceId: id,
    meta: dryMeta,
    totalViolations: violations.length,
    violations: violations.slice(0, 500), // cap response size
  });
});

// DELETE /api/spaces/:id
//
// Solo space (not in any network): requires { "confirm": true } body to guard against accidents.
// Networked space: opens a space_deletion vote round on every network that includes this space,
// casts this instance's own yes vote immediately, notifies all peers, and returns 202.
// The space is only deleted once the vote passes on each network.
spacesRouter.delete('/:id', globalRateLimit, requireAdminMfaScoped('id'), async (req, res) => {
  const id = req.params['id'] as string;
  const cfg = getConfig();

  const space = cfg.spaces.find(s => s.id === id);
  if (!space) {
    res.status(404).json({ error: `Space '${id}' not found` });
    return;
  }

  if (space.builtIn) {
    res.status(400).json({ error: `Space '${id}' is a built-in space and cannot be deleted` });
    return;
  }

  const networkedIn = cfg.networks.filter(n => n.spaces.includes(id));

  // ── Solo path ─────────────────────────────────────────────────────────────
  if (networkedIn.length === 0) {
    const body = DeleteSpaceBody.safeParse(req.body);
    if (!body.success || !body.data.confirm) {
      res.status(400).json({
        error: 'This space is not in any network. Send { "confirm": true } to delete it permanently.',
      });
      return;
    }
    const ok = await removeSpace(id).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
      return null;
    });
    if (ok === null) return; // error already sent
    if (!ok) { res.status(404).json({ error: `Space '${id}' not found` }); return; }
    res.status(204).end();
    return;
  }

  // ── Networked path ────────────────────────────────────────────────────────
  // Open a space_deletion vote round on every network that contains this space.
  // This instance votes yes immediately; deletion happens once each round passes.
  const rounds: { networkId: string; networkLabel: string; roundId: string }[] = [];
  const now = new Date().toISOString();

  for (const net of networkedIn) {
    const roundId = uuidv4();
    const deadline = new Date(Date.now() + net.votingDeadlineHours * 3_600_000).toISOString();
    net.pendingRounds.push({
      roundId,
      type: 'space_deletion',
      subjectInstanceId: cfg.instanceId,
      subjectLabel: cfg.instanceLabel,
      subjectUrl: '',       // not meaningful for space deletion
      deadline,
      openedAt: now,
      votes: [{ instanceId: cfg.instanceId, vote: 'yes', castAt: now }],
      spaceId: id,
    });
    rounds.push({ networkId: net.id, networkLabel: net.label, roundId });
  }
  saveConfig(cfg);

  // Notify all peers (best-effort — failures are logged but don't abort the response)
  const secrets = getSecrets();
  for (const net of networkedIn) {
    for (const member of net.members) {
      const peerToken = secrets.peerTokens[member.instanceId];
      if (!peerToken) continue;
      peerSafeFetch(`${member.url}/api/notify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${peerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkId: net.id,
          instanceId: cfg.instanceId,
          event: 'space_deletion_pending',
          data: { spaceId: id, spaceLabel: space.label },
        }),
        signal: AbortSignal.timeout(5_000),
      }).catch(err => log.warn(`notify ${member.label} of space_deletion_pending: ${err}`));
    }
  }

  res.status(202).json({ status: 'vote_pending', rounds });
});
