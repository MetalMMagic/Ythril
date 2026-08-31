/**
 * Shared types for Settings → Models & Pipelines.
 *
 * Lifted out of the single 656-line `mediaProcessing.component.ts` so the three tabs and the provider card can
 * agree on one shape. They previously existed once, inside the component that also rendered them —
 * which is why four provider cards written in that one file each ended up with their own field order.
 */
/**
 * The ladders, low → high, mirroring `server/src/config/types.ts`.
 *
 * `auto` is listed FIRST in each because it is the default and means "as much as is possible" — it
 * does not rank, so putting it at the top of a list ordered by capability would be a lie about where
 * it sits. The server validates against its own copy; these only drive the pickers.
 */
export const IMAGE_LEVELS = ['auto', 'off', 'caption', 'recognition'];
export const AUDIO_LEVELS = ['auto', 'off', 'on'];
export const VIDEO_LEVELS = ['auto', 'off', 'audio', 'full'];
export const TEXT_LEVELS = ['auto', 'off', 'embed', 'chunk'];
export const MODE_DESC = {
    off: 'Documents are stored but never read. No text is extracted, so nothing from them can be recalled.',
    ocr: 'The OCR sidecar (Tesseract) reads text and tables from each page. Fast, fully local, no vision model needed.',
    vlm: 'Render each page and transcribe it with the vision model, grounded on the OCR text.',
    repair: 'VLM, plus a repair pass that reconciles the draft against the OCR text — and a second-model consensus pass when a verify model is set.',
    auto: 'As much as this instance can do: the repair pass when a repair model is configured, otherwise the vision model, otherwise OCR.',
};
/** Which pipeline stages are active per mode (drives the diagram). */
export const MODE_STAGES = {
    off: new Set([]),
    ocr: new Set(['ocr']),
    vlm: new Set(['ocr', 'render', 'vlm', 'validate']),
    repair: new Set(['ocr', 'render', 'vlm', 'validate', 'repair', 'verify']),
    // 'auto' resolves to the top rung the instance can run, so it shows the full chain — the stages it
    // cannot run are the same ones the missing-model warning already calls out.
    auto: new Set(['ocr', 'render', 'vlm', 'validate', 'repair', 'verify']),
};
export const STAGES = [
    { key: 'ocr', nm: 'OCR', sub: 'evidence' },
    { key: 'render', nm: 'Render', sub: 'page → PNG' },
    { key: 'vlm', nm: 'VLM', sub: 'vision' },
    { key: 'validate', nm: 'Validate', sub: 'coverage' },
    { key: 'repair', nm: 'Repair', sub: 'reconcile' },
    { key: 'verify', nm: 'Verify', sub: 'consensus' },
];
