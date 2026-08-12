import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RungPickerComponent } from './rung-picker.component';
import { RIGHT_AREAS, type Rung, type TokenRights, type WireRungs } from './rights-glyph.component';
import { RightsCatalogService } from './rights-catalog.service';

const EMPTY = (): WireRungs => ({ knowledge: 'none', files: 'none', schema: 'none', dataQuality: 'none' });

/**
 * The rights matrix: an all-spaces FLOOR on top, then one row per space.
 *
 * ## The floor is a minimum, not a bulk button
 *
 * Whatever it says, every space below is at least that — and so is every space created after this token was
 * minted. That is the whole reason the separate `spaces` allowlist could be dropped: a token reaches a
 * future space only if somebody said so here, deliberately, in advance.
 *
 * Rungs under the floor are therefore clamped in each cell rather than removed, so the reason a cell will
 * not go lower is visible where the click happens rather than inferred from a row above.
 *
 * ## Emits a whole matrix, never a patch
 *
 * The parent holds a draft and saves it as one thing. Emitting per-cell deltas would mean the parent
 * reassembles the object, which is a second place the shape is known — and the shape is what the server
 * caps and audits.
 */
@Component({
  selector: 'app-rights-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RungPickerComponent, TranslocoPipe],
  styles: [`
    :host { display: block; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border-bottom: 1px solid var(--border-muted); padding: 8px 10px; text-align: center; }
    th.l, td.l { text-align: left; white-space: nowrap; font-weight: 600; }
    thead th { background: var(--bg-elevated); font-size: 11.5px; color: var(--text-secondary); font-weight: 620; }
    tr.floor td { background: color-mix(in srgb, var(--accent) 6%, transparent); }
    tr.floor { border-bottom: 2px solid var(--accent); }
    tr.floor td.l { color: var(--accent); }
    td.l small { display: block; font-weight: 400; font-size: 11px; color: var(--text-muted); }
    .area-info {
      margin-left: 5px; width: 15px; height: 15px; padding: 0; line-height: 1;
      border: 1px solid var(--border); border-radius: 50%;
      background: var(--bg-surface); color: var(--text-muted);
      font-size: 10px; font-weight: 700; cursor: pointer; vertical-align: middle;
    }
    .area-info:hover { border-color: var(--accent); color: var(--accent); }
    .area-info[aria-expanded="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
    .explain {
      margin: 10px 0 2px; padding: 10px 12px; text-align: left;
      border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated);
    }
    .explain h4 { margin: 0 0 4px; font-size: 12.5px; }
    .explain p { margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); }
    .explain .rungs { margin: 0 0 8px; padding: 0; list-style: none; font-size: 12px; }
    .explain .rungs li { margin: 2px 0; color: var(--text-secondary); }
    .explain .rungs code { font-weight: 650; color: var(--text-primary); }
    .explain table { font-size: 11.5px; font-family: var(--font-mono, monospace); }
    .explain table th, .explain table td { padding: 3px 8px; text-align: left; border-bottom: none; }
    .explain .meth { color: var(--accent); font-weight: 650; }
    .explain .needs { color: var(--text-muted); }
    .explain .scroll { max-height: 240px; overflow-y: auto; }
    .explain .miss { font-size: 12px; color: var(--text-muted); }
  `],
  template: `
    <table>
      <thead>
        <tr>
          <th class="l">{{ 'tokens.rights.space' | transloco }}</th>
          @for (a of areas; track a) {
            <th>
              {{ 'tokens.rights.area.' + a | transloco }}
              <!-- The non-technical half rides on the header as a title, so it needs no click. The technical
                   half is a click, because a 37-route list is not a tooltip. -->
              <button class="area-info" type="button"
                      [attr.title]="'tokens.rights.area.' + a + '.desc' | transloco"
                      [attr.aria-label]="'tokens.rights.explain' | transloco"
                      [attr.aria-expanded]="explaining() === a"
                      (click)="toggleExplain(a)">?</button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        <tr class="floor">
          <td class="l">{{ 'tokens.rights.allSpaces' | transloco }}<small>{{ 'tokens.rights.allSpacesHint' | transloco }}</small></td>
          @for (a of areas; track a) {
            <td>
              <app-rung-picker [value]="floorOf(a)" [readonlyView]="readonlyView()" (changed)="setFloor(a, $event)"/>
            </td>
          }
        </tr>
        @for (s of spaces(); track s) {
          <tr>
            <td class="l">{{ s }}</td>
            @for (a of areas; track a) {
              <td>
                <app-rung-picker [value]="cellOf(s, a)" [floor]="floorOf(a)" [readonlyView]="readonlyView()" (changed)="setCell(s, a, $event)"/>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>

    <!-- One panel, under the table, rather than a popover per column: the endpoint list for knowledge is 37
         rows, and a floating layer that long is unreadable inside a dialog that already scrolls.
         NOTE no backticks anywhere in this template, comments included — one ends the template string and the
         error points at @Component, never at the line that caused it. -->
    @if (explaining(); as a) {
      <div class="explain">
        <h4>{{ 'tokens.rights.area.' + a | transloco }}</h4>
        <p>{{ 'tokens.rights.area.' + a + '.desc' | transloco }}</p>

        <!-- The rung meanings are stated once, not once per area: a rung means the same thing everywhere,
             because each contains the one below. Four sentences instead of sixteen that can disagree. -->
        <ul class="rungs">
          @for (r of rungs; track r) {
            <li><code>{{ r }}</code> — {{ 'tokens.rights.rung.' + r + '.desc' | transloco }}</li>
          }
        </ul>

        @if (catalog.catalog()) {
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>{{ 'tokens.rights.endpoint' | transloco }}</th>
                  <th>{{ 'tokens.rights.fromRung' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of catalog.routesFor(a, 'admin'); track r.method + r.route) {
                  <tr>
                    <td><span class="meth">{{ r.method }}</span> {{ r.route }}</td>
                    <td class="needs">{{ r.needs }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (catalog.failed()) {
          <!-- The grid must not depend on its own explanation loading. -->
          <p class="miss">{{ 'tokens.rights.endpointsUnavailable' | transloco }}</p>
        }
      </div>
    }
  `,
})
export class RightsMatrixComponent implements OnInit {
  rights = input.required<TokenRights>();
  spaces = input.required<string[]>();
  changed = output<TokenRights>();
  /** Display only — passed through to every cell. Used by the read-only view of your own rights. */
  readonlyView = input(false);

  readonly areas = RIGHT_AREAS;
  /** Every rung EXCEPT `none`, which needs no explanation beyond the word. */
  readonly rungs: Rung[] = ['read', 'write', 'admin'];

  readonly catalog = inject(RightsCatalogService);

  /** Which area's explanation is open, or null. One at a time — two open panels stack the table off-screen. */
  readonly explaining = signal<string | null>(null);

  ngOnInit(): void {
    // Asked for here rather than in the parent: any grid that renders is a grid someone may want explained,
    // and the service call is idempotent, so a second grid on the page costs nothing.
    this.catalog.load();
  }

  toggleExplain(area: string): void {
    this.explaining.update(cur => (cur === area ? null : area));
  }

  floorOf = (area: string): Rung => this.rights().floor?.[area] ?? 'none';

  /**
   * A cell shows the higher of its own row and the floor.
   *
   * Showing the stored row alone would display `none` for a space the token can in fact reach through the
   * floor — the cell would say one thing and the enforcement do another, in the direction that under-states
   * access. That is the direction that matters most on a screen somebody is auditing.
   */
  cellOf = (space: string, area: string): Rung => {
    const row = this.rights().perSpace[space]?.[area] ?? 'none';
    const floor = this.floorOf(area);
    return rank(row) > rank(floor) ? row : floor;
  };

  setFloor(area: string, rung: Rung): void {
    const r = this.rights();
    this.changed.emit({ ...r, floor: { ...(r.floor ?? EMPTY()), [area]: rung } });
  }

  setCell(space: string, area: string, rung: Rung): void {
    const r = this.rights();
    const row = { ...(r.perSpace[space] ?? EMPTY()), [area]: rung };
    this.changed.emit({ ...r, perSpace: { ...r.perSpace, [space]: row } });
  }
}

const ORDER: Rung[] = ['none', 'read', 'write', 'admin'];
const rank = (r: Rung): number => ORDER.indexOf(r);
