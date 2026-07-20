/**
 * SpaceSettingsTabComponent — tests for the U9-pt3 arrangement.
 *
 * These began as characterization tests pinning the PRE-pt3 layout (validation controls on this tab),
 * proven green against the original code. This revision updates them to the NEW arrangement the pt3
 * refactor introduces, so the move is an explicit, reviewable diff:
 *   - the tab groups its fields into four SettingsCards (Identity · Purpose · Limits · Document extraction);
 *   - the validationMode select and strictLinkage checkbox have MOVED to the Schema tab — this tab no
 *     longer renders the strictLinkage checkbox, and its only <select> is the F11-c extraction-mode one;
 *   - blank storage / TTL fields surface an "unlimited" / "no auto-delete" pill, not just hint text, and
 *     an unset per-space extraction override surfaces an "instance default" pill (F11-c).
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

  it('shows the "unlimited", "no auto-delete", and "instance default" pills when quota, TTL, and override are blank', async () => {
    const { el } = await setup(); // no maxGiB / recordTtlDays / documentExtraction → all inherit
    expect(el.querySelectorAll('app-status-pill').length).toBe(3);
  });

  it('hides the pills once a quota, TTL, and per-space extraction override are set', async () => {
    const { el } = await setup({ maxGiB: 5, recordTtlDays: 30, documentExtraction: 'vlm' } as Partial<Space>);
    expect(el.querySelectorAll('app-status-pill').length).toBe(0);
  });
});
