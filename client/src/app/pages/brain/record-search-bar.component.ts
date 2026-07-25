import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The record tabs' search bar — a single styled search input.
 *
 * Unifies the four near-identical inline bars (A17.9c). Originally it also carried an A–Z / Semantic
 * mode pill, but slice 2b-iii docked plain-text (A–Z) search into the column headers as a server-side
 * freetext filter, which made the pill's A–Z half redundant. The pill was removed (2b-iii-c): the top
 * bar is now a single-purpose box. Memories/edges/chrono use it for SEMANTIC recall (the parent's
 * `onXSearch` issues a `recallBrain`); file-meta uses it for its client-side path/description/tag
 * filter. The component itself is agnostic — it is a DUMB presentational input: the parent owns the
 * state and passes `value` in, receiving `valueChange` out.
 *
 * NOT here: the entities tab's search, which uses `<app-entity-search>` (entity autocomplete — a
 * richer interaction, intentionally separate), and the semantic-search LOGIC (`onXSearch`/
 * `runSemanticXSearch`), which stays in the tabs because its recall-result mapping is per-collection.
 *
 * `:host { display: contents }` so the input remains a direct flex child of the parent's
 * `.content-header`, preserving the original layout exactly.
 */
@Component({
  selector: 'app-record-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
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
  `],
  template: `
    <input type="search"
      [value]="value()"
      (input)="valueChange.emit($any($event.target).value)"
      [placeholder]="placeholder() | transloco"
      [attr.aria-label]="(ariaLabel() ?? placeholder()) | transloco" />
  `,
})
export class RecordSearchBarComponent {
  readonly value = input.required<string>();
  readonly placeholder = input.required<string>();
  /** Optional distinct aria-label i18n key; falls back to `placeholder` when unset. */
  readonly ariaLabel = input<string | null>(null);

  readonly valueChange = output<string>();
}
