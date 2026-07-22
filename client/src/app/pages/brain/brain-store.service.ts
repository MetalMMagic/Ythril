import { Injectable, signal, computed } from '@angular/core';
import {
  Memory, Entity, Edge, ChronoEntry, FileMeta, SpaceMetaResponse, PropertySchema,
  KnowledgeType, ChronoType, ChronoStatus,
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
  /** Live-update tick (F12): the shell bumps this when a brain-change SSE event lands for the active
   *  space+collection, and the mounted record tab reloads its current page in response. */
  liveRefreshTick = signal(0);
  memorySearch = signal('');
  edgeSearch = signal('');
  chronoSearch = signal('');
  fileMetaSearch = signal('');
  memorySearchMode = signal<'text' | 'semantic'>('text');
  edgeSearchMode = signal<'text' | 'semantic'>('text');
  chronoSearchMode = signal<'text' | 'semantic'>('text');

  // ── Tag suggestions + filtered views (per collection) ───────────────────────
  //
  // Sourced from the tags ALREADY IN USE in this collection. The space-level
  // `meta.tagSuggestions` list used to be merged in as well; it was retired because it was
  // editable in one place, applied everywhere, and easy to forget about — a stored list quietly
  // steering what agents and people tagged with. What is actually in use is self-maintaining and
  // needs no editor.
  memoryTagSuggestions = computed(() => [...new Set([
    ...this.memories().flatMap(m => m.tags ?? []),
  ])]);

  entityTagSuggestions = computed(() => [...new Set([
    ...this.entities().flatMap(e => e.tags ?? []),
  ])]);

  edgeTagSuggestions = computed(() => [...new Set([
    ...this.edges().flatMap(e => e.tags ?? []),
  ])]);

  chronoTagSuggestions = computed(() => [...new Set([
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

  // ── Schema-driven property helpers (shared by every create/edit form + the drawer) ──

  /** The predefined chrono kinds offered before "custom". */
  readonly chronoKinds: ChronoType[] = ['event', 'deadline', 'plan', 'prediction', 'milestone'];

  /** The chrono lifecycle statuses. */
  readonly chronoStatusOptions: ChronoStatus[] = ['upcoming', 'active', 'completed', 'overdue', 'cancelled'];

  /** Seed a properties object from a type's schema: fill missing keys with a typed default
   *  (enum → first option, number → 0, boolean → false, else ''), preserving existing values. */
  buildPropertiesObject(type: KnowledgeType, existing: Record<string, string | number | boolean> = {}, typeName?: string): Record<string, string | number | boolean> {
    const meta = this.spaceMeta();
    const typeSchemas = meta?.typeSchemas?.[type];
    if (!typeSchemas || Object.keys(typeSchemas).length === 0) return existing;
    // Use the specified type's schema; fall back to the first type when no name is given
    const schemas = (typeName ? typeSchemas[typeName] : Object.values(typeSchemas)[0])?.propertySchemas ?? {};
    if (Object.keys(schemas).length === 0) return existing;
    const result = { ...existing };
    for (const [key, schema] of Object.entries(schemas)) {
      if (key in result) continue;
      if (schema.enum?.length) {
        result[key] = schema.enum[0] as string | number | boolean;
      } else if (schema.type === 'number') {
        result[key] = 0;
      } else if (schema.type === 'boolean') {
        result[key] = false;
      } else {
        result[key] = '';
      }
    }
    return result;
  }

  /** Strip optional properties whose value is an empty string; required fields are preserved even if empty (server will reject them with a clear error). */
  stripEmptyOptionalProps(
    props: Record<string, string | number | boolean>,
    schema: Record<string, PropertySchema> | undefined,
  ): Record<string, string | number | boolean> {
    if (!schema) return props;
    return Object.fromEntries(
      Object.entries(props).filter(([k, v]) => v !== '' || (schema[k]?.required ?? false)),
    );
  }
}
