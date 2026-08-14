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

describe('the boot migration moves a key out of config.json', () => {
  it('moves every provider key and deletes it from the config', () => {
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
    // The whole point of the migration is that this path does not need to exist. Leaving it would keep a
    // credential in config.json working, so nobody would ever notice it was there.
    assert.ok(!/base\.(vision|stt|nli|rerank)\?\.apiKey/.test(src()),
      'a config.json fallback keeps the world-readable copy alive');
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
