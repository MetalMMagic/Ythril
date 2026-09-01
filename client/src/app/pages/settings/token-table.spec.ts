import { describe, it, expect } from 'vitest';
import { sortTokens, filterTokens, spacesReach, spacesText } from './token-table';
import type { TokenRecord } from '../../core/api.types';

/**
 * Sorting and searching the token matrix — the rules, away from the table that renders them.
 *
 * ## Why these are pure functions with their own spec
 *
 * Owner, 2026-09-01: *"token matrix must be sortable on any column except the button one and label/spaces have
 * to be searchable (see brain-ui datatables for reference)."*
 *
 * The Brain tables sort on the SERVER — the tab sends `sort`/`dir` and the ordering spans the whole list across
 * pages. `listTokens()` returns every token in one response and there is no paged token endpoint, so this sort
 * is client-side, which means the comparator is ours to get right rather than Mongo's. Every judgement in it —
 * where blanks land, what "spaces" even means as an order — is a decision somebody can disagree with, so each
 * one is a case here rather than an opinion buried in a component.
 *
 * ## The two decisions worth arguing about
 *
 * **Blanks last, in BOTH directions.** "Never used" and "no expiry" are absences, not small values. Sorting
 * them as epoch-zero would put every unused token at the top of an ascending "last used", which reads as "these
 * were used longest ago" — the opposite of the truth. Reversing the direction has to keep them at the bottom,
 * or the two clicks disagree about where they live and the column looks broken.
 *
 * **Spaces sorts by REACH, not alphabetically.** The cell shows a badge: "all spaces", "schema library only",
 * or a list. Sorting those strings alphabetically answers no question anybody has. The question an operator
 * brings to this table is *which of these tokens is too broad*, so the order is: schema-library-only, then one
 * space, two, three…, then all-spaces at the widest end.
 */

const t = (over: Partial<TokenRecord> = {}): TokenRecord => ({
  id: 'id',
  name: 'token',
  createdAt: '2026-01-01T00:00:00.000Z',
  spaces: [],
  ...over,
} as TokenRecord);

const names = (rows: TokenRecord[]) => rows.map(r => r.name);

describe('token table — label', () => {
  it('sorts case-insensitively, so a capital does not jump the queue', () => {
    // The default `<` on strings puts every capital before every lowercase, so `Zeta` would sort above `alpha`.
    // A person reading a list of labels does not think in code points.
    const rows = [t({ name: 'zeta' }), t({ name: 'Alpha' }), t({ name: 'beta' })];
    expect(names(sortTokens(rows, 'label', 'asc'))).toEqual(['Alpha', 'beta', 'zeta']);
  });

  it('reverses on desc', () => {
    const rows = [t({ name: 'Alpha' }), t({ name: 'zeta' })];
    expect(names(sortTokens(rows, 'label', 'desc'))).toEqual(['zeta', 'Alpha']);
  });

  it('does not mutate the array it was given', () => {
    // The page holds `tokens()` as its source of truth and derives the visible rows. An in-place `sort` would
    // reorder the source, so the "unsorted" state could never be returned to.
    const rows = [t({ name: 'b' }), t({ name: 'a' })];
    sortTokens(rows, 'label', 'asc');
    expect(names(rows)).toEqual(['b', 'a']);
  });
});

describe('token table — timestamps', () => {
  it('created sorts oldest first ascending', () => {
    const rows = [
      t({ name: 'new', createdAt: '2026-06-01T00:00:00.000Z' }),
      t({ name: 'old', createdAt: '2025-01-01T00:00:00.000Z' }),
    ];
    expect(names(sortTokens(rows, 'created', 'asc'))).toEqual(['old', 'new']);
  });

  it('a token that has never been used sorts LAST ascending', () => {
    const rows = [
      t({ name: 'never' }),
      t({ name: 'used', lastUsed: '2026-05-01T00:00:00.000Z' }),
    ];
    expect(names(sortTokens(rows, 'lastUsed', 'asc'))).toEqual(['used', 'never']);
  });

  it('and still LAST descending — an absence does not flip ends', () => {
    /*
     * The case that makes the column trustworthy. If blanks were sorted as a value they would move to the top
     * here, and an operator clicking twice would see unused tokens at both ends and conclude the sort is
     * broken. Absences are excluded from the ordering and appended, both ways.
     */
    const rows = [
      t({ name: 'never' }),
      t({ name: 'usedEarly', lastUsed: '2026-01-01T00:00:00.000Z' }),
      t({ name: 'usedLate', lastUsed: '2026-05-01T00:00:00.000Z' }),
    ];
    expect(names(sortTokens(rows, 'lastUsed', 'desc'))).toEqual(['usedLate', 'usedEarly', 'never']);
  });

  it('"no expiry" is an absence too, not a date far in the future', () => {
    /*
     * Tempting to model as infinity, because a token with no expiry does outlive one that expires. It reads
     * wrongly in practice: the operator sorting by expiry is looking for what lapses SOON, and burying the
     * urgent rows under a block of permanent tokens is the one thing that column must not do.
     */
    const rows = [
      t({ name: 'forever' }),
      t({ name: 'soon', expiresAt: '2026-09-05T00:00:00.000Z' }),
      t({ name: 'later', expiresAt: '2027-01-01T00:00:00.000Z' }),
    ];
    expect(names(sortTokens(rows, 'expires', 'asc'))).toEqual(['soon', 'later', 'forever']);
    expect(names(sortTokens(rows, 'expires', 'desc'))).toEqual(['later', 'soon', 'forever']);
  });
});

describe('token table — permission', () => {
  const rights = (over: Record<string, unknown> = {}) =>
    ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over } as never);

  it('orders by the highest rung the token holds anywhere', () => {
    /*
     * Derived from the existing four-rung ladder in `core/token-capability.ts` rather than a new ranking. A
     * third copy of `['none','read','write','admin']` is precisely the defect this repo produces most, and the
     * ladder is already there with the comparison written against it.
     */
    const rows = [
      t({ name: 'writer', rights: rights({ floor: { knowledge: 'write' } }) }),
      t({ name: 'reader', rights: rights({ floor: { knowledge: 'read' } }) }),
      t({ name: 'spaceAdmin', rights: rights({ perSpace: { work: { files: 'admin' } } }) }),
    ];
    expect(names(sortTokens(rows, 'permission', 'asc'))).toEqual(['reader', 'writer', 'spaceAdmin']);
  });

  it('an instance admin outranks any per-space admin', () => {
    // Two different kinds of power and the ladder does not compare them, so the rank has to say which wins.
    // Instance admin reaches spaces that do not exist yet, which no per-space grant can.
    const rows = [
      t({ name: 'spaceAdmin', rights: rights({ perSpace: { work: { knowledge: 'admin' } } }) }),
      t({ name: 'instance', rights: rights({ instanceAdmin: true }) }),
    ];
    expect(names(sortTokens(rows, 'permission', 'desc'))).toEqual(['instance', 'spaceAdmin']);
  });

  it('a token with NO matrix sorts below one that holds nothing but is granted a matrix', () => {
    /*
     * They render differently — "no rights" text versus an empty glyph — and they are different states: one
     * has never been given a matrix, the other has one that grants nothing. Sorting them together would hide
     * the first, which is the one an operator has to act on.
     */
    const rows = [
      t({ name: 'emptyMatrix', rights: rights() }),
      t({ name: 'noMatrix' }),
    ];
    expect(names(sortTokens(rows, 'permission', 'asc'))).toEqual(['noMatrix', 'emptyMatrix']);
  });
});

describe('token table — spaces', () => {
  it('reach runs schema-library, then narrow, then broad, then all', () => {
    expect(spacesReach(t({ schemaLibrary: true } as never))).toBeLessThan(spacesReach(t({ spaces: ['a'] })));
    expect(spacesReach(t({ spaces: ['a'] }))).toBeLessThan(spacesReach(t({ spaces: ['a', 'b'] })));
    expect(spacesReach(t({ spaces: ['a', 'b'] }))).toBeLessThan(spacesReach(t({ spaces: [] })));
  });

  it('an empty list means ALL spaces, which is the widest and not the narrowest', () => {
    /*
     * The trap in this column. `spaces: []` is the API's way of saying "unrestricted" — the same shape that
     * elsewhere in this codebase was read as "unrestricted" on three routes and as "nothing" on three others.
     * Sorting it by `length` would file the broadest token as the narrowest, at the exact end of the list an
     * operator is scanning for over-broad tokens.
     */
    const rows = [t({ name: 'all', spaces: [] }), t({ name: 'one', spaces: ['work'] })];
    expect(names(sortTokens(rows, 'spaces', 'asc'))).toEqual(['one', 'all']);
  });

  it('searches the space ids, matching any one of them', () => {
    const rows = [t({ name: 'a', spaces: ['work', 'private'] }), t({ name: 'b', spaces: ['shared'] })];
    expect(names(filterTokens(rows, { label: '', spaces: 'priv' }))).toEqual(['a']);
  });

  it('and searches the words the badge shows, so "all" finds an unrestricted token', () => {
    /*
     * A user searching this column types what they can see. An unrestricted token renders "all spaces" and has
     * no ids to match, so matching only `t.spaces` would make the badge unsearchable — the column would answer
     * every query except the one about the rows that matter most.
     */
    const rows = [t({ name: 'all', spaces: [] }), t({ name: 'one', spaces: ['work'] })];
    expect(names(filterTokens(rows, { label: '', spaces: 'all' }))).toEqual(['all']);
    expect(spacesText(t({ schemaLibrary: true } as never))).toContain('schema');
  });
});

describe('token table — search', () => {
  it('matches a label case-insensitively on any part of it', () => {
    const rows = [t({ name: 'CI runner' }), t({ name: 'laptop' })];
    expect(names(filterTokens(rows, { label: 'runn', spaces: '' }))).toEqual(['CI runner']);
  });

  it('the two boxes are ANDed, because each narrows the same list', () => {
    const rows = [
      t({ name: 'ci-work', spaces: ['work'] }),
      t({ name: 'ci-home', spaces: ['home'] }),
      t({ name: 'laptop', spaces: ['work'] }),
    ];
    expect(names(filterTokens(rows, { label: 'ci', spaces: 'work' }))).toEqual(['ci-work']);
  });

  it('an empty box narrows nothing', () => {
    // The state the page starts in, and the one it returns to when the box is cleared. A blank treated as a
    // match against '' would still work by accident; treated as a filter on `undefined` it would empty the table.
    const rows = [t({ name: 'a' }), t({ name: 'b' })];
    expect(names(filterTokens(rows, { label: '', spaces: '' }))).toEqual(['a', 'b']);
  });

  it('trims the query, so a stray space does not empty the table', () => {
    const rows = [t({ name: 'laptop' })];
    expect(names(filterTokens(rows, { label: ' lap ', spaces: '' }))).toEqual(['laptop']);
  });
});
