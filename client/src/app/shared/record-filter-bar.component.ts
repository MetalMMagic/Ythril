import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

/** The filter a record list is narrowed by (F6). Empty strings mean "no filter". */
export interface RecordFilter {
  type: string;
  tag: string;
}

/**
 * Shared filter bar for the Brain list tabs (F6) — a type/schema dropdown and a
 * tag box, reused on the memories / entities / edges / chrono tabs. It carries no
 * per-collection knowledge: the caller supplies the type options and tag
 * suggestions, and the bar emits `{ type, tag }` whenever either changes so the
 * tab can reload its list server-side.
 *
 * It complements (does not replace) each tab's existing text/name/semantic search.
 */
@Component({
  selector: 'app-record-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe],
  styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-bar select, .filter-bar input {
      height: 30px;
      font-size: 13px;
    }
    .filter-bar select { min-width: 130px; }
    .filter-bar input { min-width: 140px; }
    .filter-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .filter-clear {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 12px;
      padding: 2px 4px;
      font-family: var(--font);
    }
    .filter-clear:hover { text-decoration: underline; }
  `],
  template: `
    <div class="filter-bar" role="group" [attr.aria-label]="'brain.filter.aria' | transloco">
      <span class="filter-label">{{ 'brain.filter.label' | transloco }}</span>

      <select
        [ngModel]="type()"
        (ngModelChange)="setType($event)"
        [attr.aria-label]="typeLabel() | transloco"
      >
        <option value="">{{ typeAllLabel() | transloco }}</option>
        @for (t of typeOptions(); track t) {
          <option [value]="t">{{ t }}</option>
        }
      </select>

      <input
        type="text"
        [ngModel]="tag()"
        (ngModelChange)="setTag($event)"
        [placeholder]="'brain.filter.tagPlaceholder' | transloco"
        [attr.aria-label]="'brain.filter.tagPlaceholder' | transloco"
        [attr.list]="tagSuggestions().length ? listId : null"
      />
      @if (tagSuggestions().length) {
        <datalist [id]="listId">
          @for (s of tagSuggestions(); track s) { <option [value]="s"></option> }
        </datalist>
      }

      @if (active()) {
        <button type="button" class="filter-clear" (click)="clear()">{{ 'common.clearAll' | transloco }}</button>
      }
    </div>
  `,
})
export class RecordFilterBarComponent {
  /** Type/schema names to offer in the dropdown (already resolved by the caller). */
  readonly typeOptions = input<string[]>([]);
  /** Tag autocomplete suggestions. */
  readonly tagSuggestions = input<string[]>([]);
  /** i18n key for the type dropdown's aria/name (e.g. 'common.form.type' or 'common.form.kind'). */
  readonly typeLabel = input<string>('common.form.type');
  /** i18n key for the "all types" option (e.g. 'brain.filter.allTypes' / 'brain.filter.allKinds'). */
  readonly typeAllLabel = input<string>('brain.filter.allTypes');
  /** Controlled value — lets the host reflect an external change (e.g. clicking a
   *  tag in the table) into the bar. Applied without re-emitting. */
  readonly value = input<RecordFilter | null>(null);

  /** Emits whenever the filter changes (including on Clear). */
  readonly filterChange = output<RecordFilter>();

  protected readonly type = signal('');
  protected readonly tag = signal('');
  protected readonly active = computed(() => this.type() !== '' || this.tag().trim() !== '');

  constructor() {
    // Reflect an externally-set value into the controls. Does NOT emit, so a host
    // that pushes `value` in response to `filterChange` cannot cause a loop.
    effect(() => {
      const v = this.value();
      if (v) {
        this.type.set(v.type);
        this.tag.set(v.tag);
      }
    });
  }

  /** Unique datalist id so multiple bars on a page don't collide. */
  protected readonly listId = `rfb-tags-${RecordFilterBarComponent._seq++}`;
  private static _seq = 0;

  setType(v: string): void { this.type.set(v); this.emit(); }
  setTag(v: string): void { this.tag.set(v); this.emit(); }

  clear(): void {
    this.type.set('');
    this.tag.set('');
    this.emit();
  }

  /** Reset without emitting — used by the host when switching space/tab. */
  reset(): void {
    this.type.set('');
    this.tag.set('');
  }

  private emit(): void {
    this.filterChange.emit({ type: this.type(), tag: this.tag().trim() });
  }
}
