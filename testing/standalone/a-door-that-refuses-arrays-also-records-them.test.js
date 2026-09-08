/**
 * Every door that can refuse a legacy array write also records one — because they are the same inspection.
 *
 * ## What the pre-flight is for
 *
 * `completeLinkage` makes a space refuse `entityIds` / `memoryIds` / `chronoIds`, which is correct and is
 * opt-in. The canary operator's point (4.0.0 report, 2026-09-06 §5) is that the refusal lands on the
 * caller's NEXT WRITE rather than at conversion time: an operator converts, and finds out which of their
 * writers still use the old surface when one of them breaks. They would have had five and knew none of them
 * without grepping their own repositories.
 *
 * So the question is *"who wrote arrays to this space lately"*, and the only moment that fact exists is the
 * write itself.
 *
 * ## Why not the audit log, which looks like the answer
 *
 * It already records these field names per entry with a token, a label, a space and a time. Two things kill
 * it, and both UNDER-REPORT SILENTLY, which is worse than not answering:
 *
 *  - `AUDIT_CHANGE_FIELDS` covers `memory.update`, `chrono.update` and `file.meta.update`. A CREATE carrying
 *    `entityIds` records nothing — and a newly written caller is the one an operator most needs to hear
 *    about.
 *  - `changes` expire on their own short clock (`DEFAULT_RECORD_CHANGE_RETENTION_DAYS`, 14) because they
 *    carry user content. The ask is 30 days.
 *
 * A pre-flight built on it would answer "2 writers" where the truth is five, and say nothing about having
 * looked at half the window and none of the creates.
 *
 * ## What this gate asserts, and why it is the RULE rather than the sites
 *
 * A door that inspects a body for link arrays has all the facts the recorder needs. A door that inspects and
 * does not record is a hole in the pre-flight that nothing else can see — the count is simply lower, and a
 * lower count reads exactly like a cleaner space. So: the set of doors is DERIVED from who imports the
 * inspection at all, and every one of them must pass the actor through. A refusal-only call cannot record,
 * and this is what refuses to let one be written.
 *
 * Run: node --test testing/standalone/a-door-that-refuses-arrays-also-records-them.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { trackedSources } from './_sources.mjs';

const src = (p) => stripComments(readFileSync(p, 'utf8'));

/**
 * Every tracked source that reaches the array-write inspection, from git rather than a list.
 *
 * A list here would be the same defect the module itself documents: `LINK_ARRAY_FIELDS` is derived so that a
 * seventh link class is refused by the commit that declares it. A hand-written door list would be stale the
 * first time somebody adds an eighth door, and this gate would report clean about it.
 */
function doorFiles() {
  // `trackedSources`, not a hand-rolled `git ls-files`: it NUL-splits, so a path containing a space is not
  // silently dropped from the sweep, and it asserts a floor so a broken pathspec fails instead of reporting
  // clean. Six sweeps wrote that loop themselves before it was a module, and this gate is not the seventh.
  return trackedSources(['server/src'], { exclude: [/array-write-refusal\.ts$/] })
    // Stripped, so a file that only MENTIONS the function in a doc comment is not a door. `write-shape.ts`
    // names it in a comment explaining why its own refusals return a string, and it inspects nothing.
    .filter(f => /arrayWriteError|linkArrayFieldsNamed/.test(stripComments(readFileSync(f, 'utf8'))));
}

describe('the inspection is one function, and the doors are found not listed', () => {
  const doors = doorFiles();

  it('found the doors', () => {
    // A floor, because an empty set passes every loop below it. Seven was the count when M-2 shipped and the
    // number is not asserted — only that the derivation returned a real set.
    assert.ok(doors.length >= 6, `only ${doors.length} files reach the array-write inspection`);
  });

  it('nobody re-derives which fields are link arrays', () => {
    // The module exports `LINK_ARRAY_FIELDS`, derived from `LINK_CLASSES`. A door that spells the three
    // names itself is a second implementation that a seventh link class would not reach.
    const offenders = doors.filter(f => /\[\s*'entityIds'\s*,\s*'memoryIds'/.test(src(f)));
    assert.deepEqual(offenders, [],
      `these spell the link-array field names themselves instead of reading LINK_ARRAY_FIELDS: ${offenders.join(', ')}`);
  });
});

describe('a door that can refuse also records', () => {
  const doors = doorFiles();

  it('every door passes the actor to the inspection', () => {
    /*
     * The whole gate. Refusing and recording are the same inspection of the same body, and the only thing
     * the recorder needs beyond it is WHO — which every door already holds: REST as `req.authToken`, MCP as
     * the `actor` on its tool context.
     *
     * A door calling the inspection without an actor still refuses correctly and records nothing, so the
     * pre-flight simply reports a smaller number. Nothing errors, nothing logs, and a smaller number is
     * indistinguishable from a cleaner space — which is why this is asserted rather than remembered.
     */
    const missing = doors.filter(f => !/actor\s*:/.test(callToInspection(src(f))));
    assert.deepEqual(missing, [],
      'these doors inspect a write body for link arrays and do not say who wrote it, so their callers are '
      + `invisible to the conversion pre-flight: ${missing.join(', ')}`);
  });

  it('the recorder cannot fail a write', () => {
    // An advisory observation that can 500 a write is worse than no observation. The recorder is fired and
    // not awaited, and its rejection is caught inside the module — asserted here because a future edit that
    // awaits it turns a slow Mongo into failed writes on the hot path.
    const mod = src('server/src/brain/legacy-array-writers.ts');
    assert.match(mod, /\.catch\(/, 'the recorder must swallow its own failure');
  });

  it('the pre-flight reports the window it covers, rather than assuming one', () => {
    // The failure the audit log would have had. A count with no window on it cannot be told apart from a
    // count over a shorter window, and the operator is about to make an irreversible-feeling decision on it.
    const mod = src('server/src/brain/legacy-array-writers.ts');
    assert.match(mod, /since/i, 'the answer must carry the window it was computed over');
  });
});

/** The argument list of the call to the inspection, as written in this file. */
function callToInspection(s) {
  const at = s.search(/arrayWriteError\s*\(/);
  if (at < 0) return '';
  // To the matching close paren — a call is one expression, so bracket-count rather than a character window.
  let depth = 0;
  for (let i = s.indexOf('(', at); i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return s.slice(at, i + 1);
  }
  return s.slice(at);
}
