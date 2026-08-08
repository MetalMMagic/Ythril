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
  'client/src/app/pages/files/file-manager.component.ts': 1617,
  'client/src/app/pages/schema-library/schema-library.component.ts': 1112,
  'server/src/sync/engine.ts': 966,
  // 958 -> 684: the per-type editor body moved into `schema-type-editor.component` so the Brain Overview
  // could open the same editor. Lowered rather than left — a frozen number 274 lines above the real size
  // is 274 lines this file could regrow into without the gate saying a word.
  'client/src/app/pages/settings/space-schema-tab.component.ts': 684,
  // 839 -> 843: `typeSchemasMode` on the update body and the replace branch in `mergeSpaceMeta`. Both are
  // small and belong beside the merge they qualify — splitting a two-branch decision across files would
  // make the contract harder to read, not easier.
  'server/src/api/spaces.ts': 843,
  // 769 -> 773: `openBrainDrawer` gained two overload signatures and its `lastSaved` effect reads the
  // record inside each branch so the discriminant narrows it. Four lines of TYPES, no new behaviour —
  // raised deliberately rather than worked around, which is what this list is for.
  'client/src/app/pages/graph/graph.component.ts': 773,
  'server/src/config/loader.ts': 753,
  'client/src/app/pages/brain/review-tab.component.ts': 748,
  'server/src/brain/recall.ts': 739,
  'client/src/app/pages/settings/media-processing/models-tab.component.ts': 678,
  // 672 -> 673: `allowInProcessFallback` on `faceRecognition.externalModel`. ONE line of type, and the
  // behaviour it names lives in `face-external.ts` and `face-embedder.ts`, not here. The alternative —
  // a face-only config module re-exported from this file — would split the config contract across two
  // places to save a single field, which is the trade this list exists to let us decline.
  'server/src/config/types.ts': 673,
  'client/src/app/pages/settings/data.component.ts': 644,
  'server/src/api/files.ts': 646,
  // 645 -> 660: the data-model panel’s mount and its card header. The panel ITSELF is a separate
  // component (er-model-panel) and its geometry a separate module (er-layout) — which is what this
  // ratchet asks for. What landed here is the 13 lines that place it in the grid, plus the two inputs
  // it needs. Raised deliberately: refusing would have meant hiding a panel mount somewhere it does not
  // belong purely to keep a number down.
  // 660 -> 601: the statistics strip and the Instance card were deleted (owner, 2026-08-08) — the ER
  // diagram supersedes the counts, and instance identity belongs to the About page, not a space overview.
  // Ratcheted DOWN to what the file now measures, which is what makes this a ratchet: leaving 660 would
  // have handed the file 59 lines of free headroom it did not earn.
  'client/src/app/pages/brain/overview-tab.component.ts': 601,
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
