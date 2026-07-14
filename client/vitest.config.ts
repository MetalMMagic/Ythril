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
    // Default per-file isolation (each spec file in its own fork) — so each file gets a fresh
    // Angular test platform and TestBed. A shared/single fork instead leaked TestBed state
    // between files (a component created by one file broke the next) and double-created the
    // platform (NG0400). Isolation is the correct model for Angular's global TestBed.
  },
});
