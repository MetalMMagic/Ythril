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
