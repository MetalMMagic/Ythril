import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Memory, Entity, Edge, ChronoEntry, ChronoType, ChronoStatus,
  QueryCollection, QueryResult, RecallKnowledgeType, RecallResponse, TraverseResult, EmbeddingQueue,
  TokenAccessEntry,
} from './api.types';

/**
 * A server-side sort request for a brain list endpoint. `field` must be one the server whitelists
 * for that collection (see the integration guide); an un-whitelisted field is a 400, so callers pass
 * only the columns the tab exposes a caret for.
 */
export interface ListSort {
  field: string;
  dir: 'asc' | 'desc';
}

/** Brain knowledge graph — memories, entities, edges, chrono, plus query/recall/traverse. */
@Injectable({ providedIn: 'root' })
export class BrainApi {
  private http = inject(HttpClient);

  /** Append `sort`/`dir` to a list request when a sort is active; a no-op otherwise. */
  private withSort(params: HttpParams, sort?: ListSort): HttpParams {
    return sort ? params.set('sort', sort.field).set('dir', sort.dir) : params;
  }

  /** Mint a single-use ticket to open the live-change SSE stream. EventSource can't send an
   *  Authorization header and a raw token in the URL leaks into logs/history, so the stream is opened
   *  with `?ticket=` instead. The ticket is single-use, short-lived, and bound to this space's stream. */
  mintEventsTicket(spaceId: string): Observable<{ ticket: string; expiresInMs: number }> {
    return this.http.post<{ ticket: string; expiresInMs: number }>(`/api/brain/spaces/${spaceId}/events/ticket`, {});
  }

  queryBrain(
    spaceId: string,
    body: {
      collection: QueryCollection;
      filter?: Record<string, unknown>;
      projection?: Record<string, unknown>;
      limit?: number;
      maxTimeMS?: number;
    },
  ): Observable<QueryResult> {
    return this.http.post<QueryResult>(`/api/brain/spaces/${spaceId}/query`, body);
  }

  /** Embedding-job backlog for a space (F9 Overview embedding-queue panel). */
  getEmbeddingQueue(spaceId: string): Observable<EmbeddingQueue> {
    return this.http.get<EmbeddingQueue>(`/api/brain/spaces/${spaceId}/embedding-queue`);
  }

  /** Re-queue every failed media job in a space (F9 Overview "retry all failed"). Returns the count reset. */
  retryFailedEmbeddings(spaceId: string): Observable<{ retried: number }> {
    return this.http.post<{ retried: number }>(`/api/brain/spaces/${spaceId}/embedding-queue/retry-failed`, {});
  }

  /** Which tokens can reach a space and at what level (F9 Overview matrix). ADMIN-only — 403 for others. */
  getTokenAccess(spaceId: string): Observable<{ tokens: TokenAccessEntry[] }> {
    return this.http.get<{ tokens: TokenAccessEntry[] }>(`/api/brain/spaces/${spaceId}/token-access`);
  }

  recallBrain(
    spaceId: string,
    body: {
      query: string;
      topK?: number;
      types?: RecallKnowledgeType[];
      minScore?: number;
      /** Structured filter (same expression grammar as the query filter). */
      filter?: Record<string, unknown>;
      /** Restrict to records carrying these tags. */
      tags?: string[];
      /** Guarantee at least N hits per knowledge type, e.g. { entity: 2 }. */
      minPerType?: Partial<Record<RecallKnowledgeType, number>>;
    },
  ): Observable<RecallResponse> {
    return this.http.post<RecallResponse>(`/api/brain/spaces/${spaceId}/recall`, body);
  }

  // ── Brain — memories ──────────────────────────────────────────────────────

  listMemories(spaceId: string, limit = 20, skip = 0, filters?: { tag?: string; entity?: string; type?: string; description?: string; properties?: string; entityName?: string }, sort?: ListSort, search?: string): Observable<{ memories: Memory[]; limit: number; skip: number }> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    if (filters?.tag) params = params.set('tag', filters.tag);
    if (filters?.entity) params = params.set('entity', filters.entity);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.description) params = params.set('description', filters.description);
    if (filters?.entityName) params = params.set('entityName', filters.entityName);
    if (filters?.properties) params = params.set('properties', filters.properties);
    if (search) params = params.set('search', search);
    params = this.withSort(params, sort);
    return this.http.get<any>(`/api/brain/spaces/${spaceId}/memories`, { params });
  }

  deleteMemory(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/brain/spaces/${spaceId}/memories/${id}`);
  }

  createMemory(spaceId: string, body: { fact: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean> }): Observable<Memory> {
    return this.http.post<Memory>(`/api/brain/spaces/${spaceId}/memories`, body);
  }

  updateMemory(spaceId: string, id: string, body: Partial<{ fact: string; tags: string[]; entityIds: string[]; description: string; properties: Record<string, string | number | boolean>; deleteFields: string[] }>): Observable<Memory> {
    return this.http.patch<Memory>(`/api/brain/spaces/${spaceId}/memories/${id}`, body);
  }

  wipeMemories(spaceId: string): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`/api/brain/spaces/${spaceId}/memories`, {
      body: { confirm: true },
    });
  }

  // ── Brain — entities ──────────────────────────────────────────────────────

  listEntities(spaceId: string, limit = 50, skip = 0, filters?: { search?: string; type?: string; tag?: string; description?: string; properties?: string }, sort?: ListSort, search?: string): Observable<{ entities: Entity[] }> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    // `filters.search` is the entity-search bar's exact `name` lookup; `search` is the docked column
    // freetext filter → the server's substring `?search=` (2b-iii). They are distinct params.
    if (filters?.search) params = params.set('name', filters.search);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.tag) params = params.set('tag', filters.tag);
    if (filters?.description) params = params.set('description', filters.description);
    if (filters?.properties) params = params.set('properties', filters.properties);
    if (search) params = params.set('search', search);
    params = this.withSort(params, sort);
    return this.http.get<any>(`/api/brain/spaces/${spaceId}/entities`, { params });
  }

  deleteEntity(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/brain/spaces/${spaceId}/entities/${id}`);
  }

  createEntity(spaceId: string, body: { name: string; type?: string; tags?: string[]; description?: string; properties?: Record<string, string | number | boolean> }): Observable<Entity> {
    return this.http.post<Entity>(`/api/brain/spaces/${spaceId}/entities`, body);
  }

  updateEntity(spaceId: string, id: string, body: Partial<{ name: string; type: string; description: string; tags: string[]; properties: Record<string, string | number | boolean>; deleteFields: string[] }>): Observable<Entity> {
    return this.http.patch<Entity>(`/api/brain/spaces/${spaceId}/entities/${id}`, body);
  }

  // ── Brain — edges ─────────────────────────────────────────────────────────

  listEdges(spaceId: string, limit = 50, skip = 0, filters?: { type?: string; tag?: string; description?: string; properties?: string; fromName?: string; toName?: string }, sort?: ListSort, search?: string): Observable<{ edges: Edge[] }> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.tag) params = params.set('tag', filters.tag);
    if (filters?.description) params = params.set('description', filters.description);
    if (filters?.fromName) params = params.set('fromName', filters.fromName);
    if (filters?.toName) params = params.set('toName', filters.toName);
    if (filters?.properties) params = params.set('properties', filters.properties);
    if (search) params = params.set('search', search);
    params = this.withSort(params, sort);
    return this.http.get<any>(`/api/brain/spaces/${spaceId}/edges`, { params });
  }

  deleteEdge(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/brain/spaces/${spaceId}/edges/${id}`);
  }

  createEdge(spaceId: string, body: { from: string; to: string; label: string; weight?: number; type?: string; tags?: string[]; description?: string; properties?: Record<string, string | number | boolean> }): Observable<Edge> {
    return this.http.post<Edge>(`/api/brain/spaces/${spaceId}/edges`, body);
  }

  updateEdge(spaceId: string, id: string, body: Partial<{ label: string; description: string; tags: string[]; properties: Record<string, string | number | boolean>; weight: number; type: string; deleteFields: string[] }>): Observable<Edge> {
    return this.http.patch<Edge>(`/api/brain/spaces/${spaceId}/edges/${id}`, body);
  }

  // ── Brain — lookups & graph traverse ──────────────────────────────────────

  searchEntitiesByName(spaceId: string, name: string): Observable<{ entities: Entity[] }> {
    const params = new HttpParams().set('name', name);
    return this.http.get<{ entities: Entity[] }>(`/api/brain/spaces/${spaceId}/entities/by-name`, { params });
  }

  getEntitiesByIds(spaceId: string, ids: string[]): Observable<{ entities: Entity[] }> {
    if (!ids.length) return new Observable(o => { o.next({ entities: [] }); o.complete(); });
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<{ entities: Entity[] }>(`/api/brain/spaces/${spaceId}/entities/by-ids`, { params });
  }

  getEntity(spaceId: string, id: string): Observable<Entity> {
    return this.http.get<Entity>(`/api/brain/spaces/${spaceId}/entities/${id}`);
  }

  getEdge(spaceId: string, id: string): Observable<Edge> {
    return this.http.get<Edge>(`/api/brain/spaces/${spaceId}/edges/${id}`);
  }

  getMemory(spaceId: string, id: string): Observable<Memory> {
    return this.http.get<Memory>(`/api/brain/spaces/${spaceId}/memories/${id}`);
  }

  getChrono(spaceId: string, id: string): Observable<ChronoEntry> {
    return this.http.get<ChronoEntry>(`/api/brain/spaces/${spaceId}/chrono/${id}`);
  }

  traverseGraph(spaceId: string, body: { startId: string; direction?: 'outbound' | 'inbound' | 'both'; maxDepth?: number; limit?: number }): Observable<TraverseResult> {
    return this.http.post<TraverseResult>(`/api/brain/spaces/${spaceId}/traverse`, body);
  }

  // ── Brain — chrono ──────────────────────────────────────────────────────

  listChrono(spaceId: string, limit = 50, skip = 0, filters?: { tags?: string; tagsAny?: string; tag?: string; type?: string; status?: string; after?: string; before?: string; search?: string; description?: string; entityName?: string }, sort?: ListSort): Observable<{ chrono: ChronoEntry[] }> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    if (filters?.tags) params = params.set('tags', filters.tags);
    if (filters?.tagsAny) params = params.set('tagsAny', filters.tagsAny);
    if (filters?.tag) params = params.set('tag', filters.tag);
    if (filters?.description) params = params.set('description', filters.description);
    if (filters?.entityName) params = params.set('entityName', filters.entityName);
    // The chrono record "kind" (event/deadline/…) is filtered via the `type` query
    // param server-side; the old `kind` param was silently ignored.
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.after) params = params.set('after', filters.after);
    if (filters?.before) params = params.set('before', filters.before);
    if (filters?.search) params = params.set('search', filters.search);
    params = this.withSort(params, sort);
    return this.http.get<any>(`/api/brain/spaces/${spaceId}/chrono`, { params });
  }

  createChrono(spaceId: string, body: { title: string; type: ChronoType; startsAt: string; endsAt?: string; status?: ChronoStatus; confidence?: number; tags?: string[]; entityIds?: string[]; memoryIds?: string[]; description?: string; properties?: Record<string, string | number | boolean> }): Observable<ChronoEntry> {
    return this.http.post<ChronoEntry>(`/api/brain/spaces/${spaceId}/chrono`, body);
  }

  updateChrono(spaceId: string, id: string, body: Partial<{ title: string; type: ChronoType; startsAt: string; endsAt: string; status: ChronoStatus; confidence: number; tags: string[]; entityIds: string[]; memoryIds: string[]; description: string; properties: Record<string, string | number | boolean> }>): Observable<ChronoEntry> {
    return this.http.post<ChronoEntry>(`/api/brain/spaces/${spaceId}/chrono/${id}`, body);
  }

  deleteChrono(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/brain/spaces/${spaceId}/chrono/${id}`);
  }
}
