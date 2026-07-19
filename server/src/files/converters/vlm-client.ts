/**
 * VLM client for document transcription (F11) — local Ollama path.
 *
 * Sends a rendered page image + a strict verbatim-transcription prompt to an Ollama vision model
 * (`/api/chat` with `images`), mirroring the media vision provider's request shape. Output is bounded
 * (`num_predict`) and temperature 0 for determinism. Throws on unreachable/error so the extractor can
 * fall back to OCR. External (hosted OpenAI-compatible) endpoints — and routing their egress through
 * `ssrfSafeFetch` — are a later phase; this is the bundled, no-egress path.
 */

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
  const issues = opts.issues?.length ? `\n\nValidation flagged: ${opts.issues.join('; ')}.` : '';
  const content = `${REPAIR_PROMPT}${issues}\n\n--- DRAFT ---\n${opts.draft}\n\n--- OCR TEXT ---\n${opts.evidence}`;
  return postChat(
    opts.baseUrl, opts.model,
    [{ role: 'user', content }], // text-only — no page image
    opts.timeoutMs ?? 60_000,
  );
}
