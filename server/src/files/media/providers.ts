/**
 * Media embedding provider clients.
 *
 * Two provider families:
 *  - Vision (image captioning): Ollama-compatible `/api/chat` with base64 image payload,
 *    or any external OpenAI-compatible vision API.
 *  - STT (speech-to-text): faster-whisper-server `/v1/audio/transcriptions`
 *    (OpenAI-compatible), or the OpenAI Whisper API.
 *
 * All concrete providers implement the narrow `VisionProvider` / `SttProvider`
 * interfaces.  Callers use `MediaProviderFactory` and never import provider
 * classes directly.
 */

import type { MediaProviderConfig } from '../../config/types.js';
import { log } from '../../util/log.js';
import { ssrfSafeFetch } from '../../util/ssrf.js';
import { allowPrivateModelEndpoints } from '../../config/model-egress-policy.js';
import { extForMimeType, isInformativeMimeType, sniffImageMimeType } from '../mime.js';

/**
 * Runtime egress guard. **External** (operator-supplied, public) provider endpoints go through
 * `ssrfSafeFetch` — DNS-resolve + IP-pin + redirect re-validation — closing the save-time-only URL check
 * against DNS-rebinding / redirect-to-internal. **Local** providers (bundled Ollama / Whisper on the trusted
 * internal network) keep a plain `fetch`: their addresses are private, which `ssrfSafeFetch` would (rightly)
 * reject. The provider CLASS already encodes which is which (Ollama/Whisper = local; External* = external).
 */
const egressFetch = (external: boolean): typeof fetch => {
  if (!external) return fetch;
  // An operator running a self-hosted OpenAI-compatible server on a cluster address needs the EXTERNAL
  // protocol at a PRIVATE address. Note what this relaxes and what it does not: ssrfSafeFetch still
  // resolves DNS, pins the resolved IP for the connection and re-validates redirects — only the
  // private-address rejection lifts, and crown-jewel ranges (loopback, link-local/IMDS) stay blocked
  // either way. This path therefore stays better guarded than a `local` provider, which uses plain fetch.
  const allowPrivate = allowPrivateModelEndpoints();
  return ((url: string, init?: RequestInit) =>
    ssrfSafeFetch(url, init ?? {}, { allowPrivate })) as unknown as typeof fetch;
};

// ── Bounded JSON response reader ──────────────────────────────────────────────────────
//
// fetch().json() reads the entire body without limit → a hostile or runaway
// upstream could exhaust heap. We cap by streaming the body and aborting once
// `maxBytes` is exceeded.
//
// Defaults are generous (100 MiB STT response, 50 MiB caption response) but
// finite — enough headroom for legitimate Whisper verbose_json responses on
// hour-long recordings, far below an OOM threshold.
async function boundedJson<T>(res: Response, maxBytes: number, label: string): Promise<T> {
  const declared = res.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) {
    throw new Error(`${label} response too large: ${declared} bytes (max ${maxBytes})`);
  }
  if (!res.body) {
    // Some runtimes buffer bodies; fall back to text() with a post-hoc size check.
    const text = await res.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(`${label} response exceeded ${maxBytes} bytes`);
    }
    return JSON.parse(text) as T;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error(`${label} response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const merged = Buffer.concat(chunks.map(c => Buffer.from(c.buffer, c.byteOffset, c.byteLength)));
  return JSON.parse(merged.toString('utf8')) as T;
}

const MAX_VISION_RESPONSE_BYTES = 50 * 1024 * 1024;  // 50 MiB — caption JSON is small
const MAX_STT_RESPONSE_BYTES    = 100 * 1024 * 1024; // 100 MiB — verbose_json with many segments

// ── Shared types ──────────────────────────────────────────────────────────

export interface SttSegment {
  start: number;  // seconds
  end: number;    // seconds
  text: string;
}

export interface SttResult {
  text: string;
  segments: SttSegment[];
}

// ── Provider interfaces ───────────────────────────────────────────────────

export interface VisionProvider {
  /** Generate a descriptive text caption for the given image bytes. */
  caption(imageBytes: Buffer, mimeType: string): Promise<string>;
}

export interface SttProvider {
  /**
   * Transcribe audio bytes to text.
   * Returns the full transcript and (if available) per-segment timing.
   */
  transcribe(audioBytes: Buffer, mimeType: string): Promise<SttResult>;
}

// ── Ollama vision ─────────────────────────────────────────────────────────

export class OllamaVisionProvider implements VisionProvider {
  constructor(private readonly cfg: MediaProviderConfig) {}

  async caption(imageBytes: Buffer, _mimeType: string): Promise<string> {
    const base = (this.cfg.baseUrl ?? 'http://ollama.ythril.svc.cluster.local:11434').replace(/\/$/, '');
    const model = this.cfg.model ?? 'moondream';  // `moondream2` is not a valid Ollama registry name
    const url = `${base}/api/chat`;
    const b64 = imageBytes.toString('base64');

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            {
              role: 'user',
              content: 'Describe this image in detail. Focus on what is visually present.',
              images: [b64],
            },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      throw new Error(`Ollama vision unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama vision HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await boundedJson<{ message?: { content?: string }; error?: string }>(
      res, MAX_VISION_RESPONSE_BYTES, 'Ollama vision',
    );
    if (json.error) throw new Error(`Ollama vision error: ${json.error}`);
    const caption = json.message?.content?.trim();
    if (!caption) throw new Error('Ollama vision returned empty caption');
    return caption;
  }
}

// ── External (OpenAI-compatible) vision ───────────────────────────────────

export class ExternalVisionProvider implements VisionProvider {
  constructor(private readonly cfg: MediaProviderConfig) {}

  async caption(imageBytes: Buffer, mimeType: string): Promise<string> {
    const base = (this.cfg.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = this.cfg.model ?? 'gpt-4o-mini';
    const url = `${base}/chat/completions`;
    const b64 = imageBytes.toString('base64');
    // A data URI must carry a real media type. `data:application/octet-stream;base64,…` is what a
    // strict OpenAI-compatible server (llama.cpp's llama-server among them) rejects outright:
    //
    //     500 {"error":{"message":"Invalid uri format: data:application/octet-stream;base64", …}}
    //
    // The type is now correct upstream, but this path takes no chances: a job row queued by an older
    // build still carries the old value, and the bytes settle it either way.
    const resolved = isInformativeMimeType(mimeType)
      ? mimeType
      : sniffImageMimeType(imageBytes) ?? 'image/jpeg';
    const dataUrl = `data:${resolved};base64,${b64}`;

    let res: Response;
    try {
      // External endpoint → SSRF-guarded egress.
      res = await egressFetch(true)(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe this image in detail. Focus on what is visually present.' },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      throw new Error(`External vision unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`External vision HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await boundedJson<{
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    }>(res, MAX_VISION_RESPONSE_BYTES, 'External vision');
    if (json.error) throw new Error(`External vision error: ${json.error.message}`);
    const caption = json.choices?.[0]?.message?.content?.trim();
    if (!caption) throw new Error('External vision returned empty caption');
    return caption;
  }
}

// ── Whisper (faster-whisper-server / OpenAI-compatible) ───────────────────

export class WhisperProvider implements SttProvider {
  constructor(private readonly cfg: MediaProviderConfig) {}

  /** Local (bundled Whisper) by default → plain fetch. `ExternalWhisperProvider` flips this so its egress
   *  is routed through `ssrfSafeFetch`. */
  protected readonly external: boolean = false;

  async transcribe(audioBytes: Buffer, mimeType: string): Promise<SttResult> {
    const base = (this.cfg.baseUrl ?? 'http://whisper.ythril.svc.cluster.local:8000').replace(/\/$/, '');
    const model = this.cfg.model ?? 'base';
    const url = `${base}/v1/audio/transcriptions`;

    // Build multipart/form-data using FormData.
    //
    // The filename matters: OpenAI's transcription endpoint validates the extension against a
    // whitelist (flac/m4a/mp3/mp4/mpeg/mpga/oga/ogg/wav/webm) and rejects anything else. The old
    // `mimeType.split('/')[1]` was not an extension derivation — it produced `x-wav` for the
    // `audio/x-wav` several recorders emit, and `octet-stream` for anything that reached here
    // untyped. Both are rejected. The shared table folds aliases onto the canonical extension.
    const ext = extForMimeType(mimeType, 'wav');
    // Slice to a standalone ArrayBuffer so Blob ctor receives ArrayBuffer (not SharedArrayBuffer)
    const cleanBuffer = audioBytes.buffer.slice(
      audioBytes.byteOffset,
      audioBytes.byteOffset + audioBytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([cleanBuffer], { type: mimeType });
    const form = new FormData();
    form.append('file', blob, `audio.${ext}`);
    form.append('model', model);
    form.append('response_format', 'verbose_json');

    let res: Response;
    try {
      // Local Whisper → plain fetch (private address); external → SSRF-guarded egress.
      res = await egressFetch(this.external)(url, {
        method: 'POST',
        headers: this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {},
        body: form,
        signal: AbortSignal.timeout(300_000), // 5 min — long audio
      });
    } catch (err) {
      throw new Error(`Whisper unreachable (${url}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Whisper HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await boundedJson<{
      text?: string;
      segments?: { start?: number; end?: number; text?: string }[];
      error?: { message?: string };
    }>(res, MAX_STT_RESPONSE_BYTES, 'Whisper');
    if (json.error) throw new Error(`Whisper error: ${json.error.message}`);

    const text = json.text?.trim() ?? '';
    const segments: SttSegment[] = (json.segments ?? []).map(s => ({
      start: s.start ?? 0,
      end: s.end ?? 0,
      text: (s.text ?? '').trim(),
    })).filter(s => s.text.length > 0);

    return { text, segments };
  }
}

// ── External Whisper API ──────────────────────────────────────────────────

/** Delegates to the same WhisperProvider implementation — OpenAI Whisper API is compatible — but marks the
 *  egress external so it is routed through `ssrfSafeFetch`. */
export class ExternalWhisperProvider extends WhisperProvider {
  protected override readonly external = true;
}

// ── Factory ───────────────────────────────────────────────────────────────

export interface MediaProviderBundle {
  vision: VisionProvider;
  stt: SttProvider;
}

/**
 * Build the active vision + STT provider pair from config.
 * When `fallbackToExternal` is true the returned providers automatically
 * retry with the external provider on non-200 / unreachable errors.
 */
export function createMediaProviders(
  visionCfg: MediaProviderConfig,
  sttCfg: MediaProviderConfig,
  visionProviderType: 'local' | 'external',
  sttProviderType: 'local' | 'external',
  fallbackToExternal: boolean,
): MediaProviderBundle {
  const localVision = new OllamaVisionProvider(visionCfg);
  const externalVision = new ExternalVisionProvider(visionCfg);
  const localStt = new WhisperProvider(sttCfg);
  const externalStt = new ExternalWhisperProvider(sttCfg);

  const vision: VisionProvider = (visionProviderType === 'external')
    ? externalVision
    : (fallbackToExternal
        ? new FallbackVisionProvider(localVision, externalVision)
        : localVision);

  const stt: SttProvider = (sttProviderType === 'external')
    ? externalStt
    : (fallbackToExternal
        ? new FallbackSttProvider(localStt, externalStt)
        : localStt);

  return { vision, stt };
}

// ── Fallback wrappers ────────────────────────────────────────────────────

class FallbackVisionProvider implements VisionProvider {
  constructor(
    private readonly primary: VisionProvider,
    private readonly fallback: VisionProvider,
  ) {}

  async caption(imageBytes: Buffer, mimeType: string): Promise<string> {
    try {
      return await this.primary.caption(imageBytes, mimeType);
    } catch (err) {
      log.warn(`Vision primary failed, falling back to external: ${err instanceof Error ? err.message : String(err)}`);
      return this.fallback.caption(imageBytes, mimeType);
    }
  }
}

class FallbackSttProvider implements SttProvider {
  constructor(
    private readonly primary: SttProvider,
    private readonly fallback: SttProvider,
  ) {}

  async transcribe(audioBytes: Buffer, mimeType: string): Promise<SttResult> {
    try {
      return await this.primary.transcribe(audioBytes, mimeType);
    } catch (err) {
      log.warn(`STT primary failed, falling back to external: ${err instanceof Error ? err.message : String(err)}`);
      return this.fallback.transcribe(audioBytes, mimeType);
    }
  }
}
