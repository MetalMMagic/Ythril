/**
 * A slot can tell a thinking model to think less, and the control reaches the wire.
 *
 * ## Why the setting exists
 *
 * Reported by a fleet operator 2026-09-06 with the measurement that makes the case: their 27B answers, and
 * takes **3m32.79s** at its template default. Nothing was misconfigured — it thinks for three and a half
 * minutes, and there was no seam to ask it for less. Three callers were losing at three different deadlines
 * against that one endpoint, and none of them could ask for less thinking, so each had only a timeout to fail
 * on. A longer deadline is not a fix for that shape.
 *
 * ## The three things this holds, and the second is the one that would go wrong quietly
 *
 * 1. **Absent means the field is not sent.** Not a default of `medium`. A model never trained for this
 *    ignores the parameter at best and rejects the request at worst, so an upgrade must not start sending a
 *    new field to every endpoint on its own.
 * 2. **A slot patch touching one field must not clear the other.** With a single field, "absent" and
 *    "cleared" could both delete the slot, because clearing the only field and clearing the slot were the
 *    same act. The moment a slot holds two, a patch setting only the effort would have deleted the slot and
 *    taken the operator's timeout with it — silently, and visible later only as a call that suddenly used the
 *    built-in budget.
 * 3. **An unrecognised value is dropped rather than forwarded.** `config.json` is hand-editable, so the admin
 *    schema is not the only way in, and a forwarded typo fails EVERY request to that slot with an error
 *    naming the MODEL — which sends the operator to the wrong place entirely.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reasoningEffortBody, slotTimeoutMs, REASONING_EFFORTS } from '../../server/dist/config/model-slots.js';
import { mergeModelSlots } from '../../server/dist/api/media-config.js';
import { MODEL_SLOT_DEFAULT_MS, MODEL_SLOTS } from '../../server/dist/config/model-slots.js';
import { readFileSync } from 'node:fs';

test('a slot with nothing set sends no field at all', () => {
  assert.deepEqual(reasoningEffortBody('assist', undefined), {});
  assert.deepEqual(reasoningEffortBody('assist', {}), {});
  assert.deepEqual(reasoningEffortBody('assist', { assist: { timeoutMs: 5000 } }), {});

  // Spread into a body, an empty object adds no key — which is the point of returning one rather than a
  // value the call site has to test. `reasoning_effort: undefined` serialises to a key some servers reject.
  assert.deepEqual({ model: 'm', ...reasoningEffortBody('assist', {}) }, { model: 'm' });
});

test('a slot with one set sends exactly that', () => {
  assert.deepEqual(
    reasoningEffortBody('assist', { assist: { reasoningEffort: 'medium' } }),
    { reasoning_effort: 'medium' },
  );
});

test('the vocabulary is llama.cpp\'s, and it includes the two the reporter asked for', () => {
  /*
   * The reporter asked for `low`/`medium`/`high`, arguing the OpenAI scale outlives a model swap. It does,
   * for two of the three: Qwen3.8's template accepts `low`, `medium` and `xhigh` and THROWS on `minimal`,
   * `high` and `max` — the server starts and then fails every request. So the set is llama-server's own and
   * the operator picks what their model supports.
   */
  for (const value of ['none', 'low', 'medium', 'xhigh']) {
    assert.ok(REASONING_EFFORTS.includes(value), `${value} must be offerable`);
  }
});

test('an unrecognised value is dropped, not forwarded to the model', () => {
  for (const bad of ['LOW', 'off', 'maximum', '', 'true', 5]) {
    assert.deepEqual(
      reasoningEffortBody('assist', { assist: { reasoningEffort: bad } }), {},
      `${JSON.stringify(bad)} reached the request body; it would fail every call to this slot with an error `
      + 'about the model rather than about the setting',
    );
  }
});

test('setting the effort does not clear the timeout, and clearing one leaves the other', () => {
  const withBoth = mergeModelSlots({ assist: { timeoutMs: 90_000 } }, { assist: { reasoningEffort: 'low' } });
  assert.deepEqual(withBoth.assist, { timeoutMs: 90_000, reasoningEffort: 'low' },
    'a patch naming one field took the other with it');

  const effortCleared = mergeModelSlots(withBoth, { assist: { reasoningEffort: null } });
  assert.deepEqual(effortCleared.assist, { timeoutMs: 90_000 }, 'null must clear its own field only');

  const timeoutCleared = mergeModelSlots(withBoth, { assist: { timeoutMs: null } });
  assert.deepEqual(timeoutCleared.assist, { reasoningEffort: 'low' });

  // …and a slot with nothing left in it goes, rather than lingering as `{}` in a file people read.
  const emptied = mergeModelSlots({ assist: { reasoningEffort: 'low' } }, { assist: { reasoningEffort: null } });
  assert.equal(emptied.assist, undefined);
});

test('an unmentioned slot is untouched, and the effort resolves per slot', () => {
  const cfg = mergeModelSlots(
    { assist: { timeoutMs: 90_000 }, vision: { reasoningEffort: 'low' } },
    { assist: { reasoningEffort: 'medium' } },
  );
  assert.deepEqual(cfg.vision, { reasoningEffort: 'low' }, 'a slot nobody named changed');
  assert.equal(slotTimeoutMs('assist', cfg), 90_000, 'the timeout survived a patch about thinking');
  assert.deepEqual(reasoningEffortBody('vision', cfg), { reasoning_effort: 'low' });
  assert.deepEqual(reasoningEffortBody('assist', cfg), { reasoning_effort: 'medium' });
  assert.deepEqual(reasoningEffortBody('stt', cfg), {}, 'a slot with nothing set must stay silent');
});

test('the client mirrors the vocabulary and the defaults, or the screen lies', () => {
  /*
   * The client cannot import from `server/`, so it carries copies: the effort levels it offers and the
   * per-slot default it shows as a placeholder. Both are things an operator reasons FROM — a level the server
   * rejects makes every call to that slot fail after a save that succeeded, and a wrong placeholder makes an
   * empty box mean a number that is not the default.
   *
   * Read out of the source rather than imported, because the client build is Angular and this suite is plain
   * node — and a gate that needed the app compiled would be skipped exactly when it mattered.
   */
  const src = readFileSync('client/src/app/pages/settings/media-processing/media-processing.types.ts', 'utf8');

  const levels = /export const REASONING_EFFORTS = \[([^\]]*)\]/.exec(src)?.[1] ?? '';
  const offered = [...levels.matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(offered, [...REASONING_EFFORTS],
    'the client offers a different set of effort levels than the server accepts');

  const table = /export const SLOT_DEFAULT_MS[^{]*\{([^}]*)\}/.exec(src)?.[1] ?? '';
  const shown = Object.fromEntries([...table.matchAll(/(\w+):\s*([0-9_]+)/g)]
    .map(m => [m[1], Number(m[2].replace(/_/g, ''))]));
  for (const slot of MODEL_SLOTS) {
    assert.equal(shown[slot], MODEL_SLOT_DEFAULT_MS[slot],
      `the screen shows ${shown[slot]} as ${slot}'s default budget; the server uses ${MODEL_SLOT_DEFAULT_MS[slot]}`);
  }
});
