export interface TokenRecord {
  id: string;
  name: string;
  hash: string;         // bcrypt hash
  prefix: string;       // first 8 chars of the plaintext token — fast lookup hint
  createdAt: string;    // ISO8601
  lastUsed: string | null;
  expiresAt: string | null;
  spaces?: string[];    // allowlist of space IDs; omit = all spaces
  admin: boolean;       // true = may access admin-gated routes
  readOnly?: boolean;   // true = read-only access; all mutations blocked
  peerInstanceId?: string; // set on tokens created for network peers — links this PAT to the peer that uses it inbound
  schemaLibrary?: boolean; // true = only valid on GET /api/schema-library/public*; no space access
  oauthClientId?: string;  // set on PATs minted by the MCP OAuth flow — links this token to the connector client that created it (for rotation, capping, and UI attribution)
}

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

// ── Schema library ─────────────────────────────────────────────────────────

/**
 * A named, versioned TypeSchema definition stored in the instance-level schema
 * library.  Spaces can reference an entry via `$ref: "library:<name>"` instead
 * of duplicating the schema inline.
 */
export interface SchemaLibraryEntry {
  /** Unique identifier for this library entry (e.g. `"service-v1"`). */
  name: string;
  /** The knowledge-type collection this schema applies to. */
  knowledgeType: KnowledgeType;
  /**
   * The type name within that collection (e.g. `"service"` for entity type).
   * This is informational — it does not restrict which type name a referencing
   * space uses.
   */
  typeName: string;
  /** The actual schema definition (inline only — no `$ref` nesting allowed). */
  schema: Omit<TypeSchema, '$ref'>;
  /** Optional human-readable description for the library entry. */
  description?: string;
  /**
   * Optional group identifier for organizing related entries into a named set
   * (e.g. `"design-system"` or `"platform-base"`).  Purely organizational —
   * entries remain individually importable regardless of their group tag.
   * Any string is accepted; multiple entries can share the same group name.
   */
  schemaGroup?: string;
  /**
   * When true the entry is exposed on the unauthenticated public endpoint.
   * Default: false (private).
   */
  published?: boolean;
  /**
   * URL of the foreign catalog this entry was imported from, if any.
   * Informational only — used to show "imported from" label and to support
   * manual refresh.
   */
  sourceUrl?: string;
  /**
   * Local catalog name (key in schema-catalogs.json) this entry was imported
   * from, if applicable.
   */
  sourceCatalog?: string;
  /** ISO8601 creation timestamp. */
  createdAt: string;
  /** ISO8601 last-update timestamp. */
  updatedAt: string;
}

/**
 * A named link to a foreign Ythril instance's public schema library.
 * The server proxies browse/import requests through this record to avoid
 * browser CORS issues and to apply SSRF validation server-side.
 */
export interface SchemaCatalog {
  /** Unique local name for this catalog link (e.g. `"team-b"`). */
  name: string;
  /** Validated HTTPS URL of the foreign public library index endpoint. */
  url: string;
  /** Optional human-readable description. */
  description?: string;
  /**
   * Optional Bearer token forwarded by the catalog proxy when fetching from
   * the remote instance.  Required when the remote is behind a reverse proxy
   * that demands authentication (e.g. Cloudflare Access).
   * Never returned to the client — stored server-side only.
   */
  accessToken?: string;
  /** ISO8601 creation timestamp. */
  createdAt: string;
}

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

export interface SpaceConfig {
  id: string;
  label: string;
  builtIn: boolean;
  folders: string[];
  maxGiB?: number;
  flex?: number;
  description?: string; // shown to MCP clients as space-level instructions
  proxyFor?: string[];  // virtual proxy space — aggregates reads, routes writes to member spaces
  meta?: SpaceMeta;     // structured schema and metadata — all fields optional
  /** Local duplicate-action policy (not governed/synced — operational, per-instance).
   *  Rules are evaluated highest-minScore first; the first match decides the action. */
  dupeRules?: DupeActionRule[];
  /** Which record survives an automerge. Default 'older' (lower seq). */
  dupeMergeSurvivor?: 'older' | 'newer';
  /** Also evaluate dupeRules in real time when a record is inserted, not only on
   *  the scheduled scan. Default false (scan-time only). Applies to all inserts,
   *  including bulk. */
  dupeRulesOnInsert?: boolean;
  /** Per-space document-extraction mode override (F11-c). Local/operational (not governed or synced,
   *  like dupeRules): when set, documents uploaded to THIS space use this mode instead of the
   *  instance-wide `documentProcessing.mode`. Absent = inherit the instance default. */
  documentExtraction?: DocExtractionMode;
  /** Per-space level for images / audio / video, capped by the matching instance ceiling in
   *  `mediaEmbedding.levels`. Same contract as `documentExtraction`: local/operational, never governed
   *  or synced, and absent means "follow the instance". See `media-level.ts` for the ladders. */
  imageAnalysis?: ImageLevel;
  audioAnalysis?: AudioLevel;
  videoAnalysis?: VideoLevel;
  textAnalysis?: TextLevel;
  /** Auto-TTL (F10): when set (> 0), every new/updated record in this space is stamped with an expiry
   *  `now + recordTtlDays` and deleted by the TTL sweep once it lapses (through the normal delete path,
   *  so it tombstones + syncs). A per-record `ttlDays` on a write overrides this. Absent = no auto-TTL. */
  recordTtlDays?: number;
  /** Vector-search index lifecycle for a newly created space (B1). Creation now
   *  returns immediately with 'building' and the (slow, up-to-minutes) Atlas index
   *  builds finish asynchronously — flipping this to 'ready', or 'failed' if a build
   *  errored. Absent on spaces created before B1 and on proxy spaces (no indexes);
   *  treat absent as 'ready'. The space is writable while 'building'; only semantic
   *  recall waits for READY. */
  indexStatus?: 'building' | 'ready' | 'failed';
}

export interface EmbeddingConfig {
  /** If set, route embedding requests to this OpenAI-compatible HTTP endpoint.
   *  If absent, the bundled local ONNX model is used (default, works out of the box). */
  baseUrl?: string;
  model: string;
  dimensions: number;
  similarity: 'cosine' | 'dotProduct' | 'euclidean';
  /**
   * Where the HTTP embedding endpoint lives (only relevant when `baseUrl` is set). `local` (default) = a
   * trusted internal endpoint (e.g. Ollama on the cluster network) reached with a plain fetch; `external` =
   * an operator-supplied public endpoint reached through the SSRF-guarded fetch at runtime (SSRF follow-up
   * part 2). Mirrors `visionProvider`/`sttProvider`. Absent/`local` keeps today's behaviour.
   */
  provider?: 'local' | 'external';
  /** API key for an external embedding endpoint. Stored in `secrets.json` (never `config.json`), masked in
   *  the admin API. */
  apiKey?: string;
}

export interface StorageConfig {
  total?: { softLimitGiB: number; hardLimitGiB: number };
  files?: { softLimitGiB: number; hardLimitGiB: number };
  brain?: { softLimitGiB: number; hardLimitGiB: number };
}

/**
 * A single pluggable media-embedding provider entry — vision or STT.
 *
 * The shape is deliberately generic so any OpenAI-compatible vision
 * (Ollama `/api/chat`, OpenAI GPT-4o, Anthropic Claude, etc.) or STT
 * (faster-whisper-server `/v1/audio/transcriptions`, OpenAI Whisper, etc.)
 * endpoint can be plugged in by editing config.json or the Settings → Models
 * page in the UI — no code changes required.
 *
 * `apiKey` is optional and only used when the endpoint requires
 * Authorization (i.e. external providers). Local cluster endpoints (Ollama,
 * faster-whisper-server) leave it empty.
 */
export interface MediaProviderConfig {
  /** Human-readable label shown in the Settings UI. */
  label?: string;
  /** Base URL of the provider (e.g. `http://ollama.ythril.svc.cluster.local:11434`
   *  or `https://api.openai.com/v1`). The provider client appends the route. */
  baseUrl?: string;
  /** Model tag passed to the provider (e.g. `moondream`, `gpt-4o-mini`,
   *  `whisper-1`, `base`). */
  model?: string;
  /** Optional API key for endpoints that require Authorization.
   *  When empty, no Authorization header is sent.
   *  Stored in config.json by the Settings UI; for production deployments
   *  prefer an env-var override (`VISION_API_KEY` / `STT_API_KEY`) which
   *  takes precedence and locks this field as read-only in the UI. */
  apiKey?: string;
}

/**
 * Media embedding pipeline configuration.
 *
 * Routes binary media (image / audio / video) through text-as-intermediate
 * captioning + STT so every embedding lands in the same vector space as
 * memories, entities and converted documents (`nomic-embed-text-v1.5`).
 *
 * Always on — there is no master on/off switch. Each media class is controlled by its `levels` entry
 * (`off` takes that class offline instance-wide); the removed `MEDIA_EMBEDDING_ENABLED` /
 * `mediaEmbedding.enabled` master switch is migrated to `levels` on upgrade.
 *
 * ── Plugin model ────────────────────────────────────────────────────────────
 * Vision and STT are pluggable via the generic `vision` / `stt`
 * `MediaProviderConfig` blocks. Any OpenAI-compatible endpoint works
 * out-of-the-box; switching providers is a config edit, not a code change.
 *
 * ── Resolution order (high → low precedence) ────────────────────────────────
 * `getMediaEmbeddingConfig()` in the loader applies:
 *   1. Env vars (`VISION_PROVIDER`, `OLLAMA_URL`, `VISION_MODEL`, `VISION_API_KEY`,
 *      `STT_PROVIDER`, `WHISPER_URL`, `WHISPER_MODEL`, `STT_API_KEY`, …)
 *   2. `config.json` `mediaEmbedding.*` (writable from the UI)
 *   3. Built-in defaults
 *
 * When an env var supplies a value, `lockedByInfra` will list that field so
 * the Settings UI can render it read-only (locked-by-infra).
 */
export interface MediaEmbeddingConfig {
  /** Instance CEILINGS per media class — the most a space is allowed to do, not a default a space
   *  inherits. Absent = `auto` (no policy limit). A class set to `off` here takes it offline instance-
   *  wide — this is the ONLY media on/off control (the old `enabled` master switch was removed; a legacy
   *  `enabled:false` is migrated to images/audio/video = `off`). Documents have their own under
   *  `documentProcessing.mode`, which predates this block. */
  levels?: MediaLevelCeilings;
  /** "local" → bundled cluster endpoint (Ollama); "external" → user-supplied API. */
  visionProvider?: 'local' | 'external';
  /** "local" → bundled cluster endpoint (faster-whisper-server); "external" → user-supplied API. */
  sttProvider?: 'local' | 'external';
  /** Pluggable vision provider settings (endpoint + model + optional API key). */
  vision?: MediaProviderConfig;
  /**
   * NLI (natural-language-inference) provider — the contradiction judge (F-REVIEW).
   *
   * An encoder classifier (roberta/deberta-MNLI class, ~100-400M) that labels a premise/hypothesis pair
   * as entailment / neutral / contradiction. Configured exactly like `vision` and `stt`: a local sidecar
   * or an external endpoint, per-field env pins, key in secrets.json.
   *
   * Deliberately NOT an embedding model. Similarity is not contradiction — two opposite claims about the
   * same subject are usually MORE embedding-similar, not less. Embeddings only pick the candidate PAIRS
   * (same subject); this decides whether they agree or oppose.
   */
  nli?: MediaProviderConfig;
  /** Pluggable STT provider settings (endpoint + model + optional API key). */
  stt?: MediaProviderConfig;
  /** @deprecated Use `vision.baseUrl`. Kept for backward compatibility. */
  ollamaUrl?: string;
  /** @deprecated Use `vision.model`. Kept for backward compatibility. */
  visionModel?: string;
  /** @deprecated Use `stt.baseUrl`. Kept for backward compatibility. */
  whisperUrl?: string;
  /** @deprecated Use `stt.model`. Kept for backward compatibility. */
  whisperModel?: string;
  /** Max concurrent jobs processed per worker tick. */
  workerConcurrency?: number;
  /** Base poll interval — doubles on empty result up to workerMaxPollIntervalMs. */
  workerPollIntervalMs?: number;
  /** Idle backoff cap. */
  workerMaxPollIntervalMs?: number;
  /** When true and the local provider returns non-200, fall back to external. */
  fallbackToExternal?: boolean;
  /** Files larger than this skip embedding (embeddingStatus="skipped"). */
  maxFileSizeBytes?: number;
  /** Stalled "processing" jobs older than this are reset to "pending" on startup. */
  stalledJobTimeoutMs?: number;
  /**
   * Names of fields whose value is currently being supplied by an env var
   * (and is therefore read-only in the Settings UI). Populated by the loader
   * at runtime; never persisted to config.json.
   *
   * Examples: `["enabled", "vision.apiKey", "stt.baseUrl"]`.
   */
  lockedByInfra?: string[];
  /**
   * F11 — when true, the entire media/model configuration is **infra-managed**: it is set through
   * `config.json` / environment and the admin API refuses to mutate it (like `YTHRIL_MONGO_INFRA_MANAGED`
   * for the database). The Settings → Models page renders read-only. Also settable via the
   * `YTHRIL_MEDIA_INFRA_MANAGED=true` env var. Default false. Surfaced (read-only) in the admin GET.
   */
  infraManaged?: boolean;
  /** Face recognition settings — requires @vladmandic/human WASM backend. */
  faceRecognition?: FaceRecognitionConfig;
  /** Document processing settings — controls the unstructured sidecar behaviour. */
  documentProcessing?: DocumentProcessingConfig;
}

/**
 * Configuration for the document processing pipeline (PDF, DOCX, EPUB conversion).
 * Uses the unstructured-api sidecar for partition extraction.
 */
export interface DocumentProcessingConfig {
  /**
   * Unstructured partition strategy passed to the sidecar.
   *
   * - `"hi_res"` (default): full OCR + layout detection. Slower but extracts
   *   images, recognises tables from scanned PDFs, and handles complex layouts.
   *   Required for embedded-image extraction.
   * - `"auto"`: unstructured picks the fastest strategy that still produces
   *   reasonable text. No guaranteed image extraction.
   * - `"fast"`: text-layer extraction only (pdfminer). Fastest but no OCR, no
   *   image extraction.
   * - `"ocr_only"`: full OCR on every page regardless of whether a text layer
   *   exists. Useful for scanned documents but redundant for born-digital PDFs.
   */
  strategy?: 'hi_res' | 'auto' | 'fast' | 'ocr_only';
  /**
   * When true (default), embedded images found during hi_res conversion are
   * extracted as `_extracted/{originalId}/image-{N}.{ext}` subfiles and
   * re-enqueued for the full media pipeline (caption + face recognition).
   *
   * Has no effect when strategy is not `hi_res`.
   */
  extractImages?: boolean;
  /**
   * F11 — document-extraction mode. `auto` (default) uses the VLM when one is configured and reachable,
   * otherwise falls back to OCR — so with no `vlmModel` set it is byte-for-byte the OCR-only path. `ocr`
   * forces OCR-only; `vlm`/`max` opt further into the VLM precision pipeline
   * (render → OCR-grounded VLM → validate → repair/consensus). The router falls back to OCR whenever a
   * needed capability is absent, so it is never worse than plain OCR. See `todo/F11-PLAN.md`.
   */
  mode?: DocExtractionMode;
  /** F11 — DPI for page rasterization in VLM modes. Default 150. */
  renderDpi?: number;
  /**
   * F11 — max pages rasterized per RENDER CALL (memory/latency bound on one sidecar round trip).
   * Default 50.
   *
   * This is no longer how much of a document gets read: long documents are walked in windows of this size
   * via the sidecars' `startPage`. Use `maxTotalPages` to bound the whole job.
   */
  maxPages?: number;
  /**
   * F11 — max pages read from ONE document across all windows. Default 200. Beyond this the extraction
   * stops and says so, in the log and in the stored markdown.
   *
   * Deliberately separate from `maxPages`, because they bound different things: `maxPages` is one round
   * trip's memory, this is the job's total cost. Every page is a VLM call, so an unbounded walk over a
   * 600-page scan means 600 model calls and — with an external endpoint — 600 pages of content leaving the
   * instance, on an upload nobody is watching. Raise it deliberately.
   */
  maxTotalPages?: number;
  /** F11 — per-page model-call timeout in ms (VLM/repair). Default 60000. */
  pageTimeoutMs?: number;
  /** F11 — max concurrent per-page model calls within one document. Default 2. */
  concurrency?: number;
  /**
   * F11 — timeout (ms) for a single OCR-sidecar (unstructured) call. Default 120000 (2 min). Applies to ALL
   * modes: OCR is both the sole engine in `ocr` mode and the grounding-evidence + fallback floor in the VLM
   * modes, so a large/complex scanned document can exceed a fixed ceiling — raise this to let it finish
   * (trading latency for completeness) especially under `max`. Env: `DOC_OCR_TIMEOUT_MS`.
   */
  ocrTimeoutMs?: number;
  /**
   * F11 — the document-transcription VLM model tag (e.g. a small Qwen2-VL / MiniCPM-V on the bundled
   * Ollama). Empty (default) means no VLM is configured, so `vlm`/`auto`/`max` modes fall back to OCR.
   * Env: `DOC_VLM_MODEL`.
   */
  vlmModel?: string;
  /**
   * F11 — base URL of the VLM endpoint. Empty (default) reuses the media `vision` provider's Ollama URL
   * (the bundled local path, no egress). Env: `DOC_VLM_URL`.
   */
  vlmBaseUrl?: string;
  /**
   * F11 — optional heavyweight "review/repair" model tag used **only in `max` mode** when a page's VLM
   * output fails OCR-evidence validation: it reconciles the draft against the OCR text in one extra pass.
   * Empty (default) reuses `vlmModel` for the repair pass (self-contained). Set this to wire in a stronger
   * model you host yourself. Env: `DOC_REPAIR_MODEL`.
   */
  repairModel?: string;
  /**
   * F11 — base URL for the repair model. Empty (default) reuses `vlmBaseUrl` (then the vision URL).
   * Env: `DOC_REPAIR_URL`.
   */
  repairBaseUrl?: string;
  /**
   * F11-d — optional **second** document VLM for the `max`-mode **consensus** pass. When set, `max` mode runs
   * this model as an independent second transcription of each page, reconciles it with the primary draft
   * against the OCR evidence, and keeps the highest-OCR-coverage result — so consensus is **never worse**
   * than the primary. Empty (default) ⇒ no consensus pass. Best paired with a *different* model than
   * `vlmModel` (two identical deterministic passes agree trivially). Env: `DOC_VERIFY_MODEL`.
   */
  verifyModel?: string;
  /**
   * F11-d — base URL for the consensus/verify model. Empty (default) reuses `vlmBaseUrl` (then the vision
   * URL). Env: `DOC_VERIFY_URL`.
   */
  verifyBaseUrl?: string;
  /**
   * F11-b — an **external** "assist model" (a bigger, hosted LLM the operator points Ythril at) and what
   * it is used for. Distinct from the bundled local VLM: this is the only place document content is sent
   * OFF the instance, so it is opt-in and gated by an explicit acknowledgment. `apiKey` is NOT stored here
   * — it lives in `secrets.json` (`mediaEmbedding.docAssistApiKey`). Absent = no external assist model.
   */
  assistModel?: DocAssistModelConfig;
}

/** F11-b — external assist-model configuration. OpenAI-compatible endpoint reached via `ssrfSafeFetch`. */
export interface DocAssistModelConfig {
  /** External OpenAI-compatible base URL (e.g. `https://api.example.com`). SSRF-validated on save. */
  baseUrl?: string;
  /** Model tag to request (e.g. `gpt-4o`, a hosted Llama, …). */
  model?: string;
  /** What the external model powers. `repair` (the max-mode reconciliation pass) today; more TBD. */
  /** The host (`new URL(baseUrl).host`) the operator acknowledged document egress to. Must match `baseUrl`'s
   *  host while `uses` is non-empty — re-acknowledged when the endpoint host changes. Records consent. */
  acknowledgedHost?: string;
}

/** F11-b — tasks an external assist model can be assigned to. Extensible (transcribe / verify are later). */

/**
 * F11 — how thoroughly documents are read, low to high:
 *
 *   off     nothing is extracted; the file is stored but never analysed
 *   ocr     the OCR sidecar reads text and tables — fully local, no vision model
 *   vlm     pages are rendered and transcribed by the vision model, grounded on the OCR text
 *   repair  vlm plus a repair pass reconciling the draft against the OCR evidence
 *           (and a second-model consensus pass when a verify model is configured)
 *   auto    whatever is the most this instance can actually do — resolved at runtime
 *
 * `auto` is not a rung, it is "the highest rung available": it degrades to `vlm` without a repair
 * model and to `ocr` without a vision model, so an instance never advertises a stage it cannot run.
 *
 * `max` is the previous name for `repair` and is still accepted when read — it is a stored value in
 * config.json, and dropping it would silently reset an instance to a different level on load. See
 * `normalizeDocExtractionMode`.
 */
export type DocExtractionMode = 'off' | 'ocr' | 'vlm' | 'repair' | 'auto';

/** Every value accepted on input, including the legacy `max` spelling of `repair`. */
export const DOC_EXTRACTION_MODES_IN = ['off', 'ocr', 'vlm', 'repair', 'auto', 'max'] as const;

/** Fold the legacy `max` spelling into `repair`; pass everything else through. */
export function normalizeDocExtractionMode(mode: string | undefined | null): DocExtractionMode | undefined {
  if (mode === null || mode === undefined) return undefined;
  return (mode === 'max' ? 'repair' : mode) as DocExtractionMode;
}

/**
 * The other media ladders, same shape as documents: low to high, plus `auto` meaning "as much as this
 * instance can do". `off` always means the file is stored but never analysed — not "analysed cheaply".
 *
 *   images   caption      describe the image for search
 *            recognition  caption plus face detection/embedding (opt-in, privacy-weighted)
 *   audio    on           transcribe
 *   video    audio        pull the audio track and transcribe it
 *            full         keyframes as images as well — NOT BUILT YET; reserved so the ladder reads
 *                         complete, and rejected rather than silently treated as `audio`
 */
export type ImageLevel = 'off' | 'caption' | 'recognition' | 'auto';
export type AudioLevel = 'off' | 'on' | 'auto';
export type VideoLevel = 'off' | 'audio' | 'full' | 'auto';
export type TextLevel = 'off' | 'embed' | 'chunk' | 'auto';

export const IMAGE_LEVELS = ['off', 'caption', 'recognition', 'auto'] as const;
export const AUDIO_LEVELS = ['off', 'on', 'auto'] as const;
export const VIDEO_LEVELS = ['off', 'audio', 'full', 'auto'] as const;
export const TEXT_LEVELS = ['off', 'embed', 'chunk', 'auto'] as const;

/** Instance ceilings for the media classes. Absent = `auto` (no policy limit of its own). */
export interface MediaLevelCeilings {
  images?: ImageLevel;
  audio?: AudioLevel;
  video?: VideoLevel;
  text?: TextLevel;
}

/**
 * Configuration for the face recognition pipeline.
 * Uses @vladmandic/human with the WASM backend (CPU-only, no Python/CUDA).
 * Models: BlazeFace (detect, ~0.5 MB) + FaceRes (embed, 128d, ~6.7 MB).
 *
 * Face embeddings are stored in a separate Atlas vector index (path: faceEmbedding)
 * on the {spaceId}_files collection. When a new image is processed:
 *   1. All faces are detected and embedded.
 *   2. Each face embedding is searched against the gallery (face-chunk records
 *      that have a faceEntityId) via $vectorSearch.
 *   3. If the top match exceeds `confidenceThreshold`, the file is auto-labeled
 *      with that entity (updateFileMeta({ entityIds })).
 *   4. Face-chunk records (one per detected face) are stored as
 *      `{fileId}#face-chunk{N}` with parentFileId, faceEmbedding, and optionally
 *      faceEntityId when auto-labeled or manually labeled.
 */
export interface FaceRecognitionConfig {
  /**
   * **Infra pin, not a user switch. Defaults to TRUE.**
   *
   * Whether faces run is decided by the image LEVEL (`recognition`, or `auto` resolving to it) — this
   * field only lets an operator hard-disable the pipeline regardless of any level, via
   * `FACE_RECOGNITION_ENABLED=false`, for deployments where biometric processing must be impossible
   * rather than merely switched off. Setting it `true` enables nothing by itself.
   *
   * It used to be the opt-in master switch with a checkbox and a `false` default. That was removed
   * because two controls meant an image level of `recognition` could silently do nothing; the ladder is
   * now the single gate, and images default to `caption` so faces stay off until a level is raised.
   */
  enabled?: boolean;
  /**
   * Cosine similarity threshold (0–1) above which an auto-label is applied.
   * Below this threshold the face is embedded but left unlabeled.
   * Default: 0.6 (conservative — tune up as gallery grows).
   */
  confidenceThreshold?: number;
  /**
   * Minimum face bounding box size as a fraction of the image's shorter side (0–1).
   * Faces smaller than this are skipped (avoids noise from crowd shots).
   * Default: 0.05 (5% of shorter side).
   */
  minFaceSizeFraction?: number;
  /**
   * Directory (relative to DATA_ROOT) where the @vladmandic/human WASM model
   * files are stored. Defaults to "human-models".
   */
  modelPath?: string;
  /**
   * Entity type names that represent people. Only entities whose `type` is in
   * this list are eligible to be stored in the face gallery.
   *
   * Linking a "location" or "object" entity to a photo will never poison the
   * gallery regardless of how many faces are in the image.
   *
   * Default: ["person"]. Add your own type names if you use a different
   * convention (e.g. ["person", "contact", "employee"]).
   */
  personEntityTypes?: string[];
  /**
   * When true, image files downloaded during a sync cycle (or any image whose
   * entity links are manually updated) are automatically re-enqueued for media
   * embedding if they have not yet been processed by the face recognizer.
   *
   * This allows a secondary instance to build its own face gallery from images
   * that arrived via sync rather than direct upload.
   *
   * Default: true (opt-out with false to keep gallery processing local-origin only).
   */
  reprocessSyncedImages?: boolean;
}

// ── Network types ──────────────────────────────────────────────────────────

export type NetworkType = 'closed' | 'democratic' | 'club' | 'braintree' | 'pubsub';
export type SyncDirection = 'both' | 'push' | 'pull';
export type VoteValue = 'yes' | 'veto';
export type VoteRoundType = 'join' | 'remove' | 'space_deletion' | 'meta_change';

export interface NetworkMember {
  instanceId: string;
  label: string;
  url: string;
  tokenHash: string;         // bcrypt of the token this instance uses to auth inbound from peer
  direction: SyncDirection;
  lastSyncAt?: string;       // ISO8601 — set only on successful sync
  lastSeqReceived?: Record<string, number>;  // spaceId → last seq ingested from this peer
  lastSeqPushed?: Record<string, number>;    // spaceId → last seq we confirmed pushed to this peer
  consecutiveFailures?: number;  // incremented on each failed sync; reset to 0 on success
  parentInstanceId?: string; // braintree only
  /** Set during a temporary reparent; stores the original parent so it can be restored. */
  originalParentInstanceId?: string;
  children?: string[];       // instanceIds of direct children (braintree)
  skipTlsVerify?: boolean;   // non-default; UI shows security warning when true
  /** Ed25519 public key (SPKI PEM) used to verify this member's signed vote casts.
   *  Trust-on-first-use: pinned the first time we learn it via member gossip / invite;
   *  a later attempt to change it to a different key is rejected. */
  signingPublicKey?: string;
}

export interface VoteCast {
  instanceId: string;
  vote: VoteValue;
  castAt: string;            // ISO8601
  /** Base64 Ed25519 signature by `instanceId` over the canonical vote message
   *  (see util/signing.ts). Present on casts created by signing-capable brains;
   *  absent on legacy/unsigned casts (accepted only via the own-cast path). */
  sig?: string;
}

export interface VoteRound {
  roundId: string;
  type: VoteRoundType;
  subjectInstanceId: string;
  subjectLabel: string;
  subjectUrl: string;
  deadline: string;          // ISO8601
  openedAt: string;          // ISO8601
  votes: VoteCast[];
  inviteKeyHash?: string;    // bcrypt of invite key (join rounds only)
  concluded?: boolean;
  passed?: boolean;          // true if concluded and the motion carried; false if vetoed/expired
  pendingMember?: NetworkMember;  // stored on join rounds; added to members when vote passes
  spaceId?: string;              // populated for space_deletion and meta_change rounds
  pendingMeta?: SpaceMeta;       // stored on meta_change rounds; applied when vote passes
  requiredVoters?: string[];     // braintree only: instanceIds that must ALL vote yes
}

export interface NetworkConfig {
  id: string;
  label: string;
  type: NetworkType;
  spaces: string[];          // space IDs scoped to this network
  /** Maps remote (peer-side) space IDs to local space IDs.
   *  Used when a local space was renamed after joining, or when the joiner chose
   *  a different local ID to avoid a collision.  The sync engine uses this to
   *  translate between peer space IDs on the wire and local collection/file IDs.
   *  Key = remote space ID, Value = local space ID. */
  spaceMap?: Record<string, string>;
  votingDeadlineHours: number;
  merkle?: boolean;
  /** When true, governance vote casts must carry a valid Ed25519 signature from
   *  the voting member (verified against its pinned signingPublicKey). Enable
   *  once every member has published a signing key. Default (false/undefined)
   *  runs in compatibility mode: signed casts are verified and relay-safe, while
   *  unsigned casts are accepted only directly from the voter (never relayed). */
  requireSignedVotes?: boolean;
  members: NetworkMember[];
  pendingRounds: VoteRound[];
  syncSchedule?: string;     // cron expression; omit = manual only
  inviteKeyHash?: string;    // bcrypt of current active invite key
  createdAt: string;
  /** Braintree only: this instance's parent instanceId in the network tree.
   *  When unset this instance is treated as the root. */
  myParentInstanceId?: string;
  /** Set on THIS instance when it has been temporarily re-parented in a braintree.
   *  Cleared when the reparent is made permanent (`adopt`) or reverted. */
  temporaryReparent?: {
    newParentInstanceId: string;      // grandparent that adopted us
    originalParentInstanceId: string; // offline intermediate we bypassed
    reparentedAt: string;             // ISO8601
  };
}

// ── OIDC types ─────────────────────────────────────────────────────────────

/** Maps a single IdP claim to an Ythril permission.
 *  `claim` supports dot-notation for nested objects (e.g. "realm_access.roles"). */
export interface OidcClaimRule {
  /** Dot-notated path to the claim value in the JWT payload. */
  claim: string;
  /** When present, the claim must equal this value (or be an array containing it).
   *  When absent, the claim merely needs to be truthy. */
  value?: string;
}

export interface OidcClaimMapping {
  /** When matched, the user is granted admin access. */
  admin?: OidcClaimRule;
  /** When matched, the user is restricted to read-only access. */
  readOnly?: OidcClaimRule;
  /** When matched, the claim value is treated as the list of allowed space IDs.
   *  The claim itself must be a JSON array of strings. */
  spaces?: OidcClaimRule;
  /**
   * When true, any OIDC token that does not match the `admin` or `readOnly`
   * rule is rejected with 401.  PAT tokens are unaffected.
   * Default: false (unmatched tokens are accepted with no special permissions).
   */
  requireMatch?: boolean;
}

export interface OidcConfig {
  /** Set to true to enable OIDC authentication. Default: false. */
  enabled: boolean;
  /** Base URL of the IdP realm, e.g. https://keycloak.example.com/realms/my-realm.
   *  The well-known discovery URL is derived by appending
   *  /.well-known/openid-configuration */
  issuerUrl: string;
  /** OAuth2 client ID registered at the IdP. */
  clientId: string;
  /** Expected `aud` claim value in issued JWTs.
   *  Defaults to `clientId` when omitted. */
  audience?: string;
  /** Scopes to request during the authorization code flow.
   *  Defaults to ["openid", "profile", "email"]. */
  scopes?: string[];
  /** JWS algorithms accepted when verifying ID tokens. Defaults to the
   *  asymmetric set in `DEFAULT_OIDC_ALGORITHMS` (RS/PS/ES/EdDSA). Override only
   *  to NARROW it (e.g. ["RS256"]); adding an HMAC alg would let anyone holding
   *  the shared secret mint tokens. */
  allowedAlgorithms?: string[];
  /** Maps IdP JWT claims to Ythril permission flags. */
  claimMapping?: OidcClaimMapping;
  /**
   * When true, the browser SPA rejects cached PAT (Personal Access Token)
   * sessions and forces re-authentication through the IdP.  PATs continue to
   * work for programmatic access (API / MCP via Authorization: ******;
   * only the browser localStorage session path is gated.
   * Default: false.  The API endpoint (`/api/auth/oidc-info`) normalises an
   * absent value to `false` so clients always receive a boolean.
   */
  enforceForBrowser?: boolean;
  /**
   * URI the IdP should redirect to after a successful end-session request.
   * Passed as `post_logout_redirect_uri` to the IdP's end_session_endpoint.
   * Defaults to the instance origin (i.e. the login page).
   */
  postLogoutRedirectUri?: string;
  /**
   * Allow the issuer — and the endpoints its discovery document names — to live on a
   * private/reserved address. An internal IdP is a normal deployment (Keycloak on
   * `http://keycloak.internal:8080`, Authentik on a cluster service, Dex on `10.x`), and the
   * default is public-only, so **that deployment needs this flag or nobody can sign in**.
   *
   * Enabling it does NOT drop the egress guard: discovery and JWKS still go through
   * `ssrfSafeFetch`, which DNS-resolves, pins the resolved IP for the connection and re-validates
   * every redirect — only the private-address rejection relaxes. Crown-jewel addresses (loopback,
   * link-local / cloud IMDS, unspecified) stay blocked either way, including when a hostname
   * resolves to one.
   *
   * The allowance is scoped to the issuer's own address class: a PUBLIC issuer may never hand back
   * a private `jwks_uri`, flag or no flag. Mirrors `allowPrivateModelEndpoints`.
   * Overridable via YTHRIL_OIDC_ALLOW_PRIVATE_ISSUER.
   */
  allowPrivateIssuer?: boolean;
}

// ── Audit log types ────────────────────────────────────────────────────────

export interface AuditConfig {
  /** Log read operations (recall, query, list, etc.). Default: false. */
  logReads?: boolean;
  /** Number of days to retain audit entries (TTL). Default: 90. */
  retentionDays?: number;
}

/** Knowledge types the background duplicate scanner can sweep (same values as RecallKnowledgeType). */
export type DupeScanType = 'memory' | 'entity' | 'edge' | 'chrono' | 'file';

/**
 * Optional background semantic-duplicate scanner. Off by default (opt-in). When
 * enabled, a cron-scheduled sweep walks each space by `seq` (so it covers every
 * record — including those inserted with the interactive checkDuplicates turned
 * off — and re-scans edited records, since updates advance `seq`), finds
 * near-duplicate pairs via stored embeddings, and records them as reviewable
 * candidates. It never modifies data — consolidation is a separate manual action.
 */
export interface DupeScannerConfig {
  /** Master switch. Default: false. */
  enabled?: boolean;
  /** Cron schedule for the nightly sweep. Default: '0 3 * * *' (03:00 daily). */
  schedule?: string;
  /** Cosine-similarity threshold at/above which a pair is recorded. Default: 0.92. */
  threshold?: number;
  /** Records fetched per DB batch during a sweep. Default: 200. */
  batchSize?: number;
  /** Max records scanned per space per run (bounds resource use; the rest is picked up next run). Default: 5000. */
  maxPerRun?: number;
  /** Knowledge types to scan. Default: ['memory', 'entity', 'chrono']. */
  types?: DupeScanType[];
}

/**
 * Background contradiction scanner (F-REVIEW).
 *
 * Separate from `dupeScanner` rather than a flag on it, because the two answer different questions and
 * cost differently: a duplicate is a cosine score that always answers and costs nothing, while a
 * contradiction may need an entailment (NLI) model — a call per candidate pair, and with an external
 * endpoint that means record text leaving the instance. Sharing one switch would make enabling duplicate
 * detection silently start paying for model inference.
 *
 * **Off by default**, like the duplicate scanner. Until it is enabled, contradictions are only found when
 * an admin runs `POST /api/contradictions/scan` by hand.
 */
export interface ContradictionScannerConfig {
  /** Master switch. Default: false. */
  enabled?: boolean;
  /** Cron schedule for the sweep. Default: '30 3 * * *' (03:30 daily). */
  schedule?: string;
  /**
   * Similarity floor for the STRUCTURED pass. Default: 0.85.
   *
   * **NOT raw cosine.** `$vectorSearch` normalises cosine to `(1 + cos) / 2`, so 0.85 here means cosine
   * ≈ 0.70, and the previous 0.92 meant cosine ≈ 0.84. Reading these as cosine makes them sound roughly
   * twice as strict as they are — and setting 0.7 "so the records are at least related" would really mean
   * cosine 0.4, where plenty of unrelated text lands.
   *
   * Loosened from the inherited duplicate threshold because 0.92 asks "are these the same record?", which
   * is the right question for de-duplication and the wrong one here: two records can contradict without
   * being near-identical. The structured judge is deterministic and free per pair, so a somewhat wider net
   * costs nothing but review attention.
   */
  structuredThreshold?: number;
  /**
   * Similarity floor for the NLI pass. Default: **0.85 when the judge is local, 0.92 when it is remote**.
   *
   * Same normalised scale as `structuredThreshold`. The gap is not about speed — an MNLI encoder is one
   * forward pass either way — but about egress: every pair judged remotely is record text leaving the
   * instance, and no amount of hardware makes that cheaper. A local sidecar can afford the same net as the
   * free pass.
   */
  nliThreshold?: number;
  /**
   * Cap on how many pairs the NLI pass may judge in one run. Default: **unlimited when local, 2000 when
   * remote**. 0 means unlimited.
   *
   * Hitting the cap is an ORDERLY stop, not a stall: the pairs it did judge are settled and the cursor
   * advances past them, so the next run resumes where it left off. Only an unavailable judge parks the
   * cursor. Conflating the two would either re-judge the same pairs forever or silently skip them.
   */
  maxJudgedPairsPerRun?: number;
  /** Records fetched per DB batch during a sweep. Default: 200. */
  batchSize?: number;
  /** Max records scanned per space per run. Default: 5000. */
  maxPerRun?: number;
}

/**
 * A per-space duplicate-action rule. When the scanner finds a pair whose score
 * is at or above `minScore` (and whose type is in `types`, if set), the rule's
 * `action` decides what happens. Rules are evaluated highest-`minScore` first;
 * the first match wins; no match falls back to `flag`.
 */
export interface DupeActionRule {
  /** Apply this rule when the pair's cosine score is ≥ this. */
  minScore: number;
  /**
   * - `flag`     — record a reviewable candidate (default, non-destructive).
   * - `automerge`— entities only: merge losslessly when there is no value
   *                conflict, else fall back to `flag`. Uses the existing entity merge.
   * - `notify`   — emit a `duplicate.detected` webhook (both records + score).
   */
  action: 'flag' | 'automerge' | 'notify';
  /** Restrict this rule to these knowledge types (default: any scanned type). */
  types?: DupeScanType[];
  /**
   * `notify` only: POST directly to this URL (SSRF-validated) instead of the
   * webhook-subscription system. Omit to use subscriptions (the default).
   */
  webhookUrl?: string;
}

export interface AuditLogEntry {
  _id: string;
  timestamp: string;       // ISO8601
  _expireAt?: Date;        // BSON Date for TTL index — set at write time
  tokenId: string | null;
  tokenLabel: string | null;
  authMethod: 'pat' | 'oidc' | null;
  oidcSubject: string | null;
  ip: string;
  method: string;          // HTTP method
  path: string;            // request path
  spaceId: string | null;
  operation: string;       // structured event name
  status: number;          // HTTP status code
  entryId: string | null;
  durationMs: number;
  /**
   * What the request actually changed, when the operation has an allowlist in `audit/audit-changes.ts`.
   *
   * Absent for everything else, by design: an operation with no allowlist records nothing, so a route
   * added later is silent rather than leaking. Values are scalars only — see that module for why a
   * denylist would be the wrong shape here.
   */
  changes?: { field: string; from?: string | number | boolean | null; to?: string | number | boolean | null }[];
}

export interface Config {
  instanceId: string;
  instanceLabel: string;
  publicUrl?: string;         // optional canonical public URL for this brain instance
  /** Ed25519 public signing key (SPKI PEM) for this instance. Published to peers
   *  so they can verify our signed governance vote casts. Private half is in
   *  secrets.json. Generated on first startup after setup. */
  signingPublicKey?: string;
  /** Present after a signing-key rotation: a proof (signed by the previous key)
   *  that the current `signingPublicKey` supersedes it. Advertised to peers via
   *  gossip so they can safely re-pin. */
  signingKeyRotation?: { previousPublicKey: string; proof: string };
  tokens: TokenRecord[];
  spaces: SpaceConfig[];
  networks: NetworkConfig[];
  ejectedFromNetworks?: string[];  // network IDs this instance has been removed from via vote
  embedding?: EmbeddingConfig;
  storage?: StorageConfig;
  /** Optional media embedding pipeline (image / audio / video). Off by default. */
  mediaEmbedding?: MediaEmbeddingConfig;
  /**
   * When true, deleting a file flags its metadata record as deleted
   * (`deletedAt = <now>`) instead of removing it, keeping an audit trail. Flagged
   * records stay listed and searchable but are marked "deleted" in the UI, and only
   * a flagged/orphaned record (one whose file no longer exists) may be purged — a
   * metadata record whose file is still present cannot be deleted directly.
   * Default false (delete the metadata record immediately, the historical behavior).
   * Derived records (conversion chunks / `_converted` / `_extracted`) are always
   * hard-removed regardless of this setting.
   */
  softDeleteFileMeta?: boolean;
  maxUploadBodyBytes?: number;
  /** Max total size (bytes) a chunked upload may declare via Content-Range.
   *  Default 10 GiB. The storage quota (if configured) applies on top. */
  maxChunkedUploadBytes?: number;
  /** Max input size (bytes) accepted by the document conversion pipeline
   *  (pdf/docx/epub/html/md/txt → markdown chunks). Default 100 MiB; HTML is
   *  additionally capped at 25 MiB because jsdom parses it in-process. */
  maxDocumentConversionBytes?: number;
  allowInsecurePlaintext?: boolean;
  /**
   * Require the on-disk state files (config/secrets/schema-library/schema-catalogs) to be encrypted
   * at rest. Default false. When true, the instance refuses to boot unless a master secret is
   * configured (`YTHRIL_MASTER_KEY` or `YTHRIL_MASTER_PASSPHRASE`). Also settable via the
   * YTHRIL_REQUIRE_ENCRYPTED_AT_REST env var (checkable before config is even read).
   */
  requireEncryptedAtRest?: boolean;
  /**
   * Security posture: when `strict` is true (or env `YTHRIL_SECURITY_STRICT`), any FAIL-level finding in
   * the startup posture check aborts boot (WARN findings stay advisory). Default false — the individual
   * `require*` flags remain the authoritative enforcement; this is the aggregate "don't start if
   * misconfigured" switch.
   */
  security?: { strict?: boolean };
  /**
   * Express `trust proxy` setting. Default `false` — the out-of-the-box compose
   * deployment is exposed directly, so `req.ip` must come from the socket, not a
   * client-supplied X-Forwarded-For (which would let an attacker spoof the IP
   * that rate limiting and the audit log key on). Set to the exact number of
   * proxy hops (NOT `true`) only when a known reverse proxy terminates client
   * connections. Accepts Express's native values: boolean | hop count |
   * 'loopback' | a comma-separated CIDR/IP list. Overridable via the
   * TRUST_PROXY environment variable.
   */
  trustProxy?: boolean | number | string | string[];
  /** Max redirect hops followed (and re-validated) during webhook delivery.
   *  Default 3; clamped to [0, 20]. Env var WEBHOOK_MAX_REDIRECTS overrides. */
  webhookMaxRedirects?: number;
  setup?: { completed: true };
  mongo?: { uri?: string };
  /** Optional OpenID Connect configuration for SSO login. */
  oidc?: OidcConfig;
  /** Optional external theming configuration. */
  theme?: {
    /** URL to an external CSS stylesheet that overrides Ythril's default CSS custom properties. */
    cssUrl?: string;
  };
  /**
   * Optional embedding configuration for portal-style deployments.
   *
   * SECURITY — opt-in, and the integrator explicitly accepts the risk. By default
   * this is absent and Ythril behaves exactly as before: only same-origin pages may
   * frame it (`frame-ancestors 'self'`) and only same-origin `ythril:theme`
   * postMessages are honoured.
   *
   * Listing an origin here grants that origin BOTH rights at once:
   *  - it may embed Ythril in an iframe (added to CSP `frame-ancestors`), and
   *  - it may push runtime theme tokens via `postMessage`.
   *
   * Entries must be exact, scheme-qualified origins with no path/query/fragment —
   * e.g. `https://portal.example.com`. `https:` is required (except http on
   * localhost/127.0.0.1 for development). Wildcards (`*`) are never accepted.
   * Framing a page is a clickjacking primitive and theming it can be used to spoof
   * UI, so only list hosts you control.
   */
  embed?: {
    /** Origins allowed to iframe Ythril and to push theme tokens. Empty/absent = same-origin only. */
    allowedOrigins?: string[];
  };
  /** Optional audit log configuration. */
  audit?: AuditConfig;
  /** Optional background semantic-duplicate scanner. Off by default. */
  dupeScanner?: DupeScannerConfig;
  /** Optional background contradiction scanner. Off by default. */
  contradictionScanner?: ContradictionScannerConfig;
  /**
   * Allow sync peers to live on private/reserved addresses (RFC-1918, CGNAT,
   * IPv6 ULA) — for same-host or LAN deployments. Default false (public peers
   * only). Even when true, crown-jewel addresses (loopback, link-local/IMDS,
   * unspecified) stay blocked. Overridable via SYNC_ALLOW_PRIVATE_PEERS.
   */
  allowPrivatePeers?: boolean;
  /**
   * Allow sync peers to be reached over plaintext `http://`. Default false —
   * peer URLs must use `https://`, so sync traffic (which carries record data and
   * bearer tokens) is encrypted in transit. Set true only to permit `http://`
   * peers on a trusted private network you fully control. Overridable via
   * SYNC_ALLOW_INSECURE_PEERS. Ignored (forced false) when
   * `requireEncryptedTransport` is set. See [[transport-security]].
   */
  allowInsecurePeers?: boolean;
  /**
   * Instance-wide "encrypted transport only" switch. Default false. When true:
   *  - every inbound request must arrive over HTTPS (`req.secure`) — plaintext
   *    requests are rejected 403 (loopback is exempted for health checks);
   *  - `http://` sync peers are hard-blocked at admission AND connection time,
   *    overriding `allowInsecurePeers`.
   * Requires `trustProxy` to be set correctly when a reverse proxy terminates TLS
   * (otherwise `req.secure` is always false behind the proxy). Overridable via
   * REQUIRE_ENCRYPTED_TRANSPORT.
   */
  requireEncryptedTransport?: boolean;
  /**
   * Allow the **external** model/media provider endpoints (vision, STT, embedding, document assist) to
   * live on private/reserved addresses — a self-hosted OpenAI-compatible inference service behind a
   * cluster address, e.g. `http://llm-inference.llm.svc.cluster.local:8080`.
   *
   * Why this exists: `external` selects the OpenAI wire protocol and `local` selects Ollama's, so an
   * operator running llama.cpp/vLLM/LocalAI on a private address had NO usable shape — `local` speaks a
   * protocol their server does not implement, and `external` rejected the address at save time.
   *
   * Enabling it does NOT drop the egress guard: those calls still go through `ssrfSafeFetch`, which
   * DNS-resolves, pins the resolved IP for the connection and re-validates every redirect — only the
   * private-address rejection relaxes. A declared-private external endpoint is therefore *better*
   * protected than a `local` provider, which uses a plain `fetch`. Crown-jewel addresses (loopback,
   * link-local / cloud IMDS, unspecified) stay blocked either way.
   *
   * Env/config only, deliberately NOT settable through `PATCH /api/admin/media-config`: an endpoint that
   * becomes an egress target must never be widenable from the admin API. Mirrors `allowPrivatePeers`.
   * Overridable via YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS.
   */
  allowPrivateModelEndpoints?: boolean;
  /** Dynamically-registered OAuth clients (RFC 7591) for the MCP browser
   *  authorization flow. Populated automatically when a client registers; not
   *  meant to be hand-edited. See mcp/oauth.ts. */
  oauthClients?: OAuthClientRecord[];
  /** Write-ahead marker for a multi-step space operation (rename/delete) that
   *  spans config + MongoDB + the filesystem and therefore cannot be atomic.
   *  Written (and persisted) BEFORE the physical steps and cleared once the op
   *  commits, so a crash mid-operation is detected on the next boot and completed
   *  idempotently (see reconcilePendingSpaceOp in spaces.ts). Not hand-edited. */
  pendingSpaceOp?: PendingSpaceOp;
}

/** Records an in-flight space rename/delete so it survives a crash. See the
 *  `pendingSpaceOp` field on {@link Config}. */
export interface PendingSpaceOp {
  type: 'rename' | 'delete';
  /** The space being operated on (its current, pre-commit id). */
  spaceId: string;
  /** Target id for a rename. Absent for a delete. */
  newId?: string;
  /** ISO timestamp the operation began, for diagnostics. */
  startedAt: string;
}

/** A dynamically-registered OAuth client for the MCP OAuth flow.
 *  Mirrors the subset of RFC 7591 client metadata Ythril persists; additional
 *  fields returned by the client registration are retained via the index signature. */
export interface OAuthClientRecord {
  client_id: string;
  client_id_issued_at?: number;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface SecretsFile {
  peerTokens: Record<string, string>;
  totpSecret?: string;              // base32 TOTP secret; absent = MFA disabled
  /** Highest TOTP step counter already consumed. A code is accepted only for a
   *  step strictly greater than this, so a code observed in transit cannot be
   *  replayed within its ±1-step validity window. Reset when MFA is re-enrolled. */
  totpLastStep?: number;
  webhookEncryptionKey?: string;    // hex-encoded AES-256 key for webhook secret encryption
  signingPrivateKey?: string;       // Ed25519 private key (PKCS8 PEM) for signing governance votes
  /**
   * Media embedding provider credentials. Stored here (0o600) instead of
   * config.json so API keys are never world-readable. Env vars
   * (`VISION_API_KEY` / `STT_API_KEY`) still take precedence.
   */
  mediaEmbedding?: {
    visionApiKey?: string;
    sttApiKey?: string;
    nliApiKey?: string;
  };
}

// ── MongoDB document shapes ────────────────────────────────────────────────

export interface AuthorRef {
  instanceId: string;
  instanceLabel: string;
}

export interface MemoryDoc {
  _id: string;
  spaceId: string;
  fact: string;
  /** Optional memory type — used to look up typeSchemas.memory for schema validation. */
  type?: string;
  embedding: number[];
  tags: string[];
  entityIds: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  /** Pre-embedding source text — the exact string fed to the embedding model. */
  matchedText?: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
  seq: number;
  embeddingModel: string;
  forkOf?: string;
  /** Absolute expiry (F10). Set when a per-record `ttlDays` or the space's `recordTtlDays` applies;
   *  the TTL sweep deletes the record (through the normal delete path) once it passes. */
  _expireAt?: Date;
}

export interface EntityDoc {
  _id: string;
  spaceId: string;
  name: string;
  type: string;
  tags: string[];
  description?: string;
  properties: Record<string, string | number | boolean>;
  /** Pre-embedding source text — the exact string fed to the embedding model. */
  matchedText?: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
  seq: number;
  embedding?: number[];
  embeddingModel?: string;
  /** Absolute expiry (F10) — see MemoryDoc._expireAt. */
  _expireAt?: Date;
}

export interface EdgeDoc {
  _id: string;
  spaceId: string;
  from: string;
  to: string;
  label: string;
  type?: string;
  weight?: number;
  tags?: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  /** Pre-embedding source text — the exact string fed to the embedding model. */
  matchedText?: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
  seq: number;
  embedding?: number[];
  embeddingModel?: string;
  /** Absolute expiry (F10) — see MemoryDoc._expireAt. */
  _expireAt?: Date;
}

export type ChronoType = 'event' | 'deadline' | 'plan' | 'prediction' | 'milestone';
/** @deprecated Use ChronoType */
export type ChronoKind = ChronoType;
export type ChronoStatus = 'upcoming' | 'active' | 'completed' | 'overdue' | 'cancelled';

export interface ChronoEntry {
  _id: string;
  spaceId: string;
  title: string;
  description?: string;
  type: ChronoType;
  startsAt: string;
  endsAt?: string;
  status: ChronoStatus;
  confidence?: number;
  tags: string[];
  entityIds: string[];
  memoryIds: string[];
  properties?: Record<string, string | number | boolean>;
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    until?: string;
  };
  /** Pre-embedding source text — the exact string fed to the embedding model. */
  matchedText?: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
  seq: number;
  embedding?: number[];
  embeddingModel?: string;
  /** Absolute expiry (F10) — see MemoryDoc._expireAt. */
  _expireAt?: Date;
}

export interface TombstoneDoc {
  _id: string;
  type: 'memory' | 'entity' | 'edge' | 'chrono';
  spaceId: string;
  deletedAt: string;
  instanceId: string;
  seq: number;
  /** Seq of the document at the time it was deleted — used to filter tombstones
   *  from pagination pages that already returned the live document. */
  originalSeq?: number;
}

export interface FileTombstoneDoc {
  _id: string;         // UUID
  spaceId: string;
  path: string;        // relative path (same convention as ManifestEntry.path)
  deletedAt: string;   // ISO8601 — used by peers to prune expired tombstones
}

export interface FileMetaDoc {
  _id: string;          // space-relative path, normalised to forward slashes
  spaceId: string;
  path: string;         // same as _id — carried as a queryable field
  description?: string; // human-readable summary (optional)
  tags: string[];       // tags for filtering and recall scoping
  entityIds?: string[];  // linked entity IDs
  chronoIds?: string[];  // linked chrono entry IDs
  memoryIds?: string[];  // linked memory IDs
  properties?: Record<string, string | number | boolean>; // structured metadata (optional)
  /** Pre-embedding source text — the exact string fed to the embedding model. */
  matchedText?: string;
  createdAt: string;    // ISO8601 — first write timestamp
  updatedAt: string;    // ISO8601 — last write timestamp
  sizeBytes: number;    // file size in bytes at last write
  author: AuthorRef;    // writer: instanceId + instanceLabel
  /** Set when the file was deleted while `softDeleteFileMeta` is enabled: ISO8601
   *  timestamp of the deletion. The record is retained (still listed/searchable, shown
   *  as "deleted" in the UI) until purged. Absent for live files. */
  deletedAt?: string;
  embedding?: number[];
  embeddingModel?: string;
  // ── Conversion pipeline fields ────────────────────────────────────────────
  /** For chunk records: ID of the parent file's filemeta record (_id = normalised path). */
  parentFileId?: string;
  /** 0-based position of this chunk within the document. */
  chunkIndex?: number;
  /** The H2/H3 heading that opened this chunk (null for paragraph-chunked txt files). */
  headingText?: string | null;
  /** The chunk body text (Markdown). Used as embedding source alongside headingText. */
  content?: string;
  /** For the original file: _id of the converted Markdown file record (binary formats only). */
  convertedFileId?: string;
  /** For the original file: total number of chunk records produced. */
  chunkCount?: number;
  /** Set when conversion failed: human-readable error message. */
  conversionError?: string;
  // ── Media embedding fields ────────────────────────────────────────────────
  /** Detected media class for the original file. Set on image/audio/video uploads. */
  mediaType?: 'image' | 'audio' | 'video';
  /** Async embedding lifecycle for binary media:
   *   "pending"    → enqueued, not yet processed
   *   "processing" → claimed by a worker
   *   "complete"   → all chunk records produced AND embedded
   *   "partial"    → chunks produced but some failed to embed; searchable but incomplete.
   *                  Re-runnable via POST /api/files/:spaceId/retry_embedding.
   *   "failed"     → exhausted retries; mediaJobError carries the reason
   *   "skipped"    → not analysed — file too large (> maxFileSizeBytes), or this media class is `off`
   *                  for the space (its `levels` entry) — original kept, no embedding
   *   "disabled"   → LEGACY: set at upload when the removed media-embedding master switch was off. No
   *                  longer produced (a class turned off now lands as "skipped"); kept so pre-migration
   *                  records still render.
   */
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'partial' | 'failed' | 'skipped' | 'disabled';
  /** For audio/video chunk records: start offset within the parent media file. */
  chunkOffsetMs?: number;
  /** For audio/video chunk records: duration covered by this chunk. */
  chunkDurationMs?: number;
  /** Last error message from a failed media embedding job, when embeddingStatus="failed". */
  mediaJobError?: string;
  // ── Face recognition fields ───────────────────────────────────────────────
  /**
   * For face-chunk records: 128d face descriptor from @vladmandic/human FaceRes.
   * Stored on separate chunk records ({fileId}#face-chunkN) alongside faceEntityId.
   * Searched via a separate Atlas vector index (path: faceEmbedding).
   */
  faceEmbedding?: number[];
  /** Entity ID matched at embedding time (auto or manual label). */
  faceEntityId?: string;
  /** Bounding box of the detected face within the original image [x,y,w,h] as 0–1 fractions. */
  faceBbox?: [number, number, number, number];
  /** Recognition confidence score (cosine similarity to gallery match, 0–1). */
  faceScore?: number;
}

export interface ConflictDoc {
  _id: string;
  spaceId: string;
  originalPath: string;   // relative path of the local file (version kept)
  conflictPath: string;   // relative path of the conflict copy (incoming version renamed)
  peerInstanceId: string;
  peerInstanceLabel: string;
  detectedAt: string;     // ISO8601
}

/**
 * Recorded when a sync-ingested document violates strict linkage rules.
 * The document is still accepted (sync must not be blocked), but the
 * violation surfaces in the conflicts/warnings API so the user can
 * remediate (fix the document, disable strictLinkage, or leave network).
 */
export interface LinkViolationDoc {
  _id: string;            // UUID v4
  spaceId: string;
  docId: string;          // ID of the violating document (entity/edge/memory/chrono)
  docType: 'entity' | 'edge' | 'memory' | 'chrono';
  field: string;          // field name that violated (e.g. "from", "to", "entityIds")
  reason: string;         // human-readable explanation
  peerInstanceId: string; // which peer sent the document
  detectedAt: string;     // ISO8601
}

export interface SpaceCounterDoc {
  _id: string;  // spaceId
  seq: number;
}

/**
 * A semantically-duplicate pair recorded by the background scanner, stored in
 * `${spaceId}_dupe_candidates`. The `_id` is a canonical pair key so the same
 * pair is only ever recorded once regardless of which member is scanned first.
 */
/**
 * One contradiction candidate — a pair of records in a space that appear to DISAGREE (F-REVIEW).
 *
 * Shaped after `DupeCandidateDoc` on purpose: same identity scheme, same sticky-dismissal contract, so the
 * Review tab's two sub-views share one vocabulary and `decideDismissed` serves both.
 *
 * The difference that matters is `basis`. A duplicate has a similarity SCORE; a contradiction has a REASON,
 * and the two reasons are not equally strong. `structured-field` is deterministic — the records literally
 * set the same single-valued property to different values. `nli` is a model's opinion, so it carries a
 * confidence and deserves to be labelled as such in the UI: a reviewer should be able to tell "these two
 * disagree on `port`" from "a model thinks these disagree".
 *
 * There is deliberately NO record for an *unjudged* pair. When the judge cannot answer (no endpoint,
 * outage, low confidence), nothing is written and the scan cursor does not treat the pair as settled — so
 * it is re-examined later. Writing an "unjudged" row would be worse than useless: it would look like a
 * reviewed-and-clean pair to every query that filters on status.
 */
export interface ContradictionCandidateDoc {
  _id: string;            // canonical `${aId}:${bId}` with aId < bId
  spaceId: string;
  /** Which collection the pair lives in — contradictions are judged within one kind of record. */
  type: DupeScanType;
  aId: string;
  aSummary: string;
  aSeq: number;
  bId: string;
  bSummary: string;
  bSeq: number;
  /** How the disagreement was established. */
  basis: 'structured-field' | 'nli';
  /** 1 for a deterministic structured conflict; the model's confidence for an `nli` verdict. */
  confidence: number;
  /** The disagreeing single-valued properties — present only when `basis` is `structured-field`. */
  fields?: { key: string; aValue: string | number | boolean; bValue: string | number | boolean }[];
  status: 'open' | 'dismissed' | 'resolved';
  /** How a resolved candidate was actioned. `edited` = a record was corrected; `linked` = a
   *  contradicts/supersedes edge was drawn instead of changing either record. */
  resolution?: 'edited' | 'linked';
  /** Same sticky-dismissal contract as duplicates — see `decideDismissed`. */
  dismissedContentHash?: string;
  detectedAt: string;
  updatedAt: string;
}

export interface DupeCandidateDoc {
  _id: string;            // canonical `${type}:${aId}:${bId}` with aId < bId
  spaceId: string;
  type: DupeScanType;
  aId: string;            // lexicographically smaller record id
  aSummary: string;       // short human summary of record a
  aSeq: number;           // record a's seq at last detection (change → re-detect)
  bId: string;            // lexicographically larger record id
  bSummary: string;       // short human summary of record b
  bSeq: number;           // record b's seq at last detection
  score: number;          // cosine similarity at last detection
  /** open = awaiting review; dismissed = reviewed/not-a-dup; resolved = auto-actioned (merged/notified). */
  status: 'open' | 'dismissed' | 'resolved';
  /** How a resolved candidate was actioned (present only when status = 'resolved'). */
  resolution?: 'merged' | 'notified';
  /**
   * Content fingerprint of the pair (both records' embedded text) captured when it was dismissed.
   * A dismissed pair is sticky against seq bumps that DON'T change content — a re-embed, a peer
   * re-sync, an index rebuild — but re-opens automatically when the content materially changes
   * (this hash no longer matches). Present only while `status = 'dismissed'`; undefined on a legacy
   * dismissal (pre-this-feature), which is treated as sticky and back-filled on the next scan.
   */
  dismissedContentHash?: string;
  detectedAt: string;     // ISO8601 — first detection
  updatedAt: string;      // ISO8601 — last re-detection
}

/**
 * Per-(space, type) scan cursor for the duplicate scanner, stored in the global
 * `ythril_dupe_scan_state` collection. `cursorSeq` is the highest `seq` already
 * swept — the next run scans records with a greater `seq` (new or edited).
 */
export interface DupeScanStateDoc {
  _id: string;            // `${spaceId}:${type}`
  spaceId: string;
  type: DupeScanType;
  cursorSeq: number;
  updatedAt: string;      // ISO8601
}

/**
 * Background job record for asynchronous media embedding (caption/STT + chunking)
 * and text document embedding (chunking + vector embedding).
 * Stored in the per-space `<spaceId>_media_jobs` collection and claimed by the
 * MediaEmbeddingWorker. The corresponding filemeta record's `embeddingStatus`
 * mirrors `status` (pending/processing/complete/failed).
 */
export interface MediaJobDoc {
  _id: string;                // file _id (normalised path) — one job per file
  spaceId: string;
  filePath: string;           // normalised path on disk
  mimeType: string;           // raw upload MIME type
  mediaType: 'image' | 'audio' | 'video' | 'text';
  /** For text jobs: the resolved document format (md, txt, html, pdf, docx, epub). */
  resolvedFormat?: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  claimedAt: string | null;   // ISO8601 — set when a worker claims this job
  /**
   * ISO8601 — last time this job did something. Set when claimed, then advanced by the worker every
   * time a unit of work completes (a page rendered, a page transcribed, a stage finished).
   *
   * Stall detection reads THIS, not `claimedAt`. A wall-clock deadline measured from the claim
   * cannot tell "wedged" from "slow", so a genuinely long job — a 400-page PDF being transcribed a
   * page at a time — was requeued mid-flight for the crime of taking a while, then re-claimed and
   * killed again at the same point: an infinite loop that burns the model budget and never finishes.
   * Measuring from the last sign of life means the timeout fires only when nothing is happening.
   */
  progressAt?: string | null;
  /**
   * The last step report from the worker: which stage is running, the full route this document
   * takes, and how far through the current stage it is. Written in the same update as the
   * heartbeat, so surfacing progress costs no extra writes.
   */
  progress?: { step: string; steps: string[]; done?: number; total?: number };
  /**
   * ISO8601 — when set on a `pending` job, the worker MUST NOT claim it
   * until this timestamp has passed. Used for exponential retry backoff so
   * a fast-failing "poison pill" job can’t monopolise the queue and starve
   * sibling jobs that would otherwise succeed. Cleared on success/manual retry.
   */
  claimableAfter?: string | null;
  createdAt: string;          // ISO8601
  updatedAt: string;          // ISO8601
}

