import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MfaComponent } from './mfa.component';
import { SettingsCardComponent } from '../../shared/settings-card.component';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [TranslocoPipe, MfaComponent, SettingsCardComponent],
  styles: [`
    .prefs-page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }
    .section-label { margin: 12px 0 0; font-size: 12px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; color: var(--text-muted); }

    .lang-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .lang-btn {
      padding: 7px 18px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      font-family: var(--font);
      cursor: pointer;
      transition: color var(--transition), background var(--transition), border-color var(--transition);
    }
    .lang-btn:hover { color: var(--text-primary); background: var(--bg-primary); }
    .lang-btn.active {
      border-color: var(--accent);
      background: var(--nav-active-dim);
      color: var(--text-primary);
    }
  `],
  template: `
    <div class="prefs-page">
      <app-settings-card icon="globe" [heading]="'prefs.language.title' | transloco" [purpose]="'prefs.language.subtitle' | transloco">
        <div class="lang-grid">
          @for (lang of languages; track lang.code) {
            <button
              class="lang-btn"
              [class.active]="activeLang() === lang.code" [attr.aria-current]="activeLang() === lang.code ? 'true' : null"
              (click)="setLang(lang.code)">
              {{ lang.label }}
            </button>
          }
        </div>
      </app-settings-card>

      <h2 class="section-label">{{ 'prefs.security.title' | transloco }}</h2>
      <app-mfa />
    </div>
  `,
})
export class PreferencesComponent {
  private transloco = inject(TranslocoService);

  activeLang = signal(this.transloco.getActiveLang());

  readonly languages = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pl', label: 'Polski' },
  ];

  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    this.activeLang.set(lang);
    localStorage.setItem('lang', lang);
  }
}
