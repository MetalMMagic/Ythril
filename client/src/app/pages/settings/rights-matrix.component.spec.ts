import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RightsMatrixComponent } from './rights-matrix.component';
import { RightsCatalogService } from './rights-catalog.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import type { TokenRights } from './rights-glyph.component';

const rights = (over: Partial<TokenRights> = {}): TokenRights =>
  ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {}, ...over });

/** A stub catalog, so the grid's own tests never depend on the endpoint that explains it. */
const CATALOG_ROUTES = [
  { area: 'knowledge', method: 'POST', route: '/api/x/recall', needs: 'read' as const },
  { area: 'knowledge', method: 'DELETE', route: '/api/x/memories/:id', needs: 'write' as const },
  { area: 'files', method: 'GET', route: '/api/x/files', needs: 'read' as const },
];
function stubCatalog(loaded = true) {
  const catalog = signal(loaded
    ? { areas: ['knowledge', 'files', 'schema', 'dataQuality'], rungs: ['none', 'read', 'write', 'admin'] as const, routes: CATALOG_ROUTES }
    : null);
  return {
    catalog, failed: signal(!loaded), load: () => {},
    routesFor: (area: string, rung: string) => {
      const order = ['none', 'read', 'write', 'admin'].indexOf(rung);
      return CATALOG_ROUTES.filter(r => r.area === area && ['none', 'read', 'write', 'admin'].indexOf(r.needs) <= order);
    },
    countFor: (area: string) => CATALOG_ROUTES.filter(r => r.area === area).length,
  };
}

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
    await TestBed.configureTestingModule({
      imports: [RightsMatrixComponent, getTranslocoModule()],
      providers: [{ provide: RightsCatalogService, useValue: stubCatalog() }],
    }).compileComponents();
  });

  it('puts the floor row FIRST, then one row per space', () => {
    const el = render(rights());
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows.length).toBe(3);
    expect(rows[0]!.className).toContain('floor');
    expect(rows[0]!.querySelector('td.l')!.textContent).toContain('tokens.rights.allSpaces');
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

/**
 * The owner's ask: a right must say what it grants, in plain language AND as the endpoints it reaches.
 * Before this the grid was 4×4 bare words, and the column headers printed the code identifiers.
 */
describe('RightsMatrixComponent — what a right grants', () => {
  const render = (r: TokenRights, spaces = ['qa']) => {
    const fixture = TestBed.createComponent(RightsMatrixComponent);
    fixture.componentRef.setInput('rights', r);
    fixture.componentRef.setInput('spaces', spaces);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightsMatrixComponent, getTranslocoModule()],
      providers: [{ provide: RightsCatalogService, useValue: stubCatalog() }],
    }).compileComponents();
  });

  it('every column header carries the plain-language description as a tooltip', () => {
    const el = render(rights()).nativeElement as HTMLElement;
    const buttons = [...el.querySelectorAll('thead .area-info')];
    expect(buttons.length).toBe(4);
    for (const b of buttons) {
      // The non-technical half needs no click — it is on the header itself.
      expect(b.getAttribute('title')).toMatch(/^tokens\.rights\.area\.\w+\.desc$/);
    }
  });

  it('no panel is open until asked, and it opens for the area clicked', () => {
    const fixture = render(rights());
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.explain')).toBeNull();

    (el.querySelectorAll('thead .area-info')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    const panel = el.querySelector('.explain')!;
    expect(panel).toBeTruthy();
    expect(panel.querySelector('h4')!.textContent).toContain('tokens.rights.area.knowledge');
  });

  it('the panel lists the endpoints CUMULATIVELY, with the rung each comes from', () => {
    const fixture = render(rights());
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('thead .area-info')[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const rows = [...el.querySelectorAll('.explain tbody tr')];
    // knowledge has a read route AND a write route in the stub; both must appear, because admin contains both.
    expect(rows.length).toBe(2);
    expect(rows.map(r => r.textContent).join(' ')).toContain('/api/x/recall');
    expect(rows.map(r => r.textContent).join(' ')).toContain('/api/x/memories/:id');
    // And each says which rung first reaches it, or the list cannot answer "what does write grant".
    expect(rows[0]!.querySelector('.needs')!.textContent).toContain('read');
  });

  it('clicking the same header again closes it', () => {
    const fixture = render(rights());
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelectorAll('thead .area-info')[1] as HTMLButtonElement;
    btn.click(); fixture.detectChanges();
    expect(el.querySelector('.explain')).toBeTruthy();
    btn.click(); fixture.detectChanges();
    expect(el.querySelector('.explain')).toBeNull();
  });

  it('a rung explanation is shown once per rung, not once per area', () => {
    const fixture = render(rights());
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('thead .area-info')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = [...el.querySelectorAll('.explain .rungs li')];
    // read / write / admin. `none` is excluded: the word is its own explanation.
    expect(items.length).toBe(3);
    expect(items.map(i => i.textContent).join(' ')).not.toContain('rung.none');
  });
});

describe('RightsMatrixComponent — the grid survives its explanation failing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightsMatrixComponent, getTranslocoModule()],
      providers: [{ provide: RightsCatalogService, useValue: stubCatalog(false) }],
    }).compileComponents();
  });

  it('renders the grid and says the endpoint list is unavailable', () => {
    // A tooltip that cannot load must not take the editor with it.
    const fixture = TestBed.createComponent(RightsMatrixComponent);
    fixture.componentRef.setInput('rights', rights());
    fixture.componentRef.setInput('spaces', ['qa']);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-rung-picker').length).toBeGreaterThan(0);

    (el.querySelectorAll('thead .area-info')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.explain tbody')).toBeNull();
    expect(el.querySelector('.explain .miss')!.textContent).toContain('tokens.rights.endpointsUnavailable');
  });
});
