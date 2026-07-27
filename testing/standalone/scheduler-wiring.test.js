/**
 * Every background scheduler is actually started.
 *
 * This exists because one was not. `runContradictionScanAllSpaces` was written, exported, tested and
 * shipped — and nothing ever called it. `bootstrap.ts` started the duplicate scanner, the backup scheduler
 * and the TTL sweep, with no contradiction equivalent, so contradictions were only ever found when an admin
 * hit `POST /api/contradictions/scan` by hand. On any instance nobody had poked manually, the Review tab's
 * Contradictions view was permanently empty and the whole feature was inert.
 *
 * Nothing catches that. The code compiles, the unit tests pass, the endpoint works when called, and the
 * empty queue is indistinguishable from a clean one — which is the same failure shape as the sweep that
 * wrote every finding to `"undefined:undefined"` and the file listing that silently joined no metadata.
 *
 * So the check is structural: for each module that owns a scheduler, assert its `start*` export is named in
 * `bootstrap.ts`. Source-scanning rather than behavioural on purpose — the bug is *absence of a call*, and
 * no amount of testing the function itself can detect that the function is never reached.
 *
 * Run: node --test testing/standalone/scheduler-wiring.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Modules that own a background scheduler, and the export bootstrap must call. */
const SCHEDULERS = [
  { module: 'server/src/brain/dupe-scanner.ts', start: 'startDupeScanner' },
  { module: 'server/src/brain/contradiction-scanner.ts', start: 'startContradictionScanner' },
  { module: 'server/src/brain/ttl-sweep.ts', start: 'startTtlSweep' },
  { module: 'server/src/brain/candidate-prune.ts', start: 'startCandidatePrune' },
  { module: 'server/src/db/backup-scheduler.ts', start: 'startBackupScheduler' },
];

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/**
 * Source with comments removed.
 *
 * Required, not tidiness: a commented-out `// startContradictionScanner();` matches a naive search for the
 * call just as well as a real one, so the guard would pass on precisely the change it exists to catch.
 * (Found by trying it.)
 */
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('scheduler wiring — a scheduler nobody starts is dead code that looks alive', () => {
  let bootstrap;
  before(() => { bootstrap = code('server/src/bootstrap.ts'); });

  for (const { module, start } of SCHEDULERS) {
    it(`${start} is exported by its module`, () => {
      assert.match(read(module), new RegExp(`export function ${start}\\b`),
        `${module} should export ${start}`);
    });

    it(`${start} is CALLED in bootstrap`, () => {
      // The import alone is not enough — an unused import is exactly as dead as no import.
      assert.match(bootstrap, new RegExp(`${start}\\s*\\(`),
        `bootstrap.ts imports-but-never-calls or omits ${start}; the sweep would never run`);
    });
  }

  it('pairs every start with a stop, so a config reload can restart it cleanly', () => {
    // Each scheduler holds a module-level task handle. Without a stop, a reload leaks the old cron task and
    // the sweep quietly runs twice per tick.
    for (const { module, start } of SCHEDULERS) {
      const stop = start.replace(/^start/, 'stop');
      assert.match(read(module), new RegExp(`export function ${stop}\\b`),
        `${module} should export ${stop} alongside ${start}`);
    }
  });
});
