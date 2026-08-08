/**
 * Brain → Overview → the space's data model, inferred and drawn.
 *
 * ## What it shows, and why it is worth a panel
 *
 * The server derives the model from the schema AND from the records, because those two disagree and the
 * disagreement is the point. A type can be declared and used, declared and empty, or — the case nobody sees
 * otherwise — hold records with no declaration at all. An integrator arrived at this product with a space
 * holding 21 undeclared entity types after importing the wrong schema file, and no view in the product would
 * have shown them. This is that view.
 *
 * ## Two things a reader can do from here
 *
 * **The record count is a LINK**, not a button styled like one: it navigates to the entities tab filtered to
 * that type, as a real URL. Right-click, open in a new tab, bookmark, send to someone. The alternative
 * considered was a shared signal the panel sets and the tab consumes — set-then-consume-and-clear, with a
 * lifecycle neither component owns — and the URL is both simpler and strictly more capable. It also means
 * neither component knows the other exists.
 *
 * **An admin gets a pen** that opens the same per-type schema editor Space Settings uses, in place. On an
 * UNDECLARED type it is a `+` instead, because there is no schema to edit yet and declaring one is the useful
 * action at that moment.
 *
 * ## Why the geometry is not in this file
 *
 * `er-layout.ts` computes it, and `er-layout.spec.ts` proves every path endpoint lies on the perimeter of the
 * box it belongs to. The first hand-drawn version of this diagram had a join that ended 78 px short of its
 * target — a line into empty space — and deriving the coordinates is what makes that unrepresentable rather
 * than merely absent. Keep it that way: no coordinate in this template is typed by hand.
 *
 * ## This panel FETCHES
 *
 * Every other Overview panel is presentational — the shell preloads their inputs. This one asks for its own
 * model, because a full ER derivation is too expensive to put on the shell's critical path for a space nobody
 * opens this panel on. The Overview's own doc comment was corrected in the same change rather than left
 * saying the tab adds no fetch of its own.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SkeletonLinesComponent } from '../../shared/skeleton-lines.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { BrainApi } from '../../core/brain-api.service';
import { httpErrorReason } from '../../core/http-error';
import type { ErModel, ErEntityType } from '../../core/api.types';
import { layoutErModel } from './er-layout';

@Component({
  selector: 'app-er-model-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, PhIconComponent, SkeletonLinesComponent, ErrorStateComponent],
  styles: [`
    :host { display: block; }
    .stage { padding: 16px; overflow-x: auto; }
    svg { display: block; }
    .box-bg { fill: var(--bg-surface); stroke: var(--border); }
    .box-head { fill: var(--bg-elevated); }
    .box-name { font-size: 12.5px; font-weight: 600; fill: var(--text-primary); }
    .box-prop { font-size: 10.5px; fill: var(--text-muted); font-family: var(--font-mono); }
    .join { fill: none; stroke: var(--graph-edge); stroke-width: 1.25; }
    .join-label { font-size: 10.5px; fill: var(--graph-edge-label); font-family: var(--font-mono); }
    .count { font-size: 11px; font-family: var(--font-mono); fill: var(--text-secondary); }
    a.count-link { cursor: pointer; }
    a.count-link:hover .count, a.count-link:focus-visible .count { fill: var(--accent); }
    a.count-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .pen { opacity: 0; cursor: pointer; transition: opacity .12s ease; }
    .card:hover .pen, .card:focus-within .pen { opacity: 1; }
    .undeclared { stroke: var(--warning); stroke-opacity: .55; stroke-dasharray: 3 2.5; }
    .empty-type { opacity: .65; }
    .note { padding: 10px 16px; border-top: 1px solid var(--border-muted); font-size: 12px; color: var(--text-muted); }
    .note.warn { color: var(--warning); }
  `],
  template: `
    @if (error(); as e) {
      <app-error-state [message]="'brain.overview.er.loadFailed' | transloco" [reason]="e" (retry)="reload()" />
    } @else if (loading()) {
      <app-skeleton-lines [rows]="4" />
    } @else if (model(); as m) {
      @if (m.entityTypes.length === 0) {
        <div class="note">{{ 'brain.overview.er.empty' | transloco }}</div>
      } @else {
        <div class="stage">
          <svg [attr.viewBox]="'0 0 ' + view().width + ' ' + view().height"
               [attr.width]="view().width" [attr.height]="view().height" role="img"
               [attr.aria-label]="'brain.overview.er.diagramLabel' | transloco">
            <defs>
              <marker id="er-arrow" viewBox="0 0 8 8" refX="7.2" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
                <path d="M0 1 L7 4 L0 7 z" fill="var(--graph-edge)" />
              </marker>
            </defs>

            @for (p of view().paths; track p.from + p.label + p.to) {
              <path class="join" [attr.d]="p.d" marker-end="url(#er-arrow)" />
              <text class="join-label" [attr.x]="p.labelX" [attr.y]="p.labelY">{{ p.label }} · {{ p.count }}</text>
            }

            @for (b of view().boxes; track b.type) {
              @if (typeOf(b.type); as t) {
                <g class="card" [class.empty-type]="t.count === 0">
                  <rect class="box-bg" [class.undeclared]="!t.declared" [attr.x]="b.x" [attr.y]="b.y"
                        [attr.width]="b.w" [attr.height]="b.h" rx="8" />
                  <rect class="box-head" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" height="26" rx="8" />
                  <rect class="box-head" [attr.x]="b.x" [attr.y]="b.y + 18" [attr.width]="b.w" height="8" />
                  <text class="box-name" [attr.x]="b.x + 14" [attr.y]="b.y + 18">{{ t.type }}</text>

                  <a class="count-link" [routerLink]="['/brain']"
                     [queryParams]="{ space: spaceId(), tab: 'entities', type: t.type }"
                     [attr.aria-label]="('brain.overview.er.openRecords' | transloco) + ' ' + t.type">
                    <text class="count" [attr.x]="b.x + b.w - 12" [attr.y]="b.y + 18" text-anchor="end">{{ t.count }}</text>
                  </a>

                  @if (canEdit()) {
                    <g class="pen" role="button" tabindex="0"
                       [attr.aria-label]="(t.declared ? 'brain.overview.er.editSchema' : 'brain.overview.er.declareSchema') | transloco"
                       (click)="editType.emit(t.type)" (keydown.enter)="editType.emit(t.type)">
                      <rect [attr.x]="b.x + b.w - 34" [attr.y]="b.y + b.h - 26" width="22" height="20" rx="4"
                            fill="var(--bg-elevated)" stroke="var(--border)" />
                      <text [attr.x]="b.x + b.w - 23" [attr.y]="b.y + b.h - 12" text-anchor="middle"
                            font-size="12" fill="var(--text-secondary)">{{ t.declared ? '✎' : '+' }}</text>
                    </g>
                  }

                  @for (p of t.properties.slice(0, 4); track p.name; let i = $index) {
                    <text class="box-prop" [attr.x]="b.x + 14" [attr.y]="b.y + 44 + i * 16">
                      {{ p.name }}{{ p.required ? ' *' : '' }}
                    </text>
                  }
                  @if (!t.declared) {
                    <text class="box-prop" [attr.x]="b.x + 14" [attr.y]="b.y + 44"
                          fill="var(--warning)">{{ 'brain.overview.er.notDeclared' | transloco }}</text>
                  }
                </g>
              }
            }
          </svg>
        </div>

        @if (m.truncated; as tr) {
          <div class="note warn">{{ 'brain.overview.er.truncated' | transloco: { scan: tr.scan, limit: tr.limit } }}</div>
        }
        @if (m.danglingEdges > 0) {
          <div class="note warn">{{ 'brain.overview.er.dangling' | transloco: { n: m.danglingEdges } }}</div>
        }
      }
    }
  `,
})
export class ErModelPanelComponent {
  private readonly api = inject(BrainApi);

  readonly spaceId = input.required<string>();
  /** Admin-only: the pen appears when the caller says this token may change the schema. */
  readonly canEdit = input(false);

  /** The host opens the shared schema dialog — this panel does not own that modal, nor its save. */
  readonly editType = output<string>();

  readonly model = signal<ErModel | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly view = computed(() => {
    const m = this.model();
    return m ? layoutErModel(m.entityTypes, m.relationships) : { boxes: [], paths: [], width: 0, height: 0 };
  });

  typeOf(name: string): ErEntityType | undefined {
    return this.model()?.entityTypes.find(t => t.type === name);
  }

  constructor() {
    effect(() => { const id = this.spaceId(); if (id) this.fetch(id); });
  }

  reload(): void { const id = this.spaceId(); if (id) this.fetch(id); }

  private fetch(spaceId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getErModel(spaceId).subscribe({
      next: res => {
        // A proxy space answers with its members rather than one model. Showing the first would be a
        // diagram labelled with the proxy's name and drawn from one member's data, which is worse than
        // saying it is not supported here.
        this.model.set('members' in res ? null : res);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        // A failed load must never read as "this space has no types" — that is a statement about the space
        // and this is a statement about the request.
        this.error.set(httpErrorReason(err));
        this.loading.set(false);
      },
    });
  }
}
