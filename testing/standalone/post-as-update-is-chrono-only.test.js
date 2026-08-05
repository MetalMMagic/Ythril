/**
 * `POST /:id` as an update exists for chrono and for nothing else — and the docs now say so.
 *
 * ## Why this needed a gate rather than a note
 *
 * The asymmetry was reported as a bug ("POST to a memory id returns 200 and changes nothing"). The 200 did
 * not reproduce — both the current and the legacy path shapes answer **404** — but the asymmetry underneath
 * it is real, and it was documented nowhere. It reads as a bug from either direction depending on which
 * type you met first, which is exactly the kind of thing a reader discovers at the wrong moment.
 *
 * The resolution was NOT to add `POST /memories/:id` for symmetry. That would spread a deprecated shape to a
 * second type to make it look tidy. The chrono route predates the retry-safety design and duplicates it —
 * a client-supplied UUID v4 in the COLLECTION POST already makes a create idempotent for every type — so it
 * is documented as legacy and listed for removal.
 *
 * This gate holds the two halves together: the route set stays as it is, and the guide keeps saying so. A
 * doc that describes a route table nobody re-checks is how the previous drift happened.
 *
 * Run: node --test testing/standalone/post-as-update-is-chrono-only.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Comments stripped, so the gate cannot pass on the prose that documents it. */
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join('\n');

/** A `POST /…/<collection>/:id` route — the update-by-id shape, as opposed to the collection POST. */
const postById = (src, router, collection) =>
  new RegExp(`${router}\\.post\\('/spaces/:spaceId/${collection}/:id'`).test(src);

describe('POST-as-update is chrono-only, and documented', () => {
  it('chrono has it and the other three do not', () => {
    const found = {
      memory: postById(code('server/src/api/brain/memories.ts'), 'memoriesRouter', 'memories'),
      entity: postById(code('server/src/api/brain/entities.ts'), 'entitiesRouter', 'entities'),
      edge: postById(code('server/src/api/brain/edges.ts'), 'edgesRouter', 'edges'),
      chrono: postById(code('server/src/api/brain/chrono.ts'), 'chronoRouter', 'chrono'),
    };
    assert.deepEqual(found, { memory: false, entity: false, edge: false, chrono: true },
      'Adding POST-as-update to another type spreads a DEPRECATED shape to make things look symmetrical. '
      + 'The supported idempotent create is a client-supplied UUID v4 in the collection POST. If chrono\'s '
      + 'route has finally been removed, delete this gate and its deprecation entry together.');
  });

  it('the detector can actually see a route of that shape', () => {
    // Mutation-check the matcher before trusting a negative. A regex that matches nothing reports every
    // codebase clean, and three gates in this repo have passed on planted bugs.
    assert.equal(postById("chronoRouter.post('/spaces/:spaceId/chrono/:id', handler)", 'chronoRouter', 'chrono'), true);
    assert.equal(postById("memoriesRouter.post('/spaces/:spaceId/memories', handler)", 'memoriesRouter', 'memories'), false,
      'a COLLECTION post must not be mistaken for an update-by-id route');
  });

  it('the guide states the asymmetry rather than leaving it to be discovered', () => {
    const guide = readFileSync(join(ROOT, 'docs/integration-guide/04-brain-api.md'), 'utf8');
    assert.match(guide, /Updating by id: use PATCH/, 'the section exists');
    assert.match(guide, /memories\/:id`? is \*\*404\*\*|`no` \(404\)|\*\*no\*\* \(404\)/,
      'the guide says plainly that POST to a memory id is a 404, not an update');
    assert.match(guide, /legacy/i, 'and marks the chrono form as legacy rather than as an option');
  });
});
