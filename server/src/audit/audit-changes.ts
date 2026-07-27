/**
 * What an audit entry may record about the change itself.
 *
 * Audit entries answered who / when / which route / what status — never *what changed*. "Admin patched the
 * space at 14:02" does not tell you whether they renamed it or turned strict linkage off, which is exactly
 * the question an audit log exists to answer.
 *
 * ── Why this is an ALLOWLIST, and never a redaction denylist ─────────────────────────────────────────────
 *
 * Several audited routes handle secrets directly: token create/regenerate/update, webhook create/update
 * (target URLs and signing secrets), and the media-config routes (vision / STT / NLI / assist API keys).
 * Audit entries are queryable by any admin and retained for `audit.retentionDays`.
 *
 * Diffing a whole request body and stripping known-secret names inverts the failure in the worst possible
 * direction: forget one field and a live API key is written into a retained, queryable store, where it will
 * sit until retention expires and nothing will report it. Naming the fields that MAY be recorded fails the
 * other way — forget one and the entry simply lacks it, which is visible, harmless and fixable.
 *
 * So: an operation with no entry here records **nothing**. A route added later is silent by default rather
 * than leaky by default, which is the only safe direction for a default to point.
 *
 * ── Scalars only ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Recorded values must be scalar or absent. Allowing an object would mean a single allowlisted parent name
 * silently shipping every child it happens to gain later — the same forget-one-field failure, reintroduced
 * through nesting.
 */

/** A single recorded field change. `from`/`to` are scalars; absent means "was not set". */
export interface AuditChange {
  field: string;
  from?: string | number | boolean | null;
  to?: string | number | boolean | null;
}

/**
 * Fields each operation may record, by `operation` name from `audit/middleware.ts`.
 *
 * **Add a field only after checking it cannot carry a credential**, including indirectly — a webhook URL
 * can embed one in userinfo or a query string, which is why webhook routes are absent rather than
 * partially listed. Deliberately omitted for now: everything token.*, webhook.*, and any model/provider
 * config that sits next to an API key.
 */
export const AUDIT_CHANGE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  // Space settings a reader would actually want explained after the fact.
  'space.update': ['label', 'purpose', 'validationMode', 'strictLinkage', 'dupeRulesOnInsert', 'dupeMergeSurvivor'],
  'space.rename': ['id'],
  // Token metadata ONLY. Never the token, its hash, or its prefix — `token.create` and `token.regenerate`
  // are absent entirely, because the interesting value there IS the secret.
  'token.update': ['label', 'level', 'expiresAt'],
  // Media levels and extraction mode: the settings that decide what gets processed and what leaves the
  // instance. The provider blocks in the same payload carry API keys and are NOT listed.
  'media-config.update': ['levels.images', 'levels.audio', 'levels.video', 'levels.text', 'documentProcessing.mode'],
};

/** Scalars only — anything else is dropped rather than stringified. */
function scalarOrDrop(v: unknown): string | number | boolean | null | undefined {
  if (v === null) return null;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return v as string | number | boolean;
  return undefined;   // objects, arrays, functions, undefined — never recorded
}

/** Read a dotted path (`levels.images`) without touching anything else on the object. */
function at(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    obj,
  );
}

/**
 * The changes an operation is permitted to record, comparing two snapshots.
 *
 * Reads ONLY the allowlisted paths — an unlisted field is never accessed, so it cannot be logged by
 * accident even if it sits alongside one that is listed. Returns [] for an unknown operation.
 */
export function auditChanges(operation: string, before: unknown, after: unknown): AuditChange[] {
  const fields = AUDIT_CHANGE_FIELDS[operation];
  if (!fields || before == null || after == null) return [];

  const out: AuditChange[] = [];
  for (const field of fields) {
    const from = scalarOrDrop(at(before, field));
    const to = scalarOrDrop(at(after, field));
    if (from === undefined && to === undefined) continue;   // absent on both sides — nothing happened
    if (from === to) continue;                              // unchanged
    out.push({
      field,
      ...(from === undefined ? {} : { from }),
      ...(to === undefined ? {} : { to }),
    });
  }
  return out;
}
