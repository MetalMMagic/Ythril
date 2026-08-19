/**
 * An env pin is a GUARANTEE, not a UI hint — for every field the loader can pin, not just one block.
 *
 * ## The defect, proven before it was fixed
 *
 * `blockedByInfra` special-cased `faceRecognition` and said so in its own comment: *"this is the only one whose
 * locks are namespaced today"*. That was **false when it was written**, and it is why the rest went unenforced.
 * The loader pushes twenty-one namespaced paths, so five whole families were ignored:
 *
 *     PATCH {"rerank": {"apiKey": "…"}}   with RERANK_API_KEY pinned   →  200, written to config.json
 *
 * Measured by calling the exported function with the exact `lockedByInfra` the loader produces: five of the six
 * namespaced families came back `[]`. The effective value never changed — the env still wins at read time — but
 * the API reported success for a write it can never honour and left `config.json` disagreeing with the running
 * config. That turns the 403 into decoration.
 *
 * ## Why the pin vocabulary is DERIVED and not listed here
 *
 * A hand-written list of pinnable paths is a second copy of the loader's own set, and this repo's most-produced
 * defect is one rule with two implementations. So the fixture scrapes `locked.push('…')` out of
 * `config/loader.ts` and asserts every one of those paths is enforced. A new pin family added to the loader is
 * therefore covered the day it lands, with no edit here — and if someone adds one this test starts failing until
 * the guard handles it, which is the point.
 *
 * Run: node --test testing/standalone/every-env-pin-is-enforced.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let blockedByInfra;
before(async () => {
  ({ blockedByInfra } = await import('../../server/dist/api/media-config.js'));
});

/** Every namespaced path the loader can put in `lockedByInfra`, read from the loader itself. */
const loaderPaths = () => {
  const src = stripComments(readFileSync('server/src/config/loader.ts', 'utf8'));
  const paths = [...src.matchAll(/locked\.push\('([a-zA-Z]+\.[a-zA-Z]+)'\)/g)].map(m => m[1]);
  return [...new Set(paths)].sort();
};

describe('every namespaced pin the loader emits is actually enforced', () => {
  it('the fixture found the loader\'s pin list — checked before it is trusted', () => {
    /*
     * A scrape that silently matched nothing would make every assertion below pass over an empty list and report
     * the guard as complete. The floor is deliberately above the one family that already worked.
     */
    const paths = loaderPaths();
    assert.ok(paths.length >= 15, `only scraped ${paths.length} pin paths from the loader — the pattern broke`);
    const blocks = new Set(paths.map(p => p.split('.')[0]));
    assert.ok(blocks.size >= 5, `only ${blocks.size} distinct blocks — expected rerank/nli/vision/stt/embedding`);
  });

  it('a patch naming a pinned nested field is blocked, for EVERY family', () => {
    const paths = loaderPaths();
    const unenforced = [];
    for (const path of paths) {
      const [block, field] = path.split('.');
      const blocked = blockedByInfra({ [block]: { [field]: 'whatever' } }, new Set([path]));
      if (!blocked.includes(path)) unenforced.push(path);
    }
    assert.deepEqual(unenforced, [],
      'these pins do not block a patch that overwrites them, so the env var is not a guarantee:\n'
      + unenforced.join('\n'));
  });

  it('and faceRecognition still works — the one case that always did', () => {
    // Regression guard on the replacement: generalising must not have lost the case it generalised from.
    assert.deepEqual(
      blockedByInfra({ faceRecognition: { enabled: true } }, new Set(['faceRecognition.enabled'])),
      ['faceRecognition.enabled']);
  });

  it('a top-level pin is still blocked', () => {
    assert.deepEqual(blockedByInfra({ maxFileSizeBytes: 1 }, new Set(['maxFileSizeBytes'])),
      ['maxFileSizeBytes']);
  });

  it('reports EVERY blocked field, so one 403 names them all', () => {
    // A caller fixing one field at a time because the error named one is a caller making N round trips.
    const blocked = blockedByInfra(
      { rerank: { apiKey: 'x', model: 'y' }, maxFileSizeBytes: 1, nli: { baseUrl: 'z' } },
      new Set(['rerank.apiKey', 'rerank.model', 'maxFileSizeBytes', 'nli.baseUrl']));
    assert.deepEqual(blocked.sort(), ['maxFileSizeBytes', 'nli.baseUrl', 'rerank.apiKey', 'rerank.model']);
  });
});

describe('and it does not block anything that is not pinned', () => {
  it('an unpinned field inside a block with a pinned sibling passes', () => {
    // The half that matters as much: over-blocking would make the admin UI unusable on any instance with one pin.
    assert.deepEqual(blockedByInfra({ rerank: { model: 'fine' } }, new Set(['rerank.apiKey'])), []);
  });

  it('an empty lock set blocks nothing', () => {
    assert.deepEqual(blockedByInfra({ rerank: { apiKey: 'x' }, maxFileSizeBytes: 1 }, new Set()), []);
  });

  it('a block nobody pinned passes untouched', () => {
    assert.deepEqual(blockedByInfra({ levels: { images: 'caption' } }, new Set(['rerank.apiKey'])), []);
  });

  it('an ARRAY value is not walked as though its indices were field names', () => {
    /*
     * `typeof [] === 'object'`, so a naive walk turns a list into `block.0`, `block.1`. Nothing in the lock set
     * looks like that today, which is exactly why it would go unnoticed until a lock named `0` existed.
     */
    assert.deepEqual(blockedByInfra({ someList: ['a', 'b'] }, new Set(['someList.0'])), []);
  });

  it('null and undefined values do not throw', () => {
    // `nullable()` is all over the patch schema — clearing a field is how several of them are turned off.
    assert.deepEqual(blockedByInfra({ rerank: null, nli: undefined }, new Set(['rerank.apiKey'])), []);
  });
});

describe('the comment that caused it cannot come back', () => {
  it('the code does not name a single block as the only namespaced one', () => {
    /*
     * The false claim is the defect's actual cause: it told the next reader there was nothing else to handle, and
     * for five families that was wrong. Gated on the CLAIM rather than on the word "faceRecognition", which still
     * legitimately appears in the explanation of what went wrong.
     */
    const src = readFileSync('server/src/api/media-config.ts', 'utf8');
    assert.doesNotMatch(src, /this is the only one\s+\*?\s*whose locks are namespaced/,
      'the claim that only one block has namespaced locks is false and is what left five families unenforced');
    // And the guard must iterate rather than name a block.
    const code = stripComments(src);
    assert.match(code, /for \(const \[block, value\] of Object\.entries\(patch\)\)/,
      'the guard must walk every block, not special-case one');
    assert.doesNotMatch(code, /patch\['faceRecognition'\]/,
      'a special case for one block is how the other five were missed');
  });
});
