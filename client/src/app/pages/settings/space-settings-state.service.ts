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
  /**
   * How long records of this type are kept — the SCHEMA tier of record > schema > space.
   *
   * `null` for "not set", not `0`: zero is a real value the API rejects, and an empty number input must mean
   * "inherit the space default" rather than "expire immediately".
   *
   * `contentDays` is chrono-only (it drops the recallable half — description, matchedText and the embedding —
   * while keeping the record and its `properties`). The editor only offers it for chrono, because the API
   * refuses it elsewhere and a control that cannot work is worse than none.
   */
  retentionDays:        number | null;
  retentionContentDays: number | null;
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
 * A blank `TypeSchemaState`, optionally overridden — the single place the shape is written out.
 *
 * There were NINE object literals spelling this interface out field by field (add-type, unlink, two import
 * paths, three library paths, and two specs). Adding `retentionDays` to the interface made all nine a
 * compile error, which is the good outcome; the bad outcome is the tenth site, written next month, that
 * spreads an older shape and quietly drops a field nobody notices until a save loses it. A factory makes
 * "every construction site" one site.
 */
export function emptyTypeSchemaState(over: Partial<TypeSchemaState> = {}): TypeSchemaState {
  return {
    namingPattern: '', retentionDays: null, retentionContentDays: null,
    tagSuggestions: [], propertySchemas: [], _newPropInput: '', _newTagInput: '',
    ...over,
  };
}

/**
 * Editor state → the wire `TypeSchema`, in one place.
 *
 * There were three copies of this: the save path, the per-type JSON export, and "save this type to the
 * library". They had already drifted — only one of them trimmed the property `pattern` — and adding a field
 * to one of three serialisers is how an editable setting ends up unsaved on some paths and not others.
 *
 * `withRetention: false` is for the schema library, whose entry schema is `.strict()` and has no `retention`
 * key: a window belongs to a type IN A SPACE, and sending one would 400 the request.
 */
export function typeSchemaFromState(
  kt: KnowledgeType,
  state: TypeSchemaState,
  { withRetention = true }: { withRetention?: boolean } = {},
): TypeSchema {
  const ts: TypeSchema = {};
  if (kt === 'entity' && state.namingPattern.trim()) ts.namingPattern = state.namingPattern.trim();
  if (withRetention) {
    // Omitted entirely when neither window is set, so a type that inherits the space default does not carry
    // an empty `retention: {}` the API would reject.
    //
    // `contentDays` is sent only for chrono: the API accepts it elsewhere but the sweep ignores it, so writing
    // it would store a setting that silently does nothing — and dropping it here also keeps a stale value from
    // a type whose kind changed out of the payload.
    const days = positiveDays(state.retentionDays);
    const contentDays = kt === 'chrono' ? positiveDays(state.retentionContentDays) : undefined;
    if (days !== undefined || contentDays !== undefined) {
      ts.retention = { ...(days !== undefined ? { days } : {}), ...(contentDays !== undefined ? { contentDays } : {}) };
    }
  }
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
  return ts;
}

/**
 * A day count the API will accept, or undefined.
 *
 * `Number()` because a `type="number"` input bound with ngModel yields a STRING when the user types into it
 * on some paths, and `'30' > 0` is true while `JSON.stringify` would then send `"30"` — which the server's
 * `z.number()` rejects with a message about the wrong type, on a field the user filled in correctly.
 */
function positiveDays(v: number | null): number | undefined {
  if (v === null || v === undefined || (v as unknown) === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : undefined;
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
  /**
   * A non-error outcome that still needs saying — today, that a networked space held the change for a
   * vote instead of applying it. Separate from settingsError because it is not a failure: the edit was
   * accepted, and colouring it red would send an operator looking for a problem that does not exist.
   */
  settingsNotice = signal('');
  schemaCollTab = signal<KnowledgeType>('entity');

  // ── settings tab ───────────────────────────────────────────────────────────
  stForm = { label: '', purpose: '', usageNotes: '', maxGiB: null as number | null, recordTtlDays: null as number | null, documentExtraction: '' as '' | 'off' | 'ocr' | 'vlm' | 'repair' | 'auto',
    imageAnalysis: '' as '' | 'off' | 'caption' | 'recognition' | 'auto',
    audioAnalysis: '' as '' | 'off' | 'on' | 'auto',
    videoAnalysis: '' as '' | 'off' | 'audio' | 'full' | 'auto',
    textAnalysis: '' as '' | 'off' | 'embed' | 'chunk' | 'auto' };

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
  /**
   * Space-wide tag suggestions. The editor for this was retired — it was one list applied to every
   * type and every record form, easy to set once and forget while steering what got tagged.
   *
   * The load/save round-trip is KEPT on purpose so an existing list is preserved verbatim in
   * config.json rather than being erased the first time someone opens this tab and hits save. The
   * retirement is reversible; silently destroying an operator's data to tidy up a field would not be.
   */
  schTagSuggestions: string[] = [];
  schTypeSchemas:    Partial<Record<KnowledgeType, Record<string, TypeSchemaState>>> = {
    entity: {}, memory: {}, edge: {}, chrono: {},
  };
  schNewTypeInputs:  Record<string, string> = { entity: '', memory: '', edge: '', chrono: '' };
  /** The type shown in the master/detail editor pane (single-select — that's what master/detail is). */
  schSelectedType:   { kt: KnowledgeType; name: string } | null = null;
  /** Property editors open in the detail pane. Multiple may be open at once (U4). Keyed `kt|type|prop`. */
  schExpandedProps = new Set<string>();

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
    this.settingsNotice.set('');
    this.settingsSaving.set(false);
    this.stForm = { label: s.label, purpose: s.meta?.purpose ?? '', usageNotes: s.meta?.usageNotes ?? '', maxGiB: s.maxGiB ?? null, recordTtlDays: s.recordTtlDays ?? null, documentExtraction: s.documentExtraction ?? '',
      imageAnalysis: s.imageAnalysis ?? '', audioAnalysis: s.audioAnalysis ?? '', videoAnalysis: s.videoAnalysis ?? '', textAnalysis: s.textAnalysis ?? '' };
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
    this.schNewTypeInputs  = { entity: '', memory: '', edge: '', chrono: '' };
    this.schSelectedType   = null;
    this.schExpandedProps.clear();
    const loadKt = (kt: KnowledgeType): Record<string, TypeSchemaState> => {
      const map: Record<string, TypeSchemaState> = {};
      for (const [name, ts] of Object.entries(meta.typeSchemas?.[kt] ?? {})) {
        // Preserve $ref as _libRef sentinel so buildMeta() can round-trip it
        if (ts.$ref?.startsWith('library:')) {
          map[name] = emptyTypeSchemaState({ _libRef: ts.$ref.slice('library:'.length) });
        } else {
          map[name] = emptyTypeSchemaState({
            namingPattern:   ts.namingPattern   ?? '',
            // `?? null`, never `?? 0`: an absent window means "inherit the space default", and 0 is a value the
            // API rejects. Reading it as 0 would round-trip a blank field into an invalid save.
            retentionDays:        ts.retention?.days        ?? null,
            retentionContentDays: ts.retention?.contentDays ?? null,
            tagSuggestions:  [...(ts.tagSuggestions ?? [])],
            propertySchemas: Object.entries(ts.propertySchemas ?? {}).map(([k, ps]) => ({ key: k, s: { ...ps }, _enumInput: '' })),
          });
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
  private dupeInitialSnapshot = '';

  /**
   * Serializes exactly what the footer save persists — label + maxGiB + recordTtlDays + `buildMeta()` —
   * so it ignores transient input buffers and UI state (the active tab, expanded rows, half-typed
   * new-property inputs) automatically. The duplicates tab persists through its OWN save button, so its
   * edits are snapshotted separately by `dupeSnapshot()` — but BOTH feed `isDirty()`, so unsaved dupe
   * edits still trip the close guard (previously they were silently dropped with no warning).
   */
  snapshot(): string {
    return JSON.stringify({
      label: this.stForm.label.trim(),
      maxGiB: this.stForm.maxGiB,
      recordTtlDays: this.stForm.recordTtlDays,
      documentExtraction: this.stForm.documentExtraction,
      imageAnalysis: this.stForm.imageAnalysis,
      audioAnalysis: this.stForm.audioAnalysis,
      videoAnalysis: this.stForm.videoAnalysis,
      textAnalysis: this.stForm.textAnalysis,
      meta: this.buildMeta(),
    });
  }

  /** Serializes the duplicates-tab form. Baselined independently because that tab has its own save. */
  dupeSnapshot(): string {
    return JSON.stringify({
      rules: this.dupeRulesState,
      survivor: this.dupeSurvivor,
      onInsert: this.dupeOnInsert,
    });
  }

  /** Re-baseline both dirty snapshots — called after opening a space. */
  markPristine(): void {
    this.initialSnapshot = this.snapshot();
    this.dupeInitialSnapshot = this.dupeSnapshot();
  }

  /** Re-baseline ONLY the duplicates snapshot — called after the duplicates tab's own successful save. */
  markDupePristine(): void { this.dupeInitialSnapshot = this.dupeSnapshot(); }

  /** True when the settings/schema editor OR the duplicates tab has unsaved edits. */
  isDirty(): boolean {
    if (this.settingsSpace() === null) return false;
    return this.snapshot() !== this.initialSnapshot || this.dupeSnapshot() !== this.dupeInitialSnapshot;
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
          out[name] = typeSchemaFromState(kt, state);
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

  /** Master/detail: the selected type is the one rendered in the editor pane. Single-select. */
  isTypeSelected(kt: KnowledgeType, name: string): boolean {
    return this.schSelectedType?.kt === kt && this.schSelectedType?.name === name;
  }

  selectType(kt: KnowledgeType, name: string): void {
    this.schSelectedType = { kt, name };
  }

  private propKey(kt: KnowledgeType, typeName: string, propKey: string): string {
    return `${kt}|${typeName}|${propKey}`;
  }

  addType(kt: KnowledgeType): void {
    const raw = (this.schNewTypeInputs[kt] ?? '').trim();
    if (!raw || (this.schTypeSchemas[kt] ?? {})[raw]) return;
    this.schTypeSchemas = {
      ...this.schTypeSchemas,
      [kt]: { ...(this.schTypeSchemas[kt] ?? {}), [raw]: emptyTypeSchemaState() },
    };
    this.schNewTypeInputs = { ...this.schNewTypeInputs, [kt]: '' };
    this.schSelectedType  = { kt, name: raw };
  }

  removeType(kt: KnowledgeType, name: string): void {
    const { [name]: _dropped, ...rest } = this.schTypeSchemas[kt] ?? {};
    this.schTypeSchemas = { ...this.schTypeSchemas, [kt]: rest };
    if (this.schSelectedType?.kt === kt && this.schSelectedType.name === name) this.schSelectedType = null;
  }

  isPropExpanded(kt: KnowledgeType, typeName: string, propKey: string): boolean {
    return this.schExpandedProps.has(this.propKey(kt, typeName, propKey));
  }

  togglePropExpand(kt: KnowledgeType, typeName: string, propKey: string): void {
    const k = this.propKey(kt, typeName, propKey);
    if (this.schExpandedProps.has(k)) this.schExpandedProps.delete(k);
    else this.schExpandedProps.add(k);
  }

  addProp(kt: KnowledgeType, typeName: string): void {
    const state = this.typeState(kt, typeName);
    const key = (state._newPropInput ?? '').trim();
    if (!key || state.propertySchemas.some(e => e.key === key)) { state._newPropInput = ''; return; }
    state.propertySchemas = [...state.propertySchemas, { key, s: {}, _enumInput: '' }];
    state._newPropInput   = '';
    this.schExpandedProps.add(this.propKey(kt, typeName, key));
  }

  removeProp(kt: KnowledgeType, typeName: string, propKey: string): void {
    const state = this.typeState(kt, typeName);
    state.propertySchemas = state.propertySchemas.filter(e => e.key !== propKey);
    this.schExpandedProps.delete(this.propKey(kt, typeName, propKey));
  }

  // `addTypeTag` was removed with the per-type tag-suggestion editor: the list it edited reached
  // neither the Brain record forms nor the MCP schema guidance, so the control did nothing. Stored
  // values are still loaded into `tagSuggestions` and written back on save — the retirement removes
  // the editor, not the data.

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
