/**
 * The tier resolver was already tested. This tests the CALL SITE, which is where a correct resolver stops
 * mattering if it is fed the wrong arguments.
 *
 * ## Why source assertions rather than a live embed
 *
 * `embedStoredRecord` needs Mongo, a model and a space. The three things that can be wrong here are all visible
 * in the source and none of them need any of that:
 *
 *  - a FILE must skip the schema tier, because a file has no type and therefore no type schema;
 *  - the record flag must be passed as `undefined` when absent, not `false`, or it would win the resolution and
 *    the two lower tiers would never be consulted;
 *  - the suppressed branch must UNSET a stale vector, not merely decline to write a new one.
 *
 * The last is the one with teeth: leaving an old vector behind keeps the record findable by exactly the
 * mechanism the flag exists to switch off.
 *
 * Run: node --test testing/standalone/suppress-embeddings-wiring.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../server/src/brain/embed-record.ts', import.meta.url), 'utf8');

/** Comments must not satisfy any of these — several of them describe the very trap being asserted. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the suppression decision reaches the embed path', () => {
  it('calls the shared resolver rather than re-deciding locally', () => {
    // A second copy of record > schema > space is how the order drifts from `retention`.
    assert.match(CODE, /embeddingSuppressed\(\{/);
    assert.match(CODE, /from '\.\/suppress-embeddings\.js'/);
  });

  it('passes the record flag as undefined when it is absent, never false', () => {
    // `false` at the top tier WINS, so an absent flag read as `false` would force embedding and make both lower
    // tiers dead code — the schema and space settings would exist and do nothing.
    assert.match(CODE, /record:\s*doc\['excludeFromVectorSearch'\]\s*===\s*true\s*\?\s*true\s*:\s*undefined/);
  });

  it('consults all three tiers', () => {
    for (const key of ['record:', 'schema:', 'space:']) {
      assert.ok(CODE.includes(key), `the resolver call is missing ${key}`);
    }
  });
});

describe('a file skips the schema tier', () => {
  it('narrows the record type instead of casting it', () => {
    // `BrainEmbedRecordType` includes `'file'`; `KnowledgeType` does not. A cast would compile and then index
    // `typeSchemas` with `'file'`, missing every time — suppression would look wired and never apply.
    assert.match(CODE, /recordType === 'file' \? undefined : recordType/);
    assert.ok(!/recordType as KnowledgeType/.test(CODE), 'the record type is cast rather than narrowed');
  });

  it('does not look up a schema when there is no knowledge type', () => {
    assert.match(CODE, /knowledgeType === undefined \? undefined : schemaKeyFor\(knowledgeType, doc\)/);
  });
});

describe('suppression removes a stale vector', () => {
  it('unsets both the vector and its model', () => {
    // Declining to write a new vector is not enough: the old one still answers vector search, which is the whole
    // bug the flag exists to prevent.
    const branch = CODE.slice(CODE.indexOf('embeddingSuppressed({'));
    const unset = branch.slice(0, branch.indexOf("return 'excluded'"));
    assert.match(unset, /\$unset/);
    assert.match(unset, /embedding:/);
    assert.match(unset, /embeddingModel:/);
  });

  it('returns a distinct outcome rather than reporting success', () => {
    // `'embedded'` here would make a suppressed record indistinguishable from an embedded one in every caller
    // and every metric.
    assert.match(CODE, /return 'excluded';/);
  });
});

describe('the field exists on both tiers of the type', () => {
  const TYPES = readFileSync(new URL('../../server/src/config/types-knowledge.ts', import.meta.url), 'utf8');

  it('is declared on TypeSchema and on SpaceMeta', () => {
    const count = (TYPES.match(/^\s*suppressEmbeddings\?: boolean;/gm) ?? []).length;
    assert.equal(count, 2, `expected the field on both TypeSchema and SpaceMeta, found ${count}`);
  });

  it('is OPTIONAL on both, because absent must mean "not stated"', () => {
    // A required boolean would collapse the tiers: every schema would state a value and the space setting could
    // never apply.
    assert.ok(!/^\s*suppressEmbeddings: boolean;/m.test(TYPES), 'the field is required somewhere');
  });
});

describe('both write surfaces accept it', () => {
  it('the space meta body lists it, or .strict() would reject the field', () => {
    // Two files now: the field is declared with the space request bodies, and the merge guard is in the planner
    // both write surfaces call. Read together, because the pair IS the guarantee — a field the body accepts and
    // the merge drops is the same silent failure as one the body rejects.
    const spaces = ['server/src/spaces/body-schemas.ts', 'server/src/spaces/meta-update.ts']
      .map(p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')).join('\n');
    assert.match(spaces, /suppressEmbeddings: z\.boolean\(\)\.optional\(\)/);
    // Guarded on `!== undefined`: `false` is how suppression is turned back OFF, and a truthy guard would drop
    // that patch while answering 200.
    assert.match(spaces, /if \(incoming\.suppressEmbeddings !== undefined\)/);
  });

  it('the schema LIBRARY accepts it too, so the two surfaces do not drift', () => {
    // A library entry that cannot express a field the inline schema can is a surface that silently drops it.
    const lib = readFileSync(new URL('../../server/src/api/schema-library.ts', import.meta.url), 'utf8');
    assert.match(lib, /suppressEmbeddings: z\.boolean\(\)\.optional\(\)/);
  });
});
