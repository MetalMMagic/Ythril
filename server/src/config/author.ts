import { getConfig } from './loader.js';
import type { AuthorRef } from './types.js';

/**
 * The `{ instanceId, instanceLabel }` stamp recording which instance wrote a record.
 * Single source of truth — every knowledge/file writer stamps its docs with this so the
 * identity shape can never drift across the brain and file subsystems.
 */
export function authorRef(): AuthorRef {
  const cfg = getConfig();
  return { instanceId: cfg.instanceId, instanceLabel: cfg.instanceLabel };
}
