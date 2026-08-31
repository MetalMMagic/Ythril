export const HELP_ANCHORS = [
    { prefix: '/settings/spaces', target: { doc: 'userguide', anchor: 'settings--spaces' } },
    { prefix: '/settings/tokens', target: { doc: 'userguide', anchor: 'settings--tokens' } },
    { prefix: '/settings/networks', target: { doc: 'userguide', anchor: 'settings--networks' } },
    { prefix: '/settings/media-processing', target: { doc: 'userguide', anchor: 'settings--media-processing' } },
    { prefix: '/settings/storage', target: { doc: 'userguide', anchor: 'settings--storage' } },
    { prefix: '/settings/data', target: { doc: 'userguide', anchor: 'settings--data' } },
    { prefix: '/settings/audit-log', target: { doc: 'userguide', anchor: 'settings--audit-log' } },
    { prefix: '/settings/webhooks', target: { doc: 'userguide', anchor: 'settings--webhooks' } },
    { prefix: '/settings/embedding', target: { doc: 'userguide', anchor: 'settings--embedding' } },
    // MFA has no page of its own — `<app-mfa/>` is embedded in Preferences, so that is the page whose Help
    // control should open the MFA section. The entry used to read `/settings/mfa`, which nothing routes to.
    { prefix: '/settings/preferences', target: { doc: 'userguide', anchor: 'multi-factor-authentication-mfa' } },
    // `/schema-library`, NOT `/settings/schema-library`: the latter was never a route. A dead duplicate of the
    // page under pages/settings/ made it look like one, so the real page had no Help target at all while the
    // table looked complete. The route-coverage test below is what stops that recurring.
    { prefix: '/schema-library', target: { doc: 'userguide', anchor: 'schema-library' } },
    { prefix: '/brain', target: { doc: 'userguide', anchor: 'brain' } },
    { prefix: '/files', target: { doc: 'userguide', anchor: 'files' } },
];
/**
 * The help target for a URL, or null when the page has none.
 *
 * Longest prefix wins: `/settings/schema-library` must not be answered by a `/settings` entry, and
 * `/brain` must not swallow a future `/brain/something` with its own section.
 *
 * The Help page itself is deliberately excluded — a help link on the help page is furniture.
 */
export function helpTargetFor(url) {
    const path = url.split(/[?#]/)[0];
    if (path.startsWith('/settings/help'))
        return null;
    let best = null;
    for (const entry of HELP_ANCHORS) {
        if (path !== entry.prefix && !path.startsWith(`${entry.prefix}/`))
            continue;
        if (!best || entry.prefix.length > best.prefix.length)
            best = entry;
    }
    return best?.target ?? null;
}
