import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { GRAPH_PANEL_HEADER_STYLES } from './graph.styles';

/**
 * The bar across the top of a graph side panel: a colour dot, a title, a kind badge, and two actions.
 *
 * ## Why one component for two panels
 *
 * The node panel and the edge panel had this markup twice, differing only in what the title read, what the
 * badge said, and whether the eye button was shown at all. Two copies of one bar is how they drift: the node
 * copy grew an inline `display:inline-flex` on its view button and the edge copy grew the same string
 * separately, which is the second time this page has produced the same rule in two places.
 *
 * ## The title comes from the parent, and now has one source
 *
 * `panelTitle` — node name, else edge label, else empty — was computed on the page and read by nothing, while
 * both headers hand-wrote the same expression inline. That is the state this extraction was waiting for: one
 * right answer already existed and neither renderer used it.
 *
 * ## `canView` rather than hiding it in the parent
 *
 * The edge panel shows its eye button only when the edge has a stored record behind it — a synthetic edge has
 * none, so there is nothing to open. Expressed as an input rather than by wrapping the component in an `@if`,
 * because a header without its actions is still a header and the parent should not have to know the shape of
 * this bar to omit one button.
 */
@Component({
  selector: 'app-graph-panel-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent],
  styles: [GRAPH_PANEL_HEADER_STYLES],
  host: { class: 'side-panel-header' },
  template: `
    <div class="side-panel-title">
      <span class="side-dot" [style.background]="color()"></span>
      <h3>{{ title() }}</h3>
      <span class="badge">{{ badge() }}</span>
    </div>
    <div class="side-panel-header-actions">
      @if (canView()) {
        <button class="btn btn-sm btn-ghost view-btn" (click)="view.emit()">
          <ph-icon name="eye" [size]="14"/>
        </button>
      }
      <button class="icon-btn" [attr.title]="'common.close' | transloco" (click)="close.emit()">
        <ph-icon name="x" [size]="16"/>
      </button>
    </div>
  `,
})
export class GraphPanelHeaderComponent {
  /** The dot beside the title — the selected record's type colour, already resolved by the page. */
  readonly color = input<string>('');
  readonly title = input<string>('');
  /** Already translated where it needs to be: the node panel passes a type, the edge panel a translated word. */
  readonly badge = input<string>('');
  /** Whether the record behind this panel can be opened. False for a synthetic edge, which has no record. */
  readonly canView = input<boolean>(true);

  readonly view = output<void>();
  readonly close = output<void>();
}
