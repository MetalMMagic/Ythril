/**
 * A space's directive has ONE store, and the field an operator can edit is the one clients read.
 *
 * ## The defect
 *
 * `SpaceConfig.description` was commented "shown to MCP clients as space-level instructions".
 * `SpaceMeta.purpose` is "short directive injected into MCP instructions at handshake". Two fields, one
 * meaning — and they were served by different tools: `get_space_meta` returned `purpose`, `list_spaces`
 * returned `description`. They could say anything relative to each other.
 *
 * Then the settings UI gained an editor for `purpose` and never had one for `description`, so the field
 * every MCP client read became the one no admin could change. On the deployment that reported it: three
 * spaces returning `null`, three returning mojibake from an old import, and the purposes their admins had
 * written sitting invisible beside them.
 *
 * ## The fix this pins
 *
 * `purpose` is the store. `description` survives as a derived alias because it is published API, and
 * derived means the two cannot disagree. Legacy stored text is migrated into `meta.purpose` at boot —
 * allowed to be a boot migration rather than a lazy one because `config.json` is local state and does not
 * replicate.
 *
 * Run: node --test testing/standalone/space-purpose-one-field.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let migrateSpaceDescriptionToPurpose;
let spacePurpose;

const space = (over = {}) => ({ id: 's', label: 'S', builtIn: false, folders: [], ...over });

describe('space purpose is one field', () => {
  before(async () => {
    ({ migrateSpaceDescriptionToPurpose } = await import('../../server/dist/config/loader.js'));
    ({ spacePurpose } = await import('../../server/dist/spaces/spaces.js'));
  });

  describe('the boot migration', () => {
    it('moves a legacy description into an empty purpose', () => {
      const cfg = { spaces: [space({ description: 'Papers and findings.' })] };
      assert.equal(migrateSpaceDescriptionToPurpose(cfg), true);
      assert.equal(cfg.spaces[0].meta.purpose, 'Papers and findings.');
      assert.equal('description' in cfg.spaces[0], false, 'the legacy store must be gone, not shadowed');
    });

    it('never overwrites a purpose an operator already wrote', () => {
      // The purpose is the field the UI edits, so it is the more recent, deliberate value. Clobbering it
      // with legacy text would be a worse failure than dropping the legacy text.
      const cfg = { spaces: [space({ description: 'stale import', meta: { purpose: 'what we actually do' } })] };
      assert.equal(migrateSpaceDescriptionToPurpose(cfg), true);
      assert.equal(cfg.spaces[0].meta.purpose, 'what we actually do');
      assert.equal('description' in cfg.spaces[0], false);
    });

    it('drops an empty description without inventing a purpose', () => {
      const cfg = { spaces: [space({ description: '   ' })] };
      migrateSpaceDescriptionToPurpose(cfg);
      assert.equal(cfg.spaces[0].meta?.purpose, undefined);
    });

    it('is idempotent — the second boot changes nothing', () => {
      const cfg = { spaces: [space({ description: 'x' })] };
      assert.equal(migrateSpaceDescriptionToPurpose(cfg), true);
      assert.equal(migrateSpaceDescriptionToPurpose(cfg), false,
        'returning true again would rewrite config.json on every boot, forever');
    });

    it('preserves the rest of the meta', () => {
      const cfg = { spaces: [space({ description: 'x', meta: { validationMode: 'strict', version: 7 } })] };
      migrateSpaceDescriptionToPurpose(cfg);
      assert.equal(cfg.spaces[0].meta.validationMode, 'strict');
      assert.equal(cfg.spaces[0].meta.version, 7);
    });

    it('survives a config with no spaces at all', () => {
      assert.equal(migrateSpaceDescriptionToPurpose({}), false);
    });
  });

  describe('the derived alias', () => {
    it('reads purpose', () => {
      assert.equal(spacePurpose({ meta: { purpose: 'the directive' } }), 'the directive');
    });

    it('is undefined rather than empty when there is no purpose', () => {
      assert.equal(spacePurpose({}), undefined);
      assert.equal(spacePurpose({ meta: {} }), undefined);
      assert.equal(spacePurpose({ meta: { purpose: '  ' } }), undefined,
        'whitespace is not a directive; returning it would show an empty box as if it were content');
    });
  });

  describe('no surface reads a stored description', () => {
    const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Assert on a boolean, not `assert.match` over a whole file: a failing match prints the entire
    // source as `actual`, which buries the one line that matters under 30 kB of unrelated code.
    const has = (path, re) => re.test(strip(readFileSync(path, 'utf8')));

    it('list_spaces serves purpose, not the legacy field', () => {
      assert.ok(has('server/src/mcp/tools/spaces.ts', /purpose: spacePurpose\(s\)/),
        'list_spaces is the tool that disagreed with get_space_meta');
      assert.ok(!has('server/src/mcp/tools/spaces.ts', /description: s\.description/),
        'that is the stored legacy field, which no longer exists after the migration');
    });

    it('the REST list derives it too', () => {
      assert.ok(has('server/src/api/spaces.ts', /description: spacePurpose\(space\)/),
        'GET /api/spaces must derive the alias, not read a second store');
    });

    it('a description write is folded into meta before the vote decision', () => {
      // The one that would be silent: a governed space votes on meta changes. If `description` were
      // still applied as a non-meta update, a directive change would skip the vote in exactly the
      // spaces that voted to govern it.
      assert.ok(has('server/src/api/spaces.ts', /parsed\.data\.meta = \{[\s\S]{0,300}?purpose: legacy/),
        'description must become meta.purpose before the networked branch is reached');
      assert.ok(!has('server/src/api/spaces.ts', /nonMetaUpdates\.description/),
        'applying it as a non-meta update is the bypass this test exists to prevent');
    });

    it('the settings dialog handles the 202 a governed space answers with', () => {
      // Typed as `{ space: Space }` unconditionally, the 202 body destructured to undefined and threw
      // inside `next` — which RxJS does not route to `error`. Save did nothing, said nothing, and left
      // the editor dirty, so closing it offered to discard a change that had just been submitted.
      assert.ok(has('client/src/app/pages/settings/spaces.component.ts', /result\.status === 'vote_pending'/),
        'the save handler must branch on the vote-pending response');
      assert.ok(!has('client/src/app/pages/settings/spaces.component.ts', /next: \(\{ space \}\)/),
        'destructuring `space` off a 202 body is the defect');
    });
  });
});
