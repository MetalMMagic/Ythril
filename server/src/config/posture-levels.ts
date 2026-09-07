/**
 * The three verdicts a security-posture check can reach — a LEAF module, imported by both ends.
 *
 * ## Why it is its own file
 *
 * `security-posture.ts` is where the levels belong, and `metrics/registry.ts` cannot import it: the registry
 * is imported by nearly every file, so pulling in the posture module — and with it the config loader —
 * inverts the dependency direction and risks a cycle. That constraint is recorded at the provider hook in
 * `registry.ts` and enforced by `no-runtime-import-cycles.test.js`.
 *
 * So the alternative was the levels written out twice, and they were: once as the union type and once in the
 * registry's pre-declaration loop. That loop exists because an absent series and a zero one look identical
 * on a graph and mean opposite things — so a fourth level added to the type would be the one an operator's
 * alert never sees, with nothing failing anywhere to say so.
 *
 * A file with no imports of its own can be imported by both, which is what makes one list possible here.
 * The list is the declaration and the type follows it, the same way `RUNGS` works in `auth/space-rights.ts`.
 */
export const POSTURE_LEVELS = ['pass', 'warn', 'fail'] as const;

/** One check's verdict. */
export type PostureLevel = (typeof POSTURE_LEVELS)[number];
