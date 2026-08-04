/**
 * VLM client for document transcription (F11).
 *
 * Sends a rendered page image + a strict verbatim-transcription prompt to an Ollama vision model
 * (`/api/chat` with `images`), mirroring the media vision provider's request shape. Output is bounded
 * (`num_predict`) and temperature 0 for determinism. Throws on unreachable/error so the extractor can
 * fall back to OCR.
 *
 * `repairMarkdown` uses the bundled local Ollama (no egress). `repairMarkdownExternal` (F11-b) is the ONE
 * path that sends document content OFF the instance — to an operator-configured external OpenAI-compatible
 * "assist model" — so it is routed through `ssrfSafeFetch` and is only reached after an explicit egress
 * acknowledgment (enforced at config-save time).
 */
import { ssrfSafeFetch } from '../../util/ssrf.js';
import { boundedJson, boundedErrorText } from '../../util/bounded-read.js';
import { allowPrivateForSlot, type EgressSlot } from '../../config/model-egress-policy.js';
import { chatUrlFor, type VlmWire } from './vlm-endpoint.js';

export interface VlmTranscription {
  text: string;
  /** True when the model hit its output cap (Ollama `done_reason === 'length'`) — signals truncation. */
  truncated: boolean;
}

const MAX_OUTPUT_TOKENS = 4096; // bound per-page output so a hostile page can't drive unbounded generation

/** One chat turn, before it is serialised for a particular wire. `images` are base64, image-only turns. */
interface ChatTurn { role: 'user'; content: string; images?: string[] }

/**
 * POST one non-streamed chat turn, on whichever wire the endpoint speaks.
 *
 * ## Why this branches
 *
 * It used to hardcode Ollama's `/api/chat`, which meant `vlmModel` could not work against **any**
 * OpenAI-compatible server — llama.cpp, llama-swap, vLLM, LocalAI all 404 that route, and no `baseUrl`
 * fixes it because dropping `/v1` merely yields `/api/chat` again. doc-render rasterised pages that were
 * then thrown away.
 *
 * ## Why every non-bundled call is guarded
 *
 * It also used a bare `fetch`. That was written when the VLM was the bundled local Ollama and the file
 * said so — *"repairMarkdown uses the bundled local Ollama (no egress)"*. `visionProvider: external`
 * falsified it, because an empty `vlmBaseUrl` means "reuse the vision endpoint": page images then went to
 * an off-instance host with no SSRF guard and no egress acknowledgement. It failed safe only against
 * OpenAI-compatible targets; a **remote Ollama** answers `/api/chat` with 200, so those deployments were
 * egressing silently while the pipeline reported success.
 *
 * So the guard follows the ENDPOINT, not the wire: an Ollama that is not ours gets the same treatment as
 * an OpenAI one. The bundled local path keeps its plain `fetch` — guarding it would refuse the default
 * deployment, whose model sits on a private cluster address.
 */
async function postChat(
  endpoint: { baseUrl: string; model: string; wire: VlmWire; external: boolean; apiKey?: string; slot: EgressSlot },
  turns: ChatTurn[],
  timeoutMs: number,
): Promise<VlmTranscription> {
  const url = chatUrlFor(endpoint.wire, endpoint.baseUrl);
  const body = endpoint.wire === 'ollama'
    ? {
      model: endpoint.model,
      stream: false,
      options: { temperature: 0, num_predict: MAX_OUTPUT_TOKENS },
      messages: turns.map(t => (t.images ? { role: t.role, content: t.content, images: t.images } : { role: t.role, content: t.content })),
    }
    : {
      model: endpoint.model,
      temperature: 0,
      max_tokens: MAX_OUTPUT_TOKENS,
      // OpenAI carries images as data URIs in a content array. `image/png` because the render sidecar
      // emits PNG; a wrong type here is what broke external vision in 2.0.0 (see files/mime.ts).
      messages: turns.map(t => (t.images
        ? {
          role: t.role,
          content: [
            { type: 'text', text: t.content },
            ...t.images.map(b64 => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } })),
          ],
        }
        : { role: t.role, content: t.content })),
    };

  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  };

  let res: Response;
  try {
    res = endpoint.external
      // Guard on: DNS-resolve, IP-pin, redirect re-validation, crown-jewel ranges blocked. `allowPrivate`
      // only lifts the private-address rejection, so a self-hosted model on a cluster address still works.
      // Resolved for THIS slot: transcription and repair can sit on different hosts, and the document VLM
      // being on-cluster is no reason to let the assist model reach a private address.
      ? await ssrfSafeFetch(url, init, { allowPrivate: allowPrivateForSlot(endpoint.slot) })
      : await fetch(url, init);
  } catch (err) {
    throw new Error(`VLM unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body2 = await boundedErrorText(res);
    throw new Error(`VLM HTTP ${res.status}: ${body2}`);
  }

  if (endpoint.wire === 'ollama') {
    const json = await boundedJson<{ message?: { content?: string }; done_reason?: string; error?: string }>(
      res, 'VLM');
    if (json.error) throw new Error(`VLM error: ${json.error}`);
    return { text: json.message?.content ?? '', truncated: json.done_reason === 'length' };
  }
  const json = await boundedJson<{
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; error?: unknown;
  }>(res, 'VLM');
  if (json.error) throw new Error(`VLM error: ${typeof json.error === 'string' ? json.error : JSON.stringify(json.error).slice(0, 200)}`);
  const choice = json.choices?.[0];
  return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
}

/**
 * How an endpoint is described to this module.
 *
 * `wire` and `external` default to the bundled-Ollama shape, so a caller that passes only
 * `baseUrl`/`model` gets byte-for-byte the pre-unification behaviour. That is deliberate: it keeps the
 * local path's existing tests meaningful as a regression net rather than something rewritten to fit.
 */
export interface VlmTarget {
  baseUrl: string;
  model: string;
  wire?: VlmWire;
  external?: boolean;
  apiKey?: string;
  timeoutMs?: number;
}

const asEndpoint = (t: VlmTarget, slot: EgressSlot) => ({
  baseUrl: t.baseUrl,
  model: t.model,
  wire: t.wire ?? 'ollama' as VlmWire,
  external: t.external ?? false,
  apiKey: t.apiKey,
  slot,
});

/** Transcribe one page image to Markdown. Throws on unreachable/HTTP error so the caller falls back. */
export async function transcribePageImage(
  imageBytes: Buffer,
  opts: VlmTarget & { prompt: string },
): Promise<VlmTranscription> {
  const b64 = imageBytes.toString('base64');
  return postChat(
    asEndpoint(opts, 'docVlm'),
    [{ role: 'user', content: opts.prompt, images: [b64] }],
    opts.timeoutMs ?? 60_000,
  );
}

const REPAIR_PROMPT =
  'You are correcting a Markdown transcription of a document page. You are given the DRAFT transcription ' +
  'and the OCR TEXT of the same page. The draft may have dropped or garbled content that the OCR captured. ' +
  'Produce a corrected GitHub-Flavored Markdown that keeps the draft\'s structure and formatting but ' +
  'restores any content present in the OCR that the draft is missing. Do NOT summarize, translate, ' +
  'reorder, or invent content, and do not add commentary. Output only the corrected Markdown.';

/** Reconcile a draft VLM transcription against the OCR evidence in one text-only pass (max-mode repair).
 *  Throws on unreachable/HTTP error so the caller can fall back to OCR. */
export async function repairMarkdown(
  opts: VlmTarget & { draft: string; evidence: string; issues?: string[] },
): Promise<VlmTranscription> {
  return postChat(
    asEndpoint(opts, 'docRepair'),
    [{ role: 'user', content: repairContent(opts.draft, opts.evidence, opts.issues) }], // text-only — no page image
    opts.timeoutMs ?? 60_000,
  );
}

const CONSENSUS_PROMPT =
  'You are reconciling TWO independent Markdown transcriptions (DRAFT A and DRAFT B) of the SAME document ' +
  'page, with the OCR TEXT of that page as ground truth. Produce a single best GitHub-Flavored Markdown ' +
  'transcription: keep content both drafts agree on; where they differ, prefer the reading supported by the ' +
  'OCR TEXT; include content that either draft captured and the OCR confirms. Do NOT summarize, translate, ' +
  'reorder, or invent content, and do not add commentary. Output only the reconciled Markdown.';

/** Reconcile two independent transcriptions of the same document against the OCR evidence (F11-d consensus).
 *  Text-only, temperature 0, via the local model. Throws on unreachable/HTTP error so the caller can keep the
 *  primary draft. */
export async function reconcileConsensus(
  opts: VlmTarget & { draftA: string; draftB: string; evidence: string },
): Promise<VlmTranscription> {
  const content =
    `${CONSENSUS_PROMPT}\n\n--- DRAFT A ---\n${opts.draftA}\n\n--- DRAFT B ---\n${opts.draftB}\n\n--- OCR TEXT ---\n${opts.evidence}`;
  return postChat(
    // Consensus runs on the same VLM endpoint as transcription — same slot, same policy.
    asEndpoint(opts, 'docVlm'),
    [{ role: 'user', content }], // text-only — no page image
    opts.timeoutMs ?? 60_000,
  );
}

const DESCRIBE_PROMPT =
  'You are writing a one-paragraph description of a document, for a file listing. Say what KIND of ' +
  'document it is, who it is between or from, its date if one is stated, and what it concerns. Two ' +
  'sentences at most, plain prose, no Markdown, no heading, no preamble, no bullet points. Use ONLY facts ' +
  'stated in the text below: if something is not there, leave it out — do not guess and do not describe ' +
  'what the document might be. Answer with the description only.';

/**
 * Describe a document in one short paragraph — text-only, and the same call for either target.
 *
 * The slot is the caller's to choose because that is what decides the egress policy: the local document
 * model (`docRepair`, the text-only document slot) or the operator's acknowledged assist model (`assist`).
 * Both already receive document text on the repair path, so this adds no new egress surface — which is the
 * reason it is one function taking a target rather than a local/external pair like `repairMarkdown*`.
 *
 * Throws on unreachable/HTTP error, like every other call here, so the caller falls back.
 */
export async function describeDocumentText(
  opts: VlmTarget & { text: string; slot?: EgressSlot },
): Promise<VlmTranscription> {
  return postChat(
    asEndpoint(opts, opts.slot ?? 'docRepair'),
    [{ role: 'user', content: `${DESCRIBE_PROMPT}\n\n--- DOCUMENT ---\n${opts.text}` }],
    opts.timeoutMs ?? 60_000,
  );
}

/** Build the shared repair user-message content (draft + OCR evidence + flagged issues). */
function repairContent(draft: string, evidence: string, issues?: string[]): string {
  const flagged = issues?.length ? `\n\nValidation flagged: ${issues.join('; ')}.` : '';
  return `${REPAIR_PROMPT}${flagged}\n\n--- DRAFT ---\n${draft}\n\n--- OCR TEXT ---\n${evidence}`;
}

/**
 * F11-b — reconcile a draft against OCR evidence via an **external** OpenAI-compatible chat endpoint (the
 * operator-configured "assist model"). Routed through `ssrfSafeFetch` — this is the one path that sends
 * document content (draft + OCR text) off the instance — and Bearer-authenticated when an `apiKey` is given.
 * Throws on unreachable/HTTP error so the caller falls back to the local repair, then OCR.
 */
export async function repairMarkdownExternal(
  opts: { baseUrl: string; model: string; apiKey?: string; draft: string; evidence: string; issues?: string[]; timeoutMs?: number },
): Promise<VlmTranscription> {
  // The same builder the local path uses. This function is the one `normalizeOpenAiBase` was written for —
  // its comment names it — and it went on appending `/v1/chat/completions` itself, so the assist slot
  // required a base WITHOUT `/v1` while vision required one WITH it. Both accept either now.
  const url = chatUrlFor('openai', opts.baseUrl);
  let res: Response;
  try {
    res = await ssrfSafeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{ role: 'user', content: repairContent(opts.draft, opts.evidence, opts.issues) }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    }, {
      // Lets a self-hosted OpenAI-compatible assist model live on a private cluster address. The guard
      // itself stays on: DNS-resolve, IP-pin and redirect re-validation all still apply — only the
      // private-address rejection lifts, and crown-jewel ranges remain blocked.
      allowPrivate: allowPrivateForSlot('assist'),
    });
  } catch (err) {
    throw new Error(`assist model unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = await boundedErrorText(res);
    throw new Error(`assist model HTTP ${res.status}: ${body}`);
  }
  const json = await boundedJson<{ choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; error?: unknown }>(
    res, 'assist model');
  if (json.error) throw new Error(`assist model error: ${typeof json.error === 'string' ? json.error : JSON.stringify(json.error).slice(0, 200)}`);
  const choice = json.choices?.[0];
  return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
}
