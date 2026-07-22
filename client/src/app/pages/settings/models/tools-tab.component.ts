/**
 * Tab 3 — Tools. Things that run, with nothing to set.
 *
 * They exist here so every pipeline step leads somewhere: a chain that names `ffmpeg` and `text
 * chunker` as actors and then offers no page for either leaves the reader wondering whether those are
 * real components or labels. More importantly, this tab is "is it working?" for exactly the class of
 * component that has no settings screen — which is the class whose failure went unnoticed for months.
 *
 * **The vector index is status-only, deliberately.** No rebuild button: repair is a Danger Zone
 * action, and a reindex caused by a config change happens on save behind a confirm that says it
 * re-embeds the whole brain. A one-click "rebuild" here would be the same destructive operation
 * without any of that framing.
 *
 * The drift row is the reason `GET /api/admin/pipeline-status` exists. `config.json` recording a
 * space as `ready` while the database has no such index is invisible everywhere else in the product —
 * recall simply returns nothing, forever, with no error anywhere.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent, StatusVariant } from '../../../shared/status-pill.component';
import { HealthDotComponent } from './health-dot.component';
import { PipelineStatusService } from './pipeline-status.service';
import { SpaceIndexStatus } from './models.types';

@Component({
  selector: 'app-tools-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, StatusPillComponent, HealthDotComponent],
  styles: [`
    :host { display: block; }
    .tool { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;
      margin-bottom: 16px; overflow: hidden; }
    .tool-h { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
    .ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none;
      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .tool-h .t { flex: 1; min-width: 0; }
    .tool-h h3 { margin: 0; font-size: 14.5px; font-weight: 620; display: flex; align-items: center; gap: 8px; }
    .tool-h p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }
    .tool-b { border-top: 1px solid var(--border-muted); padding: 12px 18px 16px; }
    .meta { font-size: 12.5px; color: var(--text-secondary); }
    .meta code { font-family: var(--font-mono, monospace); font-size: 11.5px; }

    /* Wide content scrolls inside its own box — the page body must never scroll sideways. */
    .tablewrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 420px; }
    th { text-align: left; font-weight: 600; color: var(--text-muted); font-size: 11px;
      text-transform: uppercase; letter-spacing: .06em; padding: 6px 10px 6px 0; }
    td { padding: 7px 10px 7px 0; border-top: 1px solid var(--border-muted); vertical-align: top; }
    td.space { font-weight: 550; }
    .colls { display: flex; flex-wrap: wrap; gap: 5px; }
    .coll { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 7px;
      border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary);
      font-family: var(--font-mono, monospace); }
    .coll.missing { border-color: var(--error); color: var(--error); }

    .drift { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 14px; padding: 11px 13px;
      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--error-border); background: var(--error-bg); }
    .drift ph-icon { flex: none; margin-top: 1px; }
    .drift b { color: var(--text-primary); }
    .empty { font-size: 12.5px; color: var(--text-muted); }
  `],
  template: `
    <!-- ── Media splitter ─────────────────────────────────────────────── -->
    <section class="tool">
      <header class="tool-h">
        <span class="ic"><ph-icon name="scissors" [size]="17"/></span>
        <div class="t">
          <h3>{{ 'models.tools.splitter' | transloco }}</h3>
          <p>{{ 'models.tools.splitterPurpose' | transloco }}</p>
        </div>
        <app-status-pill variant="ok">ffmpeg</app-status-pill>
      </header>
      <div class="tool-b">
        <div class="meta">{{ 'models.tools.splitterDetail' | transloco }}</div>
      </div>
    </section>

    <!-- ── Text chunker ───────────────────────────────────────────────── -->
    <section class="tool">
      <header class="tool-h">
        <span class="ic"><ph-icon name="text-align-left" [size]="17"/></span>
        <div class="t">
          <h3>{{ 'models.tools.chunker' | transloco }}</h3>
          <p>{{ 'models.tools.chunkerPurpose' | transloco }}</p>
        </div>
        <app-status-pill variant="ok">{{ 'models.tools.inProcess' | transloco }}</app-status-pill>
      </header>
      <div class="tool-b">
        <div class="meta">{{ 'models.tools.chunkerDetail' | transloco }}</div>
      </div>
    </section>

    <!-- ── Vector index ───────────────────────────────────────────────── -->
    <section class="tool">
      <header class="tool-h">
        <span class="ic"><ph-icon name="database" [size]="17"/></span>
        <div class="t">
          <h3>
            {{ 'models.tools.vectorIndex' | transloco }}
            <app-health-dot [state]="indexHealth()" [subject]="'models.tools.vectorIndex' | transloco"/>
          </h3>
          <p>{{ 'models.tools.vectorIndexPurpose' | transloco }}</p>
        </div>
      </header>
      <div class="tool-b">
        @if (drifted().length) {
          <div class="drift">
            <ph-icon name="warning" [size]="16"/>
            <span>
              <b>{{ 'models.tools.driftTitle' | transloco: { count: drifted().length } }}</b>
              {{ 'models.tools.driftBody' | transloco }}
            </span>
          </div>
        }

        @if (unavailable(); as u) {
          <div class="empty">{{ 'models.tools.indexUnavailable' | transloco: { detail: u } }}</div>
        } @else if (!spaces().length) {
          <div class="empty">{{ 'models.tools.indexEmpty' | transloco }}</div>
        } @else {
          <div class="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'models.tools.colSpace' | transloco }}</th>
                  <th>{{ 'models.tools.colLive' | transloco }}</th>
                  <th>{{ 'models.tools.colStored' | transloco }}</th>
                  <th>{{ 'models.tools.colCollections' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (sp of spaces(); track sp.id) {
                  <tr>
                    <td class="space">{{ sp.label }}</td>
                    <td><app-status-pill [variant]="liveVariant(sp)" [dot]="true">{{ 'models.indexState.' + sp.live | transloco }}</app-status-pill></td>
                    <td><app-status-pill [variant]="sp.drifted ? 'error' : 'off'">{{ 'models.indexState.' + sp.stored | transloco }}</app-status-pill></td>
                    <td>
                      <div class="colls">
                        @for (c of sp.collections; track c.indexName) {
                          <!-- Only red when the index is genuinely absent. When the listing itself
                               failed (live = unknown) every status is null for want of an answer, and
                               painting those red would assert a fact we do not have — the same
                               dishonesty as the stored-vs-live drift this table exists to expose. -->
                          <span class="coll" [class.missing]="sp.live !== 'unknown' && c.status === null"
                            [attr.title]="c.indexName + ' · ' + (c.status ?? (('models.indexState.' + (sp.live === 'unknown' ? 'unknown' : 'missing')) | transloco))">
                            {{ c.collection }}
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class ToolsTabComponent {
  readonly pipeline = inject(PipelineStatusService);

  spaces = computed(() => this.pipeline.status()?.index.spaces ?? []);
  unavailable = computed(() => this.pipeline.status()?.index.unavailable ?? null);
  drifted = computed(() => this.pipeline.driftedSpaces());

  /** One dot for the whole index: the worst thing any space reports. */
  indexHealth = computed(() => {
    const spaces = this.spaces();
    if (!this.pipeline.status()) return null;
    if (this.unavailable() || spaces.some(s => s.live === 'unknown')) return null;
    if (spaces.some(s => s.live === 'missing')) return 'down' as const;
    if (spaces.some(s => s.live === 'building')) return 'degraded' as const;
    return 'ok' as const;
  });

  liveVariant(sp: SpaceIndexStatus): StatusVariant {
    if (sp.live === 'ready') return 'ok';
    if (sp.live === 'building') return 'warn';
    if (sp.live === 'missing') return 'error';
    return 'off';
  }
}
