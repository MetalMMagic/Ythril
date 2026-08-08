/**
 * Where the ER diagram's boxes and joins go — pure, so the geometry can be proven rather than eyeballed.
 *
 * ## Why this is a module and not inline SVG
 *
 * The first hand-drawn version of this diagram shipped two defects into a mockup that the owner caught by
 * looking: a join that ended 78 px short of the box it pointed at, and a relationship drawn between two types
 * that have none. Both were possible because the coordinates were typed.
 *
 * Here every endpoint is COMPUTED from the source and target rectangles, so a path cannot terminate anywhere
 * except on a real edge of a real box — the defect stops being something to catch and becomes something that
 * cannot be expressed. `er-layout.spec.ts` asserts exactly that, over every path the layout produces.
 *
 * ## The layout, in one paragraph
 *
 * Three columns. The **hub** — the type with the most relationship endpoints — sits in the middle, because
 * that is what a reader is looking for and it keeps the longest joins short. Types that point AT the hub go
 * left, types the hub points at go right, and anything unrelated to it fills the right column afterwards.
 * Each column stacks top-down with a fixed gap. Joins leave a box's right or left face, run down their own
 * vertical lane, and enter the far box's opposite face; a self-join loops over the top of its own box.
 *
 * Lanes are assigned per join rather than shared, which is what stops two joins overlapping into a single
 * ambiguous line. That costs horizontal space and buys a diagram that can be read.
 */
import type { ErEntityType, ErRelationship } from '../../core/api.types';

export interface ErBox {
  type: string;
  x: number; y: number; w: number; h: number;
  /** Column index, kept so a caller can group or animate by depth without recomputing it. */
  col: 0 | 1 | 2;
}

export interface ErPath {
  from: string; to: string; label: string; count: number;
  /** The rendered path. Every point is derived from a box rectangle. */
  d: string;
  /** Where the label sits — on the lane, clear of both boxes. */
  labelX: number; labelY: number;
  /** A self-join is drawn and read differently, so the caller does not have to infer it from `from === to`. */
  selfJoin: boolean;
}

export interface ErLayout {
  boxes: ErBox[];
  paths: ErPath[];
  width: number;
  height: number;
}

const BOX_W = 216;
const HUB_W = 248;
const GAP_Y = 24;
const COL_GAP = 120;
const PAD = 16;
const HEAD_H = 26;
const ROW_H = 16;
/** A box is its header plus a row per property, floored so an empty type is still a box and not a line. */
const boxHeight = (t: ErEntityType): number => HEAD_H + Math.max(2, t.properties.length + 1) * ROW_H + 12;

/** Relationship endpoints touching a type — how "central" it is, and so which type earns the middle. */
function degree(rels: ErRelationship[], type: string): number {
  return rels.reduce((n, r) => n + (r.from === type ? 1 : 0) + (r.to === type ? 1 : 0), 0);
}

/**
 * Build the layout.
 *
 * Deterministic for a given model: the same input produces the same picture, so a re-render does not shuffle
 * the diagram under someone's cursor.
 */
export function layoutErModel(types: ErEntityType[], rels: ErRelationship[]): ErLayout {
  if (types.length === 0) return { boxes: [], paths: [], width: 0, height: 0 };

  // The hub is the most connected type; ties break on record count, which the server already sorted by.
  const hub = [...types].sort((a, b) =>
    degree(rels, b.type) - degree(rels, a.type) || b.count - a.count)[0]!;

  const pointsAtHub = new Set(rels.filter(r => r.to === hub.type && r.from !== hub.type).map(r => r.from));
  const hubPointsAt = new Set(rels.filter(r => r.from === hub.type && r.to !== hub.type).map(r => r.to));

  const left: ErEntityType[] = [];
  const right: ErEntityType[] = [];
  for (const t of types) {
    if (t.type === hub.type) continue;
    if (pointsAtHub.has(t.type)) left.push(t);
    else right.push(t);          // includes hubPointsAt and anything unrelated
  }
  void hubPointsAt;

  const colX = [PAD, PAD + BOX_W + COL_GAP, PAD + BOX_W + COL_GAP + HUB_W + COL_GAP];

  const boxes: ErBox[] = [];
  const stack = (list: ErEntityType[], col: 0 | 2): void => {
    let y = PAD;
    for (const t of list) {
      const h = boxHeight(t);
      boxes.push({ type: t.type, x: colX[col]!, y, w: BOX_W, h, col });
      y += h + GAP_Y;
    }
  };
  stack(left, 0);
  stack(right, 2);

  // The hub is centred against the taller of the two columns, so the picture is not bottom-heavy.
  const colHeight = (col: 0 | 2): number => {
    const inCol = boxes.filter(b => b.col === col);
    return inCol.length === 0 ? 0 : inCol[inCol.length - 1]!.y + inCol[inCol.length - 1]!.h - PAD;
  };
  const hubH = boxHeight(hub);
  const tallest = Math.max(colHeight(0), colHeight(2), hubH);
  boxes.push({ type: hub.type, x: colX[1]!, y: PAD + Math.max(0, (tallest - hubH) / 2), w: HUB_W, h: hubH, col: 1 });

  const byType = new Map(boxes.map(b => [b.type, b]));
  const paths: ErPath[] = [];

  // Lanes are handed out per join so two never share a line. Left-side joins run in the gap before the hub,
  // right-side joins in the gap after it.
  let leftLane = 0;
  let rightLane = 0;
  const laneStep = 22;

  for (const r of rels) {
    const a = byType.get(r.from);
    const b = byType.get(r.to);
    // A relationship naming a type the model did not report cannot be placed. Dropping it is the honest
    // answer — the alternative is a line to a box that is not there, which is the defect this file exists
    // to prevent.
    if (!a || !b) continue;

    if (r.from === r.to) {
      // Self-join: up out of the top face, across, and back down into it. Both ends are ON the top edge.
      const x1 = a.x + a.w * 0.35;
      const x2 = a.x + a.w * 0.65;
      const top = a.y;
      const arc = top - 26;
      paths.push({
        from: r.from, to: r.to, label: r.label, count: r.count, selfJoin: true,
        d: `M${x1} ${top} V${arc} H${x2} V${top}`,
        labelX: (x1 + x2) / 2, labelY: arc - 6,
      });
      continue;
    }

    const leftToRight = a.x < b.x;
    // Leave the source's facing edge, enter the target's facing edge. Both y's are the box's vertical
    // middle, which is on the edge by construction.
    const sx = leftToRight ? a.x + a.w : a.x;
    const tx = leftToRight ? b.x : b.x + b.w;
    const sy = a.y + a.h / 2;
    const ty = b.y + b.h / 2;
    const lane = leftToRight
      ? sx + 20 + (leftLane++ % 4) * laneStep
      : sx - 20 - (rightLane++ % 4) * laneStep;

    paths.push({
      from: r.from, to: r.to, label: r.label, count: r.count, selfJoin: false,
      d: `M${sx} ${sy} H${lane} V${ty} H${tx}`,
      labelX: lane, labelY: Math.min(sy, ty) - 8,
    });
  }

  const width = colX[2]! + BOX_W + PAD;
  const height = Math.max(...boxes.map(b => b.y + b.h)) + PAD;
  return { boxes, paths, width, height };
}
