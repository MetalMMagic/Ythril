/**
 * A write tool's schema says what a validation refusal MEANS, and which half is the caller's fault.
 *
 * ## Why this is the write tools' version of the X-2 gap
 *
 * The read tools were missing their response shape. The write tools are missing their REFUSAL shape, which is
 * worse: a refusal is the only response a caller has to branch on, and `introduced` versus `preExisting` is
 * the branch. Nothing said so.
 *
 * It changed underneath callers this release, too. Until #920 both halves refused the write; now a violation
 * the record already carried is REPORTED and does not block, so an unrelated edit is never stopped by a field
 * somebody else broke. A caller that treats any `violations` array as failure is now wrong in a new way —
 * it will report a successful write as an error.
 *
 * ## The other two facts a write tool must state
 *
 * **What the write DOES to an existing record.** `upsert_entity` merges and validates the merged form, which
 * is why a partial upsert of a conformant record is accepted when the fragment alone would fail. `remember`
 * is always an insert and deduplicates nothing, so the same fact stored twice competes with itself in recall.
 *
 * **That embedding is asynchronous.** The write returns before the vector exists, so a recall seconds later
 * can miss it — and `includeFreshWrites` is the escape hatch. This one is measurable as a broken feature: a
 * probe that writes and immediately searches finds nothing and concludes search is down.
 *
 * Run: node --test testing/standalone/write-tools-say-what-a-refusal-means.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const toolText = (file, name) => {
  const src = readFileSync(file, 'utf8');
  const at = src.indexOf(`name: '${name}'`);
  assert.ok(at > 0, `${name} was not found in ${file} — the scanner is wrong, not the code`);
  const next = src.indexOf("name: '", at + 20);
  return next === -1 ? src.slice(at) : src.slice(at, next);
};

const UPSERT_ENTITY = toolText('server/src/mcp/tools/entity.ts', 'upsert_entity');
const REMEMBER = toolText('server/src/mcp/tools/memory.ts', 'remember');

describe('both write tools explain the refusal shape', () => {
  for (const [label, text] of [['upsert_entity', UPSERT_ENTITY], ['remember', REMEMBER]]) {
    it(`${label} names introduced vs preExisting and says which one refuses`, () => {
      assert.match(text, /introduced/, 'name the half that is the caller\'s fault');
      assert.match(text, /preExisting/, 'name the half that is not');
      assert.match(text, /do NOT block|does NOT block|do NOT refuse/i,
        'say that a pre-existing violation is reported rather than refusing — it changed this release');
      assert.match(text, /Branch on `introduced`/,
        'tell the caller which field to branch on, or the distinction is decoration');
    });
  }
});

describe('each says what its write does to what is already there', () => {
  it('upsert_entity: it merges, and validates the MERGED form', () => {
    // The reason a partial upsert of a conformant record is accepted when the fragment alone would fail.
    assert.match(UPSERT_ENTITY, /MERGES/, 'say that an upsert onto an existing record merges');
    assert.match(UPSERT_ENTITY, /MERGED form/,
      'and that validation runs on the result, not on the fragment');
  });

  it('upsert_entity: omitting id always INSERTS, and names deduplicate nothing', () => {
    assert.match(UPSERT_ENTITY, /Two entities may share a name/,
      'the obvious wrong assumption is that a name is an identity');
    assert.match(UPSERT_ENTITY, /find_entities_by_name/, 'point at the tool that answers it');
  });

  it('remember: always an insert, and duplicates compete with each other', () => {
    assert.match(REMEMBER, /Always an INSERT/, 'there is no id to update');
    assert.match(REMEMBER, /compete for the same result slots/,
      'the cost of a duplicate is not storage, it is recall quality');
  });
});

describe('remember says the embedding is asynchronous', () => {
  it('warns that a recall seconds later can miss the write', () => {
    // Measurable as a broken feature: write, search, find nothing, conclude search is down.
    assert.match(REMEMBER, /ASYNCHRONOUS/, 'the write returns before the vector exists');
    assert.match(REMEMBER, /includeFreshWrites: true/,
      'name the escape hatch — knowing about the delay without the remedy is half an answer');
  });

  it('tells the caller to write a self-contained sentence', () => {
    // An embedding of "he agreed to the change" is unusable, and the failure only appears months later.
    assert.match(REMEMBER, /carries its own context/,
      'a memory is retrieved without the conversation it was written in');
  });
});
