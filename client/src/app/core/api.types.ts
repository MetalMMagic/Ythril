/**
 * Shared API DTOs and domain types for the Ythril client.
 *
 * Extracted from the former monolithic api.service.ts (A17.2). The HttpClient wrappers now live in
 * per-domain services (auth/spaces/schema/brain/files/duplicates/networks/admin *-api.service.ts);
 * this file is types only, so any component or service can import a DTO without pulling in a service.
 */

// ── Shared types ─────────────────────────────────────────────────────────────

export interface Space {
  id: string;
  label: string;
  builtIn?: boolean;
  folders?: string[];
  maxGiB?: number;
  usageGiB?: number;
  description?: string;
  proxyFor?: string[];
  meta?: SpaceMeta;
  dupeRules?: DupeActionRule[];
  dupeMergeSurvivor?: 'older' | 'newer';
  dupeRulesOnInsert?: boolean;
  /** Auto-TTL (F10): records auto-expire after this many days. Absent/0 = no expiry. */
  recordTtlDays?: number;
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

export interface StorageLimits {
  totalLimitGiB?: number;
  warnAtPercent?: number;
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

export interface FileMeta {
  _id: string;
  spaceId: string;
  path: string;
  description?: string;
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
  status: 'open' | 'dismissed' | 'resolved';
  /** `edited` = a record was corrected; `linked` = a contradicts/supersedes edge was drawn instead. */
  resolution?: 'edited' | 'linked';
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
