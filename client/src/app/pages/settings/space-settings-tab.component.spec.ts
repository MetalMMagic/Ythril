/**
 * SpaceSettingsTabComponent — CHARACTERIZATION tests.
 *
 * Written BEFORE the PR-U9 part-3 rework and proven green against the ORIGINAL code, so the redesign has
 * a safety net. The component has no logic of its own — it is pure `ngModel` bindings onto
 * `SpaceSettingsState` — so what these pin is the *arrangement*: which editable controls the Settings tab
 * currently renders, and that each is two-way bound to the state field the footer save serialises.
 *
 * That matters because part 3 will (a) group the fields into `SettingsCard`s and (b) **move** the
 * `validationMode` select and the `strictLinkage` checkbox OUT of this tab and onto the Schema tab (an
 * information-architecture fix — validation posture belongs with the schemas it governs). Pinning that
 * both controls live HERE today makes the move a visible, reviewable diff against this spec rather than an
 * accidental drop. Persistence itself (`schValidation`/`schStrictLinkage` → `buildMeta`) is already
 * covered by space-settings-state.service.spec — unchanged by the move, since the state field is shared.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceSettingsTabComponent } from './space-settings-tab.component';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesApi } from '../../core/spaces-api.service';
import type { Space } from '../../core/api.types';

async function setup(space: Partial<Space> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceSettingsTabComponent, getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      { provide: SpacesApi, useValue: { getSpaceStats: () => of({ spaceId: 'work' }) } },
    ],
  });
  const fixture = TestBed.createComponent(SpaceSettingsTabComponent);
  const state = TestBed.inject(SpaceSettingsState);
  // Populate every editable field exactly as opening a space's settings dialog would.
  state.openSettings({ id: 'work', label: 'Work', ...space } as Space);
  fixture.detectChanges();
  // ngModel writes native <select>/<input> values to the DOM on a microtask, so one synchronous
  // detectChanges() isn't enough to see the initial state → view sync — flush it, then re-render.
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, state, el: fixture.nativeElement as HTMLElement };
}

describe('SpaceSettingsTabComponent — control arrangement (pre-U9-pt3)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders the identity/purpose/limit fields: label, purpose, usage notes, max storage, record TTL', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(1); // label
    expect(el.querySelectorAll('textarea').length).toBe(2);                             // purpose + usageNotes
    expect(el.querySelectorAll('input[type="number"]').length).toBe(2);                 // maxGiB + recordTtlDays
  });

  it('renders the validation controls ON the settings tab today: a 3-option validationMode select and a strictLinkage checkbox', async () => {
    const { el } = await setup();
    const select = el.querySelector('select') as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    expect(Array.from(select!.options).map(o => o.value)).toEqual(['off', 'warn', 'strict']);
    expect(el.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('the validationMode select reflects state.schValidation (state → view)', async () => {
    const { el } = await setup({ meta: { validationMode: 'strict' } } as Partial<Space>);
    expect((el.querySelector('select') as HTMLSelectElement).value).toBe('strict');
  });

  it('changing the validationMode select writes state.schValidation (view → state)', async () => {
    const { fixture, state, el } = await setup();
    expect(state.schValidation).toBe('off');
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'strict';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(state.schValidation).toBe('strict');
  });

  it('the strictLinkage checkbox is two-way bound to state.schStrictLinkage', async () => {
    const { fixture, state, el } = await setup({ meta: { strictLinkage: true } } as Partial<Space>);
    const box = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);           // state → view
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(state.schStrictLinkage).toBe(false); // view → state
  });
});
