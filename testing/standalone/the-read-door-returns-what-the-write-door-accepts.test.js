/**
 * Every block the media-config PATCH accepts comes back from its GET.
 *
 * ## The defect, measured on a running instance
 *
 * `PATCH /api/admin/media-config` accepts `modelSlots` and stores it — verified against a live scratch
 * instance: two writes landed in `config.modelSlots`, merged per slot, nothing clobbered. `GET` on the same
 * path never returned it. Its body is built from `getMediaEmbeddingConfig()`, and `modelSlots` lives at the
 * TOP LEVEL of the config, so it was simply never in the object being masked.
 *
 * The Models tab reads `cfg.modelSlots ?? {}` from that GET, so **every per-slot control rendered blank on
 * page load, whatever was stored**. An operator sets a budget, saves, reloads, sees an empty box showing the
 * built-in default as a placeholder, and reasonably concludes it did not save. Nothing errors. The value is
 * applied the whole time.
 *
 * No data is lost — a slot sent as `{}` merges as a no-op, checked on the same instance — so the damage is
 * entirely that the operator cannot see, confirm or correct what they set.
 *
 * ## Why a gate and not just the line
 *
 * `embedding` is the SAME case and is handled two lines above the omission: *"Text embedding lives at
 * top-level config.embedding but is surfaced here so it's on the Models page."* Somebody knew the rule,
 * wrote it down, and the next top-level block went in without it. That is two instances of one rule with
 * only one of them applied, which is the defect this repository names as the one it produces most.
 *
 * ## The rule, derived from the schema rather than listed
 *
 * The PATCH's own top-level schema IS the list of what an operator can set. Reading it out means a block
 * added to the write door is covered by the commit that adds it, instead of when somebody notices a control
 * that will not stick.
 *
 * Run: node --test testing/standalone/the-read-door-returns-what-the-write-door-accepts.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

const SRC = 'server/src/api/media-config.ts';
const src = stripComments(readFileSync(SRC, 'utf8'));

/**
 * The keys the PATCH accepts, read from its top-level schema object.
 *
 * Anchored on the schema that ends in the `.strict()` the route parses with — a `.strict()` body is exactly
 * the statement "these and no others", which is what makes it usable as the list.
 */
function patchKeys() {
  // Anchored on the NAME, not on a field that happens to be in it: a search for the first schema containing
  // `workerConcurrency` matched a nested block, and the floor below caught it before it could report clean
  // about four keys out of sixteen.
  const at = src.indexOf('const MediaConfigPatchSchema = z.object({');
  assert.ok(at > -1, 'could not find MediaConfigPatchSchema — re-anchor this gate');
  const end = src.indexOf('}).strict();', at);
  assert.ok(end > at, 'MediaConfigPatchSchema is not `.strict()` — the key list is no longer exhaustive');
  return [...src.slice(at, end).matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
}

/** What the GET hands back: the masked config, plus whatever the handler attaches by name. */
function getBody() {
  return bodyOf(src, 'mediaConfigRouter', 'the media-config GET handler')
    || src.slice(src.indexOf("mediaConfigRouter.get('/'"), src.indexOf('// ── PATCH'));
}

describe('the media-config read door returns what its write door accepts', () => {
  const keys = patchKeys();

  it('read a real schema', () => {
    // A floor: an empty key list passes the loop below without checking anything, and this schema has had
    // fifteen-odd blocks for several releases.
    assert.ok(keys.length >= 10, `only ${keys.length} PATCH keys parsed — the derivation is wrong, not the code`);
    assert.ok(keys.includes('modelSlots'), 'modelSlots is no longer patchable — re-anchor this gate');
  });

  it('every settable block is reachable from the GET', () => {
    /*
     * Two ways a key legitimately arrives in the response, and both count:
     *
     *  - it is part of `getMediaEmbeddingConfig()`, which the handler masks and returns wholesale; or
     *  - it lives elsewhere in the config and the handler ATTACHES it by name, the way `embedding` is.
     *
     * The second is the one that gets forgotten, and it is the only one a source read can see — so a key
     * that is neither in the media config type nor attached here is reported. A false positive would mean a
     * block moved into the media config without this gate knowing, which is a one-line fix to its list of
     * places to look; a false negative is a control that cannot be read back.
     */
    const mediaType = stripComments(readFileSync('server/src/config/types.ts', 'utf8'));
    const iface = bodyOf(mediaType, 'MediaEmbeddingConfig', 'MediaEmbeddingConfig');
    const body = getBody();
    const unreachable = keys.filter(k =>
      !new RegExp(`^\\s*${k}\\??\\s*:`, 'm').test(iface)      // not part of the masked config
      && !new RegExp(`\\['${k}'\\]\\s*=`).test(body));        // and not attached by the handler
    assert.deepEqual(unreachable, [],
      'these can be SET through the PATCH and never come back from the GET, so the control that writes them '
      + `renders empty on every page load and an operator cannot confirm what is stored: ${unreachable.join(', ')}`);
  });
});
