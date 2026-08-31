import { TTL_BUCKETS, recordTtlWindows } from '../../core/api.types';
/**
 * One sentence for the space-wide expiry.
 *
 * Reads the BUCKETS rather than the raw field, because the tier is five numbers. When they all agree it says
 * the one sentence it always did — a space with a single window must not be made to look complicated by an
 * implementation detail — and it lists per bucket only when they actually differ.
 */
export function retentionSummary(space, t) {
    const w = recordTtlWindows(space?.recordTtlDays);
    const set = TTL_BUCKETS.filter(b => w[b] !== null);
    if (set.length === 0)
        return t('brain.overview.retentionNone');
    if (set.length === TTL_BUCKETS.length && new Set(set.map(b => w[b])).size === 1) {
        return t('brain.overview.retentionSpaceWide', { days: w[set[0]] });
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
export function retentionTypeOverrides(space, t) {
    const schemas = space?.meta?.typeSchemas ?? {};
    const out = [];
    for (const [collection, types] of Object.entries(schemas)) {
        for (const [type, schema] of Object.entries(types ?? {})) {
            const r = schema?.retention;
            if (!r || (!r.days && !r.contentDays))
                continue;
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
