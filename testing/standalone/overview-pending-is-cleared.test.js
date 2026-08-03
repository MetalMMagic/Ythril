/**
 * Every Overview panel that can show a first-load skeleton must clear its pending flag on BOTH outcomes.
 *
 * ## The failure this exists for
 *
 * The skeleton is keyed on a `pending` map rather than on the value being null, because null cannot say "not
 * yet": `tokenAccess` is null **permanently** for a non-admin (the endpoint 403s) and `completeness` is null
 * after a failure. A placeholder keyed on null alone would sit there forever in both cases.
 *
 * That makes the *clearing* load-bearing, and it happens in eight places — the success and failure handler of
 * each of four loaders. Drop one and a non-admin gets a permanent shimmer where a card should be, or a card that
 * failed to load never admits it. The page still works, nothing throws, and no unit test can see it: the
 * component spec renders the child with `pending` handed in, so it cannot know whether the parent ever lowers it.
 *
 * That is not a hypothetical — this gate exists because a mutation test proved it. Breaking `settled()` so it
 * never clears anything left the whole component spec green.
 *
 * Run: node --test testing/standalone/overview-pending-is-cleared.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BRAIN = 'client/src/app/pages/brain/brain.component.ts';
const OVERVIEW = 'client/src/app/pages/brain/overview-tab.component.ts';

const src = readFileSync(join(ROOT, BRAIN), 'utf8');

/** The four panels, and the loader whose two handlers must clear each one. */
const PANELS = [
  { key: 'activity',     loader: 'loadSpaceActivity' },
  { key: 'completeness', loader: 'loadCompleteness' },
  { key: 'queue',        loader: 'loadEmbeddingQueue' },
  { key: 'tokens',       loader: 'loadTokenAccess' },
  // `stats` is per-space like the four above — it is blanked and re-raised on every space switch.
  { key: 'stats',        loader: 'loadStats', public: true },
  // `about` is the odd one out and the reason `raisedInSelectSpace` exists as a separate field: the instance
  // panel is fetched ONCE at init and never re-fetched, so it is one-shot. Raising it on a space switch would
  // put a skeleton over data already on screen, which is why `selectSpace` must NOT list it.
  { key: 'about',        loader: 'ngOnInit', public: true, oneShot: true },
];

/** The body of one loader method, sliced to its own closing brace rather than a character count. */
function loaderBody(name) {
  // Not every loader is private: `loadStats` is called from four tab components' (mutated) outputs, and
  // `ngOnInit` is a lifecycle hook. Anchored on either modifier rather than assuming one, because assuming
  // `private` is what made this helper report "loadStats not found" for a method sitting in plain sight.
  let start = src.indexOf(`private ${name}(`);
  if (start < 0) start = src.indexOf(`\n  ${name}(`);
  assert.ok(start > 0, `${name} not found in ${BRAIN}`);
  const end = src.indexOf('\n  }', start);
  assert.ok(end > start, `could not find the end of ${name}`);
  return src.slice(start, end);
}

describe('an Overview skeleton can always be dismissed', () => {
  it('found the loaders — the pattern still matches', () => {
    for (const p of PANELS) assert.ok(loaderBody(p.loader).length > 60, `${p.loader} body looks empty`);
  });

  it('each loader clears its own pending flag, on success AND on failure', () => {
    const bad = [];
    for (const p of PANELS) {
      const body = loaderBody(p.loader);
      const clears = [...body.matchAll(new RegExp(`settled\\('${p.key}'\\)`, 'g'))].length;
      // One per handler. A loader with a single call has covered one outcome and left the other hanging.
      if (clears !== 2) bad.push(`${p.loader} clears '${p.key}' ${clears}x, expected 2 (next: + error:)`);
      if (!/error:/.test(body)) bad.push(`${p.loader} has no error handler at all`);
    }
    assert.deepEqual(bad, [], 'a pending flag that is never lowered is a skeleton that never goes away — and a '
      + `non-admin never gets tokenAccess at all:\n  ${bad.join('\n  ')}`);
  });

  it('pending is raised ONLY where the values are blanked', () => {
    // Raising it anywhere else would cover good data with a placeholder — the defect this whole change removes.
    //
    // Matched on `...p, activity: true` rather than on `overviewPending.set(`, because the raise legitimately
    // became an `update()`: `about` has a ONE-SHOT lifetime (fetched once at init, never re-fetched), so a
    // `set()` here would clobber it back to pending on every space switch and put a skeleton over data
    // already on screen. The invariant this test protects — raised in exactly ONE place, beside the blanks —
    // is unchanged; only the method is. Matching the method name made the test about the mechanism instead of
    // the guarantee.
    const raises = [...src.matchAll(/\.\.\.p, activity: true/g)].length;
    assert.equal(raises, 1, 'pending must be raised in exactly one place (selectSpace, beside the blanks)');

    // Anchored on the METHOD, not the first textual match — `selectSpace(` appears in the template first, and
    // slicing from there measured 19k characters of the wrong thing.
    const at = src.indexOf('  selectSpace(id: string): void {');
    assert.ok(at > 0, 'selectSpace method not found');
    const selectSpace = src.slice(at, src.indexOf('\n  }', at));
    for (const key of ['activity', 'completeness', 'queue', 'tokens', 'stats']) {
      assert.match(selectSpace, new RegExp(`${key}: true`),
        `the space switch blanks ${key}, so it must raise its pending flag too`);
    }
    // And it must NOT raise `about`, whose data is not blanked by a space switch.
    assert.doesNotMatch(selectSpace, /about: true/,
      'about is fetched once at init, so raising it on a space switch would cover data already on screen');
  });
  it('`settled` really lowers the flag', () => {
    // The call-site checks above pass whether or not the function does anything, which a mutation test proved:
    // gutting the body left every one of them green.
    const at = src.indexOf('  private settled(');
    assert.ok(at > 0, 'settled() not found');
    const body = src.slice(at, src.indexOf('\n  }', at));
    assert.match(body, /overviewPending\.update\(/, 'settled() must actually lower the flag');
    assert.ok(!/if \(true\)/.test(body), 'settled() has been short-circuited');
  });

  it('the live-event refresh does NOT raise it', () => {
    // That path has good data on screen. A skeleton over it would be the original bug, arriving on a timer.
    // Anchored on the METHOD — `onLiveEvent(` is CALLED before it is declared, and slicing from the first
    // textual match measured the SSE handler instead, so this assertion passed against a deliberate break.
    const at = src.indexOf('  private onLiveEvent(');
    assert.ok(at > 0, 'onLiveEvent method not found');
    const live = src.slice(at, src.indexOf('\n  }', at));
    assert.ok(!/overviewPending/.test(live),
      'the live-event refresh must not raise pending — it would cover data already on screen');
  });

  it('every pending key has a skeleton branch, and every branch has a key', () => {
    // The two halves are written in different files, so a rename in one is invisible in the other.
    const ov = readFileSync(join(ROOT, OVERVIEW), 'utf8');
    for (const p of PANELS) {
      assert.match(ov, new RegExp(`@else if \\(pending\\(\\)\\.${p.key}\\)`),
        `no skeleton branch for '${p.key}' in ${OVERVIEW}`);
    }
    const branches = [...ov.matchAll(/@else if \(pending\(\)\.(\w+)\)/g)].map(m => m[1]).sort();
    assert.deepEqual(branches, PANELS.map(p => p.key).sort(),
      'the skeleton branches and the pending keys have drifted apart');
  });
});
