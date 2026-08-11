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
  /**
   * Column index, kept so a caller can group or animate by depth without recomputing it.
   *
   * `3` is the unconnected shelf along the bottom, which is not a column at all — it is a wrapping grid. It
   * keeps the same field because every caller wants the same thing from it: a way to tell these boxes apart
   * from the joined ones without re-deriving degree.
   */
  col: 0 | 1 | 2 | 3;
}

export interface ErPath {
  from: string; to: string; label: string; count: number;
  /** The rendered path. Every point is derived from a box rectangle. */
  d: string;
  /** Where the label sits — on its own lane, stepped so neighbouring lanes do not collide. */
  labelX: number; labelY: number;
  /** Which side of the lane the text hangs off, so it never straddles its own line. */
  labelAnchor: 'start' | 'end' | 'middle';
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
/** Horizontal gap between shelf boxes, and the gap between the joined picture and the shelf above it. */
const GAP_X = 20;
const SHELF_GAP = 40;
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

  /**
   * Unconnected types go on a SHELF at the bottom, not into a column.
   *
   * They used to fall into the right-hand column together with everything the hub points at, so on a real
   * space they were a tall centred stack of unrelated boxes with the joined ones hidden among them — and the
   * hub was vertically centred against that stack, pushing the part of the diagram that has meaning
   * off-screen. Reported directly: *"unconnected nodes should go on the bottom of the card and those
   * unconnected card should fill the space and not be centered and stacked on top of each other."*
   *
   * A type is unconnected when no relationship names it at all, self-joins included: a self-join is a
   * relationship and belongs in the connected picture.
   */
  const isolated = (t: ErEntityType): boolean => degree(rels, t.type) === 0;

  const left: ErEntityType[] = [];
  const right: ErEntityType[] = [];
  const shelf: ErEntityType[] = [];
  for (const t of types) {
    if (t.type === hub.type) continue;
    if (isolated(t)) shelf.push(t);
    else if (pointsAtHub.has(t.type)) left.push(t);
    else right.push(t);          // hubPointsAt, plus anything joined to something other than the hub
  }
  void hubPointsAt;

  /**
   * The column gap is SIZED FROM THE LANE COUNT, not fixed.
   *
   * Every join gets its own lane (see below), and the lanes live in the gaps either side of the hub. With a
   * constant 120 px gap, a model with nine joins on one side either overlapped them or drew them outside the
   * gap and across the boxes. So the joins are counted first, and the columns are placed around the space
   * their lanes actually need. A small model looks exactly as it did; a large one gets wider instead of
   * illegible.
   */
  /**
   * TWO PASSES, because the side a join runs on is a fact about the geometry and the geometry depends on how
   * many joins run on each side. Guessing the side from `pointsAtHub` and then deciding it again from `a.x <
   * b.x` in the path loop is what put a lane through a box, and what sent a same-column join out of the
   * diagram entirely — reported as *"i saw edges go out of the diagram space completely"*.
   *
   * Pass one places the columns at the old fixed gap purely to learn which column each type lands in. Nothing
   * from it is kept except that. Pass two sizes the gaps from the real counts and places the boxes for good.
   */
  const columnOf = (t: string): 0 | 1 | 2 =>
    t === hub.type ? 1 : left.some(x => x.type === t) ? 0 : 2;

  /**
   * Which gap a join's lane belongs in, decided once and reused by both the counting and the drawing.
   *
   * A join between two boxes in the SAME column has no gap between them, so it borrows the ADJACENT one and
   * leaves and enters on the same face. Previously it fell through the `a.x < b.x` test as right-to-left and
   * ran leftwards out of its own column — negative x for column 0, i.e. off the canvas.
   */
  const gapOf = (r: ErRelationship): 'L' | 'R' | null => {
    if (r.from === r.to) return null;                      // self-joins loop over their own box
    const cf = columnOf(r.from), ct = columnOf(r.to);
    if (cf === ct) return cf === 0 ? 'L' : 'R';            // same column: borrow the neighbouring gap
    return Math.min(cf, ct) === 0 ? 'L' : 'R';             // 0↔1 and 0↔2 use the left gap; 1↔2 the right
  };

  const placeable = rels.filter(r => types.some(t => t.type === r.from) && types.some(t => t.type === r.to));
  const nL = placeable.filter(r => gapOf(r) === 'L').length;
  const nR = placeable.filter(r => gapOf(r) === 'R').length;
  // 20 px clear of the source face, one lane every 22, then 20 px clear of the target face.
  const gapFor = (n: number): number => Math.max(COL_GAP, 20 + n * 22 + 20);
  const gapL = gapFor(nL);
  const gapR = gapFor(nR);

  const colX = [PAD, PAD + BOX_W + gapL, PAD + BOX_W + gapL + HUB_W + gapR];

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
  /**
   * ONE LANE PER JOIN, and labels stepped down the lane.
   *
   * The lane index used to be `(n++ % 4)`, so the fifth join on a side reused the first join's lane and every
   * subsequent one piled onto an earlier line. The label was worse: `labelX` was the lane and `labelY` was the
   * top of that join's own span, so two joins sharing a lane put their labels at almost the same point.
   * Reported as *"edges overlap too much and labels overlap as well so you cant read anything"* — which is
   * exactly what an unbounded model does to a four-lane scheme.
   *
   * The gap has to grow with the number of joins, so `COL_GAP` is no longer a constant: the lanes are counted
   * first and the columns placed around them. A diagram that needs eighteen lanes gets a wider gap rather than
   * eighteen lines on top of each other.
   */
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
        labelX: (x1 + x2) / 2, labelY: arc - 6, labelAnchor: 'middle',
      });
      continue;
    }

    // The gap is decided by `gapOf`, which the gap SIZING above used — so a lane can never be drawn into a
    // gap that was not measured for it. That agreement is the fix.
    const gap = gapOf(r);
    const sameCol = a.x === b.x;
    const inLeftGap = gap === 'L';
    const slot = inLeftGap ? leftLane++ : rightLane++;
    // The lane's home is the gap's own span, counted from the gap's left edge inward.
    const gapStart = inLeftGap ? colX[0]! + BOX_W : colX[1]! + HUB_W;
    const lane = gapStart + 20 + slot * laneStep;

    const sy = a.y + a.h / 2;
    const ty = b.y + b.h / 2;
    // A same-column join leaves and enters the face that looks at its borrowed gap, so both ends stay on real
    // edges and the whole path stays inside the diagram.
    const faceRight = (box: ErBox): number => box.x + box.w;
    const sx = sameCol ? (inLeftGap ? faceRight(a) : a.x) : (a.x < b.x ? a.x + a.w : a.x);
    const tx = sameCol ? (inLeftGap ? faceRight(b) : b.x) : (a.x < b.x ? b.x : b.x + b.w);

    // The label sits ON its own lane, and steps DOWN it so two adjacent lanes never put their text at the
    // same height. `labelX` is nudged off the line itself so the glyphs do not sit astride the stroke.
    const spanTop = Math.min(sy, ty);
    const spanBottom = Math.max(sy, ty);
    const labelY = Math.min(spanBottom - 6, spanTop + 14 + (slot % 3) * 13);

    paths.push({
      from: r.from, to: r.to, label: r.label, count: r.count, selfJoin: false,
      d: `M${sx} ${sy} H${lane} V${ty} H${tx}`,
      labelX: lane + 5, labelY,
      labelAnchor: 'start',
    });
  }

  const width = colX[2]! + BOX_W + PAD;

  /**
   * The unconnected shelf: a wrapping grid across the full width, below everything joined.
   *
   * It FILLS the row before starting a new one, which is the whole point — these were a centred single-file
   * stack, so twelve unrelated types made the diagram three screens tall and pushed the joined part out of
   * view. Laid out after `width` is known, because how many fit per row is a function of the width the joined
   * part already needed.
   *
   * Row height is the tallest box in that row, not the tallest overall: a row of two-property types should not
   * be as tall as the one type that declares nine.
   */
  const joinedBottom = boxes.length > 0 ? Math.max(...boxes.map(b => b.y + b.h)) : PAD;
  let shelfBottom = joinedBottom;
  if (shelf.length > 0) {
    const perRow = Math.max(1, Math.floor((width - PAD * 2 + GAP_X) / (BOX_W + GAP_X)));
    let y = joinedBottom + SHELF_GAP;
    for (let i = 0; i < shelf.length; i += perRow) {
      const row = shelf.slice(i, i + perRow);
      const rowH = Math.max(...row.map(boxHeight));
      row.forEach((t, j) => {
        boxes.push({ type: t.type, x: PAD + j * (BOX_W + GAP_X), y, w: BOX_W, h: boxHeight(t), col: 3 });
      });
      y += rowH + GAP_Y;
      shelfBottom = y - GAP_Y;
    }
  }

  const height = Math.max(joinedBottom, shelfBottom) + PAD;
  return { boxes, paths, width, height };
}
