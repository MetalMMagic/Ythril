import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The Space Admin cell: two states, `—` and `A`.
 *
 * ## What it expresses
 *
 * A space administrator is a token holding **admin on all four areas of that space**. The server has enforced
 * that since #937 and publishes it as a derived rung on `GET /api/tokens/rights-shape`; what was missing was any
 * way to see or set it. The matrix showed four independent rungs and nothing said that all four at `admin` IS
 * administering the space — so the commonest grant meant setting four cells and hoping none was missed.
 *
 * Owner, five times over five releases, most recently as a screenshot with this column drawn in: *"i miss space
 * admin"*. It had been built once and reverted because three assertions in `rights-matrix.component.spec.ts`
 * counted `app-rung-picker` elements per row. Those assertions were about the per-area model and needed rewriting
 * by hand, which is a small job and is done in this change — reverting working UI over a test count was the wrong
 * trade and is why this took five releases.
 *
 * ## Why two states and not a rung picker
 *
 * Because it is not a rung. `read`, `write` and `admin` describe one area; this describes all four at once and has
 * exactly one meaningful value. Offering a four-position picker would imply "space read" and "space write" exist,
 * and they do not — the four columns beside it are how anything in between is said.
 *
 * ## Why it is a mirror, not a source of truth
 *
 * `on` is computed from the four cells' SHOWN values by the matrix, so a row that reached admin through the floor
 * reads as administered here. This control never holds state of its own: a column that could disagree with the four
 * cells next to it would be worse than no column.
 */
@Component({
  selector: 'app-space-admin-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  styles: [`
    :host { display: inline-flex; }
    .grp { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
    button {
      background: var(--bg-primary); color: var(--text-muted); border: 0; cursor: pointer;
      font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1;
      padding: 5px 8px; min-width: 24px;
    }
    button + button { border-left: 1px solid var(--border); }
    button:hover:not(:disabled) { color: var(--text-primary); }
    /* The ON state uses the same accent the rung pickers use for admin, so the column reads as part of the row
       rather than as a different kind of control that happens to sit beside it. */
    button.on { background: var(--state-active, var(--bg-surface)); color: var(--text-primary); font-weight: 600; }
    button:disabled { cursor: default; opacity: .6; }
  `],
  template: `
    <div class="grp" role="group" [attr.aria-label]="'tokens.rights.spaceAdmin' | transloco">
      <button type="button" [class.on]="!on()" [disabled]="readonlyView()"
              [attr.aria-pressed]="!on()"
              [attr.title]="'tokens.rights.spaceAdmin.off' | transloco"
              (click)="changed.emit(false)">&ndash;</button>
      <button type="button" [class.on]="on()" [disabled]="readonlyView()"
              [attr.aria-pressed]="on()"
              [attr.title]="'tokens.rights.spaceAdmin.on' | transloco"
              (click)="changed.emit(true)">A</button>
    </div>
  `,
})
export class SpaceAdminToggleComponent {
  /** Derived by the matrix from the four cells. Never stored here. */
  on = input.required<boolean>();
  /** The same read-only posture the rung pickers take, so one disabled matrix is uniformly disabled. */
  readonlyView = input(false);
  /** True to grant space admin, false to clear the row. The matrix writes all four areas in ONE emit. */
  changed = output<boolean>();
}
