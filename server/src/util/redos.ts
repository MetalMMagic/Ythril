/**
 * Heuristics for detecting regex patterns susceptible to catastrophic
 * backtracking (ReDoS). Shared by schema validation (space `pattern` rules)
 * and the structured query tool (`$regex` filters).
 */

/** Maximum length accepted for a user-supplied regex pattern. */
export const MAX_PATTERN_LENGTH = 500;

/**
 * Escape a string for safe literal use inside a RegExp (e.g. building a `^prefix`
 * anchor for a Mongo `$regex`). Single source of truth — every call site that
 * hand-rolled `s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` should use this.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rejects patterns with nested quantifiers like (a+)+, (a*)*b, (a|a)+, etc.
 * This is a conservative heuristic — it may block some safe patterns, which
 * is the correct fail-safe direction for user-supplied regexes.
 *
 * Groups that begin with a mandatory literal separator character (-, /, :)
 * that is not itself optional are excluded because the separator forces unique
 * iteration boundaries and prevents exponential backtracking.
 * e.g. (-[a-z0-9]+)+ is safe — each iteration must start with a literal '-'
 * that cannot be matched by [a-z0-9], so there is no ambiguous partitioning.
 */
const NESTED_QUANTIFIER_RE = /\((?:\?:)?(?![-/:](?![?*{]))([^)]*[+*])\)([+*?]|\{)/;
const ALTERNATION_QUANTIFIER_RE = /\([^)]*\|[^)]*\)([+*?]|\{)/;

export function hasReDoSRisk(pattern: string): boolean {
  return NESTED_QUANTIFIER_RE.test(pattern) || ALTERNATION_QUANTIFIER_RE.test(pattern);
}
