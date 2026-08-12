import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Rung } from './rights-glyph.component';

export const RUNGS: readonly Rung[] = ['none', 'read', 'write', 'admin'];
const RANK: Record<Rung, number> = { none: 0, read: 1, write: 2, admin: 3 };

/** What each rung is called in the grid. Short, because a matrix cell has no room for a sentence. */
const LABEL: Record<Rung, string> = { none: '—', read: 'R', write: 'W', admin: 'A' };

/**
 * One cell of the rights matrix: an escalation, not four checkboxes.
 *
 * ## Why an escalation
 *
 * Each rung CONTAINS the one below it, so "write but not read" is not a thing that can be expressed. Four
 * checkboxes would let somebody save it, and the server would then have to decide what it meant — which is
 * a decision nobody should be making at read time.
 *
 * ## Two behaviours that are easy to get wrong
 *
 *  - **Clicking the current rung steps DOWN one.** Without it, a cell can only ever go up by clicking and
 *    down by clicking a specific lower segment, which reads as "the control resists being narrowed".
 *  - **Rungs below the floor are clamped, not hidden.** The floor is set on another row entirely, so a cell
 *    that silently refuses to go lower with no visible reason looks broken. Dimmed-and-titled says why.
 */
@Component({
  selector: 'app-rung-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; }
    button { font-family: var(--font-mono, monospace); font-size: 10.5px; font-weight: 600; padding: 5px 8px;
      color: var(--text-muted); background: var(--bg-surface); border: 0;
      border-right: 1px solid var(--border-muted); cursor: pointer; }
    button:last-child { border-right: 0; }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    button.on.r0 { background: var(--text-muted); color: var(--bg-primary); }
    button.on.r1 { background: var(--info);    color: var(--bg-primary); }
    button.on.r2 { background: var(--accent);  color: var(--text-on-accent); }
    button.on.r3 { background: var(--warning); color: var(--bg-primary); }
    button.clamped { opacity: .35; cursor: not-allowed; }
  `],
  template: `
    @for (s of segments(); track s.rung) {
      <button type="button"
              [class]="s.classes"
              [disabled]="s.clamped || readonlyView()"
              [attr.aria-pressed]="s.filled"
              [attr.title]="s.title"
              (click)="pick(s.rung)">{{ s.label }}</button>
    }
  `,
})
export class RungPickerComponent {
  value = input.required<Rung>();
  /** The floor for this area. A cell may never sit below it — see the class comment. */
  floor = input<Rung>('none');
  /**
   * Display only: every segment is disabled and no click emits.
   *
   * Added for the read-only view of a token`s OWN rights, so that view reuses this renderer instead of a
   * second one. Two renderers of a permission grid is two places the colours and the clamping can disagree,
   * and the one people trust would be whichever they happened to open.
   */
  readonlyView = input(false);
  changed = output<Rung>();

  segments = computed(() => {
    const held = RANK[this.value()];
    const min = RANK[this.floor()];
    return RUNGS.map((rung, i) => {
      const clamped = i < min;
      const filled = i <= held;
      return {
        rung, label: LABEL[rung], clamped, filled,
        // The colour comes from the SELECTED rung, not from each segment's own level, so a filled bar reads
        // as one block at one level rather than a gradient nobody asked for.
        classes: `${filled ? `on r${held}` : ''}${clamped ? ' clamped' : ''}`,
        title: clamped
          ? `Held at ${this.floor()} by the all-spaces floor`
          : `Set ${rung}${rung === this.value() ? ' — click again to step down' : ''}`,
      };
    });
  });

  pick(rung: Rung): void {
    // Belt and braces: a disabled button cannot be clicked, but a caller could still call this.
    if (this.readonlyView()) return;
    if (RANK[rung] < RANK[this.floor()]) return;
    // Clicking the rung you are already on steps down one, never below the floor. A control that can only
    // climb reads as resisting being narrowed, which is the direction anyone auditing wants to move.
    const next: Rung = rung === this.value()
      ? (RUNGS[Math.max(RANK[this.floor()], RANK[rung] - 1)] as Rung)
      : rung;
    if (next !== this.value()) this.changed.emit(next);
  }
}
