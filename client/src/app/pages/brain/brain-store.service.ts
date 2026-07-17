import { Injectable, signal, computed } from '@angular/core';
import {
  Memory, Entity, Edge, ChronoEntry, FileMeta, SpaceMetaResponse, PropertySchema,
} from '../../core/api.types';

/**
 * Records for the active brain space, and the client-side view of them.
 *
 * Extracted from the 3701-line BrainComponent (A17.9b). Owns the five record lists, the space meta,
 * the per-collection search text + mode, and everything derived from them: the `filtered*` lists,
 * the `*TagSuggestions`, and the schema-backed `*TypeOptions`. This is the cohesive "a list and the
 * way it is being viewed" — splitting a list from its own filter would be artificial.
 *
 * What is NOT here (stays with the component, moves to its own owner in a later step): the shell's
 * navigation (space list, activeTab, activeSpaceId), the loaders that populate these signals, the
 * create/edit forms per tab, the query/recall tab state, and the record drawer.
 *
 * Two behaviours are load-bearing and pinned by the tests: semantic search mode BYPASSES the
 * client-side filter (the server already ranked those hits), and files have no such mode — file
 * search always filters. Keep both.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
@Injectable()
export class BrainStore {
  // ── Records loaded for the active space ─────────────────────────────────────
  memories = signal<Memory[]>([]);
  entities = signal<Entity[]>([]);
  edges = signal<Edge[]>([]);
  chrono = signal<ChronoEntry[]>([]);
  fileMetas = signal<FileMeta[]>([]);
  // Settings tab (schema only — UI lives in Admin → Spaces)
  spaceMeta = signal<SpaceMetaResponse | null>(null);
  memorySearch = signal('');
  edgeSearch = signal('');
  chronoSearch = signal('');
  fileMetaSearch = signal('');
  memorySearchMode = signal<'text' | 'semantic'>('text');
  edgeSearchMode = signal<'text' | 'semantic'>('text');
  chronoSearchMode = signal<'text' | 'semantic'>('text');

  // ── Tag suggestions + filtered views (per collection) ───────────────────────
  memoryTagSuggestions = computed(() => [...new Set([
    ...(this.spaceMeta()?.tagSuggestions ?? []),
    ...this.memories().flatMap(m => m.tags ?? []),
  ])]);

  entityTagSuggestions = computed(() => [...new Set([
    ...(this.spaceMeta()?.tagSuggestions ?? []),
    ...this.entities().flatMap(e => e.tags ?? []),
  ])]);

  edgeTagSuggestions = computed(() => [...new Set([
    ...(this.spaceMeta()?.tagSuggestions ?? []),
    ...this.edges().flatMap(e => e.tags ?? []),
  ])]);

  chronoTagSuggestions = computed(() => [...new Set([
    ...(this.spaceMeta()?.tagSuggestions ?? []),
    ...this.chrono().flatMap(c => c.tags ?? []),
  ])]);

  filteredMemories = computed(() => {
    if (this.memorySearchMode() === 'semantic') return this.memories();
    const q = this.memorySearch().toLowerCase().trim();
    if (!q) return this.memories();
    return this.memories().filter(m => m.fact.toLowerCase().includes(q));
  });

  filteredChrono = computed(() => {
    if (this.chronoSearchMode() === 'semantic') return this.chrono();
    const q = this.chronoSearch().toLowerCase().trim();
    if (!q) return this.chrono();
    return this.chrono().filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)),
    );
  });

  filteredEdges = computed(() => {
    if (this.edgeSearchMode() === 'semantic') return this.edges();
    const q = this.edgeSearch().toLowerCase().trim();
    if (!q) return this.edges();
    return this.edges().filter(e =>
      e.label.toLowerCase().includes(q) ||
      (e.fromName ?? '').toLowerCase().includes(q) ||
      (e.toName ?? '').toLowerCase().includes(q)
    );
  });

  filteredFileMetas = computed(() => {
    const q = this.fileMetaSearch().toLowerCase().trim();
    if (!q) return this.fileMetas();
    return this.fileMetas().filter(fm =>
      fm.path.toLowerCase().includes(q) ||
      (fm.description ?? '').toLowerCase().includes(q) ||
      fm.tags.some(t => t.toLowerCase().includes(q)),
    );
  });

  // ── Schema-derived accessors + filter-bar type options ──────────────────────
  entityTypeNames(): string[] {
    return Object.keys(this.spaceMeta()?.typeSchemas?.entity ?? {});
  }

  edgeLabelNames(): string[] {
    return Object.keys(this.spaceMeta()?.typeSchemas?.edge ?? {});
  }

  entitySchema(typeName: string | undefined): Record<string, PropertySchema> | undefined {
    if (!typeName) return undefined;
    return this.spaceMeta()?.typeSchemas?.entity?.[typeName]?.propertySchemas;
  }

  edgeSchema(labelName: string | undefined): Record<string, PropertySchema> | undefined {
    if (!labelName) return undefined;
    return this.spaceMeta()?.typeSchemas?.edge?.[labelName]?.propertySchemas;
  }

  memorySchema(): Record<string, PropertySchema> | undefined {
    const ts = this.spaceMeta()?.typeSchemas?.memory;
    if (!ts) return undefined;
    return Object.values(ts)[0]?.propertySchemas;
  }

  requiredProps(schema: Record<string, PropertySchema> | undefined): string[] {
    if (!schema) return [];
    return Object.entries(schema).filter(([, s]) => s.required).map(([k]) => k);
  }

  /** Type options for the filter bar's dropdown, per collection: the space's schema
   *  type names UNION the distinct `type` values actually present in the loaded list,
   *  so the filter is usable whether or not a schema is defined. */
  private typeOptionsFrom(schemaNames: string[], present: (string | undefined)[]): string[] {
    return [...new Set([...schemaNames, ...present.filter((t): t is string => !!t)])].sort();
  }

  memoryTypeOptions(): string[] {
    return this.typeOptionsFrom(Object.keys(this.spaceMeta()?.typeSchemas?.memory ?? {}), this.memories().map(m => m.type));
  }

  entityTypeOptions(): string[] {
    return this.typeOptionsFrom(this.entityTypeNames(), this.entities().map(e => e.type));
  }

  edgeTypeOptions(): string[] {
    // Edge `type` is not schema-backed; offer the distinct types in the current list.
    return this.typeOptionsFrom([], this.edges().map(e => e.type));
  }
}
