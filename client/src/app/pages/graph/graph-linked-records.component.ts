import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Memory, ChronoEntry } from '../../core/api.types';
import { DetailRef } from './graph-details';
import { GRAPH_LINKED_RECORDS_STYLES } from './graph.styles';

/**
 * The "linked memories + chrono entries" lists shown beneath a selected node or edge.
 *
 * Extracted because the graph page rendered this block TWICE — once in the node side panel, once in
 * the edge side panel — byte-identical apart from the two empty-state translation keys. Two copies of
 * one list is the same mechanism that let the record drawer drift out of date before #503: a change
 * made to one copy silently misses the other, and the result presents as a list that looks fine but
 * behaves differently, never as an error.
 *
 * The empty-state keys stay INPUTS rather than being unified — "no memories" (a node has none) and
 * "no linked memories" (nothing links these two endpoints) are deliberately different sentences.
 *
 * The `.lists-pane` rules apply to `:host` here. That is load-bearing: the parent's styles are scoped
 * to the parent's own template, so markup moved into a child renders UNSTYLED unless its rules move
 * with it — a full-bleed, borderless list that no unit test can see.
 */
@Component({
  selector: 'app-graph-linked-records',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoPipe],
  styles: [GRAPH_LINKED_RECORDS_STYLES],
  template: `
    <div class="list-section">
      <div class="list-section-header">
        {{ 'graph.panel.memories' | transloco }} <span class="count-chip">{{ memories().length }}</span>
      </div>
      <div class="list-body">
        @for (m of memories(); track m._id) {
          <div class="list-row" (click)="open.emit({ id: m._id, kind: 'memory' })">
            <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || '—' }}</span>
            <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
          </div>
        } @empty {
          <div class="list-empty">{{ emptyMemoriesKey() | transloco }}</div>
        }
      </div>
    </div>
    <div class="list-section">
      <div class="list-section-header">
        {{ 'graph.panel.chrono' | transloco }} <span class="count-chip">{{ chrono().length }}</span>
      </div>
      <div class="list-body">
        @for (c of chrono(); track c._id) {
          <div class="list-row" (click)="open.emit({ id: c._id, kind: 'chrono' })">
            <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || '—' }}</span>
            <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
          </div>
        } @empty {
          <div class="list-empty">{{ emptyChronoKey() | transloco }}</div>
        }
      </div>
    </div>
  `,
})
export class GraphLinkedRecordsComponent {
  memories = input.required<Memory[]>();
  chrono = input.required<ChronoEntry[]>();

  /** Translation key for "this node/edge has no memories". Differs per panel, on purpose. */
  emptyMemoriesKey = input.required<string>();
  /** Translation key for "this node/edge has no chrono entries". Differs per panel, on purpose. */
  emptyChronoKey = input.required<string>();

  /** A row was clicked. The parent fetches the full record and opens the shared drawer. */
  readonly open = output<DetailRef>();
}
