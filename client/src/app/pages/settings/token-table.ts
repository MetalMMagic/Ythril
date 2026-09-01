import { rightsRank } from '../../core/token-capability';
import type { TokenRecord } from '../../core/api.types';

/**
 * Sorting and searching for the Tokens table.
 *
 * ## Why it is a module and not methods on the page
 *
 * Two reasons, and the second is the load-bearing one.
 *
 * `tokens.component.ts` is frozen at its current size by `no-new-god-files.test.js`, whose message is the
 * argument rather than the rule: *"every change lands in the same place because that is where the code already
 * is."* A feature cannot be added to a file at its ceiling by making the file bigger.
 *
 * And these are decisions, not plumbing. Where an absent timestamp sorts, what "spaces" means as an order,
 * whether a token with no matrix ranks below one whose matrix grants nothing — each is a judgement somebody can
 * disagree with, and each is one line here with a case in `token-table.spec.ts` naming it. Buried in a component
 * they would be a comparator nobody reads.
 *
 * ## What this deliberately does NOT copy from the Brain tables
 *
 * The Brain tabs sort on the SERVER: they send `sort`/`dir`, and the ordering therefore spans the whole list
 * across pages rather than the rows on screen. That matters there because those lists page.
 *
 * `listTokens()` returns every token in one response and there is no paged token endpoint, so this sorts in the
 * browser. That is the right answer here and it is written down so it does not get "fixed": adding `sort`/`dir`
 * to the auth API would owe all five places a capability lives, for a list that never pages.
 */

/** Every column that sorts. The actions column is absent, which is the whole of the owner's exception. */
export type TokenSortField = 'label' | 'permission' | 'created' | 'lastUsed' | 'expires' | 'spaces' | 'quota';

export type SortDir = 'asc' | 'desc';

/** The two searchable columns, per the owner's request. */
export interface TokenFilter {
  label: string;
  spaces: string;
}

/**
 * The badge text for a token's reach, lower-cased for searching.
 *
 * It matches the words the cell actually renders, because a person searching a column types what they can see.
 * Matching only `t.spaces` would leave the two badge states — unrestricted, and schema-library-only — with
 * nothing to match, so the column would answer every query except the ones about the rows that matter most.
 *
 * The English words are used rather than the translated ones on purpose: this is a substring match against a
 * user's typing, and pulling the active locale in would make a pure function depend on the translation service
 * while giving a Polish operator no way to search for `work`.
 */
export function spacesText(t: TokenRecord): string {
  if (t.schemaLibrary) return 'schema library only';
  if (!t.spaces || t.spaces.length === 0) return 'all spaces';
  return t.spaces.join(', ').toLowerCase();
}

/**
 * How far a token reaches, as a number, for ordering the Spaces column.
 *
 * Reach rather than alphabet: the question an operator brings to this table is *which of these is too broad*,
 * and sorting badge strings alphabetically answers nothing. So the order runs schema-library-only, then one
 * space, two, three… and unrestricted at the widest end.
 *
 * **`spaces: []` means ALL spaces, not none.** That empty-means-unrestricted shape is the one this codebase has
 * already misread on six routes — three treating it as unrestricted, three as nothing — so sorting it by
 * `length` would file the broadest token as the narrowest, at the exact end of the list somebody scanning for
 * over-broad tokens is looking at.
 */
export function spacesReach(t: TokenRecord): number {
  if (t.schemaLibrary) return -1;
  if (!t.spaces || t.spaces.length === 0) return Number.MAX_SAFE_INTEGER;
  return t.spaces.length;
}

/** Milliseconds, or `null` for an absence — which is not a value and is never ordered against one. */
function stampValue(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** The comparable value for one row in one column. `null` means "this row has no value here". */
function keyFor(t: TokenRecord, field: TokenSortField): string | number | null {
  switch (field) {
    case 'label': return (t.name ?? '').toLowerCase();
    case 'permission': return rightsRank(t.rights);
    case 'created': return stampValue(t.createdAt);
    case 'lastUsed': return stampValue(t.lastUsed);
    case 'expires': return stampValue(t.expiresAt);
    case 'spaces': return spacesReach(t);
    // The quota an operator cares about is the one being ENFORCED. Sorting by the per-token override would put
    // every inheriting token in one undifferentiated block, which is most of them.
    case 'quota': return t.rateLimitEffective ?? t.rateLimitPerMinute ?? null;
  }
}

/**
 * Sort a copy of `rows`, absences last in BOTH directions.
 *
 * The blanks rule is the one worth stating. "Never used" and "no expiry" are absences rather than small values:
 * modelled as epoch-zero, every unused token would head an ascending "last used" as though it were the
 * least-recently used, which is the opposite of true. Modelled as infinity for expiry, a block of permanent
 * tokens would bury the ones lapsing soonest — the single thing that column exists to surface.
 *
 * Excluded from the ordering and appended, both ways, so two clicks never disagree about which end they live
 * at. A column whose blanks move looks broken even when every other row is right.
 *
 * The copy is not incidental: the page holds `tokens()` as its source of truth and derives what it renders, so
 * an in-place sort would reorder the source and the server's own order could never be returned to.
 */
export function sortTokens(rows: readonly TokenRecord[], field: TokenSortField, dir: SortDir): TokenRecord[] {
  const withValue: TokenRecord[] = [];
  const blank: TokenRecord[] = [];
  for (const t of rows) (keyFor(t, field) === null ? blank : withValue).push(t);

  const sign = dir === 'asc' ? 1 : -1;
  withValue.sort((a, b) => {
    const ka = keyFor(a, field) as string | number;
    const kb = keyFor(b, field) as string | number;
    if (ka === kb) return 0;
    return (ka < kb ? -1 : 1) * sign;
  });
  return [...withValue, ...blank];
}

/**
 * Narrow `rows` by both boxes, ANDed.
 *
 * ANDed because each box narrows the same list rather than describing an alternative — the same way the Brain
 * tables treat their per-column filters. An empty box narrows nothing, which is the state the page starts in
 * and returns to when the box is cleared, and the query is trimmed so a stray space cannot empty the table.
 */
export function filterTokens(rows: readonly TokenRecord[], filter: TokenFilter): TokenRecord[] {
  const label = filter.label.trim().toLowerCase();
  const spaces = filter.spaces.trim().toLowerCase();
  if (!label && !spaces) return [...rows];
  return rows.filter(t =>
    (!label || (t.name ?? '').toLowerCase().includes(label))
    && (!spaces || spacesText(t).includes(spaces)));
}

/**
 * Expiry state, shared by the table's row badges and the page's active/expiring/expired rollup.
 *
 * Here rather than on either consumer, because there are two. A copy on the component would let the badge and
 * the count disagree about the same token — the class of defect this repo produces most, and one that would
 * read as a rendering glitch rather than as two implementations of one rule.
 */
export function isExpired(t: TokenRecord): boolean {
  return !!(t.expiresAt && new Date(t.expiresAt) < new Date());
}

/** Not yet expired, but expiring within 7 days — the at-risk state that was invisible before. */
export function isExpiringSoon(t: TokenRecord): boolean {
  if (!t.expiresAt) return false;
  const exp = new Date(t.expiresAt).getTime();
  const now = Date.now();
  return exp > now && exp - now <= 7 * 24 * 60 * 60 * 1000;
}
