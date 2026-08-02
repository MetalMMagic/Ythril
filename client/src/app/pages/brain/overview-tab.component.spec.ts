/**
 * OverviewTabComponent — the Brain's default landing dashboard (F9, slice 1).
 *
 * Presentational over the shell's own data: `space` + `stats` come in as inputs and Reindex is emitted
 * back (behind a confirm). These tests pin the derived values (counts, storage, index state) and the
 * confirm-guarded emit, so the panels can't silently drift.
 */
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { OverviewTabComponent } from './overview-tab.component';
import { COLLECTION_TABS } from './brain-tabs';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import type { Space, SpaceStats , SpaceActivity } from '../../core/api.types';

const STATS: SpaceStats = { spaceId: 'general', memories: 5, entities: 12, edges: 30, chrono: 3, files: 7 };
function space(over: Partial<Space> = {}): Space {
  return { id: 'general', label: 'General', ...over } as Space;
}

function setup(opts: { stats?: SpaceStats; space?: Space; confirm?: boolean; needsReindex?: boolean } = {}) {
  const confirm = vi.fn().mockResolvedValue(opts.confirm ?? true);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [OverviewTabComponent, getTranslocoModule()],
    providers: [provideRouter([]), { provide: ConfirmDialogService, useValue: { confirm } }],
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
    // Order matters and is asserted deliberately: these tiles are shortcuts INTO the tab strip, so they
    // follow it exactly (Entities · Edges · Memories · Chrono · Files). They used to lead with Memories,
    // which meant the two disagreed about what comes next and every click became a small search.
    expect(c.statCards().map(s => [s.key, s.value])).toEqual([
      ['entities', 12], ['edges', 30], ['memories', 5], ['chrono', 3], ['files', 7],
    ]);
  });

  it('every stat tile targets a real collection tab', () => {
    // The tile's `key` IS the tab it opens. Typed from COLLECTION_TABS now rather than a second
    // hand-written union, and checked at runtime too: the type stops a mismatch reaching the build,
    // this stops a tile being added from data the type never sees.
    const { c } = setup({ stats: STATS });
    expect(c.statCards().length).toBe(COLLECTION_TABS.length);
    for (const card of c.statCards()) {
      expect(COLLECTION_TABS).toContain(card.key);
    }
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

  it('groups failures by reason when there is more than one, and says how many the list omits', () => {
    // Five paths answer "which file", not "why". With forty failures an operator could not tell one dead
    // endpoint from forty unrelated problems, and the sample is whichever five came back first.
    const many = setup();
    many.fixture.componentRef.setInput('embeddingQueue', {
      pending: 0, processing: 0, complete: 100, failed: 40,
      failedSample: Array.from({ length: 5 }, (_, i) => ({ path: `docs/f${i}.pdf`, lastError: 'vision model down' })),
      failedByReason: [
        { reason: 'vision model down', count: 38 },
        { reason: null, count: 2 },
      ],
    });
    many.fixture.detectChanges();
    const el = many.fixture.nativeElement as HTMLElement;
    const reasons = el.querySelector('.fail-reasons');
    expect(reasons).toBeTruthy();
    expect(reasons!.textContent).toContain('38');
    expect(reasons!.textContent).toContain('vision model down');
    // The count is over EVERY failure, not the five in the sample.
    expect(reasons!.textContent).not.toContain('5 ');
    // And the list says plainly that it is not showing everything.
    expect(el.querySelector('.fail-more')).toBeTruthy();
  });

  it('hides the grouping when it would only repeat the list, and survives a server that omits it', () => {
    // One reason adds nothing over the per-path list — a panel that says the same thing twice trains people
    // to skim both.
    const one = setup();
    one.fixture.componentRef.setInput('embeddingQueue', {
      pending: 0, processing: 0, complete: 3, failed: 1,
      failedSample: [{ path: 'docs/bad.pdf', lastError: 'vision model down' }],
      failedByReason: [{ reason: 'vision model down', count: 1 }],
    });
    one.fixture.detectChanges();
    const oneEl = one.fixture.nativeElement as HTMLElement;
    expect(oneEl.querySelector('.fail-reasons')).toBeNull();
    expect(oneEl.querySelector('.fail-more')).toBeNull();   // the sample covers all 1

    // An older server (or a cached response from one) sends no `failedByReason` at all. The panel must render.
    const legacy = setup();
    legacy.fixture.componentRef.setInput('embeddingQueue', {
      pending: 0, processing: 0, complete: 3, failed: 2,
      failedSample: [{ path: 'docs/bad.pdf', lastError: 'boom' }],
    });
    legacy.fixture.detectChanges();
    const legacyEl = legacy.fixture.nativeElement as HTMLElement;
    expect(legacyEl.querySelector('.fail-list')).toBeTruthy();
    expect(legacyEl.querySelector('.fail-reasons')).toBeNull();
  });

  it('shows a "retry all failed" button only when failed > 0, and emits after the confirm', async () => {
    // failed > 0 → button present; the confirm-accepted click emits retryFailed once.
    const withFail = setup({ confirm: true });
    const spy = vi.fn(); withFail.c.retryFailed.subscribe(spy);
    withFail.fixture.componentRef.setInput('embeddingQueue', { pending: 0, processing: 0, complete: 3, failed: 2, failedSample: [] });
    withFail.fixture.detectChanges();
    const btn = (withFail.fixture.nativeElement as HTMLElement).querySelector('.retry-failed-btn') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    btn!.click();
    await withFail.fixture.whenStable();
    expect(withFail.confirm).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledOnce();

    // failed === 0 → no retry button (nothing to retry).
    const noFail = setup();
    noFail.fixture.componentRef.setInput('embeddingQueue', { pending: 1, processing: 0, complete: 3, failed: 0, failedSample: [] });
    noFail.fixture.detectChanges();
    expect((noFail.fixture.nativeElement as HTMLElement).querySelector('.retry-failed-btn')).toBeNull();
  });

  it('Governance panel lists open votes with tallies; absent when there are none', () => {
    const withVotes = setup();
    withVotes.fixture.componentRef.setInput('openVotes', [{
      id: 'r1', networkId: 'n1', type: 'leave', subject: 'Peer B wants to leave',
      openedAt: '2026-07-27T00:00:00Z', deadline: '2026-07-28T00:00:00Z', status: 'open',
      votes: [{ instanceId: 'a', vote: 'yes' }, { instanceId: 'b', vote: 'yes' }, { instanceId: 'c', vote: 'veto' }],
    }]);
    withVotes.fixture.detectChanges();
    const el = withVotes.fixture.nativeElement as HTMLElement;
    const list = el.querySelector('.vote-list');
    expect(list).toBeTruthy();
    expect(list!.textContent).toContain('Peer B wants to leave');
    expect(withVotes.c.tallyYes({ votes: [{ vote: 'yes' }, { vote: 'yes' }, { vote: 'veto' }] } as never)).toBe(2);
    expect(withVotes.c.tallyVeto({ votes: [{ vote: 'yes' }, { vote: 'veto' }] } as never)).toBe(1);

    const noVotes = setup();
    noVotes.fixture.detectChanges();
    expect((noVotes.fixture.nativeElement as HTMLElement).querySelector('.vote-list')).toBeNull();
  });

  it('the Statistics summary is the one full-width card; every other panel is a normal grid cell', () => {
    // Uniform card sizing is CSS (jsdom computes no layout, so heights are verified by the E2E
    // geometry check, not here). What IS pinnable is the structure that layout relies on: exactly one
    // .span-all card, and it is the Statistics summary.
    const { fixture } = setup({ stats: STATS });
    fixture.componentRef.setInput('about', {
      instanceId: 'i', instanceLabel: 'L', version: '1', uptime: '0m', mongoVersion: '8',
      diskInfo: { total: 0, used: 0, available: 0, dataUsed: 0 },
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const spanning = [...el.querySelectorAll('.panel.span-all')];
    expect(spanning.length).toBe(1);
    expect(spanning[0].querySelector('h3')?.textContent).toContain('brain.overview.statsTitle');
    expect(el.querySelectorAll('.panel').length).toBeGreaterThan(1); // other panels are normal cells
  });

  it('Token-access panel is admin-only: hidden when null, lists tokens with level badges when provided', () => {
    // null (non-admin / endpoint 403) → panel hidden.
    const hidden = setup();
    hidden.fixture.detectChanges();
    expect((hidden.fixture.nativeElement as HTMLElement).querySelector('.tok-list')).toBeNull();

    // A list (admin) → one row per token, each carrying its level badge.
    const shown = setup();
    shown.fixture.componentRef.setInput('tokenAccess', [
      { name: 'CI bot', level: 'full', allSpaces: false, peer: false, expiresAt: null },
      { name: 'Admin PAT', level: 'admin', allSpaces: true, peer: false, expiresAt: null },
      { name: 'Reader', level: 'readOnly', allSpaces: false, peer: false, expiresAt: '2027-01-01T00:00:00Z' },
    ]);
    shown.fixture.detectChanges();
    const el = shown.fixture.nativeElement as HTMLElement;
    const rows = [...el.querySelectorAll('.tok-list li')];
    expect(rows.length).toBe(3);
    expect(el.querySelector('.lvl.admin')).toBeTruthy();
    expect(el.querySelector('.lvl.full')).toBeTruthy();
    expect(el.querySelector('.lvl.readOnly')).toBeTruthy();
    expect(rows[0].textContent).toContain('CI bot');

    // An empty list (admin, but no token reaches the space) → panel shows its empty note, not the list.
    const empty = setup();
    empty.fixture.componentRef.setInput('tokenAccess', []);
    empty.fixture.detectChanges();
    const emptyEl = empty.fixture.nativeElement as HTMLElement;
    expect(emptyEl.querySelector('.tok-list')).toBeNull();
    expect(emptyEl.textContent).toContain('brain.overview.tok.none'); // test transloco emits the raw key
  });

  it('Completeness panel is hidden without a report, and never shows a score without its deductions', () => {
    // No report (still loading, or the endpoint failed) → no panel. A governance number that failed to
    // load must not render as a zero.
    const hidden = setup();
    hidden.fixture.detectChanges();
    expect((hidden.fixture.nativeElement as HTMLElement).querySelector('.comp-score')).toBeNull();

    const shown = setup();
    shown.fixture.componentRef.setInput('completeness', {
      spaceId: 'general', score: 62, truncated: false,
      checks: [
        // Passing — must NOT appear in the list; a check that costs nothing is not a deduction.
        { id: 'meta-purpose-missing', severity: 'info', scope: 'space', affected: 0, total: 1, weight: 1, earned: 1, sample: [], targetTab: null },
        // 1 point lost of 2.
        { id: 'entity-without-edges', severity: 'info', scope: 'entity', affected: 6, total: 12, weight: 2, earned: 1, sample: ['e1'], targetTab: 'entities' },
        // 3 points lost — the heaviest, so it must sort first even though it affects fewer records.
        { id: 'file-not-recallable', severity: 'warn', scope: 'file', affected: 3, total: 3, weight: 3, earned: 0, sample: ['a.pdf'], targetTab: 'files' },
      ],
    });
    shown.fixture.detectChanges();
    const el = shown.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.comp-score')?.textContent).toContain('62');
    const rows = [...el.querySelectorAll('.comp-list li')];
    expect(rows.length).toBe(2);   // the passing check is not listed
    // Ranked by points LOST, not by how many records are affected.
    expect(rows[0].textContent).toContain('file-not-recallable');
    expect(rows[1].textContent).toContain('entity-without-edges');
    expect(rows[0].querySelector('.cs')?.textContent).toContain('a.pdf');
  });

  it('a completeness deduction jumps to the tab holding the affected records', () => {
    const { fixture, c } = setup();
    const spy = vi.fn(); c.openTab.subscribe(spy);
    fixture.componentRef.setInput('completeness', {
      spaceId: 'general', score: 40, truncated: false,
      checks: [{ id: 'file-not-recallable', severity: 'warn', scope: 'file', affected: 3, total: 3, weight: 3, earned: 0, sample: [], targetTab: 'files' }],
    });
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.comp-go')!.click();
    expect(spy).toHaveBeenCalledWith('files');
  });

  it('a space-scoped finding has no tab to jump to, so it renders without a link', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('completeness', {
      spaceId: 'general', score: 0, truncated: false,
      checks: [{ id: 'meta-purpose-missing', severity: 'info', scope: 'space', affected: 1, total: 1, weight: 1, earned: 0, sample: [], targetTab: null }],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.comp-list li').length).toBe(1);
    expect(el.querySelector('.comp-go')).toBeNull();
  });

  it('a null score keeps the panel hidden — a space nothing could be asked about is not 0 % complete', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('completeness', { spaceId: 'general', score: null, checks: [], truncated: false });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.comp-score')).toBeNull();
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

/**
 * The usage panel — the owner asked for per-space call counts and timings "to be able to tell apart which
 * spaces are how useful", and a call count cannot answer that.
 *
 * A space asked 380 times that answered 41 is not popular; it is a space people keep failing to get an answer
 * out of. These pin the three places that distinction shows up in the UI: the rate itself, the difference
 * between "answers nothing" and "was never asked", and a panel that still renders when the answer is zero.
 */
describe('OverviewTabComponent — the usage panel', () => {
  function activity(over: Partial<SpaceActivity> = {}): SpaceActivity {
    return {
      space: 'general', calls: 0, recall: 0, answered: 0, writes: 0,
      meanMs: null, maxMs: 0, over1s: 0, meanTopScore: null, lastUsedAt: null,
      ...over,
    };
  }

  function render(act: SpaceActivity | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [OverviewTabComponent, getTranslocoModule()],
      providers: [{ provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } }],
    });
    const fixture = TestBed.createComponent(OverviewTabComponent);
    fixture.componentRef.setInput('space', { id: 'general', label: 'General' });
    fixture.componentRef.setInput('activity', act);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('reports the answer rate as a percentage of recalls', () => {
    const { c } = render(activity({ calls: 400, recall: 380, answered: 41 }));
    expect(c.answerRate()).toBe(11);
  });

  it('distinguishes "answers nothing" from "was never asked"', () => {
    // 0% is a judgement about quality; null means nobody asked. They call for opposite responses from an
    // operator — fill the space, versus find out why nothing queries it — so they must not render alike.
    expect(render(activity({ calls: 5, recall: 0, answered: 0 })).c.answerRate()).toBeNull();
    expect(render(activity({ calls: 20, recall: 20, answered: 0 })).c.answerRate()).toBe(0);
  });

  it('renders the panel when nothing was asked, instead of hiding it', () => {
    // Hiding it would look like a failed load. "Nothing has been asked of this space" is an answer.
    const { el } = render(activity());
    expect(el.textContent).toContain('brain.overview.useNone');
    expect(el.textContent).not.toContain('brain.overview.useAnswerRate');
  });

  it('shows the tiles once there is traffic', () => {
    const { el } = render(activity({ calls: 120, recall: 100, answered: 90, writes: 20, meanMs: 63 }));
    expect(el.textContent).toContain('brain.overview.useCalls');
    expect(el.textContent).toContain('brain.overview.useAnswered');
    expect(el.textContent).toContain('brain.overview.useAnswerRate');
    expect(el.textContent).toContain('63 ms');
  });

  it('hides the panel entirely until the fetch lands, and does not crash on null', () => {
    const { el, c } = render(null);
    expect(c.answerRate()).toBeNull();
    expect(el.textContent).not.toContain('brain.overview.useTitle');
  });

  it('only mentions slow calls when there are some', () => {
    expect(render(activity({ calls: 10, recall: 10, answered: 10, over1s: 0 })).el.textContent)
      .not.toContain('brain.overview.useSlow');
    expect(render(activity({ calls: 10, recall: 10, answered: 10, over1s: 3, maxMs: 1840 })).el.textContent)
      .toContain('brain.overview.useSlow');
  });
});
