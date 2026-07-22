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
 *   - the four `filtered*` computeds, including the semantic-mode BYPASS (searching in semantic mode
 *     returns the list untouched) and the fact that files have NO such bypass — an asymmetry that is
 *     easy to "tidy away" during a split
 *   - which fields each search actually looks at (they differ per collection)
 *   - the `*TagSuggestions` union of schema suggestions + tags present on loaded records
 *   - `*TypeOptions`: schema names UNION values present, deduped and SORTED
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import type { ChronoEntry, Edge, Entity, FileMeta, Memory, SpaceMetaResponse } from '../../core/api.types';
import { BrainStore } from './brain-store.service';

const mem = (fact: string, over: Partial<Memory> = {}): Memory =>
  ({ _id: fact, fact, tags: [], createdAt: '', seq: 1, ...over } as Memory);
const ent = (name: string, over: Partial<Entity> = {}): Entity =>
  ({ _id: name, name, tags: [], createdAt: '', ...over } as Entity);
const edge = (label: string, over: Partial<Edge> = {}): Edge =>
  ({ _id: label, from: 'a', to: 'b', label, tags: [], createdAt: '', ...over } as Edge);
const chrono = (title: string, over: Partial<ChronoEntry> = {}): ChronoEntry =>
  ({ _id: title, title, type: 'event', tags: [], entityIds: [], memoryIds: [], startsAt: '', status: 'upcoming', ...over } as ChronoEntry);
const fileMeta = (path: string, over: Partial<FileMeta> = {}): FileMeta =>
  ({ _id: path, path, tags: [], sizeBytes: 0, spaceId: 'work', createdAt: '', updatedAt: '', ...over } as FileMeta);

function create(): BrainStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [BrainStore] });
  return TestBed.inject(BrainStore);
}

describe('BrainStore — filteredMemories', () => {
  it('no query returns everything', () => {
    const c = create();
    c.memories.set([mem('a'), mem('b')]);
    expect(c.filteredMemories()).toHaveLength(2);
  });

  it('filters on fact, case-insensitively', () => {
    const c = create();
    c.memories.set([mem('the sky is blue'), mem('water is wet')]);
    c.memorySearch.set('SKY');
    expect(c.filteredMemories().map(m => m.fact)).toEqual(['the sky is blue']);
  });

  it('a whitespace-only query is not a filter', () => {
    const c = create();
    c.memories.set([mem('a'), mem('b')]);
    c.memorySearch.set('   ');
    expect(c.filteredMemories()).toHaveLength(2);
  });

  it('SEMANTIC mode bypasses the text filter entirely — the server already ranked these', () => {
    const c = create();
    c.memories.set([mem('the sky is blue'), mem('water is wet')]);
    c.memorySearch.set('sky');
    c.memorySearchMode.set('semantic');
    expect(c.filteredMemories()).toHaveLength(2);
  });
});

describe('BrainStore — filteredChrono', () => {
  it('searches title, description, type AND tags', () => {
    const c = create();
    c.chrono.set([
      chrono('launch', { description: 'ship it' }),
      chrono('review', { type: 'deadline' } as Partial<ChronoEntry>),
      chrono('retro', { tags: ['team'] }),
      chrono('unrelated'),
    ]);
    const found = (q: string) => { c.chronoSearch.set(q); return c.filteredChrono().map(e => e.title); };
    expect(found('launch')).toEqual(['launch']);   // title
    expect(found('ship')).toEqual(['launch']);     // description
    expect(found('deadline')).toEqual(['review']); // type
    expect(found('team')).toEqual(['retro']);      // tag
  });

  it('SEMANTIC mode bypasses the text filter', () => {
    const c = create();
    c.chrono.set([chrono('launch'), chrono('review')]);
    c.chronoSearch.set('launch');
    c.chronoSearchMode.set('semantic');
    expect(c.filteredChrono()).toHaveLength(2);
  });
});

describe('BrainStore — filteredEdges', () => {
  it('searches label, fromName and toName', () => {
    const c = create();
    c.edges.set([
      edge('owns', { fromName: 'alice', toName: 'car' }),
      edge('knows', { fromName: 'bob', toName: 'carol' }),
    ]);
    const found = (q: string) => { c.edgeSearch.set(q); return c.filteredEdges().map(e => e.label); };
    expect(found('owns')).toEqual(['owns']);    // label
    expect(found('alice')).toEqual(['owns']);   // fromName
    expect(found('carol')).toEqual(['knows']);  // toName
  });

  it('an edge with no fromName/toName does not throw', () => {
    const c = create();
    c.edges.set([edge('owns')]);
    c.edgeSearch.set('zzz');
    expect(c.filteredEdges()).toEqual([]);
  });

  it('SEMANTIC mode bypasses the text filter', () => {
    const c = create();
    c.edges.set([edge('owns'), edge('knows')]);
    c.edgeSearch.set('owns');
    c.edgeSearchMode.set('semantic');
    expect(c.filteredEdges()).toHaveLength(2);
  });
});

describe('BrainStore — filteredFileMetas', () => {
  it('searches path, description and tags', () => {
    const c = create();
    c.fileMetas.set([
      fileMeta('docs/readme.md', { description: 'intro' }),
      fileMeta('src/main.ts', { tags: ['code'] }),
    ]);
    const found = (q: string) => { c.fileMetaSearch.set(q); return c.filteredFileMetas().map(f => f.path); };
    expect(found('readme')).toEqual(['docs/readme.md']); // path
    expect(found('intro')).toEqual(['docs/readme.md']);  // description
    expect(found('code')).toEqual(['src/main.ts']);      // tag
  });

  it('files have NO semantic bypass — unlike memories/chrono/edges, the filter always applies', () => {
    // Deliberate asymmetry in the original: there is no fileMetaSearchMode at all. Pinned so a split
    // does not "tidy" the four filters into one shape and silently change file search.
    const c = create();
    c.fileMetas.set([fileMeta('a.md'), fileMeta('b.md')]);
    c.fileMetaSearch.set('a.md');
    expect(c.filteredFileMetas().map(f => f.path)).toEqual(['a.md']);
    expect('fileMetaSearchMode' in c).toBe(false);
  });
});

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
