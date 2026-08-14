/**
 * The request-body schemas for the space routes, and the two helpers that read them.
 *
 * ## Why they are here and not in the router
 *
 * They were all in `api/spaces.ts`, which is the file the god-file ratchet has raised four times with the note
 * *"a fourth raise of one file is the signal to split it instead of raising a fifth time"*. Two of those raises
 * were single Zod lines, because both `SpaceMetaBody` and `TypeSchemaZ` are `.strict()` — an unlisted field is
 * REJECTED, not ignored, so there is no "put it beside the feature" for a field the API must accept. The schemas
 * are what keeps pulling that file upward, so the schemas are what moved.
 *
 * The immediate reason is a cycle. `planSpaceMetaUpdate` in `meta-update.ts` needs `UpdateSpaceBody`, and the
 * router imports the planner — so leaving the schema in the router would be `spaces.ts -> meta-update.ts ->
 * spaces.ts`. Moving them here is what makes both surfaces able to reach one copy of the validation, which is the
 * whole point of B-2: the rights matrix decides what a token may do, and the surface must not also decide whether
 * the same rules apply.
 *
 * ## What is deliberate in here
 *
 * **`.strict()` where it is, and where it is not.** `SpaceMetaBody`, `TypeSchemasZ`, `PropertySchemaZ` and
 * `DupeActionRuleBody` refuse an unknown key; the top-level bodies drop one. That asymmetry is NOT a decision made
 * here — it is inherited verbatim from the router, it is a real defect (a typo in `faceDescriptorDims` creates a
 * space at the default width and reports 201), and it is filed as its own item because making them strict is a
 * breaking change for any caller currently sending a key we ignore. Moved unchanged on purpose: an extraction that
 * also alters behaviour is an extraction nobody can verify.
 */
import { z } from 'zod';
import { getSchemaLibrary } from '../config/loader.js';
import { isSsrfSafeUrl, SSRF_SAFE_MESSAGE } from '../util/ssrf.js';
import { SPACE_PURPOSE_MAX } from './_shared.js';
import { DOC_EXTRACTION_MODES_IN, IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS } from '../config/types.js';

// ── Zod schema for PropertySchema ──────────────────────────────────────────
/**
 * One property's constraints, as a space's type schema declares them.
 *
 * `mergeFn` is refined against `type` rather than accepted freely: an `avg` on a string is not a merge strategy,
 * it is a silent no-op at merge time.
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

export const TypeSchemaZ = z.union([
  // Reference to a schema library entry
  z.object({
    $ref: z.string().regex(/^library:[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/, '$ref must be in format "library:<name>"'),
  }).strict(),
  // Inline schema definition
  z.object({
    namingPattern: z.string().max(500).optional(),
    propertySchemas: z.record(z.string().min(1).max(200), PropertySchemaZ).optional(),
    // The schema tier of record > schema > space. `.strict()` above means an unlisted key is REJECTED, so
    // without this the field would be stripped from every PATCH and the feature would silently not exist.
    retention: z.object({
      days: z.number().int().positive().max(36500).optional(),
      contentDays: z.number().int().positive().max(36500).optional(),
    }).strict().refine(v => v.days !== undefined || v.contentDays !== undefined, {
      message: 'retention needs days, contentDays, or both',
    }).optional(),
    // Same reasoning as `retention` above, and the same tier. Absent means NOT STATED and falls through to the
    // space setting — which is why this is a plain optional boolean and not defaulted to `false` here. A default
    // would turn "said nothing" into "said no" at the edge, and the tier resolver would never see the space.
    suppressEmbeddings: z.boolean().optional(),
  }).strict(),
]);

/** The knowledge-type keys are SINGULAR, and `.strict()` means the plural spelling is a 400 rather than a no-op. */
export const TypeSchemasZ = z.object({
  entity: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  memory: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  edge:   z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
  chrono: z.record(z.string().min(1).max(200), TypeSchemaZ).optional(),
}).strict();

/**
 * Return names of any `$ref` library entries referenced in typeSchemas that do not
 * exist in the instance schema library.  Used to reject PATCH/PUT early with 422.
 */
export function findBrokenLibraryRefs(typeSchemas: z.infer<typeof TypeSchemasZ> | undefined): string[] {
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

/** The 422 body for a broken `$ref`, naming what is missing — "invalid schema" sends the caller to the wrong file. */
export function brokenRefsError(brokenRefs: string[]): string {
  return `Schema library ${brokenRefs.length === 1 ? 'entry' : 'entries'} not found: ${brokenRefs.join(', ')}. `
    + `Create ${brokenRefs.length === 1 ? 'it' : 'them'} via POST /api/schema-library before referencing.`;
}

export const SpaceMetaBody = z.object({
  purpose: z.string().max(SPACE_PURPOSE_MAX).optional(),
  usageNotes: z.string().max(50_000).optional(),
  validationMode: z.enum(['off', 'warn', 'strict']).optional(),
  typeSchemas: TypeSchemasZ.optional(),
  strictLinkage: z.boolean().optional(),
  // The lowest of the three suppression tiers. `.strict()` above is why this has to be listed at all: without
  // it the field would be REJECTED as unknown, not silently ignored — which is the right failure, but still a
  // failure for a field the type now declares.
  suppressEmbeddings: z.boolean().optional(),
}).strict();

/**
 * The fields the server OWNS: it writes them, `GET` returns them, and a caller may not set them.
 *
 * They are stripped from an incoming `meta` rather than rejected by `.strict()`. Reported by an integrator
 * doing the obvious thing — `GET` a space, edit one field of `meta.typeSchemas`, `PATCH` it back — and getting
 * `unrecognized_keys` for three fields they never wrote and cannot omit without knowing to. Their ask was
 * *"either merge, or do not return what you will not accept"*, and this is the second half; the merge half
 * already shipped as `mergeSpaceMeta`.
 *
 * **Only these, and `.strict()` still rejects everything else.** That distinction is the whole design:
 * a key the server itself emitted is echo-back noise and dropping it costs the caller nothing, while an
 * unknown key is a typo — and silently ignoring `validationMdoe` would let someone believe they had turned
 * validation on. Stripping everything would trade a real diagnostic for a convenience.
 *
 * The dry-run endpoint has stripped exactly these since it was written, so before this the two endpoints
 * disagreed about whether a round-tripped body was acceptable. One of them had to be wrong; the one that
 * accepted it was right.
 *
 * ## `needsReindex` joined the list, and the round-trip test is why
 *
 * It is derived state on the meta response — whether the space holds embeddings from a different model — added
 * so an MCP caller can poll after `reindex`. The moment `GET` returned it, a caller doing the obvious thing
 * (`GET`, edit one field, `PATCH` it back) got `unrecognized_keys` for a field they never wrote, which is
 * exactly the report this strip exists to answer. CI caught it: `type-schema-crud.test.js` round-trips a real
 * response rather than a hand-built body, so it fails the moment the response grows a field the PATCH refuses.
 *
 * The rule for anything added to this response in future: **derived, server-written, and echoed back means it
 * belongs here** — otherwise "do not return what you will not accept" is broken again.
 */
export const SERVER_OWNED_META_FIELDS = ['version', 'updatedAt', 'previousVersions', 'needsReindex'] as const;

/** Drop the server-owned housekeeping fields from an incoming `meta`, leaving everything else to Zod. */
export function stripServerOwnedMeta(meta: unknown): unknown {
  if (meta == null || typeof meta !== 'object' || Array.isArray(meta)) return meta;
  const copy: Record<string, unknown> = { ...(meta as Record<string, unknown>) };
  for (const f of SERVER_OWNED_META_FIELDS) delete copy[f];
  return copy;
}

// proxyFor accepts either the wildcard sentinel ['*'] or a list of specific space IDs
export const ProxyForZ = z.union([
  z.tuple([z.literal('*')]),
  z.array(z.string().min(1).max(40)).min(1),
]);

export const CreateSpaceBody = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/).optional(),
  label: z.string().min(1).max(200),
  folders: z.array(z.string()).optional(),
  maxGiB: z.number().positive().optional(),
  // Create-only, and deliberately absent from the update body: a populated gallery cannot be re-dimensioned,
  // so offering the field on PATCH would be offering a change the index build then refuses.
  // Bounds rather than an enum — 128 (MobileFaceNet class) and 512 (ArcFace, AdaFace, FaceNet, EdgeFace) are
  // today's answers, and pinning an enum would make the next model a code change.
  faceDescriptorDims: z.number().int().min(64).max(4096).optional(),
  proxyFor: ProxyForZ.optional(),
  meta: SpaceMetaBody.optional(),
});

export const DeleteSpaceBody = z.object({
  confirm: z.literal(true),
});

export const RenameSpaceBody = z.object({
  newId: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
});

export const DupeActionRuleBody = z.object({
  minScore: z.number().min(0).max(1),
  action: z.enum(['flag', 'automerge', 'notify']),
  types: z.array(z.enum(['memory', 'entity', 'edge', 'chrono', 'file'])).optional(),
  webhookUrl: z.string().url().refine(isSsrfSafeUrl, { message: SSRF_SAFE_MESSAGE }).optional(),
}).strict();

/** One bucket's window: a positive day count, or 0/null to clear it. Same bounds as the legacy scalar. */
const TtlWindowZ = z.number().int().nonnegative().max(36500).nullable().optional();

export const UpdateSpaceBody = z.object({
  label: z.string().min(1).max(200).optional(),
  maxGiB: z.number().positive().nullable().optional(),
  meta: SpaceMetaBody.optional(),
  /**
   * How `meta.typeSchemas` combines with what is already stored. Default `merge`, which is the behaviour
   * this endpoint has always had and which an integrator specifically asked for — a caller that edits one
   * type must not have to resend the other forty.
   *
   * `replace` makes the payload authoritative: types absent from it are REMOVED. It exists because there
   * was otherwise no way to delete a type at all. The settings UI deleted one, sent a payload that simply
   * did not mention it, and `mergeSpaceMeta` faithfully preserved it — so a deletion could be performed,
   * saved, and silently not happen. Reported by an integrator whose space had 21 foreign types they could
   * not remove by any sequence of UI actions.
   *
   * Deliberately NOT a new endpoint. `PUT :id/schema` already replaces wholesale, but it calls
   * `updateSpace()` directly and so bypasses the network vote that a meta change on a networked space
   * has to go through. Routing the UI's Save there would have traded a silent no-op for a silent
   * consensus bypass.
   */
  typeSchemasMode: z.enum(['merge', 'replace']).optional(),
  dupeRules: z.array(DupeActionRuleBody).max(20).optional(),
  dupeMergeSurvivor: z.enum(['older', 'newer']).optional(),
  dupeRulesOnInsert: z.boolean().optional(),
  // F10: auto-TTL in days — the SPACE tier of record > schema > space. 0/null clears it; a positive value
  // stamps every new/updated record with no closer window.
  //
  // TWO shapes. The scalar came first and is accepted forever, because a space that set one keeps working and
  // this is local config a read-side widening can absorb. The object is per BUCKET, five of them: a space does
  // not hold one kind of thing, and files share this tier while having no type for the schema tier to reach.
  recordTtlDays: z.union([
    TtlWindowZ,
    z.object({
      entity: TtlWindowZ, memory: TtlWindowZ, edge: TtlWindowZ, chrono: TtlWindowZ, file: TtlWindowZ,
    }).strict().refine(v => Object.values(v).some(x => x !== undefined), {
      message: 'recordTtlDays needs at least one of entity, memory, edge, chrono or file',
    }),
  ]).nullable().optional(),
  // F11-c: per-space document-extraction mode override. null clears it (inherit the instance default).
  // `max` is accepted as the legacy spelling of `repair` and normalised on the way in.
  documentExtraction: z.enum(DOC_EXTRACTION_MODES_IN).nullable().optional(),
  // Per-space analysis level for the other media classes, capped by the instance ceiling.
  // null clears the override so the space follows the instance again.
  imageAnalysis: z.enum(IMAGE_LEVELS).nullable().optional(),
  audioAnalysis: z.enum(AUDIO_LEVELS).nullable().optional(),
  videoAnalysis: z.enum(VIDEO_LEVELS).nullable().optional(),
  textAnalysis: z.enum(TEXT_LEVELS).nullable().optional(),
}).refine(d => d.label !== undefined || d.meta !== undefined || d.maxGiB !== undefined || d.dupeRules !== undefined || d.dupeMergeSurvivor !== undefined || d.dupeRulesOnInsert !== undefined || d.recordTtlDays !== undefined || d.documentExtraction !== undefined || d.imageAnalysis !== undefined || d.audioAnalysis !== undefined || d.videoAnalysis !== undefined || d.textAnalysis !== undefined, {
  message: 'At least one of label, maxGiB, meta, dupeRules, dupeMergeSurvivor, dupeRulesOnInsert, recordTtlDays, documentExtraction, imageAnalysis, audioAnalysis, videoAnalysis, or textAnalysis must be provided',
});

export const ReorderSpacesBody = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1),
});

export const PutSchemaBody = z.object({
  typeSchemas: TypeSchemasZ,
});
