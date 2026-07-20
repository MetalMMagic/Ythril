/**
 * PreferencesComponent — CHARACTERIZATION tests.
 *
 * The Preferences page shipped with no coverage and is a design-system laggard (hand-rolled `.card` +
 * `.lang-btn`). PR-U12 rebuilds it on `SettingsCard` and groups MFA under a "Security" heading. The page's
 * only logic is the language switch, so these pin exactly that — green against the ORIGINAL code — so the
 * redesign (purely presentational for this component) is a reviewable diff, not a silent behaviour change.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { PreferencesComponent } from './preferences.component';
import { AuthApi } from '../../core/auth-api.service';

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PreferencesComponent, getTranslocoModule()],
    // The template embeds <app-mfa/>, which calls AuthApi.getMfaStatus() on init.
    providers: [{ provide: AuthApi, useValue: { getMfaStatus: () => of({ enabled: false }) } }],
  });
  const fixture = TestBed.createComponent(PreferencesComponent);
  return { fixture, c: fixture.componentInstance, transloco: TestBed.inject(TranslocoService) };
}

describe('PreferencesComponent — language switch', () => {
  beforeEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });

  it('offers exactly en / de / pl', () => {
    const { c } = make();
    expect(c.languages.map(l => l.code)).toEqual(['en', 'de', 'pl']);
  });

  it('setLang switches the active language, updates the signal, and persists to localStorage', () => {
    const { c, transloco } = make();
    const spy = vi.spyOn(transloco, 'setActiveLang');
    c.setLang('de');
    expect(spy).toHaveBeenCalledWith('de');
    expect(c.activeLang()).toBe('de');
    expect(localStorage.getItem('lang')).toBe('de');
  });

  // U12 arrangement: language on a SettingsCard, MFA under a Security section.
  it('renders the language SettingsCard, a Security section, and the MFA component', () => {
    const { fixture } = make();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-settings-card')).not.toBeNull();
    expect(el.querySelectorAll('.lang-btn').length).toBe(3);
    expect(el.querySelector('.section-label')).not.toBeNull();
    expect(el.querySelector('app-mfa')).not.toBeNull();
  });
});
