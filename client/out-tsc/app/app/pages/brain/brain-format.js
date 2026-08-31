/**
 * Pure formatting helpers shared across the brain page — the shell, the record drawer, and the tab
 * components. No Angular, no `this`, no injection: extracted from BrainComponent (A17.9b) so every
 * owner can import them rather than reach back into the shell.
 */
/** An ISO timestamp as a local `YYYY-MM-DDTHH:mm` string for a `datetime-local` input; '' if invalid. */
export function toLocalDatetime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Turn an API error into a user-facing message; expands schema violations into `field: reason` lists. */
export function fmtApiError(err, fallback) {
    const body = err?.error;
    if (body?.error === 'schema_violation' && Array.isArray(body.violations) && body.violations.length > 0) {
        const details = body.violations.map(v => `${v.field}: ${v.reason}`).join('; ');
        return `Schema violation — ${details}`;
    }
    return body?.error ?? fallback;
}
