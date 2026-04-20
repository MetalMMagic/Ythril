import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTransloco, Translation, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { mfaInterceptor } from './core/mfa.interceptor';
import { ThemeService } from './core/theme.service';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);
  getTranslation(lang: string) {
    return this.http.get<Translation>(`/assets/i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, mfaInterceptor])),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: (theme: ThemeService) => () => theme.init(),
      deps: [ThemeService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (transloco: TranslocoService) => () => {
        const saved = localStorage.getItem('lang');
        if (saved && ['en', 'de', 'pl'].includes(saved)) {
          transloco.setActiveLang(saved);
        }
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
  ],
};
