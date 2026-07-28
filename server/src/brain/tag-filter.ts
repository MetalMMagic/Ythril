import { escapeRegex } from '../util/redos.js';

/**
 * Mongo matcher for a single-tag search: case-insensitive **substring**.
 *
 * Tag search used to require the whole tag, and only in some places. Typing "arch" found nothing on a
 * record tagged `architecture` — which reads as "no results" rather than "you did not type enough",
 * so the tag was effectively unfindable unless you already knew it exactly.
 *
 * Worse, the five record types disagreed about what a tag match even was:
 *
 *   memories   `{ $regex: '^tag$', $options: 'i' }`   exact, case-INsensitive
 *   entities   `filter.tags = tag`                    exact, case-sensitive
 *   file-meta  `filter.tags = tag`                    exact, case-sensitive
 *   chrono     `{ $all: [tag] }`                      exact, case-sensitive
 *   edges      `q.tags = filter.tag`                  exact, case-sensitive
 *
 * So the same query behaved differently per tab, and only one tab ignored case. One helper now serves
 * all five.
 *
 * The value is escaped before it becomes a pattern: this is a user-supplied string going into a regex,
 * the same injection/ReDoS route already closed on the chrono `?search=` filter. Escaped and
 * unanchored, the pattern is a literal substring with no quantifiers, so it cannot backtrack.
 *
 * Scope: this backs the SINGULAR `?tag=` param, which is what the UI's tag search sends. The plural
 * `?tags=` / `?tagsAny=` params keep their documented exact AND/OR semantics — integrations rely on
 * them to select an exact set, and widening those to substring would silently over-match.
 */
export function tagContains(tag: string): { $regex: string; $options: string } {
  return { $regex: escapeRegex(tag), $options: 'i' };
}
