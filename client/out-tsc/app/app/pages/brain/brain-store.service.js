import { Injectable, signal, computed } from '@angular/core';
import * as i0 from "@angular/core";
/**
 * Records for the active brain space, and the client-side view of them.
 *
 * Extracted from the 3701-line BrainComponent (A17.9b). Owns the five record lists, the space meta,
 * the per-collection top-bar search text, and everything derived from them: the `*TagSuggestions` and
 * the schema-backed `*TypeOptions`.
 *
 * What is NOT here (stays with the component, moves to its own owner in a later step): the shell's
 * navigation (space list, activeTab, activeSpaceId), the loaders that populate these signals, the
 * create/edit forms per tab, the query/recall tab state, and the record drawer.
 *
 * Search shape (post 4c-i): every record tab filters SERVER-SIDE — memories/edges/chrono have a
 * semantic top bar plus a docked column freetext filter; file-meta has a docked column freetext filter
 * (its top bar / semantic recall is a later slice). No client-side `filtered*` views remain; templates
 * bind `store.<collection>()` directly.
 *
 * Provided by BrainComponent (not root): one instance per mounted page.
 */
export class BrainStore {
    constructor() {
        // ── Records loaded for the active space ─────────────────────────────────────
        this.memories = signal([], ...(ngDevMode ? [{ debugName: "memories" }] : /* istanbul ignore next */ []));
        this.entities = signal([], ...(ngDevMode ? [{ debugName: "entities" }] : /* istanbul ignore next */ []));
        this.edges = signal([], ...(ngDevMode ? [{ debugName: "edges" }] : /* istanbul ignore next */ []));
        this.chrono = signal([], ...(ngDevMode ? [{ debugName: "chrono" }] : /* istanbul ignore next */ []));
        this.fileMetas = signal([], ...(ngDevMode ? [{ debugName: "fileMetas" }] : /* istanbul ignore next */ []));
        // Settings tab (schema only — UI lives in Admin → Spaces)
        this.spaceMeta = signal(null, ...(ngDevMode ? [{ debugName: "spaceMeta" }] : /* istanbul ignore next */ []));
        /** Live-update tick (F12): the shell bumps this when a brain-change SSE event lands for the active
         *  space+collection, and the mounted record tab reloads its current page in response. */
        this.liveRefreshTick = signal(0, ...(ngDevMode ? [{ debugName: "liveRefreshTick" }] : /* istanbul ignore next */ []));
        // The record tabs' TOP-BAR search text. For memories/edges/chrono this is a SEMANTIC recall query
        // (2b-iii-c demoted the old A–Z text mode into the docked column freetext filter). For file-meta,
        // `fileMetaSearch` is now just the shell→tab DEEP-LINK seed: the Files-tab "open in File Meta" action
        // writes the file's path here, and the File Meta tab reads it into its docked Path-column freetext
        // filter on open (4c-i). File-meta has no semantic top bar yet (4c-ii).
        this.memorySearch = signal('', ...(ngDevMode ? [{ debugName: "memorySearch" }] : /* istanbul ignore next */ []));
        this.edgeSearch = signal('', ...(ngDevMode ? [{ debugName: "edgeSearch" }] : /* istanbul ignore next */ []));
        this.chronoSearch = signal('', ...(ngDevMode ? [{ debugName: "chronoSearch" }] : /* istanbul ignore next */ []));
        this.fileMetaSearch = signal('', ...(ngDevMode ? [{ debugName: "fileMetaSearch" }] : /* istanbul ignore next */ []));
        // ── Tag suggestions + filtered views (per collection) ───────────────────────
        //
        // Sourced from the tags ALREADY IN USE in this collection. The space-level
        // `meta.tagSuggestions` list used to be merged in as well; it was retired because it was
        // editable in one place, applied everywhere, and easy to forget about — a stored list quietly
        // steering what agents and people tagged with. What is actually in use is self-maintaining and
        // needs no editor.
        this.memoryTagSuggestions = computed(() => [...new Set([
                ...this.memories().flatMap(m => m.tags ?? []),
            ])], ...(ngDevMode ? [{ debugName: "memoryTagSuggestions" }] : /* istanbul ignore next */ []));
        this.entityTagSuggestions = computed(() => [...new Set([
                ...this.entities().flatMap(e => e.tags ?? []),
            ])], ...(ngDevMode ? [{ debugName: "entityTagSuggestions" }] : /* istanbul ignore next */ []));
        this.edgeTagSuggestions = computed(() => [...new Set([
                ...this.edges().flatMap(e => e.tags ?? []),
            ])], ...(ngDevMode ? [{ debugName: "edgeTagSuggestions" }] : /* istanbul ignore next */ []));
        this.chronoTagSuggestions = computed(() => [...new Set([
                ...this.chrono().flatMap(c => c.tags ?? []),
            ])], ...(ngDevMode ? [{ debugName: "chronoTagSuggestions" }] : /* istanbul ignore next */ []));
        // ── Schema-driven property helpers (shared by every create/edit form + the drawer) ──
        /** The five built-in chrono types — the FALLBACK allowlist, used only by a space that declares no
         *  `typeSchemas.chrono` of its own. Never bind this in a template: it is the fallback, not the
         *  answer. Forms bind `chronoAllowedTypes()`, the filter binds `chronoTypeOptions()`. */
        this.chronoKinds = ['event', 'deadline', 'plan', 'prediction', 'milestone'];
        /** The chrono lifecycle statuses. */
        this.chronoStatusOptions = ['upcoming', 'active', 'completed', 'overdue', 'cancelled'];
    }
    // No client-side `filtered*` views remain: every record tab now filters server-side (semantic top bar
    // for memories/edges/chrono; docked column freetext for all four, incl. file-meta since 4c-i). The
    // templates bind `store.<collection>()` directly.
    // ── Schema-derived accessors + filter-bar type options ──────────────────────
    entityTypeNames() {
        return Object.keys(this.spaceMeta()?.typeSchemas?.entity ?? {});
    }
    edgeLabelNames() {
        return Object.keys(this.spaceMeta()?.typeSchemas?.edge ?? {});
    }
    entitySchema(typeName) {
        if (!typeName)
            return undefined;
        return this.spaceMeta()?.typeSchemas?.entity?.[typeName]?.propertySchemas;
    }
    edgeSchema(labelName) {
        if (!labelName)
            return undefined;
        return this.spaceMeta()?.typeSchemas?.edge?.[labelName]?.propertySchemas;
    }
    memorySchema() {
        const ts = this.spaceMeta()?.typeSchemas?.memory;
        if (!ts)
            return undefined;
        return Object.values(ts)[0]?.propertySchemas;
    }
    /** Property schema for a chrono type (kind or custom-kind name); undefined when none is defined. */
    chronoSchema(typeName) {
        if (!typeName)
            return undefined;
        return this.spaceMeta()?.typeSchemas?.chrono?.[typeName]?.propertySchemas;
    }
    requiredProps(schema) {
        if (!schema)
            return [];
        return Object.entries(schema).filter(([, s]) => s.required).map(([k]) => k);
    }
    /** Type options for the filter bar's dropdown, per collection: the space's schema
     *  type names UNION the distinct `type` values actually present in the loaded list,
     *  so the filter is usable whether or not a schema is defined. */
    typeOptionsFrom(schemaNames, present) {
        return [...new Set([...schemaNames, ...present.filter((t) => !!t)])].sort();
    }
    /**
     * Does this space RESTRICT memory types? The client's mirror of `validateMemory`'s allowlist branch.
     *
     * The rule is the one every other record kind uses and memories gained on 2026-08-30 (P-24 = A): declaring
     * one or more `typeSchemas.memory` entries makes those names the allowed set. Declaring none constrains
     * nothing, which is why this is a question rather than a constant — a space that never asked to restrict
     * memory types must keep accepting any string, and the create form must keep letting one be typed.
     */
    memoryTypesAreRestricted() {
        return Object.keys(this.spaceMeta()?.typeSchemas?.memory ?? {}).length > 0;
    }
    /** Types a memory write is ACCEPTED with — declared names where the space declares any, else unrestricted. */
    memoryAllowedTypes() {
        return Object.keys(this.spaceMeta()?.typeSchemas?.memory ?? {}).slice().sort();
    }
    /** Filter options: allowed types UNION whatever the loaded rows hold, so a record written before a schema
     *  change stays reachable in the filter even though its type is no longer writable. */
    memoryTypeOptions() {
        return this.typeOptionsFrom(Object.keys(this.spaceMeta()?.typeSchemas?.memory ?? {}), this.memories().map(m => m.type));
    }
    entityTypeOptions() {
        return this.typeOptionsFrom(this.entityTypeNames(), this.entities().map(e => e.type));
    }
    edgeTypeOptions() {
        // Edge `type` is not schema-backed; offer the distinct types in the current list.
        return this.typeOptionsFrom([], this.edges().map(e => e.type));
    }
    /** Types a chrono write is ACCEPTED with — the client's mirror of `getAllowedChronoTypes`
     *  (server/src/spaces/schema-validation.ts). That rule is EXCLUSIVE, not additive: a space that
     *  declares `typeSchemas.chrono` allows those names and ONLY those, and 400s on the built-ins.
     *  Offering the built-ins unconditionally is why the create form could not save in such a space. */
    chronoAllowedTypes() {
        const declared = Object.keys(this.spaceMeta()?.typeSchemas?.chrono ?? {});
        return declared.length > 0 ? declared.slice().sort() : [...this.chronoKinds];
    }
    /** Filter options: the allowed types UNION whatever the loaded rows actually hold, so a record
     *  written before a schema change stays reachable even though its type is no longer writable. */
    chronoTypeOptions() {
        return this.typeOptionsFrom(this.chronoAllowedTypes(), this.chrono().map(c => c.type));
    }
    /** Seed a properties object from a type's schema: fill missing keys with a typed default
     *  (enum → first option, number → 0, boolean → false, else ''), preserving existing values. */
    buildPropertiesObject(type, existing = {}, typeName) {
        const meta = this.spaceMeta();
        const typeSchemas = meta?.typeSchemas?.[type];
        if (!typeSchemas || Object.keys(typeSchemas).length === 0)
            return existing;
        // Use the specified type's schema; fall back to the first type when no name is given
        const schemas = (typeName ? typeSchemas[typeName] : Object.values(typeSchemas)[0])?.propertySchemas ?? {};
        if (Object.keys(schemas).length === 0)
            return existing;
        const result = { ...existing };
        for (const [key, schema] of Object.entries(schemas)) {
            if (key in result)
                continue;
            if (schema.enum?.length) {
                result[key] = schema.enum[0];
            }
            else if (schema.type === 'number') {
                result[key] = 0;
            }
            else if (schema.type === 'boolean') {
                result[key] = false;
            }
            else {
                result[key] = '';
            }
        }
        return result;
    }
    /** Strip optional properties whose value is an empty string; required fields are preserved even if empty (server will reject them with a clear error). */
    stripEmptyOptionalProps(props, schema) {
        if (!schema)
            return props;
        return Object.fromEntries(Object.entries(props).filter(([k, v]) => v !== '' || (schema[k]?.required ?? false)));
    }
    static { this.ɵfac = function BrainStore_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || BrainStore)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: BrainStore, factory: BrainStore.ɵfac }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(BrainStore, [{
        type: Injectable
    }], null, null); })();
