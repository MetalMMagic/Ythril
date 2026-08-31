import { isDevMode } from '@angular/core';
/**
 * Missing-key handler for i18n.
 *
 * In development every missing key is surfaced loudly (console.error, once per
 * key) so untranslated strings are caught during review instead of shipping as
 * raw dotted keys or silently falling back. In production the key is returned
 * quietly — the same graceful degradation Transloco does by default.
 *
 * Keyed off Angular's `isDevMode()` rather than Transloco's `prodMode` config so
 * it behaves correctly regardless of how that flag is set.
 */
export class DevMissingTranslationHandler {
    constructor() {
        /** Keys already reported this session — avoids console spam on re-render. */
        this.reported = new Set();
    }
    handle(key, _data) {
        if (isDevMode() && !this.reported.has(key)) {
            this.reported.add(key);
            console.error(`[i18n] Missing translation key: "${key}"`);
        }
        return key;
    }
}
