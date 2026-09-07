/**
 * The JSON tree renders what you can SEE, and a collapsed container costs one row.
 *
 * ## What these pin
 *
 * The point of the component is that a recall answer of tens of thousands of characters stays usable. That
 * is a performance property expressed as a rendering rule — walk only into what is open — and it is
 * invisible in a screenshot: a version that builds every row and hides the closed ones looks identical and
 * falls over on the answer this panel exists to inspect.
 *
 * So the assertions are on the ROW LIST rather than on the DOM. A row is what costs something.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { JsonTreeComponent } from './json-tree.component';

function mount(value: unknown, openTo = 1) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [JsonTreeComponent] });
  const fixture = TestBed.createComponent(JsonTreeComponent);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('openTo', openTo);
  fixture.detectChanges();
  return fixture;
}

const paths = (fixture: { componentInstance: JsonTreeComponent }) =>
  fixture.componentInstance.rows().map(r => r.path);

describe('a collapsed container costs one row', () => {
  it('does not walk into what is closed, however big it is', () => {
    // A hundred elements behind a closed caret must not be a hundred rows. This is the whole reason the
    // rows are computed from the open set rather than filtered after the fact.
    const big = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, nested: { deep: true } })) };
    const fixture = mount(big, 1);

    const rows = fixture.componentInstance.rows();
    const items = rows.find(r => r.key === 'items');
    expect(items, 'the array row is missing').toBeTruthy();
    expect(items!.open, 'depth 1 is past openTo 1, so the array starts closed').toBe(false);
    expect(items!.size, 'a closed container still reports what is inside it').toBe(100);
    expect(rows.length, `100 elements behind a closed caret produced ${rows.length} rows`).toBeLessThan(6);
  });

  it('and opening one level adds that level only', () => {
    const fixture = mount({ a: { b: { c: { d: 1 } } } }, 1);
    const before = paths(fixture).length;

    const a = fixture.componentInstance.rows().find(r => r.key === 'a')!;
    fixture.componentInstance.toggle(a);
    fixture.detectChanges();

    const after = fixture.componentInstance.rows();
    expect(after.some(r => r.key === 'b'), 'opening `a` did not reveal `b`').toBe(true);
    expect(after.some(r => r.key === 'c'), 'opening `a` revealed `c` two levels down').toBe(false);
    expect(after.length).toBeGreaterThan(before);
  });
});

describe('what a row says about itself', () => {
  it('names the size in the unit of the container', () => {
    const fixture = mount({ list: [1, 2, 3], one: [1], bag: { x: 1, y: 2 }, single: { x: 1 } }, 1);
    const c = fixture.componentInstance;
    const row = (key: string) => c.rows().find(r => r.key === key)!;
    expect(c.label(row('list'))).toBe('items');
    expect(c.label(row('one')), 'one element is not "1 items"').toBe('item');
    expect(c.label(row('bag'))).toBe('keys');
    expect(c.label(row('single'))).toBe('key');
  });

  it('quotes a string and leaves everything else bare, so the types are readable', () => {
    const fixture = mount({ s: 'x', n: 4, b: false, z: null }, 2);
    const text = (key: string) => fixture.componentInstance.rows().find(r => r.key === key)!.text;
    expect(text('s')).toBe('"x"');
    expect(text('n')).toBe('4');
    expect(text('b')).toBe('false');
    expect(text('z')).toBe('null');
  });

  it('an empty object still draws itself; an absent value does not', () => {
    // The distinction a reader needs: `{}` came back and is empty, versus nothing came back at all.
    expect(mount({}, 1).componentInstance.rows().length).toBe(1);
    expect(mount(null, 1).componentInstance.rows().length).toBe(0);
    expect(mount(undefined, 1).componentInstance.rows().length).toBe(0);
  });
});

describe('expand and collapse all', () => {
  it('collapseAll closes what openTo had opened', () => {
    const fixture = mount({ a: { b: 1 } }, 5);
    expect(fixture.componentInstance.rows().some(r => r.key === 'b')).toBe(true);

    fixture.componentInstance.collapseAll();
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().some(r => r.key === 'b'),
      'collapseAll left a nested key visible').toBe(false);
  });

  it('expandAll reaches a subtree nobody has opened by hand', () => {
    /*
     * The case a set-of-open-paths implementation gets wrong: the deep node has never been rendered, so
     * there is no path to add to the set. Applying a floor instead means it opens on the way down.
     */
    const fixture = mount({ a: { b: { c: { d: 'found' } } } }, 1);
    fixture.componentInstance.expandAll();
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().some(r => r.text === '"found"'),
      'expandAll did not reach a node that had never been built').toBe(true);
  });

  it('a reader decision after expandAll still wins', () => {
    const fixture = mount({ a: { b: 1 } }, 1);
    fixture.componentInstance.expandAll();
    fixture.detectChanges();

    const a = fixture.componentInstance.rows().find(r => r.key === 'a')!;
    fixture.componentInstance.toggle(a);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().some(r => r.key === 'b'),
      'closing a node after expandAll did nothing — the floor is overriding the reader').toBe(false);
  });
});
