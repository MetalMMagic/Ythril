import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertySchema } from '../core/api.types';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-properties-view',
  standalone: true,
  // OnPush (P5): display-only. Re-renders when its @Input (`properties`/`schema`) reference
  // changes or its local `mode` signal toggles — both of which OnPush checks. Rendered once per
  // row in entity/memory tables, so it is squarely in the large-table CD hot path.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoPipe],
  styles: [`
    .props-none { color: var(--text-muted); font-size: 12px; }
    .props-wrap { font-size: 11px; }
    .props-toggle {
      display: flex;
      gap: 3px;
      margin-bottom: 5px;
    }
    .props-toggle button {
      font-size: 10px;
      padding: 1px 7px;
      border-radius: 3px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1.7;
    }
    .props-toggle button.active {
      background: var(--accent-dim);
      border-color: var(--accent);
      color: var(--accent);
    }
    .props-toggle button:hover:not(.active) {
      border-color: var(--text-muted);
      color: var(--text-primary);
    }
    .props-table { border-collapse: collapse; width: 100%; }
    .props-table tr:not(:last-child) td { padding-bottom: 2px; }
    .props-key {
      color: var(--text-muted);
      font-weight: 500;
      white-space: nowrap;
      padding-right: 10px;
      vertical-align: top;
      font-size: 11px;
      /* The key is nowrap, so in a squeezed column it claims its full width and leaves the value with
         whatever is left — which was ~10px, enough for one character. Cap it so the two share. */
      max-width: 45%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .props-val {
      color: var(--text-primary);
      /* overflow-wrap:anywhere, NOT word-break:break-all.
         Both break long unbroken tokens (a URL, a hash, an id), which is why the rule exists. The
         difference is what they do to the element's MIN-CONTENT width: break-all makes it one character
         wide, so a table column containing this cell can be squeezed to nothing — and it was. In a
         narrow window the Entities table collapsed every column to ~118px and rendered the property
         value "Germany" one letter per line, at which point each row was 274px tall, the table was
         3388px tall, and the horizontal scrollbar it needed sat 2800px below the fold.
         anywhere breaks only when a word genuinely does not fit, so min-content stays the width of the
         longest word and the column keeps a sane floor. */
      overflow-wrap: anywhere;
      font-size: 11px;
      vertical-align: top;
      /* A floor, so the value column cannot be reduced to a single character of vertical text. */
      min-width: 5em;
    }
    .props-pre {
      font-family: var(--font-mono, 'Consolas', 'Monaco', monospace);
      font-size: 10px;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text-primary);
      background: var(--bg-secondary);
      border-radius: var(--radius-sm, 4px);
      padding: 4px 6px;
      margin: 0;
      max-height: 140px;
      overflow-y: auto;
    }
  `],
  template: `
    @if (isEmpty()) {
      <span class="props-none">—</span>
    } @else {
      <div class="props-wrap">
        <div class="props-toggle">
          <button [class.active]="mode() === 'table'" [attr.aria-pressed]="mode() === 'table'" (click)="mode.set('table')">{{ 'propertiesView.tableButton' | transloco }}</button>
          <button [class.active]="mode() === 'json'" [attr.aria-pressed]="mode() === 'json'" (click)="mode.set('json')">{{ 'propertiesView.jsonButton' | transloco }}</button>
        </div>
        @if (mode() === 'table') {
          <table class="props-table">
            @for (kv of entries(); track kv.key) {
              <tr>
                <td class="props-key">{{ kv.key }}</td>
                <td class="props-val">{{ formatValue(kv.key, kv.value) }}</td>
              </tr>
            }
          </table>
        } @else {
          <pre class="props-pre">{{ jsonStr() }}</pre>
        }
      </div>
    }
  `
})
export class PropertiesViewComponent {
  @Input() properties: Record<string, unknown> | null | undefined;
  @Input() schema?: Record<string, PropertySchema>;

  mode = signal<'table' | 'json'>('table');

  isEmpty(): boolean {
    return !this.properties || Object.keys(this.properties).length === 0;
  }

  entries(): Array<{ key: string; value: unknown }> {
    if (!this.properties) return [];
    return Object.entries(this.properties).map(([key, value]) => ({ key, value }));
  }

  formatValue(key: string, val: unknown): string {
    if (this.schema?.[key]?.type === 'date' && typeof val === 'string' && val) {
      const d = new Date(val.length === 10 ? val + 'T12:00:00Z' : val);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${d.getFullYear()}`;
      }
    }
    return String(val ?? '');
  }

  jsonStr(): string {
    return JSON.stringify(this.properties, null, 2);
  }
}
