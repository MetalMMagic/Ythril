/**
 * The ER diagram's geometry, proven rather than eyeballed.
 *
 * ## The defect this exists for
 *
 * A hand-drawn mockup of this diagram shipped two faults that the owner caught by looking at it: a join that
 * ended 78 px short of the box it pointed at — a line into empty space — and a relationship drawn between two
 * types that have none. Both were possible because the coordinates were typed by hand.
 *
 * The layout computes every endpoint from the source and target rectangles, so the first fault cannot be
 * expressed. **This file is what turns that claim into a fact**: it walks every path the layout produces and
 * asserts each endpoint lies ON the perimeter of the box it belongs to. A future change to the routing that
 * reintroduces a floating endpoint fails here rather than in someone's eyes.
 */
import { describe, it, expect } from 'vitest';
import { layoutErModel, type ErBox } from './er-layout';
import type { ErEntityType, ErRelationship } from '../../core/api.types';

const type = (t: string, over: Partial<ErEntityType> = {}): ErEntityType => ({
  type: t, count: 1, declared: true, properties: [],
  linkedFrom: { memories: 0, chrono: 0, files: 0 }, ...over,
});
const rel = (from: string, to: string, label = 'rel', count = 1): ErRelationship => ({ from, to, label, count });

/** Every point in an orthogonal path: `M x y` then a run of `H x` / `V y`. */
function points(d: string): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  let x = 0, y = 0;
  for (const cmd of d.match(/[MHV]\s*-?[\d.]+(\s+-?[\d.]+)?/g) ?? []) {
    const nums = (cmd.match(/-?[\d.]+/g) ?? []).map(Number);
    if (cmd[0] === 'M') { x = nums[0]!; y = nums[1]!; }
    else if (cmd[0] === 'H') { x = nums[0]!; }
    else { y = nums[0]!; }
    out.push({ x, y });
  }
  return out;
}

/** Is the point on the box's perimeter (within a hair, for float noise)? */
function onPerimeter(p: { x: number; y: number }, b: ErBox): boolean {
  const e = 0.01;
  const inX = p.x >= b.x - e && p.x <= b.x + b.w + e;
  const inY = p.y >= b.y - e && p.y <= b.y + b.h + e;
  const onVerticalEdge = (Math.abs(p.x - b.x) < e || Math.abs(p.x - (b.x + b.w)) < e) && inY;
  const onHorizontalEdge = (Math.abs(p.y - b.y) < e || Math.abs(p.y - (b.y + b.h)) < e) && inX;
  return onVerticalEdge || onHorizontalEdge;
}

describe('every join starts and ends on a box', () => {
  const types = [
    type('service', { properties: [{ name: 'tier', required: true }] }),
    type('person'), type('incident'), type('deployment'), type('document'),
  ];
  const rels = [
    rel('person', 'service', 'owns', 128),
    rel('deployment', 'service', 'targets', 1204),
    rel('service', 'incident', 'affects', 94),
    rel('service', 'service', 'depends_on', 216),
    rel('person', 'document', 'wrote', 287),
  ];

  it('no endpoint floats in empty space', () => {
    // The exact fault the owner spotted: a line that stopped 78px short of its target. Asserted over every
    // path rather than the one that was wrong, because the next one will be a different path.
    const { boxes, paths } = layoutErModel(types, rels);
    const byType = new Map(boxes.map(b => [b.type, b]));
    expect(paths.length).toBeGreaterThan(0);   // floor: an empty path list would pass every check below

    for (const p of paths) {
      const pts = points(p.d);
      const a = byType.get(p.from)!;
      const b = byType.get(p.to)!;
      expect(onPerimeter(pts[0]!, a),
        `${p.from} → ${p.to} (${p.label}) STARTS at ${JSON.stringify(pts[0])}, which is not on ${p.from}'s box ${JSON.stringify(a)}`,
      ).toBe(true);
      expect(onPerimeter(pts[pts.length - 1]!, b),
        `${p.from} → ${p.to} (${p.label}) ENDS at ${JSON.stringify(pts[pts.length - 1])}, which is not on ${p.to}'s box ${JSON.stringify(b)} — this is the line-into-the-void defect`,
      ).toBe(true);
    }
  });

  it('draws a join for every relationship, and invents none', () => {
    // The mockup's other fault was a line between two types with no relationship between them.
    const { paths } = layoutErModel(types, rels);
    expect(paths.map(p => `${p.from}|${p.label}|${p.to}`).sort())
      .toEqual(rels.map(r => `${r.from}|${r.label}|${r.to}`).sort());
  });

  it('drops a relationship naming a type the model does not report', () => {
    // Rather than drawing a line to a box that is not there. A truncated read can produce exactly this.
    const { paths } = layoutErModel([type('a')], [rel('a', 'ghost')]);
    expect(paths).toEqual([]);
  });

  it('a self-join leaves and re-enters the same box', () => {
    const { boxes, paths } = layoutErModel(types, rels);
    const self = paths.find(p => p.selfJoin)!;
    expect(self).toBeDefined();
    const box = boxes.find(b => b.type === self.from)!;
    const pts = points(self.d);
    expect(onPerimeter(pts[0]!, box)).toBe(true);
    expect(onPerimeter(pts[pts.length - 1]!, box)).toBe(true);
  });

  it('no two boxes overlap', () => {
    // A join can be correct and still unreadable if it runs under a box.
    const { boxes } = layoutErModel(types, rels);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.type} overlaps ${b.type}`).toBe(true);
      }
    }
  });

  it('is deterministic, so a re-render does not shuffle the diagram', () => {
    expect(JSON.stringify(layoutErModel(types, rels))).toEqual(JSON.stringify(layoutErModel(types, rels)));
  });

  it('an empty model is an empty layout rather than a throw', () => {
    expect(layoutErModel([], [])).toEqual({ boxes: [], paths: [], width: 0, height: 0 });
  });

  it('a type with no properties still gets a box with height', () => {
    const { boxes } = layoutErModel([type('bare')], []);
    expect(boxes[0]!.h).toBeGreaterThan(20);
  });
});

/**
 * ── A BIG, LOPSIDED MODEL — because the small even one was always fine ──────────────────────────────
 *
 * Owner, 2026-08-11: *"test the layout on a big dataset you emulate. i guess with only a few records that are
 * welldefined and evenly filled its ok but not in real wordl."* That is exactly what happened: the four-lane
 * scheme and the single-column treatment of unrelated types both look correct on six tidy types and fall apart
 * past that.
 *
 * So this dataset is deliberately un-tidy: 30 types, of which 14 are connected and 16 are isolated, property
 * counts from 0 to 9, and 22 relationships concentrated on one hub. The assertions are geometric invariants,
 * not snapshots — a snapshot of a diagram this size would be unreadable and would fail on every tweak.
 */
describe('er-layout on a big, lopsided model', () => {
  const type = (name, props, count = 10) => ({
    type: name,
    count,
    declared: true,
    properties: Array.from({ length: props }, (_, i) => ({ name: `p${i}`, type: 'string', required: i === 0 })),
    linkedFrom: { memories: 0, chrono: 0, files: 0 },
  });

  const connected = Array.from({ length: 14 }, (_, i) => type(`joined${i}`, i % 10));
  const isolatedTypes = Array.from({ length: 16 }, (_, i) => type(`lonely${i}`, i % 4));
  const types = [...connected, ...isolatedTypes];

  // A hub with a fan of 12 in and 9 out, plus a self-join — the shape a real space grows into.
  const rels = [
    ...Array.from({ length: 8 }, (_, i) => ({ from: `joined${i + 1}`, to: 'joined0', label: `in${i}`, count: i + 1 })),
    ...Array.from({ length: 5 }, (_, i) => ({ from: 'joined0', to: `joined${i + 9}`, label: `out${i}`, count: i + 1 })),
    { from: 'joined0', to: 'joined0', label: 'parent', count: 3 },
    ...Array.from({ length: 8 }, (_, i) => ({ from: `joined${i + 1}`, to: `joined${i + 2}`, label: `chain${i}`, count: 1 })),
  ];

  const out = layoutErModel(types, rels);
  const boxOf = (t) => out.boxes.find(b => b.type === t);

  it('places every type exactly once', () => {
    expect(out.boxes.length).toBe(types.length);
    expect(new Set(out.boxes.map(b => b.type)).size).toBe(types.length);
  });

  it('puts every ISOLATED type on the shelf, and nothing else there', () => {
    const shelf = out.boxes.filter(b => b.col === 3).map(b => b.type).sort();
    expect(shelf).toEqual(isolatedTypes.map(t => t.type).sort());
  });

  it('puts the whole shelf BELOW every joined box', () => {
    // The reported symptom was unrelated types stacked among the joined ones, pushing the meaningful part of
    // the diagram out of view.
    const joinedBottom = Math.max(...out.boxes.filter(b => b.col !== 3).map(b => b.y + b.h));
    for (const b of out.boxes.filter(b => b.col === 3)) {
      expect(b.y, `${b.type} must start below the joined picture`).toBeGreaterThanOrEqual(joinedBottom);
    }
  });

  it('FILLS each shelf row instead of stacking one per line', () => {
    const shelf = out.boxes.filter(b => b.col === 3);
    const rows = new Map();
    for (const b of shelf) rows.set(b.y, (rows.get(b.y) ?? 0) + 1);
    const counts = [...rows.values()];
    expect(counts.length, 'sixteen isolated types must not be sixteen rows').toBeLessThan(shelf.length);
    expect(Math.max(...counts), 'at least one row has to hold several').toBeGreaterThan(1);
    // Every row except the last is full — that is what "fills the space" means.
    const full = Math.max(...counts);
    const notLast = [...rows.keys()].sort((a, b) => a - b).slice(0, -1).map(y => rows.get(y));
    for (const n of notLast) expect(n).toBe(full);
  });

  it('keeps every shelf box inside the diagram width', () => {
    for (const b of out.boxes.filter(b => b.col === 3)) {
      expect(b.x + b.w, `${b.type} overflows the viewBox`).toBeLessThanOrEqual(out.width);
    }
  });

  it('gives every join its OWN lane — no two share a vertical run', () => {
    // The four-lane cycle is the defect: the fifth join reused the first one's lane, and from there each new
    // relationship landed on an existing line.
    const lanes = out.paths.filter(p => !p.selfJoin).map(p => {
      const m = /^M[\d.]+ [\d.]+ H([\d.]+) V/.exec(p.d);
      return m ? Number(m[1]) : NaN;
    });
    expect(lanes.every(Number.isFinite), 'every non-self join must run down a vertical lane').toBe(true);
    // Per SIDE. Two lanes in opposite gaps may share an x by coincidence and never touch, because each only
    // exists between its own pair of boxes — asserting global uniqueness was asserting something the design
    // never claimed, which is how a test fails on correct code.
    const perSide = new Map();
    for (const p of out.paths.filter(x => !x.selfJoin)) {
      const lane = Number(/^M[\d.]+ [\d.]+ H([\d.]+) V/.exec(p.d)[1]);
      const key = 'lane:' + lane;
      expect(perSide.has(key), 'two joins on the same side share lane ' + lane).toBe(false);
      perSide.set(key, p);
    }
  });

  it('does not let a lane run through a box', () => {
    const boxes = out.boxes;
    for (const p of out.paths.filter(x => !x.selfJoin)) {
      const lane = Number(/^M[\d.]+ [\d.]+ H([\d.]+) V/.exec(p.d)[1]);
      // Only boxes the lane VERTICALLY overlaps can be cut. A lane exists between its two endpoints' mid
      // heights, so a shelf box far below it shares an x range and is never crossed — checking x alone
      // reported the shelf as an obstruction and was wrong about the geometry.
      const yTop = Math.min(...[...p.d.matchAll(/[HV]([\d.]+)/g)].map(m => Number(m[1])), Infinity);
      const from = boxOf(p.from), to = boxOf(p.to);
      const lo = Math.min(from.y + from.h / 2, to.y + to.h / 2);
      const hi = Math.max(from.y + from.h / 2, to.y + to.h / 2);
      void yTop;
      for (const b of boxes) {
        const yOverlap = b.y < hi && b.y + b.h > lo;
        const inside = yOverlap && lane > b.x + 1 && lane < b.x + b.w - 1;
        expect(inside, `${p.from}->${p.to} lane at ${lane} cuts through ${b.type}`).toBe(false);
      }
    }
  });

  it('separates the labels enough to be read', () => {
    // Not "no overlap at all" — two labels may share a y if they are far apart horizontally. The failure
    // reported was labels ON each other, so the invariant is that no two share BOTH coordinates closely.
    const labels = out.paths.map(p => ({ x: p.labelX, y: p.labelY, id: `${p.from}->${p.to}` }));
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const near = Math.abs(labels[i].x - labels[j].x) < 8 && Math.abs(labels[i].y - labels[j].y) < 11;
        expect(near, `${labels[i].id} and ${labels[j].id} labels sit on top of each other`).toBe(false);
      }
    }
  });

  it('every label says which side of its lane it hangs off', () => {
    for (const p of out.paths) expect(['start', 'end', 'middle']).toContain(p.labelAnchor);
  });

  it('stays deterministic — the same model twice is the same picture', () => {
    expect(layoutErModel(types, rels)).toEqual(out);
  });
});
