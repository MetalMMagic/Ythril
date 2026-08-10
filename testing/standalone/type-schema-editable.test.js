/**
 * Every field a space's type schema accepts must be REACHABLE from the editor.
 *
 * ## The failure this exists for
 *
 * `retention` shipped end to end — the API accepted it, the sweep applied it, the Danger Zone listed the
 * windows a type had, the integration guide said *"set a type's window on the type, in the Schema tab"*, and
 * the release notes announced it. There was no such control. The only way to configure the middle tier of
 * `record > schema > space` was a hand-written `PATCH`, and a canary operator found that out by looking for
 * the input the documentation promised.
 *
 * Nothing was red. Each layer was individually correct; the gap was between them, and the layer that could
 * have caught it — a test asserting the editor covers what the API takes — did not exist.
 *
 * ## Two directions, because the pair is what breaks
 *
 *  1. every key the inline `TypeSchemaZ` accepts is written by the client's `typeSchemaFromState()`;
 *  2. the schema LIBRARY's own schema still refuses `retention` — three code comments, a documented bullet
 *     and the `withRetention: false` call all assert that a library entry cannot carry a delete window. If
 *     someone adds the field there, those become wrong silently.
 *
 * Plus a floor: if the parse stops matching, an empty key list would pass while checking nothing.
 *
 * Run: node --test testing/standalone/type-schema-editable.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const API    = 'server/src/api/spaces.ts';
const LIB    = 'server/src/api/schema-library.ts';
const EDITOR = 'client/src/app/pages/settings/space-settings-state.service.ts';
const TAB    = 'client/src/app/pages/settings/space-schema-tab.component.ts';
// The editing BODY moved out of the tab into a shared component so the Brain Overview could open the same
// editor. The controls did not change; the file holding them did, and this gate names the file.
const BODY   = 'client/src/app/pages/settings/schema-type-editor.component.ts';

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Fields exempt from needing a control, each with the reason.
 *
 * An entry here is a decision, not a shortcut: the field must still be PRESERVED across a save (which the
 * round-trip specs pin), it just has no input of its own.
 */
const NO_CONTROL = {
  tagSuggestions: 'retired in #365 — the editor reached nothing (record forms suggest from tags in use, and '
    + 'MCP schema guidance never read it). Stored values are round-tripped untouched, not editable.',
};

/** The keys of the inline (non-$ref) branch of `TypeSchemaZ` in the spaces API. */
function apiTypeSchemaKeys() {
  const src = read(API);
  const start = src.indexOf('const TypeSchemaZ =');
  assert.ok(start > 0, `TypeSchemaZ not found in ${API}`);
  const end = src.indexOf('const TypeSchemasZ =', start);
  assert.ok(end > start, `could not find the end of TypeSchemaZ in ${API}`);
  const block = src.slice(start, end);
  // The $ref branch comes first and holds only `$ref`; everything after it is the inline branch.
  const inline = block.slice(block.indexOf('// Inline schema definition'));
  assert.ok(inline.length > 100, 'the inline branch of TypeSchemaZ could not be isolated');
  return [...inline.matchAll(/^\s{4}([a-zA-Z][\w]*):\s*z\./gm)].map(m => m[1]);
}

describe('a space type schema is editable in the UI', () => {
  it('parsed the API schema — the pattern still matches', () => {
    const keys = apiTypeSchemaKeys();
    assert.ok(keys.length >= 4, `only found ${keys.length} inline TypeSchemaZ fields: ${keys.join(', ')}`);
    for (const expected of ['namingPattern', 'propertySchemas', 'retention']) {
      assert.ok(keys.includes(expected), `expected ${expected} among ${keys.join(', ')}`);
    }
  });

  it('the client serialiser writes every field the API accepts', () => {
    const editor = read(EDITOR);
    const start = editor.indexOf('export function typeSchemaFromState');
    assert.ok(start > 0, `typeSchemaFromState not found in ${EDITOR} — it is the single state -> wire mapper`);
    const body = editor.slice(start, editor.indexOf('\n}', start));

    const unreachable = apiTypeSchemaKeys()
      .filter(k => !(k in NO_CONTROL))
      .filter(k => !new RegExp(`ts\\.${k}\\s*=`).test(body));

    assert.deepEqual(unreachable, [], 'these fields are accepted by PATCH /api/spaces/:id but never written by '
      + `the editor, so the only way to set them is a hand-written request:\n  ${unreachable.join('\n  ')}\n\n`
      + 'Add a control on the Schema tab and emit the field in typeSchemaFromState(), or add it to NO_CONTROL '
      + 'with the reason it has none.');
  });

  it('every exemption still names a real field, so the list cannot rot', () => {
    const keys = apiTypeSchemaKeys();
    for (const k of Object.keys(NO_CONTROL)) {
      assert.ok(keys.includes(k), `NO_CONTROL lists ${k}, which the API no longer accepts — drop the entry`);
      assert.ok(NO_CONTROL[k].length > 40, `${k}'s exemption needs a reason, not a placeholder`);
    }
  });

  it('the type editor actually binds the retention inputs', () => {
    // The serialiser writing a field proves the SAVE works; only a binding proves a human can set it.
    //
    // Read from the shared editor component rather than the tab: the body moved there so the Brain Overview
    // could open the same editor in place. The binding is now against the injected draft — `d().<field>` —
    // rather than a reach through the settings-page state service, which is precisely the coupling the move
    // removed. If it moves again, re-point this; do not relax it.
    const body = read(BODY);
    for (const field of ['retentionDays', 'retentionContentDays']) {
      assert.match(body, new RegExp(`\\[\\(ngModel\\)\\]="d\\(\\)\\.${field}"`),
        `no input is bound to ${field} in the type editor (${BODY})`);
    }
  });

  it('a library entry still cannot carry a retention window', () => {
    // Asserted from the library's own schema, because `withRetention: false`, three code comments and a
    // documented bullet all depend on it. Adding `retention` here without resolving $ref at write time would
    // store a window that never fires.
    const lib = read(LIB);
    const start = lib.indexOf('const LibraryTypeSchemaZ =');
    assert.ok(start > 0, `LibraryTypeSchemaZ not found in ${LIB}`);
    const block = lib.slice(start, lib.indexOf('}).strict()', start));
    // ACCEPTS, not mentions. The field may be declared as `z.never(...)` — that refuses it while giving the caller
    // the reason instead of a bare `Unrecognized key(s)`, which is strictly better than omitting it. A substring
    // check on `retention:` could not tell those apart and failed on the version that improved the error.
    const declared = /retention:\s*z\.(\w+)/.exec(block);
    assert.ok(!declared || declared[1] === 'never',
      `LibraryTypeSchemaZ declares retention as z.${declared?.[1]}, which ACCEPTS it — but nothing resolves a `
      + '$ref when retention is read (see chrono-retention.ts / ttl.ts, which use the RAW space meta). Either '
      + 'resolve refs there first, or keep the field refused — and update the UI copy either way: '
      + 'the Schema tab tells the operator a saved-to-library type loses its window.');
  });

  it('one factory builds the editor state, so a tenth call site cannot drop a field', () => {
    // The settings dialog had NINE hand-written copies of TypeSchemaState. The compiler catches a missing
    // field only while every copy is spelled out; the moment one spreads a partial, it does not.
    const offenders = [];
    for (const f of [EDITOR, TAB, 'client/src/app/pages/settings/spaces.component.ts']) {
      const src = read(f);
      const hits = [...src.matchAll(/_newTagInput:/g)].length;
      const allowed = f === EDITOR ? 2 : 0;   // the interface field, and the factory itself
      if (hits > allowed) offenders.push(`${f} (${hits} literal(s), expected ${allowed})`);
    }
    assert.deepEqual(offenders, [], 'build editor state with emptyTypeSchemaState() instead of an object '
      + `literal:\n  ${offenders.join('\n  ')}`);
  });
});
