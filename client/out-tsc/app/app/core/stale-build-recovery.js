/**
 * Recovery for the "the app was updated while your tab was open" failure.
 *
 * Every Angular build rehashes its lazy-chunk filenames. A tab that is still running the previous
 * `main-*.js` therefore asks for a `chunk-*.js` that no longer exists the moment the user navigates to a
 * lazy route. Without this, the click simply does nothing: no message, no network entry (the browser
 * caches the failed dynamic import in its module map, so a retry never even leaves the page), and only a
 * `TypeError: error loading dynamically imported module` in a console the user is not looking at. The
 * only recovery is a hard refresh they have no reason to try.
 *
 * The server half of this fix makes a missing build asset return a real 404 rather than falling back to
 * index.html — so the browser stops receiving HTML where it asked for JavaScript.
 *
 * Reloading picks up the new index.html and its new bundle, so the navigation the user asked for
 * succeeds. The guard is a TIMESTAMP, not a boolean: a second chunk failure within RELOAD_COOLDOWN_MS of
 * the last reload means reloading did not help — the deploy is genuinely broken — so the error is left to
 * surface rather than reloading again. Clearing the flag on successful boot would NOT work: a broken
 * deploy boots fine and only fails on navigation, so the flag would be cleared before every retry and the
 * "one shot" would become an endless reload loop.
 */
const RELOAD_FLAG = 'ythril:chunk-reload';
/** A repeat failure sooner than this means the reload did not fix anything. */
export const RELOAD_COOLDOWN_MS = 60_000;
/** Matches the browser-specific wording for "I could not load that module". */
function isChunkLoadFailure(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (/error loading dynamically imported module/i.test(message) || // Chrome, Safari
        /failed to fetch dynamically imported module/i.test(message) || // Chrome (newer)
        /error loading module|importing a module script failed/i.test(message) || // Firefox, Safari
        /ChunkLoadError/i.test(message));
}
/**
 * True when the failure was handled by scheduling a reload. False means the caller should surface the
 * error normally — either it is unrelated to chunk loading, or we already tried reloading once.
 */
export function recoverFromStaleBuild(error, win = window) {
    if (!isChunkLoadFailure(error))
        return false;
    const now = Date.now();
    try {
        const last = Number(win.sessionStorage.getItem(RELOAD_FLAG) ?? 0);
        if (last && now - last < RELOAD_COOLDOWN_MS)
            return false; // reloading already failed to fix it
        win.sessionStorage.setItem(RELOAD_FLAG, String(now));
    }
    catch {
        // Private mode / storage disabled: without the guard we cannot bound the attempts, so do nothing
        // rather than risk an endless reload loop.
        return false;
    }
    win.location.reload();
    return true;
}
/**
 * Drops a guard left over from a PREVIOUS session window. Deliberately does NOT clear a recent one:
 * see the note above about why clearing on boot would create a reload loop.
 */
export function markBuildLoaded(win = window) {
    try {
        const last = Number(win.sessionStorage.getItem(RELOAD_FLAG) ?? 0);
        if (last && Date.now() - last >= RELOAD_COOLDOWN_MS)
            win.sessionStorage.removeItem(RELOAD_FLAG);
    }
    catch {
        /* storage unavailable — nothing to clear */
    }
}
/** Router hook: turns a chunk-load navigation failure into a one-shot reload. */
export function staleBuildNavigationErrorHandler(navigationError, win = window) {
    const error = navigationError?.error ?? navigationError;
    recoverFromStaleBuild(error, win);
}
/**
 * Also catch chunk failures that do not arrive through the router — a lazily loaded standalone
 * component, a deferred block, or an `import()` inside a service.
 */
export function installStaleBuildGlobalHandler(win = window) {
    win.addEventListener('unhandledrejection', (event) => {
        if (recoverFromStaleBuild(event.reason, win))
            event.preventDefault();
    });
    win.addEventListener('error', (event) => {
        recoverFromStaleBuild(event.error ?? event.message, win);
    });
}
