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
 * On the Brain tabs, only columns backed by a server-whitelisted field (slice 2a) pass a `field`, so a
 * header can never ask the server to sort by a field it will 400 on.
 *
 * **That is a rule about those callers, not about this component.** The Tokens table reuses this header and
 * sorts in the BROWSER: `listTokens()` returns every token in one response and there is no paged token
 * endpoint, so there is no server to ask and no field to whitelist. This primitive was already agnostic — it
 * emits a field name and draws a caret — and the sentence above was written when Brain was the only caller.
 * Said unqualified it reads as a constraint on what a `field` may be, which is exactly the kind of stale
 * sentence in an authoritative place that gets designed around: whoever needs a client-side sort next would
 * conclude they cannot use this and write a second header.
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
    /*
     * Top, not middle. A cell with a filter docked under its label is taller than one without, and the default
     * middle alignment then centres the shorter cells against it — so the labels in one header row sit at two
     * different heights and the row reads as broken. Photographed on Settings → Tokens, where only two of
     * seven columns carry a filter, which is the mix that makes it obvious.
     */
    :host { vertical-align: top; }
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
      /*
       * text-transform and letter-spacing are NOT part of the font shorthand, and a button does not inherit
       * them from its th the way a span would. So the label inside this button rendered in mixed case while
       * every other table header in the app is uppercase — including the rights matrix directly above the
       * Tokens table, which is where it became impossible to read as anything but a bug.
       *
       * Inherited rather than hardcoded, so this follows whatever the global th rule says.
       */
      text-transform: inherit;
      letter-spacing: inherit;
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
