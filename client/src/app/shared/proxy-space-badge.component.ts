import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';

/**
 * Marks a space as a PROXY — a view onto another instance's space, reached over a network, rather than data this
 * instance holds.
 *
 * ## Why this is a shared component and not markup in two templates
 *
 * The space-chip strip is duplicated: `pages/brain/brain.component.ts` and `pages/graph/graph.component.ts` each
 * carry their own copy of `class="space-chip"`. Adding the marker inline would have made three copies of one
 * meaning, which is the finding filed as A-L2-1 in the same session — a rule written eleven times because the
 * shared helper was named for its first caller and nobody found it. So this ships as a shared primitive with an
 * obvious name, which is the whole point of the lens-2 red flag *"shared UI primitives instead of every page
 * re-rolling pills"*.
 *
 * ## Why a proxy space needs marking at all
 *
 * A proxy space looks exactly like a local one in every list, and the difference is not cosmetic:
 *
 *  - its records live on a **peer**, so what you see depends on that peer being reachable;
 *  - the server's own metric collectors skip it (`cfg.spaces.filter(s => !s.proxyFor)`), so storage and record
 *    counts for it are **absent by design**, not zero;
 *  - a write intent that makes sense locally may not make sense against someone else's space.
 *
 * Someone who cannot tell the two apart reads an absent count as an empty space.
 *
 * ## `globe`, deliberately
 *
 * It is registered in `ph-icon.component.ts` — an unregistered name renders **blank** with no error, which has
 * bitten this repo twice. And it is visually distinct from the `link` icon already used on the same chip for
 * `networkStatus`: `link` says *this space participates in a network*, `globe` says *this space's data is
 * elsewhere*. Those are different facts and a chip can carry both.
 */
@Component({
  selector: 'app-proxy-space-badge',
  standalone: true,
  imports: [TranslocoModule, PhIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge badge-blue proxy-space-badge"
      [attr.title]="titleText()"
      [attr.aria-label]="titleText()"
    >
      <ph-icon name="globe" [size]="size()" />
      @if (showLabel()) {
        <span class="proxy-space-badge-text">{{ 'spaces.badge.proxy' | transloco }}</span>
      }
    </span>
  `,
  styles: [`
    .proxy-space-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      /* Vertical rhythm with the sibling network chip on the same row, which sets its own line-height. */
      line-height: 1;
    }
    .proxy-space-badge-text { font-size: 0.85em; }
  `],
})
export class ProxySpaceBadgeComponent {
  /** The space ids this space proxies. `['*']` means every space on the peer. */
  readonly proxyFor = input<readonly string[] | null | undefined>(null);

  /** Icon size. 12 matches the network chip in the space strip; 14 suits a table cell. */
  readonly size = input<number>(12);

  /** Off in a dense chip strip where the icon plus its tooltip is enough. */
  readonly showLabel = input<boolean>(false);

  private readonly i18n = inject(TranslocoService);

  /**
   * The tooltip names WHICH spaces are proxied, because "this is a proxy" without "of what" is half an answer —
   * and `['*']` is the case a reader is most likely to misread as a wildcard typo.
   *
   * Translated, not interpolated in English. The first draft of this returned hardcoded strings while the visible
   * label went through transloco — which is precisely the untranslated-string class an earlier accessibility lens
   * already found in this codebase, and a tooltip is exactly where it hides.
   */
  titleText(): string {
    const ids = this.proxyFor() ?? [];
    if (ids[0] === '*') return this.i18n.translate('spaces.badge.proxyAllTitle');
    if (ids.length) return this.i18n.translate('spaces.badge.proxyTitle', { ids: ids.join(', ') });
    return this.i18n.translate('spaces.badge.proxy');
  }
}
