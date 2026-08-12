/**
 * The decision half of a space update: every refusal, and the values a caller must end up writing.
 *
 * ## Why this is a function and not a route
 *
 * Five capabilities were reachable over REST and not over MCP, and the principle behind the report is the one this
 * file serves: *"the rights matrix decides what a token may do; the surface should not also decide whether it
 * can."* Two of the five were thin wrappers over an existing function. This one is not — `updateSpace()` exists,
 * but `PATCH /api/spaces/:id` wraps it in a chain of refusals, and a tool that called `updateSpace()` directly
 * would skip all of them. That is the *two surfaces, one rule, one weaker* defect being reintroduced by the fix
 * for it.
 *
 * So the chain lives here, and both surfaces call it. What a caller still owns is the WRITE — `updateSpace`, the
 * network vote, the peer notify — because those differ in how they are reported, not in whether they are allowed.
 *
 * ## The split: decisions here, side effects at the caller
 *
 * Nothing in this file writes config, opens a vote or touches a peer. It reads config (the extraction ceiling, the
 * schema library) and returns either a refusal or a plan. That is what makes the refusal chain testable without
 * standing up Docker, and it is why the plan carries `recordTtlDays` and `documentExtraction` already normalised:
 * those are decisions with config reads in them, and leaving them at the call site is how the second surface ends
 * up storing a value the first one would have capped.
 *
 * ## The ORDER is part of the contract, not an implementation detail
 *
 * `space-meta-update-contract.test.js` pins it, because a refactor loses it silently. Existence, then the
 * precondition, then the body, then the schema-library refs. A precondition evaluated after validation is not a
 * precondition — it reports a body problem for a write that was never allowed to be applied, and the caller hits
 * the real conflict on their second attempt instead of their first. And a rejected write must change NOTHING,
 * which is why the audit snapshot is returned in the plan rather than taken as we go.
 */
import type { SpaceConfig, SpaceMeta, KnowledgeType, TypeSchema, DocExtractionMode } from '../config/types.js';
import { normalizeDocExtractionMode } from '../config/types.js';
import { getDocumentProcessingConfig } from '../config/loader.js';
import { capDocExtractionMode } from '../files/converters/extraction-level.js';
import { checkMetaPrecondition, preconditionErrorBody } from './meta-precondition.js';
import { normaliseRecordTtl } from './record-ttl.js';
import { UpdateSpaceBody, findBrokenLibraryRefs, brokenRefsError, stripServerOwnedMeta } from './body-schemas.js';
import type { TypeSchemasZ } from './body-schemas.js';
import type { z } from 'zod';

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
 *
 * Exported for testing as well as for the planner. The merge/replace decision is pure and is where a deletion was
 * silently lost for as long as it was; a unit test that reaches it directly is worth more than one that has to
 * stand up Docker and a network to observe the same branch.
 */
export function mergeSpaceMeta(
  existing: SpaceMeta,
  incoming: Partial<SpaceMeta>,
  typeSchemasMode: 'merge' | 'replace' = 'merge',
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
  // Guarded on `!== undefined`, not on truthiness. `suppressEmbeddings: false` is how an operator turns
  // suppression back OFF, and a truthy guard would drop that patch and leave the space suppressed while
  // answering 200 — the flag reporting one thing and the write path doing another.
  if (incoming.suppressEmbeddings !== undefined) merged.suppressEmbeddings = incoming.suppressEmbeddings;

  // typeSchemas — merge per-KT, per-type: incoming types add/update, existing untouched types preserved.
  // Under `replace` the payload is authoritative instead, so a type absent from it is deleted. Note the
  // guard is on `!== undefined`, so `replace` with `typeSchemas: {}` clears every type — which is the only
  // way to express "this space declares nothing" and has to be reachable.
  if (incoming.typeSchemas !== undefined && typeSchemasMode === 'replace') {
    merged.typeSchemas = incoming.typeSchemas;
  } else if (incoming.typeSchemas !== undefined) {
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

/**
 * A refusal, carrying the HTTP status.
 *
 * The status is part of the contract rather than something each surface re-derives: five distinct numbers, and a
 * caller branching on them cannot tell a stale precondition from a malformed one if two collapse into one. An MCP
 * tool maps these to its own error shape; it does not decide them.
 */
export type MetaUpdateRefusal = {
  status: 400 | 404 | 412 | 422;
  body: { error: string; expectedVersion?: number; currentVersion?: number };
};

/** What a caller must write, with every decision already made. */
export type MetaUpdatePlan = {
  /**
   * The space the plan was built against.
   *
   * Returned rather than left to the caller to re-narrow: the caller looked it up as possibly-undefined, the 404
   * above is what rules that out, and handing back the record is how the type says so. A caller re-asserting
   * non-undefined with `!` would be claiming exactly what this function decided.
   */
  space: SpaceConfig;
  /** The parsed body, with `description` already rewritten into `meta.purpose`. */
  data: z.infer<typeof UpdateSpaceBody>;
  /** The merged meta to store, or `undefined` when the request touches no meta at all. */
  mergedMeta: SpaceMeta | undefined;
  /** Present only when `documentExtraction` was in the body; already capped to the instance ceiling. */
  documentExtraction: DocExtractionMode | undefined;
  hasDocExtraction: boolean;
  /** Present only when `recordTtlDays` was in the body; already merged over what was stored. */
  recordTtlDays: SpaceConfig['recordTtlDays'];
  hasRecordTtl: boolean;
  /** The audit change-list snapshot, taken before anything is applied. */
  audit: { before: Record<string, unknown>; after: Record<string, unknown> };
};

export type MetaUpdateDecision =
  | { ok: false; refusal: MetaUpdateRefusal }
  | { ok: true; plan: MetaUpdatePlan };

/**
 * Decide a space update: refuse it, or return everything needed to apply it.
 *
 * `space` is passed in rather than looked up so the caller keeps ownership of how it resolves a space id — the MCP
 * side already holds a resolved space, and a second lookup here would be a second place for the two surfaces to
 * disagree about what "not found" means.
 */
export function planSpaceMetaUpdate(input: {
  spaceId: string;
  space: SpaceConfig | undefined;
  body: unknown;
  ifMatch: string | undefined;
}): MetaUpdateDecision {
  const { spaceId, space, body, ifMatch } = input;

  if (!space) {
    return { ok: false, refusal: { status: 404, body: { error: `Space '${spaceId}' not found` } } };
  }

  // Optimistic concurrency: honour If-Match against the current meta version, if the client sent one.
  // Runs before validation, the audit snapshot and every side effect — a rejected write must change
  // nothing and record nothing.
  const precondition = checkMetaPrecondition(ifMatch, space.meta?.version ?? 0);
  if (!precondition.ok) {
    return { ok: false, refusal: { status: precondition.status, body: preconditionErrorBody(precondition) } };
  }

  // Accept what we emit: a caller who GETs a space, edits one field and PATCHes it back is doing the obvious
  // thing, and `version`/`updatedAt`/`previousVersions` come straight out of our own response. Stripped, not
  // rejected — and ONLY these three, so `.strict()` still catches a typo like `validationMdoe`, which someone
  // would otherwise believe had turned validation on. See SERVER_OWNED_META_FIELDS.
  const bodyForParse = body != null && typeof body === 'object' && !Array.isArray(body)
    ? { ...(body as Record<string, unknown>), ...('meta' in (body as object) ? { meta: stripServerOwnedMeta((body as { meta?: unknown }).meta) } : {}) }
    : body;

  const parsed = UpdateSpaceBody.safeParse(bodyForParse);
  if (!parsed.success) {
    return { ok: false, refusal: { status: 400, body: { error: parsed.error.message } } };
  }

  // `description` is the deprecated spelling of `meta.purpose`. Rewrite it HERE, before any branching, so it
  // travels the meta path in full: the $ref check, the merge, the version bump, and — the one that matters — the
  // network vote. Applying it further down as a "non-meta update" would let a directive change skip governance in
  // exactly the spaces that voted to govern it. That is also why the rewrite is in the PLAN and not at the write:
  // a caller that applied it after the vote branch would reintroduce the bypass without touching this file.
  // `meta.purpose` wins when both are sent; it is the current name.
  if (parsed.data.description !== undefined) {
    const legacy = parsed.data.description.trim();
    parsed.data.meta = { ...(parsed.data.meta ?? {}), ...(parsed.data.meta?.purpose === undefined ? { purpose: legacy } : {}) };
    delete parsed.data.description;
  }

  // Validate any $ref values in the incoming meta against the instance schema library
  if (parsed.data.meta?.typeSchemas) {
    const brokenRefs = findBrokenLibraryRefs(parsed.data.meta.typeSchemas as z.infer<typeof TypeSchemasZ>);
    if (brokenRefs.length > 0) {
      return { ok: false, refusal: { status: 422, body: { error: brokenRefsError(brokenRefs) } } };
    }
  }

  // Snapshot for the audit log's change list, taken BEFORE anything is applied. Handing the whole record
  // over is safe: `audit-changes.ts` reads only the fields allowlisted for `space.update` and never
  // touches the rest, so this cannot publish something by carrying it. The middleware only records it on
  // a <400 response, so a request rejected above logs no change — which is why every refusal returns before here.
  const audit = {
    before: { ...space, ...space.meta } as Record<string, unknown>,
    after: { ...space, ...space.meta, ...parsed.data, ...(parsed.data.meta ?? {}) } as Record<string, unknown>,
  };

  // Record TTL (F10): a PARTIAL object MERGES over the stored windows, so `{"chrono":90}` does not silently clear
  // the other four. That is the opposite of the `typeSchemas` rule, and deliberately so: there a named type is a
  // whole definition the caller holds, here each bucket is one independent number. `hasRecordTtl` gates the write
  // so a CLEAR is applied rather than skipped as if the field were absent.
  //
  // The guard is written as the `!== undefined` comparison rather than as `hasRecordTtl ? …`, because only the
  // comparison NARROWS the type — a boolean const does not, and `normaliseRecordTtl` does not accept `undefined`.
  const hasRecordTtl = parsed.data.recordTtlDays !== undefined;
  const recordTtlDays = parsed.data.recordTtlDays !== undefined
    ? normaliseRecordTtl(space.recordTtlDays, parsed.data.recordTtlDays)
    : undefined;

  // A space may pick any extraction mode up to the instance ceiling and nothing beyond. The client only
  // offers valid options, but an API caller (or a space whose stored value predates a lowered ceiling)
  // could still send more — so cap it here rather than store a value the runtime would only clamp later
  // anyway. Distinguish field ABSENT (leave the override alone) from an explicit value: `null`/legacy
  // clears it (stored as undefined), `auto` follows the ceiling, a concrete mode is capped to the ceiling.
  const hasDocExtraction = parsed.data.documentExtraction !== undefined;
  const documentExtraction: DocExtractionMode | undefined = !hasDocExtraction
    ? undefined
    : (() => {
        const requested = normalizeDocExtractionMode(parsed.data.documentExtraction);
        if (!requested || requested === 'auto') return requested;  // null (clear → undefined) / auto pass through
        return capDocExtractionMode(getDocumentProcessingConfig().mode ?? 'auto', requested);
      })();

  // Merge the incoming meta with the existing meta so that PATCH has true RFC-7396 semantics: scalar fields
  // overwrite, typeSchemas entries are added/updated, and types *not* mentioned in the body are preserved.
  // `typeSchemasMode: 'replace'` opts out of that last clause so a deletion can be expressed at all.
  const mergedMeta: SpaceMeta | undefined =
    parsed.data.meta !== undefined
      ? mergeSpaceMeta(space.meta ?? {}, parsed.data.meta, parsed.data.typeSchemasMode ?? 'merge') as SpaceMeta
      : undefined;

  return {
    ok: true,
    plan: {
      space,
      data: parsed.data,
      mergedMeta,
      documentExtraction,
      hasDocExtraction,
      recordTtlDays,
      hasRecordTtl,
      audit,
    },
  };
}
