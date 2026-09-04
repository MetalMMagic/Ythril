/**
 * "Which linked records hang off this frontier" — asked once, for both traversals.
 *
 * ## Why it is its own module
 *
 * `traverseGraph` carried three near-identical blocks, one per link class: scan the collection for records
 * whose `entityIds` meet the frontier, skip the visited, work out which frontier node each hangs off, keep
 * it. `traverseFromSeeds` — recall's expansion — needed the same three, which would have made six copies of
 * one rule in one file.
 *
 * `CLAUDE.md` names that exact shape as the defect this repo produces most, and the three copies had already
 * started to differ in the small: chrono and memory read `doc.entityIds` directly, files read
 * `(doc.entityIds ?? [])` because a filemeta record may have none. One of those is right for all three.
 *
 * ## What it deliberately does NOT do
 *
 * It does not emit nodes. A standalone traverse returns `TraverseNode`s and a recall returns records nested
 * under the seed that reached them — two shapes, correctly, because they answer different questions. What is
 * shared is the *scan*: the query, the visit bookkeeping, and the choice of which frontier node is the
 * `from` of the synthetic edge. Folding the emit in too would have produced a function with a mode flag,
 * which is two functions wearing one name.
 */
import { col, asFilter } from '../db/mongo.js';
import { LINK_CLASSES, linksToAny, usesLinkRecords, linkedFromIds, linkedToPairs, scopedDocs, type LinkClass }
  from './link-adjacency.js';
import type { ChronoEntry, MemoryDoc, FileMetaDoc } from '../config/types.js';

/**
 * The shape both scans read a FROM record as: an id plus whichever of the three arrays the class names.
 *
 * Indexed rather than three optional fields, because the field is chosen by `cls.field` at run time and a
 * closed shape here would mean casting at every access — which is how `entityIds` came to be hardcoded in
 * both scans while five of the six classes are named through something else.
 */
type LinkRow = { _id: string } & Record<string, unknown>;

/** A record reached through a link rather than an edge. */
export interface LinkedRecord {
  /** Which class reached it — also what `TraverseNode.kind` and the nested `node.kind` report. */
  kind: LinkClass['kind'];
  /** The synthetic edge's label, taken from the class so the two cannot drift. */
  label: string;
  /** The record, holding only its class's projection. */
  doc: ChronoEntry | MemoryDoc | FileMetaDoc;
  /** The frontier entity it hangs off — the `from` of the synthetic edge. */
  via: string;
}

/**
 * Which link classes a walk follows.
 *
 * Three booleans rather than a set of kinds, because that is how both doors already spell it and how the
 * standalone `traverse` tool has always spelled it. A caller flipping one on should not have to restate the
 * other two.
 */
export interface LinkInclusion {
  includeChrono?: boolean | undefined;
  includeMemories?: boolean | undefined;
  includeFiles?: boolean | undefined;
}

/** Whether this class is switched on for this walk. */
function included(cls: LinkClass, inc: LinkInclusion): boolean {
  if (cls.kind === 'chrono') return inc.includeChrono === true;
  if (cls.kind === 'memory') return inc.includeMemories === true;
  return inc.includeFiles === true;
}

/**
 * Whether an explicit `edgeLabels` filter admits this class's synthetic label.
 *
 * An explicit filter excludes a link unless it names it — otherwise asking for `depends_on` would quietly
 * return chrono entries too, and a filter that cannot exclude something is not a filter. No filter, or an
 * empty one, means every label.
 */
function labelWanted(cls: LinkClass, edgeLabels?: readonly string[] | undefined): boolean {
  return !edgeLabels || edgeLabels.length === 0 || edgeLabels.includes(cls.label);
}

/**
 * Every linked record meeting `frontier`, across `memberIds`, for the classes this walk follows.
 *
 * **Mutates `visited`**, exactly as the edge half of a BFS does: a record reached at depth 2 must not be
 * emitted again at depth 3. Passing the caller's set rather than returning ids to merge is what keeps the
 * two halves of one walk honest about each other.
 *
 * `frontierSet` decides which frontier node a record hangs off. A record can link to several at once, and
 * the first that is actually ON the frontier is the truthful `from`; `frontier[0]` is the fallback for the
 * case that cannot happen — a record matched by the `$in` with no id in the set — and is there so the
 * synthetic edge is never built from an id the caller cannot see.
 */
export async function linkedRecordsAtFrontier(
  memberIds: readonly string[],
  frontier: readonly string[],
  frontierSet: ReadonlySet<string>,
  visited: Set<string>,
  inclusion: LinkInclusion,
  edgeLabels?: readonly string[] | undefined,
  /**
   * The most records this scan may return — the WALK'S OWN cap, never a number chosen here.
   *
   * Without it one hub entity returns its whole mention set, once per link class, per member space, per hop.
   * The node cap does not help: it counts records after they are hydrated, so the read has already happened.
   *
   * Owner's decision 2026-08-30: reuse the cap the walk already derives from `topK` and the byte budget,
   * rather than inventing a second number nobody tunes. The
   * accepted cost is that link scans and edge scans share one budget, so a hub with thousands of mentions can
   * crowd out its edge neighbours.
   *
   * **Hitting it is reported, and the first version of this said the existing truncation reporting covered
   * it. That was false.** The limit is spent on documents that are then discarded — `.limit()` runs before the
   * `visited` check — so a hop can consume its whole budget on records already emitted and still finish BELOW
   * the walk's node cap, which is the only thing either traversal looked at. The answer came back short and
   * flagged complete. Hence `scanCapped` below.
   */
  limit?: number,
): Promise<ScanResult<LinkedRecord>> {
  const out: LinkedRecord[] = [];
  let scanCapped = false;
  if (frontier.length === 0) return { records: out, scanCapped };

  for (const cls of LINK_CLASSES) {
    if (!included(cls, inclusion) || !labelWanted(cls, edgeLabels)) continue;
    for (const mid of memberIds) {
      // Bounded on the CURSOR. Reading everything and discarding the tail would cost the same scan and the
      // same transfer — the point is that the database stops early. `out.length` is subtracted so the bound
      // covers the call rather than each class separately.
      const remaining = limit === undefined ? undefined : Math.max(0, limit - out.length);
      // A budget spent before every class was read leaves whole kinds of record unlooked-at, not merely
      // trimmed — so this is a truncation even though nothing was thrown away here.
      if (remaining === 0) return { records: out, scanCapped: true };

      /*
       * Two storage shapes, one question — and the choice is `usesLinkRecords`, never a decision taken here.
       *
       * The link-record path is one indexed lookup on `{to, toKind}` and then a read of the records it named.
       * That second read is not overhead: a link row carries no title, no path and no `parentFileId`, so the
       * projection and the chunk exclusion both have to happen against the record itself. The array path is
       * one collection scan, exactly as 3.x did it.
       */
      const linked = usesLinkRecords(mid)
        ? await scopedDocs<LinkRow>(mid, cls, await linkedFromIds(mid, cls, frontier, remaining))
        : await col<LinkRow>(`${mid}_${cls.collection}`)
            .find(asFilter<LinkRow>(linksToAny(mid, cls, frontier)), { projection: cls.projection })
            .limit(remaining ?? 0)
            .toArray() as LinkRow[];
      // A cursor that came back FULL is the case that hides. The database stopped handing documents over, so
      // there may be more behind it — and that is true however many of these survive the `visited` filter
      // below. Counting what survives instead is exactly the mistake that made the bound silent.
      //
      // On the link-record path the bound is spent on LINK ROWS and `linked` counts RECORDS, which is the
      // smaller number once two rows name the same record — so the comparison is `>=`, not `===`. Equality
      // there would under-report the cap on exactly the dense neighbourhoods it exists for.
      if (remaining !== undefined && linked.length >= remaining) scanCapped = true;
      for (const doc of linked) {
        if (visited.has(doc._id)) continue;
        visited.add(doc._id);
        // `cls.field`, not `entityIds`: five of the six classes are named through a different field, and a
        // hardcoded `entityIds` here would give every chrono-to-memory link a `via` of `frontier[0]` — a
        // synthetic edge drawn from the wrong node, which reads as a real relationship.
        //
        // `?? []` because a projection is what decides whether the field comes BACK, which is a different
        // question from whether the filter proved it present.
        const named = (doc[cls.field] as string[] | undefined) ?? [];
        const via = named.find(id => frontierSet.has(id)) ?? frontier[0];
        out.push({ kind: cls.kind, label: cls.label, doc: doc as unknown as LinkedRecord['doc'], via });
      }
    }
  }
  return { records: out, scanCapped };
}

/**
 * What a bounded scan found, and whether it stopped reading before it ran out of matches.
 *
 * **`scanCapped` is "the scan stopped reading", not "the result filled up",** and only the first is knowable
 * at the cursor. The bound is spent on documents that are then discarded, so a hop can burn its whole budget
 * on records already visited and still return fewer than the walk's node cap — at which point every
 * length-based truncation check says the neighbourhood is complete. It is not, and the caller has no other
 * way to find out.
 */
export interface ScanResult<T> {
  records: T[];
  scanCapped: boolean;
}

/** One entity named by a linked record's `entityIds` — the link followed the OTHER way. */
export interface OutboundLink {
  /** The linked record the link starts from. */
  from: string;
  /** The entity it names. */
  to: string;
  /** The synthetic edge's label, the same one the backward direction uses. */
  label: string;
  /** Which class `from` belongs to. */
  kind: LinkClass['kind'];
}

/**
 * The entities that `recordIds` NAME — a link read forwards.
 *
 * ## Why this direction exists at all
 *
 * A link is undirected in fact and one-way in storage: the memory holds the ids, the entity holds nothing. So
 * "which memories mention this entity" and "which entities does this memory mention" are two queries, and
 * until 3.6 the server only ever asked the first.
 *
 * That is what made a non-entity RECALL SEED a dead end. Edge endpoints are entity ids, so a memory that
 * matched semantically had no edges to follow, and `recall(traverse: n)` returned it with an empty `_graph` at
 * any depth. Both doors documented the limit and told the caller to lift the `entityIds` off the match and
 * traverse from one of those by hand — which is this query, performed by the caller because the server
 * declined to.
 *
 * Only the seeds need it. Everything the walk reaches afterwards is an entity or a leaf, so this runs once
 * rather than per hop; a general version would spend three queries a hop to find nothing.
 */
export async function entitiesLinkedFromRecords(
  memberIds: readonly string[],
  recordIds: readonly string[],
  inclusion: LinkInclusion,
  edgeLabels?: readonly string[] | undefined,
  /** The walk's own cap — see `linkedRecordsAtFrontier`'s. */
  limit?: number,
): Promise<ScanResult<OutboundLink>> {
  const out: OutboundLink[] = [];
  let scanCapped = false;
  if (recordIds.length === 0) return { records: out, scanCapped };

  for (const cls of LINK_CLASSES) {
    if (!included(cls, inclusion) || !labelWanted(cls, edgeLabels)) continue;
    for (const mid of memberIds) {
      // `cls.scope` still applies: a chunk is a filemeta record and must not be walked as a file. `_id` is
      // the whole predicate otherwise — a record either is one of the seeds or it is not.
      /*
       * Bounded on the RECORDS read, not on the links emitted. One record can name many entities, so the two
       * are different numbers — and the read is what this bound exists to limit. The seed set is already
       * small (it is the recall's matches), so this bites only on a pathological call.
       */
      /*
       * And because those are different numbers, the budget can run out FASTER than the reads: `out` counts
       * links while `.limit()` counts records, so a few link-dense seeds drive `remaining` to zero and return
       * before a whole later class is read at all. That is a truncation, and it was silent.
       */
      const remaining = limit === undefined ? undefined : Math.max(0, limit - out.length);
      if (remaining === 0) return { records: out, scanCapped: true };

      if (usesLinkRecords(mid)) {
        /*
         * The `{from, fromKind, toKind}` index answers this directly, and the scope still has to be applied
         * to the FROM side: a chunk is a filemeta record, so a chunk that names an entity would otherwise be
         * walked as if it were the file it came from.
         */
        const pairs = await linkedToPairs(mid, cls, recordIds, remaining);
        if (remaining !== undefined && pairs.length >= remaining) scanCapped = true;
        const froms = [...new Set(pairs.map(p => p.from))];
        const admitted = new Set((await scopedDocs<{ _id: string }>(mid, cls, froms)).map(d => d._id));
        for (const p of pairs) {
          if (admitted.has(p.from)) out.push({ from: p.from, to: p.to, label: cls.label, kind: cls.kind });
        }
        continue;
      }

      const docs = await col<LinkRow>(`${mid}_${cls.collection}`)
        .find(asFilter<LinkRow>({ _id: { $in: [...recordIds] }, ...cls.scope }),
              { projection: { [cls.field]: 1 } })
        .limit(remaining ?? 0)
        .toArray() as LinkRow[];
      if (remaining !== undefined && docs.length === remaining) scanCapped = true;
      for (const doc of docs) {
        // `cls.field` again. Reading `entityIds` here for all six classes is the mistake that would leave
        // `chrono.memoryIds` looking implemented and answering nothing.
        for (const to of ((doc[cls.field] as string[] | undefined) ?? [])) {
          out.push({ from: doc._id, to, label: cls.label, kind: cls.kind });
        }
      }
    }
  }
  return { records: out, scanCapped };
}

/**
 * The display name for a linked record, by kind.
 *
 * A chrono has a `title`, a memory a `fact`, a file a `path` — three fields meaning one thing to a reader of
 * a graph, and the mapping was written out at each of the three emit sites.
 */
export function linkedRecordName(rec: LinkedRecord): string {
  if (rec.kind === 'chrono') return (rec.doc as ChronoEntry).title;
  if (rec.kind === 'memory') return (rec.doc as MemoryDoc).fact;
  return (rec.doc as FileMetaDoc).path;
}

/**
 * The `type` a linked record reports.
 *
 * Empty for a file, which has none — borrowing `kind` for it would invent data. Empty for an undeclared
 * memory type for the same reason.
 */
export function linkedRecordType(rec: LinkedRecord): string {
  if (rec.kind === 'chrono') return (rec.doc as ChronoEntry).type;
  if (rec.kind === 'memory') return (rec.doc as MemoryDoc).type ?? '';
  return '';
}
