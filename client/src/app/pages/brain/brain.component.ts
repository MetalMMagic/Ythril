import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordDrawerState } from './record-drawer-state.service';
import { RecordDrawerComponent } from './record-drawer.component';
import { QueryTabComponent } from './query-tab.component';
import { RecordListState } from './record-list-state.service';
import { MemoriesTabComponent } from './memories-tab.component';
import { EntitiesTabComponent } from './entities-tab.component';
import { EdgesTabComponent } from './edges-tab.component';
import { ChronoTabComponent } from './chrono-tab.component';
import { OverviewTabComponent } from './overview-tab.component';
import { ReviewTabComponent } from './review-tab.component';
import { FormsModule } from '@angular/forms';
import { Space, SpaceStats, AboutInfo, EmbeddingQueue, VoteRound, TokenAccessEntry, CompletenessReport } from '../../core/api.types';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { AdminApi } from '../../core/admin-api.service';
import { NetworksApi } from '../../core/networks-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GraphComponent } from '../graph/graph.component';
import { FileManagerComponent } from '../files/file-manager.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { BrainTab, CollectionTab } from './brain-tabs';

interface SpaceView {
  space: Space;
  stats?: SpaceStats;
}

@Component({
  selector: 'app-brain',
  standalone: true,
  // OnPush (P5): the heaviest page in the app — five record tabs and an embedded graph (the detail
  // drawer is now its own OnPush component). Safe because every async path (list/create/save
  // subscribes, the 300 ms search debounces) writes signals, which notify OnPush regardless of zone;
  // nothing mutates a signal's value in place. NOTE the plain (non-signal) form models — `memoryForm`,
  // `editMemory`, … — are rendered via ngModel and are re-checked only because each write is
  // accompanied by a signal write in the same turn (the create callbacks set `creatingX`/`showXForm`)
  // or happens in a template event handler, both of which mark the view dirty. That coupling is
  // load-bearing and pinned by the specs (the drawer's own version lives in the drawer component).
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, GraphComponent, FileManagerComponent, PhIconComponent, RecordDrawerComponent, QueryTabComponent, MemoriesTabComponent, EntitiesTabComponent, EdgesTabComponent, ChronoTabComponent, OverviewTabComponent, ReviewTabComponent, TranslocoPipe],
  providers: [BrainStore, EntityRefPicker, RecordDrawerState, RecordListState],
  styles: [`
    .space-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .space-chip {
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 110px;
      /* A long space name used to render at its full intrinsic width and paint straight over the
         neighbouring chip — measured at 284px of label inside a 144px chip. The strip is a horizontal
         scroller, so the chip must not be allowed to grow without bound, and the label must be told what
         to do when it does not fit. Truncation is the right answer here: the id line underneath and the
         title tooltip both carry the full name. */
      max-width: 200px;
      flex: 0 0 auto;
    }

    /* min-width:0 is load-bearing. A flex item defaults to min-width:auto and refuses to shrink below
       its content, so text-overflow would never engage and the label would overflow exactly as before. */
    .space-chip > * { max-width: 100%; min-width: 0; }

    .space-chip:hover { border-color: var(--accent); color: var(--text-primary); }

    .space-chip.active {
      background: var(--accent-dim);
      border-color: var(--accent);
      color: var(--accent);
    }

    .space-chip-label { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .space-chip-id { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .space-chip-count {
      font-size: 10px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .space-chip.active .space-chip-count { color: var(--accent); opacity: 0.8; }

    /* Network-membership indicator (F8): the Networks-menu icon, colour-coded by
       aggregate sync/governance status. No icon at all when the space is in no
       network. */
    .space-chip-net { display: inline-flex; align-items: center; }
    .space-chip-net.net-idle { color: var(--text-muted); }
    .space-chip-net.net-syncing { color: var(--warning); }
    .space-chip-net.net-degraded { color: var(--error); }
    .space-chip-net.net-vote { color: var(--info); }
    @keyframes chip-net-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .space-chip-net.net-syncing, .space-chip-net.net-vote { animation: chip-net-pulse 1.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .space-chip-net { animation: none !important; } }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-elevated);
      border-radius: 10px;
      padding: 1px 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: 5px;
      min-width: 20px;
      font-variant-numeric: tabular-nums;
    }

    .tab.active .tab-count {
      background: var(--accent-dim);
      color: var(--accent);
    }

    .reindex-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      margin-bottom: 12px;
      border: 1px solid var(--warning);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--warning) 6%, transparent);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .reindex-result {
      font-size: 12px;
      color: var(--text-muted);
      margin-left: auto;
    }

    .tab-spacer { flex: 1; }

    /* The active tab's content region. position:relative anchors the floating load spinner so it
       overlays the tab WITHOUT unmounting it (see the storm note in the template). */
    .tab-body { position: relative; min-height: 80px; }
    .loading-overlay--float {
      position: absolute;
      top: 0; left: 0; right: 0;
      z-index: 5;
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      border-radius: 8px;
    }

  `],
  template: `
    @if (loadingSpaces()) {
      <div class="loading-overlay"><span class="spinner"></span> {{ 'brain.loadingSpaces' | transloco }}</div>
    } @else if (spaces().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="package" [size]="48"/></div>
        <h3>{{ 'brain.emptySpaces.title' | transloco }}</h3>
        <p>{{ 'brain.emptySpaces.body' | transloco }}</p>
      </div>
    } @else {

      <!-- Space selector -->
      <div class="space-tabs">
        @for (sv of spaces(); track sv.space.id) {
          <button
            class="space-chip"
            [class.active]="activeSpaceId() === sv.space.id"
            [title]="sv.space.label + ' (' + sv.space.id + ')'"
            (click)="selectSpace(sv.space.id)"
          >
            <span class="space-chip-label">{{ sv.space.label }}</span>
            <span class="space-chip-id">{{ sv.space.id }}</span>
            @if (sv.space.networkStatus) {
              <span class="space-chip-net" [class]="'net-' + sv.space.networkStatus" [title]="networkChipTitle(sv.space)">
                <ph-icon name="link" [size]="12"/>
              </span>
            }
            @if (sv.stats) {
              <span class="space-chip-count">{{ spaceTotal(sv.stats) }} {{ 'brain.spaceChip.records' | transloco }}</span>
            }
          </button>
        }
      </div>

      @if (needsReindex()) {
        <div class="reindex-banner">
          <span><ph-icon name="warning" [size]="16" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.reindex.stale' | transloco }}</span>
          <button class="btn btn-sm btn-primary" [disabled]="reindexing()" (click)="runReindex()">
            @if (reindexing()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
            {{ 'brain.reindex.button' | transloco }}
          </button>
          @if (reindexResult()) { <span class="reindex-result">{{ reindexResult() }}</span> }
        </div>
      }
      @if (!needsReindex() && reindexResult()) {
        <div class="alert alert-success" style="margin-bottom:10px; font-size:13px;"><ph-icon name="check" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ reindexResult() }}</div>
      }

      <!-- Sub-tabs: Query on left, collections on right -->
      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'overview'" (click)="setTab('overview')">
          <ph-icon name="chart-bar" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.overview' | transloco }}
        </button>
        <button class="tab" [class.active]="activeTab() === 'query'" (click)="setTab('query')">
          <ph-icon name="magnifying-glass" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.query' | transloco }}
        </button>
        <button class="tab" [class.active]="activeTab() === 'graph'" (click)="setTab('graph')">
          <ph-icon name="binoculars" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.graph' | transloco }}
        </button>
        <!-- Review (F-REVIEW): duplicate pairs awaiting a decision in this space. Grouped with the
             other whole-space views rather than after Files — it is a workflow, not a record collection. -->
        <button class="tab" [class.active]="activeTab() === 'review'" (click)="setTab('review')">
          <ph-icon name="copy" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.review' | transloco }}
        </button>
        <span class="tab-spacer"></span>
        @for (tab of collectionTabs; track tab.key) {
          <button class="tab" [class.active]="activeTab() === tab.key" (click)="setTab(tab.key)">
            {{ tab.label }}
            @if (activeStats(); as s) {
              @if (tab.statsKey) {
                <span class="tab-count">{{ s[tab.statsKey] }}</span>
              }
            }
          </button>
        }
        <!-- Files (the former File Meta slot) — the file manager and File Meta merged into one tab: the
             explorer now shows each file's status, tags and folder sizes inline. -->
        <button class="tab" [class.active]="activeTab() === 'files'" (click)="setTab('files')">
          <ph-icon name="folder" [size]="15" style="display:inline-flex;vertical-align:middle;margin-right:4px;"/> {{ 'brain.tab.files' | transloco }}
          @if (activeStats(); as s) {
            <span class="tab-count">{{ s.files }}</span>
          }
        </button>
      </div>

      <!-- Content. Tabs are gated by activeTab() ONLY — NEVER wrapped in @else of
           @if (recordList.loading()). Each record tab WRITES recordList.loading during its own
           load(); gating the tab's existence on that signal made the tab unmount itself mid-load and
           re-mount on the response, an infinite mount⇄reload storm (one full re-create per response,
           ~5/s, self-sustaining even on 429). The load spinner now floats on top (position:absolute)
           so the active tab instance is never torn down. -->
      <div class="tab-body">
        @if (recordList.loading()) {
          <div class="loading-overlay loading-overlay--float"><span class="spinner"></span></div>
        }

        <!-- Graph + Files carry heavy libraries (cytoscape; the file-manager's markdown/mermaid/xlsx
             renderers). They must MOUNT only while their tab is active — an if-block on activeTab() does
             that (same storm-safe "gate on activeTab() alone" rule as the record tabs), and crucially
             UNMOUNTS them again when you leave, so they can't linger over another tab. A defer block
             alone can't do this: its when-trigger is a one-way load and never removes what it rendered.
             The inner defer (on immediate) still keeps these chunks OUT of the landing bundle — it fires
             the moment the tab first renders, and the browser-cached chunk re-instantiates fast. -->
        @if (activeTab() === 'graph') {
          @defer (on immediate) {
            <app-graph-view [embeddedSpaceId]="activeSpaceId()" />
          } @loading (minimum 200ms) {
            <div class="loading-overlay loading-overlay--float" data-tab-defer="graph"><span class="spinner"></span></div>
          }
        }

        <!-- Files tab (merged: file manager + File Meta) -->
        @if (activeTab() === 'files') {
          @defer (on immediate) {
            <app-file-manager [embeddedSpaceId]="activeSpaceId()" (filesChanged)="loadStats(activeSpaceId())" />
          } @loading (minimum 200ms) {
            <div class="loading-overlay loading-overlay--float" data-tab-defer="files"><span class="spinner"></span></div>
          }
        }

        <!-- Memories -->
        @if (activeTab() === 'memories') { <app-memories-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" /> }

        <!-- Entities -->
        @if (activeTab() === 'entities') { <app-entities-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" /> }

        <!-- Edges -->
        @if (activeTab() === 'edges') { <app-edges-tab [spaceId]="activeSpaceId()" (mutated)="loadStats(activeSpaceId())" /> }

        <!-- Chrono -->
        @if (activeTab() === 'chrono') { <app-chrono-tab [spaceId]="activeSpaceId()" /> }

        <!-- Query -->
        @if (activeTab() === 'overview') {
          @if (activeSpace(); as sp) {
            <app-overview-tab [space]="sp" [stats]="activeStats()" [needsReindex]="needsReindex()"
              [reindexing]="reindexing()" [about]="aboutInfo()" [embeddingQueue]="embeddingQueue()"
              [openVotes]="overviewVotes()" [tokenAccess]="tokenAccess()" [completeness]="completeness()"
              (reindex)="runReindex()" (retryFailed)="runRetryFailedEmbeddings()"
              (openTab)="setTab($event)" />
          }
        }
        @if (activeTab() === 'query') { <app-query-tab [spaceId]="activeSpaceId()" /> }

        <!-- Review (F-REVIEW): duplicate pairs for THIS space. Was a global Settings page; a duplicate
             pair only ever means something inside one space, so it belongs beside the space's data. -->
        @if (activeTab() === 'review') { <app-review-tab [spaceId]="activeSpaceId()" (openTab)="setTab($event)" /> }
      </div>

      <!-- Detail Drawer -->
      <app-record-drawer />
    }
  `,
})
export class BrainComponent implements OnInit, OnDestroy {
  readonly store = inject(BrainStore);
  readonly picker = inject(EntityRefPicker);
  readonly drawerState = inject(RecordDrawerState);
  readonly recordList = inject(RecordListState);
  private spacesApi = inject(SpacesApi);
  private brainApi = inject(BrainApi);
  private adminApi = inject(AdminApi);
  private networksApi = inject(NetworksApi);
  private transloco = inject(TranslocoService);

  // File Meta merged into the Files tab (rendered separately, after these, in the same group).
  collectionTabs: { key: BrainTab; label: string; statsKey?: keyof SpaceStats }[] = [
    { key: 'entities', label: 'Entities', statsKey: 'entities' },
    { key: 'edges', label: 'Edges', statsKey: 'edges' },
    { key: 'memories', label: 'Memories', statsKey: 'memories' },
    { key: 'chrono', label: 'Chrono', statsKey: 'chrono' },
  ];

  readonly pageSize = 20;

  spaces = signal<SpaceView[]>([]);
  activeSpaceId = signal('');
  activeTab = signal<BrainTab>('overview');
  loadingSpaces = signal(true);
  /** Instance identity/health for the Overview's Instance panel — fetched once (instance-wide, not per space). */
  aboutInfo = signal<AboutInfo | null>(null);
  /** Embedding-job backlog for the ACTIVE space (Overview embedding-queue panel); refreshed on space switch + live events. */
  embeddingQueue = signal<EmbeddingQueue | null>(null);
  /** Open governance votes across the ACTIVE space's networks (Overview Governance panel). */
  overviewVotes = signal<VoteRound[]>([]);
  /** Tokens that can reach the ACTIVE space (Overview token-access matrix). Null unless the caller is
   *  admin — the endpoint 403s otherwise, so a null keeps the panel hidden for non-admins. */
  tokenAccess = signal<TokenAccessEntry[] | null>(null);
  /** Completeness report for the ACTIVE space (Overview panel). Null until it lands or on failure —
   *  a governance panel that cannot load is hidden, not rendered as a zero. */
  completeness = signal<CompletenessReport | null>(null);

  // Reindex
  needsReindex = signal(false);
  reindexing = signal(false);
  reindexResult = signal('');

  // Entity picker

  activeStats = computed(() =>
    this.spaces().find(sv => sv.space.id === this.activeSpaceId())?.stats,
  );

  /** The active space object (for the Overview tab's index-status + quota panels). */
  activeSpace = computed(() =>
    this.spaces().find(sv => sv.space.id === this.activeSpaceId())?.space,
  );

  spaceTotal(stats: SpaceStats): number {
    return stats.memories + stats.entities + stats.edges + stats.chrono + stats.files;
  }

  /** Tooltip for the space-chip network indicator (F8): the network name(s) plus
   *  the human-readable status. Colour alone must not carry the meaning (a11y). */
  networkChipTitle(space: Space): string {
    const status = space.networkStatus ?? 'idle';
    const names = (space.networks ?? []).map(n => n.label).join(', ');
    const statusText = this.transloco.translate(`brain.spaceChip.network.${status}`);
    const prefix = this.transloco.translate('brain.spaceChip.network.prefix');
    return names ? `${prefix}: ${names} — ${statusText}` : statusText;
  }

  ngOnInit(): void {
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => {
        this.spaces.set(spaces.map(s => ({ space: s })));
        this.loadingSpaces.set(false);
        if (spaces.length > 0) {
          this.selectSpace(spaces[0].id);
          // Pre-load stats for all other spaces so counts show on their chips
          spaces.slice(1).forEach(s => this.loadStats(s.id));
        }
      },
      error: () => this.loadingSpaces.set(false),
    });
    // Instance identity/health for the Overview's Instance panel — one instance-wide fetch, best-effort.
    this.adminApi.getAbout().subscribe({ next: a => this.aboutInfo.set(a), error: () => {} });
  }

  ngOnDestroy(): void {
    this.closeLiveStream();
    clearTimeout(this.liveRefreshTimer);
  }

  // ── Live updates (F12) ──────────────────────────────────────────────────────
  private liveStream?: EventSource;
  private liveRefreshTimer?: ReturnType<typeof setTimeout>;
  private liveReconnectTimer?: ReturnType<typeof setTimeout>;
  private static readonly LIVE_RECONNECT_MS = 3000;
  private static readonly TAB_FOR_COLLECTION: Record<string, CollectionTab> = {
    memory: 'memories', entity: 'entities', edge: 'edges', chrono: 'chrono', file: 'files',
  };

  /** (Re)open the live-change SSE stream for a space. EventSource can't send an Authorization header, and
   *  a raw token in the URL leaks into logs/history/Referer, so we mint a single-use `?ticket=` first. */
  private openLiveStream(spaceId: string): void {
    this.closeLiveStream();
    if (typeof EventSource === 'undefined') return; // non-browser (SSR/test) environment
    if (!spaceId) return;
    this.connectLiveStream(spaceId);
  }

  /** Mint a ticket, then open the stream. Because the ticket is single-use, the browser's native
   *  auto-reconnect (which would replay the now-dead ticket) is useless — so on error we close and
   *  reconnect ourselves with a FRESH ticket after a fixed backoff, and only while this space is still
   *  active. The backoff + active-space guard keep a persistently-failing stream to ~1 attempt / 3s
   *  (never a request storm) and stop it entirely once the user navigates away. */
  private connectLiveStream(spaceId: string): void {
    if (spaceId !== this.activeSpaceId()) return; // space switched (or torn down) before we got here
    this.brainApi.mintEventsTicket(spaceId).subscribe({
      next: ({ ticket }) => {
        if (spaceId !== this.activeSpaceId()) return; // switched while minting — drop this ticket
        const url = `/api/brain/spaces/${encodeURIComponent(spaceId)}/events?ticket=${encodeURIComponent(ticket)}`;
        const es = new EventSource(url);
        es.onmessage = (e) => {
          let payload: { event?: string };
          try { payload = JSON.parse(e.data); } catch { return; }
          this.onLiveEvent(spaceId, payload.event ?? '');
        };
        es.onerror = () => {
          es.close();
          if (this.liveStream === es) this.liveStream = undefined;
          clearTimeout(this.liveReconnectTimer);
          this.liveReconnectTimer = setTimeout(() => this.connectLiveStream(spaceId), BrainComponent.LIVE_RECONNECT_MS);
        };
        this.liveStream = es;
      },
      // Mint failed (auth / rate limit / offline): stay closed — the next space switch retries. Not
      // retried on a timer here to avoid hammering the mint endpoint when auth is genuinely broken.
      error: () => { /* no-op */ },
    });
  }

  private closeLiveStream(): void {
    clearTimeout(this.liveReconnectTimer);
    this.liveStream?.close();
    this.liveStream = undefined;
  }

  /** Debounced refresh: any change updates the count badges; a change to the ACTIVE tab's collection
   *  (or any bulk write) also reloads its current page via the store tick. */
  private onLiveEvent(spaceId: string, event: string): void {
    if (spaceId !== this.activeSpaceId()) return;
    clearTimeout(this.liveRefreshTimer);
    this.liveRefreshTimer = setTimeout(() => {
      this.loadStats(spaceId);
      this.loadEmbeddingQueue(spaceId); // file/embed events change the queue
      const collection = event.split('.')[0] ?? '';
      if (event.startsWith('bulk') || BrainComponent.TAB_FOR_COLLECTION[collection] === this.activeTab()) {
        this.store.liveRefreshTick.update(t => t + 1);
      }
    }, 250);
  }

  selectSpace(id: string): void {
    // Switching space lands on the new space's OVERVIEW — its landing view (F9). The tab used to
    // persist across the switch, so picking another space while on, say, Entities just swapped the
    // rows underneath you: the page looked unchanged until you clicked a tab, and the space you had
    // chosen never introduced itself. Re-clicking the chip of the space you are ALREADY on is not a
    // switch, so that leaves your current tab alone.
    if (this.activeSpaceId() !== id) this.activeTab.set('overview');
    this.activeSpaceId.set(id);
    this.picker.spaceId.set(id);
    this.drawerState.spaceId.set(id);
    this.openLiveStream(id);
    this.store.memorySearch.set('');
    this.store.edgeSearch.set('');
    this.store.chronoSearch.set('');
    this.recordList.confirmDeleteId.set('');
    this.reindexResult.set('');
    this.embeddingQueue.set(null);
    this.overviewVotes.set([]);
    this.tokenAccess.set(null);
    this.completeness.set(null);
    this.loadStats(id);
    this.loadSpaceMeta(id);
    this.loadEmbeddingQueue(id);
    this.loadOverviewVotes(id);
    this.loadTokenAccess(id);
    this.loadCompleteness(id);
  }

  /** Fetch the completeness report for a space (Overview panel). Only stores it while that space is
   *  still active; a failure leaves the signal null and the panel simply does not render. */
  private loadCompleteness(spaceId: string): void {
    this.spacesApi.getCompleteness(spaceId).subscribe({
      next: r => { if (this.activeSpaceId() === spaceId) this.completeness.set(r); },
      error: () => { if (this.activeSpaceId() === spaceId) this.completeness.set(null); },
    });
  }

  /** Fetch the embedding-job backlog for a space; only stores it while that space is still active. */
  private loadEmbeddingQueue(spaceId: string): void {
    this.brainApi.getEmbeddingQueue(spaceId).subscribe({
      next: q => { if (this.activeSpaceId() === spaceId) this.embeddingQueue.set(q); },
      error: () => {},
    });
  }

  /** Fetch the token-access matrix for a space (Overview panel). ADMIN-only: a 403 for a non-admin
   *  caller leaves the signal null, which keeps the panel hidden. Only stores it while still active. */
  private loadTokenAccess(spaceId: string): void {
    this.brainApi.getTokenAccess(spaceId).subscribe({
      next: r => { if (this.activeSpaceId() === spaceId) this.tokenAccess.set(r.tokens); },
      error: () => { if (this.activeSpaceId() === spaceId) this.tokenAccess.set(null); },
    });
  }

  /** Fetch OPEN governance votes across the space's networks (Overview Governance panel). One listVotes
   *  per network the space belongs to; only stores the result while that space is still active. */
  private loadOverviewVotes(spaceId: string): void {
    const nets = this.spaces().find(sv => sv.space.id === spaceId)?.space.networks ?? [];
    if (nets.length === 0) { this.overviewVotes.set([]); return; }
    forkJoin(nets.map(n => this.networksApi.listVotes(n.id).pipe(
      catchError(() => of({ rounds: [] as VoteRound[] })), // one unreachable network must not hide the rest
    ))).subscribe({
      next: results => {
        if (this.activeSpaceId() !== spaceId) return;
        const open = results.flatMap(r => r.rounds).filter(v => v.status === 'open');
        this.overviewVotes.set(open);
      },
      error: () => {},
    });
  }

  setTab(tab: BrainTab): void {
    this.activeTab.set(tab);
    this.store.memorySearch.set('');
    this.store.edgeSearch.set('');
    this.store.chronoSearch.set('');
    this.store.fileMetaSearch.set('');
    this.recordList.confirmDeleteId.set('');
  }

  loadStats(spaceId: string): void {
    this.spacesApi.getSpaceStats(spaceId).subscribe({
      next: (stats) => {
        this.spaces.update(list =>
          list.map(sv => sv.space.id === spaceId ? { ...sv, stats } : sv),
        );
      },
      error: () => {},
    });
    this.spacesApi.getReindexStatus(spaceId).subscribe({
      next: ({ needsReindex }) => this.needsReindex.set(needsReindex),
      error: () => {},
    });
  }

  requestDelete(id: string): void { this.recordList.confirmDeleteId.set(id); }
  cancelDelete(): void { this.recordList.confirmDeleteId.set(''); }

  runReindex(): void {
    this.reindexing.set(true);
    this.reindexResult.set('');
    this.spacesApi.reindex(this.activeSpaceId()).subscribe({
      next: (result) => {
        this.reindexing.set(false);
        const total = Object.values(result).reduce((s: number, n) => s + (typeof n === 'number' ? n : 0), 0);
        this.reindexResult.set(`Reindexed ${total} documents.`);
        this.needsReindex.set(false);
        this.loadStats(this.activeSpaceId());
      },
      error: () => { this.reindexing.set(false); this.reindexResult.set('Reindex failed — check server logs.'); },
    });
  }

  /** Re-queue every failed embedding job for the active space, then refresh the queue panel. */
  runRetryFailedEmbeddings(): void {
    const spaceId = this.activeSpaceId();
    this.brainApi.retryFailedEmbeddings(spaceId).subscribe({
      next: () => { if (this.activeSpaceId() === spaceId) this.loadEmbeddingQueue(spaceId); },
      error: () => {},
    });
  }

  // ── Space meta (schema, loaded for property prefill) ────────────────────

  loadSpaceMeta(spaceId: string): void {
    if (!spaceId) return;
    this.spacesApi.getSpaceMeta(spaceId).subscribe({
      next: (meta) => this.store.spaceMeta.set(meta),
      error: () => this.store.spaceMeta.set(null),
    });
  }

  // ── Form openers with schema prefill ────────────────────────────────────

}

