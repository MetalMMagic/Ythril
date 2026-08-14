import type { Config, SecretsFile } from './types.js';
import { log } from '../util/log.js';

/**
 * Lift any provider API key still sitting in `config.json` into `secrets.json`, and delete it from the
 * config.
 *
 * `secrets.json` is written `0o600`; `config.json` is not, and it is the file an operator copies around,
 * pastes into an issue, and mounts as a ConfigMap. A key in there is the one deprecation in this release
 * that is a disclosure rather than an inconvenience — which is why it is MOVED rather than dropped.
 *
 * The Settings → Models page has written keys to `secrets.json` and deleted them from the config for some
 * time, so this only ever fires for an instance that has not saved that page since. That is exactly the
 * instance nobody is watching.
 *
 * An existing secret WINS and the config copy is discarded: the secrets file is the current store, so if
 * the two disagree the config value is by definition the older one. Returns whether anything moved, so the
 * caller knows to persist both files.
 */
export function migrateProviderApiKeysToSecrets(config: Config, secrets: SecretsFile): boolean {
  const media = config.mediaEmbedding as Record<string, { apiKey?: string } | undefined> | undefined;
  if (!media) return false;
  const PROVIDERS: ReadonlyArray<[string, 'visionApiKey' | 'sttApiKey' | 'nliApiKey' | 'rerankApiKey']> = [
    ['vision', 'visionApiKey'], ['stt', 'sttApiKey'], ['nli', 'nliApiKey'], ['rerank', 'rerankApiKey'],
  ];
  let moved = false;
  for (const [block, secretKey] of PROVIDERS) {
    const stored = media[block];
    if (!stored || typeof stored.apiKey !== 'string' || stored.apiKey === '') continue;
    secrets.mediaEmbedding ??= {};
    if (!secrets.mediaEmbedding[secretKey]) secrets.mediaEmbedding[secretKey] = stored.apiKey;
    delete stored.apiKey;
    moved = true;
  }
  return moved;
}

/**
 * Run the lift at boot and persist it, mirroring `migrateTokenRightsOnBoot`.
 *
 * Lives here rather than in `loadConfig` for the reason the god-file ratchet exists: the reasoning below is
 * longer than the call, and `config/loader.ts` is already frozen at a size it is supposed to come DOWN from.
 *
 * **`secrets.json` is written FIRST, deliberately.** If the process dies between the two writes this order
 * leaves the key in both files — which still resolves correctly and is cleaned up on the next boot. The other
 * order deletes the only copy, and the symptom is a provider that stops authorising for a reason nothing in
 * the config explains.
 *
 * Never throws: a failed write is logged and retried next boot, exactly like the other boot migrations. A
 * config rewrite is not worth refusing to start over.
 */
export function migrateProviderApiKeysOnBoot(
  config: Config,
  secrets: SecretsFile,
  saveSecrets: (s: SecretsFile) => void,
  saveConfig: (c: Config) => void,
): void {
  if (!migrateProviderApiKeysToSecrets(config, secrets)) return;
  try {
    saveSecrets(secrets);
    saveConfig(config);
    log.info('Moved provider API key(s) from config.json into secrets.json (0o600)');
  } catch (err) {
    log.warn(`Could not persist provider API key migration (will retry next boot): ${err}`);
  }
}
