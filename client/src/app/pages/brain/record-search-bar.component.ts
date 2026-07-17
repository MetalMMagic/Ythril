import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';

/**
 * The record tabs' search bar — a text input plus an optional A–Z / Semantic mode pill.
 *
 * Unifies four near-identical inline bars (A17.9c): memories/edges/chrono had byte-identical markup
 * (input + pill) and file-meta a plain input (no pill). It is a DUMB presentational component — the
 * parent owns the state (in `BrainStore`) and passes `value`/`mode` in, receiving `valueChange`/
 * `modeChange` out. Omit `mode` (leave it null) to hide the pill — that is how file-meta reuses it for
 * its client-side filter.
 *
 * NOT here: the entities tab's search, which uses `<app-entity-search>` (entity autocomplete — a richer
 * interaction, intentionally separate), and the semantic-search LOGIC (`onXSearch`/`runSemanticXSearch`),
 * which stays in the tabs because its recall-result mapping is per-collection.
 *
 * `:host { display: contents }` so the input and pill remain direct flex children of the parent's
 * `.content-header`, preserving the original layout exactly.
 */
@Component({
  selector: 'app-record-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent],
  styles: [`
    :host { display: contents; }
    input[type=search] {
      flex: 1;
      min-width: 180px;
      max-width: 400px;
      padding: 5px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-primary);
    }
    .pill-group { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; }
    .pill-group button { padding: 5px 10px; font-size: 11px; background: transparent; border: none; border-right: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
    .pill-group button:last-child { border-right: none; }
    .pill-group button.active { background: var(--accent-dim); color: var(--accent); }
    .pill-group button:hover:not(.active) { background: var(--bg-surface); }
  `],
  template: `
    <input type="search"
      [value]="value()"
      (input)="valueChange.emit($any($event.target).value)"
      [placeholder]="placeholder() | transloco"
      [attr.aria-label]="(ariaLabel() ?? placeholder()) | transloco" />
    @if (mode(); as m) {
      <div class="pill-group" [attr.title]="'common.searchMode.tooltip' | transloco">
        <button [class.active]="m === 'text'" (click)="modeChange.emit('text')">{{ 'common.sortAZ' | transloco }}</button>
        <button [class.active]="m === 'semantic'" (click)="modeChange.emit('semantic')"><ph-icon name="star-four" [size]="14" style="display:inline-flex;vertical-align:middle;margin-right:3px;"/> {{ 'common.semantic' | transloco }}</button>
      </div>
    }
  `,
})
export class RecordSearchBarComponent {
  readonly value = input.required<string>();
  readonly placeholder = input.required<string>();
  /** Optional distinct aria-label i18n key; falls back to `placeholder` when unset. */
  readonly ariaLabel = input<string | null>(null);
  /** null/absent hides the pill (e.g. file-meta's client-side filter). */
  readonly mode = input<'text' | 'semantic' | null>(null);

  readonly valueChange = output<string>();
  readonly modeChange = output<'text' | 'semantic'>();
}
