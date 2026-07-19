/**
 * Client for the document-render sidecar (F11) — turns a PDF into per-page PNG images so the VLM
 * extraction path can read pages. The sidecar is a trusted, internal-only service (its URL comes from
 * `RENDER_SIDECAR_URL`, defaulting to the compose service), so — like the OCR sidecar client — it uses a
 * plain `fetch`, not the SSRF-guarded one (that guard is for operator-supplied *external* model endpoints).
 */
import { log } from '../../util/log.js';

const RENDER_URL = (process.env['RENDER_SIDECAR_URL'] ?? 'http://localhost:8100').replace(/\/$/, '');
const HEALTH_TTL_MS = 10_000; // cache the probe so per-document routing doesn't re-hit /health each time

let _healthCache: { at: number; ok: boolean } | null = null;

/** Rendered document pages (PNG bytes per page). */
export interface RenderedPages {
  pages: Buffer[];
  /** Total pages in the document (may exceed `pages.length` when the maxPages cap was hit). */
  total: number;
  /** True when `total > pages.length` — the render was capped. */
  truncated: boolean;
}

/** Whether the render sidecar is reachable. Cached for a few seconds so `auto`/`max` routing doesn't
 *  probe on every document. */
export async function isRenderAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_healthCache && now - _healthCache.at < HEALTH_TTL_MS) return _healthCache.ok;
  let ok = false;
  try {
    const res = await fetch(`${RENDER_URL}/health`, { signal: AbortSignal.timeout(3_000) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  _healthCache = { at: now, ok };
  return ok;
}

/** Reset the cached health probe (tests). */
export function _resetRenderHealthCache(): void { _healthCache = null; }

/**
 * Render a PDF's pages to PNG images. `dpi` and `maxPages` bound cost/latency; the sidecar enforces its
 * own hard caps as a second layer. Throws when the sidecar is unreachable or errors — the caller degrades
 * to OCR.
 */
export async function renderPdfPages(
  bytes: Buffer,
  opts: { dpi?: number; maxPages?: number; timeoutMs?: number } = {},
): Promise<RenderedPages> {
  const dpi = opts.dpi ?? 150;
  const maxPages = opts.maxPages ?? 50;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), 'document.pdf');

  const url = `${RENDER_URL}/render?dpi=${dpi}&maxPages=${maxPages}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000) });
  } catch (err) {
    throw new Error(`render sidecar unreachable at ${RENDER_URL}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`render sidecar error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const body = await res.json() as { pages?: string[]; total?: number; truncated?: boolean };
  const pages = (body.pages ?? []).map(b64 => Buffer.from(b64, 'base64'));
  if (body.truncated) log.debug(`render: document truncated to ${pages.length}/${body.total} pages`);
  return { pages, total: body.total ?? pages.length, truncated: body.truncated ?? false };
}
