import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Entity, Edge, TraverseEdge } from '../../core/api.types';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { GRAPH_RECORD_CARD_STYLES } from './graph.styles';

/**
 * The record cards in the graph side panel — the LEFT column, showing the record a selection resolved to.
 *
 * Extracted because `graph.component.ts` sits at its size freeze in `no-new-god-files.test.js` and every
 * behaviour change trips it. The cards are the largest self-contained block in that template, and as children
 * they become testable without a cytoscape mock.
 *
 * ## Two components, not one with a mode
 *
 * The node card and the edge card share every class and the field-row idiom, and differ in four ways: the
 * edge card carries `weight`, shows `from`/`to` with a fallback, labels its first row `relation` rather than
 * `name`, and has **no unavailable branch at all**. A single component with a `kind` input would be two
 * components wearing one name, and unifying the two templates would change behaviour rather than move it.
 *
 * They live in one FILE so the divergence is visible side by side. Whether it should be closed is a product
 * question (see G-6, which is about the unavailable branch the edge card lacks), and it is not answered by a
 * refactor.
 *
 * ## `:host` carries `.record-card`, and that is load-bearing
 *
 * `.record-card { flex: 0 0 50%; border-right }` is what makes `.side-panel-body { display: flex }` a
 * two-column layout. The class is set on the HOST rather than on an inner wrapper so the flex sizing applies
 * to the element the parent actually lays out — an inner div would leave the host unsized and the column
 * would collapse.
 *
 * The rules moved here with the markup for the reason `graph-linked-records.component.ts` already records:
 * the parent's styles are scoped to the parent's own template, so markup moved into a child renders
 * **unstyled** unless its rules move with it — and no unit test can see that.
 *
 * ## What is deliberately unchanged
 *
 * `<app-properties-view>` is given `[properties]` and **not** `schema`. It is the only one of five call sites
 * that omits it; passing the schema would be a behaviour change wearing a refactor's clothes.
 *
 * Three defects are carried across as they are, pinned by `graph-record-card.characterization.spec.ts` and
 * filed as G-5 and G-6: a memory or chrono node renders a blank name row because there is no branch on
 * `kind`; a file node shows the unavailable message AND the loading row, because they are two independent
 * `@if`s; and the message is styled `muted`, a class defined nowhere. Fixing any of them here would make the
 * move unverifiable, because the spec would have to change in the same commit.
 */
@Component({
  selector: 'app-graph-node-record-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoPipe, PropertiesViewComponent],
  styles: [GRAPH_RECORD_CARD_STYLES],
  host: { class: 'record-card' },
  template: `
    <!--
      Why a record is absent, when that is a fact rather than a failure. Without it the panel is
      simply blank, and blank reads as "this record has nothing in it" — a statement about the data
      rather than about what could be fetched.
    -->
    @if (unavailable(); as why) {
      <div class="drawer-field">
        <div class="drawer-value muted">{{ 'graph.recordUnavailable.' + why | transloco }}</div>
      </div>
    }
    @if (record()) {
      <div class="drawer-field">
        <div class="drawer-label">{{ 'brain.entities.table.name' | transloco }}</div>
        <div class="drawer-value">{{ record()!.name }}</div>
      </div>
      @if (record()!.type) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
          <div class="drawer-value">{{ record()!.type }}</div>
        </div>
      }
      @if (record()!.description) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
          <div class="drawer-value">{{ record()!.description }}</div>
        </div>
      }
      @if (record()!.tags?.length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
          <div>
            @for (t of record()!.tags!; track t) {
              <span class="drawer-tag">{{ t }}</span>
            }
          </div>
        </div>
      }
      @if (record()!.properties && objectKeys(record()!.properties!).length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
          <app-properties-view [properties]="record()!.properties!" />
        </div>
      }
      <hr class="drawer-hr">
      <div class="drawer-field">
        <div class="drawer-label">_id</div>
        <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ record()!._id }}</div>
      </div>
      <div class="drawer-field" style="margin-bottom:0;">
        <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
      </div>
    } @else {
      <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
    }
  `,
})
export class GraphNodeRecordCardComponent {
  /** The fetched record, or null while it is in flight or could not be fetched. */
  readonly record = input<Entity | null>(null);
  /** Why no record can be fetched, when that is a fact rather than a failure. */
  readonly unavailable = input<'file' | 'derived' | null>(null);

  /** `Object.keys` for the template's properties guard — an empty object must hide the row, not show an empty view. */
  objectKeys(obj: object): string[] { return Object.keys(obj); }
}

/**
 * The edge card. See the note above `GraphNodeRecordCardComponent` for why this is a second component rather
 * than a mode of that one.
 */
@Component({
  selector: 'app-graph-edge-record-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoPipe, PropertiesViewComponent],
  styles: [GRAPH_RECORD_CARD_STYLES],
  host: { class: 'record-card' },
  template: `
    @if (record()) {
      <div class="drawer-field">
        <div class="drawer-label">{{ 'brain.edges.table.relation' | transloco }}</div>
        <div class="drawer-value">{{ record()!.label }}</div>
      </div>
      @if (record()!.type) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
          <div class="drawer-value">{{ record()!.type }}</div>
        </div>
      }
      @if (record()!.description) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
          <div class="drawer-value">{{ record()!.description }}</div>
        </div>
      }
      @if (record()!.weight !== undefined && record()!.weight !== null) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.weight' | transloco }}</div>
          <div class="drawer-value">{{ record()!.weight }}</div>
        </div>
      }
      @if (record()!.tags?.length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
          <div>
            @for (t of record()!.tags!; track t) {
              <span class="drawer-tag">{{ t }}</span>
            }
          </div>
        </div>
      }
      @if (record()!.properties && objectKeys(record()!.properties!).length) {
        <div class="drawer-field">
          <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
          <app-properties-view [properties]="record()!.properties!" />
        </div>
      }
      <hr class="drawer-hr">
      <div class="drawer-field">
        <div class="drawer-label">{{ 'common.form.from' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.fromName || selected()!.from }}</div>
      </div>
      <div class="drawer-field">
        <div class="drawer-label">{{ 'common.form.to' | transloco }}</div>
        <div class="drawer-readonly-value">{{ record()!.toName || selected()!.to }}</div>
      </div>
      <div class="drawer-field" style="margin-bottom:0;">
        <div class="drawer-label">_id</div>
        <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ record()!._id }}</div>
      </div>
    } @else {
      <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
    }
  `,
})
export class GraphEdgeRecordCardComponent {
  /** The fetched edge record, or null while it is in flight or has none (a synthetic edge). */
  readonly record = input<Edge | null>(null);
  /**
   * The edge as the TRAVERSAL reports it — read only for the `from`/`to` fallbacks.
   *
   * A second source, and the reason it is an input rather than derived: the endpoint rows show the resolved
   * NAMES when the record carries them and the raw ids when it does not, and the ids live on the traversal's
   * edge rather than on the fetched record.
   */
  readonly selected = input<TraverseEdge | null>(null);

  /** See the node card's. */
  objectKeys(obj: object): string[] { return Object.keys(obj); }
}
