/**
 * The knowledge-schema vocabulary: what a type schema IS, and the space meta that carries them.
 *
 * ## Why this is its own file, and why it imports nothing
 *
 * Split out of `types.ts` (Q-3). That file is the config contract for every subsystem — spaces, networks, media,
 * embedding, auth, sync — and it took FOUR god-file ratchet raises in two days, each individually correct and
 * each one line of honest type. A file that keeps growing is not fixed by raising its ceiling a fifth time;
 * `no-new-god-files.test.js` says so in as many words.
 *
 * **A leaf, deliberately.** Nothing here imports anything, which is the whole point: the first attempt at this
 * split moved the network types out and re-exported them, and `NetworkConfig` references `SpaceMeta`. With
 * `types.ts` re-exporting the new file and the new file importing `SpaceMeta` back, that is a module cycle —
 * TypeScript resolved it by degrading `NetworkConfig` to `any`, and `api/invite.ts` lost the types on three
 * `members` callbacks while both moved files compiled clean. A leaf cannot be half of a cycle.
 *
 * Same reasoning as `config/rights-shape.ts`, which exists for exactly this and for the same reason.
 *
 * ## What lives here
 *
 * The vocabulary a schema is written in — merge functions, `PropertySchema`, `TypeSchema` — plus
 * `ValidationMode`, `KnowledgeType`, and `SpaceMeta`, which is the thing that holds the schemas. This is also
 * where per-type schema fields now GROW: the next one is `suppressEmbeddings` (Q-2), and it lands here rather
 * than adding a fifth raise to `types.ts`.
 *
 * Re-exported from `types.ts`, so no importer changes.
 */

// ── Space meta / schema types ──────────────────────────────────────────────

/** Numeric merge functions available for `type: "number"` properties. */
export type NumericMergeFn = 'avg' | 'min' | 'max' | 'sum';

/** Boolean merge functions available for `type: "boolean"` properties. */
export type BooleanMergeFn = 'and' | 'or' | 'xor';

/** All merge functions (numeric + boolean). */
export type MergeFn = NumericMergeFn | BooleanMergeFn;

/** Subset of JSON Schema used for property value validation. */
export interface PropertySchema {
  /** Declared value type. 'date' is stored as ISO string; UI renders a date picker. */
  type?: 'string' | 'number' | 'boolean' | 'date';
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  /** Merge function applied when two entities are merged and both have this property.
   *  Numeric: avg, min, max, sum. Boolean: and, or, xor.
   *  Must be compatible with the declared `type`. */
  mergeFn?: MergeFn;
  /** When true, writes that omit this property are flagged as a schema violation. */
  required?: boolean;
  /** Default value applied on write when the property is absent. */
  default?: string | number | boolean;
}

/** Schema definition for a single entity type, edge label, memory type, or chrono type. */
export interface TypeSchema {
  /**
   * Reference to an instance-level schema library entry.
   * Format: `"library:<name>"` (e.g. `"library:service-v1"`).
   * When present, the library entry's schema is used for validation instead of any
   * inline fields.  Inline fields on the same object are ignored when `$ref` is set.
   */
  $ref?: string;
  /**
   * @internal Set by resolveMetaRefs() when a `$ref` cannot be resolved to a library entry.
   * Never present in stored config; only exists on in-memory resolved copies.
   * Causes validate* functions to emit a schema_ref_unresolved violation.
   */
  _unresolvedRef?: string;
  /** Regex pattern for entity.name validation (entity collection only). */
  namingPattern?: string;
  /**
   * How long records of this type are kept. The middle tier of **record > schema > space**
   * (owner decision, 2026-08-02).
   *
   * A space-wide `recordTtlDays` cannot express a space that holds two kinds of thing. The case that drove
   * it: one space with deploy `event` chronos — content-free by design, so they cluster tightly and
   * **displace real answers in recall** — next to `health-snapshot` records that exist to be trended and must
   * outlive any prune window. Putting the window on the TYPE puts it where the type is already defined,
   * rather than in a second parallel map an operator has to know exists.
   *
   * - `days` — delete records of this type after this many days, through the normal delete path, so the
   *   deletion tombstones and propagates to peers.
   * - `contentDays` — **chrono only.** Drop the bulky, recallable part (`description`, `matchedText`,
   *   `properties` and the embedding) while keeping the record, and set `contentRedacted: true`. That a
   *   deploy happened stays true; the detail does not, and it stops competing in semantic search because a
   *   record with no vector cannot win one. Rejected on other collections rather than silently ignored.
   *
   * A per-record `ttlDays` on the write still wins over both, including `0`/`null` for "never expire".
   *
   * **This lives in space meta, so it is governed and replicated** like the rest of the schema: in a network
   * the policy is agreed, and each instance then expires its own copy locally. That is deliberate — the
   * alternative (a local-only setting) lets two members of one network disagree about what the space keeps.
   */
  retention?: { days?: number; contentDays?: number };
  /**
   * **RETIRED — read and written, consumed by nothing.** Stored values are preserved; there is no
   * longer an editor for this field on the space Schema tab or in the Schema Library.
   *
   * It never reached anything. The Brain record forms suggest from the tags **already in use** in
   * each collection (self-maintaining, no editor needed), and the schema guidance sent to MCP clients
   * only ever summarised the space-wide list — which was itself retired in #365, for the same reason.
   * So this was an editor for a field with no consumer, which is precisely the dishonesty the Models
   * rebuild spent four PRs removing.
   *
   * The field stays in the type, in the Zod schemas and in the client's load/save round-trip **on
   * purpose**: silently destroying an operator's stored list on their next save would be a worse
   * trade than leaving an unused field behind, and it keeps the retirement reversible. Same call as
   * `SpaceMeta.tagSuggestions` below.
   */
  tagSuggestions?: string[];
  /** Property key → JSON Schema subset for value validation and merge hints. */
  propertySchemas?: Record<string, PropertySchema>;
}

/** Validation mode for write operations against a space's schema. */
export type ValidationMode = 'off' | 'warn' | 'strict';

/** Knowledge type keys used in typeSchemas. */
export type KnowledgeType = 'entity' | 'memory' | 'edge' | 'chrono';


/** Structured schema and metadata for a space — all fields optional. */
export interface SpaceMeta {
  /** Version counter — auto-incremented on every meta change. */
  version?: number;
  /** Short directive injected into MCP instructions at handshake. Max 4 000 chars. */
  purpose?: string;
  /** Extended Markdown prose — naming conventions, examples, links. Shown in UI only. */
  usageNotes?: string;
  /** Validation enforcement level. Default: 'off'. */
  validationMode?: ValidationMode;
  /**
   * Per-type schemas for each knowledge collection.
   * Keys of typeSchemas.entity are the allowed entity type values (allowlist).
   * Keys of typeSchemas.edge are the allowed edge label values (allowlist).
   * Keys of typeSchemas.memory / .chrono are the allowed type values.
   * When a collection's map is empty, all type/label values are accepted.
   */
  typeSchemas?: Partial<Record<KnowledgeType, Record<string, TypeSchema>>>;
  /**
   * **RETIRED in #365 — stored values preserved, consumed by nothing.**
   *
   * The old docstring called this a "fallback when no per-type tagSuggestions match", which described
   * behaviour that never existed — nothing consulted either list at write time. Both are now retired;
   * see `TypeSchema.tagSuggestions` for the reasoning and why the field is deliberately still here.
   */
  tagSuggestions?: string[];
  /** When true, all reference fields (edge from/to, entityIds, memoryIds) must be
   *  valid UUID v4 values, and entity deletion is blocked while inbound backlinks exist. */
  strictLinkage?: boolean;
  /** ISO8601 timestamp of the last meta update. */
  updatedAt?: string;
  /** History of previous meta versions (most recent first, capped). */
  previousVersions?: Array<{ version: number; meta: Omit<SpaceMeta, 'previousVersions'>; updatedAt: string }>;
}
