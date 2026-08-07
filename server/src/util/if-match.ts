/**
 * `If-Match` header parsing, shared by every surface that offers optimistic concurrency.
 *
 * ── Why this is not two copies ──────────────────────────────────────────────────────────────────
 *
 * Space-meta writes have honoured `If-Match` since the meta-version work; brain records now do too.
 * The two compare against different validators — `space.meta.version` there, a record's `seq` here —
 * but the *header* is the same header, and every spelling of it is the same spelling. Hand-writing
 * the parse a second time is how the two surfaces end up disagreeing about whether `W/"4"` counts,
 * which is the failure this codebase keeps finding: one rule, two implementations, the newer one
 * weaker. So the parse lives here once and the callers supply only the validator and the wording.
 *
 * ── What counts as a valid header ───────────────────────────────────────────────────────────────
 *
 * A bare integer (`If-Match: 4`), the quoted entity-tag spelling (`If-Match: "4"`), the weak form
 * (`W/"4"`), and `*` — which per RFC 9110 §13.1.1 means "any current representation", so it passes
 * for any record that exists at all.
 *
 * Anything else is **malformed**, and malformed is an error rather than an ignored header. A client
 * that asks for a guarantee in terms the server cannot evaluate must not be told the guarantee held:
 * silently ignoring the header hands back exactly the false safety it was sent to prevent. That is
 * also why the digit test is a regex and not `parseInt` — `parseInt('4-and-a-half')` is 4, so the
 * lenient reading turns a nonsense precondition into a passing one.
 */

/** A parsed `If-Match`. `none` is the absent header, which means no precondition was asked for. */
export type IfMatch =
  | { kind: 'none' }
  | { kind: 'any' }
  | { kind: 'exact'; value: number }
  | { kind: 'malformed'; received: string };

/** Parse an `If-Match` header value. Never throws; a bad value comes back as `malformed`. */
export function parseIfMatch(header: string | undefined): IfMatch {
  if (header === undefined) return { kind: 'none' };

  const raw = header.trim();
  if (raw === '') return { kind: 'malformed', received: header };
  if (raw === '*') return { kind: 'any' };

  // Strip a weak-validator prefix and surrounding quotes, so all three spellings of the same value
  // behave identically rather than one of them silently failing every write.
  const unquoted = raw.replace(/^W\//i, '').replace(/^"(.*)"$/, '$1').trim();
  if (!/^\d+$/.test(unquoted)) return { kind: 'malformed', received: header };

  return { kind: 'exact', value: Number(unquoted) };
}
