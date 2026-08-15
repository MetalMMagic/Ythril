import { Space, TTL_BUCKETS, recordTtlWindows } from '../../core/api.types';

/**
 * What the Overview's Indexing card says about retention — as pure functions, beside the component.
 *
 * ## Why they moved out
 *
 * `overview-tab.component.ts` is one of the files the god-file ratchet has frozen, and the honest response to
 * a frozen file is to put new behaviour beside it rather than inside it. This is the part of that component
 * that was never about rendering: two computeds that read a space and produce strings, with no template, no
 * signals and no injection beyond a translate function.
 *
 * That makes them directly testable — the component's own tests have to render a card to assert a sentence,
 * and these can be called.
 *
 * `translate` is passed in rather than injected for the same reason: a pure function of (space, translate)
 * has no Angular in it at all.
 */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * One sentence for the space-wide expiry.
 *
 * Reads the BUCKETS rather than the raw field, because the tier is five numbers. When they all agree it says
 * the one sentence it always did — a space with a single window must not be made to look complicated by an
 * implementation detail — and it lists per bucket only when they actually differ.
 */
export function retentionSummary(space: Space | null | undefined, t: Translate): string {
  const w = recordTtlWindows(space?.recordTtlDays);
  const set = TTL_BUCKETS.filter(b => w[b] !== null);
  if (set.length === 0) return t('brain.overview.retentionNone');
  if (set.length === TTL_BUCKETS.length && new Set(set.map(b => w[b])).size === 1) {
    return t('brain.overview.retentionSpaceWide', { days: w[set[0]!] });
  }
  return t('brain.overview.retentionBuckets', {
    list: set.map(b => t('brain.overview.retentionBucketOne', {
      bucket: t(`spaces.dangerZone.retentionBucket.${b}`), days: w[b],
    })).join(', '),
  });
}

/**
 * Types whose schema overrides the space-wide window.
 *
 * Listed because the sentence above is a half-truth without them: an operator who set 30 days and sees one
 * type keeping records for ten years needs the reason on the same card, not in another tab.
 */
export function retentionTypeOverrides(
  space: Space | null | undefined,
  t: Translate,
): Array<{ key: string; label: string }> {
  const schemas = space?.meta?.typeSchemas ?? {};
  const out: Array<{ key: string; label: string }> = [];
  for (const [collection, types] of Object.entries(schemas)) {
    for (const [type, schema] of Object.entries(types ?? {})) {
      const r = schema?.retention;
      if (!r || (!r.days && !r.contentDays)) continue;
      const name = `${collection}.${type}`;
      const label = r.days && r.contentDays
        ? t('brain.overview.retentionTypeContent', { type: name, days: r.days, contentDays: r.contentDays })
        : r.days
          ? t('brain.overview.retentionType', { type: name, days: r.days })
          : t('brain.overview.retentionTypeContentOnly', { type: name, contentDays: r.contentDays });
      out.push({ key: name, label });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
