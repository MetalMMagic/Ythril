import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RungPickerComponent } from './rung-picker.component';
import { RIGHT_AREAS, type Rung, type TokenRights, type WireRungs } from './rights-glyph.component';

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
  imports: [RungPickerComponent],
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
  `],
  template: `
    <table>
      <thead>
        <tr>
          <th class="l">Space</th>
          @for (a of areas; track a) { <th>{{ a }}</th> }
        </tr>
      </thead>
      <tbody>
        <tr class="floor">
          <td class="l">All spaces<small>minimum, incl. future</small></td>
          @for (a of areas; track a) {
            <td>
              <app-rung-picker [value]="floorOf(a)" (changed)="setFloor(a, $event)"/>
            </td>
          }
        </tr>
        @for (s of spaces(); track s) {
          <tr>
            <td class="l">{{ s }}</td>
            @for (a of areas; track a) {
              <td>
                <app-rung-picker [value]="cellOf(s, a)" [floor]="floorOf(a)" (changed)="setCell(s, a, $event)"/>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class RightsMatrixComponent {
  rights = input.required<TokenRights>();
  spaces = input.required<string[]>();
  changed = output<TokenRights>();

  readonly areas = RIGHT_AREAS;

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
