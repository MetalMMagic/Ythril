/**
 * One base URL, every OpenAI-compatible slot.
 *
 * ## What was wrong
 *
 * Five slots derived their own request URL from the operator's base, and had arrived at three
 * incompatible rules for the same server:
 *
 *     vision            ${base}/chat/completions          -> base MUST carry /v1
 *     assist model      ${base}/v1/chat/completions       -> base must NOT carry /v1
 *     text embedding    ${base}/v1/embeddings             -> base must NOT carry /v1
 *     speech-to-text    ${base}/v1/audio/transcriptions   -> base must NOT carry /v1   (fixed in #588)
 *     the probe         normalizeOpenAiBase(base)/models  -> either
 *
 * So an operator running one server for several slots had no spelling that satisfied them all, which is
 * the configuration a reporter had to invent: two base URLs for one host, to keep vision and assist
 * working at the same time.
 *
 * The probe is what makes this dangerous rather than merely annoying. It normalises, so it agrees with
 * whichever half happens to match: the Models card goes green off `/v1/models` while every embed 404s on
 * `/v1/v1/embeddings` — and a failing embedder does not announce itself, it surfaces as recall returning
 * nothing.
 *
 * ## What this pins
 *
 * The route paths are spelled in ONE module, every builder normalises, and no other file in the server
 * re-spells a route. The last part is the one that matters: the fix has now been applied slot-by-slot
 * three times (#562 vision, #588 speech, this one for assist and embedding), each time because a new
 * caller concatenated its own path.
 *
 * Run: node --test testing/standalone/openai-base-one-rule.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const ROUTES_SRC = 'server/src/files/converters/vlm-endpoint.ts';

const {
  normalizeOpenAiBase, chatUrlFor, listUrlFor, embeddingsUrlFor, transcriptionsUrlFor,
} = await import('../../server/dist/files/converters/vlm-endpoint.js');

/** Strip comments — a route path quoted in prose is documentation, not a second derivation. */
const strip = src => src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('every OpenAI route builder normalises the base', () => {
  // The three spellings an operator plausibly types. `…/v1` is the documented OpenAI form and what the
  // vision and assist cards' own placeholder text shows.
  const spellings = ['http://srv:8080', 'http://srv:8080/v1', 'http://srv:8080/v1/'];

  for (const [name, build, expected] of [
    ['chatUrlFor', b => chatUrlFor('openai', b), 'http://srv:8080/v1/chat/completions'],
    ['listUrlFor', b => listUrlFor('openai', b), 'http://srv:8080/v1/models'],
    ['embeddingsUrlFor', embeddingsUrlFor, 'http://srv:8080/v1/embeddings'],
    ['transcriptionsUrlFor', transcriptionsUrlFor, 'http://srv:8080/v1/audio/transcriptions'],
  ]) {
    it(`${name} lands on one place for every spelling of the base`, () => {
      for (const s of spellings) {
        assert.equal(build(s), expected, `spelling: ${s}`);
      }
    });
  }

  it('never produces /v1/v1, which is the 404 every one of these bugs produced', () => {
    for (const s of spellings) {
      for (const url of [chatUrlFor('openai', s), listUrlFor('openai', s), embeddingsUrlFor(s), transcriptionsUrlFor(s)]) {
        assert.ok(!url.includes('/v1/v1'), url);
      }
    }
  });

  it('leaves the Ollama wire alone — its routes live under /api, with no /v1 anywhere', () => {
    assert.equal(chatUrlFor('ollama', 'http://ollama:11434'), 'http://ollama:11434/api/chat');
    assert.equal(listUrlFor('ollama', 'http://ollama:11434/'), 'http://ollama:11434/api/tags');
  });

  it('normalizeOpenAiBase is idempotent — running it twice cannot add a second /v1', () => {
    const once = normalizeOpenAiBase('http://srv:8080');
    assert.equal(normalizeOpenAiBase(once), once);
  });
});

describe('no other file re-spells a route', () => {
  /**
   * The routes are read OUT of the module that owns them rather than listed here.
   *
   * A hand-listed set is what let this recur: each fix covered the paths someone remembered. Enumerating
   * from the source means a fifth route added to `vlm-endpoint.ts` tomorrow is covered by this gate the
   * moment it exists.
   */
  const routes = [...new Set(
    [...strip(readFileSync(ROUTES_SRC, 'utf8')).matchAll(/`\$\{[^`]*?\}(\/[a-z0-9/-]+)`/g)].map(m => m[1]),
  )]
    // `/v1` is the version prefix `normalizeOpenAiBase` appends, not a route. Left in, it would flag the
    // normaliser's own callers — and `/v1/rerank`, where the prefix is part of a deliberate dialect signal.
    .filter(r => r !== '/v1');

  it('the route table was actually found', () => {
    // If the regex stops matching, every assertion below passes vacuously — which is how a gate becomes
    // decoration. Assert the shape of what was enumerated, not just that it is non-empty.
    assert.ok(routes.length >= 4, `expected at least 4 route paths, enumerated ${routes.length}: ${routes}`);
    for (const r of ['/chat/completions', '/models', '/embeddings', '/audio/transcriptions']) {
      assert.ok(routes.includes(r), `${r} should have been enumerated from ${ROUTES_SRC}: got ${routes}`);
    }
  });

  /**
   * `rerank-client.ts` is the one file allowed to spell `/v1/rerank`, and the reason is factual rather
   * than historical: two incompatible rerank dialects are in wide use, and there the operator's URL
   * DECLARES which one — `…/rerank` is read as TEI, `…/v1/rerank` as Cohere, a bare host gets
   * `/v1/rerank` appended. It already handles the path being present, so it cannot double it. Normalising
   * that URL would erase the signal the dialect choice depends on.
   */
  const EXEMPT = new Map([['server/src/brain/rerank-client.ts', '/rerank']]);

  it('every OpenAI route path in the server comes from the one module', () => {
    const files = globSync('server/src/**/*.ts').filter(f => !f.replace(/\\/g, '/').endsWith(ROUTES_SRC));
    const offenders = [];
    for (const file of files) {
      const rel = file.replace(/\\/g, '/');
      const src = strip(readFileSync(file, 'utf8'));
      for (const route of routes) {
        if (EXEMPT.get(rel) === route) continue;
        // A route appended directly to an interpolated base. The optional `/v1` is not optional
        // decoration: the first version of this gate matched `}${route}` only, so it caught the vision
        // shape (`${base}/chat/completions`) and MISSED both shapes it was written for
        // (`${base}/v1/embeddings`, `${base}/v1/chat/completions`) — passing vacuously on the exact code
        // that prompted it. Mutation-checked in both spellings since.
        if (new RegExp(`\\}(?:/v1)?${route.replace(/\//g, '\\/')}`).test(src)) {
          offenders.push(`${rel} builds ${route} itself`);
        }
      }
    }
    assert.deepEqual(offenders, [],
      `derive these from vlm-endpoint.ts (chatUrlFor / listUrlFor / embeddingsUrlFor / transcriptionsUrlFor):\n${offenders.join('\n')}`);
  });
});
