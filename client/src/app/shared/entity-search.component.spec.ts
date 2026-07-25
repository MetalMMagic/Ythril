/**
 * EntitySearchComponent — the A–Z / Semantic mode pill gating (2b-iii-d).
 *
 * Pickers must keep the toggle (exact name lookup matters when linking a known entity like "ADR002",
 * where semantic recall struggles). A `bar`-mode consumer can pass `showModeToggle=false` to become
 * semantic-only (the entities tab) — the pill hides AND the mode locks to semantic.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../testing/transloco-testing';
import { BrainApi } from '../core/brain-api.service';
import { EntitySearchComponent } from './entity-search.component';

function make(props: Partial<EntitySearchComponent>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EntitySearchComponent, getTranslocoModule()],
    providers: [{ provide: BrainApi, useValue: { recallBrain: vi.fn(() => of({ results: [], count: 0 })), searchEntitiesByName: vi.fn(() => of({ entities: [] })) } }],
  });
  const fixture = TestBed.createComponent(EntitySearchComponent);
  Object.assign(fixture.componentInstance, { spaceId: 'work', ...props });
  fixture.detectChanges(); // ngOnInit
  return fixture;
}

const hasPill = (f: { nativeElement: HTMLElement }) => !!f.nativeElement.querySelector('.pill-group');

describe('EntitySearchComponent — mode pill gating', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('bar mode shows the pill by default (showModeToggle defaults true)', () => {
    expect(hasPill(make({ mode: 'bar' }))).toBe(true);
  });

  it('bar mode with showModeToggle=false hides the pill and locks to semantic', () => {
    const f = make({ mode: 'bar', showModeToggle: false, defaultMode: 'semantic' });
    expect(hasPill(f)).toBe(false);
    expect(f.componentInstance.searchMode()).toBe('semantic');
  });

  it('showModeToggle=false forces semantic even if defaultMode is name', () => {
    const f = make({ mode: 'bar', showModeToggle: false, defaultMode: 'name' });
    expect(hasPill(f)).toBe(false);
    expect(f.componentInstance.searchMode()).toBe('semantic');
  });

  it('picker mode ALWAYS keeps the pill (even if showModeToggle=false) and defaults to name', () => {
    const f = make({ mode: 'picker', showModeToggle: false });
    expect(hasPill(f)).toBe(true);
    expect(f.componentInstance.searchMode()).toBe('name');
  });
});
