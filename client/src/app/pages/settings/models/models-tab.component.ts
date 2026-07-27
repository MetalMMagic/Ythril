/**
 * Tab 1 — Models. Anything you or infra can set.
 *
 * Seven cards, all through `app-model-provider-card`, all in one field order:
 * **provider → endpoint → model → credential → test**. The four configurable ones (embedding, vision,
 * speech-to-text, assist) previously each chose their own order inside one big file; the three
 * infra-owned ones (page renderer, document converter, face recognition) had no card at all — the
 * renderer and converter were a caption, and face recognition was absent from the admin surface
 * entirely, which is why it still shows here as read-only until it gets a real control.
 *
 * Rows that do not apply are omitted rather than dashed, per the owner's option B.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { StatusPillComponent } from '../../../shared/status-pill.component';
import { ModelProviderCardComponent } from './model-provider-card.component';
import { ModelsStateService } from './models-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { SchemaApi } from '../../../core/schema-api.service';
import { TestTarget } from './models.types';

@Component({
  selector: 'app-models-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, PhIconComponent, StatusPillComponent, ModelProviderCardComponent],
  styles: [`
    :host { display: block; }
    /* align-items: stretch is what pins every footer to a shared baseline (owner's point 4). */
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
      gap: 16px; align-items: stretch; }
    .field { margin-bottom: 13px; }
    .field:last-child { margin-bottom: 0; }
    .field > label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; font-weight: 500; }
    .field input, .field select { width: 100%; background: var(--bg-primary); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .field input[data-mono] { font-family: var(--font-mono, monospace); font-size: 12.5px; }
    .field input:disabled, .field select:disabled { opacity: .6; cursor: not-allowed; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
    @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
    .hint { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }
    .ro { font-family: var(--font-mono, monospace); font-size: 12.5px; color: var(--text-primary);
      background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px;
      overflow-wrap: anywhere; }
    .warnline { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px;
      border-radius: 9px; font-size: 12.5px; border: 1px solid var(--warning-border); background: var(--warning-bg); }
    .warnline ph-icon { flex: none; margin-top: 1px; }
    .checkrow { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px;
      color: var(--text-secondary); font-weight: normal;
      /* Undo the global ".field label" caption styling (uppercase + tracking) — a checkbox's own
         label is a normal sentence, not a field caption. */
      text-transform: none; letter-spacing: normal; }
    /* width:auto keeps a checkbox in a checkrow from being stretched to 100% by the .field input
       rule when the checkrow sits inside a .field (assist card's repair-pass toggle). */
    .checkrow input { margin-top: 2px; flex: none; width: auto; }
    /* Person-type chips: the selected library entity types, each removable. */
    .ptype-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }
    .ptype-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 4px 2px 9px;
      border-radius: 6px; border: 1px solid var(--border); background: var(--bg-primary);
      font-family: var(--font-mono, monospace); }
    .ptype-rm { display: inline-flex; align-items: center; background: none; border: 0; padding: 2px; cursor: pointer;
      color: var(--text-muted); border-radius: 4px; }
    .ptype-rm:hover { color: var(--error); }
    .switchrow { margin-bottom: 13px; }
    .switchrow .hint { margin-left: 22px; }   /* line up under the label, not the checkbox */
    /* Keep the test row a single fixed-height line so pressing Test (which reveals the status pill +
       latency/detail) never wraps to a second line and jolts the whole equal-height card row. The
       button and pill stay their natural size; the detail truncates with an ellipsis (full text on
       hover) rather than pushing the layout. */
    .testrow { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; min-height: 34px; }
    .testrow > :not(.hint) { flex: none; }
    .testrow .hint { margin: 0; min-width: 0; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `],
  template: `
    <div class="cards">
      <!-- ── Text embedding ─────────────────────────────────────────────── -->
      <app-model-provider-card id="embedding" icon="database"
        [heading]="'models.embedding.title' | transloco"
        [purpose]="'models.embedding.purpose' | transloco"
        [health]="pipeline.modelState('embedding')">
        <app-status-pill pill [variant]="s.embedding.provider === 'external' ? 'active' : 'ok'">
          {{ (s.embedding.provider === 'external' ? 'models.embedding.pillExternal'
              : (s.embedding.baseUrl ? 'models.embedding.pillLocalHttp' : 'models.embedding.pillBundled')) | transloco }}
        </app-status-pill>
        @if (s.embeddingLocked('model')) { <app-status-pill pill variant="env">{{ 'models.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="emb-provider">{{ 'models.field.provider' | transloco }}</label>
          <select id="emb-provider" [(ngModel)]="s.embedding.provider" [disabled]="s.embeddingLocked('provider')">
            <option value="local">{{ 'models.embedding.optLocal' | transloco }}</option>
            <option value="external">{{ 'models.embedding.optExternal' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="emb-endpoint">{{ 'models.field.endpoint' | transloco }}</label>
          <input id="emb-endpoint" data-mono type="url" [(ngModel)]="s.embedding.baseUrl"
            [disabled]="s.embeddingLocked('baseUrl')" [placeholder]="'models.embedding.endpointPlaceholder' | transloco" />
          <div class="hint">{{ 'models.embedding.endpointHint' | transloco }}</div>
        </div>
        <div class="field">
          <label for="emb-model">{{ 'models.field.model' | transloco }}</label>
          <input id="emb-model" data-mono [(ngModel)]="s.embedding.model" [disabled]="s.embeddingLocked('model')" placeholder="nomic-embed-text" />
        </div>
        <div class="grid2">
          <div class="field">
            <label for="emb-dims">{{ 'models.field.dimensions' | transloco }}</label>
            <input id="emb-dims" type="number" min="1" max="16384" [(ngModel)]="s.embedding.dimensions" [disabled]="s.embeddingLocked('dimensions')" />
          </div>
          <div class="field">
            <label for="emb-sim">{{ 'models.field.similarity' | transloco }}</label>
            <select id="emb-sim" [(ngModel)]="s.embedding.similarity" [disabled]="s.embeddingLocked('model')">
              <option value="cosine">cosine</option>
              <option value="dotProduct">dotProduct</option>
              <option value="euclidean">euclidean</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="emb-key">{{ 'models.field.apiKeyExternal' | transloco }}</label>
          <input id="emb-key" type="password" [(ngModel)]="s.embeddingApiKeyInput" [disabled]="s.embeddingLocked('apiKey')"
            [placeholder]="(s.embedding.apiKey ? 'models.field.apiKeyKeep' : 'models.field.apiKeyOptional') | transloco" />
        </div>
        @if (s.embeddingNeedsReindex()) {
          <div class="warnline">
            <ph-icon name="warning" [size]="15"/>
            <span [innerHTML]="'models.embedding.reindexWarning' | transloco"></span>
          </div>
        }

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('embedding')"
            [disabled]="s.testOf('embedding')?.loading || !s.embedding.baseUrl">
            {{ (s.testOf('embedding')?.loading ? 'models.action.testing' : 'models.action.test') | transloco }}
          </button>
          @if (s.testOf('embedding')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.reachable ? null : (r.detail || null)">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Vision ─────────────────────────────────────────────────────── -->
      <app-model-provider-card id="vision" icon="image"
        [heading]="'models.vision.title' | transloco"
        [purpose]="'models.vision.purpose' | transloco"
        [health]="pipeline.modelState('vision')">
        <app-status-pill pill [variant]="s.mediaClassOn('images') ? 'active' : 'off'">
          {{ (s.form.visionProvider === 'external' ? 'models.pill.external' : 'models.vision.pillLocal') | transloco }}
        </app-status-pill>
        @if (s.isLocked('visionProvider')) { <app-status-pill pill variant="env">{{ 'models.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="vis-provider">{{ 'models.field.provider' | transloco }}</label>
          <select id="vis-provider" [(ngModel)]="s.form.visionProvider" [disabled]="s.isLocked('visionProvider')">
            <option value="local">{{ 'models.vision.optLocal' | transloco }}</option>
            <option value="external">{{ 'models.opt.externalOpenAi' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="vis-endpoint">{{ 'models.field.endpoint' | transloco }}</label>
          <input id="vis-endpoint" data-mono type="url" [(ngModel)]="s.form.vision!.baseUrl" [disabled]="s.isLocked('vision.baseUrl')" placeholder="http://ollama:11434" />
        </div>
        <div class="field">
          <label for="vis-model">{{ 'models.field.model' | transloco }}</label>
          <input id="vis-model" data-mono [(ngModel)]="s.form.vision!.model" [disabled]="s.isLocked('vision.model')" placeholder="moondream" />
        </div>
        <div class="field">
          <label for="vis-key">{{ 'models.field.apiKeyExternal' | transloco }}</label>
          <input id="vis-key" type="password" [(ngModel)]="s.visionApiKeyInput" [disabled]="s.isLocked('vision.apiKey')"
            [placeholder]="'models.field.apiKeyKeep' | transloco" />
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('vision')" [disabled]="s.testOf('vision')?.loading">
            {{ (s.testOf('vision')?.loading ? 'models.action.testing' : 'models.action.test') | transloco }}
          </button>
          @if (s.testOf('vision')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.reachable ? null : (r.detail || null)">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Speech-to-text ─────────────────────────────────────────────── -->
      <app-model-provider-card id="stt" icon="microphone"
        [heading]="'models.stt.title' | transloco"
        [purpose]="'models.stt.purpose' | transloco"
        [health]="pipeline.modelState('stt')">
        <app-status-pill pill [variant]="s.mediaClassOn('audio') ? 'active' : 'off'">
          {{ (s.form.sttProvider === 'external' ? 'models.pill.external' : 'models.stt.pillLocal') | transloco }}
        </app-status-pill>
        @if (s.isLocked('sttProvider')) { <app-status-pill pill variant="env">{{ 'models.pill.env' | transloco }}</app-status-pill> }

        <div class="field">
          <label for="stt-provider">{{ 'models.field.provider' | transloco }}</label>
          <select id="stt-provider" [(ngModel)]="s.form.sttProvider" [disabled]="s.isLocked('sttProvider')">
            <option value="local">{{ 'models.stt.optLocal' | transloco }}</option>
            <option value="external">{{ 'models.opt.externalOpenAi' | transloco }}</option>
          </select>
        </div>
        <div class="field">
          <label for="stt-endpoint">{{ 'models.field.endpoint' | transloco }}</label>
          <input id="stt-endpoint" data-mono type="url" [(ngModel)]="s.form.stt!.baseUrl" [disabled]="s.isLocked('stt.baseUrl')" placeholder="http://whisper:8000" />
        </div>
        <div class="field">
          <label for="stt-model">{{ 'models.field.model' | transloco }}</label>
          <input id="stt-model" data-mono [(ngModel)]="s.form.stt!.model" [disabled]="s.isLocked('stt.model')" placeholder="base" />
        </div>
        <div class="field">
          <label for="stt-key">{{ 'models.field.apiKeyExternal' | transloco }}</label>
          <input id="stt-key" type="password" [(ngModel)]="s.sttApiKeyInput" [disabled]="s.isLocked('stt.apiKey')"
            [placeholder]="'models.field.apiKeyKeep' | transloco" />
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('stt')" [disabled]="s.testOf('stt')?.loading">
            {{ (s.testOf('stt')?.loading ? 'models.action.testing' : 'models.action.test') | transloco }}
          </button>
          @if (s.testOf('stt')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.reachable ? null : (r.detail || null)">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
          }
        </div>
      </app-model-provider-card>

      <!-- ── External assist model ──────────────────────────────────────── -->
      <app-model-provider-card id="assist" icon="globe"
        [heading]="'models.assist.title' | transloco"
        [purpose]="'models.assist.purpose' | transloco"
        [health]="pipeline.modelState('assist')">
        <app-status-pill pill [variant]="s.assistLocked() ? 'env' : (s.assistInUse() ? 'active' : 'off')">
          {{ (s.assistLocked() ? 'models.pill.env' : (s.assistInUse() ? 'models.assist.pillInUse' : 'models.assist.pillUnset')) | transloco }}
        </app-status-pill>
        <!-- Moved out of the footer, where it was effectively invisible. -->
        @if (s.assist.acknowledgedHost && !s.assistNeedsAck()) {
          <app-status-pill pill variant="ok">{{ 'models.assist.pillAcknowledged' | transloco: { host: s.assist.acknowledgedHost } }}</app-status-pill>
        }

        <div class="field">
          <label for="assist-endpoint">{{ 'models.assist.endpointLabel' | transloco }}</label>
          <input id="assist-endpoint" data-mono type="url" [(ngModel)]="s.assist.baseUrl" [disabled]="s.assistLocked()" placeholder="https://api.example.com" />
        </div>
        <div class="field">
          <label for="assist-model">{{ 'models.field.model' | transloco }}</label>
          <input id="assist-model" data-mono [(ngModel)]="s.assist.model" [disabled]="s.assistLocked()"
            [placeholder]="'models.assist.modelPlaceholder' | transloco" />
        </div>
        <div class="field">
          <label for="assist-key">{{ 'models.field.apiKey' | transloco }}</label>
          <input id="assist-key" type="password" [(ngModel)]="s.assistApiKeyInput" [disabled]="s.assistLocked()"
            [placeholder]="(s.assist.apiKey ? 'models.field.apiKeyKeep' : 'models.field.apiKeyOptional') | transloco" />
        </div>
        <!-- No "used for" tick: the assist model exists to serve the repair pass, so the extraction rung
             is the switch. Configure the endpoint here, then raise Document extraction to repair (or auto)
             to actually route through it — at which point the egress acknowledgement is demanded. -->
        <div class="hint" style="margin-bottom:10px;">{{ 'models.assist.gatedByPipeline' | transloco }}</div>
        <div class="warnline">
          <ph-icon name="warning" [size]="15"/>
          <span>
            {{ 'models.assist.egressWarning' | transloco }}
            @if (s.assistNeedsAck()) { {{ 'models.assist.egressPending' | transloco: { host: s.assistHost() } }} }
          </span>
        </div>

        <div footer class="testrow">
          <button class="btn btn-sm btn-secondary" type="button" (click)="s.testConnection('assist')"
            [disabled]="s.testOf('assist')?.loading || !s.assist.baseUrl">
            {{ (s.testOf('assist')?.loading ? 'models.action.testing' : 'models.action.test') | transloco }}
          </button>
          @if (s.testOf('assist')?.res; as r) {
            <app-status-pill [variant]="s.testPillVariant(r)" [dot]="true">{{ s.testPillLabelKey(r) | transloco }}</app-status-pill>
            <span class="hint" [attr.title]="r.reachable ? null : (r.detail || null)">{{ r.reachable ? (r.latencyMs + ' ms') : (r.detail || '') }}</span>
          }
        </div>
      </app-model-provider-card>

      <!-- ── Page renderer (infra) ──────────────────────────────────────── -->
      <app-model-provider-card id="doc-render" icon="file-image"
        [heading]="'models.render.title' | transloco"
        [purpose]="'models.render.purpose' | transloco"
        [health]="pipeline.sidecarState('doc-render')"
        [infra]="true" envVar="RENDER_SIDECAR_URL">
        <div class="field">
          <label>{{ 'models.field.endpoint' | transloco }}</label>
          <div class="ro">{{ sidecarUrl('doc-render') }}</div>
        </div>
        @if (sidecarDetail('doc-render'); as d) {
          <div class="field"><label>{{ 'models.field.lastProbe' | transloco }}</label><div class="ro">{{ d }}</div></div>
        }
      </app-model-provider-card>

      <!-- ── Document converter (infra) ─────────────────────────────────── -->
      <app-model-provider-card id="unstructured" icon="file"
        [heading]="'models.converter.title' | transloco"
        [purpose]="'models.converter.purpose' | transloco"
        [health]="pipeline.sidecarState('unstructured')"
        [infra]="true" envVar="CONVERSION_SIDECAR_URL">
        <div class="field">
          <label>{{ 'models.field.endpoint' | transloco }}</label>
          <div class="ro">{{ sidecarUrl('unstructured') }}</div>
        </div>
        @if (sidecarDetail('unstructured'); as d) {
          <div class="field"><label>{{ 'models.field.lastProbe' | transloco }}</label><div class="ro">{{ d }}</div></div>
        }
      </app-model-provider-card>

      <!-- ── Face recognition ───────────────────────────────────────────── -->
      <!-- The one model in the pipeline an operator could not switch off: it was absent from the
           client entirely and from the PATCH schema, so opting out meant filesystem access. For a
           feature that detects and embeds people's faces that was the wrong default. -->
      <app-model-provider-card id="face" icon="user"
        [heading]="'models.face.title' | transloco"
        [purpose]="'models.face.purpose' | transloco"
        [health]="faceState()"
        [infra]="s.faceLocked('enabled')" envVar="FACE_RECOGNITION_ENABLED">
        <app-status-pill pill [variant]="s.face.enabled ? 'active' : 'off'">
          {{ (s.face.enabled ? 'models.face.pillOn' : 'models.face.pillOff') | transloco }}
        </app-status-pill>

        <!-- Not wrapped in .field: that rule styles a direct child label as a small-caps field
             caption, which turned the checkbox's own label into what looked like a section header
             floating above an unlabelled box. -->
        <!-- No enable switch: face recognition is turned on by raising the IMAGE pipeline to its
             recognition rung (instance ceiling here, then per space), so the ladder is the single
             control. faceRecognition.enabled still exists as an infra/env pin, deliberately not
             editable here. -->
        <div class="hint" style="margin-bottom:12px;">{{ 'models.face.gatedByPipeline' | transloco }}</div>

        <div class="grid2">
          <div class="field">
            <label for="face-conf">{{ 'models.face.confidence' | transloco }}</label>
            <input id="face-conf" type="number" min="0" max="1" step="0.05"
              [(ngModel)]="s.face.confidenceThreshold" [disabled]="s.faceLocked('confidenceThreshold') || s.managed" />
            <div class="hint">{{ 'models.face.confidenceHint' | transloco }}</div>
          </div>
          <div class="field">
            <label for="face-minsize">{{ 'models.face.minSize' | transloco }}</label>
            <input id="face-minsize" type="number" min="0" max="1" step="0.01"
              [(ngModel)]="s.face.minFaceSizeFraction" [disabled]="s.faceLocked('minFaceSizeFraction') || s.managed" />
            <div class="hint">{{ 'models.face.minSizeHint' | transloco }}</div>
          </div>
        </div>

        <div class="field">
          <label>{{ 'models.face.personTypes' | transloco }}</label>
          @if (s.face.personEntityTypes?.length) {
            <div class="ptype-chips">
              @for (t of s.face.personEntityTypes; track t) {
                <span class="ptype-chip">{{ t }}
                  @if (!(s.faceLocked('personEntityTypes') || s.managed)) {
                    <button type="button" class="ptype-rm" [attr.aria-label]="'common.remove' | transloco" (click)="removePersonType(t)"><ph-icon name="x" [size]="11"/></button>
                  }
                </span>
              }
            </div>
          }
          @if (!(s.faceLocked('personEntityTypes') || s.managed)) {
            @if (availablePersonTypes().length) {
              <select [ngModel]="''" (ngModelChange)="addPersonType($event)" [attr.aria-label]="'models.face.personTypesAdd' | transloco">
                <option value="" disabled>{{ 'models.face.personTypesAdd' | transloco }}</option>
                @for (t of availablePersonTypes(); track t) { <option [value]="t">{{ t }}</option> }
              </select>
            } @else if (!libEntityTypes().length) {
              <div class="hint">{{ 'models.face.personTypesEmpty' | transloco }}</div>
            }
          }
          <div class="hint">{{ 'models.face.personTypesHint' | transloco }}</div>
        </div>

        <div class="field" style="margin-bottom:0;">
          <label>{{ 'models.face.actorLabel' | transloco }}</label>
          <div class="ro">BlazeFace + FaceRes</div>
        </div>
      </app-model-provider-card>
    </div>
  `,
})
export class ModelsTabComponent implements OnInit {
  readonly s = inject(ModelsStateService);
  readonly pipeline = inject(PipelineStatusService);
  private schemaApi = inject(SchemaApi);

  /** Face recognition runs in-process, so its only health is enabled/disabled. */
  faceState = computed(() => this.pipeline.status()?.faceRecognition.state ?? null);

  /** Entity type names defined in the Schema Library — the source for the person-types picker. */
  readonly libEntityTypes = signal<string[]>([]);

  ngOnInit(): void {
    // Load the library once so the person-types picker can offer known entity types by name.
    this.schemaApi.listSchemaLibrary().subscribe({
      next: ({ entries }) => this.libEntityTypes.set(
        [...new Set(entries.filter(e => e.knowledgeType === 'entity').map(e => e.typeName))].sort(),
      ),
      error: () => this.libEntityTypes.set([]),
    });
  }

  /**
   * Person entity types govern the face gallery: only entities of these types are ever auto-labelled.
   * They are picked from the Schema Library's entity types (below), but any value already stored — e.g.
   * from before this was library-backed, or a type since removed from the library — stays selectable
   * and removable so nothing silently drops.
   */
  private personTypes(): string[] { return this.s.face.personEntityTypes ?? []; }

  /**
   * Library entity types not already selected — the options the "add" dropdown offers. Deliberately a
   * method, not a computed: `s.face.personEntityTypes` is a plain field (not a signal), so a computed
   * would never re-run when the selection changes; a method re-evaluates every change-detection pass.
   */
  availablePersonTypes(): string[] {
    const selected = new Set(this.s.face.personEntityTypes ?? []);
    return this.libEntityTypes().filter(t => !selected.has(t));
  }

  addPersonType(type: string): void {
    const t = type.trim();
    if (!t || this.personTypes().includes(t)) return;
    this.s.face.personEntityTypes = [...this.personTypes(), t];
    this.s.touched.set(true);   // programmatic change — the page's input listener won't see it
  }

  removePersonType(type: string): void {
    this.s.face.personEntityTypes = this.personTypes().filter(t => t !== type);
    this.s.touched.set(true);
  }

  sidecarUrl(key: string): string { return this.pipeline.bySidecarKey().get(key)?.url ?? '—'; }
  sidecarDetail(key: string): string | null { return this.pipeline.bySidecarKey().get(key)?.detail ?? null; }


  /** Narrows the string union for `testConnection` call sites in the template. */
  target(t: TestTarget): TestTarget { return t; }
}
