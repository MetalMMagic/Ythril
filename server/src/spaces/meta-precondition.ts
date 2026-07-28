/**
 * `If-Match` preconditions for space-meta writes.
 *
 * `space.meta.version` has always been incremented on every meta write, and every previous version is
 * kept in `previousVersions` — but nothing ever COMPARED it. Two admins editing one space was
 * last-write-wins on the whole meta object: the second save silently discarded the first, and the only
 * trace was a history entry nobody looks at. The counter recorded the collision; it never prevented one.
 *
 * ── Why a precondition rather than a merge ──────────────────────────────────────────────────────
 *
 * Merging is what `mergeSpaceMeta` already does per type, and it cannot express every intent — a
 * deleted type is indistinguishable from an absent one under merge semantics. Losing an edit silently
 * is the failure worth fixing first, and a precondition fixes it without guessing what the loser meant.
 *
 * ── Opt-in by absence ───────────────────────────────────────────────────────────────────────────
 *
 * No `If-Match` header means no precondition, and the write proceeds exactly as before. That is
 * deliberate: making the header mandatory would break every existing client and every script, to
 * protect against a race most of them never hit. A client that wants safety asks for it.
 *
 * ── Status codes ────────────────────────────────────────────────────────────────────────────────
 *
 * A failed `If-Match` is **412 Precondition Failed** (RFC 9110 §13.1.1), not 409. The internal note
 * proposing this feature said 409, but 409 is for a conflict the request itself describes; 412 is the
 * defined outcome of an unmet precondition, and HTTP client libraries already understand it. A
 * malformed header value is 400 — the client asked for a guarantee in terms the server cannot
 * evaluate, and silently ignoring it would hand back exactly the false safety the header was for.
 */

export type PreconditionVerdict =
  | { ok: true }
  | { ok: false; status: 400; reason: 'malformed'; received: string }
  | { ok: false; status: 412; reason: 'mismatch'; expected: number; actual: number };

/**
 * Evaluate an `If-Match` header against a space's current meta version.
 *
 * Accepts a bare integer (`If-Match: 4`), the quoted entity-tag spelling (`If-Match: "4"`), the weak
 * form (`W/"4"`), and `*` — which per RFC 9110 means "any current representation", so it passes for
 * any existing space.
 *
 * A space that has never had meta written is version 0, so `If-Match: 0` is the correct way to say
 * "only if nobody has configured this yet".
 */
export function checkMetaPrecondition(header: string | undefined, currentVersion: number): PreconditionVerdict {
  if (header === undefined) return { ok: true };      // no precondition asked for

  const raw = header.trim();
  if (raw === '') return { ok: false, status: 400, reason: 'malformed', received: header };
  if (raw === '*') return { ok: true };               // RFC 9110: matches any existing representation

  // Strip a weak-validator prefix and surrounding quotes, so all three spellings of the same version
  // behave identically rather than one of them silently failing every write.
  const unquoted = raw.replace(/^W\//i, '').replace(/^"(.*)"$/, '$1').trim();

  // Deliberately strict: `parseInt` would accept "4-and-a-half" as 4 and let a nonsense precondition
  // pass, which is worse than rejecting it.
  if (!/^\d+$/.test(unquoted)) return { ok: false, status: 400, reason: 'malformed', received: header };

  const expected = Number(unquoted);
  if (expected !== currentVersion) {
    return { ok: false, status: 412, reason: 'mismatch', expected, actual: currentVersion };
  }
  return { ok: true };
}

/** The message body for a failed precondition — says what to do, not just what went wrong. */
export function preconditionErrorBody(v: Extract<PreconditionVerdict, { ok: false }>): {
  error: string;
  expectedVersion?: number;
  currentVersion?: number;
} {
  if (v.reason === 'malformed') {
    return { error: `Malformed If-Match header: '${v.received}'. Expected the space's meta version, e.g. If-Match: 3` };
  }
  return {
    error: `Space meta has changed since you read it (you expected version ${v.expected}, it is now ${v.actual}). Re-read the space and re-apply your change.`,
    expectedVersion: v.expected,
    currentVersion: v.actual,
  };
}
