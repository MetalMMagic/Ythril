/**
 * Shared helper for turning a knowledge record's `properties` into embeddable text.
 *
 * The per-type embed-text builders (memory, entity, edge, chrono, and the entity-merge
 * copy) all need to fold `properties` into the string that gets embedded. Keeping the
 * logic here means they cannot drift again — before this existed, memory/entity embedded
 * only property VALUES (dropping the keys) while edge and chrono dropped properties
 * entirely, so semantic recall couldn't match on a property name and values lost their
 * field context (`{birthplace: "Paris"}` and `{currentCity: "Paris"}` embedded identically).
 */
export function propsEmbedText(
  properties?: Record<string, string | number | boolean>,
): string {
  if (!properties) return '';
  // Include BOTH the key and the value: the key ("role") makes the field name searchable,
  // and pairing it with the value keeps each value tied to its field.
  return Object.entries(properties)
    .map(([k, v]) => `${k} ${String(v)}`)
    .join(' ');
}

// ── Per-type embed-text builders ─────────────────────────────────────────────
// One home for every "record → embeddable string" derivation. The writers
// (remember/upsertEntity/upsertEdge/createChrono/upsertFileMeta), the entity-merge
// path, AND the reindex job all call these, so the embedding of a record is identical
// no matter which path produced it. Previously each lived privately in its domain
// module and was hand-re-implemented inline in the reindex job, which had drifted
// (values-only properties for memory/entity; properties dropped and raw entity IDs
// embedded for edges/chrono on reindex).

/** Memory: tags + linked-entity names + fact + description + properties (key value). */
export function memoryEmbedText(
  fact: string,
  tags: string[] = [],
  entityNames: string[] = [],
  description?: string,
  properties?: Record<string, string | number | boolean>,
): string {
  const parts: string[] = [];
  if (tags.length > 0) parts.push(tags.join(' '));
  if (entityNames.length > 0) parts.push(entityNames.join(' '));
  parts.push(fact);
  if (description?.trim()) parts.push(description.trim());
  const propsText = propsEmbedText(properties);
  if (propsText) parts.push(propsText);
  return parts.join(' ');
}

/** Entity: name + type + tags + description + properties (key value). */
export function entityEmbedText(
  name: string,
  type: string,
  tags: string[] = [],
  description?: string,
  properties: Record<string, string | number | boolean> = {},
): string {
  const parts: string[] = [name, type];
  if (tags.length > 0) parts.push(tags.join(' '));
  if (description?.trim()) parts.push(description.trim());
  const propsText = propsEmbedText(properties);
  if (propsText) parts.push(propsText);
  return parts.join(' ');
}

/** Edge: tags + from-name + label + to-name + type + description + properties (key value).
 *  `from`/`to` are the resolved entity NAMES (resolve IDs before calling). */
export function edgeEmbedText(
  from: string,
  label: string,
  to: string,
  tags: string[] = [],
  type?: string,
  description?: string,
  properties?: Record<string, string | number | boolean>,
): string {
  const parts: string[] = [];
  if (tags.length > 0) parts.push(tags.join(' '));
  parts.push(from, label, to);
  if (type?.trim()) parts.push(type.trim());
  if (description?.trim()) parts.push(description.trim());
  const propsText = propsEmbedText(properties);
  if (propsText) parts.push(propsText);
  return parts.join(' ');
}

/** Chrono: type + status + title + tags + description + properties (key value). */
export function chronoEmbedText(
  title: string,
  type: string,
  status: string,
  description?: string,
  tags: string[] = [],
  properties?: Record<string, string | number | boolean>,
): string {
  const parts: string[] = [type, status, title];
  if (tags.length > 0) parts.push(tags.join(' '));
  if (description?.trim()) parts.push(description.trim());
  const propsText = propsEmbedText(properties);
  if (propsText) parts.push(propsText);
  return parts.join(' ');
}

/** File: path + linked-entity names + tags + description + property VALUES.
 *  NOTE: files remain the one type that embeds property values-only (no keys) — migrating
 *  them to `propsEmbedText` would change existing file embeddings and needs a reindex, so it
 *  is deliberately left as-is here; this builder just centralises the existing behavior. */
export function fileEmbedText(
  filePath: string,
  tags: string[] = [],
  description?: string,
  properties?: Record<string, string | number | boolean>,
  entityNames: string[] = [],
): string {
  const parts: string[] = [filePath];
  if (entityNames.length > 0) parts.push(entityNames.join(' '));
  if (tags.length > 0) parts.push(tags.join(' '));
  if (description?.trim()) parts.push(description.trim());
  if (properties) {
    const vals = Object.values(properties).map(v => String(v)).filter(v => v.trim());
    if (vals.length > 0) parts.push(vals.join(' '));
  }
  return parts.join(' ');
}
