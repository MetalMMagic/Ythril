/**
 * Merging an admin PATCH into the stored `config.embedding` block.
 *
 * This is a pure function in its own module for one reason: the merge had a bug that only a running server
 * could see, and it survived because the only way to exercise it was a running server.
 *
 * The bug: the route deleted a cleared key from the **patch** and then spread the patch over the existing
 * block — so the `null` was gone before it could clear anything and the previous value survived. Clearing
 * `embedding.baseUrl` from the UI (which sends `baseUrl: null`, the documented "back to the bundled ONNX
 * model" gesture) silently kept the configured endpoint, and the save response — resolved from the config it
 * had just failed to change — repopulated the field as though the save had been ignored.
 *
 * `rerank` and `nli` in the same handler get this right by merging FIRST and deleting from the RESULT. That
 * ordering is the whole content of this function.
 */

/** Keys where "cleared" is a meaningful state: absent means the default, not zero. */
const CLEARABLE = ['baseUrl', 'embedConcurrency'] as const;

/**
 * `existing` merged with `patch`, with cleared keys removed and `apiKey` never present.
 *
 * `apiKey` is routed to `secrets.json` by the caller; it must not reach `config.json` even if a client sends
 * it, which is why it is dropped here rather than trusted to have been deleted upstream.
 */
export function mergeEmbeddingPatch(
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}), ...patch };
  delete merged['apiKey'];
  for (const key of CLEARABLE) {
    if (key in patch && (patch[key] === null || patch[key] === '')) delete merged[key];
  }
  return merged;
}
