/**
 * No file grows past the largest we already have, measured in CODE lines.
 *
 * ## Why not raw lines
 *
 * This codebase comments heavily and deliberately. Ranked by raw line count, its two best-documented modules
 * come second and fourth — `config/types.ts` at 1,986 lines is **62% comment**, `brain/recall.ts` at 1,299 is
 * **36%**. A gate built on raw lines would call those the worst files in the repo and the remedy it invited
 * would be deleting the explanations. That is the opposite of what this project wants, and a gate whose fix
 * makes the code worse is one people are right to ignore.
 *
 * Stripping comments and blanks changes the ranking, which is the measurement worth having: `types.ts` falls
 * from 2nd to 11th, `recall.ts` from 4th to 9th, and what rises is a handful of Angular components carrying
 * 6–12% comments and over a thousand lines of code each.
 *
 * ## Why a ratchet rather than a refactor
 *
 * "This component is large" is not a defect. It works, it is covered, and splitting it is a change with real
 * regression risk that nobody asked for. What IS worth guaranteeing is that it stops growing — the failure
 * mode of a god-file is not its size on any given day, it is that every change lands in the same place
 * because that is where the code already is.
 *
 * So: the files already over the line are frozen at their current size, everything else has a ceiling, and
 * both numbers are visible. Reducing one is welcome and only requires lowering its entry.
 *
 * Run: node --test testing/standalone/no-new-god-files.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Source files that carry behaviour. Specs are excluded — a long test file is usually a thorough one. */
function sourceFiles() {
  return execFileSync('git', ['ls-files', 'server/src', 'client/src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'));
}

/** Lines that are neither blank nor comment. Block comments are tracked across lines. */
function codeLines(src) {
  let n = 0, inBlock = false;
  for (const raw of src.split('\n')) {
    const t = raw.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
    if (!t) continue;
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; continue; }
    n++;
  }
  return n;
}

/**
 * Ceiling for a file with no entry below. Set just above the largest file that is NOT already frozen, so a
 * new module has room to be substantial without becoming the next thing on this list.
 */
const CEILING = 650;

/**
 * Files already above the ceiling, frozen at their measured size (2026-08-06).
 *
 * Not an allowlist of things that are fine — a list of what is large, kept visible. Lower a number when a
 * file shrinks; raising one is a decision to make deliberately and to say why in the commit.
 */
const FROZEN = {
  // 676 -> 502. It crossed the 650 ceiling when the rights matrix was wired in, was frozen with a note
  // saying the number should go DOWN rather than up again, and the create dialog came out (Q-5).
  //
  // It is now UNDER the ceiling and stays on this list on purpose: an entry here is a ratchet, and removing
  // it would hand the file back the 148 lines of headroom the extraction just removed. The dialog it lost
  // lives in `token-create-dialog.component.ts` at 207.
  // 502 -> 526: the per-row "edit rights" action, its state, and the saved handler. The DIALOG went to
  // `token-rights-dialog.component.ts`; what landed here is the entry point, which belongs to the page that
  // owns the rows. Raised rather than worked around — hiding a row action somewhere it does not belong to
  // keep a number down is the trade this list exists to let us decline.
  // 526 -> 532: the danger zone moved into the token editor, which added the routing method the editor emits
  // into plus its two bindings. Six code lines.
  //
  // Note the direction this file COULD go instead: rotate and revoke are now in the editor, so the two row
  // icons on the list are a second way to reach the same actions and removing them would pay this back with
  // change to spare. Not done here, because dropping a familiar affordance from a page is the owner's call and
  // not a side effect of adding one elsewhere. Recorded under G-1.
  // 532 -> 341 on 2026-08-12. The own-rights panel pushed this file 8 lines past its ceiling, and the ratchet's
  // own rule is to pay that with an extraction rather than raise the number: 199 lines of CSS moved to
  // `tokens.styles.ts`, beside the `dialog.styles.ts` already there. Lowered to what it now measures and KEPT,
  // because deleting the entry is how a file quietly earns the right to grow back.
  // RAISED 341 -> 343 to move the permission pill off the removed `admin`/`readOnly` flags: one import
  // and one accessor. A template needs its callable on the component, so the accessor cannot live in the
  // shared helper — it is a one-line arrow, and the reasoning went into a TS comment because the prose
  // would otherwise sit inside the template STRING and count as code. The flags could not express a
  // per-space grant, so the pill labelled a token that can write in one space "read-only".
  'client/src/app/pages/settings/tokens.component.ts': 343,
  // RAISED 1617 -> 1618 by one line: the Q-10 timestamp swap replaced a `| date:` cell with `<app-timestamp>` and
  // needed an import, gaining an import line while losing none. At 1618 code lines this file is by far the largest
  // here and wants splitting on its own terms — but not inside a one-cell rendering change, where the split would be
  // the diff and the fix would be a footnote.
  'client/src/app/pages/files/file-manager.component.ts': 1618,
  'client/src/app/pages/schema-library/schema-library.component.ts': 1112,
  'server/src/sync/engine.ts': 966,
  // 958 -> 684: the per-type editor body moved into `schema-type-editor.component` so the Brain Overview
  // could open the same editor. Lowered rather than left — a frozen number 274 lines above the real size
  // is 274 lines this file could regrow into without the gate saying a word.
  'client/src/app/pages/settings/space-schema-tab.component.ts': 684,
  // 839 -> 843: `typeSchemasMode` on the update body and the replace branch in `mergeSpaceMeta`. Both are
  // small and belong beside the merge they qualify — splitting a two-branch decision across files would
  // make the contract harder to read, not easier.
  // 843 -> 844: one Zod line accepting `faceDescriptorDims` on the CREATE body. It is on the UPDATE body too
  // now — refused by state rather than by surface, see `face-width-refused-by-state-not-surface.test.js` —
  // which is a second Zod line in the same file, and both schemas are `.strict()` so there is nowhere smaller
  // to put either.
  // RAISED 844 -> 847 for `suppressEmbeddings`: the field on `SpaceMetaBody`, the field on `TypeSchemaZ`, and the
  // `!== undefined` merge guard. Both schemas are `.strict()`, so an unlisted field is REJECTED rather than
  // ignored — there is no "put it beside this file" for a field the API must accept. Raised rather than split
  // because this is its FIRST raise; `config/types.ts` is the cautionary case, and the rule stands: a fourth
  // raise of one file is the signal to split it instead of raising a fifth time.
  // RAISED 847 -> 849 for the re-embed route: an import and a registration call, nothing else. Inline it was
  // +28 (route body plus its Zod schema), which would have been the SECOND double-digit raise of this file in two
  // PRs — so the route moved to `api/spaces-reembed.ts` instead and only its mount point stayed. That is what the
  // ratchet is for: not to forbid growth, but to make the second raise in two PRs visible enough to answer.
  // RAISED 849 -> 851 for the usage-reset route: an import and a registration call, nothing else. The route
  // body itself is +47 lines and lives in `api/spaces-activity.ts`, the same shape `spaces-reembed.ts` took and
  // for the reason written above it — this file has been raised four times, and the answer to the fifth is to
  // put the route beside its mount point rather than inside it.
  //
  // 851 -> 656, and this is the raise being PAID rather than taken. Four of the five raises above were Zod lines,
  // because `SpaceMetaBody` and `TypeSchemaZ` are `.strict()` and an unlisted field is REJECTED — so there was no
  // "put it beside the feature" for a field the API must accept. The schemas were what kept pulling this file up,
  // so the schemas left: `spaces/body-schemas.ts`. The PATCH decision chain went to `spaces/meta-update.ts` in the
  // same change, because an MCP tool has to reach the same refusals rather than a weaker copy of them (B-2).
  // Lowered to what it now measures and KEPT on this list — deleting the entry is how a file quietly earns the
  // right to grow back into 195 lines of headroom it did not ask for.
  //
  // 656 -> 589 in the follow-up: `applySpaceMetaUpdate` took the writes as well, so `PATCH /:id` is now the two
  // jobs a route should have — read the header, turn an outcome into a status. The 67 lines are the vote round and
  // the peer notify, which moved because the MCP tool needs them and a tool that skipped the vote would be a
  // governance bypass rather than a missing feature.
  'server/src/api/spaces.ts': 589,
  // 769 -> 773: `openBrainDrawer` gained two overload signatures and its `lastSaved` effect reads the
  // record inside each branch so the discriminant narrows it. Four lines of TYPES, no new behaviour —
  // raised deliberately rather than worked around, which is what this list is for.
  // RAISED 773 -> 774 for one import. `canEdit` moved off `me.readOnly` onto the rights matrix, and the
  // import is the whole cost — the alternative is inlining the predicate, which is a second copy of a
  // rule the server already owns.
  'client/src/app/pages/graph/graph.component.ts': 774,
  // 753 -> 764: `backfillTokenRights`. This file is where config migrations already live — the media
  // master-switch and space-description ones are both here — so a fourth belongs beside them rather than in
  // a module only the loader would ever call.
  'server/src/config/loader.ts': 764,
  'client/src/app/pages/brain/review-tab.component.ts': 748,
  // 744 -> 689, and this one is PAID rather than raised.
  //
  // The history matters because the pattern is what goes wrong: 739 -> 744 was a raise, taken deliberately to
  // ship a 5x embedding fix an operator was already paying for, with the debt recorded instead of forgotten.
  // The four pure functions — merge, rank, and the two text projections — then moved to `recall-shape.ts`,
  // which took 124 lines out and left the part that genuinely needs a database.
  //
  // Frozen at what the file now IS, not at the old ceiling. A freeze left above the real number is a budget
  // for the next 55 lines nobody argued for.
  // 689 -> 690: ONE line, and the reduction from four is the point.
  //
  // Widening recall's filter to accept raw MongoDB first threaded a second `mongoFilter` parameter through three
  // signatures — four added lines, and this gate objected. It was right to: the behaviour belonged beside this file, not
  // inside it. It lives in `recall-filter.ts` now, and the two grammars travel in ONE parameter, which is a smaller design
  // than two mutually-exclusive channels a reader has to know about.
  //
  // What is left is the import of `isRawFilter` and its type. A file cannot use a guard without importing it, so this line
  // is the irreducible cost of the feature reaching the code that runs it.
  'server/src/brain/recall.ts': 690,
  'client/src/app/pages/settings/media-processing/models-tab.component.ts': 678,
  // 675 -> 677: `rights` on TokenRecord, plus its import. FOURTH raise of this file in one session, and the
  // first attempt wanted SIX lines because the shape was written inline. That was the signal, so the shape
  // moved to `config/rights-shape.ts` — a leaf both this file and `auth/` can import without a cycle — and
  // what is left here is one field and one import. The answer to a file that keeps growing is to stop
  // putting things in it, not to raise the number again. The domain split is filed in ARCHITECTURE-TODO.
  // 674 -> 675: `spaceOrigins` on NetworkConfig. **THIRD raise of this file in one session** (672 -> 673 ->
  // 674 -> 675), and that is the signal this list exists to send rather than a run of bad luck. Each was one
  // honest line of type whose behaviour lives elsewhere, and each was individually correct — which is
  // precisely how a god-file grows. Filed as work in ARCHITECTURE-TODO: this file is the config CONTRACT for
  // every subsystem, and it wants splitting by domain, not another line.
  // 673 -> 674: `faceDescriptorDims` on SpaceConfig. One line of type again, and the behaviour it names is
  // in `vector-index.ts` and `lifecycle.ts`. A space's shape belongs in the space's type; the alternative is
  // a side-table of per-space settings, which is a worse trade than one line.
  // 672 -> 673: `allowInProcessFallback` on `faceRecognition.externalModel`. ONE line of type, and the
  // behaviour it names lives in `face-external.ts` and `face-embedder.ts`, not here. The alternative —
  // a face-only config module re-exported from this file — would split the config contract across two
  // places to save a single field, which is the trade this list exists to let us decline.
  // LOWERED 677 -> 645 (Q-3, slice 1). The knowledge-schema vocabulary — merge functions, `PropertySchema`,
  // `TypeSchema`, `ValidationMode`, `KnowledgeType`, `SpaceMeta` — moved to `config/types-knowledge.ts`, a leaf
  // that imports nothing. This entry took FOUR raises in two days and the comment below said the fifth should
  // be a split instead; that is this. The number matters less than where the growth now goes: per-type schema
  // fields land in the leaf, so Q-2's `suppressEmbeddings` is not a fifth raise of this file.
  // LOWERED 645 -> 578 (Q-3, slice 2). The network types moved to `config/types-networks.ts`, which imports
  // `SpaceMeta` from the slice-1 leaf rather than back from `types.ts`. 677 -> 645 -> 578 across the two slices,
  // and the first attempt at this move — before the leaf existed — reached 609 while silently degrading
  // `NetworkConfig` to `any` in a caller. The number was never the point; where the growth goes is.
  // RAISED 578 -> 579 for `FileMetaDoc.sha256`: one optional field, and there is nowhere else a field on a
  // document type can live. It is what lets the media dispatcher tell identical bytes from new ones, so a
  // re-upload stops re-running vision and speech-to-text over content already embedded. Optional on purpose:
  // absent means "unknown", which processes rather than assumes, and it fills itself on the next write —
  // file records SYNC, so a boot migration would have been the wrong shape.
  'server/src/config/types.ts': 579,
  'client/src/app/pages/settings/data.component.ts': 644,
  // RAISED 646 -> 647 by ONE line: the Q-6 narrowing swapped `resolveMemberSpaces` for `memberSpacesForRequest`,
  // and this file no longer needed the old import, so it gained an import line and lost none. Not growth in any
  // meaningful sense — but the ratchet cannot tell a net line from a meaningful one, and quietly special-casing
  // "it was only an import" is how a ceiling stops meaning anything.
  'server/src/api/files.ts': 647,
  // 645 -> 660: the data-model panel’s mount and its card header. The panel ITSELF is a separate
  // component (er-model-panel) and its geometry a separate module (er-layout) — which is what this
  // ratchet asks for. What landed here is the 13 lines that place it in the grid, plus the two inputs
  // it needs. Raised deliberately: refusing would have meant hiding a panel mount somewhere it does not
  // belong purely to keep a number down.
  // 660 -> 601: the statistics strip and the Instance card were deleted (owner, 2026-08-08) — the ER
  // diagram supersedes the counts, and instance identity belongs to the About page, not a space overview.
  // Ratcheted DOWN to what the file now measures, which is what makes this a ratchet: leaving 660 would
  // have handed the file 59 lines of free headroom it did not earn.
  // 601 -> 634 for the usage reset: the button, its confirmation handler, the two inputs and the inline result.
  // The confirmation lives HERE rather than in the shell because this panel already owns the dialog for reindex
  // and retry-failed, and a third destructive action confirming somewhere else would be a second pattern for one
  // decision. Raised rather than split: the alternative was a component wrapping one button.
  'client/src/app/pages/brain/overview-tab.component.ts': 634,
  // FIRST entry for this file: 659, over the 650 ceiling, for the usage-reset handler (request, in-flight flag,
  // result string, reload) and its bindings.
  //
  // It crossed on a ~25-line addition, which is the honest reading: this file was already at 634 and the ceiling
  // was one small feature away. It is the Brain SHELL — it owns the tab strip, the space list, every panel's
  // inputs and eight tabs' worth of load orchestration — so the split that helps is moving a tab's
  // orchestration out, not shaving a handler. That is its own change with its own tests; recorded here rather
  // than done badly in a PR about a button.
  // 659 -> 660: ONE line, and it is a bug fix. The activity loader set its zeroed "nothing was asked" row and
  // returned before clearing its pending flag, so every space with no traffic — and every space just after the
  // usage reset — showed that card spinning for ever. The added line is the settle.
  //
  // Raised without argument. A ratchet that made a one-line fix negotiable would be a gate encouraging the wrong
  // outcome, which is the opposite of what this list is for.
  // 660 -> 571. The Overview panel's five loaders, their signals and the pending flags moved to
  // `overview-data.service.ts` — 136 lines out of the shell, which is now well under the 650 ceiling.
  //
  // The entry STAYS, lowered rather than deleted, for the reason written above `tokens.component.ts`: an entry
  // here is a ratchet, and removing it would hand this file back the 89 lines of headroom the extraction just
  // took away. G-2's own note said to delete it; the precedent in this file is better and wins.
  'client/src/app/pages/brain/brain.component.ts': 571,
  'client/src/app/pages/settings/networks.component.ts': 643,
};

describe('no file grows past what we already carry', () => {
  const files = sourceFiles();
  const sized = files.map(f => ({ f: f.replaceAll('\\', '/'), code: codeLines(readFileSync(join(ROOT, f), 'utf8')) }));

  it('walked a real tree', () => {
    // Floors the enumeration — an empty walk would make every check below pass over nothing.
    assert.ok(files.length >= 200, `only found ${files.length} source files`);
    assert.ok(sized.some(s => s.code > 500), 'no large file found at all — the counter is probably broken');
  });

  it('nothing new crosses the ceiling', () => {
    const over = sized
      .filter(s => !(s.f in FROZEN) && s.code > CEILING)
      .map(s => `${s.f}: ${s.code} code lines (ceiling ${CEILING})`);
    assert.deepEqual(over, [],
      'these are now larger than any unfrozen file was when this gate was written. Either split the new '
      + 'responsibility out, or add an entry with a note saying why this one belongs in a single place.');
  });

  it('no frozen file grows', () => {
    const grown = [];
    for (const [f, max] of Object.entries(FROZEN)) {
      const found = sized.find(s => s.f === f);
      if (!found) continue;                     // deleted or renamed — the entry is stale, not a failure
      if (found.code > max) grown.push(`${f}: ${found.code} code lines, frozen at ${max}`);
    }
    assert.deepEqual(grown, [],
      'a file already among the largest grew further. The failure mode of a god-file is not its size on any '
      + 'given day — it is that every change lands in the same place because that is where the code already '
      + 'is. Put the new behaviour beside it rather than inside it.');
  });

  it('reports frozen entries that have shrunk, so the list cannot drift upward silently', () => {
    // A frozen number that is far above reality stops being a ratchet and becomes headroom.
    const slack = [];
    for (const [f, max] of Object.entries(FROZEN)) {
      const found = sized.find(s => s.f === f);
      if (found && found.code < max - 50) slack.push(`${f}: now ${found.code}, frozen at ${max}`);
    }
    if (slack.length > 0) console.log(`  note: lower these entries —\n    ${slack.join('\n    ')}`);
    // Not an assertion: shrinking a file should never fail a build. It is reported so the list stays honest.
    assert.ok(true);
  });

  it('the measurement ignores comments — or it would punish the documented files', () => {
    // The property that makes this gate safe to have. `config/types.ts` is 1,986 raw lines and 62% comment;
    // if this counted raw lines it would be the second-largest file in the repo and the fix would be
    // deleting the documentation that makes it usable.
    const types = sized.find(s => s.f === 'server/src/config/types.ts');
    assert.ok(types, 'config/types.ts not found — update this test');
    const raw = readFileSync(join(ROOT, 'server/src/config/types.ts'), 'utf8').split('\n').length;
    assert.ok(types.code < raw * 0.5,
      `expected config/types.ts to be mostly comment (${types.code} code of ${raw} lines); if that is no longer `
      + 'true this assertion is measuring the wrong thing and should be re-aimed at whatever is');
  });
});
