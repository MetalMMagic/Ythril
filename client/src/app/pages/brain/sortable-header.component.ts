import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';

/**
 * A sortable `<th>` for the Brain list tables (slice 2b-i). Applied as an attribute on the header
 * cell — `<th app-sort-th field="name" label="brain.entities.table.name" …>` — so the table markup
 * stays valid `<thead><tr><th>`.
 *
 * The whole cell is the sort control: clicking it emits `sort(field)`, which the tab base cycles
 * (unsorted → desc → asc → default). A dimmed caret marks a sortable-but-inactive column; the active
 * column shows a full-strength up/down caret matching the current direction. `aria-sort` on the host
 * reflects the state for assistive tech.
 *
 * Only columns backed by a server-whitelisted field (slice 2a) get one of these; the rest stay plain
 * `<th>`, so a click can never ask the server to sort by a field it will 400 on.
 */
@Component({
  selector: 'th[app-sort-th]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent],
  host: {
    '[attr.aria-sort]': 'ariaSort()',
    'class': 'sort-th',
  },
  styles: [`
    .sort-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
    }
    .sort-btn:hover { color: var(--text-primary); }
    .sort-caret { display: inline-flex; opacity: 0.3; transition: opacity 0.1s; }
    .sort-btn:hover .sort-caret { opacity: 0.6; }
    .sort-caret.active { opacity: 1; color: var(--accent); }
  `],
  template: `
    <button type="button" class="sort-btn"
      (click)="sort.emit(field())"
      [attr.aria-label]="(label() | transloco)">
      {{ label() | transloco }}
      <span class="sort-caret" [class.active]="active()">
        <ph-icon [name]="active() && dir() === 'asc' ? 'caret-up' : 'caret-down'" [size]="12" />
      </span>
    </button>
  `,
})
export class SortableHeaderComponent {
  /** Server sort field this column maps to (must be whitelisted for the collection). */
  readonly field = input.required<string>();
  /** i18n key for the column label. */
  readonly label = input.required<string>();
  /** The currently-sorted field across the table (`''` when nothing is sorted). */
  readonly activeField = input<string>('');
  /** Direction of the active sort. */
  readonly dir = input<'asc' | 'desc'>('desc');

  readonly sort = output<string>();

  protected readonly active = computed(() => this.activeField() === this.field());
  protected readonly ariaSort = computed(() =>
    this.active() ? (this.dir() === 'asc' ? 'ascending' : 'descending') : 'none');
}
