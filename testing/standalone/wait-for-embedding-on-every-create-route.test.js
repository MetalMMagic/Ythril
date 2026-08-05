/**
 * Every brain create route accepts `waitForEmbedding`, or none of them should.
 *
 * ## Why this gate exists rather than a note
 *
 * Writes stopped waiting for the embedding model, which means a caller who will search for, scan, or
 * compare what it just wrote needs a way to say so. `waitForEmbedding` is that way — and it was added to
 * all four creator FUNCTIONS in one change while only ONE of the four ROUTES forwarded it.
 *
 * That gap was invisible from the code (each route looks complete on its own) and cost seven CI failures in
 * the duplicate-scanner suite, which creates entities and then scans: a scan cannot pair records that have
 * no vector yet. It was then fixed one route at a time, twice.
 *
 * Three times in one session the same shape recurred — a rule established for memories and not carried to
 * the types the mechanism was extended to. The individual misses are cheap. The pattern is what this gate
 * is for: it fails when the set is INCONSISTENT, not when any particular route is missing, so it holds
 * whichever way a future change moves.
 *
 * Run: node --test testing/standalone/wait-for-embedding-on-every-create-route.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** The four brain record types that carry their own embedding, and the route file for each. */
const ROUTES = {
  memory: 'server/src/api/brain/memories.ts',
  entity: 'server/src/api/brain/entities.ts',
  edge: 'server/src/api/brain/edges.ts',
  chrono: 'server/src/api/brain/chrono.ts',
};

/** Comments stripped, so the gate cannot pass on the prose that documents it. */
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join('\n');

describe('waitForEmbedding is reachable on every brain create route', () => {
  it('the detector sees the pattern it is gating', () => {
    // Mutation-check before trusting a positive: a matcher that matches everything is as useless as one
    // that matches nothing, and this gate's whole value is telling the four routes apart.
    assert.ok(/req\.body\?\.waitForEmbedding/.test('const x = req.body?.waitForEmbedding;'));
    assert.equal(/req\.body\?\.waitForEmbedding/.test('const x = req.body?.somethingElse;'), false);
  });

  it('all four routes read it, or none do', () => {
    const reads = {};
    for (const [type, file] of Object.entries(ROUTES)) {
      reads[type] = /req\.body\?\.waitForEmbedding/.test(code(file));
    }
    const yes = Object.entries(reads).filter(([, v]) => v).map(([k]) => k);
    const no = Object.entries(reads).filter(([, v]) => !v).map(([k]) => k);

    assert.ok(yes.length === 4 || no.length === 4,
      `waitForEmbedding is reachable over REST for [${yes.join(', ')}] but not [${no.join(', ')}]. `
      + 'A caller writing one of the second group cannot ask for a synchronous embedding at all, so a '
      + 'write-then-search or write-then-scan flow has no correct form for that type. This exact gap cost '
      + 'seven duplicate-scanner failures. Add it to the rest, or remove it from all four deliberately.');
  });

  it('excludeFromVectorSearch is reachable on every PATCH handler that has one, or none', () => {
    // Same rule, same gate. It shipped wired into the four update FUNCTIONS and into no PATCH handler at
    // all, so a caller sending it alone was told they had sent no fields — reported by an integrator
    // against a live instance. Fourth time in one session that one rule reached some surfaces and not
    // others, so it is gated the same way: consistency, not presence.
    const has = {};
    for (const [type, file] of Object.entries(ROUTES)) {
      const src = code(file);
      if (!/At least one field must be provided/.test(src)) continue;   // no PATCH handler here
      has[type] = /excludeFromVectorSearch/.test(src);
    }
    const yes = Object.entries(has).filter(([, v]) => v).map(([k]) => k);
    const no = Object.entries(has).filter(([, v]) => !v).map(([k]) => k);
    assert.ok(yes.length === 0 || no.length === 0,
      `excludeFromVectorSearch is settable over REST for [${yes.join(', ')}] but not [${no.join(', ')}]. `
      + 'A flag wired into the update function and not into the handler ships UNREACHABLE on the surface '
      + 'most integrators use.');
  });

  it('each route VALIDATES it rather than trusting the body', () => {
    // A boolean read straight out of a request body and passed to a writer is how a string "false" turns
    // into a truthy synchronous embed. Every route that reads it must also reject a non-boolean.
    const offenders = [];
    for (const [type, file] of Object.entries(ROUTES)) {
      const src = code(file);
      if (!/req\.body\?\.waitForEmbedding/.test(src)) continue;
      if (!/typeof waitForEmbedding !== 'boolean'/.test(src)) offenders.push(type);
    }
    assert.deepEqual(offenders, [],
      'these routes read waitForEmbedding but never check it is a boolean');
  });
});
