/**
 * SpaceSettingsTabComponent — tests for the U9-pt3 arrangement.
 *
 * These began as characterization tests pinning the PRE-pt3 layout (validation controls on this tab),
 * proven green against the original code. This revision updates them to the NEW arrangement the pt3
 * refactor introduces, so the move is an explicit, reviewable diff:
 *   - the tab groups its fields into four SettingsCards (Identity · Purpose · Limits · Document extraction);
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
  // ngModel writes native input values to the DOM on a microtask — flush, then re-render.
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, state, el: fixture.nativeElement as HTMLElement };
}

describe('SpaceSettingsTabComponent — U9 pt3 arrangement', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('groups the fields into four SettingsCards (Identity · Purpose · Limits · Document extraction)', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('app-settings-card').length).toBe(4);
  });

  it('still renders label, purpose, usage notes, max storage, and record TTL', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(1); // label
    expect(el.querySelectorAll('textarea').length).toBe(2);                             // purpose + usageNotes
    expect(el.querySelectorAll('input[type="number"]').length).toBe(2);                 // maxGiB + recordTtlDays
  });

  it('no longer renders the validation controls — the only select is the extraction-mode one', async () => {
    const { el } = await setup({ meta: { validationMode: 'strict', strictLinkage: true } } as Partial<Space>);
    // strictLinkage checkbox is gone; the sole remaining <select> is F11-c's extraction-mode picker.
    expect(el.querySelector('input[type="checkbox"]')).toBeNull();
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBe(1);
    expect(selects[0].querySelector('option[value="ocr"]')).not.toBeNull();
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
