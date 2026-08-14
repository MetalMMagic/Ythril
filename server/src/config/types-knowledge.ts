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
  /** Property key → JSON Schema subset for value validation and merge hints. */
  propertySchemas?: Record<string, PropertySchema>;
  /**
   * Skip embedding records of this type. Absent means **not stated**, which falls through to the space-wide
   * setting — it does NOT mean `false`.
   *
   * That distinction is the whole design. If absent read as "do not suppress", `SpaceMeta.suppressEmbeddings`
   * would do nothing for any type that had a schema at all, which is every type worth suppressing. The
   * resolution order is record > schema > space, matching `retention` rather than inventing a second order;
   * `brain/suppress-embeddings.ts` owns it and is tested against exactly this case.
   *
   * Asked for by an operator whose records are **state rather than prose**: a queue row whose name and
   * description never change, whose weight is PATCHed every tick, and which nobody will ever search for by
   * meaning. Each write re-embedded byte-identical text to produce a vector that already existed.
   *
   * **Turning it back on does not backfill.** Records written while it was on have no vector, and nothing
   * revisits them — see the `POST /api/spaces/:id/reembed` note in the API docs. Stated here because an
   * operator flipping this off would otherwise reasonably assume recall recovers on its own.
   */
  suppressEmbeddings?: boolean;
}

/** Validation mode for write operations against a space's schema. */
export type ValidationMode = 'off' | 'warn' | 'strict';

/** Knowledge type keys used in typeSchemas. */
export type KnowledgeType = 'entity' | 'memory' | 'edge' | 'chrono';


/** Structured schema and metadata for a space — all fields optional. */
/**
 * A recorded disagreement between a record's own timestamp and the server's write time.
 *
 * Present on a record ONLY when the disagreement exceeded the space's threshold, which is what makes
 * `{ stampSkew: { $exists: true } }` the cheap integrity query breituai-platform asked for rather than a report that
 * matches everything. See `brain/stamp-skew.ts` for the eight-hour incident behind it.
 */
export interface StampSkew {
  /** The property the stamp came from, so a warning can name it. */
  property: string;
  /** The stamp as the caller wrote it — quoted back verbatim, because the point is that it LOOKS right. */
  stamp: string;
  /** Signed: negative means the caller's stamp is EARLIER than the server's write. Theirs were eight hours negative. */
  skewMs: number;
  /** The threshold that was applied, so a stored record carries what it was judged against. */
  thresholdMs: number;
}

/**
 * Carried by every record type the stamp check runs on — memories, entities, edges and chrono.
 *
 * Declared once here rather than as a field repeated in four interfaces, and not only to keep `config/types.ts` off the
 * god-file ratchet: a fifth record type added later gets the check by extending this, where a copied field would be
 * forgotten and the omission would look exactly like a record whose stamp agreed.
 */
export interface StampSkewable {
  /**
   * Set only when this record's own timestamp property disagreed with the server's `createdAt` beyond the space's
   * threshold. ABSENT means agreed, not checked, or the check is off — presence is the signal, which is what makes
   * `{ stampSkew: { $exists: true } }` a useful query. See `brain/stamp-skew.ts`.
   */
  stampSkew?: StampSkew;
}

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
  /** When true, all reference fields (edge from/to, entityIds, memoryIds) must be
   *  valid UUID v4 values, and entity deletion is blocked while inbound backlinks exist. */
  strictLinkage?: boolean;
  /**
   * Space-wide default for skipping embeddings. The **lowest** tier: any type schema that states
   * `suppressEmbeddings` overrides it, and a per-record value overrides both.
   *
   * Absent means `false` — embedding is the default, and suppression is opt-in. The failure direction of
   * getting that backwards is records silently missing from recall, which nobody reports because there is
   * nothing to see.
   *
   * Lives in the Danger Zone in the UI, alongside the other space-wide switches, because it changes what
   * happens to data on write rather than how it is displayed. **It does not backfill when switched off** —
   * see `TypeSchema.suppressEmbeddings`.
   */
  suppressEmbeddings?: boolean;
  /**
   * Stamp-integrity check: compare a record's OWN timestamp property against the server's `createdAt` on write, and
   * warn when they disagree beyond `warnMinutes`.
   *
   * breituai-platform corrected three board posts whose `postedAt` was eight hours early — not clock drift, but a
   * measured stamp followed by three EXTRAPOLATED ones. Their sentence for why nothing caught it: *"an estimated
   * timestamp looks exactly like a measured one once it is written down."* The comparison is available to the store and
   * not to the author, which is what makes it ours.
   *
   * Absent means the default 40 minutes — the board protocol's own assumed clock tolerance. `warnMinutes: 0` disables
   * the check; it does NOT mean "warn on any difference", because a caller's stamp and the server's clock never agree
   * to the millisecond and that reading would fire on every record.
   *
   * It never refuses a write. A legitimately backdated record exists — a historical import, a backfilled letter — and
   * what is being reported is a wrong number, not a corrupt record.
   */
  stampSkew?: {
    /** Warn beyond this many minutes of disagreement. Default 40. `0` disables. */
    warnMinutes?: number;
    /** Property names to check, first parseable one wins. Default `['stampedAt', 'postedAt']`. */
    properties?: string[];
  };
  /** ISO8601 timestamp of the last meta update. */
  updatedAt?: string;
  /** History of previous meta versions (most recent first, capped). */
  previousVersions?: Array<{ version: number; meta: Omit<SpaceMeta, 'previousVersions'>; updatedAt: string }>;
}
