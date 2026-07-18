import { CanDeactivateFn } from '@angular/router';
import type { SpacesComponent } from './spaces.component';

/**
 * U4: block navigating away from the Spaces page while the settings/schema editor modal has unsaved
 * edits, prompting the user to discard. Covers the sidebar-navigation exit; the modal's own close
 * (backdrop / ✕) is guarded in-component and reload/tab-close via `beforeunload`.
 */
export const spacesCanDeactivate: CanDeactivateFn<SpacesComponent> = (component) => component.canLeave();
