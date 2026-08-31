import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as i0 from "@angular/core";
/** File store (listing, upload, download), brain file-metadata, and sync file conflicts. */
export class FilesApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    // ── Files ─────────────────────────────────────────────────────────────────
    listFiles(spaceId, path = '/') {
        const params = new HttpParams().set('path', path);
        return this.http.get(`/api/files/${spaceId}`, { params }).pipe(map(res => ({
            entries: (res.entries ?? []).map((e) => ({
                name: e.name,
                size: e.size ?? 0,
                isFile: e.type === 'file',
                isDirectory: e.type === 'dir',
                modified: e.modifiedAt ?? '',
                embeddingStatus: e.embeddingStatus,
                tags: e.tags,
                // Present only for files still in flight; absent leaves the row on its plain status pill.
                progress: e.progress,
                progressAt: e.progressAt,
            })),
        })));
    }
    deleteFile(spaceId, path) {
        const params = new HttpParams().set('path', path);
        return this.http.delete(`/api/files/${spaceId}`, { params, body: { confirm: true } });
    }
    createDir(spaceId, path) {
        const params = new HttpParams().set('path', path);
        return this.http.post(`/api/files/${spaceId}/mkdir`, null, { params });
    }
    moveFile(spaceId, from, to) {
        const params = new HttpParams().set('path', from);
        return this.http.patch(`/api/files/${spaceId}`, { destination: to }, { params });
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
    uploadFileChunked(spaceId, dirPath, file) {
        // The browser already knows the type; sending `application/octet-stream` for every upload threw
        // that away and told the server "bytes". Media processing then had nothing to go on: external
        // vision built `data:application/octet-stream;base64,…` and strict model servers rejected it
        // outright. The server derives from the extension too, so this is belt-and-braces — but the
        // browser's sniffed type is the better evidence when it has one.
        //
        // `application/json` is the one type that must NOT be forwarded. The global `express.json` body
        // parser is mounted ahead of the file router, so a .json upload sent with its true type would be
        // parsed into an object and then taken by the route's JSON `{content, encoding}` branch instead
        // of the raw-bytes path — a corrupted upload, and a 413 above the parser's 10 MB cap. Nothing is
        // lost by withholding it: the server resolves `.json` from the extension, and no media provider
        // is involved.
        const browserType = file.type ?? '';
        const uploadType = browserType.length > 0 && !/^application\/json\s*(;|$)/i.test(browserType)
            ? browserType
            : 'application/octet-stream';
        const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10 MB
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
        const MAX_RETRIES = 3;
        const filePath = dirPath.endsWith('/') ? `${dirPath}${file.name}` : `${dirPath}/${file.name}`;
        return new Observable(subscriber => {
            let cancelled = false;
            let httpSub = null;
            // A rejected arrayBuffer() (e.g. the file moved/was revoked) must surface,
            // but never after the caller unsubscribed.
            const fail = (err) => { if (!cancelled)
                subscriber.error(err); };
            if (file.size <= CHUNK_THRESHOLD) {
                // Small file: single upload.
                subscriber.next({ percent: 0, done: false });
                file.arrayBuffer().then(ab => {
                    if (cancelled)
                        return;
                    const headers = new HttpHeaders({ 'Content-Type': uploadType });
                    const params = new HttpParams().set('path', filePath);
                    httpSub = this.http.post(`/api/files/${spaceId}`, ab, { headers, params }).subscribe({
                        next: () => {
                            subscriber.next({ percent: 100, done: true });
                            subscriber.complete();
                        },
                        error: fail,
                    });
                }).catch(fail);
            }
            else {
                // Chunked upload.
                const total = file.size;
                let offset = 0;
                const sendNextChunk = () => {
                    if (cancelled || offset >= total)
                        return;
                    const end = Math.min(offset + CHUNK_SIZE, total);
                    const slice = file.slice(offset, end);
                    const start = offset;
                    const byteEnd = end - 1;
                    slice.arrayBuffer().then(ab => {
                        if (cancelled)
                            return;
                        const sendChunk = (retriesLeft) => {
                            if (cancelled)
                                return;
                            const headers = new HttpHeaders({
                                'Content-Type': uploadType,
                                'Content-Range': `bytes ${start}-${byteEnd}/${total}`,
                            });
                            const params = new HttpParams().set('path', filePath);
                            httpSub = this.http.post(`/api/files/${spaceId}`, ab, { headers, params }).subscribe({
                                next: () => {
                                    offset = end;
                                    const percent = Math.round((offset / total) * 100);
                                    if (offset >= total) {
                                        subscriber.next({ percent: 100, done: true });
                                        subscriber.complete();
                                    }
                                    else {
                                        subscriber.next({ percent, done: false });
                                        sendNextChunk();
                                    }
                                },
                                error: err => {
                                    if (cancelled)
                                        return;
                                    if (retriesLeft > 0) {
                                        sendChunk(retriesLeft - 1);
                                    }
                                    else {
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
    getFileDownloadUrl(spaceId, path) {
        return `/api/files/${spaceId}?path=${encodeURIComponent(path)}`;
    }
    // ── File metadata (brain) ─────────────────────────────────────────────────
    listFileMeta(spaceId, limit = 50, skip = 0, filters, sort) {
        let params = new HttpParams().set('limit', limit).set('skip', skip);
        // `search` → the server's freetext `?search=` (substring over path + description, slice 4b).
        if (filters?.search)
            params = params.set('search', filters.search);
        if (filters?.tag)
            params = params.set('tag', filters.tag);
        if (sort)
            params = params.set('sort', sort.field).set('dir', sort.dir);
        return this.http.get(`/api/brain/spaces/${spaceId}/files`, { params });
    }
    /** Fetch the single file-metadata record for an exact path (reuses the list route's `?path=` filter — no dedicated route). */
    getFileMeta(spaceId, path) {
        const params = new HttpParams().set('path', path).set('limit', 1);
        return this.http.get(`/api/brain/spaces/${spaceId}/files`, { params }).pipe(map(r => r.files[0] ?? null));
    }
    /**
     * What retrieval sees for one file: the converted Markdown, the chunks in order, the extracted images.
     *
     * One request, because the three are only meaningful together and the partitioning is a server-side fact.
     * `limit`/`skip` page the chunks — a 500-page document has thousands, and this is a diagnostic view.
     */
    getFileExtract(spaceId, path, limit = 100, skip = 0) {
        const params = new HttpParams().set('path', path).set('limit', limit).set('skip', skip);
        return this.http.get(`/api/brain/spaces/${spaceId}/files/extract`, { params });
    }
    updateFileMeta(spaceId, path, body) {
        const params = new HttpParams().set('path', path);
        return this.http.patch(`/api/brain/spaces/${spaceId}/files`, body, { params });
    }
    /** Re-queue embedding for a file whose embedding failed or is only partial. */
    retryEmbedding(spaceId, path) {
        const params = new HttpParams().set('path', path);
        return this.http.post(`/api/files/${spaceId}/retry_embedding`, {}, { params });
    }
    deleteFileMeta(spaceId, path) {
        const params = new HttpParams().set('path', path);
        return this.http.delete(`/api/brain/spaces/${spaceId}/files`, { params });
    }
    // ── File conflicts ────────────────────────────────────────────────────────
    listConflicts() {
        return this.http.get('/api/conflicts');
    }
    resolveConflict(id, action = 'keep-local', opts) {
        return this.http.post(`/api/conflicts/${id}/resolve`, { action, ...opts });
    }
    bulkResolveConflicts(ids, action, opts) {
        return this.http.post('/api/conflicts/bulk-resolve', { ids, action, ...opts });
    }
    dismissConflict(id) {
        return this.http.delete(`/api/conflicts/${id}`);
    }
    static { this.ɵfac = function FilesApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || FilesApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: FilesApi, factory: FilesApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(FilesApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
