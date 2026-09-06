/**
 * The contradiction judge is now reachable from the admin surface — and reachable on the same terms as
 * every other model endpoint, not looser ones.
 *
 * Why this needed a test rather than "it mirrors the reranker":
 *
 * NLI was configurable by env and `config.json` from the first release and was never in the PATCH
 * schema, never probed by pipeline-status, and never on the Models screen. So it was the one model whose
 * absence produced a view that looks *finished*: an unreachable reranker gives worse ordering, an
 * unreachable judge gives an EMPTY Contradictions list, which is indistinguishable from "nothing
 * contradicts". Wiring it up means wiring up a genuine egress path — the judge is sent pairs of record
 * texts — so the guard rails have to come with it in the same commit, not after someone notices.
 *
 * Run: node --test testing/standalone/nli-config-surface.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MEDIA_CONFIG = readFileSync('server/src/api/media-config.ts', 'utf8');
const PIPELINE = readFileSync('server/src/api/pipeline-status.ts', 'utf8');
const MODELS_TAB = readFileSync('client/src/app/pages/settings/media-processing/models-tab.component.ts', 'utf8');
const STATE_SVC = readFileSync('client/src/app/pages/settings/media-processing/media-processing-state.service.ts', 'utf8');

describe('NLI is a first-class model surface', () => {
  describe('the PATCH route accepts it, on the same terms as the reranker', () => {
    it('is in the patch schema', () => {
      assert.match(MEDIA_CONFIG, /nli:\s*NliPatchSchema\.optional\(\)/);
    });

    it('baseUrl and model are NULLABLE, so the judge can be switched back off', () => {
      // There is no master toggle — clearing the endpoint is the off switch. A field that can only ever
      // be set would be a one-way door: configure it once and it can never be undone from the UI.
      const schema = MEDIA_CONFIG.slice(MEDIA_CONFIG.indexOf('const NliPatchSchema'));
      const body = schema.slice(0, schema.indexOf('}).strict()'));
      for (const f of ['baseUrl', 'model']) {
        assert.match(body, new RegExp(`${f}:[^\\n]*\\.nullable\\(\\)`), `${f} must be nullable`);
      }
    });

    it('refuses an env-locked block with 403 rather than silently ignoring the write', () => {
      assert.match(MEDIA_CONFIG, /locked\.has\('nli\.baseUrl'\)/);
      assert.match(MEDIA_CONFIG, /The contradiction judge is locked by infrastructure env vars/);
    });

    it('SSRF-checks the endpoint, and names the flag that would permit a private address', () => {
      // The same rule as every other model endpoint: a non-local URL is egress and must pass the guard.
      assert.match(MEDIA_CONFIG, /nliPatch\?\.baseUrl && !isLocalModelEndpoint\(nliPatch\.baseUrl\)/);
      assert.match(MEDIA_CONFIG, /nli\.baseUrl rejected/);
      // The hint is built by `privateAddressHint('nli')`, which names both the per-slot knob and the
      // instance-wide flag — and stays empty when the slot already permits private addresses, since then
      // the refusal was a crown jewel that no setting lifts.
      assert.match(MEDIA_CONFIG, /nli\.baseUrl rejected[^\n]*privateAddressHint\('nli'\)/);
    });

    it('routes the key to secrets.json and never lets it reach config.json', () => {
      assert.match(MEDIA_CONFIG, /sAny\.mediaEmbedding\.nliApiKey = nliApiKeyChange/);
      const merge = MEDIA_CONFIG.slice(MEDIA_CONFIG.indexOf('if (nliPatch) {'));
      assert.match(merge.slice(0, 400), /delete n\['apiKey'\]/,
        'the key must be stripped before the block is written to config.json');
    });

    it('masks the key on the way back out', () => {
      assert.match(MEDIA_CONFIG, /nli: cfg\.nli \? \{ \.\.\.cfg\.nli, apiKey: mask\(cfg\.nli\.apiKey\) \}/);
    });
  });

  describe('it is probed, so the card can show a real state', () => {
    it('is a model stage', () => {
      assert.match(PIPELINE, /key: 'nli', label: 'Contradiction judge'/);
    });

    it('its external flag is derived from the endpoint, not assumed', () => {
      // Assuming `external: false` would skip the SSRF-guarded fetch for a genuinely remote endpoint.
      assert.match(PIPELINE, /key: 'nli'[^\n]*external: !!media\.nli\?\.baseUrl && !isLocalModelEndpoint\(media\.nli\.baseUrl\)/);
    });
  });

  describe('the client wires every touchpoint, not most of them', () => {
    // A half-wired card renders, accepts edits, and quietly fails to save or to clear its key — which
    // looks like a working feature until someone checks whether the value stuck.
    const REQUIRED = [
      ["ModelCardId includes nli", /ModelCardId =[^;]*'nli'/],
      ["MODEL_CARDS includes nli", /MODEL_CARDS[^;]*'nli'/],
      ['a live nli handle', /get nli\(\): NliCfg/],
      ['lock lookup', /nliLocked\(field: string\)/],
      ['configured-means-on', /nliConfigured\(\)/],
      ['egress predicate', /nliIsExternal\(\)/],
      ['masked key stripped on load', /this\.form\.nli = \{ \.\.\.cfg\.nli, apiKey: undefined \}/],
      // Matched on the CASE and its payload rather than the whole expression: the block is now wrapped in
      // `withSlot(...)`, which adds this card's per-slot tuning to the same patch. The claim this gate makes
      // is that NLI has a save block of its own, and that is still exactly what it checks.
      ['per-card save block', /case 'nli': return withSlot\(\{ nli: base\.nli \}\)/],
      ['pending key resolution', /card === 'nli' \? this\.nliApiKeyInput/],
      ['key attached on save', /card === 'nli'\) block\.nli =/],
      ['key input cleared after save', /card === 'nli'\) \{ this\.nliApiKeyInput = ''/],
    ];
    for (const [what, re] of REQUIRED) {
      it(what, () => assert.match(STATE_SVC, re));
    }

    it('clearing the endpoint sends null, not an empty string', () => {
      // An empty string would be stored as a configured-but-blank endpoint — on, and broken.
      const block = STATE_SVC.slice(STATE_SVC.indexOf('nli: {'));
      assert.match(block.slice(0, 200), /baseUrl: this\.nli\.baseUrl \|\| null/);
      assert.match(block.slice(0, 200), /model: this\.nli\.model \|\| null/);
    });
  });

  describe('the card is on the Models screen', () => {
    it('exists, with a health dot', () => {
      assert.match(MODELS_TAB, /id="nli"/);
      assert.match(MODELS_TAB, /pipeline\.modelState\('nli'\)/);
    });

    it('warns before record text leaves the instance', () => {
      // The judge receives PAIRS OF RECORD TEXTS. That is a heavier egress than a search query, and the
      // warning is the only place a reader learns it.
      assert.match(MODELS_TAB, /s\.nliIsExternal\(\)/);
      assert.match(MODELS_TAB, /mediaProcessing\.nli\.egressWarning/);
    });

    it('uses a registered icon', () => {
      // An unregistered ph-icon name renders as nothing, with no error anywhere.
      const registry = readFileSync('client/src/app/shared/ph-icon.component.ts', 'utf8');
      const icon = /id="nli" icon="([a-z0-9-]+)"/.exec(MODELS_TAB)?.[1];
      assert.ok(icon, 'the nli card should declare an icon');
      assert.ok(registry.includes(`'${icon}'`) || registry.includes(`${icon}:`),
        `icon "${icon}" is not in the registry and would render blank`);
    });
  });

  describe('the office renderer card, missing for the same reason', () => {
    it('is on the Models screen with its env var named', () => {
      assert.match(MODELS_TAB, /id="doc-office"/);
      assert.match(MODELS_TAB, /envVar="RENDER_OFFICE_SIDECAR_URL"/);
    });

    it('uses a registered icon', () => {
      const registry = readFileSync('client/src/app/shared/ph-icon.component.ts', 'utf8');
      const icon = /id="doc-office" icon="([a-z0-9-]+)"/.exec(MODELS_TAB)?.[1];
      assert.ok(icon, 'the office card should declare an icon');
      assert.ok(registry.includes(`'${icon}'`) || registry.includes(`${icon}:`),
        `icon "${icon}" is not in the registry and would render blank`);
    });
  });

  describe('translations exist in every locale', () => {
    // A missing key renders as the key path itself, which is worse than English in a German UI.
    const LOCALES = ['en', 'de', 'pl'];
    const NEEDED = [
      'mediaProcessing.nli.title', 'mediaProcessing.nli.purpose', 'mediaProcessing.nli.pillOn',
      'mediaProcessing.nli.pillOff', 'mediaProcessing.nli.endpointHint', 'mediaProcessing.nli.egressWarning',
      'mediaProcessing.office.title', 'mediaProcessing.office.purpose',
      'about.components.pending',
    ];
    for (const loc of LOCALES) {
      it(loc, () => {
        const j = JSON.parse(readFileSync(`client/public/assets/i18n/${loc}.json`, 'utf8'));
        const missing = NEEDED.filter(k => !j[k]);
        assert.deepEqual(missing, [], `missing in ${loc}`);
      });
    }
  });

  describe('About renders its components card immediately', () => {
    it('has a pending branch, so the card does not appear out of nowhere', () => {
      const about = readFileSync('client/src/app/pages/settings/about.component.ts', 'utf8');
      assert.match(about, /@if \(!health\(\)\) \{/);
      assert.match(about, /about\.components\.pending/);
    });
  });
});
