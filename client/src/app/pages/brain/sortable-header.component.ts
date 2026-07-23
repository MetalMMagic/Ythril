import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';

/**
 * A Brain list-table column header, applied as an attribute on the `<th>` —
 * `<th app-sort-th field="name" label="brain.entities.table.name" …>` — so the table markup stays
 * valid `<thead><tr><th>`.
 *
 * It carries two optional affordances, either or both:
 *
 * - **Sort** (slice 2b-i): when `field` is set, the label becomes a click target that emits
 *   `sort(field)` and shows a caret + `aria-sort`. Omit `field` for a non-sortable column — the label
 *   renders as plain text with no caret.
 * - **Filter** (slice 2b-ii): anything projected into the component docks in a row UNDER the label,
 *   so a column's filter control sits directly beneath its heading (the owner's docked-row layout).
 *   The tab supplies the control (a type `<select>`, a tag `<input>`, …); this primitive only places
 *   it. Sort and filter are independent: clicking the label sorts, using the control below filters.
 *
 * Only columns backed by a server-whitelisted field (slice 2a) pass a `field`, so a header can never
 * ask the server to sort by a field it will 400 on.
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
    .col-stack { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
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
    .col-label { font: inherit; white-space: nowrap; }
    /* The docked filter row: normal-weight, so it reads as a control, not part of the heading. */
    .col-filter { font-weight: 400; text-transform: none; letter-spacing: normal; width: 100%; }
    .col-filter:empty { display: none; }
  `],
  template: `
    <div class="col-stack">
      @if (field()) {
        <button type="button" class="sort-btn"
          (click)="sort.emit(field())"
          [attr.aria-label]="(label() | transloco)">
          {{ label() | transloco }}
          <span class="sort-caret" [class.active]="active()">
            <ph-icon [name]="active() && dir() === 'asc' ? 'caret-up' : 'caret-down'" [size]="12" />
          </span>
        </button>
      } @else {
        <span class="col-label">{{ label() | transloco }}</span>
      }
      <div class="col-filter"><ng-content /></div>
    </div>
  `,
})
export class SortableHeaderComponent {
  /** Server sort field this column maps to. Omit for a non-sortable column (label only, no caret). */
  readonly field = input<string>('');
  /** i18n key for the column label. */
  readonly label = input.required<string>();
  /** The currently-sorted field across the table (`''` when nothing is sorted). */
  readonly activeField = input<string>('');
  /** Direction of the active sort. */
  readonly dir = input<'asc' | 'desc'>('desc');

  readonly sort = output<string>();

  protected readonly active = computed(() => !!this.field() && this.activeField() === this.field());
  protected readonly ariaSort = computed(() =>
    this.active() ? (this.dir() === 'asc' ? 'ascending' : 'descending') : 'none');
}
