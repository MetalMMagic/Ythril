import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as i0 from "@angular/core";
/** Brain knowledge graph — memories, entities, edges, chrono, plus query/recall/traverse. */
export class BrainApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    /** Append `sort`/`dir` to a list request when a sort is active; a no-op otherwise. */
    withSort(params, sort) {
        return sort ? params.set('sort', sort.field).set('dir', sort.dir) : params;
    }
    /** Mint a single-use ticket to open the live-change SSE stream. EventSource can't send an
     *  Authorization header and a raw token in the URL leaks into logs/history, so the stream is opened
     *  with `?ticket=` instead. The ticket is single-use, short-lived, and bound to this space's stream. */
    mintEventsTicket(spaceId) {
        return this.http.post(`/api/brain/spaces/${spaceId}/events/ticket`, {});
    }
    queryBrain(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/query`, body);
    }
    /** Embedding-job backlog for a space (F9 Overview embedding-queue panel). */
    getEmbeddingQueue(spaceId) {
        return this.http.get(`/api/brain/spaces/${spaceId}/embedding-queue/media`);
    }
    /** Re-queue every failed media job in a space (F9 Overview "retry all failed"). Returns the count reset. */
    retryFailedEmbeddings(spaceId) {
        return this.http.post(`/api/brain/spaces/${spaceId}/embedding-queue/media/retry-failed`, {});
    }
    /** Which tokens can reach a space and at what level (F9 Overview matrix). ADMIN-only — 403 for others. */
    getTokenAccess(spaceId) {
        return this.http.get(`/api/brain/spaces/${spaceId}/token-access`);
    }
    recallBrain(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/recall`, body);
    }
    // ── Brain — memories ──────────────────────────────────────────────────────
    listMemories(spaceId, limit = 20, skip = 0, filters, sort, search) {
        let params = new HttpParams().set('limit', limit).set('skip', skip);
        if (filters?.tag)
            params = params.set('tag', filters.tag);
        if (filters?.entity)
            params = params.set('entity', filters.entity);
        if (filters?.type)
            params = params.set('type', filters.type);
        if (filters?.description)
            params = params.set('description', filters.description);
        if (filters?.entityName)
            params = params.set('entityName', filters.entityName);
        if (filters?.properties)
            params = params.set('properties', filters.properties);
        if (search)
            params = params.set('search', search);
        params = this.withSort(params, sort);
        return this.http.get(`/api/brain/spaces/${spaceId}/memories`, { params });
    }
    deleteMemory(spaceId, id) {
        return this.http.delete(`/api/brain/spaces/${spaceId}/memories/${id}`);
    }
    createMemory(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/memories`, body);
    }
    updateMemory(spaceId, id, body) {
        return this.http.patch(`/api/brain/spaces/${spaceId}/memories/${id}`, body);
    }
    wipeMemories(spaceId) {
        return this.http.delete(`/api/brain/spaces/${spaceId}/memories`, {
            body: { confirm: true },
        });
    }
    // ── Brain — entities ──────────────────────────────────────────────────────
    listEntities(spaceId, limit = 50, skip = 0, filters, sort, search) {
        let params = new HttpParams().set('limit', limit).set('skip', skip);
        // `filters.search` is the entity-search bar's exact `name` lookup; `search` is the docked column
        // freetext filter → the server's substring `?search=` (2b-iii). They are distinct params.
        if (filters?.search)
            params = params.set('name', filters.search);
        if (filters?.type)
            params = params.set('type', filters.type);
        if (filters?.tag)
            params = params.set('tag', filters.tag);
        if (filters?.description)
            params = params.set('description', filters.description);
        if (filters?.properties)
            params = params.set('properties', filters.properties);
        if (search)
            params = params.set('search', search);
        params = this.withSort(params, sort);
        return this.http.get(`/api/brain/spaces/${spaceId}/entities`, { params });
    }
    deleteEntity(spaceId, id) {
        return this.http.delete(`/api/brain/spaces/${spaceId}/entities/${id}`);
    }
    createEntity(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/entities`, body);
    }
    updateEntity(spaceId, id, body) {
        return this.http.patch(`/api/brain/spaces/${spaceId}/entities/${id}`, body);
    }
    // ── Brain — edges ─────────────────────────────────────────────────────────
    listEdges(spaceId, limit = 50, skip = 0, filters, sort, search) {
        let params = new HttpParams().set('limit', limit).set('skip', skip);
        if (filters?.type)
            params = params.set('type', filters.type);
        if (filters?.tag)
            params = params.set('tag', filters.tag);
        if (filters?.description)
            params = params.set('description', filters.description);
        if (filters?.fromName)
            params = params.set('fromName', filters.fromName);
        if (filters?.toName)
            params = params.set('toName', filters.toName);
        if (filters?.properties)
            params = params.set('properties', filters.properties);
        if (search)
            params = params.set('search', search);
        params = this.withSort(params, sort);
        return this.http.get(`/api/brain/spaces/${spaceId}/edges`, { params });
    }
    deleteEdge(spaceId, id) {
        return this.http.delete(`/api/brain/spaces/${spaceId}/edges/${id}`);
    }
    createEdge(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/edges`, body);
    }
    updateEdge(spaceId, id, body) {
        return this.http.patch(`/api/brain/spaces/${spaceId}/edges/${id}`, body);
    }
    // ── Brain — lookups & graph traverse ──────────────────────────────────────
    searchEntitiesByName(spaceId, name) {
        const params = new HttpParams().set('name', name);
        return this.http.get(`/api/brain/spaces/${spaceId}/entities/by-name`, { params });
    }
    getEntitiesByIds(spaceId, ids) {
        if (!ids.length)
            return new Observable(o => { o.next({ entities: [] }); o.complete(); });
        const params = new HttpParams().set('ids', ids.join(','));
        return this.http.get(`/api/brain/spaces/${spaceId}/entities/by-ids`, { params });
    }
    getEntity(spaceId, id) {
        return this.http.get(`/api/brain/spaces/${spaceId}/entities/${id}`);
    }
    getEdge(spaceId, id) {
        return this.http.get(`/api/brain/spaces/${spaceId}/edges/${id}`);
    }
    getMemory(spaceId, id) {
        return this.http.get(`/api/brain/spaces/${spaceId}/memories/${id}`);
    }
    getChrono(spaceId, id) {
        return this.http.get(`/api/brain/spaces/${spaceId}/chrono/${id}`);
    }
    /**
     * Fetch one record when the TYPE is data rather than a compile-time choice.
     *
     * Review findings carry `type` as a string, so a caller showing "the two records this finding is about"
     * cannot pick a getter by hand. The switch lives here, next to the four getters it dispatches to, rather
     * than being re-derived by every view that meets a typed id — and an unknown type throws instead of
     * quietly requesting `/api/brain/spaces/x/undefined/y`, which 404s in a way that reads like a missing
     * record rather than a missing case.
     */
    getRecord(spaceId, type, id) {
        switch (type) {
            case 'entity': return this.getEntity(spaceId, id);
            case 'memory': return this.getMemory(spaceId, id);
            case 'chrono': return this.getChrono(spaceId, id);
            case 'edge': return this.getEdge(spaceId, id);
            default: throw new Error(`getRecord: unknown record type '${type}'`);
        }
    }
    /**
     * Walk the graph from an entity. The three `include*` flags decide what the answer CONTAINS, not what is
     * walked: edges are always followed, and `includeEdges: false` only drops the edge list from the response.
     * `includeMemories` is opt-in because memories are usually the most numerous record type and every node
     * counts against `limit`.
     */
    traverseGraph(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/traverse`, body);
    }
    // ── Brain — chrono ──────────────────────────────────────────────────────
    listChrono(spaceId, limit = 50, skip = 0, filters, sort) {
        let params = new HttpParams().set('limit', limit).set('skip', skip);
        if (filters?.tags)
            params = params.set('tags', filters.tags);
        if (filters?.tagsAny)
            params = params.set('tagsAny', filters.tagsAny);
        if (filters?.tag)
            params = params.set('tag', filters.tag);
        if (filters?.description)
            params = params.set('description', filters.description);
        if (filters?.entityName)
            params = params.set('entityName', filters.entityName);
        // The chrono record "kind" (event/deadline/…) is filtered via the `type` query
        // param server-side; the old `kind` param was silently ignored.
        if (filters?.type)
            params = params.set('type', filters.type);
        if (filters?.status)
            params = params.set('status', filters.status);
        if (filters?.after)
            params = params.set('after', filters.after);
        if (filters?.before)
            params = params.set('before', filters.before);
        if (filters?.search)
            params = params.set('search', filters.search);
        params = this.withSort(params, sort);
        return this.http.get(`/api/brain/spaces/${spaceId}/chrono`, { params });
    }
    createChrono(spaceId, body) {
        return this.http.post(`/api/brain/spaces/${spaceId}/chrono`, body);
    }
    // PATCH, like the other three record types — this was the ONE update in the client still on the legacy
    // POST-to-an-id form, which our own integration guide tells integrators not to build on. Both verbs reach
    // the same writer, so the record comes out identical; what the legacy verb skips is the two things a
    // multi-client operator cannot do without. It runs NO property validation (so the UI could write a record
    // the same space would reject on the create form next to it), and it stores NO audit snapshot (so every
    // chrono edit made in this app was absent from the before/after trail that entities, memories and edges
    // all leave). An integrator found nine of their own flows on this route before we found one of ours.
    updateChrono(spaceId, id, body) {
        return this.http.patch(`/api/brain/spaces/${spaceId}/chrono/${id}`, body);
    }
    deleteChrono(spaceId, id) {
        return this.http.delete(`/api/brain/spaces/${spaceId}/chrono/${id}`);
    }
    /**
     * The space’s inferred entity-relationship model.
     *
     * A proxy space answers with `{ spaceId, members: [...] }` instead of a single model, so a caller must
     * narrow before reading `entityTypes`. Kept as a union rather than flattened here: merging members would
     * sum two types that share a name across spaces and show relationships that can never be joined.
     */
    getErModel(spaceId) {
        return this.http.get(`/api/brain/spaces/${spaceId}/er-model`);
    }
    static { this.ɵfac = function BrainApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || BrainApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: BrainApi, factory: BrainApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(BrainApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
