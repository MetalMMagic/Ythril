/**
 * The knowledge types are enumerated ONCE per side of the wire.
 *
 * ## The rule, and where it was written twenty times
 *
 * A space's knowledge is four kinds of record — entity, memory, edge, chrono — and that list decides more
 * than a type union. It decides which kinds a space can hold a type schema for, which kinds the schema
 * library will accept, which kinds appear in an audit summary, which kinds have a retention bucket, and
 * which collections a redaction sweep walks.
 *
 * Measured 2026-09-03: **twenty sites across `server/src` and `client/src` write the four names out as a
 * literal list.** Five in the schema-library route alone, four in the spaces route, plus the audit summary,
 * the redaction sweep, both TTL maps, and the client's own mirror and its three consumers.
 *
 * ## Why this is a gate rather than a tidy-up
 *
 * `M-2` adds a FIFTH: one link knowledge type, so a relationship between records becomes a record. With the
 * list written out twenty times, adding it means finding twenty sites — and every one missed is silent in
 * its own way. A schema library that refuses link schemas. An audit summary with a kind missing. A retention
 * bucket that never expires anything, because nothing maps the kind to a collection.
 *
 * None of those throw. Each is a feature quietly absent for one kind of record, which is the same shape as
 * the five capabilities that shipped REST-only because a route was written and its tool "would follow".
 *
 * So the enumeration is extracted BEFORE the fifth member is added, and this gate is what stops the
 * twenty-first copy: with one tuple per side, adding a kind is one edit, and adding one with its own list is
 * what fails.
 *
 * ## Why per SIDE and not once overall
 *
 * `client/src/app/core/api.types.ts` is the client's deliberate mirror of the API's shapes — its own
 * docblock says its consumers import one module on purpose, and the client does not import from `server/`.
 * So two definitions, one per side, and the mirror is the client's single source.
 *
 * Run: node --test testing/standalone/one-definition-of-the-knowledge-types.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

const ROOT = process.cwd();

/** The two files allowed to name the kinds: one per side of the wire. */
const DECLARATIONS = [
  'server/src/config/types-knowledge.ts',
  'client/src/app/core/api.types.ts',
];

function sourceFiles() {
  return execFileSync('git', ['ls-files', 'server/src', 'client/src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'));
}

/**
 * Every run naming ALL FOUR kinds as adjacent quoted literals or union members — a copy of the enumeration.
 *
 * ## Why all four and not three, which the first draft required
 *
 * Three-of-four looked like the worse case: a partial list looks deliberate and the missing kind is
 * invisible. Run that way it reported 48 sites and it was WRONG about several of them, because this repo has
 * three different unions over these names and only one of them is the enumeration:
 *
 *   - `KnowledgeType` — the four kinds a space holds. This is the one being extracted.
 *   - `RefKind` — what a reference can point AT: entity, memory, chrono, and `file`. Its own docblock says
 *     *"Deliberately not KnowledgeType, and the difference is not cosmetic"*, so a site naming those three
 *     is a different set on purpose.
 *   - Per-feature subsets: the duplicate and contradiction scanners cover memory, entity and chrono, and
 *     leaving edges out is a decision each of them documents.
 *
 * A gate that cannot tell a copy from a deliberately different set makes the different sets look like debt,
 * and the way to shut it up is to widen them — which would be a real defect introduced by a check. So it
 * asks the unambiguous question: does this site write out the WHOLE list? Nothing but a copy does that.
 */
function enumerationsIn(src) {
  const clean = stripComments(src);
  const KINDS = ['entity', 'memory', 'edge', 'chrono'];
  const hits = [];
  // A run of quoted kind names — `file` included, so a five-member run is recognised and then excluded.
  const run = /(['"])(?:entity|memory|edge|chrono|file)\1(?:\s*[,|]\s*(['"])(?:entity|memory|edge|chrono|file)\2)+/g;
  for (const m of clean.matchAll(run)) {
    const has = n => m[0].includes(`'${n}'`) || m[0].includes(`"${n}"`);
    const named = KINDS.filter(has);
    // The four kinds AND NOT `file`. A run that includes `file` is the OTHER enumeration — see the note
    // above `RECORD_TYPES_NOT_YET_ONE_TUPLE` below.
    if (named.length === KINDS.length && !has('file')) hits.push({ text: m[0].replace(/\s+/g, ' '), named });
  }
  return hits;
}

/**
 * THE SECOND ENUMERATION, and why it is not this gate's subject yet.
 *
 * Sixteen sites write out the four kinds PLUS `file` — the set of every record type that can be embedded,
 * recalled or retained. It lives under five different aliases for one set: `RecallKnowledgeType`,
 * `BrainEmbedRecordType`, `DupeScanType`, `TtlBucket`, and `EMBED_RECORD_TYPES`.
 *
 * **It is not folded in here because its ORDER is not consistent today**, and deriving it would silently
 * change that. Most sites write `memory, entity, edge, chrono, file`; `record-ttl.ts` writes
 * `entity, memory, ...` and its comment says the order is *"the order the UI shows them"*. Derive one tuple
 * from `KNOWLEDGE_TYPES` and the memory-first sites become entity-first — which reorders the chips in the
 * query tab, reorders an MCP tool schema's published enum, and changes the order recall's default type list
 * is processed in.
 *
 * Every one of those may well be harmless. None of them is harmless *by inspection*, and a reordering that
 * arrives inside a refactor nobody expected to change behaviour is the shape worth refusing. Filed as its
 * own item so the order question gets checked rather than assumed.
 */


describe('the knowledge types are named in one place per side', () => {
  it('no file re-enumerates them', () => {
    const offenders = [];
    for (const f of sourceFiles()) {
      if (DECLARATIONS.includes(f)) continue;
      const hits = enumerationsIn(readFileSync(f, 'utf8'));
      for (const h of hits) offenders.push(`${f} — ${h.text.slice(0, 72)}`);
    }
    assert.deepEqual(
      offenders,
      [],
      `${offenders.length} site(s) write the knowledge types out instead of importing the one tuple:\n`
      + offenders.map(o => `  ${o}`).join('\n')
      + `\n\nM-2 adds a fifth kind. Every list here is a site that has to be found, and each one missed is a`
      + `\nfeature silently absent for one kind of record rather than an error.`,
    );
  });

  it('and each declaration file actually declares it, so the exemption is not a hole', () => {
    // An exemption that names a file which no longer declares anything would quietly let that whole file
    // re-enumerate. The point of the list is one definition, not two blessed files.
    for (const f of DECLARATIONS) {
      const clean = stripComments(readFileSync(f, 'utf8'));
      assert.match(
        clean,
        /KNOWLEDGE_TYPES\s*=/,
        `${f} is exempt from the rule above because it is meant to be the declaration — so it has to hold a `
        + '`KNOWLEDGE_TYPES` tuple. Without one, the exemption is just a file where copies are allowed.',
      );
    }
  });
});
