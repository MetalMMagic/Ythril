import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

/**
 * Client unit-test runner (Vitest + jsdom + the Angular compiler plugin).
 *
 * This exists specifically so change-detection changes (OnPush, and eventually zoneless — P5)
 * can be VERIFIED rather than shipped on a green build. OnPush's failure mode is a view that
 * silently stops updating after a state change; a production build cannot see that, so before
 * this harness there was no way to catch it except clicking through the UI by hand.
 */
export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // Vitest's 5s default is tuned for plain unit tests. These are Angular TestBed specs: creating a
    // component compiles it, builds an injector and renders into jsdom, and 71 spec files run in
    // parallel forks contending for CPU. Individual tests were measured at 5063ms and 5729ms against
    // that 5000ms ceiling — passing alone, failing at random in a full run, and never the same test
    // twice.
    //
    // Raised rather than chased test-by-test: two different specs tipped over on consecutive runs, so
    // it is the ceiling that is wrong, not the tests. This matters more since `npm run preflight`
    // asks every push to run this suite — a gate that fails at random is one people stop trusting,
    // and then stop running.
    //
    // The cost is that a genuinely hung test now takes 20s to report instead of 5s. The suite
    // completes in ~9s when healthy, so that is a rare price for a stable signal.
    testTimeout: 20_000,
    // Default per-file isolation (each spec file in its own fork) — so each file gets a fresh
    // Angular test platform and TestBed. A shared/single fork instead leaked TestBed state
    // between files (a component created by one file broke the next) and double-created the
    // platform (NG0400). Isolation is the correct model for Angular's global TestBed.
  },
});
