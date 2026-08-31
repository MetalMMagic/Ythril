import { provideZonelessChangeDetection, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler, TitleStrategy } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTransloco, provideTranslocoMissingHandler, TranslocoService } from '@jsverse/transloco';
import { DevMissingTranslationHandler } from './core/dev-missing-translation.handler';
import { Injectable } from '@angular/core';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { mfaInterceptor } from './core/mfa.interceptor';
import { ThemeService } from './core/theme.service';
import { TranslocoTitleStrategy } from './core/title-strategy';
import { staleBuildNavigationErrorHandler, installStaleBuildGlobalHandler, markBuildLoaded } from './core/stale-build-recovery';
import * as i0 from "@angular/core";
export class TranslocoHttpLoader {
    constructor() {
        this.http = inject(HttpClient);
    }
    getTranslation(lang) {
        return this.http.get(`/assets/i18n/${lang}.json`);
    }
    static { this.ɵfac = function TranslocoHttpLoader_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TranslocoHttpLoader)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: TranslocoHttpLoader, factory: TranslocoHttpLoader.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TranslocoHttpLoader, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
export const appConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(staleBuildNavigationErrorHandler)),
        { provide: TitleStrategy, useClass: TranslocoTitleStrategy },
        provideHttpClient(withInterceptors([authInterceptor, mfaInterceptor])),
        provideAnimationsAsync(),
        {
            // Recover from "the app was updated while this tab was open": the stale bundle asks for lazy
            // chunks that no longer exist, and without this the navigation dies silently — no message, no
            // network entry, just a dead click. Registered first so it is listening as early as possible.
            provide: APP_INITIALIZER,
            useFactory: () => () => { installStaleBuildGlobalHandler(); markBuildLoaded(); },
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            useFactory: (theme) => () => theme.init(),
            deps: [ThemeService],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            useFactory: (transloco) => () => {
                const saved = localStorage.getItem('lang');
                if (saved && ['en', 'de', 'pl'].includes(saved)) {
                    transloco.setActiveLang(saved);
                }
                // Keep <html lang> in sync so screen-reader pronunciation and browser
                // hyphenation match the active UI language — on startup and on every
                // switch (langChanges$ fires whenever setActiveLang is called).
                document.documentElement.lang = transloco.getActiveLang();
                transloco.langChanges$.subscribe(lang => {
                    document.documentElement.lang = lang;
                });
            },
            deps: [TranslocoService],
            multi: true,
        },
        provideTransloco({
            config: {
                availableLangs: ['en', 'de', 'pl'],
                defaultLang: 'en',
                fallbackLang: 'en',
                reRenderOnLangChange: true,
                prodMode: false,
            },
            loader: TranslocoHttpLoader,
        }),
        provideTranslocoMissingHandler(DevMissingTranslationHandler),
    ],
};
