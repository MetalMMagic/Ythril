import { ssrfSafeFetch } from '../../util/ssrf.js';
import { isUsableDescriptor } from './face-descriptor.js';
import { boundedJson } from '../../util/bounded-read.js';
import { getConfig, getSecrets } from '../../config/loader.js';
import { allowPrivateForSlot } from '../../config/model-egress-policy.js';
import { log } from '../../util/log.js';

/** One detected face, in exactly the shape the in-process recogniser produces. */
export interface ExternalFace {
  /** 128-d descriptor. Anything else is rejected — the gallery's cosine search assumes this width. */
  embedding: number[];
  /** `[x, y, w, h]`, normalised 0–1, like `human`'s `boxRaw`. Optional: only used for the size filter. */
  boxRaw?: [number, number, number, number];
}

/** Wire shape a provider must return: `{ faces: [{ embedding, boxRaw? }] }`. */
interface ExternalFaceResponse { faces?: Array<{ embedding?: unknown; boxRaw?: unknown }> }

/**
 * Exported so `hopBudgets()` can see it. 30 s is comfortably under the 300 s stall default, but
 * `stalledJobTimeoutMs` may be set as low as 30 000 (admin schema minimum) — at which point this single call
 * is exactly the stall timeout, and a job would be re-queued in the same instant the call gave up.
 */
export const FACE_TIMEOUT_MS = 30_000;
/** A single image cannot legitimately contain more than this; caps a hostile or broken provider. */
const MAX_FACES = 64;

/**
 * Is the external face model configured AND consented to?
 *
 * Both halves are required. The endpoint is only usable once `acknowledgedHost` matches the host it
 * would send to — the same rule `media-config.ts` enforces on write. Checking it again here means a
 * config edited on disk (bypassing the API) still cannot silently egress biometric data.
 */
export function faceEndpointConsented(ext?: { baseUrl?: string; acknowledgedHost?: string }): boolean {
  const baseUrl = ext?.baseUrl?.trim();
  if (!baseUrl) return false;
  try {
    return ext?.acknowledgedHost === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

/** `faceEndpointConsented` against the live config. Split so the rule itself is testable without it. */
export function externalFaceReady(): boolean {
  return faceEndpointConsented(getConfig().mediaEmbedding?.faceRecognition?.externalModel);
}

/**
 * Detect + embed faces via the configured external provider.
 *
 * Returns `null` on ANY failure — unconfigured, unacknowledged, unreachable, malformed. The caller then
 * runs the in-process recogniser, so a broken endpoint degrades to local processing instead of dropping
 * faces silently. That fallback is the whole reason this returns null rather than throwing.
 *
 * `ssrfSafeFetch` rather than `fetch`: the URL is admin-settable through the API, and a plain fetch would
 * follow a redirect into link-local metadata. Validating the URL at write time is not enough on its own —
 * DNS can change between the save and the call.
 */
export async function detectFacesExternal(imageBytes: Buffer): Promise<ExternalFace[] | null> {
  if (!externalFaceReady()) return null;
  const ext = getConfig().mediaEmbedding?.faceRecognition?.externalModel;
  const baseUrl = ext?.baseUrl?.trim();
  if (!baseUrl) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKey = (getSecrets() as any)?.mediaEmbedding?.faceApiKey as string | undefined;

  try {
    const res = await ssrfSafeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        ...(ext?.model ? { model: ext.model } : {}),
        image: imageBytes.toString('base64'),
      }),
      signal: AbortSignal.timeout(FACE_TIMEOUT_MS),
    }, {
      // Matches the assist model: a self-hosted recogniser may live on a private cluster address. The
      // guard stays on — DNS-resolve, IP-pin and redirect re-validation all still apply; only the
      // private-address rejection lifts. Without this the WRITE check accepts such an endpoint and every
      // call then fails, which is a configurable feature that silently does not work.
      allowPrivate: allowPrivateForSlot('faceExternal'),
    });
    if (!res.ok) {
      log.warn(`External face model: HTTP ${res.status} — falling back to in-process recognition`);
      return null;
    }
    const body = await boundedJson<ExternalFaceResponse>(res, 'external face provider');
    const raw = Array.isArray(body?.faces) ? body.faces.slice(0, MAX_FACES) : [];

    const faces: ExternalFace[] = [];
    for (const f of raw) {
      // 128 floats exactly. A provider returning a different width would corrupt gallery similarity
      // scores rather than fail loudly, so the wrong shape is dropped here, not downstream.
      if (!isUsableDescriptor(f?.embedding, 'external')) continue;
      // `isUsableDescriptor` has already established this is an array of the right LENGTH; the values are
      // still a provider's word for it, so they are checked before anything stores them.
      const emb = f.embedding as unknown[];
      if (!emb.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))) continue;
      const box = f.boxRaw;
      const boxRaw = Array.isArray(box) && box.length === 4 && box.every(n => typeof n === 'number' && Number.isFinite(n))
        ? [box[0], box[1], box[2], box[3]] as [number, number, number, number]
        : undefined;
      faces.push({ embedding: f.embedding as number[], ...(boxRaw ? { boxRaw } : {}) });
    }
    return faces;
  } catch (err) {
    log.warn(`External face model unreachable (${err instanceof Error ? err.message : String(err)}) — falling back to in-process recognition`);
    return null;
  }
}
