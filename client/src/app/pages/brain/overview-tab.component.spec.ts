/**
 * OverviewTabComponent — the Brain's default landing dashboard (F9, slice 1).
 *
 * Presentational over the shell's own data: `space` + `stats` come in as inputs and Reindex is emitted
 * back (behind a confirm). These tests pin the derived values (counts, storage, index state) and the
 * confirm-guarded emit, so the panels can't silently drift.
 */
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { OverviewTabComponent } from './overview-tab.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import type { Space, SpaceStats } from '../../core/api.types';

const STATS: SpaceStats = { spaceId: 'general', memories: 5, entities: 12, edges: 30, chrono: 3, files: 7 };
function space(over: Partial<Space> = {}): Space {
  return { id: 'general', label: 'General', ...over } as Space;
}

function setup(opts: { stats?: SpaceStats; space?: Space; confirm?: boolean; needsReindex?: boolean } = {}) {
  const confirm = vi.fn().mockResolvedValue(opts.confirm ?? true);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [OverviewTabComponent, getTranslocoModule()],
    providers: [{ provide: ConfirmDialogService, useValue: { confirm } }],
  });
  const fixture: ComponentFixture<OverviewTabComponent> = TestBed.createComponent(OverviewTabComponent);
  fixture.componentRef.setInput('space', opts.space ?? space());
  if (opts.stats !== undefined) fixture.componentRef.setInput('stats', opts.stats);
  if (opts.needsReindex !== undefined) fixture.componentRef.setInput('needsReindex', opts.needsReindex);
  return { fixture, c: fixture.componentInstance, confirm };
}

describe('OverviewTabComponent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('total sums every collection; statCards carries the five counts', () => {
    const { c } = setup({ stats: STATS });
    expect(c.total()).toBe(5 + 12 + 30 + 3 + 7);
    expect(c.statCards().map(s => [s.key, s.value])).toEqual([
      ['memories', 5], ['entities', 12], ['edges', 30], ['chrono', 3], ['files', 7],
    ]);
  });

  it('total is 0 and statCards empty while stats are still loading', () => {
    const { c } = setup({ stats: undefined });
    expect(c.total()).toBe(0);
    expect(c.statCards()).toEqual([]);
  });

  it('usagePct is a capped ratio when a quota is set, null when unlimited', () => {
    expect(setup({ space: space({ maxGiB: 10, usageGiB: 2.5 }) }).c.usagePct()).toBe(25);
    expect(setup({ space: space({ maxGiB: 4, usageGiB: 8 }) }).c.usagePct()).toBe(100); // capped
    expect(setup({ space: space({ usageGiB: 2 }) }).c.usagePct()).toBeNull();            // no maxGiB
  });

  it('maps indexStatus to a pill variant (missing → off/none)', () => {
    expect(setup({ space: space({ indexStatus: 'ready' }) }).c.indexVariant()).toBe('ok');
    expect(setup({ space: space({ indexStatus: 'building' }) }).c.indexVariant()).toBe('warn');
    expect(setup({ space: space({ indexStatus: 'failed' }) }).c.indexVariant()).toBe('error');
    const none = setup({ space: space() });
    expect(none.c.indexState()).toBe('none');
    expect(none.c.indexVariant()).toBe('off');
  });

  it('Reindex emits only after the confirm is accepted', async () => {
    const ok = setup({ confirm: true });
    const spy = vi.fn(); ok.c.reindex.subscribe(spy);
    await ok.c.requestReindex();
    expect(ok.confirm).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledOnce();

    const no = setup({ confirm: false });
    const spy2 = vi.fn(); no.c.reindex.subscribe(spy2);
    await no.c.requestReindex();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('maps networkStatus to a pill variant (idle/undefined → ok)', () => {
    expect(setup({ space: space({ networkStatus: 'degraded' }) }).c.netVariant()).toBe('error');
    expect(setup({ space: space({ networkStatus: 'syncing' }) }).c.netVariant()).toBe('pending');
    expect(setup({ space: space({ networkStatus: 'vote' }) }).c.netVariant()).toBe('warn');
    expect(setup({ space: space() }).c.netVariant()).toBe('ok'); // no status → idle/healthy
  });

  it('Networks panel lists the space networks; shows the empty note when there are none', () => {
    const withNet = setup({ space: space({ networks: [{ id: 'n1', label: 'Braintree', type: 'braintree' as never }], networkStatus: 'idle' }) });
    withNet.fixture.detectChanges();
    const items = [...(withNet.fixture.nativeElement as HTMLElement).querySelectorAll('.net-list li')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Braintree');

    const noNet = setup({ space: space() });
    noNet.fixture.detectChanges();
    const el = noNet.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.net-list')).toBeNull();
    // The empty-state note renders (test transloco emits the raw key).
    expect(el.textContent).toContain('brain.overview.noNetworks');
  });

  it('Instance panel renders identity/health when `about` is provided, and is absent otherwise', () => {
    const withAbout = setup();
    withAbout.fixture.componentRef.setInput('about', {
      instanceId: 'inst-abc', instanceLabel: 'My Brain', version: '1.4.4', uptime: '2h', mongoVersion: '8.2.1',
      diskInfo: { total: 0, used: 0, available: 0, dataUsed: 0 },
    });
    withAbout.fixture.detectChanges();
    const kv = (withAbout.fixture.nativeElement as HTMLElement).querySelector('.kv');
    expect(kv).toBeTruthy();
    expect(kv!.textContent).toContain('My Brain');
    expect(kv!.textContent).toContain('8.2.1');

    const noAbout = setup();
    noAbout.fixture.detectChanges();
    expect((noAbout.fixture.nativeElement as HTMLElement).querySelector('.kv')).toBeNull();
  });

  it('Embedding-queue panel shows counts + failed reasons when provided, and is absent without it', () => {
    const withQ = setup();
    withQ.fixture.componentRef.setInput('embeddingQueue', {
      pending: 2, processing: 1, complete: 9, failed: 1,
      failedSample: [{ path: 'docs/bad.pdf', lastError: 'vision model down' }],
    });
    withQ.fixture.detectChanges();
    const el = withQ.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.err-stat')).toBeTruthy();          // failed > 0 highlights
    expect(el.querySelector('.fail-list')?.textContent).toContain('docs/bad.pdf');
    expect(el.textContent).toContain('vision model down');

    const noQ = setup();
    noQ.fixture.detectChanges();
    expect((noQ.fixture.nativeElement as HTMLElement).querySelector('.fail-list')).toBeNull();
  });

  it('renders the counts and a Reindex button; shows the reindex note when stale', () => {
    const { fixture } = setup({ stats: STATS, needsReindex: true });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const values = [...el.querySelectorAll('.stat .v')].map(n => n.textContent?.trim());
    expect(values).toContain('12');            // entities count rendered
    expect(values).toContain('57');            // total
    expect(el.querySelector('.reindex-note')).not.toBeNull();       // stale note shown
    expect(el.querySelector('.actions button')).not.toBeNull();      // reindex button present
  });
});
