import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Spaces, their per-type schemas, stats, reindex, and destructive wipe. */
export class SpacesApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    listSpaces() {
        return this.http.get('/api/spaces');
    }
    createSpace(body) {
        return this.http.post('/api/spaces', body);
    }
    updateSpace(id, body) {
        return this.http.patch(`/api/spaces/${id}`, body);
    }
    reorderSpaces(ids) {
        return this.http.post('/api/spaces/reorder', { ids });
    }
    getSpaceMeta(id) {
        // `resolve=1`: expand library `$ref` types so the brain entry forms can pre-fill a selected type's
        // properties (a bare `{ $ref }` carries no propertySchemas). Edit/round-trip views use the raw meta.
        return this.http.get(`/api/spaces/${id}/meta?resolve=1`);
    }
    /** Completeness checks + their roll-up (Brain → Overview panel). Separate from `/meta` on purpose:
     *  that endpoint is read on every schema edit and must stay cheap; this one walks the collections. */
    getCompleteness(id) {
        return this.http.get(`/api/spaces/${id}/completeness`);
    }
    /** GET a single type definition from the space's typeSchemas. */
    getTypeSchema(spaceId, knowledgeType, typeName) {
        return this.http.get(`/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`);
    }
    /** PUT (upsert) a single type definition into the space's typeSchemas. */
    upsertTypeSchema(spaceId, knowledgeType, typeName, schema) {
        return this.http.put(`/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`, schema);
    }
    /** DELETE a single type definition from the space's typeSchemas. */
    deleteTypeSchema(spaceId, knowledgeType, typeName) {
        return this.http.delete(`/api/spaces/${spaceId}/meta/typeSchemas/${knowledgeType}/${typeName}`);
    }
    deleteSpace(id) {
        return this.http.delete(`/api/spaces/${id}`, { body: { confirm: true } });
    }
    renameSpace(oldId, newId) {
        return this.http.patch(`/api/spaces/${oldId}/rename`, { newId });
    }
    /**
     * Rebuild the space's vector search indexes — the repair for "search returns nothing".
     *
     * Recall goes through a `$vectorSearch` index that is separate from the stored vectors, so it can be
     * missing while every record still has a perfectly good embedding: recall then returns empty with no
     * error anywhere. Reindexing does NOT fix that — it re-embeds documents and never touches the index.
     * This is the only operation that rebuilds it.
     *
     * Returns immediately; the build continues in the background and recall stays empty until it finishes.
     */
    rebuildSpaceIndexes(spaceId) {
        return this.http.post(`/api/spaces/${spaceId}/rebuild-indexes`, {});
    }
    /**
     * Queue embeddings for records in the space that have none — the way back from `suppressEmbeddings`.
     *
     * Unlike `rebuildSpaceIndexes` this is AWAITED for its counts rather than fire-and-forget: it only enqueues, so
     * it returns in the time it takes to scan, and `enqueued` / `remaining` are the answer the operator wants. A
     * record still suppressed at any tier is skipped by the server and reported under `skippedSuppressed`.
     */
    reembedSpace(spaceId, body = {}) {
        return this.http.post(`/api/spaces/${spaceId}/reembed`, body);
    }
    wipeSpace(spaceId, types) {
        const body = types && types.length > 0 ? { types } : {};
        return this.http.post(`/api/admin/spaces/${spaceId}/wipe`, body);
    }
    getSpaceStats(spaceId) {
        return this.http.get(`/api/brain/spaces/${spaceId}/stats`);
    }
    /**
     * Usage over a window, defaulting to a day.
     *
     * Separate call from `getSpaceStats` on purpose: stats is counts of stored records and answers instantly,
     * while this aggregates hourly buckets. Folding them together would make the whole Overview wait on the
     * slower half, and the panel is designed to render its tiles before this arrives.
     */
    /**
     * Clear a space's recorded usage.
     *
     * Note the path: the READ is under /api/brain, the reset is under /api/spaces. They are not siblings, and that
     * is deliberate rather than sloppy — reading usage is a brain query, clearing it is an administrative act on
     * the space, and it lives with rebuild-indexes and wipe behind the same admin guard.
     *
     * Returns how many hourly buckets were removed, because afterwards the panel reads zero either way and
     * nothing on screen tells a reset apart from a space that was genuinely idle.
     */
    resetSpaceActivity(spaceId) {
        return this.http.post(`/api/spaces/${spaceId}/activity/reset`, {});
    }
    getSpaceActivity(spaceId, hours = 24) {
        return this.http.get(`/api/brain/spaces/${spaceId}/activity?hours=${hours}`);
    }
    /**
     * Every space's usage in ONE request, for the Spaces list.
     *
     * Not the per-space endpoint called once per row — that is a front-end N+1, and on a sixty-five-space
     * instance it is sixty-five requests to draw one table. Admin-only, because it is inherently cross-space.
     */
    listSpaceActivity(hours = 7 * 24) {
        return this.http.get(`/api/admin/space-activity?hours=${hours}`);
    }
    getReindexStatus(spaceId) {
        return this.http.get(`/api/brain/spaces/${spaceId}/reindex-status`);
    }
    reindex(spaceId) {
        return this.http.post(`/api/brain/spaces/${spaceId}/reindex`, {});
    }
    static { this.ɵfac = function SpacesApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SpacesApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: SpacesApi, factory: SpacesApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SpacesApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
