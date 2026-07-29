/**
 * Per-column filters — the server side.
 *
 * The Description column had no control, and the box that DID exist (in the first column) searched
 * `description` as well as `name`/`fact`/`title` via `?search=`. So the column looked unfiltered while
 * something else quietly filtered it. A column control has to narrow its own column, or it reports
 * something it does not do.
 *
 * `?search=` keeps its documented multi-field behaviour — integrations use it — so this is a NEW
 * per-field parameter alongside it, not a change to it.
 *
 * Run: node --test testing/standalone/column-filters.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let textContains, tagContains;

before(async () => {
  ({ textContains, tagContains } = await import('../../server/dist/brain/tag-filter.js'));
});

describe('textContains', () => {
  it('matches a substring, case-insensitively', () => {
    const m = textContains('quarterly');
    assert.match('The QUARTERLY review notes', new RegExp(m.$regex, m.$options));
  });

  it('is unanchored — a whole-field match was the bug being fixed', () => {
    const m = textContains('review');
    assert.ok(!m.$regex.startsWith('^') && !m.$regex.endsWith('$'));
  });

  it('escapes the input, so a crafted value cannot act as a pattern', () => {
    const m = textContains('(a+)+$');
    const re = new RegExp(m.$regex, m.$options);
    assert.match('literal (a+)+$ here', re);
    assert.doesNotMatch('aaaaaaaa', re);
  });

  it('is the same matcher tag search uses', () => {
    // One implementation, so the two cannot drift into different answers — which is exactly what had
    // happened across the five record types before they were unified.
    assert.equal(tagContains, textContains);
  });
});

describe('every record type filters its own description column', () => {
  const SITES = [
    ['server/src/api/brain/_shared.ts', 'memories'],
    ['server/src/api/brain/entities.ts', 'entities'],
    ['server/src/brain/edges.ts', 'edges'],
    ['server/src/brain/chrono.ts', 'chrono'],
  ];

  for (const [file, label] of SITES) {
    it(`${label} applies a substring filter to \`description\``, () => {
      const src = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      assert.match(src, /description'?\]?\s*=\s*textContains\(/,
        `${file} must narrow description with the shared substring matcher`);
    });
  }

  it('leaves `search` spanning its documented field set', () => {
    // Narrowing `search` to one field would silently break every integration using it.
    const src = readFileSync(new URL('../../server/src/brain/text-search.js'.replace('.js', '.ts'), import.meta.url), 'utf8');
    assert.ok(src.includes("memories: ['fact', 'description']"), 'search must still span both');
    assert.ok(src.includes("entities: ['name', 'description']"), 'search must still span both');
  });
});

describe('propertiesValueContains — filters on VALUE, not key', () => {
  let propertiesValueContains, PROPERTIES_SCAN_MAX_MS;

  before(async () => {
    ({ propertiesValueContains, PROPERTIES_SCAN_MAX_MS } = await import('../../server/dist/brain/tag-filter.js'));
  });

  it('walks the bag rather than naming a field', () => {
    // Keys are operator-chosen, so there is no field to query — the values have to be walked.
    const f = propertiesValueContains('engineer');
    const json = JSON.stringify(f);
    assert.match(json, /\$objectToArray/);
    assert.match(json, /\$regexMatch/);
    assert.match(json, /\$anyElementTrue/);
  });

  it('matches the VALUE side of each pair, never the key', () => {
    // `$$this.v`, not `$$this.k`. Verified live: filtering "role" against {role:'engineer'} returns 0.
    const json = JSON.stringify(propertiesValueContains('x'));
    assert.ok(json.includes('$$this.v'), 'must read the value');
    assert.ok(!json.includes('$$this.k'), 'must NOT read the key');
  });

  it('stringifies before matching, so a numeric value is still findable', () => {
    // Values are string | number | boolean. Without $toString, filtering "12" would miss a numeric 12 —
    // which reads as a broken filter rather than as a type subtlety.
    assert.match(JSON.stringify(propertiesValueContains('12')), /\$toString/);
  });

  it('escapes the needle', () => {
    const f = propertiesValueContains('(a+)+$');
    const regex = f.$expr.$anyElementTrue.$map.in.$regexMatch.regex;
    assert.ok(regex.includes('\('), 'metacharacters must be escaped');
    assert.doesNotMatch('aaaaaaaa', new RegExp(regex));
  });

  it('is case-insensitive', () => {
    assert.equal(propertiesValueContains('x').$expr.$anyElementTrue.$map.in.$regexMatch.options, 'i');
  });

  it('tolerates a missing properties bag instead of erroring', () => {
    assert.match(JSON.stringify(propertiesValueContains('x')), /\$ifNull/);
  });

  it('exports a scan deadline, because this query cannot use an index', () => {
    assert.ok(typeof PROPERTIES_SCAN_MAX_MS === 'number' && PROPERTIES_SCAN_MAX_MS > 0);
  });

  it('every list function APPLIES the deadline, not merely imports it', () => {
    // An unbounded collection scan on a large space is the failure mode here — not a wrong result.
    // Checking for the identifier alone is not enough: deleting the guard leaves the import behind, so
    // that version of this test passed with the bound gone.
    for (const f of ['entities.ts', 'memory.ts', 'edges.ts', 'chrono.ts']) {
      const src = readFileSync(new URL(`../../server/src/brain/${f}`, import.meta.url), 'utf8');
      assert.match(src, /maxTimeMS\([^)]*PROPERTIES_SCAN_MAX_MS/,
        `${f} must pass the deadline to maxTimeMS on the properties path`);
    }
  });
});

describe('entity-NAME column filters (From / To / Entities)', () => {
  it('an unmatched name filters to NOTHING, never to everything', () => {
    // The dangerous shape: resolve a name to zero ids, then skip the filter because the list is empty.
    // The column would show every row while claiming to be filtered. All three sites must apply the
    // `$in` unconditionally once a name was given.
    const edges = readFileSync(new URL('../../server/src/brain/edges.ts', import.meta.url), 'utf8');
    assert.match(edges, /if \(filter\.fromIds\) q\['from'\] = \{ \$in: filter\.fromIds \}/);
    assert.match(edges, /if \(filter\.toIds\) q\['to'\] = \{ \$in: filter\.toIds \}/);

    for (const f of ['memories.ts', 'chrono.ts']) {
      const src = readFileSync(new URL(`../../server/src/api/brain/${f}`, import.meta.url), 'utf8');
      assert.match(src, /entityIds'\] = \{ \$in: await resolveEntityIdsByName/,
        `${f} must apply the resolved ids even when empty`);
    }
  });

  it('resolves per MEMBER, not once for the whole proxy space', () => {
    // Ids belong to the member that owns them; resolving against another member's entities would match
    // nothing while looking like it worked.
    for (const f of ['edges.ts', 'memories.ts', 'chrono.ts']) {
      const src = readFileSync(new URL(`../../server/src/api/brain/${f}`, import.meta.url), 'utf8');
      assert.match(src, /collectAcrossMembers\(spaceId, async mid =>/, `${f} must resolve inside the member loop`);
      assert.match(src, /resolveEntityIdsByName\(mid,/, `${f} must resolve against the MEMBER id`);
    }
  });

  it('caps how many ids one name can expand to', () => {
    const src = readFileSync(new URL('../../server/src/brain/entities.ts', import.meta.url), 'utf8');
    assert.ok(src.includes('NAME_FILTER_ID_CAP'), 'an unbounded $in is a denial-of-service shape');
    assert.match(src, /\.limit\(NAME_FILTER_ID_CAP\)/, 'the cap must be applied to the query');
  });

  it('matches names by escaped substring, like every other text filter', () => {
    const src = readFileSync(new URL('../../server/src/brain/entities.ts', import.meta.url), 'utf8');
    assert.match(src, /name: textContains\(trimmed\)/);
  });
});
