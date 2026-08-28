/**
 * A body read from `GET /api/admin/media-config` and sent straight back must not be a 400.
 *
 * ## The defect
 *
 * The canary operator, 2026-08-20, from a browser on 3.2.0 — and corroborated server-side by them: their pod had
 * logged no `config.json changed on disk` since provisioning, so every save attempt had persisted nothing.
 *
 *     {"error":"Invalid request body","details":[{"code":"unrecognized_keys","keys":["enabled"],
 *       "path":["faceRecognition"],"message":"Unrecognized key: \"enabled\""}]}
 *
 * `GET` returns the RESOLVED config. `getFaceRecognitionConfig()` returns `Required<FaceRecognitionConfig>`, so
 * `enabled` is on every response, and the patch schema is `.strict()` and does not accept it. Both Settings
 * pages that PATCH this route were dead — Models and Media Processing — because the whole body is refused at
 * validation rather than the one field.
 *
 * ## Why this gate reads the SHAPES instead of listing the fields
 *
 * The bug is not "`enabled` was sent". It is the CLASS: *a key the GET emits that the PATCH refuses*. `enabled`
 * was one member and two more (`modelPath`, `reprocessSyncedImages`) sit in the same block, kept out of the
 * payload by the client's own allowlist — which had the right comment and the wrong contents.
 *
 * So this derives the class from the response type and the patch schema and requires every member to be on
 * `SERVER_OWNED_MEDIA_PATHS`. A hand-written list of three names would have passed the day `enabled` was added
 * and would pass again for the fourth field, because nothing would contradict it.
 *
 * ## And it asserts the two DIRECTIONS separately
 *
 * Stripping alone would let a real attempt to change an env-only field vanish into a 200. So an echoed value is
 * stripped and a CHANGED value is refused, and both need their own assertion — a strip that also swallowed
 * changes would satisfy any test that only checked the round-trip.
 *
 * Run: node --test testing/standalone/media-config-round-trips.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('server/src/api/media-config.ts', 'utf8');
const TYPES = readFileSync('server/src/config/types.ts', 'utf8');
const CLIENT = readFileSync(
  'client/src/app/pages/settings/media-processing/media-processing-state.service.ts', 'utf8');

let stripServerOwnedMedia;
before(async () => {
  ({ stripServerOwnedMedia } = await import('../../server/dist/api/media-config.js'));
});

/** The face block as the GET emits it — every field, because the getter returns `Required<…>`. */
const RESOLVED = {
  faceRecognition: {
    enabled: true,
    confidenceThreshold: 0.6,
    minFaceSizeFraction: 0.05,
    modelPath: '/models/face',
    personEntityTypes: ['person'],
    reprocessSyncedImages: true,
    externalModel: {},
  },
};

describe('the round trip that was broken', () => {
  it('a body echoed back is accepted, with the server-owned fields removed', () => {
    const { body, refusal } = stripServerOwnedMedia(structuredClone(RESOLVED), RESOLVED);
    assert.equal(refusal, undefined, 'an unchanged echo is not an attempt to change anything');
    assert.ok(!('enabled' in body.faceRecognition), 'the field that broke every save must be gone');
    assert.ok(!('modelPath' in body.faceRecognition));
    assert.ok(!('reprocessSyncedImages' in body.faceRecognition));
    assert.equal(body.faceRecognition.confidenceThreshold, 0.6,
      'and the fields the caller may actually set must survive');
  });

  it('the CALLER’s object is not mutated', () => {
    // A strip that edited the request body in place would be invisible here and load-bearing elsewhere: the
    // audit snapshot and the infra-lock check both read the body after this runs.
    const sent = structuredClone(RESOLVED);
    stripServerOwnedMedia(sent, RESOLVED);
    assert.equal(sent.faceRecognition.enabled, true, 'the input must be left alone');
  });

  it('an emptied block is dropped entirely, not left as {}', () => {
    // `faceRecognition: {}` left behind reads to every downstream check as "the caller touched the face
    // block", and one of them opens a network vote on that basis.
    const { body } = stripServerOwnedMedia({ faceRecognition: { enabled: true } }, RESOLVED);
    assert.ok(!('faceRecognition' in body), 'a block with nothing left in it must not survive');
  });

  it('a CHANGED value is refused, not silently dropped', () => {
    // The other direction, and the one a bare strip gets wrong: an operator who genuinely tries to turn the
    // pin off would get a 200 and no change, which is worse than any error.
    const { refusal } = stripServerOwnedMedia(
      { faceRecognition: { enabled: false } }, RESOLVED);
    assert.ok(refusal, 'an attempt to CHANGE an env-only field must be reported');
    assert.equal(refusal.field, 'faceRecognition.enabled');
    assert.match(refusal.how, /FACE_RECOGNITION_ENABLED/,
      'the refusal must say how the field IS set, or the caller has nowhere to go');
  });

  it('and the refusal is a 403, not a 400', () => {
    // The body is well-formed and the field is real; what is wrong is that this route is not where it lives.
    // A 400 sends the caller to inspect their JSON, which is the one place the problem is not.
    const at = SRC.indexOf('stripped.refusal');
    assert.ok(at > -1, 'the refusal is not handled in the route');
    assert.match(SRC.slice(at, SRC.indexOf('return;', at)), /status\(403\)/);
  });

  it('a non-primitive is compared by VALUE, so a round-tripped list is not a change', () => {
    /*
     * EXERCISED, not asserted about the source. The first draft passed `personEntityTypes: ['person']` and
     * SURVIVED swapping the deep compare for `!==`, because that field is not on the strip list — so no
     * stripped path held an array and the test proved nothing.
     *
     * `stripServerOwnedMedia` is generic over the VALUE at a path, so handing it a `resolved` whose stripped
     * path holds an array exercises the comparator for real. The shape is contrived on purpose: `enabled` is a
     * boolean in production, and the claim under test is about the comparison, not about that field.
     */
    const arrayResolved = { faceRecognition: { ...RESOLVED.faceRecognition, enabled: ['a', 'b'] } };
    const { refusal } = stripServerOwnedMedia(
      { faceRecognition: { enabled: ['a', 'b'] } }, arrayResolved);
    assert.equal(refusal, undefined,
      'two equal arrays are the same value; a reference compare would report a change and refuse the save');
    // And the other direction, so this cannot pass by never refusing anything.
    const changed = stripServerOwnedMedia({ faceRecognition: { enabled: ['a', 'c'] } }, arrayResolved);
    assert.ok(changed.refusal, 'a DIFFERENT array is a change and must still be refused');
  });
});

describe('the strip runs BEFORE validation', () => {
  it('or the strict schema refuses the body first', () => {
    // The whole defect in one ordering. `.strict()` sees an unknown key and rejects the entire request, so a
    // strip placed after it never runs.
    const strip = SRC.indexOf('stripServerOwnedMedia(req.body');
    const parse = SRC.indexOf('MediaConfigPatchSchema.safeParse');
    assert.ok(strip > -1 && parse > -1, 're-anchor this gate');
    assert.ok(strip < parse, 'the strip must precede the parse');
  });

  it('and the parse reads the STRIPPED body, not the original', () => {
    // Ordering alone is not enough: parsing `req.body` after stripping a copy would look right and change
    // nothing. This is the assertion the ordering one cannot make.
    assert.match(SRC, /safeParse\(stripped\.body\)/,
      'the validator must be given the stripped body');
  });
});

/**
 * THE CLASS, derived rather than listed.
 *
 * `FaceRecognitionConfig`'s fields are the ones the GET emits for that block, because the getter's return type
 * is `Required<FaceRecognitionConfig>`. Anything there that the patch schema does not declare must be on the
 * strip list, or it is the next `enabled`.
 */
describe('every field the GET emits is either settable or stripped', () => {
  /** Field names declared on an interface body in types.ts. */
  const fieldsOf = (iface) => {
    const at = TYPES.indexOf(`export interface ${iface} {`);
    assert.ok(at > -1, `${iface} not found — re-anchor this gate`);
    const body = TYPES.slice(at, TYPES.indexOf('\n}', at));
    return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map(m => m[1]);
  };

  /** Field names declared inside a Zod object in media-config.ts. */
  const schemaFields = (name) => {
    const at = SRC.indexOf(`const ${name} = z.object({`);
    assert.ok(at > -1, `${name} not found — re-anchor this gate`);
    const body = SRC.slice(at, SRC.indexOf('}).strict()', at));
    return [...body.matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
  };

  it('the two shapes are readable — this gate is not measuring nothing', () => {
    assert.ok(fieldsOf('FaceRecognitionConfig').length >= 6,
      `only found ${fieldsOf('FaceRecognitionConfig').length} fields on the config interface`);
    assert.ok(schemaFields('FaceRecognitionPatchSchema').length >= 3,
      'the patch schema yielded almost nothing — the parser is wrong, not the code');
  });

  it('no emitted face field is both unsettable and unstripped', () => {
    const emitted = fieldsOf('FaceRecognitionConfig');
    const settable = new Set(schemaFields('FaceRecognitionPatchSchema'));
    const strip = SRC.slice(SRC.indexOf('SERVER_OWNED_MEDIA_PATHS = ['), SRC.indexOf('] as const;'));
    const orphans = emitted
      .filter(f => !settable.has(f))
      .filter(f => !strip.includes(`'faceRecognition.${f}'`));
    assert.deepEqual(orphans, [],
      'these fields are returned by the GET, refused by the PATCH, and not stripped — so echoing the config '
      + 'back 400s the whole body, which is exactly the defect this file exists for:\n  '
      + orphans.map(f => `faceRecognition.${f}`).join('\n  ')
      + '\nAdd each to SERVER_OWNED_MEDIA_PATHS with a line in SERVER_OWNED_MEDIA_HOW, or to the patch schema.');
  });

  it('and the strip list names nothing the schema already accepts', () => {
    // The opposite rot: a field made settable while its strip entry stays would be silently dropped from every
    // patch, so the caller gets a 200 and no change.
    const settable = new Set(schemaFields('FaceRecognitionPatchSchema'));
    const strip = [...SRC.slice(SRC.indexOf('SERVER_OWNED_MEDIA_PATHS = ['), SRC.indexOf('] as const;'))
      .matchAll(/'faceRecognition\.(\w+)'/g)].map(m => m[1]);
    const contradictory = strip.filter(f => settable.has(f));
    assert.deepEqual(contradictory, [],
      'these are on the patch schema AND on the strip list, so every attempt to set them is dropped with a 200');
  });
});

describe('the client stopped sending it too', () => {
  it('the payload no longer carries faceRecognition.enabled', () => {
    // Belt as well as braces. The server strip makes a round trip work for ANY caller; this keeps our own
    // intent legible, and the comment above that list already said "only the PATCH-writable face fields".
    const at = CLIENT.indexOf('faceRecognition: {');
    assert.ok(at > -1, 're-anchor this gate: the payload block moved');
    const block = CLIENT.slice(at, CLIENT.indexOf('},', CLIENT.indexOf('...(this.faceExternalLocked()', at)));
    assert.doesNotMatch(block, /^\s*enabled:/m,
      'the UI is echoing a field it cannot edit and the API cannot accept');
    assert.match(block, /confidenceThreshold:/, 'and the fields it CAN set must still be sent');
  });

  it('the unreachable disable confirmation is gone, not commented out', () => {
    // It compared a load-time baseline against a field no control binds, so it could never fire — a consent
    // dialog guarding a transition the UI cannot express, feeding a payload field the API cannot accept.
    assert.doesNotMatch(CLIENT, /faceBeingDisabled\(\)\s*[:{]/,
      'the guard still exists; a check that cannot fire reads as a working safeguard');
    assert.doesNotMatch(CLIENT, /faceEnabledBaseline/,
      'its baseline is still tracked, which is the same claim in a different place');
  });
});
