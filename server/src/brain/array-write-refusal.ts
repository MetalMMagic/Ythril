/**
 * A converted space refuses an array write — one rule, one implementation, seven doors.
 *
 * ## What it refuses and why
 *
 * The six public array fields (`memory.entityIds`, `chrono.entityIds`/`memoryIds`,
 * `file.entityIds`/`memoryIds`/`chronoIds`) are the 3.x way of saying one record concerns another. `M-2`
 * replaced them with link records and gave a link a door of its own.
 *
 * Left open, the arrays are a SECOND write surface for the same fact. On a converted space the two can then
 * disagree, and which one a reader believes is decided by whether that space happens to be converted — which
 * is the exact defect the migration exists to remove, reintroduced by the migration's own compatibility.
 *
 * ## `completeLinkage` arms it, and nothing else may
 *
 * The marker means *"this space has been converted, on this instance"*. That is the only honest precondition
 * for refusing the old surface: before it, some of the space's links exist only as arrays, so the door has
 * nothing to redirect the caller to.
 *
 * **Not `validationMode: strict`.** That governs schema rules — type allowlists, required properties, naming
 * patterns — and it is already set on live spaces. Hung off it, every space on `strict` starts refusing
 * array writes the moment it upgrades, before its operator has run anything.
 *
 * **Not `strictLinkage` either.** One word apart and a different question: that says every reference must
 * RESOLVE, this says every link IS a record.
 *
 * ## What it must never touch
 *
 * **The sync ingest path.** Owner's ruling `P-21`: ingest is *"validated, counted, and let in"*. A peer
 * validated these records against ITS schema, and a refusal here does not merely drop one record — it holds
 * the watermark, so the channel stops making progress and the space silently falls behind.
 *
 * **A write that does not MENTION an array.** A `PATCH` of a memory's `fact` on a record still carrying a
 * legacy array must succeed, or every unconverted record in a converted space becomes uneditable. Tightening
 * a rule freezes the records that no longer fit it — the same hazard the schema validator's
 * `introduced` / `preExisting` split exists for.
 */
import { LINK_CLASSES } from './link-adjacency.js';

/**
 * The field names a caller must stop sending — DERIVED, so a seventh link class is refused by the commit
 * that declares it rather than by a list somebody remembers to extend.
 *
 * Three distinct names across six classes: `entityIds`, `memoryIds`, `chronoIds`.
 */
export const LINK_ARRAY_FIELDS: readonly string[] = [...new Set(LINK_CLASSES.map(c => c.field))];

/** Where a caller is sent instead. Named once so the seven doors answer the same sentence. */
const THE_DOOR = 'POST /api/brain/spaces/:spaceId/links (or the `upsert_link` tool)';

/**
 * The refusal for a body that writes a link array on a converted space, or `null` when there is none.
 *
 * `converted` is passed in rather than read here, so a caller that has already resolved its write target —
 * every proxy-aware door has — does not resolve it a second time and cannot resolve it differently.
 *
 * **A present key is a write, whatever its value.** `entityIds: []` is *"remove every entity link"* and
 * `entityIds: null` is the other spelling of the same removal. Reading either as "no array mentioned" is the
 * tempting shortcut and it leaves exactly one operation — clearing links — reachable through the surface
 * being retired.
 *
 * A returned string rather than a throw, the same shape as `primitivePropertyError` and
 * `validateDeleteFields`: a door needs to answer `400` with a message, and the doors' existing catch blocks
 * carry `SchemaViolationError`, which means something different — a violation of the SPACE's schema, which a
 * space in `warn` mode records and stores. This is refused in every mode.
 */
export function arrayWriteError(converted: boolean, body: unknown): string | null {
  if (!converted || !body || typeof body !== 'object') return null;
  const named = LINK_ARRAY_FIELDS.filter(f => f in (body as Record<string, unknown>));
  if (named.length === 0) return null;
  return `this space's links are all link records (\`completeLinkage\`), so ${named.join(', ')} `
    + `${named.length === 1 ? 'is' : 'are'} no longer written directly — use ${THE_DOOR}. `
    + 'The field is still READ and still replicates, so nothing you have stored is lost.';
}
