/**
 * SettingsCard — the standard grouping primitive for settings screens (design system, PR-U1).
 *
 * Replaces ad-hoc `.section` blocks / raw label-value grids / inline-styled `div`s with one card:
 * header (icon + title + one-line purpose + a status-pill slot) over a body. Keeps every settings
 * page visually consistent and scannable.
 *
 * Usage:
 *   <app-settings-card icon="image" heading="Vision" purpose="Captions uploaded images.">
 *     <app-status-pill pill variant="active">Local · Ollama</app-status-pill>
 *     ...body...
 *   </app-settings-card>
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PhIconComponent } from './ph-icon.component';

@Component({
  selector: 'app-settings-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhIconComponent],
  styles: [`
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .card-h { display: flex; align-items: center; gap: 12px; padding: 15px 18px; }
    .ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none;
          background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent); }
    .t { flex: 1; min-width: 0; }
    .t h3 { margin: 0; font-size: 15px; font-weight: 620; }
    .t p  { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); }
    .pillslot { display: flex; align-items: center; gap: 8px; }
    .card-b { padding: 4px 18px 18px; border-top: 1px solid var(--border-muted); }
  `],
  template: `
    <section class="card">
      <header class="card-h">
        @if (icon()) { <span class="ic"><ph-icon [name]="icon()" [size]="18"/></span> }
        <div class="t">
          <h3>{{ heading() }}</h3>
          @if (purpose()) { <p>{{ purpose() }}</p> }
        </div>
        <div class="pillslot"><ng-content select="[pill]"/></div>
      </header>
      <div class="card-b"><ng-content/></div>
    </section>
  `,
})
export class SettingsCardComponent {
  /** Optional leading ph-icon name. */
  icon = input<string>('');
  heading = input.required<string>();
  purpose = input<string>('');
}
