/**
 * The legacy `mediaEmbedding` URL/model spellings are LIFTED, not dropped.
 *
 * ## Why dropping them would have been silent
 *
 * `ollamaUrl` / `visionModel` / `whisperUrl` / `whisperModel` were read as fallbacks behind `vision.*` and
 * `stt.*`. Removing the fallback alone does not produce an error — it produces a **default**: an instance
 * whose vision endpoint is configured as `mediaEmbedding.ollamaUrl` falls through to the built-in
 * `http://ollama:11434` and starts captioning against whatever answers there, or nothing at all.
 *
 * Nobody sees a message. Recall just quietly stops finding what images say, on an instance whose config file
 * still plainly names the endpoint the operator chose.
 *
 * ## The half that must NOT move
 *
 * The **env-var** spellings (`OLLAMA_URL`, `WHISPER_URL`, `WHISPER_MODEL`) are row 4.1 of
 * `_DEPRECATIONS.md` and are deliberately PERMANENT: *"breaking a documented env var to improve its
 * spelling is not a worthwhile trade, and an upgrade should never become an outage."* An operator's
 * manifest is not their `config.json`, and this migration must not reach into it — asserted below, because
 * "we removed the config aliases" is exactly the sentence that later grows "…and the env ones too".
 *
 * Run: node --test testing/standalone/media-provider-aliases-are-lifted.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let migrateMediaProviderAliases;

before(async () => {
  ({ migrateMediaProviderAliases } = await import('../../server/dist/config/migrate-media-aliases.js'));
});

const cfg = (media) => ({ spaces: [], mediaEmbedding: media });

describe('the boot migration lifts the config-file aliases', () => {
  it('moves all four onto their modern homes and deletes them', () => {
    // set-claim: the legacy config keys found in stored config.json files -- a closed HISTORICAL set that
    // cannot grow, because nothing writes them any more.
    const c = cfg({
      ollamaUrl: 'http://vision.internal:11434',
      visionModel: 'llava',
      whisperUrl: 'http://stt.internal:8000',
      whisperModel: 'large-v3',
    });

    assert.equal(migrateMediaProviderAliases(c), true);
    assert.deepEqual(c.mediaEmbedding.vision, { baseUrl: 'http://vision.internal:11434', model: 'llava' });
    assert.deepEqual(c.mediaEmbedding.stt, { baseUrl: 'http://stt.internal:8000', model: 'large-v3' });

    for (const k of ['ollamaUrl', 'visionModel', 'whisperUrl', 'whisperModel']) {
      assert.equal(k in c.mediaEmbedding, false, `${k} must be gone from the config`);
    }
  });

  it('the MODERN field wins, and the legacy key still goes', () => {
    // Only the modern spelling is written by the Settings UI, so a disagreement means the legacy value is
    // the older one. Leaving the legacy key behind would keep a stale endpoint visible in the config file
    // long after it stopped being used, which is its own kind of lie.
    const c = cfg({
      ollamaUrl: 'http://old.invalid:11434',
      vision: { baseUrl: 'http://current.invalid:11434' },
    });

    assert.equal(migrateMediaProviderAliases(c), true);
    assert.equal(c.mediaEmbedding.vision.baseUrl, 'http://current.invalid:11434');
    assert.equal('ollamaUrl' in c.mediaEmbedding, false);
  });

  it('an empty modern field is treated as unset', () => {
    // `{ baseUrl: '' }` is what a cleared form field leaves behind. Reading it as "already configured"
    // would discard the legacy value and resolve to the built-in default — the exact silent downgrade
    // this migration exists to prevent.
    const c = cfg({ whisperUrl: 'http://stt.internal:8000', stt: { baseUrl: '' } });
    assert.equal(migrateMediaProviderAliases(c), true);
    assert.equal(c.mediaEmbedding.stt.baseUrl, 'http://stt.internal:8000');
  });

  it('reports false when there is nothing to move, so no file is rewritten', () => {
    assert.equal(migrateMediaProviderAliases(cfg({ vision: { baseUrl: 'x' } })), false);
    assert.equal(migrateMediaProviderAliases(cfg({})), false);
    assert.equal(migrateMediaProviderAliases({ spaces: [] }), false);
    assert.equal(migrateMediaProviderAliases(cfg({ ollamaUrl: '' })), false,
      'an empty string is not a configured endpoint');
  });

  it('is idempotent — the second boot moves nothing', () => {
    const c = cfg({ ollamaUrl: 'http://vision.internal:11434' });
    assert.equal(migrateMediaProviderAliases(c), true);
    assert.equal(migrateMediaProviderAliases(c), false);
  });
});

describe('the read fallbacks are gone, and the env aliases are untouched', () => {
  const strip = src => src.replace(/(^|[^:])\/\/.*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
  const loader = () => strip(readFileSync('server/src/config/loader.ts', 'utf8'));

  it('no provider resolves from a legacy config spelling any more', () => {
    // set-claim: the same closed historical set as the migration case above, asserted from the other end.
    const s = loader();
    for (const legacy of ['ollamaUrl', 'visionModel', 'whisperUrl', 'whisperModel']) {
      assert.ok(!new RegExp(`base\\.${legacy}`).test(s),
        `base.${legacy} is still read — the migration then has nothing to fix, and the alias never dies`);
    }
  });

  it('the modern fields are still read, so the check above is not passing on an empty file', () => {
    const s = loader();
    assert.match(s, /base\.vision\?\.baseUrl/);
    assert.match(s, /base\.stt\?\.model/);
  });

  it('the env half is a SEPARATE decision, and this migration still does not touch it', () => {
    /*
     * This case asserted that the env aliases were PERMANENT and that `RENAMED_ENV_VARS` must still exist.
     * The owner reversed that on 2026-09-02: 4.0 removed the three names, and they refuse the boot now
     * (`env-removed.ts`). So the assertion about the table is gone — it was pinning a decision, not a rule.
     *
     * **What survives is the rule underneath it, and it is the more valuable half:** the config-FILE
     * migration and the env-var names are two different mechanisms with two different answers, and they are
     * easy to conflate. `config.json` is a file the product owns, so its legacy keys are LIFTED and deleted.
     * A manifest is the operator's, so its legacy names are refused with a message rather than rewritten
     * behind their back. This migration must therefore never read the environment — if it did, the two
     * decisions would collapse into whichever one it happened to implement.
     */
    const mig = strip(readFileSync('server/src/config/migrate-media-aliases.ts', 'utf8'));
    assert.ok(!/process\.env/.test(mig),
      'the config migration must not touch environment variables — the env half is refused, not lifted');

    // And the refusal is where it says it is, so this suite fails if the two halves are ever merged.
    const removed = strip(readFileSync('server/src/config/env-removed.ts', 'utf8'));
    assert.match(removed, /OLLAMA_URL/, 'the removed env names must be declared in env-removed.ts');
  });
});
