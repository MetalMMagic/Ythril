/**
 * Standalone tests: face recognition is settable by infra.
 *
 * It was the one model in the whole media pipeline with no env override. Vision, speech-to-text,
 * embedding, the assist model and both sidecars could all be pinned by an infra admin — so an
 * infra-managed deployment could fix every model EXCEPT whether faces get detected and embedded at all,
 * which is the setting with the clearest privacy weight of the lot.
 *
 * These pin the precedence (env → config → default), the coercion of each field, and that a pinned
 * field is reported in `lockedByInfra` so the Settings UI renders it read-only rather than offering a
 * control that silently does nothing.
 *
 * Run: node --test testing/standalone/face-recognition-env.test.js
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let getFaceRecognitionConfig;
let lockedFaceRecognitionFields;

const ENV_KEYS = [
  'FACE_RECOGNITION_ENABLED',
  'FACE_RECOGNITION_CONFIDENCE_THRESHOLD',
  'FACE_RECOGNITION_MIN_FACE_SIZE_FRACTION',
  'FACE_RECOGNITION_MODEL_PATH',
  'FACE_RECOGNITION_PERSON_ENTITY_TYPES',
  'FACE_RECOGNITION_REPROCESS_SYNCED_IMAGES',
];
const saved = {};

describe('face recognition — infra-settable', () => {
  before(async () => {
    ({ getFaceRecognitionConfig, lockedFaceRecognitionFields } = await import('../../server/dist/config/loader.js'));
  });

  beforeEach(() => {
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  });

  it('is off by default — enabling it stays a deliberate act', () => {
    assert.equal(getFaceRecognitionConfig().enabled, false);
    assert.deepEqual(lockedFaceRecognitionFields(), []);
  });

  it('can be switched on from the environment', () => {
    process.env['FACE_RECOGNITION_ENABLED'] = 'true';
    assert.equal(getFaceRecognitionConfig().enabled, true);
  });

  it('accepts 1 as well as true, and treats anything else as off', () => {
    process.env['FACE_RECOGNITION_ENABLED'] = '1';
    assert.equal(getFaceRecognitionConfig().enabled, true);
    for (const v of ['yes', 'TRUE', 'on', '']) {
      process.env['FACE_RECOGNITION_ENABLED'] = v;
      assert.equal(getFaceRecognitionConfig().enabled, false, `"${v}" must not enable face recognition`);
    }
  });

  it('coerces the numeric thresholds', () => {
    process.env['FACE_RECOGNITION_CONFIDENCE_THRESHOLD'] = '0.82';
    process.env['FACE_RECOGNITION_MIN_FACE_SIZE_FRACTION'] = '0.05';
    const cfg = getFaceRecognitionConfig();
    assert.equal(cfg.confidenceThreshold, 0.82);
    assert.equal(cfg.minFaceSizeFraction, 0.05);
  });

  it('parses the person entity types as a comma-separated list', () => {
    process.env['FACE_RECOGNITION_PERSON_ENTITY_TYPES'] = 'person, employee ,contractor';
    assert.deepEqual(getFaceRecognitionConfig().personEntityTypes, ['person', 'employee', 'contractor']);
  });

  it('takes the model path verbatim', () => {
    process.env['FACE_RECOGNITION_MODEL_PATH'] = '/opt/models/human';
    assert.equal(getFaceRecognitionConfig().modelPath, '/opt/models/human');
  });

  it('reports every pinned field so the UI can render it read-only', () => {
    process.env['FACE_RECOGNITION_ENABLED'] = 'true';
    process.env['FACE_RECOGNITION_CONFIDENCE_THRESHOLD'] = '0.9';
    const locked = lockedFaceRecognitionFields();
    assert.deepEqual(locked.sort(), ['faceRecognition.confidenceThreshold', 'faceRecognition.enabled']);
    // A control that looks editable but is overridden by env is worse than one that says so.
    assert.ok(!locked.includes('faceRecognition.modelPath'), 'unpinned fields must stay editable');
  });

  // docker-compose passes these as `FACE_RECOGNITION_ENABLED: ${FACE_RECOGNITION_ENABLED:-}`, which
  // leaves the variable DEFINED BUT EMPTY when the operator set nothing. Reading "defined" as "pinned"
  // would parse '' as false and force the feature off for every Compose deployment, while reporting
  // all six fields as infra-locked — controls the operator cannot use and could not explain.
  it('an empty env var is not a pin — it means the operator set nothing', () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('FACE_RECOGNITION_')) delete process.env[key];
    }
    process.env['FACE_RECOGNITION_ENABLED'] = '';
    process.env['FACE_RECOGNITION_MODEL_PATH'] = '';
    process.env['FACE_RECOGNITION_PERSON_ENTITY_TYPES'] = '';

    assert.deepEqual(lockedFaceRecognitionFields(), [], 'an empty value must not lock anything');
    const cfg = getFaceRecognitionConfig();
    assert.equal(cfg.enabled, false, 'still the default');
    assert.equal(cfg.modelPath, 'human-models', 'the default path, not an empty string');
    assert.deepEqual(cfg.personEntityTypes, ['person'], 'the default list, not an empty list');
  });

});
