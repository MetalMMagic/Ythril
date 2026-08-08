/**
 * Shared API DTOs and domain types for the Ythril client.
 *
 * Extracted from the former monolithic api.service.ts (A17.2). The HttpClient wrappers now live in
 * per-domain services (auth/spaces/schema/brain/files/duplicates/networks/admin *-api.service.ts);
 * this file is types only, so any component or service can import a DTO without pulling in a service.
 */

// ── Shared types ─────────────────────────────────────────────────────────────

/**
 * What kind of thing a record is, for the SPACE retention tier: the four knowledge types plus `file`.
 *
 * Files share this tier but have no type, so the schema tier cannot reach them — that asymmetry is the whole
 * reason this is a separate name from `KnowledgeType`, and the reason there are five buckets rather than four.
 */
export type TtlBucket = KnowledgeType | 'file';

/** The space-wide retention window per bucket. Absent or `null` means no window for that bucket. */
export interface RecordTtlWindows {
  entity?: number | null;
  memory?: number | null;
  edge?:   number | null;
  chrono?: number | null;
  file?:   number | null;
}

/** The five buckets, in the order the UI shows them. `file` last: it is the one with no schema tier above it. */
export const TTL_BUCKETS: readonly TtlBucket[] = ['entity', 'memory', 'edge', 'chrono', 'file'];

/**
 * A space's windows as a full five-bucket map, widening the legacy scalar — so no component has to know which
 * shape it is looking at. `null` means "no window", which is also what an absent bucket means.
 */
export function recordTtlWindows(stored: number | RecordTtlWindows | undefined): Record<TtlBucket, number | null> {
  const ok = (v: unknown): number | null =>
    typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
  const out = {} as Record<TtlBucket, number | null>;
  for (const b of TTL_BUCKETS) out[b] = typeof stored === 'number' ? ok(stored) : ok(stored?.[b]);
  return out;
}

export interface Space {
  id: string;
  label: string;
  builtIn?: boolean;
  folders?: string[];
  maxGiB?: number;
  usageGiB?: number;
  /** @deprecated Derived alias of `meta.purpose` — the server no longer stores it. Removal in 3.0. */
  description?: string;
  proxyFor?: string[];
  meta?: SpaceMeta;
  dupeRules?: DupeActionRule[];
  dupeMergeSurvivor?: 'older' | 'newer';
  dupeRulesOnInsert?: boolean;
  /**
   * Auto-TTL (F10): the SPACE tier of `record > schema > space`. Absent/0 = no expiry.
   *
   * **Two shapes.** A bare number is the legacy setting and still means all five buckets; the object is per
   * bucket. Never read it directly for display — use `recordTtlWindows()`, which widens the scalar so the UI
   * never has to know which one it is looking at.
   */
  recordTtlDays?: number | RecordTtlWindows;
  /** Per-space document-extraction mode override (F11-c). Absent = inherit the instance default
   *  (Settings → Models). Local/operational, like dupe rules. */
  documentExtraction?: 'off' | 'ocr' | 'vlm' | 'repair' | 'auto';
  /** Per-space media-analysis level overrides. Absent = inherit the instance default (Settings → Models).
   *  Capped to the instance ceiling server-side. */
  imageAnalysis?: 'off' | 'caption' | 'recognition' | 'auto';
  audioAnalysis?: 'off' | 'on' | 'auto';
  videoAnalysis?: 'off' | 'audio' | 'full' | 'auto';
  textAnalysis?: 'off' | 'embed' | 'chunk' | 'auto';
  /** Vector-index build state for a newly created space (B1). 'building' while the
   *  Atlas indexes finish; absent means ready. Semantic recall waits for READY. */
  indexStatus?: 'building' | 'ready' | 'failed';
  /** Networks this space belongs to (F8). Absent/empty when the space is in no
   *  network — the Brain chip shows the network indicator only when present. */
  networks?: { id: string; label: string; type: Network['type'] }[];
  /** Aggregate sync/governance status across this space's networks (F8), for the
   *  chip indicator. 'vote' = an open round affects it; 'degraded' = a peer has
   *  failed repeatedly (investigate); 'syncing' = a cycle is running; 'idle' =
   *  member, nothing active. There is no true "fully synced" state (eventual sync). */
  networkStatus?: 'vote' | 'degraded' | 'syncing' | 'idle';
}

export type ValidationMode = 'off' | 'warn' | 'strict';
export type KnowledgeType = 'entity' | 'memory' | 'edge' | 'chrono';

export interface PropertySchema {
  type?: 'string' | 'number' | 'boolean' | 'date';
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  mergeFn?: 'avg' | 'min' | 'max' | 'sum' | 'and' | 'or' | 'xor';
  required?: boolean;
  default?: string | number | boolean;
}

export interface TypeSchema {
  /** Reference to a schema library entry. Format: `"library:<name>"`. */
  $ref?: string;
  namingPattern?: string;
  tagSuggestions?: string[];
  propertySchemas?: Record<string, PropertySchema>;
  /** How long records of this type are kept — the schema tier of **record > schema > space**. `days` deletes
   *  the record; `contentDays` (chrono only) drops the detail and the embedding but keeps the record. */
  retention?: { days?: number; contentDays?: number };
}

/** An entry in the instance-level schema library. */
export interface SchemaLibraryEntry {
  name: string;
  knowledgeType: KnowledgeType;
  typeName: string;
  schema: Omit<TypeSchema, '$ref'>;
  description?: string;
  /** Optional group tag for organizing related entries into a named set. */
  schemaGroup?: string;
  published?: boolean;
  sourceUrl?: string;
  sourceCatalog?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaCatalog {
  name: string;
  url: string;
  description?: string;
  createdAt: string;
  /** True if an access token is stored server-side for this catalog (token itself is never returned). */
  hasAccessToken?: boolean;
}

/** A single entry from a foreign catalog (public endpoint shape). */
export interface ForeignCatalogEntry {
  name: string;
  knowledgeType: KnowledgeType;
  typeName: string;
  description?: string;
  updatedAt: string;
  /** Present on full entry fetch, absent on index listing. */
  schema?: Omit<TypeSchema, '$ref'>;
}

export interface SpaceMeta {
  version?: number;
  purpose?: string;
  usageNotes?: string;
  validationMode?: ValidationMode;
  typeSchemas?: Partial<Record<KnowledgeType, Record<string, TypeSchema>>>;
  tagSuggestions?: string[];
  strictLinkage?: boolean;
  updatedAt?: string;
}

export interface SpaceMetaResponse extends SpaceMeta {
  spaceId: string;
  spaceName: string;
  stats: SpaceStats;
}

export interface SpacesResponse {
  spaces: Space[];
  /** The instance document-extraction ceiling — the highest mode any space may pick. 'auto' = no
   *  policy limit. Used to constrain the per-space extraction dropdown. */
  docExtractionCeiling?: 'off' | 'ocr' | 'vlm' | 'repair' | 'auto';
  /** The instance per-class media-analysis ceilings — the highest level any space may pick for each
   *  class. 'auto' = no policy limit. Used to constrain the per-space media pickers so they can't
   *  propose a level the runtime would silently cap. */
  mediaCeilings?: {
    image: 'off' | 'caption' | 'recognition' | 'auto';
    audio: 'off' | 'on' | 'auto';
    video: 'off' | 'audio' | 'full' | 'auto';
    text: 'off' | 'embed' | 'chunk' | 'auto';
  };
  storage?: {
    usageGiB: { files: number; brain: number; total: number };
    limits?: StorageLimits;
  };
}

/**
 * Instance storage quotas, as the server actually sends them.
 *
 * The previous shape — `{ totalLimitGiB, warnAtPercent }` — was **fiction**. The server has always sent
 * `{ total: { softLimitGiB, hardLimitGiB }, files: {...}, brain: {...} }`, so `limits.totalLimitGiB` was
 * permanently `undefined`, every `@if` guarding the quota UI was permanently false, and Settings →
 * Storage showed *no limit, no usage bar and no health pill* on an instance that had quotas configured.
 * It read exactly like "no quota set". Nothing failed, because reading a missing field is not an error.
 */
export interface StorageAreaLimit {
  softLimitGiB?: number;
  hardLimitGiB?: number;
}

export interface StorageLimits {
  total?: StorageAreaLimit;
  files?: StorageAreaLimit;
  brain?: StorageAreaLimit;
  /** Dotted paths pinned by an env var (`total.hardLimitGiB`), rendered read-only. */
  lockedByInfra?: string[];
}

export interface TokenRecord {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  spaces?: string[];
  admin: boolean;
  readOnly?: boolean;
  schemaLibrary?: boolean;
  /**
   * This token's relationship to the second factor. Absent = `inherit` (follow the instance-wide switch),
   * which is what every existing token does. `exempt` skips MFA even when the switch is on — the automation
   * case, and a deliberate hole, so it is badged wherever the token is listed.
   */
  mfa?: 'inherit' | 'exempt' | 'required';
}

export interface Memory {
  _id: string;
  fact: string;
  type?: string;
  tags?: string[];
  entityIds?: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
  seq: number;
  author?: { instanceId: string };
}

export interface Entity {
  _id: string;
  name: string;
  type?: string;
  tags?: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface Edge {
  _id: string;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  label: string;
  type?: string;
  weight?: number;
  tags?: string[];
  description?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
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
  recurrence?: { freq: string; interval?: number; until?: string };
  author: { instanceId: string; instanceLabel: string };
  createdAt: string;
  updatedAt: string;
  seq: number;
}

/** Embedding-job backlog for a space (F9 Overview embedding-queue panel). */
export interface EmbeddingQueue {
  pending: number;
  processing: number;
  complete: number;
  failed: number;
  failedSample: { path: string; lastError: string | null }[];
  /** Every failure grouped by reason, most common first. Optional so an older server still parses. */
  failedByReason?: { reason: string | null; count: number }[];
}

/** One token that can reach a space (F9 Overview token-access matrix). Minimal, non-secret fields only. */
export interface TokenAccessEntry {
  name: string;
  level: 'admin' | 'readOnly' | 'full';
  /** True when the token has no space allow-list — it reaches every space, not just this one. */
  allSpaces: boolean;
  /** True when the token belongs to a network peer (inbound sync), for distinct labelling. */
  peer: boolean;
  expiresAt: string | null;
}

export interface SpaceStats {
  spaceId: string;
  memories: number;
  entities: number;
  edges: number;
  chrono: number;
  files: number;
  needsReindex?: boolean;
}

/**
 * One space's usage over a window — `stats` says how much is IN a space, this says whether anyone is getting
 * anything OUT of it.
 *
 * `recall` and `answered` are meant to be read together, and that is the whole reason the endpoint exists: 380
 * queries against 41 answers is not a popular space, it is a space people keep failing to get an answer out
 * of, and a call count alone cannot tell the two apart.
 */
export interface SpaceActivity {
  space: string;
  /** All classes: recall, reads, writes and file traffic. */
  calls: number;
  recall: number;
  /** Recalls that came back with at least one result. */
  answered: number;
  writes: number;
  /** Mean across all call classes, or null when the window had no calls (never NaN). */
  meanMs: number | null;
  maxMs: number;
  /** Calls slower than a second — offered instead of a percentile, which stored means cannot support. */
  over1s: number;
  /** Mean best-hit score over ANSWERED recalls, or null when none were. Never 0-for-none. */
  meanTopScore: number | null;
  lastUsedAt: string | null;
}

export interface SpaceActivityResponse {
  spaceId: string;
  hours: number;
  /** One row per member space — a proxy space reports its members. */
  spaces: SpaceActivity[];
}

/**
 * One completeness finding. The score is the weighted roll-up of these — the checks are the primitive,
 * because a percentage nobody can decompose is a number nobody can act on.
 */
export interface CompletenessCheck {
  id: string;
  severity: 'info' | 'warn';
  scope: string;
  /** How many checked things are missing or wrong. */
  affected: number;
  /** How many things were checked. Always `> 0` — a check that did not apply is simply absent. */
  total: number;
  weight: number;
  earned: number;
  sample: string[];
  /** Where the affected records are, or `null` for a finding about the space itself. */
  targetTab: 'memories' | 'entities' | 'edges' | 'chrono' | 'files' | null;
}

export interface CompletenessReport {
  spaceId: string;
  /** `null` when no check applied — a brand-new space is not "0 % complete". */
  score: number | null;
  /** Only checks that applied. A question this space cannot be asked is not one it failed. */
  checks: CompletenessCheck[];
  truncated: boolean;
}

export type QueryCollection = 'memories' | 'entities' | 'edges' | 'chrono' | 'files';

export interface QueryResult {
  results: Record<string, unknown>[];
  collection: QueryCollection;
  count: number;
}

export type WipeCollectionType = 'memories' | 'entities' | 'edges' | 'chrono' | 'files';

export type RecallKnowledgeType = 'memory' | 'entity' | 'edge' | 'chrono' | 'file';

export interface RecallResult {
  type: RecallKnowledgeType;
  score?: number;
  [key: string]: unknown;
}

export interface RecallResponse {
  results: RecallResult[];
  count: number;
}

export interface TraverseNode {
  _id: string;
  name: string;
  type: string;
  depth: number;
  description?: string;
  tags?: string[];
}

export interface TraverseEdge {
  _id: string;
  from: string;
  to: string;
  label: string;
}

export interface TraverseResult {
  nodes: TraverseNode[];
  edges: TraverseEdge[];
  truncated: boolean;
}

export interface WipeResult {
  memories: number;
  entities: number;
  edges: number;
  chrono: number;
  files: number;
}

export interface FileEntry {
  name: string;
  /** Files: byte size. Directories: recursive sum of the files beneath them. */
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modified: string;
  // ── Joined from the file's metadata record (files only) — for the merged Files list ──
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'partial' | 'failed' | 'skipped' | 'disabled';
  tags?: string[];
  /** Live stage of this file's media job — present only while it is in flight and has reported a step. */
  progress?: { step: string; steps: string[]; done?: number; total?: number };
  /** ISO8601 of the job's last report, so a wedged job does not look like a working one. */
  progressAt?: string | null;
}

/**
 * What retrieval actually sees for one converted file (the Extract tab).
 *
 * Not new data: every field is a record conversion already wrote. It exists as one shape because the three
 * parts are only meaningful together, and because deciding that "a chunk is a record with a chunkIndex" is
 * server knowledge, not something a UI should carry.
 */
export interface FileExtract {
  path: string;
  embeddingStatus?: string | null;
  conversionError?: string | null;
  description?: string | null;
  descriptionSource?: 'generated' | 'extracted' | null;
  excerpt?: string | null;
  /** The `_converted/<id>.md` sidecar. Absent for formats that need no conversion (.md/.txt). */
  converted?: { path: string; markdown: string; truncated: boolean; sizeBytes: number } | null;
  chunks: Array<{
    id: string;
    index: number | null;
    headingText: string | null;
    content: string;
    /** Audio/video chunks carry their position in the recording; documents carry heading provenance. */
    chunkOffsetMs: number | null;
    chunkDurationMs: number | null;
    embeddingStatus?: string | null;
  }>;
  /** Total across all pages — `chunks` is one page of `limit`/`skip`. */
  chunkTotal: number;
  limit: number;
  skip: number;
  images: Array<{
    path: string;
    description: string | null;
    descriptionSource: 'generated' | 'extracted' | null;
    sizeBytes: number;
    embeddingStatus?: string | null;
  }>;
}

export interface FileMeta {
  _id: string;
  spaceId: string;
  path: string;
  description?: string;
  /** Where an instance-written `description` came from. Absent when a person wrote it. */
  descriptionSource?: 'generated' | 'extracted';
  /** A converted document's own opening prose — kept whatever the description says, and embedded. */
  excerpt?: string;
  tags: string[];
  entityIds?: string[];
  chronoIds?: string[];
  memoryIds?: string[];
  properties?: Record<string, string | number | boolean>;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  /** Async embedding lifecycle status (text documents and media files).
   *  "pending" → queued; "processing" → being embedded; "complete" → done;
   *  "partial" → stored but some chunks failed to embed (retry-eligible);
   *  "failed" → all retries exhausted; "skipped" / "disabled" → media-only states. */
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'partial' | 'failed' | 'skipped' | 'disabled';
  /** The running stage and this document's full route, joined from its media job while it is in
   *  flight (absent once the job finishes, and while a claimed job has not reported a step yet). */
  progress?: { step: string; steps: string[]; done?: number; total?: number };
  /** ISO8601 of the job's last report — lets the UI tell "working" from "wedged". */
  progressAt?: string | null;
  /** Error message when embeddingStatus is "failed". */
  mediaJobError?: string;
  chunkCount?: number;
  /** For a converted binary document: the id of its `_converted/<id>.md` record. Its presence is one of
   *  the three signals that this file has an extract worth showing. */
  convertedFileId?: string;
  /** Detected media class for the original file — set on image/audio/video uploads. */
  mediaType?: 'image' | 'audio' | 'video';
  /** Set when the file was deleted but its metadata was retained (softDeleteFileMeta):
   *  ISO8601 deletion timestamp. Such records show a "deleted" badge and can be purged. */
  deletedAt?: string;
}

export interface UploadProgress {
  percent: number;
  done: boolean;
}

export interface Network {
  id: string;
  label: string;
  type: 'closed' | 'democratic' | 'club' | 'braintree' | 'pubsub';
  spaces: string[];
  spaceMap?: Record<string, string>;
  members: NetworkMember[];
  votingDeadlineHours?: number;
  syncSchedule?: string;
  merkle?: boolean;
}

export interface NetworkMember {
  instanceId: string;
  label: string;
  endpoint: string;
  syncDirection?: 'both' | 'push' | 'pull';
  /** ISO8601 of the last SUCCESSFUL sync with this member (absent = never synced yet). */
  lastSyncAt?: string;
  /** Consecutive failed sync attempts since the last success (0/absent = healthy). */
  consecutiveFailures?: number;
}

export interface InviteBundle {
  handshakeId: string;
  inviteUrl: string;
  rsaPublicKeyPem: string;
  networkId: string;
  expiresAt: string;
  spaces?: string[];
}

export interface VoteRound {
  id: string;
  networkId: string;
  type: string;
  subject: string;
  openedAt: string;
  deadline: string;
  status: 'open' | 'passed' | 'failed';
  votes: { instanceId: string; vote: 'yes' | 'veto'; }[];
}

export interface ConflictRecord {
  id: string;
  spaceId: string;
  originalPath: string;
  conflictPath: string;
  detectedAt: string;
  peerInstanceId: string;
  peerInstanceLabel: string;
}

export interface DupeActionRule {
  minScore: number;
  action: 'flag' | 'automerge' | 'notify';
  types?: string[];
  webhookUrl?: string;
}

/**
 * One contradiction candidate. Mirrors DuplicateRecord, except that where a duplicate has a similarity
 * `score`, a contradiction has a `basis` — and the two bases are not equally strong, so the UI must not
 * flatten them into one number.
 */
export interface ContradictionRecord {
  id: string;
  spaceId: string;
  type: string;
  aId: string;
  aSummary: string;
  bId: string;
  bSummary: string;
  /** `structured-field` = deterministic (the records set one single-valued property to two values, listed
   *  in `fields`). `nli` = an entailment model's verdict, and `confidence` is its score. */
  basis: 'structured-field' | 'nli';
  confidence: number;
  /** The disagreeing properties — present only for a `structured-field` basis. */
  fields?: { key: string; aValue: string | number | boolean; bValue: string | number | boolean }[];
  /**
   * The judged text was long enough that the model's window probably cut it, so this verdict may describe
   * the OPENING of a record rather than the record. A proxy, not a measurement — absent means "not long
   * enough to worry about", never "the whole text was read".
   */
  truncated?: true;
  status: 'open' | 'dismissed' | 'resolved';
  /**
   * `edited` = a record was corrected; `linked` = a contradicts/supersedes edge was drawn by hand;
   * `superseded` = the reviewer picked a winner and the system acted on it (see `supersededId`).
   */
  resolution?: 'edited' | 'linked' | 'superseded';
  /** The record the reviewer judged out of date. Present only for `superseded`. Nothing was deleted. */
  supersededId?: string;
  /** Who settled it, as the token's name. A judgement call needs an attributable decider. */
  resolvedBy?: string;
  detectedAt: string;
  updatedAt: string;
}

export interface DuplicateRecord {
  id: string;
  spaceId: string;
  type: string;
  aId: string;
  aSummary: string;
  bId: string;
  bSummary: string;
  score: number;
  status: 'open' | 'dismissed' | 'resolved';
  resolution?: 'merged' | 'notified';
  detectedAt: string;
  updatedAt: string;
}

export interface SyncHistoryRecord {
  _id: string;
  networkId: string;
  triggeredAt: string;
  completedAt: string;
  status: 'success' | 'partial' | 'failed';
  pulled: { memories: number; entities: number; edges: number; files: number };
  pushed: { memories: number; entities: number; edges: number; files: number };
  errors?: string[];
}

/** One optional component's liveness, from GET /api/about/health. */
export interface ComponentHealth {
  id: string;
  label: string;
  /** Whether this instance is set up to use it at all. */
  configured: boolean;
  /** Reachability. null = not configured, or no probe available — absence of a check, not a failure. */
  reachable: boolean | null;
  /** What breaks while it is down. */
  impact: string;
}

/** Instance component liveness. REPORTING only — never gates readiness. */
export interface HealthSummary {
  level: 'ok' | 'degraded' | 'unknown';
  components: ComponentHealth[];
  down: string[];
}

export interface AboutInfo {
  instanceId: string;
  instanceLabel: string;
  version: string;
  uptime: string;
  mongoVersion: string;
  diskInfo: { total: number; used: number; available: number; dataUsed: number };
  publicUrl?: string;
}

export interface LocalAgentStatus {
  configured: boolean;
  reachable: boolean;
  canExecute: boolean;
  message?: string;
}

export interface LocalAgentEnableNetworksResult {
  ok: boolean;
  publicUrl?: string;
  message?: string;
  steps?: string[];
}

export interface LocalAgentBootstrapResult {
  ok: boolean;
  message?: string;
}

// ── Audit log types ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
  _id: string;
  timestamp: string;
  tokenId: string | null;
  tokenLabel: string | null;
  authMethod: 'pat' | 'oidc' | null;
  oidcSubject: string | null;
  ip: string;
  method: string;
  path: string;
  spaceId: string | null;
  operation: string;
  status: number;
  entryId: string | null;
  durationMs: number;
  /**
   * Field values this request changed, for operations that record them.
   *
   * **Absent means "not recorded", never "nothing changed"** — only explicitly allowlisted operations and
   * fields are captured, so that an audited route can never leak a credential into the log. Present but
   * empty does not occur: the server omits the field rather than writing `[]`.
   */
  changes?: { field: string; from?: string | number | boolean | null; to?: string | number | boolean | null }[];
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
  retentionDays?: number;
}

export interface AuditLogParams {
  after?: string;
  before?: string;
  tokenId?: string;
  oidcSubject?: string;
  spaceId?: string;
  operation?: string;
  status?: number;
  ip?: string;
  limit?: number;
  offset?: number;
}

// ── Backup config ─────────────────────────────────────────────────────────────

export interface BackupConfigData {
  schedule?: string;
  /**
   * Encrypt every record line in a backup with the instance's master secret.
   *
   * **Absent means plaintext** — that is the default, and it is why this is optional rather than a boolean the
   * UI always writes: turning the toggle off removes the key instead of writing `false`, so an untouched
   * `backup.json` stays byte-identical and "absent === plaintext" is the single source of truth on both sides.
   *
   * There is no matching option on restore: an encrypted backup is detected per line, so an operator never has
   * to remember how one was written.
   */
  encrypt?: boolean;
  retention?: { keepLocal?: number };
  offsite?: { destPath: string; retention?: { keepCount?: number } };
}

// ── Webhooks (C1) ─────────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'memory.created' | 'memory.updated' | 'memory.deleted'
  | 'entity.created' | 'entity.updated' | 'entity.deleted' | 'entity.merged'
  | 'edge.created' | 'edge.updated' | 'edge.deleted'
  | 'chrono.created' | 'chrono.updated' | 'chrono.deleted'
  | 'file.created' | 'file.updated' | 'file.deleted'
  | 'bulk.write'
  | 'link_violation.created'
  | 'duplicate.detected';

/**
 * Selectable webhook events, grouped by domain for the picker. `test.ping` is deliberately excluded —
 * it is the test-button's internal event, not a real domain event a user would subscribe to.
 */
export const WEBHOOK_EVENT_GROUPS: { group: string; events: WebhookEventType[] }[] = [
  { group: 'memory', events: ['memory.created', 'memory.updated', 'memory.deleted'] },
  { group: 'entity', events: ['entity.created', 'entity.updated', 'entity.deleted', 'entity.merged'] },
  { group: 'edge', events: ['edge.created', 'edge.updated', 'edge.deleted'] },
  { group: 'chrono', events: ['chrono.created', 'chrono.updated', 'chrono.deleted'] },
  { group: 'file', events: ['file.created', 'file.updated', 'file.deleted'] },
  { group: 'other', events: ['bulk.write', 'link_violation.created', 'duplicate.detected'] },
];

/** A webhook subscription as returned by the API — the shared HMAC secret is never included. */
export interface WebhookSubscription {
  id: string;
  url: string;
  /** Space ID filter; empty = all spaces. */
  spaces: string[];
  /** Event type filter; empty = all events. */
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'failing' | 'disabled';
  consecutiveFailures: number;
}

/** Create/update payload. `secret` is write-only; omit on update to keep the existing one. */
export interface WebhookUpsert {
  url?: string;
  secret?: string;
  spaces?: string[];
  events?: WebhookEventType[];
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  spaceId: string;
  timestamp: string;
  responseStatus: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * A space's entity-relationship model, inferred from the schema AND from what is stored.
 *
 * The server derives both halves because they disagree, and the disagreement is the point: a type can be
 * declared and used, declared and empty, or hold records with no declaration at all. The third case is the
 * one a schema-only view would silently omit, and it is the one nobody knows about.
 */
export interface ErProperty {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  enumValues?: (string | number | boolean)[];
}

export interface ErEntityType {
  type: string;
  /** Records actually stored. `0` on a declared type is a real answer, not a gap. */
  count: number;
  /** Whether the space's schema declares it. `false` means records outside the agreed vocabulary. */
  declared: boolean;
  namingPattern?: string;
  properties: ErProperty[];
  /** Records of the other kinds pointing AT this type through their `entityIds`. */
  linkedFrom: { memories: number; chrono: number; files: number };
}

export interface ErRelationship {
  from: string;
  to: string;
  label: string;
  count: number;
}

export interface ErModel {
  spaceId: string;
  entityTypes: ErEntityType[];
  relationships: ErRelationship[];
  /** Edges whose endpoint does not resolve. Normally 0; non-zero with strictLinkage on is worth a look. */
  danglingEdges: number;
  /** Non-null when a read hit its cap — the model is partial and says so rather than looking complete. */
  truncated: null | { scan: 'entities' | 'edges' | 'links'; limit: number };
  /** Measured BEFORE any cap, so a caller can see what share of the space the model covers. */
  totals: { entities: number; edges: number };
}

/** A proxy space reports its members separately — merging would invent relationships that cannot exist. */
export interface ErModelMembers {
  spaceId: string;
  members: ErModel[];
}
