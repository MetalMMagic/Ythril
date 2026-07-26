import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import type { FileEntry, FileMeta, UploadProgress, ConflictRecord } from './api.types';
import type { ListSort } from './brain-api.service';

/** File store (listing, upload, download), brain file-metadata, and sync file conflicts. */
@Injectable({ providedIn: 'root' })
export class FilesApi {
  private http = inject(HttpClient);

  // ── Files ─────────────────────────────────────────────────────────────────

  listFiles(spaceId: string, path = '/'): Observable<{ entries: FileEntry[] }> {
    const params = new HttpParams().set('path', path);
    return this.http.get<any>(`/api/files/${spaceId}`, { params }).pipe(
      map(res => ({
        entries: (res.entries ?? []).map((e: any) => ({
          name: e.name,
          size: e.size ?? 0,
          isFile: e.type === 'file',
          isDirectory: e.type === 'dir',
          modified: e.modifiedAt ?? '',
          embeddingStatus: e.embeddingStatus,
          tags: e.tags,
        } as FileEntry)),
      })),
    );
  }

  deleteFile(spaceId: string, path: string): Observable<void> {
    const params = new HttpParams().set('path', path);
    return this.http.delete<void>(`/api/files/${spaceId}`, { params, body: { confirm: true } });
  }

  createDir(spaceId: string, path: string): Observable<void> {
    const params = new HttpParams().set('path', path);
    return this.http.post<void>(`/api/files/${spaceId}/mkdir`, null, { params });
  }

  moveFile(spaceId: string, from: string, to: string): Observable<void> {
    const params = new HttpParams().set('path', from);
    return this.http.patch<void>(`/api/files/${spaceId}`, { destination: to }, { params });
  }

  /**
   * Upload a file with automatic chunking for files > 10 MB.
   * Emits progress events ({ percent, done }) for UI updates.
   * Retries each chunk up to 3 times on transient failure.
   *
   * The returned observable is **cold**: no work runs and no progress event is
   * emitted until the caller subscribes, so a late subscriber can never miss the
   * initial `{ percent: 0 }` (with the old hot Subject the upload started before
   * `return`, and any event emitted synchronously was lost). Unsubscribing tears
   * the upload down — it flips a `cancelled` flag that halts the chunk loop and
   * unsubscribes the in-flight request (HttpClient aborts the underlying XHR on
   * teardown). That is exactly how the UI cancels an upload mid-flight.
   */
  uploadFileChunked(spaceId: string, dirPath: string, file: File): Observable<UploadProgress> {
    const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10 MB
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
    const MAX_RETRIES = 3;
    const filePath = dirPath.endsWith('/') ? `${dirPath}${file.name}` : `${dirPath}/${file.name}`;

    return new Observable<UploadProgress>(subscriber => {
      let cancelled = false;
      let httpSub: Subscription | null = null;
      // A rejected arrayBuffer() (e.g. the file moved/was revoked) must surface,
      // but never after the caller unsubscribed.
      const fail = (err: unknown): void => { if (!cancelled) subscriber.error(err); };

      if (file.size <= CHUNK_THRESHOLD) {
        // Small file: single upload.
        subscriber.next({ percent: 0, done: false });
        file.arrayBuffer().then(ab => {
          if (cancelled) return;
          const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });
          const params = new HttpParams().set('path', filePath);
          httpSub = this.http.post<void>(`/api/files/${spaceId}`, ab, { headers, params }).subscribe({
            next: () => {
              subscriber.next({ percent: 100, done: true });
              subscriber.complete();
            },
            error: fail,
          });
        }).catch(fail);
      } else {
        // Chunked upload.
        const total = file.size;
        let offset = 0;

        const sendNextChunk = (): void => {
          if (cancelled || offset >= total) return;
          const end = Math.min(offset + CHUNK_SIZE, total);
          const slice = file.slice(offset, end);
          const start = offset;
          const byteEnd = end - 1;

          slice.arrayBuffer().then(ab => {
            if (cancelled) return;
            const sendChunk = (retriesLeft: number): void => {
              if (cancelled) return;
              const headers = new HttpHeaders({
                'Content-Type': 'application/octet-stream',
                'Content-Range': `bytes ${start}-${byteEnd}/${total}`,
              });
              const params = new HttpParams().set('path', filePath);
              httpSub = this.http.post<any>(`/api/files/${spaceId}`, ab, { headers, params }).subscribe({
                next: () => {
                  offset = end;
                  const percent = Math.round((offset / total) * 100);
                  if (offset >= total) {
                    subscriber.next({ percent: 100, done: true });
                    subscriber.complete();
                  } else {
                    subscriber.next({ percent, done: false });
                    sendNextChunk();
                  }
                },
                error: err => {
                  if (cancelled) return;
                  if (retriesLeft > 0) {
                    sendChunk(retriesLeft - 1);
                  } else {
                    subscriber.error(err);
                  }
                },
              });
            };
            sendChunk(MAX_RETRIES);
          }).catch(fail);
        };

        subscriber.next({ percent: 0, done: false });
        sendNextChunk();
      }

      // Teardown — cancel: stop the loop and abort any in-flight chunk request.
      return () => {
        cancelled = true;
        httpSub?.unsubscribe();
      };
    });
  }

  getFileDownloadUrl(spaceId: string, path: string): string {
    return `/api/files/${spaceId}?path=${encodeURIComponent(path)}`;
  }

  // ── File metadata (brain) ─────────────────────────────────────────────────

  listFileMeta(spaceId: string, limit = 50, skip = 0, filters?: { search?: string; tag?: string }, sort?: ListSort): Observable<{ files: FileMeta[]; limit: number; skip: number }> {
    let params = new HttpParams().set('limit', limit).set('skip', skip);
    // `search` → the server's freetext `?search=` (substring over path + description, slice 4b).
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.tag) params = params.set('tag', filters.tag);
    if (sort) params = params.set('sort', sort.field).set('dir', sort.dir);
    return this.http.get<{ files: FileMeta[]; limit: number; skip: number }>(`/api/brain/spaces/${spaceId}/files`, { params });
  }

  /** Fetch the single file-metadata record for an exact path (reuses the list route's `?path=` filter — no dedicated route). */
  getFileMeta(spaceId: string, path: string): Observable<FileMeta | null> {
    const params = new HttpParams().set('path', path).set('limit', 1);
    return this.http.get<{ files: FileMeta[] }>(`/api/brain/spaces/${spaceId}/files`, { params }).pipe(
      map(r => r.files[0] ?? null),
    );
  }

  updateFileMeta(spaceId: string, path: string, body: Partial<{ description: string; tags: string[]; entityIds: string[]; chronoIds: string[]; memoryIds: string[]; properties: Record<string, string | number | boolean> }>): Observable<FileMeta> {
    const params = new HttpParams().set('path', path);
    return this.http.patch<FileMeta>(`/api/brain/spaces/${spaceId}/files`, body, { params });
  }

  /** Re-queue embedding for a file whose embedding failed or is only partial. */
  retryEmbedding(spaceId: string, path: string): Observable<{ queued: boolean }> {
    const params = new HttpParams().set('path', path);
    return this.http.post<{ queued: boolean }>(`/api/files/${spaceId}/retry_embedding`, {}, { params });
  }

  deleteFileMeta(spaceId: string, path: string): Observable<void> {
    const params = new HttpParams().set('path', path);
    return this.http.delete<void>(`/api/brain/spaces/${spaceId}/files`, { params });
  }

  // ── File conflicts ────────────────────────────────────────────────────────

  listConflicts(): Observable<{ conflicts: ConflictRecord[] }> {
    return this.http.get<any>('/api/conflicts');
  }

  resolveConflict(id: string, action: string = 'keep-local', opts?: { rename?: string; targetSpaceId?: string }): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/api/conflicts/${id}/resolve`, { action, ...opts });
  }

  bulkResolveConflicts(ids: string[], action: string, opts?: { rename?: string; targetSpaceId?: string }): Observable<{ resolved: number; failed: { id: string; error: string }[] }> {
    return this.http.post<any>('/api/conflicts/bulk-resolve', { ids, action, ...opts });
  }

  dismissConflict(id: string): Observable<void> {
    return this.http.delete<void>(`/api/conflicts/${id}`);
  }
}
