/**
 * A small "?" that opens the guide explaining THIS screen.
 *
 * The point is the anchor, not the link. A control that dumps someone at the top of a 900-line user
 * guide has moved the search rather than answered it, so every use of this component names the heading
 * its screen is documented under and lands the reader on that section.
 *
 * The slug is GitHub's, the same dialect the documents' own tables of contents are written in — see
 * `headingSlug` in `MarkdownRenderService`. A `help-anchor-coverage` gate resolves every anchor used
 * here against the real headings in `docs/`, because a wrong one scrolls nowhere and says nothing.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from './ph-icon.component';

@Component({
  selector: 'app-help-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PhIconComponent, TranslocoPipe],
  styles: [`
    :host { display: inline-flex; }
    a { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted);
      font-size: 12px; text-decoration: none; border-radius: 6px; padding: 2px 6px;
      border: 1px solid transparent; transition: color var(--transition), border-color var(--transition); }
    a:hover { color: var(--accent); border-color: var(--border); }
    a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  `],
  template: `
    <a [routerLink]="['/settings/help']" [queryParams]="{ doc: doc() }" [fragment]="anchor()"
       [attr.aria-label]="'help.link.aria' | transloco" [attr.title]="'help.link.title' | transloco">
      <ph-icon name="question" [size]="14"/><span>{{ 'help.link.label' | transloco }}</span>
    </a>
  `,
})
export class HelpLinkComponent {
  /** A `HELP_DOCS` id. */
  doc = input.required<string>();
  /** The heading slug within that guide. Required on purpose: an unanchored help link is a search box. */
  anchor = input.required<string>();
}
