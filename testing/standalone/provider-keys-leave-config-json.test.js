/**
 * A provider API key does not stay in `config.json`.
 *
 * ## Why this is the one removal in 3.0 that is a disclosure
 *
 * `secrets.json` is written `0o600`. `config.json` is not, and it is the file an operator copies between
 * machines, pastes into an issue, and mounts as a ConfigMap. Every other row on the deprecation checklist
 * removes an inconvenience; this one removes a credential from a world-readable file.
 *
 * So the fallback is **moved**, not dropped. Deleting the read path alone would have been a silent provider
 * outage for any instance still holding its key there — vision or speech-to-text quietly failing
 * authorization on a config that had worked the day before.
 *
 * ## What the sweep found
 *
 * This row was NOT in `_DEPRECATIONS.md`. `config/loader.ts` carried the comment
 * `// API keys: env var > secrets.json > legacy config.json (deprecated)` and nothing tracked it. The
 * Settings → Models page has written keys to `secrets.json` and deleted them from the config for some time,
 * so the only instances affected are those that have not saved that page since — which is exactly the set
 * nobody is watching.
 *
 * ## What the 4.0 sweep found: the FIFTH provider was never in the migration
 *
 * The rule below — no provider resolves a key from the stored config, because a fallback keeps the
 * world-readable copy working and therefore invisible — was asserted for `vision`, `stt`, `nli` and
 * `rerank`. It was asserted by NAME, and `embedding` is not one of those four names.
 *
 * `getEmbeddingConfig` resolved `apiKey: embApiKey ?? base.apiKey`, so the text-embedding key WAS read from
 * `config.json`. The migration did not lift it, and a modern save writes the new key to `secrets.json`
 * without deleting the inline one — so the stale copy sits in a file that is not `0o600` for ever, invisible
 * because the secrets value wins the resolution. Two comments three lines apart said otherwise: *"env >
 * secrets.json > legacy inline config. Never surfaced from config.json"* contradicts itself, and
 * `getEmbeddingApiKey`'s docblock claimed two arms where the code had three.
 *
 * **The assertions are derived from the SHAPE now, not from a list of four names** — the fifth provider is
 * exactly what a name list cannot see, and the sixth would be too.
 *
 * ## Why this one loses its fallback while the four config migrations of 4.0 KEEP theirs
 *
 * Those four stay because their write can fail: the migration warns *"will retry next boot"*, and until it
 * succeeds the in-memory fix is the only thing standing between a stale key and a wrong default. Removing
 * them would leave a real hole.
 *
 * This one is different in a way that is easy to miss. `migrateProviderApiKeysToSecrets` mutates the
 * in-memory SECRETS object before either file is written, and it runs inside `loadConfig` — before anything
 * calls a resolver. So the value the resolver finds is already in the right place whether or not the disk
 * write succeeded, and the `config.json` arm is genuinely unreachable rather than merely unlikely. That is
 * what makes deleting it safe here and unsafe there.
 *
 * Run: node --test testing/standalone/provider-keys-leave-config-json.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let migrateProviderApiKeysToSecrets;

before(async () => {
  ({ migrateProviderApiKeysToSecrets } = await import('../../server/dist/config/migrate-provider-keys.js'));
});

const cfg = (media) => ({ spaces: [], mediaEmbedding: media });

/**
 * A config-fallback arm on an API key: `apiKey: <something> ?? base…` or `?? cfg…`.
 *
 * Derived from the SHAPE rather than from the four provider names, which is what let `embedding` slip
 * through for a release. A name list cannot see the fifth provider, and would not see a sixth.
 */
const CONFIG_FALLBACK = /apiKey:\s*[^,;\r\n]*\?\?\s*(base|cfg)\b[^,;\r\n]*/g;

describe('the boot migration moves a key out of config.json', () => {
  it('moves every provider key and deletes it from the config', () => {
    // set-claim: the blocks this case just WROTE into its own fixture config, so it reads back what it
    // put in. The whole-set question is asked by the shape-derived CONFIG_FALLBACK sweep further down.
    const c = cfg({
      vision: { baseUrl: 'https://v.invalid', apiKey: 'sk-vision' },
      stt: { apiKey: 'sk-stt' },
      nli: { apiKey: 'sk-nli' },
      rerank: { apiKey: 'sk-rerank' },
    });
    const s = { peerTokens: {} };

    assert.equal(migrateProviderApiKeysToSecrets(c, s), true);
    assert.deepEqual(s.mediaEmbedding, {
      visionApiKey: 'sk-vision', sttApiKey: 'sk-stt', nliApiKey: 'sk-nli', rerankApiKey: 'sk-rerank',
    });

    // Deleted, not blanked: an empty string is still a key-shaped field in a file people read.
    for (const block of ['vision', 'stt', 'nli', 'rerank']) {
      assert.equal('apiKey' in c.mediaEmbedding[block], false, `${block}.apiKey must be gone from the config`);
    }
    // And nothing else about the block is disturbed.
    assert.equal(c.mediaEmbedding.vision.baseUrl, 'https://v.invalid');
  });

  it('an existing secret WINS, and the config copy is still removed', () => {
    // The two disagreeing means the config value is the older one — `secrets.json` is the current store.
    // Keeping the config copy "just in case" would leave the credential in the file this exists to clear.
    const c = cfg({ vision: { apiKey: 'sk-stale' } });
    const s = { peerTokens: {}, mediaEmbedding: { visionApiKey: 'sk-current' } };

    assert.equal(migrateProviderApiKeysToSecrets(c, s), true);
    assert.equal(s.mediaEmbedding.visionApiKey, 'sk-current', 'the newer secret must not be overwritten');
    assert.equal('apiKey' in c.mediaEmbedding.vision, false);
  });

  it('reports false when there is nothing to move, so no file is rewritten', () => {
    // A migration that returns true on every boot rewrites config.json for ever, which is its own defect.
    assert.equal(migrateProviderApiKeysToSecrets(cfg({ vision: { baseUrl: 'x' } }), { peerTokens: {} }), false);
    assert.equal(migrateProviderApiKeysToSecrets(cfg({}), { peerTokens: {} }), false);
    assert.equal(migrateProviderApiKeysToSecrets({ spaces: [] }, { peerTokens: {} }), false);
    assert.equal(migrateProviderApiKeysToSecrets(cfg({ vision: { apiKey: '' } }), { peerTokens: {} }), false,
      'an empty string is not a key — moving it would create a secrets entry meaning nothing');
  });

  it('is idempotent — the second boot moves nothing', () => {
    const c = cfg({ vision: { apiKey: 'sk-vision' } });
    const s = { peerTokens: {} };
    assert.equal(migrateProviderApiKeysToSecrets(c, s), true);
    assert.equal(migrateProviderApiKeysToSecrets(c, s), false);
  });
});

describe('the legacy read path is gone, and the boot order is safe', () => {
  const strip = src => src.replace(/(^|[^:])\/\/.*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
  const src = () => strip(readFileSync('server/src/config/loader.ts', 'utf8'));
  // The boot wrapper lives beside the migration, not in the frozen loader — so the ordering check has to
  // read the file that actually performs the two writes.
  const mig = () => strip(readFileSync('server/src/config/migrate-provider-keys.ts', 'utf8'));

  it('no provider resolves its key from the stored config any more', () => {
    /*
     * The whole point of the migration is that this path does not need to exist. Leaving it keeps a
     * credential in config.json working, so nobody ever notices it is there.
     *
     * Derived from the SHAPE rather than from the four provider names, which is what let `embedding` slip
     * through for a release: any `apiKey` resolved with a `?? base…` or `?? cfg…` arm is a config fallback,
     * whatever the block is called. A name list cannot see the fifth provider, and would not see a sixth.
     */
    const configFallbacks = [...src().matchAll(CONFIG_FALLBACK)].map(m => m[0].trim());
    assert.deepEqual(configFallbacks, [],
      'These resolve an API key from the stored config, which keeps a world-readable copy alive and '
      + 'invisible (the secrets value wins, so nobody sees the stale one):\n  '
      + configFallbacks.join('\n  '));
  });

  it('and the check fires on the spelling that was actually there', () => {
    // Mutation-check: the shape rule has to match the line this sweep found, not just the ones it expected.
    // Built fresh rather than reused: a shared /g regex advances `lastIndex` between `assert.match` calls,
    // and the third assertion would then pass by looking at nothing.
    const re = new RegExp(CONFIG_FALLBACK.source);
    assert.match('    apiKey: embApiKey ?? base.apiKey,', re);
    assert.match('  apiKey: visionApiKeyEnv ?? cfg.mediaEmbedding.vision.apiKey,', re);
    // And must not fire on a resolution that stops at secrets.
    assert.doesNotMatch('    apiKey: visionApiKeyEnv ?? mediaSecrets.visionApiKey,', re);
  });

  it('the text-embedding key is lifted like the other four', () => {
    // The fifth provider. Its key lived at the TOP level of both files, not under `mediaEmbedding`, which
    // is why every name-keyed sweep walked past it.
    const c = { spaces: [], embedding: { provider: 'external', model: 'nomic', apiKey: 'sk-embedding' } };
    const s = { peerTokens: {} };
    assert.equal(migrateProviderApiKeysToSecrets(c, s), true);
    assert.equal(s.embedding?.apiKey, 'sk-embedding', 'it must land in secrets.embedding.apiKey');
    assert.equal('apiKey' in c.embedding, false, 'and be deleted from the config');
    assert.equal(c.embedding.model, 'nomic', 'without disturbing the rest of the block');
  });

  it('an existing embedding secret wins, and the config copy still goes', () => {
    const c = { spaces: [], embedding: { apiKey: 'sk-old-inline' } };
    const s = { embedding: { apiKey: 'sk-current' } };
    assert.equal(migrateProviderApiKeysToSecrets(c, s), true);
    assert.equal(s.embedding.apiKey, 'sk-current', 'secrets.json is the current store');
    assert.equal('apiKey' in c.embedding, false);
  });

  it('and a config with no embedding block at all is a no-op', () => {
    const c = { spaces: [], mediaEmbedding: {} };
    assert.equal(migrateProviderApiKeysToSecrets(c, { peerTokens: {} }), false);
  });

  it('all four still resolve from env and from secrets', () => {
    const s = src();
    for (const [envVar, secretKey] of [['visionApiKeyEnv', 'visionApiKey'], ['sttApiKeyEnv', 'sttApiKey'],
      ['nliApiKeyEnv', 'nliApiKey'], ['rerankApiKeyEnv', 'rerankApiKey']]) {
      assert.ok(new RegExp(`apiKey: ${envVar} \\?\\? mediaSecrets\\.${secretKey}`).test(s),
        `${secretKey} must still come from the env var first, then secrets.json`);
    }
  });

  it('secrets.json is written BEFORE config.json', () => {
    // If the process dies between the two writes, this order leaves the key in BOTH files — which still
    // resolves correctly and gets cleaned up next boot. The other order loses the key outright, and the
    // symptom is a provider that stops authorising for a reason nothing in the config explains.
    const s = mig();
    const block = s.slice(s.indexOf('if (!migrateProviderApiKeysToSecrets(config, secrets)) return;'));
    const saveSecretsAt = block.indexOf('saveSecrets(secrets)');
    const saveConfigAt = block.indexOf('saveConfig(config)');
    assert.ok(saveSecretsAt > 0 && saveConfigAt > 0, 'both writes must be in the migration block');
    assert.ok(saveSecretsAt < saveConfigAt,
      'writing config.json first can delete the only copy of the key');
  });
});
