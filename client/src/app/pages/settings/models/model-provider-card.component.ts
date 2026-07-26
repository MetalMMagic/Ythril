/**
 * The ONE provider-card shape, used seven times on the Models tab.
 *
 * The owner's complaint about this page — "very wild, no logic structure or consistent layout" — was
 * mostly this component not existing. Four provider cards written inline in one 656-line file each
 * invented their own field order, their own way of showing "env-locked", and their own footer. Seven
 * call sites of one component is what stops that happening again.
 *
 * The approved layout, and the reason for each rule:
 *
 *   - **Uniform height and width.** The grid stretches, the body flexes, the footer is pinned — so
 *     every "Test connection" sits on one baseline instead of wherever its card's last row happened
 *     to end. Ragged heights were never the goal; consistent shape was.
 *   - **Rows that do not apply are omitted, not dashed** (owner's option B). A dash row is noise
 *     claiming to be information.
 *   - **Pills sit on their own row under the title**, including "Egress acknowledged" — which used to
 *     hide in the footer, the one place nobody reads.
 *   - **Infra-set cards are dashed and dimmed and name the env var that owns them.** No "change this
 *     in the environment" footer sentence: the pill already says it, and saying it twice is how the
 *     old card ran out of vertical room.
 *   - **A stable `id`** (`embedding`, `vision`, `stt`, `assist`, `doc-render`, `unstructured`,
 *     `face`) so a pipeline step can deep-link to it.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../../shared/ph-icon.component';
import { HealthDotComponent } from './health-dot.component';
import { HealthState } from './models.types';

@Component({
  selector: 'app-model-provider-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, HealthDotComponent],
  styles: [`
    /* Stretch to the grid row's height so the pinned footer actually lands on a shared baseline. */
    :host { display: flex; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;
      display: flex; flex-direction: column; width: 100%; overflow: hidden; }
    /* Infra-owned: dashed and dimmed, so "you cannot change this here" is legible before reading. */
    .card.infra { border-style: dashed; background: transparent; }
    .card.infra .card-b { opacity: .62; }

    .card-h { display: flex; align-items: flex-start; gap: 12px; padding: 15px 18px 0; }
    .ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;
      background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .card.infra .ic { color: var(--text-muted); }
    .t { flex: 1; min-width: 0; }
    .t h3 { margin: 0; font-size: 15px; font-weight: 620; display: flex; align-items: center; gap: 8px; }
    .t p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-secondary); }

    /* Pills on their own row under the title, at the size the owner specified. */
    .pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 9px 18px 0; }
    .pills ::ng-deep .pill, .pills ::ng-deep app-status-pill { font-size: 9.5px; }

    .card-b { flex: 1; padding: 14px 18px 4px; }
    .card-f { padding: 12px 18px 16px; margin-top: auto; }
    .card-f:empty { display: none; }

    /* Brief highlight when the operator arrives here by clicking the model in the Pipelines viz, so the
       card they landed on is obvious after the scroll. */
    .card.flash { animation: cardFlash 1.4s ease-out; }
    @keyframes cardFlash {
      0%   { box-shadow: 0 0 0 2px var(--accent); }
      70%  { box-shadow: 0 0 0 2px var(--accent); }
      100% { box-shadow: 0 0 0 2px transparent; }
    }
    @media (prefers-reduced-motion: reduce) { .card.flash { animation: none; } }
  `],
  template: `
    <section class="card" [class.infra]="infra()" [attr.id]="'model-card-' + id()">
      <header class="card-h">
        <span class="ic"><ph-icon [name]="icon()" [size]="18"/></span>
        <div class="t">
          <h3>
            {{ heading() }}
            @if (health() !== undefined) {
              <!-- The nullish fallback only satisfies the compiler; the guard above rules out undefined. -->
              <app-health-dot [state]="health() ?? null" [subject]="heading()"/>
            }
          </h3>
          @if (purpose()) { <p>{{ purpose() }}</p> }
        </div>
      </header>

      <div class="pills">
        <ng-content select="[pill]"/>
        @if (infra()) {
          <!-- Names the variable that owns the value. Without it "managed by infra" tells an operator
               they cannot change it here but not where they can. -->
          <span class="pill env" [attr.title]="'models.card.infraTitle' | transloco">
            {{ 'models.card.infraPill' | transloco: { envVar: envVar() } }}
          </span>
        }
      </div>

      <div class="card-b"><ng-content/></div>
      <div class="card-f"><ng-content select="[footer]"/></div>
    </section>
  `,
})
export class ModelProviderCardComponent {
  /** Stable, and part of the DOM id — a pipeline step deep-links to `#model-card-<id>`. */
  id = input.required<string>();
  icon = input<string>('cube');
  heading = input.required<string>();
  purpose = input<string>('');
  /** undefined = this card has no health to report (as opposed to `null`, meaning "not known yet"). */
  health = input<HealthState | null | undefined>(undefined);
  /** True when the value is owned by infrastructure and cannot be set here. */
  infra = input<boolean>(false);
  /** The env var that owns it, named on the pill. Only meaningful when `infra` is true. */
  envVar = input<string>('');
}
