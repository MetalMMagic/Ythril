/**
 * The link classes, declared ONCE.
 *
 * ## What a "link class" is
 *
 * An edge is a record. A **link** is not: it is a field on a chrono entry, memory or file naming the entities
 * it concerns (`entityIds`), and four separate places in the server read those fields to answer four different
 * questions — what a graph walk can reach, what blocks a delete, what the ER diagram draws, and what sync
 * checks. Each of them carried its own literal knowledge of the collection name, the field, the synthetic edge
 * label, and the predicate that keeps file CHUNKS out.
 *
 * ## The four copies, and what already differed between them
 *
 * `traverseGraph` (`edges.ts`) excludes chunks with `parentFileId: { $exists: false }` and says why: chunks
 * live in the same collection as their file and are told apart only by that field, so without it one document
 * split into forty passages arrives as forty nodes carrying passage text. **The other three readers do not
 * exclude them.**
 *
 * That is latent rather than live, and saying so precisely matters: the conversion pipeline never writes
 * `entityIds` onto a chunk, so today nothing is double-counted. But `updateFileMeta` will set `entityIds` on
 * any filemeta record by id, chunk included — so the divergence is reachable deliberately, and it is the exact
 * shape of "one rule, four implementations, and the weakest wins silently" that this codebase produces most.
 * Extracting it means the rule cannot be present in three readers and absent from a fourth.
 *
 * ## Deliberately not a migration
 *
 * Nothing here changes what is stored, what is embedded, or what crosses a sync. It is the authoritative
 * enumeration of what a link IS — which is also what any future conversion of links into real edge records
 * would have to be driven from, and nothing in the tree currently plays that part.
 */
import type { KnowledgeType } from '../config/types.js';

/** One kind of field-based link from a record to the entities it concerns. */
export interface LinkClass {
  /** The record kind holding the link. Matches `TraverseNode.kind`. */
  kind: 'chrono' | 'memory' | 'file';
  /** Collection suffix: the collection is `${spaceId}_${collection}`. */
  collection: 'chrono' | 'memories' | 'files';
  /** The field naming the linked entities. One name today, declared rather than assumed. */
  field: 'entityIds';
  /**
   * The label the synthetic edge for this link carries.
   *
   * A real value rather than an empty string, so `edgeLabels` can include or exclude a link like any other
   * relationship and a reader of a traverse result can tell a modelled relationship from a derived one.
   *
   * It used to live in `edges.ts` beside the traversal that emits it, and this docblock argued that folding
   * the two together *"would make an import cycle for the sake of one string apiece"*. That was true only in
   * the direction it was tried: `edges.ts` already imports this module, so moving the string HERE costs no
   * cycle at all. It moved when a second traversal needed the same three labels — one more reader is one
   * more chance for the copies to disagree, and a label is part of what a link IS.
   */
  label: string;
  /**
   * Extra predicate this class needs beyond the field match.
   *
   * Files carry one and the other two do not: chunk records share the file collection and are distinguished
   * only by `parentFileId`, so a scan without this counts a forty-passage document forty times.
   */
  scope: Record<string, unknown>;
  /**
   * What a STRUCTURAL read needs — never the record body.
   *
   * A traverse or an ER scan asks about shape, so it must not pay for a file's passage text or a memory's
   * full fact. Each class names the smallest projection that answers "what is this, and what does it link to".
   */
  projection: Record<string, 1>;
}

/**
 * Every link class, in the order a traversal emits them.
 */
export const LINK_CLASSES: readonly LinkClass[] = [
  {
    kind: 'chrono',
    collection: 'chrono',
    field: 'entityIds',
    label: 'chrono.entityIds',
    scope: {},
    projection: { title: 1, type: 1, entityIds: 1 },
  },
  {
    kind: 'memory',
    collection: 'memories',
    field: 'entityIds',
    label: 'memory.entityIds',
    scope: {},
    projection: { fact: 1, type: 1, entityIds: 1 },
  },
  {
    kind: 'file',
    collection: 'files',
    field: 'entityIds',
    label: 'file.entityIds',
    // See `LinkClass.scope`: chunks share this collection with the files they came from.
    scope: { parentFileId: { $exists: false } },
    projection: { path: 1, description: 1, tags: 1, entityIds: 1 },
  },
] as const;

/** The class for one record kind, or `undefined` for a kind that has no field-based links (an entity, an edge). */
export function linkClassFor(kind: KnowledgeType | 'file'): LinkClass | undefined {
  return LINK_CLASSES.find(c => c.kind === kind);
}

/**
 * The filter matching records of this class that link to ANY of `entityIds`.
 *
 * `$in` rather than an equality even for a single id, so a frontier and a single-entity backlink scan use one
 * shape. Callers that want one id pass a one-element array.
 */
export function linksToAny(spaceId: string, cls: LinkClass, entityIds: readonly string[]): Record<string, unknown> {
  return { spaceId, [cls.field]: { $in: [...entityIds] }, ...cls.scope };
}

/** The filter matching records of this class that have ANY link at all — the ER diagram's scan. */
export function hasAnyLink(cls: LinkClass): Record<string, unknown> {
  return { [cls.field]: { $exists: true, $ne: [] }, ...cls.scope };
}
