/**
 * BrainStore — CHARACTERIZATION tests for the derived list state.
 *
 * Written against the unmodified 3701-line component BEFORE the A17.9 split, and landed as their own
 * PR. A characterization test only means anything if it was green against the ORIGINAL code; written
 * during a refactor it just proves the new code agrees with itself.
 *
 * The existing brain.component.spec.ts covers rendering (OnPush, the drawer, the network indicator).
 * It does not touch the pure derived state below — which is precisely what A17.9 relocates when the
 * eight tab-views become child components over a shared BrainState. So this pins:
 *
 *   - the `*TagSuggestions` union of schema suggestions + tags present on loaded records
 *   - `*TypeOptions`: schema names UNION values present, deduped and SORTED
 *
 * (No `filtered*` views remain to pin — every tab filters server-side since 4c-i; file-meta's old
 * client `filteredFileMetas` was removed with the top-bar client filter.)
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import type { ChronoEntry, Edge, Entity, Memory, SpaceMetaResponse } from '../../core/api.types';
import { BrainStore } from './brain-store.service';

const mem = (fact: string, over: Partial<Memory> = {}): Memory =>
  ({ _id: fact, fact, tags: [], createdAt: '', seq: 1, ...over } as Memory);
const ent = (name: string, over: Partial<Entity> = {}): Entity =>
  ({ _id: name, name, tags: [], createdAt: '', ...over } as Entity);
const edge = (label: string, over: Partial<Edge> = {}): Edge =>
  ({ _id: label, from: 'a', to: 'b', label, tags: [], createdAt: '', ...over } as Edge);
const chrono = (title: string, over: Partial<ChronoEntry> = {}): ChronoEntry =>
  ({ _id: title, title, type: 'event', tags: [], entityIds: [], memoryIds: [], startsAt: '', status: 'upcoming', ...over } as ChronoEntry);

function create(): BrainStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [BrainStore] });
  return TestBed.inject(BrainStore);
}

describe('BrainStore — tag suggestions', () => {
  const meta = (tagSuggestions: string[]) => ({ tagSuggestions, typeSchemas: {} } as unknown as SpaceMetaResponse);

  // BEHAVIOUR CHANGE, not a test tidy-up. This used to union the space-wide `meta.tagSuggestions`
  // with the tags on loaded records. That list was retired: it was editable in one place, applied to
  // every type and every record form in the space, and was easy to set once and forget — a stored
  // list quietly steering what agents and people tagged with. Suggestions now come from what is
  // actually in use, which maintains itself and needs no editor.
  it('suggests the tags present on loaded records, deduped — and ignores the retired space-wide list', () => {
    const c = create();
    c.spaceMeta.set(meta(['schema-tag', 'shared']));
    c.memories.set([mem('a', { tags: ['shared', 'from-record'] })]);
    expect(c.memoryTagSuggestions()).toEqual(['shared', 'from-record']);
  });

  it('a stored space-wide list contributes nothing, even when no records are loaded', () => {
    // Pins the retirement itself: the value survives in config.json untouched, but it must not come
    // back into the UI through this path.
    const c = create();
    c.spaceMeta.set(meta(['schema-tag']));
    c.memories.set([]);
    expect(c.memoryTagSuggestions()).toEqual([]);
  });

  it('works with no schema suggestions at all', () => {
    const c = create();
    c.spaceMeta.set(null);
    c.entities.set([ent('x', { tags: ['only-record'] })]);
    expect(c.entityTagSuggestions()).toEqual(['only-record']);
  });

  it('each collection draws from its OWN records', () => {
    const c = create();
    c.spaceMeta.set(meta([]));
    c.edges.set([edge('e', { tags: ['edge-tag'] })]);
    c.chrono.set([chrono('c', { tags: ['chrono-tag'] })]);
    expect(c.edgeTagSuggestions()).toEqual(['edge-tag']);
    expect(c.chronoTagSuggestions()).toEqual(['chrono-tag']);
  });
});

describe('BrainStore — type options for the filter bar', () => {
  it('unions schema type names with the types actually present, deduped and sorted', () => {
    const c = create();
    c.spaceMeta.set({ typeSchemas: { memory: { note: {}, decision: {} } } } as unknown as SpaceMetaResponse);
    c.memories.set([mem('a', { type: 'observation' }), mem('b', { type: 'note' })]);
    expect(c.memoryTypeOptions()).toEqual(['decision', 'note', 'observation']);
  });

  it('records with no type contribute nothing', () => {
    const c = create();
    c.spaceMeta.set({ typeSchemas: { memory: { note: {} } } } as unknown as SpaceMetaResponse);
    c.memories.set([mem('a')]);
    expect(c.memoryTypeOptions()).toEqual(['note']);
  });

  it('edge types are not schema-backed — options come only from the loaded list', () => {
    const c = create();
    c.spaceMeta.set({ typeSchemas: { edge: { knows: {} } } } as unknown as SpaceMetaResponse);
    c.edges.set([edge('x', { type: 'runtime-type' })]);
    expect(c.edgeTypeOptions()).toEqual(['runtime-type']);
  });

  it('with no schema and no records the options are empty', () => {
    const c = create();
    c.spaceMeta.set(null);
    expect(c.memoryTypeOptions()).toEqual([]);
  });
});

describe('BrainStore — buildPropertiesObject (schema-seeded defaults)', () => {
  const withEntitySchema = (c: BrainStore, propertySchemas: Record<string, unknown>) =>
    c.spaceMeta.set({ typeSchemas: { entity: { Person: { propertySchemas } } } } as unknown as SpaceMetaResponse);

  it('seeds each missing key with a typed default (enum→first, number→0, boolean→false, else "")', () => {
    const c = create();
    withEntitySchema(c, {
      role: { type: 'string', enum: ['admin', 'user'] },
      age: { type: 'number' },
      active: { type: 'boolean' },
      note: { type: 'string' },
    });
    expect(c.buildPropertiesObject('entity', {}, 'Person')).toEqual({
      role: 'admin', age: 0, active: false, note: '',
    });
  });

  it('preserves values already present (does not overwrite existing keys)', () => {
    const c = create();
    withEntitySchema(c, { age: { type: 'number' }, note: { type: 'string' } });
    expect(c.buildPropertiesObject('entity', { age: 42 }, 'Person')).toEqual({ age: 42, note: '' });
  });

  it('returns the existing object unchanged when the type has no schema', () => {
    const c = create();
    c.spaceMeta.set(null);
    const existing = { a: 1 };
    expect(c.buildPropertiesObject('entity', existing)).toBe(existing);
  });
});

describe('BrainStore — stripEmptyOptionalProps', () => {
  it('drops empty OPTIONAL props but keeps empty REQUIRED ones (and all non-empty)', () => {
    const c = create();
    const schema = { req: { required: true }, opt: {} } as unknown as Record<string, import('../../core/api.types').PropertySchema>;
    expect(c.stripEmptyOptionalProps({ req: '', opt: '', keep: 'x' }, schema)).toEqual({ req: '', keep: 'x' });
  });

  it('returns props untouched when there is no schema', () => {
    const c = create();
    const props = { a: '' };
    expect(c.stripEmptyOptionalProps(props, undefined)).toBe(props);
  });
});
