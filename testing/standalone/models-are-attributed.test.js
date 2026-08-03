/**
 * A model baked into an image is redistributed, so it needs attribution like any other shipped component.
 *
 * ## The gap this closes — Legal & Compliance audit lens, finding 3
 *
 * `NOTICE` carefully distinguishes what Ythril *ships* from what an operator *pulls*. The Ollama entry says the
 * vision models "are pulled at runtime under their own licenses"; the faster-whisper-server entry says the image
 * "is **not bundled with or distributed by** Ythril". Both are correct and both are the right treatment.
 *
 * And the one model that IS bundled had no entry at all.
 *
 * `nomic-ai/nomic-embed-text-v1.5` is downloaded at image build time and baked in
 * (`MODEL_CACHE_DIR=/app/model-cache`) so a container embeds text on first boot with no network — the offline-start
 * guarantee the whole build is arranged around, and the reason that layer is the largest thing in the image. Every
 * user of a Ythril image receives a copy of those weights. It is Apache-2.0, so the obligation is attribution, and
 * the attribution was missing.
 *
 * Nothing in the product was wrong. What was missing is the record — the same shape as the other two findings from
 * this lens: a claim that could not be checked, and in this case an obligation nobody had written down.
 *
 * ## Why the source of truth is the Dockerfile
 *
 * "Which models ship" is not a list somebody maintains — it is whatever a Dockerfile downloads. So the gate reads
 * the Dockerfiles and requires each model identifier it finds to appear in NOTICE. Adding a model to an image is
 * then automatically a NOTICE change, which is the only ordering that stays true.
 *
 * Run: node --test testing/standalone/models-are-attributed.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Every Dockerfile in the repo — the main image plus any sidecar that builds one. */
function dockerfiles() {
  const out = [];
  if (existsSync(join(ROOT, 'Dockerfile'))) out.push('Dockerfile');
  const sidecars = join(ROOT, 'sidecars');
  if (existsSync(sidecars)) {
    for (const name of readdirSync(sidecars)) {
      const f = `sidecars/${name}/Dockerfile`;
      if (existsSync(join(ROOT, f))) out.push(f);
    }
  }
  return out;
}

/**
 * Model identifiers a Dockerfile downloads, as `org/model`.
 *
 * Matches the HuggingFace-style repo id, which is how every model this product loads is named. Restricted to ids
 * whose second half looks like a model rather than a source tree, so `ythril-network/Ythril` in a LABEL is not
 * mistaken for a model.
 */
function bakedModels(src) {
  const found = new Set();
  const RE = /\b([a-zA-Z0-9][\w.-]*)\/([\w.-]*(?:embed|whisper|moondream|clip|bge|gte|minilm|nli|rerank|llama|qwen|mistral|phi)[\w.-]*)\b/gi;
  // A source path is not a model id. `brain/embedding.ts` matched — a Dockerfile comment naming the file that
  // loads the model was reported as an unattributed model, which is the false positive that costs a gate its
  // credibility. No HuggingFace or Ollama id ends in a source-file extension, so this cannot hide a real one.
  const SOURCE_FILE = /\.(ts|tsx|js|mjs|cjs|json|py|md|yml|yaml|sh|css|scss|html)$/i;
  for (const m of src.matchAll(RE)) {
    if (SOURCE_FILE.test(m[2])) continue;
    found.add(`${m[1]}/${m[2]}`);
  }
  return [...found];
}

describe('the model-id detector, before it is trusted to judge anything', () => {
  it('finds a HuggingFace-style id in the shape the Dockerfile uses', () => {
    const line = 'const load = () => pipeline("feature-extraction", "nomic-ai/nomic-embed-text-v1.5", { dtype: "fp32" });';
    assert.deepEqual(bakedModels(line), ['nomic-ai/nomic-embed-text-v1.5']);
  });

  it('does not mistake a repo or image path for a model', () => {
    for (const line of [
      'LABEL org.opencontainers.image.source="https://github.com/ythril-network/Ythril"',
      'FROM node:22-slim@sha256:6c74791e',
      'COPY --from=builder /build/server/dist ./server/dist',
      'RUN npm ci --workspace=server --omit=dev',
      // A comment naming the file that loads the model. This one got through and reported `brain/embedding.ts`
      // as an unattributed model, so it is pinned as a case rather than left to the next reader to rediscover.
      '# `brain/embedding.ts` maps HF_HUB_OFFLINE onto env.allowRemoteModels itself.',
      'import { embed } from "../brain/embedding.js";',
    ]) assert.deepEqual(bakedModels(line), [], line);
  });
});

describe('every model baked into an image is attributed', () => {
  const files = dockerfiles();
  const notice = read('NOTICE');

  it('found the Dockerfiles — the walk still works', () => {
    assert.ok(files.includes('Dockerfile'), 'the main Dockerfile was not found');
    assert.ok(files.length >= 1, 'no Dockerfiles found at all');
  });

  it('the main image still bakes in the embedding model — the premise of this check', () => {
    // If this stops being true the gate is checking nothing, and "no models ship" would be a claim worth noticing
    // rather than silently passing.
    const models = bakedModels(read('Dockerfile'));
    assert.ok(models.length >= 1,
      'no model identifier found in the Dockerfile — either the model download moved, or the detector broke');
    assert.ok(models.some(m => m.includes('nomic-embed-text')),
      `expected the embedding model among ${JSON.stringify(models)}`);
  });

  it('each one has a NOTICE entry naming its licence', () => {
    const missing = [];
    for (const f of files) {
      for (const model of bakedModels(read(f))) {
        // The bare model name is enough to find the section — NOTICE headings are prose, not exact ids.
        const short = model.split('/')[1];
        const at = notice.indexOf(short);
        if (at < 0) { missing.push(`${model} (from ${f}) — no mention in NOTICE`); continue; }
        const section = notice.slice(Math.max(0, at - 400), at + 900);
        if (!/Licen[cs]e:/i.test(section)) missing.push(`${model} (from ${f}) — mentioned but no licence stated`);
      }
    }
    assert.deepEqual(missing, [], 'these model weights are baked into an image, so every user of that image '
      + `receives a copy — which is redistribution, whatever the licence:\n  ${missing.join('\n  ')}`);
  });

  it("the bundled model's entry says it is redistributed, not merely used", () => {
    // The distinction NOTICE already draws for Ollama and faster-whisper-server ("pulled independently", "not
    // bundled with or distributed by Ythril"). Drawing it the wrong way round for a model that DOES ship would be
    // worse than saying nothing, because it would read as a considered answer.
    // Scoped to THIS entry — from its heading to the next one — not to a character window around the name. A
    // ±(400,1200) window passed against a deliberate break because the neighbouring faster-whisper-server entry
    // says "Ythril does not redistribute the image", and `/redistribut/i` found that instead. Third time this
    // session that a loose slice let an assertion be satisfied by text it was not looking at.
    const heading = '### Bundled model weights: nomic-ai/nomic-embed-text-v1.5';
    const at = notice.indexOf(heading);
    assert.ok(at >= 0, 'the bundled embedding model has no NOTICE entry');
    const rest = notice.slice(at + heading.length);
    const next = rest.indexOf('\n### ');
    const section = next < 0 ? rest : rest.slice(0, next);
    assert.match(section, /Apache License 2\.0|Apache-2\.0/, "the bundled model's licence is not named");
    assert.match(section, /redistribut/i,
      'the entry must say the weights are redistributed — that is what separates it from the pulled models');
  });
});
