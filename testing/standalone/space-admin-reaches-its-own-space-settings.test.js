/**
 * A space administrator reaches THAT SPACE's settings — and nothing the instance owns.
 *
 * ## The ruling
 *
 * Owner, P-8 = B, 2026-08-15: *"those are INSTANCE admin things. B and includes the rest of the matrixes rungs
 * for this space."* Tokens shipped first (`space-admin-reaches-its-own-tokens.test.js`); this is the second
 * clause — the space's own settings.
 *
 * ## The two ways this feature could become an escalation
 *
 * **1. The wrong predicate.** `spaceAdminSpacesFor(rights).length > 0` asks *"do you administer any space?"*
 * and is the right question on the token routes, where the body names its own subject and
 * `refusalsOutsideEditorScope` bounds what may be written. A space route has no such body: the subject is the
 * space id in the URL. Admitting on "administers something" would let the administrator of space A rewrite
 * space B's schema, because there is no later filter to catch it. So the scoped guard must call
 * `isSpaceAdminFor(rights, spaceId)` and the test pins which one it uses.
 *
 * **2. The wrong routes.** Creating a space, reordering the instance's spaces and DELETING a space are not
 * settings. Delete is the sharp one: it is reachable with the same `:id` parameter as everything widened here,
 * so it would have been swept up by any edit that worked route-by-name rather than route-by-meaning.
 *
 * ## And one field inside a widened route
 *
 * `maxGiB` is a space's share of the HOST's disk. Everything else in the update body configures the space;
 * that number spends the instance. The guard admits a space administrator to `PATCH /:id` and the route
 * refuses the single field, which is better than keeping the whole route shut over one number.
 *
 * Run: node --test testing/standalone/space-admin-reaches-its-own-space-settings.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

const SPACES = readFileSync('server/src/api/spaces.ts', 'utf8');
const MIDDLEWARE = readFileSync('server/src/auth/middleware.ts', 'utf8');

/** The guard list of one route, read from source. Comments are stripped so prose about a guard is never it. */
const guardsFor = (verb, path) => {
  // Up to the handler's own `(req`, and NOT `[^)]*?` — a guard is written `requireAdminMfaScoped('id')` and a
  // negated-paren class stops dead at its first `)`, which made every route in this file look unguarded.
  const re = new RegExp(`spacesRouter\\.${verb}\\('${path.replace(/[/:*]/g, m => '\\' + m)}',([\\s\\S]*?)\\(req`);
  const m = stripComments(SPACES).match(re);
  assert.ok(m, `route ${verb.toUpperCase()} ${path} was not found — the scanner is wrong, not the code`);
  return m[1];
};

/** Every route a space administrator may reach: this space's own configuration. */
const WIDENED = [
  ['patch', '/:id', 'its settings'],
  ['patch', '/:id/rename', 'its display name'],
  ['put', '/:id/schema', 'its schema'],
  ['put', '/:id/meta/typeSchemas/:knowledgeType/:typeName', 'one of its types'],
  ['delete', '/:id/meta/typeSchemas/:knowledgeType/:typeName', 'removing one of its types'],
  ['post', '/:id/validate-schema', 'a dry run that writes nothing'],
  ['post', '/:id/rebuild-indexes', 'its own search indexes'],
];

/** Instance-shaped, and each for a reason that is not "we ran out of time". */
const INSTANCE_ONLY = [
  ['delete', '/:id', 'destroying a space is not one of its settings'],
  ['post', '/', 'creating a space is instance-shaped — there is no space to scope it to'],
  ['post', '/reorder', 'the order of the instance\'s spaces belongs to the instance'],
];

describe('the widened routes are this space\'s own configuration', () => {
  for (const [verb, path, why] of WIDENED) {
    it(`${verb.toUpperCase()} ${path} admits the space administrator — ${why}`, () => {
      assert.match(guardsFor(verb, path), /requireAdminOrSpaceAdminMfaScoped\('id'\)/,
        'a space administrator must reach this, scoped to the space in the URL');
    });
  }

  it('and every one of them is MFA-gated, exactly as it was', () => {
    // A space administrator is still a human with an authenticator. Dropping the second factor here would make
    // "space admin" the way around an instance-wide MFA setting.
    for (const [verb, path] of WIDENED) {
      assert.match(guardsFor(verb, path), /Mfa/, `${verb.toUpperCase()} ${path} lost its MFA gate`);
    }
  });
});

describe('the instance keeps what is the instance\'s', () => {
  for (const [verb, path, why] of INSTANCE_ONLY) {
    it(`${verb.toUpperCase()} ${path} stays instance-admin only — ${why}`, () => {
      assert.doesNotMatch(guardsFor(verb, path), /requireAdminOrSpaceAdmin/,
        'this is not a setting of one space and a space administrator must not reach it');
    });
  }
});

describe('the scoped guard admits on THIS space, not on any space', () => {
  /** The body of `requireAdminOrSpaceAdminMfaScoped`, comments stripped. */
  const scoped = (() => {
    const src = stripComments(MIDDLEWARE);
    const at = src.indexOf('export function requireAdminOrSpaceAdminMfaScoped');
    assert.ok(at > 0, 'the scoped guard was not found — the scanner is wrong, not the code');
    const end = src.indexOf('\nexport ', at + 10);
    return end === -1 ? src.slice(at) : src.slice(at, end);
  })();

  it('uses the per-space predicate', () => {
    assert.match(scoped, /isSpaceAdminFor\(/,
      'admission must be "you administer THE space in the URL"');
  });

  it('and NOT the any-space one, which would open every other space', () => {
    // The single assertion this file exists for. `spaceAdminSpacesFor(...).length > 0` is correct on the token
    // routes and would be an escalation here: administering space A must not reach space B's settings.
    assert.doesNotMatch(scoped, /spaceAdminSpacesFor/,
      'the token-route predicate answers "any space", which is the wrong question for a scoped route');
  });

  it('refuses when the route has no space id at all', () => {
    // A guard mounted where `req.params[paramName]` is undefined must close, not open.
    assert.match(scoped, /!spaceId \|\| !isSpaceAdminFor/,
      'a missing space id must refuse a non-instance-admin rather than fall through');
  });

  it('leaves the instance-admin path running every check it ran before', () => {
    for (const check of ['enforceMfa', 'enforceSpaceScope', 'enforceAreaRung']) {
      assert.match(scoped, new RegExp(`${check}\\(`), `${check} was dropped from the scoped guard`);
    }
  });
});

describe('the MCP door widens with the REST one', () => {
  // The rule this repo pays most for: one capability, two surfaces, and the difference only found from
  // outside. `update_space` and `update_space_schema` are the MCP counterparts of `PATCH :id` and
  // `PUT :id/schema` — leaving them on `admin: true` would have meant a space administrator who can configure
  // their space through the REST door and is refused through the MCP one.
  // Stripped, all four: each of these assertions would otherwise fire on the comment EXPLAINING the rule.
  // The `if (!isAdmin)` check below caught its own note saying that check must not be here.
  const MCP = stripComments(readFileSync('server/src/mcp/tools/spaces.ts', 'utf8'));
  const VIS = stripComments(readFileSync('server/src/mcp/tool-visibility.ts', 'utf8'));
  const GUARD = stripComments(readFileSync('server/src/mcp/tool-rights-guard.ts', 'utf8'));
  const ROUTER = stripComments(readFileSync('server/src/mcp/router.ts', 'utf8'));

  /** One tool object from the MCP module, `name:` to the next `export const`. */
  const mcpTool = (name) => {
    const at = MCP.indexOf(`name: '${name}'`);
    assert.ok(at > 0, `${name} was not found — the scanner is wrong, not the code`);
    const end = MCP.indexOf('\nexport const ', at);
    return end === -1 ? MCP.slice(at) : MCP.slice(at, end);
  };

  for (const name of ['update_space', 'update_space_schema']) {
    it(`${name} is spaceAdmin, not instance admin`, () => {
      const t = mcpTool(name);
      assert.match(t, /spaceAdmin: true/, 'the MCP counterpart of a widened REST route must widen with it');
      assert.doesNotMatch(t, /\n {2}admin: true/,
        'both flags for one decision is how the stricter one silently wins');
    });

    it(`${name} keeps no second copy of the rule in its handler`, () => {
      // The one that would have made this a silent no-op: the dispatcher admits the space administrator and
      // an `if (!isAdmin)` one layer down refuses them, reading the legacy boolean `ToolContext` says nothing
      // should read for a new decision.
      assert.doesNotMatch(mcpTool(name), /if \(!isAdmin\)/,
        'authorisation belongs in the dispatcher, once');
    });
  }

  it('the tools that are genuinely instance-shaped did NOT get swept along', () => {
    // `create_space` has no space to scope to. `wipe_space` destroys data and its REST counterpart was not
    // widened either. `reindex` likewise. A sweep by flag name would have taken all three.
    for (const name of ['create_space', 'wipe_space', 'reindex']) {
      assert.match(mcpTool(name), /\n {2}admin: true/, `${name} must stay instance-admin only`);
      assert.doesNotMatch(mcpTool(name), /spaceAdmin: true/, `${name} must stay instance-admin only`);
    }
  });

  it('visibility admits on ANY space, because tools/list runs before one is named', () => {
    assert.match(VIS, /tool\.spaceAdmin[\s\S]{0,160}spaceAdminSpacesFor/,
      'the coarse half must use the any-space predicate — there is no space to check yet');
  });

  it('and the DISPATCHER asks about the space actually named', () => {
    // The two-width split, same as REST. Coarse alone would let the administrator of Research reconfigure
    // Finance; precise alone cannot be evaluated at listing time.
    assert.match(GUARD, /export function spaceAdminRefusal/, 'the precise half must exist');
    assert.match(GUARD, /isSpaceAdminFor\(rights, space\)/, 'and ask about the space named in the call');
    assert.match(ROUTER, /spaceAdminRefusal\(tool, rights, rawSpace\)/,
      'the dispatcher must actually call it — a guard nobody calls is the failure this repo keeps hitting');
  });

  it('refusing names what is missing, not "you cannot write"', () => {
    assert.match(ROUTER, /tool\.spaceAdmin/,
      'a space-admin tool needs its own refusal text: a token can hold write everywhere and administer nothing');
  });
});

describe('maxGiB stays with the instance', () => {
  it('PATCH /:id refuses it from a token that is not an instance admin', () => {
    const stripped = stripComments(SPACES);
    assert.match(stripped, /maxGiB !== undefined && !req\.authToken\?\.admin/,
      'a space administrator must not set its share of the host disk');
    assert.match(stripped, /res\.status\(403\)/, 'and the refusal is a 403, not a silent drop');
  });

  it('and says WHO can change it, so the refusal is actionable', () => {
    assert.match(SPACES, /Ask an instance administrator to change the quota/,
      'a refusal that does not name the next step makes the caller guess');
  });
});
