import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The Ythril brand lockup — the orb-with-glowing-Y mark standing in for the capital **Y**, followed by
 * "thril", so it reads **"Ythril"**. One source of truth for the wordmark: the top-bar and every pre-auth
 * screen (login / setup / OIDC callback) render this instead of hand-inlining the SVG or an old text dot.
 *
 * `size` is the mark's height in px; the "thril" text scales with it (matched to the 21px header at 16px).
 * The visible mark + word are decorative (`aria-hidden`); a visually-hidden "Ythril" carries the accessible
 * name, so a screen reader always hears the brand, whatever wraps the component.
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .bl { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; letter-spacing: -0.03em;
      line-height: 1; color: var(--text-primary); }
    .bl-mark { flex-shrink: 0; display: block; }

    /*
     * The mark's colour is a THEME TOKEN, not a constant.
     *
     * #9eec55 was hard-coded in five places, so a theme could restyle the entire product and the logo
     * stayed green. --brand-mark overrides it directly; absent that it follows --accent, so a theme
     * that only sets an accent gets a matching mark for free — which is what an operator actually wants.
     *
     * These are CSS properties rather than SVG attributes on purpose: fill="var(--x)" in an attribute
     * does not resolve. As CSS they do, and they beat shipping one file per colour — any hex works, not
     * a fixed palette somebody has to extend.
     */
    .bl-mark { --bl: var(--brand-mark, var(--accent, #9eec55)); }
    .bl-glyph { fill: var(--bl); }
    .bl-ring  { stroke: var(--bl); }
    .bl-c     { stop-color: var(--bl); }
    .bl-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `],
  template: `
    <span class="bl">
      <svg class="bl-mark" [style.width.px]="size()" [style.height.px]="size()" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="blOrb" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stop-color="#1a1f26"/><stop offset="58%" stop-color="#0a0c0f"/><stop offset="100%" stop-color="#040507"/>
          </radialGradient>
          <radialGradient id="blHalo" cx="50%" cy="47%" r="50%">
            <stop class="bl-c" offset="0%" stop-opacity="0.55"/><stop class="bl-c" offset="55%" stop-opacity="0.12"/><stop class="bl-c" offset="100%" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="15.5" fill="url(#blOrb)"/>
        <circle class="bl-ring" cx="16" cy="16" r="15.3" fill="none" stroke-opacity="0.16" stroke-width="0.7"/>
        <circle cx="16" cy="15.2" r="9.5" fill="url(#blHalo)"/>
        <g class="bl-glyph">
          <path d="M5.8 6 L16 19 L26.2 6 L23.1 7.7 L16 14.6 L8.9 7.7 Z"/>
          <path d="M13.3 13.6 L18.7 13.6 L16 27 Z"/>
        </g>
      </svg><span aria-hidden="true" [style.font-size.px]="wordPx()">thril</span>
      <span class="bl-sr">Ythril</span>
    </span>
  `,
})
export class BrandLogoComponent {
  /** Mark height in px; the wordmark text scales with it. */
  size = input(21);
  protected wordPx = computed(() => Math.round(this.size() * 0.76));
}
