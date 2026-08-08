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
