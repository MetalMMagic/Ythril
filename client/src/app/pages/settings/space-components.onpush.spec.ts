/**
 * Every component extracted from SpacesComponent (A17.8b) must stay OnPush.
 *
 * The house pattern: brain, file-manager, graph and audit-log all use OnPush and all assert it. The
 * old 1893-line SpacesComponent was the one major page that did not, and it could not simply be
 * flipped — `FileReader.onload` mutated plain fields with no signal write, so the view would have
 * gone stale silently. Extracting the page made that tractable: each child is small enough to be born
 * OnPush, with the offending fields (`schImportError`/`schImportInfo`) converted to signals in the
 * schema tab where they live.
 *
 * This asserts the property directly, because losing OnPush is invisible — nothing fails, the app
 * just quietly re-checks everything on every tick again.
 *
 * A21: the 262-line `SpacesComponent` page shell itself is now OnPush too. Once the FileReader
 * offenders moved into the schema tab, the shell became fully signal-driven (all state is
 * signals/computed; `saveSettings` writes only signals), so the flip is safe — and it is included
 * below so a future edit that reintroduces non-signal mutation trips this assertion.
 */
import { describe, it, expect } from 'vitest';
import { SpacesComponent } from './spaces.component';
import { SpaceCreateDialogComponent } from './space-create-dialog.component';
import { SpaceSettingsTabComponent } from './space-settings-tab.component';
import { SpaceSchemaTabComponent } from './space-schema-tab.component';
import { SpaceDuplicatesTabComponent } from './space-duplicates-tab.component';
import { SpaceDangerTabComponent } from './space-danger-tab.component';

describe('spaces page — the shell and extracted components are OnPush', () => {
  const CASES: [string, { ɵcmp?: { onPush?: boolean } }][] = [
    ['SpacesComponent', SpacesComponent],
    ['SpaceCreateDialogComponent', SpaceCreateDialogComponent],
    ['SpaceSettingsTabComponent', SpaceSettingsTabComponent],
    ['SpaceSchemaTabComponent', SpaceSchemaTabComponent],
    ['SpaceDuplicatesTabComponent', SpaceDuplicatesTabComponent],
    ['SpaceDangerTabComponent', SpaceDangerTabComponent],
  ];

  for (const [name, cmp] of CASES) {
    it(`${name} is compiled as OnPush`, () => {
      expect(cmp.ɵcmp?.onPush).toBe(true);
    });
  }
});
