/**
 * Schema validation on UPDATE — of the record as it will be, and honest about whose fault a violation is.
 *
 * ## The hole
 *
 * Creates were validated. Updates were validated **only when the patch used `deleteFields`** — the branch
 * that exists because removing a required property is an obvious way to break a record. Every other patch
 * skipped validation entirely, so `PATCH { properties: { status: "nonsense" } }` wrote a value the same
 * space would have rejected at create time, in a space explicitly set to `strict`. The stricter a space's
 * schema, the wider the gap: the write path an operator relies on to keep records conformant was the one
 * path that did not check.
 *
 * Validating the **merged** record rather than the patch is what makes this correct. A patch is a fragment;
 * "does this fragment satisfy the schema" is not a question with a useful answer, because a required
 * property the patch does not mention is present in the record and absent from the patch.
 *
 * ## Whose fault
 *
 * Once the merged record is validated, a second problem appears immediately: a record that was **already**
 * non-compliant — written before the schema tightened, imported, or synced from a peer with different
 * meta — now fails validation on any edit, including an edit that has nothing to do with the offending
 * field. Reporting that as "your change is invalid" is false, and it is the kind of false that costs an
 * afternoon: the operator stares at a field they did not touch.
 *
 * So violations are split against the record's prior state:
 *
 *   - **introduced** — not present before this patch. The patch caused it.
 *   - **pre-existing** — present before and still present. The patch did not cause it, and did not fix it.
 *
 * Both block, in a `strict` space. That is deliberate rather than a half-measure: the merged record is what
 * gets stored, and storing a known-invalid record because it was already invalid is how a space drifts
 * permanently out of conformance. And the record is not trapped — validation is of the *merged* result, so
 * a patch that repairs the pre-existing violation passes. The error names exactly what to include.
 */
import type { SchemaViolation } from '../../spaces/schema-validation.js';
import type { SpaceMeta } from '../../config/types.js';
import { resolveMemberSpaces } from '../../spaces/proxy.js';
import { applyValidation, getSpaceMeta } from './_shared.js';

/**
 * Identity of a violation for before/after comparison.
 *
 * Field **and** reason, not field alone. One field can fail two ways at once — a property that is both
 * the wrong type and outside its enum — and keying on the field would let a patch introduce a second,
 * different violation on an already-failing field and have it reported as pre-existing. The value is
 * deliberately excluded: an unchanged violation whose value the patch altered (`"a"` → `"b"`, both outside
 * the enum) is the same defect, still the record's own, and calling it newly introduced would blame the
 * patch for a constraint it did not break.
 */
const key = (v: SchemaViolation) => `${v.field}\u0000${v.reason}`;

export interface UpdateValidation {
  /** True when the write must be refused (strict space, at least one violation of the merged record). */
  blocked: boolean;
  /** Violations this patch caused. */
  introduced: SchemaViolation[];
  /** Violations the record already had, which this patch neither caused nor fixed. */
  preExisting: SchemaViolation[];
  /** Everything, for the `violations` field of the response — warn mode reports without blocking. */
  all: SchemaViolation[];
  /** Ready-to-send message naming which of the two situations applies. */
  message: string;
}

/**
 * Classify the merged record's violations against the record's prior ones.
 *
 * `beforeViolations` is what the SAME validator says about the record as it stands now. Recomputing it
 * rather than trusting a stored flag matters: the space's meta can have tightened since the record was
 * written, and the question here is not "was this record valid when created" but "is this field's failure
 * something this patch is responsible for".
 */
export function classifyUpdateViolations(
  meta: SpaceMeta | undefined,
  beforeViolations: SchemaViolation[],
  afterViolations: SchemaViolation[],
): UpdateValidation {
  const before = new Set(beforeViolations.map(key));
  const introduced = afterViolations.filter(v => !before.has(key(v)));
  const preExisting = afterViolations.filter(v => before.has(key(v)));

  const verdict = applyValidation(meta, afterViolations);

  return {
    blocked: verdict.blocked,
    introduced,
    preExisting,
    all: afterViolations,
    message: describeUpdateViolations(introduced, preExisting),
  };
}

/**
 * Find which member space holds the record, and that space's meta.
 *
 * On a proxy space the record lives in exactly one member, and the schema that governs it is **that
 * member's**, not the proxy's. Resolving the two together is the only way an MCP tool can validate
 * against the right meta without re-implementing member resolution per tool — four copies of which is how
 * three of them would end up validating against the proxy.
 */
export async function locateForUpdate<T>(
  spaceId: string,
  load: (memberId: string) => Promise<T | null | undefined>,
): Promise<{ memberId: string; record: T; meta: SpaceMeta | undefined } | undefined> {
  for (const memberId of resolveMemberSpaces(spaceId)) {
    const record = await load(memberId);
    if (record != null) return { memberId, record, meta: getSpaceMeta(memberId) };
  }
  return undefined;
}

/**
 * The MCP-side gate. Same verdict, thrown rather than returned — MCP tools report failure by throwing.
 *
 * It exists so the two surfaces cannot drift. `update_chrono` already shipped once without the type
 * allowlist that `create_chrono` enforced, and this is the same shape of hole one layer down: an agent
 * writing through MCP would otherwise store values the REST route now refuses for the identical record.
 */
export function assertUpdateAllowed(check: UpdateValidation): void {
  if (check.blocked) throw new Error(`schema_violation: ${check.message}`);
}

/**
 * The sentence an operator reads.
 *
 * Three distinct situations, because collapsing them is what makes a validation error useless:
 *   - only introduced   → the patch is wrong; fix the patch
 *   - only pre-existing → the patch is fine; the record was already broken here, and this write is the
 *                         moment to repair it
 *   - both              → say both, and say which is which, or the operator debugs the wrong one first
 */
export function describeUpdateViolations(
  introduced: SchemaViolation[],
  preExisting: SchemaViolation[],
): string {
  const names = (vs: SchemaViolation[]) => [...new Set(vs.map(v => v.field))].join(', ');

  if (introduced.length > 0 && preExisting.length === 0) {
    return `The change violates this space's schema: ${names(introduced)}.`;
  }
  if (introduced.length === 0 && preExisting.length > 0) {
    return `This record was already non-compliant before your change: ${names(preExisting)}. `
      + 'Your edit did not cause it, but the merged record is what gets stored, so the write is refused '
      + 'until those field(s) are fixed — include them in this same request to repair the record.';
  }
  if (introduced.length > 0 && preExisting.length > 0) {
    return `The change violates this space's schema: ${names(introduced)}. `
      + `Separately, this record was already non-compliant before your change: ${names(preExisting)} — `
      + 'include those field(s) in the same request to repair them.';
  }
  return 'The merged record satisfies this space\'s schema.';
}
