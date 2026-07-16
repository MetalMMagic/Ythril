import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Space, SpaceMeta, SpacesResponse, SpaceMetaResponse, KnowledgeType, TypeSchema,
  DupeActionRule, SpaceStats, WipeCollectionType, WipeResult,
} from './api.types';

/** Spaces, their per-type schemas, stats, reindex, and destructive wipe. */
@Injectable({ providedIn: 'root' })
export class SpacesApi {
  private http = inject(HttpClient);

  listSpaces(): Observable<SpacesResponse> {
    return this.http.get<SpacesResponse>('/api/spaces');
  }

  createSpace(body: { label: string; id?: string; maxGiB?: number; description?: string; proxyFor?: string[]; meta?: Partial<SpaceMeta> }): Observable<{ space: Space }> {
    return this.http.post<{ space: Space }>('/api/spaces', body);
  }

  updateSpace(id: string, body: { label?: string; description?: string; maxGiB?: number | null; meta?: Partial<SpaceMeta>; dupeRules?: DupeActionRule[]; dupeMergeSurvivor?: 'older' | 'newer'; dupeRulesOnInsert?: boolean }): Observable<{ space: Space }> {
    return this.http.patch<{ space: Space }>(`/api/spaces/${id}`, body);
  }

  reorderSpaces(ids: string[]): Observable<{ spaces: Space[] }> {
    return this.http.post<{ spaces: Space[] }>('/api/spaces/reorder', { ids });
  }

  getSpaceMeta(id: string): Observable<SpaceMetaResponse> {
    return this.http.get<SpaceMetaResponse>(`/api/spaces/${id}/meta`);
  }

  /** GET a single type definition from the space's typeSchemas. */
  getTypeSchema(spaceId: string, knowledgeType: KnowledgeType, typeName: string): Observable<{ knowledgeType: KnowledgeType; typeName: string; schema: TypeSchema }> {
    return this.http.get<{ knowledgeType: KnowledgeType; typeName: string; schema: TypeSchema }>(
      `/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`,
    );
  }

  /** PUT (upsert) a single type definition into the space's typeSchemas. */
  upsertTypeSchema(spaceId: string, knowledgeType: KnowledgeType, typeName: string, schema: TypeSchema): Observable<{ knowledgeType: KnowledgeType; typeName: string; schema: TypeSchema }> {
    return this.http.put<{ knowledgeType: KnowledgeType; typeName: string; schema: TypeSchema }>(
      `/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`,
      schema,
    );
  }

  /** DELETE a single type definition from the space's typeSchemas. */
  deleteTypeSchema(spaceId: string, knowledgeType: KnowledgeType, typeName: string): Observable<void> {
    return this.http.delete<void>(`/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`);
  }

  deleteSpace(id: string): Observable<void> {
    return this.http.delete<void>(`/api/spaces/${id}`, { body: { confirm: true } });
  }

  renameSpace(oldId: string, newId: string): Observable<{ space: Space }> {
    return this.http.patch<{ space: Space }>(`/api/spaces/${oldId}/rename`, { newId });
  }

  wipeSpace(spaceId: string, types?: WipeCollectionType[]): Observable<{ deleted: WipeResult }> {
    const body: { types?: WipeCollectionType[] } = types && types.length > 0 ? { types } : {};
    return this.http.post<{ deleted: WipeResult }>(`/api/admin/spaces/${spaceId}/wipe`, body);
  }

  getSpaceStats(spaceId: string): Observable<SpaceStats> {
    return this.http.get<SpaceStats>(`/api/brain/spaces/${spaceId}/stats`);
  }

  getReindexStatus(spaceId: string): Observable<{ spaceId: string; needsReindex: boolean }> {
    return this.http.get<{ spaceId: string; needsReindex: boolean }>(`/api/brain/spaces/${spaceId}/reindex-status`);
  }

  reindex(spaceId: string): Observable<Record<string, number>> {
    return this.http.post<Record<string, number>>(`/api/brain/spaces/${spaceId}/reindex`, {});
  }
}
