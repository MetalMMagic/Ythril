import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Instance-level schema library and external schema catalogs. */
export class SchemaApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    // ── Schema Library ─────────────────────────────────────────────────────────
    listSchemaLibrary() {
        return this.http.get('/api/schema-library');
    }
    getSchemaLibraryEntry(name) {
        return this.http.get(`/api/schema-library/${encodeURIComponent(name)}`);
    }
    createSchemaLibraryEntry(body) {
        return this.http.post('/api/schema-library', body);
    }
    upsertSchemaLibraryEntry(name, body) {
        return this.http.put(`/api/schema-library/${encodeURIComponent(name)}`, body);
    }
    deleteSchemaLibraryEntry(name) {
        return this.http.delete(`/api/schema-library/${encodeURIComponent(name)}`);
    }
    getSchemaLibraryUsages(name) {
        return this.http.get(`/api/schema-library/${encodeURIComponent(name)}/usages`);
    }
    publishSchemaLibraryEntry(name, published) {
        return this.http.patch(`/api/schema-library/${encodeURIComponent(name)}/publish`, { published });
    }
    getPublicSchemaLibrary() {
        return this.http.get('/api/schema-library/public');
    }
    /** List all distinct schema group names and their entry counts. */
    listSchemaLibraryGroups() {
        return this.http.get('/api/schema-library/groups');
    }
    /** Export a space's full typeSchemas into the library as a named group. */
    exportSpaceSchemaToLibrary(body) {
        return this.http.post('/api/schema-library/export-space', body);
    }
    /** Apply all library entries belonging to a group to a space as $ref links. */
    applyGroupToSpace(group, spaceId) {
        return this.http.post(`/api/schema-library/groups/${encodeURIComponent(group)}/apply`, { spaceId });
    }
    // ── Schema catalogs ────────────────────────────────────────────────────────
    listSchemaCatalogs() {
        return this.http.get('/api/schema-library/catalogs');
    }
    addSchemaCatalog(body) {
        return this.http.post('/api/schema-library/catalogs', body);
    }
    deleteSchemaCatalog(name) {
        return this.http.delete(`/api/schema-library/catalogs/${encodeURIComponent(name)}`);
    }
    browseCatalog(catalogName) {
        return this.http.get(`/api/schema-library/catalogs/${encodeURIComponent(catalogName)}/entries`);
    }
    getCatalogEntry(catalogName, entryName) {
        return this.http.get(`/api/schema-library/catalogs/${encodeURIComponent(catalogName)}/entries/${encodeURIComponent(entryName)}`);
    }
    static { this.ɵfac = function SchemaApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || SchemaApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: SchemaApi, factory: SchemaApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(SchemaApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
