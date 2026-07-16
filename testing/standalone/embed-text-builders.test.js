/**
 * Unit tests for the shared per-type embed-text builders (compiled build).
 *
 * These builders are the single source of truth for "record → embeddable string" used by
 * BOTH the writers (remember/upsertEntity/upsertEdge/createChrono/upsertFileMeta) and the
 * reindex job. Before centralisation the reindex hand-re-implemented them and had drifted:
 * memory/entity embedded property VALUES only (dropping keys), and edge/chrono dropped
 * properties entirely (edge also embedded raw entity IDs). These tests lock the contract so
 * a reindex reproduces exactly what a create embedded.
 *
 * Run: node --test testing/standalone/embed-text-builders.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  propsEmbedText, memoryEmbedText, entityEmbedText, edgeEmbedText, chronoEmbedText, fileEmbedText,
} from '../../server/dist/brain/embed-text.js';

describe('embed-text builders — property keys and field coverage', () => {
  it('propsEmbedText folds "key value" pairs (not values only)', () => {
    assert.equal(propsEmbedText({ role: 'admin', tier: 'gold' }), 'role admin tier gold');
    assert.equal(propsEmbedText(undefined), '');
  });

  it('memory: includes tags, entity names, fact, description, and key+value properties', () => {
    const t = memoryEmbedText('the fact', ['t1'], ['Alice'], 'desc', { occupation: 'pilot' });
    assert.match(t, /the fact/);
    assert.match(t, /Alice/);
    assert.match(t, /occupation pilot/, `properties must fold key+value: ${t}`);
  });

  it('entity: includes name, type, and key+value properties', () => {
    const t = entityEmbedText('Bob', 'person', [], undefined, { occupation: 'engineer' });
    assert.match(t, /Bob person/);
    assert.match(t, /occupation engineer/, `entity properties must fold key+value: ${t}`);
  });

  it('edge: uses resolved from/to NAMES and includes key+value properties', () => {
    // The reindex used to embed raw entity IDs and drop properties entirely — guard both.
    const t = edgeEmbedText('ServiceA', 'depends_on', 'ServiceB', ['infra'], 'runtime', 'd', { medium: 'grpc' });
    assert.match(t, /ServiceA depends_on ServiceB/, `edge must embed names, not ids: ${t}`);
    assert.match(t, /medium grpc/, `edge properties must be included (were dropped on reindex): ${t}`);
  });

  it('chrono: includes type, status, title, and key+value properties', () => {
    // The reindex used to drop chrono properties entirely — guard it.
    const t = chronoEmbedText('Launch', 'event', 'upcoming', 'd', ['q3'], { venue: 'stadium' });
    assert.match(t, /event upcoming Launch/);
    assert.match(t, /venue stadium/, `chrono properties must be included (were dropped on reindex): ${t}`);
  });

  it('file: path + names + tags + description, properties values-only (documented holdout)', () => {
    const t = fileEmbedText('docs/a.pdf', ['spec'], 'desc', { format: 'pdf' }, ['Alice']);
    assert.match(t, /docs\/a\.pdf/);
    assert.match(t, /Alice/);
    // Files deliberately still embed property values only (no key) — pinned so a future
    // migration to propsEmbedText is a conscious, tested change.
    assert.match(t, /\bpdf\b/);
    assert.doesNotMatch(t, /format pdf/, `file properties are intentionally values-only: ${t}`);
  });
});
