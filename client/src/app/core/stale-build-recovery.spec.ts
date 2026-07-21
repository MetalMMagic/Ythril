import { describe, it, expect } from 'vitest';
import {
  recoverFromStaleBuild,
  markBuildLoaded,
  staleBuildNavigationErrorHandler,
  RELOAD_COOLDOWN_MS,
} from './stale-build-recovery';

/**
 * The failure this recovers from, observed live: after the instance was updated, clicking a lazy route in
 * an already-open tab did nothing at all — no message, no network entry, only
 * `TypeError: error loading dynamically imported module: /chunk-FQS44RLV.js` in the console. The tab was
 * running the previous `main-*.js`, whose chunk filenames no longer exist in the new build.
 *
 * The dangerous half of the fix is the guard: a naive "reload once" flag cleared on successful boot turns
 * a genuinely broken deploy into an endless reload loop, because a broken deploy boots fine and only
 * fails on navigation. These tests pin that behaviour specifically.
 */

/** Minimal Window stand-in: real storage semantics, a counted reload, no jsdom navigation. */
function fakeWindow(store: Record<string, string> = {}) {
  let reloads = 0;
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  return {
    reloads: () => reloads,
    listeners,
    win: {
      sessionStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
      location: { reload: () => { reloads += 1; } },
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        (listeners[type] ??= []).push(fn);
      },
    } as unknown as Window,
  };
}

const chunkError = new Error(
  'error loading dynamically imported module: https://example.test/chunk-FQS44RLV.js',
);

describe('stale-build recovery', () => {

  it('reloads once when a lazy chunk cannot be loaded', () => {
    const w = fakeWindow();
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(true);
    expect(w.reloads()).toBe(1);
  });

  it('does NOT reload again when the failure repeats immediately — no reload loop', () => {
    const w = fakeWindow();
    recoverFromStaleBuild(chunkError, w.win);
    // A genuinely broken deploy: reloading did not help, and the failure comes straight back.
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(false);
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(false);
    expect(w.reloads()).toBe(1);
  });

  it('a successful boot must NOT clear a recent guard (that is what would create the loop)', () => {
    const w = fakeWindow();
    recoverFromStaleBuild(chunkError, w.win);
    markBuildLoaded(w.win); // the app boots fine — a broken deploy only fails on navigation
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(false);
    expect(w.reloads()).toBe(1);
  });

  it('recovers again from a LATER update, once the cooldown has passed', () => {
    const store: Record<string, string> = {
      'ythril:chunk-reload': String(Date.now() - RELOAD_COOLDOWN_MS - 1_000),
    };
    const w = fakeWindow(store);
    markBuildLoaded(w.win);
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(true);
    expect(w.reloads()).toBe(1);
  });

  it('ignores errors that are not chunk-load failures', () => {
    const w = fakeWindow();
    expect(recoverFromStaleBuild(new Error('Http failure response: 500'), w.win)).toBe(false);
    expect(recoverFromStaleBuild(undefined, w.win)).toBe(false);
    expect(w.reloads()).toBe(0);
  });

  it('matches the wording each browser uses', () => {
    for (const message of [
      'error loading dynamically imported module: /chunk-A.js',      // Chrome, Safari
      'Failed to fetch dynamically imported module: /chunk-B.js',    // Chrome (newer)
      'error loading module',                                        // Firefox
      'Importing a module script failed.',                           // Safari
      'ChunkLoadError: Loading chunk 42 failed',                     // webpack-style
    ]) {
      const w = fakeWindow();
      expect(recoverFromStaleBuild(new Error(message), w.win), message).toBe(true);
    }
  });

  it('does nothing when sessionStorage is unavailable, rather than looping unguarded', () => {
    const w = fakeWindow();
    (w.win as unknown as { sessionStorage: unknown }).sessionStorage = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
      removeItem() { throw new Error('denied'); },
    };
    expect(recoverFromStaleBuild(chunkError, w.win)).toBe(false);
    expect(w.reloads()).toBe(0);
  });

  it('unwraps the router NavigationError shape', () => {
    // The router hands the handler a NavigationError whose `.error` carries the real failure.
    const w = fakeWindow();
    staleBuildNavigationErrorHandler({ error: chunkError }, w.win);
    expect(w.reloads()).toBe(1);
  });
});
