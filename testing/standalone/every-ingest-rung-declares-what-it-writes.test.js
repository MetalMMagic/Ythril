/**
 * Every benchmark ingest strategy must declare a schema, and every record it writes must satisfy it.
 *
 * ## What goes wrong without this, and it is not an exception
 *
 * A benchmark's output is a NUMBER. When an application's corpus is malformed something throws and somebody
 * looks; when a benchmark's corpus is malformed the run completes and reports a score. A missing field reads
 * as a finding about retrieval, which is the most expensive kind of wrong available here — two experiments
 * were lost to exactly that in one afternoon, and the sharpest case is `properties.turn`: it is how a result
 * is joined back to the answer key, so a strategy that stops writing it does not score badly, it scores ZERO.
 *
 * The instance can refuse all of that, because a space defaults to `validationMode: 'strict'` and a declared
 * collection's keys are an allowlist. But **strict mode with no schema validates nothing** — there is no rule
 * for an undeclared type, so there is nothing to violate and every malformed record is accepted. Declaring
 * the shape is what turns the guarantee on, and this gate is what stops a new strategy quietly skipping it.
 *
 * ## Why it runs the ingest rather than reading it
 *
 * A gate that greps for `type:` and `properties:` in the source concludes about what a module CONTAINS, not
 * what it writes: it cannot see a computed key, a delegated write, or a branch. These strategies delegate to
 * each other — one writes its turns through another's ingest — so the source of a module is not the list of
 * records it produces.
 *
 * So the ingest is executed, against a synthetic conversation and a fake client that validates instead of
 * storing. No server, no network, milliseconds. What it checks is what the instance would check, which is the
 * point: a schema that passes here is a schema that will not fail an hour into a run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ingestDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'benchmarks', 'harness', 'ingest');

/** Which collection a write lands in. The client's own route map, in the direction this gate needs. */
const COLLECTION = { memory: 'memory', entity: 'entity', edge: 'edge', chrono: 'chrono' };

/**
 * A conversation with the shape the loader produces, small enough to run in a millisecond.
 *
 * TWO sessions and repeated words on purpose: the strategies that link across sessions require a term to
 * appear in more than one, and a single-session fixture would exercise none of that code — the gate would
 * pass by never reaching the writes it exists to check.
 *
 * `Marion` recurs by name across both sessions for the same reason. The subject strategy keeps a capitalised
 * word only when it appears at least three times in at least two sessions, and a fixture without one made it
 * write NOTHING — which this gate reports, correctly, as a strategy that would score zero.
 */
function fixture() {
  const turn = (session, n, speaker, text) => ({ id: `D${session}:${n}`, speaker, text });
  return {
    id: 'conv-fixture',
    speakers: ['Ada', 'Grace'],
    sessions: [
      {
        index: 1,
        startsAt: '2023-05-08T10:00:00',
        turns: [
          turn(1, 1, 'Ada', 'I have been reading about adoption again this week.'),
          turn(1, 2, 'Grace', 'Adoption is a big step. Did your mentor have advice about adoption?'),
          turn(1, 3, 'Ada', 'Marion my mentor said the paperwork takes months.'),
          turn(1, 4, 'Grace', 'That sounds slow. Anything else from Marion?'),
          turn(1, 5, 'Ada', 'She also mentioned a support group nearby.'),
        ],
      },
      {
        index: 2,
        startsAt: '2023-06-27T10:00:00',
        turns: [
          turn(2, 1, 'Grace', 'How did the adoption paperwork go?'),
          turn(2, 2, 'Ada', 'Marion helped me finish it. The support group helped too.'),
          turn(2, 3, 'Grace', 'Good. Was the group useful about adoption specifically?'),
          turn(2, 4, 'Ada', 'Very. Marion introduced me to the group.'),
        ],
      },
    ],
  };
}

/** The value rules the instance applies — `spaces/schema-validation.ts`, in the subset these schemas use. */
function violationsFor(value, schema, field) {
  const out = [];
  if (value === undefined || value === null) {
    if (schema.required) out.push(`${field}: required property is missing`);
    return out;
  }
  if (schema.type === 'number' && typeof value !== 'number') out.push(`${field}: expected a number, got ${typeof value}`);
  if (schema.type === 'string' && typeof value !== 'string') out.push(`${field}: expected a string, got ${typeof value}`);
  if (schema.type === 'boolean' && typeof value !== 'boolean') out.push(`${field}: expected a boolean, got ${typeof value}`);
  if (schema.type === 'date' && typeof value !== 'string') out.push(`${field}: a date is stored as an ISO string`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${field}: ${value} is below the minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${field}: ${value} is above the maximum ${schema.maximum}`);
  }
  if (typeof value === 'string' && schema.pattern) {
    /*
     * The instance REFUSES to run a pattern it considers a ReDoS risk and reports that refusal as "the value
     * does not match" (`F-25`). Reproduced here rather than papered over: a pattern that would be refused on
     * the instance must fail here too, or this gate passes a schema that rejects every record in production.
     */
    const risky = /\((?:\?:)?(?![-/:](?![?*{]))([^)]*[+*])\)([+*?]|\{)/.test(schema.pattern)
      || /\([^)]*\|[^)]*\)([+*?]|\{)/.test(schema.pattern);
    if (risky) out.push(`${field}: the pattern ${schema.pattern} would be refused as a ReDoS risk, and a refused pattern rejects every value`);
    else if (!new RegExp(schema.pattern).test(value)) out.push(`${field}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
  }
  if (schema.enum && !schema.enum.includes(value)) out.push(`${field}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  return out;
}

/** A client that validates instead of storing, and records what it was asked to write. */
function validatingClient(typeSchemas, seen) {
  const entityTypeOf = new Map();
  let n = 0;

  const check = (kind, record) => {
    const declared = typeSchemas?.[COLLECTION[kind]];
    const key = kind === 'edge' ? record.label : record.type;
    seen.push(`${kind}:${key}`);

    assert.ok(declared, `writes a ${kind} but the rung declares no \`typeSchemas.${COLLECTION[kind]}\``);
    const schema = declared[key];
    assert.ok(schema, `writes ${kind} \`${key}\`, which is not a key of typeSchemas.${COLLECTION[kind]} — `
      + `the instance treats those keys as an allowlist, so this write is a 400. Declared: ${Object.keys(declared).join(', ') || '(none)'}`);

    const problems = [];
    for (const [name, propSchema] of Object.entries(schema.propertySchemas ?? {})) {
      problems.push(...violationsFor(record.properties?.[name], propSchema, `properties.${name}`));
    }
    if (schema.namingPattern && typeof record.name === 'string' && !new RegExp(schema.namingPattern).test(record.name)) {
      problems.push(`name: ${JSON.stringify(record.name)} does not match ${schema.namingPattern}`);
    }
    if (kind === 'edge' && schema.endpoints) {
      const from = entityTypeOf.get(record.from);
      const to = entityTypeOf.get(record.to);
      if (schema.endpoints.from && from && !schema.endpoints.from.includes(from)) {
        problems.push(`from: a ${from} may not start a '${record.label}' edge (allowed: ${schema.endpoints.from.join(', ')})`);
      }
      if (schema.endpoints.to && to && !schema.endpoints.to.includes(to)) {
        problems.push(`to: a ${to} may not end a '${record.label}' edge (allowed: ${schema.endpoints.to.join(', ')})`);
      }
    }
    assert.deepEqual(problems, [], `a ${kind} it writes would be refused by its own schema:\n  ${problems.join('\n  ')}`);
  };

  const write = kind => async (_space, record) => {
    check(kind, record);
    const id = `id-${++n}`;
    if (kind === 'entity') entityTypeOf.set(id, record.type);
    return { id, _id: id };
  };

  return {
    writeMemory: write('memory'),
    writeEntity: write('entity'),
    writeEdge: write('edge'),
    writeChrono: write('chrono'),
    refId: (_space, local) => local,
    coverage: () => new Map(),
  };
}

// `_`-prefixed files are shared pieces the strategies import, not strategies. The prefix is the rule so a
// new shared module needs no edit here — and a strategy cannot hide from this gate by being renamed,
// because the runner would not find it either.
const modules = readdirSync(ingestDir)
  .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
  .sort();

test('there are ingest strategies to check', () => {
  // A floor: an empty directory would make every test below vacuous and the suite would report clean.
  assert.ok(modules.length >= 5, `found ${modules.length} ingest modules, which is fewer than this folder holds`);
});

for (const file of modules) {
  test(`${file} declares a schema and writes records that satisfy it`, async () => {
    const mod = await import(pathToFileURL(join(ingestDir, file)).href);
    if (mod.needsModel === true) return;   // Not runnable without an answerer; out of scope for this gate.

    assert.ok(mod.typeSchemas, `${file} declares no \`typeSchemas\`. Without one the space validates NOTHING — `
      + 'strict mode has no rule for an undeclared type, so every malformed record is accepted and the run '
      + 'reports a score instead of an error.');

    const seen = [];
    await mod.ingest({ conversation: fixture(), ythril: validatingClient(mod.typeSchemas, seen), space: 'fixture' });

    assert.ok(seen.length > 0, `${file} wrote no records at all for a two-session conversation. A strategy `
      + 'that writes nothing scores zero and reads as a retrieval result.');
  });
}
