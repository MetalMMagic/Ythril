import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';

/**
 * Transloco module for component specs.
 *
 * Any component whose template uses the `transloco` pipe needs a TranslocoService in its test
 * injector. This provides one with an empty `en` translation and the missing-key handler set to
 * echo the key back — so a spec can assert on stable key strings without maintaining a copy of
 * the real translation files. Pass `translation` to override a specific key when a test needs
 * the rendered text.
 */
export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: { en: options.translation?.['en'] ?? {} },
    translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
    preloadLangs: true,
    ...options,
  });
}
