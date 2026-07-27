/**
 * SpaceSettingsTabComponent — tests for the U9-pt3 arrangement.
 *
 * These began as characterization tests pinning the PRE-pt3 layout (validation controls on this tab),
 * proven green against the original code. This revision updates them to the NEW arrangement the pt3
 * refactor introduces, so the move is an explicit, reviewable diff:
 *   - the tab groups its fields into five SettingsCards (Identity · Purpose · Limits · Document extraction · Media analysis);
 *   - the validationMode select and strictLinkage checkbox have MOVED to the Schema tab — this tab no
 *     longer renders the strictLinkage checkbox, and its only <select> is the F11-c extraction-mode one;
 *   - blank storage / TTL / extraction-override fields convey their default through the input
 *     placeholder and the "use instance default" select option — the redundant status pills that used
 *     to repeat those values were removed (owner feedback: a useless repeat of the field itself).
 *
 * The component is still pure ngModel bindings onto SpaceSettingsState; persistence is covered by
 * space-settings-state.service.spec and is unchanged by moving the inputs (the state field is shared).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SpaceSettingsTabComponent } from './space-settings-tab.component';
import { SpaceSettingsState } from './space-settings-state.service';
import { SpacesStore } from './spaces-store.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { NetworksApi } from '../../core/networks-api.service';
import type { Space } from '../../core/api.types';

async function setup(space: Partial<Space> = {}, ceiling?: 'off' | 'ocr' | 'vlm' | 'repair' | 'auto') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpaceSettingsTabComponent, getTranslocoModule()],
    providers: [
      SpaceSettingsState,
      SpacesStore,
      { provide: SpacesApi, useValue: { getSpaceStats: () => of({ spaceId: 'work' }) } },
      { provide: NetworksApi, useValue: { listNetworks: () => of({ networks: [] }) } },
    ],
  });
  if (ceiling) TestBed.inject(SpacesStore).docExtractionCeiling.set(ceiling);
  const fixture = TestBed.createComponent(SpaceSettingsTabComponent);
  const state = TestBed.inject(SpaceSettingsState);
  // Populate every editable field exactly as opening a space's settings dialog would.
  state.openSettings({ id: 'work', label: 'Work', ...space } as Space);
  fixture.detectChanges();
  // ngModel writes native input values to the DOM on a microtask — flush, then re-render.
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, state, el: fixture.nativeElement as HTMLElement };
}

describe('SpaceSettingsTabComponent — U9 pt3 arrangement', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('groups the fields into five SettingsCards (Identity · Purpose · Limits · Document extraction · Media analysis)', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('app-settings-card').length).toBe(5);
  });

  it('still renders label, purpose, usage notes, max storage, and record TTL', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(1); // label
    expect(el.querySelectorAll('textarea').length).toBe(2);                             // purpose + usageNotes
    expect(el.querySelectorAll('input[type="number"]').length).toBe(2);                 // maxGiB + recordTtlDays
  });

  it('no longer renders the validation controls; the selects are the extraction-mode + 4 media-level pickers', async () => {
    const { el } = await setup({ meta: { validationMode: 'strict', strictLinkage: true } } as Partial<Space>);
    // strictLinkage checkbox is gone. The selects are now F11-c's extraction-mode picker plus the four
    // per-space media-analysis pickers (image/audio/video/text) — no validation control among them.
    expect(el.querySelector('input[type="checkbox"]')).toBeNull();
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBe(5);
    // The extraction picker (identified by its 'ocr' option) is present among them.
    expect([...selects].some(s => s.querySelector('option[value="ocr"]'))).toBe(true);
  });

  it('the extraction dropdown offers only modes within the instance ceiling', async () => {
    // Ceiling 'ocr' → off/ocr allowed, vlm/repair hidden (they would be silently capped).
    const capped = await setup({}, 'ocr');
    const opts = () => [...(capped.el.querySelector('select') as HTMLSelectElement).options].map(o => o.value);
    expect(opts()).toContain('ocr');
    expect(opts()).not.toContain('vlm');
    expect(opts()).not.toContain('repair');
    // Inherit / auto / off are always offered (do less, or follow the ceiling).
    expect(opts()).toEqual(expect.arrayContaining(['', 'auto', 'off']));

    // Ceiling 'auto' (no limit) → every mode is offered.
    const open = await setup({}, 'auto');
    const openOpts = [...(open.el.querySelector('select') as HTMLSelectElement).options].map(o => o.value);
    expect(openOpts).toEqual(expect.arrayContaining(['', 'auto', 'off', 'ocr', 'vlm', 'repair']));
  });

  it('keeps a since-excluded stored value visible in the dropdown', async () => {
    // A space stored with 'repair' before the ceiling was lowered to 'ocr' must still show 'repair'
    // (so the select is not blank), even though it is above the ceiling.
    const { el } = await setup({ documentExtraction: 'repair' } as Partial<Space>, 'ocr');
    const opts = [...(el.querySelector('select') as HTMLSelectElement).options].map(o => o.value);
    expect(opts).toContain('repair');
  });

  it('renders no default-state pills — blank fields convey the default via placeholder and the inherit option', async () => {
    const { el } = await setup(); // no maxGiB / recordTtlDays / documentExtraction → all inherit
    // The redundant "unlimited" / "no auto-delete" / "instance default" pills were removed.
    expect(el.querySelectorAll('app-status-pill').length).toBe(0);
    // Each blank number input still communicates its default through placeholder text...
    const numbers = [...el.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    expect(numbers.length).toBe(2);
    expect(numbers.every(n => n.placeholder.trim().length > 0)).toBe(true);
    // ...and the extraction select keeps its "use instance default" (value="") option.
    const select = el.querySelector('select') as HTMLSelectElement;
    expect(select.querySelector('option[value=""]')).not.toBeNull();
  });

  it('still renders no pills once a quota, TTL, and per-space extraction override are set', async () => {
    const { el } = await setup({ maxGiB: 5, recordTtlDays: 30, documentExtraction: 'vlm' } as Partial<Space>);
    expect(el.querySelectorAll('app-status-pill').length).toBe(0);
  });
});
