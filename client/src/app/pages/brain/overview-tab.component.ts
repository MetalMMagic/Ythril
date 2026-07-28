/**
 * Brain → Overview tab (F9, slice 1).
 *
 * The space's landing view: a governance/health dashboard assembled over data the Brain shell already
 * holds, so it adds no fetch of its own. Presentational by design — `space` and `stats` come in as
 * inputs (the shell preloads them for every space), and the one action, Reindex, is emitted back to the
 * shell's existing reindex flow behind a confirm.
 *
 * Panels so far: Statistics, Indexing, Embedding queue (per-space media-job counts), Governance (open
 * votes across the space's networks), Networks (F8's `networks`/`networkStatus`) and Instance
 * (`/api/about`). Every input is preloaded by the shell, so this component still fetches nothing itself.
 * The token-access panel is a later slice (admin-gating).
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { StatusPillComponent, StatusVariant } from '../../shared/status-pill.component';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Space, SpaceStats, AboutInfo, EmbeddingQueue, VoteRound, TokenAccessEntry } from '../../core/api.types';

/** `key` doubles as the Brain tab this tile jumps to — the five collection tabs. */
type StatKey = 'memories' | 'entities' | 'edges' | 'chrono' | 'files';
interface StatCard { key: StatKey; icon: string; label: string; value: number }

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, StatusPillComponent, RouterLink, DatePipe],
  styles: [`
    :host { display: block; }

    /* Deterministic column count instead of auto-fit: auto-fit re-flowed at every viewport width and
       regularly orphaned a card on a row of its own, which is what made the board look arbitrary.
       Cards STRETCH to their row height (no align-items:start), so every card in a row ends level. */
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 820px)  { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (min-width: 1280px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

    /* The summary spans the full row — it is the heaviest card (six tiles + the storage bar) and
       reads as the page's headline rather than one tile among equals. */
    .panel.span-all { grid-column: 1 / -1; }

    /* A card is a column: header, then a body that FILLS the stretched height. Without the filling
       body a short card's content floats against a tall border box. */
    .panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
      display: flex; flex-direction: column; }
    .panel-h { display: flex; align-items: center; gap: 9px; padding: 13px 16px;
      border-bottom: 1px solid var(--border-muted); }
    .panel-h .ic { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none;
      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .panel-h h3 { margin: 0; font-size: 14px; font-weight: 620; }
    /* Every hint RESERVES two lines and clamps to two, so a card whose hint wraps and one whose hint
       fits on a single line still put their divider rule at the same height. Reserving (rather than
       truncating to one line) keeps the full hint readable — the alignment costs a little whitespace,
       not information. em-based, so it survives a font-size change; no magic total-height number. */
    .panel-h p { margin: 1px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.35;
      min-height: calc(2 * 1.35em);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .panel-b { padding: 14px 16px; flex: 1; }

    /* Default tile grid: the embedding-queue card's three counters, in a normal-width card. NOTE the
       breakpoints below are VIEWPORT-based, so they must not be allowed to reach this card — six
       columns inside a one-third-width card squeezes the labels to nothing. Hence the .span-all scope. */
    .stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    /* The summary's six tiles (five collections + total) across the full-width card. */
    .span-all .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (min-width: 560px)  { .span-all .stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (min-width: 1000px) { .span-all .stat-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    .stat { background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: 8px; padding: 11px 12px; }
    .stat .v { font-size: 22px; font-weight: 700; font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; line-height: 1.1; }
    .stat .l { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); }
    /* The five collection tiles are buttons now. Reset the UA button styling so they still read as
       tiles, and give them a real affordance — a clickable thing that looks inert gets clicked by
       nobody. The total tile stays a div: it has no single tab to open. */
    .stat-link { font: inherit; color: inherit; text-align: left; width: 100%; cursor: pointer;
      transition: border-color var(--transition), background var(--transition); }
    .stat-link:hover { border-color: var(--accent); background: var(--bg-surface); }
    .stat-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .stat.total { border-color: color-mix(in srgb, var(--accent) 45%, transparent);
      background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated)); }
    .stat.total .v { color: var(--accent-ink, var(--accent)); }

    .store { margin-top: 14px; }
    .store-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 12.5px; }
    .store-row .cap { color: var(--text-secondary); }
    .store-row .num { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; color: var(--text-primary); }
    .bar { height: 7px; border-radius: 4px; background: var(--bg-elevated); margin-top: 7px; overflow: hidden; border: 1px solid var(--border-muted); }
    .bar > span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
    .bar > span.warn { background: var(--warning); } .bar > span.err { background: var(--error); }

    .idx-row { display: flex; align-items: center; gap: 10px; }
    .idx-row .lab { font-size: 13px; color: var(--text-secondary); flex: 1; }
    .reindex-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 13px; padding: 10px 12px;
      border-radius: 8px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }
    .reindex-note ph-icon { flex: none; margin-top: 1px; color: var(--warning); }
    .actions { margin-top: 13px; }
    .muted { color: var(--text-muted); font-size: 12.5px; }

    .net-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
    .net-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .net-list ph-icon { color: var(--text-muted); flex: none; }
    .net-list .nl { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .net-list .nt { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }

    .kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 12.5px; margin: 0; }
    .kv dt { color: var(--text-secondary); white-space: nowrap; }
    .kv dd { margin: 0; color: var(--text-primary); text-align: right; }
    .kv dd.mono { font-family: var(--font-mono, monospace); font-size: 11px; word-break: break-all; }

    .stat.err-stat { border-color: color-mix(in srgb, var(--error) 45%, transparent); background: color-mix(in srgb, var(--error) 10%, var(--bg-elevated)); }
    .stat.err-stat .v { color: var(--error); }
    .fail-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .fail-list li { display: flex; flex-direction: column; gap: 1px; font-size: 11.5px; border-top: 1px solid var(--border-muted); padding-top: 6px; }
    .fail-list .fp { font-family: var(--font-mono, monospace); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fail-list .fe { color: var(--error); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .vote-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
    .vote-list li { border: 1px solid var(--border-muted); border-radius: 8px; padding: 9px 11px; background: var(--bg-elevated); }
    .vote-top { display: flex; align-items: baseline; gap: 8px; }
    .vote-top .vs { flex: 1; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vote-top .vt { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono, monospace); }
    .vote-meta { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; font-size: 11.5px; color: var(--text-secondary); flex-wrap: wrap; }
    .vote-meta .tally { font-variant-numeric: tabular-nums; }
    .tok-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
    .tok-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .tok-list .tn { flex: 1; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tok-list .tx { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
    .lvl { font-size: 10.5px; font-weight: 620; padding: 1px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; flex: none; }
    .lvl.admin { background: color-mix(in srgb, var(--error) 16%, transparent); color: var(--error); }

    /* Rows are as tall as their tallest card, so an unbounded list (many tokens, many peers) used to
       stretch every sibling with it. Cap the lists and let the long ones scroll in place. */
    .net-list, .vote-list, .tok-list, .fail-list { max-height: 216px; overflow-y: auto; }
    .lvl.full { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
    .lvl.readOnly { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-secondary); }
  `],
  template: `
    <div class="grid">
      <!-- ── Statistics (full-width summary strip) ──────────────────── -->
      <section class="panel span-all">
        <header class="panel-h">
          <span class="ic"><ph-icon name="chart-bar" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.statsTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.statsHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          @if (stats(); as s) {
            <div class="stat-grid">
              @for (c of statCards(); track c.key) {
                <button type="button" class="stat stat-link" (click)="openTab.emit(c.key)"
                        [attr.aria-label]="('brain.overview.openTabAriaLabel' | transloco) + ' ' + (c.label | transloco)">
                  <div class="v">{{ c.value }}</div>
                  <div class="l"><ph-icon [name]="c.icon" [size]="13"/>{{ c.label | transloco }}</div>
                </button>
              }
              <div class="stat total">
                <div class="v">{{ total() }}</div>
                <div class="l">{{ 'brain.overview.total' | transloco }}</div>
              </div>
            </div>

            <div class="store">
              <div class="store-row">
                <span class="cap">{{ 'brain.overview.storage' | transloco }}</span>
                @if (space().maxGiB) {
                  <span class="num">{{ used() }} / {{ space().maxGiB }} GiB</span>
                } @else {
                  <span class="num">{{ used() }} GiB · {{ 'brain.overview.storageUnlimited' | transloco }}</span>
                }
              </div>
              @if (usagePct(); as pct) {
                <div class="bar"><span [class.warn]="pct >= 80 && pct < 95" [class.err]="pct >= 95" [style.width.%]="pct"></span></div>
              }
            </div>
          } @else {
            <span class="muted">{{ 'brain.overview.statsLoading' | transloco }}</span>
          }
        </div>
      </section>

      <!-- ── Indexing ───────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="database" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.indexingTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.indexingHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          <div class="idx-row">
            <span class="lab">{{ 'brain.overview.vectorIndex' | transloco }}</span>
            <app-status-pill [variant]="indexVariant()" [dot]="true">{{ 'brain.overview.idx.' + indexState() | transloco }}</app-status-pill>
          </div>

          @if (needsReindex()) {
            <div class="reindex-note">
              <ph-icon name="warning" [size]="15"/>
              <span>{{ 'brain.overview.reindexNeeded' | transloco }}</span>
            </div>
          }

          <div class="actions">
            <button class="btn btn-sm btn-secondary" type="button" [disabled]="reindexing()" (click)="requestReindex()">
              @if (reindexing()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
              <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:5px;vertical-align:-2px;"/>{{ 'brain.overview.reindexButton' | transloco }}
            </button>
          </div>
        </div>
      </section>

      <!-- ── Embedding queue ────────────────────────────────────────── -->
      @if (embeddingQueue(); as q) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="stack" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.queueTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.queueHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            <div class="stat-grid">
              <div class="stat"><div class="v">{{ q.pending }}</div><div class="l">{{ 'brain.overview.queue.pending' | transloco }}</div></div>
              <div class="stat"><div class="v">{{ q.processing }}</div><div class="l">{{ 'brain.overview.queue.processing' | transloco }}</div></div>
              <div class="stat" [class.err-stat]="q.failed > 0"><div class="v">{{ q.failed }}</div><div class="l">{{ 'brain.overview.queue.failed' | transloco }}</div></div>
            </div>
            @if (q.failed === 0 && q.pending === 0 && q.processing === 0) {
              <div class="muted" style="margin-top:12px;">{{ 'brain.overview.queue.idle' | transloco }}</div>
            }
            @if (q.failedSample.length) {
              <ul class="fail-list">
                @for (f of q.failedSample; track f.path) {
                  <li><span class="fp" [title]="f.path">{{ f.path }}</span><span class="fe" [title]="f.lastError">{{ f.lastError || ('brain.overview.queue.unknownError' | transloco) }}</span></li>
                }
              </ul>
            }
            @if (q.failed > 0) {
              <button class="btn btn-sm btn-secondary retry-failed-btn" type="button" style="margin-top:12px;" (click)="requestRetryFailed()">
                <ph-icon name="arrows-clockwise" [size]="14" style="margin-right:5px;vertical-align:-2px;"/>{{ 'brain.overview.queue.retryFailed' | transloco }}
              </button>
            }
          </div>
        </section>
      }

      <!-- ── Governance (open votes) ────────────────────────────────── -->
      @if (openVotes().length) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="broadcast" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.govTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.govHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            <ul class="vote-list">
              @for (v of openVotes(); track v.id) {
                <li>
                  <div class="vote-top"><span class="vs" [title]="v.subject">{{ v.subject }}</span><span class="vt">{{ v.type }}</span></div>
                  <div class="vote-meta">
                    <span>{{ 'brain.overview.gov.deadline' | transloco }}: {{ v.deadline | date:'dd.MM.yyyy HH:mm' }}</span>
                    <span class="tally">{{ tallyYes(v) }} {{ 'brain.overview.gov.yes' | transloco }} · {{ tallyVeto(v) }} {{ 'brain.overview.gov.veto' | transloco }}</span>
                  </div>
                </li>
              }
            </ul>
            <a class="btn btn-sm btn-secondary" routerLink="/settings/networks" style="margin-top:12px; display:inline-flex; align-items:center; gap:5px;">
              <ph-icon name="broadcast" [size]="14"/> {{ 'brain.overview.gov.review' | transloco }}
            </a>
          </div>
        </section>
      }

      <!-- ── Networks ───────────────────────────────────────────────── -->
      <section class="panel">
        <header class="panel-h">
          <span class="ic"><ph-icon name="link" [size]="16"/></span>
          <div><h3>{{ 'brain.overview.networksTitle' | transloco }}</h3>
            <p>{{ 'brain.overview.networksHint' | transloco }}</p></div>
        </header>
        <div class="panel-b">
          @if (networks().length) {
            <div class="idx-row" style="margin-bottom:11px;">
              <span class="lab">{{ 'brain.overview.syncStatus' | transloco }}</span>
              <app-status-pill [variant]="netVariant()" [dot]="true">{{ 'brain.overview.net.' + netStatus() | transloco }}</app-status-pill>
            </div>
            <ul class="net-list">
              @for (n of networks(); track n.id) {
                <li><ph-icon name="link" [size]="13"/><span class="nl">{{ n.label }}</span><span class="nt">{{ n.type }}</span></li>
              }
            </ul>
          } @else {
            <span class="muted">{{ 'brain.overview.noNetworks' | transloco }}</span>
          }
        </div>
      </section>

      <!-- ── Instance ───────────────────────────────────────────────── -->
      @if (about(); as a) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="info" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.instanceTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.instanceHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            <dl class="kv">
              <dt>{{ 'brain.overview.inst.label' | transloco }}</dt><dd>{{ a.instanceLabel }}</dd>
              <dt>{{ 'brain.overview.inst.version' | transloco }}</dt><dd>{{ a.version }}</dd>
              <dt>{{ 'brain.overview.inst.id' | transloco }}</dt><dd class="mono">{{ a.instanceId }}</dd>
              <dt>{{ 'brain.overview.inst.uptime' | transloco }}</dt><dd>{{ a.uptime }}</dd>
              <dt>{{ 'brain.overview.inst.mongo' | transloco }}</dt><dd>{{ a.mongoVersion }}</dd>
            </dl>
          </div>
        </section>
      }

      <!-- ── Token access (admin-only; null for non-admins → hidden) ──── -->
      @if (tokenAccess(); as toks) {
        <section class="panel">
          <header class="panel-h">
            <span class="ic"><ph-icon name="key" [size]="16"/></span>
            <div><h3>{{ 'brain.overview.tokenTitle' | transloco }}</h3>
              <p>{{ 'brain.overview.tokenHint' | transloco }}</p></div>
          </header>
          <div class="panel-b">
            @if (toks.length) {
              <ul class="tok-list">
                @for (t of toks; track t.name) {
                  <li>
                    <span class="lvl" [class.admin]="t.level === 'admin'" [class.full]="t.level === 'full'" [class.readOnly]="t.level === 'readOnly'">{{ 'brain.overview.tok.' + t.level | transloco }}</span>
                    <span class="tn">{{ t.name }}</span>
                    @if (t.peer) { <span class="tx">{{ 'brain.overview.tok.peer' | transloco }}</span> }
                    @if (t.allSpaces) { <span class="tx">{{ 'brain.overview.tok.allSpaces' | transloco }}</span> }
                    @if (t.expiresAt) { <span class="tx">{{ 'brain.overview.tok.expires' | transloco: { date: (t.expiresAt | date:'mediumDate') } }}</span> }
                  </li>
                }
              </ul>
            } @else {
              <div class="muted">{{ 'brain.overview.tok.none' | transloco }}</div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class OverviewTabComponent {
  space = input.required<Space>();
  stats = input<SpaceStats | undefined>(undefined);
  reindexing = input(false);
  needsReindex = input(false);
  /** Instance identity/health (from /api/about), preloaded by the shell — null until it lands. */
  about = input<AboutInfo | null>(null);
  /** Embedding-job backlog for this space (from the shell) — null until it lands. */
  embeddingQueue = input<EmbeddingQueue | null>(null);
  /** Open governance votes across this space's networks (from the shell). */
  openVotes = input<VoteRound[]>([]);
  /** Tokens that can reach this space (from the shell). Null for non-admins → the panel stays hidden. */
  tokenAccess = input<TokenAccessEntry[] | null>(null);
  /** Emitted (after a confirm) so the shell's existing reindex flow runs — no duplicate API path. */
  /** A collection tile was clicked — the shell switches to that tab. */
  openTab = output<StatKey>();

  reindex = output<void>();
  /** Emitted so the shell re-queues every failed embedding job and reloads the queue (fetch-free tab). */
  retryFailed = output<void>();

  private confirmDialog = inject(ConfirmDialogService);
  private transloco = inject(TranslocoService);

  total = computed(() => {
    const s = this.stats();
    return s ? s.memories + s.entities + s.edges + s.chrono + s.files : 0;
  });

  statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { key: 'memories', icon: 'brain', label: 'brain.overview.rec.memories', value: s.memories },
      { key: 'entities', icon: 'stack', label: 'brain.overview.rec.entities', value: s.entities },
      { key: 'edges', icon: 'graph', label: 'brain.overview.rec.edges', value: s.edges },
      { key: 'chrono', icon: 'timer', label: 'brain.overview.rec.chrono', value: s.chrono },
      { key: 'files', icon: 'folder', label: 'brain.overview.rec.files', value: s.files },
    ];
  });

  /** Two decimals of GiB, without trailing noise. */
  used(): string { return (this.space().usageGiB ?? 0).toFixed(2); }

  usagePct(): number | null {
    const sp = this.space();
    if (!sp.maxGiB) return null;
    return Math.min(100, ((sp.usageGiB ?? 0) / sp.maxGiB) * 100);
  }

  /** Networks this space belongs to (F8 data, already on the space payload — no extra fetch). */
  networks = computed(() => this.space().networks ?? []);

  /** Aggregate sync/governance status; defaults to 'idle' when connected but unreported. */
  netStatus(): 'idle' | 'syncing' | 'degraded' | 'vote' {
    return this.space().networkStatus ?? 'idle';
  }

  netVariant(): StatusVariant {
    switch (this.space().networkStatus) {
      case 'degraded': return 'error';
      case 'syncing': return 'pending';
      case 'vote': return 'warn';   // a governance vote is awaiting this instance — needs attention
      default: return 'ok';         // idle = connected and healthy
    }
  }

  /** Running vote tallies for the Governance panel. */
  tallyYes(v: VoteRound): number { return v.votes.filter(x => x.vote === 'yes').length; }
  tallyVeto(v: VoteRound): number { return v.votes.filter(x => x.vote === 'veto').length; }

  /** Space.indexStatus is optional (proxy/legacy spaces have none) → 'none'. */
  indexState(): 'ready' | 'building' | 'failed' | 'none' {
    return this.space().indexStatus ?? 'none';
  }

  indexVariant(): StatusVariant {
    switch (this.indexState()) {
      case 'ready': return 'ok';
      case 'building': return 'warn';
      case 'failed': return 'error';
      default: return 'off';
    }
  }

  async requestReindex(): Promise<void> {
    if (this.reindexing()) return;
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('brain.overview.confirmReindexTitle'),
      message: this.transloco.translate('brain.overview.confirmReindex', { label: this.space().label }),
      confirmLabel: this.transloco.translate('brain.overview.reindexButton'),
      danger: true,
    });
    if (!ok) return;
    this.reindex.emit();
  }

  async requestRetryFailed(): Promise<void> {
    const failed = this.embeddingQueue()?.failed ?? 0;
    if (failed <= 0) return;
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('brain.overview.confirmRetryFailedTitle'),
      message: this.transloco.translate('brain.overview.confirmRetryFailed', { count: failed }),
      confirmLabel: this.transloco.translate('brain.overview.queue.retryFailed'),
    });
    if (!ok) return;
    this.retryFailed.emit();
  }
}
