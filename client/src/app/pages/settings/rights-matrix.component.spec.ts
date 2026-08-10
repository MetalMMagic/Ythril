import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RightsMatrixComponent } from './rights-matrix.component';
import type { TokenRights } from './rights-glyph.component';

const rights = (over: Partial<TokenRights> = {}): TokenRights =>
  ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

describe('RightsMatrixComponent', () => {
  let fixture: ComponentFixture<RightsMatrixComponent>;
  let emitted: TokenRights[];

  const render = (r: TokenRights, spaces = ['qa', 'research']) => {
    fixture = TestBed.createComponent(RightsMatrixComponent);
    fixture.componentRef.setInput('rights', r);
    fixture.componentRef.setInput('spaces', spaces);
    emitted = [];
    fixture.componentInstance.changed.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RightsMatrixComponent] }).compileComponents();
  });

  it('puts the floor row FIRST, then one row per space', () => {
    const el = render(rights());
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows.length).toBe(3);
    expect(rows[0]!.className).toContain('floor');
    expect(rows[0]!.querySelector('td.l')!.textContent).toContain('All spaces');
    expect(rows[1]!.querySelector('td.l')!.textContent).toContain('qa');
  });

  it('a cell shows the FLOOR when the floor is higher than its own row', () => {
    // Showing the stored row alone would display `none` for a space the token reaches through the floor —
    // the cell saying one thing while enforcement does another, in the direction that under-states access.
    const el = render(rights({ floor: { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' } }));
    const firstCell = el.querySelectorAll('tbody tr')[1]!.querySelectorAll('app-rung-picker')[0]!;
    const filled = [...firstCell.querySelectorAll('button')].filter(b => b.className.includes('on'));
    expect(filled.length).toBe(2);   // none + read
  });

  it('a row above the floor keeps its own higher level', () => {
    const el = render(rights({
      floor: { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' },
      perSpace: { qa: { knowledge: 'admin', files: 'none', schema: 'none', dataQuality: 'none' } },
    }));
    const cell = el.querySelectorAll('tbody tr')[1]!.querySelectorAll('app-rung-picker')[0]!;
    expect([...cell.querySelectorAll('button')].filter(b => b.className.includes('on')).length).toBe(4);
  });

  it('emits a WHOLE matrix, not a patch', () => {
    // The parent holds one draft and saves it as one thing. Emitting deltas would mean the parent
    // reassembles the object — a second place the shape is known, and the shape is what the server caps.
    const el = render(rights());
    el.querySelectorAll('tbody tr')[1]!.querySelectorAll('button')[1]!.click();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toHaveProperty('instanceAdmin');
    expect(emitted[0]).toHaveProperty('floor');
    expect(emitted[0]!.perSpace['qa']!['knowledge']).toBe('read');
  });

  it('editing one space leaves the others untouched', () => {
    const el = render(rights({ perSpace: { research: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } } }));
    el.querySelectorAll('tbody tr')[1]!.querySelectorAll('button')[1]!.click();
    expect(emitted[0]!.perSpace['research']!['knowledge']).toBe('write');
  });

  it('the floor row edits the floor, not a space', () => {
    const el = render(rights());
    el.querySelectorAll('tbody tr')[0]!.querySelectorAll('button')[1]!.click();
    expect(emitted[0]!.floor!['knowledge']).toBe('read');
    expect(Object.keys(emitted[0]!.perSpace)).toEqual([]);
  });

  it('clamps space cells beneath the floor rather than hiding the rung', () => {
    const el = render(rights({ floor: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } }));
    const cell = el.querySelectorAll('tbody tr')[1]!.querySelectorAll('app-rung-picker')[0]!;
    const bs = [...cell.querySelectorAll('button')];
    expect(bs[0]!.disabled).toBe(true);
    expect(bs[1]!.disabled).toBe(true);
    expect(bs[2]!.disabled).toBe(false);
  });

  it('renders with no spaces without collapsing the floor row', () => {
    const el = render(rights(), []);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
    expect(el.querySelector('tbody tr')!.className).toContain('floor');
  });
});
