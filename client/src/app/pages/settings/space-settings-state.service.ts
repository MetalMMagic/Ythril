import { Injectable, inject, signal } from '@angular/core';
import {
  Space, SpaceMeta, SpaceStats, KnowledgeType, PropertySchema, TypeSchema,
  ValidationMode, DupeActionRule,
} from '../../core/api.types';
import { TranslocoService } from '@jsverse/transloco';
import { SpacesApi } from '../../core/spaces-api.service';

/**
 * Editable form state for one type schema.
 *
 * `propertySchemas` is a keyed LIST rather than the wire format's map, because the UI needs stable
 * row identity while a key is being typed. `_`-prefixed fields are transient input buffers and never
 * reach the server — see `buildMeta()`.
 */
export interface TypeSchemaState {
  namingPattern:   string;
  tagSuggestions:  string[];
  propertySchemas: { key: string; s: PropertySchema; _enumInput: string }[];
  _newPropInput:   string;
  _newTagInput:    string;
  /**
   * Set when the type is linked to a schema-library entry (`$ref: "library:<name>"`). Held as a
   * sentinel while editing and turned back into `$ref` by `buildMeta()`. Drop it and saving a space
   * silently converts a linked schema into an empty inline one — pinned by the round-trip tests.
   */
  _libRef?: string;
}

/**
 * State for the space-settings dialog, shared by its tabs.
 *
 * Extracted from the 1893-line SpacesComponent (A17.8). It lives in a service rather than in the
 * dialog component because `openSettings()` populates all four tabs atomically and `buildMeta()`
 * reads across two of them (purpose/usageNotes from the settings tab, validation/tags/typeSchemas
 * from the schema tab) — so the tabs cannot each own their slice without one reaching into another.
 *
 * Provided by the dialog component, not root: each opening gets fresh state, and the lifetime
 * matches the dialog rather than the app.
 *
 * Member names are unchanged from the original component ON PURPOSE. This is a move, not a rewrite:
 * keeping the names means every method body diffs clean against the source, which is how the
 * extraction is verified. Renaming during a move hides exactly the kind of transcription slip that
 * a diff would otherwise catch (it already hid three here: a wrong `minScore` default, two missing
 * `dupeSaved.set(false)` calls, and hardcoded English where transloco belonged).
 */
@Injectable()
export class SpaceSettingsState {
  private spacesApi = inject(SpacesApi);
  private transloco = inject(TranslocoService);

  readonly KINDS: KnowledgeType[] = ['entity', 'memory', 'edge', 'chrono'];
  readonly KIND_LABELS: Record<KnowledgeType, string> = {
    entity: 'Entities', memory: 'Memories', edge: 'Edges', chrono: 'Chrono',
  };

  // ── dialog shell ───────────────────────────────────────────────────────────
  settingsSpace  = signal<Space | null>(null);
  settingsTab    = signal<'settings' | 'schema' | 'duplicates' | 'danger'>('settings');
  settingsSaving = signal(false);
  settingsError  = signal('');
  schemaCollTab = signal<KnowledgeType>('entity');

  // ── settings tab ───────────────────────────────────────────────────────────
  stForm = { label: '', purpose: '', usageNotes: '', maxGiB: null as number | null };

  // ── duplicates tab ─────────────────────────────────────────────────────────
  dupeRulesState: DupeActionRule[] = [];
  dupeSurvivor: 'older' | 'newer' = 'older';
  dupeOnInsert = false;
  dupeSaving = signal(false);
  dupeSaved  = signal(false);
  dupeError  = signal('');

  // ── schema tab ─────────────────────────────────────────────────────────────
  schValidation:     ValidationMode = 'off';
  schStrictLinkage   = false;
  schTagSuggestions: string[] = [];
  schNewTagInput     = '';
  schTypeSchemas:    Partial<Record<KnowledgeType, Record<string, TypeSchemaState>>> = {
    entity: {}, memory: {}, edge: {}, chrono: {},
  };
  schNewTypeInputs:  Record<string, string> = { entity: '', memory: '', edge: '', chrono: '' };
  schExpandedType:   { kt: KnowledgeType; name: string } | null = null;
  schExpandedProp:   { kt: KnowledgeType; typeName: string; propKey: string } | null = null;

  // ── danger tab ─────────────────────────────────────────────────────────────
  dangerRenameId    = '';
  dangerRenaming    = signal(false);
  dangerRenameError = signal('');
  dangerWipeStats   = signal<SpaceStats | null>(null);
  dangerWipeLoading = signal(false);
  dangerWiping      = signal(false);
  dangerWipeError   = signal('');
  dangerDeleting    = signal(false);
  dangerDeleteError = signal('');

  /**
   * Load a space into every tab. Copies by VALUE throughout: the dialog must never mutate the Space
   * object the list is rendering from.
   */
  openSettings(s: Space): void {
    this.settingsSpace.set(s);
    this.settingsTab.set('settings');
    this.schemaCollTab.set('entity');
    this.settingsError.set('');
    this.settingsSaving.set(false);
    this.stForm = { label: s.label, purpose: s.meta?.purpose ?? '', usageNotes: s.meta?.usageNotes ?? '', maxGiB: s.maxGiB ?? null };
    this.dupeRulesState = (s.dupeRules ?? []).map(r => ({ ...r }));
    this.dupeSurvivor = s.dupeMergeSurvivor ?? 'older';
    this.dupeOnInsert = s.dupeRulesOnInsert ?? false;
    this.dupeSaving.set(false);
    this.dupeSaved.set(false);
    this.dupeError.set('');
    const meta = s.meta ?? {};
    this.schValidation     = meta.validationMode ?? 'off';
    this.schStrictLinkage  = meta.strictLinkage ?? false;
    this.schTagSuggestions = [...(meta.tagSuggestions ?? [])];
    this.schNewTagInput    = '';
    this.schNewTypeInputs  = { entity: '', memory: '', edge: '', chrono: '' };
    this.schExpandedType   = null;
    this.schExpandedProp   = null;
    const loadKt = (kt: KnowledgeType): Record<string, TypeSchemaState> => {
      const map: Record<string, TypeSchemaState> = {};
      for (const [name, ts] of Object.entries(meta.typeSchemas?.[kt] ?? {})) {
        // Preserve $ref as _libRef sentinel so buildMeta() can round-trip it
        if (ts.$ref?.startsWith('library:')) {
          map[name] = {
            namingPattern: '', tagSuggestions: [], propertySchemas: [],
            _newPropInput: '', _newTagInput: '',
            _libRef: ts.$ref.slice('library:'.length),
          };
        } else {
          map[name] = {
            namingPattern:   ts.namingPattern   ?? '',
            tagSuggestions:  [...(ts.tagSuggestions ?? [])],
            propertySchemas: Object.entries(ts.propertySchemas ?? {}).map(([k, ps]) => ({ key: k, s: { ...ps }, _enumInput: '' })),
            _newPropInput: '',
            _newTagInput:  '',
          };
        }
      }
      return map;
    };
    this.schTypeSchemas = {
      entity: loadKt('entity'),
      memory: loadKt('memory'),
      edge:   loadKt('edge'),
      chrono: loadKt('chrono'),
    };
    this.dangerRenameId = s.id;
    this.dangerRenameError.set('');
    this.dangerRenaming.set(false);
    this.dangerDeleteError.set('');
    this.dangerDeleting.set(false);
    this.dangerWipeStats.set(null);
    this.dangerWipeError.set('');
    this.dangerWiping.set(false);
    this.dangerWipeLoading.set(true);
    this.spacesApi.getSpaceStats(s.id).subscribe({
      next: (stats) => { this.dangerWipeStats.set(stats); this.dangerWipeLoading.set(false); },
      error: () => this.dangerWipeLoading.set(false),
    });
    // Baseline the dirty snapshot now that every editable field is populated.
    this.markPristine();
  }

  closeSettings(): void { this.settingsSpace.set(null); }

  // ── unsaved-changes tracking (U4) ────────────────────────────────────────────
  private initialSnapshot = '';

  /**
   * Serializes exactly what a save persists — label + maxGiB + `buildMeta()` — so it ignores
   * transient input buffers and UI state (the active tab, expanded rows, half-typed new-property
   * inputs) automatically. The duplicates tab has its own save/saved affordance and is intentionally
   * excluded.
   */
  snapshot(): string {
    return JSON.stringify({
      label: this.stForm.label.trim(),
      maxGiB: this.stForm.maxGiB,
      meta: this.buildMeta(),
    });
  }

  /** Re-baseline the dirty snapshot — called after opening a space (and safe to call after a save). */
  markPristine(): void { this.initialSnapshot = this.snapshot(); }

  /** True when the settings/schema editor has unsaved edits that a save would persist. */
  isDirty(): boolean {
    return this.settingsSpace() !== null && this.snapshot() !== this.initialSnapshot;
  }

  /** Build the meta payload sent on save. Reads the settings tab AND the schema tab. */
  buildMeta(): Partial<SpaceMeta> {
    const meta: Partial<SpaceMeta> = {};
    if (this.stForm.purpose.trim())    meta.purpose    = this.stForm.purpose.trim();
    if (this.stForm.usageNotes.trim()) meta.usageNotes = this.stForm.usageNotes.trim();
    meta.validationMode = this.schValidation;
    if (this.schStrictLinkage)         meta.strictLinkage  = true;
    if (this.schTagSuggestions.length) meta.tagSuggestions = [...this.schTagSuggestions];
    const typeSchemas: Partial<Record<KnowledgeType, Record<string, TypeSchema>>> = {};
    for (const kt of this.KINDS) {
      const ktMap = this.schTypeSchemas[kt] ?? {};
      const names = Object.keys(ktMap);
      if (names.length) {
        const out: Record<string, TypeSchema> = {};
        for (const name of names) {
          const state = ktMap[name]!;
          // If this type was set via "import as $ref", emit a $ref TypeSchema
          if (state._libRef) {
            out[name] = { $ref: `library:${state._libRef}` };
            continue;
          }
          const ts: TypeSchema = {};
          if (kt === 'entity' && state.namingPattern.trim()) ts.namingPattern = state.namingPattern.trim();
          if (state.tagSuggestions.length) ts.tagSuggestions = [...state.tagSuggestions];
          if (state.propertySchemas.length) {
            const ps: Record<string, PropertySchema> = {};
            for (const { key, s } of state.propertySchemas) {
              const schema: PropertySchema = {};
              if (s.type)            schema.type    = s.type;
              if (s.enum?.length)    schema.enum    = [...s.enum];
              if (s.minimum != null) schema.minimum = s.minimum;
              if (s.maximum != null) schema.maximum = s.maximum;
              if (s.pattern?.trim()) schema.pattern = s.pattern.trim();
              if (s.mergeFn)         schema.mergeFn = s.mergeFn;
              if (s.required)        schema.required = s.required;
              if (s.default != null) schema.default  = s.default;
              ps[key] = schema;
            }
            ts.propertySchemas = ps;
          }
          out[name] = ts;
        }
        typeSchemas[kt] = out;
      }
    }
    if (Object.keys(typeSchemas).length) meta.typeSchemas = typeSchemas;
    return meta;
  }

  // ── duplicate rules ────────────────────────────────────────────────────────

  addDupeRule(): void {
    this.dupeRulesState = [...this.dupeRulesState, { minScore: 0.95, action: 'flag' }];
    this.dupeSaved.set(false);
  }

  removeDupeRule(i: number): void {
    this.dupeRulesState = this.dupeRulesState.filter((_, idx) => idx !== i);
    this.dupeSaved.set(false);
  }

  hasAutomergeRule(): boolean {
    return this.dupeRulesState.some(r => r.action === 'automerge');
  }

  // ── type schemas ───────────────────────────────────────────────────────────

  typeNames(kt: KnowledgeType): string[] { return Object.keys(this.schTypeSchemas[kt] ?? {}); }
  typeState(kt: KnowledgeType, name: string): TypeSchemaState { return (this.schTypeSchemas[kt] ?? {})[name]!; }
  typeCount(kt: KnowledgeType): number { return Object.keys(this.schTypeSchemas[kt] ?? {}).length; }
  /** Returns the library entry name if this type is set as a $ref, otherwise null. */
  typeLibRef(kt: KnowledgeType, name: string): string | null {
    return (this.schTypeSchemas[kt] ?? {})[name]?._libRef ?? null;
  }

  isTypeExpanded(kt: KnowledgeType, name: string): boolean {
    return this.schExpandedType?.kt === kt && this.schExpandedType?.name === name;
  }

  toggleTypeExpand(kt: KnowledgeType, name: string): void {
    this.schExpandedType = this.isTypeExpanded(kt, name) ? null : { kt, name };
  }

  addType(kt: KnowledgeType): void {
    const raw = (this.schNewTypeInputs[kt] ?? '').trim();
    if (!raw || (this.schTypeSchemas[kt] ?? {})[raw]) return;
    this.schTypeSchemas = {
      ...this.schTypeSchemas,
      [kt]: { ...(this.schTypeSchemas[kt] ?? {}), [raw]: { namingPattern: '', tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '' } },
    };
    this.schNewTypeInputs = { ...this.schNewTypeInputs, [kt]: '' };
    this.schExpandedType  = { kt, name: raw };
  }

  removeType(kt: KnowledgeType, name: string): void {
    const { [name]: _dropped, ...rest } = this.schTypeSchemas[kt] ?? {};
    this.schTypeSchemas = { ...this.schTypeSchemas, [kt]: rest };
    if (this.schExpandedType?.kt === kt && this.schExpandedType.name === name) this.schExpandedType = null;
  }

  isPropExpanded(kt: KnowledgeType, typeName: string, propKey: string): boolean {
    return this.schExpandedProp?.kt === kt && this.schExpandedProp?.typeName === typeName && this.schExpandedProp?.propKey === propKey;
  }

  togglePropExpand(kt: KnowledgeType, typeName: string, propKey: string): void {
    this.schExpandedProp = this.isPropExpanded(kt, typeName, propKey) ? null : { kt, typeName, propKey };
  }

  addProp(kt: KnowledgeType, typeName: string): void {
    const state = this.typeState(kt, typeName);
    const key = (state._newPropInput ?? '').trim();
    if (!key || state.propertySchemas.some(e => e.key === key)) { state._newPropInput = ''; return; }
    state.propertySchemas = [...state.propertySchemas, { key, s: {}, _enumInput: '' }];
    state._newPropInput   = '';
    this.schExpandedProp  = { kt, typeName, propKey: key };
  }

  removeProp(kt: KnowledgeType, typeName: string, propKey: string): void {
    const state = this.typeState(kt, typeName);
    state.propertySchemas = state.propertySchemas.filter(e => e.key !== propKey);
    if (this.isPropExpanded(kt, typeName, propKey)) this.schExpandedProp = null;
  }

  addTypeTag(kt: KnowledgeType, typeName: string): void {
    const state = this.typeState(kt, typeName);
    const raw = (state._newTagInput ?? '').trim();
    if (!raw || state.tagSuggestions.includes(raw)) { state._newTagInput = ''; return; }
    state.tagSuggestions = [...state.tagSuggestions, raw];
    state._newTagInput   = '';
  }

  addGlobalTag(): void {
    const raw = this.schNewTagInput.trim();
    if (!raw || this.schTagSuggestions.includes(raw)) { this.schNewTagInput = ''; return; }
    this.schTagSuggestions = [...this.schTagSuggestions, raw];
    this.schNewTagInput    = '';
  }

  onEnumKey(e: KeyboardEvent, kt: KnowledgeType, typeName: string, propKey: string): void {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addEnumVal(kt, typeName, propKey); }
  }

  addEnumVal(kt: KnowledgeType, typeName: string, propKey: string): void {
    const entry = this.typeState(kt, typeName).propertySchemas.find(e => e.key === propKey);
    if (!entry) return;
    const val = (entry._enumInput ?? '').trim();
    if (!val) return;
    const curr = entry.s.enum ?? [];
    if (!curr.some(v => String(v) === val)) entry.s = { ...entry.s, enum: [...curr, val] };
    entry._enumInput = '';
  }

  removeEnumVal(kt: KnowledgeType, typeName: string, propKey: string, val: string | number | boolean): void {
    const entry = this.typeState(kt, typeName).propertySchemas.find(e => e.key === propKey);
    if (!entry) return;
    entry.s = { ...entry.s, enum: (entry.s.enum ?? []).filter(v => v !== val) };
  }

  wipeStatCols(): { label: string; value: number }[] {
    const s = this.dangerWipeStats();
    if (!s) return [];
    return [
      { label: this.transloco.translate('spaces.stats.memories'), value: s.memories },
      { label: this.transloco.translate('spaces.stats.entities'), value: s.entities },
      { label: this.transloco.translate('spaces.stats.edges'),    value: s.edges    },
      { label: this.transloco.translate('spaces.stats.chrono'),   value: s.chrono   },
      { label: this.transloco.translate('spaces.stats.files'),    value: s.files    },
    ];
  }
}
