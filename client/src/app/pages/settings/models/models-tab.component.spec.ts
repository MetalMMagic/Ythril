/**
 * ModelsTabComponent — face-recognition Person Entity Types picker (item 16).
 *
 * The field is sourced from the Schema Library's entity types, but any already-stored value stays
 * selectable/removable. These tests exercise the component logic directly (no template render), so the
 * services are light mocks.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { ModelsTabComponent } from './models-tab.component';
import { ModelsStateService } from './models-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { SchemaApi } from '../../../core/schema-api.service';

function setup(libEntries: { knowledgeType: string; typeName: string }[] = [], initialTypes?: string[]) {
  const touched = vi.fn();
  const state = {
    face: { personEntityTypes: initialTypes } as { personEntityTypes?: string[] },
    touched: { set: touched },
    faceLocked: () => false,
    managed: false,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ModelsTabComponent, getTranslocoModule()],
    providers: [
      { provide: ModelsStateService, useValue: state },
      { provide: PipelineStatusService, useValue: { status: () => null, bySidecarKey: () => new Map() } },
      { provide: SchemaApi, useValue: { listSchemaLibrary: () => of({ entries: libEntries }) } },
    ],
  });
  const c = TestBed.createComponent(ModelsTabComponent).componentInstance;
  c.ngOnInit(); // loads libEntityTypes from the mocked library
  return { c, state, touched };
}

describe('ModelsTabComponent — person-types picker', () => {
  it('loads entity types from the library (entities only, deduped, sorted)', () => {
    const { c } = setup([
      { knowledgeType: 'entity', typeName: 'person' },
      { knowledgeType: 'memory', typeName: 'note' },     // non-entity, excluded
      { knowledgeType: 'entity', typeName: 'org' },
      { knowledgeType: 'entity', typeName: 'person' },    // dup
    ]);
    expect(c.libEntityTypes()).toEqual(['org', 'person']);
  });

  it('availablePersonTypes excludes already-selected types', () => {
    const { c } = setup([
      { knowledgeType: 'entity', typeName: 'person' },
      { knowledgeType: 'entity', typeName: 'org' },
    ], ['person']);
    expect(c.availablePersonTypes()).toEqual(['org']);
  });

  it('addPersonType adds a type (no dup) and marks the form touched', () => {
    const { c, state, touched } = setup([{ knowledgeType: 'entity', typeName: 'org' }], ['person']);
    c.addPersonType('org');
    expect(state.face.personEntityTypes).toEqual(['person', 'org']);
    expect(touched).toHaveBeenCalledWith(true);
    // adding a dup is a no-op
    c.addPersonType('org');
    expect(state.face.personEntityTypes).toEqual(['person', 'org']);
  });

  it('removePersonType drops the type and marks the form touched', () => {
    const { c, state, touched } = setup([], ['person', 'org']);
    c.removePersonType('person');
    expect(state.face.personEntityTypes).toEqual(['org']);
    expect(touched).toHaveBeenCalledWith(true);
  });

  it('keeps a stored type that is no longer in the library (still removable)', () => {
    // 'legacy' is stored but not in the library — it must stay listed and removable.
    const { c, state } = setup([{ knowledgeType: 'entity', typeName: 'person' }], ['legacy']);
    expect(state.face.personEntityTypes).toContain('legacy');
    expect(c.availablePersonTypes()).toEqual(['person']);   // library options don't include the stored 'legacy'
    c.removePersonType('legacy');
    expect(state.face.personEntityTypes).toEqual([]);
  });
});
