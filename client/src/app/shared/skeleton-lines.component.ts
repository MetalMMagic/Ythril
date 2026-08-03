/**
 * Shimmer placeholder lines, for a card whose data has not arrived yet.
 *
 * ## Why this is only the LINES
 *
 * The Brain Overview's cards each render once their own request lands, so the board assembled itself one card at
 * a time and every arrival pushed the ones below it down. A canary operator reported it as the milder half of a
 * flicker: *"they appear one by one as each request lands, rather than as a laid-out set that fills in."*
 *
 * **The point is the SIZE, not the shimmer** — what makes a page feel like it is building itself is the layout
 * moving. So the fix is to reserve the card's space, which means the card's FRAME has to be the real one.
 *
 * A first version of this component drew the frame too (`<section class="panel">`, header and all). It compiled,
 * it built, and it would have rendered an unstyled grey block: `.panel` and `.panel-h` belong to the Overview's
 * own style block, and view encapsulation does not let a child borrow them. Duplicating them here would have been
 * worse than the bug — the two copies drift, and the placeholder would stop matching the height it exists to
 * reserve.
 *
 * So the caller keeps its own frame and puts this inside its body. Reusable part reusable, sized part sized by
 * the thing being sized.
 */
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-lines',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@for (w of rowList(); track $index) {
  <p class="sk-line" [style.width.%]="w"></p>
}
  `,
  styles: [`
    /* Quiet on purpose: this is furniture, not content, and it must not read as a card with something in it.
       NO BACKTICKS in this block — it is one template string. */
    :host { display: block; opacity: .6; }
    .sk-line {
      height: 13px;
      margin: 0 0 11px;
      border-radius: 6px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-muted);
      position: relative;
      overflow: hidden;
    }
    .sk-line:last-child { margin-bottom: 0; }
    /* One slow sweep, so several placeholders on screen do not read as a light show. */
    .sk-line::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-muted) 14%, transparent), transparent);
      transform: translateX(-100%);
      animation: sk-sweep 1.6s ease-in-out infinite;
    }
    @keyframes sk-sweep {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk-line::after { animation: none; }
    }
  `],
})
export class SkeletonLinesComponent {
  /** How many lines to reserve — match the card's settled height, or it moves the layout in the other direction. */
  rows = input<number>(3);

  /**
   * Line widths as percentages, varied so the block does not read as one solid rectangle.
   *
   * Derived, never random: `Math.random()` would relayout on every change-detection pass — a flicker of its own,
   * and untestable.
   */
  rowList(): number[] {
    const widths = [92, 78, 85, 64, 88, 72];
    return Array.from({ length: Math.max(1, this.rows()) }, (_, i) => widths[i % widths.length]!);
  }
}
