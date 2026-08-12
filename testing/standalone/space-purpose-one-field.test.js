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
let spaceDescriptionAlias;
let spaceResponse;

const space = (over = {}) => ({ id: 's', label: 'S', builtIn: false, folders: [], ...over });

describe('space purpose is one field', () => {
  before(async () => {
    ({ migrateSpaceDescriptionToPurpose } = await import('../../server/dist/config/loader.js'));
    ({ spacePurpose, spaceDescriptionAlias, spaceResponse } = await import('../../server/dist/spaces/spaces.js'));
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

    it('a shaped response carries the alias beside the record', () => {
      // The regression this pins: `res.json({ space: updated })` was right while `description` was
      // STORED, and dropped the field the moment it became derived — so PATCH echoed back a space with
      // no description even though the write had landed.
      const shaped = spaceResponse(space({ meta: { purpose: 'the directive', version: 3 } }));
      assert.equal(shaped.description, 'the directive');
      assert.equal(shaped.meta.version, 3, 'the rest of the record must survive the shaping');
    });

    it('omits the key entirely when there is no purpose', () => {
      // Not `null`: the list endpoints have always omitted it, and a client that treats present-but-null
      // as "an admin cleared it" would read the two shapes differently.
      assert.equal('description' in spaceResponse(space()), false);
      assert.deepEqual(spaceDescriptionAlias(space()), {});
      assert.deepEqual(spaceDescriptionAlias(space({ meta: { purpose: 'x' } })), { description: 'x' });
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

    // The first cut of this gate hand-picked the list endpoint and passed while three other responses
    // dropped the field. Enumerate the sites out of the source instead: whatever answers with a space has
    // to be in this list, including one added tomorrow.
    it('every response that carries a space routes through the shared shaper', () => {
      const src = strip(readFileSync('server/src/api/spaces.ts', 'utf8'));
      const sites = [...src.matchAll(/\.json\(\s*\{\s*space:\s*([A-Za-z_$][\w$]*\(?)/g)].map(m => m[1]);
      assert.ok(sites.length >= 3,
        `expected at least the create / PATCH / PUT-schema responses, enumerated ${sites.length}`);
      const raw = sites.filter(expr => expr !== 'spaceResponse(');
      assert.deepEqual(raw, [],
        `these answer with the stored record, so the derived alias is missing from them: ${raw.join(', ')}`);
    });

    it('the alias is derived in exactly one place', () => {
      // Two spellings is how it drifted the first time. `spaceDescriptionAlias` spreads, so a response
      // that projects a subset of fields uses the same derivation as one that returns the whole record.
      const src = strip(readFileSync('server/src/api/spaces.ts', 'utf8'));
      const assigned = [...src.matchAll(/description:\s*([^,\n]{1,24})/g)].map(m => m[1].trim());
      const inline = assigned.filter(v => !v.startsWith('z.'));
      assert.deepEqual(inline, [],
        `derive the alias via spaceDescriptionAlias/spaceResponse, not inline: ${inline.join(', ')}`);
    });

    it('a description write is folded into meta before the vote decision', () => {
      // The one that would be silent: a governed space votes on meta changes. If `description` were
      // still applied as a non-meta update, a directive change would skip the vote in exactly the
      // spaces that voted to govern it.
      // The fold happens in the planner now, which is still BEFORE the router's vote branch — and further from
      // it than before, since a caller cannot reach the branch without going through the plan.
      assert.ok(has('server/src/spaces/meta-update.ts', /parsed\.data\.meta = \{[\s\S]{0,300}?purpose: legacy/),
        'description must become meta.purpose before the networked branch is reached');
      assert.ok(!has('server/src/api/spaces.ts', /nonMetaUpdates\.description/),
        'applying it as a non-meta update is the bypass this test exists to prevent');
    });

    it('the settings dialog handles the 202 a governed space answers with', () => {
      // Typed as `{ space: Space }` unconditionally, the 202 body destructured to undefined and threw
      // inside `next` — which RxJS does not route to `error`. Save did nothing, said nothing, and left
      // the editor dirty, so closing it offered to discard a change that had just been submitted.
      // The save handler moved with the dialog: the pop-up is its own component now, hosted by the Spaces
      // page and (next) by the Brain page. The path follows the code — and the first assertion is positive,
      // so a path resolving to a file without the branch fails loudly instead of passing vacuously.
      const POPUP = 'client/src/app/pages/settings/space-settings-popup.component.ts';
      assert.ok(has(POPUP, /result\.status === 'vote_pending'/),
        'the save handler must branch on the vote-pending response');
      assert.ok(!has(POPUP, /next: \(\{ space \}\)/),
        'destructuring `space` off a 202 body is the defect');
    });
  });
});
