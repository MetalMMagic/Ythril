/**
 * `wipe_space` says it does not propagate — and the claim is pinned to the code that makes it true.
 *
 * ## The finding
 *
 * Every `delete_*` tool writes a tombstone, because a tombstone is the only thing that tells a peer a record
 * is gone. `wipeSpace` does the opposite: it deletes the documents and then deletes the **tombstones** as
 * well — `${spaceId}_tombstones` wholesale on a full wipe, filtered by type on a partial one, and
 * `${spaceId}_file_tombstones` when files are included. It writes none.
 *
 * So on a space in a sync network the result is an empty space with no record of any deletion, facing a peer
 * that still offers everything it holds. This codebase states the consequence in three separate places —
 * `delete-cascade.ts`: *"Propagate the deletion to sync peers, else the peer's manifest re-pushes the file"* —
 * so the outcome is its own documented mechanism, not a guess.
 *
 * The old description said *"The space itself and its configuration are preserved"* and nothing about sync,
 * which reads as though the data is gone for good.
 *
 * Filed as **X-5**: the real fix is an owner call between propagating the wipe, refusing on a networked space
 * without a flag, and leaving it documented. Saying so is the half that ships without choosing for them.
 *
 * Run: node --test testing/standalone/wipe-space-says-it-is-local.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const TOOLS = readFileSync('server/src/mcp/tools/spaces.ts', 'utf8');
const LIFECYCLE = stripComments(readFileSync('server/src/spaces/lifecycle.ts', 'utf8'));

const WIPE = (() => {
  const s = stripComments(TOOLS);
  const at = s.indexOf("name: 'wipe_space'");
  assert.ok(at > 0, 'wipe_space not found — the scanner is wrong, not the code');
  const d = s.indexOf('description:', at);
  const end = s.slice(d).search(/\n {2,}(mutating|spaceRequired|admin|spaceAdmin|inputSchema|async handle):/);
  assert.ok(end > 0, 'could not find the end of wipe_space\'s description');
  return s.slice(d, d + end);
})();

describe('wipe_space warns that it does not reach peers', () => {
  it('says it is LOCAL', () => {
    assert.match(WIPE, /LOCAL WIPE/, 'the single most consequential fact about this tool');
  });

  it('says it writes NO tombstones and removes the existing ones', () => {
    assert.match(WIPE, /NO tombstones/, 'name the mechanism, not just the outcome');
    assert.match(WIPE, /deletes the existing ones/,
      'clearing them is worse than not writing them and has to be said separately');
  });

  it('says what to do instead, so the warning is actionable', () => {
    // A warning with no alternative gets ignored by the caller who still has to empty the space.
    assert.match(WIPE, /leave the network|Wipe every peer/,
      'name at least one way to actually empty a networked space');
    assert.match(WIPE, /delete_\*|delete_/, 'and point at the tools that DO tombstone');
  });

  it('and does not overstate it for a space in no network', () => {
    // Accuracy in the other direction: on an unnetworked space the wipe is simply final, and a caller who
    // reads this as "wipe never works" would go looking for a tool that does not exist.
    assert.match(WIPE, /no network/, 'the unnetworked case must be stated too');
  });
});

describe('the claim matches the implementation', () => {
  it('wipeSpace really deletes tombstones rather than writing them', () => {
    // The assertion that keeps the description honest. If a future change starts WRITING tombstones here,
    // this fails and the warning above must come out.
    assert.match(LIFECYCLE, /col\(`\$\{spaceId\}_tombstones`\)\.deleteMany/,
      'brain tombstones are cleared');
    assert.match(LIFECYCLE, /col\(`\$\{spaceId\}_file_tombstones`\)\.deleteMany/,
      'file tombstones are cleared');
    const at = LIFECYCLE.indexOf('export async function wipeSpace');
    const body = LIFECYCLE.slice(at, LIFECYCLE.indexOf('\nexport ', at + 10));
    assert.doesNotMatch(body, /writeFileTombstones|writeTombstone/,
      'wipeSpace started writing tombstones — it now propagates, so delete the warning');
  });

  it('and the per-record deletes really do write them, which is the contrast drawn', () => {
    const cascade = stripComments(readFileSync('server/src/files/delete-cascade.ts', 'utf8'));
    assert.match(cascade, /writeFileTombstones\(/,
      'if the delete tools stop tombstoning too, the contrast in this description is wrong');
  });

  it('the review queues really are cleared with the data', () => {
    // Stated in the description because a finding is a claim about two records: once they are gone the
    // Review tab lists something that cannot be opened.
    assert.match(WIPE, /review queues/i, 'say it');
    assert.match(LIFECYCLE, /_dupe_candidates`\)\.deleteMany/, 'duplicates');
    assert.match(LIFECYCLE, /_contradiction_candidates`\)\.deleteMany/, 'and contradictions');
  });

  it('omitting `types` really wipes everything', () => {
    // The parameter where a wrong assumption is destructive: an omitted filter is not a safe default.
    assert.match(WIPE, /OMIT IT TO WIPE ALL FIVE/, 'a caller must not read absence as "nothing"');
    assert.match(LIFECYCLE, /types && types\.length > 0 \? types : WIPE_COLLECTION_TYPES/,
      'and that is what the code does');
  });
});
