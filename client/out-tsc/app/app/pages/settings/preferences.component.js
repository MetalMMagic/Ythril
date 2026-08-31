import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MfaComponent } from './mfa.component';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.code;
function PreferencesComponent_For_6_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 5);
    i0.ɵɵlistener("click", function PreferencesComponent_For_6_Template_button_click_0_listener() { const lang_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.setLang(lang_r2.code)); });
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const lang_r2 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵclassProp("active", ctx_r2.activeLang() === lang_r2.code);
    i0.ɵɵattribute("aria-current", ctx_r2.activeLang() === lang_r2.code ? "true" : null);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1(" ", lang_r2.label, " ");
} }
export class PreferencesComponent {
    constructor() {
        this.transloco = inject(TranslocoService);
        this.activeLang = signal(this.transloco.getActiveLang(), ...(ngDevMode ? [{ debugName: "activeLang" }] : /* istanbul ignore next */ []));
        this.languages = [
            { code: 'en', label: 'English' },
            { code: 'de', label: 'Deutsch' },
            { code: 'pl', label: 'Polski' },
        ];
    }
    setLang(lang) {
        this.transloco.setActiveLang(lang);
        this.activeLang.set(lang);
        localStorage.setItem('lang', lang);
    }
    static { this.ɵfac = function PreferencesComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || PreferencesComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: PreferencesComponent, selectors: [["app-preferences"]], decls: 11, vars: 9, consts: [[1, "prefs-page"], ["icon", "globe", 3, "heading", "purpose"], [1, "lang-grid"], [1, "lang-btn", 3, "active"], [1, "section-label"], [1, "lang-btn", 3, "click"]], template: function PreferencesComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-settings-card", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementStart(4, "div", 2);
            i0.ɵɵrepeaterCreate(5, PreferencesComponent_For_6_Template, 2, 4, "button", 3, _forTrack0);
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(7, "h2", 4);
            i0.ɵɵtext(8);
            i0.ɵɵpipe(9, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelement(10, "app-mfa");
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 3, "prefs.language.title"))("purpose", i0.ɵɵpipeBind1(3, 5, "prefs.language.subtitle"));
            i0.ɵɵadvance(4);
            i0.ɵɵrepeater(ctx.languages);
            i0.ɵɵadvance(3);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 7, "prefs.security.title"));
        } }, dependencies: [MfaComponent, SettingsCardComponent, TranslocoPipe], styles: [".prefs-page[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }\n    .section-label[_ngcontent-%COMP%] { margin: 12px 0 0; font-size: 12px; font-weight: 700; letter-spacing: .06em;\n      text-transform: uppercase; color: var(--text-muted); }\n\n    .lang-grid[_ngcontent-%COMP%] {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n    }\n\n    .lang-btn[_ngcontent-%COMP%] {\n      padding: 7px 18px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-secondary);\n      font-size: 13px;\n      font-weight: 500;\n      font-family: var(--font);\n      cursor: pointer;\n      transition: color var(--transition), background var(--transition), border-color var(--transition);\n    }\n    .lang-btn[_ngcontent-%COMP%]:hover { color: var(--text-primary); background: var(--bg-primary); }\n    .lang-btn.active[_ngcontent-%COMP%] {\n      border-color: var(--accent);\n      background: var(--nav-active-dim);\n      color: var(--text-primary);\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PreferencesComponent, [{
        type: Component,
        args: [{ selector: 'app-preferences', standalone: true, imports: [TranslocoPipe, MfaComponent, SettingsCardComponent], template: `
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
  `, styles: ["\n    .prefs-page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }\n    .section-label { margin: 12px 0 0; font-size: 12px; font-weight: 700; letter-spacing: .06em;\n      text-transform: uppercase; color: var(--text-muted); }\n\n    .lang-grid {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n    }\n\n    .lang-btn {\n      padding: 7px 18px;\n      border-radius: var(--radius-sm);\n      border: 1px solid var(--border);\n      background: var(--bg-elevated);\n      color: var(--text-secondary);\n      font-size: 13px;\n      font-weight: 500;\n      font-family: var(--font);\n      cursor: pointer;\n      transition: color var(--transition), background var(--transition), border-color var(--transition);\n    }\n    .lang-btn:hover { color: var(--text-primary); background: var(--bg-primary); }\n    .lang-btn.active {\n      border-color: var(--accent);\n      background: var(--nav-active-dim);\n      color: var(--text-primary);\n    }\n  "] }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(PreferencesComponent, { className: "PreferencesComponent", filePath: "app/pages/settings/preferences.component.ts", lineNumber: 60 }); })();
