/**
 * Shared API DTOs and domain types for the Ythril client.
 *
 * Extracted from the former monolithic api.service.ts (A17.2). The HttpClient wrappers now live in
 * per-domain services (auth/spaces/schema/brain/files/duplicates/networks/admin *-api.service.ts);
 * this file is types only, so any component or service can import a DTO without pulling in a service.
 */
/** The five buckets, in the order the UI shows them. `file` last: it is the one with no schema tier above it. */
export const TTL_BUCKETS = ['entity', 'memory', 'edge', 'chrono', 'file'];
/**
 * A space's windows as a full five-bucket map, widening the legacy scalar — so no component has to know which
 * shape it is looking at. `null` means "no window", which is also what an absent bucket means.
 */
export function recordTtlWindows(stored) {
    const ok = (v) => typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
    const out = {};
    for (const b of TTL_BUCKETS)
        out[b] = typeof stored === 'number' ? ok(stored) : ok(stored?.[b]);
    return out;
}
/**
 * Selectable webhook events, grouped by domain for the picker. `test.ping` is deliberately excluded —
 * it is the test-button's internal event, not a real domain event a user would subscribe to.
 */
export const WEBHOOK_EVENT_GROUPS = [
    { group: 'memory', events: ['memory.created', 'memory.updated', 'memory.deleted'] },
    { group: 'entity', events: ['entity.created', 'entity.updated', 'entity.deleted', 'entity.merged'] },
    { group: 'edge', events: ['edge.created', 'edge.updated', 'edge.deleted'] },
    { group: 'chrono', events: ['chrono.created', 'chrono.updated', 'chrono.deleted'] },
    { group: 'file', events: ['file.created', 'file.updated', 'file.deleted'] },
    { group: 'other', events: ['bulk.write', 'link_violation.created', 'duplicate.detected'] },
];
