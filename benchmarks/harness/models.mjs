/**
 * The benchmark's model client — Anthropic, OpenAI, and any OpenAI-compatible local endpoint.
 *
 * Contract: `benchmarks/harness/CONTRACTS.md` § `models.mjs`.
 *
 *     makeClient({ provider, model, apiKey, concurrency, maxUsd, maxCalls, onSpend })
 *       -> { complete({ system, user, maxTokens }) -> { text, usage: {in, out}, cached }, spent(), calls() }
 *
 * ## Why this file refuses so much
 *
 * A benchmark's credibility is entirely in its method, and every silent fallback in a model client is a hole in
 * that method that the results table cannot show. The three that matter here:
 *
 * - **A substituted model.** If the pinned judge is retired and the client quietly uses whatever the account can
 *   reach, the published number is for a model nobody pinned and nobody can re-derive. So the model id is checked
 *   against the endpoint's own catalogue before the first prompt is sent, and an ALIAS that resolves to a
 *   different id is refused too — see `assertModelAvailable`.
 * - **A defaulted parameter.** `temperature` and `max_tokens` move scores. Both come from a declared source or
 *   the call refuses; neither has a default in this file.
 * - **A price the code believes.** Prices are read from `pins.json`, never written here, so a price change is a
 *   pin change and the pin is what the results file records.
 *
 * ## Budget, and why the stop is BEFORE the request
 *
 * `maxUsd` / `maxCalls` throw `BudgetExhausted` at the point of reservation — before any HTTP request exists.
 * That ordering is the whole feature: the cache holds every completed call and nothing half-written, so the run
 * resumes by re-running the same command with a bigger budget and pays only for what it had not reached. A stop
 * that fired after the response arrived would drop a paid answer on the floor.
 *
 * Concurrent callers reserve their projected cost synchronously (JavaScript's single thread makes the
 * check-and-reserve atomic), so N in-flight calls cannot collectively walk past the cap. Reserving the OUTPUT
 * side at `maxTokens` rather than at a guessed length is deliberate: a reservation that assumes a short answer
 * does not bound anything.
 *
 * ## What `estimate: true` is and is not
 *
 * It runs the whole pipeline with zero network traffic and accumulates the projected spend, so `--estimate` can
 * price a run before it is authorised. Two honest limits, both by design:
 *
 * - It cannot tell you the pinned model is reachable; that check needs the network. The first real call will.
 * - It does NOT consult the cache, so a resumed run costs less than its estimate. The alternative — calling
 *   `withCache` in estimate mode — would have WRITTEN estimate placeholders (empty text) into the cache, and a
 *   later real run would have served them as model answers. An estimate that reads slightly high is worth a
 *   great deal more than a cache that can poison a result.
 *
 * Budget limits are recorded but NOT enforced under `estimate`, because stopping at the cap would hide how far
 * over the cap the run actually is, which is the one number the mode exists to produce. `stats().overBudget`
 * says whether it went over.
 */

import { readFileSync } from 'node:fs';

// ── Tunables, all named ────────────────────────────────────────────────────

/**
 * Two, not one and not eight.
 *
 * The answerer and the judge share one account's rate limit, and a 429 storm costs more wall-clock than the
 * parallelism saves once backoff starts stacking. Two keeps the pipeline busy through the latency of a single
 * long completion while making a burst refusal unlikely. `run.mjs` passes `--concurrency` explicitly, so this
 * default only governs a client constructed by hand.
 */
const DEFAULT_CONCURRENCY = 2;

/**
 * Per-ATTEMPT timeout. A long completion at a high `max_tokens` genuinely takes a minute; a request that has
 * gone quiet for three is not coming back, and without this bound it would hold a concurrency slot for the rest
 * of the run — the whole harness stalls behind one socket, and it looks like a slow model rather than a hang.
 */
const DEFAULT_TIMEOUT_MS = 180_000;

/**
 * Five retries, and these delays are deliberately LARGE — the opposite call to `server/src/brain/embedding.ts`,
 * which retries a rate-limited embedding at 120 ms and 360 ms.
 *
 * That file sits inside `recall`, where a user is waiting behind an operator-set deadline and a slow partial
 * answer is worse than a clear failure. Here nobody is waiting: the run is a batch job measured in hours, and a
 * lost call is a hole in a published result. So the trade goes the other way — wait out the rate limit, and
 * spend up to about half a minute doing it, rather than turn a busy minute into a missing data point.
 */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

/**
 * Statuses where trying again is the right move, and nothing else.
 *
 * A 400 or 422 means the REQUEST is wrong and will be wrong on every attempt; retrying it turns one visible bug
 * into five slow ones. A 401 or 403 retried is a lockout waiting to happen. 404 here means the model is gone,
 * which is precisely the condition this file must not paper over.
 */
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

/**
 * A `Retry-After` longer than this is refused rather than honoured.
 *
 * Sleeping for the quarter of an hour some gateways ask for is indistinguishable from a hang: no output, no
 * progress, and an operator kills the run without knowing why. Failing with the requested delay in the message
 * lets them decide whether to wait.
 */
const MAX_RETRY_AFTER_MS = 60_000;

/**
 * The characters-per-token ratio used for every estimate in this file.
 *
 * Four is the usual English approximation and it is what `benchmarks/pins.json` already used to size the
 * dialogue (`dialogueTokensApprox.$method`), so the two figures are comparable rather than two different
 * approximations of the same run. It is an APPROXIMATION and nothing published should quote it: real tokenizers
 * disagree with it by roughly ±15% on prose and much more on code, ids and non-Latin script. `usage` returned
 * from a real call is always the provider's own count, never this.
 */
const CHARS_PER_TOKEN = 4;

/** Overhead the provider adds around the prompt — role framing, system delimiters, the message envelope. */
const ENVELOPE_TOKENS = 8;

// ── Errors ─────────────────────────────────────────────────────────────────

/**
 * The budget stop. Thrown before the request is built, so nothing was spent and nothing was written.
 *
 * `reason` separates the two caps because the fix differs: `usd` means raise `--max-usd` or narrow the run,
 * `calls` means the run is issuing more calls than anyone expected and that is usually a harness bug.
 */
export class BudgetExhausted extends Error {
  constructor(reason, { spentUsd, maxUsd, calls, maxCalls, wouldSpendUsd }) {
    super(
      reason === 'usd'
        ? `Budget exhausted: $${spentUsd.toFixed(4)} spent and this call reserves $${wouldSpendUsd.toFixed(4)}, `
          + `over the $${maxUsd} cap. ${calls} calls completed; the cache holds them, so re-running with a `
          + 'higher --max-usd resumes rather than repeats.'
        : `Budget exhausted: ${calls} calls issued of ${maxCalls} allowed. The cache holds them, so re-running `
          + 'with a higher --max-calls resumes rather than repeats.',
    );
    this.name = 'BudgetExhausted';
    this.reason = reason;
    this.spentUsd = spentUsd;
    this.maxUsd = maxUsd;
    this.calls = calls;
    this.maxCalls = maxCalls;
  }
}

/** The pinned model is not what the endpoint offers. Never recoverable by substituting — that is the point. */
export class ModelUnavailable extends Error {
  constructor(message, { provider, model, baseUrl, resolvedId = null, offered = null }) {
    super(message);
    this.name = 'ModelUnavailable';
    this.provider = provider;
    this.model = model;
    this.baseUrl = baseUrl;
    /** Set when the endpoint answered about a DIFFERENT id — an alias that resolved to a snapshot. */
    this.resolvedId = resolvedId;
    /** Set for endpoints that list their catalogue, so the message can show the id you nearly typed. */
    this.offered = offered;
  }
}

/** A request that failed for a reason retrying cannot fix, or that exhausted its retries. */
export class ModelCallFailed extends Error {
  constructor(message, { status = null, body = '', url, attempts }) {
    super(message);
    this.name = 'ModelCallFailed';
    this.status = status;
    this.body = body;
    this.url = url;
    this.attempts = attempts;
  }
}

// ── Token estimation ───────────────────────────────────────────────────────

/**
 * Approximate a prompt's token count from its characters. See `CHARS_PER_TOKEN` for the ratio and its error bar.
 *
 * Used for the pre-call budget reservation and for `estimate: true`. Never used to report usage: a reported
 * figure that is really an approximation is the kind of number that ends up in a comparison table.
 */
export function estimateTokens(text) {
  if (typeof text !== 'string') throw new TypeError('estimateTokens expects a string');
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ── Concurrency ────────────────────────────────────────────────────────────

/**
 * A slot-passing semaphore.
 *
 * The slot is HANDED to the next waiter rather than released and re-acquired. Decrementing the active count
 * first and then waking a waiter opens a gap in which a freshly arriving caller sees a free slot, takes it, and
 * the woken waiter takes one too — the limit is briefly exceeded by one. That over-admission is exactly the
 * burst the limit exists to prevent, and it would show up as an unexplained 429 rather than as a bug here.
 */
function makeSemaphore(limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError(`concurrency must be a positive integer, received ${JSON.stringify(limit)}`);
  }
  let active = 0;
  const waiting = [];
  return async function withSlot(fn) {
    if (active >= limit) await new Promise(resolve => waiting.push(resolve));
    else active++;
    try {
      return await fn();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Half the delay as a fixed floor, half as jitter, so concurrent callers do not retry in lockstep. */
function jittered(baseMs) {
  return Math.round(baseMs / 2 + Math.random() * (baseMs / 2));
}

function retryAfterMs(response) {
  const raw = response.headers.get('retry-after');
  if (!raw) return null;
  const seconds = Number(raw.trim());
  // Only the plain-seconds form. The HTTP-date form is legal and we do not honour it: parsing a date against
  // our own clock to decide how long to sleep is more ways to be wrong than the feature is worth, and the
  // backoff table below is a safe fallback.
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

// ── Providers ──────────────────────────────────────────────────────────────

/**
 * The three surfaces, each stating its own defaults so nothing is inferred from the model id.
 *
 * `local` is the OpenAI wire format against an endpoint the operator names, and it differs from `openai` in
 * exactly two respects, both recorded here rather than guessed at call time:
 *
 * - It sends `max_tokens`, not `max_completion_tokens`. OpenAI deprecated the former and its reasoning models
 *   reject it; llama.cpp, Ollama and older vLLM builds only understand it. There is no field that works on both,
 *   so the provider decides, and pinning `provider: "local"` is how you say which server you are talking to.
 * - Its API key is optional and the header is OMITTED when there is none, rather than sent as an empty or
 *   placeholder value. A server that treats `Bearer ` as a valid anonymous key today may not tomorrow.
 */
const PROVIDERS = {
  anthropic: {
    defaultBaseUrl: 'https://api.anthropic.com',
    baseUrlEnv: 'ANTHROPIC_BASE_URL',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    apiKeyRequired: true,
    supportsSeed: false,

    headers(apiKey) {
      return {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      };
    },

    completionUrl: base => `${base}/v1/messages`,

    body({ model, system, user, maxTokens, temperature }) {
      const b = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: user }],
      };
      // Omitted rather than sent as '' — an empty system prompt is a different prompt from no system prompt,
      // and `prompts/` is where the harness's prompts are supposed to be visible.
      if (system !== undefined) b.system = system;
      return b;
    },

    parse(json) {
      const blocks = Array.isArray(json?.content) ? json.content : [];
      const text = blocks.filter(b => b?.type === 'text').map(b => b.text ?? '').join('');
      const u = json?.usage ?? {};
      // Prompt-cache tokens are folded into the input count. We never send `cache_control`, so these are 0 in
      // practice; if a gateway introduces caching underneath us the run is over-priced rather than under-priced,
      // and over-pricing is the direction a budget cap can survive.
      const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      return {
        text,
        usage: { in: input, out: u.output_tokens ?? 0 },
        stopReason: json?.stop_reason ?? null,
        truncated: json?.stop_reason === 'max_tokens',
      };
    },

    /** `GET /v1/models/{id}` answers with the canonical id, which is what makes alias detection possible. */
    availability(base, model) {
      return { url: `${base}/v1/models/${encodeURIComponent(model)}`, kind: 'one' };
    },
  },

  openai: {
    defaultBaseUrl: 'https://api.openai.com',
    baseUrlEnv: 'OPENAI_BASE_URL',
    apiKeyEnv: 'OPENAI_API_KEY',
    apiKeyRequired: true,
    supportsSeed: true,
    maxTokensField: 'max_completion_tokens',
    headers(apiKey) {
      return { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
    },
    completionUrl: base => `${base}/v1/chat/completions`,
    body: openAiBody,
    parse: openAiParse,
    availability(base, model) {
      return { url: `${base}/v1/models/${encodeURIComponent(model)}`, kind: 'one' };
    },
  },

  local: {
    defaultBaseUrl: null,
    baseUrlEnv: 'BENCH_LOCAL_BASE_URL',
    apiKeyEnv: 'BENCH_LOCAL_API_KEY',
    apiKeyRequired: false,
    supportsSeed: true,
    maxTokensField: 'max_tokens',
    headers(apiKey) {
      const h = { 'content-type': 'application/json' };
      if (apiKey) h.authorization = `Bearer ${apiKey}`;
      return h;
    },
    completionUrl: base => `${base}/v1/chat/completions`,
    body: openAiBody,
    parse: openAiParse,
    /**
     * The catalogue, not the per-model route: `GET /v1/models/{id}` is widely unimplemented on local servers and
     * several answer 200 with the list for it, which would make every id look available. The list also lets the
     * refusal print what the endpoint DOES serve, which is the whole of the fix when the pin has a typo or the
     * server was started with a different `--model`.
     */
    availability(base) {
      return { url: `${base}/v1/models`, kind: 'list' };
    },
  },
};

function openAiBody({ model, system, user, maxTokens, temperature, seed, provider }) {
  const messages = [];
  if (system !== undefined) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });
  const b = { model, messages, temperature };
  b[PROVIDERS[provider].maxTokensField] = maxTokens;
  if (seed !== null && seed !== undefined) b.seed = seed;
  return b;
}

function openAiParse(json) {
  const choice = Array.isArray(json?.choices) ? json.choices[0] : undefined;
  const content = choice?.message?.content;
  const u = json?.usage ?? {};
  return {
    // A refusal is a real model output and the grader should score it as a wrong answer, so it is returned as
    // text rather than thrown. See `complete`'s note on empty responses.
    text: typeof content === 'string' ? content : (choice?.message?.refusal ?? ''),
    usage: { in: u.prompt_tokens ?? 0, out: u.completion_tokens ?? 0 },
    stopReason: choice?.finish_reason ?? null,
    truncated: choice?.finish_reason === 'length',
  };
}

// ── Pins ───────────────────────────────────────────────────────────────────

/**
 * Read `benchmarks/pins.json` directly.
 *
 * This is a plain file read and deliberately NOT a second implementation of `pins.mjs#loadPins` — it parses and
 * validates nothing beyond JSON. `run.mjs` already calls `loadPins()` and should pass the result in as `pins`;
 * this fallback exists so a one-off script or a unit test can build a client without wiring the whole harness.
 * If the two ever disagree about anything, the injected object wins, because it is the one the results file
 * records.
 */
function readPinsFile() {
  const url = new URL('../pins.json', import.meta.url);
  try {
    return JSON.parse(readFileSync(url, 'utf8'));
  } catch (err) {
    throw new Error(
      `Could not read the pins file at ${url.pathname}: ${err instanceof Error ? err.message : String(err)}. `
      + 'Pass the parsed pins object as makeClient({ pins }) if it lives elsewhere.',
    );
  }
}

/** The pins path a message should name, so the fix is an edit and not a search. */
const pinPath = role => `benchmarks/pins.json → models.${role}`;

/**
 * Prices come from the pin, never from this file.
 *
 * One spelling, no alternatives: a client that accepts `usd.in` as well as `usd.perMillionInputTokens` invites a
 * pins file where half the models use each, and a typo in the losing spelling then prices a model at zero. The
 * shape is stated in the refusal, so a missing price is a two-line edit.
 */
function priceOf(entry, role) {
  const usd = entry.usd;
  const shape = '"usd": { "perMillionInputTokens": <number>, "perMillionOutputTokens": <number> }';
  if (!usd || typeof usd !== 'object' || Array.isArray(usd)) {
    throw new Error(`${pinPath(role)} has no price. Add ${shape} — a price change must be a pin change.`);
  }
  const read = key => {
    const v = usd[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new Error(
        `${pinPath(role)}.usd.${key} must be a finite number of US dollars per million tokens, `
        + `received ${JSON.stringify(v)}. Expected shape: ${shape}`,
      );
    }
    return v;
  };
  return { perMillionIn: read('perMillionInputTokens'), perMillionOut: read('perMillionOutputTokens') };
}

/**
 * Find the pinned entry for a model id and validate everything the run depends on.
 *
 * Looking up BY ID rather than trusting a role argument is what makes a mismatch visible: if `run.mjs` asks for
 * a model that no entry pins, there is no price to quietly fall back to and the run stops here instead of
 * producing a costed result for an unpinned model.
 */
function resolvePinnedModel({ pins, model, role, provider }) {
  const models = pins?.models;
  if (!models || typeof models !== 'object') {
    throw new Error('benchmarks/pins.json has no "models" object. The client cannot price or configure a run.');
  }

  const roles = Object.keys(models).filter(k => !k.startsWith('$') && models[k] && typeof models[k] === 'object');

  let matches;
  if (role !== undefined) {
    if (!roles.includes(role)) {
      throw new Error(`${pinPath(role)} does not exist. Pinned roles: ${roles.join(', ') || '(none)'}`);
    }
    matches = [role];
    if (models[role].id !== model) {
      throw new Error(
        `${pinPath(role)} pins id ${JSON.stringify(models[role].id)} but makeClient was asked for `
        + `${JSON.stringify(model)}. One of the two is stale; the pin is the authority.`,
      );
    }
  } else {
    matches = roles.filter(r => models[r].id === model);
    if (matches.length === 0) {
      const pinned = roles.map(r => `${r}=${JSON.stringify(models[r].id)}`).join(', ');
      throw new Error(
        `Model ${JSON.stringify(model)} is not pinned. benchmarks/pins.json pins: ${pinned || '(none)'}. `
        + 'A run must not use a model nobody pinned — there is no price for it and no record of it in the '
        + 'results file.',
      );
    }
    // Two roles may share a model id; they must then agree about it, or the run's cost and temperature depend
    // on which role happened to be looked up first. That is the "one rule, two implementations" shape.
    if (matches.length > 1) {
      const first = JSON.stringify({ ...models[matches[0]], id: undefined });
      const disagreeing = matches.find(r => JSON.stringify({ ...models[r], id: undefined }) !== first);
      if (disagreeing) {
        throw new Error(
          `Model ${JSON.stringify(model)} is pinned by ${matches.join(' and ')} with DIFFERENT settings. `
          + 'Make them identical, or pass makeClient({ role }) to say which one this client is.',
        );
      }
    }
  }

  const chosen = matches[0];
  const entry = models[chosen];

  // pins.json ships literal "TO PIN" placeholders. A run that starts on one would send that string to the API
  // and fail with a confusing 404 several layers away from the file that needs editing.
  if (typeof entry.id !== 'string' || entry.id.trim() === '' || /^to pin$/i.test(entry.id.trim())) {
    throw new Error(`${pinPath(chosen)}.id is still the placeholder ${JSON.stringify(entry.id)}. Pin a real model id.`);
  }

  if (entry.provider !== undefined && entry.provider !== provider) {
    throw new Error(
      `${pinPath(chosen)}.provider is ${JSON.stringify(entry.provider)} but makeClient was called with `
      + `${JSON.stringify(provider)}. Two sources for one fact and they disagree — fix the caller or the pin.`,
    );
  }

  if (typeof entry.temperature !== 'number' || !Number.isFinite(entry.temperature)) {
    throw new Error(
      `${pinPath(chosen)}.temperature must be a number. It is not defaulted here on purpose: "what temperature `
      + 'was the judge at" is a question every published result has to be able to answer.',
    );
  }

  const seed = entry.seed ?? null;
  if (seed !== null && !PROVIDERS[provider].supportsSeed) {
    throw new Error(
      `${pinPath(chosen)}.seed is set to ${JSON.stringify(seed)}, but the ${provider} API has no seed parameter. `
      + 'A pin that has no effect is a false claim about reproducibility — remove it or change provider.',
    );
  }

  return { role: chosen, id: entry.id, temperature: entry.temperature, seed, price: priceOf(entry, chosen) };
}

// ── HTTP ───────────────────────────────────────────────────────────────────

/**
 * One logical request, with retries. A retry is NOT a new call: the caller reserved its budget once, outside.
 *
 * Errors carry the response body because a 400 from these APIs says exactly which field is wrong, and a client
 * that swallows it turns a one-line fix into a debugging session.
 */
async function requestWithRetry(fetchImpl, url, init, { timeoutMs, label }) {
  let lastFailure = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const asked = lastFailure?.retryAfterMs ?? null;
      if (asked !== null && asked > MAX_RETRY_AFTER_MS) {
        throw new ModelCallFailed(
          `${label} was rate limited and asked us to wait ${Math.round(asked / 1000)}s, longer than the `
          + `${MAX_RETRY_AFTER_MS / 1000}s this harness will sleep. Waiting that long is indistinguishable from `
          + 'a hang. Re-run later or lower --concurrency.',
          { status: lastFailure.status, body: lastFailure.body, url, attempts: attempt },
        );
      }
      await sleep(asked ?? jittered(RETRY_DELAYS_MS[attempt - 1]));
    }

    let res;
    try {
      res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      // A transport failure or the per-attempt timeout. Both are worth retrying and neither has a status.
      lastFailure = { status: null, body: err instanceof Error ? err.message : String(err), retryAfterMs: null };
      continue;
    }

    if (res.ok) return res;

    const body = await res.text().catch(() => '(response body could not be read)');
    if (!RETRYABLE_STATUS.has(res.status)) {
      throw new ModelCallFailed(`${label} failed (HTTP ${res.status}): ${body}`, {
        status: res.status,
        body,
        url,
        attempts: attempt + 1,
      });
    }
    lastFailure = { status: res.status, body, retryAfterMs: retryAfterMs(res) };
  }

  throw new ModelCallFailed(
    `${label} failed after ${RETRY_DELAYS_MS.length + 1} attempts`
    + `${lastFailure?.status ? ` (last HTTP ${lastFailure.status})` : ''}: ${lastFailure?.body ?? 'unknown'}`,
    { status: lastFailure?.status ?? null, body: lastFailure?.body ?? '', url, attempts: RETRY_DELAYS_MS.length + 1 },
  );
}

/**
 * Refuse to run unless the endpoint offers exactly the pinned id.
 *
 * ## Why an alias is refused and not accepted
 *
 * `claude-sonnet-4-5` and `gpt-4o` are moving pointers: the same id answers with a different model after a
 * provider's release, and a benchmark re-run six months later would report a change it never made. The
 * per-model route answers with the CANONICAL id, so when the answer differs from what was asked, the pin is an
 * alias — and the refusal prints the snapshot id to pin instead. That turns the one-time annoyance of updating a
 * pin into the thing that makes the result re-derivable, which is the entire claim `README.md` makes for this
 * folder.
 *
 * A 401/403 is reported as an auth failure, not as an unavailable model, because the fix is a different one and
 * "model not available" would send someone to edit the pins file over a missing key.
 */
async function assertModelAvailable({ fetchImpl, provider, model, baseUrl, headers, timeoutMs }) {
  const spec = PROVIDERS[provider].availability(baseUrl, model);
  const res = await requestWithRetry(
    fetchImpl,
    spec.url,
    { method: 'GET', headers },
    { timeoutMs, label: `Model availability check for ${model}` },
  ).catch(err => {
    if (err instanceof ModelCallFailed && (err.status === 401 || err.status === 403)) {
      throw new ModelCallFailed(
        `Credentials for provider ${provider} were rejected (HTTP ${err.status}) by ${spec.url}. This is an auth `
        + `problem, not a missing model: check ${PROVIDERS[provider].apiKeyEnv} or the apiKey argument. `
        + `Response: ${err.body}`,
        { status: err.status, body: err.body, url: spec.url, attempts: err.attempts },
      );
    }
    if (err instanceof ModelCallFailed && err.status === 404) {
      throw new ModelUnavailable(
        `Pinned model ${JSON.stringify(model)} is not available from ${provider} at ${baseUrl} (HTTP 404). `
        + 'The harness will not substitute another model: a benchmark that quietly swaps the judge is not '
        + 'measuring what its results claim. Update benchmarks/pins.json to a model this account can reach.',
        { provider, model, baseUrl },
      );
    }
    throw err;
  });

  const json = await res.json().catch(() => null);

  if (spec.kind === 'list') {
    const offered = Array.isArray(json?.data) ? json.data.map(m => m?.id).filter(id => typeof id === 'string') : [];
    if (!offered.includes(model)) {
      throw new ModelUnavailable(
        `Pinned model ${JSON.stringify(model)} is not served by the local endpoint at ${baseUrl}. `
        + `It offers: ${offered.length ? offered.join(', ') : '(nothing — the catalogue was empty)'}. `
        + 'Not substituting.',
        { provider, model, baseUrl, offered },
      );
    }
    return;
  }

  const resolved = typeof json?.id === 'string' ? json.id : null;
  if (resolved === null) {
    throw new ModelUnavailable(
      `The availability check for ${JSON.stringify(model)} at ${spec.url} answered 200 without an "id" field, so `
      + 'the endpoint did not confirm which model it will actually run. Refusing rather than assuming.',
      { provider, model, baseUrl },
    );
  }
  if (resolved !== model) {
    throw new ModelUnavailable(
      `Pinned model ${JSON.stringify(model)} is an ALIAS: ${provider} resolves it to ${JSON.stringify(resolved)}. `
      + `Pin ${JSON.stringify(resolved)} instead — an alias points at a different model after the next release, `
      + 'and a re-run would report a change nobody made.',
      { provider, model, baseUrl, resolvedId: resolved },
    );
  }
}

// ── The client ─────────────────────────────────────────────────────────────

/**
 * Build a model client for one pinned model.
 *
 * `makeClient` is SYNCHRONOUS, per the contract. It was tempting to make it `async` so the availability check
 * could run inside it, but the contract's callers were written against `makeClient({...}).complete(...)` and a
 * returned promise would break them with a `complete is not a function` several frames away. Instead the check
 * runs in `ready()`, which `run.mjs` should await at start-up, and — if it never does — automatically before the
 * first request that would actually reach the network. Either way no prompt is ever sent to an unverified model.
 *
 * Deliberately, the preflight fires before the first NETWORK call rather than the first `complete()`: a fully
 * cached re-run then costs nothing and needs no credentials at all, which is what makes a result re-derivable
 * offline from the committed cache.
 *
 * @param {object}   args
 * @param {'anthropic'|'openai'|'local'} args.provider
 * @param {string}   args.model        the pinned model id; must match an entry in pins.json
 * @param {string}  [args.apiKey]      falls back to the provider's env var, which the refusal names
 * @param {number}  [args.concurrency] default {@link DEFAULT_CONCURRENCY}
 * @param {number}  [args.maxUsd]      omit for no cap; `run.mjs` passes --max-usd
 * @param {number}  [args.maxCalls]    omit for no cap
 * @param {(e: object) => void} [args.onSpend] called after every billed call, and in estimate mode
 * @param {boolean} [args.estimate]    no network at all; token counts and projected cost only
 * @param {object}  [args.pins]        parsed pins.json; read from disk when omitted
 * @param {string}  [args.role]        pins role ('judge', 'answerer', …) when the id alone is ambiguous
 * @param {string}  [args.cacheDir]    enables `cache.mjs`; without it `cached` is always false
 * @param {string}  [args.baseUrl]     overrides the provider default and its env var
 * @param {number}  [args.timeoutMs]   per attempt
 * @param {Function}[args.fetchImpl]   injected for tests; defaults to global fetch
 */
export function makeClient({
  provider,
  model,
  apiKey,
  concurrency = DEFAULT_CONCURRENCY,
  maxUsd,
  maxCalls,
  onSpend,
  estimate = false,
  pins,
  role,
  cacheDir,
  baseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) {
    throw new TypeError(
      `Unknown provider ${JSON.stringify(provider)}. Supported: ${Object.keys(PROVIDERS).join(', ')}.`,
    );
  }
  if (typeof model !== 'string' || model.trim() === '') {
    throw new TypeError('model must be a non-empty pinned model id');
  }
  const spec = PROVIDERS[provider];

  for (const [name, value] of [['maxUsd', maxUsd], ['maxCalls', maxCalls]]) {
    if (value === undefined || value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`${name} must be a finite number >= 0 when given, received ${JSON.stringify(value)}`);
    }
  }
  if (onSpend !== undefined && typeof onSpend !== 'function') throw new TypeError('onSpend must be a function');

  const pinned = resolvePinnedModel({ pins: pins ?? readPinsFile(), model, role, provider });

  const resolvedBaseUrl = (baseUrl ?? process.env[spec.baseUrlEnv] ?? spec.defaultBaseUrl ?? '').replace(/\/+$/, '');
  if (!resolvedBaseUrl) {
    throw new Error(
      `Provider ${provider} has no base URL. Set ${spec.baseUrlEnv} or pass makeClient({ baseUrl }). `
      + 'There is no default for a local endpoint — guessing localhost would silently benchmark whatever '
      + 'happened to be listening.',
    );
  }

  const resolvedKey = apiKey ?? process.env[spec.apiKeyEnv] ?? null;
  // Estimate mode never authenticates, so it must not demand a key — otherwise `--estimate`, whose job is to
  // price a run BEFORE it is authorised, would require the credentials for the run it is pricing.
  if (spec.apiKeyRequired && !resolvedKey && !estimate) {
    throw new Error(
      `No API key for provider ${provider}. Pass makeClient({ apiKey }) or set ${spec.apiKeyEnv}.`,
    );
  }

  const withSlot = makeSemaphore(concurrency);
  const headers = spec.headers(resolvedKey ?? '');

  let issuedCalls = 0;      // reserved, never decremented — see below
  let billedCalls = 0;      // calls that returned usage we were charged for
  let spentUsd = 0;         // settled
  let reservedUsd = 0;      // in flight
  let cacheHits = 0;
  let overBudget = false;   // estimate mode only: the cap was passed but not enforced
  let preflight = null;     // memoised availability check

  const usdFor = usage =>
    (usage.in / 1e6) * pinned.price.perMillionIn + (usage.out / 1e6) * pinned.price.perMillionOut;

  /**
   * Reserve budget for one call, synchronously, or throw.
   *
   * Synchronous on purpose: with an `await` anywhere between the check and the reservation, N concurrent callers
   * all read the same pre-call total, all pass, and the cap is exceeded by up to N calls. Node's single thread
   * makes this function atomic, so the reservation is the check.
   *
   * `issuedCalls` counts calls ISSUED and is never decremented, including for failures. `maxCalls` is a stop,
   * and a stop that a failing endpoint can reset by returning errors does not stop anything. `billedCalls`
   * tracks what was actually charged, and both are in `stats()` so a results file can show the difference.
   */
  function reserve(projectedUsd) {
    if (!estimate) {
      if (maxCalls !== undefined && maxCalls !== null && issuedCalls >= maxCalls) {
        throw new BudgetExhausted('calls', { spentUsd, maxUsd, calls: issuedCalls, maxCalls });
      }
      if (maxUsd !== undefined && maxUsd !== null && spentUsd + reservedUsd + projectedUsd > maxUsd) {
        throw new BudgetExhausted('usd', {
          spentUsd, maxUsd, calls: issuedCalls, maxCalls, wouldSpendUsd: projectedUsd,
        });
      }
    } else if (
      (maxUsd !== undefined && maxUsd !== null && spentUsd + projectedUsd > maxUsd)
      || (maxCalls !== undefined && maxCalls !== null && issuedCalls >= maxCalls)
    ) {
      overBudget = true;
    }
    issuedCalls++;
    reservedUsd += projectedUsd;
  }

  function settle(projectedUsd, actualUsd, { billed }) {
    reservedUsd -= projectedUsd;
    spentUsd += actualUsd;
    if (billed) billedCalls++;
  }

  async function ensureVerified() {
    if (estimate) return;
    if (preflight === null) {
      preflight = assertModelAvailable({
        fetchImpl, provider, model: pinned.id, baseUrl: resolvedBaseUrl, headers, timeoutMs,
      });
    }
    await preflight;
  }

  async function issue({ system, user, maxTokens }) {
    await ensureVerified();
    const body = spec.body({
      model: pinned.id,
      system,
      user,
      maxTokens,
      temperature: pinned.temperature,
      seed: pinned.seed,
      provider,
    });
    const res = await requestWithRetry(
      fetchImpl,
      spec.completionUrl(resolvedBaseUrl),
      { method: 'POST', headers, body: JSON.stringify(body) },
      { timeoutMs, label: `Completion with ${pinned.id}` },
    );
    let json;
    try {
      json = await res.json();
    } catch (err) {
      throw new ModelCallFailed(
        `Completion with ${pinned.id} returned a 200 that is not JSON: ${err instanceof Error ? err.message : err}`,
        { status: res.status, body: '', url: spec.completionUrl(resolvedBaseUrl), attempts: 1 },
      );
    }
    return spec.parse(json);
  }

  return {
    /**
     * Verify the pinned model before anything is sent. Idempotent, and a no-op under `estimate`.
     * Call it at start-up so a bad pin fails in the first second rather than after an hour of ingestion.
     */
    async ready() {
      await ensureVerified();
      return { provider, model: pinned.id, baseUrl: resolvedBaseUrl, verified: !estimate };
    },

    /**
     * One completion.
     *
     * `maxTokens` has no default. An output cap decides both what a truncated answer looks like and what a call
     * can cost, and a client that picks one silently makes both invisible — the prompt files in `prompts/` are
     * published precisely so that nothing about the request is implicit.
     *
     * An empty response is RETURNED, not thrown: a model that declined, or that hit its cap before emitting a
     * token, has produced a measurement — the grader scores it wrong, which is correct. Throwing would abort a
     * thousand-call run over one question and, worse, would hide a systematic refusal behind a crash. `empty`,
     * `truncated` and `stopReason` come back so `report.mjs` can count them.
     *
     * @returns {Promise<{text: string, usage: {in: number, out: number}, cached: boolean,
     *                    usd: number, estimated: boolean, truncated: boolean, empty: boolean,
     *                    stopReason: string|null}>}
     */
    async complete({ system, user, maxTokens } = {}) {
      if (typeof user !== 'string' || user.trim() === '') {
        throw new TypeError('complete({ user }) must be a non-empty string');
      }
      if (system !== undefined && typeof system !== 'string') {
        throw new TypeError('complete({ system }) must be a string when given');
      }
      if (!Number.isInteger(maxTokens) || maxTokens < 1) {
        throw new TypeError(
          `complete({ maxTokens }) must be a positive integer, received ${JSON.stringify(maxTokens)}. `
          + 'It is not defaulted: the output cap changes both the answer and the price.',
        );
      }

      const promptTokens = estimateTokens(user) + (system ? estimateTokens(system) : 0) + ENVELOPE_TOKENS;
      const projectedUsage = { in: promptTokens, out: maxTokens };
      // The OUTPUT side is reserved at the cap, not at a guess. A reservation that assumes a short answer does
      // not bound the worst case, and the worst case is the only thing a budget has to survive.
      const projectedUsd = usdFor(projectedUsage);

      if (estimate) {
        reserve(projectedUsd);
        settle(projectedUsd, projectedUsd, { billed: false });
        onSpend?.({
          usd: projectedUsd, cumulativeUsd: spentUsd, calls: issuedCalls, usage: projectedUsage,
          model: pinned.id, provider, cached: false, estimated: true,
        });
        // Empty text, not a placeholder sentence: a placeholder in a results file is indistinguishable from an
        // answer the model gave, and `estimated: true` is the only honest thing to hand a grader.
        return {
          text: '', usage: projectedUsage, cached: false, usd: projectedUsd,
          estimated: true, truncated: false, empty: true, stopReason: null,
        };
      }

      const run = async () => {
        reserve(projectedUsd);
        let parsed;
        try {
          parsed = await withSlot(() => issue({ system, user, maxTokens }));
        } catch (err) {
          // The reservation is released; `issuedCalls` is not. See `reserve`.
          reservedUsd -= projectedUsd;
          throw err;
        }
        const usd = usdFor(parsed.usage);
        settle(projectedUsd, usd, { billed: true });
        onSpend?.({
          usd, cumulativeUsd: spentUsd, calls: issuedCalls, usage: parsed.usage,
          model: pinned.id, provider, cached: false, estimated: false,
        });
        return {
          text: parsed.text,
          usage: parsed.usage,
          usd,
          estimated: false,
          truncated: parsed.truncated,
          empty: parsed.text === '',
          stopReason: parsed.stopReason,
        };
      };

      if (!cacheDir) return { ...(await run()), cached: false };

      // `cache.mjs` is imported here rather than at the top so that a client built without a cacheDir — and
      // every unit test of this file — does not need that module to exist or to be loadable.
      const { cacheKey, withCache } = await import('./cache.mjs');
      // Everything that could change the answer goes into the key, INCLUDING the base URL: a proxy serving a
      // different model under the same id is exactly the cache hit nobody would ever notice.
      const key = cacheKey({
        v: 1, provider, baseUrl: resolvedBaseUrl, model: pinned.id,
        temperature: pinned.temperature, seed: pinned.seed, maxTokens,
        system: system ?? null, user,
      });
      let missed = false;
      const value = await withCache(cacheDir, key, async () => {
        missed = true;
        return run();
      });
      if (!missed) cacheHits++;
      return { ...value, cached: !missed };
    },

    /** US dollars settled so far. In estimate mode this is the projection, which is what `--estimate` prints. */
    spent() {
      return spentUsd;
    },

    /** Calls ISSUED, including ones that failed. The cap this bounds is a stop, not an accountancy line. */
    calls() {
      return issuedCalls;
    },

    /** Everything `report.mjs` needs to say what this client did, including where the difference is. */
    stats() {
      return {
        calls: issuedCalls,
        billedCalls,
        cacheHits,
        spentUsd,
        reservedUsd,
        estimate,
        overBudget,
        maxUsd: maxUsd ?? null,
        maxCalls: maxCalls ?? null,
      };
    },

    /**
     * The configuration this client is actually running, for the results file.
     *
     * The base URL is in here deliberately. It can be overridden by env var, and an override is the one way a
     * different model can answer to a pinned id without the availability check noticing — so it is recorded
     * rather than assumed to be the default.
     */
    describe() {
      return {
        provider,
        model: pinned.id,
        pinsRole: pinned.role,
        baseUrl: resolvedBaseUrl,
        temperature: pinned.temperature,
        seed: pinned.seed,
        usdPerMillionTokens: { in: pinned.price.perMillionIn, out: pinned.price.perMillionOut },
        concurrency,
        maxUsd: maxUsd ?? null,
        maxCalls: maxCalls ?? null,
        estimate,
        tokenEstimator: `characters / ${CHARS_PER_TOKEN} (approximation; reported usage is the provider's own count)`,
      };
    },
  };
}
