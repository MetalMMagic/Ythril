/**
 * Fields the media-config GET emits and its PATCH does not accept.
 *
 * ## Why a declaration rather than a silent strip
 *
 * `GET /api/admin/media-config` returns the RESOLVED config; the patch schemas are `.strict()`. Any field in
 * the first set and not the second makes read-modify-write — the ordinary way to change one key of a config
 * block — a **400 on the whole body**. Declaring it here makes both directions right at once:
 *
 *   - send back the value you were given → **stripped**, and the rest of the patch applies;
 *   - send a DIFFERENT value → **refused**, quoting the prose below, which says where the field actually is
 *     set. Quietly ignoring an attempted change is the silent-acceptance defect this API is trying to shed.
 *
 * ## Why it is its own module
 *
 * `media-config.ts` is at its size ceiling, and this is a declaration table rather than route logic — the same
 * reason `setting-bounds.ts` exists. `the-media-config-get-body-round-trips.test.js` derives the subject from
 * the RESOLVER, so a new `DOC_*` slot that appears in the GET and not here is caught on the commit that adds
 * it rather than whenever somebody next round-trips a body.
 */

export const SERVER_OWNED_MEDIA_PATHS = [
  // Face recognition: an infra pin, plus two fields the schema's own comment already calls env-only.
  'faceRecognition.enabled',
  'faceRecognition.modelPath',
  'faceRecognition.reprocessSyncedImages',
  // Document processing: seven keys the RESOLVED GET emits and this schema does not accept. Declaring them
  // here is what makes read-modify-write work — send back the block you were given and these are stripped;
  // send a different value and you are refused with prose saying where the field actually lives.
  //
  // They were undeclared until 2026-08-30, so PATCHing a round-tripped body was a 400 on the whole body. That
  // surfaced as an intermittent CI flake for two days: a restore hook that fails is invisible whenever the
  // value it wanted was already there.
  'documentProcessing.maxTotalPages',
  'documentProcessing.vlmModel',
  'documentProcessing.vlmBaseUrl',
  'documentProcessing.repairModel',
  'documentProcessing.repairBaseUrl',
  'documentProcessing.verifyModel',
  'documentProcessing.verifyBaseUrl',
] as const;

/** How each stripped path is actually set, for the refusal message. Prose because each one differs. */
export const SERVER_OWNED_MEDIA_HOW: Record<string, string> = {
  'faceRecognition.enabled':
    'it is an infra pin set by FACE_RECOGNITION_ENABLED only, and whether faces RUN is decided by the image '
    + "pipeline's recognition rung rather than by this field",
  'faceRecognition.modelPath':
    'it selects which files the process loads, so it stays env/config-only — an admin API that could repoint '
    + 'it could load arbitrary model files',
  'faceRecognition.reprocessSyncedImages':
    "it decides whether a network peer's images are re-analysed locally, which is an infra-shaped choice",
  'documentProcessing.maxTotalPages':
    'it is a config-file field only — set `mediaEmbedding.documentProcessing.maxTotalPages` in config.json. It '
    + 'bounds a whole document rather than one render window, which is a deployment-sizing choice rather than '
    + 'a per-request one',
  'documentProcessing.vlmModel':
    'it is set by DOC_VLM_MODEL or by config.json — the document VLM is a model slot the deployment provides, '
    + 'not something an operator repoints from this page',
  'documentProcessing.vlmBaseUrl':
    'it is set by DOC_VLM_URL or by config.json, and it decides which host rendered page images are sent to — '
    + 'an egress destination, so it stays with whoever configures egress',
  'documentProcessing.repairModel':
    'it is set by DOC_REPAIR_MODEL or by config.json; the repair pass runs only in `repair` mode and reuses '
    + 'vlmModel when unset',
  'documentProcessing.repairBaseUrl':
    'it is set by DOC_REPAIR_URL or by config.json, and like vlmBaseUrl it is an egress destination',
  'documentProcessing.verifyModel':
    'it is set by DOC_VERIFY_MODEL or by config.json',
  'documentProcessing.verifyBaseUrl':
    'it is set by DOC_VERIFY_URL or by config.json, and like vlmBaseUrl it is an egress destination',
};
