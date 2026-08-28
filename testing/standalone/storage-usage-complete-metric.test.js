/**
 * `ythril_storage_usage_complete` — the one series that says whether the storage figures are whole.
 *
 * ## Why this gauge needs its own test
 *
 * Every `ythril_storage_used_bytes` series is a LOWER BOUND whenever a directory could not be listed or
 * `dbStats` was refused, and a floor compared against a hard limit can only under-report — so a quota an
 * operator configured stops firing with nothing to see. No storage series can express that: 0.4 GiB reads
 * identically whether it is the whole store or the readable part of it.
 *
 * The alerting direction is `== 0`, and that is exactly what makes this gauge easy to get wrong. `reset()`
 * GUARANTEES a plausible value — it sets 0 — so a gauge that resets on "nothing measured yet" reports the
 * alerting state on a healthy instance that has simply not walked the disk yet. This asserts the ABSENCE
 * instead, which is the same convention the storage series already uses: *"an absent series says 'not measured
 * yet' where a zero would have claimed 'empty'"*.
 *
 * Run: node --test testing/standalone/storage-usage-complete-metric.test.js
 */
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let register, invalidateUsageCache, measureUsage;

/** One area's value, or `undefined` when the gauge has no series for it. */
async function value(area) {
  const json = await register.getSingleMetric('ythril_storage_usage_complete').get();
  return json.values.find(v => v.labels.area === area)?.value;
}

describe('ythril_storage_usage_complete', () => {
  before(async () => {
    ({ register } = await import('../../server/dist/metrics/registry.js'));
    ({ invalidateUsageCache, measureUsage } = await import('../../server/dist/quota/quota.js'));
  });

  beforeEach(() => invalidateUsageCache());

  it('is registered under an alertable name, with an area label', () => {
    const g = register.getSingleMetric('ythril_storage_usage_complete');
    assert.ok(g, 'the gauge must be on the registry, or nothing can alert on it');
    /*
     * The LABEL is what makes absence expressible. An unlabelled prom-client Gauge is initialised to 0 on
     * construction, so it can never be absent — and 0 is the alerting state here, which means an unlabelled
     * version reports "the storage figures are a floor" on every instance from the moment it boots. That is the
     * same trap as `reset()`: it guarantees a plausible value where the honest answer is no value.
     */
    assert.deepEqual(g.labelNames, ['area'], 'without a label the gauge cannot be absent, and 0 is the alert');
  });

  it('reports a verdict per area once a measurement has run', async () => {
    // Both halves are independent: a readable files tree and a refused `dbStats` is a real combination, and it
    // is precisely the one a single unlabelled series could not describe.
    await measureUsage();
    for (const area of ['files', 'brain']) {
      const v = await value(area);
      assert.ok(v === 0 || v === 1, `${area}: the gauge must report a verdict once measured, got ${v}`);
    }
  });

  it('the gauge and the measurement cannot disagree about what "complete" means, per area', async () => {
    /*
     * The two-copies check, and it is the reason `usageIsComplete` is exported rather than re-implemented here:
     * a gauge computed from its own rule would report health while the quota under-counts — the same defect one
     * layer down, wearing a metric.
     *
     * Provoked through the measurement rather than by setting the gauge. A test that sets the gauge asserts
     * nothing about whether anything ever sets it. In a standalone run there is no MongoDB, so `dbStats` fails
     * and the brain half genuinely reports incomplete — the real path, not a simulated one.
     */
    await measureUsage();
    const { peekUsage, usageIsComplete } = await import('../../server/dist/quota/quota.js');
    const peek = peekUsage();
    assert.ok(peek, 'the measurement must have populated the cache');
    for (const area of ['files', 'brain']) {
      const expected = usageIsComplete(peek.usage, area) ? 1 : 0;
      assert.equal(await value(area), expected,
        `${area}: the gauge must agree with the measurement it reads — reasons: `
        + `${peek.usage.incomplete[area].join('; ') || 'none'}`);
    }
  });

  it('the brain half genuinely reports incomplete when dbStats cannot run', async () => {
    // Not a tautology against the line above: this pins that the incomplete path is REACHED at all in this
    // run, so the agreement check is not comparing two 1s and proving nothing.
    await measureUsage();
    const { peekUsage } = await import('../../server/dist/quota/quota.js');
    const brain = peekUsage().usage.incomplete.brain;
    assert.ok(brain.length > 0, 'with no database reachable, the brain half must say so rather than report 0 GiB');
    assert.match(brain[0], /dbStats/, 'and name what it could not run');
    assert.equal(await value('brain'), 0, 'so the gauge must read 0 for that area');
  });
});
