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

/** Transcribe one page image to Markdown via a local Ollama VLM. Throws on unreachable/HTTP error. */
export async function transcribePageImage(
  imageBytes: Buffer,
  opts: { baseUrl: string; model: string; prompt: string; timeoutMs?: number },
): Promise<VlmTranscription> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const url = `${base}/api/chat`;
  const b64 = imageBytes.toString('base64');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        stream: false,
        options: { temperature: 0, num_predict: MAX_OUTPUT_TOKENS },
        messages: [{ role: 'user', content: opts.prompt, images: [b64] }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
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
