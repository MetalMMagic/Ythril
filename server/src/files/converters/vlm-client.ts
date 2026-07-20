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

export interface VlmTranscription {
  text: string;
  /** True when the model hit its output cap (Ollama `done_reason === 'length'`) — signals truncation. */
  truncated: boolean;
}

const MAX_OUTPUT_TOKENS = 4096; // bound per-page output so a hostile page can't drive unbounded generation

/** POST one non-streamed chat turn to Ollama `/api/chat` (temperature 0, bounded output). Throws on
 *  unreachable / HTTP error / model error so the caller can fall back. Shared by transcription + repair. */
async function postChat(
  baseUrl: string,
  model: string,
  messages: Array<Record<string, unknown>>,
  timeoutMs: number,
): Promise<VlmTranscription> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0, num_predict: MAX_OUTPUT_TOKENS },
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`VLM unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`VLM HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { message?: { content?: string }; done_reason?: string; error?: string };
  if (json.error) throw new Error(`VLM error: ${json.error}`);
  return { text: json.message?.content ?? '', truncated: json.done_reason === 'length' };
}

/** Transcribe one page image to Markdown via a local Ollama VLM. Throws on unreachable/HTTP error. */
export async function transcribePageImage(
  imageBytes: Buffer,
  opts: { baseUrl: string; model: string; prompt: string; timeoutMs?: number },
): Promise<VlmTranscription> {
  const b64 = imageBytes.toString('base64');
  return postChat(
    opts.baseUrl, opts.model,
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
  opts: { baseUrl: string; model: string; draft: string; evidence: string; issues?: string[]; timeoutMs?: number },
): Promise<VlmTranscription> {
  return postChat(
    opts.baseUrl, opts.model,
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
  opts: { baseUrl: string; model: string; draftA: string; draftB: string; evidence: string; timeoutMs?: number },
): Promise<VlmTranscription> {
  const content =
    `${CONSENSUS_PROMPT}\n\n--- DRAFT A ---\n${opts.draftA}\n\n--- DRAFT B ---\n${opts.draftB}\n\n--- OCR TEXT ---\n${opts.evidence}`;
  return postChat(
    opts.baseUrl, opts.model,
    [{ role: 'user', content }], // text-only — no page image
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
  const url = `${opts.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
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
    });
  } catch (err) {
    throw new Error(`assist model unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`assist model HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; error?: unknown };
  if (json.error) throw new Error(`assist model error: ${typeof json.error === 'string' ? json.error : JSON.stringify(json.error).slice(0, 200)}`);
  const choice = json.choices?.[0];
  return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
}
